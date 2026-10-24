"""Writes site/assets/data/{en,th}/treatments.js, the non-surgical treatments page, from procedures.json.

Run from the repo root:  python3 data-src/treatments.py
Each card names a kind of treatment and lists the devices or products Apex uses for it, by the names in
procedures.json (every name is checked against it, so a typo here stops the build). The sheet's own SKUs
(Ulthera 1.5, 3 and 4.5, Thermage tips, Pico by doctor or technician, hair removal minutes) are folded into one
card each. Left off the public page on purpose:
  - prescription medicines by name (botulinum toxin brands, Mounjaro, Wegovy, hormone injections), since Thai
    drug law does not allow advertising them to the public; the cards say what the treatment is instead
  - stem cell, exosome, NK cell, placenta and MSC treatments, since their use outside research is restricted
  - names Apex still has to confirm (see "check" in procedures.json), lab tests, massage and colon cleansing
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# group: key, EN heading, TH heading (from the sheet), EN intro, TH intro, cards
# card: key, EN name, TH name, EN line, TH line, product names (must exist in procedures.json), optional link
G = [
 ('inject', 'Injectables', 'งานฉีด',
  'Toxin, fillers, skin boosters and threads. A doctor gives each one in a short visit, usually with numbing cream first.',
  'โบท็อกซ์ ฟิลเลอร์ สกินบูสเตอร์ และร้อยไหม แพทย์เป็นผู้ฉีดเองทุกครั้ง ใช้เวลาไม่นาน ส่วนใหญ่ทายาชาก่อน', [
  ('toxin', 'Wrinkle relaxer injection', 'ฉีดลดริ้วรอย',
   'Relaxes the muscles behind frown lines, forehead lines and crow\'s feet, and slims the jaw. Four brands to choose from.',
   'คลายกล้ามเนื้อที่ทำให้เกิดริ้วรอยระหว่างคิ้ว หน้าผาก หางตา และช่วยให้กรามเรียวลง มีให้เลือก 4 ยี่ห้อ', []),
  ('filler', 'Hyaluronic acid fillers', 'ฟิลเลอร์ไฮยาลูโรนิก',
   'Adds volume to cheeks, chin, temples, lips and the tear trough, and softens folds. Each product has its own firmness for the area.',
   'เติมเต็มแก้ม คาง ขมับ ริมฝีปาก และร่องใต้ตา ช่วยให้ร่องแก้มตื้นขึ้น แต่ละรุ่นมีความแน่นต่างกันตามตำแหน่งที่ฉีด',
   ['Juvederm Voluma', 'Juvederm Volift', 'Juvederm Volbella', 'Restylane Kysse', 'Belotero Intense', 'Revanesse Shape',
    'Revanesse Ultra', 'Teosyal RHA 4', 'Teosyal Ultra Deep', 'Teosyal Redensity 2'], 'filler.html'),
  ('booster', 'Skin boosters', 'สกินบูสเตอร์',
   'Small amounts spread through the skin for hydration and fine lines. They improve skin quality and do not add volume.',
   'ฉีดปริมาณน้อยกระจายทั่วผิว เพิ่มความชุ่มชื้นและลดริ้วรอยเล็ก ๆ ช่วยเรื่องคุณภาพผิว ไม่ได้เติมเต็มรูปหน้า',
   ['Restylane Vital Light', 'Teosyal Redensity 1 (1 mL)', 'Belotero Revive', 'Profhilo', 'Skinvive', 'Neauvia Hydro Deluxe',
    'Ejal', 'NCTF 135', 'Neobella', 'Derma Glow']),
  ('pn', 'Polynucleotides (PN)', 'โพลีนิวคลีโอไทด์ (PN)',
   'Repairs thin or tired skin, often around the eyes and on the neck.',
   'ฟื้นฟูผิวบางหรือผิวที่ดูเหนื่อยล้า นิยมใช้รอบดวงตาและลำคอ', ['Nucleofill', 'Plinest', 'Vitaran']),
  ('biostim', 'Collagen stimulators', 'กระตุ้นคอลลาเจน',
   'Builds the skin\'s own collagen over a few months. HArmonyCa mixes a filler with a collagen stimulator.',
   'กระตุ้นให้ผิวสร้างคอลลาเจนเองภายในไม่กี่เดือน HArmonyCa เป็นฟิลเลอร์ผสมสารกระตุ้นคอลลาเจน',
   ['Sculptra', 'Radiesse', 'Radiesse (+)', 'HArmonyCa']),
  ('thread', 'Thread lift', 'ร้อยไหม',
   'Dissolving threads placed under the skin to lift the cheeks, jowls and brows.',
   'ใส่ไหมละลายใต้ผิวเพื่อยกแก้ม เหนียง และคิ้ว', ['Definisse thread 23 cm', 'Small thread 50', 'Large thread 90']),
  ('spot', 'Spot treatments', 'ฉีดเฉพาะจุด',
   'Injections for inflamed acne and keloid scars, tranexamic acid for melasma, PRP from your own blood, and hyaluronidase to dissolve filler.',
   'ฉีดสิวอักเสบ ฉีดแผลคีลอยด์ ฉีดทรานซามินรักษาฝ้า PRP จากเลือดของตัวเอง และไฮยาลูโรนิเดสสำหรับสลายฟิลเลอร์',
   ['Acne injection', 'Keloid injection', 'PPD (Transamin)', 'PRP', 'Hyaluronidase']),
 ]),
 ('lift', 'Lifting', 'ยกกระชับ',
  'Machines that tighten and lift the face and body without cuts. Most sessions take under an hour and you go back to work the same day.',
  'เครื่องยกกระชับหน้าและผิวกายโดยไม่ต้องผ่าตัด ส่วนใหญ่ใช้เวลาไม่ถึงชั่วโมง ทำเสร็จกลับไปทำงานได้ทันที', [
  ('hifu', 'Ultrasound lifting', 'ยกกระชับด้วยอัลตร้าซาวด์',
   'Focused ultrasound heats the deep layer that a facelift tightens. Different heads reach a different depth for each area.',
   'คลื่นอัลตร้าซาวด์โฟกัสลงชั้นลึกชั้นเดียวกับที่ดึงในการผ่าตัดดึงหน้า หัวแต่ละขนาดเลือกความลึกตามตำแหน่ง',
   ['Ulthera 1.5', 'MPT 2.0', 'Linear Z 3', 'Sofwave']),
  ('rf', 'Radiofrequency', 'คลื่นวิทยุ (RF)',
   'Heats the skin evenly so it tightens over the following months. Tips for the face, the eyes and the body.',
   'ความร้อนจากคลื่นวิทยุกระจายทั่วผิว ผิวจะค่อย ๆ กระชับขึ้นในเดือนถัดไป มีหัวสำหรับหน้า รอบดวงตา และผิวกาย',
   ['Thermage FLX 600', 'Thermage CPT 900', 'Oligio', 'Oligio X', 'Volnewmer face 3', 'XTherma face']),
  ('emface', 'EMFACE', 'EMFACE',
   'Radiofrequency plus muscle stimulation through pads, with no needles. For the cheeks, forehead, eyes and neck.',
   'คลื่นวิทยุร่วมกับการกระตุ้นกล้ามเนื้อผ่านแผ่นแปะ ไม่ใช้เข็ม ทำได้ที่แก้ม หน้าผาก รอบดวงตา และลำคอ',
   ['EMFACE cheek', 'EMFACE forehead', 'EMFACE eye', 'EMFACE neck']),
  ('laserlift', 'Laser lifting', 'ยกกระชับด้วยเลเซอร์',
   'Laser energy from inside the mouth and on the skin to firm the face.',
   'เลเซอร์ทั้งจากในช่องปากและบนผิวหน้าเพื่อให้หน้ากระชับ', ['Fotona 4D', 'Titanium Lift']),
 ]),
 ('laser', 'Laser and skin', 'เลเซอร์และผิว',
  'Lasers, peels and programs for spots, acne, scars, pores and dull skin. Your doctor picks the device after looking at your skin.',
  'เลเซอร์ ทรีตเมนต์ผลัดผิว และโปรแกรมดูแลผิว สำหรับฝ้า กระ สิว แผลเป็น รูขุมขน และผิวหมองคล้ำ แพทย์จะเลือกเครื่องหลังตรวจผิวก่อน', [
  ('pico', 'Pico laser', 'พิโคเลเซอร์',
   'Very short laser pulses break up pigment. Toning for the face and the body.',
   'เลเซอร์พัลส์สั้นมาก สลายเม็ดสี ทำโทนนิ่งได้ทั้งหน้าและผิวกาย',
   ['Pico toning face (Dr)', 'Pico toning body (Dr)', 'Pico all modes (Dr)']),
  ('pigment', 'Spots and redness', 'ฝ้า กระ และรอยแดง',
   'Lasers for dark spots, melasma, redness and small veins, plus lightening for the lips and nipples.',
   'เลเซอร์สำหรับจุดด่างดำ ฝ้า รอยแดง และเส้นเลือดฝอย รวมถึงเลเซอร์ปากชมพูและหัวนมชมพู',
   ['Q-switched Nd:YAG laser', 'Fotona vessel', 'Laser lip lightening', 'Laser nipple lightening', 'Chemical peel (AHA)']),
  ('acne', 'Acne and scars', 'สิวและหลุมสิว',
   'Acne lasers that work on the oil glands, and resurfacing, microneedling and subcision for scars.',
   'เลเซอร์รักษาสิวที่ต่อมไขมัน และการผลัดผิว ไมโครนีดเดิล และการเลาะพังผืดสำหรับหลุมสิว',
   ['AviClear', 'AccuRe', 'Acne extraction', 'CO2 laser', 'Erbium:YAG laser', 'Laser coring / UltraClear', 'Sylfirm X 49',
    'SkinPen', 'EnerJet', 'Subcision']),
  ('bright', 'Brightening programs', 'โปรแกรมผิวกระจ่างใส',
   'Set programs for dull skin and the area around the eyes.',
   'โปรแกรมสำหรับผิวหมองคล้ำและผิวรอบดวงตา',
   ['Ultrabright', 'Perfect bright', 'Cryo (polar) bright', 'LED face', 'Plasma laser', 'Eye Refresh', 'Eye Bright & Glow',
    'Eye Smooth & Firm', 'Total Eye']),
 ]),
 ('hair-removal', 'Laser hair removal', 'เลเซอร์กำจัดขน',
  'Booked by the minute, by area. Most areas need a course of sessions a few weeks apart.',
  'คิดตามนาทีและตำแหน่ง ส่วนใหญ่ต้องทำเป็นคอร์ส ห่างกันครั้งละไม่กี่สัปดาห์', [
  ('areas', 'Areas', 'ตำแหน่ง', '', '',
   ['Whole face', 'Upper lip', 'Chin', 'Neck', 'Underarm', 'Lower or upper arm', 'Full arm', 'Hands or feet', 'Chest',
    'Abdomen', 'Upper or lower back', 'Full back', 'Bikini line', 'Brazilian', 'Lower or upper legs', 'Lower legs with feet',
    'Full legs', 'Full legs with feet']),
 ]),
 ('body', 'Body contouring', 'กระชับสัดส่วน',
  'Fat reduction, muscle building and skin tightening for the body, with no surgery.',
  'ลดไขมัน เสริมกล้ามเนื้อ และกระชับผิวกาย โดยไม่ต้องผ่าตัด', [
  ('cool', 'Fat freezing', 'สลายไขมันด้วยความเย็น',
   'Cools a pinch of fat so the body clears it over the next two to three months.',
   'ใช้ความเย็นกับไขมันส่วนที่ต้องการ ร่างกายจะค่อย ๆ กำจัดออกภายใน 2–3 เดือน',
   ['Cool Elite', 'Cool Advantage', 'Cool Advantage Plus', 'CoolSmooth Pro']),
  ('muscle', 'Muscle building', 'เสริมกล้ามเนื้อ',
   'Magnetic pulses contract the muscle thousands of times in one session. Neo also heats the fat on top.',
   'คลื่นแม่เหล็กทำให้กล้ามเนื้อหดตัวหลายพันครั้งในครั้งเดียว รุ่น Neo ใช้ความร้อนกับไขมันด้านบนด้วย',
   ['Emsculpt', 'Emsculpt Neo large', 'Emsculpt Neo small', 'Emsculpt Neo edge', 'EMtone']),
  ('bodyrf', 'Body tightening and cellulite', 'กระชับผิวกายและเซลลูไลท์',
   'Radiofrequency and shock wave devices for loose skin and cellulite.',
   'เครื่องคลื่นวิทยุและคลื่นกระแทกสำหรับผิวหย่อนคล้อยและเซลลูไลท์',
   ['truSculpt', 'Evolve X', 'Thermage Body 500', 'Volnewmer body 16', 'XTherma body', 'X Wave', 'Z Lipo']),
  ('sweat', 'Underarm sweat', 'เหงื่อใต้วงแขน',
   'Microwave energy that reduces underarm sweat glands.',
   'คลื่นไมโครเวฟลดต่อมเหงื่อใต้วงแขน', ['miraDry']),
 ]),
 ('hair', 'Hair', 'ผม',
  'Treatments for thinning hair, given at the scalp.',
  'ทรีตเมนต์สำหรับผมบาง ทำที่หนังศีรษะ', [
  ('scalp', 'Hair loss treatments', 'รักษาผมร่วง',
   'Light therapy, PRP from your own blood, vitamins and microneedling for the scalp.',
   'แสงบำบัด PRP จากเลือดของตัวเอง วิตามินบำรุงผม และไมโครนีดเดิลที่หนังศีรษะ',
   ['LED hair', 'PRP', 'Hair vitamin', 'SkinPen hair']),
 ]),
 ('wellness', 'Wellness', 'เวลเนส',
  'Drips, oxygen and checks for energy, skin and recovery. A doctor reviews your health before a drip.',
  'วิตามินทางหลอดเลือด ออกซิเจน และการตรวจสุขภาพ เพื่อพลังงาน ผิว และการฟื้นตัว แพทย์จะประเมินสุขภาพก่อนให้วิตามินทุกครั้ง', [
  ('drip', 'Vitamin drips', 'วิตามินทางหลอดเลือด',
   'Set drip formulas, given in the clinic.',
   'สูตรวิตามินที่ให้ทางหลอดเลือดที่คลินิก',
   ["Celebrity's Secret", 'Shining Star', 'Rejuvenation Cocktail', 'Skin Brightening Cocktail', 'Speed White', 'Super C',
    'NAC B+', 'NAD+', 'Super Energy Charger', 'Revital Hair & Nail']),
  ('recover', 'Recovery and care', 'ฟื้นฟูร่างกาย',
   'Oxygen, heat and needling therapy for recovery, a snoring laser, and a body composition scan.',
   'ออกซิเจนแรงดันสูง ความร้อนบำบัด และการฝังเข็ม เพื่อการฟื้นตัว เลเซอร์ลดการนอนกรน และเครื่องวัดองค์ประกอบร่างกาย',
   ['Hyperbaric oxygen', 'INDIBA', 'Dry needling', 'PRP joint', 'Snorlase', 'InBody']),
 ]),
 ('weight', 'Weight management', 'ควบคุมน้ำหนัก',
  'A doctor-led plan with prescription weight-loss injections where they suit you, and regular check-ups.',
  'แผนควบคุมน้ำหนักโดยแพทย์ ใช้ยาฉีดลดน้ำหนักตามใบสั่งแพทย์เมื่อเหมาะกับคุณ พร้อมนัดติดตามผลสม่ำเสมอ', []),
 ('intimate', 'Intimate health', 'สุขภาพสตรี/บุรุษ',
  'Private treatments for women and men, done by a doctor in a closed room.',
  'การรักษาเฉพาะทางสำหรับผู้หญิงและผู้ชาย แพทย์เป็นผู้ทำในห้องปิดมิดชิด', [
  ('pelvic', 'Pelvic floor', 'กล้ามเนื้ออุ้งเชิงกราน',
   'You sit fully clothed on a chair that strengthens the pelvic floor muscles.',
   'นั่งบนเก้าอี้โดยไม่ต้องถอดเสื้อผ้า เครื่องจะช่วยเสริมความแข็งแรงของกล้ามเนื้ออุ้งเชิงกราน', ['Emsella', 'Starformer']),
  ('women', 'For women', 'สำหรับผู้หญิง',
   'Radiofrequency tightening, filler and PRP.',
   'กระชับด้วยคลื่นวิทยุ ฟิลเลอร์ และ PRP', ['Viveve', 'Vfiller', 'O-Shot']),
  ('men', 'For men', 'สำหรับผู้ชาย',
   'Shock wave therapy and PRP.',
   'คลื่นกระแทกบำบัดและ PRP', ['ED shock wave', 'P-Shot']),
 ]),
]

# names shown on the page when the sheet's SKU name reads badly outside the clinic
SHOW = {'Ulthera 1.5': 'Ulthera', 'MPT 2.0': 'Ultraformer MPT', 'Linear Z 3': 'Linear Z', 'Thermage FLX 600': 'Thermage FLX',
        'Thermage CPT 900': 'Thermage CPT', 'Volnewmer face 3': 'Volnewmer', 'XTherma face': 'XTherma',
        'Thermage Body 500': 'Thermage body', 'Volnewmer body 16': 'Volnewmer body', 'Sylfirm X 49': 'Sylfirm X',
        'Pico toning face (Dr)': 'Toning, face', 'Pico toning body (Dr)': 'Toning, body', 'Pico all modes (Dr)': 'All modes',
        'Teosyal Redensity 1 (1 mL)': 'Teosyal Redensity 1', 'EMFACE cheek': 'Cheeks', 'EMFACE forehead': 'Forehead',
        'EMFACE eye': 'Eyes', 'EMFACE neck': 'Neck', 'Cool Elite': 'CoolSculpting Elite', 'Cool Advantage': 'CoolAdvantage',
        'Cool Advantage Plus': 'CoolAdvantage Plus', 'CoolSmooth Pro': 'CoolSmooth PRO', 'Emsculpt Neo large': 'Emsculpt NEO',
        'Emsculpt Neo small': 'Emsculpt NEO small', 'Emsculpt Neo edge': 'Emsculpt NEO Edge', 'Definisse thread 23 cm': 'Definisse',
        'Small thread 50': 'Fine threads', 'Large thread 90': 'Lifting threads', 'PPD (Transamin)': 'Tranexamic acid',
        'Acne injection': 'Acne', 'Keloid injection': 'Keloid', 'Hair vitamin': 'Hair vitamins'}
TH_SHOW = {'Toning, face': 'โทนนิ่งหน้า', 'Toning, body': 'โทนนิ่งผิวกาย', 'All modes': 'ทุกโหมด', 'Cheeks': 'แก้ม', 'Forehead': 'หน้าผาก',
           'Eyes': 'รอบดวงตา', 'Neck': 'ลำคอ', 'Fine threads': 'ไหมเส้นเล็ก', 'Lifting threads': 'ไหมยก', 'Tranexamic acid': 'ทรานซามิน',
           'Acne': 'สิวอักเสบ', 'Keloid': 'คีลอยด์', 'Hair vitamins': 'วิตามินบำรุงผม', 'Lab tests': 'ตรวจเลือด',
           'Hyperbaric oxygen': 'ออกซิเจนแรงดันสูง', 'Dry needling': 'ฝังเข็ม (Dry needling)', 'LED hair': 'แสง LED หนังศีรษะ',
           'LED face': 'LED หน้า', 'Acne extraction': 'กดสิว', 'Subcision': 'เลาะพังผืด (Subcision)',
           'Chemical peel (AHA)': 'ผลัดผิว AHA', 'Laser lip lightening': 'เลเซอร์ปากชมพู', 'Laser nipple lightening': 'เลเซอร์หัวนมชมพู',
           'CO2 laser': 'เลเซอร์ CO2', 'Plasma laser': 'พลาสมา', 'PRP joint': 'PRP ข้อ',
           'ED shock wave': 'คลื่นกระแทก ED', 'Thermage body': 'Thermage ผิวกาย', 'Volnewmer body': 'Volnewmer ผิวกาย',
           'XTherma body': 'XTherma ผิวกาย', 'Whole face': 'ทั้งหน้า', 'Upper lip': 'เหนือริมฝีปาก', 'Chin': 'คาง', 
           'Underarm': 'รักแร้', 'Lower or upper arm': 'แขนท่อนบนหรือล่าง', 'Full arm': 'แขนทั้งแขน', 'Hands or feet': 'มือหรือเท้า',
           'Chest': 'หน้าอก', 'Abdomen': 'หน้าท้อง', 'Upper or lower back': 'หลังส่วนบนหรือล่าง', 'Full back': 'หลังทั้งหมด',
           'Bikini line': 'ขอบบิกินี่', 'Brazilian': 'บราซิลเลียน', 'Lower or upper legs': 'ขาท่อนบนหรือล่าง',
           'Lower legs with feet': 'ขาท่อนล่างรวมเท้า', 'Full legs': 'ขาทั้งขา', 'Full legs with feet': 'ขาทั้งขารวมเท้า'}
PAGE = {
 'en': {'title': 'Non-surgical treatments | Apex Surgery Hospital',
        'desc': 'Fillers, skin boosters, threads, Ulthera, Thermage, EMFACE, lasers, body contouring, hair, wellness and intimate health at Apex, with the devices and products we use.',
        'h': 'Non-surgical treatments',
        'lead': 'Everything Apex does without surgery, grouped by what it is for, with the devices and products we use. Book a consultation and your doctor will tell you which one suits you.',
        'from': 'From the Apex treatment list, October 2026.'},
 'th': {'title': 'ทรีตเมนต์ไม่ผ่าตัด | Apex Surgery Hospital',
        'desc': 'ฟิลเลอร์ สกินบูสเตอร์ ร้อยไหม Ulthera Thermage EMFACE เลเซอร์ กระชับสัดส่วน ผม เวลเนส และสุขภาพสตรี/บุรุษ ที่ Apex พร้อมรายชื่อเครื่องและผลิตภัณฑ์ที่ใช้',
        'h': 'ทรีตเมนต์ไม่ผ่าตัด',
        'lead': 'ทุกอย่างที่ Apex ทำโดยไม่ต้องผ่าตัด จัดกลุ่มตามจุดประสงค์ พร้อมรายชื่อเครื่องและผลิตภัณฑ์ที่ใช้ นัดปรึกษาแล้วแพทย์จะแนะนำว่าแบบไหนเหมาะกับคุณ',
        'from': 'จากรายการทรีตเมนต์ของ Apex ตุลาคม 2569'},
}


def main():
    known = {i['name'] for i in json.load(open(os.path.join(HERE, 'procedures.json'), encoding='utf-8'))['items']}
    for lang in ('en', 'th'):
        groups = []
        for gk, gen, gth, pen, pth, cards in G:
            out = []
            for c in cards:
                k, nen, nth, len_, lth, items = c[:6]
                miss = [x for x in items if x not in known]
                assert not miss, miss
                names = [SHOW.get(x, x) for x in items]
                if lang == 'th':
                    names = [TH_SHOW.get(x, x) for x in names]
                card = {'k': k, 'n': nen if lang == 'en' else nth, 'p': len_ if lang == 'en' else lth, 'items': names}
                if len(c) > 6:
                    card['link'] = c[6]
                out.append(card)
            groups.append({'k': gk, 'h': gen if lang == 'en' else gth, 'p': pen if lang == 'en' else pth, 'cards': out})
        data = dict(PAGE[lang], groups=groups)
        p = os.path.join(ROOT, 'site', 'assets', 'data', lang, 'treatments.js')
        with open(p, 'w', encoding='utf-8') as f:
            f.write('window.APEX=window.APEX||{};APEX._d=APEX._d||{};APEX._d["treatments"]=' + json.dumps(data, ensure_ascii=False) + ';')
        print(p, sum(len(c['items']) for g in groups for c in g['cards']), 'names')


if __name__ == '__main__':
    main()
