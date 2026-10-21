'use strict';
// v12 engine rules: issue landscape, research levels, credibility, unkept guarantees, forecast, rival rumours,
// deadlines and vote attribution. Engine checks only; not browser rendering or human play time.
const A=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),G=require('../dist/legacy-v12/day-engine');
let checks=0;const eq=(a,b,m)=>{checks++;A.deepEqual(a,b,m);},ok=(v,m)=>{checks++;A.ok(v,m);},copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(seed,settings)=>{const s=G.initial(seed,settings);G.start(s);return s;};
const venueFor=t=>Object.keys(G.VENUES).find(v=>G.VENUES[v].topics.includes(t));
const majorityPlan=(s,t)=>G.TOPICS[t].plans[s.landscape.lean[t]>.5?0:1].id,minorityPlan=(s,t)=>G.TOPICS[t].plans[s.landscape.lean[t]>.5?1:0].id;
// One full round through the public API; answer may be an option id or a function of the question.
function round(s,id,config={},answer){const before=copy(s),p=G.preview(s,id,config);ok(p.allowed,p.reason);G.begin(s,id,config);const reload=copy(s);for(const x of[s,reload]){G.arrive(x);if(x.phase==='question'){const q=G.question(x),want=typeof answer==='function'?answer(q,x):answer,o=q.options.find(o=>o.id===want&&o.unlocked)||q.options.find(o=>o.unlocked);ok(G.answer(x,o.id),'answer accepted');}}eq(s,reload,'reload mid-round settles identically');eq(s.budget.spent-before.budget.spent,p.totalCost,'preview cost exact');return s.recap;}
const finish=s=>{while(s.phase!=='result'){if(s.phase==='recap'){G.next(s);continue;}round(s,'fundraise',{teamMode:'together'});}return s.result;};

// Version, preserved v11 runtime and isolation from older saves.
eq(G.VERSION,12,'v12 engine');const hashes=require('./fixtures/v11-runtime-hashes.json');for(const [f,h]of Object.entries(hashes))eq(crypto.createHash('sha256').update(fs.readFileSync('dist/legacy-v11/'+f)).digest('hex'),h,'preserved v11 runtime '+f);
const old=require('../dist/legacy-v11/day-engine').initial(5),oldCopy=copy(old);eq(G.start(old),false,'v12 never starts a v11 state');eq(G.upgrade(old),oldCopy,'v11 state untouched');

// Landscape: seeded, independent of background, party and agreement, and never keyed by venue.
for(let seed=1;seed<=40;seed++){
 const a=G.initial(seed),b=G.initial(seed,{affiliation:'kmt',background:'organizer',contract:'reform'});
 eq(a.landscape,b.landscape,'landscape ignores opening settings');eq(a.voters.map(v=>[v.cares,v.pref]),b.voters.map(v=>[v.cares,v.pref]),'voter issues ignore opening settings');
 eq(Object.keys(a.voters[0]).sort(),['accuracy','cares','pref','rec','support'],'synthetic voter fields only');
 for(const t of G.POLICY_TOPICS){ok([.3,.4,.6,.7].includes(a.landscape.lean[t]),'lean is never a coin flip');const share=a.voters.filter(v=>G.prefers(v,t)===0).length/a.voters.length;ok(Math.abs(share-a.landscape.lean[t])<.07,'voter preferences follow the seeded lean');}
 ok(G.POLICY_TOPICS.filter(t=>a.landscape.weights[t]>=2.4).length===1,'exactly one clearly hottest issue');ok(a.landscape.surge.round>=4&&a.landscape.surge.round<=7&&a.landscape.surge.topic!==G.POLICY_TOPICS.reduce((x,y)=>a.landscape.weights[x]>a.landscape.weights[y]?x:y),'surge comes mid-campaign on another issue');
}

