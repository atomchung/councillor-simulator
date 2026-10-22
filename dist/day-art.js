/* Original code-native Muzha miniature with block-human residents, plus v13 venue scenes with a crowd of three fictional groups. No borrowed characters or textures. */
(function () {
  'use strict';


  // All matte assets, crops and map positions live here; canonical game coordinates stay unchanged.
  const TOY_ROOT = 'assets/matte-toy-v1/';
  const TOY_FRAMES = [
    [{x:223,y:22,w:199,h:356,sole:354},{x:247,y:382,w:173,h:321,sole:319},{x:250,y:708,w:154,h:298,sole:286}],
    [{x:676,y:24,w:213,h:349,sole:349},{x:691,y:384,w:170,h:319,sole:317},{x:703,y:708,w:148,h:300,sole:282}],
    [{x:1076,y:35,w:254,h:341,sole:340},{x:1146,y:391,w:174,h:310,sole:310},{x:1152,y:711,w:215,h:298,sole:279}]
  ];
  const SUPPORT_FRAMES = [[{"x": 162, "y": 13, "w": 280, "h": 351, "sole": 351}, {"x": 656, "y": 18, "w": 209, "h": 346, "sole": 346}, {"x": 1088, "y": 16, "w": 285, "h": 347, "sole": 347}], [{"x": 164, "y": 370, "w": 249, "h": 334, "sole": 334}, {"x": 641, "y": 373, "w": 239, "h": 332, "sole": 332}, {"x": 1080, "y": 370, "w": 294, "h": 337, "sole": 337}], [{"x": 116, "y": 704, "w": 382, "h": 316, "sole": 316}, {"x": 639, "y": 710, "w": 236, "h": 311, "sole": 311}, {"x": 1130, "y": 711, "w": 224, "h": 311, "sole": 311}]];
  const WALK_FRAMES = [[{"x": 141, "y": 17, "w": 159, "h": 264, "sole": 264}, {"x": 434, "y": 18, "w": 165, "h": 263, "sole": 263}, {"x": 710, "y": 25, "w": 190, "h": 256, "sole": 256}], [{"x": 143, "y": 287, "w": 161, "h": 264, "sole": 264}, {"x": 442, "y": 289, "w": 152, "h": 262, "sole": 262}, {"x": 702, "y": 293, "w": 204, "h": 258, "sole": 258}], [{"x": 147, "y": 556, "w": 156, "h": 257, "sole": 257}, {"x": 446, "y": 556, "w": 153, "h": 257, "sole": 257}, {"x": 727, "y": 560, "w": 170, "h": 253, "sole": 253}], [{"x": 140, "y": 816, "w": 148, "h": 254, "sole": 254}, {"x": 438, "y": 816, "w": 150, "h": 255, "sole": 255}, {"x": 731, "y": 817, "w": 201, "h": 254, "sole": 254}], [{"x": 145, "y": 1071, "w": 140, "h": 236, "sole": 236}, {"x": 441, "y": 1071, "w": 140, "h": 235, "sole": 235}, {"x": 736, "y": 1072, "w": 185, "h": 234, "sole": 234}], [{"x": 149, "y": 1307, "w": 134, "h": 221, "sole": 221}, {"x": 438, "y": 1307, "w": 144, "h": 222, "sole": 222}, {"x": 738, "y": 1308, "w": 185, "h": 221, "sole": 221}]];
  const TOY_SPOTS = {start:[600,345],market:[370,348],temple:[157,285],street:[552,424],plaza:[725,285],river:[685,517],prepare:[510,233],recruit:[552,225],tv:[961,402],online:[1040,432],fundraise:[606,472],debate:[776,268]};
  // Waypoints follow the paved streets of district.png, so walkers never cross roofs, stalls or gardens.
  const TOY_PATHS = {market:[[520,328],[440,330]],temple:[[520,328],[440,330],[320,336],[240,332]],street:[[680,345],[700,410],[705,482],[600,484],[575,452]],plaza:[[650,316]],river:[[680,345],[700,410],[705,482]],prepare:[[570,295]],recruit:[[570,295]],tv:[[680,345],[700,410],[800,445],[880,488],[985,468],[995,432]],online:[[680,345],[700,410],[800,445],[880,488],[985,468],[1030,455]],fundraise:[[680,345],[700,410],[705,482]],debate:[[650,316]]};
  const TOY_VISITS = {market:'market-square.png',street:'street.png',river:'river.png'};
  let artPack = 'matte-toy-v1', toyFacing = {row:0,mirror:false};
  // Browser preferences are separate from election saves. Missing storage is harmless.
  try { if (window.location) { const q = new URLSearchParams(window.location.search).get('art'); const v = q || window.localStorage?.getItem('wenshan-ui-art-pack-v1'); if(v) artPack = v === 'matte-toy-v1' ? v : 'original'; } } catch (_) {}
  const isToy = () => artPack === 'matte-toy-v1';
  function setPack(id) { artPack = id === 'matte-toy-v1' ? id : 'original'; try { window.localStorage?.setItem('wenshan-ui-art-pack-v1',artPack); } catch (_) {} return artPack; }
  function spot(id) { const p = TOY_SPOTS[id] || TOY_SPOTS.start; return {x:p[0],y:p[1]}; }
  function toyKey(id, venue) { return ['canvass','rally'].includes(id) ? (TOY_SPOTS[venue] ? venue : 'market') : id === 'press' ? 'tv' : id === 'dig' ? 'prepare' : id; }
  function visualRoute(id, venue, from) { const key=toyKey(id,venue); return [from || spot('start'),...(TOY_PATHS[key] || []).map(p=>({x:p[0],y:p[1]})),spot(key)]; }
  function mapPoint(p) {
    if(!isToy()) return {...p};
    const pairs = Object.entries(anchors).map(([key,a])=>({key:key==='canvass'?'market':key,a}));
    pairs.push({key:'street',a:{x:609,y:384}},{key:'river',a:{x:551,y:474}},{key:'plaza',a:{x:713,y:243}},{key:'temple',a:{x:158.2,y:285.8}},{key:'debate',a:{x:935,y:175}});
    const n=pairs.filter(v=>TOY_SPOTS[v.key]).sort((a,b)=>Math.hypot(a.a.x-p.x,a.a.y-p.y)-Math.hypot(b.a.x-p.x,b.a.y-p.y))[0];
    const v=spot(n.key); return {x:v.x+(p.x-n.a.x)*.4,y:v.y+(p.y-n.a.y)*.4};
  }
  function alongVisual(points, t) { const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)); let d=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,t)); for(let i=0;i<lengths.length;i++){if(d<=lengths[i]&&lengths[i])return {x:points[i].x+(points[i+1].x-points[i].x)*d/lengths[i],y:points[i].y+(points[i+1].y-points[i].y)*d/lengths[i]};d-=lengths[i];} return points.at(-1); }
  function travelPoint(route,index,p,id,venue) { if(!isToy())return p; const lengths=route.slice(1).map((a,i)=>Math.hypot(a.x-route[i].x,a.y-route[i].y)); const total=lengths.reduce((a,b)=>a+b,0); const prev=route[Math.min(index-1,route.length-1)]; const done=lengths.slice(0,index-1).reduce((a,b)=>a+b,0)+Math.hypot(p.x-prev.x,p.y-prev.y); return alongVisual(visualRoute(id,venue,mapPoint(route[0])),total?done/total:1); }
  function facing(dx,dy) { const next=Math.abs(dy)>Math.abs(dx)*1.15?{row:dy<0?2:0,mirror:false}:{row:1,mirror:dx<0}; const changed=next.row!==toyFacing.row||next.mirror!==toyFacing.mirror; toyFacing=next; return changed; }
  function toySprite(column=0,row=0,mirror=false) {
    const f=TOY_FRAMES[column][row], k=124/f.sole, w=f.w*k, h=f.h*k;
    // Nested SVG clips each sprite without global clip IDs; every sole is exactly y=130.
    return '<g class="toy-figure" data-column="'+column+'"><ellipse cx="50" cy="130" rx="18" ry="4" fill="#263c48" opacity=".18"/>'+ (mirror?'<g transform="translate(100,0) scale(-1,1)">':'<g>')+'<svg x="'+(50-w/2)+'" y="6" width="'+w+'" height="'+h+'" viewBox="'+[f.x,f.y,f.w,f.h].join(' ')+'" overflow="hidden"><image data-art-image="candidate" href="'+TOY_ROOT+'candidates.png" width="1536" height="1024"/></svg></g></g>';
  }
  let toyWalk = { active: false, time: 0, frame: 0 };
  function walkStep(dt, active) { const old = toyWalk.frame, was = toyWalk.active; toyWalk.active = active; toyWalk.time = active ? toyWalk.time + dt : 0; toyWalk.frame = Math.floor(toyWalk.time / .19) % 2; return old !== toyWalk.frame || was !== active; }
  function atlasFigure(file, f, width, height, attrs = '') {
    const k = 124/f.sole, w=f.w*k, h=f.h*k;
    return '<g class="toy-figure" '+attrs+'><ellipse cx="50" cy="130" rx="18" ry="4" fill="#263c48" opacity=".18"/><svg x="'+(50-w/2)+'" y="6" width="'+w+'" height="'+h+'" viewBox="'+[f.x,f.y,f.w,f.h].join(' ')+'" overflow="hidden"><image data-art-image="'+file+'" href="'+TOY_ROOT+file+'" width="'+width+'" height="'+height+'"/></svg></g>';
  }
  function toyWalker() {
    const row=toyFacing.row*2+toyWalk.frame, column=toyColumn(), content=atlasFigure('walk.png',WALK_FRAMES[row][column],1024,1536,'data-walk-frame="'+row+'"');
    return toyFacing.mirror ? '<g transform="translate(100,0) scale(-1,1)">'+content+'</g>' : content;
  }
  const SUPPORT_ROLES = {elder:0,elder2:1,middle:3,middle2:2,young:4,young2:5,resident:2,shop:2,shop2:3,rival:6,helper:7,host:8};
  function supportFigure(role) { const n=SUPPORT_ROLES[role]??7;return atlasFigure('support.png',SUPPORT_FRAMES[Math.floor(n/3)][n%3],1536,1024,'data-support-role="'+role+'"'); }
  function sceneAtlas(kind) { const cell={tv:[0,0],online:[768,0],fundraise:[0,512],count:[768,512]}[kind]; if(!cell)return '';return '<svg width="1200" height="650" viewBox="'+cell[0]+' '+cell[1]+' 768 512" preserveAspectRatio="none" overflow="hidden"><image data-art-image="scene" href="'+TOY_ROOT+'scenes.png" width="1536" height="1024"/></svg>'; }
  function toyTeam(assignments,elapsed,id,venue,reduced) {
    return assignments.filter(a=>a.task!=='release').slice(0,6).map((a,i)=>{const dest=a.task==='research'?'prepare':a.task==='stream'?'online':a.task==='booth'?'fundraise':a.task==='idle'?'recruit':id;const target=toyKey(dest,venue);const p=alongVisual([spot('recruit'),spot('start'),...visualRoute(target).slice(1)],reduced?1:Math.min(1,elapsed/2.5));p.x+=(-28+i*14);p.y+=18+i%2*10;return '<span class="toy-helper" data-helper-id="'+String(a.id??i).replace(/[^a-zA-Z0-9_-]/g,'')+'" style="left:'+p.x/12+'%;top:'+p.y/6.5+'%;z-index:'+Math.round(p.y)+'">'+avatar('helper')+'</span>';}).join('');
  }
  function toyResidents() { return [[330,336,'elder'],[262,332,'middle2'],[760,298,'young'],[656,501,'elder2'],[915,500,'young2'],[540,261,'middle']].map(([x,y,role])=>'<span class="toy-resident" style="left:'+x/12+'%;top:'+y/6.5+'%">'+avatar(role)+'</span>').join(''); }
  function toyColumn(look=candidates.player) {return look.identity==='heir'||look.outfit==='suit'?1:look.identity==='incumbent'||look.outfit==='vest'?2:0;}

  const C = {
    ink: '#394d47', sky: '#f5f0dc', paving: '#e7dfc7', pavingSide: '#cdbf9e',
    wall: '#ede1c3', wallSide: '#cfbea0', teal: '#658d7d', tealDark: '#466c60',
    wood: '#b98b60', woodSide: '#906b4e', cream: '#fff2d2'
  };
  const points = ps => ps.map(p => p.join(',')).join(' ');
  const poly = (ps, fill, attrs = '') => `<polygon points="${points(ps)}" fill="${fill}" ${attrs}/>`;
  const rect = (x, y, w, h, fill, attrs = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${attrs}/>`;
  const path = (d, color, width = 2, attrs = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${attrs}/>`;
  // Each block has a front, an upper plane, and a short right plane. The same
  // shallow projection is shared by architecture, furnishings, and people.
  const block = (x, y, w, h, d, front, top, side) =>
    rect(x, y, w, h, front) +
    poly([[x, y], [x + d, y - d * .55], [x + w + d, y - d * .55], [x + w, y]], top) +
    poly([[x + w, y], [x + w + d, y - d * .55], [x + w + d, y + h - d * .55], [x + w, y + h]], side);
  const label = (x, y, text, size = 16, color = C.ink, attrs = '') => `<text x="${x}" y="${y}" fill="${color}" font-family="Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif" font-size="${size}" font-weight="700" ${attrs}>${text}</text>`;
  const safeColor = (color, fallback) => typeof color === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;

  const roleAliases = {
    protagonist: 'player', candidate: 'player', volunteer: 'helper', staff: 'helper', host: 'resident',
    vendor: 'shop', shopkeeper: 'shop', merchant: 'shop', access: 'shop',
    drain: 'shop2', neighbour: 'resident', neighbor: 'resident',
    opponent: 'rival'
  };
  const looks = {
    player: { shirt: '#527e70', skin: '#d5a17e', shade: '#b98164', hair: '#3f4540', trousers: '#485f65' },
    shop: { shirt: '#ae835c', skin: '#d0a381', shade: '#b58465', hair: '#47463e', trousers: '#566461' },
    shop2: { shirt: '#6d8f8a', skin: '#b78868', shade: '#996c53', hair: '#343f3b', trousers: '#5a625e' },
    resident: { shirt: '#947d8f', skin: '#e0b493', shade: '#c18f73', hair: '#a9a99a', trousers: '#59656a' },
    helper: { shirt: '#7c98a2', skin: '#c99878', shade: '#a9785e', hair: '#535044', trousers: '#626a63' },
    rival: { shirt: '#bd7e67', skin: '#dab08c', shade: '#b68a6b', hair: '#635143', trousers: '#545d64' },
    // Three fictional voter groups, two looks each; colours match the group chips in the interface.
    elder: { shirt: '#93708a', skin: '#ddb193', shade: '#bf8f73', hair: '#dddad0', trousers: '#5d5a54' },
    elder2: { shirt: '#86607a', skin: '#d6aa88', shade: '#b88a6c', hair: '#cfcbc0', trousers: '#57564f' },
    middle: { shirt: '#4f7aa0', skin: '#d4a07c', shade: '#b78262', hair: '#34332f', trousers: '#46505a' },
    middle2: { shirt: '#5d84a6', skin: '#c99876', shade: '#ab7a5c', hair: '#2c2b28', trousers: '#4d4d49' },
    young: { shirt: '#d9a33a', skin: '#e2b896', shade: '#c39477', hair: '#2a2523', trousers: '#3d5868' },
    young2: { shirt: '#cf9436', skin: '#d8ad8b', shade: '#b98d6e', hair: '#3a2d27', trousers: '#3b4757' }
  };

  // The two candidates dress by identity and wear their party's colour; the controller sets this once per game.
  const PARTY_COLORS = { kmt: '#1f4f9c', dpp: '#2e8b4f' };
  let candidates = { player: { outfit: 'casual', party: null }, rival: { party: null } };
  function setCandidates(next = {}) { candidates = { player: { ...candidates.player, ...(next.player || {}) }, rival: { ...candidates.rival, ...(next.rival || {}) } }; }
  // Poses for the count night: arms up to cheer, hands together to clap, a bow, heads down; null is standing.
  const POSES = {
    cheer: { left: 'rotate(160 22 64)', right: 'rotate(-160 74 64)', mouth: 'smile' },
    clap: { left: 'rotate(-38 22 64)', right: 'rotate(38 74 64)', mouth: 'smile' },
    wave: { left: 'rotate(150 22 64)', mouth: 'smile' },
    bow: { left: 'rotate(-14 22 64)', right: 'rotate(14 74 64)', head: 'translate(0 9)', mouth: 'frown' },
    sad: { head: 'translate(0 6)', mouth: 'frown' }
  };
  const turn = t => t ? ' transform="' + t + '"' : '';
  function humanMarkup(role = 'player', color, pose = null) {
    if (isToy()) { if (['player','protagonist','candidate'].includes(role)) return toyWalk.active && !pose ? toyWalker() : toySprite(toyColumn(), pose ? 0 : toyFacing.row, pose ? false : toyFacing.mirror); return supportFigure(role); }
    const P = POSES[pose] || {};
    role = roleAliases[role] || role;
    if (!Object.prototype.hasOwnProperty.call(looks, role)) role = 'player';
    const outfit = role === 'player' ? candidates.player.outfit : null, party = PARTY_COLORS[role === 'player' ? candidates.player.party : role === 'rival' ? candidates.rival.party : null] || null;
    const p = looks[role], shirt = outfit === 'suit' ? '#2f3b52' : outfit === 'vest' ? '#efe9dc' : safeColor(color, p.shirt);
    let s = '<g class="human-avatar" data-role="' + role + '">';
    s += '<g class="leg-left">' + block(30, 96, 14, 27, 4, p.trousers, p.trousers, '#43504e') + rect(27, 123, 20, 7, '#3d4945') + '</g>';
    s += '<g class="leg-right">' + block(51, 96, 14, 27, 4, p.trousers, p.trousers, '#43504e') + rect(49, 123, 21, 7, '#3d4945') + '</g>';
    s += '<g class="arm-left"' + turn(P.left) + '>' + block(17, 63, 10, 29, 4, shirt, shirt, '#4b625b') + block(17, 92, 10, 10, 4, p.skin, p.skin, p.shade) + '</g>';
    s += '<g class="body">' + block(29, 59, 36, 39, 5, shirt, shirt, '#456158') + rect(40, 52, 14, 9, p.skin);
    if (role === 'player' && outfit === 'suit') {
      s += poly([[38, 59], [56, 59], [47, 76]], '#f4efe2') + poly([[45, 62], [49, 62], [50, 80], [47, 84], [44, 80]], '#a8463c') + path('M38 59L47 80L56 59', '#1e2738', 2);
    } else if (role === 'player' && outfit === 'vest') {
      s += rect(29, 62, 12, 36, '#6f6a5c') + rect(53, 62, 12, 36, '#6f6a5c') + rect(31, 66, 3, 3, '#d8c27a') + poly([[41, 59], [53, 59], [47, 68]], '#f4efe2');
    } else if (role === 'player') {
      s += poly([[34, 59], [42, 59], [47, 69], [42, 72]], '#e9e4cf') + poly([[52, 59], [60, 59], [52, 72], [47, 69]], '#e9e4cf');
      s += rect(53, 77, 8, 9, '#eee3bf') + rect(55, 79, 4, 2, '#c5ac72');
    } else if (role === 'shop' || role === 'shop2') {
      s += rect(38, 61, 4, 17, '#e3c898') + rect(55, 61, 4, 17, '#e3c898') + rect(34, 75, 27, 24, '#e3c898');
      s += rect(40, 83, 15, 9, '#c4a475') + path('M35 76H60', '#f5dfb7', 2);
    } else if (role === 'resident') {
      s += path('M47 62V96', '#b09aa7', 2) + rect(49, 72, 2, 2, '#e6d2bf') + rect(49, 81, 2, 2, '#e6d2bf');
    } else if (role === 'helper') {
      s += rect(40, 60, 15, 10, '#ebdfc2') + rect(34, 78, 12, 10, '#a8bbc0');
    } else if (role === 'rival') {
      s += poly([[36, 59], [58, 59], [47, 89]], '#f1e6cf') + path('M47 63V94', '#93604f', 2);
      s += rect(54, 77, 7, 6, '#d9b878');
    } else if (role === 'elder' || role === 'elder2') {
      s += rect(46, 66, 3, 3, '#ecdccd') + rect(46, 76, 3, 3, '#ecdccd') + rect(46, 86, 3, 3, '#ecdccd') + path('M35 60L47 70L59 60', '#6f5068', 2);
    } else if (role === 'middle') {
      s += poly([[37, 59], [57, 59], [47, 67]], '#e9e4cf') + poly([[45, 63], [49, 63], [51, 84], [47, 89], [43, 84]], '#2f4f6a');
    } else if (role === 'middle2') {
      s += path('M33 61L62 93', '#4b3b2c', 3) + block(55, 88, 13, 11, 2, '#7a5f45', '#94765a', '#5f4a37');
    } else if (role === 'young' || role === 'young2') {
      s += poly([[33, 59], [61, 59], [57, 65], [37, 65]], '#b9832a') + path('M42 64V74M52 64V74', '#f6e5b8', 1.6) + rect(30, 60, 4, 32, '#5f4a2c') + rect(60, 60, 4, 32, '#5f4a2c');
    }
    // Campaign sash and party badge in the party's colour.
    if (party) s += poly([[30, 61], [38, 58], [66, 93], [59, 98]], party) + path('M31 63L60 97', '#ffffff', 1.2, 'opacity=".55"') + '<circle cx="54" cy="70" r="4.2" fill="#ffffff"/><circle cx="54" cy="70" r="2.6" fill="' + party + '"/>';
    s += '</g><g class="arm-right"' + turn(P.right) + '>' + block(69, 63, 10, 29, 4, shirt, shirt, '#4b625b') + block(69, 92, 10, 10, 4, p.skin, p.skin, p.shade);
    if (role === 'resident') s += path('M73 101V94H84V103', '#a18e68', 3) + block(70, 102, 17, 17, 3, '#c4b17e', '#dac99d', '#a69466');
    if (role === 'rival') s += block(72, 91, 13, 18, 2, '#eee6cf', '#fff4db', '#c8bda2') + rect(75, 96, 7, 2, '#b3c2b1');
    if (role === 'elder2') s += path('M80 100V131', '#7a6248', 3.2) + path('M80 100H86', '#7a6248', 3);
    s += '</g><g class="head"' + turn(P.head) + '>';
    if (role === 'shop') s += block(27, 29, 39, 29, 7, p.hair, p.hair, '#343c35');
    s += block(30, 19, 34, 34, 10, p.skin, '#e9c1a0', p.shade);
    s += poly([[30, 19], [40, 13.5], [74, 13.5], [64, 19]], p.hair) + rect(30, 19, 34, 8, p.hair) + poly([[64, 19], [74, 13.5], [74, 29], [64, 34]], p.hair);
    if (role === 'elder' || role === 'elder2') {
      s += rect(30, 25, 5, 15, p.hair) + rect(60, 25, 4, 14, p.hair);
      if (role === 'elder') s += '<g fill="none" stroke="#6b6560" stroke-width="1.8"><rect x="34" y="32" width="11" height="8"/><rect x="49" y="32" width="11" height="8"/><path d="M45 35H49"/></g>';
    } else if (role === 'young2') {
      s += block(28, 12, 38, 9, 6, '#3f6f8c', '#5786a2', '#2f566d') + rect(26, 19, 20, 4, '#2f566d');
    } else if (role === 'resident') {
      s += rect(30, 25, 5, 14, p.hair) + rect(60, 25, 4, 13, p.hair);
      s += '<g fill="none" stroke="#657067" stroke-width="1.8"><rect x="34" y="32" width="11" height="8"/><rect x="49" y="32" width="11" height="8"/><path d="M45 35H49M60 34L68 30"/></g>';
    } else if (role === 'rival') {
      s += poly([[30, 25], [42, 25], [42, 29], [36, 29], [36, 33], [30, 33]], p.hair);
    } else if (role === 'shop2') {
      s += rect(27, 16, 12, 11, p.hair) + rect(40, 12, 12, 9, p.hair) + rect(54, 14, 13, 10, p.hair);
    } else {
      s += rect(30, 26, 6, 7, p.hair);
    }
    // Small square eyes and a single mouth: a deliberately human face.
    s += rect(38, 34, 3, 3, C.ink) + rect(53, 34, 3, 3, C.ink) + rect(46, 40, 3, 3, p.shade) + (P.mouth === 'smile' ? path('M42 45Q47 52 52 45', '#8b4f3f', 2) : P.mouth === 'frown' ? path('M43 49Q47 45 51 49', '#9b6f57', 1.5) : path('M43 47H51', '#9b6f57', 1.5));
    s += '</g></g>';
    return s;
  }

  function avatar(role = 'player', color) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true" focusable="false" class="day-avatar-svg">' +
      poly([[22, 130], [49, 121], [82, 130], [52, 138]], '#647764', 'opacity=".16"') + humanMarkup(role, color) + '</svg>';
  }

  // A candidate in a given outfit and party, without changing the current game's look (opening cards, match-up).
  function portrait(look = {}, role = 'player') {
    if (isToy() && role === 'player') return '<svg class="day-avatar-svg" viewBox="0 0 100 140">'+toySprite(toyColumn(look))+'</svg>';
    const saved = candidates;
    candidates = role === 'rival' ? { ...saved, rival: { party: look.party || null } } : { ...saved, player: { outfit: look.outfit || 'casual', party: look.party || null } };
    try { return avatar(role); } finally { candidates = saved; }
  }
  // A campaign billboard: the candidate's name on a panel with a band in the party colour; (x, y) is where the posts meet the ground.
  function boardMarkup(x, y, k, party) {
    const band = PARTY_COLORS[party] || '#9a7b4f';
    return '<g class="campaign-board" transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' + rect(-38, -62, 7, 62, '#6d6a5c') + rect(31, -62, 7, 62, '#6d6a5c') +
      rect(-58, -122, 116, 66, '#fffaf0', 'stroke="#55635b" stroke-width="3" rx="3"') + rect(-58, -122, 116, 17, band, 'rx="3"') +
      label(0, -109, '市議員候選人', 11, '#ffffff', 'text-anchor="middle"') + label(0, -71, '小沈', 30, '#24443c', 'text-anchor="middle"') + '</g>';
  }
  function billboard(party) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-62 -126 124 130" aria-hidden="true" focusable="false" class="board-svg">' + boardMarkup(0, 0, 1, party) + '</svg>'; }

  function person(x, feetY, role, scale = .62, pose = null) {
    return '<g class="day-resident" data-role="' + role + '" transform="translate(' + (x - 50 * scale) + ' ' + (feetY - 130 * scale) + ') scale(' + scale + ')">' +
      poly([[22, 130], [49, 121], [82, 130], [52, 138]], '#647764', 'opacity=".14"') + humanMarkup(role, undefined, pose) + '</g>';
  }

  // True parallel 2.5D projection. The two ground axes slope in opposite
  // directions; buildings, roofs, furniture and paths share that projection.
  const P = (u, v, z = 0) => [+(600 + (u - v) * .94).toFixed(2), +(90 + (u + v) * .43 - z).toFixed(2)];
  const isoTile = (u, v, w, d, fill, z = 0, attrs = '') => poly([P(u, v, z), P(u + w, v, z), P(u + w, v + d, z), P(u, v + d, z)], fill, attrs);
  const isoBox = (u, v, w, d, h, top, front, side, z = 0) =>
    poly([P(u, v + d, z + h), P(u + w, v + d, z + h), P(u + w, v + d, z), P(u, v + d, z)], front) +
    poly([P(u + w, v, z + h), P(u + w, v + d, z + h), P(u + w, v + d, z), P(u + w, v, z)], side) +
    isoTile(u, v, w, d, top, z + h);
  const isoLine = (a, b, color, width = 1.5, attrs = '') => path('M' + a.join(' ') + 'L' + b.join(' '), color, width, attrs);
  const front = (u, v, w, z, h, fill) => poly([P(u,v,z+h),P(u+w,v,z+h),P(u+w,v,z),P(u,v,z)], fill);
  const side = (u, v, d, z, h, fill) => poly([P(u,v,z+h),P(u,v+d,z+h),P(u,v+d,z),P(u,v,z)], fill);
  function frontLabel(u, v, z, text, size = 16, color = C.cream) {
    const [x,y]=P(u,v,z);
    return '<g transform="matrix(.94 .43 0 1 '+x+' '+y+')">'+label(0,0,text,size,color)+'</g>';
  }
  function isoPerson(u, v, role, size = .48) {
    const [x, y] = P(u,v,2);
    return person(x, y, role, size);
  }
  function isoTree(u, v, size = 1) {
    const [x, y] = P(u, v);
    return `<g transform="translate(${x} ${y}) scale(${size})">` +
      poly([[-25,3],[0,-8],[28,4],[1,16]], '#657d65', 'opacity=".13"') +
      block(-4, -36, 7, 36, 5, '#a18e67', '#c4ad7f', '#837955') +
      poly([[-31,-45],[-17,-68],[10,-77],[33,-56],[27,-30],[4,-18],[-23,-26]], '#8fa67b') +
      poly([[-31,-45],[-17,-68],[2,-47],[-23,-26]], '#adbc8b') +
      poly([[-17,-68],[10,-77],[33,-56],[2,-47]], '#bfcca0') +
      poly([[2,-47],[33,-56],[27,-30],[4,-18]], '#72936e') + '</g>';
  }
  function windows(u,v,w,h,count=3) {
    let s='';
    for(let i=0;i<count;i++){
      const a=u+14+i*(w-22)/count;
      s+=front(a-2,v+.2,20,h-33,25,'#d2c5a6');
      s+=front(a,v+.5,16,h-31,21,'#79988d');
      s+=front(a+1,v+.7,14,h-19,8,'#aebfaf');
      s+=isoLine(P(a+8,v+.9,h-31),P(a+8,v+.9,h-10),'#e4dcc0',1.5);
    }
    return s;
  }
  function pitchedRoof(u,v,w,d,h,colors) {
    const a=P(u-5,v-5,h+2),b=P(u+w+5,v-5,h+2),c=P(u+w+5,v+d+5,h+2),e=P(u-5,v+d+5,h+2);
    const m=P(u-5,v+d*.46,h+28),n=P(u+w+5,v+d*.46,h+28);
    return poly([a,b,n,m],colors[0])+poly([m,n,c,e],colors[1])+poly([b,n,c],colors[2])+
      poly([a,P(u+w*.24,v-5,h+2),P(u+w*.24,v+d*.46,h+28),m],colors[3])+
      isoLine(m,n,colors[0],2);
  }
  function office() {
    const u=70,v=65,w=140,d=95,h=86;
    let s='<g data-place="office">';
    s+=isoTile(u-12,v-9,w+42,d+55,'#e2ddc4',2);
    s+=isoTile(u+8,v+8,w+12,d+14,'#73836b',2,'opacity=".13"');
    s+=isoBox(u,v,w,d,h,'#f1e8ca','#ede3c5','#cdbfa0');
    s+=windows(u,v+d,w,h,3);
    // Recessed front entrance for preparing the day's message.
    s+=front(126,v+d+.7,34,0,39,'#a5ad94')+front(131,v+d+1,24,0,34,'#708c7b');
    s+=isoLine(P(143,v+d+1.3,4),P(143,v+d+1.3,32),'#ced8bc',1.5);
    s+=isoBox(121,v+d+1,44,15,4,'#d5c7a6','#bcad8d','#b5a789');
    // A second entrance and one side window identify the shared team room.
    s+=side(u+w+.3,100,29,0,40,'#809783')+side(u+w+.6,105,19,5,29,'#aec0a8');
    s+=side(u+w+.5,139,13,31,20,'#7e978d');
    s+=isoBox(u+w+1,96,15,37,4,'#d5c7a6','#bcad8d','#b5a789');
    s+=pitchedRoof(u,v,w,d,h,['#a1b5a0','#7e9b88','#668773','#bbcab0']);
    // Small faceted roof vent, rather than another building.
    s+=isoBox(162,96,16,14,13,'#c9d0b7','#aebda1','#92a68d',h+15);
    // Quiet office emblem: paper with three lines, on the front wall.
    s+=front(80,v+d+.8,29,13,25,'#d7cbaa')+front(85,v+d+1.1,19,17,17,'#f9eed0');
    s+=front(80,v+d+1,111,43,18,'#5f8071')+frontLabel(88,v+d+1.3,48,'社區工作室',13,'#fff0cd');
    for(let z=20;z<30;z+=4)s+=isoLine(P(89,v+d+1.4,z),P(100,v+d+1.4,z),'#8e9c82',1.4);
    return s+'</g>';
  }
  function market() {
    // A wider, three-level urban market block. The upper library and flat
    // parapet are recognisable civic details, not a reconstruction of the site.
    const u=55,v=310,w=175,d=100,h=145;
    let s='<g data-place="market" data-landmark="木柵市場">';
    s+=isoTile(u-10,v-8,w+29,d+61,'#e0dac1',2);
    s+=isoTile(u+7,v+9,w+8,d+14,'#73836b',2,'opacity=".13"');
    s+=isoBox(u,v,w,d,h,'#d5c8ae','#e2cfb0','#bcae92');
    // Tiled facade, recessed shop bays, and warm concrete floor bands.
    for(const z of [47,80,110])s+=front(u,v+d+.2,w,z,4,'#c4b291');
    for(const a of [u+10,u+63,u+116]) {
      s+=front(a,v+d+.3,47,7,36,'#526d5e');
      s+=front(a+4,v+d+.5,39,10,29,'#80937a');
      s+=isoLine(P(a+24,v+d+.7,10),P(a+24,v+d+.7,39),'#c6cdb0',2);
      s+=front(a+3,v+d+.5,41,86,18,'#77958c');
      s+=front(a+6,v+d+.7,35,96,6,'#b6c9b5');
      s+=isoLine(P(a+23,v+d+.8,87),P(a+23,v+d+.8,104),'#e8dec4',2);
    }
    for(const b of [v+15,v+48,v+78]) {
      s+=side(u+w+.3,b,20,85,20,'#7c968c');
      s+=side(u+w+.3,b,20,116,18,'#8fa99d');
      s+=isoLine(P(u+w+.5,b+10,86),P(u+w+.5,b+10,104),'#d9d6bb',1.6);
    }
    s+=front(u+16,v+d+.8,w-32,49,29,'#9e7354');
    s+=frontLabel(u+45,v+d+1,56,'木柵市場',21,'#fff3cf');
    s+=front(u+17,v+d+.9,w-34,115,24,'#4e796e');
    s+=frontLabel(u+25,v+d+1.1,121,'圖書館・木柵分館',14,'#fff1ce');
    // Flat roof and short perimeter wall; a small plant room stays low.
    s+=isoBox(u-3,v-3,w+6,d+6,5,'#ddd2b6','#c3b494','#ad9f82',h);
    s+=isoBox(u+4,v+4,w-8,4,8,'#e7dcc1','#d3c3a2','#bcb08e',h+5);
    s+=isoBox(u+w-8,v+4,4,d-8,8,'#e7dcc1','#d3c3a2','#bcb08e',h+5);
    s+=isoBox(u+107,v+18,41,32,15,'#b7c1ad','#a1b09c','#8f9d89',h+5);
    s+=isoBox(u+18,v+14,31,24,4,'#b2baa3','#9ba78f','#82967e',h+5);
    // Green-and-cream awnings and three produce crates at street level.
    const awningV=v+d+26;
    s+=poly([P(u+3,v+d-1,44),P(u+w-3,v+d-1,44),P(u+w-3,awningV,32),P(u+3,awningV,32)],'#7f9f7d');
    for(let i=0;i<6;i++){
      const a=u+3+i*(w-6)/6,b=a+(w-6)/12;
      s+=poly([P(a,v+d-1,44),P(b,v+d-1,44),P(b,awningV,32),P(a,awningV,32)],'#f0e8cb');
    }
    s+=front(u+3,awningV,w-6,25,7,'#5b806a');
    for(const a of [u+8,u+w-11])s+=isoBox(a,awningV-2,3,3,26,'#c2b28a','#a3916c','#8b7e5d');
    s+=isoBox(u+17,v+d+8,w-34,16,16,'#dfc595','#bd986c','#a7845e');
    for(let i=0;i<3;i++){
      const a=u+28+i*42;
      s+=isoBox(a,v+d+9,33,12,5,'#c4a16f','#a38358','#8a714e',16);
      for(let j=0;j<4;j++)s+=isoBox(a+3+j*7,v+d+11,5,6,4,i===1?'#e4b35f':i===2?'#bf8460':'#b4c68a',i===1?'#c7954f':i===2?'#aa6e4e':'#8ca66b',i===1?'#b0854b':i===2?'#915c43':'#718e57',21);
    }
    return s+'</g>';
  }

  function templeGround() {
    // A new left-hand quarter widens the town instead of consuming the central
    // crossroads. Its front apron joins the market's already open arrival path.
    const boundary=[[-195,220],[42,220],[42,510],[-50,510],[-195,440]];
    const top=boundary.map(p=>P(...p));
    let s='<g data-place="temple-ground">';
    for(let i=2;i<boundary.length;i++) {
      const a=boundary[i],b=boundary[(i+1)%boundary.length];
      s+=poly([P(...a),P(...b),P(...b,-19),P(...a,-19)],i===3?'#b5c29e':'#aab995');
    }
    s+=poly(top,'#d5dbbb');
    s+=isoTile(-181,245,140,103,'#c3c7a9',2);
    s+=isoTile(-142,342,176,113,'#e9e1ca',2);
    s+=isoTile(-25,445,300,40,'#eae3cb',2);
    s+=isoTile(-130,356,147,84,'#e2d6b9',2.2);
    // Generous, flush paving. The quiet grid describes a public forecourt;
    // neither a ceremonial stage nor a campaign gathering occupies this space.
    for(const u of [-106,-70,-34,2])s+=isoLine(P(u,357,2.3),P(u,438,2.3),'#cbbf9f',.9,'opacity=".65"');
    for(const v of [378,400,422])s+=isoLine(P(-128,v,2.3),P(17,v,2.3),'#cbbf9f',.9,'opacity=".65"');
    return s+'</g>';
  }

  function temple() {
    // An original, fictional temple: tiled swallowtail eaves, red columns,
    // timber screens and a roomy, accessible public forecourt. No real temple,
    // congregation, deity or religious voting preference is being depicted.
    const u=-175,v=250,w=115,d=85,h=62;
    let s='<g data-place="temple" data-landmark="廟前廣場">';
    s+=isoBox(u-6,v-5,w+12,d+13,5,'#c5c3ab','#aba991','#969b83',2);
    s+=isoBox(u,v,w,d,h,'#d9b989','#e6cba3','#bb9773',7);
    // Open central passage and timber lattice panels on either side.
    s+=front(u+40,v+d+.4,35,7,45,'#5c5c4b');
    s+=front(u+46,v+d+.6,23,7,40,'#84775b');
    s+=front(u+48,v+d+.8,19,7,33,'#bba887');
    for(const a of [u+9,u+85]){
      s+=front(a,v+d+.5,21,17,28,'#926a4f');
      s+=front(a+2,v+d+.8,17,19,24,'#b39970');
      for(let j=1;j<4;j++)s+=isoLine(P(a+2+j*4.2,v+d+1,19),P(a+2+j*4.2,v+d+1,43),'#785a45',1.2);
      for(const z of [26,34])s+=isoLine(P(a+2,v+d+1,z),P(a+19,v+d+1,z),'#785a45',1.2);
    }
    for(const b of [v+14,v+44]){
      s+=side(u+w+.3,b,24,20,25,'#785e4a');
      s+=side(u+w+.5,b+3,18,23,19,'#c1a77d');
      for(let j=1;j<3;j++)s+=isoLine(P(u+w+.7,b+3+j*6,23),P(u+w+.7,b+3+j*6,42),'#866348',1.1);
    }
    // Square red columns sit in the same shallow projection as the people.
    for(const a of [u+3,u+34,u+78,u+w-7]){
      s+=isoBox(a,v+d+3,7,7,5,'#c0b895','#a39c80','#898f75',2);
      s+=isoBox(a+1,v+d+4,5,5,53,'#aa6b4b','#a25640','#7f483b',7);
      s+=isoBox(a-1,v+d+2,9,9,4,'#c8a273','#b28758','#906b47',58);
    }
    s+=front(u-2,v+d+5,w+4,55,8,'#9b5d43');
    s+=front(u+24,v+d+5.2,68,39,15,'#5b715d');
    s+=frontLabel(u+28,v+d+5.5,43,'廟前廣場',12.7,'#fff0c5');
    // Broad faceted roof with gently upturned ends and two visible tile bands.
    const backL=P(u-11,v-9,h+5),backR=P(u+w+11,v-9,h+5),
      ridgeL=P(u-9,v+d*.46,h+29),ridgeR=P(u+w+9,v+d*.46,h+29),
      frontL=P(u-14,v+d+15,h+12),frontR=P(u+w+14,v+d+15,h+12),
      lowL=P(u+8,v+d+11,h+2),lowR=P(u+w-8,v+d+11,h+2);
    s+=poly([backL,backR,ridgeR,ridgeL],'#b5825c');
    s+=poly([ridgeL,ridgeR,frontR,lowR,lowL,frontL],'#b66e4d');
    s+=poly([backR,ridgeR,frontR,P(u+w+8,v+d*.55,h+5)],'#8e5540');
    for(let i=0;i<12;i++) {
      const a=u-3+i*10;
      s+=isoLine(P(a,v+d*.46,h+28),P(a,v+d+10,h+3),'#d39363',1.15,'opacity=".8"');
    }
    for(const t of [.36,.68]) {
      const z=(h+28)*(1-t)+(h+3)*t,b=v+d*.46+(d+10-d*.46)*t;
      s+=isoLine(P(u+2,b,z),P(u+w-2,b,z),'#9e583e',1.3);
    }
    s+=path('M'+frontL.join(' ')+'Q'+P(u-2,v+d+14,h-2).join(' ')+' '+lowL.join(' ')+'L'+lowR.join(' ')+'Q'+P(u+w+2,v+d+14,h-2).join(' ')+' '+frontR.join(' '),'#805140',4,'stroke-linejoin="round"');
    s+=isoLine(ridgeL,ridgeR,'#d4ae75',4);
    // Small abstract ridge flourishes: recognisably local roof craft, no emblem.
    for(const [a,dir] of [[u-9,-1],[u+w+9,1]]){
      const [x,y]=P(a,v+d*.46,h+29);
      s+=path(`M${x} ${y} q${dir*10} -1 ${dir*14} -12 q${-dir*1} 8 ${dir*5} 10`,'#b98c57',3,'stroke-linecap="round"');
    }
    // A flush side ramp meets the raised threshold; thin rails make the
    // accessibility detail visible without occupying the arrival square.
    s+=poly([P(-72,334,7),P(-52,334,7),P(-52,381,2),P(-72,381,2)],'#c9c4a7');
    for(const a of [-71,-53]){
      s+=isoLine(P(a,337,18),P(a,378,12),'#73816e',1.8);
      for(const b of [337,357,378])s+=isoLine(P(a,b,2),P(a,b,b===337?18:b===357?15:12),'#73816e',1.4);
    }
    // Rest seating and a small information board remain outside the route.
    s+=isoBox(-129,370,30,9,4,'#cbb58b','#ae9269','#8b795b',10);
    for(const a of [-126,-105])s+=isoBox(a,372,4,5,10,'#a58f68','#a58f68','#7c775a',2);
    s+=isoBox(-122,365,27,3,11,'#cbb58b','#ae9269','#8b795b',14);
    s+=isoBox(9,379,4,4,32,'#8c9475','#7e886b','#68735e',2);
    s+=front(-7,385,34,23,20,'#71846c')+front(-4,385.3,28,26,14,'#f2e6c6');
    s+=frontLabel(-2,385.5,31,'公共空間',6.8,'#526c59');
    return s+'</g>';
  }

  function teaHills() {
    let s='<g data-landmark="貓空茶山">';
    s+=poly([[0,116],[80,68],[143,82],[229,28],[311,62],[394,40],[485,101],[586,70],[676,102],[757,53],[861,78],[965,32],[1083,63],[1150,49],[1200,85],[1200,267],[0,267]],'#dbe3cd');
    s+=poly([[0,167],[94,122],[165,136],[267,84],[349,109],[451,149],[557,120],[668,161],[785,119],[876,140],[985,94],[1100,124],[1200,100],[1200,281],[0,281]],'#c9d7b7');
    s+=poly([[0,225],[81,174],[177,184],[285,138],[398,170],[494,205],[606,170],[744,204],[855,165],[970,187],[1079,149],[1200,176],[1200,294],[0,294]],'#b6cba7');
    // Curved, parallel planted rows give the distant hills their tea terraces.
    for(let i=0;i<5;i++) {
      s+=path(`M-15 ${166+i*13} Q70 ${111+i*13} 150 ${139+i*12} T310 ${121+i*11}`,i%2?'#91ad89':'#a2bd94',6,'stroke-linecap="round" opacity=".7"');
      s+=path(`M1000 ${160+i*12} Q1090 ${112+i*12} 1220 ${150+i*11}`,i%2?'#95b08c':'#a6bf97',5,'stroke-linecap="round" opacity=".7"');
    }
    s+=label(1104,129,'貓空茶山',17,'#4f715b','text-anchor="middle" paint-order="stroke" stroke="#e7edda" stroke-width="5" stroke-linejoin="round"');
    return s+'</g>';
  }

  function riverside() {
    let s='<g data-landmark="景美溪／道南河濱">';
    const water='M-70 395 C125 464 310 628 592 625 S1020 480 1270 393';
    s+=path(water,'#c2d2ad',105,'stroke-linecap="round"');
    s+=path(water,'#8ab5b2',65,'stroke-linecap="round"');
    s+=path(water,'#a9ceca',48,'stroke-linecap="round"');
    for(const ripple of ['M40 445Q58 456 78 462','M202 535Q220 546 242 553','M407 610Q430 617 454 619','M660 621Q685 618 706 611','M854 558Q875 551 896 540','M1040 472Q1060 462 1077 453'])s+=path(ripple,'#dce9d9',2,'stroke-linecap="round" opacity=".65"');
    const cycle='M-50 348 C154 430 329 578 591 577 S1030 432 1250 347';
    s+=path(cycle,'#e8e1c6',25,'stroke-linecap="round"');
    s+=path(cycle,'#7e9e75',17,'stroke-linecap="round"');
    s+=path(cycle,'#e4e7c7',1.4,'stroke-dasharray="13 13"');
    // One small human cyclist and two bankside trees, well outside the play area.
    s+='<g transform="translate(1090 410) rotate(-24)">';
    s+='<g fill="none" stroke="#5c7565" stroke-width="2"><circle cx="-12" cy="0" r="8"/><circle cx="13" cy="0" r="8"/><path d="M-12 0L-3-12L5 0H-12L-1-7L13 0M-3-12H-7M8-13L13 0M7-13H12"/></g>';
    s+=poly([[-3,-18],[4,-18],[8,-11],[1,-10]],'#b57f61')+rect(-5,-26,7,7,'#c59673')+rect(-5,-28,8,3,'#586657');
    s+=path('M0-12L-4-4L5 0M5-14L9-13','#536864',3);
    s+='</g>';
    return s+'</g>';
  }

  function civicBlock() {
    // A separate, smaller civic block sits behind the playable neighbourhood.
    const u=160,v=-130,w=125,d=62,h=99;
    let s='<g data-landmark="文山行政中心" transform="translate(90 27) scale(.9)">';
    s+=isoTile(145,-145,169,112,'#d9dbc2',1);
    s+=isoTile(149,-62,170,31,'#c7c9b6',2);
    s+=isoBox(u,v,w,d,h,'#d8d3be','#d8cab2','#baae98');
    for(const z of [30,55,80])for(let i=0;i<5;i++){
      s+=front(u+8+i*23,v+d+.4,14,z,15,'#789187');
      s+=front(u+9+i*23,v+d+.6,12,z+9,4,'#b4c3ad');
    }
    for(const z of [30,55,80])for(const b of [v+10,v+34])s+=side(u+w+.5,b,14,z,15,'#7c9488');
    s+=front(u+46,v+d+.5,31,0,27,'#769285');
    s+=isoBox(u-2,v-2,w+4,d+4,5,'#e2dbc3','#c8bca2','#afa58c',h);
    s+=front(u+6,v+d+.8,w-12,101,21,'#607f72');
    s+=frontLabel(u+17,v+d+1,106,'文山行政中心',14,'#fff2d3');
    s+=isoBox(u+90,v+10,23,20,10,'#c5cbb5','#afb9a2','#95a78f',h+5);
    // Compact bus shelter with a route pole, and a small public-bike rack.
    const busU=316,busV=-85;
    s+=isoTile(busU-5,busV-4,53,36,'#d6d5bc',2);
    s+=side(busU+36,busV,26,7,29,'#8ba49a');
    s+=front(busU,busV+25,36,7,29,'#b2c3ad');
    s+=isoBox(busU-2,busV-2,42,30,4,'#73927c','#557762','#4b6959',39);
    for(const [a,b] of [[busU,busV+26],[busU+36,busV+26]])s+=isoLine(P(a,b,2),P(a,b,39),'#5e7864',2);
    s+=isoBox(busU+6,busV+17,27,7,4,'#b9a880','#a08d69','#8e7d5f',10);
    const [bx,by]=P(busU+46,busV+17,39);
    s+=path(`M${bx} ${by+37}V${by-5}`,'#627b68',2)+rect(bx-9,by-13,18,22,'#f2ead0','rx="3"')+label(bx,by+2,'公車',6.5,'#557565','text-anchor="middle"');
    const [xx,yy]=P(210,-43,3);
    s+='<g data-landmark="YouBike" transform="translate('+xx+' '+yy+')">';
    s+=rect(-8,-28,58,17,'#f4e7b1','rx="3"')+label(21,-16,'YouBike',9,'#6a7955','text-anchor="middle"');
    for(let i=0;i<3;i++) {
      const x=i*20;
      s+='<g transform="translate('+x+' '+i*8.6+')" fill="none" stroke="#6c8070" stroke-width="1.5"><ellipse cx="0" cy="0" rx="5" ry="6"/><ellipse cx="15" cy="6" rx="5" ry="6"/><path d="M0 0L5-7L9 4L0 0L10-1L15 6M5-7H2M11-7L15 6H9" stroke="#b39745"/><path d="M10-7H14"/></g>';
    }
    s+='</g>';
    return s+'</g>';
  }
  function studio() {
    const u=360,v=65,w=150,d=115,h=74;
    let s='<g data-place="studio">';
    s+=isoTile(u-10,v-8,w+29,d+67,'#dcdcc5',2);
    s+=isoTile(u+7,v+8,w+9,d+14,'#73836b',2,'opacity=".12"');
    s+=isoBox(u,v,w,d,h,'#c3d0c3','#e2e5d1','#b4c5ba');
    // A glass studio front with a visible screen and a modest interview desk.
    s+=front(u+17,v+d+.2,w-34,12,46,'#5c7d76');
    s+=front(u+22,v+d+.4,w-44,17,36,'#90aaa0');
    s+=poly([P(u+22,v+d+.5,53),P(u+84,v+d+.5,53),P(u+57,v+d+.5,17),P(u+22,v+d+.5,17)],'#b5c6b8','opacity=".7"');
    for(const a of [u+56,u+101])s+=isoLine(P(a,v+d+.8,17),P(a,v+d+.8,53),'#d4dfc9',2.5);
    s+=side(u+w+.3,v+22,27,0,39,'#73968a')+side(u+w+.5,v+27,17,5,29,'#a2bdb0');
    s+=isoBox(u-4,v-4,w+8,d+8,7,'#bacbbb','#8fa99a','#769789',h);
    s+=isoBox(u+24,v+19,62,39,4,'#c4d5c6','#9bb5a4','#7f9c8f',h+7);
    // The tiny aerial and TV plaque make the third building legible.
    s+=isoLine(P(u+118,v+31,h+7),P(u+118,v+31,h+44),'#6c887c',3);
    s+=isoLine(P(u+105,v+26,h+35),P(u+131,v+36,h+35),'#6c887c',2.5);
    s+=front(u+21,v+d+1,92,60,19,'#5f8071')+frontLabel(u+28,v+d+1.3,65,'中立新聞台',12,'#fff0cd');
    s+=front(u+120,v+d+1,24,31,19,'#55796c');
    s+=front(u+124,v+d+1.3,16,35,11,'#d4e1c9');
    s+=isoLine(P(u+126,v+d+1.5,48),P(u+130,v+d+1.5,44),'#55796c',1.5);
    s+=isoLine(P(u+136,v+d+1.5,48),P(u+132,v+d+1.5,44),'#55796c',1.5);
    // Outdoor interview furniture is small, leaving the arrival tile clear.
    s+=isoBox(456,204,35,20,7,'#d3c69f','#ac9d78','#8c8767',12);
    s+=isoBox(459,208,4,5,12,'#9d9772','#9d9772','#7b8065');
    s+=isoBox(482,217,4,5,12,'#9d9772','#9d9772','#7b8065');
    return s+'</g>';
  }
  function fundraiser() {
    let s='<g data-place="fundraiser">';
    s+=isoTile(340,335,149,143,'#d8d3b7',3);
    s+=isoTile(351,346,127,121,'#e7dfc5',4);
    // Only a low platform, simple lectern and two cloth flags.
    s+=isoBox(423,356,50,72,8,'#c8b991','#ad9b77','#958966',4);
    s+=isoBox(435,379,20,19,27,'#b79e72','#a68c64','#8c7857',12);
    s+=isoTile(431,376,28,25,'#dbc99e',41);
    s+=front(438,398.5,13,20,13,'#e9dbb8');
    for(const [u,v] of [[425,350],[473,350]]){
      s+=isoLine(P(u,v,4),P(u,v,74),'#9a906b',2.6);
      s+=poly([P(u,v,74),P(u+22,v,74),P(u+22,v,48),P(u,v,48)],'#a4b391');
      s+=isoTile(u-4,v-4,8,8,'#aea886',5);
    }
    // Two quiet listeners; the animated candidate stands in front of them.
    s+=isoPerson(330,445,'resident',.44)+isoPerson(455,435,'helper',.44);
    return s+'</g>';
  }

  const world = {
    start:[275,290], prepare:[135,205], canvass:[155,465],
    tv:[430,235], fundraise:[375,425], recruit:[240,120], temple:[-5,465]
  };
  const anchors = Object.freeze(Object.fromEntries(Object.entries(world).map(([key,p])=>{
    const [x,y]=P(...p,2);return [key,Object.freeze({x,y})];
  })));
  const routeWorld = {
    prepare:[[275,290],[275,205],[135,205]],
    canvass:[[275,290],[275,465],[155,465]],
    tv:[[275,290],[430,290],[430,235]],
    fundraise:[[275,290],[275,425],[375,425]],
    recruit:[[275,290],[275,120],[240,120]],
    temple:[[275,290],[275,465],[-5,465]]
  };
  const paths = Object.freeze(Object.fromEntries(Object.entries(routeWorld).map(([id,waypoints])=>[id,Object.freeze(waypoints.map(p=>{
    const [x,y]=P(...p,2);return Object.freeze({x,y});
  }))])));
  function route(id) { return (paths[id] || [anchors.start]).map(p=>({x:p.x,y:p.y})); }

  function scene() {
    if (isToy()) return '<img data-art-image="world" class="toy-world" src="'+TOY_ROOT+'district.png" alt="文山木柵意象街區：市場、社區、茶山、纜車及河岸；非實際道路地圖">'+toyResidents();
    let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" role="img" aria-label="木柵意象縮景：木柵市場上方的圖書館、文山行政中心與公車站、YouBike、景美溪道南河濱、貓空茶山與原創廟前廣場。行動場地以步道相連，居民皆為原創方塊人。非實際地圖。" class="day-art-svg">';
    s+='<title>木柵意象縮景｜非實際地圖</title><desc>原創 2.5D 木柵街區，以可辨識的地景元素組成非實際比例的意象縮景。左方木柵市場上層為木柵圖書館，遠方有文山行政中心、公車站與 YouBike；景美溪彎過道南河濱綠色自行車道，後方為層層貓空茶山。社區工作室、市場、訪談小棚、座談廣場等行動目的地均由步道相連；新增廟前廣場是虛構的公共空間與無障礙動線交流場地，不指涉特定廟宇，也不代表宗教群體的政治立場，所有角色皆為人類。地標只是場景背景，不代表任何機關支持或背書。</desc>';
    s+=rect(0,0,1200,650,'#f5f0df');
    s+=teaHills()+riverside()+civicBlock();
    s+=templeGround();
    s+=poly([[72,342],[594,615],[1141,352],[606,113]],'#839373','opacity=".09"');
    // The visible front fascia and shaded sides are essential to the town's depth.
    s+=isoBox(0,0,560,560,19,'#cbd4af','#b5c29e','#a0b494',-19);
    const a=P(0,0),b=P(560,0),c=P(560,560),d=P(0,560),o=P(280,280);
    s+=poly([a,b,o],'#d0d8b4')+poly([b,c,o],'#c0cea7')+poly([c,d,o],'#cbd4ae')+poly([d,a,o],'#d9debe');
    // Continuous pedestrian network: a broad crossing and four short approaches.
    s+=isoTile(250,25,50,492,'#eae3cb',2);
    s+=isoTile(24,266,510,48,'#eae3cb',2);
    s+=isoTile(108,184,168,40,'#eae3cb',2);
    s+=isoTile(230,100,47,40,'#eae3cb',2);
    s+=isoTile(-25,445,302,40,'#eae3cb',2);
    s+=isoTile(410,214,40,76,'#eae3cb',2);
    s+=isoTile(275,405,114,40,'#eae3cb',2);
    for(const v of [236,327,374,425,479])s+=isoLine(P(252,v,2.2),P(298,v,2.2),'#d5ccb2',1.2,'opacity=".55"');
    for(const u of [338,385,480])s+=isoLine(P(u,268,2.2),P(u,312,2.2),'#d5ccb2',1.2,'opacity=".55"');
    // Back-to-front draw order respects the architecture's actual footprint.
    s+=isoTree(36,235,.95);
    s+=office();
    s+=isoTree(502,30,.85);
    s+=temple();
    s+=market();
    s+=studio();
    // Adults occupy the edge of an approach; none blocks the walking route.
    s+=isoPerson(180,182,'helper',.46);
    s+=isoPerson(218,155,'helper',.43);
    s+=isoPerson(80,440,'shop',.47);
    s+=isoPerson(471,238,'resident',.46);
    s+=fundraiser();
    s+=isoTree(495,515,.72);
    // One short bench provides scale without crowding the walking routes.
    for(const [u,v] of [[500,311]]){
      s+=isoBox(u,v,32,10,4,'#d3b88b','#b49970','#958261',11);
      s+=isoBox(u+3,v+2,4,5,11,'#ad9670','#ad9670','#8c805f');
      s+=isoBox(u+26,v+2,4,5,11,'#ad9670','#ad9670','#8c805f');
    }
    // Place identifiers sit away from people and action arrival points.
    s+=label(917,566,'景美溪',21,'#416f70','text-anchor="middle" paint-order="stroke" stroke="#e9efda" stroke-width="5" stroke-linejoin="round"');
    s+=label(920,588,'道南河濱・自行車道',12,'#53765b','text-anchor="middle" paint-order="stroke" stroke="#f3efdc" stroke-width="4" stroke-linejoin="round"');
    return s+'</svg>';
  }

  // v13 venue scenes: one backdrop per place, a crowd of the three fictional groups and, after an answer, a face over each person.
  const GROUP_ROLES = [['elder', 'elder2'], ['middle', 'middle2'], ['young', 'young2']];
  const TONES = { up: '#5f9e69', slight: '#93b97f', flat: '#b7b4a2', down: '#cf6f58', split: '#d9b24c', unknown: '#c9c6b5' };
  function face(cx, cy, tone, r = 15) {
    const color = TONES[tone] || TONES.flat, eye = r * .32, mouth = tone === 'up' ? `M${cx - r * .45} ${cy + r * .2}Q${cx} ${cy + r * .7} ${cx + r * .45} ${cy + r * .2}` : tone === 'slight' ? `M${cx - r * .4} ${cy + r * .3}Q${cx} ${cy + r * .55} ${cx + r * .4} ${cy + r * .3}` : tone === 'down' ? `M${cx - r * .42} ${cy + r * .55}Q${cx} ${cy + r * .1} ${cx + r * .42} ${cy + r * .55}` : `M${cx - r * .38} ${cy + r * .38}H${cx + r * .38}`;
    if (tone === 'split' || tone === 'unknown') return `<g class="face" data-tone="${tone}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#fffaf0" stroke-width="2.5"/>` + label(cx, cy + r * .42, tone === 'split' ? '≈' : '?', r * 1.15, '#fffaf0', 'text-anchor="middle"') + '</g>';
    return `<g class="face" data-tone="${tone}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#fffaf0" stroke-width="2.5"/><rect x="${cx - r * .42 - eye / 2}" y="${cy - r * .32}" width="${eye}" height="${eye}" fill="#fffaf0"/><rect x="${cx + r * .42 - eye / 2}" y="${cy - r * .32}" width="${eye}" height="${eye}" fill="#fffaf0"/><path d="${mouth}" fill="none" stroke="#fffaf0" stroke-width="${Math.max(2, r * .16)}" stroke-linecap="round"/></g>`;
  }
  function faceIcon(tone) { return '<svg viewBox="0 0 34 34" aria-hidden="true" focusable="false" class="face-icon">' + face(17, 17, tone, 14) + '</svg>'; }
  function figure(x, feetY, role, scale, pose) { return person(x, feetY, role, scale, pose); }
  const floor = (top, base, line) => { let s = rect(0, top, 1200, 650 - top, base); for (let y = top + 34; y < 650; y += 46) s += path(`M0 ${y}H1200`, line, 1.2, 'opacity=".55"'); for (let x = -40; x < 1240; x += 120) s += path(`M${x} ${top}L${x - 90} 650`, line, 1.1, 'opacity=".4"'); return s; };
  function studioBackdrop(kind) {
    const live = kind === 'online';
    let s = rect(0, 0, 1200, 650, '#e8e6dc') + rect(0, 0, 1200, 368, live ? '#cbd9cf' : '#c7d6dc');
    s += '<ellipse cx="600" cy="580" rx="510" ry="56" fill="#667f7b" opacity=".13"/>';
    for (const x of [55, 1100]) s += rect(x, 30, 28, 350, '#a9bfb9', 'rx="14"');
    s += rect(220, 45, 760, 270, '#345761', 'rx="32"') + rect(236, 61, 728, 238, live ? '#315f56' : '#325b71', 'rx="23"');
    s += label(600, 147, live ? '小沈的選戰直播' : '中立新聞台', 46, '#fffdf7', 'text-anchor="middle"') + label(600, 212, live ? '網友留言・即時回應' : '議題直擊', 28, '#dce8e2', 'text-anchor="middle"');
    s += rect(796, 82, 134, 40, '#b6533b', 'rx="20"') + label(863, 109, '● LIVE', 21, '#fffdf7', 'text-anchor="middle"');
    for (const x of [90, 1080]) s += path('M'+x+' 625V415', '#526c71', 10) + rect(x-38, 365, 76, 72, '#345761', 'rx="16"') + '<circle cx="'+x+'" cy="400" r="22" fill="#dfe7df"/>' + path('M'+x+' 555l-48 70M'+x+' 555l48 70', '#526c71', 8);
    if (live) s += rect(735, 366, 415, 249, '#fffdf7', 'rx="24"') + label(940, 404, '正在收看', 22, '#345761', 'text-anchor="middle"');
    return s;
  }
  function backdrop(kind) {
    if (isToy() && ['tv','online','fundraise'].includes(kind)) return sceneAtlas(kind);
    if (isToy() && TOY_VISITS[kind]) return '<image data-art-image="venue" href="'+TOY_ROOT+TOY_VISITS[kind]+'" width="1200" height="650" preserveAspectRatio="xMidYMid slice"/>';
    let s = rect(0, 0, 1200, 650, '#f4eedc');
    if (kind === 'market') {
      s += rect(0, 36, 1200, 320, '#e2cfb0') + rect(0, 36, 1200, 18, '#c9b490') + rect(452, 54, 296, 56, '#9e7354') + label(600, 96, '木柵市場', 36, '#fff3cf', 'text-anchor="middle"');
      for (let i = 0; i < 4; i++) { const x = 32 + i * 292; s += rect(x, 150, 260, 200, '#d5c8ae'); for (let j = 0; j < 8; j++) s += rect(x + j * 32.5, 128, 32.5, 44, j % 2 ? '#f0e8cb' : '#7f9f7d'); s += rect(x, 172, 260, 9, '#5b806a') + rect(x + 12, 262, 236, 88, '#bd986c') + rect(x + 12, 262, 236, 10, '#d8b680'); for (let k = 0; k < 4; k++) s += rect(x + 26 + k * 56, 236, 42, 28, ['#b4c68a', '#e4b35f', '#bf8460', '#d7c27a'][(i + k) % 4]); }
      s += floor(350, '#e7dfc7', '#d1c6a8');
    } else if (kind === 'street') {
      s += rect(0, 0, 1200, 240, '#e8eedf');
      for (let i = 0; i < 5; i++) { const x = -20 + i * 250; s += rect(x, 70 + (i % 2) * 22, 230, 290 - (i % 2) * 22, ['#ede1c3', '#dfe5d2', '#eadbc0'][i % 3]) + rect(x + 18, 120 + (i % 2) * 22, 70, 60, '#79988d') + rect(x + 120, 120 + (i % 2) * 22, 70, 60, '#79988d') + rect(x + 10, 250, 210, 110, '#a5ad94') + rect(x + 22, 262, 186, 98, '#708c7b') + rect(x + 10, 228, 210, 22, ['#c97b5a', '#5f8071', '#b98b60'][i % 3]); }
      s += floor(360, '#cfcdbd', '#b8b5a3');
      for (let i = 0; i < 9; i++) s += poly([[90 + i * 120, 600], [150 + i * 120, 600], [200 + i * 120, 420], [150 + i * 120, 420]], '#f4f1e4', 'opacity=".8"');
      s += rect(1080, 130, 12, 300, '#56685f') + rect(1060, 130, 52, 112, '#3f4f48') + '<circle cx="1086" cy="158" r="14" fill="#d86a54"/><circle cx="1086" cy="190" r="14" fill="#e3b54f" opacity=".45"/><circle cx="1086" cy="222" r="14" fill="#69a36d" opacity=".45"/>';
    } else if (kind === 'plaza') {
      s += rect(0, 0, 1200, 330, '#e6ecd8') + rect(0, 250, 1200, 110, '#c9d7b7');
      for (const [x, k] of [[120, 1.4], [420, 1.1], [820, 1.25], [1090, 1.35]]) s += `<g transform="translate(${x} 300) scale(${k})">` + block(-6, -60, 12, 60, 5, '#a18e67', '#c4ad7f', '#837955') + poly([[-60, -70], [-34, -120], [10, -138], [58, -104], [50, -58], [6, -40], [-42, -50]], '#8fa67b') + poly([[-34, -120], [10, -138], [58, -104], [6, -88]], '#bfcca0') + '</g>';
      s += rect(520, 150, 200, 130, '#71846c') + rect(532, 162, 176, 106, '#f2e6c6') + label(620, 205, '社區公告', 26, '#526c59', 'text-anchor="middle"') + path('M552 230H688M552 250H660', '#9aa98c', 4);
      s += floor(350, '#e7e1ca', '#cfc6aa') + block(140, 400, 180, 22, 14, '#cbb58b', '#ddc89e', '#ae9269') + rect(150, 422, 10, 30, '#a58f68') + rect(300, 422, 10, 30, '#a58f68');
    } else if (kind === 'river') {
      s += rect(0, 0, 1200, 210, '#e9efdf') + poly([[0, 170], [160, 110], [330, 150], [520, 90], [740, 140], [930, 96], [1200, 150], [1200, 260], [0, 260]], '#c3d4b2') + poly([[0, 230], [220, 190], [470, 220], [760, 180], [1010, 214], [1200, 196], [1200, 300], [0, 300]], '#b0c8a2');
      s += rect(0, 280, 1200, 80, '#8ab5b2') + path('M80 310Q140 300 200 312M520 330Q600 318 680 332M930 308Q990 298 1050 310', '#dce9d9', 3, 'opacity=".75"') + rect(0, 352, 1200, 30, '#7e9e75');
      for (let x = 20; x < 1200; x += 90) s += rect(x, 330, 8, 50, '#8b9b82'); s += rect(0, 330, 1200, 7, '#a2b39a');
      s += floor(380, '#e8e1c6', '#cfc8aa') + label(1010, 250, '道南河濱', 26, '#4f715b', 'text-anchor="middle" paint-order="stroke" stroke="#eef3e2" stroke-width="5"');
    } else if (kind === 'temple') {
      s += rect(0, 0, 1200, 360, '#efe5cf') + rect(250, 150, 700, 210, '#d9b989') + rect(250, 150, 700, 14, '#c79e6e');
      s += poly([[190, 160], [600, 40], [1010, 160], [960, 176], [600, 72], [240, 176]], '#b66e4d') + poly([[230, 172], [600, 62], [970, 172], [930, 188], [600, 92], [270, 188]], '#9b5d43') + path('M180 158Q170 140 196 132M1020 158Q1030 140 1004 132', '#b98c57', 5, 'stroke-linecap="round"');
      for (const x of [290, 430, 760, 900]) s += rect(x, 176, 20, 186, '#aa6b4b') + rect(x - 6, 176, 32, 12, '#c8a273');
      s += rect(520, 200, 160, 162, '#5c5c4b') + rect(536, 216, 128, 146, '#84775b') + rect(450, 120, 300, 40, '#5b715d') + label(600, 150, '廟前廣場', 26, '#fff0c5', 'text-anchor="middle"');
      for (const x of [380, 820]) s += `<circle cx="${x}" cy="210" r="18" fill="#d8875a"/><rect x="${x - 4}" y="228" width="8" height="10" fill="#9b5d43"/>`;
      s += floor(362, '#e9e1ca', '#cbbf9f');
    } else if (kind === 'tv') {
      s += rect(0, 0, 1200, 650, '#38554e') + rect(0, 0, 1200, 380, '#466c60');
      // The studio wall: the fictional 中立新聞台 logo, the programme title and a LIVE tag.
      s += rect(300, 40, 600, 270, '#1d2b28', 'rx="8"') + rect(316, 56, 568, 238, '#2f6f86', 'rx="4"') + rect(316, 56, 568, 64, '#24566a');
      s += rect(336, 70, 40, 40, '#f2c14e', 'rx="20"') + rect(346, 80, 20, 20, '#2f6f86', 'rx="10"') + label(390, 101, '中立新聞台', 28, '#fff7dd') + rect(790, 74, 76, 32, '#e0483a', 'rx="4"') + label(828, 97, 'LIVE', 20, '#ffffff', 'text-anchor="middle" letter-spacing="2"');
      s += label(600, 190, '議題直擊', 52, '#fff4d2', 'text-anchor="middle"') + label(600, 240, '選區候選人上節目', 20, '#d8ecf2', 'text-anchor="middle" letter-spacing="3"');
      for (const x of [70, 1130]) s += path(`M${x} 650L${x} 470`, '#25332f', 5) + rect(x - 34, 420, 68, 50, '#25332f') + rect(x + (x < 600 ? 30 : -48), 434, 18, 22, '#1d2926') + `<circle cx="${x}" cy="445" r="9" fill="#ef835b"/>`;
      s += poly([[0, 380], [1200, 380], [1200, 650], [0, 650]], '#3f5f57') + path('M0 380H1200', '#5f8578', 3);
    } else if (kind === 'debate') {
      s += rect(0, 0, 1200, 650, '#e8e2cf') + rect(80, 40, 1040, 200, '#5f8071') + rect(96, 56, 1008, 168, '#6f9282') + label(600, 128, '公辦政見發表會', 46, '#fff3d1', 'text-anchor="middle"') + label(600, 180, '臺北市第六選區・市議員', 22, '#e8f1df', 'text-anchor="middle" letter-spacing="2"');
      s += rect(0, 360, 1200, 60, '#b98b60') + rect(0, 360, 1200, 12, '#d5ad7c') + rect(0, 420, 1200, 230, '#ece6d3');
    } else s += floor(340, '#e7dfc7', '#d1c6a8');
    return s;
  }
  const STREET_SLOTS = [[600, 470, .86], [697, 466, .86], [794, 471, .86], [891, 466, .86], [988, 470, .86], [1085, 466, .86], [652, 560, 1], [772, 564, 1], [892, 560, 1], [1012, 564, 1]];
  const TV_SLOTS = [[884, 532, .4], [944, 532, .4], [1004, 532, .4], [1064, 532, .4], [1124, 532, .4], [884, 612, .4], [944, 612, .4], [1004, 612, .4], [1064, 612, .4], [1124, 612, .4]];
  const DEBATE_SLOTS = [[70, 700, .8], [188, 704, .8], [306, 700, .8], [424, 704, .8], [542, 700, .8], [660, 704, .8], [778, 700, .8], [896, 704, .8], [1014, 700, .8], [1132, 704, .8]];
  // crowd: [{group, variant, tone}] where tone is null before an answer; speaker: {group, variant, tone} or null.
  function toyInterior(kind, options) {
    let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" aria-hidden="true" class="venue-art" data-kind="'+kind+'">'+sceneAtlas(kind);
    if(kind!=='fundraise')s+=label(600,175,kind==='tv'?'中立新聞台':'小沈的選戰直播',42,'#fffdf7','text-anchor="middle"')+label(600,225,options.topic||'選區議題・即時回應',24,'#e8f0df','text-anchor="middle"');
    s+=figure(330,570,'player',1.8,'speak')+figure(600,570,kind==='tv'?'host':'helper',1.55);
    const crowd=(options.crowd||[]).slice(0,10);
    if(crowd.length){s+=rect(800,355,380,280,'#fffdf7','rx="20"')+label(990,390,kind==='tv'?'觀眾反應':'網友反應',20,'#345761','text-anchor="middle"');for(let i=0;i<crowd.length;i++){const c=crowd[i],x=840+(i%5)*72,y=490+Math.floor(i/5)*120;s+=figure(x,y,GROUP_ROLES[c.group]?.[c.variant?1:0]||'young',.56);if(c.tone)s+=face(x,y-89,c.tone,13);}}
    if(kind==='fundraise')s+=label(600,100,'街坊募款',35,'#345761','text-anchor="middle"');
    return s+'</svg>';
  }
  function interior(kind, options = {}) {
    if(isToy() && ['tv','online','fundraise'].includes(kind))return toyInterior(kind,options);
    const crowd = Array.isArray(options.crowd) ? options.crowd : [], roleOf = c => GROUP_ROLES[c.group]?.[c.variant ? 1 : 0] || 'resident';
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" aria-hidden="true" focusable="false" class="venue-art" data-kind="' + kind + '">' + backdrop(kind);
    const slots = ['tv','online'].includes(kind) ? TV_SLOTS : kind === 'debate' ? DEBATE_SLOTS : STREET_SLOTS;
    // Viewers at home: a living-room inset with ten people on two sofas.
    if (kind === 'tv') s += rect(830, 380, 350, 262, '#1d2b28', 'rx="12"') + rect(842, 392, 326, 238, '#f3e6c8', 'rx="8"') + rect(842, 392, 326, 34, '#2f6f86', 'rx="8"') + label(1005, 416, '家裡收看中・10 人', 17, '#fff7dd', 'text-anchor="middle"') + block(860, 520, 290, 20, 8, '#c76f4f', '#e08b68', '#a65a3e') + block(860, 600, 290, 20, 8, '#c76f4f', '#e08b68', '#a65a3e');
    const people = crowd.slice(0, slots.length).map((c, i) => ({ c, x: slots[i][0], y: slots[i][1], k: slots[i][2] }));
    if (options.board && !['tv', 'debate'].includes(kind)) s += boardMarkup(110, 420, 1.35, options.board.party);
    if (kind === 'debate') {
      s += figure(600, 352, 'middle', .74) + figure(300, 340, 'player', 1.05) + figure(900, 340, 'rival', 1.05);
      for (const x of [300, 900]) s += block(x - 70, 300, 140, 96, 10, '#8c6a4e', '#a98260', '#6f523c') + rect(x - 50, 322, 100, 26, '#f2e3bf') + label(x, 342, x < 600 ? '小沈' : '小馬', 18, '#5f4630', 'text-anchor="middle"');
    }
    for (const p of [...people].sort((a, b) => a.y - b.y)) s += figure(p.x, p.y, roleOf(p.c), p.k);
    if (kind === 'online') { s += figure(350,560,'player',1.7) + figure(600,560,'helper',1.05) + rect(200,528,440,44,'#446f61','rx="20"') + rect(525,420,56,90,'#263c48','rx="12"') + path('M553 510V548','#263c48',7); }
    else if (kind === 'tv') { s += figure(600, 560, 'middle', 1.3) + figure(340, 565, 'player', 1.34) + block(200, 512, 520, 56, 12, '#2f6f86', '#4a8ba3', '#24566a') + rect(220, 530, 480, 8, '#f2c14e') + label(460, 560, '中立新聞台', 18, '#fff7dd', 'text-anchor="middle"');
      // Lower third: the issue on air.
      s += rect(0, 590, 820, 52, '#e0483a') + rect(0, 590, 150, 52, '#1d2b28') + label(75, 624, '今日議題', 20, '#fff7dd', 'text-anchor="middle"') + label(170, 625, options.topic || '主持人會從三題挑一題', 24, '#ffffff'); }
    else if (options.mode === 'rally') {
      // A rally: a wooden stage with flags in the party colour, the candidate speaking from it.
      const flag = PARTY_COLORS[candidates.player.party] || '#c9a847';
      s += block(70, 520, 420, 70, 10, '#a57f57', '#c49a6a', '#87653f') + rect(70, 586, 420, 10, '#7a5a38');
      for (const x of [92, 468]) s += rect(x, 330, 7, 200, '#6d6a5c') + poly([[x + 7, 334], [x + 82, 350], [x + 7, 382]], flag) + path(`M${x + 9} 346H${x + 52}`, '#ffffff', 2, 'opacity=".6"');
      s += rect(160, 296, 240, 42, '#fffaf0', 'stroke="#55635b" stroke-width="3" rx="4"') + rect(160, 296, 240, 12, flag, 'rx="4"') + label(280, 330, '小沈 選前之夜', 22, '#24443c', 'text-anchor="middle"');
      s += block(250, 478, 60, 50, 6, '#8c6a4e', '#a98260', '#6f523c') + figure(240, 530, 'player', 1.25);
    }
    else if (kind !== 'debate') { if (options.speaker) s += figure(455, 602, roleOf(options.speaker), 1.18); s += figure(235, 614, 'player', 1.3); }
    for (const p of people) if (p.c.tone) s += face(p.x, p.y - 140 * p.k - 22, p.c.tone, kind === 'tv' ? 15 : 21);
    if (options.speaker?.tone && !['tv', 'debate'].includes(kind)) s += face(455, 602 - 140 * 1.18 - 26, options.speaker.tone, 26);
    return s + '</svg>';
  }

  // Election night at the campaign office: a big screen for the count, the candidate on a small stage and supporters around. stage is
  // 'count' while votes are read out, then 'elected', 'refunded' or 'forfeited'. Motion is CSS only, so a still frame shows the end state.
  const NIGHT_CROWD = [[70, 608, .92, 'elder'], [168, 642, 1, 'young'], [262, 602, .9, 'middle2'], [130, 560, .76, 'young2'], [222, 548, .72, 'elder2'], [938, 602, .9, 'middle'], [1032, 642, 1, 'elder2'], [1130, 608, .92, 'young'], [978, 548, .72, 'young2'], [1070, 560, .76, 'middle2']];
  const TALLY = [['小沈 一票！', 'you', 150, 452], ['5 號 一票！', 'other', 1050, 452], ['小沈 一票！', 'you', 205, 382], ['無效票', 'void', 1000, 382], ['9 號 一票！', 'other', 1090, 492], ['小沈 一票！', 'you', 110, 492]];
  // A speech bubble centred on x whose tail points down at tail (default: the centre).
  const bubbleAt = (x, y, text, color, cls = '', style = '', tail = x) => { const w = 26 + Array.from(text).length * 21; return '<g class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '>' + poly([[tail - 9, y + 12], [tail + 7, y + 12], [tail - 6, y + 28]], color) + rect(x - w / 2, y - 26, w, 40, '#fffaf0', 'rx="12" stroke="' + color + '" stroke-width="3"') + poly([[tail - 7, y + 12], [tail + 5, y + 12], [tail - 5, y + 23]], '#fffaf0') + label(x, y + 2, text, 19, color, 'text-anchor="middle"') + '</g>'; };
  // The candidate's line, with the tail just inside the bubble's left end, over the candidate's head.
  const say = (text, color) => bubbleAt(628 - 30 + (26 + Array.from(text).length * 21) / 2, 338, text, color, 'speech', '', 628);
  function countNight(stage = 'count', options = {}) {
    const still = !!options.still, at = Number(options.elapsed) || 0, party = PARTY_COLORS[candidates.player.party] || '#c9a847', name = options.name || '小沈';
    const won = stage === 'elected', lost = stage === 'forfeited', refunded = stage === 'refunded', done = won || lost || refunded;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" aria-hidden="true" focusable="false" class="count-art' + (still ? ' still' : '') + '" data-stage="' + stage + '">';
    s += rect(0, 0, 1200, 650, '#22312d') + rect(0, 0, 1200, 452, '#2c423c') + rect(0, 448, 1200, 8, '#3b5650');
    for (let y = 486; y < 650; y += 38) s += path('M0 ' + y + 'H1200', '#1d2b27', 2, 'opacity=".8"');
    // Strings of warm bulbs either side of the screen.
    for (const [x0, y0, cx, cy, x1, y1] of [[0, 46, 125, 96, 250, 58], [950, 58, 1075, 96, 1200, 46]]) {
      s += path('M' + x0 + ' ' + y0 + 'Q' + cx + ' ' + cy + ' ' + x1 + ' ' + y1, '#55665c', 2);
      for (let i = 0; i <= 6; i++) { const t = i / 6, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1; s += '<circle class="bulb" cx="' + x.toFixed(1) + '" cy="' + (y + 7).toFixed(1) + '" r="7" fill="' + ['#ffd27a', '#ff9f68', '#fff1b8'][i % 3] + '"/>'; }
    }
    if(isToy())s+=sceneAtlas('count');
    // Two hanging banners in the party colour.
    for (const [x, words] of [[58, name + '競選總部'], [1068, won ? '凍蒜' : '感謝支持']]) {
      s += rect(x, 138, 74, 292, '#fffaf0', 'rx="4"') + rect(x, 138, 74, 22, party, 'rx="4"') + rect(x, 410, 74, 20, party);
      Array.from(words).forEach((ch, i, all) => { s += label(x + 37, 160 + (all.length > 4 ? 44 : 60) * (i + 1) - (all.length > 4 ? 6 : 14), ch, all.length > 4 ? 34 : 44, '#24443c', 'text-anchor="middle"'); });
    }
    // The big screen; while the count runs its numbers are laid over it by the page.
    s += rect(250, 24, 700, 286, '#101917', 'rx="12"') + rect(262, 36, 676, 262, '#0b1412', 'rx="6"');
    for (let x = 300; x < 938; x += 56) s += path('M' + x + ' 36V298', '#14211e', 1);
    if (options.tally) {
      // Your bar against the last seat, and your place among all candidates.
      const t = options.tally, top = Math.max(t.you, t.line) * 1.12 || 1, w = v => 470 * Math.min(1, v / top), lx = 380 + w(t.line);
      s += label(600, 84, '開票結果', 30, '#e8f1df', 'text-anchor="middle"');
      s += label(300, 178, name, 26, '#e8f1df') + rect(380, 152, w(t.you), 40, '#7fc98f', 'rx="5"') + label(910, 182, Math.round(t.you).toLocaleString('zh-TW'), 26, '#fffaf0', 'text-anchor="end"') + (t.rank ? label(600, 238, '第 ' + t.rank + ' 名' + (t.seats ? '・前 ' + t.seats + ' 名當選' : ''), 24, '#e8f1df', 'text-anchor="middle"') : '');
      s += path('M' + lx.toFixed(1) + ' 136V206', '#fff1b8', 3, 'stroke-dasharray="8 6"') + label(lx, 128, '當選線 ' + Math.round(t.line).toLocaleString('zh-TW'), 18, '#fff1b8', 'text-anchor="middle"');
    }
    // The stage, the candidate and two assistants.
    s += block(316, 516, 568, 48, 46, '#8c6a4e', '#a98260', '#6f523c') + rect(316, 558, 568, 8, '#6f523c') + rect(316, 516, 568, 6, party);
    const crew = won ? 'cheer' : refunded ? 'clap' : lost ? 'sad' : null;
    // The placard stands left of the helpers so neither art pack hides its text.
    if (refunded) s += rect(301, 418, 5, 78, '#6d6a5c') + rect(250, 380, 108, 44, '#fffaf0', 'rx="4" stroke="' + party + '" stroke-width="3"') + label(304, 409, '保證金退回', 18, '#24443c', 'text-anchor="middle"');
    s += figure(470, 505, 'helper', 1.02, crew) + figure(730, 505, 'helper', 1.02, crew) + figure(600, 507, 'player', 1.2, won ? 'cheer' : done ? 'bow' : 'wave');
    // Supporters on the floor; each bobs on its own beat once the result is in.
    NIGHT_CROWD.forEach(([x, y, k, role], i) => { s += '<g class="fan"' + (still ? '' : ' style="animation-delay:-' + ((i * .23) % 1).toFixed(2) + 's"') + '>' + figure(x, y, role, k, won ? 'cheer' : refunded ? 'clap' : lost ? 'sad' : null) + '</g>'; });
    if (stage === 'count' && !still) TALLY.forEach(([text, who, x, y], i) => { s += bubbleAt(x, y, text, who === 'you' ? '#2f7a4a' : who === 'rival' ? '#b0563d' : '#7d847a', 'tally', 'animation-delay:' + (.6 + i * .38 - at).toFixed(2) + 's'); });
    if (won) {
      const colors = [party, '#f2c14e', '#e3765b', '#7fc98f', '#fffaf0', '#6fa8dc'];
      for (let i = 0; i < 56; i++) { const x = (i * 97 + 31) % 1200, y = still ? 60 + (i * 53) % 520 : -40 - (i * 41) % 320; s += rect(x, y, 10, 16, colors[i % colors.length], 'class="confetto" transform="rotate(' + (i * 37 % 180) + ' ' + (x + 5) + ' ' + (y + 8) + ')"' + (still ? '' : ' style="animation-delay:-' + ((i % 9) * .31).toFixed(2) + 's;animation-duration:' + (2.1 + (i % 5) * .34).toFixed(2) + 's"')); }
      for (const [x, y, c, d] of [[178, 74, '#f2c14e', 0], [1022, 70, '#e3765b', .5], [150, 300, '#6fa8dc', .9]]) { let rays = ''; for (let j = 0; j < 12; j++) { const r = j * Math.PI / 6; rays += path('M' + (x + Math.cos(r) * 14).toFixed(1) + ' ' + (y + Math.sin(r) * 14).toFixed(1) + 'L' + (x + Math.cos(r) * 44).toFixed(1) + ' ' + (y + Math.sin(r) * 44).toFixed(1), c, 4, 'stroke-linecap="round"'); } s += '<g class="burst"' + (still ? '' : ' style="animation-delay:' + d + 's"') + '>' + rays + '</g>'; }
      s += say('謝謝大家！凍蒜！', '#2f7a4a');
    } else if (done) {
      s += rect(0, 0, 1200, 650, '#050908', 'class="dim" opacity="' + (lost ? .5 : .28) + '"');
      if (lost) for (const [rx, ry, o] of [[230, 300, .05], [170, 250, .07], [110, 200, .09]]) s += '<ellipse cx="600" cy="430" rx="' + rx + '" ry="' + ry + '" fill="#fff6d8" opacity="' + o + '"/>';
      s += say(lost ? '謝謝大家。' : '謝謝大家，我們下次再拚！', lost ? '#5f6a5b' : '#2f7a4a');
    }
    return s + '</svg>';
  }

  window.DayArt = Object.freeze({getPack:()=>artPack,setPack,walkStep,toyTeam,supportFrames:SUPPORT_FRAMES,walkFrames:WALK_FRAMES,isToy,spot,visualRoute,mapPoint,travelPoint,facing,assetFrames:TOY_FRAMES,scene,avatar,portrait,billboard,anchors,paths,route,interior,faceIcon,countNight,GROUP_ROLES,setCandidates});
})();
