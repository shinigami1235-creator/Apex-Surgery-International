// Builds the deployable WordPress theme from the design.
//   node wordpress/tools/build-theme.mjs
// 1. Copies site/assets (styles, scripts, fonts, images, feature modules) into the theme, leaving out the
//    design's data files, since WordPress serves the content itself.
// 2. Writes the interface wording (i18n.js) and the icon set (icons.js) as JSON for the PHP templates.
// 3. Writes the design's content for both languages as JSON for `wp apex import`.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {execSync} from 'child_process';
import {fileURLToPath} from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = path.join(ROOT, 'site');
const THEME = path.join(ROOT, 'wordpress/theme/apex-surgery');
const IMPORT = path.join(ROOT, 'wordpress/import');

const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const run = files => {
  const ctx = {window:{}}; ctx.window.APEX = {}; ctx.APEX = ctx.window.APEX; ctx.ICONS = undefined;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx;
};

// 1. assets
const SKIP = new Set(['data']);
const dest = path.join(THEME, 'assets');
fs.rmSync(dest, {recursive:true, force:true});
let copied = 0;
for (const f of walk(path.join(SITE, 'assets'))) {
  const rel = path.relative(path.join(SITE, 'assets'), f);
  if (SKIP.has(rel.split(path.sep)[0])) continue;
  if (/\/build\//.test(rel) || /\.py$/.test(rel)) continue;     // mesh build scripts stay in the design repo
  const out = path.join(dest, rel);
  fs.mkdirSync(path.dirname(out), {recursive:true});
  fs.copyFileSync(f, out);
  copied++;
}

// 2. wording and icons
fs.mkdirSync(path.join(THEME, 'data'), {recursive:true});
const i18n = run([path.join(SITE, 'assets/js/i18n.js')]).APEX.I18N;
fs.writeFileSync(path.join(THEME, 'data/i18n.json'), JSON.stringify(i18n));
const icons = run([path.join(SITE, 'assets/js/icons.js')]).window.ICONS || run([path.join(SITE, 'assets/js/icons.js')]).ICONS;
fs.writeFileSync(path.join(THEME, 'data/icons.json'), JSON.stringify(icons));

// 3. content
fs.mkdirSync(IMPORT, {recursive:true});
for (const lang of ['en', 'th']) {
  const D = run(walk(path.join(SITE, 'assets/data', lang)).filter(f => f.endsWith('.js'))).APEX._d;
  fs.writeFileSync(path.join(IMPORT, `content-${lang}.json`), JSON.stringify(D));
  console.log(lang, Object.keys(D).length, 'content files');
}
fs.copyFileSync(path.join(ROOT, '_source/crawl.json'), path.join(IMPORT, 'old-urls.json'));
// titles and descriptions of the pages that have no data file of their own (kept in build.py for the design)
fs.writeFileSync(path.join(IMPORT, 'meta.json'), execSync(`python3 -c "import json,build; print(json.dumps(build.META, ensure_ascii=False))"`, {cwd:ROOT}));
// the theme carries its own copy, so `wp apex import` runs on the server without the design repo
fs.rmSync(path.join(THEME, 'import'), {recursive:true, force:true});
fs.cpSync(IMPORT, path.join(THEME, 'import'), {recursive:true});
console.log('copied', copied, 'asset files; wrote i18n.json, icons.json');

// 4. the zip IT uploads under Appearance › Themes
const DIST = path.join(ROOT, 'wordpress/dist');
fs.mkdirSync(DIST, {recursive:true});
fs.rmSync(path.join(DIST, 'apex-surgery-theme.zip'), {force:true});
execSync('zip -qr ../dist/apex-surgery-theme.zip apex-surgery -x "*/.DS_Store"', {cwd:path.join(ROOT, 'wordpress/theme')});
console.log('wrote wordpress/dist/apex-surgery-theme.zip');