// Answering the majority approach beats the minority one; hot issues move more votes than cold ones.
let majorityWins=0,hotWins=0,n=0;
for(let seed=1;seed<=24;seed++){
 const base=fresh(seed),order=G.POLICY_TOPICS.filter(t=>t!=='welfare').sort((x,y)=>base.landscape.weights[y]-base.landscape.weights[x]),hot=order[0],cold=order.at(-1);
 const run=(topic,pick)=>{const s=copy(base);return round(s,'tv',{topic,teamMode:'research'},(q,x)=>pick(x,topic)).attribution.find(a=>a.source==='player').votes;};
 if(run(hot,majorityPlan)>run(hot,minorityPlan))majorityWins++;if(run(hot,majorityPlan)>run(cold,majorityPlan))hotWins++;n++;
}
ok(majorityWins>=n*.9,'majority approach wins in nearly every seed: '+majorityWins+'/'+n);ok(hotWins>=n*.75,'hot issue answered well beats a cold one: '+hotWins+'/'+n);

// Research levels: assistant reports side or "close"; the candidate's own reading gives the share and +3 credibility once.
for(let seed=1;seed<=30;seed++){
 const s=fresh(seed),t='access';round(s,'canvass',{topic:t,venue:'market',teamMode:'research'},q=>q.options.find(o=>o.unlocked).id);const ins=s.player.insight[t],lean=s.landscape.lean[t],close=Math.abs(lean-.5)<.15;
 eq(ins.level,'direction','assistant research gives a direction');eq(ins.close,close,'close issues reported as close');if(!close)eq(ins.side,lean>.5?0:1,'clear side matches the seeded majority');G.next(s);
 const own=round(s,'prepare',{topic:t});eq(s.player.insight[t].level,'precise','own preparation gives the share');ok(Math.abs(s.player.insight[t].share-lean*100)<=3,'share within three points');eq(own.credibility.filter(c=>c.reason.includes('親自讀完')).map(c=>c.delta),[3],'own reading adds credibility once');G.next(s);
 const again=round(s,'prepare',{topic:t});eq(again.credibility.filter(c=>c.reason.includes('親自讀完')).length,0,'re-reading gives no further credibility');
}

// Credibility: each option previews exactly what answering it does.
for(let seed=1;seed<=12;seed++){
 const s=fresh(seed),t='access';G.begin(s,'canvass',{topic:t,venue:'market',teamMode:'research'});G.arrive(s);
 for(const o of G.question(s).options.filter(o=>o.unlocked)){const x=copy(s),before=x.player.credibility;G.answer(x,o.id);eq(x.player.credibility-before,o.credibility,'credibility preview exact for '+o.id);}
}
{const s=fresh(3),t='access',[a,b]=G.TOPICS[t].plans.map(p=>p.id);round(s,'canvass',{topic:t,venue:'market',teamMode:'research'},a);G.next(s);const c=s.player.credibility;round(s,'canvass',{topic:t,venue:'market',responseMode:'answer'},b);eq(s.player.credibility,c-3,'switching approach on the same issue costs credibility');}

// Unkept guarantees: unexplained at the vote they cost the people who heard them; correcting avoids it.
let earlyWorse=0;n=0;
for(let seed=1;seed<=30;seed++){
 const base=fresh(seed);const kept=copy(base),loud=copy(base);
 round(kept,'canvass',{topic:'access',venue:'market'},'honest');round(loud,'canvass',{topic:'access',venue:'market'},'guarantee');
 const unkept=finish(loud),honest=finish(kept);ok(unkept.unkept.length===1&&unkept.unkept[0].votes<0,'unkept guarantee is listed with a loss');eq(honest.unkept,[],'honest answer leaves nothing unkept');
 if(G.expectedVotes(loud)<G.expectedVotes(kept))earlyWorse++;n++;
}
ok(earlyWorse>=n*.8,'an early unkept guarantee ends below an honest answer: '+earlyWorse+'/'+n);
{const s=fresh(9);round(s,'canvass',{topic:'access',venue:'market'},'guarantee');G.next(s);round(s,'canvass',{topic:'access',venue:'market',responseMode:'answer'},'honest');eq(finish(s).unkept,[],'a corrected guarantee is not charged at the vote');}

