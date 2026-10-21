'use strict';
// v13.4 engine rules: fixed group sides with game-to-game strength, places and TV that draw their question from three issues, a
// research slot every round (deeper with a second assistant), concrete answers only on researched issues, challenges raised where
// people care and clarified for money, the second-act crisis, background checks and the clean pledge, party money and lines, gifts
// by group, billboards that fit the crowd, rallies after two stances, the debate edge, the final push, the stall, attribution, the
// report's per-source rounds, answer estimates from visible information only, and the real-scale vote. Engine checks only; not browser rendering or human play time.
const A=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),G=require('../dist/day-engine');
let checks=0;const eq=(a,b,m)=>{checks++;A.deepEqual(a,b,m);},ok=(v,m)=>{checks++;A.ok(v,m);},copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(seed,settings)=>{const s=G.initial(seed,settings);G.start(s);return s;};
const side=lean=>lean>.5?0:1,planOf=(t,k)=>G.TOPICS[t].plans[k].id;
const ups=o=>o.faces.reduce((n,f)=>n+(f==='up'?2:f==='slight'?1:f==='down'?-2:0),0),best=q=>q.options.filter(o=>o.unlocked).sort((x,y)=>ups(y)-ups(x))[0].id;
const settleCrisis=(s,choice='apologize')=>{if(s.crisis?.status==='pending')G.respondCrisis(s,choice);};
// One full round through the public API; answer may be an option id or a function of the question.
function round(s,id,config={},answer){settleCrisis(s);const before=copy(s),p=G.preview(s,id,config);ok(p.allowed,p.reason);G.begin(s,id,config);const reload=copy(s);for(const x of[s,reload]){G.arrive(x);if(x.phase==='question'){const q=G.question(x),want=typeof answer==='function'?answer(q,x):answer,o=q.options.find(o=>o.id===want&&o.unlocked)||q.options.find(o=>o.unlocked);ok(G.answer(x,o.id),'answer accepted');}}eq(s,reload,'reload mid-round settles identically');eq(s.budget.spent-before.budget.spent,p.totalCost,'preview cost exact');return s.recap;}
const skip=s=>{round(s,'fundraise');G.next(s);};
const finish=s=>{while(s.phase!=='result'){if(s.phase==='recap'){G.next(s);continue;}round(s,'fundraise');}return s.result;};
const playerVotes=r=>r.attribution.find(a=>a.source==='player').votes;
const sums=r=>Math.abs(r.attribution.reduce((n,a)=>n+(a.source==='rival'?a.effectOnYou:a.votes),0)-r.totalVotes)<1;
// Where this round asks about a topic: a place whose draw is that issue (researching it on the way), or TV with a bought brief.
function askAbout(s,topic){const v=G.venueView(s).find(v=>G.venueTopic(s,v.id)===topic);if(v)return['canvass',{venue:v.id,research:topic}];if(G.tvPool(s).includes(topic)&&G.preview(s,'tv',{brief:topic}).allowed)return['tv',{brief:topic}];return null;}

// Version, preserved v12 and v11 runtimes, isolation from older saves.
eq(G.VERSION,13,'v13 engine');eq(G.REVISION,'13.6.0','v13.6 rules');eq(G.LINE,10693,'the seat line is last election\'s final seat');
for(const [dir,file] of [['legacy-v12','v12'],['legacy-v11','v11']]){const hashes=require('./fixtures/'+file+'-runtime-hashes.json');for(const [f,h]of Object.entries(hashes))eq(crypto.createHash('sha256').update(fs.readFileSync('dist/'+dir+'/'+f)).digest('hex'),h,'preserved '+file+' runtime '+f);}
{const old=require('../dist/legacy-v12/day-engine').initial(5),oldCopy=copy(old);eq(G.start(old),false,'v13 never starts a v12 state');eq(G.upgrade(old),oldCopy,'v12 state untouched');}
eq([G.actOf(1).id,G.actOf(3).id,G.actOf(4).id,G.actOf(7).id,G.actOf(8).id,G.actOf(10).id],[1,1,2,2,3,3],'three acts');

// Groups: fixed sides that follow each group's interests, strength that varies by game, synthetic voters only.
for(let seed=1;seed<=40;seed++){
 const a=G.initial(seed),b=G.initial(seed,{affiliation:'kmt',background:'heir'});
 eq(a.landscape,b.landscape,'landscape ignores opening settings');eq(a.voters.map(v=>[v.g,v.p,v.cares,v.pref]),b.voters.map(v=>[v.g,v.p,v.cares,v.pref]),'voters ignore opening settings');
 eq(Object.keys(a.voters[0]).sort(),['accuracy','cares','g','p','pref','rec','support'],'synthetic voter fields only');
 const L=a.landscape;ok(Math.abs(L.groups.reduce((n,g)=>n+g.share,0)-1)<.01,'group shares add up');eq(L.groups.map(g=>g.promise).sort(),['dislikes','likes','mixed'],'one group of each promise attitude');
 for(const [k,g] of L.groups.entries())for(const t of G.POLICY_TOPICS){eq(side(g.lean[t]),G.LEAN_SIDES[g.id][t],'each group keeps its side');ok([.2,.35,.65,.8].includes(g.lean[t]),'lean is never a coin flip');if(G.STRONG_LEANS[g.id].includes(t))ok(Math.abs(g.lean[t]-.5)>.25,'a group feels strongly about its own core issues');const members=a.voters.filter(v=>v.g===k),share=members.filter(v=>G.prefers(v,t)===0).length/members.length;ok(Math.abs(share-g.lean[t])<.11,'voter preferences follow their group lean');}
 for(const t of G.POLICY_TOPICS)for(const k of [0,1])ok(L.groups.some(g=>side(g.lean[t])===k),'every approach has a group behind it');
 eq(new Set(Object.values(L.main)),new Set([0,1]),'elders and the middle-aged are the street crowds; the young are online');eq(L.active.length,G.ACTIVE_COUNT,'twelve issues per game');ok(G.CORE_TOPICS.every(t=>L.active.includes(t)),'each group\'s top concern is always in play');for(const t of G.POLICY_TOPICS)if(!L.active.includes(t))ok(L.groups.every(g=>g.weights[t]===0),'issues out of play weigh nothing');ok(L.surge.round>=4&&L.surge.round<=7,'surge comes mid-campaign');
 for(const v of G.venueView(a)){ok(Math.abs(v.mix.reduce((n,x)=>n+x,0)-1)<1e-9,'venue mix adds up');eq(v.mix[v.main],G.TUNING.crowd,'main crowd share');eq(v.mix[2],G.TUNING.youngStreet,'about one young person in ten on the street');}
 ok(G.mediaMix(a,'online')[2]>.6&&G.mediaMix(a,'tv')[2]<L.groups[2].share,'online reaches the young; TV skews older');
 const top=k=>Object.entries(L.groups[k].weights).sort((x,y)=>y[1]-x[1]).map(x=>x[0]);
 eq(top(0)[0],'health','elders care most about health');eq(top(1)[0],'childcare','middle-aged care most about childcare');ok(!top(1).slice(0,3).includes('senior'),'the senior card is not a middle-aged concern');eq(top(2)[0],'housing','the young care most about housing');
}
eq([G.LEAN_SIDES.elder.health,G.LEAN_SIDES.young.health,G.LEAN_SIDES.elder.senior,G.LEAN_SIDES.young.senior],[1,0,1,0],'elders back benefits for the old; the young resist paying for them');
{const hits=[0,0,0],want=[['health'],['childcare','traffic'],['housing']];for(let seed=1;seed<=40;seed++)G.groupView(fresh(seed)).forEach((g,k)=>{if(want[k].includes(g.top))hits[k]++;});ok(hits.every(h=>h>=36),'the poll shows each group\'s top concern: '+hits.join('/'));}

// Places and TV draw their question from three issues; the question stays hidden until you arrive.
{let middle=0,mid=0,senior=0;for(let seed=1;seed<=60;seed++){const s=fresh(seed);for(let d=1;d<=G.DAYS;d++)for(const v of Object.keys(G.VENUES)){if(s.landscape.main[v]!==1)continue;const t=G.venueTopic(s,v,d);mid++;if(t==='childcare'||t==='traffic')middle++;if(t==='senior')senior++;}}
 ok(middle/mid>.45&&senior/mid<.08,'middle-aged crowds raise childcare and traffic, rarely the senior card: '+(middle/mid).toFixed(2)+' / '+(senior/mid).toFixed(2));}
for(let seed=1;seed<=10;seed++){const s=fresh(seed);
 for(const v of G.venueView(s)){eq(v.pool.length,3,'three possible questions');ok(Math.abs(v.odds.reduce((a,b)=>a+b,0)-100)<=2,'odds add up');eq(G.preview(s,'canvass',{venue:v.id}).topic,null,'hidden until you arrive');ok(v.pool.includes(G.venueTopic(s,v.id)),'the question comes from the pool');}
 const pool=G.tvPool(s);eq(pool.length,3,'TV pool of three');eq(G.preview(s,'tv').topic,null,'TV question hidden');const t=copy(s);G.begin(t,'tv');ok(pool.includes(t.pending.topic)&&t.pending.drawn,'TV draws from its pool');
 const b=copy(s),p=G.preview(b,'tv',{brief:pool[1]});eq([p.topic,p.addonCost],[pool[1],G.COSTS.brief],'a bought brief picks the issue');G.begin(b,'tv',{brief:pool[1]});ok(b.player.known.includes(pool[1]),'and has it researched');
 const pk=s.landscape.active.at(-1);eq(G.preview(s,'prepare',{topic:pk}).topic,pk,'preparing picks the issue');const off=G.POLICY_TOPICS.find(t=>!s.landscape.active.includes(t));ok(G.preview(s,'prepare',{topic:off}).topic!==off,'an issue out of play cannot be prepared');}

