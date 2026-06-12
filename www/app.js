// ===================== Metronome engine =====================
// Uses the Web Audio API with look-ahead scheduling for rock-solid timing.

let audioCtx = null;
let isPlaying = false;
let nextNoteTime = 0;      // when the next note is due (in audioCtx time)
let currentBeat = 0;       // beat within the bar
let currentSub = 0;        // subdivision within the beat
let schedulerTimer = null;

const lookahead = 25;          // ms, how often the scheduler runs
const scheduleAheadTime = 0.1; // seconds of audio to schedule ahead

// Speed-trainer state
let beatsSinceRamp = 0;
let rampStartTime = 0;

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const bpmNumber = $("bpmNumber");
const beatDots = $("beatDots");
const playBtn = $("playBtn");
const rampStatus = $("rampStatus");
const tapBtn = $("tapBtn");
const beatPulse = $("beatPulse");
const tempoMark = $("tempoMark");
const metroFab = $("metroFab");
const metroFabGlyph = $("metroFabGlyph");
const metroFabBpm = $("metroFabBpm");

let bpm = 100;

function setBpm(v) {
  bpm = Math.min(240, Math.max(40, Math.round(v)));
  bpmNumber.textContent = bpm;
  bpmNumber.setAttribute("aria-label", bpm + " BPM");
  metroFabBpm.textContent = bpm;
  tempoMark.textContent = tempoName(bpm);
  drawDial();
}

// Italian tempo markings for the center label
function tempoName(b) {
  if (b <= 60)  return "Largo";
  if (b <= 76)  return "Adagio";
  if (b <= 100) return "Andante";
  if (b <= 120) return "Moderato";
  if (b <= 156) return "Allegro";
  if (b <= 176) return "Vivace";
  return "Presto";
}

// ===================== Tempo dial =====================
// A circular hairline dial: 300° sweep with a gap at the bottom. The red knob can
// be dragged around the arc to set the tempo; +/- buttons nudge by one.
const dial = $("dial");
const dialWrap = $("dialWrap");
const dialTrack = $("dialTrack");
const dialProg = $("dialProg");
const dialKnob = $("dialKnob");
const DIAL = { cx: 120, cy: 120, r: 100, a0: -150, a1: 150, min: 40, max: 240 };

