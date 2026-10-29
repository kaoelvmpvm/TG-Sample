import {CARDS,CARD_BY_ID} from './cards.js';
import {setupFeedback} from './feedback.js';
import {FIVE,FOUR,KEY,newGame,newIce,active,play,complete,pass,availableSets,validSet,exchangeSet,delaySet,resolveMagic,magicTargets,undo,finish,standings,iceFlip,icePenalty,iceFinish,validate,cat,kindLabel} from './game.js';
const app=document.querySelector('#app'); const elToast=document.querySelector('#toast');
let page='home',game=null,mode='main',size=4,veil=true,viewCard=null,chosen=[],typeFilter='all',notice='',motion=true;
let preferFullscreen=true, immersiveFallback=false, slapCorner=null, slapCount=0;
let pointerDrag=null, dragId=null, suppressPlayClickUntil=0, lastSlapPointerAt=0;
// V1.2: main-game presentation state, deliberately separate from rules engine.
let focusPanel=null, focusPlayer=0, selectedCard=null;
// V1.5 sensory feedback is presentation-only.
let soundOn=false;
try { soundOn=localStorage.getItem('tg-sound-enabled')==='true'; motion=localStorage.getItem('tg-motion-enabled')!=='false'; } catch(e) {}
const fx=setupFeedback({CARD_BY_ID,motionEnabled:()=>motionEnabled(),flyCardClone:(...args)=>flyCardClone(...args),getSoundOn:()=>soundOn});
try { preferFullscreen=localStorage.getItem('tg-pref-fullscreen')!=='false'; } catch(e) { /* private browsing */ }
const inFullscreen=()=>Boolean(document.fullscreenElement||immersiveFallback);
function setFullscreenPreference(checked){preferFullscreen=checked;try{localStorage.setItem('tg-pref-fullscreen',String(checked))}catch(e){}}
function requestFullscreen(){
 if(document.fullscreenElement||immersiveFallback)return;
 if(document.documentElement.requestFullscreen){
  Promise.resolve(document.documentElement.requestFullscreen()).then(()=>refreshFullscreenButton()).catch(()=>{immersiveFallback=true;refreshFullscreenButton();toast('瀏覽器限制全螢幕；已切換專注顯示模式。')});
 }else{immersiveFallback=true;refreshFullscreenButton();}
}
function exitFullscreen(){
 immersiveFallback=false;
 if(document.fullscreenElement&&document.exitFullscreen){Promise.resolve(document.exitFullscreen()).catch(()=>{});}
 refreshFullscreenButton();
}
function refreshFullscreenButton(){document.body.classList.toggle('immersive-mode',immersiveFallback);for(const b of document.querySelectorAll('[data-act="toggle-fullscreen"]')){b.textContent=inFullscreen()?'⛶ 退出全螢幕':'⛶ 全螢幕';b.setAttribute('aria-pressed',String(inFullscreen()));}}
document.addEventListener('fullscreenchange',refreshFullscreenButton);

