import React, { useState, useEffect } from 'react';
import { Sun, Cloud, Waves, Wind, Moon, Sparkles, ChevronDown, Check } from 'lucide-react';
import { sound } from '../utils/audio';

export type WeatherType = 'sun_glare' | 'desert_fog' | 'canal_mist' | 'sandstorm' | 'tactical_dawn';

export interface WeatherOption {
  id: WeatherType;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  description: string;
  containerFilter: string;
  color: string;
  badgeBg: string;
}

export const WEATHER_OPTIONS: Record<WeatherType, WeatherOption> = {
  sun_glare: {
    id: 'sun_glare',
    name: 'وهج شمس الظهيرة (14:00)',
    shortName: 'وهج الشمس',
    icon: Sun,
    description: 'أشعة شمس الظهيرة الحارقة وسماء سيناء الساطعة ساعة الصفر',
    containerFilter: 'brightness(1.09) contrast(1.05) saturate(1.14)',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  },
  desert_fog: {
    id: 'desert_fog',
    name: 'ضباب الصحراء الصباحي',
    shortName: 'ضباب الصحراء',
    icon: Cloud,
    description: 'طبقة ضباب صباحية ناعمة تحجب الرؤية وتوفر تمويهاً تكتيكياً فوق الرمال',
    containerFilter: 'brightness(0.96) contrast(0.92) saturate(0.94) sepia(0.16)',
    color: '#e2e8f0',
    badgeBg: 'bg-slate-500/15 border-slate-400/40 text-slate-200',
  },
  canal_mist: {
    id: 'canal_mist',
    name: 'رذاذ وسراب القناة المائي',
    shortName: 'رذاذ القناة',
    icon: Waves,
    description: 'رذاذ خراطيم مياه السويس وسراب الأفق المائي العاكس لأشعة الشمس',
    containerFilter: 'brightness(1.05) contrast(1.08) saturate(1.2) hue-rotate(-6deg)',
    color: '#38bdf8',
    badgeBg: 'bg-sky-500/15 border-sky-400/40 text-sky-300',
  },
  sandstorm: {
    id: 'sandstorm',
    name: 'عاصفة غبار وغسق المعركة',
    shortName: 'غسق الصحراء',
    icon: Wind,
    description: 'عاصفة رمال برتقالية خفيفة ووهج الغسق الناري فوق دبابات سيناء',
    containerFilter: 'brightness(0.93) contrast(1.15) saturate(1.28) sepia(0.28)',
    color: '#ea580c',
    badgeBg: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
  },
  tactical_dawn: {
    id: 'tactical_dawn',
    name: 'فجر الاقتحام التكتيكي',
    shortName: 'فجر تكتيكي',
    icon: Moon,
    description: 'إضاءة الفجر الزرقاء الباردة والظلال الحادة قبل شروق الشمس',
    containerFilter: 'brightness(0.91) contrast(1.22) saturate(1.08) hue-rotate(12deg)',
    color: '#818cf8',
    badgeBg: 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300',
  },
};

interface WeatherLightingContainerProps {
  weather: WeatherType;
  onWeatherChange: (weather: WeatherType) => void;
  children: React.ReactNode;
  missionName?: string;
  hideControls?: boolean;
  className?: string;
}