function polar(angleDeg) {
  const t = (angleDeg * Math.PI) / 180;
  return [DIAL.cx + DIAL.r * Math.sin(t), DIAL.cy - DIAL.r * Math.cos(t)];
}
function bpmToAngle(b) {
  return DIAL.a0 + ((b - DIAL.min) / (DIAL.max - DIAL.min)) * (DIAL.a1 - DIAL.a0);
}
function arcPath(fromA, toA) {
  const [x0, y0] = polar(fromA);
  const [x1, y1] = polar(toA);
  const large = toA - fromA > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${DIAL.r} ${DIAL.r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function drawDial() {
  if (!dial) return;
  dialTrack.setAttribute("d", arcPath(DIAL.a0, DIAL.a1));
  const a = bpmToAngle(bpm);
  dialProg.setAttribute("d", arcPath(DIAL.a0, a));
  const [kx, ky] = polar(a);
  dialKnob.setAttribute("cx", kx.toFixed(2));
  dialKnob.setAttribute("cy", ky.toFixed(2));
}

function bpmFromPoint(clientX, clientY) {
  const rect = dial.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let t = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI; // 0 = top, cw +
  if (t > DIAL.a1) t = DIAL.a1;
  if (t < DIAL.a0) t = DIAL.a0;
  return DIAL.min + ((t - DIAL.a0) / (DIAL.a1 - DIAL.a0)) * (DIAL.max - DIAL.min);
}

let dragging = false;
function dialPointerDown(e) {
  dragging = true;
  dialWrap.classList.add("dragging");
  dial.setPointerCapture && dial.setPointerCapture(e.pointerId);
  setBpm(bpmFromPoint(e.clientX, e.clientY));
  saveSettings();
}
function dialPointerMove(e) {
  if (!dragging) return;
  setBpm(bpmFromPoint(e.clientX, e.clientY));
}
function dialPointerUp() {
  if (!dragging) return;
  dragging = false;
  dialWrap.classList.remove("dragging");
  saveSettings();
}
dial.addEventListener("pointerdown", dialPointerDown);
dial.addEventListener("pointermove", dialPointerMove);
dial.addEventListener("pointerup", dialPointerUp);
dial.addEventListener("pointercancel", dialPointerUp);

$("bpmUp").addEventListener("click", () => { setBpm(bpm + 1); saveSettings(); });
$("bpmDown").addEventListener("click", () => { setBpm(bpm - 1); saveSettings(); });
drawDial();

// ---- Beat dots ----
function buildDots() {
  const beats = +$("beatsPerBar").value;
  beatDots.innerHTML = "";
  for (let i = 0; i < beats; i++) {
    const d = document.createElement("div");
    d.className = "dot" + (i === 0 ? " accent" : "");
    beatDots.appendChild(d);
  }
}
$("beatsPerBar").addEventListener("change", () => { buildDots(); saveSettings(); });
buildDots();

function flashDot(beat) {
  const dots = beatDots.children;
  for (const d of dots) d.classList.remove("active");
  if (dots[beat]) dots[beat].classList.add("active");
}

// ---- Beat pulse (center of the dial, synced to the audible beat) ----
function pulse(isAccent) {
  if (!beatPulse) return;
  beatPulse.classList.remove("hit", "accent");
  void beatPulse.offsetWidth;          // restart the CSS animation
  beatPulse.classList.add("hit");
  if (isAccent) beatPulse.classList.add("accent");
}

// ---- Master volume ----
// A single GainNode between every click and the speakers. 0–100% slider maps to 0–1 gain.
let masterGain = null;
let clickVolume = 0.8;
function ensureMasterGain() {
  if (!masterGain && audioCtx) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = clickVolume;
    masterGain.connect(audioCtx.destination);
  }
}
function setVolume(pct) {
  clickVolume = Math.min(1, Math.max(0, pct / 100));
  if (masterGain) masterGain.gain.value = clickVolume;
  const v = Math.round(clickVolume * 100);
  $("volumeVal").textContent = v + "%";
  $("volume").setAttribute("aria-valuetext", v + " percent");
}
$("volume").addEventListener("input", (e) => { setVolume(+e.target.value); saveSettings(); });

// ---- Click sound ----
function playClick(time, isAccent, isMainBeat) {
  ensureMasterGain();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(masterGain || audioCtx.destination);

  // Accent = high pitch, main beat = mid, subdivision = soft/low
  let freq = 800;
  let vol = 0.6;
  if (isAccent && $("accent").checked) { freq = 1500; vol = 0.9; }
  else if (isMainBeat) { freq = 1000; vol = 0.7; }
  else { freq = 600; vol = 0.35; }

  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  osc.start(time);
  osc.stop(time + 0.05);
}

// ---- Scheduling ----
function nextNote() {
  const sub = +$("subdivision").value;
  const secondsPerBeat = 60.0 / bpm;
  nextNoteTime += secondsPerBeat / sub;

  currentSub++;
  if (currentSub >= sub) {
    currentSub = 0;
    const beats = +$("beatsPerBar").value;
    currentBeat = (currentBeat + 1) % beats;
    handleRamp();
  }
}

function scheduleNote(time) {
  const isMainBeat = currentSub === 0;
  const isAccent = isMainBeat && currentBeat === 0;
  playClick(time, isAccent, isMainBeat);

  if (isMainBeat) {
    const beat = currentBeat;
    const delay = (time - audioCtx.currentTime) * 1000;
    // Drive every beat-synced visual/haptic from this single callback.
    setTimeout(() => {
      if (!isPlaying) return;
      flashDot(beat);
      pulse(beat === 0 && $("accent").checked);
      Haptics.beat(beat === 0 && $("accent").checked);
    }, Math.max(0, delay));
  }
}

function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(nextNoteTime);
    nextNote();
  }
}

