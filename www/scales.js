// Top 20 most popular guitar scales.
// pattern = whole/half step sequence (W = whole, H = half, "1.5" = augmented 2nd)
// degrees = scale degrees relative to major scale
// notes = example starting from the given root for reference
const SCALES = [
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
];
