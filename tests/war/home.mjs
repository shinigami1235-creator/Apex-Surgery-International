import {chromium} from '../pw.mjs';
const b = await chromium.launch();
for (const [w,h,n] of [[1400,900,'d'],[390,800,'m']]) {
  const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage();
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.rv,.rv-clip,.rv-rail').forEach(e => e.classList.add('in','on','shown')); document.querySelector('.war-home').scrollIntoView(); });
  await p.waitForTimeout(800);
  await p.screenshot({path:process.argv[2] + '/home-band-' + n + '.png'});
  await p.close();
}
await b.close();
