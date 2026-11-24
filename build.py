#!/usr/bin/env python3
"""Generate every page of the Apex Surgery preview twice: English at site/<page>.html and Thai at site/th/<page>.html.

Each page is a thin HTML shell (head, SEO tags, JSON-LD, scripts). The content renders from data/<lang>/*.js,
whose fields map one to one onto the WordPress custom fields the theme will use later.
Run: python3 build.py
"""
# The design preview on GitHub Pages. The live site is the WordPress theme, which writes its own head tags.
PREVIEW_URL = 'https://shinigami1235-creator.github.io/Apex-Surgery-International/'
import json, os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, 'site')
PROD = 'https://www.apexsurgeryhospital.com/'

# page file -> (data-page key, extra data files, production path, title key or data id, i18n fallback keys)
import hashlib
def _asset_version():
    h = hashlib.sha1()
    for root, dirs, files in sorted(os.walk(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site', 'assets'))):
        dirs.sort()
        for f in sorted(files):
            if f.endswith(('.js', '.css', '.bin')):
                h.update(open(os.path.join(root, f), 'rb').read())
    return h.hexdigest()[:8]
ASSET_V = _asset_version()  # added to asset URLs so browsers fetch new files after each change

PAGES = [
    ('index.html',      'home',       ['home', 'about', 'founder', 'war', 'team', 'social'],        '',               'home'),
    ('about.html',      'about',      ['about', 'founder', 'team'],                'about-us/',      'about'),
    ('services.html',   'services',   ['services'],             'surgery/',       'services'),
    ('treatments.html', 'treatments', ['treatments'],          'non-surgical-treatments/', 'treatments'),
    ('service.html',    'service',    ['posts', 'team'],                       'surgery/',       None),
    ('doctor.html',     'doctor',     ['founder', 'team'],                       'doctor/',        None),
    ('promotions.html', 'promotions', ['promotions'],           'promotions/',    'promotions'),
    ('reviews.html',    'reviews',    ['reviews', 'posts', 'home'], 'reviews/',   'reviews'),
    ('blog.html',       'blog',       ['blogs', 'posts'],       'blogs/',         'blogs'),
    ('article.html',    'article',    ['posts'],                'blogs/',         None),
    ('transformations.html', 'shows', ['shows', 'war', 'social'],       'transformations/', 'shows'),
    ('surgery-wars.html', 'war',      ['war'],                  'surgery-wars/',  None),
    ('contact.html',    'contact',    ['contact', 'social'],              'contact-us/',    'contact'),
    ('nose.html',       'nose',       [],                       'nose-preview/',  None),
    ('analysis.html',   'analysis',   [],                       'face-analysis/', None),
    ('proportions.html', 'proportions', [],                     'golden-proportions/', None),
    ('filler.html',     'filler',     [],                       'filler-simulator/', None),
    ('breast-implants.html',   'implBreast',   [],              'implant-viewer/breast/',   None),
    ('chin-implants.html',     'implChin',     [],              'implant-viewer/chin/',     None),
    ('forehead-implants.html', 'implForehead', [],              'implant-viewer/forehead/', None),
    ('nose-implants.html',     'implNose',     [],              'implant-viewer/nose/',     None),
    ('play.html',       'play',       [],                       'play/',          None),
    ('plan.html',       'plan',       [],                       'my-plan/',       None),
    ('trip.html',       'trip',       [],                       'trip-planner/',  None),
    ('consult.html',    'consult',    [],                       'consultation/',  None),
    ('privacy.html',    'privacy',    ['privacy'],              'privacy-policy/', 'privacy'),
    ('404.html',        'notfound',   [],                       '404/',           None),
]

# titles and descriptions for pages without their own data file
META = {
    'en': {
        'service': ('Procedures | Apex Surgery Hospital', 'Facelift, brow lift, rhinoplasty, double eyelid surgery, breast augmentation and liposuction at Apex Surgery Hospital in Bangkok and Phuket.'),
        'doctor': ('Our doctors: Dr. Somboon Waiphrip and Dr. Nantapat Supapannachart | Apex Surgery Hospital', 'Dr. Somboon Waiphrip, plastic and reconstructive surgeon, trained at Ramathibodi, Siriraj and Boston University. Founder Dr. Nantapat Supapannachart, American Board-certified dermatologist.'),
        'article': ('Articles | Apex Surgery Hospital', 'Articles, reviews and news from Apex Surgery Hospital.'),
        'war': ('APEX on Surgery Wars | Apex Surgery Hospital', 'All 8 episodes of Surgery Wars on Workpoint 23 with the APEX Surgery Hospital team: videos, photos and what each person had done.'),
        'analysis': ('Face analysis | Apex Surgery Hospital', 'A light reading of your skin and face from one photo: lines, texture, spots, redness, under the eyes, sagging, skin score and skin age. A guide only, no photo uploaded.'),
        'filler': ('Filler simulator | Apex Surgery Hospital', 'Pick the concerns you want to improve and see on a 3D head where filler goes and how much, with the total in mL. Areas and amounts follow the MD Codes method. Simulation only.'),
        'proportions': ('Golden proportions | Apex Surgery Hospital', 'See your face with classic proportions: chin length, nose width, lip balance and jawline. Simulation only, no photo uploaded.'),
        'implBreast': ('Breast implant viewer | Apex Surgery Hospital', 'Try Motiva and Mentor breast implant sizes on a 3D body of your height and weight. Simulation only, no photo uploaded.'),
        'implChin': ('Chin implant viewer | Apex Surgery Hospital', 'See central, extended and square silicone chin implants on a 3D face. Simulation only, no photo uploaded.'),
        'implForehead': ('Forehead implant viewer | Apex Surgery Hospital', 'See a silicone forehead implant of 3 to 6 mm on a 3D face. Simulation only, no photo uploaded.'),
        'implNose': ('Nose implant viewer | Apex Surgery Hospital', 'See I-shape and L-shape silicone nose implants of 1.5 to 4.5 mm on a 3D face. Simulation only, no photo uploaded.'),
        'nose': ('Nose implant viewer | Apex Surgery Hospital', 'See I-shape and L-shape silicone nose implants of 1.5 to 4.5 mm on a 3D face. Simulation only.'),
        'play': ('Play and win | Apex Surgery Hospital', 'Five short skill games. Reach a target score and claim a voucher to show at reception.'),
        'plan': ('My Plan | Apex Surgery Hospital', 'The procedures, vouchers and trip dates you saved.'),
        'trip': ('Trip planner | Apex Surgery Hospital', 'How many days to stay in Thailand for each procedure, when check-ups fall and when you can fly home.'),
        'consult': ('Online consultation | Apex Surgery Hospital', 'Send your photos and travel dates to the surgery team at Apex Surgery Hospital.'),
        'notfound': ('Page not found | Apex Surgery Hospital', 'The page you opened does not exist on this site.'),
    },
    'th': {
        'service': ('บริการศัลยกรรม | Apex Surgery Hospital', 'ดึงหน้า ยกคิ้ว เสริมจมูก ทำตาสองชั้น เสริมหน้าอก และดูดไขมัน ที่ Apex Surgery Hospital เพลินจิตและภูเก็ต'),
        'doctor': ('แพทย์ของเรา: นพ.สมบูรณ์ ไหวพริบ และ พญ.นันทภัทร์ สุภาพรรณชาติ | Apex Surgery Hospital', 'นพ.สมบูรณ์ ไหวพริบ ศัลยแพทย์ตกแต่งเฉพาะทาง และผู้ก่อตั้ง พญ.นันทภัทร์ สุภาพรรณชาติ แพทย์ผู้เชี่ยวชาญด้านผิวหนัง วุฒิบัตร American Board'),
        'article': ('บทความศัลยกรรม | Apex Surgery Hospital', 'บทความ รีวิว และข่าวสารจาก Apex Surgery Hospital'),
        'war': ('APEX ในรายการ Surgery Wars | Apex Surgery Hospital', 'Surgery Wars ช่อง Workpoint 23 ครบ 8 ตอน กับทีมแพทย์ APEX Surgery Hospital ทั้งวิดีโอ ภาพ และหัตถการของแต่ละคน'),
        'analysis': ('วิเคราะห์ผิวและใบหน้า | Apex Surgery Hospital', 'อ่านผิวและใบหน้าจากรูปเดียว ริ้วรอย ผิว จุดด่างดำ รอยแดง ใต้ตา ความหย่อนคล้อย คะแนนผิว และอายุผิว เป็นแนวทางเท่านั้น ไม่มีการอัปโหลดรูป'),
        'filler': ('จำลองการฉีดฟิลเลอร์ | Apex Surgery Hospital', 'เลือกจุดที่อยากแก้ไข ดูบนหุ่นศีรษะ 3 มิติว่าฟิลเลอร์ฉีดตรงไหน ใช้เท่าไหร่ พร้อมปริมาณรวมเป็น มล. ตำแหน่งและปริมาณอ้างอิงตามวิธี MD Codes ภาพจำลองเท่านั้น'),
        'proportions': ('ใบหน้าสัดส่วนทองคำ | Apex Surgery Hospital', 'ดูใบหน้าของคุณในสัดส่วนมาตรฐาน ความยาวคาง ความกว้างจมูก สัดส่วนริมฝีปาก และกรอบหน้า ภาพจำลองเท่านั้น ไม่มีการอัปโหลดรูป'),
        'implBreast': ('จำลองซิลิโคนหน้าอก | Apex Surgery Hospital', 'ลองขนาดซิลิโคน Motiva และ Mentor บนร่างกาย 3 มิติตามส่วนสูงและน้ำหนักของคุณเอง ภาพจำลองเท่านั้น'),
        'implChin': ('จำลองซิลิโคนคาง | Apex Surgery Hospital', 'ดูซิลิโคนคางทรงกลางคาง ทรงยาว และทรงเหลี่ยม บนใบหน้า 3 มิติ ภาพจำลองเท่านั้น'),
        'implForehead': ('จำลองซิลิโคนหน้าผาก | Apex Surgery Hospital', 'ดูซิลิโคนหน้าผากหนา 3 ถึง 6 มม. บนใบหน้า 3 มิติ ภาพจำลองเท่านั้น'),
        'implNose': ('จำลองซิลิโคนจมูก | Apex Surgery Hospital', 'ดูซิลิโคนจมูกทรง I และทรง L หนา 1.5 ถึง 4.5 มม. บนใบหน้า 3 มิติ ภาพจำลองเท่านั้น'),
        'nose': ('จำลองซิลิโคนจมูก | Apex Surgery Hospital', 'ดูซิลิโคนจมูกทรง I และทรง L หนา 1.5 ถึง 4.5 มม. บนใบหน้า 3 มิติ ภาพจำลองเท่านั้น'),
        'play': ('เล่นเกมรับรางวัล | Apex Surgery Hospital', 'เกมสั้นห้าเกม ทำคะแนนถึงเป้าแล้วรับบัตรกำนัลไปแสดงที่เคาน์เตอร์'),
        'plan': ('แผนของฉัน | Apex Surgery Hospital', 'หัตถการ บัตรกำนัล และวันเดินทางที่คุณบันทึกไว้'),
        'trip': ('วางแผนการเดินทาง | Apex Surgery Hospital', 'จำนวนวันที่ควรพักในประเทศไทยสำหรับแต่ละหัตถการ วันนัดตรวจ และวันที่เดินทางกลับได้'),
        'consult': ('ปรึกษาออนไลน์ | Apex Surgery Hospital', 'ส่งรูปและวันเดินทางให้ทีมศัลยแพทย์ Apex Surgery Hospital'),
        'notfound': ('ไม่พบหน้านี้ | Apex Surgery Hospital', 'หน้าที่คุณเปิดไม่มีอยู่ในเว็บไซต์นี้'),
    },
    'zh': {
        'service': ('手术项目 | Apex Surgery Hospital', 'Apex Surgery Hospital 曼谷奔集分院与普吉分院提供面部提升术、提眉术、鼻整形术、双眼皮手术、隆胸术和吸脂术。'),
        'doctor': ('我们的医生：Somboon Waiphrip 医生与 Nantapat Supapannachart 医生 | Apex Surgery Hospital', 'Somboon Waiphrip 医生，整形与重建外科医生，曾在 Ramathibodi、Siriraj 及波士顿大学接受培训。创始人 Nantapat Supapannachart 医生，美国委员会认证皮肤科医生。'),
        'article': ('文章 | Apex Surgery Hospital', 'Apex Surgery Hospital 的文章、真实案例与新闻。'),
        'war': ('APEX 参加 Surgery Wars | Apex Surgery Hospital', 'Workpoint 23 频道 Surgery Wars 全部 8 集，与 APEX Surgery Hospital 团队一起：视频、照片以及每位参与者所做的项目。'),
        'analysis': ('面部分析 | Apex Surgery Hospital', '用一张照片初步了解您的皮肤与面部：皱纹、肤质、色斑、泛红、眼下、松弛、皮肤评分和皮肤年龄。仅供参考，照片不会上传。'),
        'filler': ('填充剂模拟 | Apex Surgery Hospital', '选择想改善的部位，在 3D 头部模型上查看填充剂注射的位置和用量，以及总用量（毫升）。部位和用量参照 MD Codes 方法。仅为模拟。'),
        'proportions': ('黄金比例 | Apex Surgery Hospital', '用经典比例看您的面部：下巴长度、鼻宽、唇部比例和下颌线。仅为模拟，照片不会上传。'),
        'implBreast': ('乳房假体模拟 | Apex Surgery Hospital', '在按您身高和体重生成的 3D 身体上试戴 Motiva 和 Mentor 乳房假体尺寸。仅为模拟，照片不会上传。'),
        'implChin': ('下巴假体模拟 | Apex Surgery Hospital', '在 3D 面部上查看中央型、加长型和方形硅胶下巴假体。仅为模拟，照片不会上传。'),
        'implForehead': ('额头假体模拟 | Apex Surgery Hospital', '在 3D 面部上查看 3 至 6 毫米的硅胶额头假体。仅为模拟，照片不会上传。'),
        'implNose': ('鼻假体模拟 | Apex Surgery Hospital', '在 3D 面部上查看 1.5 至 4.5 毫米的 I 型和 L 型硅胶鼻假体。仅为模拟，照片不会上传。'),
        'nose': ('鼻假体模拟 | Apex Surgery Hospital', '在 3D 面部上查看 1.5 至 4.5 毫米的 I 型和 L 型硅胶鼻假体。仅为模拟。'),
        'play': ('玩游戏赢好礼 | Apex Surgery Hospital', '五个简短的技巧小游戏。达到目标分数即可领取优惠券，到前台出示使用。'),
        'plan': ('我的方案 | Apex Surgery Hospital', '您保存的手术项目、优惠券和行程日期。'),
        'trip': ('行程规划 | Apex Surgery Hospital', '每个手术项目需要在泰国停留多少天、复诊时间以及何时可以回国。'),
        'consult': ('在线咨询 | Apex Surgery Hospital', '将您的照片和行程日期发送给 Apex Surgery Hospital 的手术团队。'),
        'notfound': ('页面未找到 | Apex Surgery Hospital', '您打开的页面在本网站上不存在。'),
    },
}
CRUMB = {'en': {'home': 'Home'}, 'th': {'home': 'หน้าแรก'}, 'zh': {'home': '首页'}}


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
    up = '' if lang == 'en' else '../'
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

    # the review copy points at itself: a link shared on Facebook or Messenger opens the page that was sent.
    # It has no canonical or og:url tag, since service and article pages depend on ?p=.
    pf = '' if fname == 'index.html' else fname
    en_url = PREVIEW_URL + pf
    th_url = PREVIEW_URL + 'th/' + pf
    zh_url = PREVIEW_URL + 'zh/' + pf
    canon = {'en': en_url, 'th': th_url, 'zh': zh_url}[lang]
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
            {'@type': 'ListItem', 'position': 1, 'name': CRUMB[lang]['home'], 'item': (PROD + ('' if lang == 'en' else lang + '/'))},
            {'@type': 'ListItem', 'position': 2, 'name': title.split('|')[0].strip(), 'item': canon}]})
    ld_html = '\n'.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)

    data_scripts = ''.join(f'<script defer src="{up}assets/data/{lang}/{n}.js?v={ASSET_V}"></script>\n' for n in ['shared', 'fresh'] + extras)
    robots = '<meta name="robots" content="noindex">'   # search engines skip the review copy
    return f'''<!doctype html>
<html lang="{lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="th" href="{th_url}">
{'' if lang != 'zh' else '<link rel="alternate" hreflang="zh-Hans" href="' + zh_url + '">' + chr(10)}<link rel="alternate" hreflang="x-default" href="{en_url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Apex Surgery Hospital">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(og_img)}">
<meta property="og:locale" content="{ {'en': 'en_US', 'th': 'th_TH', 'zh': 'zh_CN'}[lang] }">
<meta property="og:locale:alternate" content="{'th_TH' if lang == 'en' else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1F0A30">
<link rel="icon" href="{up}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{up}assets/fonts/LINESeed-Rg-latin.woff2" as="font" type="font/woff2" crossorigin>{'' if lang != 'th' else chr(10) + '<link rel="preload" href="' + up + 'assets/fonts/LINESeed-Rg-thai.woff2" as="font" type="font/woff2" crossorigin>'}
<link rel="preconnect" href="https://www.apexsurgeryhospital.com">
<link rel="stylesheet" href="{up}assets/css/base.css?v={ASSET_V}">
<link rel="stylesheet" href="{up}assets/css/site.css?v={ASSET_V}">
{ld_html}
</head>
<body data-page="{key}">
<main id="main" tabindex="-1"></main>
<noscript><p style="padding:120px 20px;text-align:center">Apex Surgery Hospital · 088-870-0039 · LINE @apexsurgery</p></noscript>
<script>window.APEX_V="{ASSET_V}"</script>
<script defer src="{up}assets/js/icons.js?v={ASSET_V}"></script>
<script defer src="{up}assets/js/i18n.js?v={ASSET_V}"></script>
{data_scripts}<script defer src="{up}assets/js/core.js?v={ASSET_V}"></script>
<script defer src="{up}assets/js/pages.js?v={ASSET_V}"></script>
</body>
</html>
'''