// Research: one assistant on an issue you choose, a second one for depth; concrete answers only on researched issues.
{const s=fresh(8),v=G.venueView(s)[0],t=v.pool[0],p=G.preview(s,'canvass',{venue:v.id,research:t});eq(p.researchTopics,[t],'one assistant researches the chosen issue');eq(p.teamAssignments.map(m=>m.task),['research','follow'],'the other comes along');eq(p.totalCost,0,'research costs time, not money');
 eq(G.preview(s,'canvass',{venue:v.id,research:t,deep:true}).researchTopics,[t,t],'deeper research takes a second assistant');
 // Helpers' research is ready from the next round: nothing on the day, the result once the round ends.
 const finishDay=x=>{G.arrive(x);if(x.phase==='question')G.answer(x,G.question(x).options.find(o=>o.unlocked).id);return x;};
 const x=copy(s);G.begin(x,'canvass',{venue:v.id,research:t,deep:true});ok(!x.player.insight[t],'research is not ready on the day');finishDay(x);eq(x.player.insight[t].level,'precise','deep research shows the shares after the round');
 const y=copy(s);G.begin(y,'canvass',{venue:v.id,research:t});finishDay(y);eq(y.player.insight[t].level,'direction','light research shows the sides after the round');
 const z=copy(s);round(z,'canvass',{venue:v.id,research:t},best);G.next(z);settleCrisis(z);eq(G.preview(z,'canvass',{venue:v.id,research:t}).researchTopics,[t],'a known issue can be researched again');const zz=copy(z);G.begin(zz,'canvass',{venue:v.id,research:t});eq(zz.player.insight[t].level,'direction','a second look waits for the round to end');finishDay(zz);eq(zz.player.insight[t].level,'precise','researching a known issue again shows the shares');}
{let street=0,stage=0,n=0;for(let seed=1;seed<=20;seed++){const s=fresh(seed),v=G.venueView(s)[0],a=copy(s);G.begin(a,'canvass',{venue:v.id});G.arrive(a);const q=G.question(a),t=a.pending.topic;
  {const plans=q.options.filter(o=>G.TOPICS[t].plans.some(p=>p.id===o.id));ok(plans.length===2&&plans.every(o=>o.unlocked&&!o.estimate&&o.faces.every(f=>f==='unknown')),'without research every approach can be said, blind');}ok(q.options.find(o=>o.id==='honest').tags.some(x=>x.kind==='unprepared'),'not answering is tagged');G.answer(a,'honest');street+=a.recap.player.stumble.votes;
  const b=copy(s);G.begin(b,'tv');G.arrive(b);if(!b.player.known.includes(b.pending.topic)){G.answer(b,'honest');stage+=b.recap.player.stumble.votes;n++;}}
 ok(street<0&&n>0&&stage/n<street/20,'caught unprepared costs, more on TV: '+Math.round(street/20)+' / '+Math.round(stage/n));}

// Residents say what their own group wants; a split group just asks.
{let strong=0;for(let seed=1;seed<=30;seed++){const s=fresh(seed),v0=G.venueView(s)[0],pool=v0.pool;
 // Research lands a round later, so read the place's issues on a preparation round first: you take one, the assistants the others.
 G.begin(s,'prepare',{topic:pool[0],research:pool.slice(1)});G.arrive(s);if(s.phase==='question')G.answer(s,G.question(s).options.find(o=>o.unlocked).id);G.next(s);settleCrisis(s);
 const v=G.venueView(s).find(x=>x.id===v0.id),sp=G.speakerFor(s,v.id),t=G.venueTopic(s,v.id),lean=s.landscape.groups[sp.group].lean[t];eq(sp.group,v.main,'the speaker belongs to the main crowd');G.begin(s,'canvass',{venue:v.id});G.arrive(s);const q=G.question(s);eq(q.speakerGroup,sp.group,'question names the speaker\'s group');
 if(!s.player.insight?.[t])continue;
 if(Math.abs(lean-.5)>=.2){eq(q.text,G.VOICES[t][G.GROUPS[sp.group].id][side(lean)],'the resident states their group\'s demand in their own words');eq(q.options.find(o=>o.id===planOf(t,side(lean))).faces[sp.group],'up','what they asked for pleases their group');strong++;}else eq(q.text,G.TOPICS[t].ask,'a split group just asks');}
 ok(strong>=10,'demands exercised '+strong);}

// Faces: promises follow the public attitude; approaches are unknown until researched.
for(let seed=1;seed<=20;seed++){
 const s=fresh(seed),t=s.landscape.active.find(x=>!s.player.known.includes(x)&&!G.CORE_TOPICS.includes(x)),tone={likes:['up','flat'],mixed:['flat','flat'],dislikes:['down','up']};
 eq(G.answerFaces(s,t,'guarantee'),s.landscape.groups.map(g=>tone[g.promise][0]),'guarantee faces follow attitudes');eq(G.answerFaces(s,t,'honest'),s.landscape.groups.map(g=>tone[g.promise][1]),'honest faces follow attitudes');
 eq(G.answerFaces(s,t,planOf(t,0)),['unknown','unknown','unknown'],'approach faces unknown before research');
 const faces=(x,topic)=>x.landscape.groups.map(g=>{const close=Math.abs(g.lean[topic]-.5)<.2,match=side(g.lean[topic])===0;return close?'flat':(match?'up':'down');});
 const h=copy(s),hv=G.venueView(h)[0],topic=G.venueTopic(h,hv.id);G.begin(h,'canvass',{venue:hv.id,research:topic});eq(G.answerFaces(h,topic,planOf(topic,0)),['unknown','unknown','unknown'],'faces stay unknown on the research day');G.arrive(h);if(h.phase==='question')G.answer(h,G.question(h).options.find(o=>o.unlocked).id);eq(G.answerFaces(h,topic,planOf(topic,0)),faces(h,topic),'faces after research');
 const p=copy(s);round(p,'prepare',{topic:t});eq(G.answerFaces(p,t,planOf(t,0)),faces(p,t),'faces after your own reading');eq(p.player.insight[t].level,'precise','your own reading adds the shares');ok(p.player.studied[t],'and makes you more persuasive');
}

// The crowd decides the better answer: the main group's majority approach beats the other one at its place.
let crowdWins=0,n=0;
for(let seed=1;seed<=40;seed++){const base=fresh(seed);for(const v of G.venueView(base)){const t=G.venueTopic(base,v.id),lean=base.landscape.groups[v.main].lean[t];if(Math.abs(lean-.5)<.25)continue;const run=k=>{const s=copy(base);return playerVotes(round(s,'canvass',{venue:v.id,research:t},planOf(t,k)));},want=side(lean);if(run(want)>run(1-want))crowdWins++;n++;break;}}
ok(n>=30&&crowdWins>=n*.85,'main crowd majority wins at its place: '+crowdWins+'/'+n);

// Promises depend on the crowd: where bold-promise fans gather a guarantee beats candour; where they hate empty talk it loses.
let fanWins=0,haterWins=0,fans=0,haters=0;
for(let seed=1;seed<=60;seed++){const base=fresh(seed);for(const [att,count] of [['likes',1],['dislikes',-1]]){const v=G.venueView(base).find(v=>base.landscape.groups[v.main].promise===att);if(!v)continue;
 const run=mode=>{const s=copy(base);return playerVotes(round(s,'canvass',{venue:v.id,teamTasks:['idle','idle']},mode));},g=run('guarantee'),h=run('honest');if(count>0){fans++;if(g>h)fanWins++;}else{haters++;if(h>g)haterWins++;}}}
ok(fanWins>=fans*.8&&haterWins>=haters*.8,`guarantee helps with fans ${fanWins}/${fans}, hurts with haters ${haterWins}/${haters}`);

// Unkept guarantees cost votes at the vote only when exposed and uncorrected; taking one back lets its believers down.
{let exposed=0;for(let seed=1;seed<=20;seed++){const base=fresh(seed,{background:'heir'}),loud=copy(base),plain=copy(base);round(loud,'tv',{},'guarantee');round(plain,'tv',{},'honest');const r=finish(loud),challenged=loud.challenges.some(c=>c.kind==='guarantee');
 if(challenged){exposed++;ok(r.unkept.length===1&&r.unkept[0].votes<0,'an exposed, uncorrected guarantee costs votes at the vote');}else eq(r.unkept,[],'a guarantee nobody exposed costs nothing at the vote');eq(finish(plain).unkept,[],'no guarantee, nothing unkept');}
 ok(exposed>=12,'guarantees exposed '+exposed+'/20');}

// 小馬 leaves an unknown newcomer alone: a guarantee far below the line draws no attack.
{let quiet=0;for(let seed=1;seed<=20;seed++){const s=fresh(seed,{background:'newcomer'});round(s,'tv',{},'guarantee');if(G.raceView(s).you<G.raceView(s).line*.8&&!s.challenges.length)quiet++;}ok(quiet>=15,'newcomer left alone '+quiet+'/20');}
{let fixed=0;for(let seed=1;seed<=60&&fixed<4;seed++){const s=fresh(seed,{background:'heir'});round(s,'tv',{},'guarantee');G.next(s);
 for(let guard=0;guard<8&&s.phase==='plan';guard++){settleCrisis(s);const open=G.pendingChallenges(s)[0];if(open){eq(open.venues.length,2,'raised at two places');for(const v of G.venueView(s))eq(v.topic,open.venues.includes(v.id)?open.topic:null,'only the places where people care raise the challenge');eq(G.tvPool(s)[0],open.topic,'TV leads with it');
  G.begin(s,'canvass',{venue:open.venues[0]});G.arrive(s);ok(G.question(s).options.find(o=>o.id==='honest').tags.some(t=>t.kind==='walkback'),'taking back a guarantee is tagged');G.answer(s,'honest');const r=s.recap;ok(r.events.some(e=>e.rebuttal&&e.challengeId===open.id),'answering at one of those places counts');ok(r.player.walkBack&&r.player.walkBack.votes<0,'taking back a guarantee lets its believers down');ok(sums(r),'attribution adds up with a correction');eq(finish(s).unkept,[],'a corrected guarantee is not charged at the vote');fixed++;break;}skip(s);}}
 ok(fixed>=4,'corrections exercised '+fixed);}