// Forecast and rumour: deterministic, honest about their accuracy.
let rumours=0,accurate=0;
for(let seed=1;seed<=150;seed++){const s=fresh(seed);while(s.phase!=='result'){if(s.phase==='recap'){G.next(s);continue;}const f=G.forecast(s);eq(f,G.forecast(copy(s)),'forecast is deterministic');if(f.next){const rain=G.forecast({...copy(s),day:f.next.day}).now.id==='rain';ok(rain?f.next.rainChance>=60&&f.next.rainChance<=80:f.next.rainChance>=10&&f.next.rainChance<=30,'rain chance tied to the real outcome');}
 const plan=s.rivalPlan,rumor=G.rumorView(s);ok(rumor&&plan.round===s.day,'a rumour exists every round');rumours++;if(plan.rumor.topic===plan.topic)accurate++;const weather=f.now;const r=round(s,'fundraise',{teamMode:'together'});eq(r.weather,weather,'forecast matches the round');eq(r.rival.topic,plan.topic,'rival executes the planned topic');}}
ok(Math.abs(accurate/rumours-.8)<.04,'rumours are about eighty percent accurate: '+(accurate/rumours).toFixed(3));

// Pre-empting: answering the rival's planned topic first with a prepared plan halves him and blocks his challenge.
let preempts=0;
for(let seed=1;seed<=200&&preempts<5;seed++){const s=fresh(seed);while(s.phase!=='result'&&preempts<5){if(s.phase==='recap'){G.next(s);continue;}const plan=s.rivalPlan,t=plan.topic;
 if(['tv','canvass'].includes(plan.action)&&G.preview(s,'tv',{topic:t,teamMode:'research'}).allowed){const r=round(s,'tv',{topic:t,teamMode:s.player.known.includes(t)?'together':'research'},(q,x)=>majorityPlan(x,t));ok(r.rival.preempted===true&&r.rival.scale===.5,'pre-empted rival works at half strength');eq(r.rival.challenge,null,'pre-empted rival leaves no challenge');preempts++;}
 else round(s,'fundraise',{teamMode:'together'});}}
ok(preempts>=5,'pre-emption exercised');

// Deadlines: a challenge left unanswered expires once at its deadline; answering in time settles it.
let expired=0,answered=0;
for(let seed=1;seed<=200&&(expired<4||answered<4);seed++){
 const s=fresh(seed);round(s,'canvass',{topic:'access',venue:'market'},'guarantee');G.next(s);
 for(let guard=0;guard<6&&s.phase!=='result';guard++){if(s.phase==='recap'){G.next(s);continue;}const open=G.pendingChallenges(s)[0];
  if(open&&answered<=expired){const r=round(s,'tv',{topic:open.topic,teamMode:'together'},'honest');eq(s.challenges.find(c=>c.id===open.id).status,'answered','answering in time settles the challenge');ok(!r.events.some(e=>e.challengeId===open.id),'no expiry once answered');answered++;break;}
  const cred=s.player.credibility,r=round(s,'fundraise',{teamMode:'together'}),gone=r.events.filter(e=>e.challengeId);
  if(gone.length){const c=s.challenges.find(c=>c.id===gone[0].challengeId);eq(c.status,'expired','challenge marked expired');eq(c.expiredDay,c.deadline,'expires exactly at its deadline');ok(r.credibility.some(x=>x.delta===-6),'expiry costs credibility');ok(s.player.credibility<=cred-6+0.0001||cred<6,'credibility dropped');expired++;G.next(s);const again=round(s,'fundraise',{teamMode:'together'});ok(!again.events.some(e=>e.challengeId===c.id),'expiry settles only once');break;}
 }
}
ok(expired>=4&&answered>=4,'deadline paths exercised: expired '+expired+', answered '+answered);

