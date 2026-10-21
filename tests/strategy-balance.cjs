'use strict';
// Strategy-depth gate: scripted policies play whole campaigns on fixed seeds, for each identity. No route that ignores the situation
// may dominate, reading the situation must pay off, several different routes must stay viable, playing at random rarely wins (less
// rarely for an heir), and the difficulty labels must hold: heir easiest, newcomer hardest.
// Engine simulation only; it does not measure fun, browser layout or human play time.
const G=require('../dist/day-engine');
const EVAL_SEEDS=Number(process.env.BALANCE_SEEDS||150),SEARCH_SEEDS=Number(process.env.BALANCE_SEARCH_SEEDS||30);
const IDS=Object.keys(G.BACKGROUNDS);
// Limits by identity. Identities differ on purpose; their win rates are not evened out.
const LIMITS={fixedMax:{newcomer:.35,incumbent:.55,heir:.75},adaptiveMargin:.15,adaptiveMin:{newcomer:.35,incumbent:.6,heir:.75},nearBest:.10,distinctRoutes:3,distinctMix:.6,randomMax:{newcomer:.05,incumbent:.15,heir:.35}};
// BALANCE_TUNING='{"careMiss":-0.05}' overrides engine tuning for one run while searching for values; never commit with it set.
if(process.env.BALANCE_TUNING&&G.TUNING){const deep=(t,o)=>{for(const[k,v]of Object.entries(o))if(v&&typeof v==='object'&&!Array.isArray(v))deep(t[k],v);else t[k]=v;};deep(G.TUNING,JSON.parse(process.env.BALANCE_TUNING));}
const ACTION_IDS=G.ACTIONS.map(a=>a.id).filter(id=>id!=='press'),VENUE_IDS=Object.keys(G.VENUES),DONORS=['small',...Object.keys(G.BROKERS)];
const range=(start,n)=>Array.from({length:n},(_,i)=>start+i),evalSeeds=range(1,EVAL_SEEDS),searchSeeds=range(10001,SEARCH_SEEDS);

// A fixed route may read only the round and its own bookkeeping: cash, data it holds and its public answers.
function own(s){const answered={};for(const a of s.player.actions)if(a.answer)answered[a.topic]=a.answer;return{round:s.day,cash:s.budget.available,known:[...s.player.known],answered,team:(s.player.team?.members||[]).length,billboards:(s.player.billboards||[]).length};}
// An adaptive policy may also read what the plan screen shows before the decision; add new visible information here and nothing hidden.
function visible(s){const last=s.journal.at(-1);return{...own(s),tvPool:G.tvPool(s),onlinePool:G.onlinePool(s),crisis:s.crisis?.status==='pending'?{...s.crisis}:null,tip:G.eventView(s).tip,rivalLast:last?{action:last.rival.action,topic:last.rival.topic}:null,forecast:G.forecast(s),landscape:G.landscapeView(s),rumor:G.rumorView(s),challenges:G.pendingChallenges(s),race:G.raceView(s),groups:G.groupView(s),party:G.partyView(s),venues:G.venueView(s),chiefs:G.chiefView(s),donors:G.donorView(s),offer:G.offerView(s),upcoming:G.upcomingOffer(s),issuesByGroup:s.polls.at(-1)?.issuesByGroup||null};}

const isPlan=o=>!['honest','guarantee','counter'].includes(o.id)&&!o.id.startsWith('tip_');
function pick(q,rule){if(rule==='faces')return chooseAnswer(q);const open=q.options.filter(o=>o.unlocked),plans=open.filter(isPlan),plan=plans[0],by=id=>open.find(o=>o.id===id),order={'plan>guarantee':[plan,by('guarantee')],'planB>guarantee':[plans.at(-1),by('guarantee')],'plan>honest':[plan,by('honest')],guarantee:[by('guarantee'),plan],honest:[by('honest'),plan]}[rule]||[plan];return(order.find(Boolean)||open[0]).id;}

