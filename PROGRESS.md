# Scale Trainer — iOS + Redesign Progress Log

> Persistent checklist so work can resume after any interruption (rate limit, power loss, lost context).
> Plan file: `~/.claude/plans/i-would-like-to-zesty-stream.md`
> Last updated: 2026-06-03 — build complete; only manual Xcode signing/run remains

## Goal
1. Ship as an iOS App Store app via **Capacitor** wrapper.
2. Redesign into a **90s/Y2K skeuomorphic** look (pendulum metronome, LCD readout, glossy chrome).
3. Add features: **tap tempo**, **haptic feedback**, **save settings / presets**.

## Decisions locked
- Capacitor (not native rewrite). No SEO impact; review-safe with local asset bundling + native haptics.
- Web assets live in `www/` (Capacitor `webDir`).
- DSEG font bundled locally at `www/assets/fonts/` for offline LCD readout.

---

## Checklist

### 1. Restructure into www/  — ✅ DONE
- [x] Create `www/` and move `index.html`, `app.js`, `scales.js`, `style.css`
- [x] Create `www/assets/` (+ `www/assets/fonts/`)
- [x] Delete stale `scale-trainer.zip`
- [x] Downloaded `www/assets/fonts/DSEG7Classic-Bold.woff2` (LCD font)

### 2. Y2K skeuomorphic redesign  — ✅ DONE (pending browser verify)
- [x] Rewrite `www/style.css` palette (`:root`) to wood/chrome/LCD-green
- [x] Pendulum metronome body markup in `www/index.html`
- [x] Seven-segment LCD BPM readout (DSEG font, ghost digits)
- [x] Glossy Aqua play button + chrome selects + physical toggle switches
- [x] Brushed-metal panels, gloss highlights, shadows
- [x] Tap targets >=44px, mobile-safe (safe-area insets added)

### 3. Features (www/app.js)  — ✅ DONE (pending browser verify)
- [x] Tap tempo button -> setBpm() (avg of up to 6 taps, 2s reset)
- [x] Haptics abstraction (Capacitor Haptics + navigator.vibrate fallback), fired on main beat, UI toggle
- [x] Persist live settings + restore on load (localStorage, Store wrapper)
- [x] Named presets: save / load / delete UI
- NOTE: used localStorage (reliable in WKWebView) rather than @capacitor/preferences for simplicity; Store wrapper allows swap later.

### 4. Pendulum animation wired to beat  — ✅ DONE (pending browser verify)
- [x] Swing driven from existing beat callback in scheduleNote() (swingPendulum)

### 5. Capacitor + iOS setup  — ✅ DONE (Xcode signing left to user)
- [x] `package.json` + installed @capacitor/core,cli,ios,haptics,preferences (v6)
- [x] `capacitor.config.json` (webDir: www, appId com.achandler.scaletrainer)
- [x] Installed CocoaPods 1.16.2 via Homebrew (was missing)
- [x] `npx cap add ios` (ios/ project scaffolded, pods installed)
- [x] `npx cap sync` (assets + 2 plugins: haptics, preferences)
- [ ] USER ACTION: open ios/App/App.xcworkspace in Xcode, set Team/signing + bundle id, run on device
- Note: .gitignore updated for node_modules/, Pods/, public/

### 6. Verification  — 🟡 web checked statically + opened; iOS device run = user
- [x] All assets return HTTP 200 (index, css, js, scales, DSEG font)
- [x] `node --check` passes on app.js and scales.js
- [x] Opened in Safari at http://localhost:8137/ for visual review
- [ ] USER: confirm in browser — metronome timing, pendulum sync, tap tempo, presets persist across refresh, scales/tab, speed trainer
- [ ] USER: iOS — open Xcode workspace, run on device; confirm audio + haptics + airplane-mode (offline)

---

## How to resume / run after an interruption
- **Run the web app:** `npm run serve` then open http://localhost:8080/ (or the
  already-running server on :8137).
- **Re-sync to iOS after web edits:** `npx cap sync ios`
- **Open the iOS project:** `npm run ios` (opens `ios/App/App.xcworkspace` in Xcode),
  then set Signing Team + bundle id, pick a device, press Run.
- **Everything is built** except the manual Xcode signing/run step, which requires the
  Apple Developer account and a physical device for haptics.

## Round 2 — redesign from user's inspo (~/dev/metronome/inspo/)  — ✅ DONE (pending visual sign-off)
Direction: warm cream base, mono ink + single RED accent, soft neumorphism, bold type
+ pixel/dot-matrix labels (Pixelify Sans). Dropped the Y2K wood/chrome/green-LCD look.
- [x] Hero = circular hairline tempo **dial** (300° arc, gap at bottom): draggable red knob
  sets BPM, +/- nudge buttons, big bold BPM number + Italian tempo marking + beat pulse in center
- [x] Red play button (PLAY/STOP), neumorphic TAP pad, pill toggle switches, dotted beat detents
- [x] Cream neumorphic cards, minimal recessed selects/inputs, pixel-font eyebrows/labels/tags
- [x] Scales & speed-trainer restyled to match; guitar tab now light (not green LCD)
- [x] Swapped LCD font → Pixelify Sans (`www/assets/fonts/Pixel.woff2`); removed DSEG7 file
- [x] app.js: removed pendulum/slider; added dial geometry + pointer-drag + beat pulse + tempo names
- [x] `node --check` clean, no stray refs, `npx cap sync ios` clean, reloaded in Safari
- [ ] USER: visual sign-off in Safari (http://localhost:8137/?v=2)

## Notes / blockers
- CocoaPods was missing; installed via Homebrew (1.16.2). No sudo needed.
- Persistence uses localStorage (reliable in WKWebView) via a `Store` wrapper, not
  @capacitor/preferences — can swap later if desired.
- App icon / splash are still Capacitor defaults — replace before App Store submission.