// Attribution: sources add up to the round's expected-vote change; outlook band and seat line are shown.
for(let seed=1;seed<=30;seed++){const s=fresh(seed);for(let d=1;d<=G.DAYS;d++){const t=G.landscapeView(s).ranking.find(r=>G.availableTopics(s).some(x=>x.id===r.topic)).topic,id=d%2&&G.preview(s,'tv',{topic:t}).allowed?'tv':'canvass',cfg={topic:t,venue:venueFor(t),teamMode:s.player.known.includes(t)?'together':'research'};
 const r=round(s,id,cfg,(q,x)=>q.options.find(o=>o.id===majorityPlan(x,t)&&o.unlocked)?.id||q.options.find(o=>o.unlocked).id),sum=r.attribution.reduce((n,a)=>n+(a.source==='rival'?a.effectOnYou:a.votes),0);ok(Math.abs(sum-r.totalVotes)<.5,'attribution adds up');const o=r.outlook;ok(o.low<=o.estimate&&o.estimate<=o.high,'estimate inside its band');eq(o.seatLine,[16,22],'measured seat line');G.next(s);}
 eq(s.phase,'result','campaign ends');ok(s.result.keyFactors.length>0&&s.result.keyFactors.length<=3,'up to three key factors');eq(s.budget.available+s.budget.spent+s.budget.deposit+s.budget.forfeited,s.budget.personalContribution+s.budget.donations,'cash conservation');const ended=copy(s);G.next(s);eq(s,ended,'result settles once');}

// Street topics follow the venue; assistants tire on their own.
{const s=fresh(2),p=G.preview(s,'canvass',{venue:'market',topic:'senior'});ok(G.VENUES.market.topics.includes(p.topic),'market cannot raise senior transport');ok(p.topicReason.includes('聊不到'),'explains where the topic can be raised');}
{const s=fresh(4);round(s,'canvass',{topic:'access',venue:'market',teamMode:'together'},'honest');const keys=Object.keys(s.player.counts).filter(k=>k.startsWith('team-canvass:'));eq(keys.length,2,'each assistant keeps a separate repeat count');}

// Identities: different money, base, credibility and one rule each; old background ids still load.
{const made=Object.fromEntries(Object.keys(G.BACKGROUNDS).map(id=>[id,fresh(21,{background:id})]));
 eq(made.newcomer.budget.available,540000,'newcomer cash');eq(made.heir.budget.available,940000,'heir cash');eq(made.incumbent.budget.available,690000,'incumbent cash');
 eq([made.newcomer.player.credibility,made.heir.player.credibility,made.incumbent.player.credibility],[65,40,50],'starting credibility by identity');eq(made.incumbent.player.team.members.length,3,'incumbent has three assistants');
 ok(G.expectedVotes(made.heir)>G.expectedVotes(made.incumbent)&&G.expectedVotes(made.incumbent)>G.expectedVotes(made.newcomer),'starting base: heir > incumbent > newcomer');
 for(const [id,s] of Object.entries(made))eq(s.budget.available+s.budget.spent+s.budget.deposit+s.budget.forfeited,s.budget.personalContribution+s.budget.donations,'cash conservation '+id);
 const record=made.incumbent.player.actions.filter(a=>a.record);eq(record.length,1,'incumbent carries one stance from last term');ok(made.incumbent.player.known.includes(record[0].topic)&&made.incumbent.player.insight[record[0].topic],'record topic already researched');eq(made.newcomer.player.actions.length,0,'newcomer has no record');
 for(const [old,now] of Object.entries(G.LEGACY_BACKGROUNDS))eq(G.initial(3,{background:old}).settings.background,now,'old background id maps to '+now);
 const heir=copy(made.heir),newcomer=copy(made.newcomer);const hi=round(heir,'fundraise',{research:0}).player.income,lo=round(newcomer,'fundraise',{research:0}).player.income;ok(Math.abs(hi/lo-1.5)<.01,'heir raises 1.5 times as much on the same seed');
 const g=copy(made.heir);G.begin(g,'canvass',{topic:'access',venue:'market',research:1});G.arrive(g);eq(G.question(g).options.find(o=>o.id==='guarantee').credibility,-7,'heir guarantees cost 7 credibility');
 const inc=copy(made.incumbent),t=record[0].topic,other=G.TOPICS[t].plans.find(x=>x.id!==record[0].answer).id;G.begin(inc,'tv',{topic:t,research:0,responseMode:'answer'});G.arrive(inc);eq(G.question(inc).options.find(o=>o.id===other)?.credibility,-5,'incumbent flip costs 5');}

