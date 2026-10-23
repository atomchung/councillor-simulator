'use strict';
// Compares campaign lengths on one code base and one tuning. Run once per setting, e.g.
//   COUNCILLOR_ROUNDS=9 node tests/rounds-compare.cjs --seeds 150 --out nine.json
//   COUNCILLOR_ROUNDS=10 node tests/rounds-compare.cjs --seeds 150 --out ten.json
// --pace verifyDelay=2,billboardLag=1 ablates the safe pacing changes. Chiefs and research retain their original timing.
// --identity newcomer,heir --skip 60 (seeds for the wasted-round test; 0 turns it off). Not part of `npm test`.
// Reports, per identity: win rate of the scripted policies, how many choices a game holds, how many rounds are quiet, how much each round
// moves the player's votes and what it costs to waste it, and whether the slow builds (chiefs, research, money trail, billboards) pay back.
// Engine simulation only: it measures scripted policies written for the ten-round game, not fun or human play time.
const fs=require('node:fs'),B=require('./strategy-balance.cjs'),G=B.G;
const args=process.argv.slice(2),opt=(k,d=null)=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:d;};
const SEEDS=Number(opt('seeds',100)),SKIP_SEEDS=Number(opt('skip',0)),IDENTITIES=opt('identity','newcomer,heir,incumbent').split(','),OUT=opt('out');
for(const kv of (opt('pace','')||'').split(',').filter(Boolean)){const [k,v]=kv.split('=');if(!['verifyDelay','billboardLag'].includes(k)||![0,1,2].includes(Number(v)))throw new Error('unknown pace '+k);G.SCHEDULE.pace[k]=Number(v);}
if(!Number.isInteger(SEEDS)||SEEDS<1||!Number.isInteger(SKIP_SEEDS)||SKIP_SEEDS<0||SKIP_SEEDS>SEEDS||IDENTITIES.some(id=>!G.BACKGROUNDS[id]))throw new Error('invalid comparison inputs');
const QUIET_KINDS=['fundraise','prepare','recruit'],N=G.DAYS,zeros=()=>Array(N).fill(0);

// One campaign with a log of what the player faced each round. forceQuietAt wastes that round on a fundraiser.
function playLogged(policy,seed,settings,forceQuietAt=0){
 policy.reset?.(seed);const s=G.initial(seed,settings);G.start(s);const rows=[];
 while(s.phase!=='result'){
  const row={day:s.day,offer:null,crisis:false,challenges:G.pendingChallenges(s).length,action:null,asked:false,unlocked:0,known:null};
  if(G.offerView(s)){row.offer=policy.offer?.(s)||'decline';G.respondOffer(s,row.offer);}
  row.crisis=s.crisis?.status==='pending';
  policy.prep?.(s);if(s.crisis?.status==='pending'){if(!G.respondCrisis(s,policy.crisis?.(s)||'apologize'))G.respondCrisis(s,'apologize');}
  const d=policy.decide(s);let id=d.action,config=d.config||{};
  if(forceQuietAt===s.day){id='fundraise';config={};}
  if(!G.preview(s,id,config).allowed&&id==='fundraise'&&config.donor)config={...config,donor:null};
  if(!G.preview(s,id,config).allowed){id='canvass';config={venue:config.venue};}
  if(!G.preview(s,id,config).allowed){id='fundraise';config={};}
  if(!G.begin(s,id,config))throw new Error(`${policy.name}: round ${s.day} could not start ${id}`);
  row.action=id;G.arrive(s);
  if(s.phase==='question'){const q=G.question(s),open=q.options.filter(o=>o.unlocked);row.asked=true;row.unlocked=open.length;row.known=s.player.known.includes(s.pending.topic);if(!G.answer(s,d.answer?d.answer(q):open[0].id))throw new Error('answer rejected');}
  rows.push(row);G.next(s);
 }
 return{s,rows};
}

