/* Nine or ten compressed campaign rounds: original fictional simulation, no real election prediction. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DayGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=13,REVISION='13.8.0',POPULATION=1000;
// Node uses environment variables; the browser may set the same globals before loading this file.
const ROUNDS=(()=>{const raw=Number((typeof process!=='undefined'&&process.env&&process.env.COUNCILLOR_ROUNDS)||(typeof globalThis!=='undefined'&&globalThis.COUNCILLOR_ROUNDS)||9);return[9,10].includes(raw)?raw:9;})();
// Safe pace only speeds fact-check follow-ups and billboard payback in a nine-round campaign.
const PACE_MODE=(()=>{const raw=String((typeof process!=='undefined'&&process.env&&process.env.COUNCILLOR_PACE)||(typeof globalThis!=='undefined'&&globalThis.COUNCILLOR_PACE)||'safe');return['none','safe'].includes(raw)?raw:'safe';})();
const SCHEDULE=(n=>({rounds:n,debate:n-2,gotvFrom:n-1,polls:{party:[2,4,6,8].filter(d=>d<n),independent:[3,n-3]},aid:{subsidyDay:Math.ceil(n/2),mobilizeDay:n-1},offers:[[2,3],[n-5,n-4]],surge:{from:4,span:n-6},scandal:{from:5,to:n-1},pace:{chiefEase:0,researchLag:1,verifyDelay:n<10&&PACE_MODE==='safe'?1:2,billboardLag:n<10&&PACE_MODE==='safe'?0:1}}))(ROUNDS);
const DAYS=SCHEDULE.rounds,ROUND_DAYS=30/DAYS,DEBATE_ROUND=SCHEDULE.debate;
// Tunable v13 balance values; tests/strategy-balance.cjs is the gate for any change here.
const TUNING={unprepared:{scale:.6,penalty:.006},clarify:.4,billboardFit:{match:1.4,miss:.5},debateEdge:.005,gotv:1.12,crisis:{apology:.02,sample:.5,fight:.012,pay:.35},clean:.012,booth:[10000,45000],follow:{step:.25,floor:.2},offerBloc:.5,careMatch:.1,careMiss:-.3,otherMatch:0,otherMiss:-.006,careBoost:1.5,promise:{likes:{guarantee:.012,honest:-.004},mixed:{guarantee:.002,honest:.004},dislikes:{guarantee:-.05,honest:.008}},lift:{fresh:3,distrust:.85},party:{base:{same:{kmt:1.27,dpp:1.78},opposite:.7},receptive:{same:{kmt:1.08,dpp:1.29},opposite:.85,swing:1.08},keep:.012,break:.025},receptivityHit:.6,receptivityFloor:.3,unkept:{exposed:.045,quiet:0,corrected:.02},attackNow:.012,attackExpired:.03,rebuttal:.012,flip:.03,breach:.03,counter:{rival:.02,backlash:.01,gain:.008},expose:{rival:-.012,you:.009,share:.5},developer:{young:-.004},studied:1.35,preempt:.5,surgeShare:.5,rumorAccuracy:.8,attackGuarantee:.7,rivalReads:.7,emptyChair:1.4,offerRivalTake:.6,steal:.1,reheard:.35,recentAsk:[.35,.6],reach:{tv:640,canvass:144,team:22,debate:520,offer:90,rally:238,billboard:60,press:300,online:280},depth:{tv:1,canvass:1.2,team:.5,debate:.9,offer:.8,rally:.8,billboard:.5,press:.7,online:.5},viral:[.25,.5,.8,1,1,1.3,1.8,2.6],streamers:2,chief:{cold:.65,warm:1.25,bloc:400,tire:.5},gotvShare:{place:.3,tv:.2},rally:{match:.03,miss:-.03,open:0,goodwill:.012,fatigue:.8},gifts:{reach:1.25,bonus:{elder:.008,middle:.003,young:.001}},billboard:.012,crowd:.6,youngStreet:.1,estimateSpread:.1,voteNoise:.05,newcomerNoticed:.8,cool:{rate:.015,touch:.2,poach:.5},crew:[.55,.75,1,1.15,1.25],fundraise:{base:[40000,90000],miss:{newcomer:.3,heir:.1,incumbent:.15},missIncome:[5000,25000],perVisit:.06,maxTies:.48},pressFlop:{chance:.25,scale:.35},dealCost:{temple:{group:"middle",share:.6,hit:.01,rec:.85},chiefs:{group:"young",share:.6,hit:.01,rec:.85}},startBoost:1.4};
// TV viewers are older, online followers younger.
const MEDIA_LEAN={tv:[1.3,1.1,.45],online:[.25,.6,2.6]};
const COSTS={tv:180000,rally:220000,gifts:30000,billboard:200000,tipCheck:40000,scout:20000,brief:80000,clarify:80000,crisis:120000,gotv:120000,dig:100000},MAX_BILLBOARDS=3,GOTV_FROM=SCHEDULE.gotvFrom;
// Three acts: setting out and finding money, the mid-campaign fights, the debate and the final push.
const ACTS=[{id:1,title:'第一幕・立人設與摸底',from:1,to:3},{id:2,title:'第二幕・風向與攻防戰',from:4,to:DAYS-3},{id:3,title:'第三幕・決戰與封關催票',from:DAYS-2,to:DAYS}];
const actOf=day=>ACTS.find(a=>day>=a.from&&day<=a.to)||ACTS[2];
// Sixteen local issues; each game draws twelve. Each group's top concern (health, childcare, housing) is always in play.
const POLICY_TOPICS=['health','childcare','housing','traffic','senior','access','sanitation','renewal','hillside','vacancy','temple_fest','mrt','incinerator','zoo','nightlife','pets'],CORE_TOPICS=['health','childcare','housing'],ACTIVE_COUNT=12;
const topicsOf=s=>s?.landscape?.active?(s.landscape.news?.length?[...s.landscape.active,...s.landscape.news]:s.landscape.active):POLICY_TOPICS;
// Three fictional voter groups. What each group cares about follows common sense and is set by design; group sizes,
// which approach each prefers and how each takes bold promises are drawn per game. Nothing comes from survey data.
const GROUPS=[{id:'elder',title:'長輩'},{id:'middle',title:'中年'},{id:'young',title:'青年'}];
const GROUP_CARES={elder:{health:3,senior:2,temple_fest:1.4,incinerator:1.2,traffic:1.2,sanitation:1,access:1,renewal:1,pets:.6,mrt:.6,zoo:.5,hillside:.5,nightlife:.5,childcare:.3,housing:.3,vacancy:.3},middle:{childcare:3,traffic:2.2,mrt:1.6,access:1.2,sanitation:1,renewal:1,zoo:.9,incinerator:.9,hillside:.8,health:.8,temple_fest:.7,housing:.6,pets:.6,senior:.4,vacancy:.4,nightlife:.4},young:{housing:3,vacancy:1.8,nightlife:1.6,pets:1.4,traffic:1.2,mrt:1.2,childcare:1,hillside:.9,sanitation:.7,access:.6,zoo:.6,renewal:.5,temple_fest:.5,incinerator:.4,health:.3,senior:.2}};
const ATTITUDES={likes:{id:'likes',title:'會買單',text:'聽到保證會加分。'},mixed:{id:'mixed',title:'看情況',text:'保證和坦白都小加分。'},dislikes:{id:'dislikes',title:'反感',text:'聽到保證會扣分，坦白反而加分。'}};
const LEANS=[.2,.35,.65,.8];
// Each group's side on each approach follows its own interests (0 = the first approach): elders back benefits for the old, the young
// back youth policies and resist spending on the old, elders resist new spending on the young; every approach has at least one group
// behind it, and the majority backs the first approach on about half the issues. On these issues only the strength varies by game;
// on the contested ones (CONTESTED, below) each group's side is drawn per game as well.
const LEAN_SIDES={elder:{health:1,childcare:0,housing:0,traffic:1,senior:1,access:0,sanitation:1,renewal:0,hillside:1,vacancy:1,temple_fest:1,mrt:0,incinerator:1,zoo:0,nightlife:1,pets:1},middle:{health:0,childcare:1,housing:1,traffic:0,senior:1,access:0,sanitation:0,renewal:1,hillside:0,vacancy:0,temple_fest:0,mrt:1,incinerator:0,zoo:1,nightlife:1,pets:1},young:{health:0,childcare:1,housing:0,traffic:1,senior:0,access:1,sanitation:0,renewal:1,hillside:0,vacancy:0,temple_fest:0,mrt:1,incinerator:0,zoo:1,nightlife:0,pets:0}};
const STRONG_LEANS={elder:['health','senior','temple_fest'],middle:['childcare','traffic','mrt'],young:['housing','senior','vacancy','nightlife']};
// Generational resentment: people who do not care about an issue still mark you down for a benefit aimed at another generation.
const OPPOSE={all65:{young:-.03,middle:-.012},points:{young:-.03},social:{elder:-.015},daycare:{elder:-.01},cash:{young:-.015},tradition:{young:-.015},curfew:{young:-.02}};
// Real-scale district: the 2022 Taipei sixth district (Da'an and Wenshan), 13 seats and 27 candidates. The 25 background
// candidates follow that year's vote distribution. 小馬 is a frontrunner in last election's tenth place; you take the place of a loser.
const ELECTION={district:'臺北市大安文山區',registered:430492,seats:13,candidates:27,turnout:.68,invalid:.0259,background:[30325,28417,21888,20742,19340,18253,17489,15074,14309,11811,11603,10693,9081,8774,4630,4332,3883,3433,3203,2221,991,866,392,316,165],reference:{year:2022,lastSeat:10693,firstLoser:9081,valid:285102,cast:292673,turnout:.6799,partyShares:{kmt:.462,dpp:.238}},source:{title:'2022 年臺北市議員選舉第六選舉區開票結果',url:'https://zh.wikipedia.org/zh-tw/2022%E5%B9%B4%E8%87%BA%E5%8C%97%E5%B8%82%E8%AD%B0%E5%93%A1%E9%81%B8%E8%88%89'}};
// Each synthetic voter stands for about 430 registered voters; this is the valid votes one of them is expected to cast.
const PER_VOTER=ELECTION.registered/POPULATION*ELECTION.turnout*(1-ELECTION.invalid),LINE=ELECTION.reference.lastSeat;
const RULES={deposit:160000,seats:ELECTION.seats,eligible:ELECTION.registered,district:ELECTION.district};
// Hosts ask about the problem only. A resident states their group's demand (VOICES) only once you have researched the issue;
// before that they describe what is wrong (PAINS), so the question never gives away the approach their group wants.
const TOPICS={
 health:{id:'health',title:'長輩健保費',short:'健保',ask:'健保費越來越重，你打算怎麼幫長輩？',demand:['退休後健保費一年好幾萬，至少先幫收入少的長輩出吧？','我們繳了一輩子健保，65 歲以上應該全免！'],plans:[{id:'needs',text:'先補助中低收入長輩的健保費',detail:'花得少、先照顧最需要的人，但很多長輩拿不到。'},{id:'all65',text:'65 歲以上健保費全額補助',detail:'人人有份，但每年要多找一大筆錢。'}],guarantee:'我保證下個月起 65 歲以上健保全免'},
 childcare:{id:'childcare',title:'0–6 歲育兒',short:'育兒',ask:'小孩誰來顧、錢從哪裡來，你要怎麼幫？',demand:['養小孩什麼都貴，每個月的育兒津貼能不能再多一點？','公托抽不到、私托太貴，能不能多開平價托育？'],plans:[{id:'cash',text:'每月多發育兒津貼',detail:'錢直接到家長手上，但托育名額還是不夠。'},{id:'daycare',text:'多開公托和平價托育',detail:'解決沒地方送的問題，但蓋好要時間。'}],guarantee:'我保證每個孩子每月多領 5,000 元'},
 housing:{id:'housing',title:'青年居住',short:'居住',ask:'年輕人租不起也買不起，你要怎麼辦？',demand:['房租一直漲，租金補貼的門檻能不能放寬？','我要住得穩，能不能多蓋只租不賣的社宅？'],plans:[{id:'rent',text:'放寬租金補貼門檻',detail:'很快能幫到人，但房東可能跟著漲價。'},{id:'social',text:'多蓋只租不賣的社宅',detail:'長期最穩，但要等好幾年。'}],guarantee:'我保證兩年內每個青年都住得起社宅'},
 traffic:{id:'traffic',title:'保儀路口與通勤',short:'交通',ask:'上下班、接送都要過保儀路口，你要怎麼改？',demand:['保儀路口綠燈太短，每天過馬路都很危險，先把燈號改長好嗎？','這個路口根本設計錯了，要整個重新規劃！'],plans:[{id:'signal',text:'先延長行人綠燈、加派導護',detail:'馬上有感，但塞車問題還在。'},{id:'redesign',text:'路口重新設計、人車分流',detail:'根本解決，但施工期間更塞。'}],guarantee:'我保證下個月保儀路口全部改好'},
 senior:{id:'senior',title:'敬老卡',short:'敬老卡',ask:'敬老卡你打算怎麼改？',demand:['敬老卡點數常常不知道能用在哪，能不能多一些地方可以刷？','600 點根本不夠用，能不能再加碼？'],plans:[{id:'places',text:'增加敬老卡能刷的地方',detail:'點數不變但更好用，有人嫌不夠。'},{id:'points',text:'爭取敬老卡點數加碼',detail:'長輩有感，但要多花一筆預算。'}],guarantee:'我保證敬老卡點數下個月加倍'},
 access:{id:'access',title:'市場卸貨',short:'市場',ask:'市場口每天都卡住，你要怎麼處理？',demand:['早上貨車卸貨跟人搶路，能不能規定卸貨時段？','市場口每天都塞，卸貨點能不能移到旁邊？'],plans:[{id:'window',text:'規定早上卸貨時段',detail:'攤商照樣能進貨，但時段外更擠。'},{id:'clear',text:'市場口淨空、卸貨點外移',detail:'走路安全，但攤商要多搬一段。'}],guarantee:'我保證下個月市場口再也不塞'},
 sanitation:{id:'sanitation',title:'防鼠與清潔',short:'防鼠',ask:'老鼠越來越多，你要怎麼處理？',demand:['巷子垃圾到處是，老鼠都跑出來了，先把環境清乾淨！','老鼠太多了，直接請專業的來滅鼠啦！'],plans:[{id:'clean',text:'加強清潔、垃圾不落地',detail:'治本，但要大家配合。'},{id:'target',text:'請專業滅鼠、重點投藥',detail:'見效快，但有人擔心安全。'}],guarantee:'我保證下個月全市老鼠清光'},
 renewal:{id:'renewal',title:'老屋都更',short:'都更',ask:'木柵老公寓沒電梯又老舊，都更你怎麼看？',demand:['房子都四十年了，容積獎勵放寬一點，讓我們早點改建啦！','都更不能只讓建商賺，要回饋公托、公園才准蓋！'],plans:[{id:'bonus',text:'放寬老屋都更容積獎勵、加速改建',detail:'老屋屋主有感，但房價可能更貴。'},{id:'strict',text:'嚴審容積，要求回饋公托才准蓋',detail:'社區拿到回饋，但改建會慢很多。'}],guarantee:'我保證明年木柵老屋全部開始都更'},
 hillside:{id:'hillside',title:'貓空山坡地',short:'山坡地',ask:'貓空茶園越來越少人接，大雨一來山腳又怕土石流，你怎麼看？',demand:['山坡地亂蓋，下大雨土石流誰負責？先做水保！','茶園都沒人接了，開放觀光開發才有收入啦！'],plans:[{id:'protect',text:'山坡地維持禁建、先做水保滯洪',detail:'山腳比較安全，但地主和茶農不滿。'},{id:'develop',text:'開放景觀宅與觀光開發',detail:'帶來觀光收入，但土石流風險升高。'}],guarantee:'我保證三年內貓空變成國際觀光景點'},
 vacancy:{id:'vacancy',title:'空屋與租屋',short:'空屋',ask:'空屋那麼多，年輕人卻租不起，你怎麼辦？',demand:['空屋一堆租金還漲，囤房稅要調高、違規套房要查！','我們房東也要生活，給點減稅，我們就願意包租代管。'],plans:[{id:'hoard',text:'調高囤房稅、稽查違規套房',detail:'逼空屋出來，但房東可能轉嫁租金。'},{id:'landlord',text:'減稅鼓勵房東包租代管',detail:'房東願意釋出，但稅收少一塊。'}],guarantee:'我保證兩年內空屋全部釋出出租'},
 temple_fest:{id:'temple_fest',title:'繞境與鞭炮',short:'繞境',ask:'保儀大夫繞境又要到了，封路、鞭炮年年有人吵，你怎麼看？',demand:['繞境一年一次是傳統，路權跟鞭炮都不能少！','每次繞境整條路封掉、鞭炮放到半夜，能不能管一下？'],plans:[{id:'quiet',text:'繞境限時段、改用電子炮',detail:'住戶清靜，但廟方和信眾不滿。'},{id:'tradition',text:'保留傳統繞境路權與鞭炮',detail:'信眾開心，但怕吵的家庭會抱怨。'}],guarantee:'我保證繞境熱鬧又不吵到任何人'},
 mrt:{id:'mrt',title:'捷運施工',short:'捷運',ask:'捷運南環段施工塞成這樣，你要怎麼處理？',demand:['半夜施工吵得睡不著，路邊也不能停，生意怎麼做？','工期拖太久了，日夜趕工早點通車啦！'],plans:[{id:'daytime',text:'禁夜間施工、保留商家臨停',detail:'晚上安靜、店家好做生意，但工期拉長。'},{id:'rush',text:'日夜趕工縮短工期',detail:'早點通車，但沿線晚上很吵。'}],guarantee:'我保證南環段提前兩年通車'},
 incinerator:{id:'incinerator',title:'焚化廠回饋金',short:'回饋金',ask:'焚化廠回饋金要怎麼用？',demand:['回饋金拿去改善空污、蓋親子公園，大家都受惠。','回饋金直接發給里民最實在，水電費都在漲！'],plans:[{id:'green',text:'回饋金做空污防制和親子公園',detail:'大家都用得到，但看不到現金。'},{id:'cash',text:'回饋金直接發給里民',detail:'馬上有感，但錢花完就沒了。'}],guarantee:'我保證每戶每年多領一萬回饋金'},
 zoo:{id:'zoo',title:'動物園停車',short:'動物園',ask:'假日動物園周邊塞爆，你要怎麼改？',demand:['外地車都來停我們巷子，停車費調高、遊覽車不准進來！','停車位根本不夠，蓋立體停車場，順便辦市集帶人潮！'],plans:[{id:'limit',text:'假日調高外客停車費、遊覽車不進社區',detail:'社區清靜，但店家少了生意。'},{id:'parking',text:'蓋立體停車場、辦星光市集',detail:'帶來人潮和生意，但車更多。'}],guarantee:'我保證假日動物園周邊再也不塞'},
 nightlife:{id:'nightlife',title:'夜間生活',short:'夜生活',ask:'政大周邊一到晚上，學生沒地方去、住戶又嫌吵，你怎麼看？',demand:['晚上沒地方去，多設共享機車位、河濱開放夜間活動！','半夜改裝車跟宵夜店吵死了，十點後要嚴格抓！'],plans:[{id:'open',text:'增設共享機車位、開放河濱夜間活動',detail:'年輕人有去處，但住戶怕吵。'},{id:'curfew',text:'晚上 10 點後嚴抓改裝車和噪音',detail:'住戶睡得好，但學生覺得被管太多。'}],guarantee:'我保證河濱晚上又熱鬧又安靜'},
 pets:{id:'pets',title:'流浪犬貓',short:'犬貓',ask:'流浪狗貓越來越多，你打算怎麼辦？',demand:['設寵物公園、做 TNR，讓牠們好好生活！','河濱常被狗追，小孩都不敢去，要捕捉、禁止餵食！'],plans:[{id:'tnr',text:'設河濱寵物公園、推動 TNR',detail:'友善動物，但怕狗的人還是擔心。'},{id:'capture',text:'捕捉遊蕩犬、公園禁餵食',detail:'公園安全，但愛護動物的人反彈。'}],guarantee:'我保證一年內街上再也沒有流浪狗'},
 tip:{id:'tip',title:'小馬經費爆料',short:'爆料',ask:'有人寄來資料，說小馬的活動經費重複請款。',plans:[]}
};
// Why someone in each group wants each approach, in their own words; on a researched issue the majority's line is what a resident says.
const VOICES={
 health:{elder:['隔壁阿婆收入少，健保費快繳不出來，先幫她們啦。','我們繳了一輩子健保，65 歲以上全免才公平！'],middle:['錢要花在刀口上，先幫真的繳不起的長輩。','爸媽的健保費都是我在繳，全免我也輕鬆一點。'],young:['全部免費以後誰來付？先補最需要的就好。','阿公阿嬤不用煩惱，我們做晚輩的也安心。']},
 childcare:{elder:['我幫忙顧孫，津貼多一點，媳婦就不用那麼累。','我年紀大了顧不動，附近要有公托才行。'],middle:['奶粉尿布什麼都漲，每個月津貼多一點最實在。','公托抽了三次都沒中，私托一個月兩萬多。'],young:['想生又怕養不起，津貼多一點才敢生。','生了要回去上班，沒地方送就只能辭職。']},
 housing:{elder:['社宅不知道蓋到哪年，先補房租比較實在。','孫子說租不起要搬走，蓋社宅才留得住年輕人。'],middle:['孩子剛出社會在外面租，補貼門檻放寬就幫到了。','房東年年漲，社宅才是長久之計。'],young:['社宅抽不到，房租現在就付不出來。','補貼一下來房東就漲價，我要住得穩的社宅。']},
 traffic:{elder:['綠燈太短，我走一半就變紅燈，先把燈改長。','這路口亂了幾十年，要改就整個改好。'],middle:['每天接送小孩過這裡，先加導護最快。','上班塞、接送也塞，路口重新規劃才會順。'],young:['騎車過這裡常被逼車，先改燈號、加人指揮。','修修補補沒用，人車分流才安全。']},
 senior:{elder:['點數夠用，是能刷的地方太少，市場、診所都要能用。','600 點坐幾趟車就沒了，要加碼啦。'],middle:['我媽的敬老卡常常用不到，多一些地方能刷比較好。','長輩出門看病都靠這張卡，點數該加了。'],young:['加點數要花錢，讓現有的點數好用一點就好。','阿嬤每個月都不夠用，加點數最直接。']},
 access:{elder:['攤販要進貨也要做生意，規定時段大家都方便。','貨車擦身而過好幾次，市場口一定要淨空。'],middle:['我家就是做攤販的，卸貨點移走根本搬不動。','推嬰兒車買菜還要閃貨車，太危險了，淨空啦。'],young:['攤商也要生存，定時段就好，不用整個移走。','市場口每天塞爆，騎車根本過不去，淨空最快。']},
 renewal:{elder:['房子老到沒電梯，我爬樓梯爬不動了，快點改建。','建商賺飽飽，我們拿什麼？要有回饋才行。'],middle:['早點都更，房子才有價值。','改建不能只多蓋豪宅，要有公托和公園。'],young:['都更快一點，至少有新房子可以租。','放寬容積只會讓房價更貴，要回饋社區。']},
 hillside:{elder:['我們住山腳，下大雨就怕，先把水保做好。','茶園都沒人接了，開放觀光才有收入。'],middle:['山坡地亂蓋，土石流下來我家首當其衝。','開發有工作機會，孩子不用跑去外地上班。'],young:['山就留著給大家走，不要再蓋景觀宅了。','觀光起來，貓空才會有年輕人想回來。']},
 vacancy:{elder:['空屋不出租太浪費，稅要課重一點。','我就靠收房租過日子，再加稅我怎麼辦？'],middle:['囤房的人不繳稅，年輕人永遠租不起。','給房東一點好處，大家才願意拿出來租。'],young:['套房又小又違規，租金還一直漲，該查了。','房東肯出租就好，減稅換租金不漲也行。']},
 temple_fest:{elder:['繞境是要讓大家安靜過日子，時段要控制好。','保儀大夫保佑我們幾十年，繞境當然要照傳統！'],middle:['繞境那天整條路封掉，我接小孩都繞好遠。','一年才一次，熱鬧一下有什麼關係。'],young:['鞭炮放到半夜，隔天還要上班，改電子炮啦。','繞境是木柵的特色，保留下來很酷。']},
 mrt:{elder:['半夜施工吵得我睡不著，晚上停工啦。','早點通車，我去看醫生就方便了。'],middle:['店門口不能臨停，生意少一半，晚上不要做了。','每天塞在施工路段，趕快做完比較實在。'],young:['我住工地旁邊，半夜還在打樁，真的受不了。','通勤一小時，捷運早一天通車都好。']},
 incinerator:{elder:['空氣顧好比較要緊，公園也讓孫子有地方玩。','回饋金直接發下來，水電費就不用煩惱了。'],middle:['錢拿去改善空污、蓋親子公園，全家都受惠。','發現金最直接，每個月都在算帳。'],young:['發現金只是買票，拿去改善環境比較好。','發現金我也領得到，有什麼不好。']},
 zoo:{elder:['假日外地車停滿巷子，我出門都不方便，費率調高。','蓋停車場、辦市集，社區熱鬧起來也好。'],middle:['巷子被外地車塞爆，遊覽車不要開進來。','帶小孩去動物園都找不到位子，蓋停車場吧。'],young:['人潮那麼多，社區住戶也要過日子。','辦星光市集超讚，週末終於有地方去。']},
 nightlife:{elder:['年輕人晚上有地方去，總比在巷子吵好。','半夜改裝車吵死了，十點以後要抓。'],middle:['讓學生有正當去處，就不會在巷口逗留。','我明天要上班，晚上十點後就該安靜。'],young:['晚上想騎車去河濱走走都沒車位，多設一點。','管太多了，學生區晚上本來就比較熱鬧。']},
 pets:{elder:['街貓結紮了就不會一直生，TNR 比較人道。','早上去運動常被狗追，要抓起來。'],middle:['設寵物公園，狗有地方跑就不會亂衝。','小孩在公園被狗追過，禁止餵食比較安全。'],young:['我家的貓就是 TNR 救回來的，要繼續做。','抓走也是一種保護，至少不會被車撞。']},
 sanitation:{elder:['巷口垃圾沒人收，老鼠才那麼多，先清乾淨。','老鼠都跑進家裡了，直接請專業的來抓！'],middle:['投藥家裡有小孩、寵物不放心，先把環境顧好。','清潔講了好幾年沒用，請專業的來滅鼠比較快。'],young:['垃圾不落地做確實，老鼠自然就少了。','晚上回家常看到老鼠跑過，要快點處理。']}
};
// What residents say about an issue you have not researched: the problem in their own words, never the approach their group wants.
const PAINS={
 health:['退休以後收入少，健保費一年要繳好幾萬，好吃力。','健保費年年漲，我們這些老人家快繳不起了。'],
 childcare:['小孩生下來，誰來顧、錢從哪裡來，每天都在煩惱。','上班又要顧小孩，蠟燭兩頭燒，家裡快撐不住了。'],
 housing:['房租年年漲、薪水不漲，年輕人在這裡快住不下去了。','租不起也買不起，我們只能越搬越遠。'],
 traffic:['每天過保儀路口都提心吊膽，車多人多，好危險。','上下班、接小孩都卡在保儀路口，一塞就是半天。'],
 senior:['敬老卡是長輩出門的命根子，可是每個月用起來總覺得卡卡的。','長輩看病、搭車、買菜都靠那張敬老卡，你知道我們怎麼用的嗎？'],
 access:['早上市場口貨車、機車、買菜的人擠成一團。','市場口每天都卡住，推車買菜還要閃貨車。'],
 sanitation:['最近晚上巷子裡老鼠跑來跑去，看了很怕。','老鼠都跑進家裡了，再這樣下去要生病了。'],
 renewal:['房子四十年了，沒電梯又漏水，住得很辛苦。','這一帶的老公寓都在等都更，等了好多年都沒消息。'],
 hillside:['貓空山坡地吵了好多年，到底要怎麼辦？','茶園越來越少人接，下大雨又怕土石流，山上的事誰來管？'],
 vacancy:['這一帶空屋一堆，我們卻租不到像樣的房子。','房租一直漲，空著的房子也沒人拿出來租。'],
 temple_fest:['保儀大夫繞境又要到了，每年都在吵這件事。','繞境那幾天，整條路都跟平常不一樣。'],
 mrt:['捷運南環段施工好幾年了，路邊都是圍籬。','施工圍籬圍到店門口，每天塞成一團。'],
 incinerator:['焚化廠就在旁邊，回饋金每年一大筆，都不知道用到哪裡。','焚化廠的回饋金該怎麼用，里民吵翻了。'],
 zoo:['假日動物園一開，巷子裡全是外地車。','週末出門，動物園那邊塞到動不了。'],
 nightlife:['政大附近一到晚上，學生跟住戶常常起衝突。','晚上那一帶不是太冷清就是太吵，兩邊都不滿意。'],
 pets:['河濱跟公園的流浪狗貓越來越多了。','晚上散步常遇到一群狗，不知道該怎麼辦。']
};
for(const [t,lines] of Object.entries(PAINS))TOPICS[t].pain=lines;
// Current events (時事): each game three of these are in the news. Passers-by sometimes ask one instead of the place's own issue,
// TV keeps a slot for the round's headline and the debate may pick one. Each is modelled on a real Taipei controversy (source
// beside it, for the designers; players never see it); people, companies and venues are fictional and events are told generically.
const NEWS_TOPICS=['roundabout','smoking','shade','dome','lunch','school','overpass'],NEWS_COUNT=3;
// About one street visit in four asks a current event; the debate picks one about one game in four.
const NEWS_ASK=.25,DEBATE_NEWS=.25;
// Share of voters who follow one of the current events in play, on top of their local concerns.
const NEWS_CARE=.45;
const NEWS={
 // Source: https://udn.com/news/story/7323/8966610 (拆公館圓環在地炸鍋，里長：99% 里民反對)
 roundabout:{id:'roundabout',news:true,title:'城南圓環改路口',short:'圓環',ask:'城南圓環拆掉改成十字路口，上下班塞成一片，你怎麼看？',pain:['圓環拆掉以後，路口天天塞，公車卡在那邊動不了。','以前圓環常出事，現在改成路口又塞爆，到底要怎樣？'],demand:['公車地下道填掉，公車全擠到平面，把公車專用道還給我們！','都已經填平了，再挖一次又要塞更久，派人疏導撐過去就好。'],plans:[{id:'busway',text:'重設公車專用道、引道分流',detail:'公車族有感，但路口要再施工一次。'},{id:'endure',text:'照新路口設計、加派義交疏導',detail:'不用再挖一次，但這幾個月還是會塞。'}],guarantee:'我保證下個月城南路口再也不塞',
  cares:{elder:.8,middle:1.3,young:1.1},voices:{elder:['我搭公車去看醫生，現在要多等半小時，公車道要恢復。','以前圓環轉來轉去，老人家過馬路怕死了，改路口比較安全，忍一下。'],middle:['每天開車接送，公車跟汽車搶同一條路，專用道一定要回來。','已經花錢拆了，再改回去又是一筆錢，先派義交疏導。'],young:['我每天搭公車通勤，平面一塞就是半小時，專用道要回來。','騎車繞圓環常被擠，改成路口比較好走，塞一陣子就好。']}},
 // Source: https://cna.com.tw/news/aloc/202608270313.aspx (北市公館格柵式吸菸區惹議，衛生局拆除將訂設置標準)
 smoking:{id:'smoking',news:true,title:'街頭吸菸區',short:'吸菸區',ask:'捷運站口的柵欄吸菸區被笑像籠子，路過還是一身菸味，你怎麼處理？',pain:['帶小孩經過捷運站口，吸菸區的菸一直飄過來。','站口用柵欄圍一圈給人抽菸，看起來像籠子，大家都在笑。'],demand:['吸菸區拆掉，商圈公園全面禁菸，不要再讓我們吸二手菸！','抽菸的人也要有地方去，蓋間有抽風的吸菸室，大家分開就好。'],plans:[{id:'ban',text:'拆掉街頭吸菸區、商圈公園全面禁菸',detail:'路人不用吸二手菸，但菸槍會躲進巷子抽。'},{id:'booth',text:'改設室內負壓吸菸室、分流管理',detail:'吸菸和不吸菸分開，但一間要上百萬。'}],guarantee:'我保證下個月起全區聞不到一點菸味',
  cares:{elder:.6,middle:1,young:.8},voices:{elder:['我氣管不好，經過站口就咳，全面禁菸最好。','我抽了四十年菸，總要有個地方抽，蓋像樣的吸菸室吧。'],middle:['帶小孩出門最怕二手菸，商圈公園都該禁菸。','店門口常有人抽，有間吸菸室把人收進去，我們做生意也比較好。'],young:['等公車都在吸別人的菸，直接禁掉。','同事抽菸只能躲巷子，有正式的吸菸室反而不會到處飄。']}},
 // Source: https://www.storm.mg/article/11146656 (北市信義區遮陽傘單支要價 744 萬？)
 shade:{id:'shade',news:true,title:'路樹換遮陽傘',short:'遮陽傘',ask:'商圈路口的樹移走、改立造型遮陽傘，有人罵浪費、有人說比較安全，你怎麼看？',pain:['夏天走人行道曬到頭昏，路口的樹跟傘吵了好久。','路口換了一支好幾百萬的傘，大家吵到現在還沒結論。'],demand:['樹移走換一支好幾百萬的傘？把錢拿去顧好行道樹啦！','老樹颱風一吹就倒，換成遮陽棚比較安全。'],plans:[{id:'trees',text:'停建造型遮陽傘、經費改養護行道樹',detail:'樹蔭是現成的，但老樹颱風天有倒塌風險。'},{id:'shades',text:'易倒的老樹移走、路口改設遮陽棚',detail:'馬上有遮蔭、不怕倒樹，但一座就要上百萬。'}],guarantee:'我保證明年夏天每條人行道都有遮蔭',
  cares:{elder:.7,middle:.6,young:.9},voices:{elder:['那幾棵樹陪我們幾十年，樹蔭比什麼傘都涼。','上次颱風路樹倒下來壓到機車，換成棚子我比較放心。'],middle:['一支傘好幾百萬，拿去養樹、修樹穴不是更實在？','推嬰兒車走樹下，樹根把人行道頂得坑坑洞洞，棚子比較好走。'],young:['把樹移走換一朵香菇，這是什麼審美？顧好路樹啦。','遮陽傘至少馬上有遮蔭，等樹長大我都畢業了。']}},
 // Source: https://www.cna.com.tw/news/aloc/202407100222.aspx (大巨蛋頻漏水，北市府：遠雄承諾 10 月底完成改善)
 dome:{id:'dome',news:true,title:'巨蛋漏水',short:'巨蛋',ask:'市立巨蛋一下大雨就漏水，經營的財團一直修不好，你怎麼看？',pain:['去巨蛋看球遇到大雨，裡面也在下小雨，買票還要撐傘。','蓋了那麼多年，一下雨就漏，到底誰要負責？'],demand:['漏成這樣還讓它辦活動？按日罰到修好為止！','演唱會一場帶來幾萬人，邊修邊辦，不要把商機趕跑。'],plans:[{id:'penalty',text:'按日重罰經營財團、修好前停辦大型活動',detail:'逼財團負責，但演唱會和球賽會跑掉。'},{id:'events',text:'邊修邊辦、先把演唱會和球賽留下來',detail:'商機保住，但再漏一次市府又被罵放水。'}],guarantee:'我保證巨蛋下個月起一滴水都不漏',
  cares:{elder:.5,middle:.8,young:1.1},voices:{elder:['那麼大的場館漏水，萬一出事誰負責？先停下來修好。','孫子等演唱會等了好久，邊修邊辦就好。'],middle:['財團賺那麼多，罰到他們肯修為止。','我在巨蛋附近開店，停辦活動我生意就沒了，邊修邊辦啦。'],young:['買票看球還要撐傘，市府不罰就是放水。','好不容易有國際巨星來開唱，別因為漏水全取消。']}},
 // Source: https://udn.com/news/story/6656/9741594 (營養午餐食物中毒，蔣萬安：確保食安無虞才恢復供餐)
 lunch:{id:'lunch',news:true,title:'免費營養午餐',short:'午餐',ask:'免費營養午餐上路，就傳出學生吃壞肚子、菜色變差，你要怎麼處理？',pain:['孩子說午餐越來越難吃，上禮拜隔壁班還有人吃到拉肚子。','午餐改成免費以後，學校的廚餘多到滿出來。'],demand:['免費有什麼用，吃壞肚子誰負責？錢拿去請營養師、把廚房弄好！','一個月省好幾千，免費一定要維持，出包的廠商罰重一點就好。'],plans:[{id:'quality',text:'經費先顧食安：聘營養師、升級學校廚房',detail:'吃得安心，但有些家庭要再自己付午餐錢。'},{id:'free',text:'維持全面免費、出包廠商重罰',detail:'家長省錢有感，但廠商不夠，食安風險還在。'}],guarantee:'我保證下學期起每個孩子都吃得又好又免費',
  cares:{elder:.6,middle:1.4,young:.4},voices:{elder:['孫子吃壞肚子我心疼，先把食安顧好再說。','以前我們哪有免費午餐，現在有了就要保住。'],middle:['寧願自己出錢，也要孩子吃得安心，廚房和營養師要先到位。','三個小孩一個月午餐費好幾千，免費一定要維持。'],young:['補助要花在刀口上，品質顧好比全部免費重要。','我姊說午餐免費差很多，政策不要說改就改。']}},
 // Source: https://news.tvbs.com.tw/life/1224049 (花 21 萬租「明星國中戶籍」，遭查學籍恐取消)
 school:{id:'school',news:true,title:'明星學區設籍',short:'學區',ask:'明星國中年年額滿，有人租戶口、比設籍年資，你怎麼看？',pain:['家門口的國中年年額滿，排不排得進去全看運氣。','明星國中一位難求，網路上還有人在租戶口。'],demand:['我們在這裡住幾十年，學校要先給真的住這裡的人！','租屋也是住這裡，孩子憑什麼不能讀家門口的學校？增班啦！'],plans:[{id:'residency',text:'嚴審居住事實、拉長設籍年限',detail:'老住戶安心，但租屋的年輕家庭更難進去。'},{id:'expand',text:'租屋家庭比照設籍、明星國中增班',detail:'新搬來的家庭有機會，但學校更擠。'}],guarantee:'我保證每個孩子都進得了想讀的國中',
  cares:{elder:.4,middle:1.3,young:.6},voices:{elder:['我們在這裡住了一輩子，學位要留給在地人。','孫子跟爸媽租房子住隔壁，卻讀不到這裡，太不公平。'],middle:['我們咬牙買學區房，就是為了孩子，設籍要審嚴一點。','我們租屋住這裡五年了，增班、讓租屋家庭也能讀。'],young:['寄戶口的人太多，查清楚真的住這裡的才公平。','年輕人買不起學區房，租屋也該有一樣的機會。']}},
 // Source: https://news.pts.org.tw/article/733384 (實踐人本交通？人行天橋拆除引發多方爭議)
 overpass:{id:'overpass',news:true,title:'拆人行天橋',short:'天橋',ask:'路口的天橋要拆了，有人說樓梯爬不動，也有人說平面過馬路更危險，你怎麼看？',pain:['路口那座天橋要拆了，大家吵得很兇。','過這個路口，走天橋也累、走平面也怕，好難。'],demand:['號誌、庇護島都還沒做好就拆天橋？先暫緩！','天橋樓梯那麼陡，推車、輪椅都上不去，拆掉改平面啦！'],plans:[{id:'keep',text:'暫緩拆天橋，等號誌和庇護島做好',detail:'多一個過街選擇，但推車、輪椅還是上不去。'},{id:'level',text:'照計畫拆天橋、改設平面行人時相',detail:'輪椅、嬰兒車能直接過，但配套前路口更亂。'}],guarantee:'我保證這個路口從此沒有人被車撞',
  cares:{elder:1.1,middle:.8,young:.4},voices:{elder:['天橋走慣了，平面車那麼多，我不敢過，先別拆。','我膝蓋不好，天橋樓梯爬不上去，改平面我才過得了。'],middle:['孩子上學走天橋才安全，配套沒好別急著拆。','推嬰兒車根本上不了天橋，改平面斑馬線才方便。'],young:['趕時間走天橋不用等紅燈，留著多一個選擇。','天橋又醜又擋人行道，拆了改平面，路口才看得清楚。']}}
};
for(const [id,{cares,voices,...topic}] of Object.entries(NEWS)){TOPICS[id]=topic;VOICES[id]=voices;for(const g of GROUPS)GROUP_CARES[g.id][id]=cares[g.id];}
// Every issue a voter can hold a view on: the place issues, then the current events.
const ISSUES=[...POLICY_TOPICS,...NEWS_TOPICS];
// Contested issues have no side set by design: each game draws every group's side (see contestedSides), so last game's answers
// do not carry over and only research tells you who wants what. Current events are always contested.
const CONTESTED=['traffic','access','sanitation','renewal','hillside','mrt','incinerator','zoo','pets',...NEWS_TOPICS];
// Each group takes a side by coin toss; if all three land together one is turned, so every answer still costs someone.
function contestedSides(seed,t){const sides=GROUPS.map(g=>rand(seed,'contested',t,g.id)<.5?0:1);if(sides.every(x=>x===sides[0])){const k=Math.floor(rand(seed,'contested-split',t)*sides.length);sides[k]=1-sides[k];}return sides;}
// The place issues in play (the current events are left out).
const placeTopicsOf=s=>s?.landscape?.active||POLICY_TOPICS;
// What a resident says: before research only the problem; once researched, their group's demand (or a plain question if it is split).
function residentLine(s,topic,group,venue,day=s.day){const t=TOPICS[topic],lean=s.landscape.groups[group]?.lean?.[topic]??.5;if(!s.player.insight?.[topic]){const pain=t.pain||[];return pain.length?pain[Math.floor(rand(s.seed,'pain',topic,day,venue)*pain.length)]:t.ask;}return Math.abs(lean-.5)>=.2?voiceOf(topic,group,sideOf(lean))||t.demand?.[sideOf(lean)]||t.ask:t.ask;}
// Each round one current event leads the news.
function headline(s,day=s.day){const news=s.landscape?.news||[];if(!news.length)return null;const order=shuffle(news,s.seed,'headline');return order[(Math.max(1,day)-1)%order.length];}
// Passers-by bring up a current event instead of the place's issue about one visit in four, the round's headline more often;
// never while 小馬's challenge is what people there talk about, and never one another place already asks this round.
function newsAt(s,venue,day,taken){const news=(s.landscape?.news||[]).filter(t=>!taken.has(t));if(!news.length||openChallengeAt(s,venue)||rand(s.seed,'news-ask',day,venue)>=NEWS_ASK)return null;const G=s.landscape.groups[s.landscape.main?.[venue]??0],head=headline(s,day);return drawTopic(s,venue+':news',day,news.map(t=>({topic:t,odds:Math.sqrt(G.weights[t]||.2)*(t===head?2:1)*recentAsk(s,t,day)})));}
// A broker still courting you asks only for a stance you do not already hold in public; with none left to ask he stays away.
const holds=(s,topic,plan)=>lastPlan(s.player,topic)?.answer===plan;
function refreshDeals(s){if(!s?.deals||!s.brokers)return;const now=makeDeals(s);for(const id of Object.keys(s.brokers)){if(s.brokers[id]!=='open')continue;if(now[id])s.deals[id]=now[id];else delete s.deals[id];}}
const voiceOf=(topic,g,side)=>VOICES[topic]?.[GROUPS[g]?.id]?.[side]||null;
// Each place has one main crowd per game and a few issues people there raise more often.
const VENUES={
 market:{id:'market',title:'木柵市場',affinity:{access:2.2,sanitation:1.3,childcare:1.1,renewal:1.3,mrt:1.2,incinerator:1.1},anchor:{x:309,y:355}},
 street:{id:'street',title:'保儀路口',affinity:{traffic:2.4,childcare:1.2,mrt:1.9,zoo:1.4},anchor:{x:609,y:384}},
 plaza:{id:'plaza',title:'社區廣場',affinity:{childcare:1.4,health:1.2,senior:1.2,incinerator:1.6,pets:1.2,renewal:1.1},anchor:{x:713,y:243}},
 river:{id:'river',title:'道南河濱',affinity:{sanitation:1.6,housing:1.3,traffic:1.1,pets:1.7,hillside:1.6,nightlife:1.4},anchor:{x:551,y:474}},
 temple:{id:'temple',title:'廟前廣場',affinity:{senior:1.5,health:1.4,temple_fest:2.6,hillside:1.1},anchor:{x:158.2,y:285.8}}
};
const PLACE_IDS=Object.keys(VENUES).filter(v=>VENUES[v].affinity);
// Village chiefs: until one has seen you enough, people there hold back; once won over, the chief brings a network and the place stops tiring of you.
const CHIEFS={market:{name:'市場老里長'},temple:{name:'廟口里長'},plaza:{name:'社區里長'}};
function chiefNeed(s,venue){const id=s.settings?.background;if(id==='heir')return['market','temple'].includes(venue)?0:2;if(id==='incumbent')return 1;return 2+(rand(s.seed,'chief-need',venue)<.5?1:0);}
const chiefBroken=(s,venue)=>!!s.chiefs?.[venue]?.broken;
function chiefVisit(s,venue){const c=s.chiefs?.[venue];if(!c)return null;c.visits++;let broke=false;if(!c.broken&&c.visits>=c.need){c.broken=true;c.brokeDay=s.day;broke=true;s.player.blocs.push({chief:venue,votes:TUNING.chief.bloc,status:'active'});}if(c.broken)formNetwork(s,venue);return{venue,name:CHIEFS[venue].name,visits:c.visits,need:c.need,broken:c.broken,broke,bloc:broke?TUNING.chief.bloc:0,scale:c.broken?TUNING.chief.warm:TUNING.chief.cold};}
// What the next visit to a chief's place will bring, without changing anything.
function chiefPreview(s,venue){const c=s.chiefs?.[venue];if(!c)return null;const breaks=!c.broken&&c.visits+1>=c.need;return{venue,name:CHIEFS[venue].name,visits:c.visits,need:c.need,broken:c.broken,breaks,scale:c.broken||breaks?TUNING.chief.warm:TUNING.chief.cold};}
function chiefView(s){return Object.keys(CHIEFS).map(v=>({...chiefPreview(s,v),title:VENUES[v].title}));}
const RESIDENTS={market:{role:'市場居民'},street:{role:'等紅燈的路人'},plaza:{role:'社區居民'},river:{role:'河濱散步的人'},temple:{role:'廟前廣場居民'}};
const SPEAKERS={elder:['秀琴阿姨','林伯','月娥阿嬤','陳伯','阿桃姨'],middle:['美姐','阿仁','許晴','建志','淑芬'],young:['小汀','阿寧','佳穎','阿祺','小禾']};
// Party leanings follow the district's 2022 council vote (about 46% KMT, 24% DPP) and are drawn independently of age group.
const PARTY_SHARES={kmt:.46,dpp:.24,none:.30};
// Each big party holds a line on three issues, taken from its platform themes; its own voters notice when you keep or break it.
const PARTY_LINES={kmt:{access:'window',traffic:'redesign',health:'all65'},dpp:{childcare:'daycare',housing:'social',sanitation:'clean'}};
function shuffle(list,seed,...salt){return list.map((x,i)=>({x,k:rand(seed,...salt,String(x),i)})).sort((a,b)=>a.k-b.k).map(o=>o.x);}
function landscape(seed){
 const active=[...CORE_TOPICS,...shuffle(POLICY_TOPICS.filter(t=>!CORE_TOPICS.includes(t)),seed,'active-topics').slice(0,ACTIVE_COUNT-CORE_TOPICS.length)].sort((a,b)=>POLICY_TOPICS.indexOf(a)-POLICY_TOPICS.indexOf(b)),news=shuffle(NEWS_TOPICS,seed,'news-topics').slice(0,NEWS_COUNT),on=t=>active.includes(t)||news.includes(t),contested=Object.fromEntries(CONTESTED.map(t=>[t,contestedSides(seed,t)])),raw=GROUPS.map(g=>.8+rand(seed,'group-size',g.id)*.4),sum=raw.reduce((a,b)=>a+b,0),attitudes=shuffle(Object.keys(ATTITUDES),seed,'promise');
 const groups=GROUPS.map((g,k)=>{const weights={},lean={};for(const t of ISSUES){weights[t]=on(t)?Math.round(GROUP_CARES[g.id][t]*(.85+rand(seed,'care-weight',g.id,t)*.3)*100)/100:0;const side=contested[t]?contested[t][k]:LEAN_SIDES[g.id][t],strong=STRONG_LEANS[g.id].includes(t)||rand(seed,'lean',g.id,t)<.5;lean[t]=side===0?(strong?.8:.65):(strong?.2:.35);}return{id:g.id,share:Math.round(raw[k]/sum*1000)/1000,promise:attitudes[k],weights,lean};});
 const weights=Object.fromEntries(ISSUES.map(t=>[t,Math.round(groups.reduce((n,g)=>n+g.share*g.weights[t],0)*100)/100])),later=[...active].sort((a,b)=>weights[b]-weights[a]).slice(1);
 // In the daytime the street belongs to elders and the middle-aged; each of them is the main crowd somewhere. The young are online.
 const order=shuffle([0,1],seed,'crowd-group'),main={};shuffle(Object.keys(VENUES),seed,'venue-crowd').forEach((v,i)=>{main[v]=i<order.length?order[i]:rand(seed,'venue-main',v)<.5?0:1;});
 return{active,news,groups,weights,main,surge:{topic:later[Math.floor(rand(seed,'surge-topic')*later.length)],round:SCHEDULE.surge.from+Math.floor(rand(seed,'surge-round')*SCHEDULE.surge.span),length:2},identityGroup:Math.floor(rand(seed,'identity-group')*groups.length)};
}
function voterGroup(seed,i,groups){let r=rand(seed,'group',i);for(let g=0;g<groups.length;g++){r-=groups[g].share;if(r<0)return g;}return groups.length-1;}
function voterParty(seed,i){const r=rand(seed,'party',i);return r<PARTY_SHARES.kmt?'kmt':r<PARTY_SHARES.kmt+PARTY_SHARES.dpp?'dpp':'none';}
function voterCares(seed,i,weights){const pick=(salt,skip)=>{let r=rand(seed,salt,i)*POLICY_TOPICS.reduce((n,t)=>n+(t===skip?0:weights[t]),0);for(const t of POLICY_TOPICS){if(t===skip)continue;r-=weights[t];if(r<0)return t;}return POLICY_TOPICS.filter(t=>t!==skip&&weights[t]>0).at(-1);},first=pick('care-1');return rand(seed,'care-two',i)<.5?[first,pick('care-2',first)]:[first];}
// A current event is a concern on top of a voter's local ones: about NEWS_CARE of voters follow one story in play, the one their
// group cares about more being likelier; their local concerns are drawn as before and stay first.
function newsCares(seed,i,weights,cares){const news=NEWS_TOPICS.filter(t=>weights[t]>0);if(!news.length||rand(seed,'care-news',i)>=NEWS_CARE)return cares;let r=rand(seed,'care-news-pick',i)*news.reduce((n,t)=>n+weights[t],0);for(const t of news){r-=weights[t];if(r<0)return[...cares,t];}return[...cares,news.at(-1)];}
const prefers=(v,topic)=>{const k=ISSUES.indexOf(topic);return k<0?-1:Number(v.pref?.[k]??0);};
const sideOf=lean=>lean>.5?0:1;
function surgeActive(s,topic,day=s.day){const g=s.landscape?.surge;return!!g&&g.topic===topic&&day>=g.round&&day<g.round+g.length;}
function caresAbout(s,v,i,topic,day=s.day){return(v.cares||[]).includes(topic)||surgeActive(s,topic,day)&&rand(s.seed,'surge-care',i)<TUNING.surgeShare;}
// Share preferring the first approach across all voters, weighted by how much each group cares.
function overallLean(s,topic){let n=0,d=0;for(const g of s.landscape.groups){const w=g.share*(g.weights[topic]||1);n+=w*g.lean[topic];d+=w;}return d?n/d:.5;}
// Who is in the crowd at a place this game; TV and debates reach groups in proportion to their size.
function crowdMix(s,venue){const main=s.landscape.main?.[venue];return main===undefined?s.landscape.groups.map(g=>g.share):GROUPS.map((_,g)=>g===2?TUNING.youngStreet:g===main?TUNING.crowd:1-TUNING.crowd-TUNING.youngStreet);}
// Who a medium reaches: TV skews old, online skews young; the debate hall reaches groups by size.
function mediaMix(s,kind){const lean=MEDIA_LEAN[kind];if(!lean)return s.landscape.groups.map(g=>g.share);const raw=s.landscape.groups.map((g,k)=>g.share*lean[k]),sum=raw.reduce((a,b)=>a+b,0);return raw.map(x=>x/sum);}
// An open challenge is raised on TV and at the two places where people care most about the attacked issue; elsewhere life goes on.
function openChallengeAt(s,venue){return(s.challenges||[]).filter(c=>c.status==='open'&&(c.venues||[]).includes(venue)).sort((a,b)=>a.deadline-b.deadline)[0]||null;}
function responseVenues(s,topic){return Object.keys(VENUES).map(v=>({v,w:(s.landscape.groups[s.landscape.main[v]]?.weights?.[topic]||.2)*(VENUES[v].affinity[topic]||1)})).sort((a,b)=>b.w-a.w||(a.v<b.v?-1:1)).slice(0,2).map(x=>x.v);}
function urgentTopic(s){const c=(s.challenges||[]).filter(c=>c.status==='open').sort((a,b)=>a.deadline-b.deadline)[0];return c?.topic||null;}
// The issues people at a place may raise this round: its main crowd's three biggest concerns there, weighted by local relevance and heat.
function venuePool(s,venue,day=s.day){const open=openChallengeAt(s,venue);if(open)return[{topic:open.topic,odds:1}];const G=s.landscape.groups[s.landscape.main?.[venue]??0],aff=VENUES[venue]?.affinity||{},w=t=>Math.sqrt(G.weights[t]||.2)*(aff[t]||1)*(surgeActive(s,t,day)?1.8:1)*recentAsk(s,t,day),top=[...placeTopicsOf(s)].sort((a,b)=>w(b)-w(a)||(a<b?-1:1)).slice(0,3),sum=top.reduce((n,t)=>n+w(t),0);return top.map(t=>({topic:t,odds:w(t)/sum}));}
// Issues you were just asked come up less: one round ago ×.35, two rounds ago ×.6.
function recentAsk(s,t,day){let f=1;for(const x of s.player?.actions||[]){if(x.topic!==t||!x.answer||!ASKING.includes(x.action))continue;const ago=day-x.day;if(ago>=1&&ago<=TUNING.recentAsk.length)f=Math.min(f,TUNING.recentAsk[ago-1]);}return f;}
// The question actually asked at a place is drawn from its pool when you get there.
// Places draw in a fixed order and an issue already asked at one place this round is left to the others, so the map offers different issues.
// A passer-by may bring up a current event instead (newsAt).
function drawTopic(s,venue,day,pool){const sum=pool.reduce((n,x)=>n+x.odds,0);let r=rand(s.seed,'venue-topic',day,venue)*sum;for(const x of pool){r-=x.odds;if(r<0)return x.topic;}return pool.at(-1).topic;}
function venueTopic(s,venue,day=s.day){if(!PLACE_IDS.includes(venue))return drawTopic(s,venue,day,venuePool(s,venue,day));const taken=new Set();
 for(const v of PLACE_IDS){const pool=venuePool(s,v,day),fresh=pool.length>1?pool.filter(x=>!taken.has(x.topic)):pool,t=newsAt(s,v,day,taken)||drawTopic(s,v,day,fresh.length?fresh:pool);taken.add(t);if(v===venue)return t;}}
// The hottest issue in the latest poll, or the open challenge.
function hotTopicNow(s){const urgent=urgentTopic(s);if(urgent)return urgent;const issues=s.polls?.at(-1)?.issues||s.landscape.weights;return[...topicsOf(s)].sort((a,b)=>(issues[b]||0)-(issues[a]||0))[0];}
// TV asks one of three issues, drawn on air: the open challenge if there is one, then the hottest issues in the latest poll;
// unless a current event is already among them, the last slot goes to the round's headline.
function tvPool(s){const urgent=urgentTopic(s),issues=s.polls?.at(-1)?.issues||s.landscape.weights,ranked=[...topicsOf(s)].sort((a,b)=>(issues[b]||0)-(issues[a]||0)||(a<b?-1:1)).filter(t=>t!==urgent),pool=(urgent?[urgent,...ranked]:ranked).slice(0,3),head=headline(s);if(head&&pool.length&&!pool.some(t=>TOPICS[t]?.news))pool[pool.length-1]=head;return pool;}
function onlinePool(s){const G=s.landscape.groups[2],issues=s.polls?.at(-1)?.issuesByGroup?.[2]||G.weights;return[...topicsOf(s)].sort((a,b)=>(issues[b]||0)-(issues[a]||0)||(G.weights[b]-G.weights[a])||(a<b?-1:1)).slice(0,3);}
function initialEvents(seed){return{tip:{truth:['issue','false','unclear'][Math.floor(rand(seed,'tip-truth')*3)],evidenceLevel:0,investigations:0,history:[],publication:null,verification:null,responseDue:false}};}
function tipEvidence(t){if(t.verification)return'後續核對：'+t.verification.text;if(!t.evidenceLevel)return'只有匿名資料，還沒核對。';const texts={issue:['兩份收據的案號、金額一樣，但還缺原始請款單。','原始請款單確認重複請款。'],false:['收據日期對不上，可能是不同年度的活動。','核對後是不同年度的同名活動，指控不成立。'],unclear:['有幾筆金額對不上，但關鍵單據不見了。','能查的都查了，關鍵單據還是不見，說不清楚。']};return texts[t.truth][Math.min(t.evidenceLevel,2)-1];}
function eventView(s){upgrade(s);const t=s.events.tip;return{tip:{available:s.day>=3,title:TOPICS.tip.title,summary:TOPICS.tip.ask,evidenceLevel:t.evidenceLevel,evidenceText:tipEvidence(t),investigationCost:COSTS.tipCheck,investigations:t.investigations,maxInvestigations:2,canInvestigate:t.evidenceLevel<2&&!t.verification&&t.checkedDay!==s.day,canPledge:!t.pledged&&(t.evidenceLevel>=2||!!t.verification)&&t.truth!=='issue',pledged:!!t.pledged,history:t.history.map(x=>({round:x.round,stage:x.stage,mode:x.mode,quote:x.quote,evidenceLevel:x.evidenceLevel,evidenceText:x.evidenceText})),publication:t.publication?copy(t.publication):null,update:t.verification?copy(t.verification):null,responseDue:t.responseDue,truthLabel:t.evidenceLevel===2||t.verification?({issue:'確認重複請款',false:'指控不成立',unclear:'說不清楚'})[t.truth]:null}};}
function availableTopics(s){return Object.values(TOPICS).filter(t=>t.id==='tip'?s.day>=3:topicsOf(s).includes(t.id));}
const guaranteeText=(s,topic)=>TOPICS[topic]?.guarantee||'我保證下個月就辦好';
const correctionText=topic=>'更正：我不能保證「'+String(TOPICS[topic]?.guarantee||'').replace(/^我保證/,'')+'」';
const HONEST='先把問題記下來，查清楚再給你答案';
function investigate(s){const t=s.events.tip;if(t.evidenceLevel>=2)return false;t.evidenceLevel++;t.investigations++;t.history.push({round:s.day,stage:t.evidenceLevel,evidenceText:tipEvidence(t)});if(!s.player.known.includes('tip'))s.player.known.push('tip');return true;}
const tipRelease=t=>(t.history||[]).find(x=>x.mode&&x.mode!=='tip_correct')||null;
const tipCorrectable=t=>{const said=(t.history||[]).filter(x=>x.mode);return said.some(x=>x.mode==='tip_accuse')&&said.at(-1).mode!=='tip_correct';};
function tipQuestion(s){const t=s.events.tip,out=!!tipRelease(t),lead=s.pending?.exposing&&(s.player.dirt||[]).find(x=>x.id===s.pending.exposing);if(lead)return dirtQuestion(lead);return{speaker:'記者會｜各家記者',reason:s.pending.responseReason,text:'記者問：你手上有什麼證據？（'+tipEvidence(t)+'）',quote:t.responseDue?(t.verification?.quote||t.publication?.quote):null,options:[{id:'tip_limited',extraCost:0,text:'只公布查到的事實，請小馬說明',detail:'穩，但殺傷力有限。',unlocked:!out,whyLocked:'這份料已經爆過了。'},{id:'tip_accuse',extraCost:0,text:'直接指控小馬重複請款',detail:'是真的，他會很傷；不是真的，傷的是你。',unlocked:!out,whyLocked:'這份料已經爆過了。'},{id:'tip_correct',extraCost:0,text:'更正先前的指控',detail:'承認說過頭，止血。',unlocked:tipCorrectable(t),whyLocked:t.history.some(x=>x.mode==='tip_accuse')?'已經更正過了。':'還沒指控過。'}]};}
function dirtQuestion(d){const k=DIRT[d.kind];return{speaker:'記者會｜各家記者',reason:'記者等著看你的證據。',concern:k.text,text:'記者問：你說小馬「'+k.title+'」，證據呢？（'+(d.verified?'你查證過，站得住。':'還沒查證。')+'）',quote:null,options:[{id:'tip_accuse',extraCost:0,text:'公布證據，點名小馬',detail:d.verified?'證據站得住，他會很傷。':'料是真的，他會很傷；料不實，傷的是你。',unlocked:true},{id:'tip_limited',extraCost:0,text:'只公布查到的事實',detail:'殺傷力減半；料不實也不會反咬。',unlocked:true}]};}
// Six fictional power brokers hold money, organised votes or airtime. Each wants you to back one approach in public; the first of
// their issues that is in play this game is the deal. They come to you as an offer, or you visit one to raise money.
const BROKERS={
 developer:{id:'developer',name:'建商林董',org:'文山開發',kind:'trade',venue:'street',money:550000,bloc:0,cost:'全區青年覺得你跟建商走太近',deals:[['housing','rent'],['renewal','bonus'],['hillside','develop']],gives:'大筆政治獻金'},
 temple:{id:'temple',name:'保儀宮陳主委',org:'保儀宮',kind:'any',venue:'temple',money:60000,bloc:900,cost:'怕吵怕塞車的中年家長不滿',deals:[['temple_fest','tradition'],['access','window'],['senior','points']],gives:'信眾鐵票與造勢動員'},
 chiefs:{id:'chiefs',name:'里長聯誼會張會長',org:'木柵里長聯誼會',kind:'any',venue:'plaza',money:30000,bloc:800,cost:'全區青年覺得你只顧長輩',deals:[['health','all65'],['incinerator','cash'],['senior','points']],gives:'各里樁腳的組織票'},
 merchants:{id:'merchants',name:'商圈協會許理事長',org:'木柵商圈協會',kind:'trade',venue:'market',money:120000,bloc:500,deals:[['access','window'],['mrt','daytime'],['zoo','parking']],gives:'店家捐款和店頭宣傳'},
 faction:{id:'faction',name:'派系吳主委',org:'黨內派系',kind:'party',venue:null,money:150000,bloc:1000,deals:null,gives:'派系配票'},
 media:{id:'media',name:'政論製作人老K',org:'在地政論節目',kind:'civic',venue:null,money:0,bloc:0,perk:'tv',deals:[['pets','tnr'],['nightlife','open'],['vacancy','hoard'],['childcare','daycare']],gives:'一次免費上節目'}
};
// What each identity gets from a broker: family ties open wallets, a newcomer gets less.
const BROKER_MONEY={newcomer:.8,heir:1.4,incumbent:1.1};
// Each broker asks for the stance in his list that the most voters oppose, among those you do not already hold in public: what he
// gives always costs you somewhere, and he never asks for what you already say.
function makeDeals(s){const out={},party=partyOf(s,0),active=topicsOf(s);for(const b of Object.values(BROKERS)){let pair=null;if(b.id==='faction'){if(!party)continue;const line=shuffle(Object.entries(PARTY_LINES[party]).filter(([t])=>active.includes(t)),s.seed,'faction-line').filter(([t,plan])=>!holds(s,t,plan));pair=line[0]||null;}else{const opposed=([t,plan])=>{const k=planIndex(t,plan);return s.landscape.groups.filter(g=>sideOf(g.lean[t])!==k).reduce((n,g)=>n+g.share,0);};pair=b.deals.filter(([t,plan])=>active.includes(t)&&!holds(s,t,plan)).sort((x,y)=>opposed(y)-opposed(x))[0]||null;}if(!pair)continue;const [topic,plan]=pair,t=TOPICS[topic],text=t.plans.find(x=>x.id===plan).text,money=Math.round(b.money*(BROKER_MONEY[s.settings.background]||1)*(originOf(s)?.brokerMoney||1)/10000)*10000;out[b.id]={id:b.id,name:b.name,org:b.org,kind:b.kind,venue:b.venue,topic,plan,money,bloc:b.bloc,perk:b.perk||null,gives:b.gives,pitch:`${b.name}：「請你公開支持${text}。」`};}return out;}
const dealOf=(s,id)=>s.deals?.[id]||null;
// Opening identities: each changes money, starting base, look and one rule, so each plays differently.
const BACKGROUNDS={
 newcomer:{id:'newcomer',title:'全新素人',difficulty:'困難',outfit:'casual',description:'沒有人脈也沒有包袱。錢最少、起始票最少，里長也不認識你；但你對議題最熟，面對面街訪效果較好，而且有一群人特別想要新面孔。',strengths:['開局已深入研究 1–2 題青年最在意的議題','派 1 位助手就能深入研究一題','街訪效果 ×1.5','有一群人想要新面孔：好感 ×'+TUNING.lift.fresh],weaknesses:['可用款 44 萬，三種身分最少','黨部支援最少（×0.7）','起始票數最少','里長不認識你：要去 2–3 次才肯幫忙','沒人認識你，募款常常談不成'],knows:[1,2],deepSolo:true,partyAid:.7,personal:700000,helpers:2,supportBoost:2.4,canvassDepth:1.5,fundraise:.75,attackStance:.45,rule:'fresh'},
 heir:{id:'heir',title:'政二代',difficulty:'普通',outfit:'suit',description:'家族人脈帶來錢、基本盤和里長交情；只要不在台上失言就很穩。但有一群人覺得你靠家族，而且你沒準備過任何議題。',strengths:['可用款 114 萬，募款 ×1.5','黨部支援最多（×1.5）','起始票數約素人的 1.7 倍','市場、廟口的里長是家族老交情，一去就幫你'],weaknesses:['有一群人覺得你靠家族：好感 ×0.85','開局沒查過任何議題；沒研究的題說不出具體做法','沒準備被問倒，扣分 ×1.5'],partyAid:1.5,stumble:1.5,personal:1400000,helpers:2,supportBoost:4,canvassDepth:1,fundraise:1.5,attackStance:.45,rule:'distrust'},
 incumbent:{id:'incumbent',title:'現任議員',difficulty:'簡單',outfit:'vest',description:'有團隊、有支持者，里長都認識你；但也有上一屆留下的公開立場，小馬常拿你的紀錄開刀，改口也更傷。',strengths:['3 位助手，三種身分最多；可用款 79 萬','起始票數比素人略多','議會經驗：沒研究過的題也說得出具體做法，但看不到各群反應和票數','開局熟悉 3 個議題（一題已表態），只知道大方向','里長都認識你，去一次就幫你'],weaknesses:['黨的包袱重：違背黨的立場，同黨選民流失 ×1.5','小馬更常拿你的紀錄批評你','改口時，聽過舊立場的人更不滿'],personal:1100000,helpers:3,partyAid:1,partyBreak:1.5,answerBlind:true,supportBoost:2.9,canvassDepth:1,fundraise:1.1,attackStance:.85,flip:1.5,record:true,rule:null}
};
// Saves made before identities replaced the v12.0 backgrounds keep loading.
const LEGACY_BACKGROUNDS={citizen:'newcomer',researcher:'newcomer',organizer:'incumbent'};
const identity=s=>BACKGROUNDS[s.settings?.background]||BACKGROUNDS.newcomer;
// Origin presets (出身): each identity draws one per game from its pool, fixed by the seed, so the opening card and a reload show the
// same one. Each turns one strength and one weakness into existing levers: dig odds, a chief already on side, cash, issues known in
// depth, free TV slots, a billboard, broker money, scandal odds, fundraising, street-visit depth, a group that starts cooler, or
// 小馬 watching from the first round. A preset can also name the voter group that is the candidate's vote bank (base), where one fits
// the story. All fictional.
const ORIGINS={
 newcomer:[
  {id:'exposer',title:'政大揭弊網紅',good:'挖料命中高',bad:'長輩嫌你炒作',info:'派人挖小馬黑料，挖到的機會從 55% 變 75%。長輩起始支持打八折，之後也較難拉。',dig:{found:.75,nothing:.15},cool:'elder',base:'young'},
  {id:'aide',title:'前市府幕僚',good:'懂 2 題時事',bad:'小馬一開始就盯你',info:'開局已深入查過 2 個時事議題。小馬不等你逼近當選線，第 1 回合起就可能攻擊你。',know:{n:2,from:'news'},watched:true},
  {id:'parent',title:'社區家長會長',good:'社區里長挺你',bad:'青年不認識你',info:'社區廣場的里長開局就挺你，帶來組織票。青年起始支持打八折，之後也較難拉。',chief:'plaza',cool:'young',base:'middle'}
 ],
 heir:[
  {id:'speaker',title:'議長派系繼承人',good:'頭人給錢多三成',bad:'較常被爆料',info:'頭人合作或拜訪給的錢多三成。第 5–9 回合被爆黑料的機率高六成。',brokerMoney:1.3,scandal:1.6},
  {id:'racer',title:'超跑違停富少',good:'多 40 萬可用',bad:'青年看你不順眼',info:'可用款多 40 萬。青年起始支持打八折，之後也較難拉。',cash:400000,cool:'young'},
  {id:'scholar',title:'海歸學霸二代',good:'懂 2 題地方議題',bad:'老樁腳不熟',info:'開局已深入查過選民最在意的 2 個地方議題。市場、廟口的里長不再一去就幫你，要跑 2 次。',know:{n:2,from:'local'},chiefsCold:true}
 ],
 incumbent:[
  {id:'contractor',title:'工程包商之友',good:'送 1 面看板＋20 萬',bad:'較常被爆料',info:'開局已有 1 面看板，可用款多 20 萬。第 5–9 回合被爆黑料的機率高六成。',billboard:1,cash:200000,scandal:1.6},
  {id:'questioner',title:'議會全勤質詢王',good:'2 次免費上電視',bad:'募款少兩成',info:'前 2 次上電視不用錢。公開募款收入少兩成。',tvCredit:2,fundraise:.8},
  {id:'service',title:'選民服務達人',good:'街訪效果加三成',bad:'少 15 萬可用',info:'親自街訪說服力 ×1.3。服務花掉不少錢，可用款少 15 萬。',canvass:1.3,cash:-150000}
 ]
};
// A cooler group starts at this share of its support and takes this share of every later gain.
const ORIGIN_COOL={start:.8,rec:.9};
const originFor=(seed,background)=>{const pool=ORIGINS[background]||ORIGINS.newcomer;return pool[Math.floor(rand(Number(seed)>>>0,'origin',background)*pool.length)];};
const originOf=s=>s?.origin?(ORIGINS[s.settings?.background]||[]).find(o=>o.id===s.origin)||null:null;
// What the opening card and the profile show: before the start, this game's draw; after it, the one in play.
function originView(s,background=s?.settings?.background){const o=s?.started?originOf(s):originFor(s.seed,background);return o?{id:o.id,title:o.title,good:o.good,bad:o.bad,info:o.info}:null;}
function applyOrigin(s){const o=originFor(s.seed,s.settings.background),a=s.player;s.origin=o.id;
 if(o.cash){s.budget.committed+=o.cash;s.budget.personalContribution+=o.cash;s.budget.available+=o.cash;}
 if(o.cool){const g=GROUPS.findIndex(x=>x.id===o.cool);for(const v of s.voters)if(v.g===g){v.support[0]*=ORIGIN_COOL.start;v.rec[0]*=ORIGIN_COOL.rec;}}
 if(o.chief&&s.chiefs[o.chief]&&!s.chiefs[o.chief].broken){Object.assign(s.chiefs[o.chief],{need:0,broken:true,brokeDay:0});a.blocs.push({chief:o.chief,votes:TUNING.chief.bloc,status:'active'});}
 if(o.chiefsCold)for(const v of['market','temple'])if(s.chiefs[v])Object.assign(s.chiefs[v],{need:2,broken:false,brokeDay:null});
 if(o.know){const w=s.landscape.weights,pool=(o.know.from==='news'?[...(s.landscape.news||[])]:[...placeTopicsOf(s)]).filter(t=>!a.known.includes(t)).sort((x,y)=>w[y]-w[x]||x.localeCompare(y));for(const t of pool.slice(0,o.know.n)){learn(a,t);reveal(s,t,'self');a.studied[t]=true;}}
 if(o.tvCredit)a.tvCredit=(a.tvCredit||0)+o.tvCredit;
 if(o.billboard){const venue=PLACE_IDS[Math.floor(rand(s.seed,'origin-board')*PLACE_IDS.length)];for(let i=0;i<o.billboard;i++)a.billboards.push({venue,round:0});}
 return o;}
// Digging odds, after the origin: a lead, nothing, or 小馬 catches you at it.
const digOdds=s=>{const d=originOf(s)?.dig;return{found:d?.found??DIG.found,nothing:d?.nothing??DIG.nothing};};
// The player's name for each identity and party.
const CANDIDATE_NAMES={'newcomer:independent':'小黃','newcomer:kmt':'小蔣','newcomer:dpp':'小沈','heir:independent':'小成','heir:kmt':'小廣','heir:dpp':'小柯','incumbent:independent':'老黃','incumbent:kmt':'老傅','incumbent:dpp':'老柯'};
const candidateName=(settings={})=>{const n=normalizeSettings(settings);return CANDIDATE_NAMES[n.background+':'+n.affiliation]||'小沈';};
const PARTIES={
 independent:{id:'independent',title:'無黨籍',short:'無黨',offerKinds:null,color:'#9a7b4f',fundraise:1,subsidy:0,description:'沒有黨徽，也沒有黨部資源和黨的立場要顧；沒有政黨傾向的選民比較願意聽你說。'},
 kmt:{id:'kmt',title:'中國國民黨',short:'藍',offerKinds:['trade','any'],color:'#1f4f9c',fundraise:1.3,subsidy:150000,description:'藍色黨徽。這一區約 46% 選民投國民黨，但要分給好幾位國民黨候選人。黨部補助 15 萬、募款 ×1.3；同黨選民一開始比較挺你，違反黨的立場時流失也比較多。'},
 dpp:{id:'dpp',title:'民主進步黨',short:'綠',offerKinds:['civic','any'],color:'#2e8b4f',fundraise:1.3,subsidy:150000,description:'綠色黨徽。這一區約 24% 選民投民進黨，但要分給幾位民進黨候選人。黨部補助 15 萬、募款 ×1.3；同黨選民一開始比較挺你，違反黨的立場時流失也比較多。'}
};
// Party aid on top of the opening subsidy: a second grant mid-campaign and the party machine mobilising its voters for the final push.
// Both depend on keeping the party line: full while you keep it, half after one public break, nothing after two.
const PARTY_AID={subsidyDay:SCHEDULE.aid.subsidyDay,subsidy:150000,mobilizeDay:SCHEDULE.aid.mobilizeDay,mobilize:{kmt:700,dpp:700},loyalty:[1,.5,0]};
function partyBreaks(s){const party=partyOf(s,0);if(!party)return 0;return Object.entries(PARTY_LINES[party]||{}).filter(([t,plan])=>{const last=lastPlan(s.player,t);return last&&last.answer!==plan;}).length;}
const partyLoyalty=s=>PARTY_AID.loyalty[Math.min(partyBreaks(s),PARTY_AID.loyalty.length-1)];
function partyAid(s){const party=partyOf(s,0);if(!party)return null;const f=partyLoyalty(s)*(identity(s).partyAid??1),breaks=partyBreaks(s);let note=null;
 if(s.day===PARTY_AID.subsidyDay){const money=Math.round(PARTY_AID.subsidy*f);s.budget.donations+=money;s.budget.available+=money;note={kind:'subsidy',day:s.day,money,breaks};}
 if(s.day===PARTY_AID.mobilizeDay){const votes=Math.round((PARTY_AID.mobilize[party]||0)*f);if(votes)s.player.blocs.push({party,votes,status:'active'});note={kind:'mobilize',day:s.day,votes,breaks};}
 if(note)(s.partyAid||=[]).push(note);return note;}
// 小馬 runs for the other big party; against an independent he is from either one.
const rivalParty=(settings,seed)=>settings.affiliation==='kmt'?'dpp':settings.affiliation==='dpp'?'kmt':rand(seed,'rival-party')<.5?'kmt':'dpp';
const partyOf=(s,index)=>index?(s.rival.party||'kmt'):s.settings?.affiliation==='independent'?null:s.settings?.affiliation;
const partyFundraise=(s,index)=>PARTIES[partyOf(s,index)||'independent']?.fundraise||1;
function normalizeSettings(value={}){const affiliation=PARTIES[value.affiliation]?value.affiliation:'independent',background=LEGACY_BACKGROUNDS[value.background]||value.background;return{affiliation,background:BACKGROUNDS[background]?background:'newcomer'};}
function configure(s,value={}){if(s.version!==VERSION||s.started)return false;s.settings=normalizeSettings({...s.settings,...value});s.player.name=candidateName(s.settings);s.rival.party=rivalParty(s.settings,s.seed);return true;}
function speakerFor(s,venue){const main=s.landscape?.main?.[venue]??0,group=GROUPS[main],names=SPEAKERS[group.id],k=Math.max(0,Object.keys(VENUES).indexOf(venue));return{id:venue,name:names[k%names.length],role:(RESIDENTS[venue]||RESIDENTS.market).role,group:main,groupTitle:group.title};}
// Three faces only: like, no feeling, dislike. How much people like it shows in the estimate after deep research.
const tone=e=>e>=.008?'up':e>=-.006?'flat':'down';
const planIndex=(topic,mode)=>TOPICS[topic]?.plans?.findIndex(x=>x.id===mode)??-1;
// The speaker reacts like the majority of their own group, so what they say matches the crowd's faces.
function speakerTone(s,speaker,topic,mode){const G=s.landscape.groups[speaker.group],k=planIndex(topic,mode);if(topic==='tip')return 'flat';if(k>=0){const lean=G.lean[topic],close=Math.abs(lean-.5)<.2;return close?'flat':k===sideOf(lean)?'up':'down';}return tone(promiseValue(s,s.player,G.promise,mode));}
const SPEAKER_LINES={up:'對！就是要這樣，我會投你。',slight:'還可以，細節再說清楚一點。',flat:'嗯，我記下了，有進度再說。',down:'這不是我要的。'};
const ACTIONS=[
{id:'prepare',title:'準備政見',cost:0,loc:'prepare',description:'自己把一個議題查清楚。',benefit:'看清三群人在這題的比例；之後談這題更有說服力。',risk:'占一回合；不對外曝光。'},
{id:'canvass',title:'街頭拜訪',cost:0,loc:'canvass',description:'到地點和居民聊，回答他們提出的問題。',benefit:'免費；現場主要人潮的反應最大。',risk:'下雨時人少。'},
{id:'rally',title:'辦造勢活動',cost:COSTS.rally,loc:'canvass',description:'在地點辦一場造勢，講你所有公開過的立場；至少表態 2 題才能辦。',benefit:'一次很多人聽到你；立場合他們，加分就多。',risk:COSTS.rally/10000+' 萬；還沒表態過的議題，大家只覺得熱鬧。'},
{id:'tv',title:'上電視節目',cost:COSTS.tv,loc:'tv',description:'接受地方節目訪問；主持人從三個熱門議題抽一題問你。',benefit:'三群人都看得到，一次接觸很多人。',risk:'18 萬；抽到沒準備的題會卡詞，可加 8 萬買專訪指定題目。'},
{id:'fundraise',title:'公開募款',cost:0,loc:'fundraise',description:'用一回合募競選款。',benefit:'募得 8–16 萬，同行助手每人另募 8,000–12,000 元。',risk:'這回合沒有對外拉票。'},
{id:'recruit',title:'擴充團隊',cost:0,loc:'recruit',description:'多請助手，下回合開始幫你拉票。',benefit:'每多一位助手，每回合多接觸一些人。',risk:'每人月薪 5 萬，按剩餘天數預付。'},
{id:'online',title:'經營新媒體',cost:0,loc:'online',description:'讓助手開直播、剪短影音，回答網友留言。',benefit:'免費；主要觸及青年，街頭很少遇到他們。',risk:'要用 1–2 位助手；觸及不穩定，可能爆紅，也可能沒人看。'},{id:'dig',title:'挖黑料',cost:COSTS.dig,loc:'prepare',description:'派人去挖小馬的黑料，挖到的料放進黑料檔案。',benefit:'挖到：查證後挑時機爆，不信小馬的人轉向你。',risk:'10 萬；可能空手而回，也可能被小馬反咬一口，掉票的是你。每局最多 2 次，第 2 回合起。'},
{id:'press',title:'開記者會爆料',cost:0,loc:'tv',description:'公開黑料檔案裡的料。',benefit:'料站得住：他掉票，不信他的人轉向你。',risk:'不是真的，掉票的是你；先查證比較穩。'},
{id:'debate',title:'政見發表會',cost:0,loc:'debate',description:'每位候選人上台回答同一題。',benefit:'三群人都聽得到，小馬也在台上。',risk:'只在第 '+DEBATE_ROUND+' 回合；不去的話，小馬獨占舞台。'}];
const rand=(seed,...parts)=>{let h=(2166136261^(Number(seed)>>>0))>>>0;for(const c of parts.join('|')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return(h>>>0)/4294967296;};
const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function budget(personal=1000000){return{committed:personal,personalContribution:personal,donations:0,deposit:160000,available:personal-160000,spent:0,salarySpent:0,refunded:0,forfeited:0};}
function actor(name,index){return{name,index,recognition:index?8:4,known:[],team:null,crewRules:'monthly',contracts:[],npcMemory:{},residents:{},promises:[],actions:[],counts:{},blocs:[],heard:{},studied:{},billboards:[]};}
function startingActor(name,index){const a=actor(name,index);a.team={hiredDay:0,size:2,members:['小葉','阿哲'].map((name,i)=>({id:`${index}-staff-start-${i}`,name,hiredDay:0}))};return a;}
// A campaign plan records intent. The actions, not this label, earn its assets.
const CAMPAIGN_PLANS=[{id:'organization',title:'地方組織戰',pitch:'先跑熟一個地方，再讓地方小隊替你繼續跑。'},{id:'media',title:'議題曝光戰',pitch:'先準備能講清楚的議題，再接節目與後續直播。'}];
const CAMPAIGN_ROUND=4;
const RECRUIT_LEVELS=[2,3,4];
const MAX_HELPERS=RECRUIT_LEVELS.at(-1);
const NETWORK={reach:144,depth:1.2,founding:1.25};
const RESULT_GRADES=[{id:'high',title:'高票當選',rank:10},{id:'steady',title:'穩上',rank:11},{id:'narrow',title:'險勝',rank:ELECTION.seats}];
function freshCampaign(){return{plan:null,opportunity:{round:CAMPAIGN_ROUND,chosen:null,venue:null,topic:null},network:null,followup:null,latest:null};}
function setCampaignPlan(s,id){if(s.version!==VERSION||s.phase!=='plan'||!CAMPAIGN_PLANS.some(p=>p.id===id))return false;upgrade(s);s.campaign.plan=id;return true;}
const campaignVisits=(s,venue)=>s.player.actions.filter(a=>!a.record&&['canvass','rally'].includes(a.action)&&a.venue===venue).length;
function campaignOfferData(s){const c=s.campaign||freshCampaign(),o=c.opportunity,venue=o.venue||Object.keys(VENUES).sort((a,b)=>campaignVisits(s,b)-campaignVisits(s,a))[0],pool=tvPool(s),topic=o.topic||[...pool].sort((a,b)=>Number(s.player.known.includes(b))-Number(s.player.known.includes(a)))[0];return{...o,venue,topic};}
function lockCampaignOffer(s){if(s.day!==CAMPAIGN_ROUND-1)return;const o=campaignOfferData(s);s.campaign.opportunity.venue=o.venue;s.campaign.opportunity.topic=o.topic;}
function campaignView(s){upgrade(s);const c=s.campaign,o=campaignOfferData(s),plan=CAMPAIGN_PLANS.find(p=>p.id===c.plan),publicPlans=topicsOf(s).filter(t=>lastPlan(s.player,t)),visits=Math.max(0,...Object.keys(VENUES).map(v=>campaignVisits(s,v)));
 const choices=[{id:'organization',title:c.network?'帶地方小隊擴編':'赴地方小隊成立會',action:'canvass',config:{campaignOpportunity:'organization',venue:o.venue},gain:`下回合起，小隊可在${VENUES[o.venue].title}替你講一條公開政見，約有一次街訪的觸及；已有小隊則擴大觸及。`,cost:'占本回合，錯過免費專訪。'},{id:'media',title:'接下臨時免費專訪',action:'tv',config:{campaignOpportunity:'media',topic:o.topic},gain:`省下 18 萬節目費，指定談「${TOPICS[o.topic].title}」。準備好、談得好，下一回合有接續直播。`,cost:'占本回合，錯過這次地方小隊成立或擴編；沒準備仍可能卡詞。'}].map(x=>{const p=preview(s,x.action,x.config);return{...x,allowed:p.allowed,reason:p.reason};});
 const status=o.chosen?'taken':s.day>o.round?'missed':s.day===o.round?'open':'upcoming',opportunity=s.day>=o.round?{round:o.round,status,chosen:o.chosen,title:status==='open'?'兩場撞期，你只能親自去一場':status==='upcoming'?`第 ${o.round} 回合，兩場邀約撞期`:status==='missed'?'兩場邀約都已結束':'這次取捨留下來了',text:status==='missed'?'你照原行程走，兩個機會都沒有保留。':status==='taken'?(o.chosen==='organization'?'你留在地方，免費專訪已讓給別人。':c.network?'你去了專訪，錯過這次小隊擴編。':'你去了專訪，地方小隊沒有成立。'):'地方幹部邀你組隊，節目也臨時空出專訪；這回合只能親自去一場。',choices}:null;
 const assets=c.network?[{id:'network',title:VENUES[c.network.venue].title+'地方小隊',text:`${s.day<=c.network.formed?'下回合起':'每回合'}依你的分工講一條公開政見；可調整地點與議題，守住當地主要人群。` }]:[],f=c.followup&&c.followup.round===s.day&&!c.followup.used?c.followup:null,fp=f?preview(s,'online',{campaignFollowup:true}):null;
 const progress=c.plan==='media'?[{label:'準備至少一個議題',done:s.player.known.some(t=>t!=='tip')},{label:'帶著準備上節目／直播',done:s.player.actions.some(a=>['tv','online','debate'].includes(a.action)&&a.prepared&&!a.record)},{label:'接住隔回合的直播邀約',done:s.player.actions.some(a=>a.campaignFollowup)}]:[{label:'先公開一個具體政見',done:publicPlans.length>0},{label:'同一個地方跑熟兩次',done:visits>=2},{label:'讓地方小隊持續跑',done:!!c.network}];
 const hint=!c.plan?'這局想怎麼打？先定一個方向，隨時可以改。':c.plan==='organization'?'先在一個地方累積人脈；成立小隊後，你去別處，他們照樣跑。':'準備 → 曝光 → 接續直播。整場上電視越多，重複觀眾越多。';
 return{plan:c.plan,title:plan?.title||'這局的打法',hint,progress,rival:s.rival.profile==='research'?{title:'小馬：準備後搶曝光',text:'他偏好查議題、上節目，也會盯你追近的群體。'}:{title:'小馬：扎地方、搶支持',text:'他偏好街頭拜訪和擴充團隊，也會盯你追近的群體。'},opportunity,assets,followup:f?{title:'接續直播邀約',text:`上回談「${TOPICS[f.topic].title}」有迴響。${followupFit(s,f.topic).text}；這回合可接著講，過了就散了。`,fit:followupFit(s,f.topic),action:'online',config:{campaignFollowup:true},allowed:fp.allowed,reason:fp.reason}:null,latest:c.latest};}
function tvFatigue(s,a){const count=a.actions.filter(x=>!x.record&&x.day<s.day&&x.action==='tv').length;return 1/(1+count*.6);}
// One earned local team; each assignment uses a public commitment and a place that actually backs the campaign.
function networkPlans(s){return topicsOf(s).map(t=>previousAnswer(s.player,t)).filter(x=>x&&x.day>0&&!x.record&&planIndex(x.topic,x.answer)>=0);}
function formNetwork(s,venue,founding=false){if(!VENUES[venue])return null;s.campaign||=freshCampaign();const c=s.campaign;if(!c.network)c.network={venue,topic:null,formed:s.day,bases:[venue],boost:1};const n=c.network;n.bases=[...new Set([...(n.bases||[n.venue]),venue])];if(founding){n.boost=NETWORK.founding;n.venue=venue;}return n;}
function networkView(s){const n=s.campaign?.network,plans=networkPlans(s),topics=plans.map(x=>({id:x.topic,title:TOPICS[x.topic].title,quote:x.quote,answer:x.answer})),places=n?[...new Set([...(n.bases||[n.venue]),...Object.keys(s.chiefs||{}).filter(v=>s.chiefs[v].broken&&s.chiefs[v].visits>0)])].filter(v=>VENUES[v]):[];return{active:!!n,formed:n?.formed??null,ready:!!n&&n.formed<s.day,venue:n?.venue||null,topic:topics.some(x=>x.id===n?.topic)?n.topic:plans.slice().sort((a,b)=>b.day-a.day)[0]?.topic||null,topics,venues:places.map(id=>({id,title:VENUES[id].title})),boost:n?.boost||1};}
function setNetworkAssignment(s,config={}){if(!s?.started||s.phase!=='plan')return false;const v=networkView(s),venue=config.venue??v.venue,topic=config.topic??v.topic;if(!v.active||!v.venues.some(x=>x.id===venue)||!v.topics.some(x=>x.id===topic))return false;s.campaign.network.venue=venue;s.campaign.network.topic=topic;return true;}
function followupFit(s,topic){const weight=GROUP_CARES.young[topic]||0,tier=weight>=1.4?'high':weight>=.8?'medium':'low',factor={high:1.9,medium:1.25,low:.75}[tier],text={high:'這題青年很在意，直播較容易留住觀眾',medium:'這題有部分青年在意，直播觸及適中',low:'這題青年較少在意，直播觸及有限'}[tier];return{tier,factor,text};}
function campaignNetworkWork(s){const n=s.campaign?.network;if(!n||n.formed>=s.day)return null;const v=networkView(s);n.topic=v.topic;const said=networkPlans(s).find(x=>x.topic===v.topic);if(!said)return{id:'local-network',title:'地方小隊等你的政見',result:'先選一條已公開的具體政見，小隊才能出發。',reach:0,votes:0};const stream='local-network-'+n.venue,r=contact(s,s.player,'team-canvass',said.answer,said.topic,stream,NETWORK.depth/TUNING.depth.team,n.venue,{reach:NETWORK.reach/TUNING.reach.team*(n.boost||1)});s.player.counts[countKey('team-canvass',stream)]=(s.player.counts[countKey('team-canvass',stream)]||0)+1;hear(s.player,said.topic,said.answer,r.audience);return{id:'local-network',title:VENUES[n.venue].title+'地方小隊',venue:n.venue,topic:said.topic,quote:said.quote,result:`小隊在${VENUES[n.venue].title}講「${said.quote}」，接觸 ${r.reach} 人，顧住當地${GROUPS[s.landscape.main[n.venue]].title}。`,protectedGroup:r.reach?s.landscape.main[n.venue]:null,reach:r.reach,positive:r.up,reserved:r.down,groups:r.groups,votes:r.votes};}
function campaignAfterAction(s,p,entry,contactReport){const c=s.campaign;let effect=null;if(p.campaignOpportunity==='organization'){const had=!!c.network;formNetwork(s,p.venue,true);effect={round:s.day,title:had?'地方小隊擴編':'地方小隊成立',text:`下回合起，小隊可在${VENUES[p.venue].title}替你講指定政見，觸及擴大。`};}else if(p.campaignOpportunity==='media')effect={round:s.day,title:'把握免費專訪',text:'這次省下 18 萬節目費；地方小隊成立或擴編的邀約已經錯過。'};
 if(p.campaignFollowup){c.followup.used=true;effect={round:s.day,title:'接住上回的話題',text:followupFit(s,p.topic).text+'。這次邀約用完了。'};}
 else if(['tv','online','debate'].includes(p.id)&&entry.prepared&&planIndex(p.topic,entry.answer)>=0&&contactReport?.votes>0&&s.day<DAYS){c.followup={round:s.day+1,topic:p.topic,used:false};effect={round:s.day,title:'有人邀你接著講',text:`「${TOPICS[p.topic].title}」有迴響：下一回合可接續直播，也可放掉去做別的事。`};}
 if(effect)c.latest=effect;entry.campaignOpportunity=p.campaignOpportunity||null;entry.campaignFollowup=!!p.campaignFollowup;return effect;}
function initial(seed,settings={}){seed=Number(seed)>>>0;settings=normalizeSettings(settings);const land=landscape(seed),player=Object.assign(startingActor(candidateName(settings),0),{insight:{}});
 return{settings,campaign:freshCampaign(),version:VERSION,revision:REVISION,rounds:DAYS,seed,started:false,day:1,phase:'plan',player,budget:budget(),rival:{...startingActor('小馬',1),budget:budget(),profile:rand(seed,'profile')<.5?'research':'street',party:rivalParty(settings,seed)},ledger:[],landscape:land,
  voters:Array.from({length:POPULATION},(_,i)=>{const g=voterGroup(seed,i,land.groups),G=land.groups[g];return{g,p:voterParty(seed,i),support:[.003+rand(seed,'initial-player',i)*.006,.036+rand(seed,'initial-rival',i)*.025],accuracy:rand(seed,'accuracy',i),cares:newsCares(seed,i,G.weights,voterCares(seed,i,G.weights)),pref:ISSUES.map(t=>rand(seed,'pref',i,t)<(G.lean[t]??.5)?'0':'1').join(''),rec:[1,1]};}),
  polls:[],journal:[],challenges:[],attribution:[],rivalPlan:null,offers:[],debate:null,events:initialEvents(seed),pending:null,recap:null,result:null};}
// Each sampled respondent names a candidate or says undecided, and the issue they care about most; both are noisy.
function samplePoll(s,day){const counts=[0,0,0,0],issues=Object.fromEntries(topicsOf(s).map(t=>[t,0])),byGroup=GROUPS.map(()=>Object.fromEntries(topicsOf(s).map(t=>[t,0]))),sizes=GROUPS.map(()=>0),n=400,g=s.landscape?.surge,undecided=Math.max(.15,.45-.03*day*10/DAYS);
 for(let j=0;j<n;j++){const index=Math.floor(rand(s.seed,'poll-person',day,j)*POPULATION),v=s.voters[index],r=rand(s.seed,'poll-answer',day,j);let k=3;if(rand(s.seed,'poll-undecided',day,j)>=undecided)k=r<v.support[0]?0:r<v.support[0]+v.support[1]?1:2;counts[k]++;sizes[v.g]++;const top=g&&surgeActive(s,g.topic,day)&&caresAbout(s,v,index,g.topic,day)&&rand(s.seed,'poll-issue',day,j)<.5?g.topic:v.cares?.[0];if(top){issues[top]++;byGroup[v.g][top]++;}}
 const share=(c,total)=>Math.round(c/Math.max(1,total)*1000)/10;
 return{day,label:day?`第 ${day} 回合（第 ${Math.round(day*ROUND_DAYS)} 天）抽樣`:'出發前抽樣',n,counts,percentages:counts.map(x=>Math.round(x/n*10000)/100),issues:Object.fromEntries(Object.entries(issues).map(([t,c])=>[t,share(c,n)])),issuesByGroup:byGroup.map((b,k)=>Object.fromEntries(Object.entries(b).map(([t,c])=>[t,share(c,sizes[k])]))),groupN:sizes};}
// A party's own voters start warmer to its candidate and the other big party's voters start cooler.
const partyBase=(party,v)=>!party||v.p==='none'?1:v.p===party?TUNING.party.base.same[party]:TUNING.party.base.opposite;
function start(s){if(s.started||s.version!==VERSION)return false;const bg=identity(s);s.budget=budget(bg.personal);for(let i=members(s.player).length;i<bg.helpers;i++)s.player.team.members.push({id:`0-staff-start-${i}`,name:['小葉','阿哲','佳佳','阿澄'][i],hiredDay:0});s.player.team.size=members(s.player).length;
 for(const a of[s.player,s.rival]){const b=a.index?s.rival.budget:s.budget,count=members(a).length,cost=count*50000,contract={id:`${a.index}-contract-start`,day:0,action:'contract',cost,baseCost:0,teamCost:cost,eventCost:0,income:0,people:count,days:30,monthlyRate:50000,description:'開局整月助手薪資，主角不領薪'};b.available-=cost;b.spent+=cost;b.salarySpent+=cost;a.contracts.push(copy(contract));if(!a.index)s.ledger.push(copy(contract));}
 s.rival.party||=rivalParty(s.settings,s.seed);const mine=partyOf(s,0),his=partyOf(s,1);for(const [b,p] of [[s.budget,mine],[s.rival.budget,his]]){const sub=Math.round((PARTIES[p||'independent']?.subsidy||0)*(b===s.budget?bg.partyAid??1:1));b.donations+=sub;b.available+=sub;}for(const v of s.voters){v.support[0]*=bg.supportBoost*TUNING.startBoost*partyBase(mine,v);v.support[1]*=partyBase(his,v);}if(bg.record)lastTermRecord(s);s.chiefs=Object.fromEntries(Object.keys(CHIEFS).map(v=>{const need=chiefNeed(s,v);return[v,{need,visits:0,broken:need===0,brokeDay:need===0?0:null}];}));if(bg.knows){const young=s.landscape.groups[2].weights,n=Array.isArray(bg.knows)?bg.knows[rand(s.seed,'knows')<.5?0:1]:bg.knows;for(const t of[...topicsOf(s)].sort((a,b)=>young[b]-young[a]).slice(0,n)){learn(s.player,t);reveal(s,t,'self');s.player.studied[t]=true;}}
 applyOrigin(s);s.route=baseGroup(s);
 s.started=true;s.startRace={you:Math.round(expectedVotes(s,0)),rival:Math.round(expectedVotes(s,1))};s.debate={round:DEBATE_ROUND,topic:debateTopic(s)};s.polls.push(samplePoll(s,0));s.deals=makeDeals(s);s.brokers=Object.fromEntries(Object.keys(s.deals).map(id=>[id,'open']));s.offers=initialOffers(s);s.crises=[];s.rivalPlan=planRival(s);s.roundStartRace=copy(raceView(s));return true;}
// The incumbent starts with last term's public stance on one issue and a shallow read of two more; none at group-share depth.
function lastTermRecord(s){const pool=placeTopicsOf(s),topic=pool[Math.floor(rand(s.seed,'record-topic')*pool.length)],plan=TOPICS[topic].plans[rand(s.seed,'record-plan')<.5?0:1],audience=s.voters.map((_,i)=>i).filter(i=>rand(s.seed,'record-audience',i)<.15);learn(s.player,topic);reveal(s,topic,'helper');hear(s.player,topic,plan.id,audience);s.player.actions.push({day:0,action:'tv',record:true,topic,answer:plan.id,quote:plan.text,prepared:true,venueTitle:'上一屆議會紀錄',cost:0,baseCost:0,teamCost:0,eventCost:0,income:0});for(const t of placeTopicsOf(s).filter(x=>x!==topic).sort((x,y)=>rand(s.seed,'record-known',x)-rand(s.seed,'record-known',y)).slice(0,2)){learn(s.player,t);reveal(s,t,'helper');}}
// The debate asks about the issue the most voters care about, or in about one game in four the current event they care about most;
// it is announced two rounds ahead so it can be prepared.
function debateTopic(s){const news=s.landscape.news||[],pool=news.length&&rand(s.seed,'debate-news')<DEBATE_NEWS?news:placeTopicsOf(s);return[...pool].sort((a,b)=>s.landscape.weights[b]-s.landscape.weights[a])[0];}
// Two offers per campaign, in the first and second acts, each on a different issue and open only in its round.
function initialOffers(s){const kinds=PARTIES[s.settings.affiliation].offerKinds,pool=Object.values(s.deals||{}).filter(o=>!kinds||kinds.includes(o.kind)||o.kind==='party'),pick=(list,salt)=>list.length?list[Math.floor(rand(s.seed,salt)*list.length)]:null,first=pick(pool,'offer-first'),second=pick(pool.filter(o=>o.topic!==first?.topic),'offer-second');
 return[first,second].filter(Boolean).map((o,k)=>({id:o.id,round:SCHEDULE.offers[k][0]+Math.floor(rand(s.seed,'offer-round',k)*SCHEDULE.offers[k].length),status:'pending',bloc:offerBloc(s,o),money:o.money}));}
// Organised votes a deal brings, with some variation per game.
const offerBloc=(s,d)=>Math.round(d.bloc*(.85+rand(s.seed,'offer-bloc',d.id)*.3)*TUNING.offerBloc/10)*10;
const brokerOpen=(s,id)=>!s.brokers||s.brokers[id]==='open';
const currentOffer=s=>(s.offers||[]).find(x=>x.status==='pending'&&x.round===s.day&&brokerOpen(s,x.id)&&dealOf(s,x.id))||null;
function offerView(s){const o=currentOffer(s);if(!o||!s.started||s.phase!=='plan')return null;const def=dealOf(s,o.id),t=TOPICS[def.topic],plan=t.plans.find(p=>p.id===def.plan),prior=lastPlan(s.player,def.topic),line=partyLine(s,0,def.topic);return{id:o.id,org:def.org,name:def.name,gives:def.gives,perk:def.perk,pitch:def.pitch,topic:def.topic,topicTitle:t.title,plan:def.plan,planText:plan.text,bloc:o.bloc,money:o.money,venue:def.venue,round:o.round,faces:answerFaces(s,def.topic,def.plan),estimate:answerEstimate(s,def.topic,def.plan,{id:'offer',venue:def.venue,stream:o.id}),flip:prior&&prior.answer!==def.plan?prior.quote:null,partyLine:line?{keeps:line===def.plan,party:partyOf(s,0)}:null};}
// The next round's offer is announced a round ahead, so its issue can be researched before deciding.
function upcomingOffer(s){const o=(s.offers||[]).find(x=>x.status==='pending'&&x.round===s.day+1);if(!o||!s.started||s.phase==='result'||!brokerOpen(s,o.id)||!dealOf(s,o.id))return null;const def=dealOf(s,o.id),t=TOPICS[def.topic];return{id:o.id,org:def.org,topic:def.topic,topicTitle:t.title,planText:t.plans.find(p=>p.id===def.plan).text,round:o.round};}
function donorView(s){return Object.values(s.deals||{}).map(d=>{const t=TOPICS[d.topic],prior=lastPlan(s.player,d.topic),line=partyLine(s,0,d.topic);return{...copy(d),status:s.brokers?.[d.id]||'open',topicTitle:t.title,planText:t.plans.find(p=>p.id===d.plan).text,faces:answerFaces(s,d.topic,d.plan),flip:prior&&prior.answer!==d.plan?prior.quote:null,partyLine:line?{keeps:line===d.plan}:null,estimate:answerEstimate(s,d.topic,d.plan,{id:'offer',venue:d.venue,stream:d.id})};});}
function respondOffer(s,choice){const view=offerView(s);if(!view||!['accept','decline'].includes(choice))return false;const o=currentOffer(s);o.respondedDay=s.day;if(choice==='accept'){o.status='accepted';o.effect=commitOffer(s,s.player,o);}else{o.status='declined';rivalTakesOffer(s,o);}refreshDeals(s);return true;}
// A declined or lapsed offer can go to the rival when his public stance allows it.
function rivalTakesOffer(s,o){const def=dealOf(s,o.id),prior=lastPlan(s.rival,def.topic);if(prior&&prior.answer!==def.plan||rand(s.seed,'offer-rival',o.id)>=TUNING.offerRivalTake)return null;o.taker=1;o.rivalEffect=commitOffer(s,s.rival,o);return o.rivalEffect;}
// Accepting makes the stance public at once: the organisation's people hear it and react, and its members' votes come along.
function commitOffer(s,a,o){const def=dealOf(s,o.id),t=TOPICS[def.topic],plan=t.plans.find(p=>p.id===def.plan),b=a.index?a.budget:s.budget,before=expectedVotes(s,a.index),flip=a.index===0?flipReaction(s,def.topic,def.plan):null;
 learn(a,def.topic);if(a.index===0)reveal(s,def.topic,'helper');const r=contact(s,a,'offer',def.plan,def.topic,o.id,1,def.venue),cost=a.index===0?dealCost(s,o.id):null;a.counts[countKey('offer',o.id)]=(a.counts[countKey('offer',o.id)]||0)+1;hear(a,def.topic,def.plan,r.audience);const line=partyLineHit(s,a,def.topic,def.plan,r.audience);
 a.actions.push({day:s.day,action:'offer',record:'offer',offer:o.id,topic:def.topic,answer:def.plan,quote:`與${def.org}約定：${plan.text}`,prepared:true,venue:def.venue,venueTitle:def.org,cost:0,baseCost:0,teamCost:0,eventCost:0,income:o.money});
 if(o.id==='developer'&&a.index===0)nudge(s,0,s.voters.map((_,i)=>i).filter(i=>s.voters[i].g===2),TUNING.developer.young);
 a.blocs.push({offer:o.id,votes:o.bloc,status:'active'});b.donations+=o.money;b.available+=o.money;if(def.perk==='tv')a.tvCredit=(a.tvCredit||0)+1;if(s.brokers?.[o.id])s.brokers[o.id]=a.index===0?'yours':'his';if(a.index===0)o.audience=r.audience;
 return{owner:a.index,round:s.day,votes:expectedVotes(s,a.index)-before,contact:r.votes,bloc:o.bloc,money:o.money,groups:r.groups.map((g,k)=>({id:g.id,title:g.title,votes:g.votes+(line?.byGroup?.[k]||0)})),flip:flip?{people:flip.people,votes:flip.votes}:null,partyLine:line?{kept:line.kept,votes:line.votes}:null,cost};}
// Some deals cost you across the district: one group cools on you and is harder to win back for the rest of the race.
function dealCost(s,id){const c=TUNING.dealCost[id];if(!c)return null;const g=GROUPS.findIndex(x=>x.id===c.group),byGroup=GROUPS.map(()=>0);let votes=0;for(let i=0;i<POPULATION;i++){const v=s.voters[i];if(v.g!==g||rand(s.seed,'deal-cost',id,i)>=c.share)continue;const before=v.support[0];apply(v,0,-c.hit);if(v.rec)v.rec[0]=Math.max(TUNING.receptivityFloor,v.rec[0]*c.rec);const d=(v.support[0]-before)*PER_VOTER;votes+=d;byGroup[g]+=d;}return{votes,byGroup,group:g,text:BROKERS[id]?.cost||''};}
function lapseOffers(s){const out=[];for(const o of s.offers||[])if(o.status==='pending'&&o.round<=s.day){o.status='expired';if(brokerOpen(s,o.id)&&dealOf(s,o.id)&&rivalTakesOffer(s,o))out.push(o);}return out;}
const rainy=(s,day=s.day)=>rand(s.seed,'weather',day)<.3;
function weather(s,day=s.day){return rainy(s,day)?{id:'rain',title:'午後短暫陣雨',text:'市場停留時間縮短，雙方街訪都受影響。',factor:.75}:{id:'normal',title:'行程照常',text:'沒有額外天氣影響。',factor:1};}
// Today's weather is certain on the plan screen; next round shows a seeded chance tied to the real outcome.
function forecast(s){const next=s.day<DAYS?s.day+1:null;return{now:weather(s),next:next?{day:next,rainChance:Math.round(((rainy(s,next)?.6:.1)+rand(s.seed,'forecast',next)*.2)*10)*10}:null};}
const blocVotes=(s,index=0)=>((index?s.rival:s.player).blocs||[]).filter(b=>b.status==='active').reduce((n,b)=>n+b.votes,0);
const expectedVotes=(s,index=0)=>s.voters.reduce((n,v)=>n+v.support[index],0)*PER_VOTER+blocVotes(s,index);
function groupVotes(s,index=0){const out=GROUPS.map(()=>0);for(const v of s.voters)out[v.g]+=v.support[index]*PER_VOTER;return out;}
function partyVotes(s,index=0){const out={kmt:0,dpp:0,none:0};for(const v of s.voters)out[v.p||'none']+=v.support[index]*PER_VOTER;return out;}
// Everyone's expected valid votes: you, the rival, then the 25 background candidates sharing what is left.
function expectedTally(s){const you=expectedVotes(s,0),rival=expectedVotes(s,1),pool=Math.max(0,POPULATION*PER_VOTER-you-rival),total=ELECTION.background.reduce((a,b)=>a+b,0);return[you,rival,...ELECTION.background.map(x=>pool*x/total)];}
// The live cut-off a candidate must beat: the 13th highest expected total among everyone else.
function seatLine(s,index=0){return expectedTally(s).filter((_,i)=>i!==index).sort((a,b)=>b-a)[ELECTION.seats-1];}
// The line shown to the player is fixed at last election's final seat; 小馬 is shown beside it because he can push the real cut-off up.
function outlook(s){const v=expectedVotes(s),k=TUNING.estimateSpread;return{estimate:Math.round(v),low:Math.round(v*(1-k)),high:Math.round(v*(1+k)),line:LINE,live:Math.round(seatLine(s)),seatLine:[Math.round(LINE*(1-k/2)),Math.round(LINE*(1+k/2))],rival:Math.round(expectedVotes(s,1))};}
function raceView(s){const o=outlook(s),you=groupVotes(s,0),rival=groupVotes(s,1),tally=expectedTally(s),rank=1+tally.filter((x,i)=>i>0&&x>tally[0]).length,rivalRank=1+tally.filter((x,i)=>i!==1&&x>tally[1]).length;return{...o,you:o.estimate,rank,rivalRank,seats:ELECTION.seats,groups:GROUPS.map((g,k)=>({id:g.id,title:g.title,you:Math.round(you[k]),rival:Math.round(rival[k])})),bloc:{you:blocVotes(s,0),rival:blocVotes(s,1)},billboards:(s.player.billboards||[]).length};}
// Polls: a party campaign commissions four, an independent can afford two. Each shows the three groups, your place and how far the line is,
// and turns the gap into how many more points of each group you would need. Between polls the group numbers stay at the last one.
const POLL_DAYS=SCHEDULE.polls;
const pollDays=s=>POLL_DAYS[partyOf(s,0)?'party':'independent'];
// How many more points of each group would close a gap; it needs only the group sizes, which everyone knows.
function gapPlan(s,need){const valid=POPULATION*PER_VOTER;return s.landscape.groups.map((G,k)=>({id:GROUPS[k].id,title:GROUPS[k].title,addPct:need>0?Math.round(need/(valid*G.share)*1000)/10:0}));}
function takePoll(s){const r=raceView(s),need=Math.max(0,Math.round(r.line-r.you)),valid=POPULATION*PER_VOTER,plan=gapPlan(s,need);
 const groups=r.groups.map((g,k)=>{const size=valid*s.landscape.groups[k].share;return{...g,youPct:Math.round(g.you/size*1000)/10,rivalPct:Math.round(g.rival/size*1000)/10,addPct:plan[k].addPct};});
 const focus=[...groups].sort((a,b)=>a.youPct-b.youPct)[0].id,report={day:s.day,you:Math.round(r.you),rank:r.rank,line:r.line,need,groups,focus};(s.pollReports||=[]).push(report);return report;}
function pollView(s){const days=pollDays(s),reports=s.pollReports||[];return{days,latest:copy(reports.at(-1)||null),next:days.find(d=>d>s.day)||null,taken:reports.length,total:days.length};}
// Staff's read of your support in each group, as a range of points that holds the model's number but is not centred on it.
// A poll round's range is narrow; every round played since the last poll (or since the start, before the first) widens it.
const ESTIMATE={narrow:.08,perRound:.12,widest:.6};
function supportEstimate(s){const days=pollDays(s),last=(s.pollReports||[]).at(-1)||null,played=s.day-1+(s.phase==='recap'||s.phase==='result'?1:0),age=last?played-(last.day-1):played+1,half=Math.min(ESTIMATE.widest,ESTIMATE.narrow+ESTIMATE.perRound*age),valid=POPULATION*PER_VOTER,mine=groupVotes(s,0);
 return{day:s.day,age,poll:!!last&&age===0,next:days.find(d=>d>s.day)||null,groups:GROUPS.map((g,k)=>{const pct=mine[k]/(valid*s.landscape.groups[k].share)*100,mid=pct*(1+(rand(s.seed,'staff-estimate',k,last?last.day:0)-.5)*half);return{id:g.id,title:g.title,lo:Math.floor(mid*(1-half)*10)/10,hi:Math.ceil(mid*(1+half)*10)/10};})};}
// Vote banks (基本盤): the group the candidate wins this district with follows who they are; nothing is picked. An incumbent's is the
// elders, a newcomer's the young (met mostly online) and an heir's the main crowd at the family's market, so the district can make it
// the elders; an origin preset can name its own (base). Each group's target share is its usual share for a winning campaign
// (reachable: elders a little above the line's average, the young, met mostly online, well below it) tilted by the base: ×1.3 for the
// base group, ×1 for the larger of the other two, ×.8 for the last. The three targets in votes add up to the seat line. A base's home
// is the places where its group is the main crowd this game (the stream for the young, who fill no place by day); there the candidate
// reaches more people: a fifth more at a place, 30% more online.
const ROUTE={tilt:[1.3,1,.8],reachable:{elder:1.1,middle:1,young:.6},reach:{place:1.2,online:1.3}};
const ROUTE_PERKS={elder:'街坊口耳相傳',middle:'家長群組轉傳',young:'直播有人分享'};
const PLACE_SHORT={market:'市場',street:'路口',plaza:'廣場',river:'河濱',temple:'廟口',online:'直播'};
function routeOptions(s){const L=s?.landscape;if(!L?.groups||!L.main)return[];const valid=POPULATION*PER_VOTER;return GROUPS.map((g,k)=>{const others=[0,1,2].filter(x=>x!==k).sort((x,y)=>L.groups[y].share-L.groups[x].share||x-y),order=[k,...others],home=k===2?['online']:PLACE_IDS.filter(v=>L.main[v]===k),names=home.map(v=>PLACE_SHORT[v]);
 const raw=GROUPS.map((G2,x)=>L.groups[x].share*ROUTE.reachable[G2.id]*ROUTE.tilt[order.indexOf(x)]),sum=raw.reduce((a,b)=>a+b,0),votes=raw.map(w=>Math.round(LINE*w/sum));votes[others[1]]=LINE-votes[k]-votes[others[0]];
 const targets=GROUPS.map((G2,x)=>({id:G2.id,title:G2.title,weight:Math.round(votes[x]/LINE*1000)/1000,votes:votes[x],pct:Math.round(votes[x]/(valid*L.groups[x].share)*1000)/10,focus:x!==others[1]}));
 return{id:g.id,group:k,partner:others[0],title:g.title+'・'+(names.length>2?names.slice(0,2).join('、')+'等':names.join('、')),home,names,homeTitles:home.map(v=>VENUES[v]?.title||'直播間'),perk:ROUTE_PERKS[g.id],perkText:'在'+names.join('、')+'拉票，多接觸 '+Math.round(((k===2?ROUTE.reach.online:ROUTE.reach.place)-1)*100)+'% 的人',targets};});}
// Who the vote bank is: the origin's own group if it names one, else the identity's (an heir's follows the district's market crowd).
const BASE_OF={newcomer:'young',incumbent:'elder'};
function baseGroup(s,background=s?.settings?.background){const b=BACKGROUNDS[background]?background:'newcomer',o=s?.started&&b===s.settings?.background?originOf(s):originFor(s?.seed,b);
 return o?.base||BASE_OF[b]||GROUPS[s?.landscape?.main?.market]?.id||'middle';}
// What the opening card and the profile show before the start (for any identity) and in play: the group, its home places and the perk.
function baseView(s,background=s?.settings?.background){const id=baseGroup(s,background),r=routeOptions(s).find(x=>x.id===id);return r?{id,group:r.group,title:r.title,places:r.names,home:r.home,homeTitles:r.homeTitles,perk:r.perk,perkText:r.perkText}:null;}
const routeOf=s=>s?.route?routeOptions(s).find(r=>r.id===s.route)||null:null;
function chooseRoute(s,id){if(!s||s.started||!routeOptions(s).some(r=>r.id===id))return false;s.route=id;return true;}
// The home bonus: the candidate's own street visits and rallies at the route's places, or streams on the young route.
function homeReach(s,a,action,venue=''){if(a?.index!==0||!s?.route||!s.landscape?.main)return 1;const k=GROUPS.findIndex(g=>g.id===s.route);if(action==='online')return k===2?ROUTE.reach.online:1;return(action==='canvass'||action==='rally')&&VENUES[venue]&&s.landscape.main[venue]===k?ROUTE.reach.place:1;}
// The route against the staff's estimate: each group's target share and whether the estimate is past it, short of it or around it.
function routeView(s){const r=routeOf(s);if(!r)return null;const e=s.started?supportEstimate(s):null;return{...r,targets:r.targets.map((t,k)=>{const g=e?.groups[k];return{...t,lo:g?.lo??null,hi:g?.hi??null,status:!g?null:g.lo>=t.pct?'ahead':g.hi<t.pct?'behind':'near'};})};}
// What the map shows at each place (and the stream): its main crowd, whether that group is one the route counts on, and how it stands.
function routeCues(s){const r=routeView(s);if(!r||!s.started)return{};const out={};for(const v of[...PLACE_IDS,'online']){const k=v==='online'?2:s.landscape.main[v],t=r.targets[k];out[v]={group:k,title:t.title,focus:t.focus,main:k===r.group,home:r.home.includes(v),pct:t.pct,status:t.status};}return out;}
// Each poll as news: your rank, and the group that moved most since the poll before (the first poll has none, so it names the weakest group).
function pollNews(s){const reports=s.pollReports||[];return reports.map((r,i)=>{const prev=reports[i-1]||null,moves=r.groups.map((g,k)=>({id:g.id,title:g.title,from:prev?prev.groups[k].youPct:null,to:g.youPct})),moved=prev?moves.filter(m=>m.to!==m.from).sort((a,b)=>Math.abs(b.to-b.from)-Math.abs(a.to-a.from))[0]||null:null,weak=r.groups.find(g=>g.id===r.focus);return{day:r.day,rank:r.rank,rankBefore:prev?prev.rank:null,moved,weakest:{id:weak.id,title:weak.title,pct:weak.youPct}};});}
function snapshot(s,a,b){return{cash:b.available,recognition:a.recognition,votes:Math.round(expectedVotes(s,a.index)),known:a.known.length,unresolved:a.promises.filter(p=>['pending','unresolved'].includes(p.status)).length};}
function upgrade(s){if(s&&s.version===VERSION){s.campaign||=freshCampaign();for(const a of[s.player,s.rival]){a.npcMemory||={};a.residents||={};a.contracts||=[];a.blocs||=[];a.heard||={};a.studied||={};a.billboards||=[];}s.player.insight||={};if(!s.player.dirt){s.player.dirt=s.player.evidence?[{id:'dirt-'+s.player.evidence.round,kind:'tender',round:s.player.evidence.round,holds:true,verified:false,used:!!s.player.evidence.used}]:[];}s.attribution||=[];s.offers||=[];s.landscape||=landscape(s.seed);s.rival.party||=rivalParty(s.settings,s.seed);if(s.events?.tip?.responseDue&&s.events.tip.history?.filter(x=>x.mode).at(-1)?.mode==='tip_correct')s.events.tip.responseDue=false;}return s;}
// Research reveals each group's lean: an assistant's scouting gives every group's side and whether it is close; your own reading adds the share.
function reveal(s,topic,source){if(!TOPICS[topic]?.plans?.length)return false;const old=s.player.insight[topic],precise=source!=='helper';if(old&&(old.level==='precise'||!precise))return false;
 s.player.insight[topic]={level:precise?'precise':'direction',by:source,groups:s.landscape.groups.map((G,g)=>{const lean=G.lean[topic],close=Math.abs(lean-.5)<.2;return precise?{side:sideOf(lean),close,share:Math.round(clamp(lean+(rand(s.seed,'insight',topic,g)-.5)*.06,0,1)*100)}:{side:sideOf(lean),close};})};return precise;}
function insightLine(s,topic){const ins=s.player.insight?.[topic];if(!ins||!TOPICS[topic]?.plans?.length)return'';return(ins.level!=='precise'?'助手打聽：':ins.by==='deep'?'深入研究：':'親自查過：')+ins.groups.map((x,g)=>GROUPS[g].title+(x.close?'稍多人要':'多數要')+'「'+TOPICS[topic].plans[x.side].text+'」'+(Number.isFinite(x.share)?`（約 ${Math.round((x.side===0?x.share:100-x.share)/10)} 成）`:'')).join('；')+'。';}
function topicPromise(a,topic){return a.promises.find(p=>p.topic===topic&&['pending','unresolved'].includes(p.status));}
function activePromise(a){return a.promises.find(x=>['pending','unresolved'].includes(x.status)&&(x.reviewedVersion||0)<(x.version||1));}
const STANCE_ACTIONS=['canvass','tv','debate','offer','online'];
function previousAnswer(a,topic){return [...a.actions].reverse().find(x=>x.topic===topic&&x.answer&&STANCE_ACTIONS.includes(x.action));}
function lastPlan(a,topic){return [...a.actions].reverse().find(x=>x.topic===topic&&STANCE_ACTIONS.includes(x.action)&&planIndex(topic,x.answer)>=0)||null;}
// Public campaign highlights only: at most three distinct topics, most recently stated first.
// The action index and recorded quote identify the evidence; no policies are inferred from research,
// party/background defaults or last term's record. This view neither upgrades nor mutates old saves.
function platformView(s){
 const topics=new Map();
 for(const [actionIndex,e] of(s?.player?.actions||[]).entries()){
  if(!Number.isInteger(e.day)||e.day<1||e.day>(s.day??DAYS)||e.record===true||!STANCE_ACTIONS.includes(e.action)||!TOPICS[e.topic]?.plans?.length||typeof e.quote!=='string'||!e.quote.trim())continue;
  const kind=planIndex(e.topic,e.answer)>=0?'policy':e.answer==='guarantee'?'guarantee':null,prior=topics.get(e.topic);
  // An honest answer explicitly takes back a guarantee; it does not invent a replacement policy.
  if(!kind){if(e.answer==='honest'&&prior?.current?.kind==='guarantee'){prior.previous.push({...prior.current,status:'withdrawn',withdrawnRound:e.day});prior.current=null;}continue;}
  const current={topic:e.topic,title:TOPICS[e.topic].title,kind,answer:e.answer,quote:e.quote,round:e.day,action:e.action,actionIndex};
  if(!prior){topics.set(e.topic,{current,previous:[]});continue;}
  // Repeating a policy updates its evidence, while a changed guarantee preserves its original wording.
  if(prior.current&&(prior.current.answer!==e.answer||kind==='guarantee'&&prior.current.quote!==e.quote))prior.previous.push({...prior.current,status:'superseded'});
  prior.current=current;
 }
 const all=[...topics.values()].filter(t=>t.current).map(t=>({...t.current,changed:t.previous.length>0,previous:t.previous.slice().reverse()})).sort((a,b)=>b.round-a.round||b.actionIndex-a.actionIndex);
 return{items:all.slice(0,3),total:all.length,omitted:Math.max(0,all.length-3)};
}
// Who has heard the player state each approach; they are the ones let down by a later switch.
function hear(a,topic,mode,audience){if(a.index!==0||planIndex(topic,mode)<0)return;const key=topic+':'+mode,set=new Set(a.heard[key]||[]);for(const i of audience||[])set.add(i);a.heard[key]=[...set].sort((x,y)=>x-y);}
function suggestVenue(s){
 const visits=s.player.actions.filter(x=>['canvass','rally'].includes(x.action)),last=visits.at(-1)?.venue||null;if(!visits.length)return'market';
 const ids=Object.keys(VENUES).filter(id=>id!==last),counts=Object.fromEntries(ids.map(id=>[id,visits.filter(x=>x.venue===id).length])),min=Math.min(...Object.values(counts)),pool=ids.filter(id=>counts[id]===min);return pool[Math.floor(rand(s.seed,'venue-suggestion',s.day)*pool.length)];
}
// Where the round happens and what gets asked there; only preparing lets you pick the issue.
function itinerary(s,id,config={}){
 const urgent=urgentTopic(s);
 if(config.campaignOpportunity==='media'&&id==='tv'){const o=campaignOfferData(s);return{venue:null,venueTitle:'臨時專訪',topic:o.topic,pool:[o.topic],topicReason:'臨時空出的免費專訪，主持人指定談這題。'};}
 if(config.campaignFollowup&&id==='online'&&s.campaign?.followup){const f=s.campaign.followup;return{venue:null,venueTitle:'接續直播',topic:f.topic,pool:[f.topic],topicReason:'延續上回引起迴響的議題，趁觀眾還記得你。'};}
 if(config.campaignOpportunity==='organization')config={...config,venue:campaignOfferData(s).venue};
 if(id==='debate'){const topic=s.debate?.topic||'health';return{venue:null,venueTitle:'文山行政中心禮堂',topic,topicReason:'主持人的題目，第 '+(DEBATE_ROUND-2)+' 回合起公布。'};}
 if(id==='dig')return{venue:null,venueTitle:'社區工作室',topic:null,topicReason:'派人挖小馬的黑料。'};
 if(id==='press')return{venue:null,venueTitle:'記者會',topic:'tip',topicReason:'公開手上的黑料。'};
 if(id==='online')return{venue:null,venueTitle:'直播間',topic:null,pool:onlinePool(s),topicReason:'網友會從青年最在意的三題挑一題留言問你。'};
 if(id==='tv'){const pool=tvPool(s),respond=config.respond&&urgent?urgent:null,brief=!respond&&config.brief&&pool.includes(config.brief)?config.brief:null;return{venue:null,venueTitle:'中立新聞台',topic:respond||brief,pool,brief,respond:!!respond,topicReason:respond?'你在節目上主動回應小馬。':brief?'你買了專訪時段，指定談這題。':'主持人會從這三題裡抽一題問你。'};}
 const venue=VENUES[config.venue]?config.venue:suggestVenue(s),v=VENUES[venue];
 if(id==='canvass'){const open=openChallengeAt(s,venue),pool=venuePool(s,venue).map(x=>x.topic);return{venue,venueTitle:v.title,topic:open?open.topic:null,pool,topicReason:open?'這裡的人都在問小馬對你的批評。':'這裡的'+GROUPS[s.landscape.main[venue]].title+'會從這三題挑一題問你。'};}
 if(id==='rally')return{venue,venueTitle:v.title,topic:null,topicReason:'講你所有公開過的立場。'};
 if(id==='prepare'){const topic=topicsOf(s).includes(config.topic)&&!s.player.studied?.[config.topic]?config.topic:(topicsOf(s).find(t=>!s.player.studied?.[t])||'health');return{venue,venueTitle:'社區工作室',topic,topicReason:'把這題查清楚，回答更有說服力；順便看清另一個熱門議題。'};}
 return{venue,venueTitle:v.title,topic:null,topicReason:''};
}
function stance(s,topic){const prior=previousAnswer(s.player,topic),p=s.player.promises.find(x=>x.topic===topic);return prior?{quote:prior.quote,round:prior.day,prepared:!!prior.prepared,status:p?.status||'已公開立場'}:null;}
// PUBLIC actions state a stance and take the team along; ASKING actions put one question to you every time.
const PUBLIC=['canvass','tv','debate','online'],ASKING=['canvass','tv','debate','press','online'];
// QUIET actions keep the candidate off the street: they move no votes themselves, while 小馬 campaigns as usual.
const QUIET=['fundraise','recruit','prepare','dig'];
// Digging for dirt: a lead, nothing, or 小馬 catches you at it. Fixed per seed and round. A lead goes into the dirt file
// unpublished; it moves votes only when you release it.
const DIG={found:.55,nothing:.3,backfire:-.006,share:.45,max:2,from:2};
// The dirt file. Whether a lead holds is fixed per seed; one check (money, not a round) tells. A release rides on a press conference,
// TV or a stream and reaches that outlet's audience: a lead that holds moves 小馬's doubters to you (move) and wins a few more (bonus),
// so the seat line cannot rise; one that does not hold bites back. Unchecked leads land weaker; a stream spreads them further but
// bites harder. From a lead's second round in the file 小馬 may get ahead of it each round and halve it. Every hit makes him dig into you.
const EXPOSE={check:40000,holds:.75,move:.0085,bonus:.0012,share:{press:.45,tv:.5,online:.3},lean:{press:[1,1,1],tv:MEDIA_LEAN.tv,online:MEDIA_LEAN.online},unverified:{press:.55,tv:.55,online:.85},backfire:{press:1,tv:1,online:1.5},hurt:.008,sympathy:.003,limited:.5,tip:.8,leak:.12,leaked:.5,retaliate:.08,blame:{base:.5,grudge:.85}};
const DIRT={tender:{title:'家族公司包區公所標案',text:'小馬家族的公司三年拿了區公所十幾件小標案。'},rooftop:{title:'頂樓違建隔套房出租',text:'小馬名下公寓頂樓加蓋，隔成套房出租。'},aides:{title:'助理掛名領薪',text:'小馬服務處有助理掛名領薪，人沒來上班。'},thesis:{title:'碩士論文抄襲',text:'小馬的在職專班論文有整段和別人一樣。'}};
function addDirt(s,a){a.dirt||=[];const used=new Set(a.dirt.map(d=>d.kind)),kind=shuffle(Object.keys(DIRT),s.seed,'dirt-kind').find(k=>!used.has(k))||'tender',d={id:'dirt-'+s.day,kind,round:s.day,holds:rand(s.seed,'dirt-holds',s.day)<EXPOSE.holds,verified:false,used:false};a.dirt.push(d);return d;}
// The round 小馬 got ahead of a waiting lead, or 0; fixed per seed, so it is the same on every screen.
function dirtLeaked(s,d,day=s.day){for(let r=d.round+2;r<=day;r++)if(rand(s.seed,'dirt-leak',d.id,r)<EXPOSE.leak)return r;return 0;}
const dirtReady=(s,d)=>!!d&&!d.used&&d.round<s.day&&!(d.verified&&!d.holds);
// What a press conference, TV slot or stream releases: a named lead, or with true the strongest one ready (checked first, then oldest).
function exposeTarget(s,id,config={}){if(!['press','tv','online'].includes(id)||!config.expose)return null;const list=(s.player.dirt||[]).filter(d=>dirtReady(s,d)).sort((x,y)=>(y.verified-x.verified)||(x.round-y.round)),d=config.expose===true?list[0]:list.find(d=>d.id===config.expose);return d?d.id:null;}
function releaseDirt(s,d,outlet,mode='tip_accuse',viral=1,scale=1){const E=EXPOSE,lean=E.lean[outlet],reach=outlet==='online'?viral:1,audience=s.voters.map((_,i)=>i).filter(i=>rand(s.seed,'dirt-audience',d.id,i)<Math.min(.95,E.share[outlet]*lean[s.voters[i].g]*reach)),limited=mode==='tip_limited',leak=d.id==='tip'?0:dirtLeaked(s,d),byGroup=GROUPS.map(()=>0);let you=0,rival=0;
 const track=(v,b0,b1)=>{const x=(v.support[0]-b0)*PER_VOTER;you+=x;byGroup[v.g]+=x;rival+=(v.support[1]-b1)*PER_VOTER;},out=kind=>({votes:you,rival,byGroup,kind,outlet,people:audience.length,leak,verified:!!d.verified,limited});
 if(!d.holds&&limited)return out('flat');
 if(!d.holds){const f=E.backfire[outlet];for(const i of audience){const v=s.voters[i],b0=v.support[0],b1=v.support[1];apply(v,0,-E.hurt*f);apply(v,1,E.sympathy*f);track(v,b0,b1);}return out('backfire');}
 const k=scale*(d.verified?1:E.unverified[outlet])*(limited?E.limited:1)*(leak?E.leaked:1);
 for(const i of audience){const v=s.voters[i],b0=v.support[0],b1=v.support[1],take=Math.max(0,Math.min(E.move*k,b1-.001,.16-b0));v.support[1]=b1-take;v.support[0]=b0+take;apply(v,0,E.bonus*k);track(v,b0,b1);}return out('release');}
// Expected votes from releasing a lead now, from support the campaign can see in its own numbers: if it holds (an unchecked lead
// lands weaker) and, while unchecked, if it does not. Streams assume an average night.
function releaseEstimate(s,d,outlet){const E=EXPOSE,lean=E.lean[outlet],leak=dirtLeaked(s,d),k=(d.verified?1:E.unverified[outlet])*(leak?E.leaked:1);let gain=0,loss=0;for(const v of s.voters){const p=Math.min(.95,E.share[outlet]*lean[v.g]),b0=v.support[0],b1=v.support[1],take=Math.max(0,Math.min(E.move*k,b1-.001,.16-b0));gain+=p*(take+Math.min(E.bonus*k,.16-b0-take));loss+=p*(Math.max(.001,b0-E.hurt*E.backfire[outlet])-b0);}return{gain:Math.round(gain*PER_VOTER),loss:d.verified?0:Math.round(loss*PER_VOTER)};}
// Checking a lead costs money, not a round, and shows whether it holds. The anonymous tip takes two checks, one a round.
function verifyDirt(s,id){if(!s.started||s.phase!=='plan')return false;const t=s.events.tip,d=id==='tip'?null:(s.player.dirt||[]).find(x=>x.id===id),cost=id==='tip'?COSTS.tipCheck:EXPOSE.check;
 if(id==='tip'?(s.day<3||t.evidenceLevel>=2||t.verification||t.checkedDay===s.day):(!d||d.verified||d.used))return false;if(s.budget.available<cost)return false;
 s.budget.available-=cost;s.budget.spent+=cost;s.ledger.push({day:s.day,action:'verify',cost,baseCost:cost,teamCost:0,eventCost:0,addonCost:0,income:0,topic:id==='tip'?'tip':null});if(id==='tip'){investigate(s);t.checkedDay=s.day;}else{d.verified=true;d.verifiedRound=s.day;}return true;}
// Everything the player knows about the dirt file: each lead, how solid it is, where it can go off, and what digging costs and risks.
function fileView(s){upgrade(s);const a=s.player,t=s.events.tip,tip=eventView(s).tip,items=[];
 // A released lead says when, where and how it went; the tip's release is read off its press conference.
 if(tip.available){const rel=tipRelease(t),j=rel?s.journal.find(x=>x.day===rel.round&&x.player?.action==='press'):null,jp=j?.player;
  items.push({id:'tip',source:'tip',title:'經費重複請款',text:TOPICS.tip.ask,evidence:tip.evidenceText,status:rel?'released':tip.truthLabel?(t.truth==='issue'?'solid':'debunked'):tip.evidenceLevel?'checking':'unverified',checks:tip.evidenceLevel,maxChecks:2,canVerify:verifyDirtAllowed(s,'tip'),verifyCost:COSTS.tipCheck,outlets:['press'],released:!!rel,ready:!rel&&!tip.update&&!tip.pledged,correct:!!rel&&tipCorrectable(t),truthLabel:tip.truthLabel,outcome:jp?{round:j.day,outlet:'press',votes:Math.round(jp.votes||0),rival:Math.round(jp.rivalHit||0),leak:false,kind:jp.stumble?.caught?'caught':jp.exposed?.kind||(jp.rivalHit<0?'hit':'flat')}:null});}
 for(const d of a.dirt||[]){const leak=d.used?0:dirtLeaked(s,d);items.push({id:d.id,source:'dig',title:DIRT[d.kind].title,text:DIRT[d.kind].text,round:d.round,status:d.used?'released':!d.verified?'unverified':d.holds?'solid':'debunked',checks:d.verified?1:0,maxChecks:1,canVerify:verifyDirtAllowed(s,d.id),verifyCost:EXPOSE.check,outlets:['press','tv','online'],released:!!d.used,ready:dirtReady(s,d),leaked:leak,strength:d.used?0:Math.round((d.verified?1:EXPOSE.unverified.press)*(leak?EXPOSE.leaked:1)*100)/100,outcome:d.used?{round:d.releasedRound,outlet:d.outlet,votes:Math.round(d.votes||0),rival:Math.round(d.rival||0),leak:!!d.leak,kind:d.result}:null,estimate:dirtReady(s,d)?Object.fromEntries(['press','tv','online'].map(o=>[o,releaseEstimate(s,d,o)])):null});}
 const dp=previewActor(s,a,s.budget,'dig',{});return{items,digs:s.journal.filter(j=>j.player?.action==='dig').map(j=>({round:j.day,outcome:j.player.dig,votes:Math.round(j.player.stumble?.votes||0),lead:j.player.dirt||null})),ready:items.filter(x=>x.source==='dig'?x.ready:x.status==='solid'&&x.ready&&!x.released).length,dig:{allowed:dp.allowed&&s.started,reason:dp.reason,cost:COSTS.dig,left:Math.max(0,DIG.max-(a.counts.dig||0)),from:DIG.from,odds:(o=>({...o,backfire:Math.round((1-o.found-o.nothing)*100)/100}))(digOdds(s))},holds:EXPOSE.holds,unverified:{...EXPOSE.unverified},grudge:a.grudge||0,scandalChance:Math.round(scandalChance(s)*100)/100,scandalWindow:[SCANDAL_FROM,SCANDAL_TO],against:(s.crises||[]).map(c=>({round:c.round,kind:c.kind,by:c.by||'other',byName:c.byName||'其他候選人'}))};}
const verifyDirtAllowed=(s,id)=>{if(!s.started||s.phase!=='plan')return false;const t=s.events.tip;if(id==='tip')return s.day>=3&&t.evidenceLevel<2&&!t.verification&&t.checkedDay!==s.day&&s.budget.available>=COSTS.tipCheck;const d=(s.player.dirt||[]).find(x=>x.id===id);return!!d&&!d.verified&&!d.used&&s.budget.available>=EXPOSE.check;};
function responsePlan(a,id,topic,config,s){
 if(id==='press')return{willAsk:true,reuseAnswer:null,followup:null,responseReason:'記者等著聽你怎麼說。'};
 if(!PUBLIC.includes(id))return{willAsk:false,reuseAnswer:null,responseReason:'直接完成這回合的工作。',followup:null};
 if(a.index!==0)return{willAsk:false,reuseAnswer:null,followup:null,responseReason:''};
 const owed=topicPromise(a,topic),challenge=owed?s.challenges.find(c=>c.topic===topic&&c.promiseId===owed.id&&c.version===(owed.version||1)&&c.status==='open'):null;if(challenge)return{willAsk:true,reuseAnswer:null,responseReason:'小馬說你的保證做不到，這次當面回應。',followup:{id:owed.id,kind:'guarantee',text:owed.text,reason:challenge.evidence}};
 const attack=s.challenges.find(c=>c.kind==='stance'&&c.topic===topic&&c.status==='open');if(attack)return{willAsk:true,reuseAnswer:null,responseReason:'小馬公開批評你的做法，這次當面回應。',followup:{id:attack.id,kind:'stance',text:attack.quote,reason:attack.evidence}};
 const prior=previousAnswer(a,topic);if(prior)return{willAsk:true,reuseAnswer:null,previousAnswer:copy(prior),followup:null,responseReason:'上次你說「'+prior.quote+'」。這次要重申，還是調整？'};
 return{willAsk:true,reuseAnswer:null,followup:null,responseReason:previousAnswer(a,topic)?'你談過這題，可以重申，也可以改口。':'第一次公開談這個議題。'};
}
// Each assistant tires on their own: team street work decays per member, not across the whole team.
const countKey=(id,stream='')=>['team-canvass','offer','billboard','canvass'].includes(id)?id+':'+stream:id;
// Repeat visits tire people per place; where a chief backs you they tire half as fast.
const repeatOf=(s,a,id,stream)=>(a.counts[countKey(id,stream)]||0)*(id==='canvass'&&a.index===0&&chiefBroken(s,stream)?TUNING.chief.tire:1);
function followupReach(s,a,topic){const r=TUNING.reach.online*homeReach(s,a,'online')/(1+(a.counts.online||0)*.3),k=.5+.25*Math.min(TUNING.streamers,members(a).filter(m=>m.hiredDay<s.day).length),f=followupFit(s,topic).factor;return{min:Math.round(r*k*f*.9),max:Math.round(r*k*f*1.1)};}
function reachEstimate(s,a,id,stream=''){const kind=id==='team-canvass'?'team':id;if(!TUNING.reach[kind])return{min:0,max:0};if(id==='online'){const r=TUNING.reach.online*homeReach(s,a,id)/(1+(a.counts.online||0)*.3),k=.5+.25*Math.min(TUNING.streamers,members(a).filter(m=>m.hiredDay<s.day).length);return{min:Math.round(r*k*TUNING.viral[0]),max:Math.round(r*k*TUNING.viral.at(-1))};}const street=['canvass','team-canvass','rally'].includes(id),repeat=repeatOf(s,a,id,stream),scale=(street?weather(s).factor:1)*homeReach(s,a,id,stream)*(id==='tv'?tvFatigue(s,a):1)/(1+repeat*.3);return{min:Math.round(TUNING.reach[kind]*scale*.9),max:Math.round(TUNING.reach[kind]*scale*1.1)};}
function members(a){return a.team?.members||[];}
function recruitPlan(a,retained=members(a).length,day=1){const next=RECRUIT_LEVELS.find(n=>n>retained),target=next??retained,days=Math.max(0,Math.round(30-day*ROUND_DAYS)),perPerson=Math.ceil(50000*days/30);return{target,days,perPerson,cost:(target-retained)*perPerson,title:next?'招募 1 位助手（共 '+next+' 位）':'團隊已滿編'};}
// Each round you can send one assistant to research an issue of your choice (a second one goes deeper); another can run a small
// fundraising stall; the rest come along, or canvass on their own while you prepare or recruit.
function assignments(s,a,topic,config={},actionId){
 // Each free assistant takes one picked issue (deep sends two on one). The screen offers research only on a preparation round.
 const tasks=Array.isArray(config.teamTasks)?config.teamTasks:null,picked=[...new Set([].concat(config.research||[]))].filter(t=>topicsOf(s).includes(t)&&a.insight?.[t]?.level!=='precise'),queue=a.index===0&&!tasks?(config.deep&&picked.length===1?[picked[0],picked[0]]:picked):[];let booth=a.index===0&&!!config.booth,stream=actionId==='online'?TUNING.streamers:0;
 return members(a).filter(m=>m.hiredDay<s.day).map((m,i)=>{let task=tasks?(['idle','research','canvass','release','follow','booth'].includes(tasks[i])?tasks[i]:'idle'):'follow',researchTopic=null;
  if(!tasks&&stream>0){task='stream';stream--;}
  else if(!tasks&&queue.length){task='research';researchTopic=queue.shift();}
  else if(!tasks&&booth){task='booth';booth=false;}
  if(task==='research'&&!researchTopic)researchTopic=topic;
  if(task==='follow'&&['prepare','recruit','dig'].includes(actionId))task='canvass';
  return{...m,task,researchTopic,activity:actionId,cost:0,note:''};});
}
function fundraiseOdds(s){const F=TUNING.fundraise,visits=Object.values(s.chiefs||{}).reduce((n,c)=>n+(c.visits||0),0),ties=1+Math.min(F.maxTies,F.perVisit*visits),lift=identity(s).fundraise*partyFundraise(s,0)*ties*(originOf(s)?.fundraise||1);return{miss:F.miss[identity(s).id]??.2,ties,visits,lift,min:Math.round(F.missIncome[0]*lift),max:Math.round(F.base[1]*lift)};}
function playerFundraise(s,crewIncome){const F=TUNING.fundraise,o=fundraiseOdds(s),miss=rand(s.seed,'fundraise-miss',s.day)<o.miss,[lo,hi]=miss?F.missIncome:F.base;return{miss,income:Math.round((lo+rand(s.seed,'fundraise',s.day,0)*(hi-lo)+(miss?0:crewIncome))*o.lift)};}
function previewActor(s,a,b,id,config={}){
 const action=ACTIONS.find(x=>x.id===id);if(!action)return{allowed:false,reason:'沒有這個行程。'};
 const route=a.index===0?itinerary(s,id,config):{topic:TOPICS[config.topic]?config.topic:null,venue:VENUES[config.venue]?config.venue:null,venueTitle:VENUES[config.venue]?.title||'街頭',topicReason:'對手本回合行程'},topic=route.topic,teamAvailable=members(a).some(m=>m.hiredDay<s.day),teamAssignments=assignments(s,a,topic,config,id),teamCost=teamAssignments.reduce((n,x)=>n+x.cost,0),teamTask=teamAssignments.find(x=>x.task==='research')?'research':teamAssignments.find(x=>x.task==='canvass')?'canvass':'off',researchTopics=teamAssignments.filter(x=>x.task==='research').map(x=>x.researchTopic);
 // Money buys reach: small gifts for the people you meet, and billboards that keep working every round after.
 const onSite=['canvass','rally'].includes(id),me=a.index===0,tip=s.events.tip,addons={gifts:me&&onSite&&!!config.gifts,billboard:me&&onSite&&!!config.billboard&&(a.billboards||[]).length<MAX_BILLBOARDS,brief:me&&id==='tv'&&!!route.brief,investigate:me&&!!config.investigate&&s.day>=3&&tip.evidenceLevel<2&&!tip.verification&&tip.checkedDay!==s.day,gotv:me&&!!config.gotv&&s.day>=GOTV_FROM&&(onSite||id==='tv')},addonCost=(addons.gifts?COSTS.gifts:0)+(addons.billboard?COSTS.billboard:0)+(addons.brief?COSTS.brief:0)+(addons.investigate?COSTS.tipCheck:0)+(addons.gotv?COSTS.gotv:0);
 let reason='';const retained=members(a).length-teamAssignments.filter(x=>x.task==='release').length,recruit=recruitPlan(a,retained,s.day),campaignOpportunity=me?config.campaignOpportunity||null:null,campaignFollowup=me&&!!config.campaignFollowup,invitedTv=campaignOpportunity==='media'&&id==='tv',freeTv=me&&id==='tv'&&!invitedTv&&(a.tvCredit||0)>0,baseCost=id==='recruit'?recruit.cost:freeTv||invitedTv?0:action.cost,donor=me&&id==='fundraise'&&config.donor&&config.donor!=='small'?config.donor:null,deal=donor?dealOf(s,donor):null;
 if(donor&&(!deal||!brokerOpen(s,donor)))reason='這位頭人已經談過了，或這局沒有他關心的議題。';
 if(id==='debate'&&s.day!==DEBATE_ROUND)reason=`政見發表會只在第 ${DEBATE_ROUND} 回合舉行。`;else if(id==='press'&&a.index===0&&s.day<3)reason='還沒有可以爆料的資料。';else if(id==='press'&&me&&!exposeTarget(s,id,config)&&tipRelease(s.events.tip)&&!tipCorrectable(s.events.tip))reason='這份料已經爆過了。';else if(id==='prepare'&&me&&topicsOf(s).every(t=>s.player.studied?.[t]))reason='議題都親自研讀過了。';else if(id==='dig'&&a.index!==0)reason='只有你會挖黑料。';else if(id==='dig'&&s.day<DIG.from)reason=`第 ${DIG.from} 回合起才能挖黑料。`;else if(id==='dig'&&(a.counts.dig||0)>=DIG.max)reason=`這局已經挖過 ${DIG.max} 次。`;else if(id==='recruit'&&retained>=MAX_HELPERS)reason='團隊已達人數上限。';else if(id==='recruit'&&s.day===DAYS)reason='最後一回合，來不及請人了。';
 if(!reason&&me&&id==='online'&&!teamAvailable)reason='要至少 1 位助手才能經營新媒體。';
 if(!reason&&me&&s.crisis?.status==='pending')reason='先處理突發危機。';else if(!reason&&me&&id==='rally'&&topicsOf(s).filter(t=>lastPlan(a,t)).length<2)reason='至少公開表態 2 題才能辦造勢。';
 if(campaignOpportunity&&(!CAMPAIGN_PLANS.some(x=>x.id===campaignOpportunity)||s.day!==CAMPAIGN_ROUND||s.campaign?.opportunity.chosen||id!==(campaignOpportunity==='organization'?'canvass':'tv')))reason='這場邀約只在第 4 回合，兩場只能選一場。';
 if(campaignFollowup&&(id!=='online'||!s.campaign?.followup||s.campaign.followup.round!==s.day||s.campaign.followup.used))reason='這次直播邀約已經過期或用過了。';
 const response=responsePlan(a,id,topic,config,s);
 const investigating=addons.investigate,eventCost=0;
 if(a.index===0&&topic&&!availableTopics(s).some(t=>t.id===topic))reason='這項資料還沒出現。';
 const total=baseCost+teamCost+eventCost+addonCost;if(!reason&&b.available<total)reason=`這回合需要 ${total.toLocaleString('zh-TW')} 元，還差 ${(total-b.available).toLocaleString('zh-TW')} 元。`;
 const following=teamAssignments.filter(m=>m.task==='follow').length,crew=a.index===0&&onSite?following:null,crewFactor=crew===null?1:TUNING.crew[Math.min(crew,TUNING.crew.length-1)],lift=(a.index===0?identity(s).fundraise:1)*partyFundraise(s,a.index),expectedIncome=id==='fundraise'?(deal?{min:deal.money+following*8000,max:deal.money+following*12000}:a.index===0?{...fundraiseOdds(s),max:fundraiseOdds(s).max+Math.round(following*12000*fundraiseOdds(s).lift)}:{min:Math.round((80000+following*8000)*lift),max:Math.round((160000+following*12000)*lift)}):null;
 const eventNote=investigating?`調公開帳目、請會計師核對小馬的請款單據 ${COSTS.tipCheck.toLocaleString('zh-TW')} 元；查了只會知道真假，不會改變真相。`:'';
 return{...action,...response,...route,campaignOpportunity,campaignFollowup,mediaFatigue:id==='tv'?tvFatigue(s,a):1,donor,deal:deal?copy(deal):null,freeTv,researchTopics,crew,crewFactor,stance:a.index===0&&topic?stance(s,topic):null,expectedIncome,benefit:action.benefit,risk:me&&s.campaign?.network&&['prepare','recruit','fundraise'].includes(id)?'你忙這個行程，地方小隊仍會替你拉票。':action.risk,eventCost,eventNote,investigating,addons,addonCost,allowed:!reason,reason,title:id==='recruit'?recruit.title:action.title,baseCost,grossBaseCost:baseCost,contractDays:id==='recruit'?recruit.days:0,contractRate:50000,contractCost:id==='recruit'?baseCost:0,totalCost:total,cost:total,rosterSize:members(a).length+1,teamSize:members(a).length,teamLimit:MAX_HELPERS,legacyTeam:members(a).length>MAX_HELPERS,staffingNote:members(a).length>MAX_HELPERS?'舊存檔保留已付薪的助手；新局最多 '+MAX_HELPERS+' 人。':'',payroll:teamCost,nextRosterSize:recruit.target+1,recruitCount:id==='recruit'?recruit.target-retained:0,teamMode:'auto',teamCost,teamTask,teamAssignments,teamAvailable,topic,booth:teamAssignments.some(m=>m.task==='booth'),boothIncome:teamAssignments.some(m=>m.task==='booth')?[...TUNING.booth]:null,expectedReach:campaignFollowup?followupReach(s,a,topic):reachEstimate(s,a,id,id==='canvass'?route.venue:''),chief:me&&['canvass','rally'].includes(id)?chiefPreview(s,route.venue):null,crowd:a.index===0&&(PUBLIC.includes(id)||id==='rally')?(['canvass','rally'].includes(id)?crowdMix(s,route.venue):mediaMix(s,id)):null,teamNote:''};
}
function preview(s,id,config={}){if(s.version!==VERSION)return{allowed:false,reason:'這份舊局請從保留的舊版入口繼續。'};upgrade(s);const p=previewActor(s,s.player,s.budget,id,config);p.exposing=exposeTarget(s,id,config);if(p.exposing&&id==='press')p.responseReason='記者等著看你的證據。';if(!s.started||s.phase!=='plan'){p.allowed=false;p.reason='先完成目前這一回合。';}return p;}
function spend(s,a,b,p){p.before=snapshot(s,a,b);b.available-=p.totalCost;b.spent+=p.totalCost;if(p.id==='recruit')b.salarySpent+=p.baseCost;const entry={day:s.day,action:p.id,cost:p.totalCost,baseCost:p.baseCost,teamCost:p.teamCost,eventCost:p.eventCost||0,addonCost:p.addonCost||0,addons:copy(p.addons||{}),contractDays:p.contractDays||0,contractRate:50000,recruitCount:p.recruitCount||0,venue:p.venue,venueTitle:p.venueTitle,topic:p.topic,teamTask:p.teamTask,teamAssignments:copy(p.teamAssignments),income:0};a.actions.push(entry);if(a.index===0)s.ledger.push(entry);return entry;}
function learn(a,topic){if(a.known.includes(topic))return false;a.known.push(topic);return true;}
function begin(s,id,config={}){const p=preview(s,id,config);if(!p.allowed)return false;s.roundStartRace||=copy(s.journal.at(-1)?.race||raceView(s));spend(s,s.player,s.budget,p);if(p.campaignOpportunity){s.campaign.opportunity={...campaignOfferData(s),chosen:p.campaignOpportunity};}if(p.freeTv)s.player.tvCredit--;s.pending={...p,report:null};if(p.addons?.investigate){investigate(s);s.events.tip.checkedDay=s.day;}
 // TV without a bought brief draws its question on air from the three-issue pool.
 if(p.id==='online'){const streamers=p.teamAssignments.filter(m=>m.task==='stream').length;s.pending.viral=p.campaignFollowup?1:TUNING.viral[Math.floor(rand(s.seed,'viral',s.day)*TUNING.viral.length)];s.pending.streamers=streamers;}
 if(['tv','canvass','online'].includes(p.id)&&!p.topic){s.pending.topic=p.id==='canvass'?venueTopic(s,p.venue):p.pool[Math.floor(rand(s.seed,p.id==='tv'?'tv-question':'online-question',s.day)*p.pool.length)];s.pending.drawn=true;s.player.actions.at(-1).topic=s.pending.topic;Object.assign(s.pending,responsePlan(s.player,p.id,s.pending.topic,config,s));}
 // Helpers' research lands when the round ends, so what they find today is ready from the next round; a bought TV brief is prepared before the show.
 const counts={};for(const t of(p.researchTopics||[]).filter(t=>t&&t!=='tip'))counts[t]=(counts[t]||0)+1;if(p.addons?.brief&&!s.player.known.includes(p.topic)){learn(s.player,p.topic);reveal(s,p.topic,'helper');}s.pending.research=counts;s.phase='travel';return true;}
function landResearch(s,report){const counts=s.pending?.research||{},studied=Object.keys(counts);for(const t of studied){const was=s.player.known.includes(t);learn(s.player,t);reveal(s,t,counts[t]>=2||was||identity(s).deepSolo?'deep':'helper');}
 for(const r of report?.teamReports||[])if(r.knowledge&&counts[r.knowledge])r.result=insightLine(s,r.knowledge)+'（下回合起用得到）';
 if(report&&studied.length)report.teamNote=studied.map(t=>`助手${counts[t]>=2||identity(s).deepSolo?'深入研究':'研究'}了「${TOPICS[t].title}」，下回合起用得到。${insightLine(s,t)}`).join(' ');}
// How each group would react to an answer, from what you can know: research for approaches, the public attitude for promises.
function answerReactions(s,topic,mode){const k=planIndex(topic,mode==='counter'?counterPlan(s,topic)?.id:mode),self=!!s.player.studied?.[topic],ins=s.player.insight?.[topic];return GROUPS.map((g,i)=>{const x=ins?.groups?.[i];let mark='？';if(k>=0&&x){if(x.close&&!self)mark='分歧';else{const share=Number.isFinite(x.share)?(k===0?x.share:100-x.share):x.side===k?65:35;mark=share>=50?(self&&share>=70?'＋＋':'＋'):(self&&share<=30?'−−':'−');}}else if(k<0&&['guarantee','honest'].includes(mode)){const face=answerFaces(s,topic,mode)[i];mark=face==='up'?'＋':face==='down'?'−':'分歧';}return{group:g.id,mark,text:g.title+' '+(mark==='？'?'反應未知':mark)};});}
function answerFaces(s,topic,mode){
 if(!TOPICS[topic]?.plans?.length)return GROUPS.map(()=> 'unknown');
 if(mode==='counter'){const mine=counterPlan(s,topic);return mine?answerFaces(s,topic,mine.id):GROUPS.map(()=> 'unknown');}
 const k=planIndex(topic,mode);
 if(k>=0){const ins=s.player.insight?.[topic];return GROUPS.map((_,g)=>{const x=ins?.groups?.[g];if(!x)return'unknown';if(x.side===null||x.side===undefined||x.close)return'flat';return x.side===k?'up':'down';});}
 if(['guarantee','honest'].includes(mode))return s.landscape.groups.map(G=>tone(promiseValue(s,s.player,G.promise,mode)));
 return GROUPS.map(()=> 'unknown');
}
// The chance a voter in each group cares about an issue, from the designed concerns the rules describe; per-game noise is not read.
const careOddsFor=list=>Object.fromEntries(GROUPS.map(g=>{const w=GROUP_CARES[g.id],W=list.reduce((n,t)=>n+w[t],0);return[g.id,Object.fromEntries(list.map(t=>[t,w[t]/W+.5*list.reduce((n,u)=>u===t?n:n+w[u]/W*w[t]/(W-w[u]),0)]))];}));
const CARE_ODDS=careOddsFor(POLICY_TOPICS),careCache=new Map();
function careOdds(s){const list=placeTopicsOf(s),news=s.landscape?.news||[],key=list.join()+'|'+news.join();if(!careCache.has(key)){const odds=careOddsFor(list);for(const g of GROUPS){const W=news.reduce((n,t)=>n+GROUP_CARES[g.id][t],0);for(const t of news)odds[g.id][t]=W?NEWS_CARE*GROUP_CARES[g.id][t]/W:0;}careCache.set(key,odds);}return careCache.get(key);}
// A group's share for an approach as research shows it; a direction alone stands for about eight, or six to seven, in ten.
function believedShare(s,topic,g,k){const x=s.player.insight?.[topic]?.groups?.[g];if(!x||k<0)return null;const first=Number.isFinite(x.share)?x.share/100:x.side===0?(x.close?.65:.8):(x.close?.35:.2);return k===0?first:1-first;}
// What an answer is expected to do to each group's votes, from what the screen shows: the crowd, research on each group's side, each
// group's public attitude to promises, the party mix, each group's current votes for you, and the groups of the people you spoke to
// before. Voters' own leanings, concerns and draws are never read, so this is an estimate, not the result.
function answerEstimate(s,topic,mode,ctx=s.pending){
 const a=s.player,id=ctx?.id,t=TOPICS[topic];if(!t?.plans?.length||!TUNING.reach[id]||!['canvass','tv','debate','offer'].includes(id))return null;
 const isCounter=mode==='counter',plan=isCounter?counterPlan(s,topic)?.id:mode,k=planIndex(topic,plan);if(isCounter&&k<0||k>=0&&!a.insight?.[topic])return null;
 const answering=PUBLIC.includes(id),stage=['tv','debate'].includes(id),onSite=['canvass','offer'].includes(id)&&!!VENUES[ctx.venue],gifts=id==='canvass'&&ctx.addons?.gifts?TUNING.gifts:null;
 const unprepared=answering&&!a.known.includes(topic)&&!topicPromise(a,topic)&&(plan==='honest'||stage&&plan==='guarantee');
 const chief=id==='canvass'?chiefPreview(s,ctx.venue):null,repeat=repeatOf(s,a,id,id==='canvass'?ctx.venue:ctx.stream||''),target=TUNING.reach[id]*(id==='canvass'?weather(s).factor:1)*(gifts?.reach||1)*(id==='tv'?tvFatigue(s,a):1)/(1+repeat*.3),reached=(onSite?crowdMix(s,ctx.venue):mediaMix(s,id)).map(m=>target*m);
 const depth=TUNING.depth[id]*(id==='canvass'?identity(s).canvassDepth:1)*(a.studied?.[topic]&&k>=0?TUNING.studied:1),scale=(ctx.scale??1)*(chief?.scale||1)*(id==='canvass'?ctx.crewFactor??1:1)*(unprepared&&stage?TUNING.unprepared.scale:1);
 const party=partyOf(s,0),R=TUNING.party.receptive,partyLift=party?PARTY_SHARES[party]*R.same[party]+PARTY_SHARES[party==='kmt'?'dpp':'kmt']*R.opposite+PARTY_SHARES.none:PARTY_SHARES.none*R.swing+1-PARTY_SHARES.none,rule=identity(s).rule;
 const line=k>=0?partyLine(s,0,topic):null,ps=line?PARTY_SHARES[party]:0,pd=line?(line===plan?TUNING.party.keep:-TUNING.party.break*(identity(s).partyBreak||1)):0,st=unprepared?-TUNING.unprepared.penalty*(stage?1:.5)*(identity(s).stumble||1):0;
 // Support cannot fall below the floor: a group's average support, read off its votes for you, bounds what one person can lose.
 const base=groupVotes(s,0).map((v,g)=>v/Math.max(1,s.landscape.groups[g].share*POPULATION*PER_VOTER)),move=(g,d)=>{const mu=Math.max(0,base[g]-.001);return d>=0?Math.min(d,.16-base[g]):-(mu>0?mu*(1-Math.exp(d/mu)):0);};
 const votes=GROUPS.map((g,gi)=>{const G=s.landscape.groups[gi],lift=partyLift*(rule&&gi===s.landscape.identityGroup?TUNING.lift[rule]:1),bonus=giftBonus(gifts,{g:gi}),f=e=>{const d=e*depth*scale+bonus;return d>0?d*lift:d;},one=(e,extra=0)=>(1-ps)*move(gi,f(e)+st+extra)+ps*move(gi,f(e)+st+extra+pd);
  let care=careOdds(s)[g.id][topic]||0,e;if(surgeActive(s,topic))care+=(1-care)*TUNING.surgeShare;
  if(k>=0){const pm=believedShare(s,topic,gi,k),resent=OPPOSE[t.plans[k].id]?.[g.id],back=isCounter?-TUNING.counter.backlash:0,gain=isCounter?TUNING.counter.gain:0;e=care*pm*one(TUNING.careMatch,gain)+care*(1-pm)*one(TUNING.careMiss,back)+(1-care)*pm*one(TUNING.otherMatch,gain)+(1-care)*(1-pm)*one(Math.min(TUNING.otherMiss,resent??0),back);}
  else{const x=promiseValue(s,s.player,G.promise,plan);e=care*one(x*TUNING.careBoost)+(1-care)*one(x);}
  if(e>0&&k>=0){const heard=(a.heard?.[topic+':'+plan]||[]).filter(i=>s.voters[i]?.g===gi).length,hf=Math.min(1,heard/Math.max(1,G.share*POPULATION));e*=1-hf*(1-TUNING.reheard);}
  return reached[gi]*e*PER_VOTER;});
 const add=(list,hit)=>{for(const i of list||[]){const v=s.voters[i];if(v)votes[v.g]+=move(v.g,hit(v.g))*PER_VOTER;}};
 const old=k>=0?lastPlan(a,topic):null;if(old&&old.answer!==plan){const ko=planIndex(topic,old.answer),hit=TUNING.flip*(identity(s).flip||1);add(a.heard?.[topic+':'+old.answer],g=>-hit*believedShare(s,topic,g,ko));}
 let bloc=chief?.breaks?TUNING.chief.bloc:0;const deal=answering&&k>=0?activeDeal(s,topic):null;if(deal&&deal.plan!==plan){bloc-=deal.votes;const kd=planIndex(topic,deal.plan);add(s.offers.find(x=>x.id===deal.id)?.audience,g=>-TUNING.breach*believedShare(s,topic,g,kd));}
 const owed=answering&&plan!=='guarantee'?topicPromise(a,topic):null;if(owed)add(owed.audience,g=>-TUNING.unkept.corrected*{likes:1,mixed:.5,dislikes:0}[s.landscape.groups[g].promise]);
 if(answering)for(const c of(s.challenges||[]).filter(c=>c.topic===topic&&c.status==='open'))add(c.audience,g=>{const att=s.landscape.groups[g].promise;return TUNING.rebuttal*(k>=0?2*believedShare(s,topic,g,k):plan==='honest'?(c.kind==='guarantee'?{likes:-.5,mixed:.5,dislikes:1.5}[att]:.5):{likes:.5,mixed:0,dislikes:-1}[att]);});
 const groups=votes.map(x=>Math.round(x));return{groups,bloc,total:groups.reduce((n,x)=>n+x,0)+bloc,people:Math.round(target)};
}
// Calling out the rival means arguing for the approach opposite to his public one.
function counterPlan(s,topic){const his=lastPlan(s.rival,topic);if(!his)return null;const k=planIndex(topic,his.answer);return k<0?null:TOPICS[topic].plans[1-k];}
function activeDeal(s,topic){const o=(s.offers||[]).find(x=>x.status==='accepted'&&dealOf(s,x.id).topic===topic&&s.player.blocs.some(b=>b.offer===x.id&&b.status==='active'));return o?{id:o.id,org:dealOf(s,o.id).org,plan:dealOf(s,o.id).plan,votes:o.bloc}:null;}
const partyLine=(s,index,topic)=>{const party=partyOf(s,index);return party?PARTY_LINES[party]?.[topic]||null:null;};
// Keeping your party's line warms its voters who hear you; breaking it costs you more among them than among anyone else.
function partyLineHit(s,a,topic,mode,audience){const party=partyOf(s,a.index),line=partyLine(s,a.index,topic);if(!line||planIndex(topic,mode)<0)return null;const kept=line===mode,delta=kept?TUNING.party.keep:-TUNING.party.break*(a.index===0?identity(s).partyBreak||1:1),byGroup=GROUPS.map(()=>0);let dv=0;for(const i of audience){const v=s.voters[i];if(v.p!==party)continue;const before=v.support[a.index];apply(v,a.index,delta);const d=(v.support[a.index]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}return{kept,votes:dv,byGroup,party};}
function answerTags(s,topic,mode){const tags=[];if(topic==='tip')return tags;if(mode==='counter'){tags.push({kind:'counter',text:'認同你的人會少投小馬；認同他的人會覺得你在吵'});mode=counterPlan(s,topic)?.id||mode;}const k=planIndex(topic,mode);
 if(k>=0){const old=lastPlan(s.player,topic);if(old&&old.answer!==mode)tags.push({kind:'flip',text:'改口：你之前主張「'+(TOPICS[topic].plans.find(p=>p.id===old.answer)?.text||old.quote)+'」'});else if(old)tags.push({kind:'previous',text:'你之前也這樣說'});const line=partyLine(s,0,topic);if(line)tags.push(line===mode?{kind:'party',text:'符合'+PARTIES[partyOf(s,0)].title+'的立場'}:{kind:'breach',text:'違反'+PARTIES[partyOf(s,0)].title+'的立場：同黨選民不滿'});const deal=activeDeal(s,topic);if(deal)tags.push(deal.plan===mode?{kind:'deal',text:'符合與'+deal.org+'的約定'}:{kind:'breach',text:'違反與'+deal.org+'的約定：組織票 −'+deal.votes.toLocaleString('zh-TW')});}
 if(mode!=='guarantee'&&topicPromise(s.player,topic))tags.push({kind:'walkback',text:'收回保證：當初相信的人會失望，小扣分'});
 if(mode==='guarantee'&&!topicPromise(s.player,topic))tags.push({kind:'promise',text:'小馬可能拆穿：被拆穿又沒更正，相信的人會轉走'});
 return tags;}
function fullQuestion(s){
 if(s.phase!=='question')return null;if(s.pending.topic==='tip')return tipQuestion(s);
 const p=s.pending,t=TOPICS[p.topic],known=s.player.known.includes(t.id),owed=topicPromise(s.player,t.id),id=p.id,sp=id==='canvass'?speakerFor(s,p.venue):null;
 // On a researched issue a resident asks for what their own group wants (a split group just asks); before that they only describe the problem.
 const demand=sp?residentLine(s,t.id,sp.group,p.venue):t.ask;
 const text=p.followup?.kind==='stance'?`小馬說你的「${p.followup.text}」行不通，你怎麼回應？`:p.followup?`小馬說你的保證「${p.followup.text}」根本做不到，你怎麼回應？`:owed?'你之前保證過「'+owed.text+'」，現在要維持還是更正？':id==='debate'?`第一題「${t.title}」：${t.ask}`:id==='tv'?t.ask:demand;
 // Without research there is no concrete answer, and nothing in the question says which approach the speaker's group wants.
 const demanded=null,stage=['tv','debate'].includes(id);
 const mine=counterPlan(s,t.id),options=[...t.plans.map(x=>({id:x.id,text:x.text,detail:x.detail,unlocked:known,whyLocked:stage?'沒準備這題，說不出具體做法':'沒研究過這題，說不出具體做法'})),{id:'honest',text:owed?correctionText(t.id):HONEST,detail:owed?'撤回做不到的保證。':stage&&!known?'在台上顯得沒準備，效果打折。':'不亂答應，但也沒給答案。',unlocked:true},{id:'guarantee',text:guaranteeText(s,t.id),detail:'聽起來很有魄力，但做不到。',unlocked:true}];
 if(mine&&known)options.push({id:'counter',text:`點名小馬：他要「${TOPICS[t.id].plans[1-planIndex(t.id,mine.id)].text}」，我主張「${mine.text}」`,detail:'和他正面對決。',unlocked:true});
 return{speaker:id==='tv'?'主持人｜小安':id==='debate'?'主持人｜政見發表會':sp?sp.name+'｜'+sp.role:t.title,reason:p.responseReason||'',text,quote:owed?.text||(p.followup?.kind==='stance'?p.followup.text:undefined),options,demanded,stage};
}
function question(s){
 if(s.version!==VERSION)return null;const q=fullQuestion(s);if(!q)return null;const p=s.pending,topic=p.topic,known=s.player.known.includes(topic),owed=topicPromise(s.player,topic);
 if(p.id==='canvass'){const sp=speakerFor(s,p.venue);q.speakerGroup=sp.group;q.speakerName=sp.name;}
 if(topic==='tip'){const corrected=q.options.find(x=>x.id==='tip_correct'&&x.unlocked);q.options=q.options.filter(x=>corrected?true:x.id!=='tip_correct');}
 else if(known)q.options=q.options.filter(x=>owed||x.id!=='honest');
 else{q.options=q.options.filter(x=>x.id!=='counter');if(identity(s).answerBlind)for(const x of q.options)if(planIndex(topic,x.id)>=0){x.unlocked=true;x.whyLocked='';}}
 q.previousAnswer=copy(previousAnswer(s.player,topic)||null);if(q.previousAnswer&&planIndex(topic,q.previousAnswer.answer)>=0){const previous=q.options.find(x=>x.id===q.previousAnswer.answer);if(previous){previous.unlocked=true;previous.whyLocked='';}}
 const memory=p.id==='canvass'?s.player.residents?.[p.venue]:null;q.memoryHint=memory?`${memory.name}記得你上次說：「${memory.lastQuote}」`:'';
 q.crowd=p.crowd||(p.id==='canvass'?crowdMix(s,p.venue):s.landscape.groups.map(g=>g.share));
 q.issueCard={concern:q.concern||TOPICS[topic].ask,tradeoffs:(TOPICS[topic].plans||[]).map(x=>({title:x.text,text:x.detail})),commitment:stance(s,topic),insight:copy(s.player.insight?.[topic]||null),partyLine:partyLine(s,0,topic),rivalLine:partyLine(s,1,topic)};
 // The two approaches come in an order drawn per game, so no position is the safe answer.
 {const idx=q.options.map((o,i)=>planIndex(topic,o.id)>=0?i:-1).filter(i=>i>=0);if(idx.length===2&&rand(s.seed,'plan-order',topic)<.5){const [a,b]=idx;[q.options[a],q.options[b]]=[q.options[b],q.options[a]];}}
 for(const option of q.options){option.faces=answerFaces(s,topic,option.id);option.tags=answerTags(s,topic,option.id);option.estimate=null;option.preselected=!!q.previousAnswer&&option.id===q.previousAnswer.answer;option.researchTier=s.player.studied?.[topic]?'self':s.player.insight?.[topic]?'helper':'unknown';option.reactions=answerReactions(s,topic,option.id);
  if(option.id==='guarantee'&&guaranteeCount(s.player)>=GUARANTEE_FATIGUE.free)option.tags.push({kind:'fatigue',text:`你已經打包票 ${guaranteeCount(s.player)} 次：再說一次，信的人更少`});
  if(option.id==='honest'&&honestCount(s.player)>=HONEST_FATIGUE.free)option.tags.push({kind:'fatigue',text:`你已經 ${honestCount(s.player)} 次先不答應：再說一次，三群都會覺得你沒政見`});
  if(option.id==='honest'&&!known&&!owed)option.tags.push({kind:'unprepared',text:q.stage?'沒準備就上台：效果打折，還會扣分':'先記下問題，沒有具體答案：小扣分'});
  if(option.id==='guarantee'&&!known&&q.stage&&!topicPromise(s.player,topic))option.tags.push({kind:'unprepared',text:'沒準備就開支票：主持人會追問細節，效果打折、還會扣分'});}
 return q;
}
function rememberConversation(s,a,p,quote,mode){const sp=speakerFor(s,p.venue),old=a.residents[sp.id],mood=speakerTone(s,sp,p.topic,mode),reaction=`${sp.name}說：「${SPEAKER_LINES[mood]||SPEAKER_LINES.flat}」`;a.residents[sp.id]={id:sp.id,name:sp.name,group:sp.group,topic:p.topic,visits:(old?.visits||0)+1,lastRound:s.day,lastQuote:quote,lastAnswer:mode,lastReaction:reaction,mood};a.npcMemory[p.topic]=a.residents[sp.id];return{npc:sp.id,name:sp.name,group:sp.group,groupTitle:sp.groupTitle,topic:p.topic,quote,reaction,mood,visits:a.residents[sp.id].visits,changed:!old||old.lastQuote!==quote};}
// Street contacts follow the place's crowd; TV, debates, the press and helpers walking alone reach groups by their size.
function audienceWeights(s,action,venue){if(MEDIA_LEAN[action])return mediaMix(s,action).map((m,g)=>m/s.landscape.groups[g].share);if(!['canvass','team-canvass','offer','rally','billboard'].includes(action)||!VENUES[venue])return GROUPS.map(()=>1);return crowdMix(s,venue).map((m,g)=>m/s.landscape.groups[g].share);}
// Identity rules shift one group; party voters are easier to win for their own party's candidate and harder for the other's.
function lift(s,a,v){const party=partyOf(s,a.index),R=TUNING.party.receptive,p=!party?(v.p==='none'&&a.index===0?R.swing:1):v.p==='none'?1:v.p===party?R.same[party]:R.opposite;if(a.index!==0)return p;const rule=identity(s).rule;return p*(rule&&v.g===s.landscape.identityGroup?TUNING.lift[rule]:1);}
// A rally restates your whole platform: each listener weighs your public stances on the issues they care about.
function rallyEffect(s,a,v,i){let d=0,heard=0;for(const t of topicsOf(s)){if(!caresAbout(s,v,i,t))continue;const st=lastPlan(a,t);if(st){d+=prefers(v,t)===planIndex(t,st.answer)?TUNING.rally.match:TUNING.rally.miss;heard++;continue;}const promise=topicPromise(a,t);if(promise){d+=TUNING.promise[s.landscape.groups[v.g].promise].guarantee*.6;heard++;}else d+=TUNING.rally.open;}return heard?d:d+TUNING.rally.goodwill;}
// Holding off ("先不答應") wears thin: the first two are free, then each further one lands worse with every group.
// Making the same kind of answer again and again wears thin: the first two guarantees are believed, then each further one less.
const HONEST_FATIGUE={free:2,step:.003},GUARANTEE_FATIGUE={free:2,step:.004};
const honestCount=a=>(a?.actions||[]).filter(x=>x.answer==='honest').length,guaranteeCount=a=>(a?.actions||[]).filter(x=>x.answer==='guarantee').length;
function promiseValue(s,a,att,mode){const x=TUNING.promise[att][mode==='guarantee'?'guarantee':'honest'];return mode==='guarantee'?x-Math.max(0,guaranteeCount(a)-GUARANTEE_FATIGUE.free+1)*GUARANTEE_FATIGUE.step:x-Math.max(0,honestCount(a)-HONEST_FATIGUE.free+1)*HONEST_FATIGUE.step;}
function effectOf(s,a,v,i,topic,mode,plan,care){
 if(mode==='rally')return rallyEffect(s,a,v,i);
 if(mode==='billboard')return TUNING.billboard;
 if(topic==='tip'){const t=s.events.tip,ev=t.evidenceLevel,known=ev>=2||!!t.verification;if(mode==='tip_limited')return ev?(v.accuracy>.45?.012:.004):-.004;if(mode==='tip_correct')return v.accuracy>.4?.012:-.004;if(mode==='tip_accuse'){if(!known)return v.accuracy<.45?.012:-.008;const base=t.truth==='issue'?(v.accuracy<.45?.02:.01):t.truth==='false'?-.06:-.012;return t.truth==='issue'?base*1.2:base;}return 0;}
 if(plan>=0){const match=prefers(v,topic)===plan,resent=OPPOSE[TOPICS[topic].plans[plan].id]?.[GROUPS[v.g].id];return care?(match?TUNING.careMatch:TUNING.careMiss):match?TUNING.otherMatch:Math.min(TUNING.otherMiss,resent??0);}
 // Promises and candour land differently by group: one group rewards bold promises, another punishes them.
 return promiseValue(s,a,s.landscape.groups[v.g].promise,mode)*(care?TUNING.careBoost:1);
}
// Both focal candidates court the same swing voters: part of either one's gain comes out of the other's support.
const apply=(v,index,delta,steal=0)=>{const before=v.support[index];v.support[index]=clamp(before+delta,.001,.16);const gained=v.support[index]-before;if(steal&&gained>0&&!(v.locked&&index===1))v.support[1-index]=clamp(v.support[1-index]-gained*steal,.001,.16);};
// Small gifts warm elders most; the middle-aged and the young barely notice.
const giftBonus=(boost,v)=>!boost?0:typeof boost.bonus==='number'?boost.bonus:(boost.bonus?.[GROUPS[v.g].id]||0);
function contact(s,a,action,mode,topic,stream='',scale=1,venue=null,boost=null){
 const kind=action==='team-canvass'?'team':action,estimate=reachEstimate(s,a,action,stream),repeat=action==='billboard'?0:repeatOf(s,a,action,stream),street=['canvass','team-canvass','rally'].includes(action),target=Math.round(TUNING.reach[kind]*(street?weather(s).factor:1)*(boost?.reach||1)*homeReach(s,a,action,venue)*(action==='tv'?tvFatigue(s,a):1)*(.9+rand(s.seed,'reach',s.day,a.index,action,stream)*.2)/(1+repeat*.3));
 const weights=audienceWeights(s,action,venue),studied=a.studied?.[topic]&&planIndex(topic,mode)>=0?TUNING.studied:1,depth=TUNING.depth[kind]*(a.index===0&&action==='canvass'?identity(s).canvassDepth*(originOf(s)?.canvass||1):1)*studied,plan=planIndex(topic,mode),groups=GROUPS.map(g=>({id:g.id,title:g.title,reached:0,up:0,down:0,gain:0,votes:0})),touched=[],caring={people:0,positive:0},heardSet=a.index===0&&plan>=0?new Set(a.heard?.[topic+':'+mode]||[]):null;
 for(let i=0;i<POPULATION;i++){const v=s.voters[i];if(rand(s.seed,'contact',s.day,a.index,action,stream,i)>=target/POPULATION*weights[v.g])continue;const before=v.support[a.index],care=!!topic&&topic!=='tip'&&caresAbout(s,v,i,topic);let delta=effectOf(s,a,v,i,topic,mode,plan,care)*depth*scale+giftBonus(boost,v);
  // A voter already put off by this candidate is harder to win back.
  if(delta>0)delta*=(v.rec?.[a.index]??1)*lift(s,a,v);
  // People who already heard you give the same answer are moved far less the second time.
  if(delta>0&&heardSet?.has(i))delta*=TUNING.reheard;
  apply(v,a.index,delta,TUNING.steal);if(delta<0&&v.rec)v.rec[a.index]=Math.max(TUNING.receptivityFloor,v.rec[a.index]*TUNING.receptivityHit);
  if(care){caring.people++;if(delta>0)caring.positive++;}touched.push({i,before});}
 let up=0,down=0;for(const {i,before} of touched){const v=s.voters[i],d=v.support[a.index]-before,G=groups[v.g];G.reached++;G.votes+=d*PER_VOTER;if(d>0){up++;G.up++;G.gain+=d*PER_VOTER;}else if(d<0){down++;G.down++;}}
 const reach=touched.length;a.recognition=clamp(a.recognition+Math.round(reach*.16),0,99);return{reach,up,down,expectedReach:estimate,groups,caring,votes:groups.reduce((n,g)=>n+g.votes,0),audience:touched.map(x=>x.i)};
}
// Switching approach on an issue lets down the people who heard the old one and preferred it.
function flipReaction(s,topic,mode){const a=s.player,old=lastPlan(a,topic);if(!old||old.answer===mode)return null;const k=planIndex(topic,old.answer),hit=TUNING.flip*(identity(s).flip||1),byGroup=GROUPS.map(()=>0);let dv=0,people=0;for(const i of a.heard?.[topic+':'+old.answer]||[]){const v=s.voters[i];if(prefers(v,topic)!==k)continue;const before=v.support[0];apply(v,0,-hit);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;people++;}return{from:old.quote,people,votes:dv,byGroup};}
// Breaking an accepted deal: the organisation withdraws its members' votes and the people who heard the deal are let down.
function offerBreach(s,topic,mode){const deal=activeDeal(s,topic);if(!deal||deal.plan===mode)return null;const o=s.offers.find(x=>x.id===deal.id),bloc=s.player.blocs.find(b=>b.offer===deal.id&&b.status==='active'),k=planIndex(topic,deal.plan),byGroup=GROUPS.map(()=>0);bloc.status='withdrawn';o.breachDay=s.day;let dv=0,people=0;for(const i of o.audience||[]){const v=s.voters[i];if(prefers(v,topic)!==k)continue;const before=v.support[0];apply(v,0,-TUNING.breach);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;people++;}return{org:deal.org,bloc:deal.votes,people,votes:dv-deal.votes,byGroup};}
// Calling out the rival: listeners who side with you think less of him, those who side with him think you are picking a fight.
function counterHit(s,topic,k,audience){const byGroup=GROUPS.map(()=>0);let rival=0,you=0,gained=0;for(const i of audience){const v=s.voters[i];if(prefers(v,topic)===k){const before=v.support[1];apply(v,1,-TUNING.counter.rival);rival+=(v.support[1]-before)*PER_VOTER;const mine=v.support[0];apply(v,0,TUNING.counter.gain);const d=(v.support[0]-mine)*PER_VOTER;you+=d;gained+=d;byGroup[v.g]+=d;}else{const before=v.support[0];apply(v,0,-TUNING.counter.backlash);const d=(v.support[0]-before)*PER_VOTER;you+=d;byGroup[v.g]+=d;}}return{rival,you,gained,lost:you-gained,byGroup};}
// A press conference hits the rival only as hard as the facts allow.
function pressRival(s,mode,audience){const t=s.events.tip,ev=t.evidenceLevel;let f=0;if(mode==='tip_limited')f=ev?(t.truth==='issue'?-.02:t.truth==='unclear'?-.008:0):0;else if(mode==='tip_accuse')f=!(ev>=2||t.verification)?-.03:t.truth==='issue'?-.045*1.25:t.truth==='unclear'?-.015:.01;else if(mode==='tip_correct')f=.008;let dv=0;for(const i of audience){const v=s.voters[i],before=v.support[1];apply(v,1,f);dv+=(v.support[1]-before)*PER_VOTER;}return dv;}
function settle(a,topic,day,answer,quote){let count=0;for(const p of a.promises)if(p.topic===topic&&['pending','unresolved'].includes(p.status)){p.status='corrected';p.correctedDay=day;p.reviewedVersion=p.version||1;(p.responses||=[]).push({day,answer,quote});count++;}return count;}
// Taking back a guarantee lets down the people who believed it: those who like bold promises fully, the undecided half as much.
function walkBack(s,a,topic){const p=topicPromise(a,topic);if(!p)return null;const byGroup=GROUPS.map(()=>0);let dv=0,people=0;for(const i of p.audience||[]){const v=s.voters[i],f={likes:1,mixed:.5,dislikes:0}[s.landscape.groups[v.g].promise];if(!f)continue;const before=v.support[0];apply(v,0,-TUNING.unkept.corrected*f);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;people++;}return{people,votes:dv,byGroup,quote:p.text};}
// A small shift for everyone in an audience, reported as votes.
function nudge(s,index,audience,delta){const byGroup=GROUPS.map(()=>0);let dv=0;for(const i of audience){const v=s.voters[i],before=v.support[index];apply(v,index,delta);const d=(v.support[index]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}return{votes:dv,byGroup};}
// Getting out the vote: people at the place (everyone, on TV) who already lean to you firm up and can no longer be pulled away.
// Getting out the vote reaches part of a place's main crowd (part of everyone, on TV).
function getOutTheVote(s,venue){const main=venue?s.landscape.main[venue]:null,share=venue?TUNING.gotvShare.place:TUNING.gotvShare.tv,byGroup=GROUPS.map(()=>0);let dv=0,people=0;for(let i=0;i<s.voters.length;i++){const v=s.voters[i];if(main!=null&&v.g!==main)continue;if(rand(s.seed,'gotv',s.day,i)>=share)continue;if(v.support[0]<=v.support[1])continue;const before=v.support[0];v.support[0]=clamp(before*TUNING.gotv,.001,.16);v.locked=true;const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;people++;}return{people,votes:dv,byGroup};}
function recordPromise(a,topic,day,quote,wasFollowup,audience=[]){
 let p=a.promises.find(x=>x.topic===topic);const changed=!p||p.status==='corrected'||p.text!==quote;
 if(!p){p={id:`${a.index}-${day}`,topic,text:quote,status:'unresolved',madeDay:day,version:1,reviewedVersion:0,responses:[]};a.promises.push(p);}else if(changed){p.version=(p.version||1)+1;p.text=quote;p.status='unresolved';p.madeDay=day;}
 p.responses.push({day,answer:'guarantee',quote});if(wasFollowup)p.reviewedVersion=p.version;
 // Who heard the guarantee: they are the ones disappointed if the rival exposes it and you never correct it.
 p.audience=changed?[...audience]:[...new Set([...(p.audience||[]),...audience])];
 return{promise:p,newPromise:changed};
}
// Helpers who follow you work the same crowd, so each extra follower reaches fewer new people than the one before.
function helperWork(s,a,p){let followers=0;return(p.teamAssignments||[]).map(member=>{
 const base={id:member.id,name:member.name,memberName:member.name,task:member.task,cost:member.cost,reach:0,positive:0,reserved:0};
 if(member.task==='release')return{...base,title:member.name+' 結束合作',result:'已付合約不退款。'};
 if(member.task==='idle')return{...base,title:member.name+' 待命',result:'這回合沒有安排工作。'};
 if(member.task==='booth'){const [lo,hi]=TUNING.booth,income=lo+Math.floor(rand(s.seed,'booth',s.day,a.index,member.id)*(hi-lo+1));return{...base,title:member.name+' 擺小額募款攤',income,booth:true,result:`募到 ${income.toLocaleString('zh-TW')} 元。`};}
 // On a round without a public stance (recruiting, fundraising) assistants out canvassing repeat your latest public stance.
 const topic=p.topic||[...a.actions].reverse().find(x=>x.topic&&planIndex(x.topic,x.answer)>=0)?.topic||null,prior=topic?previousAnswer(a,topic):null,mode=planIndex(topic,prior?.answer)>=0?prior.answer:'honest';
 if(member.task==='follow'){
  if(PUBLIC.includes(p.id)||p.id==='rally'){const fade=Math.max(TUNING.follow.floor,1-TUNING.follow.step*followers++),r=p.id==='rally'?contact(s,a,'team-canvass','rally',null,member.id,1,p.venue,{reach:fade}):contact(s,a,'team-canvass',mode,topic,member.id,p.scale??1,p.id==='canvass'?p.venue:null,{reach:fade});a.counts[countKey('team-canvass',member.id)]=(a.counts[countKey('team-canvass',member.id)]||0)+1;if(topic)hear(a,topic,mode,r.audience);return{...base,title:member.name+' 同行拉票',reach:r.reach,positive:r.up,reserved:r.down,groups:r.groups,votes:r.votes,result:`跟著你拉票，接觸 ${r.reach} 人。`};}
  if(p.id==='fundraise'){const income=8000+Math.floor(rand(s.seed,'crew-fundraise',s.day,a.index,member.id)*4001);return{...base,title:member.name+' 同行募款',income,result:`協助募得 ${income.toLocaleString('zh-TW')} 元。`};}
  return{...base,title:member.name+' 隨隊工作',result:'協助處理這回合的工作。'};
 }
 if(member.task==='stream')return{...base,title:member.name+' 開直播、剪片',result:'這回合都在經營新媒體。'};
 if(member.task==='research')return{...base,title:member.name+' 先去打聽',knowledge:member.researchTopic,result:a.index===0?insightLine(s,member.researchTopic):'查了資料。'};
 if(!topic)return{...base,title:member.name+' 自己去拉票',result:'沒有公開立場可講，只發了傳單。'};
 const r=contact(s,a,'team-canvass',mode,topic,member.id,p.scale??1,null);a.counts[countKey('team-canvass',member.id)]=(a.counts[countKey('team-canvass',member.id)]||0)+1;hear(a,topic,mode,r.audience);
 return{...base,title:member.name+' 自己去拉票',reach:r.reach,positive:r.up,reserved:r.down,groups:r.groups,votes:r.votes,result:`沿用你公開過的說法，接觸 ${r.reach} 人。`};
 });}
function resolveAction(s,a,b,p,answerId){
 const action=ACTIONS.find(x=>x.id===p.id),t=TOPICS[p.topic],entry=a.actions[a.actions.length-1],before=p.before||snapshot(s,a,{...b,available:b.available+entry.cost}),wasFollowup=(!!p.followup&&p.followup.kind!=='stance')||!!topicPromise(a,p.topic)&&!!previousAnswer(a,p.topic),hadPromise=!!topicPromise(a,p.topic);
 let dealt=null,result='',reason='',income=0,quote=null,facts=[],corrected=0,contactReport=null,newPromise=false,flip=null,breach=null,counter=null,line=null,rivalHit=0,back=null,stumble=null,exposed=null,edge=0,push=null,bonus=null,caught=false;
 // Helpers use a previously public stance, never today's unanswered choice.
 const teamReports=helperWork(s,a,p),network=a.index===0?campaignNetworkWork(s):null,teamReport=teamReports[0]||null,boost=p.addons?.gifts?TUNING.gifts:null,chief=a.index===0&&['canvass','rally'].includes(p.id)?chiefVisit(s,p.venue):null,chiefScale=chief?.scale||1;
 if(network)teamReports.push(network);
 if(p.id==='prepare'&&p.topic!=='tip'){const added=learn(a,p.topic),deeper=a.index===0&&reveal(s,p.topic,'self');if(a.index===0)a.studied[p.topic]=true;if(a.index===0){const issues=s.polls?.at(-1)?.issues||{};bonus=[...topicsOf(s)].filter(x=>x!==p.topic&&!s.player.insight?.[x]).sort((x,y)=>(issues[y]||0)-(issues[x]||0))[0]||null;if(bonus){learn(a,bonus);reveal(s,bonus,'helper');}}result=(added||deeper?`查清楚「${t.title}」。`:'這題已經查過，今天再複習一次。')+(a.index===0?' '+insightLine(s,p.topic):'')+(bonus?` 順便看清「${TOPICS[bonus].title}」。`:'');reason=a.index===0?'之後談這題，三群的反應都看得到，說服力也更強。':'';}
 if(p.id==='prepare'&&p.topic==='tip'){result=tipEvidence(s.events.tip);reason=p.investigating?'付了核對費，證據多一層；真相不會因此改變。':'能查的都查完了。';}
 if(p.id==='fundraise'&&p.donor&&a.index===0){const d=dealOf(s,p.donor),o={id:d.id,round:s.day,status:'accepted',via:'visit',bloc:offerBloc(s,d),money:d.money,respondedDay:null};s.offers.push(o);dealt=commitOffer(s,a,o);o.effect=dealt;const helpers=teamReports.filter(x=>!x.booth).reduce((n,x)=>n+(x.income||0),0);b.donations+=helpers;b.available+=helpers;income=d.money+helpers;entry.income=income;result=`拜訪${d.name}：拿到 ${income.toLocaleString('zh-TW')} 元`+(o.bloc?`、組織票約 ${o.bloc.toLocaleString('zh-TW')} 票`:'')+(d.perk==='tv'?'、一次免費上節目':'')+`；你公開支持「${TOPICS[d.topic].plans.find(x=>x.id===d.plan).text}」。`;reason='之後改說另一個做法，他會撤回支持，也算改口。';}
 else if(p.id==='fundraise'&&a.index===0){const f=playerFundraise(s,teamReports.filter(x=>!x.booth).reduce((n,x)=>n+(x.income||0),0));income=f.income;b.donations+=income;b.available+=income;entry.income=income;result=f.miss?`這回合沒談成，只拿到 ${income.toLocaleString('zh-TW')} 元。`:`募到 ${income.toLocaleString('zh-TW')} 元。`;reason=f.miss?'人家客氣聽完，但沒有掏錢。':'這回合沒有對外拉票。';}
 else if(p.id==='fundraise'){income=Math.round((80000+Math.floor(rand(s.seed,'fundraise',s.day,a.index)*80001)+teamReports.filter(x=>!x.booth).reduce((n,x)=>n+(x.income||0),0))*(a.index===0?identity(s).fundraise:1)*partyFundraise(s,a.index));b.donations+=income;b.available+=income;entry.income=income;result=`募到 ${income.toLocaleString('zh-TW')} 元。`;reason='這回合沒有對外拉票。';}
 {const stall=teamReports.filter(x=>x.booth).reduce((n,x)=>n+x.income,0);if(stall){b.donations+=stall;b.available+=stall;income+=stall;entry.income=(entry.income||0)+stall;}}
 if(p.id==='recruit'){if(!a.team)a.team={hiredDay:s.day,members:[],size:0};const count=Number.isInteger(p.recruitCount)?p.recruitCount:1,names=['小葉','阿哲','佳佳','阿澄','小竹','以安','小岑','阿禾','小川'];for(let i=0;i<count;i++){const used=new Set(members(a).map(m=>m.name)),name=names.find(n=>!used.has(n));a.team.members.push({id:`${a.index}-staff-${s.day}-${i}`,name,hiredDay:s.day});}a.team.size=a.team.members.length;result=`新增 ${count} 位助手，下回合開始幫忙。`;reason=`預付剩餘 ${p.contractDays} 天薪水，共 ${entry.baseCost.toLocaleString('zh-TW')} 元。`;a.contracts.push({id:`${a.index}-contract-${s.day}`,day:s.day,people:count,days:p.contractDays,monthlyRate:50000,cost:entry.baseCost,startsDay:Math.round(s.day*ROUND_DAYS)+1});}
 if(p.id==='rally'){const held=a.actions.filter(x=>x.action==='rally'&&x.day<s.day).length;contactReport=contact(s,a,'rally','rally',null,'',(p.scale??1)*chiefScale*(p.crewFactor??1)/(1+TUNING.rally.fatigue*held),p.venue,boost);result=`你在${p.venueTitle}辦造勢，${contactReport.reach} 人聽了你的政見。`;reason='立場合他們的人加分，不合的人扣分；還沒表態的議題只算熱鬧。';}
 if(PUBLIC.includes(p.id)&&t&&p.topic!=='tip'){
  const isCounter=answerId==='counter'&&!!counterPlan(s,t.id),plan=isCounter?counterPlan(s,t.id):t.plans.find(x=>x.id===answerId),mode=plan?.id||answerId||'honest';if(a.index===0&&plan){flip=flipReaction(s,t.id,mode);breach=offerBreach(s,t.id,mode);}
  // On TV and at the debate the host presses for details, so an unresearched promise stumbles like an unresearched 'I will look into it'.
  const stage=['tv','debate'].includes(p.id),unprepared=a.index===0&&!a.known.includes(t.id)&&!topicPromise(a,t.id)&&(mode==='honest'||stage&&mode==='guarantee');
  contactReport=contact(s,a,p.id,mode,p.topic,p.id==='canvass'?p.venue:'',(p.scale??1)*(p.id==='canvass'?p.crewFactor??1:1)*chiefScale*(unprepared&&stage?TUNING.unprepared.scale:1),p.id==='canvass'?p.venue:null,p.id==='canvass'?boost:p.id==='online'?{reach:(p.viral||1)*(.5+.25*(p.streamers??1))*(p.campaignFollowup?followupFit(s,p.topic).factor:1)}:null);hear(a,t.id,mode,contactReport.audience);if(unprepared){stumble=nudge(s,0,contactReport.audience,-TUNING.unprepared.penalty*(stage?1:.5)*(identity(s).stumble||1));stumble.promise=mode==='guarantee';}
  if(a.index===0&&p.id==='debate'&&s.player.insight?.[t.id]?.level==='precise'){const hit=nudge(s,1,contactReport.audience,-TUNING.debateEdge);edge=hit.votes;rivalHit+=edge;}line=partyLineHit(s,a,t.id,mode,contactReport.audience);if(a.index===0&&mode!=='guarantee')back=walkBack(s,a,t.id);
  if(isCounter){counter=counterHit(s,t.id,planIndex(t.id,mode),contactReport.audience);rivalHit+=counter.rival;}
  if(mode==='guarantee'){quote=guaranteeText(s,t.id);const recorded=recordPromise(a,t.id,s.day,quote,wasFollowup,contactReport.audience);newPromise=recorded.newPromise;result=`你說：「${quote}」。`;reason='有人覺得有魄力，也有人覺得是空話。';}
  else if(plan){quote=isCounter?`小馬要「${TOPICS[t.id].plans[1-planIndex(t.id,mode)].text}」，我主張「${plan.text}」`:plan.text;corrected=settle(a,t.id,s.day,mode,plan.text);result=`你主張「${plan.text}」。`;reason=isCounter?'你點名批評小馬。':corrected?'先前的保證已更正。':'';}
  else{quote=hadPromise?correctionText(t.id):HONEST;corrected=settle(a,t.id,s.day,mode,quote);result=corrected?'你更正了做不到的保證。':'你先記下問題，沒有亂答應。';reason='';}
  entry.answer=mode;entry.quote=isCounter?plan.text:quote;entry.counter=!!isCounter;entry.prepared=a.known.includes(p.topic);
 }
 if(p.id==='press'&&a.index===0&&!p.exposing){
  const tip=s.events.tip,mode=answerId||'tip_limited',prior=tip.publication,option=tipQuestion({...s,phase:'question'}).options.find(o=>o.id===mode);quote=option?.text||'只公布查到的事實';
  const unverified=!(tip.evidenceLevel>=2||tip.verification);caught=mode==='tip_accuse'&&unverified&&rand(s.seed,'press-caught',s.day)<({false:.5,unclear:.25,issue:0})[tip.truth];
  contactReport=contact(s,a,'press',mode,'tip','',1,null);const flop=!caught&&mode!=='tip_correct'&&rand(s.seed,'press-flop',s.day)<TUNING.pressFlop.chance;const solid=(tip.evidenceLevel>=2||!!tip.verification)&&tip.truth==='issue'&&mode!=='tip_correct';if(caught)stumble=nudge(s,0,contactReport.audience,-.03);else if(solid){exposed=releaseDirt(s,{id:'tip',round:s.day,holds:true,verified:true},'press',mode,1,EXPOSE.tip*(flop?TUNING.pressFlop.scale:1));exposed.title='經費重複請款';rivalHit+=exposed.rival;}else rivalHit+=pressRival(s,mode,contactReport.audience)*(flop?TUNING.pressFlop.scale:1);if(rivalHit<0)a.grudge=(a.grudge||0)+1;entry.answer=mode;entry.quote=quote;entry.prepared=tip.evidenceLevel>0;
  const record={id:`publication-${s.day}`,round:s.day,mode,quote,evidenceLevel:tip.evidenceLevel,evidenceText:tipEvidence(tip),truthKnown:tip.evidenceLevel>=2||tip.verification?tip.truth:null};
  if(!prior||prior.mode!==mode||prior.evidenceLevel!==tip.evidenceLevel||tip.responseDue){tip.history.push(copy(record));tip.publication=record;}tip.responseDue=false;
  if(mode!=='tip_correct'&&!tip.verification){if(!tip.verifyAt){tip.verifyAt=s.day+SCHEDULE.pace.verifyDelay;tip.verifyTarget=copy(record);}else if(mode==='tip_accuse'&&tip.verifyTarget?.mode!=='tip_accuse'){tip.verifyTarget=copy(record);tip.verifyAt=Math.min(tip.verifyAt,s.day+SCHEDULE.pace.verifyDelay);}}
  result=`你在記者會說：「${quote}」。`+(caught?' 記者當場追問，證據撐不住。':flop?' 網友反應不如預期，新聞一天就被別的話題蓋過。':'');reason=caught?'沒查證就指控，當場被識破，傷的是你。':mode==='tip_accuse'?(SCHEDULE.pace.verifyDelay>1?'兩回合後':'下一回合')+'會有核對結果；指控錯了，傷的是你。':mode==='tip_correct'?'承認說過頭。':'只講查到的部分。';
 }
 if(p.id==='dig'&&a.index===0){
  const r=rand(s.seed,'dig',s.day),audience=s.voters.map((_,i)=>i).filter(i=>rand(s.seed,'dig-audience',s.day,i)<DIG.share),odds=digOdds(s),outcome=r<odds.found?'found':r<odds.found+odds.nothing?'nothing':'backfire';entry.dig=outcome;
  if(outcome==='found'){const d=addDirt(s,a);entry.dirt=d.id;result='挖到了：'+DIRT[d.kind].text;reason='放進黑料檔案，還沒公開；先查證，再挑時機在記者會、電視或直播爆。';}
  else if(outcome==='nothing'){result='沒挖到：挖了一輪，什麼都沒有。';reason='錢花掉了，小馬沒受影響。';}
  else{stumble=nudge(s,0,audience,DIG.backfire);caught=true;a.grudge=(a.grudge||0)+1;result='被反咬：小馬發現你派人跟拍，開記者會說你搞抹黑。';reason='看到新聞的人對你打了折扣；小馬記下這筆，之後更可能爆你的料。';}
 }
 // Releasing a lead from the dirt file; at a press conference it is the whole round and the answer sets how hard you go.
 if(a.index===0&&p.exposing){const d=(a.dirt||[]).find(x=>x.id===p.exposing&&!x.used);if(d){const press=p.id==='press',mode=press&&answerId==='tip_limited'?'tip_limited':'tip_accuse',x=releaseDirt(s,d,p.id,mode,p.viral||1),title=DIRT[d.kind].title;d.used=true;d.outlet=p.id;d.releasedRound=s.day;d.mode=mode;d.votes=x.votes;d.rival=x.rival;d.leak=x.leak;d.result=x.kind;exposed={...x,title};rivalHit+=x.rival;if(x.rival<0)a.grudge=(a.grudge||0)+1;
  if(press){quote=mode==='tip_limited'?'只公布查到的事實':'公布證據，點名小馬';entry.answer=mode;entry.quote=quote;entry.prepared=!!d.verified;result=`你在記者會公開「${title}」。`;}else result+=` 你順勢公開「${title}」。`;
  result+=x.kind==='backfire'?(p.id==='online'?' 網友起底，資料兜不攏，反咬你一口。':' 被追問證據答不出來，反咬你一口。'):x.kind==='flat'?' 只放了風聲，沒人追。':x.leak?' 小馬早一步發聲明撇清，殺傷力打了折。':'';
  reason=x.kind==='backfire'?'沒查證就爆，料不實，傷的是你。':x.kind==='flat'?'料站不住，好在你沒把話說死。':d.verified?'證據站得住：不信小馬的人轉向你。':'沒查證，有人半信半疑，效果打折。';}}
 if(a.index===0&&p.addons?.billboard){a.billboards.push({venue:p.venue,round:s.day});result+=' 你在'+p.venueTitle+'立了一面看板。';}
 if(a.index===0&&p.addons?.gotv){push=getOutTheVote(s,p.id==='tv'?null:p.venue);result+=` 選前催票：${push.people} 位傾向你的人確定出門投票。`;}
 let campaign=a.index===0?campaignAfterAction(s,p,entry,contactReport):null;if(!campaign&&network?.reach){campaign={round:s.day,title:'地方小隊替你繼續跑',text:network.result};s.campaign.latest=campaign;}if(campaign)result+=' '+campaign.text;
 const conversation=a.index===0&&p.id==='canvass'&&quote?rememberConversation(s,a,p,quote,entry.answer):null;if(a.index===0){const ledger=s.ledger.find(x=>x.day===s.day&&x.action===p.id);if(ledger&&ledger!==entry)Object.assign(ledger,entry);}a.counts[countKey(p.id,p.id==='canvass'?p.venue:'')]=(a.counts[countKey(p.id,p.id==='canvass'?p.venue:'')]||0)+1;
 const parts=[flip,breach,counter?{votes:counter.you,byGroup:counter.byGroup}:null,line,back,stumble,exposed,push,chief?.broke?{votes:chief.bloc}:null,dealt?{votes:dealt.votes,byGroup:dealt.groups.map(g=>g.votes)}:null].filter(Boolean),extra=parts.reduce((n,x)=>n+(x.votes||0),0),byGroup=contactReport?contactReport.groups.map((g,k)=>g.votes+parts.reduce((n,x)=>n+(x.byGroup?.[k]||0),0)):push?push.byGroup:stumble?stumble.byGroup:exposed?exposed.byGroup:null;
 return{title:p.title||action.title,venue:p.venue,venueTitle:p.venueTitle,topicReason:p.topicReason,action:p.id,cost:p.cost??p.totalCost,baseCost:entry.baseCost,teamCost:entry.teamCost,eventCost:entry.eventCost||0,addons:copy(p.addons||{}),income,result,reason,campaign,campaignOpportunity:p.campaignOpportunity||null,network,conversation,teamNote:p.teamNote||'',teamReport,teamReports,quote,facts,topic:p.topic,corrected,newPromise,answer:entry.answer??null,prepared:!!entry.prepared,flip,breach,counter:counter?{rival:counter.rival,you:counter.you,gained:counter.gained,lost:counter.lost}:null,partyLine:line?{kept:line.kept,votes:line.votes,party:line.party}:null,walkBack:back?{people:back.people,votes:back.votes,quote:back.quote}:null,stumble:stumble?{votes:stumble.votes,caught,promise:!!stumble.promise}:null,exposed:exposed?{votes:exposed.votes,kind:exposed.kind,rival:exposed.rival??null,outlet:exposed.outlet||null,title:exposed.title||null,verified:exposed.verified??null,leak:exposed.leak||0}:null,dirt:entry.dirt||null,debateEdge:edge||null,gotv:push?{people:push.people,votes:push.votes}:null,bonusTopic:bonus,dig:entry.dig||null,drawn:!!p.drawn,pool:p.pool||null,brief:p.brief||null,rivalHit,byGroup,crowd:p.crowd||null,votes:(contactReport?.votes||0)+extra,viral:p.id==='online'?p.viral||1:null,chief,dealt:dealt?{id:p.donor,org:dealOf(s,p.donor).org,name:dealOf(s,p.donor).name,topic:dealOf(s,p.donor).topic,plan:dealOf(s,p.donor).plan,money:dealOf(s,p.donor).money,bloc:dealt.bloc,votes:dealt.votes,contact:dealt.contact,perk:dealOf(s,p.donor).perk}:null,direct:contactReport?{votes:contactReport.votes,byGroup:contactReport.groups.map(g=>g.votes)}:null,teamVotes:teamReports.reduce((n,x)=>n+(x.votes||0),0),caring:contactReport?.caring||null,audience:contactReport?.audience||[],scale:p.scale??1,effects:{before,after:snapshot(s,a,b),contacts:contactReport?.reach||0,positive:contactReport?.up||0,reserved:contactReport?.down||0,groups:contactReport?.groups||[]}};
}
function groupTopic(s,g,salt){const G=s.landscape.groups[g],list=topicsOf(s),w=t=>(G.weights[t]||.3)*(surgeActive(s,t)?2:1);let r=rand(s.seed,salt,s.day)*list.reduce((n,t)=>n+w(t),0);for(const t of list){r-=w(t);if(r<0)return t;}return list.at(-1);}
function rivalVenue(s,target){const pool=Object.values(VENUES).filter(v=>s.landscape.main[v.id]===target),list=pool.length?pool:Object.values(VENUES);return list[Math.floor(rand(s.seed,'rival-venue',s.day)*list.length)].id;}
// The rival commits to this round's move at its start: he courts the group where you gain on him, so the street rumour can be acted on.
function planRival(s){
 const a=s.rival,b=a.budget,last=s.day>=DAYS;
 if(s.day===DEBATE_ROUND&&s.debate)return{round:s.day,action:'debate',topic:s.debate.topic,venue:null,target:null,attack:null,rumor:{action:'debate',topic:s.debate.topic,venue:null,attack:false,accurate:true}};
 const you=groupVotes(s,0),rival=groupVotes(s,1),target=[0,1,2].sort((x,y)=>(you[y]-rival[y])-(you[x]-rival[x])||x-y)[0],open=s.player.promises.find(p=>p.status==='unresolved'&&!s.challenges.some(c=>c.promiseId===p.id&&c.version===p.version));let attack=null,topic;
 // A newcomer is beneath his notice until they come within reach of the last seat.
 const race=identity(s).id==='newcomer'&&!originOf(s)?.watched?raceView(s):null,noticed=!race||race.you>=race.line*TUNING.newcomerNoticed;
 if(noticed&&!last&&open&&rand(s.seed,'rival-attack',s.day)<TUNING.attackGuarantee){attack={kind:'guarantee',promiseId:open.id,version:open.version};topic=open.topic;}
 else{topic=groupTopic(s,target,'rival-topic');const stance=lastPlan(s.player,topic),k=stance?planIndex(topic,stance.answer):-1;
  // He criticises your approach where the group he is courting prefers the other one.
  if(noticed&&!last&&k>=0&&k!==sideOf(s.landscape.groups[target].lean[topic])&&rand(s.seed,'rival-stance-attack',s.day)<identity(s).attackStance)attack={kind:'stance',plan:k};}
 const free=id=>previewActor(s,a,b,id,{topic,teamTasks:members(a).map(()=> 'release')}).allowed;let id;
 if(attack)id=free('tv')&&rand(s.seed,'rival-attack-tv',s.day)<.5?'tv':'canvass';
 else{const weights=a.profile==='research'?{prepare:3,canvass:2,tv:3,fundraise:1,recruit:1}:{prepare:1,canvass:4,tv:2,fundraise:2,recruit:1},candidates=ACTIONS.filter(x=>weights[x.id]).map(x=>({id:x.id,w:weights[x.id]})).filter(x=>(x.id!=='recruit'||members(a).length<MAX_HELPERS)&&free(x.id));if(b.available<180000){const f=candidates.find(x=>x.id==='fundraise');if(f)f.w+=4;}if(target===2){const t=candidates.find(x=>x.id==='tv');if(t)t.w+=3;}let draw=rand(s.seed,'rival-action',s.day)*candidates.reduce((n,x)=>n+x.w,0);id=candidates.at(-1).id;for(const x of candidates){draw-=x.w;if(draw<0){id=x.id;break;}}}
 const venue=id==='canvass'?rivalVenue(s,target):null,accurate=rand(s.seed,'rumor',s.day)<TUNING.rumorAccuracy,decoys=topicsOf(s).filter(t=>t!==topic),rumorTopic=accurate?topic:decoys[Math.floor(rand(s.seed,'rumor-topic',s.day)*decoys.length)],rumorVenue=id!=='canvass'?null:accurate?venue:rivalVenue(s,(target+1)%3);
 return{round:s.day,action:id,topic,venue,target,attack,rumor:{action:id,topic:rumorTopic,venue:rumorVenue,attack:accurate&&!!attack,accurate}};
}
// An attack costs you a little at once among the people who hear it, more among those it convinces; answering in time wins some back.
function attackHit(s,c){const byGroup=GROUPS.map(()=>0);let dv=0;for(const i of c.audience||[]){const v=s.voters[i],f=c.kind==='guarantee'?({likes:.5,mixed:1,dislikes:1.5})[s.landscape.groups[v.g].promise]:prefers(v,c.topic)===c.plan?.3:1.5,before=v.support[0];apply(v,0,-TUNING.attackNow*f);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}return{votes:dv,byGroup};}
function rivalTurn(s,playerReport){
 const a=s.rival,b=a.budget,plan=s.rivalPlan?.round===s.day?s.rivalPlan:planRival(s),topic=plan.topic,id=plan.action,why=plan.attack?'他回合一開始就打算針對你的公開說法。':id==='debate'?'政見發表會，每位候選人都上台。':`他看你在${GROUPS[plan.target??0].title}追得最近，挑那群人在意的議題。`;
 let research=false;const tasks=members(a).map(()=>{if(topic&&!a.known.includes(topic)&&!research){research=true;return'research';}return'canvass';});let p=previewActor(s,a,b,id,{topic,venue:plan.venue,teamTasks:tasks});if(!p.allowed)p=previewActor(s,a,b,id,{topic,venue:plan.venue,teamTasks:members(a).map(()=> 'release')});
 // Pre-empting: you already answered the same topic this round with a researched plan, so his pitch lands at half strength.
 const preempted=['canvass','tv'].includes(p.id)&&PUBLIC.includes(playerReport.action)&&playerReport.topic===topic&&playerReport.prepared&&planIndex(topic,playerReport.answer)>=0;p.scale=p.id==='debate'?(playerReport.action==='debate'?1:TUNING.emptyChair):preempted?TUNING.preempt:1;
 spend(s,a,b,p);if(a.team){a.team.members=a.team.members.filter(m=>!p.teamAssignments.some(x=>x.id===m.id&&x.task==='release'));a.team.size=a.team.members.length;}if(p.teamTask==='research'&&topic)learn(a,topic);
 // He keeps his party's line where it has one, otherwise reads the group he is courting.
 const line=topic?partyLine(s,1,topic):null,lean=['tv','debate'].includes(p.id)||plan.target==null?overallLean(s,topic):s.landscape.groups[plan.target].lean[topic],majority=sideOf(lean),pick=plan.attack?.kind==='stance'?1-plan.attack.plan:line?planIndex(topic,line):rand(s.seed,'rival-plan',s.day)<TUNING.rivalReads?majority:1-majority;
 const report=resolveAction(s,a,b,p,topic&&a.known.includes(topic)&&TOPICS[topic]?.plans?.length?TOPICS[topic].plans[pick].id:'honest');
 let challenge=null;
 if(plan.attack&&['canvass','tv'].includes(p.id)&&!preempted){
  if(plan.attack.kind==='guarantee'){const promise=s.player.promises.find(x=>x.id===plan.attack.promiseId&&x.status==='unresolved'&&x.version===plan.attack.version);if(promise){challenge={id:`challenge-${s.day}`,kind:'guarantee',promiseId:promise.id,version:promise.version,quote:promise.text,topic,issuedDay:s.day,deadline:s.day+1,status:'open',evidence:'這做不到，'+s.player.name+'在騙票。',audience:report.audience};promise.reason='小馬說你的保證做不到。';}}
  else{const stance=lastPlan(s.player,topic);if(stance&&planIndex(topic,stance.answer)===plan.attack.plan)challenge={id:`challenge-${s.day}`,kind:'stance',plan:plan.attack.plan,quote:stance.quote,topic,issuedDay:s.day,deadline:s.day+1,status:'open',evidence:`小馬主張「${TOPICS[topic].plans[1-plan.attack.plan].text}」，說你的做法行不通。`,audience:report.audience};}
  if(challenge){challenge.venues=responseVenues(s,topic);const hit=attackHit(s,challenge);challenge.hit=hit.votes;s.challenges.push(challenge);report.title=challenge.kind==='guarantee'?'拆穿你的保證':'批評你的做法';report.quote=challenge.quote;report.attack={votes:hit.votes,byGroup:hit.byGroup};report.result=`小馬引用你的話：「${challenge.quote}」`;report.reason=`聽到的人當下就動搖了；第 ${challenge.deadline} 回合結束前回應，可以挽回一些人。`;}
 }
 report.challenge=challenge?{id:challenge.id,kind:challenge.kind,topic,deadline:challenge.deadline}:null;report.preempted=preempted;report.rumor=copy(plan.rumor);report.target=plan.target;report.emptyChair=p.id==='debate'&&playerReport.action!=='debate';
 report.reason+=(preempted?' 你這回合先講清楚同一題，他的效果減半。':'')+(report.emptyChair?' 你沒出席，他獨占舞台。':'')+' '+why;return report;
}
// An open challenge left past its deadline costs support among the people who heard it, once.
function expireChallenges(s){const out=[];for(const c of s.challenges){if(c.status!=='open'||!Number.isFinite(c.deadline)||c.deadline>s.day)continue;c.status='expired';c.expiredDay=s.day;const byGroup=GROUPS.map(()=>0);let dv=0;for(const i of c.audience||[]){const v=s.voters[i],before=v.support[0];apply(v,0,-TUNING.attackExpired);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}out.push({title:'沒有回應小馬',challengeId:c.id,topic:c.topic,quote:c.quote,text:`你沒在第 ${c.deadline} 回合結束前回應小馬對「${TOPICS[c.topic].title}」的${c.kind==='guarantee'?'拆穿':'批評'}。`,reason:'聽到那次批評的人更不信你，只算一次。',effects:{contacts:(c.audience||[]).length,votes:dv,byGroup}});}return out;}
// Any public answer on a challenged topic settles it; who is won back depends on how you answer.
function answerChallenges(s,report){const out=[];if(!PUBLIC.includes(report.action))return out;for(const c of s.challenges){if(c.topic!==report.topic||c.status!=='open')continue;c.status='answered';c.answeredDay=s.day;c.answer=report.answer;
 const k=planIndex(c.topic,report.answer),byGroup=GROUPS.map(()=>0);let dv=0;
 for(const i of c.audience||[]){const v=s.voters[i],att=s.landscape.groups[v.g].promise;let f=0;if(k>=0)f=prefers(v,c.topic)===k?2:0;else if(report.answer==='honest')f=c.kind==='guarantee'?({likes:-.5,mixed:.5,dislikes:1.5})[att]:.5;else if(report.answer==='guarantee')f=({likes:.5,mixed:0,dislikes:-1})[att];if(!f)continue;const before=v.support[0];apply(v,0,TUNING.rebuttal*f);if(f>0)apply(v,1,-TUNING.rebuttal*f*.5);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}
 out.push({title:'回應小馬',challengeId:c.id,rebuttal:true,topic:c.topic,quote:c.quote,text:`你回到「${TOPICS[c.topic].title}」回應小馬。`,reason:k>=0?'認同你這次做法的人回來了一些。':report.answer==='honest'?'更正讓討厭空話的人回來，相信保證的人有點失望。':'維持保證讓相信的人安心，討厭空話的人更反感。',effects:{contacts:(c.audience||[]).length,votes:dv,byGroup}});}return out;}
// Billboards keep reminding passers-by every round after they go up; one backed by a stance the main crowd there agrees with on its top
// concern works harder, one backed by the opposite stance works less.
function boardFit(s,venue){const G=s.landscape.groups[s.landscape.main[venue]],top=Object.entries(G.weights).sort((x,y)=>y[1]-x[1])[0][0],st=lastPlan(s.player,top);if(!st)return 1;return planIndex(top,st.answer)===sideOf(G.lean[top])?TUNING.billboardFit.match:TUNING.billboardFit.miss;}
function billboardTick(s){const before=expectedVotes(s,0);(s.player.billboards||[]).forEach((b,i)=>{if(b.round+SCHEDULE.pace.billboardLag<=s.day)contact(s,s.player,'billboard','billboard',null,'board-'+i,boardFit(s,b.venue),b.venue);});return expectedVotes(s,0)-before;}
// Where everyone stands against last election's final seats: the 25 others at their 2022 totals, you and 小馬 at today's estimates.
function ladderView(s){const rows=[{id:0,name:s.player.name,votes:Math.round(expectedVotes(s,0))},{id:1,name:s.rival.name,votes:Math.round(expectedVotes(s,1))},...ELECTION.background.map((votes,i)=>({id:i+2,name:'候選人 '+String(i+1).padStart(2,'0'),votes}))].sort((a,b)=>b.votes-a.votes||a.id-b.id);rows.forEach((r,i)=>{r.rank=i+1;r.elected=i<ELECTION.seats;});return rows;}
// What a billboard put up this round is expected to add each later round; the .9 allows for passers-by already put off.
function billboardEstimate(s,venue){const fit=venue?boardFit(s,venue):1,perRound=Math.round(TUNING.reach.billboard*TUNING.depth.billboard*TUNING.billboard*PER_VOTER*.9*fit/10)*10,rounds=Math.max(0,DAYS-s.day+1-SCHEDULE.pace.billboardLag);return{perRound,rounds,total:perRound*rounds,fit};}
function landscapeView(s){const poll=s.polls.at(-1),g=s.landscape?.surge,announced=!!g&&s.started&&s.day===g.round-1,active=!!g&&surgeActive(s,g.topic);return{ranking:poll?.issues?Object.entries(poll.issues).sort((a,b)=>b[1]-a[1]).map(([topic,share])=>({topic,title:TOPICS[topic].title,share})):[],pollDay:poll?.day??null,insight:copy(s.player.insight||{}),surge:announced?{topic:g.topic,title:TOPICS[g.topic].title,status:'announced',from:g.round}:active?{topic:g.topic,title:TOPICS[g.topic].title,status:'active',until:g.round+g.length-1}:null,debate:s.debate&&s.started&&s.day>=DEBATE_ROUND-2&&s.day<=DEBATE_ROUND?{round:s.debate.round,topic:s.debate.topic,title:TOPICS[s.debate.topic].title}:null};}
// What the player can see about each group: size, attitude to promises, top concern in the latest poll, and the estimated votes.
function groupView(s){const poll=s.polls.at(-1),you=groupVotes(s,0),rival=groupVotes(s,1),rule=identity(s).rule;return s.landscape.groups.map((G,k)=>{const issues=poll?.issuesByGroup?.[k]||{},top=Object.entries(issues).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;return{id:G.id,title:GROUPS[k].title,share:G.share,promise:G.promise,promiseTitle:ATTITUDES[G.promise].title,promiseText:ATTITUDES[G.promise].text,top,topTitle:top?TOPICS[top].title:null,you:Math.round(you[k]),rival:Math.round(rival[k]),lift:rule&&k===s.landscape.identityGroup?TUNING.lift[rule]:1,rule:rule&&k===s.landscape.identityGroup?rule:null};});}
// Your party, its line on three issues and where its voters stand; the rival's party is shown too.
function partyView(s){const mine=partyOf(s,0),his=partyOf(s,1),line=p=>p?Object.entries(PARTY_LINES[p]||{}).map(([topic,plan])=>({topic,title:TOPICS[topic].title,short:TOPICS[topic].short,plan,text:TOPICS[topic].plans.find(x=>x.id===plan).text})):[];const aid=mine?{subsidyDay:PARTY_AID.subsidyDay,subsidy:PARTY_AID.subsidy,mobilizeDay:PARTY_AID.mobilizeDay,mobilize:PARTY_AID.mobilize[mine]||0,breaks:partyBreaks(s),loyalty:partyLoyalty(s),received:copy(s.partyAid||[])}:null;return{aid,party:mine||'independent',title:PARTIES[mine||'independent'].title,color:PARTIES[mine||'independent'].color,share:mine?PARTY_SHARES[mine]:PARTY_SHARES.none,line:line(mine),rival:{party:his,title:PARTIES[his].title,color:PARTIES[his].color,line:line(his)},votes:partyVotes(s,0)};}
// Each place this round: its main crowd and the issue people there will raise; odds are for the place's own issues, and news gives the
// chance that a passer-by asks a current event instead.
function venueView(s){return Object.values(VENUES).map(v=>{const main=s.landscape.main?.[v.id]??0,open=s.started?openChallengeAt(s,v.id):null,pool=s.started?venuePool(s,v.id):[],topic=open?open.topic:null;return{id:v.id,title:v.title,main,mainTitle:GROUPS[main].title,mix:crowdMix(s,v.id),topic,pool:pool.map(x=>x.topic),odds:pool.map(x=>Math.round(x.odds*100)),news:s.started&&!open&&s.landscape.news?.length?{chance:Math.round(NEWS_ASK*100),topics:[...s.landscape.news],headline:headline(s)}:null,challenged:!!open,topicTitle:topic?TOPICS[topic].title:null,speaker:speakerFor(s,v.id).name,billboards:(s.player.billboards||[]).filter(b=>b.venue===v.id).length};});}
function rumorView(s){const r=s.rivalPlan;if(!r||r.round!==s.day||!s.started||s.phase==='result')return null;const t=TOPICS[r.rumor.topic]?.short||'',doing={tv:`上節目談${t}`,canvass:`到${VENUES[r.rumor.venue]?.title||'街頭'}談${t}`,prepare:`閉門研究${t}`,fundraise:'辦募款',recruit:'找新助手',debate:`在政見會談${t}`}[r.rumor.action];return{text:`聽說小馬這回合要${doing}${r.rumor.attack?'，還要攻擊你':''}。`,topic:['tv','canvass','prepare','debate'].includes(r.rumor.action)?r.rumor.topic:null,venue:r.rumor.venue||null,action:r.rumor.action,attack:r.rumor.attack,reliability:r.rumor.action==='debate'?'確定':'八成準'};}
// Clarifying a challenge in print costs money, not the candidate's round: no expiry penalty, and part of the hit is won back.
function clarify(s,id){const c=s.challenges.find(x=>x.id===id&&x.status==='open');if(!c||!s.started||s.phase!=='plan'||s.budget.available<COSTS.clarify)return false;s.budget.available-=COSTS.clarify;s.budget.spent+=COSTS.clarify;s.ledger.push({day:s.day,action:'clarify',cost:COSTS.clarify,baseCost:COSTS.clarify,teamCost:0,eventCost:0,addonCost:0,income:0,topic:c.topic});
 // It wins back at most that share of what the attack actually cost, so a leaflet never undoes more than the attack did.
 const byGroup=GROUPS.map(()=>0),fOf=v=>c.kind==='guarantee'?({likes:.5,mixed:1,dislikes:1.5})[s.landscape.groups[v.g].promise]:prefers(v,c.topic)===c.plan?.3:1.5,want=(c.audience||[]).reduce((n,i)=>n+TUNING.attackNow*fOf(s.voters[i])*TUNING.clarify,0)*PER_VOTER,k=Number.isFinite(c.hit)&&c.hit<0?Math.min(1,-c.hit*TUNING.clarify/Math.max(1e-9,want)):1;let dv=0;for(const i of c.audience||[]){const v=s.voters[i],f=fOf(v),before=v.support[0];apply(v,0,TUNING.attackNow*f*TUNING.clarify*k);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}
 c.status='mitigated';c.mitigatedDay=s.day;c.mitigation={votes:dv,byGroup};return true;}
// From round 5 a scandal may break each round, at most two a game. Heirs and incumbents carry more baggage; taking the developer's
// money makes a scandal likelier. You pay to bury it, apologise, or fight back on a coin toss.
const SCANDALS={
 family:{who:['heir'],text:'媒體翻出你父親當年護航家族土地重劃，質疑你靠爸。'},
 car:{who:['heir'],text:'你被拍到開名車違停紅線，還對員警說「你知道我是誰嗎」。'},
 fees:{who:['incumbent'],text:'檢調約談你的服務處，質疑助理費用人頭申報。'},
 kickback:{who:['incumbent'],text:'有人拿出錄音，指控你過去四年的小型工程拿回扣。'},
 driver:{who:['incumbent','heir'],text:'你的服務處主任酒駕被攔，還搬出你的名號關說。'},
 lounge:{who:['deal'],text:'狗仔拍到你深夜出入建商招待所，質疑拿人手短。'},
 romance:{who:['newcomer','heir','incumbent'],text:'週刊爆料你深夜在貓空茶坊和神秘人約會。'},
 past:{who:['newcomer'],text:'網路匿名爆料你學生時代在社團罵人的舊貼文。'},
 volunteer:{who:['newcomer','incumbent'],text:'你的團隊志工在網路上失言，被截圖瘋傳。'}
};
const SCANDAL_RATE={newcomer:.12,heir:.3,incumbent:.3},SCANDAL_FROM=SCHEDULE.scandal.from,SCANDAL_TO=SCHEDULE.scandal.to,MAX_SCANDALS=2;
function makeCrisis(s){const bg=s.settings.background,deal=s.brokers?.developer==='yours',pool=Object.entries(SCANDALS).filter(([,x])=>x.who.includes(bg)||deal&&x.who.includes('deal')).filter(([k])=>!(s.crises||[]).some(c=>c.kind===k)),weight=([k])=>k==='lounge'?4:1;let r=rand(s.seed,'scandal-kind',s.day)*pool.reduce((n,x)=>n+weight(x),0),kind=pool.at(-1)?.[0]||'volunteer';for(const x of pool){r-=weight(x);if(r<0){kind=x[0];break;}}const you=groupVotes(s,0),group=[0,1,2].sort((x,y)=>you[y]-you[x]||x-y)[0];const grudge=s.player.grudge||0,by=rand(s.seed,'scandal-by',s.day)<(grudge?EXPOSE.blame.grudge:EXPOSE.blame.base)?'rival':'other';return{round:s.day,kind,text:SCANDALS[kind].text,group,status:'pending',by,byName:by==='rival'?s.rival.name:'其他候選人',grudge};}
function scandalChance(s){return(SCANDAL_RATE[s.settings.background]||.15)*(originOf(s)?.scandal||1)+(s.brokers?.developer==='yours'?.3:0)+EXPOSE.retaliate*Math.min(2,s.player?.grudge||0);}
function maybeScandal(s){if(s.day<SCANDAL_FROM||s.day>SCANDAL_TO||(s.crises||[]).length>=MAX_SCANDALS||s.crisis?.status==='pending')return null;if(rand(s.seed,'scandal',s.day)>=scandalChance(s))return null;s.crisis=makeCrisis(s);(s.crises||=[]).push({kind:s.crisis.kind,round:s.day,by:s.crisis.by,byName:s.crisis.byName});return s.crisis;}
function respondCrisis(s,choice){const c=s.crisis;if(!c||c.status!=='pending'||!s.started||s.phase!=='plan'||!['pay','apologize','fight'].includes(choice))return false;if(choice==='pay'&&s.budget.available<COSTS.crisis)return false;
 const byGroup=GROUPS.map(()=>0);let you=0,rival=0;const hit=(i,d)=>{const v=s.voters[i],before=v.support[0];apply(v,0,d);const x=(v.support[0]-before)*PER_VOTER;you+=x;byGroup[v.g]+=x;},sample=s.voters.map((_,i)=>i).filter(i=>s.voters[i].g===c.group&&rand(s.seed,'crisis-sample',i)<TUNING.crisis.sample);
 if(choice==='pay'){s.budget.available-=COSTS.crisis;s.budget.spent+=COSTS.crisis;s.ledger.push({day:s.day,action:'crisis',cost:COSTS.crisis,baseCost:COSTS.crisis,teamCost:0,eventCost:0,addonCost:0,income:0});for(const i of sample)hit(i,-TUNING.crisis.apology*TUNING.crisis.pay);}
 else if(choice==='apologize')for(const i of sample)hit(i,-TUNING.crisis.apology);
 else{c.won=rand(s.seed,'crisis-fight')<.5;const party=partyOf(s,0);if(c.won){for(let i=0;i<POPULATION;i++){const v=s.voters[i];if(rand(s.seed,'crisis-rally',i)>=TUNING.crisis.sample||!(party?v.p===party:s.landscape.groups[v.g].promise==='likes'))continue;hit(i,TUNING.crisis.fight);if(c.by==='other')continue;const b1=v.support[1];apply(v,1,-TUNING.crisis.fight*.75);rival+=(v.support[1]-b1)*PER_VOTER;}}else for(const i of sample)hit(i,-TUNING.crisis.apology*2);}
 c.status='resolved';c.choice=choice;c.resolvedDay=s.day;c.effect={votes:you,rival,byGroup};return true;}
// Once the money trail turns out false or unclear, you can pledge a clean campaign: those who hate empty talk warm to you.
function cleanPledge(s){const t=s.events.tip;if(!s.started||s.phase!=='plan'||t.pledged||!(t.evidenceLevel>=2||t.verification)||t.truth==='issue')return false;const byGroup=GROUPS.map(()=>0);let dv=0;for(let i=0;i<POPULATION;i++){const v=s.voters[i],att=s.landscape.groups[v.g].promise;if(att==='likes'||rand(s.seed,'clean-pledge',i)>=.25)continue;const before=v.support[0];apply(v,0,att==='dislikes'?TUNING.clean:TUNING.clean/3);const d=(v.support[0]-before)*PER_VOTER;dv+=d;byGroup[v.g]+=d;}t.pledged={day:s.day,votes:dv,byGroup};return true;}
function pendingChallenges(s){return s.challenges.filter(c=>c.status==='open').map(c=>({id:c.id,kind:c.kind||'guarantee',topic:c.topic,title:TOPICS[c.topic]?.title,quote:c.quote,deadline:c.deadline??s.day+1,roundsLeft:Math.max(0,(c.deadline??s.day+1)-s.day),hit:c.hit||0,venues:[...(c.venues||[])],clarifyCost:COSTS.clarify}));}
// The fact check arrives after the scheduled delay following a press conference and moves both candidates by what it shows.
function eventAftermath(s){const t=s.events.tip;if(!t.verifyAt||t.verification||s.day<t.verifyAt)return[];const before=expectedVotes(s,0),pub=t.verifyTarget||t.publication;const text={issue:'核對結果：小馬團隊確實重複請款。',false:'核對結果：是不同年度的活動，指控不成立。',unclear:'核對結果：關鍵單據不見了，說不清楚。'}[t.truth];let contacts=0,positive=0,reserved=0,rival=0;
 if(pub)for(let i=0;i<POPULATION;i++){if(rand(s.seed,'tip-followup',i)>=.065)continue;const v=s.voters[i],d=pub.mode==='tip_accuse'?(t.truth==='false'?-.045:t.truth==='unclear'?-.02:.015):t.truth==='issue'?(v.accuracy>.45?.012:.004):0,r=t.truth==='issue'?-.03:pub.mode==='tip_accuse'&&t.truth==='false'?.01:0;apply(v,0,d);const b1=v.support[1];apply(v,1,r);rival+=(v.support[1]-b1)*PER_VOTER;contacts++;if(d>0)positive++;else reserved++;}
 t.verification={round:s.day,text,publicationId:pub?.id,quote:pub?.quote||''};t.responseDue=pub?.mode==='tip_accuse'&&t.truth!=='issue'&&tipCorrectable(t);return[{title:'爆料的核對結果',text,quote:pub?.quote,reason:pub?.mode==='tip_accuse'?(t.truth==='issue'?'你的指控被證實。':t.responseDue?'你的指控沒被證實，有人覺得你亂爆料；可以再開記者會更正。':'你的指控沒被證實；你已經公開更正，核對結果仍留在紀錄。'):'核對結果出來了。',effects:{contacts,positive,reserved,votes:expectedVotes(s,0)-before,rival}}];}
// Groups you did not reach this round cool off: a small share of their support for you fades until you go back to them.
// A group you skip cools off; if 小馬 worked that group this round he picks up part of what you lost (poaching).
const mixOf=(s,id,venue)=>['canvass','rally'].includes(id)&&VENUES[venue]?crowdMix(s,venue):['tv','debate'].includes(id)?mediaMix(s,'tv'):id==='online'?mediaMix(s,'online'):null;
function coolOff(s,p,network=null){if(s.day<2)return null;if(p.id==='dig'&&s.player.actions.some(x=>x.day===s.day&&x.dig==='found'))return null;const mix=mixOf(s,p.id,p.venue),ra=[...(s.rival.actions||[])].reverse().find(x=>x.day===s.day),rmix=ra?mixOf(s,ra.action,ra.venue):null,byGroup=GROUPS.map(()=>0),missed=[],poached=[];let taken=0;
 for(let g=0;g<GROUPS.length;g++){if(mix&&mix[g]>=TUNING.cool.touch||network?.reach>0&&network.protectedGroup===g)continue;missed.push(GROUPS[g].title);const poach=rmix&&rmix[g]>=TUNING.cool.touch?TUNING.cool.poach:0;if(poach)poached.push(GROUPS[g].title);for(const v of s.voters){if(v.g!==g)continue;const d=v.support[0]*TUNING.cool.rate;v.support[0]-=d;byGroup[g]-=d*PER_VOTER;if(poach){v.support[1]=clamp(v.support[1]+d*poach,.001,.16);taken+=d*poach*PER_VOTER;}}}
 const votes=byGroup.reduce((n,x)=>n+x,0);if(!missed.length||votes>-1)return null;return{title:poached.length?'小馬趁虛而入':'沒去顧的群冷掉了',cooled:true,poached:poached.length?Math.round(taken):0,text:`你這回合沒接觸到${missed.join('、')}，有些挺你的人熱度退了。`+(poached.length?`小馬這回合正好在拉${poached.join('、')}，挖走約 ${Math.round(taken).toLocaleString('zh-TW')} 票。`:''),reason:'每回合沒接觸到的那群，挺你的人會少一點；小馬同一回合去拉那群，會把一部分挖走。',effects:{contacts:0,votes,byGroup}};}
function complete(s,answerId){
 const pollBefore=copy(s.polls.at(-1)),raceBefore=copy(s.roundStartRace||s.journal.at(-1)?.race||raceView(s)),start=[expectedVotes(s,0),expectedVotes(s,1)],startGroups=groupVotes(s,0),report=resolveAction(s,s.player,s.budget,s.pending,answerId),landed=landResearch(s,report),afterPlayer=[expectedVotes(s,0),expectedVotes(s,1)];report.rivalLoss=afterPlayer[1]-start[1];
 const rebuttals=answerChallenges(s,report),afterRebuttal=expectedVotes(s,0),boards=billboardTick(s),afterBoards=expectedVotes(s,0),lapsed=lapseOffers(s),rival=rivalTurn(s,report),afterRival=[expectedVotes(s,0),expectedVotes(s,1)],cooled=coolOff(s,s.pending,report.network),events=[...rebuttals,...eventAftermath(s),...expireChallenges(s),...(cooled?[cooled]:[])],afterEvents=expectedVotes(s,0),poll=samplePoll(s,s.day);s.polls.push(poll);
 // Offers settled earlier this round (accepted, or declined and taken by the rival) are counted here too.
 // Moves settled in the plan phase before this round's action: clarifications, the crisis and the clean-campaign pledge.
 const cleared=(s.challenges||[]).filter(c=>c.mitigatedDay===s.day),crisis=s.crisis?.resolvedDay===s.day?s.crisis:null,pledge=s.events.tip.pledged?.day===s.day?s.events.tip.pledged:null,planEffects=[...cleared.map(c=>({kind:'clarify',title:'發澄清文宣',text:`回應小馬對「${TOPICS[c.topic].title}」的${c.kind==='guarantee'?'拆穿':'批評'}`,votes:c.mitigation.votes,byGroup:c.mitigation.byGroup})),...(crisis?[{kind:'crisis',title:'突發危機',text:crisis.text,choice:crisis.choice,won:crisis.won,votes:crisis.effect.votes,rival:crisis.effect.rival,byGroup:crisis.effect.byGroup}]:[]),...(pledge?[{kind:'clean',title:'宣示乾淨選戰',text:'不打烏賊戰',votes:pledge.votes,byGroup:pledge.byGroup}]:[])],planYou=planEffects.reduce((n,e)=>n+e.votes,0);
 const settled=(s.offers||[]).filter(o=>o.respondedDay===s.day||o.rivalEffect?.round===s.day),offerYou=settled.reduce((n,o)=>n+(o.effect?.round===s.day?o.effect.votes:0),0),offerRival=settled.reduce((n,o)=>n+(o.rivalEffect?.round===s.day&&!lapsed.includes(o)?o.rivalEffect.votes:0),0);
 rival.offers=settled.filter(o=>o.rivalEffect?.round===s.day).map(o=>({id:o.id,org:dealOf(s,o.id).org,bloc:o.bloc,votes:o.rivalEffect.votes}));
 // Expected-vote change per source; the sources add up to the round's total change.
 const where=report.action==='tv'?'上電視':report.action==='online'?'開直播':report.action==='debate'?'在政見發表會':report.action==='press'?'開記者會':'在'+report.venueTitle,label=report.action==='press'&&report.exposed?.title?`第 ${s.day} 回合${where}爆「${report.exposed.title}」`:ASKING.includes(report.action)&&report.topic?`第 ${s.day} 回合${where}談「${TOPICS[report.topic].title}」${report.exposed?.title?`，爆「${report.exposed.title}」`:''}`:`第 ${s.day} 回合${report.action==='rally'?'在'+report.venueTitle+'辦造勢':report.title}`;
 const attribution=[{round:s.day,source:'player',votes:report.votes,label},{round:s.day,source:'team',votes:report.teamVotes,label:`第 ${s.day} 回合團隊拉票`},{round:s.day,source:'rebuttal',votes:afterRebuttal-afterPlayer[0],label:`第 ${s.day} 回合回應小馬`},{round:s.day,source:'billboard',votes:afterBoards-afterRebuttal,label:`第 ${s.day} 回合看板`},{round:s.day,source:'offer',votes:offerYou,label:`第 ${s.day} 回合${settled.filter(o=>o.effect?.round===s.day).map(o=>'接受'+dealOf(s,o.id).org+'合作').join('、')||'合作邀約'}`},{round:s.day,source:'rival',votes:afterRival[1]-afterPlayer[1]+offerRival,effectOnYou:afterRival[0]-afterBoards,label:`第 ${s.day} 回合小馬${rival.title}`},{round:s.day,source:'events',votes:afterEvents-afterRival[0],label:`第 ${s.day} 回合${events.filter(e=>!e.rebuttal).map(e=>e.title).join('、')||'事件'}`},{round:s.day,source:'plan',votes:planYou,label:`第 ${s.day} 回合${planEffects.map(e=>e.title).join('、')||'出發前的處理'}`}];
 s.attribution.push(...attribution.filter(x=>x.source==='player'||Math.abs(x.votes)>=5||Math.abs(x.effectOnYou||0)>=5));
 const race=raceView(s);s.recap={day:s.day,player:report,rival,events,offers:settled.map(o=>({id:o.id,org:dealOf(s,o.id).org,status:o.status,taker:o.taker||0,bloc:o.bloc,money:o.money,effect:o.effect?.round===s.day?copy(o.effect):null,rivalEffect:o.rivalEffect?.round===s.day?copy(o.rivalEffect):null})),billboards:boards,poll,pollBefore,weather:weather(s),attribution,planEffects,act:actOf(s.day).id,totalVotes:afterEvents-start[0]+offerYou+planYou,totalByGroup:groupVotes(s,0).map((v,k)=>v-startGroups[k]),outlook:outlook(s),race,raceBefore,callbacks:report.corrected?['原話與更正都保留。']:[]};s.recap.summary=roundSummary(s.recap);s.journal.push(copy(s.recap));s.phase='recap';return s.recap;
}
function arrive(s){if(s.version!==VERSION||s.phase!=='travel')return false;upgrade(s);if(ASKING.includes(s.pending.id)){s.phase='question';return question(s);}return complete(s,s.pending.reuseAnswer||undefined);}
function answer(s,id){if(s.version!==VERSION)return false;const q=question(s);if(!q||!q.options.some(x=>x.id===id&&x.unlocked))return false;return complete(s,id);}
// Sources are measured changes, never guessed from a visual reaction or an outcome label.
function roundSummary(r){const p=r.player,sources=[],add=(id,label,votes,byGroup)=>{if(Number.isFinite(votes)&&Math.abs(votes)>1e-7)sources.push({id,label,votes,...(byGroup?{byGroup}: {})});};add('answer','你的回答',p.direct?.votes,p.direct?.byGroup);add('chief','里長背書',p.chief?.bloc);add('deal','合作承諾',p.dealt?.votes);for(const [id,label,part]of[['flip','改口代價',p.flip],['breach','違反合作',p.breach],['counter','點名小馬',p.counter?{votes:p.counter.you}:null],['party','政黨立場',p.partyLine],['walkback','撤回保證',p.walkBack],['stumble','沒準備被追問',p.stumble],['exposed','公開爆料',p.exposed],['gotv','催票',p.gotv]])add(id,label,part?.votes,part?.byGroup);const accounted=sources.reduce((n,x)=>n+x.votes,0);add('other-action','其他現場反應',p.votes-accounted);add('network','地方小隊',p.network?.votes,p.network?.groups?.map(g=>g.votes));add('helpers','助手拉票',p.teamVotes-(p.network?.votes||0));for(const a of r.attribution||[]){if(['player','team'].includes(a.source))continue;if(a.source==='events'&&(r.events||[]).length){for(const e of r.events.filter(e=>!e.rebuttal))add('event',e.title,e.effects?.votes,e.effects?.byGroup);}else if(a.source==='plan'&&(r.planEffects||[]).length){for(const e of r.planEffects)add(e.kind,e.title,e.votes,e.byGroup);}else add(a.source,{rebuttal:'回應小馬',billboard:'看板',offer:'合作邀約',rival:'小馬的攻勢',events:'本回合事件',plan:'出發前處理'}[a.source]||a.label,a.source==='rival'?a.effectOnYou:a.votes);}const delta=r.totalVotes-sources.reduce((n,x)=>n+x.votes,0);add('other-round','其他選情變化',delta);const biggest=[...sources].sort((a,b)=>Math.abs(b.votes)-Math.abs(a.votes))[0],position=x=>x?{rank:x.rank,gap:Math.round((x.line??LINE)-(x.you??x.estimate)),votes:x.you??x.estimate}:null;return{headline:biggest?biggest.label+' '+(biggest.votes>=0?'+':'')+Math.round(biggest.votes).toLocaleString('zh-TW')+' 票':'這回合沒有明顯票數變化',sources,before:position(r.raceBefore),after:position(r.race),opportunity:p.campaignOpportunity||null};}
function resultGrade(result){const rank=Number(result?.rank)||ELECTION.candidates,grade=RESULT_GRADES.find(g=>rank<=g.rank)||{id:'lost',title:'落選',rank:ELECTION.candidates},next=grade.id==='high'?null:grade.id==='steady'?RESULT_GRADES[0]:grade.id==='narrow'?RESULT_GRADES[1]:RESULT_GRADES[2],at=next?(result?.tally||[]).find(x=>x.rank===next.rank):null;return{id:grade.id,title:grade.title,next:next?{rank:next.rank,title:next.title,votesNeeded:at?Math.max(0,at.votes-(result.playerVotes||0)+1):null}:null};}
// Seeded standard normal for election-day swings; fixed per seed and candidate.
function swing(seed,index){const u=Math.max(1e-9,rand(seed,'vote-noise-a',index)),w=rand(seed,'vote-noise-b',index);return clamp(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*w),-2.5,2.5);}
function election(s){
 // Guarantees the rival exposed and you never corrected cost the people who believed them.
 const unkept=s.player.promises.filter(x=>x.status==='unresolved').map(p=>{const challenged=s.challenges.some(c=>c.promiseId===p.id),hit=challenged?TUNING.unkept.exposed:TUNING.unkept.quiet;let dv=0;if(hit)for(const i of p.audience||[]){const v=s.voters[i],f={likes:1,mixed:.5,dislikes:0}[s.landscape.groups[v.g].promise];if(!f)continue;const before=v.support[0];apply(v,0,-hit*f);dv+=(v.support[0]-before)*PER_VOTER;}return{topic:p.topic,text:p.text,challenged,people:(p.audience||[]).length,votes:dv};}).filter(u=>u.challenged);
 for(const u of unkept)s.attribution.push({round:DAYS,source:'unkept',votes:u.votes,label:`被小馬拆穿、沒更正的保證「${u.text}」`});
 const tally=expectedTally(s).map((e,index)=>({id:index,name:index===0?s.player.name:index===1?s.rival.name:'候選人 '+String(index-1).padStart(2,'0'),votes:Math.max(0,Math.round(e*(1+TUNING.voteNoise*swing(s.seed,index)))),tieKey:rand(s.seed,'tie',index)})).sort((a,b)=>b.votes-a.votes||a.tieKey-b.tieKey);tally.forEach((x,i)=>{x.rank=i+1;x.elected=i<ELECTION.seats;});
 const you=tally.find(x=>x.id===0),focal=tally.find(x=>x.id===1),threshold=Math.ceil(ELECTION.registered/ELECTION.seats*.1),refund=you.elected||you.votes>=threshold,b=s.budget;b.deposit=0;if(refund){b.available+=160000;b.refunded=160000;}else b.forfeited=160000;
 const rb=s.rival.budget;rb.deposit=0;if(focal.elected||focal.votes>=threshold){rb.available+=160000;rb.refunded=160000;}else rb.forfeited=160000;
 const valid=tally.reduce((n,x)=>n+x.votes,0),cast=Math.round(valid/(1-ELECTION.invalid)),lastSeat=tally[ELECTION.seats-1].votes,firstLoser=tally[ELECTION.seats].votes,pending=s.player.promises.filter(x=>x.status==='unresolved'),outcome=you.elected?'elected':refund?'refunded':'forfeited';
 const factors=[...s.attribution].map(x=>x.source==='rival'?{...x,votes:x.effectOnYou||0,label:x.label.replace('小馬','小馬對你：')}:x).filter(x=>Math.abs(x.votes)>=1).sort((a,b)=>Math.abs(b.votes)-Math.abs(a.votes)).slice(0,3).map(x=>({...x,votes:Math.round(x.votes)||0}));
 // Each round's change split by source: your own moves, what 小馬 took from you and events; the parts add up to the round's total.
 const rounds=s.journal.map(j=>{const at=src=>j.attribution.find(a=>a.source===src),v=src=>Math.round(at(src)?.votes||0)||0,rv=at('rival');return{day:j.day,action:j.player.action,where:j.player.venueTitle||'',topic:j.player.topic||null,answer:j.player.answer||null,quiet:QUIET.includes(j.player.action)&&!j.player.dealt&&j.player.action!=='dig',dig:j.player.dig||null,votes:Math.round(j.totalVotes)||0,direct:v('player'),team:v('team'),rebuttal:v('rebuttal'),billboard:v('billboard'),offer:v('offer'),plan:v('plan'),byRival:Math.round(rv?.effectOnYou||0)||0,events:v('events'),planTitle:(j.planEffects||[]).map(e=>e.title).join('、'),eventsTitle:(j.events||[]).filter(e=>!e.rebuttal).map(e=>e.title).join('、'),rival:Math.round((rv?.votes||0)+(j.player.rivalLoss||0))||0,attack:j.rival.attack?Math.round(j.rival.attack.votes)||0:0};});
 return{days:Math.round(DAYS*ROUND_DAYS),rounds:DAYS,outcome,tally,playerVotes:you.votes,rank:you.rank,rivalVotes:focal.votes,rivalRank:focal.rank,rivalElected:focal.elected,seats:ELECTION.seats,candidates:tally.length,registered:ELECTION.registered,eligible:ELECTION.registered,cast,valid,turnout:Math.round(cast/ELECTION.registered*1000)/10,lastSeat,firstLoser,gap:you.elected?you.votes-firstLoser:lastSeat-you.votes,refundThreshold:threshold,refunded:b.refunded,forfeited:b.forfeited,cash:b.available,recognition:s.player.recognition,known:[...s.player.known],pending:copy(pending),unkept,keyFactors:factors,race:raceView(s),platform:platformView(s),groupTotals:GROUPS.map((_,k)=>Math.round(s.voters.filter(v=>v.g===k).length*PER_VOTER)),roundsSummary:rounds,reflection:`${DAYS} 回合共安排 ${s.player.actions.filter(x=>!x.record).length} 項行程，查了 ${s.player.known.filter(t=>t!=='tip').length} 個議題。${pending.length?`還有 ${pending.length} 句保證沒交代。`:''}`};
}
function next(s){if(s.version!==VERSION||s.phase!=='recap')return false;if(s.day<DAYS){s.day++;s.phase='plan';s.pending=null;s.recap=null;s.roundStartRace=copy(raceView(s));lockCampaignOffer(s);refreshDeals(s);partyAid(s);if(pollDays(s).includes(s.day))takePoll(s);maybeScandal(s);s.rivalPlan=planRival(s);}else{s.result=election(s);s.result.grade=resultGrade(s.result);s.phase='result';}return true;}
return{RECRUIT_LEVELS,MAX_HELPERS,NETWORK,RESULT_GRADES,networkView,setNetworkAssignment,followupFit,followupReach,roundSummary,resultGrade,answerReactions,CAMPAIGN_PLANS,CAMPAIGN_ROUND,setCampaignPlan,campaignView,tvFatigue,tipRelease,tipCorrectable,ORIGINS,ORIGIN_COOL,originFor,originView,digOdds,ROUTE,routeOptions,baseGroup,baseView,routeView,routeCues,homeReach,NEWS_TOPICS,NEWS_COUNT,NEWS_ASK,DEBATE_NEWS,NEWS_CARE,NEWS,ISSUES,CONTESTED,PAINS,contestedSides,headline,residentLine,refreshDeals,placeTopicsOf,CANDIDATE_NAMES,candidateName,SCANDALS,gapPlan,POLL_DAYS,pollView,PARTY_AID,partyBreaks,SCANDAL_RATE,scandalChance,donorView,dealOf,BROKERS,BROKER_MONEY,chiefView,chiefPreview,CHIEFS,answerEstimate,CARE_ODDS,careOdds,topicsOf,mediaMix,MEDIA_LEAN,CORE_TOPICS,ACTIVE_COUNT,QUIET,OPPOSE,LEAN_SIDES,STRONG_LEANS,venuePool,ACTS,actOf,GOTV_FROM,tvPool,onlinePool,responseVenues,openChallengeAt,clarify,respondCrisis,cleanPledge,boardFit,VOICES,ladderView,billboardEstimate,partyFundraise,VERSION,REVISION,ROUNDS,PACE_MODE,SCHEDULE,DAYS,ROUND_DAYS,POPULATION,DEBATE_ROUND,TUNING,COSTS,MAX_BILLBOARDS,POLICY_TOPICS,GROUPS,GROUP_CARES,ATTITUDES,ELECTION,PER_VOTER,LINE,RULES,TOPICS,VENUES,ACTIONS,BACKGROUNDS,LEGACY_BACKGROUNDS,PARTIES,PARTY_SHARES,PARTY_LINES,RESIDENTS,SPEAKERS,normalizeSettings,configure,initial,start,preview,previewActor,begin,arrive,question,answer,next,upgrade,itinerary,suggestVenue,stance,platformView,activePromise,eventView,availableTopics,samplePoll,weather,forecast,rand,outlook,raceView,groupView,partyView,venueView,venueTopic,hotTopicNow,offerView,upcomingOffer,respondOffer,expectedVotes,groupVotes,partyVotes,seatLine,expectedTally,landscapeView,rumorView,pendingChallenges,prefers,caresAbout,surgeActive,answerFaces,answerTags,crowdMix,speakerFor,overallLean,lastPlan,counterPlan,partyLine,insightLine,EXPOSE,DIG,DIRT,fileView,releaseEstimate,verifyDirt,releaseDirt,exposeTarget,dirtLeaked,supportEstimate,pollNews};
});
