/* Example price lists for review only, loaded by ?pricing=demo. The numbers are made up to show how the page
   behaves; Apex sets the real ones under Apex settings › Prices by country.
   - Australia and New Zealand: Australian dollars, 15% on the baht price, Motiva at its own price, one offer
     hidden. Posters with a baht price give way to a plain card.
   - Gulf countries: US dollars and "Ask for the price" on every offer.
   Offers are keyed by the poster's file name. */
export default {
  choose: true,
  other: 'base',
  base: { name: { en: 'Thailand', th: 'ประเทศไทย' } },
  regions: [
    { id: 'anz', name: { en: 'Australia and New Zealand', th: 'ออสเตรเลียและนิวซีแลนด์' }, countries: ['AU', 'NZ'], cur: 'AUD', adjust: 15, mismatch: 'card' },
    { id: 'gulf', name: { en: 'Gulf countries', th: 'กลุ่มประเทศอ่าวอาหรับ' }, countries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'], cur: 'USD', ask: true, mismatch: 'card' }
  ],
  offers: {
    'Motiva-Promotion-100000-apex-surgery.webp': { rows: { anz: { price: 4990 } } },
    'Breast-augmentation-Mentor-Case-Review-69000-apex-surgery.webp': { rows: { anz: { show: 'hide' } } }
  }
};
