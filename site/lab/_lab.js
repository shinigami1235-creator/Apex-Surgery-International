/* Shared lab harness: TH/EN switch, event log, and the apex:event bridge the plan store listens to. */
export function lab({ title, mountFn, el, extra }) {
  const log = document.getElementById('events');
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') === 'th' ? 'th' : 'en';
  let inst = null;
  window.__events = [];
  const onEvent = (name, data) => {
    window.__events.push({ name, data });
    log.textContent = `${new Date().toLocaleTimeString()} ${name} ${JSON.stringify(data)}\n` + log.textContent;
    window.dispatchEvent(new CustomEvent('apex:event', { detail: { name, data } }));
  };
  const opts = () => ({
    lang,
    base: new URL('../assets/', location.href).href,
    serviceUrl: k => (lang === 'th' ? '../th/' : '../') + 'service.html?p=' + k,
    onEvent,
    links: { bodymap: 'bodymap.html', nose: 'nose.html', games: 'games.html', trip: 'trip.html', plan: 'plan.html', consult: 'consult.html' },
    ...(extra ? extra(lang) : {})
  });
  const start = () => {
    inst && inst.destroy();
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    inst = mountFn(el, opts());
    window.__inst = inst;
  };
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
    start();
  }));
  start();
  return { restart: start, onEvent, get lang() { return lang; } };
}
