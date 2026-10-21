/* Card illustrations for the games hub: one layered, gently animated SVG scene per game.
   Layers carry class l1 (back), l2 (middle) and l3 (front); the hub moves them at different rates
   on hover for depth. All motion is CSS and stops under prefers-reduced-motion. */

const PROC_ICON = {
  /* 24 x 24 line icons, stroke only, one per procedure */
  facelift: '<path d="M12 3.5c-4 0-6.5 3-6.5 7.2 0 4.6 3 9.3 6.5 9.3s6.5-4.7 6.5-9.3c0-4.2-2.5-7.2-6.5-7.2z"/><path d="M5.8 9.5c1.2-.9 2.2-2.7 2.4-4.4M18.2 9.5c-1.2-.9-2.2-2.7-2.4-4.4"/><path d="M3 12.5l2.2-1.6M21 12.5l-2.2-1.6"/>',
  browlift: '<path d="M4 10.5c2.5-3 6-3.6 8-1.4"/><path d="M20 10.5c-2.5-3-6-3.6-8-1.4"/><path d="M5.5 15c1.6-1.5 4.4-1.5 6 0-1.6 1.5-4.4 1.5-6 0zM12.5 15c1.6-1.5 4.4-1.5 6 0-1.6 1.5-4.4 1.5-6 0z"/><path d="M8 5.5V3M16 5.5V3M6 4l2 1.5M18 4l-2 1.5"/>',
  rhinoplasty: '<path d="M10 3.5c.4 4-1.6 8.6-3.6 11.6-.9 1.4 0 3 1.6 3h1.4c.8 1 2 1.6 3.1 1.6 1.4 0 2.6-.8 3.3-2"/><path d="M8.3 18.1c.3-1 1.1-1.6 2-1.6M15.8 17.8c.3-.9.1-1.8-.5-2.4"/>',
  eyelid: '<path d="M2.5 12.5c2.6-4 6-6 9.5-6s6.9 2 9.5 6c-2.6 4-6 6-9.5 6s-6.9-2-9.5-6z"/><circle cx="12" cy="12.5" r="3.2"/><path d="M4.5 9.2c2.2-3 4.7-4.4 7.5-4.4s5.3 1.4 7.5 4.4"/>',
  breast: '<path d="M4 6c0 5 1.4 8.5 4.2 10.4 1.6 1.1 3.1.6 3.8-.8.7 1.4 2.2 1.9 3.8.8C18.6 14.5 20 11 20 6"/><path d="M8 13.5h.01M16 13.5h.01"/>',
  lipo: '<path d="M8 3.5c-1 3.5-1.4 6 0 8.5 1.6 2.9 1 6-.5 8.5M16 3.5c1 3.5 1.4 6 0 8.5-1.6 2.9-1 6 .5 8.5"/><path d="M10.5 9h3M10 12.5h4M10.5 16h3"/>'
};
export const procIcon = (key, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PROC_ICON[key] || ''}</svg>`;

/* sample a cubic Bezier */
const bez = (p, t) => {
  const u = 1 - t;
  const x = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6];
  const y = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7];
  const dx = 3 * u * u * (p[2] - p[0]) + 6 * u * t * (p[4] - p[2]) + 3 * t * t * (p[6] - p[4]);
  const dy = 3 * u * u * (p[3] - p[1]) + 6 * u * t * (p[5] - p[3]) + 3 * t * t * (p[7] - p[5]);
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / l, ty: dy / l };
};
const f1 = n => Math.round(n * 10) / 10;

function steady(u) {
  const C = [62, 104, 112, 70, 176, 130, 258, 86];
  const d = `M${C[0]} ${C[1]}C${C[2]} ${C[3]} ${C[4]} ${C[5]} ${C[6]} ${C[7]}`;
  let st = '', marks = '';
  for (let i = 0; i < 7; i++) {
    const p = bez(C, 0.1 + i * 0.13), nx = -p.ty, ny = p.tx, k = 9;
    const a = `M${f1(p.x - nx * k)} ${f1(p.y - ny * k)}L${f1(p.x + nx * k)} ${f1(p.y + ny * k)}`;
    st += `<g class="st" style="--i:${i}"><circle cx="${f1(p.x - nx * k)}" cy="${f1(p.y - ny * k)}" r="1.3" fill="#B98378"/><circle cx="${f1(p.x + nx * k)}" cy="${f1(p.y + ny * k)}" r="1.3" fill="#B98378"/><path d="${a}" stroke="#5B3A82" stroke-width="1.5" stroke-linecap="round"/><path d="${a}" stroke="#D9C8F0" stroke-width=".5" stroke-linecap="round" transform="translate(-.4 -.4)"/></g>`;
    marks += `<path d="M${f1(p.x - nx * 14)} ${f1(p.y - ny * 14)}L${f1(p.x - nx * 11)} ${f1(p.y - ny * 11)}M${f1(p.x + nx * 11)} ${f1(p.y + ny * 11)}L${f1(p.x + nx * 14)} ${f1(p.y + ny * 14)}" stroke="#7E4FB0" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs><linearGradient id="${u}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8E3D6"/><stop offset=".55" stop-color="#F0D0BE"/><stop offset="1" stop-color="#E2B7A1"/></linearGradient>
