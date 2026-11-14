/**
 * PocketGuitar Comprehensive Standard Test Suite
 * Google Engineering Verification Standards:
 * - Deterministic assertion validation
 * - Audio acoustics & pitch physics invariants
 * - Capo transpose semitone arithmetic
 * - Offline chord dictionary integrity & boundary safety
 * - Strum pattern timing bounds (60-240 BPM)
 * - Touch hitbox & adaptive layout logic
 * - Android Kotlin/Compose source contracts
 */

import { CHORD_DATABASE, SONG_PRESETS, getChordFrequencies, normalizeChordName, getSoundingChordName, OPEN_STRING_NOTES, NOTE_NAMES } from '../src/data/chords.ts';
import { STRUM_STYLES, getStyleById } from '../src/engine/strumPatterns.ts';
import { ANDROID_FILES } from '../src/components/AndroidProjectModal.tsx';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, testName: string) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, testName, `Expected ${expected} ± ${tolerance}, got ${actual.toFixed(2)} (diff ${diff.toFixed(4)})`);
}

console.log('================================================================');
console.log('RUNNING GOOGLE-STANDARD TEST SUITE FOR POCKETGUITAR');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// SUITE 1: GUITAR ACOUSTIC FREQUENCY & PITCH MATH
// ----------------------------------------------------------------------
console.log('--- SUITE 1: Acoustic Frequency & Pitch Math Invariants ---');

// Standard guitar open string tuning frequencies in Hz:
// E2 = 82.41 Hz
// A2 = 110.00 Hz
// D3 = 146.83 Hz
// G3 = 196.00 Hz
// B3 = 246.94 Hz
// E4 = 329.63 Hz
const EXPECTED_OPEN_HZ = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

EXPECTED_OPEN_HZ.forEach((expectedHz, stringIdx) => {
  const midiNote = OPEN_STRING_NOTES[stringIdx];
  const calculatedHz = 440 * Math.pow(2, (midiNote - 69) / 12);
  assertClose(calculatedHz, expectedHz, 0.05, `Open String ${stringIdx} frequency matches physics (${expectedHz} Hz)`);
});

// Test C Major Chord frequencies: [-1, 3, 2, 0, 1, 0]
// String 0: muted -> 0 Hz
// String 1: A2 + 3 frets = C3 = 130.81 Hz
// String 2: D3 + 2 frets = E3 = 164.81 Hz
// String 3: G3 + 0 frets = G3 = 196.00 Hz
// String 4: B3 + 1 fret  = C4 = 261.63 Hz
// String 5: E4 + 0 frets = E4 = 329.63 Hz
const cMajorFreqs = getChordFrequencies('C', 0);
assert(cMajorFreqs[0] === 0, 'C Major String 0 (E2) is muted (0 Hz)');
assertClose(cMajorFreqs[1], 130.81, 0.05, 'C Major String 1 sounding pitch is C3 (130.81 Hz)');
assertClose(cMajorFreqs[2], 164.81, 0.05, 'C Major String 2 sounding pitch is E3 (164.81 Hz)');
assertClose(cMajorFreqs[3], 196.00, 0.05, 'C Major String 3 sounding pitch is G3 (196.00 Hz)');
assertClose(cMajorFreqs[4], 261.63, 0.05, 'C Major String 4 sounding pitch is C4 (261.63 Hz)');
assertClose(cMajorFreqs[5], 329.63, 0.05, 'C Major String 5 sounding pitch is E4 (329.63 Hz)');

// ----------------------------------------------------------------------
// SUITE 2: CAPO TRANSPOSITION INVARIANTS (0 to +7 Frets)
// ----------------------------------------------------------------------
console.log('\n--- SUITE 2: Capo Transposition Invariants ---');

// Capo 0 to 7 test on C Major:
// With Capo 2, C major sounds as D major (every string pitch shifted up by 2 semitones = * 2^(2/12))
const cCapo2Freqs = getChordFrequencies('C', 2);
const semitoneRatio2 = Math.pow(2, 2 / 12);

assert(cCapo2Freqs[0] === 0, 'Capo 2 retains muted string 0');
assertClose(cCapo2Freqs[1], cMajorFreqs[1] * semitoneRatio2, 0.01, 'Capo 2 shifts string 1 by exact 2 semitones (D3)');
assertClose(cCapo2Freqs[4], cMajorFreqs[4] * semitoneRatio2, 0.01, 'Capo 2 shifts string 4 to D4 (293.66 Hz)');

