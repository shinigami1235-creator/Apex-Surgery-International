/* Learn mode: a calm, unscored quiz built from the Fact Rush statements.
   No timer and no prize. The hub grants one extra scored try the first time a set is finished each day. */
import { css, h, shuffle, tx, sfx, LATTICE } from './framework.js';
import { procIcon } from './art.js';
import { FACTS, PROCS } from './content.js';
import { LEARN_SET_SIZE } from './config.js';

const UI = {
  title: { en: 'Learn', th: 'เรียนรู้' },
  q: { en: 'Question {n} of {t}', th: 'ข้อ {n} จาก {t}' },
  fact: { en: 'Fact', th: 'จริง' },
  myth: { en: 'Myth', th: 'เข้าใจผิด' },
  right: { en: 'Correct', th: 'ถูกต้อง' },
  wrong: { en: 'Incorrect', th: 'ไม่ถูกต้อง' },
  next: { en: 'Next', th: 'ข้อต่อไป' },
  finish: { en: 'Finish set', th: 'จบชุดคำถาม' },
  done: { en: 'Set complete', th: 'ทำครบชุดแล้ว' },
  score: { en: '{c} of {t} correct', th: 'ตอบถูก {c} จาก {t} ข้อ' },
  bonus: { en: '1 extra scored try added for today.', th: 'เพิ่มสิทธิ์เล่นแบบนับคะแนน 1 ครั้งสำหรับวันนี้' },
  bonusUsed: { en: "Today's extra try is already added.", th: 'วันนี้ได้รับสิทธิ์เพิ่มแล้ว' },
  again: { en: 'New set', th: 'ชุดใหม่' },
  back: { en: 'Games', th: 'เกม' },
  ask: { en: 'Fact or myth?', th: 'จริงหรือเข้าใจผิด' }
};
const f = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

const CSS = `
.lr{max-width:680px;margin:0 auto;color:var(--ink,#2A1F33)}
.lr-top{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:14px;margin-bottom:16px;font-size:14px;font-weight:700;color:var(--ink-2,#5A4A66);line-height:1}
.lr-bar{height:8px;border-radius:8px;background:var(--lilac-100,#F1EAF7);overflow:hidden;box-shadow:inset 0 1px 2px rgba(42,15,64,.12)}
.lr-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--lilac,#A886CD),var(--plum,#6A388C),#CC3366);border-radius:8px;transition:width .4s cubic-bezier(.23,1,.32,1)}
.lr-card{position:relative;overflow:hidden;isolation:isolate;background:linear-gradient(180deg,#fff,#FCF8FD);border-radius:24px;padding:22px 22px 22px;
  box-shadow:0 1px 1px rgba(42,15,64,.06),0 10px 24px -10px rgba(42,15,64,.22),0 30px 60px -30px rgba(42,15,64,.3)}
.lr-card::after{content:"";position:absolute;right:-30px;top:-30px;width:160px;height:160px;background:${LATTICE('#6A388C', 0.14)} center/18px 18px;-webkit-mask:radial-gradient(circle,#000 20%,transparent 70%);mask:radial-gradient(circle,#000 20%,transparent 70%);z-index:-1}
.lr-hd{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.lr-ic{flex:none;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;color:var(--plum,#6A388C);background:linear-gradient(145deg,#F6EFFB,#E6D8F1);box-shadow:inset 0 1px 0 #fff}
.lr-ic svg{width:22px;height:22px}
.lr-tag{font-size:14px;font-weight:800;color:var(--plum-700,#55286F);line-height:1.2}
.lr-text{font-size:20px;line-height:1.45;font-weight:700;margin:0 0 8px}
.lr-ask{font-size:14px;color:var(--ink-2,#5A4A66);margin:0}
.lr-btns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
.lr-out{display:grid;gap:8px;margin-top:18px;padding:16px 18px;border-radius:18px;background:var(--wash,#FBF3FB);border:1px solid var(--lilac-200,#E4D8EE);font-size:15px;line-height:1.55}
.lr-out.no{border-color:rgba(204,51,102,.4);background:#FFF5F8}
.lr-out .row{display:flex;align-items:center;gap:10px}
.lr-out strong{font-size:16px;line-height:1.2}
.lr-out .chip{display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:999px;background:var(--plum,#6A388C);color:#fff;font-size:12px;font-weight:800;line-height:1}
.lr-out .chip.myth{background:#CC3366}
.lr-out .lr-btns{grid-template-columns:1fr;margin-top:6px}
.lr-end{text-align:center;padding:30px 20px}
.lr-end h3{font-size:26px;margin:0 0 8px}
.lr-end p{margin:4px 0;color:var(--ink-2,#5A4A66)}
.lr-end .plus{color:var(--plum,#6A388C);font-weight:700}
.lr-end .lr-btns{max-width:420px;margin:20px auto 0}
.apxg .lr-btns .g-btn.ans[disabled]{opacity:.5;cursor:default}
.apxg .lr-btns .g-btn.ans.sel-ok{opacity:1;background:var(--plum,#6A388C);color:#fff;border-color:var(--plum,#6A388C)}
.apxg .lr-btns .g-btn.ans.sel-no{opacity:1;background:#CC3366;color:#fff;border-color:#CC3366}
`;

