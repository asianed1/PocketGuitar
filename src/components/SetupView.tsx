import React, { useState, useRef } from 'react';
import { Play, Plus, Trash2, Volume2, Music, Sliders, Sparkles, RefreshCw } from 'lucide-react';
import { CHORD_DATABASE, SONG_PRESETS, SongPreset, getChordFrequencies, normalizeChordName, getSoundingChordName } from '../data/chords';
import { STRUM_STYLES, StrumStyle } from '../engine/strumPatterns';
import { guitarAudioEngine } from '../audio/GuitarAudioEngine';
import { ChordDiagramSvg } from './ChordDiagramSvg';

interface SetupViewProps {
  selectedChords: string[];
  onChordsChange: (chords: string[]) => void;
  selectedStyle: StrumStyle;
  onStyleChange: (style: StrumStyle) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  capo: number;
  onCapoChange: (capo: number) => void;
  onStartPlaying: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({
  selectedChords,
  onChordsChange,
  selectedStyle,
  onStyleChange,
  bpm,
  onBpmChange,
  capo,
  onCapoChange,
  onStartPlaying,
}) => {
  const [textInput, setTextInput] = useState('');
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedQuality, setSelectedQuality] = useState('Major');
  const [inputError, setInputError] = useState<string | null>(null);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);

  const roots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const qualities = [
    { label: 'Maj', value: '' },
    { label: 'm (Minor)', value: 'm' },
    { label: '7', value: '7' },
    { label: 'maj7', value: 'maj7' },
    { label: 'm7', value: 'm7' },
    { label: 'sus4', value: 'sus4' },
    { label: 'sus2', value: 'sus2' },
    { label: 'add9', value: 'add9' },
    { label: 'dim', value: 'dim' },
    { label: 'aug', value: 'aug' },
    { label: '5 (Power)', value: '5' },
  ];

  const handleApplyPreset = (preset: SongPreset) => {
    onChordsChange(preset.chords);
    const matchedStyle = STRUM_STYLES.find((s) => s.id === preset.suggestedStyle.toLowerCase()) || STRUM_STYLES[0];
    onStyleChange(matchedStyle);
    onBpmChange(preset.suggestedBpm);
    onCapoChange(preset.capo);
  };

  const handleAddCustomChord = () => {
    const raw = `${selectedRoot}${selectedQuality}`;
    const norm = normalizeChordName(raw);
    if (!CHORD_DATABASE[norm]) {
      setInputError(`Chord "${raw}" is not yet in library.`);
      return;
    }
    if (!selectedChords.includes(norm)) {
      onChordsChange([...selectedChords, norm]);
    }
    setInputError(null);
  };

  const handleParseTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    // Split on commas or whitespace
    const tokens = textInput
      .split(/[, ]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const validChords: string[] = [];
    const invalidChords: string[] = [];

    tokens.forEach((t) => {
      const norm = normalizeChordName(t);
      if (CHORD_DATABASE[norm]) {
        if (!validChords.includes(norm)) validChords.push(norm);
      } else {
        invalidChords.push(t);
      }
    });

    if (validChords.length > 0) {
      onChordsChange(validChords);
      setTextInput('');
    }

    if (invalidChords.length > 0) {
      setInputError(`Could not find chords: ${invalidChords.join(', ')}`);
    } else {
      setInputError(null);
    }
  };

  const handleRemoveChord = (chordName: string) => {
    if (selectedChords.length <= 1) return; // Keep at least 1 chord
    onChordsChange(selectedChords.filter((c) => c !== chordName));
  };

  const handlePreviewChord = (chordName: string) => {
    const freqs = getChordFrequencies(chordName, capo);
    guitarAudioEngine.strumChord(freqs, { direction: 'down', velocity: 0.85 });
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const tapTimes = tapTimesRef.current;

    // Reset if last tap was over 2.5s ago
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2500) {
      tapTimes.length = 0;
    }

    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();

    if (tapTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 50 && calculatedBpm <= 260) {
        onBpmChange(Math.max(60, Math.min(240, calculatedBpm)));
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Hero Setup Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Song Rig & Rhythm Config
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pick song chords, strumming style, and tempo — then switch to the touch performance deck.
          </p>
        </div>

        <button
          onClick={onStartPlaying}
          className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Performance Deck</span>
        </button>
      </div>

      {/* 1. SONG PRESETS */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Song Presets</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SONG_PRESETS.map((preset) => {
            const isMatch =
              preset.chords.length === selectedChords.length &&
              preset.chords.every((c, i) => c === selectedChords[i]);

            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isMatch
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-white truncate">{preset.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{preset.artist}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400/90 font-mono font-medium">
                  <span>{preset.chords.join(' - ')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. CHORD SELECTION DECK */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Performance Chords ({selectedChords.length})</span>
          </div>
          <span className="text-xs text-slate-500">Click speaker to audition chord</span>
        </div>

        {/* Current Active Chord Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {selectedChords.map((chordName) => {
            const chordDef = CHORD_DATABASE[chordName] || CHORD_DATABASE['C'];
            const soundingName = getSoundingChordName(chordName, capo);

            return (
              <div
                key={chordName}
                className="group relative p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-between hover:border-slate-700 transition-colors"
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveChord(chordName)}
                  title="Remove chord"
                  className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Audition sound button */}
                <button
                  onClick={() => handlePreviewChord(chordName)}
                  title="Preview acoustic sound"
                  className="absolute top-2 left-2 p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>

                <div className="text-center mt-3">
                  <div className="text-lg font-bold text-white font-display">{chordName}</div>
                  {capo > 0 && (
                    <div className="text-[10px] font-mono text-amber-400">({soundingName})</div>
                  )}
                </div>

                {/* SVG Finger Diagram */}
                <div className="w-24 h-24 my-1 flex items-center justify-center">
                  <ChordDiagramSvg chord={chordDef} width={96} height={105} />
                </div>

                <div className="text-[10px] text-slate-500 font-mono">
                  {chordDef.frets.map((f) => (f < 0 ? 'x' : f)).join(' ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Input: Type chords or Pick via Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Option A: Type chords */}
          <form
            onSubmit={handleParseTextInput}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5"
          >
            <label className="text-xs font-semibold text-slate-300">
              Type Chord Progression
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g. C, F, Gmaj7, Fsus4, E, Bb, G#"
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Set Chords
              </button>
            </div>
            {inputError && <p className="text-[11px] text-rose-400">{inputError}</p>}
          </form>

          {/* Option B: Visual Chord Picker */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Chord Builder
              </label>
              <button
                type="button"
                onClick={handleAddCustomChord}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add {selectedRoot}{selectedQuality}</span>
              </button>
            </div>

            <div className="space-y-2">
              {/* Root selector */}
              <div className="flex flex-wrap gap-1">
                {roots.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRoot(r)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      selectedRoot === r
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Quality selector */}
              <div className="flex flex-wrap gap-1">
                {qualities.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setSelectedQuality(q.value)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                      selectedQuality === q.value
                        ? 'bg-slate-100 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STRUMMING STYLE & SPEED */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Strumming Rhythm & Tempo</span>
        </div>

        {/* Styles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STRUM_STYLES.map((style) => {
            const isSelected = selectedStyle.id === style.id;
            return (
              <button
                key={style.id}
                onClick={() => {
                  onStyleChange(style);
                  onBpmChange(style.defaultBpm);
                }}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">{style.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{style.timeSignature}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {style.description}
                </div>
                {/* Visual stroke pattern pill */}
                <div className="mt-2.5 flex items-center gap-1 overflow-x-auto py-0.5">
                  {style.strokes.slice(0, 8).map((st, i) => (
                    <span
                      key={i}
                      className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                        st.action.includes('accent')
                          ? 'bg-amber-500/30 text-amber-200 font-bold'
                          : st.action.includes('down')
                          ? 'bg-slate-800 text-slate-200'
                          : st.action.includes('up')
                          ? 'bg-slate-800 text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {st.action.includes('down') ? '↓' : st.action.includes('up') ? '↑' : st.action === 'rest' ? '·' : '★'}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tempo & Capo Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Tempo BPM */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">Tempo (Speed)</span>
                <span className="text-xs text-slate-500 ml-2">60 – 240 BPM</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTapTempo}
                  className="px-2 py-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded hover:bg-amber-500/30 transition-colors active:scale-95 cursor-pointer"
                >
                  Tap Tempo
                </button>
                <span className="text-base font-bold font-mono text-amber-400 tabular-nums">
                  {bpm} BPM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onBpmChange(Math.max(60, bpm - 5))}
                className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold"
              >
                -5
              </button>
              <input
                type="range"
                min={60}
                max={240}
                value={bpm}
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => onBpmChange(Math.min(240, bpm + 5))}
                className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold"
              >
                +5
              </button>
            </div>
          </div>

          {/* Capo Transpose */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300">Capo (Transpose)</span>
                <span className="text-xs text-slate-500 ml-2">0 – +7 Frets</span>
              </div>
              <div className="flex items-center gap-2">
                {capo > 0 && (
                  <button
                    onClick={() => onCapoChange(0)}
                    className="p-1 text-slate-500 hover:text-slate-300"
                    title="Reset capo"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
                <span className="text-base font-bold font-mono text-amber-400">
                  {capo === 0 ? 'No Capo' : `+${capo} Frets`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={7}
                step={1}
                value={capo}
                onChange={(e) => onCapoChange(Number(e.target.value))}
                className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="text-[11px] text-slate-400">
              {capo === 0 ? (
                <span>Sounding at concert pitch (open fretboard)</span>
              ) : (
                <span>
                  Chords transpose up {capo} semitones:{' '}
                  <strong className="text-slate-200">
                    {selectedChords
                      .slice(0, 3)
                      .map((c) => `${c} → ${getSoundingChordName(c, capo)}`)
                      .join(', ')}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