const E=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const TYPE={task:'幸福任務卡',advocacy:'幸福倡議卡',fourjoy:'幸福四樂卡',magic:'幸福健康魔法卡'};
const emoji={'情緒':'❤️','參與':'💡','關係':'🤝','意義':'🌍','成就':'🚩','樂動':'🏃','樂活':'🌿','樂食':'🥦','樂眠':'🌙'};
function art(id,klass='',action='view'){
 const c=CARD_BY_ID[id];if(!c)return `<div class="pill">未知卡牌</div>`;
 const col=c.imageIndex%8,row=Math.floor(c.imageIndex/8);
 const style=`background-position:${(col/7*100).toFixed(6)}% ${(row/13*100).toFixed(6)}%`;
 return `<button type="button" class="art ${klass}" data-act="${action}" data-id="${E(id)}" style="${style}" aria-label="${E((c.effect||c.category)+' '+TYPE[c.type])}" title="點擊查看原版卡面"></button>`;
}
function btn(label,action,klass='primary',data=''){return `<button class="btn ${klass}" data-act="${action}" ${data}>${label}</button>`}
function toast(message){elToast.textContent=message;elToast.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>{elToast.style.display='none'},3800)}
function commit(action,options={}){
 const before=!options.silent&&page==='play'&&game?.kind==='main'?fx.before(game):null;
 try{action();persist();render();if(before)fx.after(before,game)}
 catch(err){console.error(err);toast(err.message||'操作未完成，請再試一次。')}
}
function persist(){if(!game)return;try{localStorage.setItem(KEY,JSON.stringify(game))}catch(e){toast('瀏覽器暫時無法保存進度；遊戲仍可操作。')}}
function load(){try{const v=localStorage.getItem(KEY);return v?validate(JSON.parse(v)):null}catch(e){console.warn('discarding corrupt local progress',e);return null}}
function header(){
 const playingMain=page==='play'&&game?.kind==='main';
 if(playingMain)return `<header class="focus-header"><div class="focus-brand"><span class="focus-brand-mark">🙌</span><span>幸福 GIVE ME 5 <small>主遊戲</small></span></div><nav class="focus-top-actions">${btn(inFullscreen()?'⛶ 退出全螢幕':'⛶ 全螢幕','toggle-fullscreen','small fullscreen-toggle')}${btn('☰ 選單','focus-menu','small')}</nav></header>`;
 return `<div class="header"><div class="brand"><div class="logo">🙌</div><div><h1>幸福 GIVE ME 5</h1><small>健康 4 EVER · 正向心理健康桌遊</small></div></div><nav class="nav">${btn(inFullscreen()?'⛶ 退出全螢幕':'⛶ 全螢幕','toggle-fullscreen','small fullscreen-toggle')} ${btn('首頁','home','small')}${btn('卡牌圖鑑','library','small')}${btn('遊戲規則','rules','small')}</nav></div>`;
}
function home(){const existing=load();return `<section class="hero"><div class="eyebrow">POSITIVE MENTAL HEALTH · CARD GAME</div><h2>把幸福放在掌心，<br>讓五正成為日常。</h2><p>保留原版卡牌設計，重新打造更穩定、直覺的數位桌遊。面對面朗讀、分享、行動與互動，依然是遊戲的主角。</p>${existing?btn('▶ 繼續上一局','resume','teal'):''}</section><section class="home-grid"><button class="tile" data-act="setup-main"><span class="emoji">🃏</span><h3>主遊戲</h3><p>蒐集情緒、參與、關係、意義、成就，完成五正成套並獲取幸福健康幣。</p><span class="link">開始新遊戲 →</span></button><button class="tile" data-act="setup-ice"><span class="emoji">⚡</span><h3>幸福心臟病</h3><p>依序喊出五正，辨識牌面、搶拍、收牌。保留實體互動，由教師記錄結果。</p><span class="link">開始破冰 →</span></button><button class="tile" data-act="library"><span class="emoji">📚</span><h3>原版卡牌圖鑑</h3><p>40 任務、40 倡議、16 四樂、16 魔法。共 112 張原始卡面。</p><span class="link">瀏覽卡牌 →</span></button></section><p class="help caption">本網站為單機共用裝置版本；遊戲資料儲存在本機瀏覽器，無須帳號或後端服務。</p>`}
function setup(){return `<div class="panel setup"><div class="eyebrow">NEW GAME</div><h2>${mode==='main'?'主遊戲':'幸福心臟病'} · 建立對局</h2><p class="help">建議 4–6 人同桌進行。為測試與小組教學，也支援 2–3 人。</p><div class="formrow"><label for="people-count">玩家人數</label><select id="people-count" class="field number">${[2,3,4,5,6].map(n=>`<option ${size===n?'selected':''} value="${n}">${n} 人</option>`).join('')}</select></div><div class="player-fields">${Array.from({length:size},(_,i)=>`<div class="field-row"><span>${i+1} 號</span><input class="field player-name" value="玩家${i+1}" maxlength="14" aria-label="第${i+1}位玩家名稱"></div>`).join('')}</div><label class="fullscreen-setting"><input id="fullscreen-pref" type="checkbox" ${preferFullscreen?'checked':''}> 開始遊戲時進入全螢幕 <small>（部分手機瀏覽器會改為專注模式；可隨時退出）</small></label><div class="notice">${mode==='main'?'出牌後的任務由同桌判定完成；系統負責洗牌、魔法效果、成套與計分。':'此模式以現場搶拍為準。系統不提前提示牌面是否吻合；由教師選擇最後壓牌或犯規者。'}</div><div class="actions">${btn('建立並開始','start','teal')}${btn('取消','home','ghost')}</div></div>`}
function playerChips(){return `<div class="scorebar">${game.players.map((p,i)=>`<div class="score-chip ${i===game.turn?'active':''}"><strong>${E(p.name)}</strong><small>${game.kind==='main'?`🪙 ${p.coins} · ${p.sets}/3 套`:`🃏 ${p.hand.length} 張`}</small></div>`).join('')}</div>`}
function phaseIntro(){return {choose:['選擇一張手牌','點選原版卡面，即可翻開並準備執行任務。'],confirm:['完成卡牌任務','朗讀原版卡面內容，完成後交由同桌確認。'],magic:['啟動幸福魔法','抽到四樂卡，完成魔法效果後才換下一個階段。'],set:['五正成套認證','蒐集五正各一張；可選一張四樂卡補足一種面向。'],pass:['本回合完成','補抽一張手牌，準備交給下一位玩家。'],finished:['本局結算','最多健康幣者獲勝，同分則並列。']}[game.phase]||['目前回合','']}
function meter(p){const counts=FIVE.map(c=>p.table.filter(id=>cat(id)===c).length);return `<div class="meter">${FIVE.map((c,i)=>`<div class="meter-cell ${counts[i]?'done':''}"><b>${emoji[c]}</b>${c}<small style="display:block">${counts[i]||'－'}</small></div>`).join('')}</div><p class="muted caption">集滿五種面向，或以一張四樂卡替代缺少的面向，即可認證。</p>`}
function side(showCollections=false){if(!game)return '';const p=active(game);return `<aside class="side">${showCollections?collections():''}<section class="panel"><h3>🎯 五正蒐集板</h3>${game.kind==='main'?meter(p):`<p class="help">喊牌循環：情緒 → 參與 → 關係 → 意義 → 成就。</p>`}</section><section class="panel"><h3>📊 遊戲資訊</h3><div class="stat">回合 / 翻牌<strong>${game.kind==='main'?game.round:game.flips}</strong></div><div class="stat">${game.kind==='main'?'剩餘主牌':'桌面累積'}<strong>${game.kind==='main'?game.deck.length:game.center.length} 張</strong></div>${game.kind==='main'?`<div class="stat">魔法牌堆<strong>${game.magic.length} 張</strong></div><div class="stat">集牌區<strong>${p.table.length} 張</strong></div><div class="stat">四樂卡<strong>${p.table.filter(id=>CARD_BY_ID[id].type==='fourjoy').length} 張</strong></div>`:''}</section><section class="panel"><h3>🕒 最近紀錄</h3><ul class="log">${game.log.slice(0,10).map(x=>`<li>${E(x)}</li>`).join('')}</ul><div class="actions">${btn('復原一步','undo','small')}${btn('結束遊戲','end','small danger')}</div></section></aside>`}
function hand(){const p=active(game);return `<div class="hand-area"><div class="hand-label">${E(p.name)} 的手牌 · ${p.hand.length} 張</div><div class="card-row hand-cards">${p.hand.map(id=>art(id,'playable', 'play').replace('<button ', '<button draggable="true" ')).join('')||'<span class="pill">手牌已用完</span>'}</div><div class="help caption" style="text-align:center;color:#cae8e4;margin-top:10px">點擊卡牌可以出牌，也可以拖曳至上方出牌區。請勿在公開投影畫面展示個人手牌。</div></div>`}
function dropZone(){return `<div class="play-dropzone" data-dropzone="play" role="region" aria-label="拖曳卡牌到這裡出牌"><span class="dropzone-icon">⇧</span><strong>拖曳卡牌到這裡出牌</strong><span>也可以直接點擊下方手牌</span></div>`}
function tableCards(p){return p.table.length?`<div class="collection-cards">${p.table.map(id=>art(id,'tiny')).join('')}</div>`:`<div class="collection-empty">尚未取得卡牌</div>`}
function collectionStrip(){const p=active(game);return `<section class="table-collection"><div class="collection-heading"><strong>🎴 ${E(p.name)} 的集牌區</strong><span>${p.table.length} 張 · 所有已獲得卡牌公開展示</span></div>${tableCards(p)}</section>`}
function collections(){return `<section class="panel collections-panel"><h3>🗂️ 全部玩家集牌區</h3><p class="help caption">可展開每位玩家的公開卡牌；點選卡面可放大檢視。</p><div class="player-collections">${game.players.map((p,i)=>`<details class="collection-player" ${i===game.turn?'open':''}><summary><strong>${E(p.name)}</strong><span>${p.table.length} 張</span></summary>${tableCards(p)}</details>`).join('')}</div></section>`}

