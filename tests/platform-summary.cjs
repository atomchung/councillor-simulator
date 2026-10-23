'use strict';
// R08/R13: ending highlights are quotes from this campaign, not generated pledges.
// Fixtures isolate statement-history edge cases; the final checks play through real public APIs.
const A=require('node:assert/strict'),G=require('../dist/day-engine');
let checks=0;
const ok=(v,m)=>{checks++;A.ok(v,m);},eq=(a,b,m)=>{checks++;A.deepEqual(a,b,m);},copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(background='heir')=>{const s=G.initial(19,{background,affiliation:'independent'});ok(G.start(s),'start campaign');return s;};
const record=(day,topic,answer,quote,extra={})=>({day,topic,answer,quote,action:'canvass',...extra});
const history=actions=>({day:9,player:{actions}});
const policy=(day,topic,k=0,extra={})=>record(day,topic,G.TOPICS[topic].plans[k].id,G.TOPICS[topic].plans[k].text,extra);
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
function trace(s,view){for(const item of view.items){for(const q of[item,...item.previous]){const e=s.player.actions[q.actionIndex];eq([q.topic,q.quote,q.round,q.answer,q.action],[e.topic,e.quote,e.day,e.answer,e.action],'every displayed statement maps to its exact action record');}ok(item.previous.every(q=>q.actionIndex<item.actionIndex),'prior statements predate the current statement');}}

for(const bg of['heir','incumbent','newcomer']){
 const s=fresh(bg);eq(G.platformView(s),{items:[],total:0,omitted:0},'an opening background or party does not fabricate campaign promises');
}
{
 const s=history([policy(0,'health',0,{record:true}),policy(1,'childcare',0,{action:'prepare'}),record(2,'housing','honest','我先查清楚再說'),record(3,'tip','tip_accuse','直接指控小馬重複請款',{action:'press'}),policy(10,'traffic'),policy(2,'senior',0,{quote:''})]);
 eq(G.platformView(s).items,[],'research, non-commitments, accusations, future records and empty evidence stay out');
}
{
 const first=policy(1,'health'),child=policy(2,'childcare'),repeat=policy(3,'health',0,{quote:'已公開的逐字紀錄：'+G.TOPICS.health.plans[0].text});
 const s=history([first,child,repeat]),view=G.platformView(s);
 eq(view.total,2,'repeated statements count as one topic');eq(view.items.map(x=>x.topic),['health','childcare'],'fewer than three real topics remain fewer than three');
 eq(view.items[0].quote,repeat.quote,'the exact latest recorded wording is preserved');eq(view.items[0].changed,false,'restating the same policy is not marked as a reversal');eq(view.items[0].previous,[],'repetition does not fill the old-position list');trace(s,view);
}
{
 const s=history([policy(1,'health'),policy(2,'health',1),policy(4,'health')]),view=G.platformView(s),item=view.items[0];
 eq(item.answer,G.TOPICS.health.plans[0].id,'switching back shows the final actual choice');eq(item.round,4,'current evidence has its actual round');ok(item.changed,'reversals are visible');
 eq(item.previous.map(x=>[x.round,x.answer,x.status]),[[2,G.TOPICS.health.plans[1].id,'superseded'],[1,G.TOPICS.health.plans[0].id,'superseded']],'both former positions remain traceable after a switch back');trace(s,view);
}
{
 const guarantee=record(1,'health','guarantee','我保證下個月起 65 歲以上健保全免'),s=history([guarantee,policy(2,'health',0)]),item=G.platformView(s).items[0];
 eq(item.kind,'policy','a concrete replacement is current, not the old guarantee');eq(item.quote,G.TOPICS.health.plans[0].text,'the replacement quote is not confused with the old promise text');eq(item.previous[0].quote,guarantee.quote,'the replaced guarantee keeps its original wording');trace(s,G.platformView(s));
 s.player.actions.push(record(3,'health','guarantee','我保證下個月開始實施'));eq(G.platformView(s).items[0].kind,'guarantee','a later explicit guarantee is itself the current statement');
 s.player.actions.push(record(4,'health','honest','我收回先前的保證，先查清楚'));eq(G.platformView(s).items,[],'an explicitly withdrawn guarantee is not shown as an active pledge or silently restored to an earlier policy');
 s.player.actions.push(policy(5,'health',1));const resumed=G.platformView(s).items[0];eq(resumed.kind,'policy','a new policy after withdrawal becomes current');eq(resumed.previous[0].status,'withdrawn','the withdrawn guarantee stays marked as such');eq(resumed.previous[0].withdrawnRound,4,'withdrawal timing stays attached to the original guarantee');trace(s,G.platformView(s));
}
{
 const s=history([record(1,'housing','guarantee','保證原文甲'),record(2,'housing','guarantee','保證原文甲'),record(3,'housing','guarantee','保證原文乙')]),item=G.platformView(s).items[0];
 eq(item.quote,'保證原文乙','changed guarantee wording is current');eq(item.previous.map(x=>[x.quote,x.round]),[['保證原文甲',2]],'a revised guarantee preserves prior wording without treating its repetition as another policy');
 const concrete=history([policy(1,'health'),record(2,'health','honest','我先查清楚再說')]);eq(G.platformView(concrete).items[0].round,1,'a non-commitment does not invent a replacement or silently revoke a concrete policy');
}
{
 const offer=policy(2,'childcare',0,{action:'offer',record:'offer',quote:'與社區團體約定：'+G.TOPICS.childcare.plans[0].text}),s=history([policy(1,'health'),offer,policy(2,'housing'),policy(3,'traffic')]),view=G.platformView(s);
 eq(view.items.map(x=>x.topic),['traffic','housing','childcare'],'three most recently stated topics are ordered deterministically, including same-round cooperation');eq([view.total,view.omitted],[4,1],'extra real topics are counted rather than hidden as if only three were promised');eq(view.items[2].quote,offer.quote,'a real accepted cooperation commitment is retained');trace(s,view);
 const before=copy(s);freeze(s);eq(G.platformView(s),view,'reading a frozen save needs no mutation or upgrade');eq(s,before,'the view does not change the save');view.items[0].quote='tampered';view.items[2].previous.push({quote:'tampered'});eq(s,before,'returned arrays and items do not alias the original state');eq(G.platformView(copy(s)),G.platformView(s),'serialized saves produce the same public summary');
}

