/**
 * Text-to-Speech narration service for October 1973 mission briefings and pilot comms.
 * Uses Web Speech API with Arabic locale and military voice styling.
 * Supports mobile touch unlock and optional toggle saved in localStorage.
 */

export class NarrationService {
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isEnabledPref: boolean = true;
  private isMobileUnlocked: boolean = false;
  private keepAliveTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('october73_tts_enabled');
      // Default to enabled, but user can toggle it off anytime (اختياري)
      this.isEnabledPref = saved !== null ? saved === 'true' : true;

      // Robust gesture unlock on phones (iOS Safari & Android Chrome)
      const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'click'];
      const unlockHandler = () => {
        this.unlockMobile();
      };
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, unlockHandler, { passive: true });
      });
    }
  }

  // Pre-primes speech engine on mobile browsers on any tap
  public unlockMobile() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    this.isMobileUnlocked = true;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Speak a brief blank string to unfreeze mobile audio session
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0.01;
      silent.rate = 1.0;
      window.speechSynthesis.speak(silent);
    } catch {}
  }

  public setEnabled(enabled: boolean) {
    this.isEnabledPref = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('october73_tts_enabled', String(enabled));
    }
    if (!enabled) {
      this.stop();
    }
  }

  public isEnabled(): boolean {
    return this.isEnabledPref;
  }

  public toggleEnabled(): boolean {
    const next = !this.isEnabledPref;
    this.setEnabled(next);
    return next;
  }

  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      rate?: number;
      pitch?: number;
      volume?: number;
      isPilotComms?: boolean;
    }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (!this.isEnabledPref) {
      options?.onEnd?.();
      return;
    }

    // Cancel any ongoing speech and ensure synthesis engine is active
    this.stop();
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    // Clean speech text for clean Arabic pronunciation across mobile browsers
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText || text);
    utterance.lang = 'ar-EG';
    utterance.rate = options?.rate ?? (options?.isPilotComms ? 1.05 : 0.94);
    utterance.pitch = options?.pitch ?? (options?.isPilotComms ? 1.04 : 0.98);
    utterance.volume = options?.volume ?? 1.0;

    // Choose preferred Arabic voice if available
    const pickVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice =
          voices.find((v) => v.lang === 'ar-EG') ||
          voices.find((v) => v.lang === 'ar-SA') ||
          voices.find((v) => v.lang.startsWith('ar') || v.name.toLowerCase().includes('arabic') || v.name.toLowerCase().includes('tarik') || v.name.toLowerCase().includes('maged'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }
      } catch {}
    };

    pickVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      options?.onStart?.();

      // Mobile / Chrome keep-alive hack to prevent long speech from freezing
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 8000);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      options?.onEnd?.();
    };

    this.currentUtterance = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // Browser autoplay policy fallback
    }
  }

  public stop() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {}
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public toggleMute(): boolean {
    return this.toggleEnabled();
  }

  public getIsMuted(): boolean {
    return !this.isEnabledPref;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const narration = new NarrationService();

