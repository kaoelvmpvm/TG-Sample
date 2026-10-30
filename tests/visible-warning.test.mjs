import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js', import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css', import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');
test('red frame remains visible throughout final three seconds',()=>{
 assert.match(app,/class="ice-visible-warning-frame"/);
 assert.match(app,/const warning=reaction&&rem<=3000/);
 assert.match(app,/alertFrame\.hidden=!warning/);
 assert.match(css,/\.ice-visible-warning-frame\{[^}]*border:7px solid #ff313f/);
 assert.match(css,/\.ice-visible-warning-frame\[hidden\]\{display:none!important\}/);
 assert.match(css,/@keyframes ice-v191-glow/);
});
test('new version URLs bypass stale browser CSS/JS',()=>{
 assert.match(html,/style\.css\?v=1\.9\.1/);
 assert.match(html,/app\.js\?v=1\.9\.1/);
});