export function WeatherLightingContainer({
  weather,
  onWeatherChange,
  children,
  missionName,
  hideControls = false,
  className = '',
}: WeatherLightingContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(true);

  const currentOption = WEATHER_OPTIONS[weather] || WEATHER_OPTIONS.sun_glare;
  const CurrentIcon = currentOption.icon;

  useEffect(() => {
    setShowNotification(true);
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [weather]);

  const handleSelect = (w: WeatherType) => {
    sound.playRadioClick();
    onWeatherChange(w);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${hideControls ? 'h-full min-h-0 flex flex-col flex-1' : ''}`}>
      {/* Dynamic Tactical Weather Control Bar (Hidden when in clean combat/fullscreen mode) */}
      {!hideControls && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-mono">حالة الطقس الميداني:</span>
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm cursor-pointer ${currentOption.badgeBg} hover:brightness-110 active:scale-95`}
                title="تغيير إضاءة وطقس المهمة عبر تأثيرات CSS الديناميكية"
              >
                <CurrentIcon className="w-4 h-4 animate-pulse" />
                <span>{currentOption.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Weather Dropdown Selector */}
              {isOpen && (
                <div className="absolute top-full mt-1.5 right-0 sm:right-auto sm:left-0 z-50 w-72 rounded-xl bg-stone-900 border border-stone-700 shadow-2xl p-2 space-y-1 backdrop-blur-md">
                  <div className="px-3 py-1.5 border-b border-stone-800 text-[11px] font-semibold text-stone-400">
                    اختر تأثير الطقس والإضاءة الديناميكية (CSS)
                  </div>
                  {(Object.keys(WEATHER_OPTIONS) as WeatherType[]).map((wKey) => {
                    const opt = WEATHER_OPTIONS[wKey];
                    const Icon = opt.icon;
                    const isSelected = weather === wKey;
                    return (
                      <button
                        key={wKey}
                        onClick={() => handleSelect(wKey)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-right text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                            : 'hover:bg-stone-800/80 text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" style={{ color: opt.color }} />
                          <div>
                            <div className="font-cairo">{opt.name}</div>
                            <div className="text-[10px] text-stone-400 font-normal line-clamp-1">{opt.description}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 mr-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Lighting Status Hint */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>إضاءة CSS ديناميكية مطبقة على الحاوية</span>
          </div>
        </div>
      )}

      {/* Main Mission Container with CSS Filters & Atmospheric Overlays */}
      <div
        className={`relative w-full overflow-hidden transition-all duration-700 ease-in-out ${
          hideControls ? 'flex-1 min-h-0 flex flex-col h-full rounded-none' : 'rounded-2xl shadow-2xl'
        } ${className}`}
        style={{
          filter: currentOption.containerFilter,
        }}
      >
        {/* Dynamic CSS Weather Lighting Overlays */}
        {/* 1. Sun Glare Overlay (وهج شمس الظهيرة 14:00) */}
        {weather === 'sun_glare' && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden mix-blend-screen">
            {/* Radiant Sunburst in top-right corner */}
            <div
              className="absolute -top-16 -right-16 w-96 h-96 rounded-full animate-sun-flare"
              style={{
                background: 'radial-gradient(circle, rgba(254, 240, 138, 0.42) 0%, rgba(245, 158, 11, 0.22) 40%, rgba(217, 119, 6, 0.08) 70%, transparent 100%)',
              }}
            />
            {/* Subtle Sunbeam diagonal rays across the container */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background: 'linear-gradient(135deg, rgba(254, 240, 138, 0.3) 0%, rgba(245, 158, 11, 0.1) 35%, transparent 70%)',
              }}
            />
          </div>
        )}

        {/* 2. Desert Fog Overlay (ضباب الصحراء الصباحي) */}
        {weather === 'desert_fog' && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden mix-blend-screen">
            {/* Drifting morning desert fog bank */}
            <div
              className="absolute inset-0 animate-fog-drift"
              style={{
                background: 'linear-gradient(to top, rgba(226, 232, 240, 0.22) 0%, rgba(214, 180, 140, 0.18) 45%, rgba(200, 160, 110, 0.06) 75%, transparent 100%)',
              }}
            />
            {/* Soft lower ground mist */}
            <div
              className="absolute bottom-0 left-0 right-0 h-48 opacity-40 animate-fog-drift"
              style={{
                background: 'radial-gradient(ellipse 120% 80% at 50% 100%, rgba(248, 250, 252, 0.28) 0%, rgba(226, 232, 240, 0.12) 60%, transparent 100%)',
              }}
            />
          </div>
        )}

        {/* 3. Canal Mist & Water Mirage Overlay (رذاذ وسراب القناة) */}
        {weather === 'canal_mist' && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden mix-blend-screen">
            <div
              className="absolute inset-0 animate-water-shimmer"
              style={{
                background: 'linear-gradient(120deg, rgba(56, 189, 248, 0.16) 0%, rgba(14, 165, 233, 0.08) 40%, rgba(245, 158, 11, 0.12) 100%)',
              }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-32 opacity-35"
              style={{
                background: 'linear-gradient(to top, rgba(56, 189, 248, 0.24) 0%, transparent 100%)',
              }}
            />
          </div>
        )}

        {/* 4. Sandstorm & War Dust Sunset Overlay (عاصفة غبار وغسق المعركة) */}
        {weather === 'sandstorm' && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden mix-blend-color-burn mix-blend-overlay">
            <div
              className="absolute inset-0 animate-sand-haze"
              style={{
                background: 'radial-gradient(ellipse 90% 70% at 50% 85%, rgba(249, 115, 22, 0.24) 0%, rgba(180, 83, 9, 0.18) 50%, rgba(69, 26, 3, 0.3) 100%)',
              }}
            />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'linear-gradient(45deg, rgba(234, 88, 12, 0.2) 0%, transparent 50%, rgba(180, 83, 9, 0.2) 100%)',
              }}
            />
          </div>
        )}

        {/* 5. Tactical Dawn Overlay (فجر الاقتحام التكتيكي) */}
        {weather === 'tactical_dawn' && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden mix-blend-overlay">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(30, 27, 75, 0.32) 0%, rgba(49, 46, 129, 0.15) 50%, rgba(245, 158, 11, 0.16) 100%)',
              }}
            />
          </div>
        )}

        {/* Children (Active Mission) */}
        <div className={`relative z-30 w-full ${hideControls ? 'flex-1 min-h-0 flex flex-col h-full' : ''}`}>
          {children}
        </div>

        {/* Dynamic Weather Start Notification Toast */}
        {showNotification && (
          <div className="pointer-events-none absolute top-4 right-4 z-40 animate-bounce duration-1000">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-stone-950/90 border border-amber-500/50 text-stone-100 shadow-xl backdrop-blur-md text-xs font-semibold">
              <CurrentIcon className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-amber-400 font-bold">{currentOption.name}</span>
                <span className="text-stone-300 mr-1.5 font-normal">
                  {missionName ? `· ${missionName}` : '· تم تفعيل إضاءة الطقس'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
