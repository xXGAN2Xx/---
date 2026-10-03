import React, { useEffect, useRef } from 'react';
import { Clock, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { sound } from '../utils/audio';

interface MissionDigitalTimerProps {
  timeLeft: number;          // seconds remaining
  totalTime?: number;        // total duration in seconds, default 120
  label?: string;            // header label
  position?: 'top-center' | 'top-left' | 'top-right';
  className?: string;
}

export const MissionDigitalTimer: React.FC<MissionDigitalTimerProps> = ({
  timeLeft,
  totalTime = 120,
  label = 'الوقت المتبقي للنصر',
  position = 'top-center',
  className = '',
}) => {
  const isUrgent = timeLeft <= 30;
  const isCritical = timeLeft <= 10 && timeLeft > 0;
  const lastTickRef = useRef<number>(timeLeft);

  // Audio alert tick when entering critical final 10 seconds
  useEffect(() => {
    if (isCritical && lastTickRef.current !== timeLeft) {
      sound.playCountdownBeep(timeLeft === 1);
    }
    lastTickRef.current = timeLeft;
  }, [timeLeft, isCritical]);

  const mins = Math.floor(Math.max(0, timeLeft) / 60);
  const secs = Math.max(0, timeLeft) % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));

  const positionClasses = position === 'top-center'
    ? 'top-2 sm:top-3 left-1/2 -translate-x-1/2'
    : position === 'top-left'
    ? 'top-2 left-2 sm:top-3 sm:left-3'
    : 'top-2 right-2 sm:top-3 sm:right-3';

  return (
    <div
      dir="rtl"
      className={`absolute ${positionClasses} z-30 select-none transition-all duration-300 ${
        isCritical
          ? 'animate-pulse drop-shadow-[0_0_25px_rgba(239,68,68,1)]'
          : isUrgent
          ? 'drop-shadow-[0_0_20px_rgba(239,68,68,0.7)]'
          : 'drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]'
      } ${className}`}
    >
      <div
        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border-2 backdrop-blur-md transition-all duration-300 flex items-center gap-3 shadow-2xl ${
          isUrgent
            ? 'bg-stone-950/95 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]'
            : 'bg-stone-950/90 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        }`}
      >
        {/* Icon & Label */}
        <div className="flex items-center gap-1.5">
          {isUrgent ? (
            <AlertTriangle className="w-4 h-4 text-red-400 animate-spin" style={{ animationDuration: '3s' }} />
          ) : (
            <Clock className="w-4 h-4 text-emerald-400" />
          )}
          <span
            className={`text-[11px] sm:text-xs font-black font-cairo whitespace-nowrap ${
              isUrgent ? 'text-red-400' : 'text-emerald-300'
            }`}
          >
            {label}
          </span>
        </div>

        {/* Digital Time */}
        <div className="flex items-center gap-1">
          <span
            className={`font-mono font-black text-xl sm:text-2xl tabular-nums tracking-wider ${
              isUrgent
                ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,1)]'
                : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]'
            }`}
          >
            {formattedTime}
          </span>
        </div>

        {/* Dynamic Progress Bar & Percent */}
        <div className="hidden sm:flex flex-col gap-1 w-20">
          <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isUrgent
                  ? 'bg-gradient-to-r from-red-600 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-stone-400 text-left tabular-nums">
            {Math.round(progressPercent)}%
          </span>
        </div>

        {/* Urgency Badge */}
        <span
          className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
            isCritical
              ? 'bg-red-600 text-white border-red-400 animate-pulse'
              : isUrgent
              ? 'bg-red-500/20 text-red-300 border-red-500/50'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {isCritical ? 'حسم فوري!' : isUrgent ? 'اقتراب النهاية' : '2 دقيقة'}
        </span>
      </div>
    </div>
  );
};