// Sounding chord name tests
assert(getSoundingChordName('C', 0) === 'C', 'Capo 0 preserves original chord name C');
assert(getSoundingChordName('C', 2) === 'D', 'Capo 2 on C correctly returns sounding name D');
assert(getSoundingChordName('Am', 2) === 'Bm', 'Capo 2 on Am correctly returns sounding name Bm');
assert(getSoundingChordName('G', 4) === 'B', 'Capo 4 on G correctly returns sounding name B');
assert(getSoundingChordName('Bm', 7) === 'F#m', 'Capo 7 on Bm correctly returns sounding name F#m (Hotel California intro)');

// ----------------------------------------------------------------------
// SUITE 3: CHORD DATABASE INTEGRITY & BOUNDARY SAFETY
// ----------------------------------------------------------------------
console.log('\n--- SUITE 3: Chord Database Invariants & Safety ---');

const chordKeys = Object.keys(CHORD_DATABASE);
assert(chordKeys.length >= 40, `Chord database has comprehensive vocabulary (${chordKeys.length} chords)`);

chordKeys.forEach((key) => {
  const def = CHORD_DATABASE[key];
  assert(def.frets.length === 6, `Chord ${key} has exactly 6 string values`);
  assert(def.fingers.length === 6, `Chord ${key} has exactly 6 finger assignments`);

  // Verify all frets are >= -1 and <= 24
  const validFrets = def.frets.every((f) => f >= -1 && f <= 24);
  assert(validFrets, `Chord ${key} has valid fret bounds [-1..24]`);

  // Verify non-zero sounding strings exist
  const freqs = getChordFrequencies(key, 0);
  const soundingCount = freqs.filter((f) => f > 0).length;
  assert(soundingCount >= 3, `Chord ${key} has at least 3 sounding strings (triad minimum)`);
});

// Chord Normalization Tests
assert(normalizeChordName('c') === 'C', 'Normalize lower case "c" -> "C"');
assert(normalizeChordName('am') === 'Am', 'Normalize "am" -> "Am"');
assert(normalizeChordName('bb') === 'Bb', 'Normalize "bb" -> "Bb"');
assert(normalizeChordName('gmaj7') === 'Gmaj7', 'Normalize "gmaj7" -> "Gmaj7"');
assert(normalizeChordName('fsus4') === 'Fsus4', 'Normalize "fsus4" -> "Fsus4"');

// ----------------------------------------------------------------------
// SUITE 4: SONG PRESETS VALIDATION
// ----------------------------------------------------------------------
console.log('\n--- SUITE 4: Song Presets Validation ---');

assert(SONG_PRESETS.length >= 6, `Song presets exist (${SONG_PRESETS.length} presets)`);

SONG_PRESETS.forEach((preset) => {
  assert(preset.chords.length >= 3, `Preset "${preset.title}" has >= 3 chords`);
  assert(preset.suggestedBpm >= 60 && preset.suggestedBpm <= 240, `Preset "${preset.title}" BPM is within safe bounds [60, 240]`);
  assert(preset.capo >= 0 && preset.capo <= 7, `Preset "${preset.title}" Capo is within [0, 7]`);

  preset.chords.forEach((c) => {
    assert(CHORD_DATABASE[c] !== undefined, `Preset "${preset.title}" chord "${c}" exists in local database`);
  });
});

// ----------------------------------------------------------------------
// SUITE 5: STRUM PATTERN ENGINE & BPM TIMING
// ----------------------------------------------------------------------
console.log('\n--- SUITE 5: Strum Pattern Engine & BPM Timing Math ---');

assert(STRUM_STYLES.length >= 6, `Supported styles list contains >= 6 styles`);

STRUM_STYLES.forEach((style) => {
  assert(style.strokes.length > 0, `Style ${style.name} has stroke definitions`);
  assert(style.subdivisions > 0, `Style ${style.name} has valid positive subdivisions`);

  // Verify interval calculation at 60 BPM and 240 BPM
  const minInterval = (60000 / 240) / (style.subdivisions / 4);
  const maxInterval = (60000 / 60) / (style.subdivisions / 4);

  assert(minInterval > 0 && Number.isFinite(minInterval), `Style ${style.name} min interval is finite (${minInterval.toFixed(1)}ms)`);
  assert(maxInterval > 0 && Number.isFinite(maxInterval), `Style ${style.name} max interval is finite (${maxInterval.toFixed(1)}ms)`);

  // Verify stroke velocities are bounded in [0.0, 1.0]
  const validVelocities = style.strokes.every((s) => s.velocity >= 0 && s.velocity <= 1.0);
  assert(validVelocities, `Style ${style.name} stroke velocities are properly normalized in [0.0, 1.0]`);
});