// Fixed route: one action per round with fixed venue, answer, spending, donor and offer rules.
function fixedRoute(spec){return{kind:'fixed',name:spec.name,spec,offer:()=>spec.offer||'decline',decide(s){const o=own(s),action=spec.seq[o.round-1],venue=G.VENUES[spec.venue]?spec.venue:spec.venue==='rotate'?VENUE_IDS[(o.round-1)%VENUE_IDS.length]:VENUE_IDS[(o.round-1)%2];return{action,config:{venue,donor:spec.donor&&spec.donor!=='small'?spec.donor:null,gifts:!!spec.gifts,billboard:(spec.boards||[]).includes(o.round),research:spec.research?G.topicsOf(s).find(t=>!o.known.includes(t))||null:null,booth:!!spec.booth,gotv:!!spec.gotv&&o.round>=G.GOTV_FROM},answer:q=>pick(q,spec.answer)};}};}
const route=(name,seq,extra={})=>({name,seq,venue:VENUE_IDS[0],answer:'plan>guarantee',offer:'decline',donor:'small',gifts:false,boards:[],research:false,booth:false,gotv:false,...extra});
const [C,T,F,P,H,D,R,O]=['canvass','tv','fundraise','prepare','recruit','debate','rally','online'],ALTERNATE=[C,T,C,T,C,T,C,D,C,C];
const STARTS=[
 route('電視與街訪交替',ALTERNATE),
 route('全程街訪',[C,C,C,C,C,C,C,D,C,C]),
 route('全程街訪、合作都接',[C,C,C,C,C,C,C,D,C,C],{offer:'accept'}),
 route('前段電視、後段街訪',[T,T,T,T,C,C,C,D,C,C]),
 route('拜訪建商、多上電視',[F,T,C,T,C,T,C,D,C,T],{donor:'developer'}),
 route('自己準備再街訪',[P,C,P,C,P,C,P,D,P,C]),
 route('先擴編再街訪',[H,H,C,C,C,C,C,D,C,C]),
 route('造勢加看板、送小禮物',[C,C,R,C,R,C,C,D,R,C],{gifts:true,boards:[1,2]}),
 route('每回合照順序研究、擺攤、最後催票',[C,C,C,T,C,C,C,D,C,C],{research:true,booth:true,gotv:true}),
 route('直播與街訪交替',[O,C,O,C,O,C,O,D,O,C]),
 route('同一個市場蹲到底',[C,C,C,C,C,C,C,D,C,C],{venue:'market'}),
];
// Diagnostics for known design gaps: these should start to differ from their baselines once fixed.
const DIAGNOSTICS=[
 route('診斷：交替路線，方案全選另一個',ALTERNATE,{answer:'planB>guarantee'}),
 route('診斷：交替路線，地點全改最後一個',ALTERNATE,{venue:VENUE_IDS.at(-1)}),
 route('診斷：全程街訪、全部空頭保證',[C,C,C,C,C,C,C,D,C,C],{answer:'guarantee'}),
 route('診斷：全程街訪、全部坦白',[C,C,C,C,C,C,C,D,C,C],{answer:'honest'}),
 // Answers chosen by reading the faces, but the route itself ignores crowds, TV risk, crises and saving for the final push.
 route('診斷：交替路線、照順序研究、看臉色回答',ALTERNATE,{research:true,answer:'faces'}),
];

