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

// Pendulum state
let pendulumDir = 1;       // alternates each beat so the arm swings side to side

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const bpmNumber = $("bpmNumber");
const bpmSlider = $("bpmSlider");
const beatDots = $("beatDots");
const playBtn = $("playBtn");
const rampStatus = $("rampStatus");
const pendulum = $("pendulum");
const tapBtn = $("tapBtn");

let bpm = 100;

function setBpm(v) {
  bpm = Math.min(240, Math.max(40, Math.round(v)));
  bpmNumber.textContent = bpm;
  bpmSlider.value = bpm;
}

// ---- BPM controls ----
bpmSlider.addEventListener("input", (e) => { setBpm(+e.target.value); saveSettings(); });
$("bpmUp").addEventListener("click", () => { setBpm(bpm + 1); saveSettings(); });
$("bpmDown").addEventListener("click", () => { setBpm(bpm - 1); saveSettings(); });

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

// ---- Pendulum swing (synced to the audible beat) ----
function swingPendulum(secondsPerBeat) {
  if (!pendulum) return;
  pendulum.style.transitionDuration = secondsPerBeat + "s";
  pendulumDir *= -1;
  pendulum.style.transform = `translateX(-50%) rotate(${pendulumDir * 14}deg)`;
}
function resetPendulum() {
  if (!pendulum) return;
  pendulum.classList.remove("swinging");
  pendulum.style.transitionDuration = "0.3s";
  pendulum.style.transform = "translateX(-50%) rotate(0deg)";
  pendulumDir = 1;
}

// ---- Click sound ----
function playClick(time, isAccent, isMainBeat) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

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
    const spb = 60.0 / bpm;
    const delay = (time - audioCtx.currentTime) * 1000;
    // Drive every beat-synced visual/haptic from this single callback.
    setTimeout(() => {
      if (!isPlaying) return;
      flashDot(beat);
      swingPendulum(spb);
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
tapBtn.addEventListener("click", tapTempo);

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

// ===================== Transport =====================
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

  pendulum.classList.add("swinging");
  playBtn.innerHTML = '<span class="play-ico">■</span> Stop';
  playBtn.classList.add("playing");
}

function stop() {
  isPlaying = false;
  clearInterval(schedulerTimer);
  stopSecondsRamp();
  for (const d of beatDots.children) d.classList.remove("active");
  resetPendulum();
  playBtn.innerHTML = '<span class="play-ico">▶</span> Start';
  playBtn.classList.remove("playing");
  rampStatus.textContent = "";
}

playBtn.addEventListener("click", () => isPlaying ? stop() : start());

// Spacebar toggles play/stop
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
    e.preventDefault();
    isPlaying ? stop() : start();
  }
});

// ===================== Persistence & presets =====================
// localStorage works reliably inside the iOS WKWebView Capacitor uses; the thin
// Store wrapper keeps the door open for @capacitor/preferences later if needed.
const SETTINGS_KEY = "st_settings_v1";
const PRESETS_KEY = "st_presets_v1";
const Store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
};

