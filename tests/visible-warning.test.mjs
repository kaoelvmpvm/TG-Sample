import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js', import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css', import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');
test('red border itself flashes increasingly fast during last three seconds',()=>{
 assert.match(app,/class="ice-visible-warning-frame"/);
 assert.match(app,/const warning=reaction&&rem<=3000/);
 assert.match(app,/alertFrame\.hidden=!warning/);
 assert.match(app,/alertFrame\.dataset\.speed=/);
 assert.match(css,/@keyframes ice-v192-border-flash/);
 assert.match(css,/43%,100%\{border-color:rgba\(255,40,52,\.12\)/);
 assert.match(css,/0%,42%\{border-color:#ff2434/);
 assert.match(css,/data-speed="fast"\]\{animation-duration:\.48s/);
 assert.match(css,/data-speed="urgent"\]\{animation-duration:\.22s/);
});
test('four directional flip controls exist but only the current seat may start flipping',()=>{
 assert.match(app,/class="ice-seat-flip/);
 assert.match(app,/data-act="ice-flip" data-corner="\$\{side\}"/);
 assert.match(app,/sideId===game\.turn/);
 assert.doesNotMatch(app,/class="flip-button" data-act="ice-flip"/);
});
test('busted asset query versions',()=>{
 assert.match(html,/style\.css\?v=1\.9\.3/);
 assert.match(html,/app\.js\?v=1\.9\.3/);
});

test('heart-game CSS stays top-level and its four positions remain distinct',()=>{
 const depth=source=>{
  let count=0;
  for(const char of source){
   if(char==='{')count++;
   if(char==='}'){count--;assert.ok(count>=0,'unexpected CSS closing brace')}
  }
  return count;
 };
 assert.equal(depth(css),0,'CSS braces must be balanced');
 for(const marker of ['/* V1.8:','/* V1.9:','/* V1.9.1:','/* V1.9.2:']){
  const idx=css.indexOf(marker);
  assert.ok(idx>=0,'missing section '+marker);
  assert.equal(depth(css.slice(0,idx)),0,marker+' accidentally nested under earlier @media');
 }
 assert.match(css,/grid-template-areas:.*left center right/);
 for(const side of ['top','right','bottom','left']){
  assert.ok(css.includes('.ice-v19-seat-'+side+'{grid-area:'+side+'}'),'seat '+side+' not positioned');
 }
 assert.match(css,/\.ice-v19-penalty-box\{/);
 assert.match(css,/\.ice-seat-flip\{/);
});
