# Tests

Run these six before every release. Each one ends with a non-zero exit code when something fails.

| Test | What it checks | Needs |
|---|---|---|
| `node tests/logic.mjs` | The trip planner for every procedure, the games' daily tries and Bangkok midnight, country pricing, the WhatsApp and LINE numbers the tools send to, and dates in My Plan for a visitor outside Thailand | Nothing |
| `node tests/implants/volumes.mjs` | Each breast implant is added at its true volume | Nothing |
| `node tests/shell/langs.mjs` | Every page in English and Thai: no missing files or script errors, the language switch, old `/en/` and `nose.html` links forward | The preview on port 8765 |
| `node tests/filler/site.mjs` | The filler simulator's totals, 3D head and saved image on a phone, a tablet and a desktop | The preview on port 8765 |
| `node tests/wordpress/ssr.mjs` | Every WordPress page matches what the design draws, section by section | The local WordPress site |
| `WP_PASS_FILE=<file> node tests/wordpress/flows.mjs` | Enquiries and photos, vouchers and reception, roles, passwords, redirects, the access log, and a patient's data export and erasure | The local WordPress site and its admin password in a file |

Serve the preview with `cd site && python3 -m http.server 8765`, or set `SITE_URL` to another address. The WordPress tests use `http://localhost:8080` (pass another address as the first argument), `WP_PATH` for the WordPress folder (default `/home/claude/wp/site`) and `WP_USER` for the admin login (default `apex-admin`).

Playwright comes from the copy installed on the machine, or the folder in `PLAYWRIGHT`. The other folders hold one-off checks and screenshot scripts from earlier rounds.
