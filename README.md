# Trice

A blocky grid puzzle: fit three-square pieces onto a 6×6 grid, clear full rows and
columns, chase the combo. One self-contained web file (`www/index.html`, vanilla
JS, no dependencies, synthesized audio) that runs three ways from the same source:

- a native **iOS** app (Capacitor + Swift Package Manager — no CocoaPods)
- a native **Android** app (Capacitor)
- a **web build** for HTML5 portals (Poki, CrazyGames) or itch.io / your own site

It's fully offline; all progress lives in one `localStorage` key.

---

## Gameplay

Startup shows a **mode menu** (reachable any time via MENU on the pause /
game-over screens; last mode is remembered, best score tracked per mode):

- **RELAXED** — no clock. The bar is HEALTH: it only drops on a *jam* (no block
  fits → board wipes, damage scales with how full it was). Clears heal a little.
- **TIMED** — the bar is FLOW and drains in real time, pausing only while you
  place. Placing / clearing / comboing refills it. Idle ~10 s and you're done;
  the drain tightens every 6 lines.
- **DAILY CHALLENGE** — Timed rules, but the piece sequence is seeded from the
  date, so it's identical for everyone that day. Finishing a run advances your
  **day streak** (a missed day resets it); best-of-day score is kept.

The menu also has **STATS** (lifetime numbers + a 17-achievement list) and
**LOOKS** (equip unlocked block skins and grid themes).

Shared across modes: drag 1–3-tile blocks from the tray onto the grid; fill a
full row **or** column to clear it. Combo multiplier (×1…×9) builds on consecutive
clearing placements. **PURE** bonus for a single-colour line, **PERFECT CLEAR**
(+2500) for emptying the board in one move. Bar at 0 = game over.

## Progression

- **17 achievements**, toast on unlock; 7 grant a skin or theme (5 skins, 4
  themes). All earned through play.
- **Daily streak** — the reason to reopen tomorrow.
- Stats: games, blocks, lines, perfect clears, pure lines, best combo, per-mode
  bests, streak.
- Effects: particle bursts + a light-sweep on clears; a pentatonic synth (place /
  clear / combo ladder / perfect fanfare / achievement ding); a "one more!"
  yellow pulse on the gap when a placement brings a row/column to 5 of 6. Honors
  `prefers-reduced-motion`.
- **First run** (`profile.totals.games === 0`) skips the mode menu and drops
  straight into a Relaxed game.

## Game-over screen

- **PLAY AGAIN · SHARE · MENU** always. SHARE uses `navigator.share` when
  available, else copies `"I scored N in Trice! <SHARE_URL>"` to the clipboard.
  Set the `SHARE_URL` constant near the top of the script once the game has a
  live URL (portal page or store link); empty = text only.
- **CONTINUE** (rewarded ad → clear the board, keep going, once per game) and
  **DOUBLE SCORE** (rewarded ad → 2× the score, once per game) appear only when
  `Portal.rewardsAvailable()` — i.e. in a portal build, never in the native apps
  or a plain web build.

**Data:** one `localStorage` key, `trice-profile` (JSON). Old `blockfit-*` keys
migrate on first run.

**IAP seam:** skins/themes are gated by `haveLook(id)` (checks
`profile.unlocks`). To sell a pack, add its ids and have a store-entitlement
check push to `profile.unlocks` instead of an achievement. No purchase UI is
shipped (needs a Capacitor IAP plugin + store config).

---

## Repo layout

```
trice/
├── www/
│   ├── index.html            <- the entire game (edit this)
│   └── privacy.html          <- privacy policy, bundled in the app
├── docs/                     <- GitHub Pages site (Settings → Pages → main /docs)
│   ├── index.html            <-   landing page  (lrm-tech-games.github.io/Trice/)
│   └── privacy.html          <-   public copy of www/privacy.html (sync.sh refreshes it)
├── portal/                   <- portal SDK adapters, folded in by pack-web.sh only
│   ├── portal-poki.js        <-   (kept out of www/ so the native apps don't bundle them)
│   └── portal-crazygames.js
├── capacitor.config.json     <- appId, appName, colours
├── package.json
├── assets/                   <- icon + splash SOURCE art (SVG) -> capacitor-assets
├── scripts/
│   ├── sync.sh               push www/ into the native projects
│   ├── pack-web.sh           build a web / portal distribution
│   └── fix-capacitor-spm.mjs postinstall CLI-bug workaround (see note below)
├── ios/                      <- Xcode project (Swift Package Manager, NO CocoaPods)
└── android/                  <- Android Studio / Gradle project
```

## Status

Done on this machine: `npm install`, both native projects generated with appId
`com.dentremontguitars.trice` (iOS via SPM), `cap sync`, icons + splash generated,
orientation locked to **portrait** (`Info.plist`, `AndroidManifest.xml`), `cap
doctor` clean.