// Adaptive policies read visible() each round: group concerns from the poll, crowds and issues by place, chiefs, brokers, face
// previews, the party line, the rival rumour, open challenges, offers and cash. They never read voters' or groups' hidden leans.
const FACE={up:2,slight:1,flat:0,split:.4,unknown:.8,down:-2};
const care=(v,t,g)=>((v.issuesByGroup?.[g]?.[t]??15)+5)/100;
// Value of the best visible answer on topic t for a crowd mix; unknown approaches count as "the scout will tell".
function topicValue(s,v,t,mix,{promises=false}={}){const options=[...(G.TOPICS[t]?.plans||[]).map(p=>p.id),...(promises?['guarantee']:[]),'honest'],line=G.partyLine(s,0,t);let best=-1e9;for(const id of options){let val=G.answerFaces(s,t,id).reduce((n,f,g)=>n+mix[g]*care(v,t,g)*FACE[f],0);if(line&&G.TOPICS[t].plans.some(p=>p.id===id))val+=line===id?.05:-.08;if(id==='guarantee')val-=.15;if(val>best)best=val;}return best;}
// A rally restates every public stance, so its value is how well your stances fit the crowd there.
function platformValue(s,v,mix){let val=.05;for(const t of G.topicsOf(s)){const st=G.lastPlan(s.player,t);if(st)val+=G.answerFaces(s,t,st.answer).reduce((n,f,g)=>n+mix[g]*care(v,t,g)*FACE[f],0);}return val;}
function chooseAnswer(q,{promises=false,last=false}={}){const mix=q.crowd||[1/3,1/3,1/3],open=q.options.filter(o=>o.unlocked);let top=null,score=-1e9;for(const o of open){if(o.id==='guarantee'&&!promises&&open.length>1)continue;let x=(o.faces||[]).reduce((n,f,g)=>n+mix[g]*FACE[f==='unknown'?'flat':f],0);for(const t of o.tags||[])x+=t.kind==='flip'?-.8:t.kind==='breach'?-1.2:t.kind==='promise'&&!last?-.4:t.kind==='party'?.15:t.kind==='counter'?.25:0;if(x>score){score=x;top=o;}}return(top||open[0]).id;}
// Value of a destination over the issues it may raise, given what is known plus this round's research; unknown issues are worth only
// a halting 'I will look into it'.
function askValue(s,v,pool,odds,mix,research,{promises=false,stage=false}={}){const known=new Set(v.known);if(research)known.add(research);return pool.reduce((n,t,i)=>n+odds[i]*(known.has(t)?topicValue(s,v,t,mix,{promises}):G.answerFaces(s,t,'honest').reduce((m,f,g)=>m+mix[g]*care(v,t,g)*FACE[f],0)*(stage?.6:1)-(stage?.12:.05)),0);}
const firstUnknown=(v,list)=>list.find(t=>G.topicsOf({landscape:{active:v.landscape?.ranking?.map(r=>r.topic)}}).includes(t)&&!v.known.includes(t))||list.find(t=>!v.known.includes(t)&&G.TOPICS[t]?.plans?.length)||null;
// A broker deal's worth from what is visible: the faces on its stance weighted by group size, its votes and money, less a flip or a broken line.
function dealValue(v,d){return d.faces.reduce((n,f,g)=>n+v.groups[g].share*FACE[f],0)+(d.bloc||0)/1200+(d.money||0)/500000+(d.perk==='tv'?.2:0)-(d.flip?1:0)+(d.partyLine?(d.partyLine.keeps?.2:-.6):0);}
function situational(s,{rallySmart=false,tvSmart=false,prepares=0,fundraises=1,tvFirst=false,recruits=0,promises=false,rallies=0,boards=0,gifts=false,booth=false,investigate=false,deep=false,online=1,chiefs=1}={}){
 const v=visible(s),count=id=>s.player.actions.filter(a=>a.action===id&&!a.record).length,answer=q=>chooseAnswer(q,{promises,last:v.round===G.DAYS});
 const late=v.round>=G.GOTV_FROM,reserve=late?0:G.COSTS.gotv*2,hot=(v.landscape?.ranking||[]).map(r=>r.topic);
 const addons=(action,config)=>({...(['canvass','rally'].includes(action)?{gifts:gifts&&v.cash>400000+reserve,billboard:boards>v.billboards&&v.round<=5&&v.cash>500000+reserve}:{}),research:config.research!==undefined?config.research:firstUnknown(v,hot),deep:deep&&v.team>=2,booth:(booth||v.cash<250000)&&v.team>(deep?2:1)&&action!=='online',gotv:late&&['canvass','rally','tv'].includes(action)&&v.cash>=G.COSTS.gotv+(action==='tv'&&!s.player.tvCredit?G.COSTS.tv:action==='rally'?G.COSTS.rally:0),investigate:investigate&&v.round>=3&&v.tip?.canInvestigate&&v.cash>=G.COSTS.tipCheck+100000});
 const done=(action,config={})=>({action,config:{...config,...addons(action,config)},answer});
 // Raising money: the best open broker deal if it is worth it, otherwise a small drive.
 const fundraise=(config={})=>{const best=v.donors.filter(d=>d.status==='open').map(d=>({d,val:dealValue(v,d)})).sort((a,b)=>b.val-a.val)[0];return done('fundraise',{...config,donor:best&&best.val>=.25?best.d.id:null});};
 if(v.round===G.DEBATE_ROUND)return done('debate',{research:G.topicsOf(s).includes(s.debate?.topic)&&s.player.insight?.[s.debate.topic]?.level!=='precise'?s.debate.topic:firstUnknown(v,hot)});
 if(count('recruit')<recruits&&v.round<=2)return done('recruit');
 // A rally-first player takes two public stances, then saves for rallies where those stances fit the crowd best.
 if(rallySmart&&count('rally')<rallies&&G.topicsOf(s).filter(t=>G.lastPlan(s.player,t)).length>=2){const spot=v.venues.map(ven=>({id:ven.id,val:platformValue(s,v,ven.mix)})).sort((a,b)=>b.val-a.val)[0];
  if(G.preview(s,'rally',{venue:spot.id}).allowed)return done('rally',{venue:spot.id,research:null});
  if(count('fundraise')<fundraises&&v.round<=8)return fundraise();}
 const heat=t=>v.landscape?.ranking?.find(r=>r.topic===t)?.share||0,shaky=[...G.topicsOf(s)].filter(t=>v.landscape?.insight?.[t]?.level!=='precise').sort((a,b)=>heat(b)-heat(a))[0];
 if(shaky&&count('prepare')<prepares&&!v.challenges.length)return done('prepare',{topic:shaky,research:firstUnknown(v,hot.filter(t=>t!==shaky))});
 if(investigate&&v.tip?.evidenceLevel>=2&&v.tip.truthLabel==='確認重複請款'&&!v.tip.publication&&v.round>=4)return done('press',{research:null});
 const chiefOf=id=>v.chiefs.find(c=>c.venue===id),shares=v.groups.map(g=>g.share);
 const moves=v.venues.map(ven=>{const pool=ven.topic?[ven.topic]:ven.pool,odds=ven.topic?[1]:ven.odds.map(o=>o/100),research=firstUnknown(v,pool),c=chiefs?chiefOf(ven.id):null;return{action:'canvass',venue:ven.id,research,value:askValue(s,v,pool,odds,ven.mix,research,{promises})*(pool.includes(v.rumor?.topic)?1.15:1)*(c?c.scale:1)+(c?.breaks?.25:0)};});
 const tvResearch=firstUnknown(v,v.tvPool),tvBlind=askValue(s,v,v.tvPool,v.tvPool.map(()=>1/3),G.mediaMix(s,'tv'),tvResearch,{promises,stage:true}),ready=v.tvPool.filter(t=>v.known.includes(t)),tvBrief=ready.length?ready.map(t=>({t,val:topicValue(s,v,t,G.mediaMix(s,'tv'),{promises})})).sort((a,b)=>b.val-a.val)[0]:null,useBrief=tvBrief&&tvBrief.val-.04>tvBlind&&v.cash>=G.COSTS.tv+G.COSTS.brief+120000;
 moves.push({action:'tv',brief:useBrief?tvBrief.t:null,research:useBrief?firstUnknown(v,hot):tvResearch,value:(useBrief?tvBrief.val:tvBlind)*1.7});
 if(online&&v.team>=1){const r=firstUnknown(v,v.onlinePool);moves.push({action:'online',research:r,value:askValue(s,v,v.onlinePool,v.onlinePool.map(()=>1/3),G.mediaMix(s,'online'),r,{promises})*.6*online});}
 if(count('rally')<rallies&&v.cash>=G.COSTS.rally+150000)for(const ven of v.venues)moves.push({action:'rally',venue:ven.id,value:platformValue(s,v,ven.mix)*1.6});
 moves.sort((a,b)=>b.value-a.value);const street=moves.find(m=>m.action==='canvass'),canTV=G.preview(s,'tv',{}).allowed,rain=v.forecast?.now?.id==='rain',tv=moves.find(m=>m.action==='tv');
 if(canTV&&(tvFirst||rain))return done('tv',{brief:tv.brief,research:tv.research});
 // A TV-first player goes on air once enough of the likely questions are prepared, raises money when short, and otherwise
 // walks the street while a helper researches the TV questions.
 if(tvSmart){const ready=v.tvPool.filter(t=>v.known.includes(t)).length,tvR=firstUnknown(v,v.tvPool)||firstUnknown(v,hot);
  if(canTV&&(ready>=2||tv.brief))return done('tv',{brief:tv.brief,research:tvR});
  if(!canTV&&count('fundraise')<fundraises&&v.round<=8)return fundraise({research:tvR});
  return done('canvass',{venue:street.venue,research:tvR});}
 const best=moves[0];if(best.action==='tv'&&!canTV){if(v.round<=8&&count('fundraise')<fundraises&&v.cash<180000)return fundraise();return done('canvass',{venue:street.venue,research:street.research});}
 if(best.action==='rally'&&!G.preview(s,'rally',{venue:best.venue}).allowed)return done('canvass',{venue:street.venue,research:street.research});
 return done(best.action,{venue:best.venue,brief:best.brief,research:best.research});
}
// Crises, challenges and the clean pledge are handled from what the plan screen shows.
function prepRound(s){const v=visible(s);
 if(v.crisis)G.respondCrisis(s,v.cash>=G.COSTS.crisis+350000?'pay':'apologize');
 for(const c of G.pendingChallenges(s)){const here=G.venueView(s).filter(x=>c.venues.includes(x.id)),worth=v.known.includes(c.topic)&&here.some(x=>topicValue(s,v,c.topic,x.mix)>.05);if(!worth&&s.budget.available>=G.COSTS.clarify+300000)G.clarify(s,c.id);}
 if(G.eventView(s).tip.canPledge)G.cleanPledge(s);}
