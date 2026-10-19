'use strict';
// Production controller in a minimal DOM; this is not a browser or timed human playtest.
const {harness,G,html,root}=require('./month-interface.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;},ok=(a,m)=>{assert.ok(a,m);checks++;};
const KEY='wenshan-campaign-v10-1',old={'wenshan-campaign-v10':'unchanged-v10','wenshan-campaign-v9':'unchanged-v9'};
const setups={
 intro:h=>{},plan:h=>h.click({action:'start'}),
 walk:h=>{h.click({action:'start'});h.select('canvass');h.commit();},
 perform:h=>{h.click({action:'start'});h.select('canvass');h.commit();for(let i=0;i<400&&h.motion()?.stage==='walk';i++)h.tick(1,.1);eq(h.motion()?.stage,'perform','exercise active performance');},
 question:h=>{h.click({action:'start'});h.select('canvass');h.commit();h.click({action:'skip'});eq(h.state().phase,'question','exercise pending question');},
 recap:h=>{h.click({action:'start'});h.run('fundraise');},
 result:h=>{h.click({action:'start'});for(let i=0;i<G.DAYS;i++){h.run('fundraise');h.next();}eq(h.state().phase,'result','exercise complete election');}
};
for(const [name,setup] of Object.entries(setups)){
 const h=harness({...old},{seed:73});setup(h);const before=h.state(),n=before.seed;
 h.click({action:'restart'});const fresh=h.state();
 ok(fresh.seed!==n,name+' fresh seed even if crypto repeats');eq(fresh.day,1,name+' first round');eq(fresh.started,true,name+' started without another click');eq(fresh.phase,'plan',name+' usable action selection');eq(fresh.budget.available,740000,name+' correct cash');eq(fresh.budget.salarySpent,100000,name+' single monthly payroll');eq(fresh.player.contracts.length,1,name+' one initial contract receipt');eq(fresh.player.team.members.length,2,name+' two prepaid helpers');eq(fresh.journal.length,0,name+' no old recap');eq(fresh.pending,null,name+' no pending old action');eq(fresh.result,null,name+' no old result');eq(h.motion(),null,name+' cancels motion');ok(h.elements['dialog-overlay'].hidden,name+' no modal');ok(!h.main.inert&&!h.head.inert,name+' main and heading interactive');ok(h.elements['conversation-bubble'].hidden,name+' no old speech');eq(h.elements['action-effect'].innerHTML,'',name+' clears visual effect');ok(!h.panel().includes('data-action="start"'),name+' no second Start');ok(h.panel().includes('data-action="select-action"'),name+' actions immediately visible');
 for(const k in old)eq(h.saved[k],old[k],name+' keeps old version '+k);
 const after=JSON.stringify(h.state());h.tick(500);for(const data of [{action:'skip'},{action:'next'},{answer:'guarantee'},{action:'confirm-action'},{action:'start'},{action:'confirm-restart',mode:'same'}])h.click(data,true);eq(JSON.stringify(h.state()),after,name+' abandoned events cannot settle new game');
 const duplicate={dataset:{action:'restart'},disabled:false,closest(){return this;}};h.doc.emit('click',{target:duplicate,detail:2});eq(JSON.stringify(h.state()),after,name+' double-click second click ignored');
 const reload=harness(h.snapshot());eq(reload.state().seed,fresh.seed,name+' reload same new seed');eq(reload.state().budget.available,740000,name+' reload no duplicate salary');eq(reload.state().journal.length,0,name+' reload no old history');
 h.select('fundraise');h.commit();h.click({action:'skip'});eq(h.state().journal.length,1,name+' new game usable');h.click({action:'skip'},true);eq(h.state().journal.length,1,name+' completed action once');
}
for(const reduced of [false,true]){
 const h=harness({...old},{reduced});h.click({action:'start'});if(!reduced){h.select('canvass');h.commit();}h.click({action:'journal'});ok(!h.elements['dialog-overlay'].hidden,'open optional history');h.click({action:'restart'});eq(h.state().phase,'plan','new campaign from optional dialog');ok(!h.main.inert&&!h.head.inert,'dialog inert removed');ok(h.elements['dialog-overlay'].hidden,'dialog closes');eq(h.elements['dialog-body'].innerHTML,'','old dialog buttons discarded');eq(h.state().journal.length,0,'dialog close never completes abandoned day');eq(h.state().budget.available,740000,'dialog reset one payroll');
}
const noStorage=harness({}, {storageError:true});noStorage.click({action:'restart'});eq(noStorage.state().phase,'plan','storage failure still starts game');eq(noStorage.state().budget.available,740000,'storage failure budget');ok(!noStorage.elements['save-warning'].hidden,'storage warning honest');
ok(html.includes('>新的一局</button>'),'visible name');const ui=fs.readFileSync(root+'/day-ui.js','utf8');ok(!ui.includes("if(type==='restart')")&&!ui.includes('data-action="confirm-restart"'),'no restart confirmation flow');ok(!ui.includes('setTimeout'),'no stale timeout source introduced');
console.log(JSON.stringify({result:'passed',checks,scope:'One-click fresh campaign across intro, plan, travel, performance, question, recap and result; optional dialogs, duplicate/stale clicks, payroll once, reload and legacy keys. DOM/controller only, not browser/time validation.'}));
