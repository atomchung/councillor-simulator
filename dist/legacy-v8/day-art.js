/* Original code-native isometric campaign town with block-human residents. No borrowed characters or textures. */
(function () {
  'use strict';

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
  const safeColor = (color, fallback) => typeof color === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;

  const roleAliases = {
    protagonist: 'player', candidate: 'player', volunteer: 'helper', staff: 'helper', host: 'resident',
    vendor: 'shop', shopkeeper: 'shop', merchant: 'shop', access: 'shop',
    drain: 'shop2', neighbour: 'resident', neighbor: 'resident', elder: 'resident',
    opponent: 'rival'
  };
  const looks = {
    player: { shirt: '#527e70', skin: '#d5a17e', shade: '#b98164', hair: '#3f4540', trousers: '#485f65' },
    shop: { shirt: '#ae835c', skin: '#d0a381', shade: '#b58465', hair: '#47463e', trousers: '#566461' },
    shop2: { shirt: '#6d8f8a', skin: '#b78868', shade: '#996c53', hair: '#343f3b', trousers: '#5a625e' },
    resident: { shirt: '#947d8f', skin: '#e0b493', shade: '#c18f73', hair: '#a9a99a', trousers: '#59656a' },
    helper: { shirt: '#7c98a2', skin: '#c99878', shade: '#a9785e', hair: '#535044', trousers: '#626a63' },
    rival: { shirt: '#bd7e67', skin: '#dab08c', shade: '#b68a6b', hair: '#635143', trousers: '#545d64' }
  };

  function humanMarkup(role = 'player', color) {
    role = roleAliases[role] || role;
    if (!Object.prototype.hasOwnProperty.call(looks, role)) role = 'player';
    const p = looks[role], shirt = safeColor(color, p.shirt);
    let s = '<g class="human-avatar" data-role="' + role + '">';
    s += '<g class="leg-left">' + block(30, 96, 14, 27, 4, p.trousers, p.trousers, '#43504e') + rect(27, 123, 20, 7, '#3d4945') + '</g>';
    s += '<g class="leg-right">' + block(51, 96, 14, 27, 4, p.trousers, p.trousers, '#43504e') + rect(49, 123, 21, 7, '#3d4945') + '</g>';
    s += '<g class="arm-left">' + block(17, 63, 10, 29, 4, shirt, shirt, '#4b625b') + block(17, 92, 10, 10, 4, p.skin, p.skin, p.shade) + '</g>';
    s += '<g class="body">' + block(29, 59, 36, 39, 5, shirt, shirt, '#456158') + rect(40, 52, 14, 9, p.skin);
    if (role === 'player') {
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
    }
    s += '</g><g class="arm-right">' + block(69, 63, 10, 29, 4, shirt, shirt, '#4b625b') + block(69, 92, 10, 10, 4, p.skin, p.skin, p.shade);
    if (role === 'resident') s += path('M73 101V94H84V103', '#a18e68', 3) + block(70, 102, 17, 17, 3, '#c4b17e', '#dac99d', '#a69466');
    if (role === 'rival') s += block(72, 91, 13, 18, 2, '#eee6cf', '#fff4db', '#c8bda2') + rect(75, 96, 7, 2, '#b3c2b1');
    s += '</g><g class="head">';
    if (role === 'shop') s += block(27, 29, 39, 29, 7, p.hair, p.hair, '#343c35');
    s += block(30, 19, 34, 34, 10, p.skin, '#e9c1a0', p.shade);
    s += poly([[30, 19], [40, 13.5], [74, 13.5], [64, 19]], p.hair) + rect(30, 19, 34, 8, p.hair) + poly([[64, 19], [74, 13.5], [74, 29], [64, 34]], p.hair);
    if (role === 'resident') {
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
    s += rect(38, 34, 3, 3, C.ink) + rect(53, 34, 3, 3, C.ink) + rect(46, 40, 3, 3, p.shade) + path('M43 47H51', '#9b6f57', 1.5);
    s += '</g></g>';
    return s;
  }

  function avatar(role = 'player', color) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true" focusable="false" class="day-avatar-svg">' +
      poly([[22, 130], [49, 121], [82, 130], [52, 138]], '#647764', 'opacity=".16"') + humanMarkup(role, color) + '</svg>';
  }

  function person(x, feetY, role, scale = .62) {
    return '<g class="day-resident" data-role="' + role + '" transform="translate(' + (x - 50 * scale) + ' ' + (feetY - 130 * scale) + ') scale(' + scale + ')">' +
      poly([[22, 130], [49, 121], [82, 130], [52, 138]], '#647764', 'opacity=".14"') + humanMarkup(role) + '</g>';
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
    for(let z=20;z<30;z+=4)s+=isoLine(P(89,v+d+1.4,z),P(100,v+d+1.4,z),'#8e9c82',1.4);
    return s+'</g>';
  }
  function market() {
    const u=70,v=315,w=145,d=100,h=62;
    let s='<g data-place="market">';
    s+=isoTile(u-10,v-8,w+29,d+61,'#e2ddc4',2);
    s+=isoTile(u+7,v+9,w+8,d+14,'#73836b',2,'opacity=".13"');
    s+=isoBox(u,v,w,d,h,'#f1e5c4','#e9dab8','#cbb995');
    s+=front(u+11,v+d+.2,w-22,7,37,'#71816b');
    s+=side(u+w+.3,v+20,35,23,22,'#83988a');
    s+=isoLine(P(u+w+.5,v+37,24),P(u+w+.5,v+37,44),'#e2d9b9',2);
    s+=pitchedRoof(u,v,w,d,h,['#d4ac82','#bd8965','#a57555','#e8bf93']);
    // The broad canopy follows the same ground axes as the whole town.
    const awningV=v+d+26;
    s+=poly([P(u+3,v+d-1,44),P(u+w-3,v+d-1,44),P(u+w-3,awningV,32),P(u+3,awningV,32)],'#94ac8c');
    for(let i=0;i<5;i++){
      const a=u+3+i*(w-6)/5,b=a+(w-6)/10;
      s+=poly([P(a,v+d-1,44),P(b,v+d-1,44),P(b,awningV,32),P(a,awningV,32)],'#e9e2c4');
    }
    s+=front(u+3,awningV,w-6,25,7,'#698771');
    for(const a of [u+8,u+w-11])s+=isoBox(a,awningV-2,3,3,26,'#c2b28a','#a3916c','#8b7e5d');
    s+=isoBox(u+17,v+d+8,w-34,16,16,'#dfc595','#bd986c','#a7845e');
    for(let i=0;i<3;i++){
      const a=u+24+i*31;
      s+=isoBox(a,v+d+9,25,12,5,'#a5b77c','#8d9e64','#6f8355',16);
      for(let j=0;j<3;j++)s+=isoBox(a+3+j*7,v+d+11,5,6,4,i%2?'#e1b76e':'#b4c68a',i%2?'#c79653':'#8ca66b',i%2?'#b0854b':'#718e57',21);
    }
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
    tv:[430,235], fundraise:[375,425], recruit:[240,120]
  };
  const anchors = Object.freeze(Object.fromEntries(Object.entries(world).map(([key,p])=>{
    const [x,y]=P(...p,2);return [key,Object.freeze({x,y})];
  })));
  const routeWorld = {
    prepare:[[275,290],[275,205],[135,205]],
    canvass:[[275,290],[275,465],[155,465]],
    tv:[[275,290],[430,290],[430,235]],
    fundraise:[[275,290],[275,425],[375,425]],
    recruit:[[275,290],[275,120],[240,120]]
  };
  const paths = Object.freeze(Object.fromEntries(Object.entries(routeWorld).map(([id,waypoints])=>[id,Object.freeze(waypoints.map(p=>{
    const [x,y]=P(...p,2);return Object.freeze({x,y});
  }))])));
  function route(id) { return (paths[id] || [anchors.start]).map(p=>({x:p.x,y:p.y})); }

  function scene() {
    let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" role="img" aria-label="山腳小鎮的一日競選：有立體屋頂和側牆的三幢小建築、寬闊步道、募款小廣場，以及積木造型的人類居民。" class="day-art-svg">';
    s+='<title>山腳小鎮的一日競選</title><desc>原創等角投影小鎮。上方綠屋頂是準備辦公室與團隊空間；左方是有遮棚的市場；右方是電視訪談小棚；前方是募款廣場。五個目的地沿著互通的步道連接，所有角色皆為人類。</desc>';
    s+=rect(0,0,1200,650,'#f5f0df');
    // A very quiet foothill backdrop frames, rather than crowds, the town.
    s+=poly([[0,198],[92,160],[176,173],[294,114],[368,135],[463,97],[572,145],[682,110],[800,153],[897,105],[1012,147],[1114,122],[1200,159],[1200,262],[0,262]],'#e4e8d3');
    s+=poly([[0,243],[128,215],[245,231],[348,183],[457,210],[562,182],[707,220],[837,188],[956,220],[1084,186],[1200,215],[1200,293],[0,293]],'#dbe2c7');
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
    s+=isoTile(126,445,151,40,'#eae3cb',2);
    s+=isoTile(410,214,40,76,'#eae3cb',2);
    s+=isoTile(275,405,114,40,'#eae3cb',2);
    for(const v of [236,327,374,425,479])s+=isoLine(P(252,v,2.2),P(298,v,2.2),'#d5ccb2',1.2,'opacity=".55"');
    for(const u of [338,385,480])s+=isoLine(P(u,268,2.2),P(u,312,2.2),'#d5ccb2',1.2,'opacity=".55"');
    // Back-to-front draw order respects the architecture's actual footprint.
    s+=isoTree(36,235,.95);
    s+=office();
    s+=isoTree(502,30,.85);
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
    return s+'</svg>';
  }

  window.DayArt = Object.freeze({scene,avatar,anchors,paths,route});
})();