// Accept an offer when the visible faces, weighted by group size, plus what the broker brings come out ahead.
function judgeOffer(s){const v=visible(s),o=v.offer;if(!o)return'decline';return dealValue(v,o)>=.2?'accept':'decline';}
const ADAPTIVE=[
 {kind:'adaptive',name:'讀人群：哪裡合就去哪裡',offer:judgeOffer,prep:prepRound,decide:s=>situational(s)},
 {kind:'adaptive',name:'做功課：先親自準備熱門議題',offer:judgeOffer,prep:prepRound,decide:s=>situational(s,{prepares:2,fundraises:0,deep:true})},
 {kind:'adaptive',name:'空戰：先研究電視題目再上節目',offer:judgeOffer,prep:prepRound,decide:s=>situational(s,{fundraises:1,tvSmart:true,booth:true})},
 {kind:'adaptive',name:'地面戰：擴編、看板、小禮物',offer:judgeOffer,prep:prepRound,decide:s=>situational(s,{recruits:2,fundraises:0,boards:2,gifts:true,booth:true,online:0})},
 {kind:'adaptive',name:'造勢：表態兩題後存錢辦造勢',offer:judgeOffer,prep:prepRound,decide:s=>situational(s,{rallies:3,fundraises:1,rallySmart:true,booth:true,gifts:true})},
 {kind:'adaptive',name:'黑料攻防：查周沐經費再出手',offer:judgeOffer,prep:prepRound,decide:s=>situational(s,{investigate:true,fundraises:1})},
 {kind:'adaptive',name:'新媒體：直播搶青年',offer:judgeOffer,prep:prepRound,decide:s=>situational(s,{online:2,fundraises:1})},
 {kind:'adaptive',name:'全面加碼：小禮物、看板、擺攤、合作',offer:s=>{const v=visible(s);return v.offer&&dealValue(v,v.offer)>=-.1?'accept':'decline';},prep:prepRound,decide:s=>situational(s,{fundraises:1,boards:2,gifts:true,booth:true,rallies:2,rallySmart:true})},
];