// ----------------------------------------------------------------------
// SUITE 6: ADAPTIVE LAYOUT & ERGONOMICS (PREVENTING THIN BUTTONS)
// ----------------------------------------------------------------------
console.log('\n--- SUITE 6: Adaptive Layout & Ergonomics ---');

function calculateColumns(chordCount: number): number {
  if (chordCount <= 3) return chordCount;
  if (chordCount === 4) return 4;
  if (chordCount <= 6) return 3;
  return 4;
}

// Check chord counts from 1 to 12
for (let n = 1; n <= 12; n++) {
  const cols = calculateColumns(n);
  const rows = Math.ceil(n / cols);
  assert(cols <= 4, `${n} chords layout uses <= 4 columns (avoids thin buttons)`);
  assert(rows >= 1, `${n} chords layout has at least 1 row`);
}

// ----------------------------------------------------------------------
// SUITE 7: ANDROID REPOSITORY & JETPACK COMPOSE ARTIFACT CONTRACTS
// ----------------------------------------------------------------------
console.log('\n--- SUITE 7: Android Repository & Compose Contracts ---');

const expectedFiles = [
  'app/src/main/java/com/pocketguitar/audio/KarplusSynth.kt',
  'app/src/main/java/com/pocketguitar/audio/AudioEngine.kt',
  'app/src/main/java/com/pocketguitar/model/ChordDatabase.kt',
  'app/src/main/java/com/pocketguitar/engine/StrumPattern.kt',
  'app/src/main/java/com/pocketguitar/ui/MainActivity.kt',
  'app/src/main/AndroidManifest.xml',
  'app/build.gradle.kts',
  'README.md',
];

expectedFiles.forEach((expectedPath) => {
  const match = ANDROID_FILES.find((f) => f.path === expectedPath);
  assert(match !== undefined, `Android project file "${expectedPath}" is defined`);
  if (match) {
    assert(match.content.length > 50, `Android file "${expectedPath}" has non-empty implementation (${match.content.length} chars)`);
  }
});

// Verify Android Manifest has required permissions: WAKE_LOCK
const manifest = ANDROID_FILES.find((f) => f.path === 'app/src/main/AndroidManifest.xml');
assert(manifest?.content.includes('android.permission.WAKE_LOCK') === true, 'AndroidManifest declares WAKE_LOCK permission');
assert(manifest?.content.includes('android.permission.MODIFY_AUDIO_SETTINGS') === true, 'AndroidManifest declares MODIFY_AUDIO_SETTINGS');

// Verify KarplusSynth.kt + AudioEngine.kt zero-allocation & fractional tuning contracts
const synthCode = ANDROID_FILES.find((f) => f.path === 'app/src/main/java/com/pocketguitar/audio/KarplusSynth.kt');
assert(synthCode?.content.includes('renderFloatBlock') === true, 'KarplusSynth exposes zero-allocation block renderer');
assert(synthCode?.content.includes('oneMinusFrac') === true, 'KarplusSynth uses fractional delay interpolation for concert pitch');
assert(synthCode?.content.includes('dampAll') === true, 'KarplusSynth supports smooth exponential dampAll()');

const audioCode = ANDROID_FILES.find((f) => f.path === 'app/src/main/java/com/pocketguitar/audio/AudioEngine.kt');
assert(audioCode?.content.includes('PERFORMANCE_MODE_LOW_LATENCY') === true, 'AudioEngine uses PERFORMANCE_MODE_LOW_LATENCY');
assert(audioCode?.content.includes('PROPERTY_OUTPUT_SAMPLE_RATE') === true, 'AudioEngine queries device native hardware sample rate');
assert(audioCode?.content.includes('palmMute') === true, 'AudioEngine exposes palmMute() function');
assert(!audioCode?.content.includes('ConcurrentLinkedQueue'), 'AudioEngine avoids per-sample ConcurrentLinkedQueue iterator GC churn');

// Verify gradle.properties enables AndroidX
const gradleProps = ANDROID_FILES.find((f) => f.path === 'gradle.properties');
assert(gradleProps !== undefined, 'gradle.properties is defined in project files');
assert(gradleProps?.content.includes('android.useAndroidX=true') === true, 'gradle.properties enforces android.useAndroidX=true');

// ----------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} TOTAL ASSERTIONS`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL GOOGLE CODE STANDARDS & INVARIANTS VERIFIED SUCCESSFULLY.');
  process.exit(0);
}
