'use strict';
// Behavioural regressions for compact staffing, deliberate rounds and commandable campaign assets.
const A=require('node:assert/strict'),G=require('../dist/day-engine');
let checks=0;
const ok=(x,m)=>{checks++;A.ok(x,m);},eq=(a,b,m)=>{checks++;A.deepEqual(a,b,m);},near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m+': '+a+' / '+b),copy=x=>JSON.parse(JSON.stringify(x));
function fresh(seed=19,background='heir'){const s=G.initial(seed,{background,affiliation:'independent'});ok(G.start(s),'new game starts');return s;}
function settle(s){if(s.crisis?.status==='pending')ok(G.respondCrisis(s,'apologize'),'crisis resolved');}
function next(s){ok(G.next(s),'one explicit continue advances');settle(s);}
function finish(s,pick){ok(G.arrive(s),'arrive once');if(s.phase==='question'){const q=G.question(s),answer=typeof pick==='function'?pick(q,s):pick||q.options.find(o=>o.unlocked&&G.TOPICS[s.pending.topic]?.plans.some(p=>p.id===o.id))?.id||q.options.find(o=>o.unlocked).id;ok(G.answer(s,answer),'answer accepted');}eq(s.phase,'recap','each action stops at recap');const r=s.recap;near(r.summary.sources.reduce((n,x)=>n+x.votes,0),r.totalVotes,'summary reconciles the actual round');ok(r.summary.before?.rank>0&&r.summary.after?.rank>0,'rank comparison includes the first round');ok(!r.summary.sources.some(x=>x.id==='other-round'&&Math.abs(x.votes)>.0001),'no unexplained vote balancing item');return r;}
function run(s,id,config={},pick){settle(s);ok(G.begin(s,id,config),G.preview(s,id,config).reason||'begin '+id);return finish(s,pick);}

// Hiring has a useful incremental cost and the worker starts next round, with no hidden batch jump.
{
 const s=fresh();eq(G.RECRUIT_LEVELS,[2,3,4],'compact recruitment levels');eq(G.MAX_HELPERS,4,'new game cap');
 for(const count of [3,4]){const p=G.preview(s,'recruit');eq(p.recruitCount,1,'one new helper');eq(p.nextRosterSize,count+1,'roster includes candidate separately');const existing=s.player.team.members.length,before=s.budget.available;const r=run(s,'recruit');eq(s.player.team.members.length,count,'recruitment increments once');eq(r.player.teamReports.filter(x=>x.id!=='local-network').length,existing,'new hire does not work on arrival day');eq(before-s.budget.available,p.totalCost,'quoted contract cost paid');next(s);}
 eq(G.preview(s,'recruit').allowed,false,'cap enforced for player');
 const legacy=copy(s);legacy.player.team.members.push({id:'old-paid',name:'舊助手',hiredDay:0});const original=copy(legacy.player.team.members);G.upgrade(legacy);eq(legacy.player.team.members,original,'paid legacy roster is preserved');eq(G.preview(legacy,'recruit').allowed,false,'legacy roster cannot expand');ok(G.preview(legacy,'fundraise').legacyTeam,'legacy cap is explicitly reported');
}

{const s=fresh(19,'incumbent');eq(s.player.team.members.length,3,'incumbent starts with a small staffing edge');eq(G.preview(s,'recruit').recruitCount,1,'incumbent still has a meaningful recruitment choice');}

// Repeated public answers and old in-flight saves must always give control back to the player.
{
 const s=fresh(),topic=G.tvPool(s)[0];s.budget.available=3000000;const first=run(s,'tv',{brief:topic});next(s);const p=G.preview(s,'tv',{brief:topic});eq(p.willAsk,true,'repeat is a question');eq(p.reuseAnswer,null,'no silent answer');ok(G.begin(s,'tv',{brief:topic}),'begin repeated stance');s.pending.willAsk=false;ok(G.arrive(s),'old pending auto-answer migrates');eq(s.phase,'question','old pending save also asks');const q=G.question(s);eq(q.previousAnswer.answer,first.player.answer,'previous public answer provided');eq(q.options.find(o=>o.preselected).id,first.player.answer,'previous answer is preselected');ok(q.options.every(o=>o.estimate===null),'answer screen exposes no exact vote forecasts');const other=q.options.find(o=>o.unlocked&&G.TOPICS[topic].plans.some(p=>p.id===o.id)&&o.id!==first.player.answer);ok(other.tags.some(t=>t.kind==='flip'),'changing stance explains its consequence');G.answer(s,first.player.answer);eq(s.phase,'recap','confirm stance still stops for settlement');
}

