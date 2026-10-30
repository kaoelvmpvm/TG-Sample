import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('one center flip starts the automatic sequence',()=>{
 assert.match(app,/class="ice-center-flip" data-act="ice-flip"/);
 assert.equal((app.match(/data-act="ice-flip"/g)||[]).length,1);
 assert.doesNotMatch(app,/class="ice-seat-flip/);
 assert.match(app,/else if\(mode==='result'\)iceBeginFlip\(\)/);
 assert.match(app,/iceAutoResolve\(game\);persist\(\);iceBeginFlip\(\)/);
});
test('the border accelerates via a CSS custom property',()=>{
 assert.match(app,/const periods=\{normal:'880ms',fast:'480ms',urgent:'220ms'\}/);
 assert.match(app,/alertFrame\.style\.setProperty\('--ice-flash-duration'/);
 assert.match(css,/animation:ice-v192-border-flash var\(--ice-flash-duration,\.88s\)/);
 assert.match(css,/@keyframes ice-v192-border-flash/);
});
test('four seats remain separate and CSS braces are balanced',()=>{
 let n=0;for(const c of css){if(c==='{')n++;if(c==='}')n--;}assert.equal(n,0);
 for(const side of ['top','right','bottom','left'])assert.ok(css.includes('.ice-v19-seat-'+side+'{grid-area:'+side+'}'));
 assert.match(css,/\.ice-v19-penalty-box\{/);
});
test('cached asset versions advance',()=>{
 assert.match(html,/style\.css\?v=1\.9\.4/);
 assert.match(html,/app\.js\?v=1\.9\.4/);
});
