import asyncio, json, sys, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8931/flavor-quest/'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/workspace/flavor-quest-shots/round2/'
MOCK_OSM = os.environ.get('MOCK_OSM', '1') == '1'
os.makedirs(SHOTS, exist_ok=True)
errors = []
def check(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: errors.append(m)
FALMOUTH = {'latitude': 41.5515, 'longitude': -70.6148}
WOODSHOLE = {'latitude': 41.5245, 'longitude': -70.6705}
FAKE_OSM = {'elements': [
  {'type': 'node', 'id': 1, 'lat': 41.5530, 'lon': -70.6160, 'tags': {'amenity': 'cafe', 'name': 'Test Harbor Bakery', 'cuisine': 'bakery', 'addr:street': 'Main Street', 'addr:housenumber': '1'}},
  {'type': 'node', 'id': 2, 'lat': 41.55278, 'lon': -70.6172, 'tags': {'amenity': 'restaurant', 'name': 'The Quarterdeck'}},
  {'type': 'way', 'id': 3, 'center': {'lat': 41.5545, 'lon': -70.6100}, 'tags': {'amenity': 'restaurant', 'name': 'Test Noodle House', 'cuisine': 'ramen'}}]}

async def snap(pg, name, full=False):
    await pg.wait_for_timeout(450)
    await pg.screenshot(path=SHOTS + name, full_page=full)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  geolocation=FALMOUTH, permissions=['geolocation'])
        osm_calls = []
        if MOCK_OSM:
            async def osm(route):
                osm_calls.append(route.request.url)
                await route.fulfill(status=200, content_type='application/json', body=json.dumps(FAKE_OSM))
            await ctx.route('**/api/interpreter', osm)
        pg = await ctx.new_page()
        cons = []
        pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: cons.append(str(e)))
        await pg.goto(BASE); await pg.wait_for_selector('#onbNext')
        await pg.click('#onbNext'); await pg.click('[data-av=oyster]'); await pg.click('#onbNext')
        await pg.fill('#onbName', 'Sandy Shores'); await pg.click('#onbNext')
        await pg.click('[data-fl=salty]'); await pg.click('#onbNext')
        await pg.wait_for_selector('.mapcard')
        await pg.wait_for_timeout(3700)
        n = await pg.evaluate('FlavorQuest.restaurants().length')
        check(n == 38, f'{n} restaurants loaded')
        nv = await pg.evaluate('document.querySelectorAll("details.village").length')
        check(nv >= 8, f'{nv} village groups on home')
        await pg.evaluate('document.querySelector("details.village").open = true')
        await pg.evaluate('document.querySelector(".section-title").scrollIntoView()')
        await snap(pg, '1-home-restaurants.png')

        # restaurant sheet: dishes grouped by combo
        await pg.evaluate('window.scrollTo(0,0)')
        await pg.click('.rcard.featured'); await pg.wait_for_selector('#sheet:not([hidden]) .combo')
        txt = await pg.inner_text('#sheet')
        check('Cape Island Café' in txt and 'Salmon Bowl' in txt and 'Coming soon' in txt, 'Cape Island Café sheet with dishes by combo and gift cert')
        await snap(pg, '2-restaurant-combos.png')
        # log a known dish
        await pg.click('#sheet [data-logdish]'); await pg.wait_for_selector('#lgDish')
        dname = await pg.input_value('#lgDish')
        fl = await pg.evaluate('[...document.querySelectorAll("#lgFlavors .chip.on")].map(b=>b.dataset.f)')
        check(bool(dname) and len(fl) > 0, f'log form prefilled from known dish: {dname} {fl}')
        await pg.set_input_files('#lgPhoto', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dish.jpg')); await pg.wait_for_selector('.photo-slot img')
        await snap(pg, '3-log-known-dish.png')
        await pg.click('#lgSave'); await pg.wait_for_selector('#sheet:not([hidden]) .celebrate')
        await pg.click('#sheetClose')

        # node "where to find"
        await pg.click('.bottomnav [data-tab=tree]'); await pg.wait_for_selector('.tree')
        await pg.click('[data-node="salty+umami"]'); await pg.wait_for_selector('#sheet:not([hidden])')
        wtxt = await pg.inner_text('#sheet')
        nwhere = await pg.evaluate('document.querySelectorAll("#sheet .where .dishrow").length')
        check('Where to find this' in wtxt and nwhere >= 5, f'node sheet lists {nwhere} places to find Salty+Umami')
        await pg.evaluate('document.querySelector("#sheet h3:last-of-type") && document.querySelector("#sheet .where").scrollIntoView()')
        await snap(pg, '4-node-where-to-find.png')
        await pg.click('#sheetClose')

        # nearby with geolocation (Falmouth)
        await pg.click('.bottomnav [data-tab=home]'); await pg.wait_for_selector('[data-go=nearby]')
        await pg.click('button[data-go=nearby]'); await pg.wait_for_selector('#nbGeo')
        await pg.click('#nbGeo'); await pg.wait_for_selector('#geoYes')
        await snap(pg, '5-location-permission.png')
        await pg.click('#geoYes')
        await pg.wait_for_selector('.rlist .rcard')
        first = await pg.evaluate('document.querySelector(".rlist .rcard .rmeta > b").textContent')
        vill = await pg.evaluate('FlavorQuest.restaurants().find(r=>r.name===document.querySelector(".rlist .rcard .rmeta > b").textContent).village')
        check(vill == 'Falmouth Village', f'Falmouth GPS: closest is {first} ({vill})')
        if MOCK_OSM:
            await pg.wait_for_selector('[data-tagspot]', timeout=10000)
            spots = await pg.evaluate('[...document.querySelectorAll(".newspot b")].map(e=>e.textContent)')
            check('Test Harbor Bakery' in spots and 'The Quarterdeck' not in spots, f'Overpass new spots deduped vs known list: {spots}')
        # filter by combo
        await pg.select_option('#nbF0', 'salty'); await pg.wait_for_timeout(200)
        await pg.select_option('#nbF1', 'umami'); await pg.wait_for_timeout(300)
        places = await pg.evaluate('document.querySelectorAll(".nearcard").length')
        check(places >= 5, f'Salty+Umami filter shows {places} nearby places')
        await snap(pg, '6-nearby-filter.png')
        # contribute flow on new spot
        await pg.click('#nbClear'); await pg.wait_for_timeout(300)
        if MOCK_OSM:
            await pg.evaluate('document.querySelector("[data-tagspot]").scrollIntoView()')
            await snap(pg, '7-new-spots.png')
            await pg.click('[data-tagspot="osm-node-1"]'); await pg.wait_for_selector('#ctDishSel')
            await pg.select_option('#ctDishSel', 'other'); await pg.fill('#ctDishName', 'Cranberry scone'); await pg.dispatch_event('#ctDishName', 'change')
            await pg.wait_for_timeout(200)
            sug = await pg.evaluate('[0,1,2,3,4].map(i=>document.querySelector("#ctF"+i).value).filter(Boolean)')
            check('sweet' in sug and 'sour' in sug, f'suggested flavors for "Cranberry scone": {sug}')
            await snap(pg, '8-suggest-confirm.png')
            await pg.click('#ctSave'); await pg.wait_for_selector('#ctMail')
            href = await pg.get_attribute('#ctMail', 'href')
            check(href.startswith('mailto:capeislandcafe@gmail.com') and '%22fq%22%3A1' in href, 'mailto with data line ready')
            line = await pg.input_value('#ctLine')
            await snap(pg, '9-contrib-saved.png')
            await pg.click('#sheetClose')
            inlist = await pg.evaluate('!!FlavorQuest.restaurants().find(r=>r.name==="Test Harbor Bakery" && r.dishes.some(d=>d.name==="Cranberry scone"))')
            check(inlist, 'confirmed new spot + dish appears in player restaurant list')
        # reload persistence
        await pg.reload(); await pg.wait_for_selector('#meName')
        nd = await pg.evaluate('FlavorQuest.state.dishes.length'); nc = await pg.evaluate('(FlavorQuest.state.contrib||[]).length')
        check(nd == 1 and nc == (1 if MOCK_OSM else 0), f'reload persistence: {nd} dish, {nc} contrib')

        # Woods Hole
        await ctx.set_geolocation(WOODSHOLE)
        await pg.evaluate('location.hash = "#/nearby"'); await pg.wait_for_selector('#nbGeo')
        await pg.click('#nbGeo'); await pg.click('#geoYes'); await pg.wait_for_selector('.rlist .rcard')
        await pg.wait_for_timeout(500)
        names = await pg.evaluate('[...document.querySelectorAll(".rlist .rcard .rmeta > b")].slice(0,8).map(e=>e.textContent)')
        vills = await pg.evaluate('(n)=>n.map(x=>FlavorQuest.restaurants().find(r=>r.name===x)).map(r=>r?r.village:"?")', names)
        check(all(v == 'Woods Hole' for v in vills), f'Woods Hole GPS: top 8 all Woods Hole: {names}')
        await snap(pg, '10-nearby-woods-hole.png')

        # QR still works
        await pg.goto(BASE + '?r=captain-kidd'); await pg.wait_for_selector('#sheet:not([hidden])'); await pg.wait_for_timeout(700)
        ci = await pg.evaluate('FlavorQuest.state.checkins.length'); t = await pg.inner_text('#sheet')
        check(ci == 1 and 'Captain Kidd' in t, 'QR check-in still works')

        # admin merge
        if MOCK_OSM:
            a = await ctx.new_page(); await a.goto(BASE + 'admin.html')
            await a.wait_for_function('document.getElementById("current").value.length > 1000')
            await a.fill('#lines', 'Some email text\n' + line + '\n')
            await a.click('#merge')
            out = json.loads(await a.input_value('#out'))
            r = [x for x in out['restaurants'] if x['name'] == 'Test Harbor Bakery']
            check(len(out['restaurants']) == 39 and r and r[0]['dishes'][0]['suggested'] and r[0]['id'].startswith('test-harbor-bakery') and r[0]['village'] == 'Falmouth Village', 'admin.html merges submission (new restaurant + suggested dish)')
            await a.screenshot(path=SHOTS + '11-admin-merge.png', full_page=False)
        q = await ctx.new_page(); await q.goto(BASE + 'qr.html'); await q.wait_for_selector('.tent svg')
        cnt = await q.evaluate('document.querySelectorAll(".tent svg").length'); check(cnt == 1, f'qr.html shows {cnt} participating QR (Cape Island Café)')
        check(not cons, 'no console errors: ' + '; '.join(cons))
        await b.close()
    print('ERRORS:', errors)
    sys.exit(1 if errors else 0)
asyncio.run(main())
