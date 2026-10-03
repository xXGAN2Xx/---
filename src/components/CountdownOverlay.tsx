import React, { useEffect, useState } from 'react';
import { sound } from '../utils/audio';
import { Shield, Zap, Crosshair } from 'lucide-react';

interface CountdownOverlayProps {
  missionTitle: string;
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ missionTitle, onComplete }) => {
  const [count, setCount] = useState(5);

  const STATUS_MESSAGES: Record<number, string> = {
    5: '⚡ تأكيد أوامر القيادة وساعة الصفر..',
    4: '🎯 تلقيم الذخائر وتشغيل الرادارات الميدانية..',
    3: '🛡️ ضبط المحركات وتنسيق أسراب المعركة..',
    2: '🔥 التوجيه القتالي جاهز: كل الأسلحة في وضع الإطلاق..',
    1: '🦅 «بسم الله الرحمن الرحيم.. توكلنا على الله»..',
    0: '🚀 انطلاق المعركة!! الله أكبر!!',
  };

  useEffect(() => {
    sound.playCountdownBeep(false);

    const interval = setInterval(() => {
      setCount((prev) => {
        const next = prev - 1;
        if (next > 0) {
          sound.playCountdownBeep(false);
          return next;
        } else if (next === 0) {
          sound.playCountdownBeep(true);
          return 0;
        } else {
          clearInterval(interval);
          onComplete();
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
      {/* Target Crosshair Circle */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Outer glowing pulsed ring */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-amber-500/40 animate-ping absolute" />
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-dashed border-amber-400/60 animate-spin absolute" style={{ animationDuration: '8s' }} />

        {/* Center Number Circle */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-stone-900/90 border-4 border-amber-500 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)] z-10 scale-100 transition-transform">
          <span className="font-mono text-6xl sm:text-7xl font-black text-amber-400 tracking-tighter tabular-nums drop-shadow-md">
            {count > 0 ? count : '⚡'}
          </span>
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-1">
            {count > 0 ? 'ثوانٍ للبدء' : 'انطلاق!'}
          </span>
        </div>
      </div>

      {/* Mission Title Header */}
      <div className="max-w-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold mb-2">
          <Crosshair className="w-3.5 h-3.5 animate-pulse" />
          <span>الاستعداد لخوض المعركة</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black font-cairo text-stone-100 mb-2">
          {missionTitle}
        </h3>
        <p className="text-sm font-semibold text-amber-300 transition-all duration-300 min-h-[24px]">
          {STATUS_MESSAGES[count] || 'انطلاق!'}
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-2 mt-6">
        {[5, 4, 3, 2, 1].map((n) => (
          <div
            key={n}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              count <= n ? 'bg-amber-500 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-stone-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