// Clarifying in print: money instead of a round, no expiry penalty, part of the hit won back.
{let cleared=0;for(let seed=1;seed<=80&&cleared<4;seed++){const s=fresh(seed,{background:'heir'});round(s,'tv',{},'guarantee');G.next(s);settleCrisis(s);for(let k=0;k<4&&!G.pendingChallenges(s).length;k++){skip(s);settleCrisis(s);}const open=G.pendingChallenges(s)[0];if(!open)continue;
 const cash=s.budget.available;ok(G.clarify(s,open.id),'clarify');eq(cash-s.budget.available,G.COSTS.clarify,'clarifying costs money, not a round');eq(G.pendingChallenges(s).length,0,'no longer open');eq(G.clarify(s,open.id),false,'once');
 const r=round(s,'fundraise'),e=r.planEffects.find(e=>e.kind==='clarify');ok(e&&e.votes>0,'clarifying wins some back');ok(!r.events.some(x=>x.challengeId===open.id),'no expiry after clarifying');ok(sums(r),'attribution adds up with plan-phase moves');cleared++;}
 ok(cleared===4,'clarify exercised');}

// Switching approach: tagged before answering, and it lets down people who heard the old one.
{let flips=0;for(let seed=1;seed<=200&&flips<10;seed++){const s=fresh(seed),v=G.venueView(s)[0],t=G.venueTopic(s,v.id),[a,b]=G.TOPICS[t].plans.map(p=>p.id);round(s,'canvass',{venue:v.id,research:t},a);G.next(s);settleCrisis(s);const where=askAbout(s,t);if(!where)continue;
 G.begin(s,...where);G.arrive(s);const q=G.question(s),o=q.options.find(o=>o.id===b);ok(o&&o.unlocked&&o.tags.some(x=>x.kind==='flip'),'switch is tagged');ok(q.options.find(o=>o.id===a).tags.some(x=>x.kind==='previous'),'keeping the stance is tagged as before');G.answer(s,b);ok(s.recap.player.flip&&s.recap.player.flip.votes<0,'switching costs votes');flips++;}
 ok(flips>=10,'switching exercised '+flips);}
{let done=0;for(let seed=21;seed<=300&&done<3;seed++){const s=fresh(seed,{background:'incumbent'}),rec=s.player.actions.find(x=>x.record);ok(s.player.heard[rec.topic+':'+rec.answer].length>100,'last-term record has an audience');const where=askAbout(s,rec.topic);if(!where)continue;
 round(s,where[0],where[1],G.TOPICS[rec.topic].plans.find(p=>p.id!==rec.answer).id);ok(s.recap.player.flip.votes<0,'incumbent flip costs votes');done++;}ok(done===3,'incumbent flips exercised');}

// Offers: concrete deal in its round; accepting brings members' votes and money and makes the stance public; breaking it withdraws them.
{let accepted=0,taken=0,breached=0;
 for(let seed=1;seed<=40;seed++){const s=fresh(seed,{affiliation:seed%3?'kmt':'dpp'});eq(s.offers.length,2,'two offers per campaign');ok([2,3].includes(s.offers[0].round)&&[5,6].includes(s.offers[1].round),'offer rounds');ok(s.offers[0].id!==s.offers[1].id&&G.dealOf(s,s.offers[0].id).topic!==G.dealOf(s,s.offers[1].id).topic,'two different issues');
  const kinds=G.PARTIES[s.settings.affiliation].offerKinds;ok(s.offers.every(o=>kinds.includes(G.dealOf(s,o.id).kind)||G.dealOf(s,o.id).kind==='party'),'party decides the kind of broker; a party candidate may also hear from the faction');
  eq(G.respondOffer(s,'accept'),false,'cannot answer before its round');while(s.day<s.offers[0].round){if(s.day===s.offers[0].round-1)eq(G.upcomingOffer(s).id,s.offers[0].id,'announced a round ahead');skip(s);}settleCrisis(s);
  const view=G.offerView(s),line=G.partyLine(s,0,view.topic);ok(view&&view.faces.length===3&&(view.bloc>0||view.money>0||!!view.perk),'offer visible with faces and what it brings');eq(view.partyLine?.keeps??null,line?line===view.plan:null,'offer shows whether it fits your party line');
  if(seed%2){const before=G.expectedVotes(s),cash=s.budget.available;ok(G.respondOffer(s,'accept'),'accept');ok(G.expectedVotes(s)-before>=view.bloc*.6,'members vote for you');eq(s.budget.available,cash+view.money,'money arrives');eq(G.lastPlan(s.player,view.topic).answer,view.plan,'stance made public');eq(G.respondOffer(s,'decline'),false,'decided once');accepted++;
   const where=askAbout(s,view.topic),other=G.TOPICS[view.topic].plans.find(p=>p.id!==view.plan).id;
   if(where){G.begin(s,...where);G.arrive(s);const o=G.question(s).options.find(o=>o.id===other);ok(o.tags.some(x=>x.kind==='breach'),'breach is tagged');G.answer(s,other);ok(s.recap.player.breach&&s.player.blocs.every(b=>b.status==='withdrawn'),'breaking the deal withdraws the members');ok(s.recap.player.breach.votes<=-s.recap.player.breach.bloc+1e-9,'breach counted in your own line');breached++;}
   else round(s,'fundraise');}
  else{const rivalBefore=G.expectedVotes(s,1);ok(G.respondOffer(s,'decline'),'decline');const o=s.offers[0];if(o.taker===1){taken++;if(o.bloc>=300)ok(G.expectedVotes(s,1)>rivalBefore,'rival gains the members he took');ok(s.rival.blocs.some(b=>b.offer===o.id),'the broker backs the rival');}round(s,'fundraise');}
  const r=s.recap;ok(sums(r),'attribution adds up with offers');ok(r.offers.length===1,'recap lists the settled offer');}
 ok(accepted===20&&taken>=5&&breached>=3,'offers exercised: accepted '+accepted+', rival took '+taken+', breached '+breached);}
{const s=fresh(5);while(s.day<s.offers[0].round)skip(s);round(s,'fundraise');eq(s.offers[0].status,'expired','an unanswered offer lapses after its round');G.next(s);eq(G.offerView(s),null,'lapsed offer no longer shown');}

// Party: district shares independent of age; warmer own-party voters; party money; the line.
{const count={kmt:0,dpp:0,none:0},byGroup=[0,1,2].map(()=>({kmt:0,n:0}));for(let seed=1;seed<=20;seed++)for(const v of G.initial(seed).voters){count[v.p]++;byGroup[v.g].n++;if(v.p==='kmt')byGroup[v.g].kmt++;}
 const total=count.kmt+count.dpp+count.none;for(const p of ['kmt','dpp','none'])ok(Math.abs(count[p]/total-G.PARTY_SHARES[p])<.02,'party share '+p);for(const g of byGroup)ok(Math.abs(g.kmt/g.n-G.PARTY_SHARES.kmt)<.04,'party independent of age group');}
{const ind=fresh(31),kmt=fresh(31,{affiliation:'kmt'});eq(kmt.rival.party,'dpp','小馬 runs for the other big party');eq(fresh(31,{affiliation:'dpp'}).rival.party,'kmt','and the other way round');ok(['kmt','dpp'].includes(ind.rival.party),'an independent faces either');
 ind.voters.forEach((v,i)=>eq(Math.round(kmt.voters[i].support[0]/v.support[0]*100)/100,v.p==='kmt'?G.TUNING.party.base.same:v.p==='dpp'?G.TUNING.party.base.opposite:1,'party base'));
 eq(kmt.budget.available-ind.budget.available,G.PARTIES.kmt.subsidy,'party subsidy at the start');eq(kmt.rival.budget.donations,G.PARTIES[kmt.rival.party].subsidy,'小馬 gets his party\'s subsidy');
 const a=round(copy(kmt),'fundraise').player.income,b=round(copy(ind),'fundraise').player.income;ok(Math.abs(a/b-G.PARTIES.kmt.fundraise)<.01,'party candidates raise 1.3 times as much');eq(G.PARTY_LINES.kmt.health,'all65','KMT line on health is the universal senior subsidy');
 const view=G.partyView(kmt);eq(view.line.length,3,'three-issue party line');eq(view.rival.line.length,3,'his line shown too');eq(G.partyView(ind).line,[],'an independent has no line to keep');
 ok(Math.abs(Object.values(G.partyVotes(kmt,0)).reduce((a,b)=>a+b,0)-G.expectedVotes(kmt,0))<1e-6,'party votes add up');}
