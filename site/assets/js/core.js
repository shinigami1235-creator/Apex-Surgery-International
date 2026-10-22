/* Apex Surgery Hospital: shared shell (header, footer, contact button, motion, lightbox, content renderer, feature mounting) */
(function(){
  const A = window.APEX = window.APEX || {};
  const SITE = 'https://www.apexsurgeryhospital.com/';
  document.documentElement.classList.remove('no-js');

  /* ---------- basics ---------- */
  A.SITE = SITE;
  A.lang = (document.documentElement.lang || 'en').slice(0, 2) === 'th' ? 'th' : 'en';
  A.root = A.lang === 'th' ? '../' : '';
  A.assets = A.root + 'assets/';
  A.dataBase = A.assets + 'data/' + A.lang + '/';
  A.img = s => !s ? '' : (s.startsWith('~/') ? SITE + s.slice(2) : s);
  A.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  A.qs = (s, r=document) => r.querySelector(s);
  A.qsa = (s, r=document) => [...r.querySelectorAll(s)];
  A.param = k => new URLSearchParams(location.search).get(k);
  A.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  A.t = k => ((A.I18N || {})[A.lang] || {})[k] || ((A.I18N || {}).en || {})[k] || k;
  A.d = id => (A._d || {})[id];
  A.fmtNum = n => Number(n).toLocaleString(A.lang === 'th' ? 'th-TH' : 'en-US');
  A.fmtDate = s => { try { return new Date(s + 'T00:00:00').toLocaleDateString(A.lang === 'th' ? 'th-TH' : 'en-GB', {day:'numeric', month:'long', year:'numeric'}); } catch (e) { return s; } };
  A.svcUrl = k => 'service.html?p=' + encodeURIComponent(k);
  A.postUrl = k => 'article.html?p=' + encodeURIComponent(k);
  A.yt = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  A.WA = {x:'+66 85 000 2001', h:'https://wa.me/66850002001'};

  A.ic = (n, cls='') => {
    const I = window.ICONS || {};
    if (n === 'close') n = 'x';
    if (I['b_'+n]) return `<svg class="i br ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${I['b_'+n]}"/></svg>`;
    if (I['l_'+n]) return `<svg class="i l ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I['l_'+n]}</svg>`;
    return '';
  };
  A.socIcon = k => A.ic(k) || A.ic('globe');

  /* ---------- data loading ---------- */
  A.load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.append(s); });
  A.data = (file, id) => { id = id || file.replace(/\//g, ':').replace(/\.js$/, ''); if (A.d(id)) return Promise.resolve(A.d(id)); return A.load(A.dataBase + file + (file.endsWith('.js') ? '' : '.js')).then(() => A.d(id)); };

  /* ---------- language ---------- */
  A.langHref = code => {
    const file = (location.pathname.split('/').pop() || 'index.html');
    const tail = file + location.search + location.hash;
    if (code === A.lang) return tail;
    return code === 'th' ? 'th/' + tail : '../' + tail;
  };

  /* ---------- events bridge (features call onEvent; the plan store and analytics listen) ---------- */
  A.emit = (name, data) => {
    try { window.dispatchEvent(new CustomEvent('apex:event', {detail:{name, data:data || {}, lang:A.lang, page:document.body.dataset.page}})); } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push({event:'apex_' + name.replace(/[^a-z0-9]+/gi, '_'), apex:data || {}}); } catch (e) {}
  };
  /* feature modules carry the build version so a new deploy is fetched fresh */
  A.vurl = path => { const u = new URL(path, location.href); if (window.APEX_V) u.searchParams.set('v', window.APEX_V); return u.href; };
  A.featureOpts = (extra={}) => Object.assign({
    lang: A.lang,
    base: new URL(A.assets, location.href).href,
    serviceUrl: k => A.svcUrl(k),
    onEvent: (n, d) => A.emit(n, d)
  }, extra);
  /* mount a feature module into a container; the page renders even if the module is missing */
  A.mount = async (el, name, extra={}) => {
    if (typeof el === 'string') el = A.qs(el);
    if (!el) return null;
    el.classList.add('feat-host');
    try {
      const m = await import(A.vurl(A.assets + 'features/' + name + '/index.js'));
      el.innerHTML = ''; el.classList.add('feat-on');
      return m.mount(el, A.featureOpts(extra));
    } catch (e) {
      console.warn('[apex] feature', name, e);
      el.classList.add('feat-off');
      if (!el.children.length) el.innerHTML = `<p class="feat-msg">${A.esc(A.t('moduleError'))}</p>`;
      return null;
    }
  };
  /* mount only once the host is near the viewport */
  A.mountLazy = (el, name, extra={}) => {
    if (typeof el === 'string') el = A.qs(el);
    if (!el) return;
    if (!('IntersectionObserver' in window)) return A.mount(el, name, extra);
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); A.mount(el, name, extra); } }, {rootMargin:'400px 0px'});
    io.observe(el);
  };

  A.jsonld = obj => { const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(obj); document.head.append(s); };
  A.setMeta = (title, desc) => {
    if (title) document.title = title;
    if (desc) { const m = A.qs('meta[name=description]'); if (m) m.content = desc; const o = A.qs('meta[property="og:description"]'); if (o) o.content = desc; }
    if (title) { const o = A.qs('meta[property="og:title"]'); if (o) o.content = title; }
  };

  /* ---------- header ---------- */
  const NAV = [['index.html','home'],['about.html','about'],['services.html','services'],['promotions.html','promotions'],['reviews.html','reviews'],['surgery-wars.html','war'],['blog.html','articles'],['contact.html','contact']];
  function header(){
    const S = A.d('shared') || {}, page = document.body.dataset.page || '';
    const svcs = S.services || [];
    const nav = NAV.map(([h, k]) => {
      const cur = k === page || (k === 'services' && page === 'service') || (k === 'articles' && page === 'article') ? ' aria-current="page"' : '';
      if (k === 'services') {
        const items = svcs.map(s => `<a class="mega-svc" href="${A.svcUrl(s.key)}"><span class="ms-ic"><img src="${A.img(s.icon)}" alt="" loading="lazy" decoding="async" decoding="async"></span><span><b>${A.esc(s.short || s.name)}</b><small>${A.esc(A.lang === 'en' ? (s.name !== s.en ? s.en : '') : s.en)}</small></span></a>`).join('');
        return `<div class="has-mega"><button type="button" aria-expanded="false"${cur}>${A.esc(A.t('services'))}${A.ic('chevron-down')}</button>
          <div class="mega surg" role="menu"><div class="mega-svcs">${items}</div>
          <div class="mega-tools"><h4>${A.esc(A.t('tools'))}</h4>
            <a href="nose.html">${A.ic('scan-face')}${A.esc(A.t('nose'))}</a>
            <a href="proportions.html">${A.ic('gem')}${A.esc(A.t('prop'))}</a>
            <a href="play.html">${A.ic('sparkles')}${A.esc(A.t('games'))}</a>
            <a href="trip.html">${A.ic('calendar')}${A.esc(A.t('trip'))}</a>
            <a href="doctor.html">${A.ic('stethoscope')}${A.esc(A.t('doctor'))}</a></div>
          <div class="mega-foot"><a class="link-arrow" href="services.html">${A.esc(A.t('allServices'))} ${A.ic('arrow-right')}</a></div></div></div>`;
      }
      return `<a href="${h}"${cur}>${A.esc(A.t(k))}</a>`;
    }).join('');
    const langs = [['en','EN'],['th','TH']].map(([c,t]) => `<a href="${A.langHref(c)}" hreflang="${c}" lang="${c}" class="${c===A.lang?'on':''}"${c===A.lang?' aria-current="true"':''}>${t}</a>`).join('');
    const el = document.createElement('header');
    el.className = 'hdr';
    el.innerHTML = `<a class="skip" href="#main">${A.esc(A.t('skip'))}</a><div class="hdr-in">
      <a class="hdr-logo" href="index.html" aria-label="Apex Surgery Hospital"><img src="${A.img(S.logo)}" alt="Apex Surgery Hospital" width="150" height="38"><span class="logo-txt" aria-hidden="true">APEX<small>Surgery Hospital</small></span></a>
      <nav class="hdr-nav" aria-label="Main">${nav}</nav>
      <div class="hdr-right"><div class="lang">${langs}</div>
        <a class="plan-link" href="plan.html" aria-label="${A.esc(A.t('plan'))}" title="${A.esc(A.t('plan'))}">${A.ic('list')}<span class="plan-n" hidden>0</span></a>
        <a class="btn btn-plum btn-sm hdr-cta" href="consult.html">${A.ic('message-circle')}${A.esc(A.t('consult'))}</a>
        <button class="burger" type="button" aria-label="${A.esc(A.t('menu'))}">${A.ic('menu')}</button></div></div>`;
    document.body.prepend(el);
    const logo = A.qs('.hdr-logo img', el);
    logo.addEventListener('error', () => el.classList.add('no-logo'));
    if (!S.logo) el.classList.add('no-logo');

    const mega = A.qs('.has-mega', el), mbtn = mega && A.qs('button', mega);
    if (mega) {
      let t;
      const open = v => { mega.classList.toggle('open', v); mbtn.setAttribute('aria-expanded', v); };
      mega.addEventListener('mouseenter', () => { clearTimeout(t); open(true); });
      mega.addEventListener('mouseleave', () => { t = setTimeout(() => open(false), 160); });
      mbtn.addEventListener('click', () => open(!mega.classList.contains('open')));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    }
    let last = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      el.classList.toggle('hide', y > 240 && y > last && !(mega && mega.classList.contains('open')));
      el.classList.toggle('scrolled', y > 40);
      last = y;
    }, {passive:true});

    const sh = document.createElement('div');
    sh.className = 'sheet'; sh.setAttribute('role','dialog'); sh.setAttribute('aria-modal','true'); sh.setAttribute('aria-label', A.t('menu'));
    const subs = svcs.map(s => `<a href="${A.svcUrl(s.key)}">${A.esc(s.short || s.name)}</a>`).join('');
    sh.innerHTML = `<div class="sheet-top"><span class="logo-txt light">APEX<small>Surgery Hospital</small></span><button class="close" aria-label="${A.esc(A.t('close'))}">${A.ic('close')}</button></div>
      <nav>${NAV.map(([h, k]) => k === 'services' ? `<details><summary>${A.esc(A.t('services'))}${A.ic('chevron-down')}</summary><div class="sub"><a href="services.html">${A.esc(A.t('allServices'))}</a>${subs}</div></details>` : `<a href="${h}">${A.esc(A.t(k))}${A.ic('arrow-up-right')}</a>`).join('')}
      <details><summary>${A.esc(A.t('tools'))}${A.ic('chevron-down')}</summary><div class="sub"><a href="nose.html">${A.esc(A.t('nose'))}</a><a href="proportions.html">${A.esc(A.t('prop'))}</a><a href="play.html">${A.esc(A.t('games'))}</a><a href="trip.html">${A.esc(A.t('trip'))}</a><a href="plan.html">${A.esc(A.t('plan'))}</a><a href="doctor.html">${A.esc(A.t('doctor'))}</a></div></details></nav>
      <div class="sheet-cta"><a class="btn btn-light" href="consult.html">${A.ic('message-circle')}${A.esc(A.t('consult'))}</a>
      <div class="lang" style="display:flex;justify-content:center;border-color:rgba(201,179,221,.3)">${langs}</div></div>`;
    document.body.append(sh);
    const toggle = v => { sh.classList.toggle('open', v); document.documentElement.style.overflow = v ? 'hidden' : ''; };
    A.qs('.burger', el).addEventListener('click', () => toggle(true));
    A.qs('.close', sh).addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sh.classList.contains('open')) toggle(false); });
  }

  /* My Plan badge: the plan store is a separate module; the badge stays hidden if it is missing */
  async function planBadge(){
    const n = A.qs('.plan-n');
    if (!n) return;
    const show = c => { n.textContent = c; n.hidden = !c; };
    try {
      const m = await import(new URL(A.assets + 'features/plan/store.js', location.href).href);
      const count = () => { try { if (typeof m.count === 'function') return m.count(); const p = (m.getPlan || m.get || m.load || (() => null))(); if (!p) return 0; return ['procedures','items','vouchers','noses','previews'].reduce((s, k) => s + (Array.isArray(p[k]) ? p[k].length : 0), 0); } catch (e) { return 0; } };
      show(count());
      if (typeof m.subscribe === 'function') m.subscribe(() => show(count()));
      window.addEventListener('apex:plan', () => show(count()));
      window.addEventListener('apex:event', () => setTimeout(() => show(count()), 60));
      window.addEventListener('storage', () => show(count()));
    } catch (e) { /* plan store not available yet */ }
  }

  /* ---------- footer ---------- */
  function footer(){
    const S = A.d('shared') || {};
    const f = document.createElement('footer');
    f.className = 'ftr';
    const ext = ' target="_blank" rel="noopener"';
    const br = (S.branches || []).map(b => `<div class="ftr-br"><h2 class="ftr-h">${A.esc(b.short || b.name)}</h2><p>${A.esc(b.addr)}</p>
      <button type="button" class="ftr-copy" data-copy="${A.esc(b.name + ', ' + b.addr)}">${A.ic('copy')}${A.ic('check')}<span>${A.esc(A.t('copyAddr'))}</span></button>
      <a href="${b.tel}">${A.ic('phone')}${A.esc(b.phone)}</a><a href="${b.map}"${ext}>${A.ic('navigation')}${A.esc(A.t('directions'))}</a></div>`).join('');
    const aaci = S.aaci ? `<a class="ftr-aaci" href="${S.aaci.h}"${ext} aria-label="${A.esc(A.t('aaciH'))}"><img src="${A.img(S.aaci.src)}" alt="${A.esc(S.aaci.alt)}" loading="lazy" decoding="async" width="84" height="84"><span><b>${A.esc(A.t('aaciH'))}</b><small>APEX Surgery Hospital Ploenchit</small></span></a>` : '';
    const svcs = (S.services || []).map(s => `<a href="${A.svcUrl(s.key)}">${A.esc(s.short || s.name)}</a>`).join('');
    f.innerHTML = `<div class="wrap"><div class="ftr-top surg">
      <div class="brand"><span class="logo-txt light">APEX<small>Surgery Hospital</small></span>
        <p>${A.esc(A.lang === 'th' ? S.brandTh : (S.brandTh && S.brand ? S.brand : S.brand))}</p>
        <p class="ftr-lic">${A.esc(S.license || '')}</p>${aaci}
        <div class="ftr-socials">${(S.socials || []).map(s => `<a href="${s.h}"${ext} aria-label="${A.esc(s.x || s.k)}">${A.socIcon(s.k)}</a>`).join('')}<a href="${A.WA.h}"${ext} aria-label="WhatsApp">${A.ic('whatsapp')}</a></div></div>
      <div><h2 class="ftr-h">${A.esc(A.t('ourServices'))}</h2>${svcs}<a href="nose.html">${A.esc(A.t('nose'))}</a><a href="proportions.html">${A.esc(A.t('prop'))}</a><a href="play.html">${A.esc(A.t('games'))}</a></div>
      ${br}
      <div><h2 class="ftr-h">${A.esc(A.t('contactLine'))}</h2><a href="${S.line && S.line.h}"${ext} style="padding:0"><img class="qr" src="${A.img(S.line && S.line.qr)}" alt="LINE ${A.esc(S.line && S.line.x)}" loading="lazy" decoding="async" decoding="async"></a><p style="margin-top:10px">${A.esc(S.line && S.line.x)}</p>
        <a href="${A.WA.h}"${ext}>${A.ic('whatsapp')}${A.esc(A.WA.x)}</a></div>
    </div>
    <div class="ftr-word" data-w="APEX" aria-hidden="true"></div>
    ${S.footerNote ? `<p class="ftr-note">${A.esc(S.footerNote)}</p>` : ''}
    <div class="ftr-bot"><span>${A.esc(S.copyright || '')}</span><span>${[['en','EN'],['th','TH']].map(([c,t]) => `<a href="${A.langHref(c)}" hreflang="${c}" style="display:inline;padding:0 6px">${t}</a>`).join('·')}</span></div></div>`;
    document.body.append(f);
  }

  /* ---------- floating contact ---------- */
  function fab(){
    const S = A.d('shared') || {};
    const ph = (S.branches || [])[0] || {phone:'088-870-0039', tel:'tel:0888700039'};
    const d = document.createElement('div');
    d.className = 'fab';
    d.innerHTML = `<div class="fab-list">
      <a class="wa" href="${A.WA.h}" target="_blank" rel="noopener">${A.ic('whatsapp')}<span>WhatsApp<small>${A.esc(A.t('whatsappSub'))}</small></span></a>
      <a class="ln" href="${(S.line && S.line.h) || 'https://lin.ee/D2Ir4vJ'}" target="_blank" rel="noopener">${A.ic('line')}<span>LINE<small>${A.esc((S.line && S.line.x) || '@apexsurgery')}</small></span></a>
      <a class="ph" href="${ph.tel}">${A.ic('phone')}<span>${A.esc(ph.phone)}<small>${A.esc(ph.short || '')}</small></span></a></div>
      <button class="fab-btn" type="button" aria-label="${A.esc(A.t('consult'))}" aria-expanded="false">${A.ic('message-circle')}</button>`;
    document.body.append(d);
    const b = A.qs('.fab-btn', d);
    b.addEventListener('click', () => { const o = d.classList.toggle('open'); b.setAttribute('aria-expanded', o); b.innerHTML = o ? A.ic('close') : A.ic('message-circle'); });
    A.qsa('a', d).forEach(a => a.addEventListener('click', () => A.emit('contact:click', {channel:a.className})));
  }

  /* ---------- reveal ---------- */
  A.reveal = (root=document) => {
    const els = A.qsa('.rv:not(.in),.rv-clip:not(.in),[data-in]:not(.in)', root);
    if (!('IntersectionObserver' in window) || A.reduced) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin:'0px 0px -6% 0px', threshold:.06});
    els.forEach(e => { if (e.dataset.d) e.style.transitionDelay = e.dataset.d + 'ms'; io.observe(e); });
  };

  /* ---------- lightbox ---------- */
  let lb, list = [], idx = 0, mode = 'img';
  function ensureLB(){
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true');
    lb.innerHTML = `<div class="lb-stage"></div><button class="lb-x" aria-label="${A.esc(A.t('close'))}">${A.ic('close')}</button><button class="lb-prev" aria-label="${A.esc(A.t('prev'))}">${A.ic('chevron-left')}</button><button class="lb-next" aria-label="${A.esc(A.t('next'))}">${A.ic('chevron-right')}</button><div class="lb-count"></div>`;
    document.body.append(lb);
    A.qs('.lb-x', lb).onclick = close;
    A.qs('.lb-prev', lb).onclick = () => step(-1);
    A.qs('.lb-next', lb).onclick = () => step(1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key==='Escape') close(); if (e.key==='ArrowLeft') step(-1); if (e.key==='ArrowRight') step(1); });
    let sx = null;
    lb.addEventListener('pointerdown', e => sx = e.clientX);
    lb.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 50 && mode==='img') step(e.clientX < sx ? 1 : -1); sx = null; });
  }
  function draw(){
    const st = A.qs('.lb-stage', lb);
    if (mode === 'yt') st.innerHTML = `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${list[0]}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube"></iframe></div>`;
    else if (mode === 'vid') st.innerHTML = `<video src="${A.img(list[0])}" controls autoplay playsinline></video>`;
    else st.innerHTML = `<img src="${A.img(list[idx].src || list[idx])}" alt="${A.esc(list[idx].alt || '')}">`;
    const many = mode==='img' && list.length > 1;
    A.qs('.lb-prev', lb).style.display = A.qs('.lb-next', lb).style.display = many ? '' : 'none';
    A.qs('.lb-count', lb).textContent = many ? `${idx+1} / ${list.length}` : '';
  }
  function step(d){ idx = (idx + d + list.length) % list.length; draw(); }
  function close(){ lb.classList.remove('open'); setTimeout(() => { if (!lb.classList.contains('open')) A.qs('.lb-stage', lb).innerHTML = ''; }, 260); document.documentElement.style.overflow = ''; }
  const openLB = () => { lb.classList.add('open'); document.documentElement.style.overflow = 'hidden'; A.qs('.lb-x', lb).focus(); };
  A.lightbox = {
    images(items, i=0){ ensureLB(); mode='img'; list=items; idx=i; draw(); openLB(); },
    video(id){ ensureLB(); mode='yt'; list=[id]; draw(); openLB(); },
    file(src){ ensureLB(); mode='vid'; list=[src]; draw(); openLB(); }
  };

  /* ---------- content renderer (service sections + articles) ---------- */
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9฀-๿]+/g,'-').replace(/^-|-$/g,'').slice(0,50);
  A.fmtLi = x => {
    const m = x.match(/^([^:]{2,80}?)\s?:\s(.+)$/s);
    if (m && !/https?$/.test(m[1])) return `<strong>${A.esc(m[1])}:</strong> ${A.esc(m[2])}`;
    return A.esc(x);
  };
  A.faqHtml = items => `<div class="faq">${items.map(q => `<details><summary>${A.esc(q.q)}<span class="pm">${A.ic('plus')}</span></summary><div class="ans">${(q.a || []).map(a => `<p>${A.esc(typeof a === 'string' ? a : a.x)}</p>`).join('')}</div></details>`).join('')}</div>`;
  A.renderBlocks = (blocks, el) => {
    const toc = [];
    let html = '';
    for (const b of blocks || []) {
      switch (b.t) {
        case 'h2': { const id = 's-' + toc.length + '-' + slug(b.x); toc.push({id, x:b.x}); html += `<h2 id="${id}">${A.esc(b.x)}</h2>`; break; }
        case 'h3': html += `<h3>${A.esc(b.x)}</h3>`; break;
        case 'h4': case 'h5': case 'h6': html += `<h4>${A.esc(b.x)}</h4>`; break;
        case 'p': html += `<p${b.b ? ' class="b"' : ''}>${A.esc(b.x)}</p>`; break;
        case 'list': { const tag = b.o ? 'ol' : 'ul'; html += `<${tag}>${(b.items || []).map(li => `<li>${A.fmtLi(li.x || li)}</li>`).join('')}</${tag}>`; break; }
        case 'img': if (b.src) html += `<figure class="rv-clip ph-img"><img loading="lazy" decoding="async" src="${A.img(b.src)}" alt="${A.esc(b.alt || '')}"></figure>`; break;
        case 'yt': html += `<div class="ytbox"><button type="button" data-yt="${b.id}" aria-label="${A.esc(A.t('playVideo'))}"><img loading="lazy" decoding="async" src="${A.yt(b.id)}" alt=""><span class="pl">${A.ic('play')}</span></button></div>`; break;
        case 'faqs': html += A.faqHtml((b.items || []).map(q => ({q:q.q, a:q.a}))); break;
        case 'table': html += `<div class="tbl"><table>${(b.rows || []).map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${A.esc(c)}</th>` : `<td>${A.esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`; break;
        case 'btn': if (b.h) html += `<p><a class="btn btn-plum btn-sm" href="${b.h}" target="_blank" rel="noopener">${A.esc(b.x)}</a></p>`; break;
      }
    }
    el.innerHTML = html;
    A.bindMedia(el);
    return toc;
  };
  A.bindMedia = el => {
    el.addEventListener('click', e => {
      const y = e.target.closest('[data-yt]');
      if (y) { e.preventDefault(); y.parentElement.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${y.dataset.yt}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube"></iframe>`; }
      const g = e.target.closest('[data-gal]');
      if (g) { e.preventDefault(); const items = A._gal[+g.dataset.gal]; A.lightbox.images(items, +g.dataset.i || 0); }
      const v = e.target.closest('[data-vid]');
      if (v) { e.preventDefault(); A.lightbox.file(v.dataset.vid); }
    });
  };
  A._gal = [];
  A.gallery = (items, cls='') => { const gi = A._gal.push(items.map(s => typeof s === 'string' ? {src:s} : s)) - 1; return {gi, attr:i => `data-gal="${gi}" data-i="${i}"`}; };
  A.tocSpy = (tocEl, ids) => {
    if (!tocEl || !ids.length) return;
    const links = A.qsa('a', tocEl), hs = ids.map(i => document.getElementById(i)).filter(Boolean);
    const f = () => { let cur = hs[0]; for (const h of hs) if (h.getBoundingClientRect().top < innerHeight * .3) cur = h; links.forEach(l => l.classList.toggle('on', cur && l.getAttribute('href') === '#' + cur.id)); };
    addEventListener('scroll', f, {passive:true}); f();
  };
  A.readBar = () => {
    const b = document.createElement('div'); b.className = 'read-bar'; document.body.append(b);
    const f = () => { const h = document.documentElement.scrollHeight - innerHeight; b.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; };
    addEventListener('scroll', f, {passive:true}); f();
  };
  A.crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb">${items.map((it,i) => i < items.length-1 ? `<a href="${it[1]}">${A.esc(it[0])}</a>${A.ic('chevron-right')}` : `<span aria-current="page">${A.esc(it[0])}</span>`).join('')}</nav>`;
  A.breadcrumbLd = items => A.jsonld({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((it, i) => ({'@type':'ListItem', position:i+1, name:it[0], item:new URL(it[1] || location.href, location.href).href}))});
  A.railCtrl = (rail, prev, next) => {
    const by = () => rail.clientWidth * .8;
    prev && prev.addEventListener('click', () => rail.scrollBy({left:-by(), behavior:'smooth'}));
    next && next.addEventListener('click', () => rail.scrollBy({left:by(), behavior:'smooth'}));
  };
  /* images that fail to load (or are still loading) keep a styled placeholder behind them */
  A.imgFallback = (root=document) => A.qsa('img', root).forEach(i => { if (i.dataset.fb) return; i.dataset.fb = 1; i.addEventListener('error', () => i.classList.add('img-x'), {once:true}); if (i.complete && !i.naturalWidth && i.src) i.classList.add('img-x'); });

  /* shared building blocks used by several pages */
  A.doctorCard = (S, full) => {
    const D = S.doctor || {};
    return `<div class="doc-card rv">
      <div class="doc-ph ph-img"><img src="${A.img(D.photo)}" alt="${A.esc(D.name)}" loading="lazy" decoding="async" decoding="async"></div>
      <div class="doc-body"><p class="eyebrow">${A.esc(A.t('doctorH'))}</p>
        <h3 class="h-l" data-field="doctor.name">${A.esc(D.name)}</h3>
        <p class="doc-meta"><span>${A.esc(D.license)}</span><span>${A.esc(D.title)}</span></p>
        <p class="muted" data-field="doctor.specialty">${A.esc(D.specialty)}</p>
        <div class="doc-cols"><div><h4>${A.esc(D.eduH || A.t('eduH'))}</h4><ul class="ticks">${(D.edu || []).map(x => `<li>${A.esc(x)}</li>`).join('')}</ul></div>
        <div><h4>${A.esc(D.moreH || A.t('moreH'))}</h4><ul class="ticks">${(D.more || []).map(x => `<li>${A.esc(x)}</li>`).join('')}</ul></div></div>
        <div class="doc-acts">${full ? '' : `<a class="btn btn-plum btn-sm" href="doctor.html">${A.esc(A.t('doctorCta'))} ${A.ic('arrow-right')}</a>`}<a class="btn btn-ghost on-light btn-sm" href="${(S.line && S.line.h) || '#'}" target="_blank" rel="noopener">${A.ic('line')}${A.esc(A.t('book'))}</a></div></div></div>`;
  };
  A.branchesHtml = (S, h, p) => A.branches(S, h, p);
  A.consultBand = (S) => `<div class="consult-band rv">
    <div class="cb-copy"><p class="eyebrow">${A.esc(A.t('consultShort'))}</p><h2 class="h-xl">${A.esc(A.t('consultH'))}</h2><p class="lead">${A.esc(A.t('consultP'))}</p></div>
    <div class="cb-acts"><a class="cb-big" href="consult.html">${A.ic('message-circle')}<span><b>${A.esc(A.t('consultBtn'))}</b><small>${A.esc(A.t('consultPageH'))}</small></span>${A.ic('arrow-right')}</a>
      <a class="cb-row" href="${(S.line && S.line.h) || '#'}" target="_blank" rel="noopener">${A.ic('line')}<span><b>${A.esc((S.cta && S.cta.line) || 'LINE')}</b><small>${A.esc((S.cta && S.cta.lineSub) || A.t('lineChat'))}</small></span></a>
      <a class="cb-row" href="${A.WA.h}" target="_blank" rel="noopener">${A.ic('whatsapp')}<span><b>WhatsApp</b><small>${A.esc(A.t('whatsappSub'))} · ${A.esc(A.WA.x)}</small></span></a>
      <a class="cb-row" href="${((S.branches||[])[0]||{}).tel || 'tel:0888700039'}">${A.ic('phone')}<span><b>${A.esc((S.cta && S.cta.call) || A.t('callUs'))}</b><small>${A.esc(((S.branches||[])[0]||{}).phone || '088-870-0039')}</small></span></a></div></div>`;
  A.svcCards = (S, keys) => {
    const list = (S.services || []).filter(s => !keys || keys.includes(s.key));
    return `<div class="svc-grid">${list.map((s, i) => `<a class="svc-tile rv" data-d="${i*60}" href="${A.svcUrl(s.key)}">
      <span class="st-glow" aria-hidden="true"></span><span class="st-ic"><img src="${A.img(s.icon)}" alt="" loading="lazy" decoding="async" decoding="async"></span>
      <span class="st-name">${A.esc(s.short || s.name)}</span><span class="st-en">${A.esc(A.lang === 'en' ? (s.name !== s.short ? s.name : '') : s.en)}</span>
      <span class="st-go">${A.ic('arrow-up-right')}</span></a>`).join('')}</div>`;
  };
  A.promoCard = (p, i) => `<figure class="promo rv" data-d="${(i%4)*70}"><button type="button" class="promo-img ph-img" data-gal="${p._g}" data-i="${p._i}"><img src="${A.img(p.src)}" alt="${A.esc(p.alt || '')}" loading="lazy" decoding="async" decoding="async"></button>
    ${p.price ? `<figcaption><span>${A.esc(A.t('promoPrice'))}</span><b>${A.fmtNum(p.price)}</b><span>${A.esc(A.t('baht'))}</span></figcaption>` : ''}</figure>`;

  /* ---------- section flow: gradient bleeds between tones, a shaped edge under page heads ---------- */
  const HEADS = '.phead,.svc-head,.art-head,.hero-body';
  const tone = el => el.tagName === 'FOOTER' || el.matches('.night,.night-s,' + HEADS) ? 'night'
    : el.matches('.washed,.play-s') ? 'wash' : 'light';
  const CURVE = '<svg viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="sx-fill" d="M0 90V54C190 20 400 6 640 30S1090 88 1440 32V90Z"/><path class="sx-stitch" d="M0 46C190 12 400 -2 640 22S1090 80 1440 24"/></svg>';
  A.flow = () => {
    const m = A.qs('#main');
    if (!m) return;
    const seq = [...m.children].filter(e => e.tagName === 'SECTION' || e.matches('figure.about-banner,figure.art-banner'));
    const ft = A.qs('footer.ftr');
    if (ft) seq.push(ft);
    let prev = null;
    seq.forEach(el => {
      const t = el.tagName === 'FIGURE' ? 'light' : tone(el);
      if (el.tagName !== 'FIGURE') el.dataset.tone = t;
      if (prev && prev.t !== t) {
        if (prev.el.matches && prev.el.matches(HEADS)) {
          if (!A.qs(':scope>.sx-c', prev.el)) prev.el.insertAdjacentHTML('beforeend', `<div class="sx sx-c sx-to-${t}" aria-hidden="true">${CURVE}</div>`);
          prev.el.classList.add('has-curve');
        } else if (el.tagName !== 'FIGURE' && !A.qs(':scope>.sx-b', el)) {
          el.insertAdjacentHTML('afterbegin', `<div class="sx sx-b sx-${prev.t}-${t}" aria-hidden="true"></div>`);
          el.classList.add('has-sx');
        }
      } else if (prev && prev.t === t && t === 'night' && el.tagName !== 'FIGURE') {
        el.classList.add('sx-join');
      }
      prev = {el, t};
    });
  };

  /* ---------- pointer sheen on cards (fine pointers only) ---------- */
  const SHEEN = '.tool-card,.svc-tile,.promo,.mini-tool,.chan,.who-card,.story,.br-stage,.fbframe,.facts,.faq-cta,.doc-card .doc-ph,.role-card,.aaci-card,.post-card .pc-ph';
  A.sheen = (root=document) => {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    A.qsa(SHEEN, root).forEach(e => e.setAttribute('data-sheen', ''));
    if (A._sheenOn) return;
    A._sheenOn = true;
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('[data-sheen]');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, {passive:true});
  };

  /* ---------- gentle parallax on marked images ---------- */
  A.parallax = () => {
    if (A.reduced || A._parOn) return;
    A._parOn = true;
    /* only images near the screen are measured, and every read happens before any write,
       so a scroll frame never forces the browser to lay the page out more than once */
    const near = new Set();
    let tick = false;
    const run = () => {
      tick = false;
      if (!near.size) return;
      const H = innerHeight, list = [...near];
      const rects = list.map(el => el.parentElement.getBoundingClientRect());
      list.forEach((el, i) => {
        const r = rects[i];
        const p = (r.top + r.height / 2 - H / 2) / H;
        el.style.transform = `translate3d(0,${(p * -(+el.dataset.par || 36)).toFixed(1)}px,0) scale(1.12)`;
      });
    };
    const kick = () => { if (!tick) { tick = true; requestAnimationFrame(run); } };
    const watch = () => {
      if (!('IntersectionObserver' in window)) { A.qsa('[data-par]').forEach(el => near.add(el)); return; }
      A._parIO = A._parIO || new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? near.add(e.target) : near.delete(e.target)); kick(); }, {rootMargin:'150px 0px'});
      A.qsa('[data-par]:not([data-par-on])').forEach(el => { el.dataset.parOn = 1; A._parIO.observe(el); });
    };
    A.parallaxWatch = watch;
    watch();
    addEventListener('scroll', kick, {passive:true});
    addEventListener('resize', kick);
    let mt = 0; new MutationObserver(() => { clearTimeout(mt); mt = setTimeout(watch, 250); }).observe(document.body, {childList:true, subtree:true});
  };

  /* ---------- copy and toast ---------- */
  A.toast = msg => {
    let t = A.qs('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.append(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
  };
  A.copy = async (text, btn) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (e) {
      try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
    }
    A.toast(A.t(ok ? 'copied' : 'copyFail'));
    if (ok && btn) { btn.classList.add('ok'); setTimeout(() => btn.classList.remove('ok'), 1800); }
    if (ok) A.emit('branch:copy', {});
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) { e.preventDefault(); A.copy(b.dataset.copy, b); } });

  /* ---------- Facebook page plugin, mounted when it comes near the viewport ----------
     apexsurgerythailand is restricted (age or country), so the plugin returns an empty page for it.
     The live feed is the group's international page; the surgery page gets its own link card.
     If the plugin has not loaded within 8 seconds, a follow card with both pages replaces the empty box. */
  const fbHandle = f => f.h.split('/').filter(Boolean).pop();
  A.fbLink = (f, cls='') => f ? `<a class="fb-link ${cls}" href="${f.h}" target="_blank" rel="noopener"><span class="fb-ic">${A.ic('facebook')}</span><span class="fb-name"><b>${A.esc(f.x)}</b><small>facebook.com/${A.esc(fbHandle(f))}</small></span>${A.ic('arrow-up-right')}</a>` : '';
  A.fbFrame = (f, h=640, tabs='timeline', also) => `<div class="fbframe rv"><div class="fbhead"><span class="fb-ic">${A.ic('facebook')}</span><span class="fb-name"><b>${A.esc(f.x)}</b><small>facebook.com/${A.esc(fbHandle(f))}</small></span><a class="fb-open" href="${f.h}" target="_blank" rel="noopener" aria-label="${A.esc(A.t('fbOpen'))}: ${A.esc(f.x)}" title="${A.esc(A.t('fbOpen'))}">${A.ic('arrow-up-right')}</a></div>
    <div class="fb-box" style="height:${h}px"><div class="fb-skel" aria-hidden="true"><i></i><i></i><i></i><i></i></div><iframe data-fb="${encodeURIComponent(f.h)}" data-h="${h}" data-tabs="${tabs}" height="${h}" title="${A.esc(f.x)} · Facebook" allow="encrypted-media"></iframe>
      <div class="fb-fallback" hidden><span class="fb-big">${A.ic('facebook')}</span><b class="h-s">${A.esc(A.t('fbH'))}</b>${A.fbLink(f)}${A.fbLink(also)}</div></div></div>`;
  A.fbMount = root => {
    const frs = A.qsa('iframe[data-fb]', root);
    const set = fr => {
      const box = fr.parentElement;
      const w = Math.max(180, Math.min(500, Math.floor(box.clientWidth)));
      if (!box.clientWidth || Math.abs(w - (+fr.dataset.w || 0)) < 30) return;
      fr.dataset.w = w;
      fr.style.width = w + 'px';
      fr.src = `https://www.facebook.com/plugins/page.php?href=${fr.dataset.fb}&tabs=${fr.dataset.tabs}&width=${w}&height=${fr.dataset.h}&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
    };
    const go = fr => {
      fr.dataset.go = 1;
      const box = fr.parentElement;
      fr.addEventListener('load', () => { fr.dataset.ok = 1; fr.classList.add('on'); box.classList.add('loaded'); }, {once:true});
      set(fr);
      setTimeout(() => { if (!fr.dataset.ok) { box.classList.add('fb-fail'); fr.remove(); const fb = A.qs('.fb-fallback', box); if (fb) fb.hidden = false; A.emit('facebook:fallback', {}); } }, 8000);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); go(e.target); } }), {rootMargin:'300px 0px'});
      frs.forEach(f => io.observe(f));
    } else frs.forEach(go);
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => frs.filter(f => f.dataset.go && f.isConnected).forEach(set), 300); });
  };

  /* ---------- branches: switcher, photo, address copy, actions, lazy Google map ---------- */
  A.mapSrc = b => `https://www.google.com/maps?q=${encodeURIComponent(b.name + ', ' + b.addr)}&output=embed`;
  A.branches = (S, h, p) => {
    const B = S.branches || [], E = A.esc, T = A.t;
    const id = 'br' + (A._brn = (A._brn || 0) + 1);
    const line = (S.line && S.line.h) || 'https://lin.ee/D2Ir4vJ';
    const card = (b, i) => `<div class="br-card${i ? '' : ' on'}" data-i="${i}"${i ? ' hidden' : ''}>
        <h3 class="h-m">${E(b.name)}</h3>
        <div class="br-addr"><span class="br-pin">${A.ic('map-pin')}</span><p>${E(b.addr)}</p>
          <button type="button" class="br-copy" data-copy="${E(b.name + ', ' + b.addr)}" aria-label="${E(T('copyAddr'))}: ${E(b.short || b.name)}">${A.ic('copy')}${A.ic('check')}<span>${E(T('copyAddr'))}</span></button></div>
        <div class="br-acts">
          <a class="br-act call" href="${b.tel}">${A.ic('phone')}<span><b>${E(T('callUs'))}</b><small>${E(b.phone)}</small></span></a>
          <a class="br-act ln" href="${line}" target="_blank" rel="noopener">${A.ic('line')}<span><b>LINE</b><small>${E((S.line && S.line.x) || '@apexsurgery')}</small></span></a>
          <a class="br-act map" href="${b.map}" target="_blank" rel="noopener">${A.ic('navigation')}<span><b>${E(T('directions'))}</b><small>Google Maps</small></span></a>
        </div></div>`;
    return `<div class="br" id="${id}" data-branches>
      <div class="shead br-head"><div><h2 class="h-xl rv">${E(h || S.branchesH || T('branchesH'))}</h2>${(p || S.branchesP) ? `<p class="lead rv" style="margin-top:18px;max-width:58ch">${E(p || S.branchesP)}</p>` : ''}</div>
        ${B.length > 1 ? `<div class="br-tabs rv" role="tablist" aria-label="${E(T('branchPick'))}">${B.map((b, i) => `<button type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p" aria-selected="${!i}" tabindex="${i ? -1 : 0}" data-i="${i}">${E(b.short || b.name)}</button>`).join('')}<span class="br-ink" aria-hidden="true"></span></div>` : ''}</div>
      <div class="br-stage rv" id="${id}-p" role="tabpanel" aria-labelledby="${id}-t0">
        <div class="br-photo ph-img">${B.map((b, i) => `<img src="${A.img(b.img)}" alt="${E(b.name)}" loading="lazy" decoding="async" data-i="${i}" class="${i ? '' : 'on'}">`).join('')}<span class="br-count" aria-hidden="true"><b>${B.length > 1 ? '1' : ''}</b>${B.length > 1 ? ' / ' + B.length : ''}</span></div>
        <div class="br-info">${B.map(card).join('')}</div>
        <div class="br-map"><div class="br-map-ph" aria-hidden="true">${A.ic('map')}</div>${B.map((b, i) => `<iframe data-src="${A.mapSrc(b)}" data-i="${i}" title="${E(T('mapTitle'))}: ${E(b.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer-when-downgrade"${i ? ' hidden' : ''}></iframe>`).join('')}</div>
      </div></div>`;
  };
  A.bindBranches = (root=document) => A.qsa('[data-branches]:not([data-bound])', root).forEach(br => {
    br.dataset.bound = 1;
    const tabs = A.qsa('[role=tab]', br), stage = A.qs('.br-stage', br), ink = A.qs('.br-ink', br);
    let cur = 0, seen = false;
    const loadMap = i => { const f = A.qs(`.br-map iframe[data-i="${i}"]`, br); if (f && !f.src) { f.src = f.dataset.src; f.addEventListener('load', () => f.classList.add('on'), {once:true}); } };
    const moveInk = () => { const t = tabs[cur]; if (!ink || !t) return; ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft}px)`; };
    const show = (i, focus) => {
      if (i === cur && !focus) return;
      cur = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
      stage.setAttribute('aria-labelledby', tabs[i] ? tabs[i].id : '');
      A.qsa('.br-photo img', br).forEach(im => im.classList.toggle('on', +im.dataset.i === i));
      A.qsa('.br-card', br).forEach(c => { const on = +c.dataset.i === i; c.hidden = !on; c.classList.toggle('on', on); });
      A.qsa('.br-map iframe', br).forEach(f => f.hidden = +f.dataset.i !== i);
      const n = A.qs('.br-count b', br); if (n) n.textContent = i + 1;
      if (seen) loadMap(i);
      moveInk();
      if (focus) tabs[i].focus();
      A.emit('branch:switch', {branch:i});
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); show((cur + d + tabs.length) % tabs.length, true); } });
    });
    A.qsa('.br-act', br).forEach(a => a.addEventListener('click', () => A.emit('contact:click', {channel:a.className.replace('br-act ', ''), from:'branches'})));
    requestAnimationFrame(moveInk);
    addEventListener('resize', moveInk);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); seen = true; loadMap(cur); } }, {rootMargin:'200px 0px'});
      io.observe(stage);
    } else { seen = true; loadMap(cur); }
  });

  // static labels written in the HTML templates are filled from i18n by key
  function fillStatic(){ A.qsa('[data-t]').forEach(e => { e.textContent = A.t(e.dataset.t); }); }

  A.boot = (fn) => {
    const go = async () => {
      fillStatic(); header(); planBadge();
      try { await (fn && fn()); } catch (e) { console.error('[apex] page', e); }
      footer(); fab(); A.flow(); A.bindBranches(); A.sheen(); A.parallax(); A.imgFallback(); A.reveal();
      document.dispatchEvent(new Event('apex:ready'));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  };
})();
