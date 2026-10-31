import asyncio, sys, json, os
from playwright.async_api import async_playwright
BASE='http://localhost:8811/'
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../_shots/shell/')
pages=sys.argv[1].split(',') if len(sys.argv)>1 else ['index.html','service.html?p=rhinoplasty','service.html?p=lipo','article.html?p=facelift-faq','promotions.html','contact.html','treatments.html','play.html']
langs=sys.argv[2].split(',') if len(sys.argv)>2 else ['en']
sizes=[(375,812),(1440,900)] if len(sys.argv)<=3 else [tuple(map(int,s.split('x'))) for s in sys.argv[3].split(',')]
full = os.environ.get('FULL','1')=='1'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        report=[]
        for lang in langs:
            for pg in pages:
                for (w,h) in sizes:
                    ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=1, reduced_motion='reduce')
                    page=await ctx.new_page()
                    errs=[]
                    page.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error',) else None)
                    page.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
                    url=BASE+('th/' if lang=='th' else '')+pg
                    await page.goto(url, wait_until='domcontentloaded')
                    await page.wait_for_timeout(2500)
                    # reveal everything
                    await page.evaluate("document.querySelectorAll('.rv,.rv-clip').forEach(e=>e.classList.add('in'))")
                    await page.wait_for_timeout(300)
                    sw=await page.evaluate("document.documentElement.scrollWidth")
                    wide=await page.evaluate("""() => { const W=document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); return r.right>W+1 && getComputedStyle(e).position!=='fixed' && !e.closest('.rail,.chips,.vid-rail,.hb-stage,.feat-host')}).slice(0,6).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,40)+' '+Math.round(e.getBoundingClientRect().right)) }""")
                    name=f"{lang}-{pg.replace('.html','').replace('?p=','-').replace('?','-')}-{w}.png"
                    await page.screenshot(path=OUT+name, full_page=full)
                    errs=[e for e in errs if 'apexsurgeryhospital.com' not in e and 'ERR_' not in e and 'Failed to load resource' not in e]
                    report.append({'shot':name,'scrollW':sw,'w':w,'overflow':wide,'errors':errs[:6]})
                    await ctx.close()
        await b.close()
        for r in report: print(json.dumps(r, ensure_ascii=False))
asyncio.run(main())
