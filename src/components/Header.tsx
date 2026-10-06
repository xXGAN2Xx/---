import React from 'react';
import { Volume2, VolumeX, Shield, Trophy, Maximize, Minimize, MapPin, ArrowRight } from 'lucide-react';
import { GameMode } from '../types';
import { MISSIONS } from '../data/historyData';

interface HeaderProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleSound: () => void;
  score: number;
  rankTitle: string;
  onOpenStageSelect: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  isMuted,
  onToggleSound,
  score,
  rankTitle,
  onOpenStageSelect,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const isCombatMode = currentMode.startsWith('MISSION_');
  const currentMission = MISSIONS.find((m) => m.id === currentMode);

  return (
    <header className="w-full bg-stone-950/95 backdrop-blur-md border-b border-stone-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Logo or In-Combat Return Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isCombatMode ? (
            <button
              onClick={() => onSelectMode('MENU')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 hover:text-amber-300 border border-stone-800 text-xs sm:text-sm font-bold font-cairo transition-all cursor-pointer shadow-sm active:scale-95"
              title="العودة لغرفة العمليات الرئيسية"
            >
              <ArrowRight className="w-4 h-4" />
              <span>غرفة العمليات</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectMode('MENU')}
              className="text-base sm:text-xl font-black font-cairo text-amber-500 hover:text-amber-400 transition-colors tracking-wide cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1"
            >
              ملحمة نصر أكتوبر 1973
            </button>
          )}

          {/* Current mission badge when in combat */}
          {isCombatMode && currentMission && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-stone-300 font-bold font-cairo">{currentMission.title}</span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (ONLY shown in MENU mode - completely hidden during combat) */}
        {!isCombatMode ? (
          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-stone-300">
            <button
              onClick={() => onSelectMode('MENU')}
              className={`transition-colors hover:text-amber-400 cursor-pointer pb-1 ${
                currentMode === 'MENU' ? 'text-amber-400 border-b-2 border-amber-500' : ''
              }`}
            >
              الرئيسية
            </button>
            <button
              onClick={onOpenStageSelect}
              className="text-amber-400 hover:text-amber-300 cursor-pointer pb-1 font-bold flex items-center gap-1.5"
            >
              <span>🗺️ قائمة المراحل</span>
            </button>
            <button
              onClick={() => onSelectMode('COMIC_STORY')}
              className={`transition-colors hover:text-amber-400 cursor-pointer pb-1 flex items-center gap-1.5 ${
                currentMode === 'COMIC_STORY' ? 'text-amber-400 border-b-2 border-amber-500' : ''
              }`}
            >
              <span>القصة المصورة</span>
            </button>
            <button
              onClick={() => onSelectMode('MUSEUM')}
              className={`transition-colors hover:text-amber-400 cursor-pointer pb-1 ${
                currentMode === 'MUSEUM' ? 'text-amber-400 border-b-2 border-amber-500' : ''
              }`}
            >
              متحف الأبطال
            </button>
          </nav>
        ) : (
          /* When in combat, show clean Stage Select quick trigger */
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStageSelect}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-cairo transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              title="فتح قائمة اختيار المراحل"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>قائمة المراحل</span>
            </button>
          </div>
        )}

        {/* Zone 3: Actions (Fullscreen, Sound, Stage Select, Score) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Player stats */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-stone-400 bg-stone-900 border border-stone-800 px-2.5 sm:px-3 py-1.5 rounded-md">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-stone-300 font-bold">{rankTitle}</span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span className="font-mono tabular-nums text-amber-400 font-bold">{score} نقطة</span>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة (ملء الشاشة)'}
            className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-stone-700 transition-colors cursor-pointer"
            aria-label="ملء الشاشة"
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-stone-700 transition-colors cursor-pointer"
            aria-label="التحكم بالصوت"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Stage list in menu or Museum button */}
          {!isCombatMode && (
            <button
              onClick={onOpenStageSelect}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition-colors rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>قائمة المراحل 🗺️</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
