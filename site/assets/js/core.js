/* Apex Surgery Hospital: shared shell (header, footer, contact button, motion, lightbox, content renderer, feature mounting) */
(function(){
  const A = window.APEX = window.APEX || {};
  const SITE = 'https://www.apexsurgeryhospital.com/';
  document.documentElement.classList.remove('no-js');

  /* ---------- basics ---------- */
  A.SITE = SITE;
  A.lang = (document.documentElement.lang || 'th').slice(0, 2) === 'en' ? 'en' : 'th';
  A.root = A.lang === 'en' ? '../' : '';
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
    return code === 'en' ? 'en/' + tail : '../' + tail;
  };

  /* ---------- events bridge (features call onEvent; the plan store and analytics listen) ---------- */
  A.emit = (name, data) => {
    try { window.dispatchEvent(new CustomEvent('apex:event', {detail:{name, data:data || {}, lang:A.lang, page:document.body.dataset.page}})); } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push({event:'apex_' + name.replace(/[^a-z0-9]+/gi, '_'), apex:data || {}}); } catch (e) {}
  };
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
      const m = await import(new URL(A.assets + 'features/' + name + '/index.js', location.href).href);
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
  const NAV = [['index.html','home'],['about.html','about'],['services.html','services'],['promotions.html','promotions'],['reviews.html','reviews'],['blog.html','articles'],['contact.html','contact']];
  function header(){
    const S = A.d('shared') || {}, page = document.body.dataset.page || '';
    const svcs = S.services || [];
    const nav = NAV.map(([h, k]) => {
      const cur = k === page || (k === 'services' && page === 'service') || (k === 'articles' && page === 'article') ? ' aria-current="page"' : '';
      if (k === 'services') {
        const items = svcs.map(s => `<a class="mega-svc" href="${A.svcUrl(s.key)}"><span class="ms-ic"><img src="${A.img(s.icon)}" alt="" loading="lazy"></span><span><b>${A.esc(s.short || s.name)}</b><small>${A.esc(A.lang === 'en' ? (s.name !== s.en ? s.en : '') : s.en)}</small></span></a>`).join('');
        return `<div class="has-mega"><button type="button" aria-expanded="false"${cur}>${A.esc(A.t('services'))}${A.ic('chevron-down')}</button>
          <div class="mega surg" role="menu"><div class="mega-svcs">${items}</div>
          <div class="mega-tools"><h4>${A.esc(A.t('tools'))}</h4>
            <a href="nose.html">${A.ic('scan-face')}${A.esc(A.t('nose'))}</a>
            <a href="play.html">${A.ic('sparkles')}${A.esc(A.t('games'))}</a>
            <a href="trip.html">${A.ic('calendar')}${A.esc(A.t('trip'))}</a>
            <a href="doctor.html">${A.ic('stethoscope')}${A.esc(A.t('doctor'))}</a></div>
          <div class="mega-foot"><a class="link-arrow" href="services.html">${A.esc(A.t('allServices'))} ${A.ic('arrow-right')}</a></div></div></div>`;
      }
      return `<a href="${h}"${cur}>${A.esc(A.t(k))}</a>`;
    }).join('');
    const langs = [['th','TH'],['en','EN']].map(([c,t]) => `<a href="${A.langHref(c)}" hreflang="${c}" lang="${c}" class="${c===A.lang?'on':''}"${c===A.lang?' aria-current="true"':''}>${t}</a>`).join('');
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
      <details><summary>${A.esc(A.t('tools'))}${A.ic('chevron-down')}</summary><div class="sub"><a href="nose.html">${A.esc(A.t('nose'))}</a><a href="play.html">${A.esc(A.t('games'))}</a><a href="trip.html">${A.esc(A.t('trip'))}</a><a href="plan.html">${A.esc(A.t('plan'))}</a><a href="doctor.html">${A.esc(A.t('doctor'))}</a></div></details></nav>
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
    const br = (S.branches || []).map(b => `<div class="ftr-br"><h5>${A.esc(b.short || b.name)}</h5><p>${A.esc(b.addr)}</p>
      <a href="${b.tel}">${A.ic('phone')}${A.esc(b.phone)}</a><a href="${b.map}"${ext}>${A.ic('map-pin')}${A.esc(A.t('map'))}</a></div>`).join('');
    const svcs = (S.services || []).map(s => `<a href="${A.svcUrl(s.key)}">${A.esc(s.short || s.name)}</a>`).join('');
    f.innerHTML = `<div class="wrap"><div class="ftr-top surg">
      <div class="brand"><span class="logo-txt light">APEX<small>Surgery Hospital</small></span>
        <p>${A.esc(A.lang === 'th' ? S.brandTh : (S.brandTh && S.brand ? S.brand : S.brand))}</p>
        <p class="ftr-lic">${A.esc(S.license || '')}</p>
        <div class="ftr-socials">${(S.socials || []).map(s => `<a href="${s.h}"${ext} aria-label="${A.esc(s.x || s.k)}">${A.socIcon(s.k)}</a>`).join('')}<a href="${A.WA.h}"${ext} aria-label="WhatsApp">${A.ic('whatsapp')}</a></div></div>
      <div><h5>${A.esc(A.t('ourServices'))}</h5>${svcs}<a href="nose.html">${A.esc(A.t('nose'))}</a><a href="play.html">${A.esc(A.t('games'))}</a></div>
      ${br}
      <div><h5>${A.esc(A.t('contactLine'))}</h5><a href="${S.line && S.line.h}"${ext} style="padding:0"><img class="qr" src="${A.img(S.line && S.line.qr)}" alt="LINE ${A.esc(S.line && S.line.x)}" loading="lazy"></a><p style="margin-top:10px">${A.esc(S.line && S.line.x)}</p>
        <a href="${A.WA.h}"${ext}>${A.ic('whatsapp')}${A.esc(A.WA.x)}</a></div>
    </div>
    <div class="ftr-word" aria-hidden="true">APEX</div>
    ${S.footerNote ? `<p class="ftr-note">${A.esc(S.footerNote)}</p>` : ''}
    <div class="ftr-bot"><span>${A.esc(S.copyright || '')}</span><span>${[['th','TH'],['en','EN']].map(([c,t]) => `<a href="${A.langHref(c)}" hreflang="${c}" style="display:inline;padding:0 6px">${t}</a>`).join('·')}</span></div></div>`;
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
        case 'img': if (b.src) html += `<figure class="rv-clip ph-img"><img loading="lazy" src="${A.img(b.src)}" alt="${A.esc(b.alt || '')}"></figure>`; break;
        case 'yt': html += `<div class="ytbox"><button type="button" data-yt="${b.id}" aria-label="${A.esc(A.t('playVideo'))}"><img loading="lazy" src="${A.yt(b.id)}" alt=""><span class="pl">${A.ic('play')}</span></button></div>`; break;
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
      <div class="doc-ph ph-img"><img src="${A.img(D.photo)}" alt="${A.esc(D.name)}" loading="lazy"></div>
      <div class="doc-body"><p class="eyebrow">${A.esc(A.t('doctorH'))}</p>
        <h3 class="h-l" data-field="doctor.name">${A.esc(D.name)}</h3>
        <p class="doc-meta"><span>${A.esc(D.license)}</span><span>${A.esc(D.title)}</span></p>
        <p class="muted" data-field="doctor.specialty">${A.esc(D.specialty)}</p>
        <div class="doc-cols"><div><h4>${A.esc(D.eduH || A.t('eduH'))}</h4><ul class="ticks">${(D.edu || []).map(x => `<li>${A.esc(x)}</li>`).join('')}</ul></div>
        <div><h4>${A.esc(D.moreH || A.t('moreH'))}</h4><ul class="ticks">${(D.more || []).map(x => `<li>${A.esc(x)}</li>`).join('')}</ul></div></div>
        <div class="doc-acts">${full ? '' : `<a class="btn btn-plum btn-sm" href="doctor.html">${A.esc(A.t('doctorCta'))} ${A.ic('arrow-right')}</a>`}<a class="btn btn-ghost on-light btn-sm" href="${(S.line && S.line.h) || '#'}" target="_blank" rel="noopener">${A.ic('line')}${A.esc(A.t('book'))}</a></div></div></div>`;
  };
  A.branchesHtml = (S, h, p) => `<div class="shead"><div><h2 class="h-xl rv">${A.esc(h || S.branchesH || A.t('branchesH'))}</h2>${(p || S.branchesP) ? `<p class="lead rv" style="margin-top:18px;max-width:60ch">${A.esc(p || S.branchesP)}</p>` : ''}</div></div>
    <div class="branch-grid">${(S.branches || []).map((b, i) => `<article class="branch rv" data-d="${i*90}">
      <div class="branch-ph ph-img"><img src="${A.img(b.img)}" alt="${A.esc(b.name)}" loading="lazy"><span class="branch-n">0${i+1}</span></div>
      <div class="branch-body"><h3 class="h-m">${A.esc(b.name)}</h3><p class="branch-addr">${A.ic('map-pin')}${A.esc(b.addr)}</p>
      <div class="branch-acts"><a class="btn btn-plum btn-sm" href="${b.tel}">${A.ic('phone')}${A.esc(b.phone)}</a><a class="btn btn-ghost on-light btn-sm" href="${b.map}" target="_blank" rel="noopener">${A.ic('navigation')}${A.esc(A.t('map'))}</a></div></div></article>`).join('')}</div>`;
  A.consultBand = (S) => `<div class="consult-band rv">
    <div class="cb-copy"><p class="eyebrow">${A.esc(A.t('consultShort'))}</p><h2 class="h-xl">${A.esc(A.t('consultH'))}</h2><p class="lead">${A.esc(A.t('consultP'))}</p></div>
    <div class="cb-acts"><a class="cb-big" href="consult.html">${A.ic('message-circle')}<span><b>${A.esc(A.t('consultBtn'))}</b><small>${A.esc(A.t('consultPageH'))}</small></span>${A.ic('arrow-right')}</a>
      <a class="cb-row" href="${(S.line && S.line.h) || '#'}" target="_blank" rel="noopener">${A.ic('line')}<span><b>${A.esc((S.cta && S.cta.line) || 'LINE')}</b><small>${A.esc((S.cta && S.cta.lineSub) || A.t('lineChat'))}</small></span></a>
      <a class="cb-row" href="${A.WA.h}" target="_blank" rel="noopener">${A.ic('whatsapp')}<span><b>WhatsApp</b><small>${A.esc(A.t('whatsappSub'))} · ${A.esc(A.WA.x)}</small></span></a>
      <a class="cb-row" href="${((S.branches||[])[0]||{}).tel || 'tel:0888700039'}">${A.ic('phone')}<span><b>${A.esc((S.cta && S.cta.call) || A.t('callUs'))}</b><small>${A.esc(((S.branches||[])[0]||{}).phone || '088-870-0039')}</small></span></a></div></div>`;
  A.svcCards = (S, keys) => {
    const list = (S.services || []).filter(s => !keys || keys.includes(s.key));
    return `<div class="svc-grid">${list.map((s, i) => `<a class="svc-tile rv" data-d="${i*60}" href="${A.svcUrl(s.key)}">
      <span class="st-n">0${i+1}</span><span class="st-ic"><img src="${A.img(s.icon)}" alt="" loading="lazy"></span>
      <span class="st-name">${A.esc(s.short || s.name)}</span><span class="st-en">${A.esc(A.lang === 'en' ? (s.name !== s.short ? s.name : '') : s.en)}</span>
      <span class="st-go">${A.ic('arrow-up-right')}</span></a>`).join('')}</div>`;
  };
  A.promoCard = (p, i) => `<figure class="promo rv" data-d="${(i%4)*70}"><button type="button" class="promo-img ph-img" data-gal="${p._g}" data-i="${p._i}"><img src="${A.img(p.src)}" alt="${A.esc(p.alt || '')}" loading="lazy"></button>
    ${p.price ? `<figcaption><span>${A.esc(A.t('promoPrice'))}</span><b>${A.fmtNum(p.price)}</b><span>${A.esc(A.t('baht'))}</span></figcaption>` : ''}</figure>`;

  // static labels written in the HTML templates are filled from i18n by key
  function fillStatic(){ A.qsa('[data-t]').forEach(e => { e.textContent = A.t(e.dataset.t); }); }

  A.boot = (fn) => {
    const go = async () => {
      fillStatic(); header(); planBadge();
      try { await (fn && fn()); } catch (e) { console.error('[apex] page', e); }
      footer(); fab(); A.imgFallback(); A.reveal();
      document.dispatchEvent(new Event('apex:ready'));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  };
})();