function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function randomPolicy(){let r=Math.random;return{kind:'random',name:'完全隨機',reset(seed){r=mulberry(seed*7919+13);},offer:()=>r()<.5?'accept':'decline',crisis:()=>['pay','apologize','fight'][Math.floor(r()*3)],decide(s){const ids=[...ACTION_IDS];for(let i=ids.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}const topics=G.topicsOf(s),config={venue:VENUE_IDS[Math.floor(r()*VENUE_IDS.length)],donor:r()<.4?DONORS[Math.floor(r()*DONORS.length)]:null,gifts:r()<.3,billboard:r()<.15,research:r()<.5?topics[Math.floor(r()*topics.length)]:null,booth:r()<.3,gotv:r()<.3,investigate:r()<.2};if(config.donor==='small')config.donor=null;return{action:ids.find(id=>G.preview(s,id,config).allowed)||F,config,answer:q=>{const open=q.options.filter(o=>o.unlocked);return open[Math.floor(r()*open.length)].id;}};}};}

function play(policy,seed,settings={}){
 policy.reset?.(seed);const s=G.initial(seed,settings);G.start(s);const mix={};
 while(s.phase!=='result'){
  if(G.offerView(s))G.respondOffer(s,policy.offer?.(s)||'decline');
  policy.prep?.(s);if(s.crisis?.status==='pending'){if(!G.respondCrisis(s,policy.crisis?.(s)||'apologize'))G.respondCrisis(s,'apologize');}
  const d=policy.decide(s);let id=d.action,config=d.config||{};
  if(!G.preview(s,id,config).allowed&&id==='fundraise'&&config.donor)config={...config,donor:null};
  if(!G.preview(s,id,config).allowed){id=C;config={venue:config.venue};}
  if(!G.preview(s,id,config).allowed){id=F;config={};}
  if(!G.begin(s,id,config))throw new Error(`${policy.name}: round ${s.day} could not start ${id}`);
  G.arrive(s);if(s.phase==='question'){const q=G.question(s);if(!G.answer(s,d.answer?d.answer(q):q.options.find(o=>o.unlocked).id))throw new Error(`${policy.name}: round ${s.day} answer rejected`);}
  if(s.phase!=='recap')throw new Error(`${policy.name}: unexpected phase ${s.phase}`);
  mix[id]=(mix[id]||0)+1;G.next(s);
 }
 return{elected:s.result.outcome==='elected',votes:s.result.playerVotes,mix};
}
function evaluate(policy,seeds,settings={}){let wins=0,votes=0;const mix={};for(const seed of seeds){const r=play(policy,seed,settings);wins+=r.elected;votes+=r.votes;for(const [k,n]of Object.entries(r.mix))mix[k]=(mix[k]||0)+n;}const total=Object.values(mix).reduce((a,b)=>a+b,0);for(const k in mix)mix[k]=mix[k]/total;return{win:wins/seeds.length,votes:votes/seeds.length,mix};}
const better=(a,b)=>a.win>b.win||a.win===b.win&&a.votes>b.votes;

