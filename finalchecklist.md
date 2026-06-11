# Final Checklist — iOS App Store Release

> **For agents:** Work these items top to bottom, one at a time. Check off items by editing this
> file (`[ ]` → `[x]`) and add a one-line note under the item if you made a decision worth
> recording. Don't reorder sections — Blockers are first for a reason. Items marked **HUMAN**
> require Avery (Apple ID, physical device, App Store Connect) and cannot be done by an agent;
> stop and report when you reach one that gates your current task.

## Project orientation (read first)

- Web app lives in `www/` (plain HTML/CSS/JS, no build step). `www/app.js` is the metronome
  engine + UI; `www/exercises.js` is the practice content; `www/style.css` is the cream/red
  neumorphic theme.
- iOS wrapper is Capacitor 6. Native project: `ios/App/App.xcworkspace` (always the workspace,
  never the `.xcodeproj`, because CocoaPods).
- **After ANY edit to files in `www/`, run `npx cap sync ios`** to copy them into
  `ios/App/App/public/`. Never edit `ios/App/App/public/` directly — it's generated and
  gitignored.
- Quick web preview: `npm run serve` → http://localhost:8080/. Syntax check: `node --check www/app.js`.
- Open in Xcode: `npm run ios`.
- Bundle ID `com.achandler.scaletrainer`, team `B53MNS73SJ`, automatic signing already configured.

---

## 1. Blockers — app is broken or rejectable without these

- [ ] **Make the click play with the silent switch on.**
  WKWebView's Web Audio uses the *ambient* AVAudioSession category, which obeys the ringer
  switch. Most iPhones are in silent mode, so the metronome appears dead. Fix in
  `ios/App/App/AppDelegate.swift`, inside `didFinishLaunchingWithOptions`:
  ```swift
  import AVFoundation
  // ...
  try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
  try? AVAudioSession.sharedInstance().setActive(true)
  ```
  `.mixWithOthers` lets users play along to backing tracks/Spotify — important for a metronome.
  Verify on device: silent switch ON, click still audible.

- [ ] **Keep the screen awake while playing.**
  iOS auto-lock suspends the WebView and kills the click mid-practice. Use
  `@capacitor-community/keep-awake`:
  ```sh
  npm install @capacitor-community/keep-awake && npx cap sync ios
  ```
  In `www/app.js`, call `KeepAwake.keepAwake()` in `start()` and `KeepAwake.allowSleep()` in
  `stop()`. Access the plugin the same defensive way the existing `Haptics` object does
  (`window.Capacitor?.Plugins?.KeepAwake`, wrapped in try/catch) so the web version keeps working.
  Do NOT attempt true background audio for v1 — keep-awake is the agreed scope.

- [ ] **Recover the AudioContext after interruptions.**
  A phone call, Siri, or alarm leaves `audioCtx` in `"suspended"`/`"interrupted"` state and the
  PLAY button silently does nothing. In `www/app.js` add a `visibilitychange` (and `resume`)
  handler: if `isPlaying` and `audioCtx.state !== "running"`, call `audioCtx.resume()` and reset
  `nextNoteTime = audioCtx.currentTime + 0.05` so the scheduler doesn't burst-fire a backlog of
  clicks. Test by simulating: lock/unlock screen mid-play in Simulator.

- [ ] **Replace the default splash screen.**
  All three PNGs in `ios/App/App/Assets.xcassets/Splash.imageset/` are the identical stock
  Capacitor splash. Generate a 2732×2732 cream (`#ECEAE3`) image — ideally reusing the icon
  artwork from `tools/icon.svg` / `tools/make-icon.mjs` (there's an existing `npm run icon`
  pipeline using `@resvg/resvg-js` you can extend). Replace all three files (same image is fine;
  the set expects 1x/2x/3x entries).

- [ ] **Decide iPhone-only vs. real iPad support.**
  `TARGETED_DEVICE_FAMILY = "1,2"` in `ios/App/App.xcodeproj/project.pbxproj` means Apple
  requires iPad screenshots and will review on iPad, where the 460px single column floats in
  empty cream. **Recommended: set `TARGETED_DEVICE_FAMILY = 1;` (iPhone-only)** unless Avery says
  otherwise — it appears twice (Debug + Release), change both. iPhone-only apps still run on iPad
  in compatibility mode.

- [ ] **Unify the app name.**
  Currently three names: "Scale Trainer" (`capacitor.config.json` appName, Info.plist
  `CFBundleDisplayName`), "Metronome & Practice" (`www/index.html` `<title>`), and a stale "Y2K
  skeuomorphic" description in `package.json`. Pick one (**ask Avery if not already decided** —
  this is a product decision), then update all of: `capacitor.config.json`,
  `ios/App/App/Info.plist`, `www/index.html` title, `package.json` name/description.
  **HUMAN:** confirm the name is available in App Store Connect before settling.

## 2. Should fix — quality issues a reviewer or user will hit

- [ ] **Tap tempo: switch from `click` to `pointerdown`.**
  `click` fires on finger *release*, adding latency and jitter to the tapped tempo. In
  `www/app.js`, change `tapBtn.addEventListener("click", tapTempo)` to `"pointerdown"`. Keep the
  spacebar/keyboard path working.

- [ ] **Lock iPhone orientation to portrait.**
  In `ios/App/App/Info.plist`, reduce `UISupportedInterfaceOrientations` to
  `UIInterfaceOrientationPortrait` only. Leave the `~ipad` entry alone if iPad support was kept
  (iPad multitasking requires all orientations); delete this concern if device family became
  iPhone-only.

