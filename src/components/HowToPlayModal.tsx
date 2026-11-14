import React from 'react';
import { X, Hand, MoveDown, VolumeX, Sliders, Smartphone } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const instructions = [
    {
      icon: Hand,
      title: 'Hold Key (Continuous Rhythm)',
      desc: 'Press and hold down any chord pad. The engine will loop strumming strokes in your selected rhythm style (Folk, Rock, Pop, etc.) at the exact BPM until released.',
    },
    {
      icon: MoveDown,
      title: 'Swipe Down / Up (Expressive Strumming)',
      desc: 'Drag your finger downward across a chord key for a warm, bass-driven downstrum, or flick upward for a crisp treble upstrum.',
    },
    {
      icon: VolumeX,
      title: 'Palm Mute Bar (Acoustic Choke)',
      desc: 'Tap the dedicated red Palm Mute bar at the bottom with your palm or thumb. It instantly stops all resonating string harmonics with an authentic wooden thud.',
    },
    {
      icon: Sliders,
      title: 'Capo Transpose (0 to +7 Frets)',
      desc: 'Slide the Capo in the setup screen to raise the pitch of every chord on the fly without changing chord finger shapes.',
    },
    {
      icon: Smartphone,
      title: 'Screen Wake Lock & Ultra-Low Latency',
      desc: 'The audio engine responds in under 15 milliseconds. The screen is kept awake automatically during live performances so it never sleeps mid-song.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white font-display">
            How to Play PocketGuitar
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-5">
          {instructions.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Got It, Let’s Play!
        </button>
      </div>
    </div>
  );
};