const sum=a=>a.reduce((n,x)=>n+x,0);
function evaluateLogged(policy,seeds,settings,skipSeeds){
 const out={name:policy.name,kind:policy.kind,games:0,wins:0,votes:0,quiet:0,dig:0,asked:0,meaningful:0,offers:0,crises:0,challenges:0,rounds:N,
  perRound:{absVotes:zeros(),votes:zeros(),direct:zeros(),asked:zeros(),meaningful:zeros(),offers:zeros(),crises:zeros(),challenges:zeros(),quiet:zeros(),knownAsked:zeros(),askedWithKnown:zeros(),events:zeros()},
  chiefs:{games:0,anyBroken:0,brokenCount:0,brokeDaySum:0,brokeEarly:0},tip:{pressed:0,verified:0,verifyLead:[],accused:0},boards:{built:0,gamesWith:0,votes:0,builtDaySum:0},mix:{}};
 const baseline={};
 for(const seed of seeds){
  const {s,rows}=playLogged(policy,seed,settings);out.games++;out.wins+=s.result.outcome==='elected';out.votes+=s.result.playerVotes;baseline[seed]={votes:s.result.playerVotes,win:s.result.outcome==='elected'};
  const summary=s.result.roundsSummary;
  rows.forEach((r,i)=>{const p=out.perRound,x=summary[i];out.mix[r.action]=(out.mix[r.action]||0)+1;
   p.absVotes[i]+=Math.abs(x.votes);p.votes[i]+=x.votes;p.direct[i]+=x.direct;
   if(r.asked){out.asked++;p.asked[i]++;p.askedWithKnown[i]++;if(r.known)p.knownAsked[i]++;if(r.unlocked>=2){out.meaningful++;p.meaningful[i]++;}}
   if(r.offer){out.offers++;p.offers[i]++;}if(r.crisis){out.crises++;p.crises[i]++;}if(r.challenges){out.challenges++;p.challenges[i]++;}
   if(QUIET_KINDS.includes(r.action)){out.quiet++;p.quiet[i]++;}if(r.action==='dig')out.dig++;
   p.events[i]+=(r.asked&&r.unlocked>=2?1:0)+(r.offer?1:0)+(r.crisis?1:0)+(r.challenges?1:0);});
  out.chiefs.games++;const broken=Object.values(s.chiefs).filter(c=>c.broken&&c.brokeDay>0);out.chiefs.brokenCount+=broken.length;if(broken.length){out.chiefs.anyBroken++;out.chiefs.brokeDaySum+=Math.min(...broken.map(c=>c.brokeDay));if(Math.min(...broken.map(c=>c.brokeDay))<=Math.ceil(N/2))out.chiefs.brokeEarly++;}
  const tip=s.events.tip;if(tip.publication){out.tip.pressed++;if(tip.publication.mode==='tip_accuse')out.tip.accused++;if(tip.verification){out.tip.verified++;out.tip.verifyLead.push(N-tip.verification.round);}}
  const boards=s.player.billboards||[];out.boards.built+=boards.length;if(boards.length)out.boards.gamesWith++;out.boards.builtDaySum+=sum(boards.map(b=>b.round));out.boards.votes+=sum(s.journal.map(j=>j.attribution.filter(a=>a.source==='billboard').reduce((n,a)=>n+a.votes,0)));
 }
 if(skipSeeds.length){out.skip={baseline:{votes:sum(skipSeeds.map(sd=>baseline[sd].votes))/skipSeeds.length,win:sum(skipSeeds.map(sd=>baseline[sd].win?1:0))/skipSeeds.length},byRound:[]};
  for(let r=1;r<=N;r++){let v=0,w=0;for(const sd of skipSeeds){const {s}=playLogged(policy,sd,settings,r);v+=s.result.playerVotes;w+=s.result.outcome==='elected';}out.skip.byRound.push({round:r,votes:v/skipSeeds.length,win:w/skipSeeds.length});}}
 return out;
}

const range=(a,n)=>Array.from({length:n},(_,i)=>a+i),seeds=range(1,SEEDS),skipSeeds=range(1,SKIP_SEEDS);
const ADAPTIVE=B.ADAPTIVE,FIXED=B.STARTS.map(B.fixedRoute),report={rounds:N,pace:{...G.SCHEDULE.pace},seeds:SEEDS,identities:{}};
for(const id of IDENTITIES){
 const settings={background:id};report.identities[id]={adaptive:ADAPTIVE.map(p=>evaluateLogged(p,seeds,settings,skipSeeds)),fixed:FIXED.map(p=>evaluateLogged(p,seeds,settings,[])),random:evaluateLogged(B.randomPolicy(),seeds,settings,[])};
 console.error('done',id,'rounds',N);
}
const text=JSON.stringify(report);if(OUT)fs.writeFileSync(OUT,text);else console.log(text);