// 小馬 is the frontrunner: above the line from the start whoever you are; you race for the last seats.
{let above=0,low=0;for(let seed=1;seed<=20;seed++){for(const background of['newcomer','heir','incumbent']){const r=G.raceView(fresh(seed,{background}));if(r.rival>r.line*1.15&&r.you<r.line)above++;}const n=G.raceView(fresh(seed));low+=n.you/n.rival/20;}eq(above,60,'小馬 starts above the line and you below it');ok(low<.35,'a newcomer independent starts far behind 小馬: '+low.toFixed(2));}
{let kept=0,broke=0;for(let seed=1;seed<=120&&(kept<4||broke<4);seed++){const s=fresh(seed,{affiliation:'kmt'}),v=G.venueView(s).find(v=>G.PARTY_LINES.kmt[G.venueTopic(s,v.id)]);if(!v)continue;const t=G.venueTopic(s,v.id),line=G.PARTY_LINES.kmt[t],other=G.TOPICS[t].plans.find(p=>p.id!==line).id,keep=kept<=broke;
 G.begin(s,'canvass',{venue:v.id,research:t});G.arrive(s);const o=G.question(s).options.find(o=>o.id===(keep?line:other));ok(o.unlocked&&o.tags.some(x=>x.kind===(keep?'party':'breach')),'party line tagged on the answer');G.answer(s,o.id);const pl=s.recap.player.partyLine;eq(pl.kept,keep,'party line recorded');ok(keep?pl.votes>0:pl.votes<0,'keeping wins party voters, breaking loses them');keep?kept++:broke++;}
 ok(kept>=4&&broke>=4,'party line exercised');ok(G.TUNING.party.break>G.TUNING.party.keep,'breaking the line costs more than keeping it gains');}

// The ladder; the billboard estimate and fit.
{const s=fresh(5),rows=G.ladderView(s);eq(rows.length,27,'27 candidates');eq(rows.filter(r=>r.elected).length,13,'13 seats');ok(rows.some(r=>r.id===0)&&rows.some(r=>r.id===1),'you and 小馬 listed');if(rows.find(r=>r.id===0).rank>13&&rows.find(r=>r.id===1).rank>13)eq(rows[12].votes,G.LINE,'the 13th place is the line');}
{const s=fresh(5),e=G.billboardEstimate(s);eq(e.rounds,G.DAYS-1,'billboard works the remaining rounds');ok(e.perRound>=50&&e.perRound<=200,'billboard estimate per round '+e.perRound);
 const v=G.venueView(s)[1].id,g=s.landscape.groups[s.landscape.main[v]],top=Object.entries(g.weights).sort((a,b)=>b[1]-a[1])[0][0];eq(G.boardFit(s,v),1,'no stance, a plain billboard');
 s.player.actions.push({day:0,action:'tv',topic:top,answer:planOf(top,side(g.lean[top])),quote:''});eq(G.boardFit(s,v),G.TUNING.billboardFit.match,'a stance the crowd there agrees with works harder');
 s.player.actions.push({day:0,action:'tv',topic:top,answer:planOf(top,1-side(g.lean[top])),quote:''});eq(G.boardFit(s,v),G.TUNING.billboardFit.miss,'an opposite stance works less');}

// Money: gifts widen the crowd and warm elders most; billboards keep working; rallies need two stances and fit the crowd.
{let wider=0,warmer=0;for(let seed=1;seed<=20;seed++){const base=fresh(seed),v=G.venueView(base)[0].id,a=copy(base),b=copy(base),p=G.preview(a,'canvass',{venue:v,gifts:true});eq([p.addons.gifts,p.addonCost,p.totalCost],[true,G.COSTS.gifts,G.COSTS.gifts],'gifts are the only cost of a street visit');eq(G.preview(a,'tv',{gifts:true}).addonCost,0,'no gifts on TV');
 const ra=round(a,'canvass',{venue:v,gifts:true},best),rb=round(b,'canvass',{venue:v},best);if(ra.player.effects.contacts>rb.player.effects.contacts)wider++;if(ra.player.votes>rb.player.votes)warmer++;}
 ok(wider>=18&&warmer>=18,'gifts reach more people and win more votes: '+wider+' / '+warmer);}
{const gain=[0,0,0],seen=[0,0,0];for(let seed=1;seed<=30;seed++){const base=fresh(seed),v=G.venueView(base)[0].id,a=copy(base),b=copy(base);const ra=round(a,'canvass',{venue:v,gifts:true},best).player.effects.groups,rb=round(b,'canvass',{venue:v},best).player.effects.groups;for(let g=0;g<3;g++)if(ra[g].reached&&rb[g].reached){gain[g]+=ra[g].votes/ra[g].reached-rb[g].votes/rb[g].reached;seen[g]++;}}
 const per=gain.map((x,g)=>x/Math.max(1,seen[g]));ok(per[0]>per[1]&&per[1]>per[2],'gifts per person: elders > middle-aged > young: '+per.map(x=>x.toFixed(2)).join(' / '));}
{const s=fresh(12,{background:'heir'}),v=G.venueView(s)[1].id;eq(G.preview(s,'canvass',{venue:v,billboard:true}).addonCost,G.COSTS.billboard,'billboard cost');round(s,'canvass',{venue:v,billboard:true},best);eq(s.player.billboards,[{venue:v,round:1}],'the billboard stands where you put it');eq(G.venueView(s).find(x=>x.id===v).billboards,1,'the place shows it');
 G.next(s);const bb=round(s,'fundraise').attribution.find(a=>a.source==='billboard');ok(bb&&bb.votes>0,'billboards keep working the next round');
 s.player.billboards.push({venue:'market',round:1},{venue:'river',round:1});G.next(s);settleCrisis(s);const full=G.preview(s,'canvass',{venue:'market',billboard:true});ok(!full.addons.billboard&&full.addonCost===0,'at most '+G.MAX_BILLBOARDS+' billboards');}
{eq(G.preview(fresh(3,{background:'heir'}),'rally',{venue:'market'}).allowed,false,'no rally before two public stances');let better=0,n=0;for(let seed=1;seed<=30;seed++){const base=fresh(seed,{background:'heir'}),v=G.venueView(base)[0],main=base.landscape.groups[v.main],stances=pick=>{const s=copy(base);for(const t of G.POLICY_TOPICS)s.player.actions.push({day:0,action:'tv',topic:t,answer:planOf(t,pick(t)),quote:'',prepared:true});return s;},fit=stances(t=>side(main.lean[t])),miss=stances(t=>1-side(main.lean[t]));
 const p=G.preview(fit,'rally',{venue:v.id});eq(p.totalCost,G.COSTS.rally,'rally cost');eq(p.crowd,G.crowdMix(fit,v.id),'a rally draws the place\'s crowd');const a=round(fit,'rally',{venue:v.id}),b=round(miss,'rally',{venue:v.id});ok(a.player.effects.contacts>=G.TUNING.reach.rally*.6,'a rally reaches a big crowd');n++;if(a.player.votes>b.player.votes)better++;}
 ok(better>=n*.9,'a platform that fits the crowd wins more at a rally: '+better+'/'+n);}

// Back office: the stall raises money while you are out; preparing also shows the next hottest issue.
{const s=fresh(9),p=G.preview(s,'canvass',{venue:'market',booth:true});ok(p.teamAssignments.some(m=>m.task==='booth'),'one assistant runs the stall');const cash=s.budget.available,r=round(s,'canvass',{venue:'market',booth:true},best);ok(r.player.income>=G.TUNING.booth[0]&&r.player.income<=G.TUNING.booth[1],'the stall raises '+r.player.income);eq(s.budget.available,cash+r.player.income,'and the money arrives');}
{const s=fresh(8),r=round(s,'prepare',{topic:'senior'});ok(r.player.bonusTopic&&r.player.bonusTopic!=='senior','preparing also shows another issue');eq(s.player.insight[r.player.bonusTopic].level,'direction','at the sides level');eq(G.preview(fresh(8),'prepare',{topic:'senior'}).teamAssignments.map(m=>m.task),['canvass','canvass'],'assistants canvass on their own while you prepare');}
{let main=0,all=0;for(let seed=1;seed<=20;seed++){const s=fresh(seed),v=G.venueView(s)[0],r=round(s,'canvass',{venue:v.id},best);for(const t of r.player.teamReports.filter(t=>t.task==='follow'))(t.groups||[]).forEach((x,g)=>{all+=x.reached;if(g===v.main)main+=x.reached;});}ok(all>0&&Math.abs(main/all-G.TUNING.crowd)<.08,'assistants who come along meet the same crowd: '+(main/all).toFixed(2));}
{const s=fresh(4);round(s,'canvass',{venue:'market',teamTasks:['follow','follow']},best);eq(Object.keys(s.player.counts).filter(k=>k.startsWith('team-canvass:')).length,2,'each assistant keeps a separate repeat count');}

// Press conference from round 3: an unverified accusation hurts him until checked, unless it is seen through on the spot;
// background checks run beside your round; a verified one follows the facts; a false or unclear trail allows the clean pledge.
{let unverified=0,caught=0,verified=0,pledged=0;for(let seed=1;seed<=60&&(unverified<8||verified<4||caught<1||pledged<1);seed++){const s=fresh(seed,{background:'heir'});ok(!G.preview(s,'press').allowed,'no press conference before round 3');while(s.day<3)skip(s);settleCrisis(s);const truth=s.events.tip.truth;
 if(seed%2){const r=round(s,'press',{},'tip_accuse');unverified++;if(r.player.stumble?.caught){caught++;eq(r.player.rivalHit,0,'seen through: no damage to him');ok(r.player.stumble.votes<0,'and it costs you');ok(truth!=='issue','only a false or unclear story is seen through');}else ok(r.player.rivalHit<0,'an unverified accusation hurts him until checked');}
 else{eq(G.preview(s,'fundraise',{investigate:true}).addonCost,G.COSTS.tipCheck,'a background check is an add-on');round(s,'fundraise',{investigate:true});G.next(s);settleCrisis(s);round(s,'fundraise',{investigate:true});G.next(s);settleCrisis(s);eq(s.events.tip.evidenceLevel,2,'two checks, no rounds of your own');
  if(truth!=='issue'&&!pledged){ok(G.eventView(s).tip.canPledge,'a dead end allows the clean pledge');ok(G.cleanPledge(s),'pledge');ok(s.events.tip.pledged.votes>0,'those who hate empty talk warm to it');eq(G.cleanPledge(s),false,'once');pledged++;}
  const r=round(s,'press',{},'tip_accuse');ok(truth==='false'?r.player.rivalHit>0:r.player.rivalHit<0,'a verified accusation follows the facts ('+truth+')');verified++;}}
 ok(unverified>=8&&verified>=4&&caught>=1&&pledged>=1,'press exercised: '+[unverified,caught,verified,pledged].join('/'));}

