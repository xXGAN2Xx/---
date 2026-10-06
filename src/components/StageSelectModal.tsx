import React from 'react';
import { MISSIONS } from '../data/historyData';
import { GameMode } from '../types';
import { sound } from '../utils/audio';
import { X, Play, CheckCircle2, Shield, BookOpen, Trophy, ArrowRight, Zap } from 'lucide-react';

interface StageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStage: (stage: GameMode) => void;
  currentStage: GameMode;
  completedMissions: GameMode[];
}

export const StageSelectModal: React.FC<StageSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectStage,
  currentStage,
  completedMissions,
}) => {
  if (!isOpen) return null;

  const handlePickStage = (stage: GameMode) => {
    sound.playRadioTransmission();
    onSelectStage(stage);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-stone-900 border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              🗺️
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-cairo text-amber-400">
                قائمة اختيار المراحل والعمليات
              </h2>
              <p className="text-xs text-stone-400">
                اختر العملية التي تريد خوضها أو الانتقال إليها فوراً
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playRadioTransmission();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer border border-stone-800"
            title="إغلاق القائمة"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stages Grid */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Historical 5 Campaign Missions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-300 font-cairo flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                المراحل التاريخية الخمس الرئيسية
              </span>
              <span className="text-[11px] text-amber-500/90 font-mono">
                {completedMissions.length} من 5 مكتملة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {MISSIONS.map((mission) => {
                const isCurrent = currentStage === mission.id;
                const isCompleted = completedMissions.includes(mission.id);

                return (
                  <div
                    key={mission.id}
                    onClick={() => handlePickStage(mission.id)}
                    className={`group relative rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer flex gap-3.5 items-center ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500'
                        : 'bg-stone-950/80 hover:bg-stone-800/80 border-stone-800 hover:border-amber-500/50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shrink-0 border border-stone-800 bg-stone-900">
                      <img
                        src={mission.image}
                        alt={mission.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 filter brightness-90"
                      />
                      <div className="absolute top-1 right-1 bg-stone-950/90 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-amber-400">
                        {mission.number}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-sm font-bold font-cairo text-stone-100 group-hover:text-amber-400 transition-colors truncate">
                          {mission.title}
                        </h4>
                        {isCompleted && (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" /> تم
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-medium text-amber-500/90 mb-1 line-clamp-1">
                        {mission.subtitle}
                      </div>

                      <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed mb-2">
                        {mission.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 font-mono">{mission.timeLabel}</span>
                        <span className="font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
                          <span>{isCurrent ? 'أنت هنا الآن' : 'بدء المرحلة'}</span>
                          <Play className="w-3 h-3 fill-current" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Special Modes */}
          <div className="pt-2 border-t border-stone-800">
            <span className="text-xs font-bold text-stone-300 font-cairo block mb-3">
              أطوار خاصة إضافية
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">


              {/* Comic Story */}
              <button
                onClick={() => handlePickStage('COMIC_STORY')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                  currentStage === 'COMIC_STORY'
                    ? 'bg-amber-500/15 border-amber-500'
                    : 'bg-stone-950 hover:bg-stone-800 border-stone-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 text-red-400">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-bold font-cairo text-stone-100">القصة المصورة</span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed mb-2">
                  لوحات كوميك ملحمية توثق أحداث الحرب وساعة الصفر
                </p>
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <span>فتح القصة</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              {/* Museum */}
              <button
                onClick={() => handlePickStage('MUSEUM')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                  currentStage === 'MUSEUM'
                    ? 'bg-amber-500/15 border-amber-500'
                    : 'bg-stone-950 hover:bg-stone-800 border-stone-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 text-yellow-400">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-bold font-cairo text-stone-100">متحف وسجل الأبطال</span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed mb-2">
                  عرض الأوسمة والشهداء والقادة وسجلات الشرف القتالية
                </p>
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <span>فتح الأرشيف</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>خطة المآذن العالية · اختيار مباشر لأي معركة</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-lg cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