function collectSettings() {
  return {
    bpm,
    beatsPerBar: $("beatsPerBar").value,
    subdivision: $("subdivision").value,
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
      `${preset.settings.bpm} BPM · ${preset.settings.beatsPerBar}/4`;
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

// ===================== Tab / fretboard generation =====================
// Standard tuning. Strings indexed 1 (high E) .. 6 (low E).
const NOTE_PC = {
  "C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,
  "G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11
};
const OPEN_MIDI = { 1:64, 2:59, 3:55, 4:50, 5:45, 6:40 }; // e B G D A E
const STRING_LABEL = { 1:"e", 2:"B", 3:"G", 4:"D", 5:"A", 6:"E" };

// Build an in-position scale anchored on the root (lowest note = root on string 6).
// We walk EVERY consecutive scale tone going up, staying on a string until the next
// note exceeds the hand span, then shifting to the next string. This guarantees no
// scale degree is skipped (the old fixed-window box silently dropped 3rds, 6ths and
// leading tones that fell just outside the window).
function buildTab(scale) {
  const rootPc = NOTE_PC[scale.root];
  const anchor = (rootPc - (OPEN_MIDI[6] % 12) + 12) % 12; // root fret on low E
  const posHi = anchor + 4;                                // 5-fret reach (incl. stretch)

  // Interval steps (in semitones) between consecutive scale tones, cyclic, summing to 12.
  const pcs = scale.notes.map(n => NOTE_PC[n]);
  const steps = pcs.map((p, i) =>
    ((pcs[(i + 1) % pcs.length] - p) + 12) % 12 || 12
  );

  // Start on the root, low E, then climb the scale across the neck.
  const seq = [{ s: 6, fret: anchor, midi: OPEN_MIDI[6] + anchor, pc: rootPc }];
  let curString = 6;
  let midi = OPEN_MIDI[6] + anchor;
  let i = 0;
  while (seq.length < 40) {
    midi += steps[i % steps.length];
    i++;
    let s = curString;
    let fret = midi - OPEN_MIDI[s];
    while (fret > posHi && s > 1) { s--; fret = midi - OPEN_MIDI[s]; }
    if (fret > posHi || fret < 0) break; // ran off the top of the neck
    curString = s;
    seq.push({ s, fret, midi, pc: midi % 12 });
  }

  // Render six tab lines. Each note is one column; root notes marked with '*'.
  const lines = {};
  for (let s = 1; s <= 6; s++) lines[s] = "";
  seq.forEach(n => {
    for (let s = 1; s <= 6; s++) {
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
  for (let s = 1; s <= 6; s++) tab += `${STRING_LABEL[s]}|${lines[s]}-|\n`;

  const posLabel = anchor === 0 ? "open position" : `frets ${anchor}–${posHi}`;
  return { tab: tab.trimEnd(), posLabel };
}

// ===================== Scales UI =====================
const scaleList = $("scaleList");

function renderScales(filter = "") {
  scaleList.innerHTML = "";
  const f = filter.trim().toLowerCase();
  const shown = SCALES.filter(s =>
    !f || s.name.toLowerCase().includes(f) || s.tag.toLowerCase().includes(f)
  );
  if (!shown.length) {
    // Build with textContent so the user's search text can't inject markup.
    scaleList.innerHTML = "";
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = `No scales match "${filter}".`;
    scaleList.appendChild(p);
    return;
  }
  shown.forEach((s) => {
    const item = document.createElement("div");
    item.className = "scale-item";

    const stepChips = s.pattern.map(p => {
      const label = p === "1.5" ? "1½" : p;
      return `<span class="chip step">${label}</span>`;
    }).join('<span class="chip" style="border:none;background:none;padding:2px">→</span>');

    const degChips = s.degrees.map(d => `<span class="chip">${d}</span>`).join("");
    const noteChips = s.notes.map(n => `<span class="chip">${n}</span>`).join("");
    const { tab, posLabel } = buildTab(s);

    item.innerHTML = `
      <div class="scale-head">
        <span class="scale-name">${s.name}</span>
        <span class="scale-tag">${s.tag} · ${s.notes.length} notes</span>
      </div>
      <div class="scale-body">
        <p>${s.desc}</p>
        <div class="scale-meta"><b>Degrees</b></div>
        <div class="pattern-row">${degChips}</div>
        <div class="scale-meta"><b>Step pattern</b> (W=whole, H=half, 1½=aug 2nd)</div>
        <div class="pattern-row">${stepChips}</div>
        <div class="scale-meta"><b>Example</b> starting on ${s.root}</div>
        <div class="pattern-row">${noteChips}</div>
        <div class="scale-meta"><b>Practice position</b> — ${posLabel}, full scale ascending across all six strings starting on the root (<span class="root-mark">*</span> = root). Read low E (bottom) to high e (top).</div>
        <pre class="tab">${tab}</pre>
      </div>`;

    item.querySelector(".scale-head").addEventListener("click", () =>
      item.classList.toggle("open")
    );
    scaleList.appendChild(item);
  });
}

$("scaleSearch").addEventListener("input", (e) => renderScales(e.target.value));
renderScales();

// ===================== Boot =====================
restoring = true;
applySettings(Store.get(SETTINGS_KEY));
restoring = false;
renderPresets();