// ===================== Haptics =====================
// Capacitor Haptics on iOS/Android native; navigator.vibrate as a web fallback
// (note: iOS Safari ignores navigator.vibrate, which is why the native plugin matters).
const Haptics = {
  on() { return $("haptics").checked; },
  beat(accent) {
    if (!this.on()) return;
    const cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    if (cap) {
      try { cap.impact({ style: accent ? "MEDIUM" : "LIGHT" }); } catch (e) {}
    } else if (navigator.vibrate) {
      navigator.vibrate(accent ? 18 : 9);
    }
  }
};
$("haptics").addEventListener("change", () => { Haptics.beat(true); saveSettings(); });

// ===================== Keep awake =====================
// Stop iOS auto-lock from suspending the WebView (and killing the click) mid-practice.
// Defensive like Haptics above so the plain-web build is unaffected.
const Wake = {
  plugin() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake; },
  on()  { const p = this.plugin(); if (p) { try { p.keepAwake(); } catch (e) {} } },
  off() { const p = this.plugin(); if (p) { try { p.allowSleep(); } catch (e) {} } }
};

// ===================== Tap tempo =====================
let tapTimes = [];
function tapTempo() {
  const now = performance.now();
  if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
  tapTimes.push(now);
  if (tapTimes.length > 6) tapTimes.shift();

  if (tapTimes.length >= 2) {
    let sum = 0;
    for (let i = 1; i < tapTimes.length; i++) sum += tapTimes[i] - tapTimes[i - 1];
    const avgMs = sum / (tapTimes.length - 1);
    if (avgMs > 0) { setBpm(60000 / avgMs); saveSettings(); }
  }
  tapBtn.classList.add("flash");
  setTimeout(() => tapBtn.classList.remove("flash"), 90);
  Haptics.beat(false);
}
// pointerdown (not click) so tempo registers on finger contact, not release —
// lower latency and far less jitter in the tapped interval.
tapBtn.addEventListener("pointerdown", tapTempo);

// ===================== Speed trainer =====================
function rampOn() { return $("rampEnabled").checked; }

function handleRamp() {
  if (!rampOn()) return;
  const unit = $("rampUnit").value;
  if (unit !== "bars") return;

  // Only count completed bars: a bar completes when we wrap back to beat 0
  if (currentBeat === 0) {
    beatsSinceRamp++;
    const every = Math.max(1, +$("rampEvery").value);
    if (beatsSinceRamp >= every) {
      beatsSinceRamp = 0;
      applyRampStep();
    }
  }
}

function applyRampStep() {
  const amount = +$("rampAmount").value;
  const max = +$("rampMax").value;
  if (bpm >= max) {
    rampStatus.textContent = `🎯 Reached target ${max} BPM — holding steady.`;
    return;
  }
  setBpm(Math.min(max, bpm + amount));
  updateRampStatus();
}

function updateRampStatus() {
  if (!rampOn() || !isPlaying) { rampStatus.textContent = ""; return; }
  const max = +$("rampMax").value;
  const unit = $("rampUnit").value;
  const every = $("rampEvery").value;
  if (bpm >= max) {
    rampStatus.textContent = `🎯 Reached target ${max} BPM — holding steady.`;
  } else {
    rampStatus.textContent = `Ramping: +${$("rampAmount").value} BPM every ${every} ${unit} → up to ${max} BPM. Now at ${bpm}.`;
  }
}

// Seconds-based ramp runs on its own interval
let secondsTimer = null;
function startSecondsRamp() {
  stopSecondsRamp();
  if (!rampOn() || $("rampUnit").value !== "seconds") return;
  const every = Math.max(1, +$("rampEvery").value);
  secondsTimer = setInterval(() => {
    if (!isPlaying) return;
    applyRampStep();
  }, every * 1000);
}
function stopSecondsRamp() {
  if (secondsTimer) { clearInterval(secondsTimer); secondsTimer = null; }
}