function mainCenter(){const p=active(game);if(game.ended){const arr=standings(game);const top=arr.filter(x=>x.coins===arr[0].coins).map(x=>x.name).join('、');return `<div class="center-game"><h2>🏆 遊戲完成</h2><p>冠軍：${E(top)}</p><div class="result-list">${arr.map(x=>`<div class="result-item"><span>${x.rank} · ${E(x.name)}</span><strong>🪙 ${x.coins}　｜${x.sets} 套</strong></div>`).join('')}</div>${btn('再玩一局','restart','teal')}</div>`}
 if(game.phase==='choose'){return `${veil?`<div class="center-game"><div class="veil"><h2>🤝 輪到 ${E(p.name)}</h2><p>請將裝置交給該玩家。準備好後，再顯示私人手牌。</p>${btn('我已準備好 · 顯示手牌','unlock','teal')}</div></div>`:`<div class="center-game">${dropZone()}</div>${hand()}`}`;}
 if(game.phase==='confirm'){const c=CARD_BY_ID[game.current];return `<div class="center-game">${art(c.id,'large')}<p class="white">${c.type==='advocacy'?'請大聲朗讀卡牌標題與內容。':'請依照卡牌內容完成指定任務。'}</p><div class="actions">${btn('同桌確認：完成','complete-yes','teal')}${btn('未完成','complete-no','danger')}</div></div>`}
 if(game.phase==='magic')return magicPanel();
 if(game.phase==='set'){const suggestion=availableSets(p)[0]||[];if(!chosen.length)chosen=[...suggestion];const selections=chosen;return `<div class="center-game"><h3>✨ 恭喜，五正成套！</h3><div class="notice">請完成「幸福 GIVE ME 5 健康 4 EVER」手勢後，由同桌確認兌換。</div><div class="card-row">${selections.map(id=>art(id,'tiny')).join('')}</div><p>本次推薦組合：${selections.filter(id=>CARD_BY_ID[id].type==='task').length} 張任務卡</p><div class="actions">${btn('確認認證 · 兌換健康幣','set-submit','teal')}${btn('稍後再認證','set-delay','ghost')}</div></div>`}
 if(game.phase==='pass')return `<div class="center-game"><h2>✅ ${E(p.name)} 已完成本回合</h2><p>將自動補抽一張卡牌，並交給下一位玩家。</p><div class="actions">${btn('補牌 · 下一位玩家','pass','teal')}</div></div>`;
 return `<div class="center-game"><p>系統正在確認目前遊戲狀態。</p>${btn('返回首頁','home')}</div>`;
}
function magicPanel(){const c=CARD_BY_ID[game.pending],eff=c.effect,opts=magicTargets(game,eff),others=game.players.filter(x=>x.id!==game.turn);let controls='';
 const menu=(id,items,byName=false)=>`<select class="select-control" id="${id}">${items.map(x=>`<option value="${E(x.id??x)}">${E(byName?x.name:x.name||x)}</option>`).join('')}</select>`;
 if(eff==='護身符')controls=menu('magic-cat',opts);
 if(eff==='水晶球'||eff==='隱身斗篷')controls=menu('magic-target',others.filter(p=>opts.includes(p.id)),true)+(eff==='隱身斗篷'?menu('magic-cat',FIVE):'');
 if(eff==='飛天掃帚')controls=menu('magic-first',game.players,true)+menu('magic-second',game.players.slice(1),true);
 return `<div class="center-game">${art(c.id,'large')}<h3>🪄 ${E(eff)}</h3><p>請依照原版卡面執行效果。</p>${controls?`<div class="inline-form">${controls}</div>`:''}<div class="actions">${btn('確認執行魔法','magic-go','teal')}${btn('無有效目標 · 略過','magic-skip','ghost')}</div></div>`}
