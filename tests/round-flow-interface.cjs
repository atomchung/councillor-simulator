'use strict';
// Production controller transitions in a minimal DOM. Browser geometry is checked separately.
const assert=require('node:assert/strict');
const {harness,G,KEY,clone,text}=require('./v13-interface.cjs');
let assertions=0;const ok=(v,m)=>{assert.ok(v,m);assertions++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;};
const saved=s=>({[KEY]:JSON.stringify(s)});
function newState(seed=71){const s=G.initial(seed,{background:'incumbent',affiliation:'independent'});G.start(s);s.budget.available=3000000;return s;}
function toRound(s,day){while(s.day<day){if(s.crisis?.status==='pending')G.respondCrisis(s,'apologize');G.begin(s,'fundraise',{research:[]});G.arrive(s);G.next(s);}if(s.crisis?.status==='pending')G.respondCrisis(s,'apologize');return s;}
function priorFor(s){for(const topic of G.topicsOf(s)){const plan=G.TOPICS[topic].plans[0];s.player.actions.push({day:Math.max(1,s.day-1),action:'tv',topic,answer:plan.id,quote:plan.text,prepared:true});}}
// The former skip/first-answer overlap cannot submit a response during its first half-second.
{
 const h=harness(saved(newState()));h.go('canvass','market');h.commit();h.click({action:'skip'});eq(h.state().phase,'question','skip opens question');
 const option=G.question(h.state()).options.find(o=>o.unlocked),before=h.state();h.click({answer:option.id});eq(h.state().journal.length,before.journal.length,'immediate second click does not answer');h.tick(4,.1);h.click({answer:option.id});eq(h.state().phase,'question','400 ms remains guarded');h.tick(2,.1);h.click({answer:option.id});eq(h.state().phase,'recap','a deliberate response after 500 ms settles');
 const recap=clone(h.state().recap);h.tick(1000,.1);eq(h.state().phase,'recap','recap never times out');eq(h.state().day,1,'recap remains in the completed round');ok(h.dock().includes('round-settlement')&&h.dock().includes('開始第 2 回合'),'visible manual settlement');
 const reload=harness(h.snapshot());eq(reload.state().recap,recap,'reload keeps same settlement');eq(reload.state().day,1,'reload does not advance');reload.click({action:'next-round'});eq([reload.state().day,reload.state().phase],[2,'plan'],'one acknowledgement advances once');reload.click({action:'next-round'},true);eq(reload.state().day,2,'stale acknowledgement cannot spend another round');
 eq(reload.elements.world.scrollLeft,0,'new round resets horizontal map scroll');eq(reload.elements.world.scrollTop,0,'new round resets vertical map scroll');
 ok(h.dock().includes('settlement-rival')&&h.dock().includes('小馬這回合'+recap.rival.title),'settlement names the actual rival action');
 const summary=recap.summary;ok(h.dock().includes(text(summary.headline)),'settlement headline comes from actual source attribution');for(const point of [summary.before,summary.after])ok(h.dock().includes((point.gap<=0?'過線 ':'還差 ')+Math.abs(point.gap).toLocaleString('zh-TW')+' 票'),'gap sign is displayed correctly');
}
// Scrolling to a lower mobile answer must not hide the beginning of the next settlement.
{
 const h=harness(saved(newState(77)),{width:375});h.go('canvass','market');h.commit();h.click({action:'skip'});
 const optionsScroller={scrollTop:180};h.elements.dock.querySelector=selector=>selector==='.dock-options-body'?optionsScroller:null;
 h.elements.dock.scrollTop=20;h.elements['dock-body'].scrollTop=480;
 const last=G.question(h.state()).options.filter(o=>o.unlocked).at(-1);h.answer(last.id);
 eq(h.state().phase,'recap','lower answer reaches the manual settlement');eq(h.elements['dock-body'].scrollTop,0,'settlement starts at the top of its actual scroll container');eq(optionsScroller.scrollTop,0,'nested planning scroller resets when present');
 h.elements['dock-body'].scrollTop=250;optionsScroller.scrollTop=90;h.click({action:'next-round'});
 eq(h.elements['dock-body'].scrollTop,0,'next round resets the actual dock-body scroll');eq(optionsScroller.scrollTop,0,'next round resets a nested options scroller');
}
// Every public action asks again, even with a known previous statement or on the final round.
for(const [action,day,config]of[['canvass',2,{venue:'market'}],['tv',3,{brief:'health'}],['online',3,{}],['debate',G.DEBATE_ROUND,{}],['tv',G.DAYS,{brief:'health'}]]){
 const s=toRound(newState(72),day);priorFor(s);s._ui={action,venue:config.venue||null,brief:config.brief||null,mapTipDismissed:true};const h=harness(saved(s));h.commit();h.click({action:'skip'});
 eq(h.state().phase,'question',action+' round '+day+' asks despite prior statement');const q=G.question(h.state()),prior=G.lastPlan(s.player,h.state().pending.topic);eq(q.previousAnswer.answer,prior.answer,'actual prior answer is used');ok(h.dock().includes('previous-stance')&&h.dock().includes('按下確認沿用'),'prior stance has clear confirmation cue');ok(!h.dock().includes('am-est')&&!h.dock().includes('預估 '),'no numeric vote forecast in answers');
 h.answer(prior.answer);eq(h.state().phase,'recap',action+' waits for result acknowledgement');h.click({action:'next-round'});eq(h.state().phase,day===G.DAYS?'result':'plan','final round still requires acknowledgement before vote count');
}
// Debate is both map-labeled and directly reachable without navigating a hidden submenu.
{
 const h=harness(saved(toRound(newState(73),G.DEBATE_ROUND)));ok(h.dock().includes('debate-reminder')&&h.map().includes('社區廣場・政見會'),'debate reminder and place label present');h.click({action:'debate-now'});eq([h.state().phase,h.state().pending.id],['travel','debate'],'the reminder directly begins the debate');
}
// Resolved news must never obscure a new live question or the candidates on stage.
{
 let found;
 for(let seed=1;seed<=30&&!found;seed++){const s=toRound(newState(seed),G.DEBATE_ROUND);if(s.crisis?.resolvedDay===s.day)found=s;}
 ok(found,'a real same-round resolved crisis fixture exists');const h=harness(saved(found));ok(!h.elements['event-feedback'].hidden,'resolved crisis is visible while planning');h.click({action:'debate-now'});h.click({action:'skip'});eq(h.state().phase,'question','debate still asks after resolving crisis');ok(h.elements['event-feedback'].hidden,'news overlay leaves the active question unobstructed');
}
// Research tier changes information, never exposes exact response votes.
{
 const s=newState(1);G.begin(s,'prepare',{topic:'health'});G.arrive(s);G.next(s);s._ui={action:'tv',brief:'health'};const h=harness(saved(s));h.commit();h.click({action:'skip'});const q=G.question(h.state());ok(q.options.some(o=>o.researchTier==='self'),'personal preparation has own tier');ok(h.dock().includes('摸清楚'),'personal research wording');ok(!h.dock().includes('am-est'),'even personal research hides forecast votes');h.click({action:'notes'});ok(!h.dialog().includes(' 成')&&!h.dialog().includes('am-est'),'notes share the same qualitative information');
}
// The actual invitation-to-stream route still asks and lets the player read the settled result.
{
 const s=G.initial(1,{background:'heir'});G.start(s);for(let d=1;d<G.CAMPAIGN_ROUND;d++){G.begin(s,'prepare',{research:G.topicsOf(s)});G.arrive(s);G.next(s);}if(s.crisis?.status==='pending')G.respondCrisis(s,'apologize');
 const media=G.campaignView(s).opportunity.choices.find(x=>x.id==='media');ok(G.begin(s,media.action,media.config),'media invitation can begin');G.arrive(s);const best=G.question(s).options.filter(x=>x.unlocked).map(x=>{const c=clone(s);G.answer(c,x.id);return{id:x.id,v:c.recap.player.direct?.votes||0};}).sort((a,b)=>b.v-a.v)[0];G.answer(s,best.id);G.next(s);if(s.crisis?.status==='pending')G.respondCrisis(s,'apologize');ok(G.campaignView(s).followup?.allowed,'a real successful interview creates a followup');
 const h=harness(saved(s));h.click({action:'campaign-followup'});h.commit();h.click({action:'skip'});eq(h.state().phase,'question','followup stream stops for a response');const q=G.question(h.state());ok(q.previousAnswer&&q.options.some(x=>x.preselected),'followup retains the actual prior stance');h.answer(q.options.find(x=>x.preselected).id);eq(h.state().phase,'recap','followup stays at settlement');ok(h.dock().includes(text(h.state().recap.player.quote)),'stream settlement repeats what was actually said');
}
// Native team-command controls save a valid venue and a real public policy.
{
 const s=newState(76);G.begin(s,'canvass',{venue:'market'});G.arrive(s);const q=G.question(s),concrete=q.options.find(x=>x.unlocked&&G.TOPICS[s.pending.topic].plans.some(p=>p.id===x.id));G.answer(s,concrete.id);G.next(s);const n=G.networkView(s);ok(n.active&&n.topics.length,'chief backing creates an active team with a public stance');
 const h=harness(saved(s));ok(h.dock().includes('network-orders')&&h.dock().includes('data-network="topic"'),'team commands appear in the current round');ok(h.dock().includes('<details class="network-orders" aria-label="地方小隊安排"><summary>地方小隊：'),'routine network command is collapsed by default');h.doc.emit('change',{target:{dataset:{network:'topic'},value:n.topics[0].id}});eq(h.state().campaign.network.topic,n.topics[0].id,'native policy selection reaches validated engine assignment');
 const late=toRound(clone(s),G.DEBATE_ROUND),lateUi=harness(saved(late));ok(lateUi.dock().indexOf('debate-reminder')<lateUi.dock().indexOf('network-orders'),'one-time debate precedes routine network controls');
 const old=clone(h.state().campaign.network);h.doc.emit('change',{target:{dataset:{network:'venue'},value:'unknown-place'}});eq(h.state().campaign.network,old,'unknown command values do not mutate the team');
}
// Best records are per identity and party, survive a new game and do not mutate election output.
{
 const s=toRound(newState(75),G.DAYS);G.begin(s,'fundraise',{});G.arrive(s);G.next(s);const result=clone(s.result),h=harness(saved(s),{reduced:true});eq(h.state().result,result,'record storage preserves exact engine result');ok(h.elements['report-body'].innerHTML.includes(G.resultGrade(result).title),'ending uses shared grade API');ok(h.elements['report-body'].innerHTML.includes('result-next-grade'),'ending shows next-grade goal');
 const records=JSON.parse(h.saved[KEY+'-bests']);eq(records['incumbent:independent'].rank,result.rank,'record keyed by identity and party');h.click({action:'restart'});ok(h.dock().includes('最佳：第 '+result.rank+' 名'),'intro shows saved best');h.click({action:'setting',setting:'affiliation',value:'kmt'});ok(!h.dock().includes('identity-best'),'different party has separate record');
 const worse=clone(s);worse.result.rank=Math.min(27,result.rank+1);worse.result.grade=G.resultGrade(worse.result);const older={...h.saved,[KEY]:JSON.stringify(worse)};const poor=harness(older,{reduced:true});eq(JSON.parse(poor.saved[KEY+'-bests'])['incumbent:independent'].rank,result.rank,'worse result does not overwrite best');
}
// Stored labels follow the current grade thresholds without rewriting historical vote counts or ranks.
{
 const s=toRound(newState(78),G.DAYS);G.begin(s,'fundraise',{});G.arrive(s);G.next(s);
 // A historical ninth-place result with its former persisted grade. The tally stays internally ordered.
 const others=s.result.tally.filter(row=>row.id!==0),you=s.result.tally.find(row=>row.id===0),tally=[...others.slice(0,8),you,...others.slice(8)].map((row,i)=>({...row,rank:i+1,votes:20000-i*500,elected:i<G.ELECTION.seats}));
 s.result={...s.result,tally,rank:9,playerVotes:tally[8].votes,outcome:'elected',grade:{id:'steady',title:'穩上',next:{rank:8,title:'高票當選',votesNeeded:501}}};
 const original=clone(s.result),h=harness(saved(s),{reduced:true});ok(h.elements['report-body'].innerHTML.includes('高票當選・第 9 名'),'old steady result is displayed under the current high grade');eq(h.state().result,original,'reclassification does not rewrite the stored election result, votes or rank');
}
{
 const record={'incumbent:independent':{rank:9,votes:16000,title:'穩上'}},h=harness({[KEY+'-bests']:JSON.stringify(record)});h.click({action:'setting',setting:'background',value:'incumbent'});
 ok(h.dock().includes('最佳：第 9 名・高票當選'),'old ninth-place personal best uses current grade title');eq(JSON.parse(h.saved[KEY+'-bests']),record,'personal best reclassification leaves its stored votes and rank unchanged');
}
console.log(JSON.stringify({result:'passed',assertions,scope:'Manual settlement/reload, skip click guard, repeated public responses and final-round confirmation, correct gap signs, prominent debate, qualitative research, per-identity-party best records with unmodified election results.'}));