// Scandals: from round 5 one may break each round, at most two a game, more often for heirs and incumbents; handled before setting out.
{const seen={newcomer:0,heir:0,incumbent:0};for(let seed=1;seed<=60;seed++)for(const bg of Object.keys(seen)){const s=fresh(seed,{background:bg});while(s.phase!=='result'){if(s.crisis?.status==='pending'){ok(s.day>=5&&s.day<=9,'scandals break from round 5 to 9');G.respondCrisis(s,'apologize');}if(s.phase==='recap'){G.next(s);continue;}round(s,'fundraise');}ok(s.crises.length<=2,'at most two scandals');ok(new Set(s.crises.map(c=>c.kind)).size===s.crises.length,'never the same scandal twice');seen[bg]+=s.crises.length;}
 ok(seen.heir>seen.newcomer*1.5&&seen.incumbent>seen.newcomer*1.5,'heirs and incumbents draw more scandals: '+JSON.stringify(seen));}
{let deal=0,plain=0;for(let seed=1;seed<=60;seed++){const a=fresh(seed),b=copy(a);round(a,'fundraise',{donor:'developer'});const run=s=>{while(s.phase!=='result'){settleCrisis(s);if(s.phase==='recap'){G.next(s);continue;}round(s,'fundraise');}return s.crises.length;};deal+=run(a);G.next(b);plain+=run(b);}ok(deal>plain,'taking the developer\'s money invites scandal: '+deal+' vs '+plain);}
for(let seed=1,done=0;seed<=60&&done<12;seed++){const s=fresh(seed,{background:['newcomer','heir','incumbent'][seed%3]});while(s.phase!=='result'&&!(s.crisis?.status==='pending')){if(s.phase==='recap'){G.next(s);continue;}round(s,'fundraise');}if(s.phase==='result')continue;done++;
 const c=s.crisis;ok(c&&c.status==='pending'&&c.text,'the crisis card is up');eq(G.preview(s,'canvass',{venue:'market'}).allowed,false,'handle it before setting out');
 const pay=copy(s),sorry=copy(s),fight=copy(s);if(pay.budget.available>=G.COSTS.crisis){const cash=pay.budget.available;ok(G.respondCrisis(pay,'pay'),'pay');eq(cash-pay.budget.available,G.COSTS.crisis,'paying costs money');eq(Math.round(pay.crisis.effect.votes),0,'and no votes');}
 ok(G.respondCrisis(sorry,'apologize'),'apologise');ok(sorry.crisis.effect.votes<-60&&sorry.crisis.effect.votes>-900,'an apology costs votes in your biggest group: '+Math.round(sorry.crisis.effect.votes));
 ok(G.respondCrisis(fight,'fight'),'fight');ok(fight.crisis.won?fight.crisis.effect.votes>0:fight.crisis.effect.votes<=sorry.crisis.effect.votes,'fighting back is a coin toss: won, or worse than apologising (support cannot go below the floor)');
 const r=round(sorry,'fundraise');ok(r.planEffects.some(e=>e.kind==='crisis'),'the recap shows it');ok(sums(r),'attribution adds up with the crisis');G.next(sorry);ok(sorry.crisis.status==='resolved'||sorry.crisis.round>c.round,'a handled scandal stays handled');}

// The debate in round 8: the rival is always there, has the stage to himself if you stay away, and is held back if you studied the question.
for(let seed=1;seed<=12;seed++){const s=fresh(seed);ok(!G.preview(s,'debate').allowed,'no debate before round 8');while(s.day<G.DEBATE_ROUND)skip(s);settleCrisis(s);eq(s.rivalPlan.action,'debate','rival attends the debate');ok(G.preview(s,'debate').allowed,'debate open in round 8');eq(G.preview(s,'debate').topic,s.debate.topic,'the announced question');
 const went=copy(s),stayed=copy(s);const a=round(went,'debate',{},best),b=round(stayed,'fundraise');eq(a.rival.scale,1,'shared stage');eq(b.rival.scale,G.TUNING.emptyChair,'empty chair');ok(b.rival.emptyChair,'empty chair reported');}
{const s=fresh(3,{background:'heir'});while(s.day<G.DEBATE_ROUND-1)skip(s);settleCrisis(s);round(s,'prepare',{topic:s.debate.topic});G.next(s);settleCrisis(s);const r=round(s,'debate',{},best);ok(r.player.debateEdge<0,'studying the debate question holds him back: '+Math.round(r.player.debateEdge));}

// The final push from round 9: people already leaning to you firm up and are locked in.
{const early=fresh(6);eq(G.preview(early,'canvass',{venue:'market',gotv:true}).addons.gotv,false,'no final push before round 9');const s=fresh(6,{background:'heir'});while(s.day<G.GOTV_FROM)skip(s);settleCrisis(s);const v=G.venueView(s)[0].id,p=G.preview(s,'canvass',{venue:v,gotv:true});eq(p.addonCost,G.COSTS.gotv,'final push cost');const r=round(s,'canvass',{venue:v,gotv:true},best);ok(r.player.gotv.people>0&&r.player.gotv.votes>0,'people leaning to you firm up');ok(s.voters.some(x=>x.locked),'and are locked in');}

// Rival: targets the group where you are closest to him, goes where that group gathers, keeps his party line; rumours about eighty percent accurate.
let rumours=0,accurate=0,targeted=0,plans=0,lines=0;
for(let seed=1;seed<=120;seed++){const s=fresh(seed,{affiliation:['independent','kmt','dpp'][seed%3]});while(s.phase!=='result'){if(s.phase==='recap'){G.next(s);continue;}const plan=s.rivalPlan;
 if(plan.action!=='debate'){rumours++;if(plan.rumor.topic===plan.topic)accurate++;const you=G.groupVotes(s,0),him=G.groupVotes(s,1),gap=k=>you[k]-him[k];if(plan.target===[0,1,2].sort((x,y)=>gap(y)-gap(x)||x-y)[0])targeted++;plans++;if(plan.action==='canvass'&&plan.target!==2)eq(s.landscape.main[plan.venue],plan.target,'he goes where the group he courts gathers');}
 const r=round(s,'fundraise');eq(r.rival.topic,plan.topic,'rival executes the planned topic');const line=r.rival.topic&&G.partyLine(s,1,r.rival.topic);if(line&&G.TOPICS[r.rival.topic].plans.some(p=>p.id===r.rival.answer)&&plan.attack?.kind!=='stance'){eq(r.rival.answer,line,'he keeps his party line');lines++;}}}
ok(Math.abs(accurate/rumours-.8)<.05,'rumours about eighty percent accurate: '+(accurate/rumours).toFixed(3));eq(targeted,plans,'rival targets the closest group');ok(lines>=20,'party line exercised '+lines);

// Attacks cost you at once; answering in time at one of the places where it is raised wins some back; ignoring it expires once.
let hits=0,expired=0,answered=0;
for(let seed=1;seed<=200&&(expired<4||answered<4);seed++){
 const s=fresh(seed,{background:'heir'});round(s,'tv',{},'guarantee');G.next(s);
 for(let guard=0;guard<6&&s.phase!=='result';guard++){if(s.phase==='recap'){G.next(s);continue;}settleCrisis(s);const open=G.pendingChallenges(s)[0];
  if(open&&answered<=expired){const r=round(s,'canvass',{venue:open.venues[0]},'honest'),reb=r.events.find(e=>e.rebuttal&&e.challengeId===open.id);eq(s.challenges.find(c=>c.id===open.id).status,'answered','answering in time settles it');ok(reb,'rebuttal reported');ok(!r.events.some(e=>e.challengeId===open.id&&!e.rebuttal),'no expiry once answered');answered++;break;}
  const r=round(s,'fundraise');if(r.rival.challenge){hits++;ok(r.rival.attack.votes<0,'attack costs you at once');ok(r.attribution.find(a=>a.source==='rival').effectOnYou<0,'attack shows in his effect on you');}
  const gone=r.events.filter(e=>e.challengeId&&!e.rebuttal);if(gone.length){const c=s.challenges.find(c=>c.id===gone[0].challengeId);eq(c.status,'expired','challenge expired');eq(c.expiredDay,c.deadline,'at its deadline');ok(gone[0].effects.votes<0,'expiry costs votes');expired++;G.next(s);const again=round(s,'fundraise');ok(!again.events.some(e=>e.challengeId===c.id),'expiry settles once');break;}
 }
}
ok(hits>=4&&expired>=4&&answered>=4,'attack paths exercised: hits '+hits+', expired '+expired+', answered '+answered);

