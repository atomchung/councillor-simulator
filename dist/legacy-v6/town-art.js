/* Original, compact low-poly town. Three buildings. No assets or dependencies. */
(function () {
  'use strict';
  const P=(u,v,z=0)=>[500+(u-v)*.82,105+(u+v)*.44-z];
  const pt=p=>p.map(n=>Math.round(n*10)/10).join(',');
  const poly=(ps,fill,extra='')=>`<polygon points="${ps.map(pt).join(' ')}" fill="${fill}" ${extra}/>`;
  const line=(a,b,color,width=2)=>`<path d="M${pt(a)}L${pt(b)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="square"/>`;
  const tile=(u,v,w,d,color,z=0)=>poly([P(u,v,z),P(u+w,v,z),P(u+w,v+d,z),P(u,v+d,z)],color);
  const block=(u,v,w,d,h,top,front,side,z=0)=>poly([P(u,v+d,z+h),P(u+w,v+d,z+h),P(u+w,v+d,z),P(u,v+d,z)],front)+poly([P(u+w,v,z+h),P(u+w,v+d,z+h),P(u+w,v+d,z),P(u+w,v,z)],side)+tile(u,v,w,d,top,z+h);
  function tree(u,v,size=1) {
    const [x,y]=P(u,v);
    return `<g transform="translate(${x} ${y}) scale(${size})">${poly([[-18,0],[0,-8],[21,1],[2,11]],'#849d7c','opacity=".14"')}<path d="M0 0V-34" stroke="#ad956c" stroke-width="6"/>${poly([[-25,-41],[-16,-63],[7,-73],[27,-53],[24,-29],[1,-17],[-21,-26]],'#8eab7e')}${poly([[-25,-41],[-16,-63],[0,-43],[-21,-26]],'#a9be90')}${poly([[-16,-63],[7,-73],[0,-43]],'#bdcea0')}${poly([[7,-73],[27,-53],[0,-43]],'#a1b98b')}${poly([[0,-43],[27,-53],[24,-29],[1,-17]],'#759772')}${poly([[-21,-26],[0,-43],[1,-17]],'#95b083')}</g>`;
  }
  function house(u,v,w,d,h,roof,kind) {
    let s=tile(u+7,v+7,w+9,d+9,'#819778',1);
    s+=block(u,v,w,d,h,'#ede1c1','#f1e6ca','#d2c7aa');
    const a=P(u-4,v-4,h),b=P(u+w+4,v-4,h),c=P(u+w+4,v+d+4,h),e=P(u-4,v+d+4,h),m=P(u-4,v+d*.48,h+27),n=P(u+w+4,v+d*.48,h+27);
    s+=poly([a,b,n,m],roof[0])+poly([m,n,c,e],roof[1])+poly([b,n,c],roof[2]);
    s+=poly([a,P(u+w*.34,v-4,h),P(u+w*.48,v+d*.48,h+27),m],roof[3]);
    const rows=kind==='home'?2:1;
    for(let r=0;r<rows;r++)for(let i=0;i<3;i++){
      const uu=u+12+i*(w-24)/3,z=22+r*27;
      s+=poly([P(uu,v+d+.1,z+14),P(uu+12,v+d+.1,z+14),P(uu+12,v+d+.1,z),P(uu,v+d+.1,z)],'#849e96');
    }
    s+=poly([P(u+w+.1,v+17,37),P(u+w+.1,v+35,37),P(u+w+.1,v+35,20),P(u+w+.1,v+17,20)],'#7d9993');
    s+=poly([P(u+w*.47,v+d+.2,25),P(u+w*.64,v+d+.2,25),P(u+w*.64,v+d+.2,0),P(u+w*.47,v+d+.2,0)],'#bdad8c');
    if(kind==='market') {
      s+=poly([P(u+8,v+d,31),P(u+w-8,v+d,31),P(u+w-8,v+d+17,22),P(u+8,v+d+17,22)],'#98af95');
      s+=poly([P(u+8,v+d+17,22),P(u+w-8,v+d+17,22),P(u+w-8,v+d+17,17),P(u+8,v+d+17,17)],'#76927d');
      s+=block(u+13,v+d+5,24,9,10,'#d8bc89','#c6a973','#b19367');
    }
    return s;
  }
  function animalMarkup(species='fox',color='#438e8a',id='') {
    const kinds={cat:'fox',elder:'turtle',parent:'bear',student:'rabbit',protagonist:'fox'};species=kinds[species]||species;
    const body=`<path d="M-13 -34L8 -36L19 -28L17 -7L-8 -4L-19 -14Z" fill="${color}"/><path d="M8 -36L19 -28L17 -7L7 -12Z" fill="#224f52" opacity=".28"/><path d="M-9 -8L-1 -9L-1 1L-10 2Z M8 -8L17 -8L17 2L8 3Z" fill="#526d77"/><path d="M-12 0L-1 0L2 5L-12 6Z M7 2L17 1L21 5L7 7Z" fill="#465b5b"/><path d="M-17 -29L-23 -22L-20 -9L-13 -13" fill="${color}"/><path d="M17 -27L23 -17L19 -10L13 -16" fill="${color}"/>`;
    let head='';
    if(species==='turtle') head=`<path d="M-15 -28Q-29 -42 -21 -57Q-8 -65 7 -47L15 -23L0 -17Z" fill="#658e69" stroke="#416f57" stroke-width="2"/><path d="M-18 -45L-7 -47L1 -35L-8 -25L-21 -31Z" fill="#84a576"/><path d="M-13 -64L9 -69L24 -59L22 -39L-1 -31L-17 -42Z" fill="#b3bc79"/><path d="M9 -69L24 -59L22 -39L10 -45Z" fill="#8f9d65"/><path d="M-13 -49L-3 -45L-3 -39L-14 -42Z M2 -44L12 -41L12 -35L1 -38Z" fill="none" stroke="#526e69" stroke-width="2"/><path d="M-3 -43L2 -41M12 -39L22 -45" stroke="#526e69" stroke-width="2"/><path d="M-5 -35L6 -31" stroke="#66816a" stroke-width="1.5" stroke-linecap="round"/><path d="M23 -19L27 -17L27 7" fill="none" stroke="#9a7456" stroke-width="3" stroke-linecap="round"/>`;
    else if(species==='bear') head=`<path d="M-24 -60L-25 -73L-14 -78L-7 -69 M9 -70L17 -78L28 -72L27 -60" fill="#a2785d"/><path d="M-18 -59L-20 -69L-13 -72L-9 -64 M14 -66L19 -71L23 -68L23 -60" fill="#cf9b79"/><path d="M-18 -68L7 -72L25 -59L23 -35L-3 -27L-21 -41Z" fill="#b88a69"/><path d="M7 -72L25 -59L23 -35L9 -43Z" fill="#916c56"/><path d="M-10 -46L3 -49L14 -41L12 -30L-2 -27L-11 -35Z" fill="#ecd6ad"/><ellipse cx="0" cy="-40" rx="4" ry="3" fill="#4d5349"/><circle cx="-11" cy="-54" r="2.4" fill="#344e49"/><circle cx="8" cy="-48" r="2.4" fill="#344e49"/><path d="M-2 -35L4 -33" stroke="#8d735c" stroke-width="1.5"/><path d="M-18 -15L-30 -18L-34 -1L-21 6L-13 1Z" fill="#e9c78a"/><path d="M-28 -17L-27 -24L-20 -22L-19 -16" fill="none" stroke="#b4905c" stroke-width="2"/>`;
    else if(species==='rabbit') head=`<path d="M-16 -66L-23 -92L-20 -103L-11 -99L-4 -72 M5 -70L3 -101L9 -110L16 -105L16 -73" fill="#f2e6cb"/><path d="M-16 -92L-12 -75 M10 -100L10 -78" stroke="#deb3a3" stroke-width="5" stroke-linecap="round"/><path d="M-19 -67L6 -72L23 -59L20 -37L-3 -29L-21 -42Z" fill="#f6ecd6"/><path d="M6 -72L23 -59L20 -37L8 -44Z" fill="#d7cfb8"/><circle cx="-11" cy="-53" r="2.2" fill="#395755"/><circle cx="7" cy="-48" r="2.2" fill="#395755"/><path d="M-4 -43L2 -41L-1 -38Z" fill="#c98e80"/><path d="M-3 -36L3 -34" stroke="#bd9a89" stroke-width="1.5"/><path d="M17 -28L26 -27L27 -10L18 -7Z" fill="#e3a45e"/><path d="M10 -31L16 -16" stroke="#edb975" stroke-width="3"/>`;
    else if(species==='cat') head=`<path d="M-21 -62L-25 -85L-7 -73 M7 -74L26 -84L23 -58" fill="#9fabb4"/><path d="M-21 -78L-17 -64L-9 -71 M13 -72L22 -78L20 -64" fill="#d9b8aa"/><path d="M-20 -68L5 -74L25 -60L21 -37L-4 -28L-23 -43Z" fill="#b8c1c4"/><path d="M5 -74L25 -60L21 -37L8 -44Z" fill="#8fa0a9"/><path d="M-10 -44L4 -46L13 -37L-3 -30L-15 -37Z" fill="#f0e8d5"/><circle cx="-12" cy="-55" r="2.3" fill="#35524c"/><circle cx="8" cy="-50" r="2.3" fill="#35524c"/><path d="M-6 -42L1 -40L-2 -37Z" fill="#a97973"/><path d="M-12 -38L-29 -42M-12 -35L-28 -34M6 -36L25 -36M6 -33L23 -29" stroke="#667c7e" stroke-width="1.5"/><path d="M-16 -15Q-32 -15 -31 -31" fill="none" stroke="#9fabb4" stroke-width="6"/>`;
    else if(species==='deer') head=`<path d="M-13 -69L-17 -87L-27 -96M-17 -87L-13 -101M11 -71L18 -92L27 -99M18 -92L16 -106" stroke="#9a805e" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M-16 -64L-32 -73L-31 -58L-20 -54 M17 -65L32 -72L32 -57L22 -52" fill="#c6a078"/><path d="M-17 -68L7 -72L25 -57L20 -36L-3 -27L-21 -42Z" fill="#cfa77b"/><path d="M7 -72L25 -57L20 -36L8 -44Z" fill="#ac825f"/><path d="M-12 -42L2 -46L15 -35L12 -26L-3 -23L-15 -31Z" fill="#f0dfbd"/><circle cx="-10" cy="-55" r="2.2" fill="#35524c"/><circle cx="9" cy="-50" r="2.2" fill="#35524c"/><ellipse cx="-1" cy="-34" rx="4" ry="3" fill="#596550"/><path d="M-12 -63L-9 -65M-4 -65L-1 -67" stroke="#f3e3bf" stroke-width="3"/>`;
    else head=`<path d="M-21 -62L-26 -86L-8 -75 M7 -75L22 -88L24 -59" fill="#d6864e"/><path d="M-21 -78L-18 -64L-9 -70 M13 -73L20 -80L20 -65" fill="#6d6756"/><path d="M-20 -70L5 -76L25 -60L21 -37L-4 -28L-23 -43Z" fill="#e69c59"/><path d="M5 -76L25 -60L21 -37L8 -44Z" fill="#c67b48"/><path d="M-22 -48L-10 -44L-4 -34L7 -41L20 -43L21 -37L-4 -28L-23 -43Z" fill="#fff1cf"/><circle cx="-12" cy="-56" r="2.3" fill="#35524c"/><circle cx="8" cy="-51" r="2.3" fill="#35524c"/><path d="M-8 -43L-1 -41L-4 -37Z" fill="#46584e"/><path d="M-8 -30L13 -12" stroke="#b78653" stroke-width="3"/><path d="M8 -18L20 -14L20 -4L8 -7Z" fill="#c19b67"/><path d="M-17 -16Q-32 -16 -32 -35L-24 -28L-18 -27Z" fill="#d68b4f"/><path d="M-32 -35L-24 -28L-28 -21Z" fill="#fff1cf"/>`;
    // The head is drawn last so the silhouette stays readable at map scale.
    return `<g ${id?`data-animal="${id}"`:''}>${body}${head}</g>`;
  }
  function person(u,v,species,color,s=.52) {
    const p=P(u,v);return `<g transform="translate(${p[0]} ${p[1]}) scale(${s})">${poly([[-24,3],[0,-5],[24,4],[0,13]],'#577460','opacity=".13"')}${animalMarkup(species,color)}</g>`;
  }
  function town() {
    let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" role="img" aria-label="晴川小城：三幢低多邊形小屋、一座小公園與工地" class="city-art-svg">`;
    s+=poly([[80,364],[500,603],[924,365],[505,144]],'#84977b','opacity=".09"');
    s+=block(0,0,550,550,18,'#c8d0aa','#a8b89b','#94aa92',-18);
    const A=P(0,0),B=P(550,0),C=P(550,550),D=P(0,550),O=P(278,286);
    s+=poly([A,B,O],'#cbd4ae')+poly([B,C,O],'#c1cca5')+poly([C,D,O],'#c9d2ad')+poly([D,A,O],'#d2d7b6');
    // A single quiet crossing, without traffic or street clutter.
    s+=tile(216,14,35,522,'#e5dfc9',2)+tile(18,218,515,33,'#e5dfc9',2);
    s+=tile(279,295,116,120,'#b6c69e',2);
    s+=tile(323,253,17,176,'#e5dfc9',3);
    s+=house(60,55,78,69,84,['#deab7b','#c58c62','#b67d58','#e9bc8d'],'home');
    s+=house(303,67,125,66,54,['#93b3a5','#739d91','#648a81','#aec8b7'],'school');
    s+=house(77,310,126,72,56,['#d9a47a','#be825e','#ad7556','#e9b68b'],'market');
    // A small polygon pond, one bench and three angular trees.
    s+=poly([P(286,340),P(302,324),P(328,324),P(347,340),P(339,367),P(304,375),P(283,359)],'#a0b7a0');
    s+=poly([P(292,341,2),P(306,331,2),P(326,332,2),P(339,342,2),P(333,361,2),P(305,368,2),P(291,356,2)],'#91b5ae');
    s+=poly([P(306,331,3),P(326,332,3),P(339,342,3),P(305,355,3),P(291,356,3)],'#b1cbc0');
    s+=block(354,373,27,8,5,'#d7b98a','#b99c71','#a98c65',10);
    s+=block(356,375,3,4,10,'#b99c71','#b99c71','#a98c65')+block(375,375,3,4,10,'#b99c71','#b99c71','#a98c65');
    s+=tree(165,138,.82)+tree(386,298,.93)+tree(285,412,.77);
    // One small construction frame. The silhouette explains the place.
    s+=tile(454,291,66,95,'#cdbc9a',2)+block(465,314,42,57,5,'#d7d2b8','#bdbca6','#a6afa0',3);
    for(const u of [466,501])for(const v of [315,365])s+=block(u,v,5,5,43,'#cbd1bc','#b8c1ae','#9cae9f',8);
    s+=block(463,311,46,63,5,'#d1d2bb','#bcc3ac','#9ead9d',48);
    s+=block(476,390,24,12,7,'#d0ad7b','#ba9669','#a5835b');
    const flag=P(520,298);s+=line(flag,[flag[0],flag[1]-44],'#a3916f',3)+poly([[flag[0],flag[1]-44],[flag[0]+20,flag[1]-35],[flag[0],flag[1]-26]],'#d7b071');
    // Three residents. The interactive fox is supplied by the game overlay.
    // Characters are live overlays: positions, proximity prompts and rival routes come from game.js.
    return s+'</svg>';
  }
  function avatar(species='fox',color='#658e83') {
    const safe=/^#[0-9a-f]{3,8}$/i.test(color)?color:'#658e83';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" aria-hidden="true">${poly([[30,122],[59,112],[91,123],[61,133]],'#80997d','opacity=".13"')}<g transform="translate(60 116) scale(1.04)">${animalMarkup(species,safe)}</g></svg>`;
  }
  window.CityArt={town,avatar,positions:{
    home:{x:48.7,y:12.5,ax:48.3,ay:35.5},
    school:{x:75.0,y:26.0,ax:65.0,ay:47.0},
    market:{x:23.4,y:32.0,ax:35.5,ay:52.8},
    park:{x:48.0,y:45.0,ax:43.5,ay:64.0},
    hall:{x:29.0,y:57.0,ax:33.6,ay:62.1},
    construction:{x:78.0,y:52.0,ax:63.6,ay:61.8}
  }};
})();
