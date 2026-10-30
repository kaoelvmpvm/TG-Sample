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
 assert.match(html,/style\.css\?v=1\.9\.2/);
 assert.match(html,/app\.js\?v=1\.9\.2/);
});
