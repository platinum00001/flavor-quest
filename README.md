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

## Adding restaurants and gift certificate offers
Edit `data/restaurants.json`:

```json
{
  "id": "my-restaurant",              // unique, URL-safe (used in the QR URL)
  "name": "My Restaurant",
  "town": "Falmouth",                 // must match a map town (see list below) to light it up
  "address": "123 Main St, Falmouth, MA",
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
  }
}
```

Map towns: Bourne, Sandwich, Falmouth, Mashpee, Barnstable/Hyannis, Yarmouth, Dennis, Brewster, Harwich, Chatham, Orleans, Eastham, Wellfleet, Truro, Provincetown.

The entries named "Sample Restaurant – …" are placeholders. Replace or remove them once real restaurants sign up. The Cape Island Café gift certificate is an **example** offer with no checkout link yet.

## QR check-in
Check-in URL format:

```
https://platinum00001.github.io/flavor-quest/?r=<restaurant-id>
```

For example, `?r=cape-island-cafe`. Scanning the code checks the player in (+25 XP, once per restaurant per day) and opens that restaurant's page. If someone scans before creating a profile, the check-in is applied right after onboarding.

**Printable codes:** open [`qr.html`](https://platinum00001.github.io/flavor-quest/qr.html) to get one printable card per restaurant. The QR library (`js/qrcode.js`, qrcode-generator by Kazuhiko Arase, MIT) is vendored, so there is no CDN dependency.

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
manifest.json, icons/   add-to-home-screen
```

## Run locally
```
python3 -m http.server 8000
# open http://localhost:8000/
```
(The page needs to be served over HTTP so it can load `data/restaurants.json`.)
