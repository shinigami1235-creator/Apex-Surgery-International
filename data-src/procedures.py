"""Turns procedure-list.xlsx (Dr Gideon's list from Apex) into procedures.json.

Run from the repo root:  python3 data-src/procedures.py
Keeps every row in the sheet's order and keeps the sheet's own wording in "raw". "name" fixes spelling and
capitals only, "unit" puts the units in one spelling, and "check" marks names that need someone at Apex to
confirm. Duplicate rows (Botox Allergan twice) are kept once. procedures.json is what the PMS materials list,
the website treatments page and the filler simulator read."""
import json, os, re
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))

GROUPS = {   # sheet category -> key, English, Thai (the sheet's Thai)
  'Injectables': 'inject', 'Lifting': 'lift', 'Pico': 'pico', 'Laser & skin': 'laser',
  'Laser hair removal': 'hair-removal', 'Body contouring': 'body', 'Hair': 'hair', 'Wellness': 'wellness',
  'Weight management': 'weight', 'Intimate health': 'intimate'}

UNITS = {'unit': 'U', 'cc': 'cc', 'ml': 'mL', 'syringe': 'syringe', 'vial': 'vial', 'thread': 'thread',
         'amp': 'amp', 'tube': 'tube', 'shot': 'shot', 'tip': 'tip', 'pcs': 'pc', 'pairs': 'pair', 'min': 'min',
         'นาที': 'min', 'cycle': 'cycle', 'set': 'set', 'dose': 'dose'}

# spelling and capitals; anything not here keeps the sheet's text with its spaces tidied
NAMES = {
  'xeomin': ('Xeomin', 'U'), 'Belotero intense': 'Belotero Intense', 'Juvederm vobella': 'Juvederm Volbella',
  'Juvederm volift': 'Juvederm Volift', 'Juvederm voluma': 'Juvederm Voluma',
  'Neauvia hhydrodeluxe': 'Neauvia Hydro Deluxe', 'Restylane kysse': 'Restylane Kysse',
  'Restylane vital light': 'Restylane Vital Light', 'Revanesse shape': 'Revanesse Shape',
  'Revanesse ultra': 'Revanesse Ultra', 'Redensity 2': 'Teosyal Redensity 2',
  'rednsity 1 (3 ml)': 'Teosyal Redensity 1 (3 mL)', 'redensity 1 (1ml )': 'Teosyal Redensity 1 (1 mL)',
  'Teosyal Ultradeep': 'Teosyal Ultra Deep', 'Teosyal RH 4': 'Teosyal RHA 4', 'SiSi': 'SiSi',
  'cell booster': 'Cell booster', 'skinvive': 'Skinvive', 'HArmonyCa': 'HArmonyCa', 'Radiesse plus': 'Radiesse (+)',
  'Derma glow': 'Derma Glow', 'Exosome (skin)': 'Exosome (skin)', 'NCTF 135': 'NCTF 135',
  'Epithicon 18 g': 'Epithicon 18G', 'PPD ( transamine)': 'PPD (Transamin)', 'PPM ( Neobella)': 'PPM (Neobella)',
  'PPO ( oxelle)': 'PPO (Oxelle)', 'acne inj': 'Acne injection', 'Keloid inj': 'Keloid injection',
  'MPT 1.5 boost': 'MPT 1.5 Boost', 'MPT 4.5 boost': 'MPT 4.5 Boost', 'Thermage flx 400': 'Thermage FLX 400',
  'Titanium lift': 'Titanium Lift', 'V lift': 'V Lift', 'Density': 'Density', 'XTherma body': 'XTherma body',
  'XTherma face': 'XTherma face', 'Pico toning face Dr': 'Pico toning face (Dr)',
  'Pico all mode Dr': 'Pico all modes (Dr)', 'Pico toning face( LT)': 'Pico toning face (LT)',
  'LED face': 'LED face', 'Eye refrest': 'Eye Refresh', 'Total eye': 'Total Eye',
  'Eye bright & glow': 'Eye Bright & Glow', 'Eye smooth & firm': 'Eye Smooth & Firm', 'Copper laser': 'Copper laser',
  'co2': 'CO2 laser', 'V laser': 'V laser', 'Fotona vessel': 'Fotona vessel', 'accure': 'AccuRe', 'enerjet': 'EnerJet',
  'subcision': 'Subcision', 'fitfirm': 'FitFirm', 'zlipo': 'Z Lipo', 'นวด': 'Massage', 'miradry': 'miraDry',
  'X wave': 'X Wave', 'LED hair': 'LED hair', 'Robot': 'Robot', 'Hair vitamin': 'Hair vitamin',
  'lab': 'Lab tests', 'indiba': 'INDIBA', 'Hyperbarric': 'Hyperbaric oxygen', 'NK cell': 'NK cell',
  'Vitamin': 'Vitamin', 'ฉีดฮอร์โมน': 'Hormone injection', 'ฝังเข็ม (Dry needling)': 'Dry needling',
  'Mounjaro (1.25 mg) 999': 'Mounjaro 1.25 mg', 'Wegovy (0.25 mg) 999': 'Wegovy 0.25 mg', 'Vagial': 'Vagial',
  'O shot': 'O-Shot', 'P shot': 'P-Shot', 'ED shock wave': 'ED shock wave',
}
# names someone at Apex should confirm: unclear spelling, or text in the cell that isn't part of the name
CHECK = {
  'SiSi': 'spelling', 'Epithicon 18 g': 'spelling (thread brand)', 'PPO ( oxelle)': 'spelling',
  'Density': 'which device', 'Robot': 'which treatment (hair transplant robot?)', 'CFU': 'what CFU stands for',
  'Vagial': 'spelling (vaginal laser?)', 'Mounjaro (1.25 mg) 999': 'what 999 means (price?)',
  'Wegovy (0.25 mg) 999': 'what 999 means (price?)', 'Copper  laser': 'which device',
  'V laser': 'which device', 'MSC': 'what MSC is used for', 'cell booster': 'which product',
}


def tidy(s):
    return re.sub(r'\s+', ' ', str(s)).strip()


def main():
    ws = openpyxl.load_workbook(os.path.join(HERE, 'procedure-list.xlsx')).active
    groups, seen, out = {}, set(), []
    for r in ws.iter_rows(min_row=3, values_only=True):
        cat, th, raw, unit = r[0], r[1], r[2], r[3]
        if not raw or not th or tidy(cat) not in GROUPS:
            continue
        cat, th, raw = tidy(cat), tidy(th), str(raw)
        g = GROUPS[cat]
        groups.setdefault(g, {'key': g, 'en': cat, 'th': th})
        key = (g, tidy(raw).lower())
        if key in seen:
            continue
        seen.add(key)
        fix = NAMES.get(tidy(raw), NAMES.get(raw.strip()))
        name, u = (fix if isinstance(fix, tuple) else (fix or tidy(raw), None))
        u = u or (UNITS[tidy(unit).lower()] if unit else None)
        item = {'group': g, 'name': name, 'unit': u, 'raw': raw}
        c = CHECK.get(tidy(raw)) or CHECK.get(raw.strip())
        if c:
            item['check'] = c
        out.append(item)
    data = {'source': 'Precedure list  Dr Gideon.xlsx (Apex), Oct 2026', 'groups': list(groups.values()), 'items': out}
    with open(os.path.join(HERE, 'procedures.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(len(out), 'items in', len(groups), 'groups;', sum('check' in i for i in out), 'to check;',
          sum(not i['unit'] for i in out), 'without a unit')


if __name__ == '__main__':
    main()