// Cooperation offer: decided only in its round; accepting gives a TV credit, breaking it costs credibility.
{const s=fresh(5,{affiliation:'dpp'});eq(s.settings.contract,'autonomy','no agreement at the opening');eq(s.offer.contract,'reform','dpp offer asks for reform');ok([2,3].includes(s.offer.round),'offer arrives in round 2 or 3');
 eq(G.respondOffer(s,'accept'),false,'cannot answer before the offer round');while(s.day<s.offer.round){round(s,'fundraise',{research:0});G.next(s);}
 ok(G.offerView(s),'offer visible in its round');const kept=copy(s);ok(G.respondOffer(s,'accept'),'accept');eq(s.settings.contract,'reform','agreement set');eq(s.cooperation.remaining,G.CONTRACTS.reform.credit,'credit granted');eq(G.respondOffer(s,'decline'),false,'decided once');
 const tv=G.preview(s,'tv',{topic:'access',research:0});eq(tv.totalCost,180000-G.CONTRACTS.reform.credit,'credit discounts the next TV');
 const before=s.player.credibility;round(s,'canvass',{topic:'access',venue:'market',research:1},q=>q.options.find(o=>o.id===G.TOPICS.access.plans[0].id&&o.unlocked)?.id||q.options.find(o=>o.unlocked).id);ok(s.cooperation.breach&&s.recap.credibility.some(c=>c.reason==='違反合作約定'&&c.delta===-3),'breaking the agreement costs 3 credibility once');ok(s.player.credibility<=before,'credibility did not rise on a breach round');
 round(kept,'fundraise',{research:0});G.next(kept);eq(kept.offer.status,'expired','an unanswered offer lapses after its round');eq(kept.settings.contract,'autonomy','lapsed offer leaves no agreement');}

// Research count: more researchers cover more topics; while you prepare, the others canvass on their own.
{const s=fresh(8),two=G.preview(s,'tv',{topic:'access',research:2});eq(two.researchTopics.length,2,'two researchers, two topics');eq(two.researchTopics[0],'access','today\'s topic first');ok(G.landscapeView(s).ranking.findIndex(r=>r.topic===two.researchTopics[1])>=0,'second topic comes from the poll ranking');
 eq(G.preview(s,'tv',{topic:'access',research:0}).researchTopics,[],'no researchers, no research');G.begin(s,'tv',{topic:'access',research:2});ok(two.researchTopics.every(t=>s.player.insight[t]),'both topics revealed this round');}
{const s=fresh(8),p=G.preview(s,'prepare',{topic:'senior',research:1});ok(!p.researchTopics.includes('senior'),'assistant researches another topic while you prepare');eq(p.teamAssignments.filter(m=>m.task!=='research').map(m=>m.task),['canvass'],'the other assistant canvasses instead of idling');}
console.log(JSON.stringify({result:'passed',checks,scope:'v12 engine: identities, cooperation offer, research count, seeded issue landscape independent of settings and venue, research levels, credibility previews, unkept guarantees, forecast, rumour accuracy, pre-emption, challenge deadlines, attribution sums, venue topics and per-assistant decay. Engine only; not browser, fun or play-time validation.'}));
