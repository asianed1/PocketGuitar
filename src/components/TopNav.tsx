import React from 'react';
import { Terminal } from 'lucide-react';

interface TopNavProps {
  currentTab: 'performance' | 'setup';
  onSelectTab: (tab: 'performance' | 'setup') => void;
  onOpenAndroidExport: () => void;
  onOpenGuide: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAndroidExport,
  onOpenGuide,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onSelectTab('performance')}
        className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors cursor-pointer"
      >
        PocketGuitar
      </button>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => onSelectTab('performance')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'performance' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Performance Deck
        </button>
        <button
          onClick={() => onSelectTab('setup')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'setup' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Chords & Rhythm
        </button>
        <button
          onClick={onOpenGuide}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer text-slate-400"
        >
          Playing Guide
        </button>
        <button
          onClick={onOpenAndroidExport}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer text-slate-400 flex items-center gap-1.5"
        >
          <span>Android Source</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenAndroidExport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-amber-400/20"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Android Project</span>
        </button>
      </div>
    </header>
  );
};
