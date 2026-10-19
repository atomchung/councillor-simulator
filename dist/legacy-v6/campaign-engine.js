/* 晴川三日競選 v6 — deterministic, local-only fictional game rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CampaignGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=6,DAYS=3,POPULATION=180;
const PARTIES={kmt:{name:'國民黨'},dpp:{name:'民進黨'},independent:{name:'無黨籍'}};
const FACTS=[
{id:'schedule',title:'工期尚未核定',text:'晴川轉運站仍在審議，公開文件沒有核定完工日。'},
{id:'budget',title:'經費還是初估',text:'提案的初估經費包含維護費，仍須審議財源與後續支出。'},
{id:'authority',title:'議員能做什麼',text:'候選人能提出主張；當選後可提案與監督，不能自行核款或命令開工。'}];
const LOCS=[{id:'school',name:'資料室'},{id:'market',name:'街角'},{id:'hall',name:'攝影棚'},{id:'park',name:'募款桌'},{id:'home',name:'團隊工作室'}];
const ACTIONS=[
{id:'prepare',title:'準備政見',cost:0,loc:'school',description:'讀一份公開資料，把轉運站提案的限制弄清楚。',benefit:'取得一條具體資料；之後上節目能引用，團隊也能協助查資料。',risk:'一天沒有大型曝光。資料都讀過後，只是複習，不會再新增。'},
{id:'canvass',title:'街頭拜訪',cost:60,loc:'market',description:'到街角說明提案，也聽居民追問。',benefit:'讓一些人認識你；有準備時能回答得更具體。',risk:'下雨或遇到重複的面孔，接觸會少一些。交流不保證支持。'},
{id:'tv',title:'上電視節目',cost:120,loc:'hall',description:'接受節目訪問，回答關於轉運站的問題。',benefit:'曝光較廣；引用已查資料可以釐清舊承諾。',risk:'未查證的保證會被記住，隔日可能遭追問；曝光不等於支持。'},
{id:'fundraise',title:'公開募款',cost:0,loc:'park',description:'花一天說明競選用途，收下沒有附加政策條件的小額支持。',benefit:'本次可得到 80–180 遊戲元，為後兩天保留選擇。',risk:'整天不能做其他主要行動，募到多少由本局種子決定。'},
{id:'recruit',title:'招募夥伴',cost:100,loc:'home',description:'和小葉約好工作範圍，成立一個小團隊。',benefit:'從隔日起，每天可另付 40 遊戲元，請夥伴查一份資料或做少量街訪。',risk:'招募本身占一天；夥伴不免費、不替你作政策保證，最後一天招募來不及協助。'}];
const PROFILES=[
{id:'research',name:'林禾',species:'cat',title:'資料準備型',strength:'已讀過一份資料',cash:220,recognition:16,known:['schedule'],weights:[3,2,3,2,1]},
{id:'street',name:'周沐',species:'deer',title:'熟面孔型',strength:'起初比你更常被認出',cash:170,recognition:30,known:[],weights:[1,5,2,2,1]},
{id:'team',name:'禾里',species:'rabbit',title:'小隊協作型',strength:'已有一位需付費的夥伴',cash:180,recognition:15,known:[],weights:[2,3,2,3,1]}];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rand=(seed,...parts)=>{let h=(2166136261^(Number(seed)>>>0))>>>0;const t=parts.join('|');for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return(h>>>0)/4294967296;};
function initial(seed,party='independent'){
 seed=Number(seed)>>>0;if(!PARTIES[party])party='independent';const p=PROFILES[Math.floor(rand(seed,'profile')*PROFILES.length)];
 const rivalParty=party==='kmt'?'dpp':party==='dpp'?'kmt':rand(seed,'party')<.5?'kmt':'dpp';
 const actor=(id,name,party,cash,recognition,known)=>({id,name,party,cash,recognition,known:[...known],team:null,promises:[],actions:[],counts:{},credibility:0});
 const player=actor(0,'阿夏',party,220,24,[]),rival=actor(1,p.name,rivalParty,p.cash,p.recognition,p.known);
 Object.assign(rival,{profile:p.id,profileTitle:p.title,strength:p.strength,species:p.species});if(p.id==='team')rival.team={hiredDay:0};
 const voters=Array.from({length:POPULATION},(_,i)=>({support:[.30+rand(seed,'initial-player',i)*.12,.23+rand(seed,'initial-rival',i)*.10],precision:rand(seed,'precision',i),attention:rand(seed,'attention',i),turnout:.57+rand(seed,'turnout-propensity',i)*.28}));
 return{version:VERSION,seed,started:false,day:1,phase:'play',player,rival,voters,polls:[],journal:[],recap:null,result:null};
}
function poll(s,day){const counts=[0,0,0],n=40;for(let j=0;j<n;j++){const v=s.voters[Math.floor(rand(s.seed,'poll-person',day,j)*s.voters.length)],r=rand(s.seed,'poll-answer',day,j);counts[r<v.support[0]?0:r<v.support[0]+v.support[1]?1:2]++;}return{day,n,counts,percentages:counts.map(x=>Math.round(x/n*1000)/10)};}
function start(s){if(s.started||s.version!==VERSION)return false;s.started=true;s.polls.push(poll(s,0));return true;}
function weather(s){const r=rand(s.seed,'weather',s.day);return r<.28?{id:'rain',title:'午後陣雨',text:'街訪停留的人較少，兩位候選人都受影響。',street:.78,tv:1}:r<.55?{id:'focus',title:'城市議題上新聞',text:'今天節目多留了一點時間給轉運站議題，雙方適用相同效果。',street:1,tv:1.12}:{id:'ordinary',title:'普通的一天',text:'沒有額外的城市事件，行程照常。',street:1,tv:1};}
function previewActor(s,actor,id,config={}){const a=ACTIONS.find(x=>x.id===id);if(!a)return null;const requested=['research','canvass'].includes(config.teamTask)?config.teamTask:'off';const teamAvailable=!!actor.team&&actor.team.hiredDay<s.day;const teamTask=teamAvailable?requested:'off';const teamCost=teamTask==='off'?0:40;const note=!actor.team?'尚未招募夥伴。':!teamAvailable?'剛招募的夥伴明天才開始協助。':teamTask==='off'?'今天不額外派工，不收協助費。':teamTask==='research'?'另付 40，夥伴先查一份資料；今天的主行動就能引用。':'另付 40，夥伴做一次少量街訪，不替你作承諾。';return{...a,baseCost:a.cost,cost:a.cost+teamCost,totalCost:a.cost+teamCost,teamCost,teamAvailable,teamTask,teamNote:note,mode:config.mode==='guarantee'?'guarantee':'clear'};}
function preview(s,id,config={}){return previewActor(s,s.player,id,config);}
function validActor(s,a,id,config={}){const p=previewActor(s,a,id,config);return!!p&&a.cash>=p.totalCost&&!(id==='recruit'&&a.team);}
function canAct(s,id,config={}){return!!(s.started&&s.phase==='play'&&s.day<=DAYS&&validActor(s,s.player,id,config));}
function learn(a){const f=FACTS.find(f=>!a.known.includes(f.id));if(f)a.known.push(f.id);return f;}
function effect(s,a,reach,quality,guarantee=false){const prior=a.counts[a.currentAction]||0;const factor=1/(1+prior*.3);const actual=reach*factor;for(const v of s.voters){let delta=actual*.002*(.65+v.attention*.7)*quality;if(guarantee)delta+=actual*.0012*(.48-v.precision);delta+=a.credibility*.00015;v.support[a.id]=clamp(v.support[a.id]+delta,.02,.88);const sum=v.support[0]+v.support[1];if(sum>.94){v.support[0]*=.94/sum;v.support[1]*=.94/sum;}}a.recognition=clamp(a.recognition+Math.round(actual),0,99);return actual;}
function clarify(s,a){const pending=a.promises.filter(p=>p.status==='pending'||p.status==='unresolved');if(!pending.length)return[];pending.forEach(p=>{p.status='corrected';p.correctedDay=s.day;});return['已公開更正先前的工期保證：仍須審議，原話與更正都保留。這不代表工程完成，也不直接補票。'];}
function perform(s,a,id,config={}){
 if(!validActor(s,a,id,config))return null;const p=previewActor(s,a,id,config),before=a.recognition,w=weather(s),lines=[],callbacks=[];a.cash-=p.totalCost;let income=0;a.currentAction=id;
 if(p.teamTask==='research'){const f=learn(a);lines.push(f?`${a.id===0?'小葉':'夥伴'}先查到「${f.title}」：${f.text}`:'夥伴核對舊資料，沒有新增已知事項。');}
 if(p.teamTask==='canvass'){effect(s,a,4,.65);lines.push(`${a.id===0?'小葉':'夥伴'}完成約定範圍的一次街訪，沒有替候選人許下新保證。`);}
 const luck=.90+rand(s.seed,'action-luck',s.day,a.id,id)*.20;let reason='',result='';
 if(id==='prepare'){const f=learn(a);effect(s,a,2,.35);result=f?`查到「${f.title}」：${f.text}`:'三份關鍵資料已讀完；今天複核內容，沒有新增資料。';reason='準備占掉今天的主要行程，但後續節目與街訪能引用具體內容。';}
 if(id==='canvass'){const known=a.known.length;effect(s,a,11*w.street*luck,.68+known*.12);result=known?`居民追問轉運站。你引用「${FACTS.find(f=>f.id===a.known[0]).title}」，把已知與未知說清楚。`:'有人想知道轉運站何時完工。你記下問題，坦白還沒有查完資料。';reason=`${w.id==='rain'?'陣雨縮短了街訪；':'現場願意停留的人數有些變動；'}${known?'已有資料讓回答更具體。':'這次先建立認識，沒有把未知工期說成保證。'}`;}
 if(id==='tv'){
  if(p.mode==='guarantee'){effect(s,a,21*w.tv*luck,.7,true);a.promises.push({id:`schedule-${s.day}`,text:'公開保證尚未核定的轉運站工期',due:s.day+1,status:'pending',madeDay:s.day});result='你保證了尚未核定的工期。有人覺得明快，也有人質疑你憑什麼保證；這句話進了承諾簿。';reason='強烈說法增加注意，但對可信度的反應不同；隔日需要回應，沒有固定加票。';}
  else{const known=a.known.length;effect(s,a,18*w.tv*luck,known?1.10:.55);callbacks.push(...clarify(s,a));result=known?`主持人追問轉運站，你引用「${FACTS.find(f=>f.id===a.known[0]).title}」：${FACTS.find(f=>f.id===a.known[0]).text}`:'主持人追問工期，你說明尚未查完，不作保證。觀眾聽見你，但回答仍欠具體資料。';reason=known?'先前準備現在派上用場，觀眾能看到主張的依據與限制。':'節目帶來曝光；缺少具體資料，理解效果較有限。';}
 }
 if(id==='fundraise'){income=80+Math.floor(rand(s.seed,'fundraising',s.day,a.id)*101);a.cash+=income;effect(s,a,2,.25);result=`收到 ${income} 遊戲元的一般小額支持，沒有附加政策條件。`;reason='你用一天換取後續行動空間；金額由本局固定種子決定，重讀或關閉視窗不會重抽。';}
 if(id==='recruit'){a.team={hiredDay:s.day};effect(s,a,2,.3);result=s.day<DAYS?'夥伴加入。明天起可另付 40 遊戲元，請他查資料或做少量街訪。':'夥伴加入，但這是最後一天，這局已沒有可派工的明天。';reason='100 遊戲元與一天用於建立工作安排；協助從次日開始，每次另付費。';}
 a.counts[id]=(a.counts[id]||0)+1;delete a.currentAction;a.actions.push({day:s.day,id,mode:p.mode,teamTask:p.teamTask,cost:p.totalCost,income});
 return{title:p.title,action:id,cost:p.totalCost,baseCost:p.baseCost,teamCost:p.teamCost,income,recognitionDelta:a.recognition-before,result,reason,teamNote:lines.join(' '),callbacks};
}
function rivalPlan(s){const a=s.rival,profile=PROFILES.find(p=>p.id===a.profile);let options=ACTIONS.map((x,i)=>({id:x.id,weight:profile.weights[i]})).filter(x=>validActor(s,a,x.id,{}));if(a.cash<120)options.forEach(x=>{if(x.id==='fundraise')x.weight+=5;});if(s.day===DAYS)options=options.filter(x=>x.id!=='recruit');if(a.known.length)options.forEach(x=>{if(x.id==='tv')x.weight+=2;});if(a.promises.some(p=>['pending','unresolved'].includes(p.status))&&a.known.length)options.forEach(x=>{if(x.id==='tv')x.weight+=6;});const total=options.reduce((n,x)=>n+x.weight,0);let draw=rand(s.seed,'rival-choice',s.day)*total;let id=options[options.length-1].id;for(const x of options){draw-=x.weight;if(draw<0){id=x.id;break;}}
 let teamTask='off';if(a.team&&a.team.hiredDay<s.day&&a.cash>=ACTIONS.find(x=>x.id===id).cost+40&&rand(s.seed,'rival-helper',s.day)<.7)teamTask=a.known.length?'canvass':'research';const mode=id==='tv'&&!a.known.length&&rand(s.seed,'rival-mode',s.day)<.3?'guarantee':'clear';return{id,config:{teamTask,mode},reason:`${profile.title}的本日安排；從付得起的行動中抽選${a.cash<120?'，現金有限讓募款機率提高':''}。`};}
function deadlines(s){const lines=[];for(const a of[s.player,s.rival])for(const p of a.promises){if(p.status==='pending'&&p.due<=s.day){p.status='unresolved';a.credibility-=1;for(const v of s.voters)v.support[a.id]=clamp(v.support[a.id]-.004*v.precision,.02,.88);lines.push(`${a.name}仍未釐清先前的工期保證，承諾簿標為「待說明」；部分居民更保留。`);}}return lines;}
function play(s,id,config={}){if(!canAct(s,id,config))return false;const player=perform(s,s.player,id,config),plan=rivalPlan(s),rival=perform(s,s.rival,plan.id,plan.config);rival.reason+=` ${plan.reason}`;const callbacks=[...player.callbacks,...rival.callbacks.map(x=>`${s.rival.name}：${x}`),...deadlines(s)];const sampled=poll(s,s.day);s.polls.push(sampled);s.recap={day:s.day,player,rival,poll:sampled,weather:weather(s),callbacks};s.journal.push(JSON.parse(JSON.stringify(s.recap)));s.phase='recap';return s.recap;}
function finish(s){const tally=[0,0];let abstain=0;for(let i=0;i<s.voters.length;i++){const v=s.voters[i];if(rand(s.seed,'election-turnout',i)>=v.turnout){abstain++;continue;}const ballot=rand(s.seed,'election-ballot',i);if(ballot<v.support[0])tally[0]++;else if(ballot<v.support[0]+v.support[1])tally[1]++;else abstain++;}const pending=s.player.promises.filter(p=>p.status==='pending'||p.status==='unresolved');const knowledge=s.player.known.map(id=>FACTS.find(x=>x.id===id).title);const reflection=[s.player.known.length?`你共查到 ${s.player.known.length} 份資料；有沒有及時引用，可在逐日紀錄看到。`:'你把有限天數放在其他行程，沒有查到新的資料。',s.player.actions.some(x=>x.teamTask!=='off')?'團隊確實完成了付費的平行協助。':s.player.team?'你成立了團隊，但沒有實際派工。':'你獨自完成了這三天。',pending.length?`仍有 ${pending.length} 句工期保證待說明。`:'沒有尚待說明的工期保證。','民調是 40 人的小樣本；開票另抽投票與選擇，不能把變化精確歸因給單一答案。'].join(' ');return{tally,abstain,total:s.voters.length,winner:tally[0]===tally[1]?'tie':tally[0]>tally[1]?'player':'rival',lastPoll:s.polls[s.polls.length-1],reflection,cash:s.player.cash,pending,knowledge,actions:s.player.actions.map(x=>({...x,title:ACTIONS.find(a=>a.id===x.id).title}))};}
function next(s){if(!s.started||s.phase!=='recap')return false;if(s.day<DAYS){s.day++;s.phase='play';s.recap=null;}else{s.result=finish(s);s.phase='result';}return true;}
function status(a){return[`${a.known.length} 份已查資料${a.known.length?'：'+a.known.map(id=>FACTS.find(f=>f.id===id).title).join('、'):''}`,a.team?'已有夥伴，協助每次另付 40 遊戲元':'尚未招募夥伴',...a.promises.map(p=>`${p.text}：${p.status==='corrected'?'已更正並留原紀錄':p.status==='unresolved'?'待說明':`第 ${p.due} 天需回應`}`)];}
return{VERSION,DAYS,POPULATION,PARTIES,FACTS,LOCS,ACTIONS,PROFILES,initial,start,preview,canAct,play,next,status,rand,samplePoll:poll,finish,previewActor,performActor:perform,rivalPlan};
});
