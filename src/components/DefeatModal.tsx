import React, { useEffect } from 'react';
import { GameMode } from '../types';
import { sound } from '../utils/audio';
import { AlertTriangle, RotateCcw, ArrowRight, Radio, Shield, Target, Clock, Trophy } from 'lucide-react';

export interface DefeatModalProps {
  isOpen: boolean;
  missionId: GameMode;
  missionTitle: string;
  reason?: string;
  score?: number;
  targetsDestroyed?: number;
  totalTargets?: number;
  timeElapsed?: number;
  onRetry: () => void;
  onExit: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({
  isOpen,
  missionTitle,
  reason,
  score = 0,
  targetsDestroyed,
  totalTargets,
  timeElapsed,
  onRetry,
  onExit,
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playDefeatSound();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultReason = 'تعرضت القوات لنيران معادية كثيفة أو نفد الوقت المخصص للعملية قبل حسم الأهداف.';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[160] bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-stone-900/95 border-2 border-red-600/70 rounded-2xl p-4 sm:p-7 shadow-[0_0_50px_rgba(220,38,38,0.4)] text-center my-auto">
        {/* Flashing Klaxon Beacon */}
        <div className="mx-auto mb-2.5 sm:mb-3.5 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-red-950/90 border-2 border-red-500/80 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.55)] animate-pulse">
          <AlertTriangle className="w-7 h-7 sm:w-10 sm:h-10" />
        </div>

        {/* Emergency Alert Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-950/90 border border-red-600/60 text-red-400 text-[10px] sm:text-xs font-black font-mono mb-2">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>نداء استغاثة تكتيكي · MAYDAY MAYDAY</span>
        </div>

        {/* Main Title */}
        <h2 className="text-xl sm:text-2xl font-black font-cairo text-red-500 mb-1">
          فشلت المهمة القتالية!
        </h2>
        <div className="text-xs sm:text-sm font-bold text-amber-400 mb-2">
          {missionTitle}
        </div>

        {/* Tactical Explanation */}
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mb-3 sm:mb-4 max-w-md mx-auto">
          {reason || defaultReason}
        </p>

        {/* Combat Stats Dossier */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5 w-full text-center">
          <div className="p-2 sm:p-2.5 bg-stone-950/90 border border-stone-800 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-stone-400 mb-0.5">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>النقاط</span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-amber-400 tabular-nums">
              {score}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 bg-stone-950/90 border border-stone-800 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-stone-400 mb-0.5">
              <Target className="w-3 h-3 text-emerald-400" />
              <span>الأهداف</span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400 tabular-nums">
              {typeof targetsDestroyed === 'number'
                ? `${targetsDestroyed} ${totalTargets ? `/ ${totalTargets}` : ''}`
                : '—'}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 bg-stone-950/90 border border-stone-800 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-stone-400 mb-0.5">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>الزمن</span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-sky-400 tabular-nums">
              {typeof timeElapsed === 'number' ? `${timeElapsed}ث` : 'انتهى'}
            </span>
          </div>
        </div>

        {/* Historical Encouragement Quote */}
        <div className="p-2.5 sm:p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-stone-300 text-[11px] sm:text-xs leading-relaxed mb-3 sm:mb-5 font-tajawal">
          «النصر لا يُمنح بل يُنتزع بالثبات والشجاعة.. أعد تنظيم صفوفك وانطلق مجدداً لاستعادة الأرض والكرامة!»
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto flex-1 min-h-10 sm:min-h-12 px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black font-cairo text-xs sm:text-sm rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.5)] border border-red-400 flex items-center justify-center gap-2 cursor-pointer transition-all touch-manipulation"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>إعادة خوض المعركة فوراً 🔄</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="w-full sm:w-auto min-h-10 sm:min-h-12 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-bold font-cairo text-xs sm:text-sm rounded-xl border border-stone-700 flex items-center justify-center gap-2 cursor-pointer transition-all touch-manipulation"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لغرفة العمليات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
