'use strict';
// A small, deterministic rules check for the plan / collision / payoff loop.
// This checks engine behaviour, not balance, browser rendering or human enjoyment.
const A=require('node:assert/strict'),G=require('../dist/day-engine');
let checks=0;
const ok=(v,m)=>{checks++;A.ok(v,m);},eq=(a,b,m)=>{checks++;A.deepEqual(a,b,m);},close=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m+': '+a+' / '+b),copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(seed=19)=>{const s=G.initial(seed,{background:'heir',affiliation:'independent'});ok(G.start(s),'start');return s;};
const settle=s=>{if(s.crisis?.status==='pending')ok(G.respondCrisis(s,'apologize'),'resolve crisis before choosing an itinerary');};
const answerFor=q=>{const unlocked=q.options.filter(o=>o.unlocked),concrete=unlocked.filter(o=>!['honest','guarantee','counter'].includes(o.id));return(concrete.length?concrete:unlocked).sort((a,b)=>{const score=o=>o.estimate?.total??o.faces?.reduce((n,f)=>n+(f==='up'?1:f==='down'?-1:0),0)??0;return score(b)-score(a);})[0].id;};
function finishAction(s,answer){G.arrive(s);if(s.phase==='question'){const q=G.question(s),id=typeof answer==='function'?answer(q,s):answer||answerFor(q);ok(G.answer(s,id),'answer accepted');}eq(s.phase,'recap','the itinerary settles exactly one round');const r=s.recap;close(r.attribution.reduce((n,a)=>n+(a.source==='rival'?a.effectOnYou:a.votes),0),r.totalVotes,'round source totals reconcile');close(r.player.teamReports.reduce((n,x)=>n+(x.votes||0),0),r.player.teamVotes,'team effects reconcile');return r;}
function step(s,id,config={},answer){settle(s);const p=G.preview(s,id,config),spent=s.budget.spent;ok(p.allowed,p.reason||id+' allowed');ok(G.begin(s,id,config),'begin '+id);const r=finishAction(s,answer);eq(s.budget.spent-spent,p.totalCost,'preview and ledger cost agree');return r;}
const advance=s=>{ok(G.next(s),'advance');settle(s);};
function throughOpening(seed=19){const s=fresh(seed),venue='market',pool=G.venueView(s).find(v=>v.id===venue).pool;step(s,'prepare',{topic:pool[0],research:pool.slice(1)});advance(s);step(s,'canvass',{venue});advance(s);return s;}
function conflictState(seed=19){const s=throughOpening(seed);const o=G.campaignView(s).opportunity;ok(o&&o.status==='upcoming','the collision is signalled before the decision round');eq(o.round,4,'the early prototype collision happens in the middle act');for(const c of o.choices)ok(!G.preview(s,c.action,c.config).allowed,'the future appointment cannot be taken early');step(s,'prepare',{topic:G.topicsOf(s).find(t=>s.player.insight?.[t]?.level!=='precise')});advance(s);return s;}
const choice=(s,id)=>G.campaignView(s).opportunity.choices.find(x=>x.id===id);

ok(Array.isArray(G.CAMPAIGN_PLANS),'campaign plans exported');eq(G.CAMPAIGN_PLANS.map(x=>x.id).sort(),['media','organization'],'two clear strategic intentions');
for(const started of [false,true]){
 const s=started?fresh():G.initial(19),unchanged=()=>copy({budget:s.budget,player:s.player,voters:s.voters,ledger:s.ledger,day:s.day,phase:s.phase});
 G.upgrade(s);const before=unchanged();for(const id of ['organization','media','organization']){ok(G.setCampaignPlan(s,id),'choose strategy');eq(G.campaignView(s).plan,id,'selected intention is visible');eq(unchanged(),before,'choosing an intention grants no resources or support');}
 const prior=copy(s);eq(G.setCampaignPlan(s,'automatic-win'),false,'unknown strategy rejected');eq(s,prior,'invalid intent leaves state unchanged');
}

