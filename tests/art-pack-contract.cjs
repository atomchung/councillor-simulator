'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');let checks=0;
const context={window:{},console};vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/day-art.js','utf8'),context);const art=context.window.DayArt;
for(const col of art.assetFrames)for(const f of col){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1536&&f.y+f.h<=1024&&f.sole>0&&f.sole<=f.h);checks++;}
for(const id of ['market','street','temple','plaza','river','prepare','tv','online','fundraise','recruit','debate']){const route=art.visualRoute(id);assert.deepEqual(route.at(-1),art.spot(id));for(const p of route)assert.ok(p.x>=0&&p.x<=1200&&p.y>=0&&p.y<=650);checks++;}
for(const [identity,column]of [['newcomer',0],['heir',1],['incumbent',2]]){const p=art.portrait({identity});assert.ok(p.includes('data-column="'+column+'"'));assert.ok(p.includes('cy="130"'));checks++;}
const scene=art.scene();assert.ok(scene.includes('district.png'));art.setPack('unknown');assert.equal(art.getPack(),'original');assert.ok(art.scene().includes('<svg'));art.setPack('matte-toy-v1');assert.equal(art.scene(),scene);checks+=4;
for(const name of ['district','candidates','market-square','street','river']){const b=fs.readFileSync(root+'/assets/matte-toy-v1/'+name+'.png');assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');if(name==='candidates')assert.equal(b[25],6);checks++;}
for(const [frames,w,h]of [[art.supportFrames,1536,1024],[art.walkFrames,1024,1536]])for(const row of frames)for(const f of row){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=w&&f.y+f.h<=h&&f.sole>0&&f.sole<=f.h);checks++;}
for(const role of ['elder','elder2','middle','middle2','young','young2','rival','helper','host']){assert.ok(art.avatar(role).includes('data-support-role="'+role+'"'));checks++;}
art.walkStep(.01,true);const frameA=art.avatar('player');art.walkStep(.2,true);assert.notEqual(art.avatar('player'),frameA);art.walkStep(0,false);assert.ok(!art.avatar('player').includes('walk.png'));checks+=2;
for(const kind of ['tv','online','fundraise']){assert.ok(art.interior(kind).includes('scenes.png'));checks++;}for(const stage of ['count','elected','refunded','forfeited']){assert.ok(art.countNight(stage).includes('scenes.png'));checks++;}
// Exercise real controller switching through the established DOM harness, preserving the whole game state.
const testSource=fs.readFileSync(__dirname+'/v13-interface.cjs','utf8');const prefix=testSource.slice(0,testSource.indexOf('\nconst ui=fs.readFileSync'));
const scope={require,__dirname,console,module:{exports:{}}};vm.runInNewContext(prefix+'\nmodule.exports={harness,G};',scope);const {harness,G}=scope.module.exports;
const h=harness();h.click({action:'start'});h.go('canvass','market');const before=h.state();h.click({action:'art-switch'});assert.deepEqual(h.state(),before);h.click({action:'art-switch'});assert.deepEqual(h.state(),before);h.commit();h.click({action:'skip'});assert.equal(h.state().phase,'question');assert.ok(h.scene().includes('market-square.png'));const q=G.question(h.state());h.answer(q.options.find(o=>o.unlocked).id);assert.equal(h.state().phase,'recap');checks+=5;
// Find a naturally occurring crisis, then prove the card/history do not settle it twice.
let crisisHarness;
for(let seed=1;seed<30&&!crisisHarness;seed++){
 const t=harness({}, {seed,reduced:true});t.click({action:'start'});
 for(let day=1;day<10;day++){if(t.state().crisis?.status==='pending'){crisisHarness=t;break;}t.run('fundraise');t.next();}
}
assert.ok(crisisHarness,'a real engine crisis occurs');
const c=crisisHarness, day=c.state().day;
assert.ok(c.elements['event-timeline'].innerHTML.includes('突發危機・等待處理'));
c.click({action:'crisis',choice:'apologize'});
assert.equal(c.elements['event-feedback'].hidden,false);
assert.ok(c.elements['event-feedback'].innerHTML.includes('公開道歉切割'));
const settled=JSON.stringify(c.state());c.click({action:'crisis',choice:'apologize'},true);assert.equal(JSON.stringify(c.state()),settled);
assert.equal((c.elements['event-timeline'].innerHTML.match(new RegExp('data-event-key="crisis-day-'+day+'"','g'))||[]).length,1);
c.click({action:'dismiss-event'},true);assert.equal(c.elements['event-feedback'].hidden,true);
const reloaded=harness(c.snapshot());assert.equal(reloaded.elements['event-feedback'].hidden,true);assert.ok(reloaded.elements['event-timeline'].innerHTML.includes('公開道歉切割'));
c.run('fundraise');c.next();assert.ok(c.elements['event-timeline'].innerHTML.includes('crisis-day-'+day));
c.click({action:'restart'});assert.equal(c.elements['event-timeline'].hidden,true);assert.equal(c.elements['event-feedback'].hidden,true);assert.ok(!c.elements['event-timeline'].innerHTML.includes('crisis-day-'+day));checks+=13;
console.log(JSON.stringify({result:'passed',checks,scope:'Sprite bounds, soles, semantic identity mapping, map routes, actual pack toggles and a production question/recap; no browser claim.'}));
