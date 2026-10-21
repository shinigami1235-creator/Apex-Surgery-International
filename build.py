#!/usr/bin/env python3
"""Generate every page of the Apex Surgery preview twice: Thai at site/<page>.html and English at site/en/<page>.html.

Each page is a thin HTML shell (head, SEO tags, JSON-LD, scripts). The content renders from data/<lang>/*.js,
whose fields map one to one onto the WordPress custom fields the theme will use later.
Run: python3 build.py
"""
PREVIEW = True
import json, os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, 'site')
PROD = 'https://www.apexsurgeryhospital.com/'

# page file -> (data-page key, extra data files, production path, title key or data id, i18n fallback keys)
PAGES = [
    ('index.html',      'home',       ['home', 'about'],        '',               'home'),
    ('about.html',      'about',      ['about'],                'about-us/',      'about'),
    ('services.html',   'services',   ['services'],             'surgery/',       'services'),
    ('service.html',    'service',    [],                       'surgery/',       None),
    ('doctor.html',     'doctor',     [],                       'doctor/',        None),
    ('promotions.html', 'promotions', ['promotions'],           'promotions/',    'promotions'),
    ('reviews.html',    'reviews',    ['reviews', 'posts', 'home'], 'reviews/',   'reviews'),
    ('blog.html',       'blog',       ['blogs', 'posts'],       'blogs/',         'blogs'),
    ('article.html',    'article',    ['posts'],                'blogs/',         None),
    ('contact.html',    'contact',    ['contact'],              'contact-us/',    'contact'),
    ('nose.html',       'nose',       [],                       'nose-preview/',  None),
    ('play.html',       'play',       [],                       'play/',          None),
    ('plan.html',       'plan',       [],                       'my-plan/',       None),
    ('trip.html',       'trip',       [],                       'trip-planner/',  None),
    ('consult.html',    'consult',    [],                       'consultation/',  None),
    ('404.html',        'notfound',   [],                       '404/',           None),
]

# titles and descriptions for pages without their own data file
META = {
    'en': {
        'service': ('Procedures | Apex Surgery Hospital', 'Facelift, brow lift, rhinoplasty, double eyelid surgery, breast augmentation and liposuction at Apex Surgery Hospital in Bangkok and Phuket.'),
        'doctor': ('Dr. Somboon Waiphrip, plastic surgeon | Apex Surgery Hospital', 'Plastic and reconstructive surgeon at Apex Surgery Hospital. Trained at Ramathibodi, Siriraj and Boston University. Member of ISAPS.'),
        'article': ('Articles | Apex Surgery Hospital', 'Articles, reviews and news from Apex Surgery Hospital.'),
        'nose': ('Nose preview | Apex Surgery Hospital', 'Try preset nose shapes on a front, 45 degree or side photo. Simulation only.'),
        'play': ('Play and win | Apex Surgery Hospital', 'Five short skill games. Reach a target score and claim a voucher to show at reception.'),
        'plan': ('My Plan | Apex Surgery Hospital', 'The procedures, nose previews, vouchers and trip dates you saved.'),
        'trip': ('Trip planner | Apex Surgery Hospital', 'How many days to stay in Thailand for each procedure, when check-ups fall and when you can fly home.'),
        'consult': ('Online consultation | Apex Surgery Hospital', 'Send your photos and travel dates to the surgery team at Apex Surgery Hospital.'),
        'notfound': ('Page not found | Apex Surgery Hospital', 'The page you opened does not exist on this site.'),
    },
    'th': {
        'service': ('บริการศัลยกรรม | Apex Surgery Hospital', 'ดึงหน้า ยกคิ้ว เสริมจมูก ทำตาสองชั้น เสริมหน้าอก และดูดไขมัน ที่ Apex Surgery Hospital เพลินจิตและภูเก็ต'),
        'doctor': ('นพ.สมบูรณ์ ไหวพริบ ศัลยแพทย์ตกแต่ง | Apex Surgery Hospital', 'ศัลยแพทย์ตกแต่งเฉพาะทาง สาขาศัลยศาสตร์และศัลยศาสตร์ตกแต่ง โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์'),
        'article': ('บทความศัลยกรรม | Apex Surgery Hospital', 'บทความ รีวิว และข่าวสารจาก Apex Surgery Hospital'),
        'nose': ('ลองทรงจมูก | Apex Surgery Hospital', 'ลองทรงจมูกสำเร็จรูปบนรูปหน้าตรง หน้าเฉียง 45 องศา หรือด้านข้าง ภาพจำลองเท่านั้น'),
        'play': ('เล่นเกมรับรางวัล | Apex Surgery Hospital', 'เกมสั้นห้าเกม ทำคะแนนถึงเป้าแล้วรับบัตรกำนัลไปแสดงที่เคาน์เตอร์'),
        'plan': ('แผนของฉัน | Apex Surgery Hospital', 'หัตถการ ผลลองทรงจมูก บัตรกำนัล และวันเดินทางที่คุณบันทึกไว้'),
        'trip': ('วางแผนการเดินทาง | Apex Surgery Hospital', 'จำนวนวันที่ควรพักในประเทศไทยสำหรับแต่ละหัตถการ วันนัดตรวจ และวันที่เดินทางกลับได้'),
        'consult': ('ปรึกษาออนไลน์ | Apex Surgery Hospital', 'ส่งรูปและวันเดินทางให้ทีมศัลยแพทย์ Apex Surgery Hospital'),
        'notfound': ('ไม่พบหน้านี้ | Apex Surgery Hospital', 'หน้าที่คุณเปิดไม่มีอยู่ในเว็บไซต์นี้'),
    },
}
CRUMB = {'en': {'home': 'Home'}, 'th': {'home': 'หน้าแรก'}}