// Phone map navigation is reversible and never commits an outing; research switches the main action only.
{
 const s=G.initial(601,{background:'heir',affiliation:'independent'});G.start(s);
 const h=harness(saved(s),{width:375});h.click({action:'toggle-map'});
 eq(h.elements['map-toggle'].attributes['aria-expanded'],'true','map can expand');
 const venue=G.venueView(s).find(v=>v.pool.some(t=>!s.player.known.includes(t)));h.go('canvass',venue.id);
 eq(h.elements['map-toggle'].attributes['aria-expanded'],'false','destination frees map space');
 eq(h.state().day,1,'selecting a location does not spend a round');
 ok(h.dock().includes('出發準備：0／'),'unprepared heir sees current readiness');
 ok(h.dock().includes('助手今天查，下一回合才用得到'),'helper research timing is explicit');
 ok(h.dock().indexOf('你的主行程')<h.dock().indexOf('例行安排・助手分工與加碼'),'main action precedes concurrent staffing');
 const before=h.state().budget.available;h.click({action:'prepare-before-trip'});
 eq(h.state().day,1,'switch to preparation is not an immediate action');eq(h.state().budget.available,before,'switch spends no money');
 ok(h.dock().includes('本人研究'),'switch opens a real study itinerary');h.commit();h.click({action:'skip'});
 eq(h.state().phase,'recap','study resolves through ordinary round flow');
 const learned=h.state().recap.player.topic;ok(h.state().player.known.includes(learned),'study genuinely teaches the selected topic');
 h.click({action:'next-round'});eq(h.elements['map-toggle'].attributes['aria-expanded'],'false','new round returns space to staff briefing');ok(h.dock().includes('先跑熟'),'studying before a local visit keeps the local campaign intention');
}
console.log(JSON.stringify({mobilePlanning:'passed',assertions}));

{
 const h=harness(saved(toRound(newState(601),G.CAMPAIGN_ROUND)),{width:375});
 ok(h.dock().includes('臨時邀約與事件'),'current invitations have their own entry');
 h.go('canvass','market');ok(h.dock().indexOf('臨時邀約與事件')<h.dock().indexOf('你的主行程'),'pending event summary remains above the selected itinerary');
 ok(!/<details class="pending-decisions" open/.test(h.dock()),'optional invitation details collapse after selecting an itinerary');
 ok(!/<section class="pending-decisions"[^]*network-orders/.test(h.dock()),'routine team orders are not an invitation');
}
console.log(JSON.stringify({invitationSeparation:'passed',assertions}));

{
 const h=harness(saved(newState(612)));h.go('tv');const topic=G.tvPool(h.state())[0];h.click({action:'brief',topic});
 ok(h.dock().includes('1／1 題有專訪資料'),'paid interview readiness reflects its supplied single topic');
 ok(!h.dock().includes('data-action="prepare-before-trip"'),'paid briefing does not unnecessarily recommend an extra research round');
}
console.log(JSON.stringify({interviewReadiness:'passed',assertions}));
