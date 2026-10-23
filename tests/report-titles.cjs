'use strict';
const A=require('node:assert/strict'),{harness,G,KEY,clone,text}=require('./v13-interface.cjs');
let checks=0;const eq=(a,b,m)=>{A.deepEqual(a,b,m);checks++;},ok=(v,m)=>{A.ok(v,m);checks++;};
const state=()=>({settings:{background:'newcomer'},player:{actions:[{action:'canvass'},{action:'canvass',record:true}],promises:[]},chiefs:{market:{broken:true},temple:{broken:false}}});
const result=(extra={})=>({outcome:'refunded',rank:14,seats:13,playerVotes:10000,lastSeat:10100,firstLoser:10000,gap:100,pending:[],roundsSummary:[{day:1,votes:-12},{day:2,votes:90},{day:3,votes:-23}],...extra});
const ids=(s,r)=>G.reportTitles(s,r).map(t=>t.id);
const guarantees=n=>Array.from({length:n},(_,i)=>({status:'unresolved',text:'第 '+(i+1)+' 張原文',audience:[],topic:'health',id:'p'+i}));
{
 const s=state(),r=result({outcome:'elected',rank:10});eq(ids(s,r),['newcomer-upset'],'newcomer elected');eq(ids(s,result()),[],'newcomer lost');s.settings.background='heir';eq(ids(s,r),[],'heir elected');s.settings.background='incumbent';eq(ids(s,r),[],'incumbent elected');
 s.settings.background='newcomer';eq(G.reportTitles(s,r)[0].detail,'街訪 1 次・幫你的里長 1 位','only actual visits and chief support; no invented starting cash');
}
for(const gap of[49,50,51])eq(ids(state(),result({gap})).includes('one-chief-short'),gap<=50,'gap boundary '+gap);
eq(ids(state(),result({outcome:'elected',rank:13,gap:20})).includes('one-chief-short'),false,'winner is never one chief short');
eq(G.reportTitles(state(),result({gap:50}))[0].line,'只差 50 票。第 3 回合是你最虧的一回合。','lowest net votes, not largest absolute gain');
for(const n of[4,5])eq(ids(state(),result({pending:guarantees(n)})).includes('promise-king'),n===5,'unresolved boundary '+n);
{
 const p=guarantees(5);p[4].status='corrected';eq(ids(state(),result({pending:p})),[],'corrected guarantee excluded');p.push(...guarantees(2));const t=G.reportTitles(state(),result({pending:p}))[0];ok(t.line.includes('「第 1 張原文」、')&&t.line.endsWith('……還有 3 張'),'first three exact texts and remaining count');
}
for(const rank of[12,13,14,15]){
 const r=result({rank,outcome:rank<=13?'elected':'refunded',lastSeat:10000,firstLoser:10000,gap:0});const titles=ids(state(),r);eq(titles.some(id=>id.startsWith('tie-')),rank===13||rank===14,'only boundary candidates get tie title '+rank);
 if(rank===13)ok(titles.includes('tie-elected'),'tie elected');if(rank===14)ok(titles.includes('tie-lost'),'tie lost');
}
eq(ids(state(),result({lastSeat:10000,firstLoser:9999,gap:0})).some(id=>id.startsWith('tie-')),false,'not a boundary tie');
{
 const s=state(),r=result({outcome:'elected',rank:13,lastSeat:10000,firstLoser:10000,gap:0,pending:guarantees(5)}),before=JSON.stringify({s,r});
 eq(ids(s,r),['newcomer-upset','tie-elected','promise-king'],'multiple titles retain numbered order');eq(JSON.stringify({s,r}),before,'title calculation mutates no facts');
 eq(G.reportTitles(s,result({gap:49,roundsSummary:[]}))[0].line,'只差 49 票。','missing history does not invent a round');
}
// Fixed election states isolate the narrow exact-integer tie without changing TUNING or sorting.
function electionFixture(seed,share){const s=G.initial(seed,{background:'newcomer',affiliation:'independent'});G.start(s);s.day=G.DAYS;s.phase='recap';for(const v of s.voters)v.support[0]=share;G.next(s);return s;}
function boundaryTie(seed){let low=0,high=.1;for(let i=0;i<45;i++){const share=(low+high)/2,s=electionFixture(seed,share),r=s.result,other=r.tally.filter(x=>x.id!==0)[G.ELECTION.seats-1];if(r.playerVotes===other.votes)return s;if(r.playerVotes<other.votes)low=share;else high=share;}throw Error('tie fixture missing '+seed);}
const ties=[boundaryTie(1),boundaryTie(2)];
// Both tie outcomes are covered with immutable seeds, and the existing tieKey remains authoritative.
eq(new Set(ties.map(s=>s.result.outcome==='elected')).size,2,'fixed seeds cover winning and losing the draw');
for(const s of ties){const r=s.result,a=r.tally[G.ELECTION.seats-1],b=r.tally[G.ELECTION.seats];eq(a.votes,b.votes,'actual election has exact boundary tie');ok(a.tieKey<b.tieKey,'original tieKey chooses winner');ok(r.titles.some(t=>t.id===(r.outcome==='elected'?'tie-elected':'tie-lost')),'next stores actual tie title');}
const base=ties[0];
{
 const s=clone(base);s.result.titles=[{id:'promise-king',title:'支票大王',line:'你開過的支票：<img src=x onerror=alert(1)>',detail:'原文 & 細節'}];const before=clone(s.result),h=harness({[KEY]:JSON.stringify(s)},{width:375,reduced:true}),html=h.elements['report-body'].innerHTML;
 ok(html.indexOf('report-titles')>html.indexOf('report-verdict')&&html.indexOf('report-titles')<html.indexOf('result-next-grade'),'titles directly follow verdict');ok(html.includes(text(s.result.titles[0].line))&&!html.includes('<img src=x'),'promise text safely escaped');eq(h.state().result,before,'rendering never rewrites tally');
 delete s.result.titles;const old=harness({[KEY]:JSON.stringify(s)},{reduced:true});ok(old.elements['report-body'].innerHTML.includes('report-titles'),'older ending computes labels without a migration');
}
{
 const s=clone(base);s._ui={counting:{status:'inprogress',elapsed:7.6}};const h=harness({[KEY]:JSON.stringify(s)});eq(h.elements['count-stage'].textContent,'同票，依法抽籤','pause before reveal');ok(h.elements['count-verdict'].hidden,'outcome hidden during draw');h.tick(15,.1);ok(!h.elements['count-verdict'].hidden,'original reveal time still applies');ok(h.elements['count-verdict'].textContent.includes('抽籤'),'animation names draw title');h.click({action:'skip-count'});eq(h.state().result,s.result,'skipping animation cannot change election');
}
console.log(JSON.stringify({result:'passed',checks,scope:'Ending-only titles, boundaries, real fixed-seed tie sorting, escaped quotes, old results and draw pause. Mobile geometry verified separately.'}));
module.exports={electionFixture,boundaryTie};