def read_data(lang, name):
    """Return the JSON assigned in data/<lang>/<name>.js, or None when the file is missing."""
    p = os.path.join(SITE, 'assets', 'data', lang, name + '.js')
    if not os.path.exists(p):
        return None
    s = open(p, encoding='utf-8').read()
    m = re.search(r'APEX\._d\[[^\]]+\]\s*=\s*', s)
    if not m:
        return None
    body = s[m.end():].rstrip().rstrip(';')
    try:
        return json.loads(body)
    except Exception:
        return None


def esc(s):
    return html.escape(str(s or ''), quote=True)


def img(s):
    return PROD + s[2:] if s and s.startswith('~/') else (s or '')


def clinic_ld(shared, lang):
    if not shared:
        return []
    out = []
    for b in shared.get('branches', []):
        out.append({
            '@type': 'MedicalClinic', 'name': b.get('name'), 'telephone': b.get('phone'),
            'image': img(b.get('img')), 'hasMap': b.get('map'),
            'address': {'@type': 'PostalAddress', 'streetAddress': b.get('addr'), 'addressCountry': 'TH'},
            'medicalSpecialty': 'PlasticSurgery',
            'parentOrganization': {'@type': 'Organization', 'name': 'Apex Medical Center'},
        })
    return out


def physician_ld(shared):
    d = (shared or {}).get('doctor') or {}
    if not d:
        return None
    return {'@type': 'Physician', 'name': d.get('name'), 'image': img(d.get('photo')), 'medicalSpecialty': 'PlasticSurgery',
            'description': d.get('specialty'), 'identifier': d.get('license'),
            'memberOf': [x for x in d.get('more', []) if 'สมาคม' in x or 'Society' in x or 'ISAPS' in x],
            'worksFor': {'@type': 'Hospital', 'name': 'Apex Surgery Hospital'}}