// Calling out 小馬: offered once he has a public stance on the issue; it costs him among those who agree with you.
{let countered=0;for(let seed=1;seed<=120&&countered<6;seed++){const s=fresh(seed,{background:'heir'});while(s.day<G.DAYS-1&&s.phase==='plan'){settleCrisis(s);const able=G.venueView(s).filter(v=>G.counterPlan(s,G.venueTopic(s,v.id))),v=able.find(v=>s.player.insight?.[G.venueTopic(s,v.id)]);if(!v&&able.length){round(s,'prepare',{topic:G.venueTopic(s,able[0].id)});G.next(s);continue;}if(v){const t=G.venueTopic(s,v.id),want=G.counterPlan(s,t).id;G.begin(s,'canvass',{venue:v.id});G.arrive(s);const o=G.question(s).options.find(o=>o.id==='counter');ok(o&&o.unlocked&&o.tags.some(x=>x.kind==='counter'),'counter offered once he has a public stance');eq(o.faces,G.answerFaces(s,t,want),'counter faces are those of the opposite approach');
  G.answer(s,'counter');const c=s.recap.player.counter;ok(c&&c.rival<0,'calling him out costs him');ok(c.you<=0,'and some listeners think you are picking a fight');eq(s.recap.player.answer,want,'your stance becomes the opposite of his');countered++;break;}skip(s);}}
 ok(countered===6,'counter exercised');}

// Shared swing voters: what you win partly comes out of the rival's support in the same people.
{const s=fresh(14),v=G.venueView(s)[0],t=G.venueTopic(s,v.id),before=G.expectedVotes(s,1);G.begin(s,'canvass',{venue:v.id,research:t});G.arrive(s);const q=G.question(s);eq(G.expectedVotes(s,1),before,'no change before answering');G.answer(s,best(q));ok(s.recap.player.votes>0,'gain');ok(s.recap.player.rivalLoss<0,'rival lost some to you');}

// Attribution adds up; the shown line never moves; real-scale election with 27 candidates and the legal refund line.
for(let seed=1;seed<=30;seed++){const s=fresh(seed);for(let d=1;d<=G.DAYS;d++){settleCrisis(s);const id=d===G.DEBATE_ROUND?'debate':d%2&&G.preview(s,'tv').allowed?'tv':'canvass',venue=G.venueView(s)[d%5].id,research=(id==='canvass'?G.venueView(s)[d%5].pool:id==='tv'?G.tvPool(s):[s.debate?.topic]).find(t=>t&&!s.player.known.includes(t));
 const r=round(s,id,{venue,research},best);ok(sums(r),'attribution adds up');const o=r.outlook;ok(o.low<=o.estimate&&o.estimate<=o.high,'estimate band');eq(o.line,G.LINE,'the seat line shown never moves');eq(r.race.groups.length,3,'race shows three groups');G.next(s);}
 const x=s.result;eq(s.phase,'result','campaign ends');eq(x.tally.length,27,'27 candidates');eq(x.tally.filter(t=>t.elected).length,13,'13 seats');eq(x.refundThreshold,Math.ceil(430492/13*.1),'legal refund line');ok(Math.abs(x.valid-285102)<12000,'valid votes at real scale: '+x.valid);ok(x.lastSeat>8000&&x.lastSeat<13500,'last seat at real scale: '+x.lastSeat);ok(x.keyFactors.length>0&&x.keyFactors.length<=3,'up to three key factors');
 eq(x.roundsSummary.map(r=>r.day),[1,2,3,4,5,6,7,8,9,10],'report lists every round');eq(s.budget.available+s.budget.spent+s.budget.deposit+s.budget.forfeited,s.budget.personalContribution+s.budget.donations,'cash conservation');const ended=copy(s);G.next(s);eq(s,ended,'result settles once');}

// Identities: money, base, helpers, look and one rule each; the identity group rule touches only that group.
{const made=Object.fromEntries(Object.keys(G.BACKGROUNDS).map(id=>[id,fresh(21,{background:id})]));
 eq(made.newcomer.budget.available,440000,'newcomer cash');eq(made.heir.budget.available,1140000,'heir cash');eq(made.incumbent.budget.available,790000,'incumbent cash');eq(made.incumbent.player.team.members.length,3,'incumbent has three assistants');
 const base=id=>G.expectedVotes(made[id]);const B=G.BACKGROUNDS;ok(Math.abs(base('heir')/base('newcomer')-B.heir.supportBoost/B.newcomer.supportBoost)<.01&&Math.abs(base('incumbent')/base('newcomer')-B.incumbent.supportBoost/B.newcomer.supportBoost)<.01,'starting bases follow each identity');ok(base('heir')>base('incumbent')&&base('incumbent')>base('newcomer'),'the heir starts highest, the newcomer lowest');eq(new Set(Object.values(G.BACKGROUNDS).map(b=>b.outfit)).size,3,'each identity dresses differently');
 const record=made.incumbent.player.actions.filter(a=>a.record);eq(record.length,1,'incumbent carries one stance');ok(made.incumbent.player.known.includes(record[0].topic),'record topic researched');eq(made.newcomer.player.actions.length,0,'newcomer has no record');
 for(const [old,now] of Object.entries(G.LEGACY_BACKGROUNDS))eq(G.initial(3,{background:old}).settings.background,now,'old background id maps to '+now);
 const hi=G.preview(copy(made.heir),'fundraise').expectedIncome.max,lo=G.preview(copy(made.newcomer),'fundraise').expectedIncome.max;ok(Math.abs(hi/lo-2)<.01,'heir raises twice what a newcomer can');
 for(const id of ['newcomer','heir']){const v=G.groupView(made[id]),k=made[id].landscape.identityGroup;eq(v.map(x=>x.lift),[0,1,2].map(g=>g===k?G.TUNING.lift[G.BACKGROUNDS[id].rule]:1),id+' rule touches one group');}
 eq(G.groupView(made.incumbent).map(x=>x.lift),[1,1,1],'incumbent has no group rule');
 const locked=made.heir;eq(G.configure(locked,{background:'newcomer'}),false,'identity is fixed once the campaign starts');eq(locked.settings.background,'heir','settings unchanged');}
// The recap lists the answer itself, then stumbles, party lines, walk-backs and the rest as their own rows; together they make the action's votes.
{let rows=0;for(let seed=1;seed<=30;seed++){const s=fresh(seed);for(let d=1;d<=G.DAYS;d++){settleCrisis(s);const id=d===G.DEBATE_ROUND?'debate':['canvass','tv','canvass','fundraise'][d%4];if(!G.begin(s,id,{venue:Object.keys(G.VENUES)[d%5]}))G.begin(s,'fundraise',{});G.arrive(s);if(s.phase==='question'){const o=G.question(s).options.filter(o=>o.unlocked);G.answer(s,o[(seed+d)%o.length].id);}
 const p=s.recap.player;if(p.direct){rows++;const parts=[p.flip,p.breach,p.partyLine,p.walkBack,p.stumble,p.gotv].reduce((n,x)=>n+(x?.votes||0),0)+(p.counter?.you||0);ok(Math.abs(p.direct.votes+parts-p.votes)<1e-6,'recap rows add up');eq(p.direct.byGroup.length,3,'direct effect by group');}G.next(s);}}
 ok(rows>200,'rows checked: '+rows);}
// Accepting an offer states the deal's approach in public and gives the assistant's read on that issue, so its answers show faces.
for(const seed of[11,23,47]){const s=fresh(seed,{background:'heir'}),o=s.offers[0],topic=G.dealOf(s,o.id).topic;while(s.day<o.round)skip(s);eq(s.player.insight[topic],undefined,'offer issue not yet researched '+seed);ok(G.respondOffer(s,'accept'),'offer accepted '+seed);ok(s.player.known.includes(topic)&&s.player.insight[topic]?.level==='direction','accepting an offer reveals its issue '+seed);for(const plan of G.TOPICS[topic].plans)ok(G.answerFaces(s,topic,plan.id).every(f=>f!=='unknown'),'offer issue answers show faces '+seed);
 for(const t of s.player.known.filter(t=>G.TOPICS[t].plans.length))ok(!!s.player.insight[t],'every known issue has an insight '+seed+' '+t);}
// The report splits each round's total by source; a quiet round (fundraising, recruiting, preparing) moves no votes itself.
for(let seed=1;seed<=20;seed++){const s=fresh(seed);for(let d=1;d<=G.DAYS;d++){settleCrisis(s);const id=d===G.DEBATE_ROUND?'debate':['fundraise','canvass','prepare','tv','recruit'][d%5],cfg=id==='canvass'?{venue:G.venueView(s)[d%5].id}:{};if(G.preview(s,id,cfg).allowed)round(s,id,cfg,best);else round(s,'fundraise');G.next(s);}
 for(const x of s.result.roundsSummary){ok(Math.abs(x.direct+x.team+x.rebuttal+x.billboard+x.offer+x.plan+x.byRival+x.events-x.votes)<=4,'round parts add up '+seed+'/'+x.day);eq(x.quiet,G.QUIET.includes(x.action)&&!s.journal.find(j=>j.day===x.day).player.dealt,'quiet flag '+x.action);if(x.quiet)eq(x.direct,0,'a quiet round moves no votes itself '+x.action);}}
