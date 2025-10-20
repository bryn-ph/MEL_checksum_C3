# Dollar Decisions In The Land Down Under

A fast, data‑driven text adventure about moving to Australia — land a job, find a roof, dodge fees, and try not to rage‑quit the housing market. Built with HTML + CSS + vanilla JS, backed by JSON event data and a handful of quick minigames.

Play it from `game_submission/game_app/index.html`.

## Highlights
- Data‑driven events: 50+ job, housing, and random scenarios loaded from JSON, with early/mid/late progression and prerequisites.
- Realistic money mechanics: Money, Debt, Stress, and optional Stocks; rent arrears and a housing cost multiplier if you delay paying rent.
- Timed choices: Each event can have a countdown; if you time out, a “worst likely” outcome is applied.
- Minigames: Short skill checks launched from event options or from the menu’s Playground.
  - Coin Rush, Bill Dodge, Typing Challenge, Reaction Test, Quick Math
- Quality‑of‑life: Achievements, SFX toggle, category badges, progress bar, result banners, confetti on big wins.
- Resilient offline behavior: If JSON fetch fails (e.g., when run via `file://`), the game uses a small built‑in demo set so you can still play.

## Project structure
```
game_submission/
  game_app/
    index.html           # App shell + menu and overlay DOM
    assets/
      icon.svg           # App icon (also embedded as data‑URL favicon)
    css/
      style.css          # Styles for HUD, timers, effects, minigames
    data/
      job_events.json    # Job scenarios
      housing_events.json# Housing scenarios (incl. rent mechanics)
      random_events.json # Random economic/life events
    js/
      state.js           # Core game state + helpers
      ui.js              # Counters, feedback, sfx, achievements
      data.js            # Event loading + fallbacks
      minigames.js       # Minigame framework and implementations
      engine.js          # Event selection, timing, effects application
      main.js            # App initialization and menu wiring
```

## How to run locally
You can open `index.html` directly, but many browsers block JSON fetches over `file://`. If that happens, you’ll see a banner and the app will switch to demo events.

For full content, serve the folder with a tiny static server.

Optional commands (pick one):

- PowerShell + Python 3 (if installed)
  - python -m http.server 8000 -d "game_submission/game_app"

- Node.js (if installed)
  - npx serve "game_submission/game_app" -l 8000

- VS Code extension
  - Install “Live Server”, then right‑click `index.html` → “Open with Live Server”.

Then visit http://localhost:8000/

## Gameplay basics
- Stats: Money, Debt (appears only when > 0), Stress, optional Stocks, and Progress (35 questions target).
- Housing: If you “wait to pay” rent, you accrue Rent Arrears and increase a Housing Cost Multiplier that makes future housing costs more expensive until cleared.
- Failure checks: Bankrupt or over‑stressed states trigger game over; strong performance leads to success.

## Event data format (JSON)
Each event has a category (job/housing/random), a stage order (early/mid/late), description, an optional timeLimit, and a set of options. Effects apply to stats, and meta fields unlock extras like minigames or rent logic.

Example:
```json
{
  "id": 24,
  "category": "housing",
  "order": "mid",
  "description": "Bills piling up—dodge fees to clear arrears!",
  "timeLimit": 10,
  "options": [
    {
      "text": "Play Bill Dodge",
      "effects": {
        "stress": 1,
        "meta": {
          "minigame": "whack-a-fee",
          "minigameConfig": { "seconds": 10, "reducePerHit": 120, "spawnMs": 550 }
        }
      }
    },
    { "text": "Ignore it", "effects": { "money": 0, "stress": 2 } }
  ],
  "timeoutEffect": { "money": -100, "stress": 6 }
}
```

Effects keys: `money`, `debt`, `stress`, `stocksValue`, and `meta`.

Useful `meta` patterns:
- `minigame`: one of `coin-rush`, `whack-a-fee`, `typing-challenge`, `reaction-click`, `quick-math` (use `minigameConfig` to tune).
- `includeArrears`: add current arrears into the money delta when paying.
- `addArrearsAmount`: increase rent arrears (e.g., when you delay rent).
- `increaseHousingCosts`: raise future negative housing costs by a multiplier.
- `reduceArrearsBy`, `reduceHousingMultiplier`: lower arrears/multiplier (often via minigames or good choices).

## Minigames
- Coin Rush — click coins to earn cash quickly.
- Bill Dodge (Whack‑a‑Fee) — clear as many fees as you can to reduce arrears.
- Typing Challenge — type the prompt within the time for a payout.
- Reaction Test — wait for green and click fast; faster = more money.
- Quick Math — solve a simple expression before the timer ends.

Minigames run in an overlay and return effects that merge with the chosen option.

## Contributing content
- Add events under `game_app/data/*.json`. Keep IDs unique per file and include `category` + `order`.
- Use `timeoutEffect` to control outcomes when players don’t choose in time; if omitted, the engine derives a “slightly worse than worst” fallback.
- To attach a minigame, set `effects.meta.minigame` and optional `minigameConfig`.

## Brand & assets
- App icon at `game_app/assets/icon.svg`. The page also inlines a small data‑URL favicon and generates a PNG favicon at runtime for broader compatibility.

---

Made for hackathon vibes — practical, playful, and easy to extend.