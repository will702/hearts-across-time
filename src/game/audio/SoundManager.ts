import type Phaser from 'phaser';
import type { GameOptions } from '../options';

export type AmbienceEra = '1944' | '1968' | '1999' | '2088' | 'title';

type SongName = 'theme' | 'war' | 'spy' | 'cryo' | 'end' | '';

type SongTrackEvent = {
  v: 'musicbox' | 'bell' | 'pad' | 'bass' | 'tick';
  notes: string[];
  dur: number;
  vel: number;
};

type SongDefinition = {
  bpm: number;
  len: number;
  dbl?: boolean;
  tracks: {
    v: 'musicbox' | 'bell' | 'pad' | 'bass' | 'tick';
    ev: [number, string | string[], number?, number?][];
  }[];
};

const NOTE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export function noteFreq(noteStr: string): number {
  const match = noteStr.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return 440;
  const semitone = NOTE[match[1]] ?? 9;
  const octave = parseInt(match[2], 10);
  const midi = semitone + 12 * (octave + 1);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function arpEv(start: number, notes: string[], gap: number, dur: number, vel = 0.8): [number, string, number, number][] {
  const seq = notes.concat(notes.slice(1, -1).reverse());
  return seq.map((n, i) => [start + i * gap, n, dur, vel]);
}

const MELODI: [number, string, number, number?][] = [
  [0, 'A4', 6], [6, 'C5', 3], [10, 'E5', 6], [16, 'D5', 6], [22, 'C5', 3], [26, 'B4', 6],
  [32, 'A4', 4], [36, 'B4', 3], [40, 'C5', 3], [44, 'D5', 6], [48, 'E5', 12],
  [64, 'F5', 6], [70, 'E5', 3], [74, 'D5', 3], [78, 'C5', 6], [80, 'D5', 6], [86, 'E5', 3], [90, 'C5', 3], [94, 'A4', 6],
  [96, 'B4', 6], [102, 'G4', 3], [106, 'E4', 6], [112, 'A4', 16], [112, 'A5', 14, 0.7],
];

const SONGS: Record<string, SongDefinition> = {
  theme: {
    bpm: 74,
    len: 128,
    tracks: [
      {
        v: 'pad',
        ev: [
          [0, ['A3', 'C4', 'E4'], 16], [16, ['G3', 'B3', 'D4'], 16],
          [32, ['A3', 'C4', 'E4'], 16], [48, ['E3', 'G#3', 'B3'], 16],
          [64, ['F3', 'A3', 'C4'], 16], [80, ['C3', 'E3', 'G3'], 16],
          [96, ['E3', 'G#3', 'B3'], 16], [112, ['A3', 'C4', 'E4'], 16],
        ],
      },
      {
        v: 'bass',
        ev: [
          [0, 'A2', 16], [16, 'G2', 16], [32, 'A2', 16], [48, 'E2', 16],
          [64, 'F2', 16], [80, 'C3', 16], [96, 'E2', 16], [112, 'A2', 16],
        ],
      },
      { v: 'musicbox', ev: MELODI },
    ],
  },
  war: {
    bpm: 62,
    len: 128,
    tracks: [
      {
        v: 'pad',
        ev: [
          [0, ['A2', 'E3'], 28], [32, ['A2', 'E3'], 28],
          [64, ['F2', 'C3'], 28], [96, ['D#2', 'A#2'], 30],
        ],
      },
      {
        v: 'bass',
        ev: [
          [0, 'A1', 24], [32, 'A1', 24], [64, 'F1', 24], [96, 'D#2', 26],
        ],
      },
      {
        v: 'bell',
        ev: [
          [16, 'D5', 8, 0.55], [48, 'A4', 8, 0.55],
          [80, 'D#5', 8, 0.6], [112, 'E5', 10, 0.65],
        ],
      },
    ],
  },
  spy: {
    bpm: 92,
    len: 128,
    tracks: [
      {
        v: 'bass',
        ev: (() => {
          const roots = ['A2', 'A2', 'F2', 'G2', 'A2', 'A2', 'F2', 'E2'];
          const e: [number, string, number, number?][] = [];
          roots.forEach((r, i) => {
            const b = i * 16;
            const r3 = r.replace('2', '3');
            e.push([b, r, 2], [b + 4, r, 2], [b + 8, r3, 2], [b + 12, r, 2]);
          });
          return e;
        })(),
      },
      {
        v: 'pad',
        ev: [
          [0, ['A3', 'C4', 'E4'], 30], [32, ['F3', 'A3', 'C4'], 14],
          [48, ['G3', 'B3', 'D4'], 14], [64, ['A3', 'C4', 'E4'], 30],
          [96, ['F3', 'A3', 'C4'], 14], [112, ['E3', 'G#3', 'B3'], 14],
        ],
      },
      {
        v: 'tick',
        ev: (() => {
          const e: [number, string, number, number][] = [];
          for (let i = 0; i < 64; i++) {
            e.push([i * 2, 'x', 1, i % 8 === 4 ? 0.8 : 0.45]);
          }
          return e;
        })(),
      },
      {
        v: 'musicbox',
        ev: [
          [32, 'C5', 4, 0.7], [38, 'B4', 4, 0.7],
          [96, 'B4', 6, 0.7], [104, 'G#4', 6, 0.7],
        ],
      },
    ],
  },
  cryo: {
    bpm: 66,
    len: 128,
    tracks: [
      {
        v: 'bell',
        ev: [
          ...arpEv(0, ['A4', 'C5', 'E5', 'G5', 'B5'], 2, 4),
          ...arpEv(16, ['A4', 'C5', 'E5', 'G5', 'B5'], 2, 4),
          ...arpEv(32, ['F4', 'A4', 'C5', 'E5', 'G5'], 2, 4),
          ...arpEv(48, ['C4', 'E4', 'G4', 'B4', 'D5'], 2, 4),
          ...arpEv(64, ['A4', 'C5', 'E5', 'G5', 'B5'], 2, 4),
          ...arpEv(80, ['A4', 'C5', 'E5', 'G5', 'B5'], 2, 4),
          ...arpEv(96, ['F4', 'A4', 'C5', 'E5', 'G5'], 2, 4),
          ...arpEv(112, ['E4', 'G#4', 'B4', 'E5', 'G#5'], 2, 4),
        ],
      },
      {
        v: 'pad',
        ev: [
          [0, ['A2', 'E3', 'B3'], 30], [32, ['F2', 'C3', 'A3'], 30],
          [64, ['A2', 'E3', 'B3'], 30], [96, ['E2', 'B2', 'G#3'], 30],
        ],
      },
      {
        v: 'bass',
        ev: [
          [0, 'A1', 30], [32, 'F2', 30],
          [64, 'A1', 30], [96, 'E2', 30],
        ],
      },
    ],
  },
  end: {
    bpm: 76,
    len: 128,
    dbl: true,
    tracks: [
      {
        v: 'pad',
        ev: [
          [0, ['A3', 'C4', 'E4'], 16], [16, ['F3', 'A3', 'C4'], 16],
          [32, ['C3', 'E3', 'G3'], 16], [48, ['G2', 'B2', 'D3'], 16],
          [64, ['F3', 'A3', 'C4'], 16], [80, ['C3', 'E3', 'G3'], 16],
          [96, ['G2', 'B2', 'D3'], 16], [112, ['C3', 'E3', 'G3'], 16],
        ],
      },
      {
        v: 'bass',
        ev: [
          [0, 'A2', 16], [16, 'F2', 16],
          [32, 'C3', 16], [48, 'G2', 16],
          [64, 'F2', 16], [80, 'C3', 16],
          [96, 'G2', 16], [112, 'C3', 16],
        ],
      },
      { v: 'musicbox', ev: MELODI },
    ],
  },
};

const AMB_SONG: Record<string, SongName> = {
  title: 'theme',
  '2088': 'theme',
  '1944': 'war',
  '1968': 'spy',
  '1999': 'cryo',
};

const AMB_LAYER: Record<string, [string, number][]> = {
  '1944': [['rain', 0.34], ['wind', 0.22]],
  '2088': [['wind', 0.26], ['fire', 0.24]],
  title: [['wind', 0.24]],
  '1968': [['hum', 0.15]],
  '1999': [['hum', 0.2]],
};

export class SoundManager {
  private game: Phaser.Game;
  private currentAmbience: AmbienceEra | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private musBus: GainNode | null = null;
  private mIn: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;

  private isMuted = false;
  private activeAmbienceNodes: { gain: GainNode; sources: (AudioNode | { stop: (t?: number) => void })[] }[] = [];
  private activeAmbienceLoops: Phaser.Sound.BaseSound[] = [];

  private currentSong: SongName = '';
  private songStep = 0;
  private nextSongTime = 0;
  private songEventMap: Record<number, SongTrackEvent[]> | null = null;
  private sequencerTimer: number | null = null;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.initAudioContext();
    this.startSequencer();
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        this.audioContext = ctx;

        const master = ctx.createGain();
        master.gain.value = 1.0;
        this.masterGain = master;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 18;
        comp.ratio.value = 6;
        comp.attack.value = 0.004;
        comp.release.value = 0.24;
        comp.connect(ctx.destination);
        master.connect(comp);

        const sfx = ctx.createGain();
        sfx.connect(master);
        this.sfxBus = sfx;

        const amb = ctx.createGain();
        amb.gain.value = 0.9;
        amb.connect(master);
        this.ambBus = amb;

        const mus = ctx.createGain();
        mus.gain.value = 0.8;
        mus.connect(master);
        this.musBus = mus;

        // Convolver reverb
        const verb = ctx.createConvolver();
        verb.buffer = this.createImpulseBuffer(ctx, 2.6, 2.4);
        const vout = ctx.createGain();
        vout.gain.value = 0.5;
        verb.connect(vout);
        vout.connect(mus);
        this.reverbNode = verb;

        // Feedback delay
        const dly = ctx.createDelay(1);
        dly.delayTime.value = 0.34;
        const dfb = ctx.createGain();
        dfb.gain.value = 0.36;
        const dlp = ctx.createBiquadFilter();
        dlp.type = 'lowpass';
        dlp.frequency.value = 2400;
        dly.connect(dlp);
        dlp.connect(dfb);
        dfb.connect(dly);
        const dout = ctx.createGain();
        dout.gain.value = 0.5;
        dlp.connect(dout);
        dout.connect(mus);
        this.delayNode = dly;

        // Music Input Bus
        const mIn = ctx.createGain();
        mIn.connect(mus);
        const sendDelay = ctx.createGain();
        sendDelay.gain.value = 0.18;
        mIn.connect(sendDelay);
        sendDelay.connect(dly);

        const sendVerb = ctx.createGain();
        sendVerb.gain.value = 0.32;
        mIn.connect(sendVerb);
        sendVerb.connect(verb);

        this.mIn = mIn;
      }
    } catch {
      this.audioContext = null;
    }
  }

  get context(): AudioContext | null {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private createImpulseBuffer(ctx: AudioContext, dur: number, decay: number): AudioBuffer {
    const n = Math.floor(ctx.sampleRate * dur);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
      }
    }
    return b;
  }

  private createNoiseBuffer(ctx: AudioContext, dur: number): AudioBuffer {
    const n = Math.floor(ctx.sampleRate * dur);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    return b;
  }

  private getOptions(): { vol: number; volMus: number; volSfx: number } {
    const opts = this.game.registry.get('options') as GameOptions | undefined;
    const vol = opts?.vol ?? 0.9;
    const volMus = opts?.volMus ?? 1;
    const volSfx = opts?.volSfx ?? 1;
    return { vol, volMus, volSfx };
  }

  updateVolumes(): void {
    const { vol, volMus, volSfx } = this.getOptions();
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0001 : Math.max(0, Math.min(1, vol)), this.context.currentTime);
    }
    if (this.sfxBus && this.context) {
      this.sfxBus.gain.setValueAtTime(Math.max(0, Math.min(1, volSfx)), this.context.currentTime);
    }
    if (this.musBus && this.context) {
      this.musBus.gain.setValueAtTime(Math.max(0, Math.min(1, volMus * 0.8)), this.context.currentTime);
    }
    if (this.ambBus && this.context) {
      this.ambBus.gain.setValueAtTime(Math.max(0, Math.min(1, volSfx * 0.9)), this.context.currentTime);
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateVolumes();
  }

  get muted(): boolean {
    return this.isMuted;
  }

  duckMusic(level = 0.5, release = 0.4): void {
    const ctx = this.context;
    if (!ctx || !this.musBus || this.isMuted) return;
    const { volMus } = this.getOptions();
    const t = ctx.currentTime;
    try {
      this.musBus.gain.cancelScheduledValues(t);
      this.musBus.gain.setValueAtTime(this.musBus.gain.value, t);
      this.musBus.gain.linearRampToValueAtTime(0.8 * volMus * level, t + release);
    } catch {
      // ignore
    }
  }

  setSong(name: SongName): void {
    if (this.currentSong === name) return;
    this.currentSong = name;
    this.songStep = 0;
    const def = SONGS[name];
    if (def) {
      const map: Record<number, SongTrackEvent[]> = {};
      def.tracks.forEach(tr => {
        tr.ev.forEach(e => {
          const stepIndex = e[0];
          if (!map[stepIndex]) map[stepIndex] = [];
          map[stepIndex].push({
            v: tr.v,
            notes: Array.isArray(e[1]) ? e[1] : [e[1]],
            dur: e[2] ?? 6,
            vel: e[3] ?? 1,
          });
        });
      });
      this.songEventMap = map;
    } else {
      this.songEventMap = null;
    }
    const ctx = this.context;
    if (ctx) {
      this.nextSongTime = ctx.currentTime + 0.06;
    }
  }

  private startSequencer(): void {
    if (typeof window === 'undefined') return;
    if (this.sequencerTimer !== null) {
      clearInterval(this.sequencerTimer);
    }
    this.sequencerTimer = window.setInterval(() => this.musTick(), 42);
  }

  private musTick(): void {
    const ctx = this.context;
    if (!ctx || !this.currentSong || !this.songEventMap || this.isMuted) return;
    if (!this.nextSongTime || this.nextSongTime < ctx.currentTime - 0.5) {
      this.nextSongTime = ctx.currentTime + 0.05;
    }
    const songDef = SONGS[this.currentSong];
    if (!songDef) return;

    // Get loop fatigue
    const loop = (this.game.registry.get('runLoop') as number | undefined) || 0;
    const wear = this.currentSong === 'end' ? 0 : Math.min(loop, 4) / 4;
    const spb = 60 / (songDef.bpm * (1 - wear * 0.035)) / 4;

    while (this.nextSongTime < ctx.currentTime + 0.16) {
      const evs = this.songEventMap[this.songStep];
      if (evs) {
        evs.forEach(e => {
          const t = this.nextSongTime;
          const spbDur = e.dur * spb;
          const g = 0.26 * e.vel;
          e.notes.forEach(n => {
            if (e.v === 'tick') {
              this.vTick(t, g * 0.5);
              return;
            }
            let det = 0;
            if (wear > 0 && (e.v === 'musicbox' || e.v === 'bell')) {
              const h = (this.songStep * 7 + n.charCodeAt(0) * 29 + (n.charCodeAt(1) || 0) * 13) % 100;
              if (h < wear * 14) return;
              det = (((h * 37) % 200) / 100 - 1) * (4 + 9 * wear);
            }
            const f = noteFreq(n);
            if (e.v === 'pad') this.vPad(f, t, spbDur + 0.15, g * 0.5);
            else if (e.v === 'bass') this.vBass(f, t, spbDur, g);
            else if (e.v === 'bell') this.vBell(f, t, g, det);
            else {
              this.vMusicbox(f, t, g, det);
              if (songDef.dbl) this.vBell(f * 2, t, g * 0.35);
            }
          });
        });
      }
      this.songStep = (this.songStep + 1) % songDef.len;
      this.nextSongTime += spb;
    }
  }

  // --- Web Audio Synthesizer Voices ---

  private vMusicbox(f: number, t: number, g: number, det = 0): void {
    const ctx = this.context;
    if (!ctx || !this.mIn) return;
    const partials = [[1, 1], [3.98, 0.16], [6.1, 0.05]];
    partials.forEach(([r, a]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * r;
      if (det) o.detune.value = det * (r > 2 ? 1.7 : 1);
      const og = ctx.createGain();
      og.gain.setValueAtTime(g * a, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 / Math.sqrt(r));
      o.connect(og);
      og.connect(this.mIn!);
      o.start(t);
      o.stop(t + 1.5);
    });
  }

  private vBell(f: number, t: number, g: number, det = 0): void {
    const ctx = this.context;
    if (!ctx || !this.mIn) return;
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.value = f;
    if (det) car.detune.value = det;

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = f * 2.4;
    if (det) mod.detune.value = det * 1.4;

    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.6, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 1.1);

    mod.connect(mg);
    mg.connect(car.frequency);

    const bg = ctx.createGain();
    bg.gain.setValueAtTime(g, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

    car.connect(bg);
    bg.connect(this.mIn);

    car.start(t);
    mod.start(t);
    car.stop(t + 2.3);
    mod.stop(t + 2.3);
  }

  private vPad(f: number, t: number, dur: number, g: number): void {
    const ctx = this.context;
    if (!ctx || !this.mIn) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;

    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0.0001, t);
    vg.gain.linearRampToValueAtTime(g, t + 0.5);
    vg.gain.setValueAtTime(g, t + dur * 0.6);
    vg.gain.linearRampToValueAtTime(0.0001, t + dur);

    lp.connect(vg);
    vg.connect(this.mIn);

    [-4, 4].forEach(d2 => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = d2;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  }

  private vBass(f: number, t: number, dur: number, g: number): void {
    const ctx = this.context;
    if (!ctx || !this.mIn) return;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;

    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2;

    const g2 = ctx.createGain();
    g2.gain.value = 0.35;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;

    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(g, t + 0.02);
    bg.gain.setValueAtTime(g * 0.7, t + dur * 0.7);
    bg.gain.linearRampToValueAtTime(0.0001, t + dur);

    o.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(bg);
    bg.connect(this.mIn);

    o.start(t);
    o.stop(t + dur + 0.05);
    o2.start(t);
    o2.stop(t + dur + 0.05);
  }

  private vTick(t: number, g: number): void {
    const ctx = this.context;
    if (!ctx || !this.mIn) return;
    const s = ctx.createBufferSource();
    s.buffer = this.createNoiseBuffer(ctx, 0.02);

    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;

    const tg = ctx.createGain();
    tg.gain.setValueAtTime(g, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    s.connect(f);
    f.connect(tg);
    tg.connect(this.mIn);

    s.start(t);
  }

  // --- Ambience Engine ---

  private stopAmbienceNodes(): void {
    const ctx = this.context;
    const now = ctx ? ctx.currentTime : 0;
    this.activeAmbienceNodes.forEach(n => {
      try {
        if (ctx) n.gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        n.sources.forEach(s => {
          try {
            if ('stop' in s && typeof s.stop === 'function') s.stop(now + 0.7);
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
    });
    this.activeAmbienceNodes = [];

    this.activeAmbienceLoops.forEach(snd => {
      try {
        snd.stop();
        snd.destroy();
      } catch {
        // ignore
      }
    });
    this.activeAmbienceLoops = [];
  }

  private addAmbienceNode(maker: (ctx: AudioContext, gain: GainNode) => (AudioNode | { stop: (t?: number) => void })[]): void {
    const ctx = this.context;
    if (!ctx || !this.ambBus || this.isMuted) return;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.ambBus);
    const srcs = maker(ctx, g);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    this.activeAmbienceNodes.push({ gain: g, sources: srcs });
  }

  setAmbience(era: AmbienceEra | null): void {
    if (this.currentAmbience === era) return;
    this.stopAmbienceNodes();
    this.currentAmbience = era;

    if (!era) {
      this.setSong('');
      this.duckMusic(0, 0.5);
      return;
    }

    const song = AMB_SONG[era] || '';
    this.setSong(song);
    this.duckMusic(1, 0.8);

    if (this.isMuted) return;
    const ctx = this.context;
    if (!ctx) return;

    if (era === '2088' || era === 'title') {
      this.addAmbienceNode((c, g) => {
        const s = c.createBufferSource();
        s.buffer = this.createNoiseBuffer(c, 3);
        s.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 320;
        const l = c.createOscillator();
        l.frequency.value = 0.13;
        const lg = c.createGain();
        lg.gain.value = 140;
        l.connect(lg);
        lg.connect(f.frequency);
        l.start();
        const v = c.createGain();
        v.gain.value = 0.05;
        s.connect(f);
        f.connect(v);
        v.connect(g);
        s.start();
        return [s, l];
      });
    } else if (era === '1944') {
      this.addAmbienceNode((c, g) => {
        const s = c.createBufferSource();
        s.buffer = this.createNoiseBuffer(c, 3);
        s.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 130;
        const v = c.createGain();
        v.gain.value = 0.09;
        s.connect(f);
        f.connect(v);
        v.connect(g);
        s.start();
        return [s];
      });
    } else if (era === '1968') {
      this.addAmbienceNode((c, g) => {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = 55;
        const v = c.createGain();
        v.gain.value = 0.035;
        o.connect(v);
        v.connect(g);
        o.start();

        const s = c.createBufferSource();
        s.buffer = this.createNoiseBuffer(c, 2);
        s.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 780;
        const v2 = c.createGain();
        v2.gain.value = 0.016;
        s.connect(f);
        f.connect(v2);
        v2.connect(g);
        s.start();
        return [o, s];
      });
    } else if (era === '1999') {
      this.addAmbienceNode((c, g) => {
        const os = [220, 329.6, 440].map(fr => {
          const o = c.createOscillator();
          o.type = 'triangle';
          o.frequency.value = fr * (1 + (Math.random() - 0.5) * 0.004);
          const v = c.createGain();
          v.gain.value = 0.028;
          o.connect(v);
          v.connect(g);
          o.start();
          return o;
        });
        const l = c.createOscillator();
        l.frequency.value = 0.3;
        const lg = c.createGain();
        lg.gain.value = 0.012;
        l.connect(lg);
        lg.connect(g.gain);
        l.start();
        return [...os, l];
      });
    }

    // Play CC0 loaded audio loops (rain, wind, fire, hum) if available
    const layers = AMB_LAYER[era] || [];
    const { vol, volSfx } = this.getOptions();
    layers.forEach(([key, layerVol]) => {
      if (this.game.sound && this.game.cache.audio.exists(key)) {
        try {
          const sound = this.game.sound.add(key, {
            loop: true,
            volume: vol * volSfx * layerVol,
          });
          sound.play();
          this.activeAmbienceLoops.push(sound);
        } catch {
          // ignore
        }
      }
    });
  }

  // --- Sound Effects & Triggers ---

  playSfx(key: string, extraVolume = 1.0, rate = 1.0): void {
    if (this.isMuted) return;
    const { vol, volSfx } = this.getOptions();
    const finalVol = Math.max(0, Math.min(1, vol * volSfx * extraVolume));
    if (finalVol <= 0.001) return;

    if (this.game.sound && this.game.cache.audio.exists(key)) {
      this.game.sound.play(key, { volume: finalVol, rate });
    } else {
      this.playSynthFallback(key, finalVol);
    }
  }

  playFootstep(surface: string, x = 0): void {
    const key = surface === 'metal'
      ? 'step-metal'
      : Math.floor(x / 30) % 2 ? 'step-mud-1' : 'step-mud-0';
    this.playSfx(key, 0.4, 0.96 + (Math.floor(x) % 5) * 0.02);
  }

  playSelect(): void {
    this.playSynthTone(620, 0.05, 'square', 0.12);
  }

  playConfirm(): void {
    this.playSynthTone(760, 0.07, 'square', 0.15);
    setTimeout(() => this.playSynthTone(1140, 0.09, 'square', 0.15), 60);
  }

  playChime(): void {
    const tones = [440, 554.4, 659.3, 880];
    tones.forEach((freq, i) => {
      setTimeout(() => this.playSynthTone(freq, 0.8, 'sine', 0.14), i * 140);
    });
  }

  playBoom(): void {
    this.playSynthNoise(1.1, 90, 0.5);
    this.playSynthTone(38, 0.9, 'sine', 0.45, -14);
    setTimeout(() => this.playSynthNoise(0.25, 500, 0.15), 20);
  }

  playFlash(): void {
    this.playSynthNoise(0.3, 2500, 0.14, 'highpass');
  }

  playHeart(): void {
    this.playSynthTone(52, 0.14, 'sine', 0.45);
    setTimeout(() => this.playSynthTone(46, 0.16, 'sine', 0.4), 220);
  }

  playGlitch(): void {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playSynthTone(200 + Math.random() * 1400, 0.04, 'square', 0.08, 600);
        this.playSynthNoise(0.06, 3000 + Math.random() * 3000, 0.08, 'bandpass');
      }, i * 90);
    }
  }

  playVortex(rewind = false): void {
    if (rewind) {
      this.playSynthTone(980, 1.5, 'sawtooth', 0.12, -820);
      this.playSynthNoise(1.5, 700, 0.1, 'bandpass');
      setTimeout(() => this.playSynthTone(120, 0.5, 'square', 0.1, -60), 1100);
    } else {
      this.playSynthTone(140, 1.6, 'sawtooth', 0.12, 860);
      this.playSynthNoise(1.6, 900, 0.1, 'bandpass');
      setTimeout(() => this.playSynthTone(880, 0.5, 'sine', 0.1, 500), 1200);
    }
  }

  playPaperFlip(): void {
    this.playSfx('flip', 0.5);
  }

  playTypewriterBeep(): void {
    if (Math.random() < 0.35) {
      this.playSynthTone(900 + Math.random() * 500, 0.015, 'square', 0.012);
    }
  }

  playGearTick(rate = 1.0): void {
    this.playSynthTone(1100 * rate, 0.025, 'triangle', 0.14);
  }

  playLockSuccess(): void {
    this.playSynthTone(523.25, 0.08, 'sine', 0.18);
    setTimeout(() => this.playSynthTone(659.25, 0.14, 'sine', 0.22), 70);
    setTimeout(() => this.playSynthTone(1046.5, 0.22, 'triangle', 0.25), 150);
  }

  playErrorBuzz(): void {
    this.playSynthTone(130, 0.18, 'sawtooth', 0.22);
    setTimeout(() => this.playSynthTone(110, 0.24, 'sawtooth', 0.24), 90);
  }

  playGlassClink(): void {
    this.playSynthTone(1864, 0.12, 'sine', 0.2);
    setTimeout(() => this.playSynthTone(2793, 0.18, 'triangle', 0.16), 40);
  }

  playWaterShimmer(): void {
    const freqs = [659.25, 880, 1174.66, 1318.51];
    freqs.forEach((freq, idx) => {
      setTimeout(() => this.playSynthTone(freq, 0.25, 'sine', 0.15), idx * 60);
    });
  }

  playSteamRelease(): void {
    this.playSynthNoise(0.45, 600, 0.28);
  }

  playPaperSlide(): void {
    this.playSynthNoise(0.08, 1400, 0.18);
  }

  playSuccessFanfare(): void {
    const notes = [
      { f: 523.25, d: 0.1 },
      { f: 659.25, d: 0.1 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.35 },
    ];
    notes.forEach((note, i) => {
      setTimeout(() => this.playSynthTone(note.f, note.d, 'triangle', 0.25), i * 110);
    });
  }

  playSynthTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.1, slide = 0): void {
    if (this.isMuted) return;
    const ctx = this.context;
    if (!ctx) return;
    const { vol, volSfx } = this.getOptions();
    const finalGain = vol * volSfx * gainVal;
    if (finalGain <= 0.001) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(finalGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.sfxBus || this.masterGain || ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      // AudioContext unavailable
    }
  }

  playSynthNoise(duration: number, cutoff = 200, gainVal = 0.2, type: BiquadFilterType = 'lowpass'): void {
    if (this.isMuted) return;
    const ctx = this.context;
    if (!ctx) return;
    const { vol, volSfx } = this.getOptions();
    const finalGain = vol * volSfx * gainVal;
    if (finalGain <= 0.001) return;

    try {
      const buffer = this.createNoiseBuffer(ctx, duration);
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(cutoff, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(finalGain, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus || this.masterGain || ctx.destination);

      whiteNoise.start();
      whiteNoise.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext unavailable
    }
  }

  private playSynthFallback(key: string, vol: number): void {
    if (key.startsWith('step')) {
      this.playSynthNoise(0.04, 300, vol * 0.3);
    } else if (key === 'flip' || key === 'flip2') {
      this.playSynthNoise(0.06, 1200, vol * 0.2);
    } else if (key === 'click') {
      this.playSynthTone(1400, 0.02, 'triangle', vol * 0.15);
    }
  }
}
