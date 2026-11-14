export type StrumAction =
  | 'down'
  | 'up'
  | 'accent-down'
  | 'accent-up'
  | 'rest'
  | 'mute'
  | 'pluck-bass'
  | 'pluck-treble'
  | 'pluck-string';

export interface StrumStroke {
  step: number;
  action: StrumAction;
  stringIndex?: number; // 0 to 5 for individual plucks
  velocity: number; // 0.0 - 1.0
  interStringDelayMs?: number; // micro-timing delay per string
  label: string;
}

export interface StrumStyle {
  id: string;
  name: string;
  category: string;
  description: string;
  subdivisions: number; // e.g. 8 for 8th-notes (4/4), 16 for 16th-notes (4/4), 12 for 12/8 or 6/8
  defaultBpm: number;
  timeSignature: '4/4' | '3/4' | '6/8';
  strokes: StrumStroke[];
}

export const STRUM_STYLES: StrumStyle[] = [
  {
    id: 'folk',
    name: 'Folk / Campfire',
    category: 'Acoustic',
    description: 'The golden acoustic pattern: D - D U - U D -',
    subdivisions: 8,
    defaultBpm: 104,
    timeSignature: '4/4',
    strokes: [
      { step: 0, action: 'accent-down', velocity: 0.95, label: 'D' }, // Beat 1
      { step: 1, action: 'rest', velocity: 0, label: '·' },
      { step: 2, action: 'down', velocity: 0.78, label: 'D' },        // Beat 2
      { step: 3, action: 'up', velocity: 0.65, label: 'U' },          // Beat 2&
      { step: 4, action: 'rest', velocity: 0, label: '·' },           // Beat 3 (Miss)
      { step: 5, action: 'up', velocity: 0.75, label: 'U' },          // Beat 3&
      { step: 6, action: 'down', velocity: 0.82, label: 'D' },        // Beat 4
      { step: 7, action: 'up', velocity: 0.62, label: 'U' },          // Beat 4&
    ],
  },
  {
    id: 'rock',
    name: 'Driving Rock',
    category: 'Rock',
    description: 'Aggressive 8th-note driving downbeats with backbeat accents',
    subdivisions: 8,
    defaultBpm: 128,
    timeSignature: '4/4',
    strokes: [
      { step: 0, action: 'down', velocity: 0.85, label: 'D' },
      { step: 1, action: 'up', velocity: 0.6, label: 'U' },
      { step: 2, action: 'accent-down', velocity: 1.0, label: '★D' }, // Backbeat 2
      { step: 3, action: 'up', velocity: 0.65, label: 'U' },
      { step: 4, action: 'down', velocity: 0.85, label: 'D' },
      { step: 5, action: 'up', velocity: 0.6, label: 'U' },
      { step: 6, action: 'accent-down', velocity: 1.0, label: '★D' }, // Backbeat 4
      { step: 7, action: 'up', velocity: 0.7, label: 'U' },
    ],
  },
  {
    id: 'pop',
    name: 'Modern Pop',
    category: 'Pop',
    description: 'Syncopated, groovy radio bounce with airy upstrums',
    subdivisions: 16,
    defaultBpm: 116,
    timeSignature: '4/4',
    strokes: [
      { step: 0, action: 'accent-down', velocity: 0.95, label: 'D' },
      { step: 1, action: 'rest', velocity: 0, label: '·' },
      { step: 2, action: 'rest', velocity: 0, label: '·' },
      { step: 3, action: 'up', velocity: 0.62, label: 'U' },
      { step: 4, action: 'down', velocity: 0.75, label: 'D' },
      { step: 5, action: 'rest', velocity: 0, label: '·' },
      { step: 6, action: 'rest', velocity: 0, label: '·' },
      { step: 7, action: 'up', velocity: 0.7, label: 'U' },
      { step: 8, action: 'rest', velocity: 0, label: '·' },
      { step: 9, action: 'rest', velocity: 0, label: '·' },
      { step: 10, action: 'up', velocity: 0.68, label: 'U' },
      { step: 11, action: 'rest', velocity: 0, label: '·' },
      { step: 12, action: 'down', velocity: 0.82, label: 'D' },
      { step: 13, action: 'rest', velocity: 0, label: '·' },
      { step: 14, action: 'up', velocity: 0.65, label: 'U' },
      { step: 15, action: 'rest', velocity: 0, label: '·' },
    ],
  },
  {
    id: 'country',
    name: 'Country Boom-Chick',
    category: 'Traditional',
    description: 'Alternating deep bass notes followed by crisp treble chops',
    subdivisions: 8,
    defaultBpm: 120,
    timeSignature: '4/4',
    strokes: [
      { step: 0, action: 'pluck-bass', velocity: 0.95, label: 'Bass1' },
      { step: 1, action: 'rest', velocity: 0, label: '·' },
      { step: 2, action: 'down', velocity: 0.78, label: 'Strum' },
      { step: 3, action: 'up', velocity: 0.6, label: 'U' },
      { step: 4, action: 'pluck-bass', velocity: 0.9, label: 'Bass2' },
      { step: 5, action: 'rest', velocity: 0, label: '·' },
      { step: 6, action: 'down', velocity: 0.78, label: 'Strum' },
      { step: 7, action: 'up', velocity: 0.62, label: 'U' },
    ],
  },
  {
    id: 'arpeggio',
    name: 'Fingerstyle Arpeggio',
    category: 'Acoustic',
    description: 'P-I-M-A fingerpicking rolling across 6 strings individually',
    subdivisions: 6,
    defaultBpm: 84,
    timeSignature: '6/8',
    strokes: [
      { step: 0, action: 'pluck-string', stringIndex: 0, velocity: 0.95, label: 'E (P)' },
      { step: 1, action: 'pluck-string', stringIndex: 2, velocity: 0.7, label: 'D (I)' },
      { step: 2, action: 'pluck-string', stringIndex: 3, velocity: 0.75, label: 'G (M)' },
      { step: 3, action: 'pluck-string', stringIndex: 4, velocity: 0.8, label: 'B (A)' },
      { step: 4, action: 'pluck-string', stringIndex: 5, velocity: 0.85, label: 'e (A)' },
      { step: 5, action: 'pluck-string', stringIndex: 3, velocity: 0.68, label: 'G (M)' },
    ],
  },
  {
    id: 'reggae',
    name: 'Reggae Skank',
    category: 'Island',
    description: 'Offbeat staccato chops on the upbeat with dead-on-beat rests',
    subdivisions: 8,
    defaultBpm: 76,
    timeSignature: '4/4',
    strokes: [
      { step: 0, action: 'rest', velocity: 0, label: '·' },
      { step: 1, action: 'accent-up', velocity: 0.92, label: 'Chop' },
      { step: 2, action: 'rest', velocity: 0, label: '·' },
      { step: 3, action: 'up', velocity: 0.8, label: 'Chop' },
      { step: 4, action: 'rest', velocity: 0, label: '·' },
      { step: 5, action: 'accent-up', velocity: 0.92, label: 'Chop' },
      { step: 6, action: 'rest', velocity: 0, label: '·' },
      { step: 7, action: 'up', velocity: 0.8, label: 'Chop' },
    ],
  },
  {
    id: 'ballad',
    name: 'Slow 6/8 Ballad',
    category: 'Acoustic',
    description: 'Emotional, gentle rolling sway with long string decay',
    subdivisions: 6,
    defaultBpm: 68,
    timeSignature: '6/8',
    strokes: [
      { step: 0, action: 'accent-down', velocity: 0.9, interStringDelayMs: 22, label: 'D (1)' },
      { step: 1, action: 'rest', velocity: 0, label: '·' },
      { step: 2, action: 'up', velocity: 0.58, label: 'U' },
      { step: 3, action: 'down', velocity: 0.75, interStringDelayMs: 18, label: 'D (4)' },
      { step: 4, action: 'rest', velocity: 0, label: '·' },
      { step: 5, action: 'up', velocity: 0.62, label: 'U' },
    ],
  },
  {
    id: 'flamenco',
    name: 'Flamenco Rasgueado',
    category: 'Spanish',
    description: 'Rapid finger-flick triplet bursts with percussive passion',
    subdivisions: 12,
    defaultBpm: 125,
    timeSignature: '3/4',
    strokes: [
      { step: 0, action: 'accent-down', velocity: 1.0, interStringDelayMs: 9, label: 'Golpe' },
      { step: 1, action: 'down', velocity: 0.7, label: 'D' },
      { step: 2, action: 'up', velocity: 0.65, label: 'U' },
      { step: 3, action: 'down', velocity: 0.85, interStringDelayMs: 9, label: 'D' },
      { step: 4, action: 'down', velocity: 0.7, label: 'D' },
      { step: 5, action: 'up', velocity: 0.65, label: 'U' },
      { step: 6, action: 'accent-down', velocity: 0.95, interStringDelayMs: 9, label: 'D' },
      { step: 7, action: 'down', velocity: 0.7, label: 'D' },
      { step: 8, action: 'up', velocity: 0.65, label: 'U' },
      { step: 9, action: 'down', velocity: 0.85, label: 'D' },
      { step: 10, action: 'down', velocity: 0.7, label: 'D' },
      { step: 11, action: 'up', velocity: 0.7, label: 'U' },
    ],
  },
];

export function getStyleById(id: string): StrumStyle {
  return STRUM_STYLES.find((s) => s.id === id) || STRUM_STYLES[0];
}