<radialGradient id="${u}h" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${u}n" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C93A3"/><stop offset=".45" stop-color="#F4F6FA"/><stop offset="1" stop-color="#6E7586"/></linearGradient>
<filter id="${u}s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#12051D" flood-opacity=".55"/></filter></defs>
<g class="l1"><rect x="34" y="30" width="252" height="128" rx="22" fill="url(#${u}k)" filter="url(#${u}s)" transform="rotate(-4 160 94)"/>
<rect x="34" y="30" width="252" height="128" rx="22" fill="url(#${u}h)" transform="rotate(-4 160 94)"/></g>
<g class="l2" transform="rotate(-4 160 94)"><path d="${d}" fill="none" stroke="#7E4FB0" stroke-opacity=".5" stroke-width="1.4" stroke-dasharray="1 5" stroke-linecap="round" transform="translate(0 -15)"/>${marks}
<path d="${d}" fill="none" stroke="#D99C93" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#9C5A55" stroke-width="1.3" stroke-linecap="round"/>${st}
<path class="thread" d="${d}" fill="none" stroke="#4B2A6B" stroke-width="1.4" stroke-linecap="round" pathLength="100"/></g>
<g class="l3"><g transform="rotate(-4 160 94)"><g class="needle" style="offset-path:path('${d}')"><path d="M0 0a22 22 0 0 1 -30 -16" fill="none" stroke="url(#${u}n)" stroke-width="3.2" stroke-linecap="round"/><path d="M0 0a22 22 0 0 1 -30 -16" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".8" stroke-linecap="round" transform="translate(.4 -.9)"/></g></g></g>
</svg>`;
}

function proportion(u) {
  /* ink line face on warm paper with thirds guides; the eyes and lips drift off and settle back */
  return `<svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs><linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF4"/><stop offset="1" stop-color="#F3E8DA"/></linearGradient>