# English moved from /en/ to the root on 22 Oct 2026. The old /en/ links in the review copy send visitors to the same page at the root
MOVED = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url={f}">
<link rel="canonical" href="{f}">
<script>location.replace('{f}' + location.search + location.hash)</script>
<title>Apex Surgery Hospital</title></head><body><a href="{f}">Apex Surgery Hospital</a></body></html>
'''


def main():
    n = 0
    for lang in ('en', 'th', 'zh'):
        if lang != 'en':
            os.makedirs(os.path.join(SITE, lang), exist_ok=True)
        for fname, key, extras, prod_path, meta_id in PAGES:
            out = os.path.join(SITE, fname) if lang == 'en' else os.path.join(SITE, lang, fname)
            with open(out, 'w', encoding='utf-8') as f:
                # the retired nose preview forwards to the 3D nose implant viewer
                f.write(MOVED.format(f='nose-implants.html') if key == 'nose' else page_html(lang, fname, key, extras, prod_path, meta_id))
            n += 1
    os.makedirs(os.path.join(SITE, 'en'), exist_ok=True)
    for fname, *_ in PAGES:
        with open(os.path.join(SITE, 'en', fname), 'w', encoding='utf-8') as f:
            f.write(MOVED.format(f='../' + ('' if fname == 'index.html' else fname)))
    en_ready = os.path.exists(os.path.join(SITE, 'assets', 'data', 'en', 'shared.js'))
    print(f'wrote {n} pages; English data present: {en_ready}')


if __name__ == '__main__':
    main()
