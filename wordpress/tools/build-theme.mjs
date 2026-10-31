// Builds the deployable WordPress theme from the design.
//   node wordpress/tools/build-theme.mjs
// 1. Copies site/assets (styles, scripts, fonts, images, feature modules) into the theme, leaving out the
//    design's data files, since WordPress serves the content itself.
// 2. Writes the interface wording (i18n.js) and the icon set (icons.js) as JSON for the PHP templates.
// 3. Writes the design's content for both languages as JSON for `wp apex import`, into the theme's import folder.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {execSync} from 'child_process';
import crypto from 'crypto';
import {fileURLToPath} from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = path.join(ROOT, 'site');
const THEME = path.join(ROOT, 'wordpress/theme/apex-surgery');
const IMPORT = path.join(THEME, 'import');   // inside the theme, so `wp apex import` runs on the server without the design repo

const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const run = files => {
  const ctx = {window:{}}; ctx.window.APEX = {}; ctx.APEX = ctx.window.APEX; ctx.ICONS = undefined;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx;
};

// 1. assets
// Every relative import in the feature modules gets ?v=<build>, the same version the page puts on each module's
// entry file (window.APEX_V), so a browser that keeps files for a year still fetches the new copy of every file
// after an update. The version is a hash of the files, so it changes only when one of them does.
const SKIP = new Set(['data']);
const dest = path.join(THEME, 'assets');
const files = walk(path.join(SITE, 'assets')).filter(f => {
  const rel = path.relative(path.join(SITE, 'assets'), f);
  return !SKIP.has(rel.split(path.sep)[0]) && !/\/build\//.test(rel) && !/\.py$/.test(rel);   // mesh build scripts stay in the design repo
}).sort();
const hash = crypto.createHash('sha1');
for (const f of files) hash.update(path.relative(SITE, f)).update(fs.readFileSync(f));
const VER = hash.digest('hex').slice(0, 10);
const REL = /((?:\bfrom\s*|\bimport\s*\(?\s*|new URL\(\s*)(['"]))(\.{1,2}\/[^'"?]+?\.js)\2/g;
fs.rmSync(dest, {recursive:true, force:true});
let copied = 0;
for (const f of files) {
  const rel = path.relative(path.join(SITE, 'assets'), f);
  const out = path.join(dest, rel);
  fs.mkdirSync(path.dirname(out), {recursive:true});
  if (rel.startsWith('features' + path.sep) && rel.endsWith('.js')) fs.writeFileSync(out, fs.readFileSync(f, 'utf8').replace(REL, (m, pre, q, p) => `${pre}${p}?v=${VER}${q}`));
  else fs.copyFileSync(f, out);
  copied++;
}

// 2. wording and icons
fs.mkdirSync(path.join(THEME, 'data'), {recursive:true});
const i18n = run([path.join(SITE, 'assets/js/i18n.js')]).APEX.I18N;
fs.writeFileSync(path.join(THEME, 'data/i18n.json'), JSON.stringify(i18n));
const icons = run([path.join(SITE, 'assets/js/icons.js')]).window.ICONS || run([path.join(SITE, 'assets/js/icons.js')]).ICONS;
fs.writeFileSync(path.join(THEME, 'data/icons.json'), JSON.stringify(icons));
fs.writeFileSync(path.join(THEME, 'data/version.txt'), VER);

// 3. content
fs.rmSync(IMPORT, {recursive:true, force:true});
fs.mkdirSync(IMPORT, {recursive:true});
for (const lang of ['en', 'th']) {
  const D = run(walk(path.join(SITE, 'assets/data', lang)).filter(f => f.endsWith('.js'))).APEX._d;
  fs.writeFileSync(path.join(IMPORT, `content-${lang}.json`), JSON.stringify(D));
  console.log(lang, Object.keys(D).length, 'content files');
}
// titles and descriptions of the pages that have no data file of their own (kept in build.py for the design)
fs.writeFileSync(path.join(IMPORT, 'meta.json'), execSync(`python3 -c "import json,build; print(json.dumps(build.META, ensure_ascii=False))"`, {cwd:ROOT}));
console.log('copied', copied, 'asset files; wrote i18n.json, icons.json');

// 4. the zip IT uploads under Appearance › Themes. It is not committed (wordpress/dist is in .gitignore):
//    build it here, or download it from the repo's latest GitHub release.
const DIST = path.join(ROOT, 'wordpress/dist');
fs.mkdirSync(DIST, {recursive:true});
fs.rmSync(path.join(DIST, 'apex-surgery-theme.zip'), {force:true});
execSync('zip -qr ../dist/apex-surgery-theme.zip apex-surgery -x "*/.DS_Store"', {cwd:path.join(ROOT, 'wordpress/theme')});
console.log('wrote wordpress/dist/apex-surgery-theme.zip');