// ---- Ramp UI enable/disable ----
const rampGrid = $("rampGrid");
$("rampEnabled").addEventListener("change", () => {
  rampGrid.classList.toggle("enabled", rampOn());
  updateRampStatus();
  if (isPlaying) startSecondsRamp();
  saveSettings();
});
["rampUnit","rampEvery","rampAmount","rampMax","subdivision"].forEach(id =>
  $(id).addEventListener("change", () => { if (isPlaying) startSecondsRamp(); updateRampStatus(); saveSettings(); })
);
$("accent").addEventListener("change", saveSettings);

// ===================== iOS silent-switch workaround =====================
// WKWebView/Safari give a Web Audio-only page the "ambient" audio session, which
// the hardware mute switch silences — even though AppDelegate sets .playback.
// Keeping a looping silent <audio> element playing promotes WebKit's session to
// media playback (mute switch ignored), and the oscillator clicks ride along.
// iOS-only: elsewhere it would just flag the tab as "playing audio" for nothing.
const SilentSwitch = {
  isIOS: /iP(hone|ad|od)/.test(navigator.userAgent) ||
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  el: null,
  engage() {
    if (!this.isIOS) return;
    if (!this.el) {
      this.el = new Audio("silence.wav");
      this.el.loop = true;
      this.el.setAttribute("playsinline", "");
      // Must stay unmuted at nonzero volume: WebKit only treats audible media
      // elements as playback-worthy. The file itself is silence, so no sound.
    }
    this.el.play().catch(() => {});
  },
  release() {
    if (this.el) this.el.pause();
  }
};

// ===================== Transport =====================
// Reflect play/stop state onto every control (main button + floating button).
function reflectPlaying() {
  playBtn.textContent = isPlaying ? "STOP" : "PLAY";
  playBtn.classList.toggle("playing", isPlaying);
  metroFabGlyph.textContent = isPlaying ? "■" : "▶";
  metroFab.classList.toggle("playing", isPlaying);
}

function start() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  isPlaying = true;
  currentBeat = 0;
  currentSub = 0;
  beatsSinceRamp = 0;
  nextNoteTime = audioCtx.currentTime + 0.05;
  schedulerTimer = setInterval(scheduler, lookahead);
  startSecondsRamp();
  updateRampStatus();
  Wake.on();
  SilentSwitch.engage();

  reflectPlaying();
}

function stop() {
  isPlaying = false;
  clearInterval(schedulerTimer);
  stopSecondsRamp();
  for (const d of beatDots.children) d.classList.remove("active");
  rampStatus.textContent = "";
  Wake.off();
  SilentSwitch.release();
  // Idle the audio hardware between sessions (minor battery win). start() resumes it,
  // and the interruption-recovery handler is gated on isPlaying so it won't fight this.
  if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
  reflectPlaying();
}

playBtn.addEventListener("click", () => isPlaying ? stop() : start());
metroFab.addEventListener("click", () => isPlaying ? stop() : start());

// Show the floating transport only while the metronome card is off-screen.
if ("IntersectionObserver" in window) {
  const metroCard = $("metronomeCard");
  const fabObserver = new IntersectionObserver(
    ([entry]) => metroFab.classList.toggle("visible", !entry.isIntersecting),
    { threshold: 0 }
  );
  fabObserver.observe(metroCard);
}

// Spacebar toggles play/stop
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
    e.preventDefault();
    isPlaying ? stop() : start();
  }
});

// Recover after interruptions (phone call, Siri, alarm, screen lock). These leave
// audioCtx "suspended"/"interrupted" so the scheduler runs but produces no sound.
// Resume it and rebase nextNoteTime so we don't burst-fire a backlog of clicks.
function recoverAudio() {
  if (!isPlaying || !audioCtx) return;
  // Interruptions also pause the silent keep-playback loop; restart it first so
  // the session is promoted before the clicks resume.
  SilentSwitch.engage();
  if (audioCtx.state !== "running") {
    audioCtx.resume().then(() => {
      nextNoteTime = audioCtx.currentTime + 0.05;
    }).catch(() => {});
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") recoverAudio();
});
window.addEventListener("focus", recoverAudio);

