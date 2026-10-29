import {CARDS, CARD_BY_ID} from './cards.js';
export const FIVE=['情緒','參與','關係','意義','成就'];
export const FOUR=['樂動','樂活','樂食','樂眠'];
export const KEY='give-me-5-independent-v1';
export const clone = x=>JSON.parse(JSON.stringify(x));
export function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const get=id=>CARD_BY_ID[id];
export const cat=id=>get(id)?.category;
export function newGame(names,random=Math.random){
 const people=names.map((name,i)=>({id:i,name:name.trim()||`玩家${i+1}`,hand:[],table:[],coins:0,sets:0,protected:[]}));
 if(people.length<2||people.length>6)throw Error('主遊戲需要 2–6 位玩家');
 const main=shuffle(CARDS.filter(c=>c.type!=='magic').map(c=>c.id),random);
 people.forEach(p=>{for(let i=0;i<3;i++)p.hand.push(main.pop());});
 return {kind:'main',version:1,players:people,deck:main,magic:shuffle(CARDS.filter(c=>c.type==='magic').map(c=>c.id),random),discard:[],turn:0,round:1,phase:'choose',current:null,pending:null,ended:false,log:['遊戲開始，每位玩家領取三張手牌。'],history:[]};
}
export const active=s=>s.players[s.turn];
export const displayName=(s,i)=>s.players[i]?.name||'';
function note(s,line){s.log=[line,...s.log].slice(0,45)}
function saveUndo(s){s.history.push(JSON.stringify({...s,history:[]}));s.history=s.history.slice(-20)}
export function undo(s){const prev=s.history.pop();if(!prev)return false;const history=s.history;Object.assign(s,JSON.parse(prev));s.history=history;return true;}
export function play(s,id){
 if(s.ended||s.phase!=='choose')throw Error('現在不是出牌階段');
 const p=active(s),idx=p.hand.indexOf(id);if(idx<0)throw Error('玩家沒有這張手牌');
 saveUndo(s);p.hand.splice(idx,1);s.current=id;s.phase='confirm';note(s,`${p.name} 出了${kindLabel(id)}。`);
}
export function kindLabel(id){const c=get(id);return `${c.category}${c.type==='task'?'任務卡':c.type==='advocacy'?'倡議卡':c.type==='fourjoy'?'四樂卡':'魔法卡'}`;}
export function complete(s,success){
 if(s.phase!=='confirm'||!s.current)throw Error('沒有待確認的任務');
 saveUndo(s);const card=get(s.current),p=active(s);
 if(success){p.table.push(card.id);note(s,`${p.name} 完成${kindLabel(card.id)}。`)}
 else {s.deck.unshift(card.id);note(s,`${p.name} 未完成，卡片返回牌堆底部。`)}
 s.current=null;
 if(success&&card.type==='fourjoy'&&s.magic.length){s.pending=s.magic.pop();s.phase='magic';return;}
 afterAction(s);
}
export function availableSets(player){
 const groups=Object.fromEntries(FIVE.map(c=>[c,player.table.filter(id=>cat(id)===c)]));
 const missing=FIVE.filter(c=>!groups[c].length);const wilds=player.table.filter(id=>get(id)?.type==='fourjoy');
 if(missing.length>1||(missing.length===1&&!wilds.length))return [];
 const picks=FIVE.map(c=>groups[c].sort((a,b)=>Number(get(a).type==='task')-Number(get(b).type==='task')).reverse()[0]).filter(Boolean);
 if(missing.length)picks.push(wilds[0]);
 return picks.length===5?[picks]:[];
}
export function validSet(p,ids){
 if(ids.length!==5||new Set(ids).size!==5||!ids.every(id=>p.table.includes(id)))return false;
 const wild=ids.filter(id=>get(id).type==='fourjoy');if(wild.length>1)return false;
 const cats=ids.filter(id=>get(id).type!=='fourjoy').map(cat);
 return new Set(cats).size===cats.length&&cats.length+wild.length===5;
}
function afterAction(s){const p=active(s);s.phase=availableSets(p).length?'set':'pass';}
export function exchangeSet(s,ids){
 if(s.phase!=='set'||!validSet(active(s),ids))throw Error('五正成套內容不合法');
 saveUndo(s);const p=active(s);ids.forEach(id=>p.table.splice(p.table.indexOf(id),1));
 const tasks=ids.filter(id=>get(id).type==='task').length;
 const coins= (p.sets===0?4:p.sets===1?5:6)+(tasks>2?1:0); // 2/3 task majority, four-joy as advocacy
 p.sets++;p.coins+=coins;note(s,`${p.name} 完成第 ${p.sets} 套，獲得 ${coins} 枚健康幣。`);
 if(p.sets>=3){finish(s,'有人完成三套五正卡');return coins;}
 s.phase=availableSets(p).length?'set':'pass';return coins;
}
export function delaySet(s){if(s.phase!=='set')throw Error('現在無法延後認證');saveUndo(s);s.phase='pass';note(s,`${active(s).name} 暫不認證完整套卡。`)}
export function magicTargets(s,eff){
 const p=active(s);if(eff==='護身符')return FIVE.filter(c=>!p.protected.includes(c));
 const canTake=q=>q.table.some(id=>get(id)?.type!=='fourjoy'&&!q.protected.includes(cat(id)));
 if(eff==='水晶球'||eff==='隱身斗篷')return s.players.filter(q=>q.id!==p.id&&canTake(q)).map(q=>q.id);
 return s.players.map(q=>q.id);
}
export function resolveMagic(s,selection={},random=Math.random){
 if(s.phase!=='magic'||!s.pending)throw Error('沒有等待處理的魔法卡');
 const m=get(s.pending),p=active(s),effect=m.effect;
 if(selection.skip){saveUndo(s);note(s,`魔法「${effect}」無有效目標，略過效果。`);s.magic.unshift(s.pending);s.pending=null;afterAction(s);return '無有效目標';}
 saveUndo(s);
 let message='';
 if(effect==='皇冠'||effect==='魔杖'){const v=effect==='皇冠'?2:1;p.coins+=v;message=`增加 ${v} 枚健康幣`;}
 else if(effect==='魔鏡'){const d=1+Math.floor(random()*6);p.coins+=d;message=`骰到 ${d} 點，增加 ${d} 枚健康幣`;}
 else if(effect==='魔戒'){const v=p.hand.filter(id=>['task','advocacy'].includes(get(id)?.type)).length;p.coins+=v;message=`手上有 ${v} 張五正卡，增加 ${v} 枚健康幣`;}
 else if(effect==='護身符'){
  if(!FIVE.includes(selection.category))throw Error('請選擇保護的面向');
  if(p.protected.includes(selection.category))throw Error('該面向已受保護');
  p.protected.push(selection.category);message=`永久保護「${selection.category}」`;
 }
 else if(effect==='水晶球'||effect==='隱身斗篷'){
  const q=s.players.find(x=>x.id===selection.target);
  if(!q||q.id===p.id)throw Error('請選擇其他玩家');
  if(effect==='水晶球'){
   const eligible=q.table.filter(id=>get(id).type!=='fourjoy'&&!q.protected.includes(cat(id)));
   if(!eligible.length)throw Error('對方沒有可交回的五正卡');
   const taken=eligible.slice(0,2);taken.forEach(id=>q.table.splice(q.table.indexOf(id),1));s.deck.unshift(...taken);message=`${q.name} 將 ${taken.length} 張五正卡放回牌堆`;
  } else {
   const category=selection.category;
   if(!FIVE.includes(category)||q.protected.includes(category))throw Error('無效面向或受護身符保護');
   const taken=q.table.filter(id=>cat(id)===category);
   if(!taken.length)throw Error('該面向沒有可取得的卡牌');
   taken.forEach(id=>q.table.splice(q.table.indexOf(id),1));p.table.push(...taken);message=`取得 ${q.name} 的「${category}」${taken.length} 張`;
  }
 }
 else if(effect==='飛天掃帚'){
  const a=s.players.find(x=>x.id===selection.first),b=s.players.find(x=>x.id===selection.second);
  if(!a||!b||a.id===b.id)throw Error('請選擇兩位不同玩家');
  const keepA=a.table.filter(id=>get(id).type==='fourjoy'); const keepB=b.table.filter(id=>get(id).type==='fourjoy');
  const cardsA=a.table.filter(id=>get(id).type!=='fourjoy'&&!a.protected.includes(cat(id)));
  const cardsB=b.table.filter(id=>get(id).type!=='fourjoy'&&!b.protected.includes(cat(id)));
  a.table=a.table.filter(id=>!cardsA.includes(id)).concat(cardsB);b.table=b.table.filter(id=>!cardsB.includes(id)).concat(cardsA);
  message=`${a.name} 與 ${b.name} 交換可移動的五正卡`;
 }
 note(s,`魔法「${effect}」：${message}。`);s.magic.unshift(s.pending);s.pending=null;
 afterAction(s);return message;
}
export function pass(s){
 if(s.phase!=='pass')throw Error('尚有未完成的遊戲階段');saveUndo(s);
 const p=active(s);if(s.deck.length)p.hand.push(s.deck.pop());
 let next=s.turn,checked=0;do{next=(next+1)%s.players.length;checked++}while(!s.players[next].hand.length&&checked<s.players.length);
 if(checked>=s.players.length&&!s.players[next].hand.length){finish(s,'牌堆與所有手牌均已用盡');return;}
 s.turn=next;s.round++;s.phase=availableSets(active(s)).length?'set':'choose';
 note(s,`輪到 ${active(s).name}。`);
}
export function finish(s,reason='教師結算'){s.ended=true;s.phase='finished';s.reason=reason;note(s,`遊戲結束：${reason}。`)}
export function standings(s){return [...s.players].sort((a,b)=>b.coins-a.coins||b.sets-a.sets).map((p,i,arr)=>({...p,rank:1+arr.filter(q=>q.coins>p.coins).length}));}
export function newIce(names,random=Math.random){
 if(names.length<2||names.length>6)throw Error('幸福心臟病需要 2–6 位玩家');
 const deck=shuffle(CARDS.filter(c=>['task','advocacy'].includes(c.type)).map(c=>c.id),random);const players=names.map((name,i)=>({id:i,name:name.trim()||`玩家${i+1}`,hand:[],emptySince:null}));
 deck.forEach((id,i)=>players[i%players.length].hand.push(id));
 return {kind:'ice',version:1,players,center:[],turn:0,chant:0,flips:0,phase:'flip',last:null,ended:false,winner:null,log:['幸福心臟病開始，依序喊五正並翻牌。'],history:[]};
}
export function iceFlip(s){
 if(s.phase!=='flip'||s.ended)throw Error('目前不能翻牌');
 saveUndo(s);let tries=0;
 while(!s.players[s.turn].hand.length&&tries<s.players.length){
  const p=s.players[s.turn];if(p.emptySince!==null&&s.flips>p.emptySince){iceFinish(s,p.id);return null;}
  s.turn=(s.turn+1)%s.players.length;tries++;
 }
 if(tries>=s.players.length){iceFinish(s,null);return null;}
 const p=s.players[s.turn],card=p.hand.shift();s.center.push(card);s.last={card,shout:FIVE[s.chant],player:p.id,matched:cat(card)===FIVE[s.chant]};s.chant=(s.chant+1)%5;s.flips++;
 if(!p.hand.length)p.emptySince=s.flips;
 note(s,`${p.name} 翻了一張牌。`);
 s.turn=(s.turn+1)%s.players.length;
 return s.last;
}
export function icePenalty(s,playerId,reason){
 if(s.phase!=='flip'||s.ended||!s.center.length)throw Error('牌桌沒有可回收的卡牌');
 const p=s.players.find(q=>q.id===playerId);if(!p)throw Error('無效玩家');
 saveUndo(s);p.hand.push(...s.center);s.center=[];p.emptySince=null;s.turn=p.id;
 note(s,`${p.name} ${reason}，收回桌面全部卡牌。`);
}
export function iceMissedSlap(s){
 if(s.phase!=='flip'||s.ended||!s.center.length)throw Error('目前沒有待處理的桌面卡牌');
 saveUndo(s);
 const pile=[...s.center];
 s.center=[];
 let given=0;
 pile.forEach((id,i)=>{const player=s.players[i % s.players.length];player.hand.push(id);player.emptySince=null;given++;});
 note(s,`應拍未拍，桌面 ${given} 張卡平均分回所有玩家。`);
 return given;
}
export function iceFinish(s,winner){s.phase='finished';s.ended=true;s.winner=winner;note(s,winner===null?'教師結束本局。':`${s.players[winner].name} 獲勝！`)}
export function validate(snapshot){
 if(!snapshot||snapshot.version!==1||!['main','ice'].includes(snapshot.kind)||!Array.isArray(snapshot.players)||snapshot.players.length<2||snapshot.players.length>6)throw Error('存檔版本不相容');
 if(!Number.isInteger(snapshot.turn)||snapshot.turn<0||snapshot.turn>=snapshot.players.length)throw Error('存檔玩家位置無效');
 if(snapshot.kind==='main'){
  if(!['choose','confirm','magic','set','pass','finished'].includes(snapshot.phase))throw Error('存檔階段無效');
  if(!Array.isArray(snapshot.deck)||!Array.isArray(snapshot.magic)||!snapshot.players.every(p=>Array.isArray(p.hand)&&Array.isArray(p.table)))throw Error('存檔牌堆無效');
  if(snapshot.phase==='choose'&&!active(snapshot).hand.length){if(availableSets(active(snapshot)).length)snapshot.phase='set';else snapshot.phase='pass';}
  if(snapshot.phase==='magic'&&!snapshot.pending)throw Error('魔法卡存檔不完整');
 }else{
  if(!['flip','finished'].includes(snapshot.phase)||!Array.isArray(snapshot.center)||!snapshot.players.every(p=>Array.isArray(p.hand)))throw Error('心臟病存檔無效');
 }
 return snapshot;
}