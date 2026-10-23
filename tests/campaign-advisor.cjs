'use strict';
const assert=require('node:assert/strict'),G=require('../dist/day-engine'),A=require('../dist/day-advisor');
let checks=0;const ok=(x,m)=>{assert.ok(x,m);checks++;},eq=(x,y,m)=>{assert.deepEqual(x,y,m);checks++;},copy=x=>JSON.parse(JSON.stringify(x));
function fresh(seed=19,background='heir'){const s=G.initial(seed,{background,affiliation:'independent'});G.start(s);G.upgrade(s);return s;}
function play(s,action,config={}){if(s.crisis?.status==='pending')G.respondCrisis(s,'apologize');assert.ok(G.begin(s,action,config));G.arrive(s);if(s.phase==='question'){const q=G.question(s),options=q.options.filter(o=>o.unlocked&&!['guarantee','counter'].includes(o.id));G.answer(s,options.sort((a,b)=>b.faces.filter(f=>f==='up').length-a.faces.filter(f=>f==='up').length)[0].id);}assert.equal(s.phase,'recap');G.next(s);}
for(let seed=1;seed<=12;seed++)for(const background of ['newcomer','heir','incumbent'])for(const opening of ['canvass','prepare','online',null]){
 const s=fresh(seed,background),before=copy(s),v=A.view(G,s,{opening});ok(JSON.stringify(s)===JSON.stringify(before),'advice reads without changing campaign');ok(v.options.length<=2,'at most two next steps');ok(v.goal&&v.advice,'each next step has its campaign purpose');
 for(const o of v.options){ok(G.preview(s,o.action,o.config).allowed,'advice offers an executable itinerary');ok(o.cost&&o.reason,'each choice explains value and tradeoff');eq(A.resolve(G,s,o.id,{opening}),o,'the click resolves against current state');}
 eq(A.resolve(G,s,'forged'),null,'unknown suggestion cannot execute');eq(v.mode,opening==='canvass'?'organization':['prepare','online'].includes(opening)?'media':G.routeView(s).group===2?'media':'organization','opening intention persists');
 ok(A.render(G,s,{opening}).includes('對手情報'),'staff reports visible opponent information');
}
{
 const s=fresh();play(s,'recruit');const v=A.view(G,s,{opening:'prepare'});eq(v.active,3,'one hire is available the next round');eq(v.waiting,0,'no fictitious waiting helper');
 const before=copy(s);A.render(G,s,{opening:'prepare'});ok(JSON.stringify(s)===JSON.stringify(before),'render changes no state');
 play(s,'fundraise');eq(s.day,3,'before collision round');ok(!A.render(G,s).includes('兩場邀約撞期'),'future invitations are not spoiled');
 play(s,'fundraise');const clash=A.view(G,s);eq(clash.options.length,0,'actual invitation cards own the competing actions');ok(clash.change.includes('撞期'),'staff explains what interrupts the plan');
}
{
 const s=fresh();play(s,'canvass',{venue:'market'});const v=A.view(G,s,{opening:'canvass'});ok(v.steps[1].done,'earned local team advances actual plan');const ready=G.networkView(s).topics.length>0;ok(v.advice.includes(ready?'地方已有人':'還沒有可代講'),'guidance reflects whether the earned team can actually speak');ok(v.options.some(o=>ready?['expand','online','media'].includes(o.id):o.id==='local'),'team needs a public stance before sending the candidate elsewhere');
 const forged={...copy(s),phase:'travel'};eq(A.resolve(G,forged,v.options[0]?.id),null,'cannot choose another action during travel');
}
{
 const s=fresh();while(s.day<G.DEBATE_ROUND)play(s,'fundraise');const v=A.view(G,s);ok(v.options.some(o=>o.action==='debate'),'staff leads to actual debate on its day');
 s.crisis={status:'pending'};eq(A.view(G,s).options,[],'pending crisis takes priority over itinerary advice');
}
{
 const s=fresh();s.phase='result';eq(A.view(G,s),null,'no next-round advice after ending');eq(A.render(G,s),'','no hidden ending controls');
 const t=G.initial(1);eq(A.view(G,t),null,'intro is handled by opening actions');
}
{
 const s=fresh(2,'newcomer'),pool=G.onlinePool(s);for(const t of pool){if(!s.player.known.includes(t))s.player.known.push(t);}
 const v=A.view(G,s,{opening:'online'});ok(v.advice.includes('直播可能問的 '+pool.length+' 題，你已知道 '+pool.length+' 題'),'online readiness uses actual online pool');
 const prep=v.options.find(o=>o.action==='prepare');if(prep)ok(pool.includes(prep.config.topic),'online preparation matches proposed outlet');
 const t=fresh(19);t.player.tvCredit=1;for(const topic of G.tvPool(t)){if(!t.player.known.includes(topic))t.player.known.push(topic);}
 const media=A.view(G,t,{opening:'tv'}).options.find(o=>o.action==='tv');ok(media&&media.cost.includes('免節目費'),'staff reflects earned free TV credit');
 ok(A.selected(G,s,{selectedAction:'online'}).includes('2 位助手'),'selected itinerary explains staff tradeoff');
 eq(A.selected(G,{...s,phase:'recap'},{selectedAction:'online'}),'','no stale planning advice during recap');
}
console.log(JSON.stringify({result:'passed',checks,scope:'Public-information staff advice, preserved opening intent, real actionable tradeoffs, current-only interruptions and no state changes. Not optimal-strategy or fun validation.'}));