// ===================== Persistence & presets =====================
// WKWebView localStorage can be evicted under storage pressure, losing presets. On
// native we persist to @capacitor/preferences (durable) behind a synchronous in-memory
// cache so the rest of the app stays sync; localStorage is the source of truth for the
// plain-web build and a mirror/fallback everywhere else.
const SETTINGS_KEY = "st_settings_v1";
const PRESETS_KEY = "st_presets_v1";
const Prefs = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
const cache = {};

const Store = {
  get(key) {
    if (key in cache) return cache[key];
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  },
  set(key, val) {
    cache[key] = val;
    const json = JSON.stringify(val);
    try { localStorage.setItem(key, json); } catch (e) {}        // web fallback / mirror
    const p = Prefs();
    if (p) { try { p.set({ key, value: json }); } catch (e) {} } // durable native store
  }
};

// Load durable values into the cache before first render. On native first run
// (Preferences empty), migrate any existing localStorage data over.
async function initStore() {
  const p = Prefs();
  if (!p) return; // plain web: localStorage is the source of truth, nothing to preload
  for (const key of [SETTINGS_KEY, PRESETS_KEY]) {
    try {
      const { value } = await p.get({ key });
      if (value != null) {
        cache[key] = JSON.parse(value);
      } else {
        const legacy = localStorage.getItem(key);
        if (legacy != null) {
          cache[key] = JSON.parse(legacy);
          try { await p.set({ key, value: legacy }); } catch (e) {}
        }
      }
    } catch (e) {}
  }
}

function collectSettings() {
  return {
    bpm,
    beatsPerBar: $("beatsPerBar").value,
    subdivision: $("subdivision").value,
    volume: $("volume").value,
    accent: $("accent").checked,
    haptics: $("haptics").checked,
    rampEnabled: $("rampEnabled").checked,
    rampAmount: $("rampAmount").value,
    rampEvery: $("rampEvery").value,
    rampUnit: $("rampUnit").value,
    rampMax: $("rampMax").value
  };
}

function applySettings(s) {
  if (!s) return;
  if (s.bpm) setBpm(s.bpm);
  if (s.beatsPerBar) $("beatsPerBar").value = s.beatsPerBar;
  if (s.subdivision) $("subdivision").value = s.subdivision;
  if (s.volume != null) { $("volume").value = s.volume; setVolume(+s.volume); }
  $("accent").checked = !!s.accent;
  $("haptics").checked = !!s.haptics;
  $("rampEnabled").checked = !!s.rampEnabled;
  if (s.rampAmount != null) $("rampAmount").value = s.rampAmount;
  if (s.rampEvery != null) $("rampEvery").value = s.rampEvery;
  if (s.rampUnit) $("rampUnit").value = s.rampUnit;
  if (s.rampMax != null) $("rampMax").value = s.rampMax;
  buildDots();
  rampGrid.classList.toggle("enabled", rampOn());
  updateRampStatus();
}

let restoring = false;
function saveSettings() {
  if (restoring) return;        // don't thrash storage while applying a preset
  Store.set(SETTINGS_KEY, collectSettings());
}

// ---- Named presets ----
function getPresets() { return Store.get(PRESETS_KEY) || []; }
function setPresets(arr) { Store.set(PRESETS_KEY, arr); }

