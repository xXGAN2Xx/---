import { sound } from './audio';
import { narration } from './narration';

export type PilotCommsEvent =
  | 'mission_start'
  | 'engaging_target'
  | 'taking_heavy_fire'
  | 'station_destroyed'
  | 'radar_warning'
  | 'rocket_launch'
  | 'mission_won';

export interface PilotRadioMessage {
  id: string;
  callsign: string;
  text: string;
  timestamp: number;
}

type Listener = (msg: PilotRadioMessage | null) => void;

class PilotCommsSystem {
  private lastTransmissionTime: number = 0;
  private currentEvent: PilotCommsEvent | null = null;
  private listeners: Set<Listener> = new Set();
  private clearTimer: number | null = null;

  private COMMS_SCRIPTS: Record<PilotCommsEvent, string[]> = {
    mission_start: [
      'النسر واحد: دخلنا منطقة العمليات في سيناء! الله أكبر، توكلنا على الله!',
      'النسر واحد: تشكيل المقاتلات في وضع الهجوم! استعدوا لاقتحام مواقع العدو!',
    ],
    engaging_target: [
      'النسر واحد: الهدف في المرمى! اشتباك مع محطة العدو!',
      'النسر واحد: تم رصد منشأة العدو بالعين المجردة! فتح نيران المدافع!',
      'النسر واحد: إطباق كامل على الهدف الأرضي! أبدأ القصف الآن!',
    ],
    taking_heavy_fire: [
      'النسر واحد: نتعرض لنيران معادية كثيفة! أقوم بمناورة تفادي سريعة!',
      'النسر واحد: شظايا الدفاعات الأرضية تصيب الهيكل! متماسك ومستمر في الهجوم!',
    ],
    station_destroyed: [
      'النسر واحد: إصابة مباشرة! تم تدمير محطة العدو بنجاح ساحق!',
      'النسر واحد: انفجار عنيف في موقع العدو! الهدف محطم تماماً، الله أكبر!',
      'النسر واحد: تصاعدت أعمدة الدخان من المحطة! هدف استراتيجي آخر يسقط!',
    ],
    radar_warning: [
      'النسر واحد: إنذار راداري! رادارات صواريخ الهوك ترصدنا، انخفض تحت سقف الكشف!',
      'النسر واحد: العدو يحاول إغلاق الرادار! أكسر الارتفاع وأهبط فوراً!',
    ],
    rocket_launch: [
      'النسر واحد: تم إطلاق الصاروخ الموجه! الصاروخ يتجه بدقة للهدف!',
      'النسر واحد: صاروخ جو-أرض ينطلق! إصابة مؤكدة في الطريق!',
    ],
    mission_won: [
      'النسر واحد إلى القيادة: تم دك جميع أهداف ومحطات العدو بنجاح! النصر لمصر، عائدون إلى القاعدة!',
    ],
  };

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(msg: PilotRadioMessage | null) {
    this.listeners.forEach((fn) => fn(msg));
  }

  public trigger(event: PilotCommsEvent, force: boolean = false) {
    const now = Date.now();
    // Throttle transmissions: 3s delay, or 2s for critical battle events (engaging_target, taking_heavy_fire, station_destroyed, mission_won)
    const isPriority = event === 'engaging_target' || event === 'taking_heavy_fire' || event === 'station_destroyed' || event === 'mission_won';
    const minDelay = isPriority ? 2200 : 3500;

    if (!force && now - this.lastTransmissionTime < minDelay) {
      return;
    }

    // Do not repeat same event consecutively within short duration
    if (!force && this.currentEvent === event && now - this.lastTransmissionTime < 6000) {
      return;
    }

    const scripts = this.COMMS_SCRIPTS[event];
    if (!scripts || scripts.length === 0) return;

    const chosenScript = scripts[Math.floor(Math.random() * scripts.length)];
    this.lastTransmissionTime = now;
    this.currentEvent = event;

    // 1. Play realistic pilot radio squelch click
    sound.playPilotRadioClick();

    // 2. Display on Cockpit Radio HUD
    const msg: PilotRadioMessage = {
      id: `${event}-${now}`,
      callsign: 'النسر-1 [قائد التشكيل الجوي]',
      text: chosenScript,
      timestamp: now,
    };
    this.notify(msg);

    // 3. Spoken voice-over audio layer via Web Speech API (if enabled)
    if (narration.isEnabled()) {
      narration.speak(chosenScript, {
        isPilotComms: true,
        pitch: 1.04,
        rate: 1.05,
        onEnd: () => {
          // Play roger beep on release of transmit key
          sound.playPilotRogerBeep();
        },
      });
    }

    // Auto clear radio HUD after 4.5s
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = window.setTimeout(() => {
      this.notify(null);
    }, 4500);
  }

  public clear() {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.notify(null);
  }
}

export const pilotComms = new PilotCommsSystem();
