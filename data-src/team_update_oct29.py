"""29 Oct 2026 team update: Dr. Narupon and Dr. Natthaphong redone from their new profile pages on
apexmedicalcenter.co.th (doctor/dr-narupon-rojanapithayakorn/ and doctor/dr-nattaphong-loktharmmarak/), which replace
the posters the first entries came from. The pages add license numbers, nicknames and Apex's official photos, and
change the training, specialties and work history. Dr. Natthaphong's English name follows the spelling in Apex's
page address. His quote comes from the earlier poster, since the page has none.
Run from the repo root: python3 data-src/team_update_oct29.py"""
import json
B = 'site/assets/data/'
UP = 'https://www.apexmedicalcenter.co.th/wp-content/uploads/2026/10/'
NARUPON_PHOTO = UP + '%E0%B8%99%E0%B8%9E.%E0%B8%99%E0%B8%A4%E0%B8%9E%E0%B8%99%E0%B8%98%E0%B9%8C-%E0%B9%82%E0%B8%A3%E0%B8%88%E0%B8%99%E0%B8%9E%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%81%E0%B8%A3-731x1024.webp'
NATTHAPHONG_PHOTO = UP + '%E0%B8%99%E0%B8%9E.%E0%B8%93%E0%B8%B1%E0%B8%90%E0%B8%9E%E0%B8%87%E0%B8%A8%E0%B9%8C-%E0%B9%82%E0%B8%A5%E0%B8%81%E0%B8%98%E0%B8%A3%E0%B8%A3%E0%B8%A1%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B9%8C-731x1024.webp'

