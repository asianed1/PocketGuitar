import React, { useState } from 'react';
import { TopNav } from './components/TopNav';
import { SetupView } from './components/SetupView';
import { PerformanceView } from './components/PerformanceView';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { STRUM_STYLES, StrumStyle } from './engine/strumPatterns';
import { Play, Sliders, Terminal, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'performance' | 'setup'>('performance');
  const [selectedChords, setSelectedChords] = useState<string[]>(['C', 'G', 'Am', 'F']);
  const [selectedStyle, setSelectedStyle] = useState<StrumStyle>(STRUM_STYLES[0]);
  const [bpm, setBpm] = useState<number>(104);
  const [capo, setCapo] = useState<number>(0);

  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Top Navigation */}
      <TopNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAndroidExport={() => setIsAndroidModalOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
        {currentTab === 'performance' ? (
          <PerformanceView
            selectedChords={selectedChords}
            selectedStyle={selectedStyle}
            bpm={bpm}
            capo={capo}
            onOpenSettings={() => setCurrentTab('setup')}
          />
        ) : (
          <SetupView
            selectedChords={selectedChords}
            onChordsChange={setSelectedChords}
            selectedStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
            bpm={bpm}
            onBpmChange={setBpm}
            capo={capo}
            onCapoChange={setCapo}
            onStartPlaying={() => setCurrentTab('performance')}
          />
        )}
      </main>

      {/* Mobile Ergonomic Bottom Tab Bar (Pattern 1 from Mobile Design Reference) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-14 px-2">
        <button
          onClick={() => setCurrentTab('performance')}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            currentTab === 'performance' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span className="text-[10px] mt-1">Play</span>
        </button>

        <button
          onClick={() => setCurrentTab('setup')}
          className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            currentTab === 'setup' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px] mt-1">Chords</span>
        </button>

        <button
          onClick={() => setIsGuideOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-[10px] mt-1">Guide</span>
        </button>

        <button
          onClick={() => setIsAndroidModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Terminal className="w-4 h-4" />
          <span className="text-[10px] mt-1">Export</span>
        </button>
      </nav>

      {/* Android Project Studio Modal */}
      <AndroidProjectModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* How to Play Guide Modal */}
      <HowToPlayModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