{
 const base=conflictState(),o=G.campaignView(base).opportunity;eq(o.status,'open','both appointments now compete for this round');eq(o.choices.length,2,'two competing appointments');ok(o.choices.every(c=>c.allowed),'both routes are available without picking that intention');
 const local=copy(base),normal=copy(base),c=choice(local,'organization'),cost=G.preview(local,c.action,c.config).totalCost,before=copy(local.budget);ok(G.begin(local,c.action,c.config),'commit the local appointment');
 const committed=copy(local);eq(G.begin(local,'tv',choice(base,'media').config),false,'a second appointment cannot be committed');eq(local,committed,'double click changes nothing');eq(G.setCampaignPlan(local,'media'),false,'an in-flight choice cannot be changed');
 const reloaded=copy(local),report=finishAction(local);finishAction(reloaded);eq(local,reloaded,'save and reload preserve the selected appointment and settlement');eq(local.budget.spent-before.spent,cost,'appointment cost matches its preview');
 const plain=step(normal,'canvass',{venue:c.config.venue});close(report.player.teamVotes,plain.player.teamVotes,'the new local team does not work during its founding meeting');eq(local.voters,normal.voters,'founding the team does not secretly grant immediate votes');
 const taken=G.campaignView(local).opportunity;eq(taken.status,'taken','selected appointment is recorded');eq(taken.chosen,'organization','the chosen route is recorded');ok(G.campaignView(local).assets.length>0,'the new local team is visible');
 advance(local);advance(normal);const mine=step(local,'fundraise'),control=step(normal,'fundraise'),ordinaryIds=new Set(control.player.teamReports.map(x=>x.id)),network=mine.player.teamReports.filter(x=>!ordinaryIds.has(x.id));
 ok(network.length>0,'the local team works while the candidate takes another action');for(const r of network){ok(r.reach>0,'the team contacts real model voters');close(r.groups.reduce((n,g)=>n+g.votes,0),r.votes,'network votes come from its contacts');}
 ok(local.voters.some((v,i)=>v.support[0]!==normal.voters[i].support[0]),'the local team changes support, not just a displayed counter');
 const protectedGroup=local.landscape.main[c.config.venue],cooled=mine.events.find(e=>e.cooled),controlCooled=control.events.find(e=>e.cooled);eq(cooled?.effects.byGroup[protectedGroup]||0,0,'the active local team prevents neglect cooling in its own main group');ok(controlCooled?.effects.byGroup[protectedGroup]<0,'the same group cools when nobody is covering the place');
 const settled=copy(local);eq(G.arrive(local),false,'settlement cannot be replayed');eq(local,settled,'local work is not paid twice');advance(local);ok(!G.preview(local,'tv',choice(base,'media').config).allowed,'the foregone appointment cannot be recovered in a later round');
}
{
 const s=conflictState(7);step(s,'fundraise');advance(s);const missed=G.campaignView(s).opportunity;eq(missed.status,'missed','keeping the original itinerary visibly lets both appointments lapse');eq(missed.chosen,null,'skipping does not pick a route for the player');eq(G.campaignView(s).assets.length,0,'no free local team appears after a missed meeting');
}

