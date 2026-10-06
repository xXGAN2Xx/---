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
      className={`absolute ${positionClasses} z-30 select-none pointer-events-none transition-all duration-300 ${className}`}
    >
      <div
        className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border backdrop-blur-md flex items-center gap-1.5 shadow-md transition-colors ${
          isCritical
            ? 'bg-red-950/90 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse'
            : isUrgent
            ? 'bg-red-950/80 border-red-500/70 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            : 'bg-stone-950/85 border-stone-800 text-amber-400'
        }`}
      >
        {isUrgent ? (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className="font-mono font-black text-xs sm:text-sm tabular-nums tracking-wider text-stone-100">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};
