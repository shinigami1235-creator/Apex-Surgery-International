/* node shot.mjs <labpage> [query] [setupJS]  -> screenshots at 375x812 and 1440x900 */
import { chromium } from 'playwright';
const [page0, query = '', setup = ''] = process.argv.slice(2);
const OUT = '/home/claude/apex-surgery/_shots/features6';
const b = await chromium.launch();
for (const [w, hgt] of [[375, 812], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  if (setup) { await p.goto(`http://localhost:8765/lab/${page0}.html`); await p.evaluate(setup); }
  await p.goto(`http://localhost:8765/lab/${page0}.html${query}`);
  await p.waitForTimeout(900);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  if (sw > w) console.log('HSCROLL', w, sw);
  const name = `${OUT}/${page0}${query.includes('lang=th') ? '-th' : ''}-${w}.png`;
  await p.screenshot({ path: name, fullPage: true });
  console.log(name);
  await ctx.close();
}
await b.close();
