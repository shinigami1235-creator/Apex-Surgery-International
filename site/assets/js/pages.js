/* Apex Surgery Hospital: page renderers. Each page is chosen by <body data-page>. */
(function(){
  const A = window.APEX;
  const E = A.esc, T = A.t, I = A.ic, IMG = A.img;
  const ytIds = a => (a || []).filter(id => /^[\w-]{6,20}$/.test(String(id)));   // the same check as the PHP render
  const main = () => A.qs('#main');

  /* the procedures, in menu order, and each one's recovery timeline: both edited on the service in WordPress
     (Services › the service › Recovery timeline), so a service Apex adds later joins every list on its own */
  const svcCats = () => ((A.d('shared') || {}).services || []).map(s => s.key).filter(Boolean);
  const recovOf = (S, k) => (((S.services || []).find(x => x.key === k) || {}).recovery || []).filter(r => r && (r.w || r.x)).map(r => [r.w || '', r.x || '']);

  const svcName = (S, k) => { const s = (S.services || []).find(x => x.key === k); return s ? (s.short || s.name) : k; };

  /* ---------- photos for pages and articles that have none of their own: Apex's operating room, rooms and counter ---------- */
  const PH = {
    orTable: ['img/apex/or-table.webp', 'The operating table at Apex Surgery Hospital', 'เตียงผ่าตัดที่ Apex Surgery Hospital'],
    or: ['img/hospital/bkk-or.webp', 'The operating room, Phloen Chit', 'ห้องผ่าตัด สาขาเพลินจิต'],
    orEquip: ['img/apex/or-equipment.webp', 'Equipment beside the operating table at Apex', 'เครื่องมือข้างเตียงผ่าตัดที่ Apex'],
    orUnit: ['img/apex/or-unit.webp', 'A surgical unit in the Apex operating room', 'เครื่องมือผ่าตัดในห้องผ่าตัดของ Apex'],
    orLight: ['img/apex/or-light.webp', 'The operating light and equipment at Apex', 'โคมไฟผ่าตัดและเครื่องมือที่ Apex'],
    renuvion: ['img/apex/renuvion.webp', 'The Renuvion (J-Plasma) generator at Apex', 'เครื่อง Renuvion (J-Plasma) ที่ Apex'],
    room: ['img/hospital/bkk-room.webp', 'A patient room, Phloen Chit', 'ห้องพักผู้ป่วย สาขาเพลินจิต'],
    room2: ['img/hospital/hkt-room2.webp', 'A patient room with a view, Phuket', 'ห้องพักผู้ป่วยวิวเมือง สาขาภูเก็ต'],
    counter: ['img/hospital/bkk-counter.webp', 'Consultation counter, Phloen Chit', 'เคาน์เตอร์ปรึกษา สาขาเพลินจิต'],
    recovery: ['img/hospital/bkk-recovery.webp', 'Recovery chairs, Phloen Chit', 'เก้าอี้พักฟื้น สาขาเพลินจิต']
  };
  const ph = k => { const p = PH[k]; return p ? {src:p[0], alt:A.lang === 'th' ? p[2] : p[1]} : null; };
  const SVC_PHOTOS = {facelift:['orTable', 'room'], browlift:['orLight', 'recovery'], rhinoplasty:['or', 'counter'], eyelid:['orUnit', 'room2'], bone:['orTable', 'counter'], breast:['or', 'room'], lipo:['renuvion', 'orEquip']};
  const POST_PHOTOS = {
    smas:['orTable', 'room', 'counter'], 'deep-plane-face-lift':['or', 'recovery'], 'rhinoplasty-faq-questions':['counter', 'orTable'], 'double-eyelid-surgery-facts':['orUnit', 'room2'], 'facelift-faq':['orTable', 'counter', 'room'], 'endotine-browlift-fact':['orLight', 'recovery'], 'mentor-vs-motiva-breast-augmentation':['counter', 'or'], 'forehead-lift-endotine':['orLight', 'orTable', 'counter'], 'liposuction-facts':['renuvion', 'orEquip'], 'nose-surgery-without-silicone':['or', 'counter'], 'breast-augmentation-guide':['counter', 'or', 'room'], 'endotine-browlift':['orLight', 'counter']
  };
  const procOf = s => {
    s = String(s || '');
    if (/lipo|ดูดไขมัน|เหนียง|double chin/i.test(s)) return 'lipo';   // the V-Line offers are double chin liposuction
    if (/breast|หน้าอก|motiva|mentor/i.test(s)) return 'breast';
    if (/brow|forehead|endotine|คิ้ว|หน้าผาก/i.test(s)) return 'browlift';
    if (/rhino|nose|จมูก/i.test(s)) return 'rhinoplasty';
    if (/eyelid|double eye|eye bag|ptosis|ตาสองชั้น|ทำตา|ถุงใต้ตา/i.test(s)) return 'eyelid';
    if (/facial bone|genioplasty|jaw (reduction|surgery)|v-line|โครงหน้า|กระดูกคาง|ตัดกราม|ขากรรไกร/i.test(s)) return 'bone';
    if (/face ?lift|smas|deep plane|ดึงหน้า|ยกกระชับ/i.test(s)) return 'facelift';
    return null;
  };
  /* sentences or clauses of the client's own text, used verbatim for pull quotes */
  const clauses = t => A.lang === 'th' ? String(t).split(/\s+/).filter(Boolean) : String(t).split(/(?<!\b(?:[Dd]r|[Nn]o|Mr|Ms|Mrs|St|vs|approx|e\.g|i\.e)\.)(?<=[.!?])\s+(?=[A-Z“"0-9])/);
  const pickQuote = (paras, skipFirst=true) => {
    const pool = [];
    paras.forEach((p, pi) => clauses(p).forEach((c, ci) => { c = c.trim(); if (skipFirst && pi === 0 && ci === 0) return; if (A.lang === 'th' && /^(ก็|และ|ซึ่ง|เพราะ|โดย|ที่|หรือ|แต่|จึง|ทำให้|เพื่อ|ด้วย|รวมถึง|ไม่ว่า|อีกทั้ง|นอกจาก|จะ|ได้|เป็น|คือ|ให้)/.test(c)) return; if (c.length >= 45 && c.length <= 190) pool.push(c); }));
    if (!pool.length) return '';
    return pool.sort((a, b) => Math.abs(a.length - 120) - Math.abs(b.length - 120))[0];
  };
  const spoken = paras => {
    const out = [];
    paras.forEach(p => { (String(p).match(/[“"]([^”"“]{30,200})[”"]/g) || []).forEach(q => out.push(q.slice(1, -1).trim())); });
    return out.sort((a, b) => Math.abs(a.length - 110) - Math.abs(b.length - 110));
  };
  const pullQuote = (q, cls='') => q ? `<figure class="pq rv ${cls}"><span class="pq-mark" aria-hidden="true">${I('quote')}</span><blockquote><p>${E(q)}</p></blockquote></figure>` : '';
  const readMins = text => Math.max(1, Math.round(A.lang === 'th' ? text.length / 800 : text.split(/\s+/).length / 230));

  /* icon for a card, matched from the client's own label */
  const ICON_RULES = [
    [/smok|nicotine|บุหรี่/i, 'ban'], [/expect|คาดหวัง/i, 'target'], [/weight|น้ำหนัก/i, 'weight'], [/exercis|ออกกำลัง/i, 'dumbbell'],
    [/aged|\b40\b|อายุ/i, 'hourglass'], [/localized fat|fat |ไขมันสะสม|ไขมันเฉพาะ/i, 'ruler'], [/health|underlying|สุขภาพ|โรคประจำตัว/i, 'heart-pulse'], [/elastic|skin|ผิว/i, 'sparkles'],
    [/revision|previous|เคยทำ|แก้ไข/i, 'repeat'], [/nostril|ปีกจมูก/i, 'scan-face'], [/tip|ปลายจมูก/i, 'pen'], [/dimension|bridge|สันจมูก|มิติ/i, 'scan-face'],
    [/structur|crooked|hump|โครงสร้าง/i, 'layers'], [/eyelid|eye|ตา/i, 'eye'], [/surgeon|team|doctor|ศัลยแพทย์|ทีมแพทย์|แพทย์/i, 'stethoscope'],
    [/anesth|วิสัญญี|ดมยา/i, 'syringe'], [/technolog|technique|implant|เทคนิค|เทคโนโลยี|ซิลิโคน/i, 'cpu'], [/standard|operating room|safety|มาตรฐาน|ห้องผ่าตัด|ปลอดภัย/i, 'shield-check'],
    [/warrant|ประกัน|รับประกัน/i, 'award'], [/design|shape|ออกแบบ|รูปทรง/i, 'pen'], [/care|ดูแล/i, 'heart'], [/natural|ธรรมชาติ/i, 'smile'],
    [/experience|ประสบการณ์/i, 'award'], [/instructor|teach|อาจารย์/i, 'book-open'], [/found|ก่อตั้ง/i, 'building-2'], [/consult|ที่ปรึกษา/i, 'users'],
    [/speaker|chair|วิทยากร/i, 'message-circle'], [/protocol|โปรโตคอล/i, 'clipboard-check'], [/specialist|เชี่ยวชาญ/i, 'badge-check']
  ];
  const FALLBACK_IC = ['sparkles', 'badge-check', 'gem', 'heart', 'shield-check', 'smile'];
  const pickIcon = (t, i) => (ICON_RULES.find(([r]) => r.test(t)) || [0, FALLBACK_IC[i % FALLBACK_IC.length]])[1];
  const splitLabel = x => { const m = String(x).match(/^([^:]{2,90}?)\s?:\s(.+)$/s); return m && !/https?$/.test(m[1]) ? [m[1].trim(), m[2].trim()] : [null, String(x)]; };
  /* liposuction areas: a small figure with the treated zone lit */
  const AREA_Y = [[/abdomen|ท้อง/i, 47, 0], [/upper arm|แขน/i, 36, 13], [/thigh|ต้นขา/i, 66, 6], [/waist|back|เอว|หลัง/i, 42, 9], [/chin|jaw|คาง/i, 14, 0], [/hip|buttock|สะโพก|ก้น/i, 56, 9], [/calf|calves|น่อง/i, 84, 5]];
  const areaFig = t => {
    const a = AREA_Y.find(([r]) => r.test(t));
    if (!a) return null;
    const [, y, dx] = a;
    const dots = dx ? `<circle cx="${30 - dx}" cy="${y}" r="5.5"/><circle cx="${30 + dx}" cy="${y}" r="5.5"/>` : `<circle cx="30" cy="${y}" r="6"/>`;
    return `<svg class="area-fig" viewBox="0 0 60 100" aria-hidden="true"><path class="af-body" d="M30 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-9 18h18c4 0 7 3 8 7l5 24c.4 2-1 3.6-3 3.6-1.4 0-2.6-1-3-2.4L42 38v20l3 38c.1 2-1.4 3.6-3.4 3.6-1.8 0-3.2-1.3-3.4-3l-4-34h-4l-4 34c-.2 1.7-1.6 3-3.4 3-2 0-3.5-1.6-3.4-3.6l3-38V38l-4 16.2c-.4 1.4-1.6 2.4-3 2.4-2 0-3.4-1.6-3-3.6l5-24c1-4 4-7 8-7Z"/><g class="af-dot">${dots}</g></svg>`;
  };
  const figure = (img, cls='', par=true) => img && img.src ? `<figure class="xfig ${cls} ${img.un ? 'un' : 'own'} rv-clip"><span class="xfig-in ph-img">${(() => { const g = A.gallery([{src:img.src, alt:img.alt}]); return `<button type="button" class="xfig-btn" ${g.attr(0)} aria-label="${E(img.alt || T('image'))}"><img src="${IMG(img.src)}" alt="${E(img.alt || '')}" loading="lazy"${par ? ' data-par="28"' : ''}></button>`; })()}</span>${img.un ? `<figcaption>${E(T('photoCredit'))}</figcaption>` : ''}</figure>` : '';

  /* a service section: rich cards for lists, numbered steps for h3/p sequences, with a side photo */
  const svcSection = (sec, i, key, alt) => {
    const bl = sec.blocks || [];
    const firstStruct = bl.findIndex(b => b.t === 'list' || b.t === 'h3');
    const lead = bl.slice(0, firstStruct < 0 ? bl.length : firstStruct).filter(b => b.t === 'p').map(b => b.x);
    const tail = firstStruct < 0 || bl.some(b => b.t === 'h3') ? [] : (() => { let k = bl.length; while (k > 0 && bl[k - 1].t === 'p') k--; return k > firstStruct ? bl.slice(k).map(b => b.x) : []; })();
    const h3n = bl.filter(b => b.t === 'h3').length;
    let body = '';
    if (h3n >= 3) {
      const steps = [];
      bl.forEach((b, j) => { if (b.t === 'h3') steps.push({h:b.x, p:[]}); else if (b.t === 'p' && steps.length && j > firstStruct) steps[steps.length - 1].p.push(b.x); });
      body = `<ol class="steps">${steps.map((s, j) => `<li class="step rv" data-d="${(j % 3) * 70}"><span class="step-n" aria-hidden="true">${String(j + 1).padStart(2, '0')}</span><div class="step-b"><h3>${E(s.h)}</h3>${s.p.map(p => `<p>${A.inl(p)}</p>`).join('')}</div></li>`).join('')}</ol>`;
    } else {
      const items = bl.filter(b => b.t === 'list').flatMap(b => (b.items || []).map(x => x.x || x));
      const isAreas = key === 'lipo' && items.length >= 4 && items.filter(x => areaFig(splitLabel(x)[0] || x)).length >= items.length - 1;
      body = `<ul class="who-grid${items.length % 3 === 1 && items.length > 3 ? ' odd' : ''}${isAreas ? ' areas' : ''}">${items.map((x, j) => {
        const [lab, txt] = splitLabel(x);
        const art = isAreas ? (areaFig(lab || x) || `<span class="wc-ic">${I(pickIcon(x, j))}</span>`) : `<span class="wc-ic">${I(pickIcon(lab || x, j))}</span>`;
        return `<li class="who-card rv" data-d="${(j % 3) * 60}">${art}${lab ? `<h3>${E(lab)}</h3><p>${A.inl(txt)}</p>` : `<p class="${txt.length < 90 ? 'wc-solo' : 'wc-long'}">${A.inl(txt)}</p>`}</li>`;
      }).join('')}</ul>`;
    }
    const pic = (SVC_PHOTOS[key] || [])[i] ? ph(SVC_PHOTOS[key][i]) : null;
    return `<section class="section svc-sec${alt ? ' washed' : ''}" id="sec-${i}">
      <div class="wrap">
        <div class="ss-head${pic ? ' has-pic' : ''}"><div class="ss-copy"><h2 class="h-l rv">${E(sec.h || '')}</h2>${lead.map(p => `<p class="lead rv">${A.inl(p)}</p>`).join('')}</div>${pic ? figure(pic, 'ss-pic') : ''}</div>
        ${body}
        ${tail.length ? `<div class="ss-tail rv">${tail.map(p => `<p>${A.inl(p)}</p>`).join('')}</div>` : ''}
      </div></section>`;
  };

  /* ---------- small builders ---------- */
  const phead = (h, lead, crumbs, extra='') => `<section class="phead"><div class="phead-lines" aria-hidden="true"></div><div class="wrap">${crumbs ? A.crumbs(crumbs) : ''}<h1 class="display-s rv">${E(h)}</h1>${lead ? `<p class="lead rv" data-d="80" style="max-width:62ch;margin-top:20px">${E(lead)}</p>` : ''}${extra}</div></section>`;
  const homeCrumb = () => [T('home'), 'index.html'];
  const chips = (items, on) => `<div class="chips" role="group" aria-label="${E(T('filter'))}">${items.map(([k, x]) => `<button type="button" class="chip" data-k="${E(k)}" aria-pressed="${k === on}">${E(x)}</button>`).join('')}</div>`;
  const bindChips = (root, fn) => root.addEventListener('click', e => { const c = e.target.closest('.chip[data-k]'); if (!c) return; A.qsa('.chip[data-k]', c.parentElement).forEach(b => b.setAttribute('aria-pressed', b === c)); fn(c.dataset.k); });
  const reviewRail = (items, id) => {
    const g = A.gallery(items.map(i => ({src:i.src, alt:i.alt || ''})));
    return `<div class="rail rv-rail" id="${id}">${items.map((r, i) => `<button type="button" class="ba-card ph-img" ${g.attr(i)} data-cat="${E(r.cat || '')}" aria-label="${E(T('baOpen'))} ${i + 1}"><img src="${IMG(r.src)}" alt="${E(r.alt || '')}" loading="lazy" decoding="async" decoding="async"></button>`).join('')}</div>`;
  };
  /* review videos: the stories module renders them as a swipe viewer; until it exists, a plain rail */
  const storiesHost = (videos, id='stories', title) => `<div class="stories-host" id="${id}" data-videos='${E(JSON.stringify(videos || []))}' data-title="${E(title || '')}">${videoRail(videos)}</div>`;
  const videoRail = videos => `<div class="rail vid-rail">${(videos || []).map((v, i) => `<button type="button" class="vid-card" data-vid="${E(v)}" aria-label="${E(T('playVideo'))} ${i+1}"><span class="pl">${I('play')}</span></button>`).join('')}</div>`;
  const mountStories = async (el, extra={}, now) => {
    if (!el) return;
    // the review videos are the heaviest part of a page, so nothing loads until the section is close to the screen
    if (!now && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); mountStories(el, extra, true); } }, {rootMargin:'500px 0px'});
      io.observe(el); return;
    }
    const videos = JSON.parse(el.dataset.videos || '[]').map(v => IMG(v));
    try {
      const m = await import(A.vurl(A.assets + 'features/stories/index.js'));
      el.innerHTML = ''; el.classList.add('feat-on');
      m.mount(el, A.featureOpts(Object.assign({videos, title:false, layout:'reels'}, extra)));
    } catch (e) { /* keep the plain rail */ }
  };
  // How each procedure's before/after composites are split: lr = before left, after right; tb = before on top; single = a collage shown whole
  const BA_LAYOUT = {facelift:'lr', rhinoplasty:'lr', lipo:'lr', bone:'single', eyelid:'tb', breast:'tb', browlift:'single'};
  /* before/after cases: facts come only from each composite's filename and the patient's own review post */
  const BA_STORY = {DeePathama:['deep-plane-facelift-review-by-dy', 'Deep Plane Facelift'], TopFacelift:['dfl-review-khun-top', 'DFL facelift'], Wanna:['facelift-review-by-wanna', ''], Som:['dfl-review-by-som', 'DFL facelift'], 'กู๊ดดี้':['motiva-ergonomix-breast-augmentation-review-by-goody', 'Motiva Ergonomix']};
  const BA_AREA = [[/ต้นขา/, 'Thighs', 'ต้นขา'], [/ต้นแขน/, 'Upper arms', 'ต้นแขน'], [/หน้าท้อง|ท้อง/, 'Abdomen', 'หน้าท้อง'], [/กรอบหน้า/, 'Face contour', 'กรอบหน้า'], [/เหนียง/, 'Double chin', 'เหนียง'], [/FaceNeck/i, 'Face and neck', 'ใบหน้าและลำคอ'], [/eye-bag/i, 'Under-eye bags', 'ถุงใต้ตา']];
  const BA_L = {tech:['Technique', 'เทคนิค'], area:['Area', 'บริเวณ'], follow:['Follow-up', 'ติดตามผล']};
  const baL = k => BA_L[k][A.lang === 'th' ? 1 : 0];
  const baCases = (list, S, opts={}) => {
    const P = A.d('posts') || [];
    const cases = list.map(x => {
      const src = typeof x === 'string' ? x : x.src;
      const cat = (typeof x === 'string' ? opts.cat : x.cat) || opts.cat;
      let file = String(src).split('/').pop();
      try { file = decodeURIComponent(file); } catch (e) { /* keep raw */ }
      const facts = [];
      const st = Object.keys(BA_STORY).find(k => file.includes(k));
      const post = st && P.find(p => p.key === BA_STORY[st][0]);
      const tech = (st && BA_STORY[st][1]) || (/J-Plasma/i.test(file) ? 'J-Plasma' : '');
      if (tech) facts.push([baL('tech'), tech]);
      const ar = BA_AREA.find(([r]) => r.test(file));
      if (ar) facts.push([baL('area'), A.lang === 'th' ? ar[2] : ar[1]]);
      const fm = file.match(/(\d{1,2})([MY])(?=[_\-.]|$)/);
      if (fm) facts.push([baL('follow'), A.lang === 'th' ? `${fm[1]} ${fm[2] === 'Y' ? 'ปี' : 'เดือน'}` : `${fm[1]} ${fm[2] === 'Y' ? (fm[1] === '1' ? 'year' : 'years') : (fm[1] === '1' ? 'month' : 'months')}`]);
      const eyeBag = /eye-bag/i.test(file);
      const procName = eyeBag ? (A.lang === 'th' ? 'ผ่าตัดถุงใต้ตา' : 'Eye bag surgery') : svcName(S, cat);
      const msg = A.lang === 'th' ? `สวัสดี ขอสอบถามเรื่อง${procName} จากเคสก่อนและหลังบนเว็บไซต์ Apex Surgery Hospital` : `Hello, I would like to ask about ${procName.toLowerCase()} after seeing a before and after case on the Apex Surgery Hospital website.`;
      const links = [];
      if (cat === 'rhinoplasty') links.push({x:T('noseTry'), url:'nose-implants.html'});
      if (!opts.onService) links.push({x:T('seeService'), url:A.svcUrl(cat)});
      return {src:/^img\//.test(src) ? IMG(src) : src, cat, layout:(typeof x === 'object' && x.layout) || BA_LAYOUT[cat] || 'single', procName, facts, story:post ? {title:post.title, url:A.postUrl(post.key)} : null,
        ask:{line:`https://line.me/R/oaMessage/${A.contact().line}/?${encodeURIComponent(msg)}`, wa:`${A.WA.h}?text=${encodeURIComponent(msg)}`}, links};
    });
    return cases.filter(c => c.story).concat(cases.filter(c => !c.story));
  };
  const mountShowcase = async (el, cases, extra={}) => {
    if (!el || !cases.length) return;
    // the wall waits until it is near the screen, so its photos do not compete with the top of the page
    if ('IntersectionObserver' in window) await new Promise(go => { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, {rootMargin:'600px 0px'}); io.observe(el); });
    try {
      const m = await import(A.vurl(A.assets + 'features/compare/showcase.js'));
      el.innerHTML = ''; el.classList.add('feat-on');
      m.mount(el, A.featureOpts(Object.assign({cases, vary:T('resultsVary')}, extra)));
    } catch (e) { console.warn('[apex] showcase', e); }
  };
  const baGrid = (imgs, cap) => {
    const g = A.gallery(imgs.map(s => ({src:s})));
    return `<div class="ba-grid">${imgs.map((s, i) => `<button type="button" class="ba-tile ph-img rv" data-d="${(i%6)*50}" ${g.attr(i)}><img src="${IMG(s)}" alt="${E(cap || 'Before / After')} ${i+1}" loading="lazy" decoding="async" decoding="async"></button>`).join('')}</div>`;
  };
  const postCard = (p, i=0, big) => `<a class="post-card rv${big ? ' big' : ''}" data-d="${(i%3)*70}" href="${A.postUrl(p.key)}" data-cat="${E(p.cat || '')}" data-new="post:${E(p.key)}">
    <span class="pc-ph ph-img"><img src="${IMG(p.img)}" alt="" loading="lazy" decoding="async" decoding="async"></span>
    <span class="pc-meta"><span class="pc-cat">${E(T({review:'catReview', blog:'catBlog', news:'catNews'}[p.cat] || 'articles'))}</span>${p.date ? `<time datetime="${E(p.date)}">${E(A.fmtDate(p.date))}</time>` : ''}</span>
    <span class="pc-title">${E(p.title)}</span>${p.excerpt || p.desc ? `<span class="pc-ex">${E(p.excerpt || p.desc)}</span>` : ''}</a>`;
  /* ---------- offers: names, tags and prices come only from the poster's alt text, filename and price field ---------- */
  const OFFER_WORDS = [[/Mentor/i, 'Mentor'], [/Motiva/i, 'Motiva'], [/MemoryGel/i, 'MemoryGel'], [/Endotine/i, 'Endotine'], [/LipoSlim/i, 'LipoSlim'], [/J-?Plasma/i, 'J-Plasma'], [/V-?Line/i, 'V-Line'], [/Facial/i, 'Facial']];
  const OFFER_AREA = [[/หน้าท้อง|abdominal/i, 'Abdomen', 'หน้าท้อง'], [/เหนียง|double chin/i, 'Double chin', 'เหนียง']];
  const offerOf = (p, S, cat0) => {
    let file = String(p.src || '').split('/').pop();
    try { file = decodeURIComponent(file); } catch (e) { /* raw */ }
    const text = (p.alt || '') + ' ' + file;
    const cat = p.cat || procOf(text) || cat0;
    const words = [...new Set(OFFER_WORDS.filter(([r]) => r.test(text)).map(w => w[1]))];
    const area = OFFER_AREA.find(([r]) => r.test(text));
    if (area) words.push(A.lang === 'th' ? area[2] : area[1]);
    const name = cat ? svcName(S, cat) : (words.shift() || T('promotions'));
    const price = +p.price || +((file.match(/(?:^|[-_ ])(\d{5,6})(?=[-_ .])/) || [])[1]) || 0;
    const allIn = /จ่ายจบ|เหมา|all-in/i.test(text);
    const review = /case-review/i.test(text);
    const label = name + (words.length ? ' · ' + words.join(' · ') : '');
    const priceTxt = price ? `${A.fmtNum(price)} ${T('baht')}` : '';
    const msg = (A.lang === 'th' ? `สวัสดี ขอสอบถามโปรโมชั่น ${label}` : `Hello, I would like to ask about this offer: ${label}`) + (priceTxt ? ` (${priceTxt})` : '') + (A.lang === 'th' ? '' : '.');
    return {key:file, src:p.src, alt:p.alt || label, cat, name, words, price, allIn, review, label,
      line:`https://line.me/R/oaMessage/${A.contact().line}/?${encodeURIComponent(msg)}`, wa:`${A.WA.h}?text=${encodeURIComponent(msg)}`};
  };
  const fxSpan = thb => `<span class="apx-price op-fx" data-thb="${thb}" data-lang="${A.lang}"><span class="apx-fx" hidden></span><small>${E(T('approx'))}</small></span>`;
  const offerTags = o => `${o.allIn ? `<span class="o-tag hot">${E(T('allIn'))}</span>` : ''}${o.review ? `<span class="o-tag">${E(T('reviewCase'))}</span>` : ''}`;
  /* data-offer and the rest let the country price lists find each offer (features/pricing) */
  const offerData = o => `data-offer="${E(o.key)}" data-price="${o.price}" data-name="${E(o.name)}" data-label="${E(o.label)}" data-new="offer:${E(o.key)}"`;
  const offerCard = (o, i, g) => `<article class="offer rv" data-d="${(i % 4) * 60}" data-cat="${E(o.cat || '')}" ${offerData(o)}>
      <button type="button" class="offer-img ph-img" ${g.attr(i)} aria-label="${E(T('image'))}: ${E(o.label)}"><img src="${IMG(o.src)}" alt="${E(o.alt)}" loading="lazy" decoding="async" decoding="async"><span class="o-zoom" aria-hidden="true">${I('arrow-up-right')}</span></button>
      <div class="offer-body">
        <div class="o-tags">${o.cat && o.words.length ? `<span class="o-proc">${E(o.name)}</span>` : ''}${offerTags(o)}</div>
        <h3 class="o-title">${E(o.cat ? (o.words.join(' · ') || o.name) : o.label)}</h3>
        <div class="o-price">${o.price ? `<span class="op-row"><b class="op-n">${E(A.fmtNum(o.price))}</b><span class="op-u">${E(T('baht'))}</span></span>${fxSpan(o.price)}` : `<span class="op-ask">${I('message-circle')}${E(T('askPrice'))}</span>`}</div>
        <div class="o-acts"><span class="o-ask">${E(T('askOffer'))}</span>
          <a class="o-btn ln" href="${A.url(o.line)}" target="_blank" rel="noopener" aria-label="${E(T('askOffer'))}: LINE">${I('line')}<span>LINE</span></a>
          <a class="o-btn wa" href="${A.url(o.wa)}" target="_blank" rel="noopener" aria-label="${E(T('askOffer'))}: WhatsApp">${I('whatsapp')}<span>WhatsApp</span></a>
          ${o.cat ? `<a class="o-more" href="${A.svcUrl(o.cat)}">${E(T('seeService'))} ${I('arrow-right')}</a>` : ''}</div>
      </div></article>`;
  const gameCard = () => `<a class="offer offer-game rv" href="play.html"><span class="og-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="og-ic">${I('sparkles')}</span><b class="h-s">${E(T('gameTie'))}</b><span class="og-p">${E(T('gamesP'))}</span><span class="btn btn-light btn-sm">${E(T('gamesCta'))} ${I('arrow-right')}</span></a>`;
  const promoGrid = (items, S, opts={}) => {
    S = S || A.d('shared') || {};
    const offers = items.map(p => offerOf(p, S, opts.cat));
    const g = A.gallery(offers.map(o => ({src:o.src, alt:o.alt})));
    return `<div class="offer-grid${offers.length + (opts.game ? 1 : 0) <= 2 ? ' few' : ''}">${offers.map((o, i) => offerCard(o, i, g)).join('')}${opts.game ? gameCard() : ''}</div>`;
  };
  const offerSpot = (p, S) => {
    const o = offerOf(p, S);
    const g = A.gallery([{src:o.src, alt:o.alt}]);
    return `<div class="offer-spot rv" ${offerData(o)}>
      <div class="os-media"><button type="button" class="os-card ph-img" ${g.attr(0)} aria-label="${E(T('image'))}: ${E(o.label)}"><img src="${IMG(o.src)}" alt="${E(o.alt)}" loading="lazy" decoding="async" decoding="async"><span class="os-glare" aria-hidden="true"></span></button></div>
      <div class="os-body">
        <p class="os-kick">${E(T('featuredOffer'))}</p>
        <h3 class="os-title">${E(o.name)}</h3>
        <div class="o-tags">${o.words.map(w => `<span class="o-tag">${E(w)}</span>`).join('')}${offerTags(o)}</div>
        ${o.price ? `<div class="os-price"><span class="op-row"><b class="os-n" data-count="${o.price}">${E(A.fmtNum(o.price))}</b><span class="op-u">${E(T('baht'))}</span></span>${fxSpan(o.price)}</div>` : `<p class="os-ask">${I('message-circle')}${E(T('askPrice'))}</p>`}
        <div class="os-pick" data-cur-picker></div>
        <p class="os-ask-l">${E(T('askOffer'))}</p>
        <div class="os-acts"><a class="o-btn ln lg" href="${A.url(o.line)}" target="_blank" rel="noopener">${I('line')}<span>LINE</span></a><a class="o-btn wa lg" href="${A.url(o.wa)}" target="_blank" rel="noopener">${I('whatsapp')}<span>WhatsApp</span></a>${o.cat ? `<a class="btn btn-ghost btn-sm os-more" href="${A.svcUrl(o.cat)}">${E(T('seeService'))} ${I('arrow-right')}</a>` : ''}</div>
        <p class="note">${E(T('promosSub'))}</p>
      </div></div>`;
  };
  /* country prices, currency, count-up and tilt for offers */
  const bindOffers = async root => {
    if (!root) return;
    try {
      const C = await import(A.vurl(A.assets + 'features/currency/index.js'));
      A.qsa('[data-cur-picker]', root).forEach(el => C.picker(el, {lang:A.lang, onEvent:(n, d) => A.emit(n, d)}));
      C.refresh(root);
      import(A.vurl(A.assets + 'features/pricing/index.js')).then(P => P.bind(root, {lang:A.lang, t:T, ic:I, fmtNum:A.fmtNum, img:IMG, gal:A._gal,
        rest:A.ssr ? A.rest : '', multi:!!A.pricing, rates:C, emit:(n, d) => A.emit(n, d)})).catch(() => { /* Thailand's prices stay */ });
    } catch (e) { /* prices stay in baht */ }
    A.qsa('.os-n[data-count]', root).forEach(el => {
      const to = +el.dataset.count;
      if (A.reduced || !('IntersectionObserver' in window)) return;
      /* the real price stays in the markup; it only counts up once the number is on screen,
         and a timer puts the final figure back if animation frames never run (background tab) */
      const io = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting)) return; io.disconnect();
        const t0 = performance.now(), d = 1300;
        const step = now => { const k = Math.min(1, (now - t0) / d), v = 1 - Math.pow(1 - k, 4); el.textContent = A.fmtNum(Math.round(to * v / 10) * 10 || 0); if (k < 1) requestAnimationFrame(step); else el.textContent = A.fmtNum(to); };
        requestAnimationFrame(step); setTimeout(() => { el.textContent = A.fmtNum(to); }, d + 400); }, {threshold:.6});
      io.observe(el);
    });
    if (!A.reduced && matchMedia('(hover:hover) and (pointer:fine)').matches) A.qsa('.os-media', root).forEach(m => {
      const c = A.qs('.os-card', m);
      m.addEventListener('pointermove', e => { const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 12).toFixed(2)}deg) translateZ(0)`; c.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%'); c.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%'); });
      m.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
    A.qsa('.o-btn,.os-acts a', root).forEach(a => a.addEventListener('click', () => A.emit('promo:ask', {channel:a.classList.contains('wa') ? 'whatsapp' : 'line'})));
  };
  const chipsCount = (pairs, items, on) => `<div class="chips c-count" role="group" aria-label="${E(T('filter'))}">${pairs.map(([k, x]) => `<button type="button" class="chip" data-k="${E(k)}" aria-pressed="${k === on}">${E(x)}<i>${k === 'all' ? items.length : items.filter(i => i.cat === k).length}</i></button>`).join('')}</div>`;
  const recoveryCard = (key, S) => {
    const R = recovOf(S, key);
    if (!R.length) return '';
    return `<aside class="recov rv"><p class="eyebrow">${E(T('recoveryH'))}</p><ol class="recov-line">${R.map(([w, x]) => `<li><b>${E(w)}</b><span>${E(x)}</span></li>`).join('')}</ol>
      <p class="note">${E(T('resultsVary'))}</p><a class="link-arrow" href="trip.html?p=${E(key)}">${E(T('tripTry'))} ${I('arrow-right')}</a></aside>`;
  };
  const planBtn = key => `<button type="button" class="btn btn-ghost btn-sm plan-add" data-plan="${E(key)}">${I('plus')}<span>${E(T('planAdd'))}</span></button>`;
  const bindPlan = root => root.addEventListener('click', e => {
    const b = e.target.closest('[data-plan]');
    if (!b) return;
    A.emit('plan:add', {procedure:b.dataset.plan, source:document.body.dataset.page});
    b.classList.add('done'); b.querySelector('span').textContent = T('planAdded'); b.querySelector('.i') && (b.querySelector('.i').outerHTML = I('badge-check'));
  });

  /* =================== HOME =================== */
  async function home(){
    const S = A.d('shared') || {}, H = A.d('home') || {}, About = A.d('about') || {}, Fd = A.d('founder');
    const reviews = (H.reviews && H.reviews.items) || [];
    const promos = (H.promos && H.promos.items) || [];
    const news = (H.news && H.news.items) || [];
    main().innerHTML = `
    <section class="hero-body" id="hero">
      <div class="hb-glow" aria-hidden="true"></div><div class="hb-suture" aria-hidden="true"></div>
      <div class="wrap hb-grid">
        <div class="hb-copy">
          <p class="eyebrow on-night rv">${E(T('heroKicker'))}</p>
          <h1 class="hb-h1 rv" data-d="60" data-field="home.h1">${E(H.h1 || 'Apex Surgery Hospital')}</h1>
          <p class="hb-h2 rv" data-d="120" data-field="home.h2">${E(A.lang === 'en' ? (S.brandTh || H.h2 || '') : (H.h2 || S.brandTh || ''))}</p>
          <p class="hb-lead rv" data-d="180">${E(T('heroLead'))}</p>
          <div class="hb-acts rv" data-d="240"><a class="btn btn-light" href="consult.html">${I('message-circle')}${E(T('consult'))}</a><a class="btn btn-ghost" href="nose-implants.html">${I('scan-face')}${E(T('heroCta2'))}</a></div>
          <ul class="hb-svcs rv" data-d="300">${(S.services || []).map(s => `<li><a href="${A.svcUrl(s.key)}">${E(s.short || s.name)}</a></li>`).join('')}</ul>
        </div>
        <div class="hb-stage"><div id="bodymap" class="bodymap-host" aria-label="${E(T('bodyHint'))}"></div></div>
      </div>
    </section>

    ${A.freshSection(A.d('fresh'))}
    <section class="section intro-s">
      <div class="wrap intro2">
        <div><p class="eyebrow rv">${E(T('introH'))}</p>
          <p class="intro-big rv" data-d="60" data-field="home.intro">${E((H.intro && H.intro.x) || '')}</p>
          <a class="link-arrow rv" href="about.html">${E(T('aboutMore'))} ${I('arrow-right')}</a></div>
        <div class="intro-side">
          ${Fd ? `<a class="intro-fd rv-clip" href="${A.docUrl('founder')}">
            <span class="ifd-ph"><img src="${IMG(Fd.wide || Fd.portrait || Fd.photo)}" alt="${E(Fd.name)}" loading="lazy" decoding="async" data-par="14"${Fd.wide ? ' style="object-position:38% 22%"' : ''}></span>
            ${Fd.aaci ? `<span class="ifd-badge"><img src="${IMG(Fd.aaci.src)}" alt="${E(Fd.aaci.alt || 'AACI')}" loading="lazy" decoding="async" decoding="async"></span>` : ''}
            <span class="ifd-cap"><small>${E(T('foundedBy'))}</small><b>${E(Fd.name)}</b><span>${E(Fd.specialty || Fd.role)}</span>${Fd.license ? `<span class="ifd-lic">${E(Fd.license)}</span>` : ''}</span>
          </a>` : ''}
          <ul class="pillars">${(About.pillars || []).map((p, i) => `<li class="rv" data-d="${i*90}"><span class="pl-n">0${i+1}</span><b>${E(p.h)}</b><span>${E(p.x)}</span></li>`).join('')}</ul>
        </div>
      </div>
    </section>

    <section class="section washed">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E(T('servicesH'))}</p><h2 class="h-xl rv" data-field="home.servicesH">${E(H.servicesH || T('services'))}</h2></div><a class="link-arrow rv" href="services.html">${E(T('allServices'))} ${I('arrow-right')}</a></div>
      ${A.svcCards(S)}</div>
    </section>

    <section class="section night tools-s">
      <div class="wrap">
        <div class="tools-grid">
          <a class="tool-card tool-nose rv" href="nose-implants.html">
            <span class="tc-art st-art" aria-hidden="true"><img src="${A.assets}img/stencil-side.svg" alt="" loading="lazy" decoding="async"><svg viewBox="20 60 560 640"><path class="tc-prof2" d="M97.3 334C96.2 336.7 93.4 344.3 90.6 350C87.8 355.7 83.9 362 80.6 368C77.3 374 74 380 70.6 386C67.2 392 63.4 398.7 60.1 404C56.8 409.3 53.1 414.3 50.6 418C48.1 421.7 46.4 423.5 45.2 426C44 428.5 43.5 430.7 43.5 433C43.5 435.3 44.3 437.8 45.4 440C46.5 442.2 48.2 444.8 50 446.5C51.8 448.2 53.7 449 56 450C58.3 451 61.3 451.8 64 452.5C66.7 453.2 70.7 454.2 72 454.5"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('nose'))}</span><b class="h-l">${E(T('noseH'))}</b><span class="tc-p">${E(T('noseP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('noseCta'))} ${I('arrow-right')}</span><small>${I('shield-check')}${E(T('noseNote'))}</small></span></span></a>
          <a class="tool-card tool-games rv" data-d="90" href="play.html">
            <span class="tc-art dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('gamesEb'))}</span><b class="h-m">${E(T('gamesH'))}</b><span class="tc-p">${E(T('gamesP'))}</span><span class="tc-list">${E(T('gamesList'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('gamesCta'))} ${I('arrow-right')}</span></span></span></a>
          <a class="tool-card tool-trip rv" data-d="180" href="trip.html">
            <span class="tc-art cal2" aria-hidden="true"><svg viewBox="0 0 150 144"><rect class="cl-card" x="1" y="8" width="148" height="134" rx="14"/><path class="cl-top" d="M1 22a14 14 0 0 1 14-14h120a14 14 0 0 1 14 14v18H1z"/><rect class="cl-ring" x="36" y="2" width="7" height="15" rx="3.5"/><rect class="cl-ring" x="107" y="2" width="7" height="15" rx="3.5"/><path class="cl-plane" transform="translate(64 13) scale(.92)" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/><path class="cl-wd" d="M18 50h6M36 50h6M54 50h6M72 50h6M90 50h6M108 50h6M126 50h6"/><rect class="cl-stay" x="30" y="75" width="108" height="16" rx="8"/><rect class="cl-stay" x="12" y="92" width="90" height="16" rx="8"/><circle class="cl-op" cx="75" cy="83" r="8.5"/><text class="cl-n" x="21" y="69.2">1</text><text class="cl-n" x="39" y="69.2">2</text><text class="cl-n" x="57" y="69.2">3</text><text class="cl-n" x="75" y="69.2">4</text><text class="cl-n" x="93" y="69.2">5</text><text class="cl-n" x="111" y="69.2">6</text><text class="cl-n" x="129" y="69.2">7</text><text class="cl-n" x="21" y="86.2">8</text><text class="cl-n on" x="39" y="86.2">9</text><text class="cl-n on" x="57" y="86.2">10</text><text class="cl-n on" x="75" y="86.2">11</text><text class="cl-n on" x="93" y="86.2">12</text><text class="cl-n on" x="111" y="86.2">13</text><text class="cl-n on" x="129" y="86.2">14</text><text class="cl-n on" x="21" y="103.2">15</text><text class="cl-n on" x="39" y="103.2">16</text><text class="cl-n on" x="57" y="103.2">17</text><text class="cl-n on" x="75" y="103.2">18</text><text class="cl-n on" x="93" y="103.2">19</text><text class="cl-n" x="111" y="103.2">20</text><text class="cl-n" x="129" y="103.2">21</text><text class="cl-n" x="21" y="120.2">22</text><text class="cl-n" x="39" y="120.2">23</text><text class="cl-n" x="57" y="120.2">24</text><text class="cl-n" x="75" y="120.2">25</text><text class="cl-n" x="93" y="120.2">26</text><text class="cl-n" x="111" y="120.2">27</text><text class="cl-n" x="129" y="120.2">28</text></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('trip'))}</span><b class="h-m">${E(T('tripH'))}</b><span class="tc-p">${E(T('tripP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('tripCta'))} ${I('arrow-right')}</span></span></span></a>
          <a class="tool-card tool-fill rv" data-d="200" href="filler.html" data-new="page:filler">
            <span class="tc-art fill st-art" aria-hidden="true"><img src="${A.assets}img/stencil-front.svg" alt="" loading="lazy" decoding="async"><svg viewBox="90 60 420 620"><circle class="tf-f" cx="175" cy="365" r="12" style="--d:0ms"/><circle class="tf-f" cx="425" cy="365" r="12" style="--d:90ms"/><circle class="tf-f" cx="205" cy="385" r="12" style="--d:180ms"/><circle class="tf-f" cx="395" cy="385" r="12" style="--d:270ms"/><circle class="tf-f" cx="235" cy="410" r="12" style="--d:360ms"/><circle class="tf-f" cx="365" cy="410" r="12" style="--d:450ms"/><circle class="tf-c" cx="160" cy="255" r="12" style="--d:0ms"/><circle class="tf-c" cx="440" cy="255" r="12" style="--d:90ms"/><circle class="tf-c" cx="185" cy="525" r="12" style="--d:180ms"/><circle class="tf-c" cx="415" cy="525" r="12" style="--d:270ms"/><circle class="tf-c" cx="300" cy="592" r="12" style="--d:360ms"/><circle class="tf-r" cx="250" cy="362" r="12" style="--d:0ms"/><circle class="tf-r" cx="350" cy="362" r="12" style="--d:90ms"/><circle class="tf-r" cx="256" cy="470" r="12" style="--d:180ms"/><circle class="tf-r" cx="344" cy="470" r="12" style="--d:270ms"/><circle class="tf-r" cx="300" cy="497" r="12" style="--d:360ms"/><circle class="tf-r" cx="256" cy="532" r="12" style="--d:450ms"/><circle class="tf-r" cx="344" cy="532" r="12" style="--d:540ms"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night" data-new-slot>${E(T('fill'))}</span><b class="h-l">${E(T('fillH'))}</b><span class="tc-p">${E(T('fillPageP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('fillCta'))} ${I('arrow-right')}</span></span></span></a>
          <a class="tool-card tool-gold rv" data-d="240" href="proportions.html">
            <span class="tc-art gold st-art" aria-hidden="true"><img src="${A.assets}img/stencil-front.svg" alt="" loading="lazy" decoding="async"><svg viewBox="90 60 420 620"><path class="tg-l" d="M108 168h384M108 305h384M108 455h384M108 610h384M124 168v442"/><path class="tg-g" d="M262 305v150M338 305v150M236 505h128"/><circle class="tg-d" cx="300" cy="168" r="8"/><circle class="tg-d" cx="300" cy="305" r="8"/><circle class="tg-d" cx="300" cy="455" r="8"/><circle class="tg-d" cx="300" cy="610" r="8"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('prop'))}</span><b class="h-m">${E(T('propH'))}</b><span class="tc-p">${E(T('propPageP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('propCta'))} ${I('arrow-right')}</span></span></span></a>
          <a class="tool-card tool-ana rv" data-d="300" href="analysis.html">
            <span class="tc-art ana st-art" aria-hidden="true"><img src="${A.assets}img/stencil-front.svg" alt="" loading="lazy" decoding="async"><svg viewBox="90 60 420 620"><path class="ta-b" d="M100 120V80h40M460 80h40v40M100 620v40h40M460 660h40v-40"/><circle class="ta-s" cx="218" cy="430" r="16"/><circle class="ta-s" cx="384" cy="392" r="11"/><circle class="ta-s" cx="252" cy="232" r="12"/><circle class="ta-s" cx="356" cy="560" r="10"/><path class="ta-scan" d="M104 370h392"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('ana'))}</span><b class="h-m">${E(T('anaH'))}</b><span class="tc-p">${E(T('anaPageP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('anaCta'))} ${I('arrow-right')}</span></span></span></a>
          <a class="tool-card tool-impl rv" data-d="360" href="breast-implants.html">
            <span class="tc-art impl" aria-hidden="true"><svg viewBox="0 0 220 110"><path class="ti-lens" d="M20 92 C 40 30, 120 18, 150 92 Z"/><path class="ti-in" d="M34 92 C 54 46, 116 38, 138 92"/><path class="ti-dim" d="M20 102h130M20 98v8M150 98v8M164 92V40M160 92h8M160 40h8"/><text class="ti-t" x="174" y="70">cc</text></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('impl'))}</span><b class="h-m">${E(T('implH'))}</b><span class="tc-p">${E(T('implP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('implCta'))} ${I('arrow-right')}</span></span></span></a>
        </div>
      </div>
    </section>

    <section class="section"><div class="wrap">${A.teamStrip(S, A.d('team'))}</div></section>

    <section class="section washed reviews-s">
      <div class="wrap">
        <div class="shead"><div><p class="eyebrow rv">${E(T('reviews'))}</p><h2 class="h-xl rv" data-field="home.reviews.h">${E((H.reviews && H.reviews.h) || T('reviews'))}</h2></div>
          <div class="rail-ctrl rv"><button type="button" id="rv-prev" aria-label="${E(T('prev'))}">${I('chevron-left')}</button><button type="button" id="rv-next" aria-label="${E(T('next'))}">${I('chevron-right')}</button></div></div>
        ${chips([['all', T('all')], ...svcCats().filter(k => reviews.some(r => r.cat === k)).map(k => [k, svcName(S, k)])], 'all')}
        ${reviewRail(reviews, 'rv-rail')}
        <p class="note">${E(T('resultsVary'))}</p>
      </div>
    </section>

    <section class="section night reels-s">
      <div class="wrap">
        <div class="shead"><div><p class="eyebrow on-night rv">${E(T('reelsEb'))}</p><h2 class="h-xl rv" data-field="home.reviewsRealH">${E(H.reviewsRealH || T('storiesH'))}</h2><p class="reels-sub rv">${E(T('reelsSub'))}</p></div></div>
        ${storiesHost(H.videos || (H.tiktok && H.tiktok.videos), 'stories', H.reviewsRealH)}
        ${H.tiktok && H.tiktok.link ? `<a class="tiktok-link" href="${A.url(H.tiktok.link.h)}" target="_blank" rel="noopener">${I('tiktok')}<span><b>${E(H.tiktok.h || '')}</b><small>@${E(H.tiktok.link.handle || 'apex_surgery')}</small></span>${I('arrow-up-right')}</a>` : ''}
      </div>
    </section>

    ${(() => { const W = A.d('war'); const eps = (W && W.episodes) || []; return eps.length ? `<section class="section war-home">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E(T('shows'))} · Workpoint 23</p><h2 class="h-xl rv">${E(T('warH'))}</h2><p class="reels-sub rv">${E(T('warLead'))}</p></div>
        <div class="rail-ctrl rv"><button type="button" id="war-prev" aria-label="${E(T('prev'))}">${I('chevron-left')}</button><button type="button" id="war-next" aria-label="${E(T('next'))}">${I('chevron-right')}</button></div></div>
      <div class="rail war-rail" id="war-rail">${eps.map((x, i) => warCard(x, i)).join('')}</div>
      <p class="war-links rv"><a class="link-arrow" href="surgery-wars.html">${E(T('warAll'))} ${I('arrow-right')}</a><a class="link-arrow" href="transformations.html">${E(T('shows'))} ${I('arrow-right')}</a></p></div></section>` : ''; })()}

    <section class="section promos-s">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E(T('promotions'))}</p><h2 class="h-xl rv" data-field="home.promos.h">${E((H.promos && H.promos.h) || T('promosH'))}</h2></div><a class="link-arrow rv" href="promotions.html">${E(T('viewAll'))} ${I('arrow-right')}</a></div>
      ${(() => { const si = Math.max(0, promos.findIndex(p => p.price)); return promos.length ? offerSpot(promos[si], S) + promoGrid(promos.filter((p, i) => i !== si).slice(0, 7), S, {game:true}) : ''; })()}</div>
    </section>

    <section class="section washed"><div class="wrap">${A.branchesHtml(S, H.branches && H.branches.h, H.branches && H.branches.p)}</div></section>

    <section class="section social-s"><div class="wrap">${A.socialWall(S)}</div></section>

    <section class="section updates-s">
      <div class="wrap"><div class="shead"><h2 class="h-xl rv" data-field="home.news.h">${E((H.news && H.news.h) || T('newsH'))}</h2><a class="link-arrow rv" href="blog.html">${E(T('viewAll'))} ${I('arrow-right')}</a></div>
      <div class="updates2">${S.facebook ? `<div class="fb-col">${A.fbLink(S.facebookSurgery, 'big')}${A.fbFrame(S.facebook, 600, 'timeline', S.facebookSurgery)}</div>` : ''}<div class="upd-list">${news.slice(0, 4).map((p, i) => postCard(p, i)).join('')}</div></div></div>
    </section>

    <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;

    A.mount('#bodymap', 'bodymap', {threeUrl:A.threeUrl}).then(() => A.qs('.hb-stage').classList.add('on'));
    A.bindMedia(main());
    const rail = A.qs('#rv-rail');
    A.railCtrl(rail, A.qs('#rv-prev'), A.qs('#rv-next'));
    bindChips(A.qs('.reviews-s'), k => { A.qsa('.ba-card', rail).forEach(c => c.hidden = !(k === 'all' || c.dataset.cat === k)); rail.scrollTo({left:0}); });
    mountStories(A.qs('#stories'));
    A.socialMount(main());
    A.freshMount(main());
    bindOffers(A.qs('.promos-s'));
    A.railCtrl(A.qs('#war-rail'), A.qs('#war-prev'), A.qs('#war-next'));
  }

  /* =================== SERVICES =================== */
  async function services(){
    const S = A.d('shared') || {}, D = A.d('services') || {};
    A.setMeta(D.title, D.desc);
    main().innerHTML = phead(D.h || T('services'), T('servicesSub'), [homeCrumb(), [T('services')]]) + `
      <section class="section"><div class="wrap">${A.svcCards(S)}
        <a class="tx-band rv" href="treatments.html"><span class="tx-gi">${I('sparkles')}</span><span><b>${E(T('treatments'))}</b><span>${E(T('txBand'))}</span></span>${I('arrow-right')}</a></div></section>
      <section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(T('tools'))}</h2></div>
        <div class="mini-tools">
          <a class="mini-tool rv mt-new" href="filler.html" data-new="page:filler">${I('syringe')}<b data-new-slot>${E(T('fill'))}</b><span>${E(T('fillPageP'))}</span></a>
          <a class="mini-tool rv" data-d="20" href="analysis.html">${I('scan-line')}<b>${E(T('ana'))}</b><span>${E(T('anaPageP'))}</span></a>
          <a class="mini-tool rv" data-d="35" href="proportions.html">${I('gem')}<b>${E(T('prop'))}</b><span>${E(T('propPageP'))}</span></a>
          <a class="mini-tool rv" data-d="50" href="breast-implants.html">${I('ruler')}<b>${E(T('impl'))}</b><span>${E(T('implP'))}</span></a>
          <a class="mini-tool rv" data-d="70" href="trip.html">${I('calendar')}<b>${E(T('trip'))}</b><span>${E(T('tripP'))}</span></a>
          <a class="mini-tool rv" data-d="140" href="play.html">${I('sparkles')}<b>${E(T('games'))}</b><span>${E(T('gamesP'))}</span></a>
        </div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
  }

  /* =================== NON-SURGICAL TREATMENTS =================== */
  const TX_IC = {smile:'smile', inject:'syringe', lift:'layers', laser:'sun', 'hair-removal':'scan-line', body:'dumbbell', hair:'sparkles', wellness:'heart-pulse', weight:'weight', intimate:'heart'};
  async function treatments(){
    const S = A.d('shared') || {}, D = A.d('treatments') || {groups:[]}, G = D.groups || [];
    A.setMeta(D.title, D.desc);
    const n = g => Math.max(1, g.cards.reduce((a, c) => a + Math.max(1, c.items.length), 0));
    const card = (c, i) => `<article class="tx-card rv" data-d="${Math.min(i, 5) * 40}">
        <h3>${E(c.n)}</h3>${c.p ? `<p>${E(c.p)}</p>` : ''}
        ${c.items.length ? `<ul class="tx-items">${c.items.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : ''}
        ${c.link ? `<a class="link-arrow" href="${A.url(c.lx ? A.href(c.link) : c.link)}">${E(c.lx ? T('txMore') : T('txTry'))} ${I('arrow-right')}</a>` : ''}</article>`;
    main().innerHTML = phead(D.h || T('treatments'), D.lead, [homeCrumb(), [T('services'), 'services.html'], [D.h || T('treatments')]],
      `<label class="tx-search rv" data-d="140">${I('search')}<span class="sr">${E(T('txSearch'))}</span><input type="search" placeholder="${E(T('txSearch'))}" autocomplete="off" data-r="q"></label>`) + `
      <section class="section tx"><div class="wrap tx-grid">
        <nav class="tx-nav" aria-label="${E(T('txGroups'))}">${G.map(g => `<a href="#tx-${E(g.k)}" data-k="${E(g.k)}">${I(TX_IC[g.k] || 'sparkles')}<span>${E(g.h)}</span><i>${n(g)}</i></a>`).join('')}</nav>
        <div class="tx-body">${G.map(g => `<section class="tx-g" id="tx-${E(g.k)}" data-k="${E(g.k)}">
          <div class="tx-gh rv"><span class="tx-gi">${I(TX_IC[g.k] || 'sparkles')}</span><div><h2 class="h-l">${E(g.h)}</h2><p>${E(g.p)}</p></div></div>
          ${g.cards.length ? `<div class="tx-cards">${g.cards.map(card).join('')}</div>` : `<a class="btn btn-ghost rv" href="consult.html">${I('message-circle')}${E(T('consult'))}</a>`}
          ${(g.imgs || []).length ? (() => { const gl = A.gallery(g.imgs.map(x => ({src:IMG(x.src), alt:x.alt}))); return `<div class="tx-imgs rail">${g.imgs.map((x, k) => `<button type="button" class="tx-img ph-img" ${gl.attr(k)} aria-label="${E(x.alt)}"><img src="${IMG(x.src)}" alt="${E(x.alt)}" loading="lazy" decoding="async"></button>`).join('')}</div>`; })() : ''}</section>`).join('')}
          <p class="tx-none" hidden data-r="none">${E(T('txNone'))}</p>
          <p class="note tx-from">${E(D.from || '')}</p></div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    const q = A.qs('[data-r="q"]'), none = A.qs('[data-r="none"]'), nav = A.qsa('.tx-nav a');
    const norm = x => x.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    q.addEventListener('input', () => {
      const v = norm(q.value.trim()); let any = false;
      A.qsa('.tx-g').forEach(g => {
        let shown = 0;
        A.qsa('.tx-card', g).forEach(c => {
          const head = norm(A.qs('h3', c).textContent + ' ' + (A.qs('p', c) || {textContent:''}).textContent).includes(v);
          let hit = 0;
          A.qsa('.tx-items li', c).forEach(li => { const m = !!v && norm(li.textContent).includes(v); li.classList.toggle('hit', m); hit += m; });
          const on = !v || head || hit > 0; c.hidden = !on; shown += on;
        });
        const gOn = !v || shown > 0 || norm(A.qs('.tx-gh', g).textContent).includes(v);
        g.hidden = !gOn; any = any || gOn;
        const a = nav.find(x => x.dataset.k === g.dataset.k); if (a) a.classList.toggle('dim', !gOn);
      });
      none.hidden = any;
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) nav.forEach(a => a.classList.toggle('on', a.dataset.k === e.target.dataset.k)); }), {rootMargin:'-30% 0px -60% 0px'});
      A.qsa('.tx-g').forEach(g => io.observe(g));
    }
  }

  /* =================== SERVICE =================== */
  async function service(){
    const S = A.d('shared') || {};
    const key = A.param('p') || 'facelift';
    let D;
    try { D = await A.data('svc/' + key, 'svc:' + key); } catch (e) { D = null; }
    if (!D) { main().innerHTML = phead(T('notFoundH'), T('loadError'), [homeCrumb(), [T('services'), 'services.html'], [key]]); return; }
    A.setMeta(D.title || D.name, D.desc);
    const nm = svcName(S, key);
    const promos = D.promos || [];
    const crumbs = [homeCrumb(), [T('services'), 'services.html'], [nm]];
    const intro = (D.intro || []);
    const introP = intro.filter(x => !/^✔/.test(x)), ticks = intro.filter(x => /^✔/.test(x)).map(x => x.replace(/^✔\s*/, ''));
    const q = introP.join(' ').length > 420 ? pickQuote(introP) : '';
    const aa = D.atApex || null;
    const aaImg = aa && aa.img ? {src:aa.img, alt:aa.alt || aa.h} : ph((SVC_PHOTOS[key] || [])[0]);
    const secs = D.sections || [];
    main().innerHTML = `
    <section class="svc-head">
      <div class="phead-lines" aria-hidden="true"></div><div class="sh-glow" aria-hidden="true"></div>
      <div class="wrap">
        ${A.crumbs(crumbs)}
        <div class="sh-grid">
          <div class="sh-copy">
            <p class="eyebrow on-night rv">${E(D.en || '')}</p>
            <h1 class="display-s rv" data-d="60" data-field="svc.name">${E(D.name)}</h1>
            ${D.byline ? `<p class="sh-by rv" data-d="120" data-field="svc.byline">${I('badge-check')}${E(D.byline)}</p>` : ''}
            <div class="sh-acts rv" data-d="180"><a class="btn btn-light" href="consult.html?p=${E(key)}">${I('message-circle')}${E(T('consult'))}</a>${planBtn(key)}${key === 'rhinoplasty' ? `<a class="btn btn-ghost btn-sm" href="nose-implants.html">${I('scan-face')}${E(T('noseTry'))}</a>` : ''}</div>
          </div>
          ${recoveryCard(key, S)}
        </div>
      </div>
      ${D.hero ? `<figure class="sh-banner rv-clip ph-img wrap-wide"><img src="${IMG(D.hero)}" alt="${E(D.heroAlt || D.name)}" data-field="svc.hero" fetchpriority="high"></figure>` : ''}
    </section>

    <section class="section svc-intro">
      <div class="wrap si2">
        <div class="si-copy" data-field="svc.intro">
          ${aa ? `<h2 class="h-l rv" data-field="svc.atApex.h">${E(aa.h)}</h2>` : ''}
          ${introP.map((p, i) => `<p class="${i ? '' : 'si-lead '}rv">${E(p)}</p>${i === 0 && q && introP.length > 1 ? pullQuote(q) : ''}`).join('')}
          ${q && introP.length === 1 ? pullQuote(q) : ''}
          ${ticks.length ? `<ul class="tick-chips">${ticks.map((x, i) => `<li class="rv" data-d="${i * 60}">${I('check')}<span>${E(x)}</span></li>`).join('')}</ul>` : ''}
        </div>
        <aside class="si-media">${figure(aaImg, 'si-fig', false)}
          <p class="si-tag rv" aria-hidden="true">${(D.tagline || []).map(x => `<span>${E(x)}</span>`).join('')}</p></aside>
      </div>
      ${(D.badges || []).length ? `<div class="wrap"><div class="badges">${D.badges.map((b, i) => `<figure class="badge ph-img rv" data-d="${i * 80}"><img src="${IMG(b.src)}" alt="${E(b.alt || '')}" loading="lazy" decoding="async" decoding="async"></figure>`).join('')}</div></div>` : ''}
    </section>

    ${secs.map((sec, i) => svcSection(sec, i, key, i % 2 === 0)).join('')}
    ${(D.sources || []).length ? `<div class="wrap svc-src"><p class="note">${E(T('sourcesH'))}: ${D.sources.map(u => `<a href="${A.url(u)}" target="_blank" rel="noopener">${E(u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(', ')}</p></div>` : ''}

    ${(D.ba || []).length ? `<section class="section night ba-s"><div class="wrap"><div class="shead"><div><p class="eyebrow on-night rv">${E(nm)}</p><h2 class="h-xl rv">${E(D.baH || T('baH'))}</h2></div><p class="note on-night rv">${E(T('resultsVary'))}</p></div>
      <div id="ba" class="ba-host">${baGrid(D.ba, D.baH)}</div></div></section>` : ''}

    <section class="section reviews-s">
      <div class="wrap"><div class="shead"><h2 class="h-xl rv" data-field="svc.reviewsH">${E((D.reviewsH || T('reviews')).replace(/\s*!+\s*$/, ''))}</h2>
        <div class="rail-ctrl rv"><button type="button" id="rv-prev" aria-label="${E(T('prev'))}">${I('chevron-left')}</button><button type="button" id="rv-next" aria-label="${E(T('next'))}">${I('chevron-right')}</button></div></div>
      ${reviewRail(D.reviewImgs || [], 'rv-rail')}
      <div class="stories-wrap"><div class="sw-head"><h3 class="h-m rv">${E(T('reelsEb'))}</h3><p class="reels-sub rv">${E(T('reelsTap'))}</p></div>${storiesHost(D.videos, 'stories', D.reviewsH)}</div>
      ${ytIds(D.yt).length || D.tiktok ? `<div class="yt-row">${ytIds(D.yt).map(id => `<div class="ytbox rv"><button type="button" data-yt="${E(id)}" aria-label="${E(T('playVideo'))}"><img loading="lazy" decoding="async" src="${A.yt(id)}" alt=""><span class="pl">${I('play')}</span></button></div>`).join('')}
        ${D.tiktok ? `<a class="tiktok-link rv" href="${A.url(D.tiktok.h)}" target="_blank" rel="noopener">${I('tiktok')}<span><b>${E(D.tiktok.x)}</b><small>@apex_surgery</small></span>${I('arrow-up-right')}</a>` : ''}</div>` : ''}
      </div>
    </section>

    ${promos.length ? `<section class="section washed"><div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E((D.promoTag || []).join(' · '))}</p><h2 class="h-xl rv">${E(D.promoH || T('promosH'))}</h2></div><a class="link-arrow rv" href="promotions.html?c=${E(key)}">${E(T('viewAll'))} ${I('arrow-right')}</a></div>${promoGrid(promos, S, {cat:key})}</div></section>` : ''}

    ${(D.faqs || []).length ? `<section class="section faq-s"><div class="wrap">
      <h2 class="h-l faq-h rv" data-field="svc.faqH">${E(D.faqH || T('faqH'))}</h2>
      <div class="faq-grid2"><div data-field="svc.faqs">${A.faqHtml(D.faqs)}</div>
        <aside class="faq-cta rv"><span class="fc-ic">${I('line')}</span><b class="h-s">${E((S.cta && S.cta.consult) || T('consult'))}</b><p>${E(T('consultP'))}</p>
          <a class="btn btn-plum" href="${A.url((S.line && S.line.h) || '#')}" target="_blank" rel="noopener">${I('line')}${E((S.cta && S.cta.free) || T('consult'))}</a>
          <a class="link-arrow" href="consult.html?p=${E(key)}">${E(T('consultBtn'))} ${I('arrow-right')}</a></aside></div></div></section>` : ''}

    <section class="section washed"><div class="wrap">${A.teamStrip(S, A.d('team'))}</div></section>
    <section class="section"><div class="wrap">${A.branches(S)}</div></section>
    <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;

    A.bindMedia(main()); bindPlan(main());
    A.railCtrl(A.qs('#rv-rail'), A.qs('#rv-prev'), A.qs('#rv-next'));
    mountStories(A.qs('#stories'), {procedure:key, focus:key});
    mountShowcase(A.qs('#ba'), baCases(D.ba || [], S, {cat:key, onService:true}), {tileFacts:true});
    bindOffers(main());
    A.jsonld({'@context':'https://schema.org','@type':'MedicalProcedure', name:D.name, alternateName:D.en, description:D.desc, procedureType:'https://schema.org/SurgicalProcedure', howPerformed:(D.intro || [])[0], followup:recovOf(S, key).map(r => r.join(': ')).join('; '), performer:{'@type':'Physician', name:(S.doctor || {}).name}});
    if ((D.faqs || []).length) A.jsonld({'@context':'https://schema.org','@type':'FAQPage', mainEntity:D.faqs.map(q => ({'@type':'Question', name:q.q, acceptedAnswer:{'@type':'Answer', text:(q.a || []).join(' ')}}))});
    A.breadcrumbLd(crumbs.map((c, i) => [c[0], c[1] || location.href]));
  }

  /* =================== FOUNDER (about + doctor) =================== */
  const founderBlock = (F, full) => {
    if (!F || !F.name) return '';
    const rest = F.bio.slice(1);
    return `<div class="founder2" id="founder">
      <div class="f2-media rv">
        <figure class="f2-ph ph-img"><img src="${IMG(full ? F.portrait || F.photo : F.photo)}" alt="${E(F.name)}" loading="lazy" decoding="async" decoding="async"></figure>
        <div class="f2-card"><span class="f2-ic">${I('award')}</span><span><b>${E(F.license)}</b><small>${E(F.role)}</small></span></div>
      </div>
      <div class="f2-body">
        <h2 class="h-l rv" data-field="founder.name">${E(F.name)}</h2>
        <p class="f2-alt rv">${E(A.lang === 'en' ? F.nameTh : F.nameEn)}${F.nick ? ` · ${E(F.nick)}` : ''}</p>
        <p class="doc-meta rv"><span>${E(F.role)}</span><span>${E(F.license)}</span></p>
        <p class="f2-lead rv" data-field="founder.bio">${E(F.bio[0])}</p>
        <ol class="f2-years rv" aria-label="${E(T('yearsH'))}">${(F.years || []).map(y => `<li><b>${E(y.y)}</b><span>${E(y.x)}</span></li>`).join('')}</ol>
        ${pullQuote(F.quote)}
        ${full ? `<ul class="who-grid role-grid">${(F.roles || []).map((x, j) => { const [l, t] = splitLabel(x); return `<li class="who-card role-card rv" data-d="${(j % 2) * 60}"><span class="wc-ic">${I(pickIcon(l || x, j))}</span>${l ? `<h3>${E(l)}</h3><p>${E(t)}</p>` : `<p class="wc-solo">${E(t)}</p>`}</li>`; }).join('')}</ul>
          <div class="f2-edu rv"><h3 class="h-s">${E(F.eduH)}</h3><ul class="ticks">${(F.edu || []).map(x => `<li>${E(x)}</li>`).join('')}</ul></div>` : ''}
        <details class="f2-more rv"><summary><span>${E(T('readMore'))}</span>${I('chevron-down')}</summary><div class="f2-rest">${rest.map(x => `<p>${E(x)}</p>`).join('')}</div></details>
        <div class="doc-acts rv">${full ? `<a class="btn btn-ghost on-light btn-sm" href="${A.url(F.check.h)}" target="_blank" rel="noopener">${I('shield-check')}${E(F.checkX)}</a>` : `<a class="btn btn-plum btn-sm" href="${A.docUrl('founder')}">${E(T('founderCta'))} ${I('arrow-right')}</a>`}</div>
      </div></div>`;
  };
  const aaciCard = S => S.aaci ? `<a class="aaci-card rv" href="${A.url(S.aaci.h)}" target="_blank" rel="noopener"><img src="${IMG(S.aaci.src)}" alt="${E(S.aaci.alt)}" loading="lazy" decoding="async" width="96" height="96"><span><b>${E(T('aaciH'))}</b><small>${E(T('aaciP'))}</small></span>${I('arrow-up-right')}</a>` : '';

  /* =================== ABOUT =================== */
  async function about(){
    const S = A.d('shared') || {}, D = A.d('about') || {}, F = A.d('founder');
    A.setMeta(D.title, D.desc);
    main().innerHTML = phead(D.h1 || T('about'), null, [homeCrumb(), [T('about')]]) + `
      ${D.hero && D.hero.src ? `<figure class="about-banner ph-img rv-clip wrap-wide"><img src="${IMG(D.hero.src)}" alt="${E(D.hero.alt || D.h1)}" data-par="22" fetchpriority="high"></figure>` : ''}
      <section class="section"><div class="wrap about-grid">
        <div class="prose big" data-field="about.intro">${(D.intro || []).map((p, i) => `<p class="rv${i ? '' : ' si-lead'}">${E(p)}</p>${i === 0 && (D.intro || []).length > 1 ? pullQuote(pickQuote((D.intro || []).slice(1), false)) : ''}`).join('')}</div>
        <aside class="about-aside">
          ${F ? `<a class="f-mini rv" href="#founder"><span class="f-mini-ph ph-img"><img src="${IMG(F.photo)}" alt="" loading="lazy" decoding="async" decoding="async"></span><span><small>${E(T('foundedBy'))}</small><b>${E(F.name)}</b><span>${E(F.role)}</span></span>${I('arrow-right')}</a>` : `<div class="about-side rv"><p class="eyebrow">${E(T('foundedBy'))}</p><p>${E(S.founder || '')}</p></div>`}
          ${aaciCard(S)}
        </aside></div></section>
      <section class="section night vision-s"><div class="wrap"><p class="eyebrow on-night rv">${E(D.visionH || T('visionH'))}</p><p class="vision rv" data-field="about.vision">${E(D.vision || '')}</p>
        <ul class="pillars on-night">${(D.pillars || []).map((p, i) => `<li class="rv" data-d="${i*90}"><span class="pl-ic">${I(['stethoscope', 'cpu', 'shield-check'][i % 3])}</span><b>${E(p.h)}</b><span>${E(p.x)}</span></li>`).join('')}</ul></div></section>
      ${F ? `<section class="section founder-s"><div class="wrap">${founderBlock(F, false)}</div></section>` : ''}
      <section class="section washed"><div class="wrap">${A.teamStrip(S, A.d('team'))}</div></section>
      <section class="section"><div class="wrap">${A.branches(S, D.branches && D.branches.h, D.branches && D.branches.p)}</div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
  }

  /* =================== DOCTOR =================== */
  /* the Doctors page: a card per doctor and the founder; each doctor has a page of their own (doctor.html?d=key,
     /doctors/<name>/ on WordPress) so search engines can find each profile */
  const TM_SECS = [['edu', 'eduH'], ['train', 'trainH'], ['skills', 'skillsH'], ['work', 'workH'], ['member', 'memberH'], ['talks', 'talksH']];
  const tmCard = (d, i) => `<li class="rv" data-d="${(i % 3) * 70}"><a class="tm-card" href="${A.docUrl(d.key)}" data-new="doc:${E(d.key)}">
      <span class="tm-ph ph-img"><img src="${IMG(d.photo)}" alt="${E(d.name)}" loading="lazy" decoding="async" width="731" height="1024"></span>
      <span class="tm-body"><span class="tm-nick">${E(d.nick || '')}</span><b class="tm-name">${E(d.name)}</b>${d.license ? `<span class="tm-lic">${E(d.license)}</span>` : ''}<span class="tm-role">${E(d.role || '')}</span>
        <span class="tm-focus">${(d.focus || []).map(f => `<span>${E(f)}</span>`).join('')}</span>
        <span class="tm-more">${E(T('viewProfile'))} ${I('arrow-right')}</span></span></a></li>`;
  const docProfile = (d, S) => `<section class="section dr-s"><div class="wrap"><div class="founder2 dr-prof">
      <div class="f2-media rv">
        <figure class="f2-ph ph-img"><img src="${IMG(d.photo)}" alt="${E(d.name)}" decoding="async" width="731" height="1024" fetchpriority="high"></figure>
        ${d.license ? `<div class="f2-card"><span class="f2-ic">${I('award')}</span><span><b>${E(d.license)}</b><small>Apex Surgery Hospital</small></span></div>` : ''}
      </div>
      <div class="f2-body">
        ${d.nameAlt || d.nick ? `<p class="f2-alt rv">${E([d.nameAlt, d.nick].filter(Boolean).join(' · '))}</p>` : ''}
        ${d.license ? `<p class="doc-meta rv"><span>${E(d.license)}</span></p>` : ''}
        ${(d.focus || []).length ? `<p class="tm-focus dr-focus rv">${d.focus.map(f => `<span>${E(f)}</span>`).join('')}</p>` : ''}
        ${pullQuote(d.quote)}
        ${TM_SECS.filter(([k]) => (d[k] || []).length).map(([k, h]) => `<section class="tm-sec rv"><h2 class="h-s">${E(T(h))}</h2><ul class="ticks">${d[k].map(x => `<li>${A.fmtLi(x)}</li>`).join('')}</ul></section>`).join('')}
        <div class="doc-acts rv"><a class="btn btn-plum btn-sm" href="consult.html">${I('message-circle')}${E(T('consult'))}</a><a class="btn btn-ghost on-light btn-sm" href="${A.url((S.line && S.line.h) || '#')}" target="_blank" rel="noopener">${I('line')}${E(T('book'))}</a></div>
      </div></div></div></section>`;
  const docLd = (d, img, org) => A.jsonld({'@context':'https://schema.org','@type':'Physician', name:d.name, alternateName:d.nameAlt || d.nameTh || d.nameEn, image:new URL(IMG(img), location.href).href, identifier:d.license, description:d.role || d.specialty, medicalSpecialty:'PlasticSurgery', url:location.href, worksFor:org});
  async function doctor(){
    const S = A.d('shared') || {}, Dr = S.doctor || {}, F = A.d('founder'), TM = A.d('team');
    const docs = (TM && TM.docs) || [];
    const listCrumb = [T('doctorsH'), 'doctor.html'];
    const key = A.param('d');
    // an old link to a profile in the side panel (doctor.html#dr-key) goes to that doctor's page
    const old = location.hash.match(/^#dr-([\w-]+)$/);
    if (!key && old && docs.some(x => x.key === old[1])) { location.replace(A.docUrl(old[1])); return; }
    const d = key && docs.find(x => x.key === key);
    if (d) {
      A.setMeta(`${d.name}${d.role && (d.name + d.role).length <= 60 ? ', ' + d.role : ''} | Apex Surgery Hospital`, [d.name, d.license, d.role, (d.focus || []).join(', ')].filter(Boolean).join('. '));
      main().innerHTML = phead(d.name, d.role, [homeCrumb(), listCrumb, [d.name]]) + docProfile(d, S) + `
        <section class="section washed"><div class="wrap">${A.teamStrip(S, TM, d.key)}</div></section>
        <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
      docLd(d, d.photo, {'@type':'Hospital', name:'Apex Surgery Hospital'});
      A.breadcrumbLd([[T('home'), 'index.html'], [T('doctorsH'), 'doctor.html'], [d.name]]);
      return;
    }
    if (key === 'founder' && F) {
      A.setMeta(`${F.name}, ${F.role} | Apex Surgery Hospital`, [F.name, F.license, F.specialty].filter(Boolean).join('. '));
      main().innerHTML = phead(F.name, F.role, [homeCrumb(), listCrumb, [F.name]]) + `
        <section class="section founder-s"><div class="wrap">${founderBlock(F, true)}</div></section>
        <section class="section washed"><div class="wrap">${A.teamStrip(S, TM)}</div></section>
        <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
      docLd(F, F.portrait || F.photo, {'@type':'Organization', name:'Apex Medical Center'});
      A.breadcrumbLd([[T('home'), 'index.html'], [T('doctorsH'), 'doctor.html'], [F.name]]);
      return;
    }
    A.setMeta(`${T('doctorsH')}: ${(docs.length ? docs.map(d => d.name).slice(0, 3) : [Dr.name]).join(', ')}${F ? ', ' + F.name : ''} | Apex Surgery Hospital`, docs.length ? docs.map(d => `${d.name} (${d.role})`).join('; ') : Dr.specialty);
    main().innerHTML = phead(T('doctorsH'), docs.length ? TM.p : `${Dr.name} · ${Dr.title || ''}${F ? ` · ${F.name}` : ''}`, [homeCrumb(), [T('doctorsH')]]) + `
      ${docs.length ? `<section class="section team-s"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(TM.h)}</h2></div>
        <ul class="team-grid">${docs.map(tmCard).join('')}</ul></div></section>`
        : `<section class="section"><div class="wrap">${A.doctorCard(S, true)}</div></section>`}
      ${F ? `<section class="section washed founder-s"><div class="wrap">${founderBlock(F, false)}</div></section>` : ''}
      <section class="section"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(T('servicesH'))}</h2></div>${A.svcCards(S)}</div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    docs.forEach(d => A.jsonld({'@context':'https://schema.org','@type':'Physician', name:d.name, alternateName:d.nameAlt, image:d.photo, identifier:d.license, description:d.role, medicalSpecialty:'PlasticSurgery', url:new URL(A.docUrl(d.key), location.href).href, worksFor:{'@type':'Hospital', name:'Apex Surgery Hospital'}}));
    if (location.hash === '#founder') setTimeout(() => { const f = A.qs('#founder'); f && f.scrollIntoView(); }, 60);
  }

  /* =================== PROMOTIONS =================== */
  async function promotions(){
    const S = A.d('shared') || {}, D = A.d('promotions') || {};
    A.setMeta(D.title, D.desc);
    const items = D.items || [];
    const start = A.param('c') && svcCats().includes(A.param('c')) ? A.param('c') : 'all';
    const filters = (D.filters || [{k:'all', x:T('all')}]).map(f => [f.k, f.k === 'all' ? T('all') : f.x]).filter(([k]) => k === 'all' || items.some(i => i.cat === k));
    const si = items.findIndex(p => p.price);
    const offers = items.map(p => offerOf(p, S));
    main().innerHTML = phead(D.h1 || T('promotions'), T('promosSub'), [homeCrumb(), [T('promotions')]]) + `
      ${si >= 0 ? `<section class="section night offer-spot-s"><div class="wrap">${offerSpot(items[si], S)}</div></section>` : ''}
      <section class="section offers-s"><div class="wrap">
        <div class="offers-bar">${chipsCount(filters, offers, start)}<div class="offers-cur" data-cur-picker></div></div>
        <div id="pgrid">${promoGrid(items, S, {game:true})}</div>
        <p class="note" style="margin-top:30px">${E(S.footerNote || '')}</p></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    const apply = k => A.qsa('#pgrid .offer:not(.offer-game)').forEach(el => el.hidden = !(k === 'all' || el.dataset.cat === k));
    apply(start);
    bindChips(main(), apply);
    A.bindMedia(main());
    bindOffers(main());
  }

  /* =================== REVIEWS =================== */
  const storyCard = (x, i, S) => {
    const {p, d} = x;
    const inner = (d.blocks || []).filter(b => b.t === 'img' && b.src).map(b => b.src);
    const imgs = [p.img || inner[0], ...inner.filter(src => src !== p.img)].filter(Boolean).slice(0, 4);
    const q = spoken((d.blocks || []).filter(b => b.t === 'p').map(b => b.x))[0] || '';
    const proc = procOf((d.tag || '') + ' ' + p.title + ' ' + p.key);
    return `<article class="story${i === 0 ? ' big' : ''} rv" data-d="${(i % 2) * 80}" data-cat="${E(proc || '')}">
      <a class="st-media" href="${A.postUrl(p.key)}" aria-label="${E(p.title)}" tabindex="-1">
        <span class="st-main ph-img"><img src="${IMG(imgs[0])}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" decoding="async"></span>
        ${imgs.length > 1 ? `<span class="st-stack" aria-hidden="true">${imgs.slice(1, 4).map((src, j) => `<span class="st-th ph-img" style="--k:${j}"><img src="${IMG(src)}" alt="" loading="lazy" decoding="async" decoding="async"></span>`).join('')}</span>` : ''}
      </a>
      <div class="st-body">
        <p class="st-meta">${proc ? `<span class="pc-cat">${E(svcName(S, proc))}</span>` : ''}${p.date ? `<time datetime="${E(p.date)}">${E(A.fmtDate(p.date))}</time>` : ''}</p>
        <h3><a href="${A.postUrl(p.key)}">${E(p.title)}</a></h3>
        ${q ? `<blockquote class="st-q">${I('quote')}<p>${E(q)}</p></blockquote>` : (p.desc ? `<p class="st-ex">${E(p.desc)}</p>` : '')}
        <a class="link-arrow" href="${A.postUrl(p.key)}">${E(T('readStory'))} ${I('arrow-right')}</a>
      </div></article>`;
  };
  async function reviews(){
    const S = A.d('shared') || {}, D = A.d('reviews') || {}, P = A.d('posts') || [], H = A.d('home') || {};
    A.setMeta(D.title, D.desc);
    const items = D.items || [];
    const g = A.gallery(items.map(r => ({src:r.src, alt:r.alt || ''})));
    const rp = P.filter(p => p.cat === 'review');
    const loaded = await Promise.all(rp.map(p => A.data('post/' + p.key, 'post:' + p.key).catch(() => null)));
    const stories = rp.map((p, i) => ({p, d:loaded[i]})).filter(x => x.d && (x.d.blocks || []).some(b => b.t === 'img'));
    const others = rp.filter(p => !stories.some(x => x.p.key === p.key));
    const sCats = svcCats().filter(k => stories.some(x => procOf((x.d.tag || '') + ' ' + x.p.title + ' ' + x.p.key) === k));
    main().innerHTML = phead(D.h1 || T('reviews'), T('reviewsSub'), [homeCrumb(), [T('reviews')]]) + `
      <section class="section rx-s"><div class="wrap">
        <div class="shead"><div><p class="eyebrow rv">${E(T('rxEyebrow'))}</p><h2 class="h-xl rv">${E(T('rxH'))}</h2></div><p class="note rv">${E(T('rxSub'))}</p></div>
        <div id="rx" class="rx-host"></div></div></section>
      ${stories.length ? `<section class="section stories-s"><div class="wrap">
        <div class="shead"><h2 class="h-xl rv">${E(T('storiesH'))}</h2>${sCats.length > 1 ? chips([['all', T('all')], ...sCats.map(k => [k, svcName(S, k)])], 'all').replace('class="chips"', 'class="chips st-chips"') : ''}</div>
        <div class="story-grid" id="sgrid">${stories.map((x, i) => storyCard(x, i, S)).join('')}</div></div></section>` : ''}
      <section class="section night ba-wall"><div class="wrap">
        <div class="shead"><h2 class="h-xl rv">${E(T('baH'))}</h2><p class="note on-night rv">${E(T('resultsVary'))}</p></div>
        <div id="ba" class="ba-host">${baGrid(items.map(r => r.src), T('baH'))}</div></div></section>
      <section class="section night"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(H.reviewsRealH || T('storiesH'))}</h2></div>${storiesHost(H.videos, 'stories', H.reviewsRealH)}</div></section>
      <section class="section"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(T('updatesH'))}</h2><a class="link-arrow rv" href="blog.html?c=review">${E(T('viewAll'))} ${I('arrow-right')}</a></div>
        <div class="updates2">${S.facebook ? `<div class="fb-col">${A.fbLink(S.facebookSurgery, 'big')}${A.fbFrame(S.facebook, 600, 'timeline', S.facebookSurgery)}</div>` : ''}<div class="upd-list">${others.slice(0, 4).map((p, i) => postCard(p, i)).join('')}</div></div></div></section>
      <section class="section washed"><div class="wrap">${A.consultBand(S)}</div></section>`;
    const sg = A.qs('#sgrid');
    if (sg) bindChips(A.qs('.stories-s'), k => A.qsa('.story', sg).forEach(el => el.hidden = !(k === 'all' || el.dataset.cat === k)));
    const cases = baCases(items, S);
    mountShowcase(A.qs('#ba'), cases, {cats:svcCats().map(k => ({k, x:svcName(S, k)}))});
    A.mount(A.qs('#rx'), 'results', {cases, vary:T('resultsVary'), cats:svcCats().map(k => ({k, x:svcName(S, k), icon:A.img(((S.services || []).find(x => x.key === k) || {}).icon)}))});
    A.bindMedia(main());
    mountStories(A.qs('#stories'));
    A.fbMount(main());
  }

  /* =================== BLOG =================== */
  async function blog(){
    const S = A.d('shared') || {}, B = A.d('blogs') || {}, P = A.d('posts') || [];
    A.setMeta(B.title, B.desc);
    const start = ['review','blog','news'].includes(A.param('c')) ? A.param('c') : 'all';
    const cats = [['all', T('all')], ['review', T('catReview')], ['blog', T('catBlog')], ['news', T('catNews')]].filter(([k]) => k === 'all' || P.some(p => p.cat === k));
    main().innerHTML = phead(B.h1 || T('articles'), null, [homeCrumb(), [T('articles')]]) + `
      <section class="section" style="padding-top:50px"><div class="wrap">
        ${chips(cats, start)}
        <div class="post-grid lg" id="bgrid">${P.map((p, i) => postCard(p, i, i === 0)).join('')}</div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    const apply = k => A.qsa('#bgrid .post-card').forEach(el => el.hidden = !(k === 'all' || el.dataset.cat === k));
    apply(start);
    bindChips(main(), apply);
  }

  /* =================== ARTICLE =================== */
  /* editorial body: lede, drop-in key facts, pull quotes from the client's own words, interleaved photos, numbered questions, card lists */
  const factsBox = (proc, S) => {
    const R = recovOf(S, proc);
    if (!R.length) return '';
    return `<aside class="facts rv"><p class="facts-h">${I('clipboard-check')}<span>${E(T('keyFacts'))}</span></p>
      <dl><div class="f-proc"><dt>${E(T('procedure'))}</dt><dd><a href="${A.svcUrl(proc)}">${E(svcName(S, proc))}</a></dd></div>
      ${R.map(([w, x]) => `<div><dt>${E(x)}</dt><dd>${E(w)}</dd></div>`).join('')}</dl>
      <p class="note">${E(T('resultsVary'))}</p><a class="link-arrow" href="${A.svcUrl(proc)}">${E(T('seeService'))} ${I('arrow-right')}</a></aside>`;
  };
  function articleBody(D, key, S){
    const bl = (D.blocks || []).filter(b => !(b.t === 'p' && !String(b.x || '').trim()));
    const paras = bl.filter(b => b.t === 'p').map(b => b.x);
    const total = bl.map(b => (b.x || '') + ' ' + (b.items || []).map(i => i.x || i).join(' ')).join(' ');
    const long = total.length > (A.lang === 'th' ? 2600 : 3200);
    const proc = D.cat === 'news' || D.noFacts ? null : procOf((D.tag || '') + ' ' + D.title + ' ' + key);
    const imgN = bl.filter(b => b.t === 'img').length;
    const extra = (imgN === 0 && long ? (POST_PHOTOS[key] || []) : imgN <= 1 && total.length > 9000 ? (POST_PHOTOS[key] || []).slice(0, 2) : []).map(k => ph(k)).filter(Boolean);
    let quotes = D.cat === 'review' ? spoken(paras.slice(1)) : [];
    if (!quotes.length && long) { const q = pickQuote(paras.slice(1), false); if (q) quotes.push(q); }
    quotes = quotes.slice(0, total.length > 6000 ? 2 : 1);
    const heads = bl.map((b, i) => (b.t === 'h2' || b.t === 'h3') && i > 2 ? i : -1).filter(i => i > 0);
    const ins = {};
    const put = (i, html) => { (ins[i] = ins[i] || []).push(html); };
    const used = new Set();
    const slot = frac => { if (!heads.length) return null; let k = Math.min(heads.length - 1, Math.floor(frac * heads.length)); while (used.has(heads[k]) && k < heads.length - 1) k++; used.add(heads[k]); return heads[k]; };
    extra.forEach((img, j) => { const at = slot((j + 1) / (extra.length + 1)); if (at != null) put(at, figure(img, j % 2 ? 'side' : 'wide')); });
    quotes.forEach((q, j) => { const at = slot(j ? .78 : .42); if (at != null) put(at, pullQuote(q, j % 2 ? 'alt' : '')); });
    if (proc) { const p2 = bl.findIndex((b, i) => b.t === 'p' && bl.slice(0, i).filter(x => x.t === 'p').length === 1); const at = p2 > 0 ? p2 + 1 : (heads[0] || 1); put(at, factsBox(proc, S)); }
    const useH3 = bl.filter(b => b.t === 'h2').length < 3 && bl.filter(b => b.t === 'h3').length >= 3;
    const toc = [];
    let html = '', firstP = true;
    for (let i = 0; i < bl.length; i++) {
      (ins[i] || []).forEach(x => html += x);
      const b = bl[i];
      switch (b.t) {
        case 'h2': case 'h3': {
          const isToc = b.t === 'h2' || useH3;
          const id = isToc ? 's-' + toc.length : '';
          if (isToc) toc.push({id, x:b.x});
          const m = String(b.x).match(/^(\d{1,2})[.)]\s*(.+)$/);
          html += m ? `<${b.t} ${id ? `id="${id}" ` : ''}class="qnum"><span class="qn" aria-hidden="true">${m[1]}</span><span class="qt"><span class="sr">${m[1]}. </span>${E(m[2])}</span></${b.t}>` : `<${b.t}${id ? ` id="${id}"` : ''}>${E(b.x)}</${b.t}>`;
          break;
        }
        case 'h4': case 'h5': case 'h6': html += `<${b.t}>${E(b.x)}</${b.t}>`; break;
        case 'p': html += `<p class="${firstP ? 'lede' : ''}${b.b ? ' b' : ''}">${A.inl(b.x)}</p>`; firstP = false; break;
        case 'list': {
          const items = (b.items || []).map(li => li.x || li);
          const lab = items.filter(x => splitLabel(x)[0]).length;
          if (items.length >= 3 && lab >= items.length - 1 && items.join('').length / items.length > 70) {
            html += `<ul class="li-cards">${items.map((x, j) => { const [l, t] = splitLabel(x); return `<li><span class="lc-ic">${I(pickIcon(l || x, j))}</span><div>${l ? `<b>${E(l)}</b><p>${A.inl(t)}</p>` : `<p>${A.inl(t)}</p>`}</div></li>`; }).join('')}</ul>`;
          } else { const tag = b.o ? 'ol' : 'ul'; html += `<${tag}>${items.map(x => `<li>${A.fmtLi(x)}</li>`).join('')}</${tag}>`; }
          break;
        }
        case 'img': {
          const run = [];
          while (i < bl.length && bl[i].t === 'img') { if (bl[i].src) run.push(bl[i]); i++; }
          i--;
          if (run.length === 1) html += figure({src:run[0].src, alt:run[0].alt || D.title}, 'wide', false);
          else if (run.length > 1) { const g = A.gallery(run.map(r => ({src:r.src, alt:r.alt || D.title}))); html += `<div class="art-gal n${Math.min(run.length, 3)} rv">${run.map((r, j) => `<button type="button" class="ag-i ph-img" ${g.attr(j)} aria-label="${E(T('image'))} ${j + 1}"><img src="${IMG(r.src)}" alt="${E(r.alt || D.title)}" loading="lazy" decoding="async" decoding="async"></button>`).join('')}</div>`; }
          break;
        }
        case 'yt': html += `<div class="ytbox"><button type="button" data-yt="${E(b.id)}" aria-label="${E(T('playVideo'))}"><img loading="lazy" decoding="async" src="${A.yt(b.id)}" alt=""><span class="pl">${I('play')}</span></button></div>`; break;
        case 'faqs': html += A.faqHtml((b.items || []).map(q => ({q:q.q, a:q.a}))); break;
        case 'table': html += `<div class="tbl"><table>${(b.rows || []).map((r, j) => `<tr>${r.map(c => j === 0 ? `<th>${A.inl(c)}</th>` : `<td>${A.inl(c)}</td>`).join('')}</tr>`).join('')}</table></div>`; break;
        case 'btn': if (b.h) html += `<p><a class="btn btn-plum btn-sm" href="${A.url(b.h)}" target="_blank" rel="noopener">${E(b.x)}</a></p>`; break;
      }
    }
    (ins[bl.length] || []).forEach(x => html += x);
    return {html, toc, mins:readMins(total), proc};
  }

  async function article(){
    const S = A.d('shared') || {}, P = A.d('posts') || [];
    const key = A.param('p') || (P[0] && P[0].key);
    let D;
    try { D = await A.data('post/' + key, 'post:' + key); } catch (e) { D = null; }
    if (!D) { main().innerHTML = phead(T('notFoundH'), T('loadError'), [homeCrumb(), [T('articles'), 'blog.html']]); return; }
    const meta = P.find(p => p.key === key) || {};
    A.setMeta(`${D.title} | Apex Surgery Hospital`, meta.desc);
    const catName = T({review:'catReview', blog:'catBlog', news:'catNews'}[D.cat] || 'articles');
    const crumbs = [homeCrumb(), [T('articles'), 'blog.html'], [catName, 'blog.html?c=' + (D.cat || '')]];
    const related = P.filter(p => p.key !== key && p.cat === D.cat).slice(0, 3);
    const body = articleBody(D, key, S);
    const hasToc = body.toc.length > 2;
    main().innerHTML = `
      <section class="art-head"><div class="phead-lines" aria-hidden="true"></div><div class="sh-glow" aria-hidden="true"></div><div class="wrap">${A.crumbs(crumbs)}
        <p class="art-meta rv"><span class="pc-cat">${E(catName)}</span>${D.date ? `<time datetime="${E(D.date)}">${E(A.fmtDate(D.date))}</time>` : ''}<span class="art-read">${I('clock')}${E(T('readMin').replace('{n}', body.mins))}</span></p>
        <h1 class="h-xl rv" data-d="60" data-field="post.title">${E(D.title)}</h1>
</div></section>
      ${D.img ? `<figure class="art-banner ph-img rv-clip wrap-mid"><img src="${IMG(D.img)}" alt="${E(D.title)}" data-par="22" fetchpriority="high"></figure>` : ''}
      <section class="section art-s"><div class="wrap art-grid${hasToc ? '' : ' notoc'}">${hasToc ? `<nav class="toc art-toc" id="toc" aria-label="${E(T('inArticle'))}"><p class="toc-h">${E(T('inArticle'))}</p>${body.toc.map(x => `<a href="#${x.id}">${E(x.x)}</a>`).join('')}</nav>` : ''}<article class="prose art-prose" id="body" data-field="post.blocks">${body.html}${(D.tags || []).length ? `<div class="art-tags">${D.tags.map(t => `<span class="o-tag">${E(t)}</span>`).join('')}</div>` : ''}</article></div></section>
      ${related.length ? `<section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-l rv">${E(catName)}</h2><a class="link-arrow rv" href="blog.html">${E(T('backToArticles'))} ${I('arrow-right')}</a></div><div class="post-grid">${related.map((p, i) => postCard(p, i)).join('')}</div></div></section>` : ''}
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    A.bindMedia(main());
    if (hasToc) A.tocSpy(A.qs('#toc'), body.toc.map(x => x.id));
    A.readBar();
    A.jsonld({'@context':'https://schema.org','@type':'Article', headline:D.title, datePublished:D.date, image:IMG(D.img), inLanguage:A.lang, publisher:{'@type':'Organization', name:'Apex Surgery Hospital'}});
    const faq = (D.blocks || []).filter(b => b.t === 'faqs').flatMap(b => b.items || []);
    if (faq.length) A.jsonld({'@context':'https://schema.org','@type':'FAQPage', mainEntity:faq.map(q => ({'@type':'Question', name:q.q, acceptedAnswer:{'@type':'Answer', text:(q.a || []).map(a => a.x || a).join(' ')}}))});
    A.breadcrumbLd([...crumbs, [D.title]].map(c => [c[0], c[1] || location.href]));
  }

  /* =================== SURGERY WARS =================== */
  /* hub (surgery-wars.html) and one episode (surgery-wars.html?ep=N); data/<lang>/war.js lists the episodes, war/<n>.js holds each article */
  const warUrl = n => 'surgery-wars.html?ep=' + n;
  /* Thai has no spaces between words, and the browser's word list splits some loan words badly ("แมส|ก์"), so Thai headings only break at the spaces the writer put in */
  const nb = t => A.lang === 'th' ? String(t || '').split(/\s+/).filter(Boolean).map(w => `<span class="nw">${E(w)}</span>`).join(' ') : E(t);
  const warSrc = s => s && !/^(https?:|~\/)/.test(s) ? A.assets + s : s;
  const warCard = (e, i=0) => `<a class="war-card rv" data-d="${(i % 4) * 60}" href="${warUrl(e.n)}" data-new="war:${e.n}">
      <span class="wc-ph ph-img"><img src="${IMG(warSrc(e.cover))}" alt="" loading="lazy" decoding="async" width="640" height="336"><span class="wc-ep">EP.${e.n}</span><span class="wc-pl" aria-hidden="true">${I('play')}</span></span>
      <span class="wc-t">${nb(e.title)}</span></a>`;
  const WAR_PROC = [['facelift', /ดึงหน้า|ดึงคอ|face ?lift|neck lift/i], ['browlift', /ยกคิ้ว|ยกหน้าผาก|brow lift|forehead lift/i], ['rhinoplasty', /เสริมจมูก|แก้จมูก|rhinoplasty/i],
    ['eyelid', /ตาสองชั้น|ทำตา|ตาบน|หนังตา|eyelid/i], ['bone', /กระดูกคาง|ผ่าตัดขากรรไกร|genioplasty|jaw surgery/i], ['breast', /เสริมหน้าอก|ยกกระชับหน้าอก|breast (augmentation|lift)/i], ['lipo', /ดูดไขมัน|liposuction/i]];
  const warStage = (e, D) => `<div class="war-stage rv-clip"><button type="button" class="ws-poster" data-ytw="${E(D.yt || e.yt)}" aria-label="${E(T('warWatch').replace('{n}', e.n))}">
      <img src="${IMG(warSrc(e.img))}" alt="${E(D.title)}" width="1200" height="630" fetchpriority="high"><span class="ws-play">${I('play')}<span>${E(T('warWatch').replace('{n}', e.n))}</span></span></button></div>`;

  /* Transformations (transformations.html): one section per show or series; data/<lang>/shows.js lists them, each series points at its own data file */
  async function shows(){
    const S = A.d('shared') || {}, D = A.d('shows') || {}, list = D.series || [];
    const eps = x => ((A.d(x.data) || {}).episodes) || [];
    const covers = list.flatMap(eps).filter(e => e.cover);
    main().innerHTML = `
      <section class="war-head night"><div class="hb-glow" aria-hidden="true"></div><div class="wrap wh-grid"><div class="wh-copy">
        ${A.crumbs([homeCrumb(), [T('shows')]])}
        <p class="eyebrow on-night rv">${E(list.map(x => x.name).join(' · '))}</p>
        <h1 class="display-s sh-h1 rv" data-d="60">${nb(T('shows'))}</h1>
        <p class="lead rv" data-d="120">${E(T('showsLead'))}</p></div>
        <div class="wh-stack" aria-hidden="true">${[covers[7], covers[3], covers[0]].filter(Boolean).map((x, i) => `<img class="whs-${i}" src="${IMG(warSrc(x.cover))}" alt="" width="640" height="336">`).join('')}</div>
      </div></section>
      ${list.map((x, k) => { const e = eps(x); return `<section class="section sh-series${k % 2 ? ' washed' : ''}" id="${E(x.key)}"><div class="wrap">
        <div class="shead"><div><p class="eyebrow rv">${E(x.channel || '')}${e.length ? ' · ' + E(T('showsEps').replace('{n}', e.length)) : ''}</p><h2 class="h-xl rv">${nb(x.name)}</h2><p class="reels-sub rv">${E(x.lead || '')}</p></div>
          <div class="rail-ctrl rv"><button type="button" data-rp="${k}" aria-label="${E(T('prev'))}">${I('chevron-left')}</button><button type="button" data-rn="${k}" aria-label="${E(T('next'))}">${I('chevron-right')}</button></div></div>
        <div class="rail war-rail" data-rail="${k}">${e.map((y, i) => warCard(y, i)).join('')}</div>
        <a class="link-arrow rv" href="${A.url(x.href)}">${E(T('showsSeries'))} ${I('arrow-right')}</a></div></section>`; }).join('')}
      <section class="section washed social-s"><div class="wrap">${A.socialWall(S, {fb:true})}</div></section>
      <section class="section sh-soon-s"><div class="wrap"><div class="sh-soon rv"><span class="sh-soon-i">${I('play')}</span><div><h2 class="h-m">${E(T('showsSoon'))}</h2><p>${E(T('showsSoonP'))}</p></div></div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    A.socialMount(main());
    list.forEach((x, k) => A.railCtrl(A.qs(`[data-rail="${k}"]`), A.qs(`[data-rp="${k}"]`), A.qs(`[data-rn="${k}"]`)));
    A.jsonld({'@context':'https://schema.org', '@type':'ItemList', itemListElement:list.map((x, i) => ({'@type':'ListItem', position:i + 1, url:new URL(x.href, location.href).href, name:x.name}))});
  }
  async function war(){
    const S = A.d('shared') || {}, W = A.d('war') || {}, eps = W.episodes || [];
    const n = +A.param('ep');
    const e = eps.find(x => x.n === n);
    if (!e) {
      main().innerHTML = `
      <section class="war-head night"><div class="hb-glow" aria-hidden="true"></div><div class="wrap wh-grid"><div class="wh-copy">
        ${A.crumbs([homeCrumb(), [T('shows'), 'transformations.html'], [T('war')]])}
        <p class="eyebrow on-night rv">Workpoint 23</p>
        <h1 class="display-s rv" data-d="60">${nb(T('warH'))}</h1>
        <p class="lead rv" data-d="120">${E(T('warLead'))}</p>
        ${eps.length ? `<a class="btn btn-light rv" data-d="180" href="${warUrl(eps[0].n)}">${I('play')}${E(T('warStart'))}</a>` : ''}</div>
        <div class="wh-stack" aria-hidden="true">${[eps[7], eps[3], eps[0]].filter(Boolean).map((x, i) => `<img class="whs-${i}" src="${IMG(warSrc(x.cover))}" alt="" width="640" height="336">`).join('')}</div>
      </div></section>
      <section class="section war-list"><div class="wrap"><div class="war-grid">${eps.map((x, i) => warCard(x, i)).join('')}</div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
      A.jsonld({'@context':'https://schema.org', '@type':'ItemList', itemListElement:eps.map((x, i) => ({'@type':'ListItem', position:i + 1, url:new URL(warUrl(x.n), location.href).href, name:x.full || x.title}))});
      return;
    }
    let D;
    try { D = await A.data('war/' + n, 'war:' + n); } catch (err) { D = null; }
    if (!D) { main().innerHTML = phead(T('notFoundH'), T('loadError'), [homeCrumb(), [T('shows'), 'transformations.html'], [T('war'), 'surgery-wars.html']]); return; }
    A.setMeta(`${D.title} | Apex Surgery Hospital`, D.desc);
    const blocks = (D.blocks || []).map(b => b.t === 'img' ? Object.assign({}, b, {src:warSrc(b.src)}) : b);
    const photos = blocks.filter(b => b.t === 'img');
    // the first photo is the episode's cover, which the video poster already shows
    const bodyBlocks = blocks[0] && blocks[0].t === 'img' ? blocks.slice(1) : blocks;
    const body = articleBody({title:D.title, cat:'review', noFacts:true, blocks:bodyBlocks}, 'war-' + n, S);
    const text = JSON.stringify(D.blocks || []);
    const procs = WAR_PROC.filter(([, r]) => r.test(text)).map(([k]) => k);
    const g = A.gallery(photos.map(p => ({src:p.src, alt:p.alt})));
    const i0 = eps.indexOf(e), prev = eps[i0 - 1], next = eps[i0 + 1];
    const crumbs = [homeCrumb(), [T('shows'), 'transformations.html'], [T('war'), 'surgery-wars.html'], ['EP.' + n]];
    const hasToc = body.toc.length > 2;
    main().innerHTML = `
      <section class="art-head war-ep-head"><div class="phead-lines" aria-hidden="true"></div><div class="sh-glow" aria-hidden="true"></div><div class="wrap">${A.crumbs(crumbs)}
        <p class="art-meta rv"><span class="pc-cat">Surgery Wars · EP.${n}</span><span>Workpoint 23</span><span class="art-read">${I('clock')}${E(T('readMin').replace('{n}', body.mins))}</span></p>
        <h1 class="h-l rv" data-d="60">${nb(D.title)}</h1></div></section>
      <div class="wrap-mid war-top">
        ${warStage(e, D)}
        <nav class="war-eps" aria-label="${E(T('warAll'))}">${eps.map(x => `<a href="${warUrl(x.n)}"${x.n === n ? ' aria-current="page"' : ''}>EP.${x.n}</a>`).join('')}</nav>
        ${photos.length ? `<div class="war-photos"><p class="wp-h">${I('image')}<span>${E(T('warPhotos'))}</span><i>${photos.length}</i></p><div class="wp-rail">${photos.map((p, j) => `<button type="button" class="wp-th ph-img" ${g.attr(j)} aria-label="${E(T('image'))} ${j + 1}"><img src="${IMG(p.src)}" alt="${E(p.alt || '')}" loading="lazy" decoding="async" width="1200" height="630"></button>`).join('')}</div></div>` : ''}
      </div>
      <section class="section art-s war-art"><div class="wrap art-grid${hasToc ? '' : ' notoc'}">${hasToc ? `<nav class="toc art-toc" id="toc" aria-label="${E(T('inArticle'))}"><p class="toc-h">${E(T('inArticle'))}</p>${body.toc.map(x => `<a href="#${x.id}">${E(x.x)}</a>`).join('')}</nav>` : ''}<article class="prose art-prose" id="body">${body.html}
        ${procs.length ? `<aside class="war-procs rv"><p class="facts-h">${I('stethoscope')}<span>${E(T('warProcs'))}</span></p><div class="wpr-l">${procs.map(k => `<a class="chip" href="${A.svcUrl(k)}">${E(svcName(S, k))}${I('arrow-right')}</a>`).join('')}</div><p class="note">${E(T('resultsVary'))}</p></aside>` : ''}</article></div></section>
      <section class="section washed war-more"><div class="wrap">
        <div class="war-pn">${prev ? `<a class="wpn prev" href="${warUrl(prev.n)}"><small>${I('arrow-left')}${E(T('warPrev'))}</small><b>EP.${prev.n} ${E(prev.title)}</b></a>` : '<span></span>'}${next ? `<a class="wpn next" href="${warUrl(next.n)}"><small>${E(T('warNext'))}${I('arrow-right')}</small><b>EP.${next.n} ${E(next.title)}</b></a>` : ''}</div>
        <div class="shead"><h2 class="h-l rv">${E(T('warAll'))}</h2><a class="link-arrow rv" href="surgery-wars.html">${E(T('warH'))} ${I('arrow-right')}</a></div>
        <div class="war-grid sm">${eps.filter(x => x.n !== n).map((x, i) => warCard(x, i)).join('')}</div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    A.bindMedia(main());
    main().addEventListener('click', ev => {
      const b = ev.target.closest('[data-ytw]');
      if (!b) return;
      const box = b.parentElement;
      box.classList.add('playing');
      box.innerHTML = `<iframe src="${A.ytSrc(b.dataset.ytw)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${E(D.title)}"></iframe>`;
      A.emit('war:play', {ep:n});
    });
    if (hasToc) A.tocSpy(A.qs('#toc'), body.toc.map(x => x.id));
    A.readBar();
    A.jsonld({'@context':'https://schema.org', '@type':'VideoObject', name:D.title, description:D.desc, thumbnailUrl:[new URL(IMG(warSrc(e.img)), location.href).href, A.yt(D.yt || e.yt)],
      embedUrl:'https://www.youtube.com/embed/' + (D.yt || e.yt), contentUrl:'https://www.youtube.com/watch?v=' + (D.yt || e.yt), uploadDate:D.date || undefined, inLanguage:'th'});
    A.breadcrumbLd(crumbs.map(c => [c[0], c[1] || location.href]));
  }

  /* =================== CONTACT =================== */
  async function contact(){
    const S = A.d('shared') || {}, D = A.d('contact') || {};
    A.setMeta(D.title, D.desc);
    const b0 = (S.branches || [])[0] || {};
    main().innerHTML = phead(D.h1 || T('contact'), null, [homeCrumb(), [T('contact')]]) + `
      <section class="section" style="padding-top:50px"><div class="wrap contact2">
        <div class="channels">
          <a class="chan rv" href="${A.url((S.line && S.line.h) || '#')}" target="_blank" rel="noopener"><span class="chan-ic ln">${I('line')}</span><span><b>LINE</b><small>${E((S.line && S.line.x) || '')}</small></span><img class="chan-qr" src="${IMG(S.line && S.line.qr)}" alt="LINE QR" loading="lazy" decoding="async" decoding="async"></a>
          <a class="chan rv" data-d="60" href="${A.url(A.WA.h)}" target="_blank" rel="noopener"><span class="chan-ic wa">${I('whatsapp')}</span><span><b>WhatsApp</b><small>${E(T('whatsappSub'))} · ${E(A.WA.x)}</small></span>${I('arrow-up-right')}</a>
          ${(S.branches || []).map((b, i) => `<a class="chan rv" data-d="${120 + i*60}" href="${A.url(b.tel)}"><span class="chan-ic">${I('phone')}</span><span><b>${E(b.phone)}</b><small>${E(b.short || b.name)}</small></span>${I('arrow-up-right')}</a>`).join('')}
          ${(S.socials || []).filter(s => s.k !== 'line').map(s => `<a class="chan sm rv" href="${A.url(s.h)}" target="_blank" rel="noopener"><span class="chan-ic">${A.socIcon(s.k)}</span><span><b>${E(s.x)}</b></span>${I('arrow-up-right')}</a>`).join('')}
        </div>
        <div class="consult-col"><div id="consult" class="consult-host"><h2 class="h-l">${E(D.formH || T('consultPageH'))}</h2><p class="muted">${E(T('consultPageP'))}</p><a class="btn btn-plum" href="consult.html">${I('message-circle')}${E(T('consultBtn'))}</a></div></div>
      </div></section>
      <section class="section social-s"><div class="wrap">${A.socialWall(S, {fb:true})}</div></section>
      <section class="section washed"><div class="wrap">${A.branchesHtml(S, D.branches && D.branches.h, D.branches && D.branches.p)}</div></section>`;
    A.socialMount(main());
    A.mount('#consult', 'consult', {compact:true, links:{privacy:'privacy.html'}});
  }

  /* =================== FEATURE PAGES =================== */
  const featurePage = (name, h, p, hostId, extra={}, cls='') => async () => {
    const S = A.d('shared') || {};
    main().innerHTML = phead(T(h), p ? T(p) : null, [homeCrumb(), [T(h)]]) + `<section class="section feat-s ${cls}"><div class="wrap"><div id="${hostId}" class="feat-page-host"></div></div></section>
      ${name === 'plan' || name === 'consult' ? '' : `<section class="section washed"><div class="wrap">${A.consultBand(S)}</div></section>`}`;
    const ex = typeof extra === 'function' ? extra() : extra;
    await A.mount('#' + hostId, name, ex);
  };
  const proportions = featurePage('proportions', 'propPageH', 'propPageP', 'proportions', () => A.mpBase ? {mpBase:A.mpBase} : {}, 'prop-s');
  const filler = featurePage('filler', 'fillPageH', 'fillPageP', 'filler', {}, 'prop-s');
  const analysis = featurePage('analysis', 'anaPageH', 'anaPageP', 'analysis', () => Object.assign(A.mpBase ? {mpBase:A.mpBase} : {}, {links:{consult:'consult.html', proportions:'proportions.html'}}), 'prop-s');
  const play = featurePage('games', 'playPageH', 'playPageP', 'games', {}, 'play-s');
  const IMPL_LINKS = {breast:'breast-implants.html', chin:'chin-implants.html', forehead:'forehead-implants.html', nose:'nose-implants.html', consult:'consult.html'};
  const implPage = (area, h, p) => featurePage('implants', h, p, 'implants', () => ({area, links:IMPL_LINKS}), 'prop-s');
  const implBreast = implPage('breast', 'implBreastH', 'implBreastP'), implChin = implPage('chin', 'implChinH', 'implChinP');
  const implForehead = implPage('forehead', 'implForeheadH', 'implForeheadP'), implNose = implPage('nose', 'implNoseH', 'implNoseP');
  const LINKS = {bodymap:'index.html#hero', nose:'nose-implants.html', implants:'breast-implants.html', analysis:'analysis.html', proportions:'proportions.html', games:'play.html', trip:'trip.html', plan:'plan.html', consult:'consult.html'};
  const plan = featurePage('plan', 'planPageH', 'planPageP', 'plan', {links:LINKS});
  const trip = featurePage('trip', 'tripPageH', 'tripP', 'trip', () => Object.assign({links:LINKS}, A.param('p') ? {procedures:[A.param('p')]} : {}));
  const consult = featurePage('consult', 'consultPageH', 'consultPageP', 'consult', () => ({procedure:A.param('p') || undefined, links:{privacy:'privacy.html'}}));

  async function notfound(){
    main().innerHTML = `<section class="phead nf"><div class="phead-lines" aria-hidden="true"></div><div class="wrap"><p class="nf-code rv">404</p><h1 class="display-s rv">${E(T('notFoundH'))}</h1><p class="lead rv" style="margin-top:18px">${E(T('notFoundP'))}</p>
      <div class="nf-links rv"><a class="btn btn-light" href="index.html">${E(T('goHome'))}</a><a class="btn btn-ghost" href="services.html">${E(T('services'))}</a><a class="btn btn-ghost" href="blog.html">${E(T('articles'))}</a><a class="btn btn-ghost" href="contact.html">${E(T('contact'))}</a></div></div></section>`;
  }

  /* plain text pages: headings, paragraphs, lists, photos, questions and tables (inc/render-pages.php apex_plain_blocks) */
  const plainBlocks = bl => (bl || []).map(b => {
    switch (b.t) {
      case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return `<${b.t}>${E(b.x)}</${b.t}>`;
      case 'p': return `<p${b.b ? ' class="b"' : ''}>${A.inl(b.x)}</p>`;
      case 'list': { const tag = b.o ? 'ol' : 'ul'; return `<${tag}>${(b.items || []).map(x => `<li>${A.fmtLi(x.x || x)}</li>`).join('')}</${tag}>`; }
      case 'img': return b.src ? `<figure class="ph-img"><img loading="lazy" decoding="async" src="${IMG(b.src)}" alt="${E(b.alt || '')}"></figure>` : '';
      case 'faqs': return A.faqHtml((b.items || []).map(q => ({q:q.q, a:q.a})));
      case 'table': return `<div class="tbl"><table>${(b.rows || []).map((r, j) => `<tr>${r.map(c => j === 0 ? `<th>${A.inl(c)}</th>` : `<td>${A.inl(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
    }
    return '';
  }).join('');
  async function privacy(){
    const D = A.d('privacy') || {};
    A.setMeta(D.title, D.desc);
    main().innerHTML = phead(D.h1 || T('privacy'), null, [homeCrumb(), [T('privacy')]]) + `<section class="section"><div class="wrap"><div class="prose art-prose" data-field="privacy.blocks">${plainBlocks(D.blocks)}</div></div></section>`;
  }

  const page = async () => {};   // any other WordPress page: the server's text as it is
  const PAGES = {home, services, treatments, service, about, doctor, promotions, reviews, blog, article, shows, war, contact, analysis, proportions, filler, implBreast, implChin, implForehead, implNose, play, plan, trip, consult, privacy, notfound, page};
  A.boot(() => (PAGES[document.body.dataset.page] || home)());
})();
