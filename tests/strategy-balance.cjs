'use strict';
// Strategy-depth gate: scripted policies play whole campaigns on fixed seeds. No route that ignores the
// situation may dominate, reading the situation must pay off, and several different routes must stay viable.
// Engine simulation only; it does not measure fun, browser layout or human play time.
const G=require('../dist/day-engine');
const EVAL_SEEDS=Number(process.env.BALANCE_SEEDS||300),SEARCH_SEEDS=Number(process.env.BALANCE_SEARCH_SEEDS||40);
const LIMITS={fixedMax:.60,adaptiveMargin:.15,nearBest:.10,distinctRoutes:3,distinctMix:.6,randomMax:.15};
const ACTION_IDS=G.ACTIONS.map(a=>a.id),VENUE_IDS=Object.keys(G.VENUES);
const range=(start,n)=>Array.from({length:n},(_,i)=>start+i),evalSeeds=range(1,EVAL_SEEDS),searchSeeds=range(10001,SEARCH_SEEDS);

// A fixed route may read only the round and its own bookkeeping: cash, data it holds and its public answers.
function own(s){const answered={};for(const a of s.player.actions)if(a.answer)answered[a.topic]=a.answer;return{round:s.day,cash:s.budget.available,known:[...s.player.known],answered,team:(s.player.team?.members||[]).length,topics:G.availableTopics(s).map(t=>t.id)};}
// An adaptive policy may also read what the plan screen shows before the decision. When a version adds
// visible information (forecast, credibility, residents, turnout polls), add it here and nothing hidden.
function visible(s){const last=s.journal.at(-1);return{...own(s),polls:s.polls.map(p=>({round:p.day,percentages:[...p.percentages]})),rivalLast:last?{action:last.rival.action,topic:last.rival.topic}:null,residents:Object.values(s.player.residents||{}).map(r=>({id:r.id,name:r.name,topic:r.topic,attitude:r.attitude,lastAnswer:r.lastAnswer})),events:G.eventView(s),cooperation:{contract:s.settings.contract,remaining:s.cooperation.remaining}};}

const isPlan=o=>!['honest','guarantee'].includes(o.id)&&!o.id.startsWith('tip_');
function pick(q,rule){const open=q.options.filter(o=>o.unlocked),plans=open.filter(isPlan),plan=plans[0],by=id=>open.find(o=>o.id===id),order={'plan>guarantee':[plan,by('guarantee')],'planB>guarantee':[plans.at(-1),by('guarantee')],'plan>honest':[plan,by('honest')],guarantee:[by('guarantee'),plan],honest:[by('honest'),plan]}[rule]||[plan];return(order.find(Boolean)||by('tip_private')||open[0]).id;}
function freshTopic(o){const pool=o.topics.filter(t=>t!=='tip');return pool.find(t=>!o.answered[t])||pool[o.round%pool.length];}

// Fixed route: one action per round with fixed venue, topic, research and answer rules.
function fixedRoute(spec){return{kind:'fixed',name:spec.name,spec,decide(s){const o=own(s),action=spec.seq[o.round-1],venue=G.VENUES[spec.venue]?spec.venue:spec.venue==='rotate'?VENUE_IDS[(o.round-1)%VENUE_IDS.length]:VENUE_IDS[(o.round-1)%2],topic=spec.topic==='same'?'access':freshTopic(o);return{action,config:{venue,topic,teamMode:spec.research&&!o.known.includes(topic)?'research':'together'},answer:q=>pick(q,spec.answer)};}};}
const route=(name,seq,extra={})=>({name,seq,venue:VENUE_IDS[0],topic:'fresh',answer:'plan>guarantee',research:true,...extra});
const [C,T,F,P,H]=['canvass','tv','fundraise','prepare','recruit'],ALTERNATE=[C,T,C,T,C,T,C,T,C,C];
const STARTS=[
 route('電視與街訪交替',ALTERNATE),
 route('全程街訪',Array(10).fill(C)),
 route('前段電視、後段街訪',[T,T,T,T,C,C,C,C,C,C]),
 route('募款一次、多上電視',[C,T,F,T,C,T,C,T,C,T]),
 route('自己準備再街訪',[P,C,P,C,P,C,P,C,P,C],{research:false}),
 route('先擴編再街訪',[H,H,C,C,C,C,C,C,C,C]),
];
// Diagnostics for known v11 design gaps: these should start to differ from their baselines once fixed.
const DIAGNOSTICS=[
 route('診斷：交替路線，方案全選另一個',ALTERNATE,{answer:'planB>guarantee'}),
 route('診斷：交替路線，地點全改最後一個',ALTERNATE,{venue:VENUE_IDS.at(-1)}),
 route('診斷：全程街訪、不查資料、全部空頭保證',Array(10).fill(C),{research:false,answer:'guarantee'}),
 route('診斷：全程街訪、不查資料、全部坦白',Array(10).fill(C),{research:false,answer:'honest'}),
];

