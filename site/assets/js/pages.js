/* Apex Surgery Hospital: page renderers. Each page is chosen by <body data-page>. */
(function(){
  const A = window.APEX;
  const E = A.esc, T = A.t, I = A.ic, IMG = A.img;
  const main = () => A.qs('#main');

  /* recovery facts, taken from the service pages' own Q&A and recovery text */
  const RECOVERY = {
    en: {
      facelift: [['2 to 3 weeks','Back to light activity'],['4 to 6 weeks','No strenuous exercise'],['7 to 10 years','How long results last']],
      browlift: [['7 to 14 days','Initial recovery'],['4 to 6 weeks','No strenuous exercise'],['3 to 6 months','Final shape']],
      rhinoplasty: [['1 to 2 weeks','Soft food'],['7 to 14 days','Rest at home'],['1 to 3 months','Shape settles'],['3 to 6 months','Final result']],
      eyelid: [['7 to 14 days','Swelling eases'],['1 month','No alcohol'],['3 to 6 months','Final shape']],
      breast: [['3 to 7 days','Soreness'],['5 to 7 days','Off work'],['1 to 2 months','Back to exercise']],
      lipo: [['3 to 7 days','Driving again'],['1 month','Compression garment 24 hours a day'],['3 to 6 months','Results settle']]
    },
    th: {
      facelift: [['2 ถึง 3 สัปดาห์','กลับมาทำกิจกรรมเบา ๆ'],['4 ถึง 6 สัปดาห์','งดออกกำลังกายหนัก'],['7 ถึง 10 ปี','ผลลัพธ์อยู่ได้นาน']],
      browlift: [['7 ถึง 14 วัน','พักฟื้นช่วงแรก'],['4 ถึง 6 สัปดาห์','งดออกกำลังกายหนัก'],['3 ถึง 6 เดือน','รูปทรงเข้าที่']],
      rhinoplasty: [['1 ถึง 2 สัปดาห์','ทานอาหารอ่อน'],['7 ถึง 14 วัน','พักฟื้นที่บ้าน'],['1 ถึง 3 เดือน','จมูกเริ่มรัดแกน'],['3 ถึง 6 เดือน','ผลลัพธ์ดีที่สุด']],
      eyelid: [['7 ถึง 14 วัน','อาการบวมลดลง'],['1 เดือน','งดแอลกอฮอล์'],['3 ถึง 6 เดือน','รูปทรงเข้าที่']],
      breast: [['3 ถึง 7 วัน','อาการระบม'],['5 ถึง 7 วัน','หยุดงาน'],['1 ถึง 2 เดือน','กลับมาออกกำลังกาย']],
      lipo: [['3 ถึง 7 วัน','ขับรถได้'],['1 เดือน','ใส่ชุดกระชับตลอด 24 ชั่วโมง'],['3 ถึง 6 เดือน','ผลลัพธ์เข้าที่']]
    }
  };
  A.RECOVERY = RECOVERY;
  const SVC_CATS = ['facelift','browlift','rhinoplasty','eyelid','breast','lipo'];
  const svcName = (S, k) => { const s = (S.services || []).find(x => x.key === k); return s ? (s.short || s.name) : k; };

  /* ---------- small builders ---------- */
  const phead = (h, lead, crumbs, extra='') => `<section class="phead"><div class="phead-lines" aria-hidden="true"></div><div class="wrap">${crumbs ? A.crumbs(crumbs) : ''}<h1 class="display-s rv">${E(h)}</h1>${lead ? `<p class="lead rv" data-d="80" style="max-width:62ch;margin-top:20px">${E(lead)}</p>` : ''}${extra}</div></section>`;
  const homeCrumb = () => [T('home'), 'index.html'];
  const chips = (items, on) => `<div class="chips" role="group" aria-label="${E(T('filter'))}">${items.map(([k, x]) => `<button type="button" class="chip" data-k="${E(k)}" aria-pressed="${k === on}">${E(x)}</button>`).join('')}</div>`;
  const bindChips = (root, fn) => root.addEventListener('click', e => { const c = e.target.closest('.chip[data-k]'); if (!c) return; A.qsa('.chip[data-k]', c.parentElement).forEach(b => b.setAttribute('aria-pressed', b === c)); fn(c.dataset.k); });
  const reviewRail = (items, id) => {
    const g = A.gallery(items.map(i => ({src:i.src, alt:i.alt || ''})));
    return `<div class="rail rv-rail" id="${id}">${items.map((r, i) => `<button type="button" class="ba-card ph-img" ${g.attr(i)} data-cat="${E(r.cat || '')}"><img src="${IMG(r.src)}" alt="${E(r.alt || '')}" loading="lazy"></button>`).join('')}</div>`;
  };
  /* review videos: the stories module renders them as a swipe viewer; until it exists, a plain rail */
  const storiesHost = (videos, id='stories', title) => `<div class="stories-host" id="${id}" data-videos='${E(JSON.stringify(videos || []))}' data-title="${E(title || '')}">${videoRail(videos)}</div>`;
  const videoRail = videos => `<div class="rail vid-rail">${(videos || []).map((v, i) => `<button type="button" class="vid-card" data-vid="${E(v)}" aria-label="${E(T('playVideo'))} ${i+1}"><video src="${IMG(v)}#t=0.5" preload="metadata" muted playsinline tabindex="-1"></video><span class="pl">${I('play')}</span></button>`).join('')}</div>`;
  const mountStories = async (el, extra={}) => {
    if (!el) return;
    const videos = JSON.parse(el.dataset.videos || '[]').map(v => IMG(v));
    try {
      const m = await import(new URL(A.assets + 'features/stories/index.js', location.href).href);
      el.innerHTML = ''; el.classList.add('feat-on');
      m.mount(el, A.featureOpts(Object.assign({videos, title:el.dataset.title}, extra)));
    } catch (e) { /* keep the plain rail */ }
  };
  const mountCompare = async (el, pairs) => {
    if (!el) return;
    try {
      const m = await import(new URL(A.assets + 'features/compare/index.js', location.href).href);
      el.innerHTML = ''; el.classList.add('feat-on');
      m.mount(el, A.featureOpts({images:pairs.map(s => IMG(s))}));
    } catch (e) { /* keep the gallery grid */ }
  };
  const baGrid = (imgs, cap) => {
    const g = A.gallery(imgs.map(s => ({src:s})));
    return `<div class="ba-grid">${imgs.map((s, i) => `<button type="button" class="ba-tile ph-img rv" data-d="${(i%6)*50}" ${g.attr(i)}><img src="${IMG(s)}" alt="${E(cap || 'Before / After')} ${i+1}" loading="lazy"></button>`).join('')}</div>`;
  };
  const postCard = (p, i=0, big) => `<a class="post-card rv${big ? ' big' : ''}" data-d="${(i%3)*70}" href="${A.postUrl(p.key)}" data-cat="${E(p.cat || '')}">
    <span class="pc-ph ph-img"><img src="${IMG(p.img)}" alt="" loading="lazy"></span>
    <span class="pc-meta"><span class="pc-cat">${E(T({review:'catReview', blog:'catBlog', news:'catNews'}[p.cat] || 'articles'))}</span>${p.date ? `<time datetime="${E(p.date)}">${E(A.fmtDate(p.date))}</time>` : ''}</span>
    <span class="pc-title">${E(p.title)}</span>${p.excerpt || p.desc ? `<span class="pc-ex">${E(p.excerpt || p.desc)}</span>` : ''}</a>`;
  const promoGrid = (items) => {
    const g = A.gallery(items.map(p => ({src:p.src, alt:p.alt})));
    return `<div class="promo-grid${items.length <= 2 ? ' few' : ''}">${items.map((p, i) => A.promoCard(Object.assign({_g:g.gi, _i:i}, p), i)).join('')}</div>`;
  };
  const recoveryCard = (key, S) => {
    const R = (RECOVERY[A.lang] || RECOVERY.en)[key];
    if (!R) return '';
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
  const clinicLd = S => (S.branches || []).map(b => ({'@type':'MedicalClinic', name:b.name, telephone:b.phone, address:{'@type':'PostalAddress', streetAddress:b.addr, addressCountry:'TH'}, hasMap:b.map, parentOrganization:{'@type':'Organization', name:'Apex Medical Center'}}));

  /* =================== HOME =================== */
  async function home(){
    const S = A.d('shared') || {}, H = A.d('home') || {}, About = A.d('about') || {};
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
          <div class="hb-acts rv" data-d="240"><a class="btn btn-light" href="consult.html">${I('message-circle')}${E(T('consult'))}</a><a class="btn btn-ghost" href="nose.html">${I('scan-face')}${E(T('heroCta2'))}</a></div>
          <ul class="hb-svcs rv" data-d="300">${(S.services || []).map(s => `<li><a href="${A.svcUrl(s.key)}">${E(s.short || s.name)}</a></li>`).join('')}</ul>
        </div>
        <div class="hb-stage"><div id="bodymap" class="bodymap-host" aria-label="${E(T('bodyHint'))}"></div></div>
      </div>
    </section>

    <section class="section intro-s">
      <div class="wrap intro2">
        <div><p class="eyebrow rv">${E(T('introH'))}</p>
          <p class="intro-big rv" data-d="60" data-field="home.intro">${E((H.intro && H.intro.x) || '')}</p>
          <a class="link-arrow rv" href="about.html">${E((H.intro && H.intro.btn && H.intro.btn.x) || T('readMore'))} ${I('arrow-right')}</a></div>
        <ul class="pillars">${(About.pillars || []).map((p, i) => `<li class="rv" data-d="${i*90}"><span class="pl-n">0${i+1}</span><b>${E(p.h)}</b><span>${E(p.x)}</span></li>`).join('')}</ul>
      </div>
    </section>

    <section class="section washed">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E(T('servicesH'))}</p><h2 class="h-xl rv" data-field="home.servicesH">${E(H.servicesH || T('services'))}</h2></div><a class="link-arrow rv" href="services.html">${E(T('allServices'))} ${I('arrow-right')}</a></div>
      ${A.svcCards(S)}</div>
    </section>

    <section class="section night tools-s">
      <div class="wrap">
        <div class="tools-grid">
          <a class="tool-card tool-nose rv" href="nose.html">
            <span class="tc-art" aria-hidden="true"><svg viewBox="0 0 200 200"><path class="tc-prof" d="M120 20 C 112 50, 104 70, 108 92 C 112 110, 140 118, 138 128 C 136 138, 118 136, 112 140 C 108 146, 116 152, 112 160 C 108 172, 96 176, 92 190"/><path class="tc-prof2" d="M120 20 C 114 48, 110 66, 116 88 C 120 104, 146 116, 144 126 C 142 136, 120 136, 112 140"/></svg></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('nose'))}</span><b class="h-l">${E(T('noseH'))}</b><span class="tc-p">${E(T('noseP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('noseCta'))} ${I('arrow-right')}</span><small>${I('shield-check')}${E(T('noseNote'))}</small></span></span></a>
          <a class="tool-card tool-games rv" data-d="90" href="play.html">
            <span class="tc-art dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('games'))}</span><b class="h-m">${E(T('gamesH'))}</b><span class="tc-p">${E(T('gamesP'))}</span><span class="tc-list">${E(T('gamesList'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('gamesCta'))} ${I('arrow-right')}</span></span></span></a>
          <a class="tool-card tool-trip rv" data-d="180" href="trip.html">
            <span class="tc-art cal" aria-hidden="true">${Array.from({length:21}, (_, i) => `<i class="${[3,4,5,6,7,8,9,10,11,12,13].includes(i) ? 'on' : ''}${i === 17 ? ' fly' : ''}"></i>`).join('')}</span>
            <span class="tc-body"><span class="eyebrow on-night">${E(T('trip'))}</span><b class="h-m">${E(T('tripH'))}</b><span class="tc-p">${E(T('tripP'))}</span>
            <span class="tc-foot"><span class="btn btn-light btn-sm">${E(T('tripCta'))} ${I('arrow-right')}</span></span></span></a>
        </div>
      </div>
    </section>

    <section class="section"><div class="wrap">${A.doctorCard(S)}</div></section>

    <section class="section washed reviews-s">
      <div class="wrap">
        <div class="shead"><div><p class="eyebrow rv">${E(T('reviews'))}</p><h2 class="h-xl rv" data-field="home.reviews.h">${E((H.reviews && H.reviews.h) || T('reviews'))}</h2></div>
          <div class="rail-ctrl rv"><button type="button" id="rv-prev" aria-label="${E(T('prev'))}">${I('chevron-left')}</button><button type="button" id="rv-next" aria-label="${E(T('next'))}">${I('chevron-right')}</button></div></div>
        ${chips([['all', T('all')], ...SVC_CATS.filter(k => reviews.some(r => r.cat === k)).map(k => [k, svcName(S, k)])], 'all')}
        ${reviewRail(reviews, 'rv-rail')}
        <p class="note">${E(T('resultsVary'))}</p>
        <div class="stories-wrap"><h3 class="h-m rv">${E(H.reviewsRealH || T('storiesH'))}</h3>${storiesHost(H.videos || (H.tiktok && H.tiktok.videos), 'stories', H.reviewsRealH)}
          ${H.tiktok && H.tiktok.link ? `<a class="tiktok-link" href="${E(H.tiktok.link.h)}" target="_blank" rel="noopener">${I('tiktok')}<span><b>${E(H.tiktok.h || '')}</b><small>@${E(H.tiktok.link.handle || 'apex_surgery')}</small></span>${I('arrow-up-right')}</a>` : ''}</div>
      </div>
    </section>

    <section class="section">
      <div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E(T('promotions'))}</p><h2 class="h-xl rv" data-field="home.promos.h">${E((H.promos && H.promos.h) || T('promosH'))}</h2><p class="muted rv" style="margin-top:10px">${E(T('promosSub'))}</p></div><a class="link-arrow rv" href="promotions.html">${E(T('viewAll'))} ${I('arrow-right')}</a></div>
      ${promoGrid(promos.slice(0, 8))}</div>
    </section>

    <section class="section washed"><div class="wrap">${A.branchesHtml(S, H.branches && H.branches.h, H.branches && H.branches.p)}</div></section>

    <section class="section">
      <div class="wrap"><div class="shead"><h2 class="h-xl rv" data-field="home.news.h">${E((H.news && H.news.h) || T('newsH'))}</h2><a class="link-arrow rv" href="blog.html">${E(T('viewAll'))} ${I('arrow-right')}</a></div>
      <div class="post-grid">${news.map((p, i) => postCard(p, i)).join('')}</div></div>
    </section>

    <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;

    A.mount('#bodymap', 'bodymap', {threeUrl:A.threeUrl}).then(() => A.qs('.hb-stage').classList.add('on'));
    A.bindMedia(main());
    const rail = A.qs('#rv-rail');
    A.railCtrl(rail, A.qs('#rv-prev'), A.qs('#rv-next'));
    bindChips(A.qs('.reviews-s'), k => { A.qsa('.ba-card', rail).forEach(c => c.hidden = !(k === 'all' || c.dataset.cat === k)); rail.scrollTo({left:0}); });
    mountStories(A.qs('#stories'));
  }

  /* =================== SERVICES =================== */
  async function services(){
    const S = A.d('shared') || {}, D = A.d('services') || {};
    A.setMeta(D.title, D.desc);
    main().innerHTML = phead(D.h || T('services'), T('servicesSub'), [homeCrumb(), [T('services')]]) + `
      <section class="section"><div class="wrap">${A.svcCards(S)}</div></section>
      <section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(T('tools'))}</h2></div>
        <div class="mini-tools">
          <a class="mini-tool rv" href="nose.html">${I('scan-face')}<b>${E(T('nose'))}</b><span>${E(T('nosePageP'))}</span></a>
          <a class="mini-tool rv" data-d="70" href="trip.html">${I('calendar')}<b>${E(T('trip'))}</b><span>${E(T('tripP'))}</span></a>
          <a class="mini-tool rv" data-d="140" href="play.html">${I('sparkles')}<b>${E(T('games'))}</b><span>${E(T('gamesP'))}</span></a>
          <a class="mini-tool rv" data-d="210" href="doctor.html">${I('stethoscope')}<b>${E(T('doctor'))}</b><span>${E((S.doctor && S.doctor.name) || '')}</span></a>
        </div></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
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
    main().innerHTML = `
    <section class="svc-head">
      <div class="phead-lines" aria-hidden="true"></div>
      <div class="wrap">
        ${A.crumbs(crumbs)}
        <div class="sh-grid">
          <div class="sh-copy">
            <p class="eyebrow on-night rv">${E(D.en || '')}</p>
            <h1 class="display-s rv" data-d="60" data-field="svc.name">${E(D.name)}</h1>
            ${D.byline ? `<p class="sh-by rv" data-d="120" data-field="svc.byline">${I('badge-check')}${E(D.byline)}</p>` : ''}
            <div class="sh-acts rv" data-d="180"><a class="btn btn-light" href="consult.html?p=${E(key)}">${I('message-circle')}${E(T('consult'))}</a>${planBtn(key)}${key === 'rhinoplasty' ? `<a class="btn btn-ghost btn-sm" href="nose.html">${I('scan-face')}${E(T('noseTry'))}</a>` : ''}</div>
          </div>
          ${recoveryCard(key, S)}
        </div>
      </div>
      ${D.hero ? `<figure class="sh-banner rv-clip ph-img wrap-wide"><img src="${IMG(D.hero)}" alt="${E(D.heroAlt || D.name)}" data-field="svc.hero"></figure>` : ''}
    </section>

    <section class="section svc-intro">
      <div class="wrap si-grid">
        <div class="prose big" data-field="svc.intro">${introP.map(p => `<p class="rv">${E(p)}</p>`).join('')}${ticks.length ? `<ul class="ticks lg">${ticks.map(x => `<li class="rv">${E(x)}</li>`).join('')}</ul>` : ''}</div>
        <div class="tagline rv" aria-hidden="true">${(D.tagline || []).map(x => `<span>${E(x)}</span>`).join('')}</div>
      </div>
      ${(D.badges || []).length ? `<div class="wrap"><div class="badges">${D.badges.map((b, i) => `<figure class="badge ph-img rv" data-d="${i*80}"><img src="${IMG(b.src)}" alt="${E(b.alt || '')}" loading="lazy"></figure>`).join('')}</div></div>` : ''}
    </section>

    ${D.atApex ? `<section class="section washed at-apex"><div class="wrap aa-grid"><h2 class="h-xl rv" data-field="svc.atApex.h">${E(D.atApex.h)}</h2><figure class="aa-ph ph-img rv-clip"><img src="${IMG(D.atApex.img)}" alt="${E(D.atApex.alt || '')}" loading="lazy"></figure></div></section>` : ''}

    ${(D.sections || []).length ? `<section class="section svc-secs"><div class="wrap sec-grid"><nav class="toc" id="toc" aria-label="${E(D.name)}"></nav><div class="prose" id="secs" data-field="svc.sections"></div></div></section>` : ''}

    ${(D.ba || []).length ? `<section class="section night ba-s"><div class="wrap"><div class="shead"><div><p class="eyebrow on-night rv">${E(nm)}</p><h2 class="h-xl rv">${E(D.baH || T('baH'))}</h2></div><p class="note on-night rv">${E(T('resultsVary'))}</p></div>
      <div id="ba" class="ba-host">${baGrid(D.ba, D.baH)}</div></div></section>` : ''}

    <section class="section reviews-s">
      <div class="wrap"><div class="shead"><h2 class="h-xl rv" data-field="svc.reviewsH">${E((D.reviewsH || T('reviews')).replace(/\s*!+\s*$/, ''))}</h2>
        <div class="rail-ctrl rv"><button type="button" id="rv-prev" aria-label="${E(T('prev'))}">${I('chevron-left')}</button><button type="button" id="rv-next" aria-label="${E(T('next'))}">${I('chevron-right')}</button></div></div>
      ${reviewRail(D.reviewImgs || [], 'rv-rail')}
      <div class="stories-wrap">${storiesHost(D.videos, 'stories', D.reviewsH)}</div>
      ${(D.yt || []).length || D.tiktok ? `<div class="yt-row">${(D.yt || []).map(id => `<div class="ytbox rv"><button type="button" data-yt="${E(id)}" aria-label="${E(T('playVideo'))}"><img loading="lazy" src="${A.yt(id)}" alt=""><span class="pl">${I('play')}</span></button></div>`).join('')}
        ${D.tiktok ? `<a class="tiktok-link rv" href="${E(D.tiktok.h)}" target="_blank" rel="noopener">${I('tiktok')}<span><b>${E(D.tiktok.x)}</b><small>@apex_surgery</small></span>${I('arrow-up-right')}</a>` : ''}</div>` : ''}
      </div>
    </section>

    ${promos.length ? `<section class="section washed"><div class="wrap"><div class="shead"><div><p class="eyebrow rv">${E((D.promoTag || []).join(' · '))}</p><h2 class="h-xl rv">${E(D.promoH || T('promosH'))}</h2></div><a class="link-arrow rv" href="promotions.html?c=${E(key)}">${E(T('viewAll'))} ${I('arrow-right')}</a></div>${promoGrid(promos)}</div></section>` : ''}

    ${(D.faqs || []).length ? `<section class="section"><div class="wrap faq-grid"><div><p class="eyebrow rv">${E(T('faqH'))}</p><h2 class="h-xl rv" data-field="svc.faqH">${E(D.faqH || T('faqH'))}</h2>
      <a class="btn btn-plum rv" style="margin-top:28px" href="${(S.line && S.line.h) || '#'}" target="_blank" rel="noopener">${I('line')}${E((S.cta && S.cta.free) || T('consult'))}</a></div>
      <div data-field="svc.faqs">${A.faqHtml(D.faqs)}</div></div></section>` : ''}

    <section class="section washed"><div class="wrap">${A.doctorCard(S)}</div></section>
    <section class="section"><div class="wrap">${A.branchesHtml(S)}</div></section>
    <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;

    if ((D.sections || []).length) {
      const blocks = [];
      D.sections.forEach(s => { if (s.h) blocks.push({t:'h2', x:s.h}); blocks.push(...(s.blocks || [])); });
      const toc = A.renderBlocks(blocks, A.qs('#secs'));
      const tocEl = A.qs('#toc');
      if (toc.length > 1) { tocEl.innerHTML = `<p class="eyebrow">${E(nm)}</p>` + toc.map(x => `<a href="#${x.id}">${E(x.x)}</a>`).join(''); A.tocSpy(tocEl, toc.map(x => x.id)); }
      else { tocEl.parentElement.classList.add('notoc'); tocEl.remove(); }
    }
    A.bindMedia(main()); bindPlan(main());
    A.railCtrl(A.qs('#rv-rail'), A.qs('#rv-prev'), A.qs('#rv-next'));
    mountStories(A.qs('#stories'), {procedure:key});
    mountCompare(A.qs('#ba'), D.ba || []);
    A.jsonld({'@context':'https://schema.org','@type':'MedicalProcedure', name:D.name, alternateName:D.en, description:D.desc, procedureType:'https://schema.org/SurgicalProcedure', howPerformed:(D.intro || [])[0], followup:((RECOVERY[A.lang] || {})[key] || []).map(r => r.join(': ')).join('; '), performer:{'@type':'Physician', name:(S.doctor || {}).name}});
    if ((D.faqs || []).length) A.jsonld({'@context':'https://schema.org','@type':'FAQPage', mainEntity:D.faqs.map(q => ({'@type':'Question', name:q.q, acceptedAnswer:{'@type':'Answer', text:(q.a || []).join(' ')}}))});
    A.breadcrumbLd(crumbs.map((c, i) => [c[0], c[1] || location.href]));
  }

  /* =================== ABOUT =================== */
  async function about(){
    const S = A.d('shared') || {}, D = A.d('about') || {};
    A.setMeta(D.title, D.desc);
    main().innerHTML = phead(D.h1 || T('about'), null, [homeCrumb(), [T('about')]]) + `
      ${D.hero && D.hero.src ? `<figure class="about-banner ph-img rv-clip wrap-wide"><img src="${IMG(D.hero.src)}" alt="${E(D.hero.alt || D.h1)}"></figure>` : ''}
      <section class="section"><div class="wrap about-grid">
        <div class="prose big" data-field="about.intro">${(D.intro || []).map(p => `<p class="rv">${E(p)}</p>`).join('')}</div>
        <aside class="about-side rv"><p class="eyebrow">${E(T('foundedBy'))}</p><p>${E(S.founder || '')}</p></aside></div></section>
      <section class="section night vision-s"><div class="wrap"><p class="eyebrow on-night rv">${E(D.visionH || T('visionH'))}</p><p class="vision rv" data-field="about.vision">${E(D.vision || '')}</p>
        <ul class="pillars on-night">${(D.pillars || []).map((p, i) => `<li class="rv" data-d="${i*90}"><span class="pl-n">0${i+1}</span><b>${E(p.h)}</b><span>${E(p.x)}</span></li>`).join('')}</ul></div></section>
      <section class="section"><div class="wrap">${A.doctorCard(S)}</div></section>
      <section class="section washed"><div class="wrap">${A.branchesHtml(S, D.branches && D.branches.h, D.branches && D.branches.p)}</div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
  }

  /* =================== DOCTOR =================== */
  async function doctor(){
    const S = A.d('shared') || {}, Dr = S.doctor || {};
    A.setMeta(`${Dr.name} ${Dr.license || ''} | Apex Surgery Hospital`, Dr.specialty);
    main().innerHTML = phead(Dr.name, `${Dr.title || ''} · ${Dr.license || ''}`, [homeCrumb(), [T('doctor')]]) + `
      <section class="section"><div class="wrap">${A.doctorCard(S, true)}</div></section>
      <section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(T('servicesH'))}</h2></div>${A.svcCards(S)}</div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
  }

  /* =================== PROMOTIONS =================== */
  async function promotions(){
    const S = A.d('shared') || {}, D = A.d('promotions') || {};
    A.setMeta(D.title, D.desc);
    const items = D.items || [];
    const start = A.param('c') && SVC_CATS.includes(A.param('c')) ? A.param('c') : 'all';
    const filters = (D.filters || [{k:'all', x:T('all')}]).map(f => [f.k, f.k === 'all' ? T('all') : f.x]).filter(([k]) => k === 'all' || items.some(i => i.cat === k));
    main().innerHTML = phead(D.h1 || T('promotions'), T('promosSub'), [homeCrumb(), [T('promotions')]]) + `
      <section class="section" style="padding-top:50px"><div class="wrap">
        ${chips(filters, start)}
        <div id="pgrid">${promoGrid(items)}</div>
        <p class="note" style="margin-top:30px">${E(S.footerNote || '')}</p></div></section>
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    const apply = k => A.qsa('#pgrid .promo').forEach((el, i) => el.hidden = !(k === 'all' || items[i].cat === k));
    apply(start);
    bindChips(main(), apply);
    A.bindMedia(main());
  }

  /* =================== REVIEWS =================== */
  async function reviews(){
    const S = A.d('shared') || {}, D = A.d('reviews') || {}, P = A.d('posts') || [], H = A.d('home') || {};
    A.setMeta(D.title, D.desc);
    const items = D.items || [];
    const g = A.gallery(items.map(r => ({src:r.src, alt:r.alt || ''})));
    const rp = P.filter(p => p.cat === 'review');
    main().innerHTML = phead(D.h1 || T('reviews'), T('reviewsSub'), [homeCrumb(), [T('reviews')]]) + `
      <section class="section" style="padding-top:50px"><div class="wrap">
        ${chips([['all', T('all')], ...SVC_CATS.filter(k => items.some(r => r.cat === k)).map(k => [k, svcName(S, k)])], 'all')}
        <div class="rev-grid" id="rgrid">${items.map((r, i) => `<button type="button" class="rev-tile ph-img rv" data-d="${(i%4)*50}" data-cat="${E(r.cat || '')}" ${g.attr(i)}><img src="${IMG(r.src)}" alt="${E(r.alt || svcName(S, r.cat))}" loading="lazy"></button>`).join('')}</div>
        <p class="note">${E(T('resultsVary'))}</p></div></section>
      <section class="section night"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(H.reviewsRealH || T('storiesH'))}</h2></div>${storiesHost(H.videos, 'stories', H.reviewsRealH)}</div></section>
      <section class="section"><div class="wrap"><div class="shead"><h2 class="h-xl rv">${E(T('reviewPosts'))}</h2><a class="link-arrow rv" href="blog.html?c=review">${E(T('viewAll'))} ${I('arrow-right')}</a></div>
        <div class="post-grid">${rp.map((p, i) => postCard(p, i)).join('')}</div></div></section>
      <section class="section washed"><div class="wrap">${A.consultBand(S)}</div></section>`;
    bindChips(main(), k => A.qsa('#rgrid .rev-tile').forEach(el => el.hidden = !(k === 'all' || el.dataset.cat === k)));
    A.bindMedia(main());
    mountStories(A.qs('#stories'));
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
    main().innerHTML = `
      <section class="art-head"><div class="phead-lines" aria-hidden="true"></div><div class="wrap">${A.crumbs(crumbs)}
        <p class="art-meta rv"><span class="pc-cat">${E(catName)}</span>${D.date ? `<time datetime="${E(D.date)}">${E(A.fmtDate(D.date))}</time>` : ''}</p>
        <h1 class="h-xl rv" data-d="60" data-field="post.title">${E(D.title)}</h1></div></section>
      ${D.img ? `<figure class="art-banner ph-img rv-clip wrap-mid"><img src="${IMG(D.img)}" alt="${E(D.title)}"></figure>` : ''}
      <section class="section art-s"><div class="wrap sec-grid"><nav class="toc" id="toc"></nav><article class="prose" id="body" data-field="post.blocks"></article></div></section>
      ${related.length ? `<section class="section washed"><div class="wrap"><div class="shead"><h2 class="h-l rv">${E(catName)}</h2><a class="link-arrow rv" href="blog.html">${E(T('backToArticles'))} ${I('arrow-right')}</a></div><div class="post-grid">${related.map((p, i) => postCard(p, i)).join('')}</div></div></section>` : ''}
      <section class="section night"><div class="wrap">${A.consultBand(S)}</div></section>`;
    const toc = A.renderBlocks(D.blocks || [], A.qs('#body'));
    const tocEl = A.qs('#toc');
    if (toc.length > 2) { tocEl.innerHTML = toc.map(x => `<a href="#${x.id}">${E(x.x)}</a>`).join(''); A.tocSpy(tocEl, toc.map(x => x.id)); } else { tocEl.parentElement.classList.add('notoc'); tocEl.remove(); }
    A.readBar();
    A.jsonld({'@context':'https://schema.org','@type':'Article', headline:D.title, datePublished:D.date, image:IMG(D.img), inLanguage:A.lang, publisher:{'@type':'Organization', name:'Apex Surgery Hospital'}});
    const faq = (D.blocks || []).filter(b => b.t === 'faqs').flatMap(b => b.items || []);
    if (faq.length) A.jsonld({'@context':'https://schema.org','@type':'FAQPage', mainEntity:faq.map(q => ({'@type':'Question', name:q.q, acceptedAnswer:{'@type':'Answer', text:(q.a || []).map(a => a.x || a).join(' ')}}))});
    A.breadcrumbLd([...crumbs, [D.title]].map(c => [c[0], c[1] || location.href]));
  }

  /* =================== CONTACT =================== */
  async function contact(){
    const S = A.d('shared') || {}, D = A.d('contact') || {};
    A.setMeta(D.title, D.desc);
    const b0 = (S.branches || [])[0] || {};
    main().innerHTML = phead(D.h1 || T('contact'), null, [homeCrumb(), [T('contact')]]) + `
      <section class="section" style="padding-top:50px"><div class="wrap contact2">
        <div class="channels">
          <a class="chan rv" href="${(S.line && S.line.h) || '#'}" target="_blank" rel="noopener"><span class="chan-ic ln">${I('line')}</span><span><b>LINE</b><small>${E((S.line && S.line.x) || '')}</small></span><img class="chan-qr" src="${IMG(S.line && S.line.qr)}" alt="LINE QR" loading="lazy"></a>
          <a class="chan rv" data-d="60" href="${A.WA.h}" target="_blank" rel="noopener"><span class="chan-ic wa">${I('whatsapp')}</span><span><b>WhatsApp</b><small>${E(T('whatsappSub'))} · ${E(A.WA.x)}</small></span>${I('arrow-up-right')}</a>
          ${(S.branches || []).map((b, i) => `<a class="chan rv" data-d="${120 + i*60}" href="${b.tel}"><span class="chan-ic">${I('phone')}</span><span><b>${E(b.phone)}</b><small>${E(b.short || b.name)}</small></span>${I('arrow-up-right')}</a>`).join('')}
          ${(S.socials || []).filter(s => s.k !== 'line').map(s => `<a class="chan sm rv" href="${s.h}" target="_blank" rel="noopener"><span class="chan-ic">${A.socIcon(s.k)}</span><span><b>${E(s.x)}</b></span>${I('arrow-up-right')}</a>`).join('')}
        </div>
        <div class="consult-col"><div id="consult" class="consult-host"><h2 class="h-l">${E(D.formH || T('consultPageH'))}</h2><p class="muted">${E(T('consultPageP'))}</p><a class="btn btn-plum" href="consult.html">${I('message-circle')}${E(T('consultBtn'))}</a></div></div>
      </div></section>
      <section class="section washed"><div class="wrap">${A.branchesHtml(S, D.branches && D.branches.h, D.branches && D.branches.p)}</div></section>`;
    A.mount('#consult', 'consult', {compact:true});
  }

  /* =================== FEATURE PAGES =================== */
  const featurePage = (name, h, p, hostId, extra={}, cls='') => async () => {
    const S = A.d('shared') || {};
    main().innerHTML = phead(T(h), p ? T(p) : null, [homeCrumb(), [T(h)]]) + `<section class="section feat-s ${cls}"><div class="wrap"><div id="${hostId}" class="feat-page-host"></div></div></section>
      ${name === 'plan' || name === 'consult' ? '' : `<section class="section washed"><div class="wrap">${A.consultBand(S)}</div></section>`}`;
    const ex = typeof extra === 'function' ? extra() : extra;
    await A.mount('#' + hostId, name, ex);
  };
  const nose = featurePage('nose', 'nosePageH', 'nosePageP', 'nose', () => A.mpBase ? {mpBase:A.mpBase} : {}, 'night-s');
  const play = featurePage('games', 'playPageH', 'playPageP', 'games', {}, 'play-s');
  const LINKS = {bodymap:'index.html#hero', nose:'nose.html', games:'play.html', trip:'trip.html', plan:'plan.html', consult:'consult.html'};
  const plan = featurePage('plan', 'planPageH', 'planPageP', 'plan', {links:LINKS});
  const trip = featurePage('trip', 'tripPageH', 'tripP', 'trip', () => Object.assign({links:LINKS}, A.param('p') ? {procedures:[A.param('p')]} : {}));
  const consult = featurePage('consult', 'consultPageH', 'consultPageP', 'consult', () => ({procedure:A.param('p') || undefined}));

  async function notfound(){
    main().innerHTML = `<section class="phead nf"><div class="phead-lines" aria-hidden="true"></div><div class="wrap"><p class="nf-code rv">404</p><h1 class="display-s rv">${E(T('notFoundH'))}</h1><p class="lead rv" style="margin-top:18px">${E(T('notFoundP'))}</p>
      <div class="nf-links rv"><a class="btn btn-light" href="index.html">${E(T('goHome'))}</a><a class="btn btn-ghost" href="services.html">${E(T('services'))}</a><a class="btn btn-ghost" href="blog.html">${E(T('articles'))}</a><a class="btn btn-ghost" href="contact.html">${E(T('contact'))}</a></div></div></section>`;
  }

  const PAGES = {home, services, service, about, doctor, promotions, reviews, blog, article, contact, nose, play, plan, trip, consult, notfound};
  A.boot(() => (PAGES[document.body.dataset.page] || home)());
})();
