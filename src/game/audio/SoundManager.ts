import type Phaser from 'phaser';

export type AmbienceEra = '1944' | '1968' | '1999' | '2088' | 'title';

export class SoundManager {
  private game: Phaser.Game;
  private currentAmbience: AmbienceEra | null = null;
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  constructor(game: Phaser.Game) {
    this.game = game;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch {
      this.audioContext = null;
    }
  }

  get context(): AudioContext | null {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private getOptions(): { vol: number; volMus: number; volSfx: number } {
    const opts = (this.game.registry.get('options') as Record<string, unknown> | undefined) || {};
    const vol = typeof opts.vol === 'number' ? opts.vol : 1.0;
    const volMus = typeof opts.volMus === 'number' ? opts.volMus : 1.0;
    const volSfx = typeof opts.volSfx === 'number' ? opts.volSfx : 0.9;
    return { vol, volMus, volSfx };
  }

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

  setAmbience(era: AmbienceEra | null): void {
    if (this.currentAmbience === era) return;
    this.currentAmbience = era;
  }

  playSelect(): void {
    this.playSynthTone(580, 0.04, 'sine', 0.12);
  }

  playConfirm(): void {
    this.playSynthTone(880, 0.08, 'sine', 0.15);
    setTimeout(() => this.playSynthTone(1174, 0.12, 'sine', 0.15), 60);
  }

  playChime(): void {
    const tones = [523.25, 659.25, 783.99, 1046.5];
    tones.forEach((freq, i) => {
      setTimeout(() => this.playSynthTone(freq, 0.45, 'sine', 0.18), i * 90);
    });
  }

  playBoom(): void {
    this.playSynthNoise(0.8, 80, 0.45);
  }

  playFlash(): void {
    this.playSynthTone(320, 0.18, 'sawtooth', 0.16);
  }

  playHeart(): void {
    this.playSynthTone(140, 0.08, 'sine', 0.22);
    setTimeout(() => this.playSynthTone(110, 0.12, 'sine', 0.25), 140);
  }

  playGlitch(): void {
    this.playSynthNoise(0.5, 440, 0.35);
    setTimeout(() => this.playSynthTone(180, 0.25, 'sawtooth', 0.28), 100);
  }

  playVortex(rewind = false): void {
    if (rewind) {
      this.playSynthTone(720, 0.6, 'sine', 0.25);
    } else {
      this.playSynthTone(440, 0.6, 'sine', 0.25);
    }
  }

  playPaperFlip(): void {
    this.playSfx('flip', 0.45);
  }

  playTypewriterBeep(): void {
    if (Math.random() < 0.35) {
      this.playSynthTone(900 + Math.random() * 500, 0.015, 'square', 0.012);
    }
  }

  playGearTick(rate = 1.0): void {
    this.playSynthTone(1200 * rate, 0.02, 'triangle', 0.14);
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

  playOscillatorWave(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15): void {
    this.playSynthTone(freq, duration, type, gain);
  }

  private playSynthTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.1): void {
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
      gain.gain.setValueAtTime(finalGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext unavailable
    }
  }

  private playSynthNoise(duration: number, cutoff = 200, gainVal = 0.2): void {
    if (this.isMuted) return;
    const ctx = this.context;
    if (!ctx) return;
    const { vol, volSfx } = this.getOptions();
    const finalGain = vol * volSfx * gainVal;
    if (finalGain <= 0.001) return;

    try {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(finalGain, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

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
