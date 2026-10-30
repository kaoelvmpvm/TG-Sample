import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,newIce,active,play,complete,pass,availableSets,exchangeSet,validSet,finish,standings,iceFlip,icePenalty,iceMissedSlap,iceRecordTap,iceAutoResolve,validate} from '../game.js';
import {CARDS,CARD_BY_ID} from '../cards.js';
import {resolveMagic,magicTargets} from '../game.js';
test('112 unique artwork cards, 96 main and 16 magic',()=>{assert.equal(CARDS.length,112);assert.equal(new Set(CARDS.map(x=>x.id)).size,112);assert.equal(CARDS.filter(x=>x.type==='magic').length,16)});
test('initial state and full deck conservation',()=>{const s=newGame(['A','B','C','D'],()=>0.7);assert.equal(s.deck.length,84);assert.equal(s.players.every(p=>p.hand.length===3),true);assert.equal(s.magic.length,16);validate(s)});
test('play complete and pass',()=>{const s=newGame(['A','B']);const id=active(s).hand[0];play(s,id);complete(s,true);if(s.phase==='magic'){/* only if fourjoy; test normal with deterministic */}else {assert.equal(s.phase,'pass');pass(s);assert.equal(s.turn,1);}});
test('complete set correctness, tie standings',()=>{const s=newGame(['A','B']);const p=s.players[0];p.table=['task-001','task-009','task-017','task-025','task-033'];s.phase='set';assert.equal(validSet(p,p.table),true);exchangeSet(s,[...p.table]);assert.equal(p.coins,5);assert.equal(p.sets,1);s.players[1].coins=5;assert.deepEqual(standings(s).map(x=>x.rank),[1,1]);});
test('main 200 full games with magic and set operations',()=>{
 for(let k=0;k<200;k++){
  let seed=(k+13)*2399;
  const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const s=newGame(['A','B','C','D'],rng);
  let moves=0;
  while(!s.ended&&moves++<1100){
   if(s.phase==='choose')play(s,active(s).hand[0]);
   else if(s.phase==='confirm')complete(s,true);
   else if(s.phase==='pass')pass(s);
   else if(s.phase==='set')exchangeSet(s,availableSets(active(s))[0]);
   else if(s.phase==='magic'){
    const effect=CARD_BY_ID[s.pending].effect, opts=magicTargets(s,effect), sel={};
    if(effect==='護身符'){if(!opts.length)sel.skip=true;else sel.category=opts[0]}
    if(effect==='水晶球'||effect==='隱身斗篷'){
     if(!opts.length)sel.skip=true;else {sel.target=opts[0];
      if(effect==='隱身斗篷'){const q=s.players[sel.target];sel.category=q.table.find(id=>!q.protected.includes(CARD_BY_ID[id].category)&&CARD_BY_ID[id].type!=='fourjoy')&&CARD_BY_ID[q.table.find(id=>!q.protected.includes(CARD_BY_ID[id].category)&&CARD_BY_ID[id].type!=='fourjoy')].category;}}
    }
    if(effect==='飛天掃帚'){sel.first=0;sel.second=1;}
    resolveMagic(s,sel,rng);
   } else throw Error('unrecognized phase '+s.phase);
  }
  assert.equal(s.ended,true,`game ${k} stalled in ${s.phase} after ${moves} actions`);
  assert.doesNotThrow(()=>validate(s));
 }
});
test('ice flip and penalty preserve all 80',()=>{const s=newIce(['A','B','C','D']);const n=s.players.reduce((a,p)=>a+p.hand.length,0);assert.equal(n,80);const flipped=iceFlip(s);assert.ok(flipped.card);icePenalty(s,2,'搶拍犯規');assert.equal(s.center.length,0);assert.equal(s.players.reduce((a,p)=>a+p.hand.length,0),80)});
test('ice missed slap distributes all center cards fairly among players',()=>{
 const s=newIce(['A','B','C','D'],()=>0.5);
 for(let i=0;i<7;i++)iceFlip(s);
 const before=s.players.map(p=>p.hand.length),onTable=s.center.length;
 assert.equal(onTable,7);
 const dealt=iceMissedSlap(s);
 assert.equal(dealt,7);assert.equal(s.center.length,0);
 const delta=s.players.map((p,i)=>p.hand.length-before[i]);
 assert.ok(Math.max(...delta)-Math.min(...delta)<=1);
 assert.equal(s.players.reduce((n,p)=>n+p.hand.length,0),80);
});

