export function setupFeedback({CARD_BY_ID,motionEnabled,flyCardClone,getSoundOn}) {
let soundContext=null,activeFeedback=null;
const feedbackLive=document.createElement('div');
feedbackLive.className='v15-sr-only';feedbackLive.setAttribute('role','status');feedbackLive.setAttribute('aria-live','polite');
document.body.appendChild(feedbackLive);
function feedbackSnapshot(game){
 const source=document.querySelector('.focus-stage .v13-action-card, .focus-stage .focus-card-preview .art.large');
 return {phase:game.phase,turn:game.turn,current:game.current,pending:game.pending,
  players:game.players.map(p=>({coins:p.coins,sets:p.sets,table:[...p.table]})),
  sourceRect:source?.getBoundingClientRect(),sourceClone:source?.cloneNode(true)};
}
function playSound(name){
 if(!getSoundOn())return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  soundContext??=new Audio();if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});
  const sequences={play:[[440,0],[565,.08]],collect:[[523,0],[659,.09]],coin:[[587,0],[784,.10],[988,.20]],magic:[[392,0],[587,.12],[784,.23]],miss:[[320,0],[270,.09]],turn:[[440,0]],win:[[523,0],[659,.12],[784,.24],[1047,.38]]};
  const seq=sequences[name]||sequences.play;
  for(const [freq,offset] of seq){const osc=soundContext.createOscillator(),gain=soundContext.createGain(),start=soundContext.currentTime+offset;
   osc.type=name==='miss'?'triangle':'sine';osc.frequency.setValueAtTime(freq,start);
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.032,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+.13);
   osc.connect(gain);gain.connect(soundContext.destination);osc.start(start);osc.stop(start+.15);
  }
 }catch(e){console.warn('Sound unavailable',e)}
}
function stopDecorativeMotion(){
 document.querySelectorAll('.v15-flying-coin,.v13-flying-card,.v13-draw-flight').forEach(node=>{node.getAnimations().forEach(a=>a.cancel());node.remove()});
}
function feedbackNotice(icon,title,detail,tone='collect'){
 activeFeedback?.remove();feedbackLive.textContent=`${title}。${detail}`;
 const el=document.createElement('div');el.className='v15-feedback v15-feedback-'+tone;
 const symbol=document.createElement('span');symbol.className='v15-feedback-symbol';symbol.textContent=icon;
 const copy=document.createElement('div'),headline=document.createElement('strong'),small=document.createElement('small');
 headline.textContent=title;small.textContent=detail;copy.append(headline,small);el.append(symbol,copy);
 document.body.appendChild(el);activeFeedback=el;
 const duration=motionEnabled()?1300:1900;
 setTimeout(()=>{if(activeFeedback===el)activeFeedback=null;el.remove()},duration);
}
function animateCoinGain(playerIndex,count){
 const seat=document.querySelectorAll('.v13-seat')[playerIndex],stage=document.querySelector('.v13-main-stage');
 seat?.classList.add('v15-seat-earn');setTimeout(()=>seat?.classList.remove('v15-seat-earn'),1050);
 if(!seat||!stage||!motionEnabled())return;
 const from=stage.getBoundingClientRect(),to=seat.getBoundingClientRect();
 const x0=from.left+from.width/2,y0=from.top+from.height*.48,x1=to.left+to.width/2,y1=to.top+to.height/2;
 for(let j=0;j<Math.min(count,5);j++){
  const coin=document.createElement('span');coin.className='v15-flying-coin';coin.textContent='✦';coin.setAttribute('aria-hidden','true');
  coin.style.left=x0+'px';coin.style.top=y0+'px';document.body.appendChild(coin);
  const ani=coin.animate([{transform:'translate(-50%,-50%) scale(.8)',opacity:0},{transform:`translate(calc(-50% + ${(x1-x0)*.35}px),calc(-50% + ${(y1-y0)*.25-20}px)) scale(1.3)`,opacity:1,offset:.35},{transform:`translate(calc(-50% + ${x1-x0}px),calc(-50% + ${y1-y0}px)) scale(.55)`,opacity:0}],{duration:650,delay:j*60,fill:'forwards',easing:'cubic-bezier(.2,.6,.25,1)'});
  ani.finished.catch(()=>{}).finally(()=>coin.remove());
 }
}
function highlightCollected(id,before){
 const target=[...document.querySelectorAll('.v14-collected-art')].find(x=>x.dataset.id===id);
 if(!target)return;
 target.classList.add('v15-card-added');setTimeout(()=>target.classList.remove('v15-card-added'),1000);
 document.querySelector('.focus-progress')?.classList.add('v15-progress-bloom');
 if(before.sourceRect&&before.sourceClone)flyCardClone(before.sourceRect,before.sourceClone,'.v14-collected-art[data-id="'+id+'"]');
}
function feedbackAfter(before,game){
 if(!game||game.kind!=='main')return;
 const prior=before.players[before.turn],now=game.players[before.turn];
 if(before.phase==='choose'&&game.phase==='confirm'){playSound('play');return;}
 if(before.phase==='confirm'){
  if(before.current&&now.table.includes(before.current)&&!prior.table.includes(before.current)){
   const c=CARD_BY_ID[before.current],name=c?.type==='fourjoy'?'四樂':c?.category||'五正';
   feedbackNotice('✓','卡牌蒐集成功',`「${name}」已放入集牌區`,'collect');playSound('collect');highlightCollected(before.current,before);
  }else{feedbackNotice('↩','本次尚未完成','卡牌已放回主牌堆','miss');playSound('miss')}
  return;
 }
 if(before.phase==='magic'){
  const magicName=CARD_BY_ID[before.pending]?.effect||'幸福魔法';
  const msg=game.log?.[0]||'魔法效果已處理';
  feedbackNotice('✧',`魔法・${magicName}`,msg.replace(/^魔法「[^」]+」：/,'').slice(0,72),'magic');
  playSound('magic');
  game.players.forEach((p,i)=>{const delta=p.coins-before.players[i].coins;if(delta>0)animateCoinGain(i,delta);else if(p.table.length!==before.players[i].table.length){const seat=document.querySelectorAll('.v13-seat')[i];seat?.classList.add('v15-seat-changed');setTimeout(()=>seat?.classList.remove('v15-seat-changed'),1000);}});
  return;
 }
 if(before.phase==='set'&&now.sets>prior.sets){
  const delta=now.coins-prior.coins;
  feedbackNotice('🏅','五正成套！',`第 ${now.sets} 套完成・獲得 ${delta} 枚幸福健康幣`,'coin');
  animateCoinGain(before.turn,delta);playSound(game.ended?'win':'coin');
  document.querySelector('.focus-progress')?.classList.add('v15-progress-bloom');
  return;
 }
 if(before.phase==='pass'&&game.turn!==before.turn){playSound('turn');return}
 if(!before.players.some((p,i)=>p.sets>=3)&&game.ended){feedbackNotice('🏆','遊戲結束','請查看本局結算結果','coin');playSound('win')}
}
return {before:feedbackSnapshot,after:feedbackAfter,sound:playSound,stop:stopDecorativeMotion};
}