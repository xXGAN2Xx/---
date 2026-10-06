import React, { useEffect } from 'react';
import { sound } from '../utils/audio';
import { GameMode } from '../types';
import { MISSIONS } from '../data/historyData';
import { Trophy, Award, ArrowRight, RotateCcw, Home, Sparkles, CheckCircle2, Shield, Target, Clock, Star } from 'lucide-react';

export interface VictoryStatItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface VictoryModalProps {
  isOpen: boolean;
  missionId: GameMode;
  missionTitle?: string;
  congratulatoryMessage?: string;
  score: number;
  timeElapsed?: number;
  timeLeft?: number;
  targetsDestroyed?: number;
  totalTargets?: number;
  customStats?: VictoryStatItem[];
  rankTitle?: string;
  onNextMission?: () => void;
  onReturnToBase: () => void;
  onReplay?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  missionId,
  missionTitle,
  congratulatoryMessage = 'مبروك النصر العظيم! تم تحقيق أهداف المهمة بنجاح ساحق!',
  score,
  timeLeft,
  targetsDestroyed,
  totalTargets,
  customStats,
  rankTitle,
  onNextMission,
  onReturnToBase,
  onReplay,
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playVictoryFanfare();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const missionInfo = MISSIONS.find((m) => m.id === missionId);
  const title = missionTitle || missionInfo?.title || 'المهمة القتالية';
  const stageNumber = missionInfo?.number || 1;

  // Format time mm:ss
  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-2xl bg-stone-900 border-4 border-amber-500 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center overflow-hidden my-auto">
        {/* Decorative corner ribbons */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br from-amber-500 to-amber-600 rotate-45 transform pointer-events-none shadow-lg flex items-end justify-center pb-2">
          <Star className="w-5 h-5 text-stone-950 fill-stone-950" />
        </div>

        {/* Victory Icon and Crown */}
        <div className="relative mx-auto mb-3.5 w-20 h-20 sm:w-24 sm:h-24">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 border-3 border-amber-300 flex items-center justify-center text-stone-950 shadow-[0_0_30px_rgba(245,158,11,0.6)]">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 fill-stone-950" />
          </div>
          <div className="absolute -bottom-1 -left-1 bg-emerald-600 text-white rounded-full p-1 border-2 border-stone-900 shadow">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Badge & Stage Info */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>المرحلة {stageNumber} · {title}</span>
        </div>

        {/* Congratulatory Headline */}
        <h2 className="text-2xl sm:text-3xl font-black font-cairo text-amber-400 mb-2 drop-shadow-md">
          {congratulatoryMessage}
        </h2>

        {/* Historical quote */}
        <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto mb-5 leading-relaxed font-tajawal">
          «الله أكبر فوق كيد المعتدي.. سطرتم بدمائكم وبطولاتكم معجزة العبور والنصر المبين في حرب أكتوبر 1973 المجيدة.»
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6 max-w-xl mx-auto">
          <div className="p-2.5 sm:p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400 mb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>النقاط المكتسبة</span>
            </div>
            <span className="text-lg sm:text-xl font-mono font-black text-amber-400 tabular-nums">
              +{score}
            </span>
          </div>

          {targetsDestroyed !== undefined && (
            <div className="p-2.5 sm:p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400 mb-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>الأهداف المنجزة</span>
              </div>
              <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 tabular-nums">
                {targetsDestroyed} {totalTargets ? `/ ${totalTargets}` : 'هدف'}
              </span>
            </div>
          )}

          {timeLeft !== undefined && (
            <div className="p-2.5 sm:p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>الوقت المتبقي</span>
              </div>
              <span className="text-lg sm:text-xl font-mono font-black text-sky-400 tabular-nums">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {rankTitle && (
            <div className="p-2.5 sm:p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400 mb-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>الرتبة العسكرية</span>
              </div>
              <span className="text-xs sm:text-sm font-bold font-cairo text-purple-300 line-clamp-1">
                {rankTitle}
              </span>
            </div>
          )}

          {customStats?.map((st, idx) => (
            <div key={idx} className="p-2.5 sm:p-3 bg-stone-950/80 border border-stone-800 rounded-xl">
              <span className="block text-[11px] text-stone-400 mb-1">{st.label}</span>
              <span className={`text-base font-mono font-bold ${st.highlight ? 'text-amber-400' : 'text-stone-200'}`}>
                {st.value}
              </span>
            </div>
          ))}
        </div>

        {/* Mission Objectives Accomplished Checklist */}
        {missionInfo?.objectives && missionInfo.objectives.length > 0 && (
          <div className="max-w-xl mx-auto bg-stone-950/60 border border-amber-500/20 rounded-xl p-3 sm:p-3.5 mb-6 text-right">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تم إنجاز أهداف العملية العسكرية بنجاح:</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-stone-300">
              {missionInfo.objectives.slice(0, 4).map((obj, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="line-clamp-1">{obj}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons: Next Mission & Return to Base */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
          {onNextMission && (
            <button
              type="button"
              onClick={onNextMission}
              className="w-full sm:w-auto flex-1 min-h-12 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black font-cairo text-sm sm:text-base transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>المرحلة التالية</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          )}

          {/* 'العودة للقاعدة' / 'Return to Base' button */}
          <button
            type="button"
            onClick={onReturnToBase}
            className="w-full sm:w-auto flex-1 min-h-12 px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 border border-stone-700 font-bold font-cairo text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>العودة إلى القاعدة (غرفة العمليات)</span>
          </button>

          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-stone-950 hover:bg-stone-900 active:scale-95 text-stone-400 hover:text-stone-200 border border-stone-800 font-bold font-cairo text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="إعادة المرحلة"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