for(const venue of ['street','river']){
 const s=fresh(),pool=G.venueView(s).find(v=>v.id===venue).pool;ok(!G.CHIEFS[venue],'fixture is a place without a village chief');ok(G.setCampaignPlan(s,'organization'),'choose a local campaign');
 step(s,'canvass',{venue,research:pool.slice(0,2)});advance(s);ok(!G.campaignView(s).progress.find(x=>x.label.includes('跑熟')).done,'one visit does not complete the repeat-visit milestone');
 step(s,'canvass',{venue});advance(s);ok(G.campaignView(s).progress.find(x=>x.label.includes('跑熟')).done,'two visits count even without a village chief');eq(choice(s,'organization').config.venue,venue,'the announced founding meeting follows the visited place');
 step(s,'prepare',{topic:G.topicsOf(s).find(t=>s.player.insight?.[t]?.level!=='precise')});advance(s);const c=choice(s,'organization');eq(c.config.venue,venue,'the appointment keeps its announced location');step(s,c.action,c.config);eq(s.campaign.network.venue,venue,'the persistent local team is based at that place');ok(G.campaignView(s).assets.some(a=>a.title.includes(G.VENUES[venue].title)),'the visible team names the correct location');
}
{
 const s=conflictState(),c=choice(s,'media'),announcedTopic=c.config.topic;s.player.tvCredit=1;
 eq(G.preview(s,c.action,c.config).totalCost,0,'the invitation includes the interview fee');const spent=s.budget.spent,r=step(s,c.action,c.config);eq(s.budget.spent,spent,'the invitation really costs no money');eq(s.player.tvCredit,1,'a separately earned TV credit is preserved');eq(r.player.topic,announcedTopic,'the announced interview topic does not reroll');eq(G.campaignView(s).opportunity.chosen,'media','media choice is recorded');eq(G.campaignView(s).assets.length,0,'the local team cannot also form');
 ok(r.player.prepared&&r.player.direct.votes>0,'this prepared interview has a positive audience response');advance(s);const f=G.campaignView(s).followup;ok(f&&f.allowed,'the response creates a next-round follow-up');const p=G.preview(s,f.action,f.config),regular=G.preview(s,'online');eq(p.topic,announcedTopic,'the follow-up continues the original topic');ok(p.expectedReach.min>regular.expectedReach.min&&p.expectedReach.max>regular.expectedReach.max,'the invitation has a visible reach advantage');
 const used=copy(s),ordinary=copy(s),missed=copy(s),boosted=step(used,f.action,f.config),plain=step(ordinary,'online');ok(boosted.player.effects.contacts>plain.player.effects.contacts,'the reach advantage is applied to real contacts');eq(boosted.player.topic,announcedTopic,'the follow-up does not silently draw another topic');advance(used);eq(G.campaignView(used).followup,null,'a follow-up does not produce an endless chain of itself');ok(!G.preview(used,f.action,f.config).allowed,'the used invitation cannot be repeated');
 step(missed,'fundraise');advance(missed);eq(G.campaignView(missed).followup,null,'taking a different action lets the media moment expire');ok(!G.preview(missed,f.action,f.config).allowed,'an expired invitation cannot be recovered');
}
{
 const s=fresh(8),pool=G.tvPool(s);step(s,'prepare',{topic:pool[0],research:pool.slice(1)});advance(s);const topic=G.tvPool(s).find(t=>s.player.known.includes(t));ok(topic,'a prepared topic is available for a normal interview');const r=step(s,'tv',{brief:topic});ok(r.player.direct.votes>0,'the ordinary prepared appearance earns a positive response');advance(s);ok(G.campaignView(s).followup,'follow-ups are earned by ordinary appearances too, not by a strategy label');
}
{
 const s=fresh(),topic=G.tvPool(s)[0];step(s,'tv',{brief:topic});advance(s);
 // Hold the voter state, TV count and day fixed; only whether the last itinerary was TV differs.
 const rested=copy(s);rested.player.actions.at(-1).action='fundraise';const p=G.preview(s,'tv'),q=G.preview(rested,'tv');ok(p.mediaFatigue<1,'consecutive appearances are visibly fatigued');eq(q.mediaFatigue,1,'a different itinerary breaks the streak');ok(p.expectedReach.min<q.expectedReach.min&&p.expectedReach.max<q.expectedReach.max,'fatigue reduces the preview reach');
 const said=s.player.actions.at(-1).answer,estimate=G.answerEstimate(s,topic,said,{id:'tv'}),restedEstimate=G.answerEstimate(rested,topic,said,{id:'tv'});ok(estimate&&restedEstimate,'prepared TV answers expose an estimate');ok(estimate.people<restedEstimate.people,'answer estimates also reflect the fatigued audience');
 const expectedFactor=p.mediaFatigue;ok(G.begin(s,'tv'),'commit the repeated appearance');eq(G.tvFatigue(s,s.player),expectedFactor,'the pending action is not counted as an extra repeated round');const repeated=finishAction(s),recovered=step(rested,'tv');ok(repeated.player.effects.contacts<recovered.player.effects.contacts,'fatigue reduces the actual contacted audience');advance(s);step(s,'fundraise');advance(s);eq(G.preview(s,'tv').mediaFatigue,1,'an actual intervening itinerary resets the streak');
}
{
 const s=fresh(),topic=G.tvPool(s)[0],first=step(s,'tv',{brief:topic});advance(s);const config={brief:topic},p=G.preview(s,'tv',config);eq(p.topic,topic,'the repeat fixture uses the same topic');ok(!p.willAsk,'unchanged prepared stances do not ask again');eq(p.reuseAnswer,first.player.answer,'the original concrete answer is retained');
 const repeat=copy(s);ok(G.begin(repeat,'tv',config),'begin the repeat');G.arrive(repeat);eq(repeat.phase,'recap','repeat resolves without another answer screen');eq(repeat.recap.player.answer,first.player.answer,'auto resolution does not substitute the honest fallback');
 ok(G.preview(s,'tv',{...config,revise:true}).willAsk,'the player can deliberately reopen their answer');
 const newlyKnown=copy(s);newlyKnown.player.actions.at(-1).prepared=false;ok(G.preview(newlyKnown,'tv',config).willAsk,'a previous unprepared statement is reconsidered once research is available');
 const challenged=copy(s);challenged.challenges.push({id:'route-test-challenge',kind:'stance',topic,status:'open',plan:G.TOPICS[topic].plans.findIndex(x=>x.id===first.player.answer),quote:first.player.quote,evidence:'小馬質疑這個做法。',issuedDay:1,deadline:2,audience:[],hit:0});ok(G.preview(challenged,'tv',config).willAsk,'a new challenge reopens a previously prepared stance');
}

console.log(JSON.stringify({result:'passed',checks,scope:'Campaign intentions, one-round conflicting appointments, delayed local-team work, media follow-up windows, TV repetition and repeated-answer rules; engine only, not balance, browser or fun validation.'}));