<filter id="${u}s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#12051D" flood-opacity=".5"/></filter></defs>
<g class="l1"><rect x="78" y="14" width="164" height="166" rx="16" fill="url(#${u}p)" filter="url(#${u}s)" transform="rotate(3 160 97)"/></g>
<g class="l2" transform="rotate(3 160 97)"><g class="guides" stroke="#A886CD" stroke-width="1" stroke-dasharray="3 4"><path d="M96 74H224M96 100H224M96 124H224M96 158H224"/><path d="M131 64V86M147 64V86M173 64V86M189 64V86"/></g>
<g fill="none" stroke="#2E2140" stroke-width="2" stroke-linecap="round"><path d="M160 32c-30 0-46 22-46 54 0 38 22 72 46 72s46-34 46-72c0-32-16-54-46-54z"/>
<path d="M114 88c-6-3-9 1-8 8 1 9 5 14 10 14M206 88c6-3 9 1 8 8-1 9-5 14-10 14" stroke-width="1.6"/></g>
<g fill="none" stroke="#2E2140" stroke-linecap="round"><path class="br" d="M128 69c6-4 13-5 20-2M172 67c7-3 14-2 20 2" stroke-width="2.4"/>
<g class="ey"><path d="M129 78c5-5 13-5 18 0-5 4-13 4-18 0zM173 78c5-5 13-5 18 0-5 4-13 4-18 0z" stroke-width="1.6"/><circle cx="138" cy="78" r="2.4" fill="#2E2140"/><circle cx="182" cy="78" r="2.4" fill="#2E2140"/></g>
<path class="ns" d="M157 84c-1 10-4 15-6 19 3 3 13 3 17 0-2-4-5-9-6-19" stroke-width="1.5"/>
<g class="lp"><path d="M146 124c5-4 10-4 14-2 4-2 9-2 14 2-5 2-23 2-28 0z" stroke-width="1.6"/><path d="M149 127c6 5 16 5 22 0" stroke-width="1.4"/></g></g></g>
<g class="l3"><circle class="pin" cx="232" cy="40" r="5" fill="#CC3366"/><circle cx="232" cy="40" r="11" fill="none" stroke="#CC3366" stroke-opacity=".35"/></g>
</svg>`;
}

function factrush(u) {
  const lines = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="5" rx="2.5" fill="#D9CCE6"/><rect x="${x}" y="${y + 11}" width="${w * 0.78}" height="5" rx="2.5" fill="#E7DDF0"/><rect x="${x}" y="${y + 22}" width="${w * 0.55}" height="5" rx="2.5" fill="#E7DDF0"/>`;
  return `<svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs><filter id="${u}s" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#12051D" flood-opacity=".5"/></filter>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9B3DD" stop-opacity="0"/><stop offset="1" stop-color="#C9B3DD" stop-opacity=".6"/></linearGradient>
<linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#F6F0FA"/></linearGradient></defs>
<g class="l1"><g transform="rotate(-9 120 100)"><rect x="70" y="44" width="110" height="110" rx="16" fill="#E9DDF3" filter="url(#${u}s)"/>${lines(86, 98, 76)}</g></g>
<g class="l2"><g transform="rotate(-2 150 96)"><rect x="98" y="38" width="112" height="112" rx="16" fill="url(#${u}c)" filter="url(#${u}s)"/><circle cx="120" cy="62" r="11" fill="#F1EAF7"/>${lines(114, 86, 80)}</g></g>
<g class="l3"><g class="swing"><path class="trail" d="M120 78h70v84h-70z" fill="url(#${u}t)" opacity=".0"/>
<rect x="150" y="34" width="116" height="116" rx="16" fill="url(#${u}c)" filter="url(#${u}s)"/>
<circle cx="174" cy="58" r="12" fill="#F1EAF7"/><g transform="translate(166 50) scale(.68)" stroke="#6A388C" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${PROC_ICON.eyelid}</g>
${lines(166, 84, 84)}<g class="ok"><circle cx="252" cy="44" r="15" fill="#6A388C"/><path d="M245 44l5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>
</svg>`;
}

function recoverysort(u) {
  let rib = '';
  for (let i = 0; i < 16; i++) rib += `<path d="M${-20 + i * 24} 0l-14 34" />`;
  const caps = [['#C9B3DD', 70], ['#A886CD', 160], ['#CC3366', 250]];
  return `<svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs><linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2268"/><stop offset="1" stop-color="#25093A"/></linearGradient>
<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6DAF2"/><stop offset=".5" stop-color="#8C6BB0"/><stop offset="1" stop-color="#3B1858"/></linearGradient>
<linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></linearGradient>
<clipPath id="${u}c"><path d="M30 46h260l-14 34H44z"/></clipPath>
<filter id="${u}s" x="-30%" y="-30%" width="160%" height="190%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#0C0216" flood-opacity=".6"/></filter></defs>
<g class="l1"><path d="M30 46h260l-14 34H44z" fill="url(#${u}b)"/><g clip-path="url(#${u}c)"><g class="ribs" stroke="#C9B3DD" stroke-opacity=".22" stroke-width="2" transform="translate(0 46)">${rib}</g></g>
<rect x="40" y="80" width="232" height="8" rx="4" fill="url(#${u}r)"/><circle cx="44" cy="84" r="6" fill="url(#${u}r)"/><circle cx="272" cy="84" r="6" fill="url(#${u}r)"/></g>
<g class="l2"><g class="ride"><rect x="0" y="0" width="64" height="38" rx="9" fill="#fff" filter="url(#${u}s)"/><rect x="9" y="10" width="34" height="5" rx="2.5" fill="#A886CD"/><rect x="9" y="21" width="44" height="5" rx="2.5" fill="#E2D6EE"/></g></g>
<g class="l3">${caps.map(([c, x], i) => `<g class="cap" style="--i:${i}"><rect x="${x - 38}" y="116" width="76" height="40" rx="20" fill="${c}" fill-opacity=".9" filter="url(#${u}s)"/><rect x="${x - 38}" y="116" width="76" height="40" rx="20" fill="url(#${u}g)"/><rect x="${x - 22}" y="133" width="44" height="6" rx="3" fill="#fff" fill-opacity=".85"/></g>`).join('')}
<path d="M108 136h14M198 136h14" stroke="#C9B3DD" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/></g>
</svg>`;
}

