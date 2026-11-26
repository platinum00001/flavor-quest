# Flavor Quest – Cape Cod 🍽️🌊

A mobile-first, gamified website for foodies exploring Cape Cod restaurants. Pick an avatar, log the dishes you eat, climb the **flavor tree**, discover textures for **bonus rounds**, check in with QR codes, and earn badges and rewards.

**Live:** https://platinum00001.github.io/flavor-quest/

Plain HTML, CSS and vanilla JS. No build step, no server, no accounts. Progress is saved in the browser (localStorage). All paths are relative, so it works under `/flavor-quest/` on GitHub Pages or from any static host.

## How the game works

### Flavor tree
- **Level 1 – Core flavors:** Sweet, Sour, Salty, Bitter, Umami. All five are open from the start, so players can begin with any of them.
- **Level 2 – Pairs (10):** unlocks when **either** of its two core flavors is complete.
- **Level 3 – Trios (10):** unlocks when **any** of its three sub-pairs is complete.
- **Level 4 – Quads (5):** unlocks when **any** of its sub-trios is complete.
- **Level 5 – Flavor Master:** unlocks when **any** quad is complete.

**Completing a node:** log **3 dishes** from **at least 2 different restaurants** that are tagged with *exactly* that node's flavor set. You can change these numbers in `CONFIG` at the top of `js/app.js`.

A dish only counts toward its node if that node is **unlocked** when the dish is logged. Dishes for a locked node still go into the journal, and the game shows which node needs to be finished first to unlock it.

### Logging a dish
Pick the restaurant (or add a new one), the town, the dish name, its flavors and textures, a dish photo (downscaled to about 480px JPEG), and an optional receipt photo. Adding a receipt marks the dish **receipt verified** for bonus XP.

### Texture bonus rounds
Crunchy, Creamy, Chewy, Crispy, Tender, Flaky, Juicy, Fizzy, Silky and Spicy-hot. The first time a player finds each texture, they get XP and a badge. Logging the same texture on **5 different flavor combos** triggers that texture's **Bonus Round**, with a big XP reward and confetti.

### XP (defaults in `CONFIG.XP`)
| Action | XP |
|---|---|
| Dish logged | 10 |
| Dish photo | 5 |
| Receipt verified | 15 |
| New texture | 20 |
| Node complete | 50 / 75 / 100 / 150 / 500 (levels 1–5) |
| Bonus round | 200 |
| QR check-in | 25 (once per restaurant per day) |

XP, badges and unlocks are all recalculated from the dish log, so deleting a dish or importing a save always stays consistent.

### Saves
Settings (tap your avatar at the top) let you edit your name and avatar, **export** progress as JSON, **import** a save, or **reset**. Saves stay in that one browser on that one device, so export to move to another phone.

## Restaurants & dishes (Falmouth + Woods Hole)
`data/restaurants.json` lists **38 Falmouth & Woods Hole restaurants** with **188 dishes**, each tagged with flavors and textures. The list was researched in Nov 2026 from restaurant websites, menus, and local guides.
- A dish **without** `"suggested"` was found on the restaurant's own menu or site, or in a published review (144 dishes).
- `"suggested": true` marks a **likely** dish that hasn't been checked against the menu (44 dishes). The app labels these "💡 likely".
- `participating: false` means the restaurant hasn't joined Flavor Quest. Only Cape Island Café is participating, and its gift certificate is the only (example) offer.

Restaurant pages group dishes **by flavor combo**. Each dish has **Log** (pre-fills the log form) and **✎ confirm/fix** buttons. Each node in the tree has a **"Where to find this"** list of known dishes with that exact combo.

## Flavors near me (location)
Open it from the Map tab ("📍 Find flavors near me") or from any node ("Find … near me").
- **Use my location** first shows a short explainer. Then the browser asks permission **once, only on tap**. The location isn't saved or sent to us. Players can also pick an area (Falmouth Village, Woods Hole, Heights/Harbor, Teaticket, North/West Falmouth).
- Restaurants are sorted by distance. The **flavor combo filter** (dropdowns) shows nearby places with dishes that match exactly (counts for that node) or that contain those flavors.
- **New spots nearby:** the app asks OpenStreetMap's free Overpass API for restaurants, cafés, fast food, and ice cream within `CONFIG.NEARBY_RADIUS_M` (3 km). It hides places already on the list and offers **"Help us tag it"**. Three Overpass mirrors are tried in turn, and results are cached for the session.