// Adaptive policies read visible() each round. v11 shows little worth reading, so this one is expected to
// tie the fixed routes; versions that add visible information must add policies that use it.
const ADAPTIVE=[{kind:'adaptive',name:'看現金與民調調整電視和募款',decide(s){
 const v=visible(s),topic=freshTopic(v),config={venue:VENUE_IDS[0],topic,teamMode:v.known.includes(topic)?'together':'research'},count=id=>s.player.actions.filter(a=>a.action===id).length;
 const polls=v.polls.slice(-2),slipping=polls.length===2&&polls[1].percentages[0]<polls[0].percentages[0];
 let action=count('tv')<=count('canvass')&&!slipping?'tv':'canvass';
 if(action==='tv'&&!G.preview(s,'tv',config).allowed)action=v.round<=8&&v.cash<120000?'fundraise':'canvass';
 return{action,config,answer:q=>pick(q,'plan>guarantee')};}}];

function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function randomPolicy(){let r=Math.random;return{kind:'random',name:'完全隨機',reset(seed){r=mulberry(seed*7919+13);},decide(s){const ids=[...ACTION_IDS];for(let i=ids.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}const config={venue:VENUE_IDS[Math.floor(r()*VENUE_IDS.length)],teamMode:['together','research','canvass'][Math.floor(r()*3)]};return{action:ids.find(id=>G.preview(s,id,config).allowed)||F,config,answer:q=>{const open=q.options.filter(o=>o.unlocked);return open[Math.floor(r()*open.length)].id;}};}};}

function play(policy,seed){
 policy.reset?.(seed);const s=G.initial(seed);G.start(s);const mix={};
 while(s.phase!=='result'){
  const d=policy.decide(s);let id=d.action,config=d.config||{};
  if(!G.preview(s,id,config).allowed){id=C;config={...config,teamMode:'together'};}
  if(!G.preview(s,id,config).allowed){id=F;config={teamMode:'together'};}
  if(!G.begin(s,id,config))throw new Error(`${policy.name}: round ${s.day} could not start ${id}`);
  G.arrive(s);if(s.phase==='question'){const q=G.question(s);if(!G.answer(s,d.answer?d.answer(q):q.options.find(o=>o.unlocked).id))throw new Error(`${policy.name}: round ${s.day} answer rejected`);}
  if(s.phase!=='recap')throw new Error(`${policy.name}: unexpected phase ${s.phase}`);
  mix[id]=(mix[id]||0)+1;G.next(s);
 }
 return{elected:s.result.outcome==='elected',votes:s.result.playerVotes,mix};
}
function evaluate(policy,seeds){let wins=0,votes=0;const mix={};for(const seed of seeds){const r=play(policy,seed);wins+=r.elected;votes+=r.votes;for(const [k,n]of Object.entries(r.mix))mix[k]=(mix[k]||0)+n;}const total=Object.values(mix).reduce((a,b)=>a+b,0);for(const k in mix)mix[k]=mix[k]/total;return{win:wins/seeds.length,votes:votes/seeds.length,mix};}
const better=(a,b)=>a.win>b.win||a.win===b.win&&a.votes>b.votes;

