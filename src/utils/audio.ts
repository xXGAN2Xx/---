/**
 * Web Audio API synthesizer for historical combat effects and patriotic fanfares.
 * Does not require external audio files, completely hermetic and reliable.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentTheme: 'airStrike' | 'crossing' | 'bridge' | 'tankBattle' | 'fortress' | 'menu' | null = null;
  private bgIntervalId: number | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBackgroundTheme(false);
    } else if (this.currentTheme) {
      this.playBackgroundTheme(this.currentTheme);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Countdown beep (5, 4, 3, 2, 1, 0)
  public playCountdownBeep(isFinal = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isFinal) {
      // Fanfare launch burst
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, t + 0.3); // C6

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    } else {
      // Crisp timer blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t); // A5

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  // Stop background music
  public stopBackgroundTheme(clearCurrentTheme = true) {
    if (this.bgIntervalId !== null) {
      window.clearInterval(this.bgIntervalId);
      this.bgIntervalId = null;
    }
    if (clearCurrentTheme) {
      this.currentTheme = null;
    }
  }

  // Dynamic Patriotic Background Music themes changing with each stage!
  public playBackgroundTheme(theme: 'airStrike' | 'crossing' | 'bridge' | 'tankBattle' | 'fortress' | 'menu') {
    this.currentTheme = theme;
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.stopBackgroundTheme(false);

    // Play initial pattern immediately
    this.playThemeStep(theme);

    // Loop interval based on theme tempo
    const intervalMap: Record<string, number> = {
      airStrike: 1900,  // Fast tempo (140 BPM march)
      crossing: 2400,   // Epic anthem cadence (116 BPM)
      bridge: 2100,     // Driving engineer cadence (128 BPM)
      tankBattle: 2600, // Heavy armored march (110 BPM)
      fortress: 2500,   // Triumphant national anthem (120 BPM)
      menu: 3200,       // Ambient heroic operations room
    };

    const interval = intervalMap[theme] || 2400;
    this.bgIntervalId = window.setInterval(() => {
      if (!this.isMuted) {
        this.playThemeStep(theme);
      }
    }, interval);
  }

  private playThemeStep(theme: string) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (theme === 'airStrike') {
      // Fast heroic MiG-21 aerial march with snare pulse and brass stabs
      // Frequencies for E minor / Egyptian modal march: E3, G3, B3, E4, D4
      const notes = [
        { freq: 164.81, time: 0, dur: 0.15, gain: 0.12 },    // E3
        { freq: 196.00, time: 0.25, dur: 0.15, gain: 0.12 }, // G3
        { freq: 246.94, time: 0.5, dur: 0.15, gain: 0.14 },  // B3
        { freq: 329.63, time: 0.75, dur: 0.35, gain: 0.16 }, // E4
        { freq: 293.66, time: 1.2, dur: 0.2, gain: 0.14 },   // D4
        { freq: 246.94, time: 1.5, dur: 0.3, gain: 0.12 },   // B3
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now + n.time);

        gain.gain.setValueAtTime(0.01, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain * 0.45, now + n.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });

      // Snare drum bursts on beats
      [0, 0.45, 0.9, 1.35].forEach((beatTime) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now + beatTime);
        osc.frequency.exponentialRampToValueAtTime(40, now + beatTime + 0.06);

        g.gain.setValueAtTime(0.12, now + beatTime);
        g.gain.exponentialRampToValueAtTime(0.001, now + beatTime + 0.06);

        osc.connect(g);
        g.connect(this.ctx!.destination);
        osc.start(now + beatTime);
        osc.stop(now + beatTime + 0.06);
      });
    } else if (theme === 'crossing') {
      // "بسم الله.. الله أكبر" triumphant crossing rhythm and brass
      // Notes: C3, G3, C4, E4, D4, C4
      const notes = [
        { freq: 130.81, time: 0, dur: 0.3, gain: 0.15 },    // C3
        { freq: 196.00, time: 0.4, dur: 0.25, gain: 0.14 }, // G3
        { freq: 261.63, time: 0.8, dur: 0.35, gain: 0.16 }, // C4
        { freq: 329.63, time: 1.3, dur: 0.45, gain: 0.18 }, // E4
        { freq: 293.66, time: 1.85, dur: 0.25, gain: 0.15 },// D4
        { freq: 261.63, time: 2.15, dur: 0.45, gain: 0.18 },// C4
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now + n.time);

        gain.gain.setValueAtTime(0.01, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain * 0.5, now + n.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });

      // War drum beat on 0 and 1.2
      [0, 1.2].forEach((beatTime) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now + beatTime);
        osc.frequency.exponentialRampToValueAtTime(30, now + beatTime + 0.25);

        g.gain.setValueAtTime(0.22, now + beatTime);
        g.gain.exponentialRampToValueAtTime(0.001, now + beatTime + 0.25);

        osc.connect(g);
        g.connect(this.ctx!.destination);
        osc.start(now + beatTime);
        osc.stop(now + beatTime + 0.25);
      });
    } else if (theme === 'bridge') {
      // Military Engineers heroic rhythmic march with driving metallic steel cadence
      const notes = [
        { freq: 146.83, time: 0, dur: 0.25, gain: 0.15 },   // D3
        { freq: 174.61, time: 0.35, dur: 0.2, gain: 0.14 }, // F3
        { freq: 220.00, time: 0.7, dur: 0.3, gain: 0.16 },  // A3
        { freq: 293.66, time: 1.1, dur: 0.35, gain: 0.18 }, // D4
        { freq: 261.63, time: 1.55, dur: 0.25, gain: 0.14 },// C4
        { freq: 220.00, time: 1.85, dur: 0.35, gain: 0.16 },// A3
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now + n.time);

        gain.gain.setValueAtTime(0.01, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain * 0.45, now + n.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });

      // Anvil / steel hammer cadence clank
      [0.35, 1.1, 1.85].forEach((t) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now + t);
        osc.frequency.exponentialRampToValueAtTime(800, now + t + 0.06);

        g.gain.setValueAtTime(0.08, now + t);
        g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.06);

        osc.connect(g);
        g.connect(this.ctx!.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.06);
      });
    } else if (theme === 'tankBattle') {
      // Heavy armored warfare clash and SAM missile umbrella
      // Low brass notes: G2, Bb2, D3, F3, D3
      const notes = [
        { freq: 98.00, time: 0, dur: 0.45, gain: 0.2 },    // G2
        { freq: 116.54, time: 0.5, dur: 0.35, gain: 0.18 }, // Bb2
        { freq: 146.83, time: 0.95, dur: 0.45, gain: 0.22 },// D3
        { freq: 174.61, time: 1.5, dur: 0.35, gain: 0.2 },  // F3
        { freq: 146.83, time: 1.95, dur: 0.55, gain: 0.22 },// D3
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now + n.time);

        gain.gain.setValueAtTime(0.01, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain * 0.5, now + n.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    } else if (theme === 'fortress') {
      // "بلادي بلادي لكِ حبي وفؤادي" heroic Egyptian national anthem motifs
      // Notes: F3, A3, C4, C4, D4, C4, Bb3, A3
      const notes = [
        { freq: 174.61, time: 0, dur: 0.3, gain: 0.16 },    // F3
        { freq: 220.00, time: 0.35, dur: 0.3, gain: 0.16 }, // A3
        { freq: 261.63, time: 0.7, dur: 0.35, gain: 0.18 }, // C4
        { freq: 261.63, time: 1.1, dur: 0.25, gain: 0.18 }, // C4
        { freq: 293.66, time: 1.4, dur: 0.3, gain: 0.2 },   // D4
        { freq: 261.63, time: 1.75, dur: 0.3, gain: 0.18 }, // C4
        { freq: 233.08, time: 2.1, dur: 0.25, gain: 0.16 }, // Bb3
        { freq: 220.00, time: 2.4, dur: 0.45, gain: 0.18 }, // A3
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now + n.time);

        gain.gain.setValueAtTime(0.01, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain * 0.45, now + n.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    } else {
      // Menu / Operations Room ambient patriotic pulse
      const notes = [
        { freq: 130.81, time: 0, dur: 0.6, gain: 0.1 },
        { freq: 164.81, time: 0.8, dur: 0.6, gain: 0.1 },
        { freq: 196.00, time: 1.6, dur: 0.7, gain: 0.12 },
        { freq: 164.81, time: 2.4, dur: 0.6, gain: 0.1 },
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.005, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain * 0.35, now + n.time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });
    }
  }

  // Machine gun burst
  public playGunshot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Heavy tank cannon or artillery shot
  public playCannon() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Low punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.35);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    // Filtered noise for detonation crack
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
    noise.start(t);
    noise.stop(t + 0.4);
  }

  // Missile launch swoosh (Sagger / SAM-6)
  public playMissileLaunch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // Powerful explosion
  public playExplosion(intensity = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const duration = 0.6 * intensity;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.18));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // High pressure water cannon spray (الخراطيم)
  public playWaterCannon() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = 0.25;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.02, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Authentic Vintage Military Transceiver / Walkie-Talkie Click & Squelch
  public playRadioClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Squelch noise burst (crackle)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1750, t);
    bandpass.Q.value = 3.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // 2. High-frequency RF beep/chirp (رنين لاسلكي تكتيكي)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1850, t + 0.02);

    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Vintage Military Radio Transmission (التشويش والرنين اللاسلكي العسكري للانتقال بين القوائم)
  public playRadioTransmission() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Static radio noise burst (تشويش راديو ميداني 1973 PRC-25 / R-105D)
    const noiseDuration = 0.22;
    const bufferSize = Math.floor(this.ctx.sampleRate * noiseDuration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Crackle + warm analog white noise
      const crackle = Math.random() < 0.22 ? (Math.random() * 2 - 1) * 1.8 : 0;
      data[i] = (Math.random() * 2 - 1) * 0.8 + crackle;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1500, t);
    bandpass.frequency.linearRampToValueAtTime(2400, t + noiseDuration);
    bandpass.Q.value = 2.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, t);
    noiseGain.gain.linearRampToValueAtTime(0.35, t + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + noiseDuration);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // 2. Radio Carrier Heterodyne Ringing (رنين موجة التردد اللاسلكي العسكري)
    const carrier = this.ctx.createOscillator();
    const carrierGain = this.ctx.createGain();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(980, t);
    carrier.frequency.linearRampToValueAtTime(1420, t + 0.09);
    carrier.frequency.setValueAtTime(840, t + 0.15);

    carrierGain.gain.setValueAtTime(0.02, t);
    carrierGain.gain.linearRampToValueAtTime(0.18, t + 0.03);
    carrierGain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);

    carrier.connect(carrierGain);
    carrierGain.connect(this.ctx.destination);
    carrier.start(t);
    carrier.stop(t + 0.18);

    // 3. Classic Military Roger Beep at end of transmission (نغمة انتهاء الإشارة التكتيكية)
    const beepTime = t + 0.16;
    const roger = this.ctx.createOscillator();
    const rogerGain = this.ctx.createGain();
    roger.type = 'sine';
    roger.frequency.setValueAtTime(1920, beepTime);

    rogerGain.gain.setValueAtTime(0.24, beepTime);
    rogerGain.gain.exponentialRampToValueAtTime(0.01, beepTime + 0.1);

    roger.connect(rogerGain);
    rogerGain.connect(this.ctx.destination);
    roger.start(beepTime);
    roger.stop(beepTime + 0.1);
  }

  // Dramatic Military Dispatch Alert for Starting Missions (إشارة انطلاق ساعة الصفر عبر اللاسلكي)
  public playMissionStartRadioAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Initial transceiver squelch open (تشويش فتح قناة اللاسلكي)
    const squelchLen = 0.25;
    const bufferSize = Math.floor(this.ctx.sampleRate * squelchLen);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.9;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, t);
    filter.Q.value = 3.2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.03, t);
    noiseGain.gain.linearRampToValueAtTime(0.38, t + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.02, t + squelchLen);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // 2. Urgent Two-Tone Dispatch Alert Bell (رنين تنبيه العمليات الحربية وساعة الصفر)
    const tones = [
      { freq: 1046.5, time: 0.06, dur: 0.14 }, // High C6
      { freq: 1318.5, time: 0.18, dur: 0.18 }, // E6
      { freq: 1760.0, time: 0.36, dur: 0.24 }, // A6
    ];

    tones.forEach((tone) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.freq, t + tone.time);

      gain.gain.setValueAtTime(0.02, t + tone.time);
      gain.gain.linearRampToValueAtTime(0.32, t + tone.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + tone.time + tone.dur);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + tone.time);
      osc.stop(t + tone.time + tone.dur);
    });

    // 3. Final microphone release squelch click
    setTimeout(() => {
      if (this.ctx && !this.isMuted) {
        this.playRadioClick();
      }
    }, 480);
  }

  // Dramatic Defeat & Aircraft Loss Alarm ("Mayday .. فقدنا الاتصال بالمقاتلة!")
  public playDefeatSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Rapid Cockpit Warning Klaxon (إنذار سقوط حاد)
    for (let k = 0; k < 3; k++) {
      const kt = t + k * 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, kt);
      osc.frequency.linearRampToValueAtTime(450, kt + 0.12);

      gain.gain.setValueAtTime(0.28, kt);
      gain.gain.exponentialRampToValueAtTime(0.01, kt + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(kt);
      osc.stop(kt + 0.14);
    }

    // 2. Mayday Static Radio Crash (تشويش راديو استغاثة حاد)
    setTimeout(() => {
      if (this.ctx && !this.isMuted) {
        this.playRadioClick();
      }
    }, 550);
  }

  private lastVictoryFanfareTime: number = 0;

  // Mission accomplished / Patriotic Victory fanfare ("الله أكبر .. بسم الله .. نصر أكتوبر 1973")
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Throttle guard to prevent duplicate clashing fanfares
    if (now - this.lastVictoryFanfareTime < 1.8) {
      return;
    }
    this.lastVictoryFanfareTime = now;

    // Stop background music immediately so victory fanfare sounds crisp and majestic
    this.stopBackgroundTheme(false);

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Patriotic brass fanfare melody ("الله أكبر بسم الله"): Sol3, Do4, Mi4, Sol4, Do5, Mi5
    const notes = [
      { freq: 196.00, time: 0.0, dur: 0.24, gain: 0.28 }, // Sol 3
      { freq: 261.63, time: 0.25, dur: 0.24, gain: 0.30 }, // Do 4
      { freq: 329.63, time: 0.50, dur: 0.26, gain: 0.32 }, // Mi 4
      { freq: 392.00, time: 0.78, dur: 0.40, gain: 0.35 }, // Sol 4 (الله أكبر)
      { freq: 329.63, time: 1.22, dur: 0.24, gain: 0.30 }, // Mi 4
      { freq: 523.25, time: 1.48, dur: 0.85, gain: 0.38 }, // High Do 5 (بسم الله)
      { freq: 659.25, time: 2.38, dur: 1.10, gain: 0.40 }, // High Mi 5 (نصر أكتوبر)
    ];

    notes.forEach((note) => {
      // Primary brass oscillator (trumpet timbre)
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + note.time);

      // Safe non-zero base value for exponential ramp (prevents DOMException in Web Audio)
      gain.gain.setValueAtTime(0.001, now + note.time);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);

      // Triumphant octave & 5th overtone
      const subOsc = this.ctx!.createOscillator();
      const subGain = this.ctx!.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(note.freq * 1.5, now + note.time);

      subGain.gain.setValueAtTime(0.001, now + note.time);
      subGain.gain.linearRampToValueAtTime(note.gain * 0.45, now + note.time + 0.04);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      subOsc.connect(subGain);
      subGain.connect(this.ctx!.destination);

      subOsc.start(now + note.time);
      subOsc.stop(now + note.time + note.dur);
    });

    // Celebratory Timpani / War Drum bursts on key cadence beats (0s, 0.78s, 1.48s, 2.38s)
    [0.0, 0.78, 1.48, 2.38].forEach((beatTime, idx) => {
      const drum = this.ctx!.createOscillator();
      const drumGain = this.ctx!.createGain();
      drum.type = 'sine';
      const startFreq = idx === 3 ? 120 : 95;
      drum.frequency.setValueAtTime(startFreq, now + beatTime);
      drum.frequency.exponentialRampToValueAtTime(32, now + beatTime + 0.4);

      drumGain.gain.setValueAtTime(idx === 3 ? 0.45 : 0.32, now + beatTime);
      drumGain.gain.exponentialRampToValueAtTime(0.001, now + beatTime + 0.45);

      drum.connect(drumGain);
      drumGain.connect(this.ctx!.destination);
      drum.start(now + beatTime);
      drum.stop(now + beatTime + 0.45);
    });
  }

  // Lock-on target alert beep
  public playTargetLock() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(1800, t + 0.05);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Armor hit ping sound
  public playHitSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.07);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Jet flyby sound
  public playJetFlyby() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.8);

    gain.gain.setValueAtTime(0.02, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.85);

    osc.start(t);
    osc.stop(t + 0.85);
  }

  // Water splash / high-pressure hydraulic stream sound (صوت خراطيم المياه ورذاذ الأمواج)
  public playSplash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }
}

export const sound = new SoundSystem();
