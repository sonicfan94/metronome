// Shared "Pulse" knob artwork — the machined tempo dial (icon option A).
//
// One physical rotary knob, photographed from above: recessed well with tempo
// ticks, machined rim, raised cap, bold red pointer aimed at a red target tick.
// Used by make-icon.mjs (full-bleed 1024 icon) and make-splash.mjs (centered on
// the 2732 launch canvas via translate/scale).
//
// Drawn on a 1024x1024 canvas centered at (512, 512); no text, so rendering
// needs no fonts.

export const ART_SIZE = 1024;

// ---- Brand tokens (mirrors :root in www/style.css) ----
export const C = {
  paper: "#ECEAE3",
  ink: "#1C1B18",
  accent: "#E6483B",
};

// Tempo ticks: 300° sweep with a gap at the bottom, majors as anchors, and a
// red target tick at the pointer angle.
const POINTER_ANGLE = 60;
const MAJOR_TICKS = [-150, -30, 150];

function ticks() {
  const out = [];
  for (let a = -150; a <= 150; a += 30) {
    if (a === POINTER_ANGLE) {
      out.push(`<line x1="512" y1="86" x2="512" y2="134" stroke="${C.accent}" stroke-width="12" stroke-linecap="round" opacity="0.55" transform="rotate(${a} 512 512)"/>`);
    } else if (MAJOR_TICKS.includes(a)) {
      out.push(`<line x1="512" y1="92" x2="512" y2="134" stroke="${C.ink}" stroke-width="10" stroke-linecap="round" opacity="0.38" transform="rotate(${a} 512 512)"/>`);
    } else {
      out.push(`<line x1="512" y1="100" x2="512" y2="128" stroke="${C.ink}" stroke-width="7" stroke-linecap="round" opacity="0.20" transform="rotate(${a} 512 512)"/>`);
    }
  }
  return out.join("\n    ");
}

export function knobDefs() {
  return `<linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F0EEE7"/>
      <stop offset="100%" stop-color="#E8E5DC"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F8F6F0"/>
      <stop offset="55%" stop-color="#ECE9E1"/>
      <stop offset="100%" stop-color="#D9D5C9"/>
    </linearGradient>
    <radialGradient id="cap" cx="42%" cy="32%" r="75%">
      <stop offset="0%" stop-color="#FCFBF7"/>
      <stop offset="70%" stop-color="#EFEDE5"/>
      <stop offset="100%" stop-color="#E3E0D6"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <filter id="soft2" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>`;
}

// Everything except the background — embed inside <g transform="..."> to place.
export function knobGroup() {
  return `<!-- recessed well -->
  <circle cx="512" cy="512" r="432" fill="#E4E1D8"/>
  <circle cx="512" cy="500" r="432" fill="#DAD6CB" filter="url(#soft2)" opacity="0.7"/>
  <circle cx="512" cy="514" r="430" fill="#E7E4DC"/>

  <!-- tempo ticks on the well -->
  <g>
    ${ticks()}
  </g>

  <!-- knob drop shadow -->
  <ellipse cx="512" cy="552" rx="338" ry="330" fill="rgba(110,102,86,0.50)" filter="url(#soft)"/>

  <!-- machined rim -->
  <circle cx="512" cy="512" r="340" fill="url(#rim)"/>
  <circle cx="512" cy="512" r="340" fill="none" stroke="rgba(28,27,24,0.10)" stroke-width="2"/>
  <circle cx="512" cy="512" r="306" fill="none" stroke="rgba(28,27,24,0.07)" stroke-width="3"/>
  <circle cx="512" cy="512" r="288" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>

  <!-- raised cap -->
  <circle cx="512" cy="512" r="270" fill="url(#cap)"/>
  <circle cx="512" cy="512" r="270" fill="none" stroke="rgba(28,27,24,0.08)" stroke-width="2"/>

  <!-- red pointer, aimed at the red target tick -->
  <g transform="rotate(${POINTER_ANGLE} 512 512)">
    <line x1="512" y1="290" x2="512" y2="442" stroke="rgba(120,40,30,0.28)" stroke-width="46" stroke-linecap="round" transform="translate(0 9)"/>
    <line x1="512" y1="290" x2="512" y2="442" stroke="${C.accent}" stroke-width="42" stroke-linecap="round"/>
  </g>`;
}
