'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');let checks=0;
const context={window:{},console};vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/day-art.js','utf8'),context);const art=context.window.DayArt;
for(const col of art.assetFrames)for(const f of col){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1536&&f.y+f.h<=1024&&f.sole>0&&f.sole<=f.h);checks++;}
// Runtime images: every file the art registry names exists in game/, is a WebP at the source's pixel size, and stays under 1.5 MB.
const pack=root+'/assets/matte-toy-v1/';
function webpSize(b){assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');const kind=b.toString('ascii',12,16);if(kind==='VP8X')return[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];if(kind==='VP8L'){const v=b.readUInt32LE(21);return[1+(v&16383),1+((v>>14)&16383)];}if(kind==='VP8 ')return[b.readUInt16LE(26)&16383,b.readUInt16LE(28)&16383];throw Error('unknown WebP '+kind);}
function pngSize(file){const b=fs.readFileSync(file);assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');return[b.readUInt32BE(16),b.readUInt32BE(20)];}
const kitL=art.kitLayout,runtime=new Set([...Object.values(art.files),...Object.values(art.visits),...Object.values(art.rain),...Object.values(art.toyScenes)]);
for(const name of ['ground','ground-rain','hills-back','river','bridge','tree-a','tree-b',...Object.values(kitL.buildings).map(b=>b[0])])runtime.add('game/map-'+name+'.webp');
const sourceOf=f=>{const n=f.replace(/^game\//,'').replace(/\.webp$/,'');for(const p of [pack+'incoming/map-kit/'+n.replace(/^map-/,'')+'.png',pack+'incoming/'+n+'.png',pack+n+'.png'])if(fs.existsSync(p))return p;throw Error('no source for '+f);};
for(const f of runtime){const b=fs.readFileSync(pack+f);assert.ok(b.length<1.5e6,f+' under 1.5 MB');assert.deepEqual(webpSize(b),pngSize(sourceOf(f)),f+' keeps the source pixel size');checks++;}
// Component map: the map is built from the kit; streets connect every place; nobody stops behind a building or inside someone else.
const scene=art.scene();assert.ok(scene.includes('game/map-ground.webp')&&scene.includes('game/map-ground-rain.webp')&&scene.includes('id="kit-paving"')&&scene.includes('game/map-bridge.webp'));for(const b of Object.values(kitL.buildings))assert.ok(scene.includes('game/map-'+b[0]+'.webp'),b[0]);checks+=2;
// Every building remains a separately placed sprite; compact labels stay below roofs, with room between neighbouring names.
assert.equal((scene.match(/class="kit-part kit-building"/g)||[]).length,Object.keys(kitL.buildings).length);checks++;
for(const [place,building] of Object.entries({start:'office',prepare:'office',recruit:'office',temple:'temple',plaza:'plaza',market:'market',fundraise:'office',tv:'tv',online:'online',debate:'plaza'})){
 const label=kitL.labels[place],sprite=kitL.buildings[building];assert.ok(label[1]>sprite[2],place+' label below the building rather than over its roof');assert.ok(Math.hypot(label[0]-sprite[1],label[1]-sprite[2])<=330,place+' roadside sign stays near its building');checks++;
}
for(const [id,p] of Object.entries(kitL.labels)){assert.ok(p[0]>0&&p[0]<1536&&p[1]>0&&p[1]<1024,id+' label within board');checks++;}
const MX=1200/1536,MY=650/1024,toMap=p=>({x:p.x/MX,y:p.y/MY});
const distanceToSegment=(p,a,b)=>{const vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/(vx*vx+vy*vy||1)));return Math.hypot(a.x+vx*t-p.x,a.y+vy*t-p.y);};
const paved=p=>kitL.chains.some(c=>c.slice(1).some((id,i)=>distanceToSegment(p,{x:kitL.nodes[c[i]][0],y:kitL.nodes[c[i]][1]},{x:kitL.nodes[id][0],y:kitL.nodes[id][1]})<=kitL.roadWidth/2+1))||((p.x-kitL.square[0])/kitL.square[2])**2+((p.y-kitL.square[1])/kitL.square[3])**2<=1;
assert.ok(Object.keys(kitL.buildings).length<=8,'large functional landmarks, without a second row of filler houses');assert.ok(kitL.residents.length<=6,'a few residents in context, not a crowd lined up across the map');checks+=2;
for(const key of ['start','recruit','fundraise']){assert.equal(kitL.siteFor[key],'prepare');assert.deepEqual(art.stand(key),art.stand('prepare'));checks++;}assert.equal(kitL.siteFor.debate,'plaza');assert.deepEqual(art.stand('debate'),art.stand('plaza'));checks++;

const along=(pts,step=4)=>{const out=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/step));for(let j=0;j<=n;j++)out.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});}return out;};
const places=['market','street','temple','plaza','river','prepare','tv','online','fundraise','recruit','debate'],routes={};
for(const id of places){const route=art.visualRoute(id);assert.deepEqual(route.at(-1),art.stand(id));for(const p of route)assert.ok(p.x>=0&&p.x<=1200&&p.y>=0&&p.y<=650);for(const p of along(route.map(toMap)))assert.ok(paved(p),id+' walks on paving at '+Math.round(p.x)+','+Math.round(p.y));routes[id]=route.map(toMap);checks++;}
for(const id of places){const w=art.kitWalk('recruit',id).map(([x,y])=>({x,y}));for(const p of along(w))assert.ok(paved(p),'assistants to '+id+' walk on paving');routes['team-'+id]=w;checks++;}
const segDist=(p,a,b)=>{const vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/(vx*vx+vy*vy||1)));return Math.hypot(a.x+vx*t-p.x,a.y+vy*t-p.y);};
const people=kitL.residents.map(([look,x,y])=>({look,x,y}));
for(const r of people){for(const [id,route] of Object.entries(routes))for(let i=1;i<route.length;i++)assert.ok(segDist(r,route[i-1],route[i])>=34,r.look+' stands clear of the walk to '+id);for(const k of Object.keys(kitL.stands))for(let n=0;n<5;n++)assert.ok(Math.hypot(toMap(art.slot(k,n)).x-r.x,toMap(art.slot(k,n)).y-r.y)>=34,r.look+' clear of '+k+' slot '+n);checks++;}
for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++)assert.ok(Math.hypot(people[i].x-people[j].x,people[i].y-people[j].y)>=30,'residents do not overlap');
for(const k of Object.keys(kitL.stands)){const slots=[0,1,2,3,4].map(n=>toMap(art.slot(k,n)));assert.ok(paved(slots[0]),k+' door on paving');slots.forEach((a,i)=>{slots.slice(i+1).forEach(b=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=30,k+' slots apart'));});
 // Nothing drawn in front hides a person standing in a slot.
 for(const s of slots)for(const [,cx,base,top,bk] of Object.values(kitL.buildings)){if(base<=s.y)continue;const k2=bk||kitL.scale,left=cx-165*k2,right=cx+165*k2,upper=base-(900-top)*k2;assert.ok(s.x+16<left||s.x-16>right||s.y<upper,k+' slot in front of every building');}
 for(const s of slots)for(const [,cx,base,tk] of kitL.trees){if(base<=s.y)continue;assert.ok(Math.abs(s.x-cx)>16+86*tk||s.y-58>base||s.y<base-200*tk,k+' slot not behind a tree');}checks++;}