// Research communicates only justified knowledge; helper depth never pretends to be personal study.
{
 const s=fresh(),topic='health',plan=G.TOPICS[topic].plans[0].id;eq(G.answerReactions(s,topic,plan).map(x=>x.mark),['？','？','？'],'unknown research stays unknown');run(s,'prepare',{topic:'childcare',research:[topic],deep:true});next(s);ok(!s.player.studied[topic],'helper precise is not personal study');ok(G.answerReactions(s,topic,plan).every(x=>['＋','−','分歧'].includes(x.mark)),'helper marks only direction');run(s,'prepare',{topic});next(s);ok(G.answerReactions(s,topic,plan).some(x=>['＋＋','−−'].includes(x.mark)),'personal study reveals strength');
}

// A campaign-wide TV count cannot be reset by inserting a fundraising action.
{
 const s=fresh();s.budget.available=3000000;run(s,'tv',{brief:G.tvPool(s)[0]});next(s);const once=G.tvFatigue(s,s.player);ok(once<1,'first repeat fatigued');run(s,'fundraise');next(s);near(G.tvFatigue(s,s.player),once,'resting does not erase previous TV reach');const before=G.tvFatigue(s,s.player);ok(G.begin(s,'tv'),'begin next TV');near(G.tvFatigue(s,s.player),before,'pending appearance not double counted');finish(s);next(s);ok(G.tvFatigue(s,s.player)<once,'next appearance adds fatigue');
}

// Local work is earned, commandable, additive and limited to one team.
{
 const s=fresh();s.budget.available=3000000;const topic=G.tvPool(s)[0];run(s,'tv',{brief:topic});next(s);eq(G.networkView(s).active,false,'no team from a strategy label');run(s,'canvass',{venue:'market'});eq(G.networkView(s).active,true,'visited endorsing chief forms a team');eq(s.recap.player.network,null,'new team does not work in its founding round');next(s);const view=G.networkView(s);ok(view.ready&&view.topics.some(t=>t.id===topic),'actual public policy available for assignment');ok(G.setNetworkAssignment(s,{venue:'market',topic}),'assign earned place and public policy');const before=copy(s.campaign.network);eq(G.setNetworkAssignment(s,{venue:'river',topic}),false,'unearned place rejected');eq(G.setNetworkAssignment(s,{venue:'market',topic:'not-public'}),false,'unpublished topic rejected');eq(s.campaign.network,before,'bad assignment is nonmutating');const r=run(s,'fundraise');ok(r.player.network.reach>0,'team contacts actual voters while candidate fundraises');eq(r.player.network.topic,topic,'selected policy is used');near(r.player.network.groups.reduce((n,x)=>n+x.votes,0),r.player.network.votes,'team effect comes from reached voters');near(r.summary.sources.find(x=>x.id==='network')?.votes||0,r.player.network.votes,'team shown independently in recap');eq(r.events.find(e=>e.cooled)?.effects.byGroup[s.landscape.main.market]||0,0,'team protects its active local group');next(s);
 const choice=G.campaignView(s).opportunity.choices.find(x=>x.id==='organization');run(s,choice.action,choice.config);eq(s.campaign.network.boost,G.NETWORK.founding,'founding invitation expands the same team');eq(s.recap.summary.opportunity,'organization','R4 tradeoff included in recap');eq(s.player.team.members.length,2,'local team does not add invisible salaried helpers');next(s);const after=run(s,'fundraise');eq(after.player.teamReports.filter(x=>x.id==='local-network').length,1,'still exactly one local team');
}
{
 const s=fresh(3,'incumbent');ok(G.networkView(s).topics.every(t=>t.id!==s.player.actions.find(a=>a.record)?.topic),'preloaded prior-term record not a new public policy');for(let d=1;d<4;d++){eq(G.campaignView(s).opportunity,null,'future collision is not spoiled');run(s,'fundraise');next(s);}const o=G.campaignView(s).opportunity;eq(o.status,'open','invitation appears when actionable');ok(!o.text.includes('原定'),'invitation invents no prior appointment');
}

