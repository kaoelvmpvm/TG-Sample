import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,newIce,active,play,complete,pass,availableSets,exchangeSet,validSet,finish,standings,iceFlip,icePenalty,validate} from '../game.js';
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