function memorymatch(u) {
  let cards = '';
  const W = 54, H = 66;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x = 58 + c * (W + 10), y = 20 + r * (H + 10), i = r * 4 + c;
    const flip = i === 1 || i === 6;
    cards += `<g class="${flip ? 'fl' : ''}" style="--i:${i};transform-origin:${x + W / 2}px ${y + H / 2}px">
<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="9" fill="url(#${u}k)" filter="url(#${u}s)"/><rect x="${x + 4}" y="${y + 4}" width="${W - 8}" height="${H - 8}" rx="6" fill="url(#${u}l)" stroke="#C9B3DD" stroke-opacity=".45"/>
<path d="M${x + W / 2} ${y + H / 2 - 9}l7 9-7 9-7-9z" fill="none" stroke="#F1EAF7" stroke-opacity=".8" stroke-width="1.4"/>
${flip ? `<g class="face"><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="9" fill="#fff"/><g transform="translate(${x + W / 2 - 10} ${y + 14}) scale(.84)" stroke="#6A388C" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PROC_ICON[i === 1 ? 'rhinoplasty' : 'eyelid']}</g><rect x="${x + 10}" y="${y + 44}" width="${W - 20}" height="4" rx="2" fill="#D9CCE6"/><rect x="${x + 14}" y="${y + 52}" width="${W - 28}" height="4" rx="2" fill="#E7DDF0"/></g>` : ''}</g>`;
  }
  return `<svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs><linearGradient id="${u}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7B45A0"/><stop offset="1" stop-color="#3F1B55"/></linearGradient>
<pattern id="${u}l" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#5A2A7A"/><path d="M0 0h10M0 0v10" stroke="#C9B3DD" stroke-opacity=".28" stroke-width="1"/></pattern>
<filter id="${u}s" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#0C0216" flood-opacity=".55"/></filter></defs>
<g class="l2">${cards}</g>
</svg>`;
}

function learn(u) {
  return `<svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs><filter id="${u}s" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#12051D" flood-opacity=".45"/></filter></defs>
<g class="l1"><rect x="96" y="40" width="140" height="118" rx="16" fill="#E9DDF3" filter="url(#${u}s)" transform="rotate(6 166 99)"/></g>
<g class="l2"><rect x="84" y="30" width="146" height="124" rx="16" fill="#fff" filter="url(#${u}s)"/>
<rect x="102" y="52" width="58" height="16" rx="8" fill="#F1EAF7"/><rect x="102" y="80" width="108" height="6" rx="3" fill="#D9CCE6"/><rect x="102" y="93" width="92" height="6" rx="3" fill="#D9CCE6"/><rect x="102" y="106" width="64" height="6" rx="3" fill="#E7DDF0"/>
<rect x="102" y="124" width="50" height="18" rx="9" fill="none" stroke="#C9B3DD" stroke-width="1.5"/><rect x="160" y="124" width="50" height="18" rx="9" fill="#6A388C"/></g>
<g class="l3"><g class="ok"><circle cx="236" cy="40" r="16" fill="#CC3366"/><path d="M228 40l6 6 10-11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
<g fill="#F1EAF7"><circle cx="102" cy="168" r="3"/><circle cx="114" cy="168" r="3"/><circle cx="126" cy="168" r="3" fill-opacity=".5"/><circle cx="138" cy="168" r="3" fill-opacity=".5"/></g></g>
</svg>`;
}

const SCENES = { steady, proportion, factrush, recoverysort, memorymatch, learn };
let uid = 0;
export function artSVG(id) {
  const fn = SCENES[id];
  return fn ? fn('ga' + (++uid) + id.slice(0, 2)) : '';
}
