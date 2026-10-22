// Opens every edit screen in wp-admin as an editor would, saves it without changing anything, then checks
// with `wp apex check` that the content is still exactly the design's. Also reports blocks the block
// editor considers invalid (it would show "This block contains unexpected content").
//   WP_PASS_FILE=... node tests/wordpress/admin.mjs [http://localhost:8080] [only-type]
import {createRequire} from 'module';
import {execSync} from 'child_process';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const ONLY = process.argv[3] || '';
const WP = process.env.WP_PATH || '/home/claude/wp/site';
const USER = process.env.WP_USER || 'apexadmin';
const PASS = fs.readFileSync(process.env.WP_PASS_FILE, 'utf8').trim();
const wp = c => execSync(`wp --allow-root --path=${WP} ${c}`, {encoding:'utf8'});

const types = ['page', 'apex_service', 'post', 'apex_episode', 'apex_offer', 'apex_case', 'apex_branch', 'apex_doctor'].filter(t => !ONLY || t === ONLY);
const ids = types.flatMap(t => wp(`post list --post_type=${t} --post_status=publish --format=ids`).trim().split(/\s+/).filter(Boolean).map(id => [t, +id]));

const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1400, height:1000}});
await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(p.url() + ' ' + e.message));
await p.goto(BASE + '/wp-login.php');
await p.fill('#user_login', USER);
await p.fill('#user_pass', PASS);
await Promise.all([p.waitForNavigation(), p.click('#wp-submit')]);
if (!p.url().includes('/wp-admin')) { console.log('login failed'); process.exit(1); }

let invalid = 0, saved = 0;
for (const [t, id] of ids) {
  await p.goto(`${BASE}/wp-admin/post.php?post=${id}&action=edit`, {waitUntil:'domcontentloaded'});
  const block = await p.waitForFunction(() => (window.wp && wp.data && wp.data.select('core/editor') && wp.data.select('core/block-editor').getBlocks().length >= 0 && document.querySelector('.editor-header, .edit-post-header')) || document.querySelector('#publish, #save-post'), null, {timeout:30000}).then(() => p.evaluate(() => !!document.querySelector('.editor-header, .edit-post-header')));
  if (block) {
    // wait for the editor to finish parsing the content
    await p.waitForFunction(() => wp.data.select('core/editor').__unstableIsEditorReady ? wp.data.select('core/editor').__unstableIsEditorReady() : true, null, {timeout:30000}).catch(() => {});
    const bad = await p.evaluate(() => {
      const out = [];
      const walk = bs => bs.forEach(x => { if (x.isValid === false) out.push(x.name + ': ' + (x.originalContent || '').slice(0, 120)); walk(x.innerBlocks || []); });
      walk(wp.data.select('core/block-editor').getBlocks());
      return out;
    });
    if (bad.length) { invalid += bad.length; console.log(`INVALID ${t} ${id}: ${bad.length}\n   ${bad.slice(0, 3).join('\n   ')}`); }
    await p.evaluate(() => wp.data.dispatch('core/editor').savePost());
    await p.waitForFunction(() => !wp.data.select('core/editor').isSavingPost() && !(wp.data.select('core/edit-post').isSavingMetaBoxes && wp.data.select('core/edit-post').isSavingMetaBoxes()), null, {timeout:30000, polling:200});
    await p.waitForTimeout(400);
    const err = await p.evaluate(() => { const n = wp.data.select('core/notices').getNotices().find(n => n.status === 'error'); return n ? n.content : ''; });
    if (err) errors.push(`${t} ${id} save: ${err}`);
  } else {
    const nav = await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded', timeout:30000}), p.click('#publish')]).then(() => true, () => false);
    if (!nav) {
      const why = await p.evaluate(() => [...document.querySelectorAll('#post :invalid')].map(e => e.name + ': ' + e.validationMessage).join('; '));
      errors.push(`${t} ${id}: the form did not submit ${why}`);
      continue;
    }
    if (!(await p.$('#message.updated, .notice-success'))) errors.push(`${t} ${id}: no "updated" notice`);
  }
  saved++;
}
// settings and wording pages, both languages
for (const page of ['apex-settings', 'apex-wording']) for (const l of ['en', 'th']) {
  await p.goto(`${BASE}/wp-admin/admin.php?page=${page}&lang=${l}`);
  await Promise.all([p.waitForNavigation(), p.click('#submit')]);
  if (!(await p.$('.notice-success'))) errors.push(`${page} ${l}: not saved`);
  saved++;
}
await b.close();
const check = (() => { try { return wp('apex check'); } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); } })();
console.log(check.trim().split('\n').slice(-25).join('\n'));
errors.forEach(e => console.log('ERROR ' + e));
console.log(`saved ${saved} screens, ${invalid} invalid blocks, ${errors.length} errors`);
process.exit(invalid || errors.length || !/All \d+ content objects match/.test(check) ? 1 : 0);
