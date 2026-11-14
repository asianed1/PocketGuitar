import React from 'react';
import { ChordDefinition } from '../data/chords';

interface ChordDiagramSvgProps {
  chord: ChordDefinition;
  className?: string;
  width?: number;
  height?: number;
  accentColor?: string;
}

export const ChordDiagramSvg: React.FC<ChordDiagramSvgProps> = ({
  chord,
  className = '',
  width = 120,
  height = 140,
  accentColor = '#f59e0b',
}) => {
  const left = 24;
  const right = width - 24;
  const top = 34;
  const bottom = height - 16;
  const gridWidth = right - left;
  const gridHeight = bottom - top;
  const numFrets = 4;
  const fretSpacing = gridHeight / numFrets;
  const stringSpacing = gridWidth / 5;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`select-none overflow-visible ${className}`}
      aria-label={`Chord diagram for ${chord.name}`}
    >
      {/* Nut (Thick horizontal bar at fret 0) */}
      <line
        x1={left - 2}
        y1={top}
        x2={right + 2}
        y2={top}
        stroke="#cbd5e1"
        strokeWidth={4.5}
        strokeLinecap="round"
      />

      {/* Fret wire lines */}
      {[1, 2, 3, 4].map((fret) => {
        const y = top + fret * fretSpacing;
        return (
          <line
            key={`fret-${fret}`}
            x1={left}
            y1={y}
            x2={right}
            y2={y}
            stroke="#475569"
            strokeWidth={1.5}
          />
        );
      })}

      {/* 6 Vertical Strings (String 0 / Low E is thicker, String 5 / High e is thinner) */}
      {[0, 1, 2, 3, 4, 5].map((strIdx) => {
        const x = left + strIdx * stringSpacing;
        const strokeWidth = Math.max(1, 3.2 - strIdx * 0.45);
        return (
          <line
            key={`string-${strIdx}`}
            x1={x}
            y1={top}
            x2={x}
            y2={bottom}
            stroke="#94a3b8"
            strokeWidth={strokeWidth}
          />
        );
      })}

      {/* Markers above nut: 'x' for mute, 'o' for open */}
      {chord.frets.map((fret, strIdx) => {
        const x = left + strIdx * stringSpacing;
        const y = top - 12;

        if (fret < 0) {
          // Muted string 'x'
          return (
            <g key={`mute-${strIdx}`}>
              <line
                x1={x - 4}
                y1={y - 4}
                x2={x + 4}
                y2={y + 4}
                stroke="#ef4444"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1={x - 4}
                y1={y + 4}
                x2={x + 4}
                y2={y - 4}
                stroke="#ef4444"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>
          );
        }

        if (fret === 0) {
          // Open string 'o'
          return (
            <circle
              key={`open-${strIdx}`}
              cx={x}
              cy={y}
              r={3.8}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.8}
            />
          );
        }

        return null;
      })}

      {/* Barre chord indicator bar */}
      {chord.barreFret && chord.barreFrom !== undefined && (
        <line
          x1={left + chord.barreFrom * stringSpacing}
          y1={top + (chord.barreFret - 0.5) * fretSpacing}
          x2={right}
          y2={top + (chord.barreFret - 0.5) * fretSpacing}
          stroke={accentColor}
          strokeWidth={11}
          strokeLinecap="round"
          opacity={0.85}
        />
      )}

      {/* Finger dots */}
      {chord.frets.map((fret, strIdx) => {
        if (fret <= 0) return null;
        const x = left + strIdx * stringSpacing;
        const y = top + (fret - 0.5) * fretSpacing;
        const finger = chord.fingers ? chord.fingers[strIdx] : 0;

        return (
          <g key={`dot-${strIdx}`}>
            <circle
              cx={x}
              cy={y}
              r={7.5}
              fill={accentColor}
              stroke="#0f172a"
              strokeWidth={1.5}
            />
            {finger > 0 && (
              <text
                x={x}
                y={y + 3.2}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="#0f172a"
                className="font-mono select-none"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