**Not done — needs software this machine lacks:**

| To build… | You need | Install |
|---|---|---|
| **iOS** | Full **Xcode** (Command Line Tools alone isn't enough) | Mac App Store (~7 GB), then `sudo xcode-select -s /Applications/Xcode.app` and `sudo xcodebuild -license accept` |
| **Android** | **Android Studio** + SDK, **JDK 17+** | https://developer.android.com/studio (bundles a JDK) |

`git` on this machine is currently blocked by the Xcode licence — run
`sudo xcodebuild -license accept` once and it works again.

---

## Run the native apps

```bash
npm run open:ios       # Xcode  -> pick a simulator -> ▶   (or: npx cap run ios)
npm run open:android   # Android Studio -> ▶                (or: npx cap run android)
```

First iOS build resolves the Swift packages automatically.

## Edit loop

The game is just `www/index.html`. After a change:

```bash
./scripts/sync.sh      # = npx cap sync
npm run serve          # or just open www/index.html in a browser
```

then re-run from Xcode / Android Studio.

## Web / portal build

```bash
./scripts/pack-web.sh              # dist-web/ + trice-web.zip  — itch.io, own site
./scripts/pack-web.sh poki         # + Poki adapter <script>
./scripts/pack-web.sh crazygames   # + CrazyGames adapter <script>
```

The adapters (`portal/portal-*.js`) load the portal's SDK and map it to the game's
`window.Portal` interface (defined as a no-op shim in `index.html`, so the native
apps and a plain web build ship zero portal code). Call sites:
`gameplayStart/Stop`, `commercialBreak` (PLAY AGAIN), `rewardedBreak` (the
`CONTINUE` button, hidden unless `Portal.rewardsAvailable()`), `happyTime`
(perfect clear). Verify the SDK method names against current portal docs and
register the game before submitting.

## Regenerate native projects

Only if `ios/`/`android/` is deleted, or `appId`/`appName` changes:

```bash
npm install                             # runs the SPM patch via postinstall
npx cap add android
npx cap add ios --packagemanager SPM
npx cap sync
npm run assets                          # icons + splash
```
Then re-apply the portrait lock (see `Info.plist` `UISupportedInterfaceOrientations`
and `AndroidManifest.xml` `android:screenOrientation="portrait"`).

> **The SPM flag + postinstall patch:** `@capacitor/cli` 7.6.9 lowercases the
> `--packagemanager` value before comparing it to `'SPM'`, so the flag is ignored
> and it demands CocoaPods. `scripts/fix-capacitor-spm.mjs` makes the check
> case-insensitive and runs after `npm install`. An existing `ios/App/CapApp-SPM`
> folder is auto-detected, so routine `cap sync` needs none of this.

---

## Shipping

Accounts (only for the stores): Apple Developer $99/yr, Google Play $25 once. You
can build + run on a simulator/emulator and your own device without them.

**Privacy policy / marketing URL — GitHub Pages:**
`www/privacy.html` ships inside the apps; the store listings also need a public
URL. The `docs/` folder is a ready Pages site — enable it once:

1. github.com/LRM-Tech-Games/Trice → **Settings → Pages**
2. Source: **Deploy from a branch** → Branch **`main`**, folder **`/docs`** → Save
3. After a minute:
   - landing / marketing URL — `https://lrm-tech-games.github.io/Trice/`
   - privacy-policy URL — `https://lrm-tech-games.github.io/Trice/privacy.html`

`scripts/sync.sh` copies `www/privacy.html` → `docs/privacy.html` on every run, so
edit the policy in `www/` and it stays in sync. Fill in the real store/play links
in `docs/index.html` once you have them.

**Version tag:** when you actually submit to a store or portal,
`git tag -a v1.0.0 -m "First store submission" && git push origin v1.0.0` so you
can always recover exactly what shipped.

**iOS** — Xcode: set your Team under *Signing & Capabilities* on the `App`
target, bump version/build, *Product → Archive → Distribute App*, finish at
appstoreconnect.apple.com.

**Android** — Android Studio: *Build → Generate Signed Bundle / APK → Android App
Bundle*. Create a keystore and **back it up** (losing it = can't ship updates).
Upload the `.aab` at play.google.com/console.

## Configuration — `capacitor.config.json`

| Field | Value |
|---|---|
| `appId` | `com.dentremontguitars.trice` — reverse-DNS, painful to change after release |
| `appName` | `Trice` |
| `webDir` | `www` |
| `backgroundColor` | `#050505` |

## Optional plugins (later)

- `@capacitor/haptics` — real haptics (game calls `navigator.vibrate`; Android OK, iOS no-op)
- `@capacitor/status-bar` — force the status bar dark
- `@capacitor/splash-screen` — control the launch-screen fade
