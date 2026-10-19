/* Original code-native block-human market art. No borrowed characters or textures. */
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
    protagonist: 'player', candidate: 'player', volunteer: 'helper',
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
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true" focusable="false" class="market-avatar-svg">' +
      poly([[22, 130], [49, 121], [82, 130], [52, 138]], '#647764', 'opacity=".16"') + humanMarkup(role, color) + '</svg>';
  }

  function person(x, feetY, role, scale = .62) {
    return '<g class="market-resident" data-role="' + role + '" transform="translate(' + (x - 50 * scale) + ' ' + (feetY - 130 * scale) + ') scale(' + scale + ')">' +
      poly([[22, 130], [49, 121], [82, 130], [52, 138]], '#647764', 'opacity=".14"') + humanMarkup(role) + '</g>';
  }

  function windowPane(x, y, w = 35, h = 43) {
    return rect(x - 3, y - 3, w + 6, h + 6, '#d3c5a5') + rect(x, y, w, h, '#829b92') + rect(x + 3, y + 3, w - 6, h * .42, '#b5c4b0') + path('M' + (x + w / 2) + ' ' + y + 'V' + (y + h), '#e8dbbb', 3) + rect(x - 5, y + h, w + 10, 5, '#c0b393');
  }

  function building(x, y, w, h, variant) {
    let s = block(x, y, w, h, 23, C.wall, '#f5eacc', C.wallSide);
    s += block(x - 5, y - 5, w + 10, 10, 24, variant === 'sage' ? '#7a9987' : '#bf8e72', variant === 'sage' ? '#99ad94' : '#d3a688', variant === 'sage' ? '#5e7e70' : '#9b755e');
    for (let i = 0; i < 3; i++) s += windowPane(x + 23 + i * (w - 60) / 3, y + 27, 33, 42);
    s += rect(x + 9, y + 94, w - 18, 4, '#d9cbb0') + rect(x + 14, y + 105, w - 28, h - 105, '#d4c8ab');
    s += block(x + w - 58, y + 78, 38, 15, 4, '#d8d6bd', '#eae7ce', '#b5b9a4');
    for (let i = 0; i < 4; i++) s += rect(x + w - 53, y + 82 + i * 2.5, 26, 1, '#a5afa0');
    return s;
  }

  function crate(x, y, kind, w = 42) {
    let s = block(x, y, w, 15, 10, '#bd9363', '#d9b783', '#9f784f');
    s += rect(x + 4, y + 4, w - 8, 2, '#9b774f') + rect(x + 4, y + 10, w - 8, 2, '#9b774f');
    const color = kind === 'leaf' ? '#7f9c5f' : '#d7a45e';
    for (let i = 0; i < 4; i++) s += block(x + 4 + i * (w - 8) / 4, y - 5 - (i % 2) * 2, 8, 7, 4, color, kind === 'leaf' ? '#afbd7c' : '#efc27c', kind === 'leaf' ? '#63834e' : '#b7834d');
    return s;
  }

  function stall(x, y, w, color, dark, kind) {
    let s = block(x + 5, y + 19, w - 4, 91, 10, '#d8ceb0', '#e8dcc0', '#b6ac92');
    // Recessed store interior and two structural posts.
    s += rect(x + 18, y + 27, w - 34, 71, '#6e8171') + rect(x + 24, y + 34, w - 46, 7, '#a2a889');
    s += block(x + 9, y + 10, 7, 106, 5, '#b4a385', '#d5c29d', '#8c826c') + block(x + w - 12, y + 10, 7, 106, 5, '#b4a385', '#d5c29d', '#8c826c');
    // Wide, quiet alternating canopy panels. No branded textures or sign text.
    s += poly([[x - 12, y + 28], [x + 8, y - 7], [x + w + 16, y - 7], [x + w - 4, y + 28]], color);
    for (let i = 0; i < 5; i++) {
      const xx = x - 12 + i * (w + 8) / 5;
      s += poly([[xx, y + 28], [xx + 20, y - 7], [xx + 20 + (w + 8) / 10, y - 7], [xx + (w + 8) / 10, y + 28]], '#eee6c8', 'opacity=".8"');
    }
    s += rect(x - 12, y + 28, w + 8, 13, dark) + poly([[x + w - 4, y + 28], [x + w + 16, y - 7], [x + w + 16, y + 6], [x + w - 4, y + 41]], dark);
    s += block(x + 12, y + 86, w - 28, 30, 12, '#c3a175', '#e1c49a', '#a28460');
    s += rect(x + 21, y + 95, w - 46, 2, '#b38d61') + rect(x + 21, y + 105, w - 46, 2, '#b38d61');
    if (kind === 'produce') {
      s += crate(x + 23, y + 73, 'leaf', 43) + crate(x + 75, y + 73, 'fruit', 43) + crate(x + 126, y + 73, 'leaf', 33);
    } else {
      // Tea tins and a tray of warm buns form a second unmistakable shop.
      for (let i = 0; i < 3; i++) s += block(x + 29 + i * 24, y + 66, 17, 19, 5, ['#9aa37d', '#b8a075', '#8da194'][i], '#e4d9b6', '#71806b') + rect(x + 33 + i * 24, y + 73, 9, 6, '#eee4c4');
      s += block(x + 110, y + 79, 45, 5, 10, '#bd9f70', '#e4cf9f', '#a48c65');
      for (let i = 0; i < 3; i++) s += block(x + 115 + i * 13, y + 71, 10, 8, 5, '#e7d5a8', '#fff0c8', '#cbb78e');
    }
    return s;
  }

  function tree(x, y, scale = 1) {
    return `<g transform="translate(${x} ${y}) scale(${scale})">` + block(-5, -58, 10, 58, 4, '#9e8d64', '#b3a174', '#7d7657') + block(-31, -92, 54, 33, 16, '#8aa17a', '#adbc8f', '#6f8a67') + block(-18, -112, 34, 23, 12, '#94aa7e', '#bac79a', '#7c976e') + '</g>';
  }

  const anchors = Object.freeze({
    desk: Object.freeze({ x: 150, y: 430 }),
    access: Object.freeze({ x: 430, y: 430 }),
    drain: Object.freeze({ x: 740, y: 430 }),
    exit: Object.freeze({ x: 900, y: 535 }),
    player: Object.freeze({ x: 120, y: 535 })
  });

  function scene() {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" role="img" aria-label="文山山腳的虛構街市：綠色山丘、兩個遮棚攤位、左側準備桌，以及前方寬敞的步行空間。三位積木造型的成年居民站在攤位與桌旁。" class="market-art-svg">';
    s += '<title>山腳市場的一天</title><desc>原創溫暖積木風的人類街景。左側是準備桌，中間是蔬果攤，右側是茶點攤。攤位與居民集中在畫面上半部，下半部留作可步行的開闊石板街道，出口在右下方。角色和地點名稱由遊戲介面提供。</desc>';
    s += rect(0, 0, 1000, 650, C.sky);
    // A soft, faceted foothill skyline suggests Wenshan without reproducing a landmark.
    s += poly([[0, 187], [96, 150], [152, 166], [272, 85], [355, 120], [438, 91], [560, 153], [645, 109], [742, 134], [825, 90], [938, 146], [1000, 127], [1000, 272], [0, 272]], '#d4dcc0');
    s += poly([[0, 223], [104, 185], [182, 202], [293, 143], [408, 186], [493, 147], [596, 199], [708, 166], [837, 185], [937, 150], [1000, 181], [1000, 300], [0, 300]], '#bccbaa');
    s += poly([[293, 143], [408, 186], [493, 147], [596, 199], [481, 215], [356, 206]], '#c8d3b4');
    s += poly([[40, 322], [936, 322], [986, 357], [986, 592], [945, 623], [54, 623], [15, 591], [15, 358]], '#c7c9a4');
    s += poly([[31, 360], [966, 360], [983, 583], [942, 610], [57, 610], [20, 582]], C.paving);
    s += poly([[20, 582], [57, 610], [942, 610], [983, 583], [983, 597], [943, 625], [56, 625], [20, 596]], C.pavingSide);
    // Flat paving lines communicate a walkable plane; no props occupy the route.
    for (const y of [409, 472, 544]) s += path(`M30 ${y}H973`, '#d5cbb1', 1.2, 'opacity=".58"');
    for (const x of [73, 235, 397, 559, 721, 883]) s += path(`M${x} 365L${x + 57} 608`, '#d5cbb1', 1.2, 'opacity=".46"');
    s += path('M53 581H946', '#f5ecd6', 3, 'opacity=".65"');
    // Architecture and all freestanding props finish above the pedestrian band.
    s += tree(79, 324, .88) + tree(911, 330, .89);
    s += building(306, 154, 222, 192, 'sage') + building(629, 143, 220, 203, 'clay');
    // A modest service alley between the two shops, with overhead power lines.
    s += path('M294 174L594 192L865 165', '#a5ac8e', 2, 'opacity=".55"');
    s += block(565, 245, 37, 97, 9, '#d9d5b5', '#eee6c7', '#b5b99d') + rect(575, 264, 19, 65, '#9aab92');
    s += rect(578, 273, 12, 2, '#d0d7b6') + rect(578, 281, 12, 2, '#d0d7b6');
    s += stall(322, 250, 190, '#93aa8b', '#688874', 'produce');
    s += stall(649, 250, 190, '#cfaa76', '#ac875e', 'tea');
    // Preparation table: pale paperwork, a cup, and two thick wooden legs.
    s += block(101, 339, 9, 36, 7, '#a18260', '#c5a47c', '#836e54') + block(204, 339, 9, 36, 7, '#a18260', '#c5a47c', '#836e54');
    s += block(94, 326, 125, 12, 21, '#b39167', '#d9bd8d', '#987b58');
    s += poly([[119, 321], [130, 314], [169, 314], [158, 321]], '#fff6dd') + poly([[134, 322], [145, 315], [174, 315], [163, 322]], '#e8ead0');
    s += path('M144 318H161', '#aab298', 1.3) + block(188, 312, 10, 12, 4, '#849e8b', '#c8d8bd', '#5d7d6f');
    // Drain is a flush ground detail, never a collision object.
    s += poly([[704, 378], [764, 378], [774, 387], [714, 387]], '#98a492');
    for (let x = 711; x < 762; x += 8) s += path(`M${x} 380L${x + 5} 385`, '#6c7c70', 2);
    // Speaking adults align with the access/drain approach anchors. They remain
    // above the open walking corridor, with feet just in front of each counter.
    s += person(250, 381, 'helper', .64) + person(430, 381, 'shop', .67) + person(740, 381, 'resident', .65);
    // The exit hint is painted on the paving and does not cover its UI marker.
    s += path('M878 569H914M905 561L917 569L905 577', '#b1ae8b', 3, 'stroke-linejoin="miter" opacity=".7"');
    return s + '</svg>';
  }

  window.MarketArt = Object.freeze({ scene, avatar, anchors });
})();
