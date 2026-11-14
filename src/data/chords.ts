export interface ChordDefinition {
  name: string;
  root: string;
  quality: string;
  frets: number[]; // 6 elements: [E2, A2, D3, G3, B3, E4], -1 means muted 'x', 0 means open 'o'
  fingers: number[]; // 0 = open/unplayed, 1 = index, 2 = middle, 3 = ring, 4 = pinky
  barreFret?: number; // fret that is barred
  barreFrom?: number; // string index 0-5
}

// Standard guitar open string MIDI note numbers:
// String 0 (E2) = 40
// String 1 (A2) = 45
// String 2 (D3) = 50
// String 3 (G3) = 55
// String 4 (B3) = 59
// String 5 (E4) = 64
export const OPEN_STRING_NOTES = [40, 45, 50, 55, 59, 64];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_ALIASES: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#',
};

// Base chord database with accurate guitar fingerings
export const CHORD_DATABASE: Record<string, ChordDefinition> = {
  // --- C CHORDS ---
  'C': { name: 'C', root: 'C', quality: 'Major', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'Cm': { name: 'Cm', root: 'C', quality: 'Minor', frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], barreFret: 3, barreFrom: 1 },
  'C7': { name: 'C7', root: 'C', quality: '7', frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'Cmaj7': { name: 'Cmaj7', root: 'C', quality: 'maj7', frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  'Cm7': { name: 'Cm7', root: 'C', quality: 'm7', frets: [-1, 3, 5, 3, 4, 3], fingers: [0, 1, 3, 1, 2, 1], barreFret: 3, barreFrom: 1 },
  'Csus4': { name: 'Csus4', root: 'C', quality: 'sus4', frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  'Csus2': { name: 'Csus2', root: 'C', quality: 'sus2', frets: [-1, 3, 0, 0, 1, 3], fingers: [0, 2, 0, 0, 1, 4] },
  'Cadd9': { name: 'Cadd9', root: 'C', quality: 'add9', frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },
  'Cdim': { name: 'Cdim', root: 'C', quality: 'dim', frets: [-1, 3, 4, 2, 4, -1], fingers: [0, 2, 3, 1, 4, 0] },
  'Caug': { name: 'Caug', root: 'C', quality: 'aug', frets: [-1, 3, 2, 1, 1, 0], fingers: [0, 3, 2, 1, 1, 0] },
  'C5': { name: 'C5', root: 'C', quality: '5', frets: [-1, 3, 5, 5, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },

  // --- C# / Db CHORDS ---
  'C#': { name: 'C#', root: 'C#', quality: 'Major', frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1], barreFret: 4, barreFrom: 1 },
  'C#m': { name: 'C#m', root: 'C#', quality: 'Minor', frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], barreFret: 4, barreFrom: 1 },
  'C#7': { name: 'C#7', root: 'C#', quality: '7', frets: [-1, 4, 6, 4, 6, 4], fingers: [0, 1, 3, 1, 4, 1], barreFret: 4, barreFrom: 1 },
  'C#maj7': { name: 'C#maj7', root: 'C#', quality: 'maj7', frets: [-1, 4, 6, 5, 6, 4], fingers: [0, 1, 3, 2, 4, 1], barreFret: 4, barreFrom: 1 },
  'C#m7': { name: 'C#m7', root: 'C#', quality: 'm7', frets: [-1, 4, 6, 4, 5, 4], fingers: [0, 1, 3, 1, 2, 1], barreFret: 4, barreFrom: 1 },

  // --- D CHORDS ---
  'D': { name: 'D', root: 'D', quality: 'Major', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'Dm': { name: 'Dm', root: 'D', quality: 'Minor', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  'D7': { name: 'D7', root: 'D', quality: '7', frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'Dmaj7': { name: 'Dmaj7', root: 'D', quality: 'maj7', frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  'Dm7': { name: 'Dm7', root: 'D', quality: 'm7', frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], barreFret: 1, barreFrom: 4 },
  'Dsus4': { name: 'Dsus4', root: 'D', quality: 'sus4', frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  'Dsus2': { name: 'Dsus2', root: 'D', quality: 'sus2', frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },
  'D5': { name: 'D5', root: 'D', quality: '5', frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 2, 0] },

  // --- D# / Eb CHORDS ---
  'D#': { name: 'D#', root: 'D#', quality: 'Major', frets: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1], barreFret: 6, barreFrom: 1 },
  'Eb': { name: 'Eb', root: 'D#', quality: 'Major', frets: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1], barreFret: 6, barreFrom: 1 },
  'Ebm': { name: 'Ebm', root: 'D#', quality: 'Minor', frets: [-1, 6, 8, 8, 7, 6], fingers: [0, 1, 3, 4, 2, 1], barreFret: 6, barreFrom: 1 },

  // --- E CHORDS ---
  'E': { name: 'E', root: 'E', quality: 'Major', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'Em': { name: 'Em', root: 'E', quality: 'Minor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  'E7': { name: 'E7', root: 'E', quality: '7', frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  'Emaj7': { name: 'Emaj7', root: 'E', quality: 'maj7', frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  'Em7': { name: 'Em7', root: 'E', quality: 'm7', frets: [0, 2, 2, 0, 3, 0], fingers: [0, 1, 2, 0, 3, 0] },
  'Esus4': { name: 'Esus4', root: 'E', quality: 'sus4', frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },
  'E5': { name: 'E5', root: 'E', quality: '5', frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },

  // --- F CHORDS ---
  'F': { name: 'F', root: 'F', quality: 'Major', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barreFret: 1, barreFrom: 0 },
  'Fm': { name: 'Fm', root: 'F', quality: 'Minor', frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], barreFret: 1, barreFrom: 0 },
  'F7': { name: 'F7', root: 'F', quality: '7', frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1], barreFret: 1, barreFrom: 0 },
  'Fmaj7': { name: 'Fmaj7', root: 'F', quality: 'maj7', frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  'Fm7': { name: 'Fm7', root: 'F', quality: 'm7', frets: [1, 3, 1, 1, 1, 1], fingers: [1, 3, 1, 1, 1, 1], barreFret: 1, barreFrom: 0 },
  'Fsus4': { name: 'Fsus4', root: 'F', quality: 'sus4', frets: [1, 3, 3, 3, 1, 1], fingers: [1, 2, 3, 4, 1, 1], barreFret: 1, barreFrom: 0 },
  'F5': { name: 'F5', root: 'F', quality: '5', frets: [1, 3, 3, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },

  // --- F# / Gb CHORDS ---
  'F#': { name: 'F#', root: 'F#', quality: 'Major', frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barreFret: 2, barreFrom: 0 },
  'F#m': { name: 'F#m', root: 'F#', quality: 'Minor', frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barreFret: 2, barreFrom: 0 },
  'F#7': { name: 'F#7', root: 'F#', quality: '7', frets: [2, 4, 2, 3, 2, 2], fingers: [1, 3, 1, 2, 1, 1], barreFret: 2, barreFrom: 0 },
  'F#m7': { name: 'F#m7', root: 'F#', quality: 'm7', frets: [2, 4, 2, 2, 2, 2], fingers: [1, 3, 1, 1, 1, 1], barreFret: 2, barreFrom: 0 },

  // --- G CHORDS ---
  'G': { name: 'G', root: 'G', quality: 'Major', frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, 0, 0, 3, 4] },
  'Gm': { name: 'Gm', root: 'G', quality: 'Minor', frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barreFret: 3, barreFrom: 0 },
  'G7': { name: 'G7', root: 'G', quality: '7', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  'Gmaj7': { name: 'Gmaj7', root: 'G', quality: 'maj7', frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, 0, 0, 0, 3] },
  'Gm7': { name: 'Gm7', root: 'G', quality: 'm7', frets: [3, 5, 3, 3, 3, 3], fingers: [1, 3, 1, 1, 1, 1], barreFret: 3, barreFrom: 0 },
  'Gsus4': { name: 'Gsus4', root: 'G', quality: 'sus4', frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4] },
  'G5': { name: 'G5', root: 'G', quality: '5', frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },

  // --- G# / Ab CHORDS ---
  'G#': { name: 'G#', root: 'G#', quality: 'Major', frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barreFret: 4, barreFrom: 0 },
  'G#m': { name: 'G#m', root: 'G#', quality: 'Minor', frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], barreFret: 4, barreFrom: 0 },
  'G#7': { name: 'G#7', root: 'G#', quality: '7', frets: [4, 6, 4, 5, 4, 4], fingers: [1, 3, 1, 2, 1, 1], barreFret: 4, barreFrom: 0 },
  'Ab': { name: 'Ab', root: 'G#', quality: 'Major', frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barreFret: 4, barreFrom: 0 },

  // --- A CHORDS ---
  'A': { name: 'A', root: 'A', quality: 'Major', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'Am': { name: 'Am', root: 'A', quality: 'Minor', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  'A7': { name: 'A7', root: 'A', quality: '7', frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] },
  'Amaj7': { name: 'Amaj7', root: 'A', quality: 'maj7', frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  'Am7': { name: 'Am7', root: 'A', quality: 'm7', frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  'Asus4': { name: 'Asus4', root: 'A', quality: 'sus4', frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'Asus2': { name: 'Asus2', root: 'A', quality: 'sus2', frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  'A7sus4': { name: 'A7sus4', root: 'A', quality: '7sus4', frets: [-1, 0, 2, 0, 3, 0], fingers: [0, 0, 1, 0, 3, 0] },
  'A5': { name: 'A5', root: 'A', quality: '5', frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 2, 0, 0] },

  // --- A# / Bb CHORDS ---
  'A#': { name: 'A#', root: 'A#', quality: 'Major', frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], barreFret: 1, barreFrom: 1 },
  'Bb': { name: 'Bb', root: 'A#', quality: 'Major', frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], barreFret: 1, barreFrom: 1 },
  'Bbm': { name: 'Bbm', root: 'A#', quality: 'Minor', frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1], barreFret: 1, barreFrom: 1 },
  'Bb7': { name: 'Bb7', root: 'A#', quality: '7', frets: [-1, 1, 3, 1, 3, 1], fingers: [0, 1, 3, 1, 4, 1], barreFret: 1, barreFrom: 1 },
  'Bmaj7': { name: 'Bmaj7', root: 'B', quality: 'maj7', frets: [-1, 2, 4, 3, 4, 2], fingers: [0, 1, 3, 2, 4, 1], barreFret: 2, barreFrom: 1 },

  // --- B CHORDS ---
  'B': { name: 'B', root: 'B', quality: 'Major', frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], barreFret: 2, barreFrom: 1 },
  'Bm': { name: 'Bm', root: 'B', quality: 'Minor', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barreFret: 2, barreFrom: 1 },
  'B7': { name: 'B7', root: 'B', quality: '7', frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  'Bm7': { name: 'Bm7', root: 'B', quality: 'm7', frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1], barreFret: 2, barreFrom: 1 },
  'Bsus4': { name: 'Bsus4', root: 'B', quality: 'sus4', frets: [-1, 2, 4, 4, 5, 2], fingers: [0, 1, 2, 3, 4, 1], barreFret: 2, barreFrom: 1 },
  'B5': { name: 'B5', root: 'B', quality: '5', frets: [-1, 2, 4, 4, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
};

// Song presets for quick pickup and play
export interface SongPreset {
  id: string;
  title: string;
  artist: string;
  genre: string;
  chords: string[];
  suggestedStyle: string;
  suggestedBpm: number;
  capo: number;
}

export const SONG_PRESETS: SongPreset[] = [
  {
    id: 'pop-4chords',
    title: 'Axis of Awesome (4-Chords Pop)',
    artist: 'Journey / Adele / Beatles',
    genre: 'Pop',
    chords: ['C', 'G', 'Am', 'F'],
    suggestedStyle: 'Pop',
    suggestedBpm: 120,
    capo: 0,
  },
  {
    id: 'wonderwall',
    title: 'Wonderwall',
    artist: 'Oasis',
    genre: 'Rock / Britpop',
    chords: ['Em7', 'G', 'Dsus4', 'A7sus4', 'Cadd9'],
    suggestedStyle: 'Folk',
    suggestedBpm: 87,
    capo: 2,
  },
  {
    id: 'hotel-california',
    title: 'Hotel California',
    artist: 'Eagles',
    genre: 'Classic Rock',
    chords: ['Bm', 'F#7', 'A', 'E', 'G', 'D', 'Em', 'F#'],
    suggestedStyle: 'Arpeggio',
    suggestedBpm: 75,
    capo: 7,
  },
  {
    id: 'stand-by-me',
    title: 'Stand By Me (50s Doo-Wop)',
    artist: 'Ben E. King',
    genre: 'Soul / R&B',
    chords: ['G', 'Em', 'C', 'D'],
    suggestedStyle: 'Country',
    suggestedBpm: 118,
    capo: 2,
  },
  {
    id: 'reggae-vibe',
    title: 'No Woman No Cry',
    artist: 'Bob Marley',
    genre: 'Reggae',
    chords: ['C', 'G', 'Am', 'F'],
    suggestedStyle: 'Reggae',
    suggestedBpm: 78,
    capo: 0,
  },
  {
    id: 'sweet-home',
    title: 'Sweet Home Alabama',
    artist: 'Lynyrd Skynyrd',
    genre: 'Southern Rock',
    chords: ['D', 'Cadd9', 'G', 'F'],
    suggestedStyle: 'Rock',
    suggestedBpm: 98,
    capo: 0,
  },
  {
    id: 'flamenco-nights',
    title: 'Malagueña Rumba',
    artist: 'Traditional Flamenco',
    genre: 'Flamenco',
    chords: ['Am', 'G', 'F', 'E'],
    suggestedStyle: 'Flamenco',
    suggestedBpm: 130,
    capo: 0,
  },
  {
    id: 'jazz-autumn',
    title: 'Autumn Leaves (II-V-I)',
    artist: 'Jazz Standard',
    genre: 'Jazz Bossa',
    chords: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#m7', 'B7', 'Em'],
    suggestedStyle: 'Arpeggio',
    suggestedBpm: 110,
    capo: 0,
  },
];

/**
 * Given a chord name and capo offset, calculates sounding frequencies for all 6 strings.
 * Returns array of numbers (Hz), where 0 means string is muted/unplayed.
 */
export function getChordFrequencies(chordName: string, capo: number = 0): number[] {
  const norm = normalizeChordName(chordName);
  const def = CHORD_DATABASE[norm];
  if (!def) {
    // Fallback simple power chord on root
    return [0, 0, 0, 0, 0, 0];
  }

  return def.frets.map((fret, stringIndex) => {
    if (fret < 0) return 0; // Muted
    const openNote = OPEN_STRING_NOTES[stringIndex];
    const midiNote = openNote + fret + capo;
    // MIDI note to frequency: 440 * 2^((midi - 69) / 12)
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  });
}

/**
 * Normalizes input string (e.g. "c#m", "Bb", "gmaj7") into canonical format
 */
export function normalizeChordName(input: string): string {
  const clean = input.trim();
  if (!clean) return 'C';
  // Check exact match
  if (CHORD_DATABASE[clean]) return clean;

  // Capitalize first char
  const first = clean[0].toUpperCase();
  const rest = clean.slice(1);
  const candidate = first + rest;
  if (CHORD_DATABASE[candidate]) return candidate;

  // Check aliases like Bb -> A#
  if (candidate.startsWith('Bb') && CHORD_DATABASE['Bb']) return 'Bb';
  if (candidate.startsWith('Eb') && CHORD_DATABASE['Eb']) return 'Eb';
  if (candidate.startsWith('Ab') && CHORD_DATABASE['Ab']) return 'Ab';

  return candidate;
}

/**
 * Transpose a chord name up by semitones (for capo display)
 */
export function getSoundingChordName(chordName: string, capo: number): string {
  if (capo === 0) return chordName;
  const def = CHORD_DATABASE[normalizeChordName(chordName)];
  if (!def) return chordName;

  const rootIndex = NOTE_NAMES.indexOf(def.root);
  if (rootIndex === -1) return chordName;

  const newRoot = NOTE_NAMES[(rootIndex + capo) % 12];
  const suffix = chordName.slice(def.root.length);
  return `${newRoot}${suffix}`;
}