// Coordinate search over fixed routes on separate seeds, so the gate does not depend on guessing the route.
function searchFixed(settings){
 let best=null;for(const spec of STARTS){const score=evaluate(fixedRoute(spec),searchSeeds,settings);if(!best||better(score,best.score))best={spec,score};}
 const rules={venue:[...VENUE_IDS,'rotate','pair'],answer:['plan>guarantee','planB>guarantee','plan>honest','guarantee','honest'],offer:['decline','accept'],donor:DONORS,gifts:[false,true],boards:[[],[1],[1,2],[1,2,3]],research:[false,true],booth:[false,true],gotv:[false,true]};
 for(let pass=0;pass<2;pass++){let improved=false;const tryOut=spec=>{const score=evaluate(fixedRoute(spec),searchSeeds,settings);if(better(score,best.score)){best={spec,score};improved=true;}};
  for(let i=0;i<G.DAYS;i++)for(const id of ACTION_IDS)if(best.spec.seq[i]!==id)tryOut({...best.spec,seq:best.spec.seq.map((x,j)=>j===i?id:x)});
  for(const [key,values]of Object.entries(rules))for(const value of values)if(JSON.stringify(best.spec[key])!==JSON.stringify(value))tryOut({...best.spec,[key]:value});
  if(!improved)break;}
 if(process.env.BALANCE_DEBUG)console.error('best fixed spec',JSON.stringify(settings),JSON.stringify(best.spec));
 return{...best.spec,name:'搜尋到的最佳固定路線（'+best.spec.seq.join('→')+'）'};
}