// Focus Mode: one primary decision per screen; secondary information stays in drawers.
function focusRoster(){
 const p=active(game);
 const colors=['#f3b86b','#76c7bd','#bcacfa','#f39fb4','#9dc7f0','#e9d58a'];
 return `<div class="v13-roundbar"><div class="v13-turn-badge"><span class="v13-overline">第 ${game.round} 回合 · 幸福之旅</span><strong>輪到 ${E(p.name)}</strong></div><div class="v13-player-score"><span>🪙 <strong>${p.coins}</strong> 健康幣</span><span>⭐ <strong>${p.sets}/3</strong> 套</span></div></div><div class="v13-seat-row" aria-label="玩家座位與分數">${game.players.map((q,i)=>`<div class="v13-seat ${i===game.turn?'is-current':''}" style="--seat-color:${colors[i%colors.length]}" aria-label="${E(q.name)}，${q.coins}枚健康幣，${q.sets}套"><span class="v13-seat-avatar">${i+1}</span><span class="v13-seat-details"><strong>${E(q.name)}</strong><small>🪙 ${q.coins} · ${q.sets}/3 套</small></span>${i===game.turn?'<span class="v13-seat-active-dot" aria-hidden="true"></span>':''}</div>`).join('')}</div>`;
}
function v13Decks(){
 const ordinary=game.deck.length,magic=game.magic.length;
 return [`<div class="v13-deck-side v13-deck-left"><span class="v13-deck-title">主牌堆</span><div class="v13-card-back v13-main-back" role="img" aria-label="主牌堆，剩餘${ordinary}張"><span class="v13-card-back-mark">✦</span><span>GIVE<br>ME <b>5</b></span></div><strong>${ordinary} 張</strong></div>` , `<div class="v13-deck-side v13-deck-right"><span class="v13-deck-title">魔法牌堆</span><div class="v13-card-back v13-magic-back" role="img" aria-label="魔法牌堆，剩餘${magic}張"><span class="v13-card-back-mark">✧</span><span>MAGIC<br>CARDS</span></div><strong>${magic} 張</strong></div>`];
}
function focusProgress(){
 const p=active(game), counts=Object.fromEntries(FIVE.map(c=>[c,p.table.filter(id=>cat(id)===c).length]));
 const missing=FIVE.filter(c=>!counts[c]);
 const wilds=p.table.filter(id=>CARD_BY_ID[id].type==='fourjoy').length;
 return `<section class="focus-progress" aria-label="五正蒐集進度"><div class="focus-section-title"><strong>五正蒐集</strong><span>${5-missing.length}/5 個面向</span></div><div class="focus-five">${FIVE.map(c=>`<div class="focus-five-cell ${counts[c]?'is-collected':''}"><span>${emoji[c]}</span><strong>${E(c)}</strong>${counts[c]?`<small>✓ ${counts[c]} 張</small>`:'<small>尚未取得</small>'}</div>`).join('')}</div><p class="focus-next">${missing.length?`還缺：${missing.map(E).join('、')}${wilds?'（四樂卡可替代其中一個面向）':''}`:'五正面向已蒐集齊全！'}</p></section>`;
}
function focusHand(){
 const p=active(game),n=p.hand.length;
 return `<section class="focus-hand v13-hand-shelf" aria-label="${E(p.name)}的手牌"><div class="focus-section-title"><strong>我的手牌</strong><span>${n} 張 · 點選預覽／拖出後放開即出牌</span></div><div class="focus-hand-cards v13-hand-fan">${p.hand.map((id,i)=>art(id,`playable ${selectedCard===id?'selected':''}`,'play').replace('style="',`draggable="false" style="--fan-angle:${((i-(n-1)/2)*7).toFixed(1)}deg;--fan-rise:${Math.abs(i-(n-1)/2)*5}px;`)).join('')||'<span>目前沒有手牌</span>'}</div><p class="v14-hand-instruction">向外拖出一張牌，放開就能打出；想先看內容，請輕點卡牌。</p></section>`;
}
function focusStage(){
 const p=active(game);
 if(game.ended){const results=standings(game),winner=results.filter(x=>x.coins===results[0].coins).map(x=>x.name).join('、');return `<section class="focus-stage"><span class="focus-step">遊戲結束</span><h2>🏆 恭喜 ${E(winner)}</h2><p>以下是本局健康幣結算結果</p><div class="result-list">${results.map(x=>`<div class="result-item"><span>${x.rank} · ${E(x.name)}</span><strong>🪙 ${x.coins}｜${x.sets} 套</strong></div>`).join('')}</div>${btn('再玩一局','restart','teal')}</section>`;}
 if(game.phase==='choose'){
  if(veil)return `<section class="focus-stage focus-handoff"><span class="focus-step">輪替玩家</span><h2>輪到 ${E(p.name)}</h2><p>請將裝置交給這位玩家，再顯示他的手牌。</p>${btn('我準備好了，顯示手牌','unlock','teal')}</section>`;
  const selection=p.hand.includes(selectedCard)?selectedCard:null;
  return `<section class="focus-stage"><span class="focus-step">步驟 1 · 選擇手牌</span><h2>${selection?'確定要打出這張牌嗎？':'選一張卡牌開始回合'}</h2>${selection?`<div class="focus-card-preview">${art(selection,'large')}<div class="focus-preview-actions"><p>可以點擊卡面放大閱讀，確認後再出牌。</p>${btn('確認出牌','focus-confirm-play','teal')}${btn('返回選牌','focus-clear-select','ghost')}</div></div>`:`<div class="v14-play-hint"><span aria-hidden="true">🃏</span><strong>拖出手牌，放開立即出牌</strong><small>也可以點選手牌，先預覽再確認</small></div>`}</section>${focusHand()}`;
 }
 if(game.phase==='confirm'){
  const c=CARD_BY_ID[game.current];
  return `<section class="focus-stage"><span class="focus-step">步驟 2 · 完成任務</span><h2>${c.type==='advocacy'?'朗讀卡牌內容':'完成卡牌上的任務'}</h2><div class="focus-card-preview">${art(c.id,'large v13-action-card')}<div class="focus-preview-actions"><p>點擊卡牌可放大閱讀。完成後，請交由同桌確認。</p>${btn('同桌確認完成','complete-yes','teal')}${btn('尚未完成','complete-no','ghost')}</div></div></section>`;
 }
 if(game.phase==='magic')return `<section class="focus-stage"><span class="focus-step">特殊事件 · 幸福魔法</span>${magicPanel()}</section>`;
 if(game.phase==='set'){
  const suggestion=availableSets(p)[0]||[];if(!chosen.length)chosen=[...suggestion];
  return `<section class="focus-stage"><span class="focus-step">特別獎勵 · 五正成套</span><h2>✨ 集滿五正，可以兌換健康幣！</h2><p>請完成「幸福 GIVE ME 5 健康 4 EVER」手勢。</p><div class="focus-set-cards">${chosen.map(id=>art(id,'tiny')).join('')}</div><div class="focus-primary-actions">${btn('確認兌換健康幣','set-submit','teal')}${btn('稍後再兌換','set-delay','ghost')}</div></section>`;
 }
 if(game.phase==='pass')return `<section class="focus-stage"><span class="focus-step">本回合完成</span><h2>✅ ${E(p.name)}，完成回合！</h2><p>下一步將補一張手牌，再交給下一位玩家。</p>${btn('補牌，換下一位','pass','teal')}</section>`;
 return `<section class="focus-stage"><h2>系統正在確認遊戲狀態</h2>${btn('開啟選單','focus-menu')}</section>`;
}
function focusDrawer(){
 if(!focusPanel)return '';
 if(focusPanel==='menu')return `<div class="focus-shade" data-act="focus-close"><aside class="focus-drawer" role="dialog" aria-modal="true" aria-label="遊戲選單"><div class="focus-drawer-head"><h2>遊戲選單</h2>${btn('✕ 關閉','focus-close','small')}</div><p class="focus-drawer-note">不常使用的操作集中在這裡，避免干擾遊戲。</p><div class="focus-menu-actions">${btn('🗂️ 查看集牌區','focus-collections')}${btn('📖 遊戲規則','rules')}${btn('🕒 操作紀錄','focus-log')}<div class="v15-menu-title">遊戲互動設定</div>${btn(soundOn?'🔊 關閉音效':'🔇 開啟音效','toggle-sound')}${btn(motion?'✨ 關閉動態效果':'✨ 開啟動態效果','toggle-motion')}${btn('↶ 復原上一步','undo')}${btn('⌂ 返回首頁','home')}${btn('結束本局','end','danger')}</div></aside></div>`;
 if(focusPanel==='log')return `<div class="focus-shade" data-act="focus-close"><aside class="focus-drawer" role="dialog" aria-modal="true" aria-label="操作紀錄"><div class="focus-drawer-head"><h2>操作紀錄</h2>${btn('✕ 關閉','focus-close','small')}</div><ul class="focus-log">${game.log.map(x=>`<li>${E(x)}</li>`).join('')}</ul></aside></div>`;
 const player=game.players[focusPlayer]||active(game);
 const groups=[...FIVE,'四樂'];
 return `<div class="focus-shade" data-act="focus-close"><aside class="focus-drawer focus-collection-drawer" role="dialog" aria-modal="true" aria-label="玩家集牌區"><div class="focus-drawer-head"><div><h2>公開集牌區</h2><p>選擇玩家，再查看不同面向的原版卡牌。</p></div>${btn('✕ 關閉','focus-close','small')}</div><div class="focus-player-tabs">${game.players.map(p=>`<button type="button" class="focus-player-tab ${p.id===player.id?'active':''}" data-act="focus-player" data-player="${p.id}">${E(p.name)} <small>${p.table.length} 張</small></button>`).join('')}</div><div class="focus-group-list">${groups.map(group=>{const ids=player.table.filter(id=>group==='四樂'?CARD_BY_ID[id].type==='fourjoy':cat(id)===group);return `<section class="focus-group"><h3>${group==='四樂'?'🌿':emoji[group]} ${group} <small>${ids.length} 張</small></h3>${ids.length?`<div class="focus-group-cards">${ids.map(id=>art(id,'tiny')).join('')}</div>`:'<p>尚未蒐集</p>'}</section>`}).join('')}</div></aside></div>`;
}
function focusVisibleCollection(){
 const p=active(game);
 const cards=[...p.table].sort((a,b)=>{
  const c=id=>CARD_BY_ID[id].type==='fourjoy'?5:FIVE.indexOf(cat(id));return c(a)-c(b);
 });
 return `<section class="v14-collection-board" aria-label="${E(p.name)}的集牌區"><div class="v14-collection-header"><div><h2>🎴 我的集牌區 <span>${p.table.length} 張</span></h2><p>已完成的卡牌會放在這裡，可點選放大閱讀</p></div>${btn('查看全部玩家 →','focus-collections','small v14-collection-open')}</div>${cards.length?`<div class="v14-collection-row" tabindex="0" aria-label="已收集的卡牌，可左右捲動查看">${cards.map(id=>`<div class="v14-collected-card">${art(id,'v14-collected-art')}<span>${CARD_BY_ID[id].type==='fourjoy'?'四樂':E(cat(id))}</span></div>`).join('')}</div>`:'<div class="v14-collection-empty"><span aria-hidden="true">＋</span> 完成卡牌任務後，卡片會自動加入此處</div>'}</section>`;
}
function mainPage(){const decks=v13Decks();return `<div class="focus-layout v13-layout"><section class="v13-table" aria-label="幸福 GIVE ME 5 沉浸式遊戲桌"><div class="v13-felt"><div class="v13-game-heading"><span>GIVE ME 5 <em>·</em> 健康 4 EVER</span><small>POSITIVE MENTAL HEALTH</small></div>${focusRoster()}<div class="v13-play-surface">${decks[0]}<div class="v13-main-stage">${focusStage()}</div>${decks[1]}</div>${!game.ended?focusVisibleCollection():''}${!game.ended?focusProgress():''}<div class="focus-bottom-actions v13-board-actions">${btn('🗂️ 全部玩家集牌','focus-collections','small')}${btn('☰ 遊戲選單','focus-menu','small ghost')}</div></div></section>${focusDrawer()}</div>`;}
function icePage(){const p=active(game);if(game.ended)return `<div class="layout"><section class="tabletop">${playerChips()}<div class="center-game"><h2>🎉 ${game.winner===null?'本局已結束':E(game.players[game.winner].name)+' 獲勝！'}</h2>${btn('重新開始','restart','teal')}</div></section>${side()}</div>`;
 const label=FIVE[game.chant];const corners=[['tl','左上'],['tr','右上'],['bl','左下'],['br','右下']];return `<div class="layout"><section class="tabletop ice-tabletop">${playerChips()}<div class="phase-line"><span class="eyebrow">ICEBREAKER · ${game.flips} FLIPS</span><h2>⚡ 幸福心臟病</h2><p>輪到 ${E(p.name)}。翻牌時喊出「${E(label)}」，請自行辨識是否要搶拍！</p></div><div class="ice-arena" role="group" aria-label="幸福心臟病四角拍牌區">${corners.map(([pos,name])=>`<button type="button" class="slap-button slap-${pos} ${slapCorner===pos?'slap-active':''}" data-act="ice-slap" data-corner="${pos}" aria-label="${name}拍牌">拍</button>`).join('')}<div class="ice-card">${game.last?art(game.last.card,'large'):'<div class="veil">尚未翻出卡牌</div>'}</div></div><div class="ice-slap-status" role="status">${slapCount?`已拍 ${slapCount} 次 · 請依現場結果登記最後拍到或犯規者`:'四個角皆可拍牌；實際收牌者由教師確認'}</div><div class="actions">${btn(p.hand.length?'翻下一張牌':'跳過空手玩家／判定勝負','ice-flip','teal')}${btn('登記收牌 / 犯規','ice-penalty','pink',game.center.length?'':'disabled')}</div><p class="white ice-deck-count">牌桌已有 ${game.center.length} 張 · 本局不提前顯示是否相符</p><div class="game-foot"><span>最後拍到／拍錯／喊錯的人收回桌上全部卡牌</span><span>四角拍鍵只記錄拍牌動作；不自動判定搶拍名次</span></div></section>${side()}</div>`}
