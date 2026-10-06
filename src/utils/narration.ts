/**
 * Text-to-Speech narration service for October 1973 mission briefings.
 * Uses the Web Speech API with Arabic locale and military voice styling.
 */

export class NarrationService {
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;

  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
    }
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (this.isMuted) {
      return;
    }

    // Cancel any ongoing speech and ensure synthesis engine is active
    this.stop();
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 0.94; // Deliberate, clear military commander tempo
    utterance.pitch = 0.98; // Authoritative tone

    // Choose preferred Arabic voice if available
    const pickVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice =
          voices.find((v) => v.lang === 'ar-EG') ||
          voices.find((v) => v.lang === 'ar-SA') ||
          voices.find((v) => v.lang.startsWith('ar') || v.name.toLowerCase().includes('arabic'));
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
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
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
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const narration = new NarrationService();