// Required as a module (for tuning scripts) it exports the policies without running the gate.
module.exports={G,STARTS,DIAGNOSTICS,ADAPTIVE,fixedRoute,randomPolicy,play,evaluate,searchFixed,visible};
if(require.main===module){
const top=list=>list.reduce((a,b)=>!a||better(b,a)?b:a,null),pct=x=>Math.round(x*1000)/10;
const distance=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].reduce((n,k)=>n+Math.abs((a[k]||0)-(b[k]||0)),0);
const criteria=[],tables={},byIdentity={};
for(const id of IDS){
 const settings={background:id},policies=[...STARTS.map(fixedRoute),fixedRoute(searchFixed(settings)),...(id===IDS[0]?DIAGNOSTICS.map(fixedRoute):[]),...ADAPTIVE,randomPolicy()];
 const results=policies.map(p=>({kind:p.kind,name:p.name,...evaluate(p,evalSeeds,settings)}));tables[id]=results;
 const fixed=top(results.filter(r=>r.kind==='fixed'&&!r.name.startsWith('診斷'))),adaptive=top(results.filter(r=>r.kind==='adaptive')),random=results.find(r=>r.kind==='random');
 const contenders=results.filter(r=>r.kind!=='random'&&!r.name.startsWith('診斷')).sort((a,b)=>b.win-a.win||b.votes-a.votes),bestWin=contenders[0].win,distinct=[];
 // Different route = action shares differ by at least distinctMix in L1 distance; venue-only variants do not count.
 for(const r of contenders.filter(r=>r.win>=bestWin-LIMITS.nearBest))if(distinct.every(d=>distance(d.mix,r.mix)>=LIMITS.distinctMix))distinct.push(r);
 const title=G.BACKGROUNDS[id].title;byIdentity[id]={adaptive:adaptive.win,fixed:fixed.win,random:random.win};
 criteria.push(
  {id:id+':fixed-route-max',rule:title+'：固定路線當選率不超過 '+pct(LIMITS.fixedMax[id])+'%',value:pct(fixed.win),limit:pct(LIMITS.fixedMax[id]),pass:fixed.win<=LIMITS.fixedMax[id],route:fixed.name},
  {id:id+':adaptive-margin',rule:title+'：看局面的最佳打法比最佳固定路線高至少 15 個百分點',value:pct(adaptive.win-fixed.win),limit:pct(LIMITS.adaptiveMargin),pass:adaptive.win-fixed.win>=LIMITS.adaptiveMargin},
  {id:id+':adaptive-min',rule:title+'：看局面的最佳打法當選率至少 '+pct(LIMITS.adaptiveMin[id])+'%',value:pct(adaptive.win),limit:pct(LIMITS.adaptiveMin[id]),pass:adaptive.win>=LIMITS.adaptiveMin[id],route:adaptive.name},
  {id:id+':distinct-routes',rule:title+'：至少 3 條不同路線在最佳值 10 個百分點內',value:distinct.length,limit:LIMITS.distinctRoutes,pass:distinct.length>=LIMITS.distinctRoutes,routes:distinct.map(d=>d.name)},
  {id:id+':random-max',rule:title+'：完全隨機當選率不超過 '+pct(LIMITS.randomMax[id])+'%',value:pct(random.win),limit:pct(LIMITS.randomMax[id]),pass:random.win<=LIMITS.randomMax[id]});
}
// The difficulty labels must hold for good play: the heir is easiest and the newcomer hardest.
const [n,i,h]=['newcomer','incumbent','heir'].map(x=>byIdentity[x].adaptive);
criteria.push({id:'difficulty-order',rule:'看局面的最佳當選率：政二代 ≥ 現任議員 ≥ 全新素人',value:`素人 ${pct(n)} / 現任 ${pct(i)} / 政二代 ${pct(h)}`,limit:'由易到難',pass:h>=i&&i>=n});
for(const id of IDS){console.log('\n'+G.BACKGROUNDS[id].title+'（'+G.BACKGROUNDS[id].difficulty+'）');console.table(tables[id].map(r=>({類型:r.kind,打法:r.name,當選率:pct(r.win)+'%',平均票數:Math.round(r.votes)})));}
if(process.env.BALANCE_DEBUG)for(const id of IDS)for(const r of tables[id].filter(r=>r.kind!=='random'))console.log(id,pct(r.win),r.name,JSON.stringify(Object.fromEntries(Object.entries(r.mix).map(([k,x])=>[k,Math.round(x*100)/100]))));
const passed=criteria.every(c=>c.pass);
console.log(JSON.stringify({result:passed?'passed':'failed',engine:G.REVISION,evalSeeds:EVAL_SEEDS,searchSeeds:SEARCH_SEEDS,criteria,scope:'Scripted engine policies on fixed seeds for each identity, independent and default settings otherwise; a search that finds no dominant route does not prove none exists. Not browser, fun or play-time validation.'}));
if(!passed)process.exitCode=1;
}