function finish(s,id,config={},pick){
 if(s.crisis?.status==='pending')ok(G.respondCrisis(s,'apologize'),'resolve the pending crisis');
 ok(G.preview(s,id,config).allowed,'actual itinerary is allowed: '+id);ok(G.begin(s,id,config),'begin actual itinerary');ok(G.arrive(s),'arrive at actual itinerary');
 if(s.phase==='question'){const q=G.question(s),option=pick?pick(q,s):q.options.find(o=>o.unlocked&&G.TOPICS[s.pending.topic]?.plans?.some(p=>p.id===o.id))||q.options.find(o=>o.unlocked&&o.id==='honest')||q.options.find(o=>o.unlocked);ok(option&&G.answer(s,option.id),'answer actual public question');}
 eq(s.phase,'recap','actual action produces a recap');return s.recap;
}
{
 const s=fresh(),pool=G.venueView(s).find(v=>v.id==='market').pool;finish(s,'canvass',{venue:'market',research:pool.slice(0,2)},q=>q.options.find(o=>o.id==='guarantee'&&o.unlocked));
 const guarantee=G.platformView(s).items[0];eq(guarantee.kind,'guarantee','a real public guarantee reaches the view');eq(guarantee.quote,s.recap.player.quote,'actual guarantee matches the public recap');ok(G.next(s),'advance after guarantee');
 // Continue real public actions until a same-topic follow-up permits a correction.
 let corrected=false,accepted=false;
 while(s.phase!=='result'){
  if(s.phase==='plan'){
   const offer=G.offerView(s);if(offer){ok(G.respondOffer(s,'accept'),'accept actual cooperation');accepted=true;const entry=s.player.actions.at(-1),item=G.platformView(s).items.find(x=>x.topic===entry.topic);eq(item.quote,entry.quote,'acceptance immediately exposes the exact public cooperation quote');}
   const config={venue:'market',revise:true},r=finish(s,'canvass',config,q=>q.options.find(o=>o.id==='honest'&&o.unlocked)||q.options.find(o=>o.unlocked));
   if(r.player.topic===guarantee.topic&&r.player.corrected){corrected=true;ok(!G.platformView(s).items.some(x=>x.topic===guarantee.topic&&x.kind==='guarantee'),'a real correction removes the active guarantee');}
  }
  const before=JSON.stringify(s);trace(s,G.platformView(s));eq(JSON.stringify(s),before,'reading between real turns changes no gameplay state');ok(G.next(s),'advance the actual round');
 }
 ok(corrected,'the real campaign exercised an honest correction');ok(accepted,'the real campaign exercised cooperation');eq(s.result.platform,G.platformView(s),'ending snapshots the same actual campaign statements');eq(G.platformView(copy(s)),s.result.platform,'ending survives save and reload');const report=copy(s.result.platform);G.platformView(s).items.splice(0);eq(s.result.platform,report,'subsequent reads cannot mutate the ending snapshot');
}
console.log(JSON.stringify({result:'passed',checks,scope:'Traceable public platform summary, revisions, withdrawn guarantees, accepted cooperation and result/save compatibility. No balance or browser claim.'}));
