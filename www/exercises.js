// Practice content for every supported instrument.
//
// INSTRUMENTS[key] = { label, kind, exercises[] }
//   kind "string" -> fretted tab (guitar, bass)   uses tuning in app.js
//   kind "keys"   -> piano keyboard diagram
//   kind "drum"   -> rudiment sticking / groove grid
//
// Scale shape (string + keys):
//   { name, tag, root, pattern, degrees, notes, desc, fingering? }
//   pattern  = whole/half step sequence (W = whole, H = half, "1.5" = augmented 2nd)
//   degrees  = scale degrees relative to the major scale
//   notes    = example notes starting from `root`
//   fingering(piano only) = right-hand finger per note, ascending (optional)
//
// Drum shapes:
//   rudiment: { type:"rudiment", name, tag, desc, sticking:[...] }
//             sticking token = "R"/"L", or "fR"/"fL" (flam), "dR"/"dL" (drag)
//   groove:   { type:"groove",   name, tag, desc, lanes:[{name, hits}] }
//             hits string: x = hit, o = bass/snare hit, . = rest (rendered as-is)

const INSTRUMENTS = {
  // ===================== GUITAR =====================
  guitar: {
    label: "Guitar",
    kind: "string",
    exercises: [
      {
        name: "Major (Ionian)",
        tag: "Essential",
        root: "C",
        pattern: ["W","W","H","W","W","W","H"],
        degrees: ["1","2","3","4","5","6","7"],
        notes: ["C","D","E","F","G","A","B"],
        desc: "The foundation of Western music. Bright, happy, and the reference point for every other scale."
      },
      {
        name: "Minor Pentatonic",
        tag: "Must-know",
        root: "A",
        pattern: ["1.5","W","W","1.5","W"],
        degrees: ["1","b3","4","5","b7"],
        notes: ["A","C","D","E","G"],
        desc: "The #1 scale for rock, blues and improvisation. Only 5 notes, hard to play a wrong one."
      },
      {
        name: "Major Pentatonic",
        tag: "Must-know",
        root: "C",
        pattern: ["W","W","1.5","W","1.5"],
        degrees: ["1","2","3","5","6"],
        notes: ["C","D","E","G","A"],
        desc: "Bright 5-note scale used in country, pop and folk. The major pentatonic's relaxed, melodic cousin."
      },
      {
        name: "Blues",
        tag: "Blues",
        root: "A",
        pattern: ["1.5","W","H","H","1.5","W"],
        degrees: ["1","b3","4","b5","5","b7"],
        notes: ["A","C","D","Eb","E","G"],
        desc: "Minor pentatonic plus the 'blue note' (b5). That extra note gives the signature gritty, expressive sound."
      },
      {
        name: "Natural Minor (Aeolian)",
        tag: "Essential",
        root: "A",
        pattern: ["W","H","W","W","H","W","W"],
        degrees: ["1","2","b3","4","5","b6","b7"],
        notes: ["A","B","C","D","E","F","G"],
        desc: "The classic sad/serious sound. The relative minor of the major scale — same notes, different home base."
      },
      {
        name: "Harmonic Minor",
        tag: "Exotic",
        root: "A",
        pattern: ["W","H","W","W","H","1.5","H"],
        degrees: ["1","2","b3","4","5","b6","7"],
        notes: ["A","B","C","D","E","F","G#"],
        desc: "Natural minor with a raised 7th. The big leap to the 7th gives a dramatic, neoclassical / Middle-Eastern flavor."
      },
      {
        name: "Melodic Minor",
        tag: "Jazz",
        root: "A",
        pattern: ["W","H","W","W","W","W","H"],
        degrees: ["1","2","b3","4","5","6","7"],
        notes: ["A","B","C","D","E","F#","G#"],
        desc: "Minor scale with raised 6th and 7th going up. Smooth, sophisticated — a jazz workhorse."
      },
      {
        name: "Dorian",
        tag: "Mode",
        root: "D",
        pattern: ["W","H","W","W","W","H","W"],
        degrees: ["1","2","b3","4","5","6","b7"],
        notes: ["D","E","F","G","A","B","C"],
        desc: "Minor with a bright natural 6th. Hugely popular in rock, funk and jazz (Santana, 'So What')."
      },
      {
        name: "Phrygian",
        tag: "Mode",
        root: "E",
        pattern: ["H","W","W","W","H","W","W"],
        degrees: ["1","b2","b3","4","5","b6","b7"],
        notes: ["E","F","G","A","B","C","D"],
        desc: "Dark minor mode with a b2. Flamenco and metal love this Spanish, tense sound."
      },
      {
        name: "Lydian",
        tag: "Mode",
        root: "F",
        pattern: ["W","W","W","H","W","W","H"],
        degrees: ["1","2","3","#4","5","6","7"],
        notes: ["F","G","A","B","C","D","E"],
        desc: "Major with a raised 4th. Dreamy, floating and cinematic — a Joe Satriani favorite."
      },
      {
        name: "Mixolydian",
        tag: "Mode",
        root: "G",
        pattern: ["W","W","H","W","W","H","W"],
        degrees: ["1","2","3","4","5","6","b7"],
        notes: ["G","A","B","C","D","E","F"],
        desc: "Major with a flat 7th. The sound of dominant chords, blues-rock and jam bands."
      },
      {
        name: "Locrian",
        tag: "Mode",
        root: "B",
        pattern: ["H","W","W","H","W","W","W"],
        degrees: ["1","b2","b3","4","b5","b6","b7"],
        notes: ["B","C","D","E","F","G","A"],
        desc: "The darkest mode — built on a diminished tonic. Unstable and dissonant, used in metal and fusion."
      },
      {
        name: "Major Blues",
        tag: "Blues",
        root: "C",
        pattern: ["W","H","H","1.5","W","1.5"],
        degrees: ["1","2","b3","3","5","6"],
        notes: ["C","D","Eb","E","G","A"],
        desc: "Major pentatonic plus a b3 blue note. Sweet and soulful — think country and Allman Brothers leads."
      },
      {
        name: "Phrygian Dominant",
        tag: "Exotic",
        root: "E",
        pattern: ["H","1.5","H","W","H","W","W"],
        degrees: ["1","b2","3","4","5","b6","b7"],
        notes: ["E","F","G#","A","B","C","D"],
        desc: "5th mode of harmonic minor. The quintessential flamenco / Middle-Eastern scale — exotic and fiery."
      },
      {
        name: "Lydian Dominant",
        tag: "Jazz",
        root: "C",
        pattern: ["W","W","W","H","W","H","W"],
        degrees: ["1","2","3","#4","5","6","b7"],
        notes: ["C","D","E","F#","G","A","Bb"],
        desc: "Lydian with a b7 (4th mode of melodic minor). A colorful 'overtone' scale great over dominant chords."
      },
      {
        name: "Whole Tone",
        tag: "Symmetric",
        root: "C",
        pattern: ["W","W","W","W","W","W"],
        degrees: ["1","2","3","#4","#5","b7"],
        notes: ["C","D","E","F#","G#","Bb"],
        desc: "All whole steps — no leading tone. Dreamlike and ambiguous; classic dream-sequence and impressionist sound."
      },
      {
        name: "Diminished (Half-Whole)",
        tag: "Symmetric",
        root: "C",
        pattern: ["H","W","H","W","H","W","H","W"],
        degrees: ["1","b2","b3","3","#4","5","6","b7"],
        notes: ["C","Db","Eb","E","F#","G","A","Bb"],
        desc: "8-note symmetric scale alternating half/whole steps. Tense, jazzy color over dominant-7 chords."
      },
      {
        name: "Hungarian Minor",
        tag: "Exotic",
        root: "A",
        pattern: ["W","H","1.5","H","H","1.5","H"],
        degrees: ["1","2","b3","#4","5","b6","7"],
        notes: ["A","B","C","D#","E","F","G#"],
        desc: "Harmonic minor with a raised 4th. Two augmented seconds give a dark, gypsy / Eastern-European drama."
      },
      {
        name: "Spanish 8-Tone",
        tag: "Exotic",
        root: "E",
        pattern: ["H","W","H","H","H","W","W","W"],
        degrees: ["1","b2","b3","3","4","b5","b6","b7"],
        notes: ["E","F","G","G#","A","Bb","C","D"],
        desc: "An 8-note flamenco scale blending Phrygian dominant with extra passing tones. Maximum Spanish flavor."
      },
      {
        name: "Bebop Dominant",
        tag: "Jazz",
        root: "C",
        pattern: ["W","W","H","W","W","H","H","H"],
        degrees: ["1","2","3","4","5","6","b7","7"],
        notes: ["C","D","E","F","G","A","Bb","B"],
        desc: "Mixolydian with an added major 7th passing tone. The 8 notes keep chord tones on the beat for smooth bebop lines."
      }
    ]
  },

  // ===================== BASS =====================
  // Rendered on a 4-string bass (E A D G). Roots chosen to sit low on the neck.
  bass: {
    label: "Bass",
    kind: "string",
    exercises: [
      {
        name: "Major",
        tag: "Essential",
        root: "G",
        pattern: ["W","W","H","W","W","W","H"],
        degrees: ["1","2","3","4","5","6","7"],
        notes: ["G","A","B","C","D","E","F#"],
        desc: "The major scale up the neck. Foundation for walking lines and locking in with chord roots."
      },
      {
        name: "Natural Minor",
        tag: "Essential",
        root: "E",
        pattern: ["W","H","W","W","H","W","W"],
        degrees: ["1","2","b3","4","5","b6","b7"],
        notes: ["E","F#","G","A","B","C","D"],
        desc: "The minor sound for rock, metal and pop bass lines. Starts on the open low E."
      },
      {
        name: "Minor Pentatonic",
        tag: "Must-know",
        root: "E",
        pattern: ["1.5","W","W","1.5","W"],
        degrees: ["1","b3","4","5","b7"],
        notes: ["E","G","A","B","D"],
        desc: "The go-to scale for grooves and fills. Five notes that sit perfectly under your fingers."
      },
      {
        name: "Major Pentatonic",
        tag: "Must-know",
        root: "G",
        pattern: ["W","W","1.5","W","1.5"],
        degrees: ["1","2","3","5","6"],
        notes: ["G","A","B","D","E"],
        desc: "Bright 5-note scale for country, pop and Motown-style melodic bass."
      },
      {
        name: "Blues",
        tag: "Blues",
        root: "E",
        pattern: ["1.5","W","H","H","1.5","W"],
        degrees: ["1","b3","4","b5","5","b7"],
        notes: ["E","G","A","Bb","B","D"],
        desc: "Minor pentatonic plus the blue note. Essential for blues, funk and R&B bass."
      },
      {
        name: "Dorian",
        tag: "Mode",
        root: "A",
        pattern: ["W","H","W","W","W","H","W"],
        degrees: ["1","2","b3","4","5","6","b7"],
        notes: ["A","B","C","D","E","F#","G"],
        desc: "Minor with a bright 6th — the funk and jazz-fusion bass mode (think 'Chameleon')."
      },
      {
        name: "Mixolydian",
        tag: "Mode",
        root: "G",
        pattern: ["W","W","H","W","W","H","W"],
        degrees: ["1","2","3","4","5","6","b7"],
        notes: ["G","A","B","C","D","E","F"],
        desc: "Major with a flat 7th. The dominant-chord sound for blues-rock and jam grooves."
      }
    ]
  },

  // ===================== PIANO =====================
  // Rendered as a one-octave keyboard. `fingering` = right hand, ascending.
  piano: {
    label: "Piano",
    kind: "keys",
    exercises: [
      {
        name: "C Major",
        tag: "Essential",
        root: "C",
        pattern: ["W","W","H","W","W","W","H"],
        degrees: ["1","2","3","4","5","6","7"],
        notes: ["C","D","E","F","G","A","B"],
        fingering: ["1","2","3","1","2","3","4"],
        desc: "The first scale every pianist learns — all white keys. Right hand: thumb tucks under after E."
      },
      {
        name: "A Natural Minor",
        tag: "Essential",
        root: "A",
        pattern: ["W","H","W","W","H","W","W"],
        degrees: ["1","2","b3","4","5","b6","b7"],
        notes: ["A","B","C","D","E","F","G"],
        fingering: ["1","2","3","1","2","3","4"],
        desc: "The relative minor of C major — also all white keys. Same fingering shape as C major."
      },
      {
        name: "G Major",
        tag: "Essential",
        root: "G",
        pattern: ["W","W","H","W","W","W","H"],
        degrees: ["1","2","3","4","5","6","7"],
        notes: ["G","A","B","C","D","E","F#"],
        fingering: ["1","2","3","1","2","3","4"],
        desc: "One sharp (F#). A great second scale — your pinky/thumb pattern carries straight over from C."
      },
      {
        name: "C Major Pentatonic",
        tag: "Must-know",
        root: "C",
        pattern: ["W","W","1.5","W","1.5"],
        degrees: ["1","2","3","5","6"],
        notes: ["C","D","E","G","A"],
        fingering: ["1","2","3","1","2"],
        desc: "Five notes that always sound good together — perfect for first improvisations."
      },
      {
        name: "A Minor Pentatonic",
        tag: "Must-know",
        root: "A",
        pattern: ["1.5","W","W","1.5","W"],
        degrees: ["1","b3","4","5","b7"],
        notes: ["A","C","D","E","G"],
        fingering: ["1","2","3","1","2"],
        desc: "The bluesy 5-note scale. Lay into these notes over an Am or blues backing."
      },
      {
        name: "C Blues",
        tag: "Blues",
        root: "C",
        pattern: ["1.5","W","H","H","1.5","W"],
        degrees: ["1","b3","4","b5","5","b7"],
        notes: ["C","Eb","F","F#","G","Bb"],
        desc: "Minor pentatonic plus the b5 'blue note' — the sound of jazz and blues piano."
      },
      {
        name: "D Dorian",
        tag: "Mode",
        root: "D",
        pattern: ["W","H","W","W","W","H","W"],
        degrees: ["1","2","b3","4","5","6","b7"],
        notes: ["D","E","F","G","A","B","C"],
        fingering: ["1","2","3","1","2","3","4"],
        desc: "All white keys from D — a smooth, jazzy minor mode. Easy on the eyes and the hands."
      },
      {
        name: "Chromatic",
        tag: "Technique",
        root: "C",
        pattern: ["H","H","H","H","H","H","H","H","H","H","H","H"],
        degrees: ["1","b2","2","b3","3","4","b5","5","b6","6","b7","7"],
        notes: ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"],
        fingering: ["1","3","1","3","1","2","3","1","3","1","3","2"],
        desc: "Every key in order. The classic finger-independence and evenness workout."
      },
      {
        name: "Hanon No. 1 (figure)",
        tag: "Technique",
        root: "C",
        pattern: ["W","W","H","W"],
        degrees: ["1","2","3","4","5"],
        notes: ["C","D","E","F","G"],
        fingering: ["1","2","3","4","5"],
        desc: "The opening five-finger figure (C-D-E-F-G…). Repeat ascending up the keyboard for strength and evenness."
      }
    ]
  },

  // ===================== DRUMS =====================
  drums: {
    label: "Drums",
    kind: "drum",
    exercises: [
      {
        type: "rudiment",
        name: "Single Stroke Roll",
        tag: "Rudiment",
        sticking: ["R","L","R","L","R","L","R","L"],
        desc: "Alternating single hits. The most fundamental rudiment — build even, balanced hands at every tempo."
      },
      {
        type: "rudiment",
        name: "Double Stroke Roll",
        tag: "Rudiment",
        sticking: ["R","R","L","L","R","R","L","L"],
        desc: "Two hits per hand. The basis of the buzz roll — focus on matching the second bounce to the first."
      },
      {
        type: "rudiment",
        name: "Single Paradiddle",
        tag: "Rudiment",
        sticking: ["R","L","R","R","L","R","L","L"],
        desc: "RLRR LRLL. The workhorse rudiment for moving around the kit and breaking up straight rolls."
      },
      {
        type: "rudiment",
        name: "Double Paradiddle",
        tag: "Rudiment",
        sticking: ["R","L","R","L","R","R","L","R","L","R","L","L"],
        desc: "RLRLRR LRLRLL. Six-stroke variant that fits naturally over triplets and 6/8 grooves."
      },
      {
        type: "rudiment",
        name: "Flam",
        tag: "Rudiment",
        sticking: ["fR","fL","fR","fL"],
        desc: "A soft grace note just before the main stroke, played with the opposite hand. Gives accents a fat, single 'thwack'."
      },
      {
        type: "rudiment",
        name: "Flam Tap",
        tag: "Rudiment",
        sticking: ["fR","R","fL","L"],
        desc: "A flam followed by a tap on the same hand. Great for adding weight to a stream of doubles."
      },
      {
        type: "rudiment",
        name: "Drag (Ruff)",
        tag: "Rudiment",
        sticking: ["dR","R","dL","L"],
        desc: "Two quick grace notes ahead of the main stroke. Adds a rolled, ornamental texture to the beat."
      },
      {
        type: "rudiment",
        name: "Five-Stroke Roll",
        tag: "Rudiment",
        sticking: ["R","R","L","L","R","L","L","R","R","L"],
        desc: "Two doubles into a single accent: RRLL-R, then LLRR-L. A short roll used constantly in fills."
      },
      {
        type: "groove",
        name: "Basic Rock Beat",
        tag: "Groove",
        lanes: [
          { name: "HH", hits: "x x x x x x x x" },
          { name: "SN", hits: ". . o . . . o ." },
          { name: "KK", hits: "o . . . o . . ." }
        ],
        desc: "Eighth-note hi-hats, snare on 2 & 4, kick on 1 & 3. The first groove every drummer learns."
      },
      {
        type: "groove",
        name: "Four-on-the-Floor",
        tag: "Groove",
        lanes: [
          { name: "HH", hits: "x x x x x x x x" },
          { name: "SN", hits: ". . o . . . o ." },
          { name: "KK", hits: "o . o . o . o ." }
        ],
        desc: "Kick on every quarter note. The driving pulse behind disco, house and a lot of pop-rock."
      },
      {
        type: "groove",
        name: "Half-Time Feel",
        tag: "Groove",
        lanes: [
          { name: "HH", hits: "x x x x x x x x" },
          { name: "SN", hits: ". . . . o . . ." },
          { name: "KK", hits: "o . . . . . o ." }
        ],
        desc: "Snare backbeat pushed to beat 3, halving the perceived tempo. Big, spacious and heavy."
      },
      {
        type: "groove",
        name: "Shuffle",
        tag: "Groove",
        lanes: [
          { name: "HH", hits: "x . x x . x x . x x . x" },
          { name: "SN", hits: ". . . o . . . . . o . ." },
          { name: "KK", hits: "o . . . . . o . . . . ." }
        ],
        desc: "Triplet-based swing feel (read in groups of three). The heartbeat of blues and shuffle-rock."
      }
    ]
  }
};