test('four-seat referee last tapper receives pile on match',()=>{
 const s=newIce(['A','B','C','D'],()=>0.5);iceFlip(s);s.last.matched=true;
 iceRecordTap(s,0,1);iceRecordTap(s,2,2);iceRecordTap(s,1,3);iceRecordTap(s,3,4);
 const r=iceAutoResolve(s);assert.deepEqual(r.penalized,[3]);assert.equal(s.center.length,0);
});
test('four-seat referee splits among non-tappers',()=>{
 const s=newIce(['A','B','C','D'],()=>0.5);iceFlip(s);s.last.matched=true;
 iceRecordTap(s,0,1);iceRecordTap(s,2,2);const r=iceAutoResolve(s);
 assert.deepEqual(r.penalized,[1,3]);assert.equal(s.players.reduce((x,p)=>x+p.hand.length,0),80);
});
test('four-seat referee detects wrong slap and duplicate input',()=>{
 const s=newIce(['A','B','C','D'],()=>0.5);iceFlip(s);s.last.matched=false;
 assert.equal(iceRecordTap(s,1,20),true);assert.equal(iceRecordTap(s,1,21),false);
 const r=iceAutoResolve(s);assert.deepEqual(r.penalized,[1]);
});
test('four-seat referee no taps shares matched pile across four',()=>{
 const s=newIce(['A','B','C','D'],()=>0.5);iceFlip(s);s.last.matched=true;
 const r=iceAutoResolve(s);assert.deepEqual(r.penalized,[0,1,2,3]);assert.equal(s.players.reduce((x,p)=>x+p.hand.length,0),80);
});

test('V1.8 cumulative penalty cards record allocations',()=>{
 const s=newIce(['上','右','下','左'],()=>0.4);
 assert.deepEqual(s.players.map(p=>p.penaltyCards),[0,0,0,0]);
 for(let i=0;i<6;i++){iceFlip(s);if(i<5){s.last.matched=false;iceAutoResolve(s)}}
 s.last.matched=true;
 iceRecordTap(s,0,100);iceRecordTap(s,1,105);iceRecordTap(s,2,110);iceRecordTap(s,3,120);
 const r=iceAutoResolve(s);assert.equal(s.players[3].penaltyCards,r.allocation[3]);
 assert.equal(s.players.reduce((n,p)=>n+p.penaltyCards,0),6);
 iceFlip(s);s.last.matched=false;iceAutoResolve(s);
 assert.equal(s.players.reduce((n,p)=>n+p.penaltyCards,0),6);
});
test('V1.8 penalty counters are persisted and legacy saves work',()=>{
 const s=newIce(['A','B','C','D'],()=>0.4);
 for(let i=0;i<5;i++){iceFlip(s);if(i<4){s.last.matched=false;iceAutoResolve(s)}}
 s.last.matched=true;iceRecordTap(s,0,90);iceRecordTap(s,2,100);
 const r=iceAutoResolve(s);assert.equal(s.players[1].penaltyCards,r.allocation[1]);
 assert.equal(s.players[3].penaltyCards,r.allocation[3]);
 const snap=JSON.parse(JSON.stringify(s));validate(snap);
 assert.deepEqual(snap.players.map(p=>p.penaltyCards),s.players.map(p=>p.penaltyCards));
 delete snap.players[0].penaltyCards;validate(snap);assert.equal(snap.players[0].penaltyCards,0);
});

test('original card category determines a correct slap',()=>{
 const s=newIce(['上','右','下','左'],()=>0.21),first=s.players[0].hand[0];
 const five=['情緒','參與','關係','意義','成就'];
 s.chant=five.indexOf(CARD_BY_ID[first].category);iceFlip(s);
 assert.equal(s.last.matched,true);
 iceRecordTap(s,0,100);iceRecordTap(s,1,110);iceRecordTap(s,2,120);iceRecordTap(s,3,130);
 const r=iceAutoResolve(s);assert.deepEqual(r.penalized,[3]);
});
test('original card category determines an incorrect slap',()=>{
 const s=newIce(['上','右','下','左'],()=>0.21),first=s.players[0].hand[0];
 const five=['情緒','參與','關係','意義','成就'];
 s.chant=(five.indexOf(CARD_BY_ID[first].category)+1)%5;iceFlip(s);
 assert.equal(s.last.matched,false);
 iceRecordTap(s,2,100);const r=iceAutoResolve(s);assert.deepEqual(r.penalized,[2]);
});
