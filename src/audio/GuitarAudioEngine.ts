/**
 * Ultra-low latency Guitar Audio Engine
 * - Physical acoustic model with pick transient exciter, harmonic string overtones,
 *   body cavity resonance, and wood soundboard filtering.
 * - Strum dispersion logic: 10-20ms per string, downstrums (E2->E4) vs upstrums (E4->E2).
 * - Humanized micro-timing and velocity jitter (natural acoustic feel).
 * - Palm mute acoustic damping (15ms choke with high-frequency attenuation).
 * - Latency: < 15ms response from touch event.
 */

export interface StrumOptions {
  direction?: 'down' | 'up';
  velocity?: number; // 0.0 to 1.0
  interStringDelayMs?: number; // default 14ms
  mute?: boolean; // palm muted strum
  accent?: boolean;
}

export interface PluckVisualCallback {
  (stringIndex: number, frequency: number, velocity: number): void;
}

class GuitarAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bodyFilterLow: BiquadFilterNode | null = null;
  private bodyFilterMid: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activeVoices: { stop: (time: number) => void; gainNode: GainNode }[] = [];
  private onPluckCallback?: PluckVisualCallback;
  private isMuted: boolean = false;

  public init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Acoustic Guitar Body Resonators:
    // 1. Dreadnought air cavity resonance (~105 Hz)
    this.bodyFilterLow = this.ctx.createBiquadFilter();
    this.bodyFilterLow.type = 'peaking';
    this.bodyFilterLow.frequency.value = 105;
    this.bodyFilterLow.Q.value = 2.5;
    this.bodyFilterLow.gain.value = 3.5;

    // 2. Sitka spruce soundboard top plate resonance (~280 Hz)
    this.bodyFilterMid = this.ctx.createBiquadFilter();
    this.bodyFilterMid.type = 'peaking';
    this.bodyFilterMid.frequency.value = 280;
    this.bodyFilterMid.Q.value = 1.8;
    this.bodyFilterMid.gain.value = 2.2;

    // 3. Fast brickwall compressor/limiter to prevent clipping during aggressive strums
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-3, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.05, this.ctx.currentTime);

    // Audio Graph: Voices -> MasterGain -> BodyLow -> BodyMid -> Compressor -> Destination
    this.masterGain.connect(this.bodyFilterLow);
    this.bodyFilterLow.connect(this.bodyFilterMid);
    this.bodyFilterMid.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  public setPluckVisualCallback(callback?: PluckVisualCallback) {
    this.onPluckCallback = callback;
  }

  public ensureContext() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Strum a full chord across 6 strings with realistic physical delay & direction
   */
  public strumChord(
    frequencies: number[], // 6 elements (Hz) for strings 0(E2) to 5(e4). 0 means muted/unplayed.
    options: StrumOptions = {}
  ) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const {
      direction = 'down',
      velocity = 0.8,
      interStringDelayMs = 14,
      mute = false,
      accent = false,
    } = options;

    const now = this.ctx.currentTime;
    const baseVelocity = accent ? Math.min(1.0, velocity * 1.25) : velocity;

    // Downstrum: Low E (string 0) to High e (string 5)
    // Upstrum: High e (string 5) to Low E (string 0)
    const stringIndices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    // Filter to only strings that are actually sounded in the chord
    const playableStrings = stringIndices.filter((idx) => frequencies[idx] > 20);
    if (playableStrings.length === 0) return;

    // Strum dispersion: 10ms - 20ms delay per string with slight human micro-jitter
    playableStrings.forEach((stringIndex, orderIndex) => {
      // Natural human strum speed: slightly accelerates towards the end of the stroke
      const speedJitter = 1 + (Math.random() * 0.12 - 0.06);
      const delaySec = (orderIndex * (interStringDelayMs / 1000) * speedJitter);
      const triggerTime = now + delaySec;

      // Dynamics: Downstrums hit bass strings harder; upstrums emphasize higher strings
      let stringVelWeight = 1.0;
      if (direction === 'down') {
        stringVelWeight = 1.0 - (orderIndex * 0.04); // e.g. 1.0 down to 0.8
      } else {
        stringVelWeight = 0.85 + (orderIndex * 0.04);
      }

      // Human velocity jitter: ±5%
      const humanVelocity = Math.max(0.1, Math.min(1.0, baseVelocity * stringVelWeight * (1 + (Math.random() * 0.1 - 0.05))));
      const freq = frequencies[stringIndex];

      this.pluckString(stringIndex, freq, triggerTime, humanVelocity, mute);

      // Trigger visual string vibration feedback
      if (this.onPluckCallback) {
        setTimeout(() => {
          this.onPluckCallback?.(stringIndex, freq, humanVelocity);
        }, Math.max(0, delaySec * 1000));
      }
    });
  }

  /**
   * Plucks an individual string using an acoustic physical modeling synthesizer
   */
  public pluckString(
    stringIndex: number,
    freq: number,
    startTime: number,
    velocity: number = 0.8,
    isPalmChoked: boolean = false
  ) {
    if (!this.ctx || !this.masterGain || freq <= 20) return;

    const ctx = this.ctx;
    const voiceGain = ctx.createGain();
    const stringFilter = ctx.createBiquadFilter();

    // High string dampening: lower strings ring longer (~2.8s), high strings decay faster (~1.8s)
    const decayDuration = isPalmChoked
      ? 0.18 // Palm muted thud
      : Math.max(1.0, 3.2 - (stringIndex * 0.25));

    // String low-pass filter (wooden bridge/nylon dampening):
    // Harder plucks generate more high frequencies (brightness velocity tracking)
    stringFilter.type = 'lowpass';
    const cutoffFreq = isPalmChoked ? 800 : Math.min(14000, freq * 14 * Math.pow(velocity, 0.4));
    stringFilter.frequency.setValueAtTime(cutoffFreq, startTime);
    // Dynamic filter envelope: high frequencies damp quicker than fundamental
    stringFilter.frequency.exponentialRampToValueAtTime(
      Math.max(200, freq * 2.2),
      startTime + (isPalmChoked ? 0.08 : decayDuration * 0.75)
    );

    // --- 1. PICK TRANSIENT (Exciter / Plectrum Click) ---
    // Short burst of shaped noise simulating pick striking the wound/plain string
    const pickBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.015), ctx.sampleRate);
    const pickData = pickBuffer.getChannelData(0);
    for (let i = 0; i < pickData.length; i++) {
      // Pink-ish noise burst with quick decay
      pickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
    }
    const pickSource = ctx.createBufferSource();
    pickSource.buffer = pickBuffer;
    const pickGain = ctx.createGain();
    pickGain.gain.setValueAtTime(velocity * 0.35, startTime);
    pickSource.connect(pickGain);
    pickGain.connect(stringFilter);
    pickSource.start(startTime);

    // --- 2. HARMONIC STRING BODY (Acoustic Guitar Overtones) ---
    // Fundamental + 2nd, 3rd, 4th, 5th, 6th harmonics with physical string inharmonicity
    const harmonicWeights = [
      { mult: 1.0, amp: 1.0 },     // Fundamental
      { mult: 2.003, amp: 0.65 },  // 2nd (octave)
      { mult: 3.007, amp: 0.42 },  // 3rd
      { mult: 4.012, amp: 0.25 },  // 4th
      { mult: 5.02, amp: 0.16 },   // 5th
      { mult: 6.03, amp: 0.09 },   // 6th
    ];

    const oscSources: OscillatorNode[] = [];

    harmonicWeights.forEach((h) => {
      const hFreq = freq * h.mult;
      if (hFreq > 18000) return; // avoid aliasing

      const osc = ctx.createOscillator();
      // Triangle/Saw hybrid wave profile for warm acoustic chime
      osc.type = h.mult === 1.0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(hFreq, startTime);

      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(h.amp * 0.22, startTime);

      osc.connect(hGain);
      hGain.connect(stringFilter);
      osc.start(startTime);
      osc.stop(startTime + decayDuration + 0.1);
      oscSources.push(osc);
    });

    // --- 3. AMPLITUDE ENVELOPE (Attack - Decay) ---
    // Attack time: ~3ms (percussive pick strike)
    const attackTime = 0.003;
    const peakGain = Math.min(1.0, velocity * 0.9);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.exponentialRampToValueAtTime(peakGain, startTime + attackTime);

    if (isPalmChoked) {
      // Sudden damped thud for palm muting
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);
    } else {
      // Natural guitar exponential decay curve
      voiceGain.gain.exponentialRampToValueAtTime(peakGain * 0.35, startTime + 0.4);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration);
    }

    // Connect string filter -> voice gain -> master gain
    stringFilter.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    const voice = {
      stop: (stopTime: number) => {
        try {
          voiceGain.gain.cancelScheduledValues(stopTime);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopTime);
          voiceGain.gain.exponentialRampToValueAtTime(0.00001, stopTime + 0.025);
          oscSources.forEach((o) => {
            try { o.stop(stopTime + 0.03); } catch {}
          });
        } catch {}
      },
      gainNode: voiceGain,
    };

    this.activeVoices.push(voice);

    // Cleanup finished voice
    setTimeout(() => {
      const idx = this.activeVoices.indexOf(voice);
      if (idx !== -1) {
        this.activeVoices.splice(idx, 1);
      }
    }, (decayDuration + 0.2) * 1000);
  }

  /**
   * Palm Mute Bar: Immediately stops all vibrating guitar sound (damps all strings)
   * with an authentic acoustic wooden thud.
   */
  public palmMute() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Fast choke on all currently vibrating strings (15ms acoustic damping)
    this.activeVoices.forEach((v) => {
      v.stop(now);
    });
    this.activeVoices = [];

    // Trigger subtle palm contact body thud (skin touching vibrating strings and soundboard)
    try {
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      const thudFilter = this.ctx.createBiquadFilter();

      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(85, now);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

      thudFilter.type = 'lowpass';
      thudFilter.frequency.setValueAtTime(160, now);

      thudGain.gain.setValueAtTime(0.28, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      thudOsc.connect(thudFilter);
      thudFilter.connect(thudGain);
      thudGain.connect(this.masterGain);

      thudOsc.start(now);
      thudOsc.stop(now + 0.09);
    } catch {}
  }

  public setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1.0, volume));
    this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }
}

export const guitarAudioEngine = new GuitarAudioEngine();