// Coordinate search over fixed routes on separate seeds, so the gate does not depend on guessing the route.
function searchFixed(){
 let best=null;for(const spec of STARTS){const score=evaluate(fixedRoute(spec),searchSeeds);if(!best||better(score,best.score))best={spec,score};}
 const rules={venue:[...VENUE_IDS,'rotate','pair'],topic:['fresh','same'],answer:['plan>guarantee','planB>guarantee','plan>honest','guarantee','honest'],research:[true,false]};
 for(let pass=0;pass<2;pass++){let improved=false;const tryOut=spec=>{const score=evaluate(fixedRoute(spec),searchSeeds);if(better(score,best.score)){best={spec,score};improved=true;}};
  for(let i=0;i<G.DAYS;i++)for(const id of ACTION_IDS)if(best.spec.seq[i]!==id)tryOut({...best.spec,seq:best.spec.seq.map((x,j)=>j===i?id:x)});
  for(const [key,values]of Object.entries(rules))for(const value of values)if(best.spec[key]!==value)tryOut({...best.spec,[key]:value});
  if(!improved)break;}
 return{...best.spec,name:'搜尋到的最佳固定路線（'+best.spec.seq.join('→')+'）'};
}

const policies=[...STARTS.map(fixedRoute),fixedRoute(searchFixed()),...DIAGNOSTICS.map(fixedRoute),...ADAPTIVE,randomPolicy()];
const results=policies.map(p=>({kind:p.kind,name:p.name,...evaluate(p,evalSeeds)}));
const top=list=>list.reduce((a,b)=>!a||better(b,a)?b:a,null),pct=x=>Math.round(x*1000)/10;
const fixed=top(results.filter(r=>r.kind==='fixed')),adaptive=top(results.filter(r=>r.kind==='adaptive')),random=results.find(r=>r.kind==='random');
const contenders=results.filter(r=>r.kind!=='random').sort((a,b)=>b.win-a.win||b.votes-a.votes),bestWin=contenders[0].win;
// Different route = action shares differ by at least distinctMix in L1 distance; venue-only variants do not count.
const distance=(a,b)=>[...new Set([...Object.keys(a),...Object.keys(b)])].reduce((n,k)=>n+Math.abs((a[k]||0)-(b[k]||0)),0),distinct=[];
for(const r of contenders.filter(r=>r.win>=bestWin-LIMITS.nearBest))if(distinct.every(d=>distance(d.mix,r.mix)>=LIMITS.distinctMix))distinct.push(r);
const criteria=[
 {id:'fixed-route-max',rule:'固定路線當選率不超過 60%',value:pct(fixed.win),limit:pct(LIMITS.fixedMax),pass:fixed.win<=LIMITS.fixedMax},
 {id:'adaptive-margin',rule:'看局面的最佳打法比最佳固定路線高至少 15 個百分點',value:pct(adaptive.win-fixed.win),limit:pct(LIMITS.adaptiveMargin),pass:adaptive.win-fixed.win>=LIMITS.adaptiveMargin},
 {id:'distinct-routes',rule:'至少 3 條不同路線在最佳值 10 個百分點內',value:distinct.length,limit:LIMITS.distinctRoutes,pass:distinct.length>=LIMITS.distinctRoutes,routes:distinct.map(d=>d.name)},
 {id:'random-max',rule:'完全隨機當選率不超過 15%',value:pct(random.win),limit:pct(LIMITS.randomMax),pass:random.win<=LIMITS.randomMax}];
console.table(results.map(r=>({類型:r.kind,打法:r.name,當選率:pct(r.win)+'%',平均票數:Math.round(r.votes*10)/10})));
const passed=criteria.every(c=>c.pass);
console.log(JSON.stringify({result:passed?'passed':'failed',engine:G.REVISION,evalSeeds:EVAL_SEEDS,searchSeeds:SEARCH_SEEDS,criteria,scope:'Scripted engine policies on fixed seeds with default settings; a search that finds no dominant route does not prove none exists. Not browser, fun or play-time validation.'}));
if(!passed)process.exitCode=1;