// Estimates beside answers read only what the screen shows (hidden leanings, concerns, receptivity and party are never used),
// and on average they follow what an answer actually does.
{const pairs=[],groups=[];for(let seed=1;seed<=120;seed++){const s=fresh(seed,{background:['newcomer','heir','incumbent'][seed%3],affiliation:['independent','kmt','dpp'][seed%3]});for(let d=1;d<=G.DAYS&&s.phase!=='result';d++){settleCrisis(s);const vs=G.venueView(s),v=vs[d%vs.length],id=d===G.DEBATE_ROUND?'debate':d%3?'canvass':'tv',cfg=id==='canvass'?{venue:v.id,research:v.pool[d%3]}:id==='tv'?{research:G.tvPool(s)[0]}:{research:s.debate.topic};
  if(!G.preview(s,id,cfg).allowed){round(s,'fundraise');G.next(s);continue;}G.begin(s,id,cfg);G.arrive(s);const q=G.question(s),topic=s.pending.topic;
  if(d===2){const blind=copy(s);for(const x of blind.voters){x.pref=x.pref.split('').reverse().join('');x.cares=['sanitation'];x.rec=[.4,.4];x.accuracy=.5;x.p='none';}for(const o of q.options.filter(o=>o.estimate))eq(G.answerEstimate(blind,topic,o.id),o.estimate,'estimate ignores hidden voter state '+seed+' '+o.id);}
  for(const o of q.options){if(!o.unlocked)eq(o.estimate,null,'no estimate for a locked answer');else if(G.TOPICS[topic].plans.some(p=>p.id===o.id))ok(s.player.insight?.[topic]?.level==='precise'?o.estimate?.groups?.length===3:o.estimate===null,'only deep research gives an approach an estimate');}
  const open=q.options.filter(o=>o.unlocked),pick=open[(seed+d)%open.length];G.answer(s,pick.id);const r=s.recap,reb=r.events.filter(e=>e.rebuttal);
  if(pick.estimate){pairs.push([pick.estimate.total,r.player.votes+reb.reduce((n,e)=>n+e.effects.votes,0)]);pick.estimate.groups.forEach((x,g)=>groups.push([x,r.player.byGroup[g]+reb.reduce((n,e)=>n+(e.effects.byGroup?.[g]||0),0)]));}
  G.next(s);}}
 const corr=ps=>{const n=ps.length,mx=ps.reduce((a,p)=>a+p[0],0)/n,my=ps.reduce((a,p)=>a+p[1],0)/n;let xy=0,xx=0,yy=0;for(const [x,y] of ps){xy+=(x-mx)*(y-my);xx+=(x-mx)**2;yy+=(y-my)**2;}return xy/Math.sqrt(xx*yy);},big=pairs.filter(p=>Math.abs(p[0])>=100);
 ok(pairs.length>200,'estimates checked: '+pairs.length);ok(corr(pairs)>.93,'estimates follow the outcome: '+corr(pairs).toFixed(3));ok(corr(groups)>.93,'group estimates follow the outcome: '+corr(groups).toFixed(3));ok(big.filter(p=>Math.sign(p[0])===Math.sign(p[1])).length/big.length>.93,'clear estimates get the direction right');}
// An offer shows its estimate once its issue is researched, and none before.
{let seen=0,blind=0;for(let seed=1;seed<=40&&(seen<3||blind<1);seed++){const s=fresh(seed),o=s.offers[0],topic=G.dealOf(s,o.id).topic,study=seed%2;while(s.day<o.round){round(s,'fundraise',study?{research:topic}:{research:''});G.next(s);}const view=G.offerView(s);if(!view)continue;
 if(s.player.insight[topic]){ok(view.estimate?.groups?.length===3&&view.estimate.people>0,'a researched offer shows an estimate');seen++;}else{eq(view.estimate,null,'no offer estimate before research');blind++;}}
 ok(seen>=3&&blind>=1,'offer estimates exercised');}

// v13.5: a wrong answer costs as much as a right one gains among the people who care.
eq([G.TUNING.careMiss,G.TUNING.otherMiss],[-G.TUNING.careMatch,-G.TUNING.otherMatch],'answering against what people want costs as much as matching it gains');

// Online: helpers run it, it mostly reaches the young, and its reach is uncertain.
{const reach=[],young=[];for(let seed=1;seed<=30;seed++){const s=fresh(seed),p=G.preview(s,'online',{});ok(p.allowed,'online with helpers');eq(p.totalCost,0,'online costs no money');eq(p.teamAssignments.filter(m=>m.task==='stream').length,Math.min(2,p.teamAssignments.length),'up to two helpers stream');ok(p.expectedReach.max>p.expectedReach.min*5,'online reach is shown as uncertain');
  const r=round(s,'online',{},q=>q.options.find(o=>o.unlocked).id);reach.push(r.player.effects.contacts);const g=r.player.effects.groups;young.push(g[2].reached/Math.max(1,g.reduce((n,x)=>n+x.reached,0)));ok(G.onlinePool(fresh(seed)).includes(r.player.topic),'comments come from what the young care about');ok(sums(r),'attribution adds up online');}
 ok(Math.max(...reach)>Math.min(...reach)*3,'some streams take off, some do not: '+Math.min(...reach)+'–'+Math.max(...reach));ok(young.reduce((a,b)=>a+b,0)/young.length>.55,'online mostly reaches the young');
 const s=G.initial(3);G.start(s);s.player.team.members=[];eq(G.preview(s,'online',{}).allowed,false,'no helpers, no online');}

// Village chiefs: a newcomer needs two or three visits, an incumbent one, an heir is welcome at the market and the temple.
{for(let seed=1;seed<=20;seed++){const n=fresh(seed,{background:'newcomer'}),h=fresh(seed,{background:'heir'}),i=fresh(seed,{background:'incumbent'});
  ok(G.chiefView(n).every(c=>[2,3].includes(c.need)&&!c.broken),'a newcomer is a stranger to every chief');ok(G.chiefView(i).every(c=>c.need===1),'an incumbent is known to every chief');ok(G.chiefView(h).filter(c=>c.broken).map(c=>c.venue).sort().join()==='market,temple','an heir is welcome at the market and the temple');}
 let checked=0;for(let seed=1;seed<=20;seed++){const s=fresh(seed,{background:'newcomer'}),c=G.chiefView(s).find(c=>c.venue==='market'),v1=round(s,'canvass',{venue:'market'},q=>q.options.find(o=>o.unlocked).id);ok(v1.player.chief&&!v1.player.chief.broken&&v1.player.chief.scale<1,'before the chief knows you, people hold back');G.next(s);settleCrisis(s);
  let r=null;for(let k=1;k<c.need;k++){r=round(s,'canvass',{venue:'market'},q=>q.options.find(o=>o.unlocked).id);if(k<c.need-1){G.next(s);settleCrisis(s);}}ok(r.player.chief.broke&&r.player.chief.bloc===G.TUNING.chief.bloc,'the chief comes round on the needed visit and brings a network');ok(sums(r),'attribution adds up when a chief comes round');ok(s.player.blocs.some(b=>b.chief==='market'),'the network counts toward your votes');
  G.next(s);settleCrisis(s);const w1=G.weather(s).factor,p1=G.preview(s,'canvass',{venue:'market'});G.begin(s,'canvass',{venue:'market'});G.arrive(s);G.answer(s,G.question(s).options.find(o=>o.unlocked).id);G.next(s);settleCrisis(s);const r1=p1.expectedReach.max/w1,r2=G.preview(s,'canvass',{venue:'market'}).expectedReach.max/G.weather(s).factor,n=s.player.counts['canvass:market']-1;ok(Math.abs(r2/r1-(1+.3*n*G.TUNING.chief.tire)/(1+.3*(n+1)*G.TUNING.chief.tire))<.05,'a won-over chief\'s place tires of you at half speed');checked++;}
 ok(checked===20,'chiefs exercised');}

// Identities: a newcomer starts with two issues read, an heir with none and a harder fall when caught out; each has a difficulty.
eq(Object.values(G.BACKGROUNDS).map(b=>b.difficulty),['困難','普通','簡單'],'difficulty labels instead of win rates');
for(let seed=1;seed<=10;seed++){const n=fresh(seed,{background:'newcomer'}),h=fresh(seed,{background:'heir'});eq(n.player.known.length,2,'a newcomer starts with two issues read');ok(n.player.known.every(t=>n.player.insight[t].level==='precise'&&n.player.studied[t]),'read in depth');eq(h.player.known.length,0,'an heir starts with none');}
{let ratio=0,k=0;for(let seed=1;seed<=20;seed++){const a=fresh(seed,{background:'heir'}),b=G.initial(seed,{background:'incumbent'});G.start(b);G.begin(a,'tv');G.arrive(a);const t=a.pending.topic;if(a.player.known.includes(t))continue;G.answer(a,'honest');G.begin(b,'tv');G.arrive(b);if(b.player.known.includes(b.pending.topic))continue;G.answer(b,'honest');if(b.recap.player.stumble.votes<0){ratio+=a.recap.player.stumble.votes/b.recap.player.stumble.votes;k++;}}ok(k>=5&&ratio/k>1.2,'an heir caught out falls harder: '+(ratio/Math.max(1,k)).toFixed(2));}

// Brokers: each game gives each one a deal on an issue in play; visiting one raises money for a public stance; they also come as offers.
{for(let seed=1;seed<=30;seed++){const s=fresh(seed,{affiliation:['independent','kmt','dpp'][seed%3]});for(const d of Object.values(s.deals))ok(s.landscape.active.includes(d.topic),'a deal is on an issue in play');eq(!!s.deals.faction,s.settings.affiliation!=='independent','only a party candidate has a faction');ok(s.offers.every(o=>s.deals[o.id]),'offers come from brokers');}
 let visits=0;for(let seed=1;seed<=20;seed++){const s=fresh(seed,{background:'heir'}),d=Object.values(s.deals).find(d=>d.money>0&&!G.lastPlan(s.player,d.topic));if(!d)continue;const cash=s.budget.available,p=G.preview(s,'fundraise',{donor:d.id});ok(p.allowed&&p.expectedIncome.min>=d.money,'a broker visit shows the money');const r=round(s,'fundraise',{donor:d.id});ok(s.budget.available-cash>=d.money,'the money arrives');eq(G.lastPlan(s.player,d.topic).answer,d.plan,'and your stance is public');ok(r.player.dealt&&r.player.dealt.id===d.id,'the recap names the deal');ok(sums(r),'attribution adds up for a broker visit');eq(s.brokers[d.id],'yours','a broker is yours once');G.next(s);settleCrisis(s);eq(G.preview(s,'fundraise',{donor:d.id}).allowed,false,'you cannot visit the same broker twice');eq(G.offerView(s)?.id===d.id,false,'nor will he come back with an offer');visits++;}
 ok(visits>=15,'broker visits exercised '+visits);
 const heir=fresh(4,{background:'heir'}),nc=fresh(4,{background:'newcomer'});ok(heir.deals.developer.money>nc.deals.developer.money,'family ties open wallets wider');
 const m=fresh(6);if(m.deals.media){round(m,'fundraise',{donor:'media'});G.next(m);settleCrisis(m);eq(G.preview(m,'tv',{}).totalCost,0,'the producer gives one free appearance');}}
