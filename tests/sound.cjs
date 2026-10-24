'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {harness,G,KEY,clone,withoutUi}=require('./v13-interface.cjs');
let checks=0;const eq=(a,b,m)=>{A.deepEqual(a,b,m);checks++;},ok=(v,m)=>{A.ok(v,m);checks++;};
const source=fs.readFileSync('dist/day-sound.js','utf8');
function audioEnv(){
 const contexts=[],nodes=[],timers=new Map();let timer=0;
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 function node(kind){const n={kind,gain:param(),frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){A.notEqual(this.started,undefined,'start must precede stop');this.stopped=t;}};nodes.push(n);return n;}
 class AudioContext{
  constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination={};contexts.push(this);}
  createGain(){return node('gain');} createOscillator(){return node('tone');} createBufferSource(){return node('noise');} createBiquadFilter(){return node('filter');}
  createBuffer(channels,length){const samples=new Float32Array(length);return{getChannelData:()=>samples};}
  suspend(){this.state='suspended';return Promise.resolve();} resume(){this.state='running';return Promise.resolve();}
 }
 return{contexts,nodes,timers,AudioContext,navigator:{audioSession:{type:'auto'}},setTimeout(fn,ms){timers.set(++timer,{fn,ms});return timer;},clearTimeout(id){timers.delete(id);}};
}
function moduleHarness(store={},env=audioEnv(),blocked=false){
 const listeners={},win={...env,localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return store[k];},setItem:(k,v)=>{if(blocked)throw Error('blocked');store[k]=v;}},addEventListener(k,fn){listeners['window:'+k]=fn;}},doc={hidden:false,addEventListener(k,fn){listeners[k]=fn;}};
 vm.runInNewContext(source,{window:win,document:doc,console});
 return{sound:win.DaySound,env,doc,store,click(action){listeners.click({isTrusted:true,target:{closest:()=>action?{dataset:{action}}:null}});},visibility(hidden){doc.hidden=hidden;listeners.visibilitychange();}};
}
(async()=>{
 const m=moduleHarness();eq(Object.keys(m.sound).sort(),['enabled','play','setEnabled','startLoop','stopLoop'],'five public methods');eq(m.sound.enabled(),true,'on by default');
 m.sound.play('win');m.sound.startLoop('rain');eq(m.env.contexts.length,0,'no AudioContext before a user click');eq(m.env.timers.size,0,'no timers before a user click');
 m.click();eq(m.env.contexts.length,1,'first click unlocks audio');eq(m.env.navigator.audioSession.type,'ambient','iPhone silent-switch policy');ok(m.env.nodes.some(n=>n.kind==='gain'&&n.gain.value===.35),'quiet master volume');
 m.sound.play('click');const click=m.env.nodes.filter(n=>n.kind==='tone').at(-1);ok(click.stopped-click.started<=.04,'click under 40 ms');
 m.sound.startLoop('steps');eq([...m.env.timers.values()].at(-1).ms,350,'walking cadence');m.sound.stopLoop('steps');eq(m.env.timers.size,0,'walking stops immediately');
 m.sound.play('count',{progress:0});m.sound.startLoop('count');eq([...m.env.timers.values()][0].ms,220,'slow drum starts');m.sound.play('count',{progress:1});const [id,t]=[...m.env.timers][0];m.env.timers.delete(id);t.fn();eq([...m.env.timers.values()][0].ms,50,'drum accelerates');m.sound.stopLoop('count');eq(m.env.timers.size,0,'drum timer cancelled');
 m.sound.play('win',{seed:42});const first=m.env.nodes.filter(n=>n.kind==='noise').at(-1).buffer.getChannelData(0);m.sound.play('win',{seed:42});eq(Array.from(m.env.nodes.filter(n=>n.kind==='noise').at(-1).buffer.getChannelData(0)),Array.from(first),'same seed makes identical firecrackers');
 m.sound.startLoop('steps');m.visibility(true);eq(m.env.contexts[0].state,'suspended','hidden suspends');eq(m.env.timers.size,0,'hidden cancels loops');const count=m.env.nodes.length;m.sound.play('win');eq(m.env.nodes.length,count,'no hidden one-shot');m.visibility(false);await Promise.resolve();eq(m.env.contexts[0].state,'running','visible resumes');ok(m.env.timers.size>0,'active walking resumes');
 m.sound.setEnabled(false);eq(m.store['wenshan-sound'],'off','preference persists');eq(m.env.timers.size,0,'mute cancels timers');const muted=m.env.nodes.length;m.sound.play('win');m.sound.startLoop('count');eq(m.env.nodes.length,muted,'mute schedules no nodes');eq(m.env.timers.size,0,'mute schedules no loops');
 const off=moduleHarness(m.store);off.click();off.sound.play('click');eq(off.env.contexts.length,0,'off survives reload and never creates context');
 const toggle=moduleHarness();toggle.click('sound-toggle');toggle.sound.setEnabled(false);eq(toggle.env.contexts.length,0,'first click on off switch creates no context');
 const denied=moduleHarness({},audioEnv(),true);denied.click();denied.sound.setEnabled(false);eq(denied.sound.enabled(),false,'storage failures remain harmless');
 const broken=moduleHarness({}, {AudioContext:class{constructor(){throw Error('not available');}}});broken.click();broken.sound.play('win');eq(broken.sound.enabled(),true,'broken AudioContext is optional');
 // Same production UI and nine rounds with the module loaded, but no AudioContext.
 const silent=harness({}, {sound:true});silent.click({action:'start'});for(let d=1;d<=G.DAYS;d++)silent.run('fundraise');silent.click({action:'skip-count'});eq(silent.state().phase,'result','full campaign without AudioContext');
 silent.click({action:'sound-toggle'});eq(silent.saved['wenshan-sound'],'off','UI toggle saves preference');eq(harness(silent.snapshot(),{sound:true}).elements['sound-toggle'].textContent,'音效：關','UI preference readback');
 const calls=[],stub={enabled:()=>true,play:(...a)=>calls.push(['play',...a]),startLoop:n=>calls.push(['startLoop',n]),stopLoop:n=>calls.push(['stopLoop',n]),setEnabled:()=>{}};
 const h=harness({}, {soundStub:stub});h.click({action:'start'});h.go('canvass','market');h.commit();ok(calls.some(c=>c[0]==='play'&&c[1]==='depart'),'departure cue');ok(calls.some(c=>c[0]==='startLoop'&&c[1]==='steps'),'walking loop');h.click({action:'skip'});ok(calls.some(c=>c[0]==='stopLoop'&&c[1]==='steps'),'arrival stops walking');eq(calls.filter(c=>c[1]==='question').length,1,'question cue once');h.click({action:'notes'});h.click({action:'close'});eq(calls.filter(c=>c[1]==='question').length,1,'question rerender silent');h.answer('honest');for(let d=2;d<=G.DAYS;d++)h.run('fundraise');
 h.tick(20,.1);ok(calls.some(c=>c[0]==='startLoop'&&c[1]==='count'),'count drum starts');const before=clone(h.state().result);calls.length=0;h.click({action:'skip-count'});eq(calls[1]?.[0], 'stopLoop','skip stops drum before verdict');ok(calls.some(c=>c[0]==='stopLoop'&&c[1]==='count'),'skip stops drum');eq(calls.filter(c=>c[0]==='play'&&['win','lose'].includes(c[1])).length,1,'skip reveals exactly once');eq(h.state().result,before,'audio cannot change tally');
 calls.length=0;harness(h.snapshot(),{soundStub:stub});eq(calls.filter(c=>c[0]==='play'&&['win','lose','stamp'].includes(c[1])).length,0,'seen count reload is silent');
 const s=h.state();s.result.titles=[{id:'newcomer-upset',title:'素人逆襲',line:'test',detail:''}];s._ui.counting={status:'inprogress',elapsed:8};s._ui.soundSeen={};calls.length=0;const stamp=harness({[KEY]:JSON.stringify(s)},{soundStub:stub});stamp.click({action:'skip-count'});stamp.click({action:'tally'});stamp.click({action:'close'});eq(calls.filter(c=>c[0]==='play'&&c[1]==='stamp').length,1,'title stamp once across rerenders');calls.length=0;harness(stamp.snapshot(),{soundStub:stub});eq(calls.filter(c=>c[1]==='stamp'||c[1]==='win'||c[1]==='lose').length,0,'title and reveal not replayed after reload');
 s._ui.counting={status:'inprogress',elapsed:9.5};s._ui.soundSeen={};calls.length=0;harness({[KEY]:JSON.stringify(s)},{soundStub:stub});eq(calls.filter(c=>c[1]==='win'||c[1]==='lose').length,0,'reload past reveal never repeats fireworks');
 // Sound-on versus sound-off uses identical engine states and tally for the same choices.
 const a=harness({}, {seed:987,sound:true}),b=harness({'wenshan-sound':'off'},{seed:987,sound:true});for(const x of[a,b]){x.click({action:'start'});for(let d=1;d<=G.DAYS;d++)x.run('fundraise');x.click({action:'skip-count'});}eq(withoutUi(a.state()),withoutUi(b.state()),'sound setting changes no game facts');
 // A real stored tie pauses the roll, clicks once, then emits its result once.
 const tie=clone(s);tie.result.titles=[{id:'tie-elected',title:'抽籤上岸',line:'test',detail:''}];tie.result.outcome='elected';tie._ui.counting={status:'inprogress',elapsed:7.4};tie._ui.soundSeen={};calls.length=0;const draw=harness({[KEY]:JSON.stringify(tie)},{soundStub:stub});draw.tick(2,.1);eq(calls.filter(c=>c[0]==='play'&&c[1]==='draw').length,1,'draw click once after silence');ok(calls.some(c=>c[0]==='stopLoop'&&c[1]==='count'),'tie pauses the drum');draw.tick(20,.1);eq(calls.filter(c=>c[0]==='play'&&c[1]==='win').length,1,'winning reveal once');draw.tick(40,.1);eq(calls.filter(c=>c[0]==='play'&&c[1]==='win').length,1,'finishing the count does not reveal twice');
 const asyncEnv=audioEnv(),Base=asyncEnv.AudioContext;asyncEnv.AudioContext=class extends Base{constructor(){super();this.state='suspended';}resume(){return Promise.resolve().then(()=>{this.state='running';});}};const asyncAudio=moduleHarness({},asyncEnv);asyncAudio.click();asyncAudio.sound.play('click');asyncAudio.sound.play('depart');eq(asyncEnv.nodes.filter(n=>n.kind==='tone').length,0,'first click waits for async resume');await Promise.resolve();await Promise.resolve();eq(asyncEnv.nodes.filter(n=>n.kind==='tone').length,2,'first click and departure heard when resume completes');
 const html=fs.readFileSync('dist/index.html','utf8');ok(html.includes('day-sound.js?v=13.10.1')&&html.includes('day-ui.js?v=13.10.0'),'changed runtime scripts versioned');ok(html.indexOf('day-sound.js')<html.indexOf('day-ui.js'),'sound loads before controller');
 console.log(JSON.stringify({result:'passed',checks,scope:'Web Audio mock lifecycle, persistence, deterministic synthesis, full campaign without audio, one-shot receipts and exact on/off game equality. Physical iPhone audio not simulated.'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
