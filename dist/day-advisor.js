/* Campaign staff turns public information into a revisable next step, never an answer oracle. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CampaignAdvisor=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function view(G,s,context={}){
 if(!s?.started||s.phase!=='plan')return null;
 const route=G.routeView(s),chiefs=G.chiefView(s),venues=G.venueView(s),campaign=G.campaignView(s),last=s.journal.at(-1),poll=G.landscapeView(s),known=new Set(s.player.known),studied=s.player.studied||{},publicActions=s.player.actions.filter(a=>!a.record&&a.day>0),first=publicActions.find(a=>['canvass','prepare','online','tv'].includes(a.action)),opening=context.opening||first?.action;
 const mode=opening==='canvass'?'organization':['prepare','online','tv'].includes(opening)?'media':route?.group===2?'media':'organization';
 const target=route?.targets?.[route.group],base=target?.title||'基本盤',home=chiefs.filter(c=>venues.find(v=>v.id===c.venue)?.main===route?.group),ordered=[...chiefs].sort((a,b)=>b.visits-a.visits||Number(home.includes(b))-Number(home.includes(a))||a.need-b.need),chief=ordered[0],venue=venues.find(v=>v.id===chief?.venue)||venues[0],network=s.campaign?.network;
 const mediaChannel=opening==='online'||route?.group===2?'online':'tv',mediaPool=mediaChannel==='online'?G.onlinePool(s):G.tvPool(s);
 const visibleTopics=(poll.ranking||[]).map(t=>t.topic),available=new Set(G.availableTopics(s).map(t=>t.id)),nextTopic=(list)=>list.find(t=>available.has(t)&&!studied[t])||visibleTopics.find(t=>available.has(t)&&!studied[t]),topic=nextTopic(mode==='organization'?venue?.pool||[]:mediaPool);
 const active=s.player.team.members.filter(m=>m.hiredDay<s.day).length,waiting=s.player.team.members.length-active,remaining=G.DAYS-s.day+1;
 let goal,steps,advice,change='',options=[];
 const option=(id,action,config,title,reason,cost)=>{const p=G.preview(s,action,config);return p.allowed?{id,action,config,title,reason,cost}:null;};
 const prepare=topic?option('prepare','prepare',{topic},'先弄懂「'+(G.TOPICS[topic].short||G.TOPICS[topic].title)+'」','帶著準備再公開談，判斷各群人的反應。','占一回合；這回合你不親自拉票。'):null;
 const local=venue?option('local','canvass',{venue:venue.id},(chief?.visits?'繼續跑':'先去')+venue.title,chief?.broken?'已有里長交情，讓支持成為持續幫忙的小隊。':'已拜訪 '+(chief?.visits||0)+' 次，再走 '+Math.max(1,(chief?.need||1)-(chief?.visits||0))+' 次可取得里長支持。','把時間留在地方，這回合不做媒體曝光。'):null;
 const tvPreview=G.preview(s,'tv',{}),media=option('media','tv',{},'帶著準備上節目','三群人都看得到；主持人會從三題中問一題。',(tvPreview.totalCost?'花 '+Math.round(tvPreview.totalCost/10000)+' 萬':'本次免節目費')+'；沒準備的題仍可能被問倒。');
 const online=option('online','online',{},'去直播間談政見','主要接觸青年，先看會被問到哪些議題。','占用最多 2 位助手，留給研究與募款的人變少。');
 if(mode==='organization'){
  goal='先跑熟'+(venue?.title||'一個地方')+'，讓小隊留守，自己再去爭取別群人。';
  steps=[{title:'跑熟地方',done:!!chief?.visits},{title:'取得里長支持',done:!!network},{title:'小隊留守、你拓票',done:!!last?.player?.network?.reach}];
  advice=network?'地方已有人幫忙。這回合可以調整小隊要講的政見，你去補另一群的支持。':'先累積同一個地方的交情；換地方跑，這裡的進度就要晚一回合。';
  if(network){const other=[...(route?.targets||[])].filter(t=>t.id!==G.GROUPS[venues.find(v=>v.id===network.venue)?.main]?.id).sort((a,b)=>Number(b.status==='behind')-Number(a.status==='behind')||b.weight-a.weight)[0],v=venues.find(v=>v.main===G.GROUPS.findIndex(g=>g.id===other?.id));options=[other?.id==='young'?online:v?option('expand','canvass',{venue:v.id},'去'+v.title+'爭取'+other.title,'小隊顧住一處，你親自接觸另一群人。','新的地方可能問你沒準備的問題。'):media,prepare];if(!G.networkView(s).topics.length){advice='小隊已成立，但還沒有可代講的具體政見。你先公開一條做法，下回合他們才有內容可講。';options=[local,prepare];}}else options=[local,prepare];
 }else{
  goal='先準備能講清楚的政見，爭取曝光，再決定要不要接續直播。';
  steps=[{title:'準備一題',done:Object.values(studied).some(Boolean)},{title:'帶政見曝光',done:publicActions.some(a=>['tv','online','debate'].includes(a.action)&&a.prepared)},{title:'評估接續邀約',done:publicActions.some(a=>a.campaignFollowup)||!!s.campaign?.followup&&s.campaign.followup.round<s.day}];
  const pool=mediaPool,covered=pool.filter(t=>known.has(t)).length;
  advice=(mediaChannel==='online'?'直播':'節目')+'可能問的 '+pool.length+' 題，你已知道 '+covered+' 題。'+(covered<pool.length?'現在曝光有風險，也可以多準備一回合。':'可以帶著政見曝光；也要留意連續曝光後的疲乏。');
  options=covered<Math.min(2,pool.length)?[prepare,mediaChannel==='online'?online:media||local]:[mediaChannel==='online'?online:media||online,prepare||local];
 }
 if(mode==='organization'&&venue){const prep=readiness(G,s,venue.pool);advice+=' '+prep.text;if(prep.ready===0&&prepare){advice='先準備一題會更有把握；也可以承擔風險先跑地方。 '+advice;options=[prepare,...options.filter(o=>o?.id!=='prepare')];}}
 if(last?.rival?.attack)change='小馬已公開質疑你的說法，原計畫需要考慮是否先回應。';
 else if(last?.player?.direct?.votes<0)change='上回合的回答掉票了。下一站換了人群，也要重新看他們是否認同。';
 else if(last?.player?.network?.reach)change='小隊已實際替你跑地方；本回合可以繼續派工。';
 const due=G.pendingChallenges(s).find(c=>c.deadline<=s.day);
 if(due){advice='小馬的質疑這回合到期。回應能挽回部分支持，也會占用原本的行程。';const v=due.venues[0];options=[v?option('respond','canvass',{venue:v},'到'+G.VENUES[v].title+'回應','當地會問到小馬對你的質疑。','需要重申、修正或承擔原本的承諾。'):option('respond','tv',{respond:true},'上節目回應小馬','針對他已公開的批評作答。','需要節目費，也占用這回合。'),options[0]];}
 if(s.day===G.DEBATE_ROUND){advice='今天是政見發表會。小馬也會上台；你不出席，他就多一份舞台。';options=[option('debate','debate',{},'出席政見發表會','題目已公布：「'+(G.TOPICS[s.debate.topic]?.short||'本回合議題')+'」。','占本回合；不能同時跑原本的行程。'),options[0]];}
 else if(campaign.opportunity?.status==='open'){change='兩場邀約撞期，現在要決定要不要改行程。';advice='接地方邀約就延續組織，接專訪就搶曝光；邀約卡列出各自拿到什麼、失去什麼。';options=[];}
 else if(campaign.followup){change='上次曝光帶來接續直播邀約，今天不接就會過期。';advice=campaign.followup.text;options=[option('followup','online',{campaignFollowup:true},'接續上回的直播','延續已公開的題目，仍要自己決定怎麼回答。','占用本回合與直播助手，原本的進度延後。'),options[0]];}
 if(due&&(s.day===G.DEBATE_ROUND||campaign.opportunity?.status==='open'||campaign.followup))change+=' 小馬的質疑也在這回合到期，先看事件中的回應地點。';
 if(s.crisis?.status==='pending'){change='現在有一件爆料危機待處理。';advice='先看危機，決定怎麼回應，再安排這回合的行程。';options=[];}
 if(remaining<=2&&!due&&s.day!==G.DEBATE_ROUND&&!campaign.followup&&campaign.opportunity?.status!=='open'&&s.crisis?.status!=='pending'){advice='只剩 '+remaining+' 次行程。優先把已公開、有人認同的政見帶到現場；現在準備新題，可用的時間很少。';options=[local,online];}
 options=options.filter(Boolean).filter((x,i,all)=>all.findIndex(y=>y.action===x.action&&JSON.stringify(y.config)===JSON.stringify(x.config))===i).slice(0,2);
 return{mode,base,goal,steps,advice,change,options,active,waiting,remaining,rumor:G.rumorView(s),explicit:!!context.opening};
}
function readiness(G,s,pool){const ready=pool.filter(t=>s.player.known.includes(t)).length;return {ready,total:pool.length,text:'可能問的 '+pool.length+' 題，你已研究 '+ready+' 題。'+(ready<pool.length?'未研究就不知道各群反應，可能掉票；具體新方案通常要先查資料。助手今天查，下回合才用得到。':'這些題目能提出具體方案。')};}
function selected(G,s,context={}){
 if(!s?.started||s.phase!=='plan')return'';
 const id=context.selectedAction,venue=context.selectedVenue,chief=G.chiefView(s).find(c=>c.venue===venue),members=s.player.team.members.filter(m=>m.hiredDay<s.day).length;
 const challenge=G.pendingChallenges(s).find(c=>c.venues.includes(venue));
 if(id==='canvass'&&challenge)return'這裡會問小馬對你的質疑。選擇重申或修正原本的說法，回應可以挽回部分支持。';
 if(id==='canvass'&&chief){const pool=G.venueView(s).find(v=>v.id===venue)?.pool||[];return (chief.broken?'這裡已有里長交情。':'這次拜訪會累積地方交情；再走 '+Math.max(1,chief.need-chief.visits)+' 次可取得支持。')+' 已研究 '+readiness(G,s,pool).ready+' 題；先看下方準備程度，再決定是否出發。';}
 if(id==='canvass')return'這次接觸的主要是'+(G.venueView(s).find(v=>v.id===venue)?.mainTitle||'當地居民')+'，看看你公開的政見是否適合他們。';
 if(id==='prepare')return'今天花時間準備，成果從下一回合用；留下助手分頭研究或募款，就能少停一件事。';
 if(id==='recruit'){const p=G.preview(s,id);return p.allowed?'這次增加 '+p.recruitCount+' 位助手，下回合到職；代價是少一次親自拉票。':p.reason||'目前無法再招募，先安排現有人手。';}
 if(id==='fundraise')return'今天補競選款，助手可以分頭研究；你本人的拉票要延到下回合。';
 if(id==='online')return'直播主要接觸青年，占用 '+Math.min(2,members)+' 位助手；安排研究、募款的人就會變少。';
 if(id==='tv')return context.preview?.topic?'這次指定談「'+(G.TOPICS[context.preview.topic]?.title||'政見')+'」，三群人都會聽到；談得清楚才有後續曝光機會。':'曝光能接觸三群人；先看可能被問的三題，未研究的題仍有風險。';
 if(id==='debate')return'小馬也會上台。這場能讓三群人聽到你的政見，回答後再看各群的反應。';
 if(id==='rally')return'造勢會重講你已公開的立場；看看這裡的人認不認同，再決定要不要花這筆錢。';
 if(id==='dig'||id==='press')return'爆料會改變選戰節奏；先看證據強弱，也想好原本的拉票行程要延後多久。';
 return'';
}
function resolve(G,s,id,context={}){return view(G,s,context)?.options.find(o=>o.id===id)||null;}
function render(G,s,context={}){const v=view(G,s,context);if(!v)return'';const current=v.steps.findIndex(x=>!x.done);return'<section class="staff-advisor" aria-label="幕僚本回合建議"><div class="advisor-head"><b>幕僚小葉</b><span>主力：'+escape(v.base)+'</span></div><p class="advisor-goal">'+escape(v.explicit?'你開局的安排：':'依基本盤建議：')+escape(v.goal)+'</p><ol class="advisor-steps">'+v.steps.map((x,i)=>'<li data-state="'+(x.done?'done':i===current?'current':'later')+'">'+(x.done?'✓ ':'')+escape(x.title)+'</li>').join('')+'</ol>'+(v.change?'<p class="advisor-change">'+escape(v.change)+'</p>':'')+(v.rumor?'<p class="advisor-rumor"><b>對手情報</b> '+escape(v.rumor.text)+'（'+escape(v.rumor.reliability)+'）</p>':'')+'<p class="advisor-advice">'+escape(v.advice)+'</p><div class="advisor-options">'+v.options.map(o=>'<button data-action="advisor-select" data-id="'+escape(o.id)+'"><b>'+escape(o.title)+' →</b><span>'+escape(o.reason)+'</span><small>取捨：'+escape(o.cost)+'</small></button>').join('')+'</div><p class="advisor-foot">可安排 '+v.active+' 位助手'+(v.waiting?'・'+v.waiting+' 位下回合到職':'')+'；建議可改，也能直接點地圖。</p></section>';}
return{view,selected,resolve,render};
});