// Digging for dirt: from round 2, at most twice; found hurts 小馬, backfire hurts you, nothing only costs money.
{const seen={found:0,nothing:0,backfire:0};for(let seed=1;seed<=60;seed++){const s=fresh(seed);ok(!G.preview(s,'dig',{}).allowed,'no digging in round 1');while(s.day<2){G.begin(s,'fundraise',{});G.arrive(s);G.next(s);}settleCrisis(s);const p=G.preview(s,'dig',{});ok(p.allowed&&p.totalCost===G.COSTS.dig,'digging costs money');const r0=G.expectedVotes(s,1),y0=G.expectedVotes(s,0);G.begin(s,'dig',{});G.arrive(s);const o=s.player.actions.at(-1).dig;seen[o]++;
 if(o==='found')ok(s.recap.player.rivalHit<0,'found dirt costs 小馬 votes');if(o==='backfire')ok(s.recap.player.votes<0,'a backfire costs you votes');if(o==='nothing')eq(Math.round(s.recap.player.votes),0,'nothing found moves nothing of yours');}
 ok(seen.found&&seen.nothing&&seen.backfire,'all three outcomes happen');
 const s=fresh(5);while(s.day<2){G.begin(s,'fundraise',{});G.arrive(s);G.next(s);}for(let k=0;k<2;k++){settleCrisis(s);G.begin(s,'dig',{});G.arrive(s);G.next(s);}settleCrisis(s);ok(!G.preview(s,'dig',{}).allowed,'at most twice a game');}
// Fundraising can fall through, a newcomer more often; knowing the chiefs makes asking easier.
{let miss=0,n=0;for(let seed=1;seed<=60;seed++){const s=fresh(seed,{background:'newcomer'});const r=round(s,'fundraise');n++;if(/沒談成/.test(r.player.result||''))miss++;}ok(miss>=8&&miss<=30,'newcomer fundraising falls through '+miss+'/'+n);
 const s=fresh(5,{background:'newcomer'}),before=G.preview(s,'fundraise').expectedIncome.max;for(const c of Object.values(s.chiefs))c.visits=2;ok(G.preview(s,'fundraise').expectedIncome.max>before,'visits to chiefs raise fundraising');}

console.log(JSON.stringify({result:'passed',checks,scope:'v13.5 engine: symmetric answer costs, online streams, village chiefs, identity head starts, brokers and deals, scandals from round 5; v13.4: fixed group sides with varying strength, question draws at places and on TV, the research slot and unprepared answers, residents\' demands, faces, crowd-dependent promises, unkept guarantees and walk-backs, challenges raised where people care and clarified for money, switching costs, offers and breaches, party shares, bases, money and lines, the ladder, billboards and their fit, gifts by group, rallies after two stances, the stall, preparing two issues, background checks, the press gamble and the clean pledge, the second-act crisis, the debate edge, the final push, rival targeting, rumours, attacks and rebuttals, calling out the rival, shared swing voters, attribution sums, the fixed seat line, real-scale election, identities, the offer revealing its issue, per-source report rounds with quiet rounds, and answer and offer estimates that read only visible information. Engine only; not browser, fun or play-time validation.'}));
// Party aid: a second grant in round 5 and mobilisation from round 9, halved after one break of the party line and gone after two; none for an independent.
{const play=(aff,breakIt)=>{const s=fresh(3,{background:'heir',affiliation:aff});const line=Object.entries(G.PARTY_LINES[aff]||{});let k=0;while(s.day<G.DAYS&&s.phase==='plan'){settleCrisis(s);
  if(breakIt&&k<breakIt&&line[k]){const [t,plan]=line[k];const other=G.TOPICS[t].plans.find(p=>p.id!==plan).id;s.player.actions.push({day:s.day,action:'canvass',topic:t,answer:other});k++;}
  G.begin(s,'fundraise',{});G.arrive(s);G.next(s);}return s;};
 const kept=play('kmt',0),once=play('kmt',1),twice=play('kmt',2),ind=play('independent',0),aid=x=>x.partyAid||[];
 eq(aid(kept).map(a=>a.kind),['subsidy','mobilize'],'grant in round 5, mobilisation in round 9');eq(aid(kept)[0].money,G.PARTY_AID.subsidy,'full grant while the line holds');eq(aid(kept)[1].votes,G.PARTY_AID.mobilize.kmt,'full mobilisation');
 eq(aid(once)[0].money,G.PARTY_AID.subsidy/2,'one break halves the grant');eq(aid(twice)[1].votes,0,'two breaks and the party stays home');eq(aid(ind),[],'no party aid for an independent');
 ok(kept.player.blocs.some(b=>b.party==='kmt'&&b.status==='active'),'mobilised votes count as an organised bloc');}
// Holding off wears thin: from the third '先不答應' every group likes it less, and the answer says so.
{const s=fresh(9),t=s.landscape.active[0],first=G.answerFaces(s,t,'honest');for(let k=0;k<5;k++)s.player.actions.push({day:1,action:'canvass',topic:t,answer:'honest'});const later=G.answerFaces(s,t,'honest'),rank={up:3,slight:2,flat:1,down:0};
 ok(later.every((f,g)=>rank[f]<=rank[first[g]])&&later.some((f,g)=>rank[f]<rank[first[g]]),'faces sour after many holds: '+first+' -> '+later);}
// The five places ask five different issues each round unless 小馬's open challenge pins one, so the map is a choice of issues.
{let rounds=0,distinct=0;for(let seed=1;seed<=30;seed++){const s=fresh(seed);for(let d=1;d<=5&&s.phase==='plan';d++){settleCrisis(s);if(!(s.challenges||[]).some(c=>c.status==='open')){const asked=G.venueView(s).map(v=>G.venueTopic(s,v.id));rounds++;if(new Set(asked).size===asked.length)distinct++;}G.begin(s,'fundraise',{});G.arrive(s);G.next(s);}}
 ok(distinct/rounds>.9,'places ask different issues: '+distinct+'/'+rounds);}
// Polls: four for a party candidate (rounds 2, 4, 6, 8), two for an independent (3, 7); each gives the groups, the gap and the points it takes in each group.
{const run=aff=>{const s=fresh(6,{background:'heir',affiliation:aff});while(s.day<G.DAYS&&s.phase==='plan'){settleCrisis(s);G.begin(s,'fundraise',{});G.arrive(s);G.next(s);}return s;};
 const kmt=run('kmt'),ind=run('independent');eq((kmt.pollReports||[]).map(p=>p.day),[2,4,6,8],'four polls for a party candidate');eq((ind.pollReports||[]).map(p=>p.day),[3,7],'two for an independent');
 const p=ind.pollReports[0];eq(p.groups.length,3,'three groups');ok(p.groups.every(g=>g.youPct>=0&&g.addPct>=0),'shares and points needed are given');ok(p.need===Math.max(0,Math.round(p.line-p.you)),'the gap matches the poll');
 const v=G.pollView(ind);eq(v.latest.day,7,'the latest poll stays until the next one');eq(v.next,null,'no poll after round 7 for an independent');}
// Three faces only: like, no feeling, dislike, or unknown before research.
{const seen=new Set();for(let seed=1;seed<=20;seed++){const s=fresh(seed);for(const t of s.landscape.active)for(const m of['guarantee','honest',G.TOPICS[t].plans[0].id])for(const f of G.answerFaces(s,t,m))seen.add(f);}ok([...seen].every(f=>['up','flat','down','unknown'].includes(f)),'faces: '+[...seen].join(','));}
// Groups you do not reach cool off: a market visit full of elders leaves the young to cool, the round's recap says so.
{const s=fresh(5),v=G.venueView(s).find(x=>G.crowdMix(s,x.id)[2]<G.TUNING.cool.touch);round(s,'canvass',{venue:v.id});G.next(s);settleCrisis(s);const before=G.groupVotes(s,0)[2];round(s,'canvass',{venue:v.id});const c=s.recap.events.find(e=>e.cooled);ok(c&&c.effects.byGroup[2]<0&&c.text.includes('青年'),'the young cool off when you skip them');ok(G.groupVotes(s,0)[2]<before,'their support for you falls');
 const f=fresh(5);round(f,'fundraise');G.next(f);settleCrisis(f);round(f,'fundraise');ok(f.recap.events.find(e=>e.cooled)?.effects.byGroup.every(x=>x<0),'a round off the streets cools every group');}
// Guarantees wear thin too: from the third one, every group believes it less.
{const s=fresh(9),t=s.landscape.active[0],rank={up:2,flat:1,down:0},first=G.answerFaces(s,t,'guarantee');for(let k=0;k<6;k++)s.player.actions.push({day:1,action:'canvass',topic:t,answer:'guarantee'});const later=G.answerFaces(s,t,'guarantee');
 ok(later.every((f,g)=>rank[f]<=rank[first[g]])&&later.some((f,g)=>rank[f]<rank[first[g]]),'guarantees sour after many: '+first+' -> '+later);}