## Suggest & confirm (player contributions)
"Help us tag it" / "Add a dish" / ✎ opens a sheet:
1. Choose a dish from that restaurant's list, a Cape Cod classic, or type one.
2. The app **suggests flavors and textures** from keywords in the dish name (and the cuisine), e.g. "Cranberry scone" → Sweet + Sour, flaky. The player confirms or changes them with dropdowns.
3. **Confirm & save** adds it to that player's app right away (stored in `state.contrib`; new spots show up as restaurants).
4. **📧 Send to Flavor Quest** opens a pre-filled email to `CONFIG.SUBMIT_EMAILS` (capeislandcafe@gmail.com, capeislandllc@gmail.com) with a one-line JSON record (`{"fq":1,...}`).

### Merging submissions: `admin.html`
Open [`admin.html`](https://platinum00001.github.io/flavor-quest/admin.html) (not linked from the app, `noindex`). It loads the current `restaurants.json`. Paste the emails (any line containing `{"fq":1,…}` is picked up), then click **Merge**. New restaurants get a slug id and the nearest village. New dishes stay `"suggested": true` unless you tick "mark verified", and existing dishes are flagged `playerConfirmed`. Download the result, replace `data/restaurants.json` in the repo, and commit. Everything runs in the browser.

## Adding restaurants and gift certificate offers
Edit `data/restaurants.json`:

```json
{
  "id": "my-restaurant",              // unique, URL-safe (used in the QR URL)
  "name": "My Restaurant",
  "town": "Falmouth",                 // must match a map town (see list below) to light it up
  "village": "Falmouth Village",      // grouping on the home screen
  "address": "123 Main St, Falmouth, MA",
  "lat": 41.5527, "lng": -70.6172,    // needed for "near me" sorting
  "cuisine": "Seafood",
  "website": "https://example.com",
  "hours": "Daily 11 AM–9 PM",
  "participating": true,
  "featured": false,
  "placeholder": false,               // true = shown as a sample, not a real business
  "description": "Short blurb.",
  "giftCertificate": {                // or null for no offer
    "value": 25,
    "price": 20,
    "label": "Limited offer",
    "checkoutUrl": ""                 // Square/Stripe checkout link; empty = "Coming soon"
  },
  "dishes": [
    { "name": "Lobster Roll", "flavors": ["sweet", "salty"], "textures": ["tender"] },
    { "name": "House Special", "flavors": ["salty", "umami"], "textures": [], "suggested": true }
  ]
}
```

Map towns: Bourne, Sandwich, Falmouth, Mashpee, Barnstable/Hyannis, Yarmouth, Dennis, Brewster, Harwich, Chatham, Orleans, Eastham, Wellfleet, Truro, Provincetown.

The Cape Island Café gift certificate is an **example** offer with no checkout link yet. (The v1 "Sample Restaurant" placeholders were replaced by the real Falmouth/Woods Hole list. None of those restaurants are participating or offering deals.)

## QR check-in
Check-in URL format:

```
https://platinum00001.github.io/flavor-quest/?r=<restaurant-id>
```

For example, `?r=cape-island-cafe`. Scanning the code checks the player in (+25 XP, once per restaurant per day) and opens that restaurant's page. If someone scans before creating a profile, the check-in is applied right after onboarding.

**Printable codes:** open [`qr.html`](https://platinum00001.github.io/flavor-quest/qr.html) to get printable cards for participating restaurants (tick "Show all restaurants" for every one). The QR library (`js/qrcode.js`, qrcode-generator by Kazuhiko Arase, MIT) is vendored, so there is no CDN dependency.

## Rewards
The Rewards tab shows milestone rewards (first core, first pair = 10% off, and so on), the gift certificates, the badge cabinet, and texture bonus progress. Milestone perks are **placeholders (coming soon)** until restaurant partnerships are set up.

## Files
```
index.html          app shell
css/style.css       styles
js/app.js           game logic (CONFIG at top)
js/qrcode.js        vendored QR generator
data/restaurants.json
qr.html             printable QR check-in cards
admin.html          merge emailed player submissions into restaurants.json
manifest.json, icons/   add-to-home-screen
```

## Run locally
```
python3 -m http.server 8000
# open http://localhost:8000/
```
(The page needs to be served over HTTP so it can load `data/restaurants.json`.)

## Tests
`tests/round2.py` (Playwright, 390×844, geolocation mocked to Falmouth Village and Woods Hole, Overpass mocked) runs onboarding, the restaurant list, logging a known dish, where-to-find, near-me sorting and filtering, new-spot discovery, suggest & confirm, reload persistence, QR check-in, admin merge, and qr.html:
```
python3 tests/round2.py http://localhost:8000/ /tmp/shots/
```