function rules(){return `<article class="panel rules"><div class="eyebrow">RULE BOOK</div><h2>📖 遊戲規則</h2><h3>主遊戲</h3><ol><li>建議 4–6 人。將任務、倡議、四樂合成主牌堆（96 張），魔法卡（16 張）獨立牌堆。</li><li>每位玩家先抽三張手牌，輪流亮一張。任務卡完成指定任務；倡議卡朗讀標題與內容；四樂卡完成任務並抽魔法卡執行效果。</li><li>成功卡牌放入集牌區；四樂卡可替代任一倡議面向，每套限一張。完成「情緒、參與、關係、意義、成就」五正各一張並比出指定手勢，可兌換健康幣。</li><li>第一次成套：任務卡較多 5 枚，倡議卡較多 4 枚；第二次 6 / 5 枚；第三次 7 / 6 枚。四樂卡視為倡議卡。</li><li>任一玩家完成第三套，遊戲結束，全體比較健康幣數量，最多者勝；幣數相同則並列。</li></ol><h3>幸福心臟病</h3><ol><li>只使用 80 張任務與倡議五正卡，洗牌並平均分給玩家。</li><li>依序喊「情緒、參與、關係、意義、成就」，每喊一次翻一張卡。</li><li>喊出的面向與翻出的卡相同時，立刻搶拍。最後拍、拍錯或喊錯的玩家收走桌上所有卡，並開始下一回合。</li><li>最先出完手牌且再完成一回合、沒有被罰收卡的玩家獲勝。</li><li>線上版四角「拍」鍵可供同桌就近操作，但不自動判定最後一位；由教師確認後登記收牌者。</li></ol><div class="notice">教學提醒：個人情緒、自我理解與生命經驗沒有唯一標準答案。同儕認證重點是確認活動是否完成，而不是評判分享內容。</div><div class="actions">${btn('回到首頁','home','teal')}</div></article>`}
function library(){const subset=CARDS.filter(c=>typeFilter==='all'||c.type===typeFilter);return `<div class="subsection"><h2>📚 原版卡牌圖鑑</h2><select id="filter-type" class="select-control" style="width:190px">${[['all','全部 112 張'],['task','任務 40 張'],['advocacy','倡議 40 張'],['fourjoy','四樂 16 張'],['magic','魔法 16 張']].map(([v,n])=>`<option value="${v}" ${typeFilter===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="library-grid">${subset.map(c=>`<div class="library-item">${art(c.id,'', 'view')}<p>${E(c.effect||c.category)} · ${E(TYPE[c.type])}</p></div>`).join('')}</div>`}
function overlay(){return viewCard&&CARD_BY_ID[viewCard]?`<div class="modal-shade" data-act="close-view"><div class="modal" role="dialog" aria-label="原版卡面預覽">${art(viewCard,'large', 'noop')}${btn('關閉卡面','close-view','small')}</div></div>`:''}
function render(){app.innerHTML=`<main class="app-shell">${header()}${page==='home'?home():page==='setup'?setup():page==='play'&&game?(game.kind==='main'?mainPage():icePage()):page==='library'?library():rules()}</main>${overlay()}`;document.body.classList.toggle('reduced-motion',!motion);refreshFullscreenButton()}
function goto(target){page=target;viewCard=null;focusPanel=null;selectedCard=null;render();window.scrollTo({top:0,behavior:'instant'})}
function start(){if(preferFullscreen)requestFullscreen();const names=[...document.querySelectorAll('.player-name')].map(x=>x.value.trim());game=mode==='main'?newGame(names):newIce(names);veil=game.kind==='main';chosen=[];selectedCard=null;focusPanel=null;persist();goto('play')}
function submitMagic(){const eff=CARD_BY_ID[game.pending].effect;const v=id=>document.getElementById(id)?.value;const selection={};if(['水晶球','隱身斗篷'].includes(eff))selection.target=Number(v('magic-target'));if(['護身符','隱身斗篷'].includes(eff))selection.category=v('magic-cat');if(eff==='飛天掃帚'){selection.first=Number(v('magic-first'));selection.second=Number(v('magic-second'));}commit(()=>resolveMagic(game,selection));}
function registerSlap(corner){if(!game||game.kind!=='ice'||game.ended||!game.last){toast('請先翻開卡牌');return}slapCount++;slapCorner=corner;document.querySelectorAll('.slap-button').forEach(b=>b.classList.toggle('slap-active',b.dataset.corner===corner));const status=document.querySelector('.ice-slap-status');if(status)status.textContent=`已拍 ${slapCount} 次 · 請依現場結果登記最後拍到或犯規者`; }
function penaltyDialog(){if(!game.center.length){toast('目前牌桌尚未翻牌');return}const labels=game.players.map(p=>`${p.id+1}. ${p.name}`).join('\n');const input=prompt(`請輸入收牌玩家的號碼：\n${labels}`);if(input===null)return;const n=Number(input)-1;if(!game.players[n]){toast('請輸入有效的玩家號碼');return;}const type=prompt('原因：1 最後拍到、2 拍錯、3 喊錯','1');if(type===null)return;const reason=({'1':'最後拍到','2':'拍錯','3':'喊錯'})[type];if(!reason){toast('請輸入 1、2 或 3');return;}slapCorner=null;slapCount=0;commit(()=>icePenalty(game,n,reason))}
// Presentation-only FLIP motion: changes no game state and never blocks input.
function motionEnabled(){return motion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function flyCardClone(sourceRect,source,selector){
 if(!sourceRect||!source||!motionEnabled())return;
 const target=document.querySelector(selector);if(!target)return;
 const targetRect=target.getBoundingClientRect();
 const flight=source.cloneNode(true);flight.removeAttribute('data-act');flight.removeAttribute('id');flight.removeAttribute('draggable');flight.setAttribute('aria-hidden','true');flight.tabIndex=-1;
 flight.className='art v13-flying-card';flight.style.width=sourceRect.width+'px';flight.style.height=sourceRect.height+'px';flight.style.left=sourceRect.left+'px';flight.style.top=sourceRect.top+'px';flight.style.backgroundPosition=source.style.backgroundPosition;
 document.body.appendChild(flight);
 const dx=targetRect.left+targetRect.width/2-(sourceRect.left+sourceRect.width/2),dy=targetRect.top+targetRect.height/2-(sourceRect.top+sourceRect.height/2);
 const sx=targetRect.width/sourceRect.width,sy=targetRect.height/sourceRect.height;
 try{const anim=flight.animate([{transform:'translate(0,0) scale(1) rotate(-3deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy}) rotate(3deg)`,opacity:0.22}],{duration:420,easing:'cubic-bezier(.18,.8,.21,1)',fill:'forwards'});anim.finished.catch(()=>{}).finally(()=>flight.remove());}
 catch(e){flight.remove()}
}
function performCardPlay(id,source){
 const element=source||[...app.querySelectorAll('.focus-hand-cards .art[data-id],.focus-card-preview .art[data-id]')].find(x=>x.dataset.id===id);
 const rect=element?.getBoundingClientRect();const clone=element?.cloneNode(true);
 const previousPhase=game?.phase;
 commit(()=>play(game,id));
 if(previousPhase==='choose'&&game.phase==='confirm')flyCardClone(rect,clone,'.v13-action-card');
}
function flyBackFromDeck(){
 if(!motionEnabled())return;
 const source=document.querySelector('.v13-main-back'),target=document.querySelector('.v13-seat.is-current');if(!source||!target)return;
 const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();
 const ghost=source.cloneNode(true);ghost.className='v13-card-back v13-main-back v13-draw-flight';ghost.setAttribute('aria-hidden','true');ghost.style.width=from.width+'px';ghost.style.height=from.height+'px';ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';document.body.appendChild(ghost);
 const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
 try{ghost.animate([{transform:'translate(0,0) rotate(-8deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(8deg) scale(.55)`,opacity:0}],{duration:460,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>ghost.remove())}catch(e){ghost.remove()}
}
app.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
 if(a==='noop'){e.stopPropagation();return}if(a==='toggle-fullscreen'){inFullscreen()?exitFullscreen():requestFullscreen();return}if(a==='home'){goto('home');return}if(a==='rules'){goto('rules');return}if(a==='library'){goto('library');return}
 if(a==='view'){viewCard=id;render();return}if(a==='close-view'){viewCard=null;render();return}
 if(a==='focus-menu'||a==='focus-collections'||a==='focus-log'){focusPanel=a.slice(6);if(focusPanel==='collections')focusPlayer=game?.turn||0;render();return}
 if(a==='focus-close'){if(e.target.closest('.focus-drawer')&&e.target.dataset.act!=='focus-close')return;focusPanel=null;render();return}
 if(a==='focus-player'){focusPlayer=Number(b.dataset.player);render();return}
 if(a==='focus-clear-select'){selectedCard=null;render();return}
 if(a==='toggle-sound'){soundOn=!soundOn;try{localStorage.setItem('tg-sound-enabled',String(soundOn))}catch(e){}if(soundOn)fx.sound('collect');render();return}
 if(a==='toggle-motion'){motion=!motion;try{localStorage.setItem('tg-motion-enabled',String(motion))}catch(e){}if(!motion)fx.stop();render();return}
 if(a==='focus-confirm-play'){if(!selectedCard)return;const playing=selectedCard;selectedCard=null;performCardPlay(playing,app.querySelector('.focus-card-preview .art'));return}
 if(a==='setup-main'||a==='setup-ice'){mode=a==='setup-ice'?'ice':'main';size=4;goto('setup');return}
 if(a==='start'){start();return}if(a==='resume'){if(preferFullscreen)requestFullscreen();game=load();if(!game){toast('找不到可用的存檔');return;}veil=game.kind==='main'&&game.phase==='choose';goto('play');return}
 if(a==='unlock'){veil=false;render();return}
 if(a==='play'){if(Date.now()<suppressPlayClickUntil)return;if(game?.kind==='main'&&game.phase==='choose'){selectedCard=id;render();return}commit(()=>play(game,id));return}if(a==='complete-yes'||a==='complete-no'){commit(()=>{complete(game,a==='complete-yes');chosen=[]});return}
 if(a==='magic-go'){submitMagic();return}if(a==='magic-skip'){commit(()=>resolveMagic(game,{skip:true}));return}
 if(a==='set-submit'){commit(()=>{const cards=chosen.length?chosen:availableSets(active(game))[0];if(!validSet(active(game),cards))throw Error('成套卡牌需要五個不同面向');exchangeSet(game,cards);chosen=[]});return}
 if(a==='set-delay'){commit(()=>{delaySet(game);chosen=[]});return}
 if(a==='pass'){commit(()=>{pass(game);selectedCard=null;veil=game.phase==='choose'});if(game?.kind==='main'&&!game.ended)flyBackFromDeck();return}
 if(a==='undo'){if(!game||!game.history?.length){toast('沒有可以復原的步驟');return}commit(()=>{undo(game);selectedCard=null;focusPanel=null;veil=game.kind==='main'&&game.phase==='choose'},{silent:true});return}
 if(a==='end'){if(!confirm('確定結束並結算目前的遊戲嗎？'))return;commit(()=>game.kind==='main'?finish(game):iceFinish(game,null));return}
 if(a==='restart'){mode=game?.kind==='ice'?'ice':'main';size=game?.players?.length||4;goto('setup');return}
 if(a==='ice-flip'){slapCount=0;slapCorner=null;commit(()=>iceFlip(game));return}if(a==='ice-slap'){if(Date.now()-lastSlapPointerAt>500)registerSlap(b.dataset.corner);return}if(a==='ice-penalty'){penaltyDialog();return}
});
app.addEventListener('change',e=>{if(e.target.id==='people-count'){size=Number(e.target.value);render();}if(e.target.id==='filter-type'){typeFilter=e.target.value;render();}if(e.target.id==='fullscreen-pref'){setFullscreenPreference(e.target.checked);}});

// V1.4: one Pointer Events implementation for mouse, touch and pen.
// Click = preview, deliberate pull (>= 45px) + release = immediate play anywhere.
// Native HTML Drag and Drop is disabled so it cannot compete for a mouse drag.
function canDragCard(node){return node?.matches?.('.focus-hand-cards .art[data-act="play"]')&&page==='play'&&game?.kind==='main'&&game.phase==='choose'&&!veil}
function dropCard(id,source){
 if(!game||game.kind!=='main'||game.phase!=='choose'||veil||!active(game).hand.includes(id)){
  toast('這張卡目前無法出牌');return;
 }
 selectedCard=null;performCardPlay(id,source);
}
function clearPointerDrag(){
 const d=pointerDrag;if(!d)return;
 pointerDrag=null;
 d.ghost?.remove();d.source?.classList.remove('drag-source');
 app.querySelector('.v13-hand-fan')?.classList.remove('is-dragging');
 document.body.classList.remove('v14-card-dragging','v14-ready-to-play');
 if(d.source?.hasPointerCapture?.(d.pointerId)){
  try{d.source.releasePointerCapture(d.pointerId)}catch(e){}
 }
}
app.addEventListener('dragstart',e=>{if(e.target.closest?.('.focus-hand-cards .art'))e.preventDefault()});
app.addEventListener('pointerdown',e=>{
 const slap=e.target.closest?.('.slap-button');
 if(slap){lastSlapPointerAt=Date.now();registerSlap(slap.dataset.corner);return}
 const card=e.target.closest?.('.focus-hand-cards .art[data-act="play"]');
 if(!canDragCard(card)||e.button!==0||pointerDrag)return;
 pointerDrag={id:card.dataset.id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,source:card,ghost:null,moved:false};
 try{card.setPointerCapture(e.pointerId)}catch(err){}
});
app.addEventListener('pointermove',e=>{
 const d=pointerDrag;if(!d||d.pointerId!==e.pointerId)return;
 d.lastX=e.clientX;d.lastY=e.clientY;
 const distance=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);
 if(!d.moved&&distance<12)return;
 if(!d.moved){
  d.moved=true;d.source.classList.add('drag-source');
  app.querySelector('.v13-hand-fan')?.classList.add('is-dragging');
  document.body.classList.add('v14-card-dragging');
  d.ghost=d.source.cloneNode(true);d.ghost.removeAttribute('draggable');
  d.ghost.classList.add('touch-drag-ghost','v14-drag-ghost');
  d.ghost.style.transform='translate(-50%, -50%) rotate(-5deg) scale(1.08)';
  document.body.appendChild(d.ghost);
 }
 e.preventDefault();
 d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
 document.body.classList.toggle('v14-ready-to-play',distance>=45);
},{passive:false});
app.addEventListener('pointerup',e=>{
 const d=pointerDrag;if(!d||d.pointerId!==e.pointerId)return;
 const distance=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);
 const doPlay=d.moved&&distance>=45;
 const id=d.id,origin=d.source;
 if(d.moved){e.preventDefault();suppressPlayClickUntil=Date.now()+800}
 clearPointerDrag();
 if(doPlay)dropCard(id,origin);
});
app.addEventListener('pointercancel',clearPointerDrag);
app.addEventListener('lostpointercapture',e=>{if(pointerDrag?.pointerId===e.pointerId)clearPointerDrag()});
window.addEventListener('blur',clearPointerDrag);

const probe=new Image();probe.onerror=()=>document.body.classList.add('no-art');probe.onload=()=>document.body.classList.remove('no-art');probe.src='./assets/cards-atlas.webp';
render();