import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VolumeX, ArrowDown, ArrowUp, Sun, Sparkles, Smartphone, Maximize2, Sliders } from 'lucide-react';
import { CHORD_DATABASE, getChordFrequencies, getSoundingChordName } from '../data/chords';
import { StrumStyle } from '../engine/strumPatterns';
import { guitarAudioEngine } from '../audio/GuitarAudioEngine';
import { ChordDiagramSvg } from './ChordDiagramSvg';

interface PerformanceViewProps {
  selectedChords: string[];
  selectedStyle: StrumStyle;
  bpm: number;
  capo: number;
  onOpenSettings: () => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  selectedChords,
  selectedStyle,
  bpm,
  capo,
  onOpenSettings,
}) => {
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [lastStrumDirection, setLastStrumDirection] = useState<'down' | 'up' | null>(null);
  const [vibratingStrings, setVibratingStrings] = useState<number[]>([]);
  const [isPalmMuted, setIsPalmMuted] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [isPhoneFrameActive, setIsPhoneFrameActive] = useState<boolean>(false);

  // References for timing loop and touch tracking
  const rhythmTimerRef = useRef<number | null>(null);
  const touchStartYMap = useRef<Map<number, number>>(new Map());
  const wakeLockSentinelRef = useRef<any>(null);

  // Keep phone screen awake while playing
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          wakeLockSentinelRef.current = sentinel;
          setWakeLockActive(true);
          sentinel.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } catch {
          // WakeLock not supported or denied
        }
      }
    }

    requestWakeLock();

    return () => {
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release().catch(() => {});
        wakeLockSentinelRef.current = null;
      }
    };
  }, []);

  // Visual string vibration callback
  useEffect(() => {
    guitarAudioEngine.setPluckVisualCallback((stringIdx) => {
      setVibratingStrings((prev) => (prev.includes(stringIdx) ? prev : [...prev, stringIdx]));
      setTimeout(() => {
        setVibratingStrings((prev) => prev.filter((i) => i !== stringIdx));
      }, 350);
    });

    return () => {
      guitarAudioEngine.setPluckVisualCallback(undefined);
    };
  }, []);

  // Strumming loop runner for when a chord key is held down
  const startRhythmLoop = useCallback(
    (chordName: string) => {
      guitarAudioEngine.ensureContext();
      if (rhythmTimerRef.current !== null) {
        clearInterval(rhythmTimerRef.current);
      }

      setIsHolding(true);
      setActiveChord(chordName);

      const chord = CHORD_DATABASE[chordName] || CHORD_DATABASE['C'];
      const freqs = getChordFrequencies(chordName, capo);

      // Interval calculation: 60,000 / BPM / (subdivisions / 4)
      const stepIntervalMs = Math.round((60000 / bpm) / (selectedStyle.subdivisions / 4));
      let stepIndex = 0;

      const triggerStroke = () => {
        const stroke = selectedStyle.strokes[stepIndex % selectedStyle.strokes.length];
        setCurrentStep(stepIndex % selectedStyle.strokes.length);

        switch (stroke.action) {
          case 'down':
          case 'accent-down': {
            setLastStrumDirection('down');
            guitarAudioEngine.strumChord(freqs, {
              direction: 'down',
              velocity: stroke.velocity,
              accent: stroke.action === 'accent-down',
              interStringDelayMs: stroke.interStringDelayMs || 14,
            });
            break;
          }
          case 'up':
          case 'accent-up': {
            setLastStrumDirection('up');
            guitarAudioEngine.strumChord(freqs, {
              direction: 'up',
              velocity: stroke.velocity,
              accent: stroke.action === 'accent-up',
              interStringDelayMs: stroke.interStringDelayMs || 12,
            });
            break;
          }
          case 'pluck-bass': {
            // Find first sounding bass string
            const bassIdx = freqs.findIndex((f) => f > 20);
            if (bassIdx !== -1) {
              guitarAudioEngine.pluckString(bassIdx, freqs[bassIdx], 0, stroke.velocity);
            }
            break;
          }
          case 'pluck-string': {
            const idx = stroke.stringIndex ?? 0;
            if (freqs[idx] > 20) {
              guitarAudioEngine.pluckString(idx, freqs[idx], 0, stroke.velocity);
            }
            break;
          }
          case 'rest':
          default:
            break;
        }

        stepIndex++;
      };

      // Trigger first beat instantly
      triggerStroke();
      rhythmTimerRef.current = window.setInterval(triggerStroke, stepIntervalMs);
    },
    [bpm, capo, selectedStyle]
  );

  const stopRhythmLoop = useCallback(() => {
    if (rhythmTimerRef.current !== null) {
      clearInterval(rhythmTimerRef.current);
      rhythmTimerRef.current = null;
    }
    setIsHolding(false);
    setActiveChord(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rhythmTimerRef.current !== null) {
        clearInterval(rhythmTimerRef.current);
      }
    };
  }, []);

  // Manual Swipe Strumming
  const handlePointerDown = (chordName: string, e: React.PointerEvent) => {
    e.preventDefault();
    touchStartYMap.current.set(e.pointerId, e.clientY);
    startRhythmLoop(chordName);
  };

  const handlePointerMove = (chordName: string, e: React.PointerEvent) => {
    const startY = touchStartYMap.current.get(e.pointerId);
    if (startY !== undefined) {
      const deltaY = e.clientY - startY;
      // If user drags finger down > 28px: Manual Downstrum
      if (deltaY > 28) {
        touchStartYMap.current.set(e.pointerId, e.clientY); // reset anchor
        const freqs = getChordFrequencies(chordName, capo);
        setLastStrumDirection('down');
        guitarAudioEngine.strumChord(freqs, { direction: 'down', velocity: 0.95 });
      }
      // If user drags finger up < -28px: Manual Upstrum
      else if (deltaY < -28) {
        touchStartYMap.current.set(e.pointerId, e.clientY);
        const freqs = getChordFrequencies(chordName, capo);
        setLastStrumDirection('up');
        guitarAudioEngine.strumChord(freqs, { direction: 'up', velocity: 0.88 });
      }
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    touchStartYMap.current.delete(e.pointerId);
    stopRhythmLoop();
  };

  // Dedicated Palm Mute Action
  const handlePalmMute = () => {
    guitarAudioEngine.palmMute();
    setIsPalmMuted(true);
    setTimeout(() => setIsPalmMuted(false), 200);
  };

  const stringNames = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

  const deckContent = (
    <div className="flex flex-col h-full w-full select-none touch-none">
      {/* Top HUD Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl mb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="font-semibold text-white">{selectedStyle.name}</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-amber-400 font-bold">{bpm} BPM</span>
            {capo > 0 && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-xs font-semibold text-amber-400">Capo +{capo}</span>
              </>
            )}
            <span className="text-slate-500">·</span>
            <span className="text-[10px] text-emerald-400 font-medium">Offline Engine</span>
          </div>
          {wakeLockActive && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium">
              <Sun className="w-3 h-3" />
              <span>Screen Awake</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Edit Chords button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title="Edit chord progression or style"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Edit Chords</span>
          </button>

          {/* Bezel view toggle */}
          <button
            onClick={() => setIsPhoneFrameActive(!isPhoneFrameActive)}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title="Toggle Horizontal Android Phone frame"
          >
            {isPhoneFrameActive ? (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>Fill View</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3 rotate-90" />
                <span>Horizontal Phone Bezel</span>
              </>
            )}
          </button>

          {/* Live Strum Pattern Metronome Visualizer */}
          <div className="flex items-center gap-1">
            {selectedStyle.strokes.map((stroke, idx) => {
              const isStepActive = isHolding && currentStep === idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-5 rounded flex items-center justify-center text-[9px] font-mono transition-all ${
                    isStepActive
                      ? 'bg-amber-400 text-slate-950 font-extrabold scale-110 shadow-sm shadow-amber-400/50'
                      : stroke.action === 'rest'
                      ? 'bg-slate-950/40 text-slate-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {stroke.action.includes('down') ? '↓' : stroke.action.includes('up') ? '↑' : '·'}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive 6-String Bridge Vibration Visualizer */}
      <div className="relative h-6 mb-2 bg-slate-950/70 border border-slate-800/80 rounded-lg px-4 flex items-center justify-between shrink-0 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((strIdx) => {
          const isVibrating = vibratingStrings.includes(strIdx);
          return (
            <div
              key={strIdx}
              onClick={() => {
                const activeChordName = activeChord || selectedChords[0];
                const freqs = getChordFrequencies(activeChordName, capo);
                if (freqs[strIdx] > 20) {
                  guitarAudioEngine.pluckString(strIdx, freqs[strIdx], 0, 0.9);
                }
              }}
              className="group flex-1 flex flex-col items-center justify-center cursor-pointer py-0.5"
            >
              <div
                className={`w-full transition-all duration-75 ${
                  isVibrating
                    ? 'h-1 bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse'
                    : 'h-[1.5px] bg-slate-700 group-hover:bg-amber-400/60'
                }`}
              />
              <span className="text-[8px] font-mono text-slate-500 group-hover:text-amber-400 mt-0.5">
                {stringNames[strIdx]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Performance Deck: Laid out horizontally across screen */}
      <div
        className={`flex-1 gap-2 min-h-0 ${
          selectedChords.length === 1
            ? 'grid grid-cols-1'
            : selectedChords.length === 2
            ? 'grid grid-cols-2'
            : selectedChords.length === 3
            ? 'grid grid-cols-3'
            : selectedChords.length === 4
            ? 'grid grid-cols-4'
            : selectedChords.length === 5
            ? 'grid grid-cols-5'
            : selectedChords.length === 6
            ? 'grid grid-cols-3 grid-rows-2'
            : 'grid grid-cols-4 grid-rows-2'
        }`}
      >
        {selectedChords.map((chordName) => {
          const chordDef = CHORD_DATABASE[chordName] || CHORD_DATABASE['C'];
          const isCurrentActive = activeChord === chordName;
          const soundingName = getSoundingChordName(chordName, capo);

          return (
            <div
              key={chordName}
              onPointerDown={(e) => handlePointerDown(chordName, e)}
              onPointerMove={(e) => handlePointerMove(chordName, e)}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              className={`relative rounded-xl flex flex-col items-center justify-between p-2.5 select-none touch-none cursor-pointer transition-all duration-75 border ${
                isCurrentActive
                  ? 'bg-gradient-to-b from-amber-600/30 to-amber-950/80 border-amber-400 shadow-xl shadow-amber-500/20 scale-[0.99]'
                  : 'bg-gradient-to-b from-slate-850 to-slate-900 border-slate-800 hover:border-slate-700 active:scale-[0.98]'
              }`}
            >
              {/* Header: Chord Name & Sounding Pitch */}
              <div className="w-full flex items-center justify-between pointer-events-none">
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight leading-none">
                    {chordName}
                  </h3>
                  {capo > 0 && (
                    <span className="text-[10px] font-mono text-amber-400 font-semibold">
                      ({soundingName})
                    </span>
                  )}
                </div>

                {/* Strum direction indicator arrow */}
                {isCurrentActive && lastStrumDirection && (
                  <div className="p-1 rounded-full bg-amber-400 text-slate-950 animate-bounce">
                    {lastStrumDirection === 'down' ? (
                      <ArrowDown className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <ArrowUp className="w-3 h-3 stroke-[3]" />
                    )}
                  </div>
                )}
              </div>

              {/* 6-String Chord Finger Placement Diagram */}
              <div className="w-full flex-1 min-h-0 my-0.5 flex items-center justify-center pointer-events-none">
                <ChordDiagramSvg
                  chord={chordDef}
                  width={96}
                  height={110}
                  accentColor={isCurrentActive ? '#fbbf24' : '#f59e0b'}
                />
              </div>

              {/* Action Hint */}
              <div className="w-full flex items-center justify-between text-[10px] text-slate-400 pointer-events-none border-t border-slate-800/80 pt-1">
                <span className="font-semibold tracking-wider text-[9px] text-amber-400/90 uppercase">
                  Hold: Loop
                </span>
                <span className="font-semibold tracking-wider text-[9px] text-slate-400 uppercase">
                  Swipe: Strum
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DEDICATED PALM MUTE BAR (Bottom horizontal bar for thumbs/palms) */}
      <div className="mt-2 shrink-0">
        <button
          type="button"
          onPointerDown={handlePalmMute}
          className={`w-full h-12 sm:h-14 rounded-xl flex items-center justify-center gap-2.5 font-display font-extrabold text-xs sm:text-sm tracking-wider uppercase border transition-all cursor-pointer ${
            isPalmMuted
              ? 'bg-rose-600 text-white border-rose-400 scale-[0.98] shadow-lg shadow-rose-600/40'
              : 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border-rose-800/80 active:bg-rose-600 active:text-white'
          }`}
        >
          <VolumeX className="w-4 h-4 stroke-[2.5]" />
          <span>Palm Mute Bar (Tap to Choke Sound)</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] p-2 sm:p-4 flex items-center justify-center select-none touch-none">
      {isPhoneFrameActive ? (
        /* Horizontal Android Phone Device Simulator (Landscape 19.5:9 Frame) */
        <div className="relative w-full max-w-[960px] h-full max-h-[460px] bg-slate-950 border-[10px] border-slate-800 rounded-[36px] shadow-2xl p-3 flex flex-col justify-between overflow-hidden">
          {/* Front camera punch-hole cutout on left edge */}
          <div className="absolute top-1/2 left-2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-slate-800 shadow-inner z-30" />

          {/* Android Landscape Status bar */}
          <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 px-4 pb-1 shrink-0 z-20">
            <span>10:42 PM · 5G</span>
            <span className="font-semibold text-slate-400">Android Landscape Mode</span>
            <span>100% 🔋</span>
          </div>

          {/* Screen area inside phone */}
          <div className="flex-1 min-h-0 pl-3">
            {deckContent}
          </div>

          {/* On-screen Android bottom navigation gesture bar */}
          <div className="w-32 h-1 bg-slate-700/80 rounded-full mx-auto mt-1 shrink-0" />
        </div>
      ) : (
        /* Fullscreen responsive landscape view */
        <div className="w-full h-full max-w-7xl mx-auto">
          {deckContent}
        </div>
      )}
    </div>
  );
};