def page_html(lang, fname, key, extras, prod_path, meta_id):
    up = '../' if lang == 'en' else ''
    shared = read_data(lang, 'shared') or read_data('th', 'shared')
    title, desc = None, None
    if meta_id:
        d = read_data(lang, meta_id)
        if isinstance(d, dict):
            title, desc = d.get('title'), d.get('desc')
    if not title:
        title, desc = META[lang].get(key, (shared and shared.get('brand') or 'Apex Surgery Hospital', ''))
    if key == 'home' and lang == 'en' and (not title or re.search('[฀-๿]', title or '')):
        title, desc = 'Apex Surgery Hospital | Plastic surgery hospital in Bangkok and Phuket', 'Facelift, brow lift, rhinoplasty, double eyelid surgery, breast augmentation and liposuction by plastic and reconstructive surgeons at Apex Surgery Hospital, Phloen Chit and Phuket.'

    th_url = PROD + prod_path
    en_url = PROD + 'en/' + prod_path
    canon = en_url if lang == 'en' else th_url
    og_img = img((read_data('th', 'home') or {}).get('hero', {}).get('src', '')) if key == 'home' else img('~/wp-content/uploads/2025/11/Apex-Surgery.webp')

    ld = []
    if key in ('home', 'contact'):
        ld.append({'@context': 'https://schema.org', '@type': 'Hospital', 'name': 'Apex Surgery Hospital',
                   'alternateName': (shared or {}).get('brandTh'), 'url': PROD, 'medicalSpecialty': 'PlasticSurgery',
                   'sameAs': [s['h'] for s in (shared or {}).get('socials', [])],
                   'department': clinic_ld(shared, lang)})
    if key == 'doctor':
        p = physician_ld(shared)
        if p:
            p['@context'] = 'https://schema.org'
            ld.append(p)
    if key not in ('home', 'service', 'article', 'notfound'):
        ld.append({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': CRUMB[lang]['home'], 'item': (PROD + ('en/' if lang == 'en' else ''))},
            {'@type': 'ListItem', 'position': 2, 'name': title.split('|')[0].strip(), 'item': canon}]})
    ld_html = '\n'.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)

    data_scripts = ''.join(f'<script src="{up}assets/data/{lang}/{n}.js"></script>\n' for n in ['shared'] + extras)
    # PREVIEW is True for the GitHub Pages review copy so search engines skip it. Set it to False for the live site.
    robots = '<meta name="robots" content="noindex">' if (PREVIEW or key in ('notfound', 'plan')) else ''
    return f'''<!doctype html>
<html lang="{lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}
<link rel="canonical" href="{canon}">
<link rel="alternate" hreflang="th" href="{th_url}">
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="x-default" href="{en_url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Apex Surgery Hospital">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{esc(og_img)}">
<meta property="og:locale" content="{'en_US' if lang == 'en' else 'th_TH'}">
<meta property="og:locale:alternate" content="{'th_TH' if lang == 'en' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1F0A30">
<link rel="icon" href="{up}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{up}assets/fonts/LINESeedSansTH-Rg.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://www.apexsurgeryhospital.com">
<link rel="stylesheet" href="{up}assets/css/base.css">
<link rel="stylesheet" href="{up}assets/css/site.css">
<script>
/* local testing only: serve the 3D library from the lab copy when the page runs on this machine */
if (/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)) {{
  var m = document.createElement('script'); m.type = 'importmap';
  m.textContent = JSON.stringify({{imports: {{'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js': new URL('{up}lab/vendor/three.module.js', location.href).href}}}});
  document.currentScript.after(m);
}}
</script>
{ld_html}
</head>
<body data-page="{key}">
<main id="main" tabindex="-1"></main>
<noscript><p style="padding:120px 20px;text-align:center">Apex Surgery Hospital · 088-870-0039 · LINE @apexsurgery</p></noscript>
<script src="{up}assets/js/icons.js"></script>
<script src="{up}assets/js/i18n.js"></script>
{data_scripts}<script src="{up}assets/js/core.js"></script>
<script src="{up}assets/js/pages.js"></script>
</body>
</html>
'''


def main():
    os.makedirs(os.path.join(SITE, 'en'), exist_ok=True)
    n = 0
    for lang in ('th', 'en'):
        for fname, key, extras, prod_path, meta_id in PAGES:
            out = os.path.join(SITE, fname) if lang == 'th' else os.path.join(SITE, 'en', fname)
            with open(out, 'w', encoding='utf-8') as f:
                f.write(page_html(lang, fname, key, extras, prod_path, meta_id))
            n += 1
    en_ready = os.path.exists(os.path.join(SITE, 'assets', 'data', 'en', 'shared.js'))
    print(f'wrote {n} pages; English data present: {en_ready}')


if __name__ == '__main__':
    main()
