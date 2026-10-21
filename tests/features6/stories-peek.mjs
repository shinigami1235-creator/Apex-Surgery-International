import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w, hh] of [[375, 812], [1440, 900]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: hh } })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/lab/stories.html');
  await p.waitForSelector('.s-th');
  await p.waitForTimeout(800);
  await p.screenshot({ path: `/home/claude/apex-surgery/_shots/features6/stories-${w}.png` });
  await p.click('.s-th >> nth=2');
  await p.waitForTimeout(1500);
  console.log(w, await p.evaluate(() => ({ state: document.querySelector('.apxs-v').dataset.state, slides: document.querySelectorAll('.v-slide').length, n: document.querySelectorAll('.s-th').length })));
  await p.screenshot({ path: `/home/claude/apex-surgery/_shots/features6/stories-viewer-${w}.png` });
}
await b.close();