// Withdrawing an assigned plan uses the same latest valid public policy in the UI and actual work.
{
 const s=fresh(3,'incumbent');s.budget.available=3000000;run(s,'canvass',{venue:'market'});eq(s.recap.player.topic,'health','fixture publishes a health plan');next(s);run(s,'tv',{brief:'housing'});next(s);ok(G.setNetworkAssignment(s,{topic:'health'}),'assign health before retracting its concrete plan');run(s,'tv',{brief:'health'},'guarantee');next(s);const stored=copy(s.campaign.network),v=G.networkView(s);eq(v.topic,'housing','view falls back to an available public policy');eq(s.campaign.network,stored,'view remains read-only');eq(v.topics.map(x=>x.id),['housing'],'guarantee is not a usable local policy');const r=run(s,'fundraise');eq(r.player.network.topic,v.topic,'actual work follows the displayed policy');ok(r.player.network.reach>0,'stale assignment does not leave the team silently idle');
}
{
 const s=fresh(3,'incumbent');s.budget.available=3000000;run(s,'canvass',{venue:'market'});next(s);run(s,'tv',{brief:'health'},'guarantee');next(s);eq(G.networkView(s).topic,null,'no concrete public policy means no selection');eq(G.networkView(s).topics,[],'prior-term records cannot fill the missing policy');const r=run(s,'fundraise');eq(r.player.network.reach,0,'team waits when no valid policy remains');eq(r.player.network.votes,0,'waiting team creates no invented votes');
}
{
 const s=fresh(3,'incumbent');s.budget.available=3000000;run(s,'canvass',{venue:'market'});next(s);run(s,'tv',{brief:'housing'});next(s);ok(G.setNetworkAssignment(s,{topic:'health'}),'retain an explicit policy while adding another');run(s,'tv',{brief:'childcare'});next(s);run(s,'tv',{brief:'health'},'guarantee');next(s);eq(G.networkView(s).topic,'childcare','fallback picks the latest available public policy, not catalog order');const r=run(s,'fundraise');eq(r.player.network.topic,'childcare','latest fallback is also used by real work');
}

// Follow-up reach is tied to audience fit; viral dice do not dominate this earned invitation.
{
 const s=fresh();s.day=3;s.campaign.followup={round:3,topic:'housing',used:false};const high=G.preview(s,'online',{campaignFollowup:true}),f=G.followupFit(s,'housing');eq(f.tier,'high','housing fits young viewers');s.campaign.followup.topic='health';const low=G.preview(s,'online',{campaignFollowup:true});eq(G.followupFit(s,'health').tier,'low','health less salient to young viewers');ok(high.expectedReach.min>low.expectedReach.max,'fit materially changes reach');s.campaign.followup.topic='housing';ok(G.begin(s,'online',{campaignFollowup:true}),'begin fitted followup');eq(s.pending.viral,1,'followup bypasses the viral lottery');eq(s.phase,'travel','invitation still starts a full round');G.arrive(s);eq(s.phase,'question','followup asks before settlement');G.answer(s,G.question(s).options.find(o=>o.unlocked).id);eq(s.phase,'recap','followup leaves a real result');
}

// Grading uses the actual result table, including ties, without inventing a first-place target.
{
 const tally=Array.from({length:27},(_,i)=>({rank:i+1,votes:30000-i*1000}));for(const [rank,id]of [[9,'high'],[10,'high'],[11,'steady'],[12,'narrow'],[13,'narrow'],[14,'lost']])eq(G.resultGrade({rank,playerVotes:tally[rank-1].votes,tally}).id,id,'grade boundary '+rank);eq(G.resultGrade({rank:10,tally}).next,null,'top tier has no fake first-place target');eq(G.resultGrade({rank:12,playerVotes:19000,tally}).next.votesNeeded,1001,'next tier beats actual table cutoff');
}

// Multiple actual campaigns exercise breakdowns after challenges, offers, chief support and crises.
for(const background of ['newcomer','heir','incumbent'])for(let seed=1;seed<=8;seed++){
 const s=fresh(seed,background);s.budget.available+=2000000;
 while(s.phase!=='result'){
  settle(s);if(G.offerView(s))G.respondOffer(s,seed%2?'accept':'decline');
  const research=G.topicsOf(s).filter(t=>s.player.insight?.[t]?.level!=='precise').slice(0,Math.max(0,s.player.team.members.length-1));let id='fundraise',config={research,booth:true};
  if(s.day===1){id='prepare';config={topic:'health',research};}else if(s.day===4){const o=G.campaignView(s).opportunity.choices[seed%2];id=o.action;config={...o.config,research};}else if(s.day===G.DEBATE_ROUND){id='debate';config={research};}else if(s.day%2===0){id='canvass';config={venue:Object.keys(G.VENUES)[seed%Object.keys(G.VENUES).length],research};}
  run(s,id,config);next(s);
 }
 eq(s.result.grade,G.resultGrade(s.result),'persisted grade reflects actual results');
}
console.log(JSON.stringify({result:'passed',checks,scope:'Compact recruitment, deliberate public replies, research signals, single assigned local team, campaign-wide media fatigue, source-reconciled recaps and endgame grades; not balance or fun acceptance.'}));