DOCS = {
 'narupon': {
  'en': {'photo': NARUPON_PHOTO, 'name': 'Dr. Narupon Rojanapithayakorn', 'nameAlt': 'นพ.นฤพนธ์ โรจนพิทยากร', 'nick': 'Dr. Kop',
         'license': 'License no. 29974', 'role': 'Plastic and reconstructive surgeon',
         'focus': ['Rhinoplasty', 'Aesthetic breast surgery', 'Body contouring', 'Facial rejuvenation', 'Eyelid surgery'],
         'edu': ['1997 to 2003: Doctor of Medicine, Faculty of Medicine Siriraj Hospital, Mahidol University',
                 '2006 to 2011: Diploma of the Thai Board of Plastic and Reconstructive Surgery, Siriraj Hospital'],
         'train': ['2010: Reconstructive microsurgery, University of Tokyo Hospital, Japan',
                   '2011: Visiting scholar in breast reconstruction and microsurgery, MD Anderson Cancer Center, Texas, USA',
                   '2011: Aesthetic Asia, Singapore',
                   "2012: Seoul Rhinoplasty Forum, St. Mary's Hospital, Seoul, South Korea",
                   '2012: Mentor Training Institute, surgery with anatomic breast implants, Guangzhou, China',
                   '2013: Beauty through Science, Stockholm, Sweden',
                   '2014: European Rhinoplasty Summit, Munich, Germany',
                   '2016: 23rd ISAPS Congress, Kyoto, Japan',
                   '2019: Aesthetic Plastic Surgery (APS) Meeting, Seoul, South Korea'],
         'skills': ['Plastic and reconstructive surgery', 'Rhinoplasty', 'Aesthetic breast surgery', 'Body contouring',
                    'Facial rejuvenation', 'Eyelid surgery'],
         'work': ['2011 to 2016: Vachira Phuket Hospital, Phuket', '2016 to now: Bangkok Hospital, Bangkok',
                  '2011 to now: Phuket International Hospital, Phuket'],
         'member': ['Medical Council of Thailand', 'Society of Plastic and Reconstructive Surgeons of Thailand',
                    'International Society of Aesthetic Plastic Surgery (ISAPS)', 'Oriental Society of Aesthetic Plastic Surgeons (OSAPS)']},
  'th': {'photo': NARUPON_PHOTO, 'name': 'นพ.นฤพนธ์ โรจนพิทยากร', 'nameAlt': 'Dr. Narupon Rojanapithayakorn', 'nick': 'หมอกบ',
         'license': 'เลขที่ใบอนุญาต 29974', 'role': 'ศัลยแพทย์ตกแต่งและเสริมสร้าง',
         'focus': ['ศัลยกรรมเสริมจมูก', 'ศัลยกรรมเสริมความงามเต้านม', 'ศัลยกรรมปรับรูปร่างและสัดส่วน', 'ศัลยกรรมฟื้นฟูความอ่อนเยาว์ของใบหน้า', 'ศัลยกรรมเปลือกตา'],
         'edu': ['พ.ศ. 2540–2546: แพทยศาสตรบัณฑิต คณะแพทยศาสตร์ศิริราชพยาบาล มหาวิทยาลัยมหิดล',
                 'พ.ศ. 2549–2554: วุฒิบัตรสาขาศัลยศาสตร์ตกแต่งและเสริมสร้าง โรงพยาบาลศิริราช'],
         'train': ['พ.ศ. 2553: Reconstructive Microsurgery, University of Tokyo Hospital ประเทศญี่ปุ่น',
                   'พ.ศ. 2554: Visiting Scholar ด้านการผ่าตัดเสริมสร้างเต้านมและจุลศัลยกรรม MD Anderson Cancer Center รัฐเท็กซัส สหรัฐอเมริกา',
                   'พ.ศ. 2554: Aesthetic Asia ประเทศสิงคโปร์',
                   'พ.ศ. 2555: Seoul Rhinoplasty Forum, St. Mary’s Hospital กรุงโซล ประเทศเกาหลีใต้',
                   'พ.ศ. 2555: Mentor Training Institute Surgery with Anatomic Breast Implant เมืองกว่างโจว ประเทศจีน',
                   'พ.ศ. 2556: Beauty through Science กรุงสตอกโฮล์ม ประเทศสวีเดน',
                   'พ.ศ. 2557: European Rhinoplasty Summit เมืองมิวนิก ประเทศเยอรมนี',
                   'พ.ศ. 2559: การประชุม International Society of Aesthetic Plastic Surgery (ISAPS) ครั้งที่ 23 เมืองเกียวโต ประเทศญี่ปุ่น',
                   'พ.ศ. 2562: Aesthetic Plastic Surgery (APS) Meeting กรุงโซล ประเทศเกาหลีใต้'],
         'skills': ['ศัลยกรรมตกแต่งและเสริมสร้าง (Plastic and Reconstructive Surgery)', 'ศัลยกรรมเสริมจมูก (Rhinoplasty)',
                    'ศัลยกรรมเสริมความงามเต้านม (Aesthetic Breast Surgery)', 'ศัลยกรรมปรับรูปร่างและสัดส่วน (Body Contouring)',
                    'ศัลยกรรมฟื้นฟูความอ่อนเยาว์ของใบหน้า (Facial Rejuvenation)', 'ศัลยกรรมเปลือกตา (Eyelid Surgery)'],
         'work': ['พ.ศ. 2554–2559: โรงพยาบาลวชิระภูเก็ต จังหวัดภูเก็ต', 'พ.ศ. 2559–ปัจจุบัน: โรงพยาบาลกรุงเทพ กรุงเทพมหานคร',
                  'พ.ศ. 2554–ปัจจุบัน: โรงพยาบาลภูเก็ตอินเตอร์เนชั่นแนล จังหวัดภูเก็ต'],
         'member': ['แพทยสภา', 'สมาคมศัลยแพทย์ตกแต่งแห่งประเทศไทย',
                    'International Society of Aesthetic Plastic Surgery (ISAPS)', 'Oriental Society of Aesthetic Plastic Surgeons (OSAPS)']}},
 'natthaphong': {
  'en': {'photo': NATTHAPHONG_PHOTO, 'name': 'Dr. Nattaphong Loktharmmarak', 'nameAlt': 'นพ.ณัฐพงศ์ โลกธรรมรักษ์', 'nick': 'Dr. Khiang',
         'license': 'License no. 44509', 'role': 'Plastic surgeon, Apex Surgery Hospital Phuket',
         'focus': ['Facelift', 'Breast augmentation', 'Open rhinoplasty', 'Body contouring', 'Liposuction and fat grafting'],
         'edu': ['Doctor of Medicine, Faculty of Medicine, Prince of Songkla University',
                 'Diploma of the Thai Board of General Surgery, Faculty of Medicine, Prince of Songkla University',
                 'Diploma of the Thai Board of Plastic Surgery, Ramathibodi Hospital, Mahidol University'],
         'train': ['2016: Advanced Surgical Skills for Exposure in Trauma',
                   '2017: Reconstructive and Aesthetic Head and Neck Hands-on Cadaveric Workshop',
                   '2018: Hands-on Finger Replantation Microsurgery Workshop',
                   '2019: The Future of Asian Wound Care, Burn Wound Association',
                   '2020: Clinical Observation Program, Department of Plastic and Reconstructive Surgery, Chang Gung Memorial Hospital, Taiwan',
                   '2022: Body-Jet evo Liposuction & Lipotransfer (Breast Filling)',
                   '2023: Cosmetic Dermatology: Tips to Success, Dermatology, Ramathibodi Hospital'],
         'skills': ['Aesthetic and reconstructive surgery', 'Facelift', 'Breast augmentation', 'Open rhinoplasty and nose structure revision',
                    'Skin cancer surgery', 'Body contouring', 'Liposuction and fat grafting', 'Facial and jaw injury surgery'],
         'work': ['Ramathibodi Hospital', 'Bangkok Hospital Phuket', 'Vachira Phuket Hospital',
                  'Now: Plastic surgeon, Apex Surgery Hospital Phuket'],
         'quote': 'Every case matters to me, for a result that looks good, is safe and meets the APEX standard.'},
  'th': {'photo': NATTHAPHONG_PHOTO, 'name': 'นพ.ณัฐพงศ์ โลกธรรมรักษ์', 'nameAlt': 'Dr. Nattaphong Loktharmmarak', 'nick': 'หมอเคี้ยง',
         'license': 'เลขที่ใบอนุญาต 44509', 'role': 'แพทย์เฉพาะทางศัลยกรรมตกแต่ง โรงพยาบาลเฉพาะทางศัลยกรรมเอเพ็กซ์ภูเก็ต',
         'focus': ['ศัลยกรรมยกกระชับใบหน้า', 'ศัลยกรรมเสริมหน้าอก', 'ศัลยกรรมเสริมจมูกแบบเปิดและปรับโครงสร้างจมูก', 'ศัลยกรรมปรับรูปร่าง', 'การดูดไขมันและเติมไขมัน'],
         'edu': ['แพทยศาสตรบัณฑิต คณะแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์',
                 'วุฒิบัตรสาขาศัลยศาสตร์ทั่วไป คณะแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์',
                 'วุฒิบัตรสาขาศัลยศาสตร์ตกแต่ง โรงพยาบาลรามาธิบดี มหาวิทยาลัยมหิดล'],
         'train': ['2016: Advanced Surgical Skills for Exposure in Trauma',
                   '2017: Reconstructive and Aesthetic Head and Neck Hands-on Cadaveric Workshop',
                   '2018: Hands-on Finger Replantation Microsurgery Workshop',
                   '2019: The Future of Asian Wound Care, Burn Wound Association',
                   '2020: Clinical Observation Program, Department of Plastic and Reconstructive Surgery, Chang Gung Memorial Hospital, Taiwan',
                   '2022: Body-Jet evo Liposuction & Lipotransfer (Breast Filling)',
                   '2023: Cosmetic Dermatology: Tips to Success, Dermatology, Ramathibodi Hospital'],
         'skills': ['ศัลยกรรมตกแต่งและเสริมสร้าง (Aesthetic and Reconstructive Surgery)', 'ศัลยกรรมยกกระชับใบหน้า (Facelift Surgery)',
                    'ศัลยกรรมเสริมหน้าอก (Breast Augmentation)', 'ศัลยกรรมเสริมจมูกแบบเปิดและปรับโครงสร้างจมูก (Open Rhinoplasty)',
                    'ศัลยกรรมรักษามะเร็งผิวหนัง (Skin Cancer Surgery)', 'ศัลยกรรมปรับรูปร่าง (Body Contouring Surgery)',
                    'การดูดไขมันและเติมไขมัน (Liposuction and Lipofilling)', 'ศัลยกรรมรักษาการบาดเจ็บบริเวณใบหน้าและขากรรไกร (Maxillofacial Injury Surgery)'],
         'work': ['โรงพยาบาลรามาธิบดี', 'โรงพยาบาลกรุงเทพภูเก็ต', 'โรงพยาบาลวชิระภูเก็ต',
                  'ปัจจุบัน: แพทย์เฉพาะทางศัลยกรรมตกแต่ง โรงพยาบาลเฉพาะทางศัลยกรรมเอเพ็กซ์ภูเก็ต'],
         'quote': 'หมอให้ความสำคัญกับทุกเคส เพื่อผลลัพธ์ที่ดูดี ปลอดภัยและไว้ใจได้ในมาตรฐาน APEX'}},
}

ORDER = ['key', 'photo', 'name', 'nameAlt', 'nick', 'license', 'role', 'focus', 'edu', 'train', 'skills', 'work', 'member', 'talks', 'quote']
for lang in ('en', 'th'):
    p = f'{B}{lang}/team.js'
    s = open(p, encoding='utf-8').read()
    head = s[:s.index('=', s.index('["team"]')) + 1]
    d = json.loads(s[len(head):].rstrip().rstrip(';'))
    for doc in d['docs']:
        new = DOCS.get(doc['key'], {}).get(lang)
        if not new:
            continue
        rec = {'key': doc['key'], **new}
        doc.clear()
        doc.update({k: rec[k] for k in ORDER if k in rec})
    open(p, 'w', encoding='utf-8').write(head + json.dumps(d, ensure_ascii=False) + ';\n')
    print(lang, [x['key'] for x in d['docs']])