/* opts: {lang, rng, onComplete({correct,total}) -> bool (bonus granted), onExit(), btn(cls) -> class string} */
export function mountLearn(el, opts) {
  css('apxg-lr', CSS);
  const { lang = 'en', rng = Math.random, onComplete = () => false, onExit = () => {} } = opts;
  const btn = opts.btn || (c => 'g-btn ' + (c || ''));
  let set = [], i = 0, correct = 0;

  const newSet = () => {
    // balance facts and myths, half each
    const facts = shuffle(FACTS.filter(x => x.answer === 'fact'), rng);
    const myths = shuffle(FACTS.filter(x => x.answer === 'myth'), rng);
    const half = Math.floor(LEARN_SET_SIZE / 2);
    set = shuffle(facts.slice(0, LEARN_SET_SIZE - half).concat(myths.slice(0, half)), rng);
    i = 0; correct = 0;
    question();
  };

  const question = () => {
    const q = set[i];
    el.innerHTML = '';
    const bar = h('i', { style: { width: (i / set.length * 100) + '%' } });
    const top = h('div', { class: 'lr-top' }, h('span', null, f(tx(UI.q, lang), { n: i + 1, t: set.length })), h('div', { class: 'lr-bar' }, bar));
    const bM = h('button', { class: btn('ghost ans'), type: 'button' }, tx(UI.myth, lang));
    const bF = h('button', { class: btn('ghost ans'), type: 'button' }, tx(UI.fact, lang));
    const out = h('div');
    const card = h('div', { class: 'lr-card' },
      h('div', { class: 'lr-hd' }, h('span', { class: 'lr-ic', html: procIcon(q.proc) }), h('span', { class: 'lr-tag' }, tx(PROCS[q.proc], lang))),
      h('p', { class: 'lr-text' }, tx(q.text, lang)),
      h('p', { class: 'lr-ask' }, tx(UI.ask, lang)),
      h('div', { class: 'lr-btns' }, bM, bF),
      out);
    el.append(h('div', { class: 'lr' }, top, card));
    const choose = ans => {
      if (bM.disabled) return;
      bM.disabled = bF.disabled = true;
      const ok = ans === q.answer;
      if (ok) correct++;
      sfx.play(ok ? 'good' : 'bad');
      (ans === 'fact' ? bF : bM).classList.add(ok ? 'sel-ok' : 'sel-no');
      const last = i === set.length - 1;
      const next = h('button', { class: btn('plum'), type: 'button' }, tx(last ? UI.finish : UI.next, lang));
      next.addEventListener('click', () => { i++; i < set.length ? question() : end(); });
      out.className = 'lr-out' + (ok ? '' : ' no');
      out.append(
        h('div', { class: 'row' }, h('strong', null, tx(ok ? UI.right : UI.wrong, lang)), h('span', { class: 'chip ' + q.answer }, tx(q.answer === 'fact' ? UI.fact : UI.myth, lang))),
        h('span', null, tx(q.why, lang)),
        h('div', { class: 'lr-btns' }, next));
      bar.style.width = ((i + 1) / set.length * 100) + '%';
      next.focus({ preventScroll: true });
    };
    bM.addEventListener('click', () => choose('myth'));
    bF.addEventListener('click', () => choose('fact'));
  };

  const end = () => {
    const granted = onComplete({ correct, total: set.length });
    sfx.play(granted ? 'prize' : 'level');
    el.innerHTML = '';
    const again = h('button', { class: btn('plum'), type: 'button' }, tx(UI.again, lang));
    const back = h('button', { class: btn('ghost'), type: 'button' }, tx(UI.back, lang));
    again.addEventListener('click', newSet);
    back.addEventListener('click', onExit);
    el.append(h('div', { class: 'lr' }, h('div', { class: 'lr-card lr-end' },
      h('h3', null, tx(UI.done, lang)),
      h('p', null, f(tx(UI.score, lang), { c: correct, t: set.length })),
      h('p', { class: 'plus' }, tx(granted ? UI.bonus : UI.bonusUsed, lang)),
      h('div', { class: 'lr-btns' }, back, again))));
  };

  newSet();
  return { destroy() { el.innerHTML = ''; } };
}
