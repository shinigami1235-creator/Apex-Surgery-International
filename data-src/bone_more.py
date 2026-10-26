"""Oct 2026: more on facial bone surgery, with the bite and jaw position first, jaw surgery (OGS) with orthodontics,
the V-line chin and the team from the 'หมอ TDH' doc Gid shared. Facts on jaw surgery follow Mayo Clinic, AAOMS and the
University Hospitals Bristol NHS leaflet (links in SOURCES). Run from the repo root: python3 data-src/bone_more.py"""
import json
B = 'site/assets/data/'
SOURCES = ['https://www.mayoclinic.org/tests-procedures/jaw-surgery/about/pac-20384990',
           'https://www.aaoms.org/procedures/corrective-jaw-surgery',
           'https://www.uhbristol.nhs.uk/media/2997521/orthognathicjawsurgery-1.pdf']
P = lambda x: {'t': 'p', 'x': x}
H3 = lambda x: {'t': 'h3', 'x': x}
L = lambda *xs: {'t': 'list', 'o': 0, 'items': [{'x': x} for x in xs]}

EN = {
 'bite': {'h': 'The bite and jaw position come first', 'blocks': [
   P('The jaws carry the teeth, so where the upper and lower jaws sit decides how the teeth meet. That bite affects chewing, speech, the jaw joints and the shape of the lower face.'),
   P('A face that looks long, set back, pushed forward or tilted is often a jaw position problem rather than a bone shape problem. Trimming the jaw angle or the chin makes the face smaller but leaves the jaws where they were, so the imbalance and the bite stay. Moving the jaws fixes both.'),
   P('So before choosing between contouring and jaw surgery, the doctor checks the bite and the jaw position with photos, X-rays and a dental check. These signs mean the bite needs a look:'),
   L('Front teeth that don\'t meet when you bite (open bite)', 'Lower teeth in front of the upper teeth (underbite)', 'Lips that need effort to close',
     'Teeth wearing down or breaking', 'Pain, clicking or tiredness in the jaw joints', 'The chin or the middle of the teeth sitting off to one side',
     'Trouble biting or chewing some foods'),
   P('When only the teeth are crooked, braces or clear aligners can be enough. When the jaws themselves are out of position, jaw surgery works together with orthodontics.')]},
 'ogs': {'h': 'Jaw surgery (OGS) with braces or Invisalign', 'blocks': [
   P('Jaw surgery, or orthognathic surgery (OGS), moves the upper jaw, the lower jaw or both into a better position, sometimes with a chin move in the same operation. The plastic surgeon, the oral and maxillofacial surgeon and the orthodontist plan it together.'),
   H3('Teeth first'), P('Braces or clear aligners line up the teeth on each jaw so they fit once the jaws move. This usually takes 12 to 18 months. In some cases surgery comes first and the teeth are lined up after.'),
   H3('Planning'), P('Photos, X-rays or a CT scan and a dental scan set how far each jaw moves and where the bite will land.'),
   H3('Surgery'), P('Under general anaesthesia, through cuts inside the mouth. The upper jaw is moved with a Le Fort I cut, the lower jaw with a split of the jaw bone (BSSO), and the bone is held with small plates and screws.'),
   H3('The first weeks'), P('Most people stay in hospital for about 2 nights. Food is liquid at first, then soft, and it can take up to 4 weeks to eat normally. Most swelling settles in 2 to 3 weeks, and many people go back to work in 1 to 3 weeks.'),
   H3('Finishing the bite'), P('The jaws take about 6 weeks for first healing, then braces or aligners finish the bite. Full healing of the bone takes 9 to 12 months, and a retainer keeps the teeth in place after.')]},
 'vline': {'h': 'V-line chin: moving your own chin bone', 'blocks': [
   P('A sliding genioplasty cuts the chin bone inside the mouth and moves it forward, back, up, down or to the middle, then fixes it with a small plate. For a V-line, the sides of the chin are narrowed at the same time so the jawline runs smoothly into a slimmer chin.'),
   P('Small moves change the face a lot. A chin moved forward about 8 mm can balance the nose, lips and neck in profile. Since it uses your own bone, nothing foreign is left in the chin.'),
   L('Short or set-back chin: moved forward or lengthened', 'Long chin: shortened', 'Chin off to one side: moved to the middle',
     'Wide or square chin: narrowed for a V-line', 'Chin that sticks out: moved back')]},
 'team': {'h': 'The team behind bone and bite surgery', 'blocks': [
   P('Facial bone surgery at Apex is planned with surgeons and dentists together, since the face shape and the bite are treated as one.'),
   L('Dr. Somboon Waiphrip: CMO and chief plastic surgeon, International Craniofacial Fellowship at Chang Gung Memorial Hospital, Taiwan',
     'Assoc. Prof. Dr. Naritsaporn Chaiprakit: oral and maxillofacial surgeon, Diplomate of the Thai Board of Oral and Maxillofacial Surgery, Master Series Course in Orthognathic Surgery at Chang Gung Memorial Hospital',
     'Dr. Kongsawate Khaogate: plastic surgeon, visiting fellow in craniofacial and head and neck surgery at Asan Medical Center, Korea',
     'Dr. Orapa Pongsri: plastic surgeon, short-term research fellow at Asan Medical Center, Korea',
     'Dr. Ruangyot Onsa-ard: orthodontist, Team Invisalign Red Diamond Provider, Invisalign and Brava aligners',
     'Dr. Apichaya Thongdee: dentist in prosthodontics and digital smile design')]},
}
TH = {
 'bite': {'h': 'การสบฟันและตำแหน่งขากรรไกรต้องดูก่อน', 'blocks': [
   P('ขากรรไกรเป็นฐานของฟัน ตำแหน่งของขากรรไกรบนและล่างจึงกำหนดว่าฟันสบกันอย่างไร การสบฟันมีผลต่อการเคี้ยว การพูด ข้อต่อขากรรไกร และรูปหน้าช่วงล่าง'),
   P('ใบหน้าที่ดูยาว คางหลุบ คางยื่น หรือเบี้ยว หลายครั้งมาจากตำแหน่งขากรรไกร ไม่ใช่แค่รูปทรงกระดูก การตัดกรามหรือตกแต่งคางทำให้หน้าเล็กลง แต่ขากรรไกรยังอยู่ที่เดิม ความไม่สมดุลและการสบฟันจึงยังไม่หาย การเลื่อนขากรรไกรแก้ได้ทั้งสองอย่าง'),
   P('ก่อนเลือกระหว่างการตกแต่งกระดูกกับการผ่าตัดขากรรไกร แพทย์จะตรวจการสบฟันและตำแหน่งขากรรไกรด้วยรูปถ่าย เอกซเรย์ และการตรวจฟัน ถ้ามีอาการเหล่านี้ ควรตรวจการสบฟัน'),
   L('ฟันหน้าไม่สบกันเวลากัด (ฟันสบเปิด)', 'ฟันล่างอยู่หน้าฟันบน (คางยื่น ฟันล่างคร่อม)', 'ต้องเกร็งปากจึงจะปิดปากได้', 'ฟันสึกหรือแตกง่าย',
     'ปวด มีเสียง หรือเมื่อยข้อต่อขากรรไกร', 'คางหรือแนวกลางฟันเบี้ยวไปข้างใดข้างหนึ่ง', 'กัดหรือเคี้ยวอาหารบางอย่างไม่ได้'),
   P('ถ้าฟันเกอย่างเดียว การจัดฟันหรือจัดฟันใสอาจเพียงพอ ถ้าขากรรไกรอยู่ผิดตำแหน่ง ต้องผ่าตัดขากรรไกรควบคู่กับการจัดฟัน')]},
 'ogs': {'h': 'ผ่าตัดขากรรไกร (OGS) ร่วมกับการจัดฟันหรือ Invisalign', 'blocks': [
   P('การผ่าตัดขากรรไกร หรือ Orthognathic Surgery (OGS) คือการเลื่อนขากรรไกรบน ขากรรไกรล่าง หรือทั้งสองข้าง ไปยังตำแหน่งที่เหมาะสม บางครั้งเลื่อนคางไปพร้อมกันในการผ่าตัดครั้งเดียว ศัลยแพทย์ตกแต่ง ศัลยแพทย์ช่องปากและแม็กซิลโลเฟเชียล และทันตแพทย์จัดฟันวางแผนร่วมกัน'),
   H3('จัดฟันก่อน'), P('จัดฟันหรือจัดฟันใสเพื่อเรียงฟันบนขากรรไกรแต่ละข้างให้พร้อมสบกันหลังเลื่อนขากรรไกร ปกติใช้เวลา 12 ถึง 18 เดือน บางกรณีผ่าตัดก่อนแล้วจึงเรียงฟันภายหลัง'),
   H3('วางแผน'), P('ใช้รูปถ่าย เอกซเรย์หรือซีทีสแกน และสแกนฟัน กำหนดระยะที่ขากรรไกรแต่ละข้างเลื่อนและตำแหน่งการสบฟันใหม่'),
   H3('ผ่าตัด'), P('ดมยาสลบ ผ่าตัดผ่านแผลในช่องปาก เลื่อนขากรรไกรบนด้วยการตัดแบบ Le Fort I และขากรรไกรล่างด้วยการผ่ากระดูกขากรรไกร (BSSO) แล้วยึดด้วยเพลทและสกรูขนาดเล็ก'),
   H3('ช่วงสัปดาห์แรก'), P('ส่วนใหญ่นอนโรงพยาบาลประมาณ 2 คืน เริ่มจากอาหารเหลว แล้วเป็นอาหารอ่อน อาจใช้เวลาถึง 4 สัปดาห์จึงกินได้ตามปกติ อาการบวมส่วนใหญ่ลดลงใน 2 ถึง 3 สัปดาห์ หลายคนกลับไปทำงานได้ใน 1 ถึง 3 สัปดาห์'),
   H3('ปรับการสบฟันให้เสร็จ'), P('ขากรรไกรติดเบื้องต้นในประมาณ 6 สัปดาห์ จากนั้นจัดฟันต่อเพื่อปรับการสบฟันให้เสร็จ กระดูกติดสมบูรณ์ใน 9 ถึง 12 เดือน และใส่รีเทนเนอร์เพื่อคงตำแหน่งฟัน')]},
 'vline': {'h': 'คาง V-Line ด้วยการเลื่อนกระดูกคางของตัวเอง', 'blocks': [
   P('การเลื่อนกระดูกคาง (Sliding Genioplasty) คือการตัดกระดูกคางผ่านแผลในช่องปาก แล้วเลื่อนไปข้างหน้า ถอยหลัง ขึ้น ลง หรือเลื่อนเข้ากลาง แล้วยึดด้วยเพลทขนาดเล็ก ถ้าทำ V-Line จะเหลาด้านข้างของคางไปพร้อมกัน ให้กรอบหน้าลาดลงมาที่คางเรียวอย่างต่อเนื่อง'),
   P('เลื่อนเพียงเล็กน้อยก็เปลี่ยนใบหน้าได้มาก การเลื่อนคางมาข้างหน้าประมาณ 8 มม. ช่วยให้จมูก ริมฝีปาก และลำคอสมดุลขึ้นเมื่อมองด้านข้าง เพราะใช้กระดูกของตัวเอง จึงไม่มีวัสดุแปลกปลอมค้างอยู่ในคาง'),
   L('คางสั้นหรือคางหลุบ: เลื่อนไปข้างหน้าหรือเพิ่มความยาว', 'คางยาว: ลดความยาว', 'คางเบี้ยว: เลื่อนเข้ากลาง', 'คางกว้างหรือเหลี่ยม: เหลาให้เป็น V-Line', 'คางยื่น: เลื่อนถอยหลัง')]},
 'team': {'h': 'ทีมผ่าตัดกระดูกใบหน้าและการสบฟัน', 'blocks': [
   P('การผ่าตัดกระดูกใบหน้าที่ Apex วางแผนร่วมกันระหว่างศัลยแพทย์และทันตแพทย์ เพราะรูปหน้าและการสบฟันต้องแก้ไปพร้อมกัน'),
   L('นพ.สมบูรณ์ ไหวพริบ: ประธานเจ้าหน้าที่ฝ่ายแพทย์และหัวหน้าศัลยแพทย์ตกแต่ง International Craniofacial Fellowship โรงพยาบาลชางกุง ไต้หวัน',
     'รศ.ทพญ.ณฤษพร ชัยประกิจ: ศัลยแพทย์ช่องปากและแม็กซิลโลเฟเชียล วุฒิบัตรผู้เชี่ยวชาญ ทันตแพทยสภา และ Master Series Course in Orthognathic Surgery โรงพยาบาลชางกุง',
     'นพ.ก้องเศวต ขาวเกตุ: ศัลยแพทย์ตกแต่ง แพทย์เยี่ยมเยียนสาขาศัลยกรรมตกแต่งกะโหลกศีรษะและใบหน้า ศูนย์การแพทย์อาซัน เกาหลีใต้',
     'พญ.อรภา พงษ์ศรี: ศัลยแพทย์ตกแต่ง ทุนวิจัยระยะสั้น ศูนย์การแพทย์อาซัน เกาหลีใต้',
     'ทพ.เรืองยศ อ่อนสอาด: ทันตแพทย์จัดฟัน Team Invisalign Red Diamond Provider จัดฟันใส Invisalign และ Brava',
     'ทพญ.อภิชญา ทองดี: ทันตแพทย์ทันตกรรมประดิษฐ์และการออกแบบรอยยิ้มดิจิทัล')]},
}
FAQ = {
 'en': [{'q': 'Can braces or Invisalign fix my jaw without surgery?', 'a': ['When only the teeth are out of line, yes. When the jaws themselves are out of position, orthodontics can move the teeth but not the jaws, so jaw surgery and orthodontics work together.']},
        {'q': 'Will my lip and chin feel numb after jaw surgery?', 'a': ['Numbness of the lower lip and chin is common after lower jaw surgery. It usually improves over several months, but in some people it doesn\'t fully recover. The doctor explains the risk for your plan.']},
        {'q': 'How long does the whole OGS process take?', 'a': ['Usually 12 to 18 months of braces or aligners before surgery, about 6 weeks of first healing after, then several more months of orthodontics to finish the bite. Full healing of the bone takes 9 to 12 months.']}],
 'th': [{'q': 'จัดฟันหรือ Invisalign แก้ขากรรไกรได้โดยไม่ต้องผ่าตัดไหม', 'a': ['ถ้าฟันเกอย่างเดียว ทำได้ ถ้าขากรรไกรอยู่ผิดตำแหน่ง การจัดฟันขยับได้แค่ฟัน ขยับขากรรไกรไม่ได้ จึงต้องผ่าตัดขากรรไกรร่วมกับการจัดฟัน']},
        {'q': 'หลังผ่าตัดขากรรไกร ริมฝีปากและคางจะชาไหม', 'a': ['อาการชาที่ริมฝีปากล่างและคางพบได้บ่อยหลังผ่าตัดขากรรไกรล่าง ส่วนใหญ่ดีขึ้นภายในหลายเดือน แต่บางคนอาจไม่กลับมาเหมือนเดิมทั้งหมด แพทย์จะอธิบายความเสี่ยงตามแผนการรักษาของคุณ']},
        {'q': 'ผ่าตัดขากรรไกร (OGS) ใช้เวลาทั้งหมดนานแค่ไหน', 'a': ['ปกติจัดฟันก่อนผ่าตัด 12 ถึง 18 เดือน หลังผ่าตัดกระดูกติดเบื้องต้นประมาณ 6 สัปดาห์ แล้วจัดฟันต่ออีกหลายเดือนเพื่อปรับการสบฟัน กระดูกติดสมบูรณ์ใน 9 ถึง 12 เดือน']}],
}
RISK = {'en': 'Numbness of the lower lip and chin after lower jaw surgery, which usually improves over months', 'th': 'อาการชาที่ริมฝีปากล่างและคางหลังผ่าตัดขากรรไกรล่าง ซึ่งส่วนใหญ่ดีขึ้นภายในหลายเดือน'}

for lang, X in (('en', EN), ('th', TH)):
    p = B + lang + '/svc/bone.js'; s = open(p, encoding='utf-8').read()
    i = s.index('=', s.index('_d[')); d = json.loads(s[i + 1:].rstrip().rstrip(';'))
    secs = [x for x in d['sections'] if x['h'] not in [v['h'] for v in X.values()]]
    # who it suits, the bite, types, V-line chin, OGS, steps, team, risks
    order = [secs[0], X['bite'], secs[1], X['vline'], X['ogs'], secs[2], X['team'], secs[3]]
    risks = order[-1]['blocks'][1]['items']
    if not any(r['x'] == RISK[lang] for r in risks): risks.insert(2, {'x': RISK[lang]})
    d['sections'] = order
    have = {f['q'] for f in d['faqs']}
    d['faqs'] = d['faqs'][:3] + [f for f in FAQ[lang] if f['q'] not in have] + d['faqs'][3:]
    d['sources'] = SOURCES
    open(p, 'w', encoding='utf-8').write(s[:i + 1] + json.dumps(d, ensure_ascii=False) + ';')
    print(lang, [x['h'] for x in d['sections']], len(d['faqs']))