// While someone walks, nobody waits on the walking lane: every other place's slots stay clear of each walk.
for(const [id,route] of Object.entries(routes)){const own=id.replace(/^team-/,''),from=id.startsWith('team-')?'recruit':'start';for(const k of Object.keys(kitL.stands)){if(kitL.siteFor[k]===kitL.siteFor[own]||kitL.siteFor[k]===kitL.siteFor[from])continue;for(let n=0;n<5;n++){const p=toMap(art.slot(k,n));for(let i=1;i<route.length;i++)assert.ok(segDist(p,route[i-1],route[i])>=30,k+' slot '+n+' clear of the walk to '+id);}}checks++;}
{const rumour=toMap(art.rivalSpot('tv')),idle=toMap(art.rivalSpot(null));assert.ok(paved(rumour)&&paved(idle));for(const r of people)assert.ok(Math.hypot(r.x-idle.x,r.y-idle.y)>=34);checks++;}
// Roadside name signs must leave the waiting people visible at both compact phone and desktop map sizes.
const signWidths={prepare:[44,72],temple:[32,60],plaza:[32,60],market:[32,60],tv:[32,72],online:[32,48],street:[32,60],river:[32,60]};
const pointRectDistance=(p,r)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));
for(const [width,column] of [[300,0],[600,1]])for(const [key,sizes] of Object.entries(signWidths)){
 const [x,y]=kitL.labels[key],w=sizes[column]*1536/width,h=20*1536/width,rect={left:x-w/2,right:x+w/2,top:y-h,bottom:y};
 assert.ok(rect.left>=0&&rect.right<=1536,key+' sign remains inside '+width+'px map');
 for(const place of Object.keys(kitL.stands))for(let n=0;n<5;n++)assert.ok(pointRectDistance(toMap(art.slot(place,n)),rect)>=35,key+' sign clears '+place+' person '+n+' at '+width+'px');
 for(const resident of people)assert.ok(pointRectDistance(resident,rect)>=35,key+' sign clears '+resident.look+' at '+width+'px');checks++;
}
// Paths may go behind a facade for depth, but cannot cross a building's physical base or enter the river.
for(const [id,points] of Object.entries(routes))for(const q of along(points)){
 assert.ok(q.y<kitL.riverY,id+' stays out of the river');
 for(const [name,[,x,y,,bk]] of Object.entries(kitL.buildings)){const k=bk||kitL.scale;assert.ok(q.x<x-165*k||q.x>x+165*k||q.y<y-20||q.y>y+4,id+' does not walk through '+name+' foundation');}
}checks++;
art.useDistrictMap();assert.equal(art.getMap(),'district');assert.ok(art.scene().includes('game/district.webp'));for(const id of places)assert.deepEqual(art.visualRoute(id).at(-1),art.spot(id));checks+=2;
for(const [identity,column]of [['newcomer',0],['heir',1],['incumbent',2]]){const p=art.portrait({identity});assert.ok(p.includes('data-column="'+column+'"'));assert.ok(p.includes('cy="130"'));checks++;}
const toyScene=art.scene();art.setPack('unknown');assert.equal(art.getPack(),'original');assert.ok(art.scene().includes('<svg'));art.setPack('matte-toy-v1');assert.equal(art.scene(),toyScene);checks+=3;
for(const name of ['district','candidates','market-square','street','river']){const b=fs.readFileSync(root+'/assets/matte-toy-v1/'+name+'.png');assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');if(name==='candidates')assert.equal(b[25],6);checks++;}
// Every crop of every atlas lies inside its sheet and has its sole inside the crop.
for(const [name,frames] of Object.entries(art.sheets))for(const row of frames)for(const f of row){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1536&&f.y+f.h<=1024&&f.sole>0&&f.sole<=f.h,name);checks++;}
for(const row of art.walkFrames)for(const f of row){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1024&&f.y+f.h<=1536&&f.sole>0&&f.sole<=f.h);checks++;}
for(const role of ['elder','elder2','middle','middle2','young','young2','rival','helper','host']){assert.ok(art.avatar(role).includes('data-support-role="'+role+'"'));checks++;}
// Ages read at a glance: each group draws only from its own looks; every named resident has one look of their own group.
const Engine=require(root+'/day-engine.js');['elder','middle','young'].forEach((age,g)=>{assert.ok(art.groupLooks[g].length>=4&&art.groupLooks[g].every(l=>l.startsWith(age+'-')&&art.looks[l]));checks++;});
for(const [age,names] of Object.entries(Engine.SPEAKERS))for(const n of names){assert.ok(art.speakerLooks[n]?.startsWith(age+'-'),n);checks++;}
art.walkStep(.01,true);const frameA=art.avatar('player');art.walkStep(.2,true);assert.notEqual(art.avatar('player'),frameA);art.walkStep(0,false);assert.ok(!art.avatar('player').includes('walk.webp'));checks+=2;
for(const kind of ['tv','online','fundraise']){assert.ok(art.interior(kind).includes('game/'+kind+'.webp'));checks++;}for(const stage of ['count','elected','refunded','forfeited']){assert.ok(art.countNight(stage).includes('game/count-soft-v2.webp'));checks++;}
for(const kind of ['temple','plaza','debate','street','river','market','office']){assert.ok(art.interior(kind,{crowd:[]}).includes(art.visits[kind]),kind+' uses its simplified backdrop');checks++;}
for(const kind of ['temple','plaza','street','river','market']){const wet=art.interior(kind,{crowd:[],rain:true});assert.ok(wet.includes(art.rain[kind])&&wet.includes('data-art-fallback="assets/matte-toy-v1/'+art.visits[kind]+'"'),kind+' rain backdrop with a dry fallback');checks++;}
// Staging: the speaker is one of the ten, faces the candidate, carries the talk mark; the crowd turns toward the pair.
{const crowd=[0,0,0,1,1,1,1,2,2,2].map((g,i)=>({group:g,variant:i%2,tone:null})),svg=art.interior('market',{crowd,speaker:{group:1,name:'美姐'}});
 const who=[...svg.matchAll(/class="stage-person" data-who="([^"]+)" transform="translate\(([-\d.]+) /g)].map(m=>({who:m[1],x:+m[2]}));
 assert.equal(who.filter(p=>p.who==='you').length,1);assert.equal(who.filter(p=>p.who==='speaker').length,1);assert.equal(who.filter(p=>!['you','speaker'].includes(p.who)&&!p.who.startsWith('pet-')).length,9,'nine others plus the speaker make the ten');
 const speakerTag=svg.slice(svg.indexOf('data-who="speaker"'));assert.ok(speakerTag.slice(0,900).includes('scale(-1,1)')&&speakerTag.includes('talk-mark'),'the speaker turns to the candidate and is marked');assert.ok(svg.includes('ring-you')&&svg.includes('ring-speaker'));
 assert.ok(!svg.slice(0,svg.indexOf('data-who="speaker"')).includes('data-look="middle-apron"'),'no twin of the speaker in the crowd');checks+=5;}
{const rally=art.interior('plaza',{crowd:[],mode:'rally'});assert.ok(rally.includes(art.files.stage)&&rally.includes('選前之夜'));const board=art.billboard('kmt');assert.ok(board.includes('board-svg')&&board.includes(art.files.board));checks+=2;}
for(const n of [1,2,5]){const office=art.interior('office',{staff:n});assert.equal((office.match(/data-who="staff"/g)||[]).length,Math.min(3,n),'every staff member up to three is in the room');}{const office=art.interior('office',{staff:3});assert.ok(office.includes('ring-you'));checks++;}
// Exercise real controller switching through the established DOM harness, preserving the whole game state.
const testSource=fs.readFileSync(__dirname+'/v13-interface.cjs','utf8');const prefix=testSource.slice(0,testSource.indexOf('\nconst ui=fs.readFileSync'));
const scope={require,__dirname,console,module:{exports:{}}};vm.runInNewContext(prefix+'\nmodule.exports={harness,G};',scope);const {harness,G}=scope.module.exports;
const h=harness();h.click({action:'start'});h.go('canvass','market');const before=h.state();h.click({action:'art-switch'});assert.deepEqual(h.state(),before);h.click({action:'art-switch'});assert.deepEqual(h.state(),before);h.commit();h.click({action:'skip'});assert.equal(h.state().phase,'question');assert.ok(h.scene().includes('game/market-soft-v2.webp'));const q=G.question(h.state());h.answer(q.options.find(o=>o.unlocked).id);assert.equal(h.state().phase,'plan');assert.ok(h.elements['event-timeline'].innerHTML.includes('last-round'));checks+=6;
// Find a naturally occurring crisis, then prove the card/history do not settle it twice.
let crisisHarness;
for(let seed=1;seed<30&&!crisisHarness;seed++){
 const t=harness({}, {seed,reduced:true});t.click({action:'start'});
 for(let day=1;day<G.DAYS;day++){if(t.state().crisis?.status==='pending'){crisisHarness=t;break;}t.run('fundraise');t.wait();}
}
assert.ok(crisisHarness,'a real engine crisis occurs');
const c=crisisHarness, day=c.state().day;
assert.ok(c.elements['event-timeline'].innerHTML.includes('突發危機・等待處理'));
c.click({action:'intel'});c.click({action:'crisis',choice:'apologize'});
assert.equal(c.elements['event-feedback'].hidden,false);
assert.ok(c.elements['event-feedback'].innerHTML.includes('公開道歉切割'));
const settled=JSON.stringify(c.state());c.click({action:'crisis',choice:'apologize'},true);assert.equal(JSON.stringify(c.state()),settled);
assert.equal((c.elements['event-timeline'].innerHTML.match(new RegExp('data-event-key="crisis-day-'+day+'"','g'))||[]).length,1);
// Collapsing the news flash leaves a chip on the map; it opens again and stays collapsed across a reload.
c.click({action:'dismiss-event'},true);assert.equal(c.elements['event-feedback'].hidden,false);assert.ok(c.elements['event-feedback'].innerHTML.includes('data-action="expand-event"'));
const reloaded=harness(c.snapshot());assert.ok(reloaded.elements['event-feedback'].innerHTML.includes('data-action="expand-event"'));assert.ok(reloaded.elements['event-timeline'].innerHTML.includes('公開道歉切割'));
c.click({action:'expand-event'},true);assert.ok(c.elements['event-feedback'].innerHTML.includes('收起'));c.click({action:'dismiss-event'},true);
c.run('fundraise');c.wait();assert.ok(c.elements['event-timeline'].innerHTML.includes('公開道歉切割')&&c.elements['event-timeline'].innerHTML.includes('last-round'));
c.click({action:'restart'});assert.equal(c.elements['event-timeline'].hidden,true);assert.equal(c.elements['event-feedback'].hidden,true);assert.ok(!c.elements['event-timeline'].innerHTML.includes('crisis-day-'+day));checks+=13;
const mobile=harness({}, {width:375,reduced:true});mobile.click({action:'start'});assert.equal(mobile.elements['mobile-destinations'].innerHTML,'');assert.ok(mobile.map().includes('data-venue="market"'),'one tappable map, without duplicate destination list');mobile.go('online');mobile.commit();assert.equal(mobile.state().phase,'question');assert.equal(mobile.elements['mobile-destinations'].innerHTML,'');assert.ok(mobile.scene().includes('game/online.webp'));const mq=G.question(mobile.state());mobile.answer(mq.options.find(o=>o.unlocked).id);assert.ok(mobile.scene().includes('data-kind="online"'));checks+=5;
// The mobile destination surface must not depend on successful kit artwork loading.
assert.match(fs.readFileSync(root+'/map-layout.css','utf8'),/(?:^|\n)\.v13\s+#map-hotspots\s*\{\s*display:\s*block\s*\}/,'the current stylesheet restores map controls for every art pack, outside a media or pack gate');checks++;
for(const width of [375,600]){const fallback=harness({},{width});fallback.click({action:'start'});fallback.click({action:'art-switch'});assert.equal(fallback.doc.body.dataset.art,'original');assert.equal(fallback.elements['mobile-destinations'].innerHTML,'');assert.equal((fallback.map().match(/data-action="select-action"/g)||[]).length,8,'one set of destinations remains in the original mobile map');fallback.go('canvass','market');fallback.commit();assert.equal(fallback.state().phase,'travel','original mobile art can start an outing');checks+=4;}
// A transient component failure retries that piece; it must not immediately replace the completed artwork.
{const retry=harness({},{width:375}),attrs={'data-art-image':'map','data-art-map':'kit',src:'assets/matte-toy-v1/game/map-bld-market.webp'},piece={isConnected:true,getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};retry.click({action:'start'});const state=retry.state();
 retry.doc.emit('error',{target:piece});assert.equal(retry.win.DayArt.getMap(),'kit');assert.ok(attrs.src.endsWith('?art_retry=1'));assert.equal(attrs['data-art-retried'],'1');assert.deepEqual(retry.state(),state);
 retry.doc.emit('error',{target:piece});assert.equal(retry.win.DayArt.getMap(),'district');assert.ok(retry.elements.announcer.textContent.includes('重新整理可重試'));assert.deepEqual(retry.state(),state);
 piece.isConnected=false;retry.doc.emit('error',{target:piece});assert.ok(retry.win.DayArt.isToy(),'a stale failed element cannot cascade into another art fallback');assert.equal(retry.elements['mobile-destinations'].innerHTML,'');assert.equal((retry.map().match(/data-action="select-action"/g)||[]).length,8,'district fallback keeps exactly one set of destinations');retry.go('canvass','market');retry.commit();assert.equal(retry.state().phase,'travel','a failed kit image still permits a mobile outing');checks+=11;}
console.log(JSON.stringify({result:'passed',checks,scope:'Runtime WebP copies (size and pixel match to sources), component map paving, routes, slots and occlusion, residents clear of routes, sprite bounds and soles, age looks and named speakers, venue staging, rain fallbacks, pack toggles and a production question/recap; no browser claim.'}));
