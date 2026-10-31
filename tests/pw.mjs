// Playwright for the tests: the copy installed for this machine, or the one PLAYWRIGHT points at.
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const tryLoad = p => { try { return require(p); } catch (e) { return null; } };
const pw = [process.env.PLAYWRIGHT, 'playwright', '/opt/npm-tools/node_modules/playwright'].filter(Boolean).map(tryLoad).find(Boolean);
if (!pw) throw new Error('Playwright not found. Run npm install playwright, or set PLAYWRIGHT to its folder.');
export const {chromium} = pw;
// the design preview, served with: cd site && python3 -m http.server 8765
export const SITE = (process.env.SITE_URL || 'http://localhost:8765/').replace(/\/?$/, '/');