function renderPresets() {
  const list = $("presetList");
  const presets = getPresets();
  list.innerHTML = "";
  if (!presets.length) {
    const p = document.createElement("p");
    p.className = "preset-empty";
    p.textContent = "No saved presets yet — name one above and hit Save.";
    list.appendChild(p);
    return;
  }
  presets.forEach((preset, idx) => {
    const item = document.createElement("div");
    item.className = "preset-item";

    const load = document.createElement("button");
    load.className = "p-load";
    load.innerHTML = `<span class="p-name"></span> <span class="p-meta"></span>`;
    load.querySelector(".p-name").textContent = preset.name;
    load.querySelector(".p-meta").textContent =
      `${preset.settings.bpm} BPM · ${preset.settings.beatsPerBar} beats`;
    load.addEventListener("click", () => {
      restoring = true;
      applySettings(preset.settings);
      restoring = false;
      saveSettings();
    });

    const del = document.createElement("button");
    del.className = "p-del";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete preset ${preset.name}`);
    del.addEventListener("click", () => {
      const arr = getPresets();
      arr.splice(idx, 1);
      setPresets(arr);
      renderPresets();
    });

    item.appendChild(load);
    item.appendChild(del);
    list.appendChild(item);
  });
}

$("presetSave").addEventListener("click", () => {
  const input = $("presetName");
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  const arr = getPresets();
  const settings = collectSettings();
  const existing = arr.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing >= 0) arr[existing] = { name, settings };
  else arr.push({ name, settings });
  setPresets(arr);
  input.value = "";
  renderPresets();
});
$("presetName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("presetSave").click(); }
});

// ===================== Pitch helpers =====================
const NOTE_PC = {
  "C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,
  "G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11
};

// Fretted-instrument tunings. Strings indexed 1 (highest) .. count (lowest).
// open = open-string MIDI note, label = string letter, span = fret reach.
const GUITAR_TUNING = {
  open:  { 1:64, 2:59, 3:55, 4:50, 5:45, 6:40 }, // e B G D A E
  label: { 1:"e", 2:"B", 3:"G", 4:"D", 5:"A", 6:"E" },
  count: 6, span: 4
};
const BASS_TUNING = {
  open:  { 1:43, 2:38, 3:33, 4:28 }, // G D A E
  label: { 1:"G", 2:"D", 3:"A", 4:"E" },
  count: 4, span: 4
};

// ===================== Tab / fretboard generation =====================
// Build an in-position scale anchored on the root (lowest note = root on the
// lowest string). We walk EVERY consecutive scale tone going up, staying on a
// string until the next note exceeds the hand span, then shifting to the next
// string. This guarantees no scale degree is skipped.
function buildStringTab(scale, tuning) {
  const lo = tuning.count;                                  // lowest string index
  const rootPc = NOTE_PC[scale.root];
  const anchor = (rootPc - (tuning.open[lo] % 12) + 12) % 12; // root fret on lowest string
  const posHi = anchor + tuning.span;                      // reach incl. stretch

  // Interval steps (in semitones) between consecutive scale tones, cyclic, summing to 12.
  const pcs = scale.notes.map(n => NOTE_PC[n]);
  const steps = pcs.map((p, i) =>
    ((pcs[(i + 1) % pcs.length] - p) + 12) % 12 || 12
  );

  // Start on the root, lowest string, then climb the scale across the neck.
  const seq = [{ s: lo, fret: anchor, midi: tuning.open[lo] + anchor, pc: rootPc }];
  let curString = lo;
  let midi = tuning.open[lo] + anchor;
  let i = 0;
  while (seq.length < 40) {
    midi += steps[i % steps.length];
    i++;
    let s = curString;
    let fret = midi - tuning.open[s];
    while (fret > posHi && s > 1) { s--; fret = midi - tuning.open[s]; }
    if (fret > posHi || fret < 0) break; // ran off the top of the neck
    curString = s;
    seq.push({ s, fret, midi, pc: midi % 12 });
  }

  // Render one tab line per string. Each note is one column; roots marked with '*'.
  const lines = {};
  for (let s = 1; s <= tuning.count; s++) lines[s] = "";
  seq.forEach(n => {
    for (let s = 1; s <= tuning.count; s++) {
      if (s === n.s) {
        const isRoot = n.pc === rootPc;
        const cell = String(n.fret).padStart(2, "-");
        lines[s] += "-" + cell + (isRoot ? "*" : "-");
      } else {
        lines[s] += "----";
      }
    }
  });

  let tab = "";
  for (let s = 1; s <= tuning.count; s++) tab += `${tuning.label[s]}|${lines[s]}-|\n`;

  const posLabel = anchor === 0 ? "open position" : `frets ${anchor}–${posHi}`;
  return { tab: tab.trimEnd(), posLabel };
}

// ===================== Piano keyboard generation =====================
// One octave, root .. root (inclusive of the upper octave). Scale tones are
// highlighted; right-hand fingerings (if supplied) print under the white keys.
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];          // C D E F G A B
const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }; // pc -> black key just above it

function buildKeyboard(scale) {
  const rootPc = NOTE_PC[scale.root];
  const scalePcs = scale.notes.map(n => NOTE_PC[n]);
  // map pitch-class -> finger label (best effort; first occurrence wins)
  const fingerByPc = {};
  if (scale.fingering) {
    scalePcs.forEach((pc, i) => {
      if (fingerByPc[pc] === undefined && scale.fingering[i] !== undefined) {
        fingerByPc[pc] = scale.fingering[i];
      }
    });
  }

  const inScale = (pc) => scalePcs.includes(pc);

  // Walk one octave of white keys starting at the root's nearest white key.
  // (Roots that are black keys still highlight correctly via the black overlay.)
  const startWhiteIdx = WHITE_PCS.indexOf(rootPc) >= 0
    ? WHITE_PCS.indexOf(rootPc)
    : 0; // non-white root -> start the diagram at C for a stable layout

  let keysHTML = "";
  for (let w = 0; w <= 7; w++) {                   // 7 white keys + octave key
    const pc = WHITE_PCS[(startWhiteIdx + w) % 7];
    const on = inScale(pc);
    const isRoot = pc === rootPc;
    const finger = on && fingerByPc[pc] !== undefined ? fingerByPc[pc] : "";
    keysHTML += `<span class="key white${on ? " on" : ""}${isRoot ? " root" : ""}">`
      + (finger ? `<span class="key-finger">${finger}</span>` : "")
      + `</span>`;

    // black key sitting to the upper-right of this white key (not after the octave key)
    if (w < 7 && BLACK_AFTER[pc] !== undefined) {
      const bpc = BLACK_AFTER[pc];
      const bon = inScale(bpc);
      const bRoot = bpc === rootPc;
      keysHTML += `<span class="key black${bon ? " on" : ""}${bRoot ? " root" : ""}"></span>`;
    }
  }
  return `<div class="keyboard">${keysHTML}</div>`;
}

// ===================== Drum notation generation =====================
function buildDrumExercise(ex) {
  if (ex.type === "groove") {
    let grid = "";
    ex.lanes.forEach(l => { grid += `${l.name} |${l.hits}|\n`; });
    return `
      <div class="scale-meta"><b>Pattern</b> — x = hi-hat/cymbal, o = snare/kick, · = rest. Read left to right.</div>
      <pre class="tab">${grid.trimEnd()}</pre>`;
  }
  // rudiment: render the sticking as chips. Flam/drag tokens get a grace marker.
  const chips = ex.sticking.map(tok => {
    let grace = "", hand = tok;
    if (tok[0] === "f") { grace = "♪"; hand = tok.slice(1); }   // flam grace note
    else if (tok[0] === "d") { grace = "♪♪"; hand = tok.slice(1); } // drag grace notes
    const cls = hand === "R" ? "chip stick r" : "chip stick l";
    return `<span class="${cls}">${grace ? `<sup>${grace}</sup>` : ""}${hand}</span>`;
  }).join("");
  return `
    <div class="scale-meta"><b>Sticking</b> — R = right hand, L = left hand${ex.sticking.some(t => t[0] === "f" || t[0] === "d") ? " (♪ = grace note)" : ""}.</div>
    <div class="pattern-row sticking-row">${chips}</div>`;
}

// ===================== Exercise body renderers =====================
// Each renderer returns the inner HTML of a .scale-body for one exercise.
const RENDERERS = {
  string(ex, instrument) {
    const tuning = instrument === "bass" ? BASS_TUNING : GUITAR_TUNING;
    const stepChips = ex.pattern.map(p => {
      const label = p === "1.5" ? "1½" : p;
      return `<span class="chip step">${label}</span>`;
    }).join('<span class="chip" style="border:none;background:none;padding:2px">→</span>');
    const degChips = ex.degrees.map(d => `<span class="chip">${d}</span>`).join("");
    const noteChips = ex.notes.map(n => `<span class="chip">${n}</span>`).join("");
    const { tab, posLabel } = buildStringTab(ex, tuning);
    const lowLabel = tuning.label[tuning.count];
    const hiLabel = tuning.label[1];
    return `
      <p>${ex.desc}</p>
      <div class="scale-meta"><b>Degrees</b></div>
      <div class="pattern-row">${degChips}</div>
      <div class="scale-meta"><b>Step pattern</b> (W=whole, H=half, 1½=aug 2nd)</div>
      <div class="pattern-row">${stepChips}</div>
      <div class="scale-meta"><b>Example</b> starting on ${ex.root}</div>
      <div class="pattern-row">${noteChips}</div>
      <div class="scale-meta"><b>Practice position</b> — ${posLabel}, full scale ascending across all ${tuning.count} strings starting on the root (<span class="root-mark">*</span> = root). Read low ${lowLabel} (bottom) to high ${hiLabel} (top).</div>
      <pre class="tab">${tab}</pre>`;
  },
  keys(ex) {
    const stepChips = ex.pattern.map(p => {
      const label = p === "1.5" ? "1½" : p;
      return `<span class="chip step">${label}</span>`;
    }).join('<span class="chip" style="border:none;background:none;padding:2px">→</span>');
    const noteChips = ex.notes.map((n, i) => {
      const f = ex.fingering && ex.fingering[i] ? `<sup>${ex.fingering[i]}</sup>` : "";
      return `<span class="chip">${n}${f}</span>`;
    }).join("");
    const fingerNote = ex.fingering
      ? ` Superscripts and the keyboard show the suggested right-hand fingering (1 = thumb).`
      : "";
    return `
      <p>${ex.desc}</p>
      ${buildKeyboard(ex)}
      <div class="scale-meta"><b>Notes</b> (root <span class="root-mark">●</span>)${fingerNote}</div>
      <div class="pattern-row">${noteChips}</div>
      <div class="scale-meta"><b>Step pattern</b> (W=whole, H=half, 1½=aug 2nd)</div>
      <div class="pattern-row">${stepChips}</div>`;
  },
  drum(ex) {
    return `
      <p>${ex.desc}</p>
      ${buildDrumExercise(ex)}`;
  }
};

// ===================== Exercises UI =====================
const scaleList = $("scaleList");
let currentInstrument = "guitar";

function renderExercises(filter = "") {
  scaleList.innerHTML = "";
  const inst = INSTRUMENTS[currentInstrument];
  const f = filter.trim().toLowerCase();
  const shown = inst.exercises.filter(ex =>
    !f || ex.name.toLowerCase().includes(f) || (ex.tag || "").toLowerCase().includes(f)
  );
  if (!shown.length) {
    // Build with textContent so the user's search text can't inject markup.
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = `No ${inst.label.toLowerCase()} exercises match "${filter}".`;
    scaleList.appendChild(p);
    return;
  }
  const render = RENDERERS[inst.kind];
  shown.forEach((ex) => {
    const item = document.createElement("div");
    item.className = "scale-item";

    const meta = ex.notes ? `${ex.tag} · ${ex.notes.length} notes` : ex.tag;
    item.innerHTML = `
      <div class="scale-head">
        <span class="scale-name">${ex.name}</span>
        <span class="scale-tag">${meta}</span>
      </div>
      <div class="scale-body">${render(ex, currentInstrument)}</div>`;

    item.querySelector(".scale-head").addEventListener("click", () =>
      item.classList.toggle("open")
    );
    scaleList.appendChild(item);
  });
}

// Instrument tab bar
const scaleSearch = $("scaleSearch");
document.querySelectorAll("#instrumentTabs .tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.instrument === currentInstrument) return;
    document.querySelectorAll("#instrumentTabs .tab-btn")
      .forEach(b => b.classList.toggle("active", b === btn));
    currentInstrument = btn.dataset.instrument;
    if (scaleSearch) scaleSearch.value = "";
    renderExercises();
  });
});

scaleSearch.addEventListener("input", (e) => renderExercises(e.target.value));
renderExercises();

// ===================== Boot =====================
async function boot() {
  await initStore();
  restoring = true;
  applySettings(Store.get(SETTINGS_KEY));
  restoring = false;
  renderPresets();
}
boot();
