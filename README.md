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
- **RUN** — Relaxed's HEALTH rules, but the board is split into stages: clear a
  target number of lines (5, then 6, 7… capping at 10) to advance, and pick one
  of 2–3 **relics** each time you do. Relics are permanent, run-scoped modifiers
  (e.g. "every piece is a tromino," "yellow clears score ×1.5") — a jam-out ends
  the run and every relic with it. See **Relics** below.

The menu also has **STATS** (lifetime numbers + a 19-achievement list) and
**LOOKS** (equip unlocked block skins and grid themes).

Shared across modes: drag 1–3-tile blocks from the tray onto the grid; fill a
full row **or** column to clear it. Combo multiplier (×1…×9) builds on consecutive
clearing placements. **PURE** bonus for a single-colour line, **PERFECT CLEAR**
(+2500) for emptying the board in one move. Bar at 0 = game over.

## Relics (RUN mode)

The core loop (`makePiece`, scoring, health regen, combo reset) never branches
on individual relics — it only ever asks "does anything active want to change
this?" at four hook points, so adding relic #5 later means adding one entry to
the `RELICS` table, not touching `place()` again:

| Hook | Fires from | Used by |
|---|---|---|
| `pieceShape()` | `makePiece()` | TROMINO FOCUS — forces every draw to a 3-tile shape |
| `scoreGain(gain, ctx)` | `place()`, after computing a clear's score | GOLD RUSH — ×1.5 if the clear touched yellow |
| `flowGain(flow)` | `place()`, after the normal HEALTH/FLOW regen | SECOND WIND — +6 extra on every clear |
| `comboReset()` | `place()`, the non-clearing branch, only when `combo > 0` | CHAIN KEEPER — returning `false` skips the reset |

`relicHook(name)` collects that function from every relic in `runRelics` (plain
IDs) and the caller runs them in order; with zero relics active — i.e. every
mode except RUN — none of these sites do anything extra, so Relaxed/Timed/Daily
are byte-for-byte the pre-RUN behavior. Stage advance (`checkRunAdvance`,
called after a clearing placement resolves) reuses the pause flag (`paused`) to
gate input while `#relicpick` is up, rather than a separate lock. The run
summary reuses the normal GAME OVER overlay (`writeOverSub` appends the stage
+ relic count when `mode==='run'`); CONTINUE (`revive()`) never touches
`runStage`/`runRelics`, so a rewarded-ad continue preserves the run. Rerolling
the relic offer (`#relic-reroll`) is the other ad hook, gated the same way as
CONTINUE/DOUBLE SCORE on `Portal.rewardsAvailable()`.

Only 4 relics ship today (one per hook, one per board color) — enough to prove
the system works end to end. Expanding the roster is the natural next pass,
but wants some actual play data on whether the 4 are fun before multiplying
the surface area.

**Playtesting note:** CHAIN KEEPER originally blocked the combo reset
unconditionally — permanent, for the whole run. Playtesting found that
overpowered (combo climbs to ×9 and just sits there once you have it, making
every other relic a rounding error by comparison). Fixed by scoping it to a
shield that recharges once per stage instead of per run: `runStageUsed`
(relic id → already fired this stage) is cleared alongside the other run
state in `newGame()` and again in `checkRunAdvance()` on every stage
transition; the relic's hook checks and sets that flag itself. Deliberately
*not* a wall-clock timer, even though "limit how long it lasts" was the
original framing — RUN mode's whole identity is having no clock, and a
seconds-based buff would need new infrastructure (a timestamp, a HUD
countdown) for a worse fit than reusing the pacing unit the mode already
runs on.

SECOND WIND had the same shape of problem, just from magnitude instead of
duration: a normal single-line clear heals +1 HEALTH, and the relic added a
flat +6 on top of that — a 7× multiplier on the single most common event in
the game. Across a 5–10-line stage that's +30–60 HEALTH, against a worst-case
jam costing ~50, so once picked, jamming out stopped being a real threat as
long as you kept clearing anything — noticed because a test run survived to
stage 10+ specifically because its healing was outpacing jam damage even
against a deliberately bad bot. Cut to +2: still a meaningful cushion, not a
button that turns off the run's failure condition.

## Progression

- **19 achievements**, toast on unlock; 7 grant a skin or theme (5 skins, 4
  themes). All earned through play.
- **Daily streak** — the reason to reopen tomorrow.
- Stats: games, blocks, lines, perfect clears, pure lines, best combo, per-mode
  bests, streak.
- Effects: particle bursts + a light-sweep on clears; a pentatonic synth (place /
  clear / combo ladder / perfect fanfare / achievement ding); a "one more!"
  yellow pulse on the gap when a placement brings a row/column to 5 of 6. Honors
  `prefers-reduced-motion`.