- [ ] **Fix stale `UIRequiredDeviceCapabilities`.**
  Info.plist lists `armv7` (obsolete template value). Change to `arm64`.

- [ ] **Migrate persistence to `@capacitor/preferences`.**
  Already in `package.json`, currently unused. WKWebView localStorage can be evicted under
  storage pressure → users lose presets. The `Store` wrapper in `www/app.js` (~line 378) was
  designed for this swap. Preferences' API is async, so: read both keys once at boot, keep a
  synchronous in-memory cache, write through on `set()`. Migrate existing localStorage data on
  first run (read localStorage → if Preferences empty, copy over). Keep the localStorage fallback
  for the plain-web case.

- [ ] **Fix preset metadata showing `…/4` always.**
  `www/app.js` ~line 445 renders `` `${preset.settings.bpm} BPM · ${preset.settings.beatsPerBar}/4` ``.
  The `/4` is meaningless (beats-per-bar isn't a time signature here). Show
  `` `${bpm} BPM · ${beatsPerBar} beats` `` or similar.

- [ ] **Add a click volume control.**
  A volume slider (0–100%) in the metronome card, feeding a master `GainNode` between the click
  gain and `audioCtx.destination` in `playClick()`. Persist it via `collectSettings()` /
  `applySettings()`. Match the existing neumorphic styling (see `.switch` / `.field` patterns in
  `www/style.css`). Also strengthens the Guideline 4.2 case.

- [ ] **VoiceOver / accessibility pass.**
  The dial SVG is `aria-hidden` (fine — `+`/`−` buttons are the accessible path). Verify:
  `playBtn` announces PLAY/STOP state changes, `tapBtn` reads sensibly ("TAP tempo"), preset
  load/delete buttons have labels (delete already does), and add `aria-live="polite"` to the BPM
  number so VoiceOver hears tempo changes. Test with Accessibility Inspector in Xcode if no
  device available.

- [ ] **Suspend the AudioContext on stop.**
  In `stop()` in `www/app.js`, call `audioCtx.suspend()` (and `resume()` in `start()`). Minor
  battery win; make sure it doesn't fight the interruption-recovery handler from section 1.

## 3. App Store Connect admin — mostly HUMAN

- [ ] **HUMAN:** Apple Developer Program membership active; register the bundle ID; create the
  app record in App Store Connect.
- [ ] Add `ITSAppUsesNonExemptEncryption` = `false` to `ios/App/App/Info.plist` (agent-doable;
  skips the export-compliance question on every upload).
- [ ] **HUMAN (agent can draft):** Privacy policy URL. Required even with zero data collection. A
  one-page static "this app collects no data, everything stays on your device" page is
  sufficient — an agent can write the HTML/markdown; Avery hosts it (GitHub Pages works).
- [ ] **HUMAN:** App Privacy questionnaire → "Data Not Collected" (true as long as no analytics
  SDKs get added — keep it that way).
- [ ] **HUMAN (agent can draft):** Description, subtitle, keywords, support URL, category
  (Music), age rating questionnaire (should come out 4+). Agents: draft copy emphasizing
  offline + practice tools, not just "metronome" (crowded keyword).
- [ ] **HUMAN:** Screenshots — 6.9" and 6.5" iPhone required (iPad 13" only if iPad support
  kept). Agent can help by serving the app at device-sized viewports for capture, but App Store
  screenshots must come from Simulator/device.
- [ ] **Guideline 4.2 awareness** (no action, context for review notes): Apple rejects thin web
  wrappers. Our case: fully offline, native haptics, native audio session handling, keep-awake,
  app-like UI. If the reviewer questions it, the review notes should list these native
  integrations.

## 4. Device verification — HUMAN with physical iPhone

Run after sections 1–2 are done and synced (`npx cap sync ios`, then build from Xcode).

- [ ] Audio timing is steady at 40, 120, 240 BPM with sixteenth subdivisions (listen for ~60s each).
- [ ] Silent switch ON → click still audible. Volume buttons adjust it.
- [ ] Screen stays awake while playing; auto-locks normally when stopped.
- [ ] Haptics fire on the beat and feel synced to audio.
- [ ] Interruptions: receive a call mid-play, invoke Siri, plug/unplug headphones → app recovers,
  PLAY works after.
- [ ] Bluetooth headphones: click will lag slightly (inherent BT latency) — confirm it's usable
  and haptics/visuals don't feel broken alongside it.
- [ ] Airplane mode, cold start: everything works offline.
- [ ] Safe areas on a notched/Dynamic Island device: no content under the notch, floating
  transport button clears the home indicator.
- [ ] Smallest device (SE / mini): layout holds (there's a 380px media query in `style.css`).
- [ ] Kill the app, relaunch: BPM/settings/presets restore.
- [ ] Dial drag feels right (no scroll fighting, knob tracks finger).
- [ ] Practice tab: all four instruments render, search works, tab diagrams legible.

## 5. Ship

- [ ] **HUMAN:** Bump `MARKETING_VERSION` if needed (currently 1.0), archive in Xcode
  (Product → Archive), upload to App Store Connect.
- [ ] **HUMAN:** TestFlight build to self + ideally one other musician; soak for a few days of
  real practice sessions.
- [ ] **HUMAN:** Submit for review. If rejected under 4.2, respond citing the native
  integrations list from section 3.

---

## Log

Agents: append dated notes here as items complete (what changed, files touched, anything the
next agent should know).

- 2026-06-11 — Checklist created from full codebase review. State at creation: web app complete
  and synced, icon done, signing configured; nothing in sections 1–5 done yet.
