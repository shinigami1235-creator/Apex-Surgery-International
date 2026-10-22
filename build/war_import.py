#!/usr/bin/env python3
"""Turn the Surgery Wars article export (articles.json, from the writers' Google Docs) into site data.

Writes site/assets/data/th/war.js (episode list) and site/assets/data/th/war/<n>.js (one article each).
Image n of an episode is saved as site/assets/img/war/ep<n>-<i>.webp by the photo step.
Run: python3 build/war_import.py path/to/articles.json (Thai) or --en folder (English)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YT = {1: 'ZTSBLJOzzss', 2: 'Pv98TlJwLCU', 3: '9sDDYoLdWQM', 4: 'K15zKt4HdV0', 5: 'U2nXfDd6GC4', 6: 'IK3whbKNKNI', 7: 'k4Co1tdrhBA', 8: '79guPSIdmL4'}
SHORT = {1: 'คุณดา วัย 60 เคสแรกของรายการ', 2: 'แก้จมูกและปรับโครงหน้าคุณปีโป้', 3: 'ดูดไขมันคุณอดัม กับ 365mc', 4: 'คุณป๊อบ ถอดแมสก์ เปิดลุคใหม่',
         5: 'คุณอั้ยหยา ละมุนในแบบที่เลือกเอง', 6: 'คุณเมษ์ ฟื้นรูปร่างหลังคลอด', 7: 'คุณวันชัย วัย 59 ดูหนุ่มขึ้น', 8: 'คุณยุ้ย แก้ขากรรไกรยื่น'}
# spelling slips in the writers' drafts
FIX = [('3655mc', '365mc'), ('ถอดหแมสก์', 'ถอดแมสก์'), ('THD Dental', 'TDH Dental'), ('ศัลกรรม', 'ศัลยกรรม'), ('Subbrown Lift', 'Subbrow Lift'), ('วัณชัย', 'วันชัย')]


def clean(s):
    s = str(s)
    for a, b in FIX:
        s = s.replace(a, b)
    return re.sub(r'[  ]{2,}', ' ', s).strip()


def convert(n, art):
    body, out, title, img_i = art['body'], [], None, 0
    for b in body:
        t = b[0]
        if t == 'h1':
            if b[1].strip() and not title:
                title = clean(b[1]).replace('APEX SURGERY WARS', 'APEX Surgery Wars')
            continue
        if t == 'img':
            img_i += 1
            out.append({'t': 'img', 'src': f'img/war/ep{n}-{img_i}.webp', 'alt': ''})
            continue
        if t == 'p':
            x = clean(b[1])
            if not x or re.match(r'^https?://\S+$', x):
                continue
            m = re.match(r'^Alt text\s*:\s*(.+)$', x, re.I)
            if m:
                if out and out[-1]['t'] == 'img':
                    out[-1]['alt'] = m.group(1).strip()
                continue
            out.append({'t': 'p', 'x': x})
        elif t in ('h2', 'h3', 'h4'):
            out.append({'t': t, 'x': clean(b[1])})
        elif t in ('ul', 'ol'):
            out.append({'t': 'list', 'o': t == 'ol', 'items': [clean(i) for i in b[1] if clean(i)]})
    for b in out:
        if b['t'] == 'img' and not b['alt']:
            b['alt'] = title
    meta = art['meta']
    return {'n': n, 'title': title, 'seo': clean(meta.get('Content Name', '')), 'desc': clean(meta.get('Meta description', '')),
            'yt': YT[n], 'blocks': out}


def write_js(path, id_, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(f'window.APEX=window.APEX||{{}};APEX._d=APEX._d||{{}};APEX._d["{id_}"]={json.dumps(data, ensure_ascii=False, separators=(",", ":"))};\n')


def main(src):
    arts = json.load(open(src, encoding='utf-8'))
    eps = []
    for k in sorted(arts, key=int):
        n = int(k)
        d = convert(n, arts[k])
        write_js(os.path.join(ROOT, 'site/assets/data/th/war', f'{n}.js'), f'war:{n}', d)
        eps.append({'n': n, 'title': SHORT[n], 'full': d['title'], 'desc': d['desc'], 'yt': YT[n], 'cover': f'img/war/ep{n}-cover-640.webp',
                    'img': f'img/war/ep{n}-1.webp', 'photos': sum(1 for b in d['blocks'] if b['t'] == 'img')})
    write_js(os.path.join(ROOT, 'site/assets/data/th/war.js'), 'war', {'episodes': eps})
    print('episodes', len(eps))




SHORT_EN = {1: 'Khun Da, 60, the first case', 2: 'Khun Pipo: nose and face structure', 3: 'Khun Adam: liposuction with 365mc', 4: 'Khun Pop takes off the mask',
            5: 'Khun Aiya, the look she chose', 6: 'Khun Mes: her body after childbirth', 7: 'Khun Wanchai, 59, looks younger', 8: 'Khun Yui: jaw surgery'}


def main_en(folder):
    """English: one translated JSON per episode (same blocks as the Thai) in <folder>/<n>.json."""
    eps = []
    for n in range(1, 9):
        d = json.load(open(os.path.join(folder, f'{n}.json'), encoding='utf-8'))
        d['title'] = d['title'].replace('APEX SURGERY WARS', 'APEX Surgery Wars')
        write_js(os.path.join(ROOT, 'site/assets/data/en/war', f'{n}.js'), f'war:{n}', d)
        eps.append({'n': n, 'title': SHORT_EN[n], 'full': d['title'], 'desc': d['desc'], 'yt': YT[n], 'cover': f'img/war/ep{n}-cover-640.webp',
                    'img': f'img/war/ep{n}-1.webp', 'photos': sum(1 for b in d['blocks'] if b['t'] == 'img')})
    write_js(os.path.join(ROOT, 'site/assets/data/en/war.js'), 'war', {'episodes': eps})
    print('english episodes', len(eps))


if __name__ == '__main__':
    # python3 build/war_import.py articles.json            Thai, from the writers' docs
    # python3 build/war_import.py --en folder_with_n.json   English translations
    main_en(sys.argv[2]) if sys.argv[1] == '--en' else main(sys.argv[1])
