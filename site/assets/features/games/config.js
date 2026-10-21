/* Games: tries, prize tiers and voucher rules.
   PRIZES BELOW ARE EXAMPLES. Apex will replace the prize names and may change the thresholds.
   Thresholds for Fact Rush, Recovery Sort and Memory Match come from bot playtests
   (see the report): tier 1 sits near the median score of a reasonable player. */

export const DAILY_TRIES = 3;        // scored tries per player per day, reset at midnight Asia/Bangkok
export const LEARN_BONUS_TRIES = 1;  // finishing one Learn set a day adds this many scored tries for that day
export const LEARN_SET_SIZE = 8;
export const VOUCHER_DAYS = 60;      // voucher expiry, counted from the claim date
export const CODE_PREFIX = 'APX-';

/* Example prizes. Apex will replace these. */
const TOTE = { en: 'Apex tote bag', th: 'กระเป๋าผ้า Apex' };
const KIT = { en: 'Skincare kit', th: 'ชุดผลิตภัณฑ์ดูแลผิว' };
const PICKUP = { en: 'Airport pickup (international clients)', th: 'บริการรับจากสนามบิน (ลูกค้าต่างประเทศ)' };
/* Monthly top prize for each game: the best scored run of the calendar month (Bangkok time). */
const MONTHLY = { en: "Month's best score", th: 'คะแนนสูงสุดประจำเดือน' };

export const GAMES = {
  steady: {
    order: 1,
    /* Placeholder thresholds: the Steady Hand build sets these from its own playtests. */
    tiers: [{ score: 600, prize: TOTE }, { score: 1200, prize: KIT }, { score: 2000, prize: PICKUP }],
    monthly: MONTHLY,
    title: { en: 'Steady Hand', th: 'มือนิ่ง' }
  },
  proportion: {
    order: 2,
    /* Stencil build, bot playtests (Oct 2026): careful player median 2,194, sloppy player median about 530. */
    tiers: [{ score: 600, prize: TOTE }, { score: 1200, prize: KIT }, { score: 2000, prize: PICKUP }],
    monthly: MONTHLY,
    title: { en: 'Proportion', th: 'สัดส่วน' }
  },
  factrush: {
    order: 3,
    /* Bot playtests, 375x752 stage: reasonable player median 380 to 410 (16 runs), good player median 3,225, expert 6,435. */
    tiers: [{ score: 400, prize: TOTE }, { score: 1200, prize: KIT }, { score: 3000, prize: PICKUP }],
    monthly: MONTHLY,
    title: { en: 'Fact Rush', th: 'จริงหรือเข้าใจผิด' }
  },
  recoverysort: {
    order: 4,
    /* Bot playtests: reasonable player median 350 to 435 (22 runs), good player median 2,625. */
    tiers: [{ score: 400, prize: TOTE }, { score: 1200, prize: KIT }, { score: 2500, prize: PICKUP }],
    monthly: MONTHLY,
    title: { en: 'Recovery Sort', th: 'จัดช่วงพักฟื้น' }
  },
  memorymatch: {
    order: 5,
    /* Bot playtests: reasonable player median 2,411 to 2,479 (22 runs), good player median 4,988, expert 7,793. */
    tiers: [{ score: 2400, prize: TOTE }, { score: 3800, prize: KIT }, { score: 5000, prize: PICKUP }],
    monthly: MONTHLY,
    title: { en: 'Memory Match', th: 'จับคู่ความจำ' }
  }
};

export const GAME_IDS = Object.keys(GAMES).sort((a, b) => GAMES[a].order - GAMES[b].order);

/* Highest tier reached by a score, or null. */
export function tierFor(id, score) {
  const t = (GAMES[id] && GAMES[id].tiers) || [];
  let hit = null;
  t.forEach((x, i) => { if (score >= x.score) hit = { ...x, index: i }; });
  return hit;
}
/* Next tier above a score, or null when all are reached. */
export function nextTier(id, score) {
  const t = (GAMES[id] && GAMES[id].tiers) || [];
  const i = t.findIndex(x => score < x.score);
  return i < 0 ? null : { ...t[i], index: i };
}
