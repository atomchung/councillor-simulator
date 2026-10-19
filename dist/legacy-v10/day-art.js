/* Original code-native Muzha miniature with block-human residents. No borrowed characters or textures. */
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
  const label = (x, y, text, size = 16, color = C.ink, attrs = '') => `<text x="${x}" y="${y}" fill="${color}" font-family="Noto Sans CJK TC, PingFang TC, Microsoft JhengHei, sans-serif" font-size="${size}" font-weight="700" ${attrs}>${text}</text>`;
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
    s+=label(40,35,'木柵意象縮景｜非實際地圖',12,'#6d8274','letter-spacing="1"');
    s+=label(117,93,'貓空茶山',17,'#4f715b','paint-order="stroke" stroke="#e7edda" stroke-width="5" stroke-linejoin="round"');
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
    s+=front(u+21,v+d+1,92,60,19,'#5f8071')+frontLabel(u+28,v+d+1.3,65,'街坊訪談',13,'#fff0cd');
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
    let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" role="img" aria-label="木柵意象縮景：木柵市場上方的圖書館、文山行政中心與公車站、YouBike、景美溪道南河濱及貓空茶山。五個行動場地以步道相連，居民皆為原創方塊人。非實際地圖。" class="day-art-svg">';
    s+='<title>木柵意象縮景｜非實際地圖</title><desc>原創 2.5D 木柵街區，以可辨識的地景元素組成非實際比例的意象縮景。左方木柵市場上層為木柵圖書館，遠方有文山行政中心、公車站與 YouBike；景美溪彎過道南河濱綠色自行車道，後方為層層貓空茶山。社區工作室、市場、訪談小棚、座談廣場等五個行動目的地均由步道相連，所有角色皆為人類。地標只是場景背景，不代表任何機關支持或背書。</desc>';
    s+=rect(0,0,1200,650,'#f5f0df');
    s+=teaHills()+riverside()+civicBlock();
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
    // Place identifiers sit away from people and action arrival points.
    s+=label(917,566,'景美溪',21,'#416f70','text-anchor="middle" paint-order="stroke" stroke="#e9efda" stroke-width="5" stroke-linejoin="round"');
    s+=label(920,588,'道南河濱・自行車道',12,'#53765b','text-anchor="middle" paint-order="stroke" stroke="#f3efdc" stroke-width="4" stroke-linejoin="round"');
    return s+'</svg>';
  }

  window.DayArt = Object.freeze({scene,avatar,anchors,paths,route});
})();