- **First run** (`!profile.tutorialDone`): an intro splash ("drag a block, fill a
  row or column, quick demo — clear 2 lines"), then a **scripted guided demo** —
  the tray holds one block at a time and the grid highlights exactly where it
  goes; four placements fill and clear the bottom row, then the left column. On
  the 2nd clear a "NICE!" screen, then the mode menu with **coach-mark popups**
  cycling the three modes (`!profile.coachDone`). `skip demo` on the splash
  bypasses it. Both flags persist so it only happens once.
  The demo drives `place()` with `tutorial = true` (forced tray, drop gated to the
  target cells, no scoring/achievements/jam/perfect); script is `TUT[]` near the
  onboarding functions.

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

### CrazyGames submission

```bash
./scripts/pack-web.sh crazygames   # -> dist-web/ + trice-crazygames.zip
```

Upload `trice-crazygames.zip` as-is at [developer.crazygames.com](https://developer.crazygames.com/submit) —
3 files, ~80&nbsp;KB uncompressed (limits are 250&nbsp;MB / 1500 files total, 50&nbsp;MB initial
download). `portal/portal-crazygames.js` is already wired in ahead of the game
script and covers the full SDK: `gameplayStart/Stop` (fires the moment the
intro-splash START is tapped — the onboarding tutorial itself counts as
gameplay, satisfying their "1 click to gameplay" rule), `commercialBreak` on
**PLAY AGAIN** only (never on MENU — CrazyGames disallows ads on navigation),
`rewardedBreak` backing **CONTINUE** and **DOUBLE SCORE** (never rewards on
`adError`), and `happyTime()` on a Perfect Clear. Sitelocking is automatic once
the SDK is integrated — no extra code needed.

**Cover images** — `./assets/covers/` (regenerate with `node scripts/make-covers.mjs`,
composed from a real captured board state, no design tool needed):

| File | Size | Use |
|---|---|---|
| `cover-landscape-1920x1080.png` | 1920&times;1080 | required |
| `cover-portrait-800x1200.png` | 800&times;1200 | required |
| `cover-square-800x800.png` | 800&times;800 | required |

**Preview video** — `./assets/preview/` (regenerate with
`node scripts/make-preview-video.mjs`). Not a screen recording: a scripted ~19.5s
playthrough drives the real game through synthetic pointer events — same
technique used throughout this project's own testing — with a small greedy
solver picking moves that favor clears, so every combo/PURE/PERFECT-CLEAR/
achievement on screen actually happened. Needs a one-time, deliberately
project-external setup (`npm i -D playwright ffmpeg-static && npx playwright
install chromium`, ~280MB) — see the comment at the top of the script; kept out
of `package.json` so it doesn't weigh down every normal `npm install`.

| File | Size | Use |
|---|---|---|
| `trice-preview-landscape-1920x1080.mp4` | 1920&times;1080, 19.5s | required |
| `trice-preview-portrait-1080x1620.mp4` | 1080&times;1620, 19.5s | required |

**Social reel** — `./assets/social/trice-reel-1080x1920.mp4` (regenerate with
`node scripts/make-social-reel.mjs`, same setup as the preview video above).
True 9:16 for TikTok / Reels / Shorts, not CrazyGames' 2:3 — same scripted
playthrough technique, with a small TRICE watermark burned into the top-left
corner since a reel gets shared standalone, off any store page. Both video
scripts now share the actual recording logic from `scripts/lib/showcase-recorder.mjs`.

**Still needed for submission (not automatable here):**
- the actual form fields on the developer portal — draft copy:
  - **Title:** Trice
  - **Short description:** Fit three-square blocks onto a 6&times;6 grid, clear
    rows and columns, and chase the combo — then pick a relic and see how deep
    a Run goes.
  - **Long description:** Trice is a blocky grid-puzzle game — drag
    three-square pieces onto a 6&times;6 board, fill a full row or column to
    clear it, and keep the board from filling up. Four ways to play: Relaxed
    (no clock, take your time), Timed (a FLOW bar drains while you think —
    keep placing to stay alive), Daily Challenge (the same blocks for
    everyone, once a day — build a streak), and Run — clear stages, pick a
    permanent relic between each one, and see how deep you get before a jam
    ends it. Chain clears for combo multipliers, clear a line in a single
    color for a PURE bonus, empty the whole board for a PERFECT CLEAR. 19
    achievements, 5 block skins, 4 grid themes to unlock. No installs, no
    accounts — just one more round.
  - **Controls:** Drag a block from the tray onto the grid with your mouse or
    finger. Or tap a block to select it, then tap the grid to place it.
  - **Category:** Puzzle. **Tags:** block puzzle, grid, casual, relaxing,
    brain, combo, daily challenge, roguelike.
  - **Orientation:** Portrait (the board centers and letterboxes cleanly in a
    landscape iframe too — worth a quick look in their preview before
    finalizing).
  - Content is original, no violence/gambling/chat/UGC — comfortably under the
    PEGI 12 ceiling.

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
