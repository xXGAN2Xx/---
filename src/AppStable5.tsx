/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { GameMode, PlayerStats } from './types';
import { MISSIONS, RANKS, MEDALS, ASSET_IMAGES } from './data/historyData';
import { sound } from './utils/audio';
import { loadJson, saveJson } from './utils/storage';
import { setGamePaused } from './game/pause';
import { Header } from './components/Header';
import { BackgroundMusicPicker } from './components/BackgroundMusicPicker';
const AirStrikeMission = lazy(() => import('./components/AirStrikeMission').then((m) => ({ default: m.AirStrikeMission })));
const CrossingMission = lazy(() => import('./components/CrossingMission').then((m) => ({ default: m.CrossingMission })));
const TankBattleMission = lazy(() => import('./components/TankBattleMission').then((m) => ({ default: m.TankBattleMission })));
const BridgeMission = lazy(() => import('./components/BridgeMission').then((m) => ({ default: m.BridgeMission })));
const ComicStoryModal = lazy(() => import('./components/ComicStoryModal').then((m) => ({ default: m.ComicStoryModal })));
const FortressAssaultMission = lazy(() => import('./components/FortressAssaultMission').then((m) => ({ default: m.FortressAssaultMission })));
const MuseumModal = lazy(() => import('./components/MuseumModal').then((m) => ({ default: m.MuseumModal })));
import { CountdownOverlay } from './components/CountdownOverlay';
import { ComicMissionBriefing } from './components/ComicMissionBriefing';
import { ComicHugeSplashModal } from './components/ComicHugeSplashModal';
import { StageSelectModal } from './components/StageSelectModal';
import { WeatherLightingContainer, WeatherType } from './components/WeatherLightingContainer';
import { Play, Shield, Award, Trophy, Compass, ArrowRight, BookOpen, Waves, Zap, ChevronLeft, MapPin } from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<GameMode>('MENU');
  const [splashMission, setSplashMission] = useState<GameMode | null>(null);
  const [briefingMission, setBriefingMission] = useState<GameMode | null>(null);
  const [countdownMission, setCountdownMission] = useState<GameMode | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('sun_glare');
  const [isMuted, setIsMuted] = useState(false);
  const [isStageSelectOpen, setIsStageSelectOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousMuteRef = useRef(false);
  const defaultStats: PlayerStats = {
    score: 0,
    targetsDestroyed: 0,
    tanksDestroyed: 0,
    aircraftDowned: 0,
    bunkersCleared: 0,
    rank: RANKS[0],
    medals: MEDALS,
    completedMissions: [],
  };

  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = loadJson<Partial<PlayerStats> | null>('october-73-player-stats', null);
    if (!saved) return defaultStats;
    const score = typeof saved.score === 'number' && Number.isFinite(saved.score) ? Math.max(0, saved.score) : 0;
    const rank = RANKS.slice().reverse().find((item) => score >= item.minScore) || RANKS[0];
    return {
      ...defaultStats,
      ...saved,
      score,
      rank,
      medals: MEDALS,
      completedMissions: Array.isArray(saved.completedMissions) ? saved.completedMissions : [],
    };
  });

  useEffect(() => {
    saveJson('october-73-player-stats', stats);
  }, [stats]);

  useEffect(() => {
    setGamePaused(isStageSelectOpen || splashMission !== null);
  }, [isStageSelectOpen, splashMission]);

  // اللعبة تعمل دائمًا على مستوى متوسط واحد للحفاظ على توازن التجربة.
  const difficulty = 'normal' as const;

  // Sync fullscreen state with document
  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const THEME_MAP: Record<string, 'airStrike' | 'crossing' | 'bridge' | 'tankBattle' | 'fortress' | 'menu'> = {
    MISSION_AIR_STRIKE: 'airStrike',
    MISSION_CROSSING: 'crossing',
    MISSION_BRIDGE: 'bridge',
    MISSION_TANK_BATTLE: 'tankBattle',
    MISSION_FORTRESS: 'fortress',
    MENU: 'menu',
  };

  const MISSION_WEATHER_MAP: Record<string, WeatherType> = {
    MISSION_AIR_STRIKE: 'sun_glare',     // وهج شمس الظهيرة 14:00 ساعة الصفر
    MISSION_CROSSING: 'canal_mist',      // رذاذ وسراب مياه القناة
    MISSION_BRIDGE: 'desert_fog',        // ضباب الصحراء الصباحي
    MISSION_TANK_BATTLE: 'sandstorm',    // عاصفة غبار وغسق المعركة
    MISSION_FORTRESS: 'tactical_dawn',   // فجر الاقتحام التكتيكي
  };

  const WEATHER_CYCLES: Record<string, WeatherType[]> = {
    MISSION_AIR_STRIKE: ['sun_glare', 'canal_mist', 'desert_fog', 'sun_glare'],
    MISSION_CROSSING: ['canal_mist', 'sun_glare', 'desert_fog'],
    MISSION_BRIDGE: ['desert_fog', 'sandstorm', 'canal_mist'],
    MISSION_TANK_BATTLE: ['sandstorm', 'tactical_dawn', 'desert_fog'],
    MISSION_FORTRESS: ['tactical_dawn', 'sun_glare', 'sandstorm'],
  };

  useEffect(() => {
    if (!currentMode.startsWith('MISSION_')) return;
    const cycle = WEATHER_CYCLES[currentMode] ?? ['sun_glare', 'desert_fog'];
    let index = Math.max(0, cycle.indexOf(currentWeather));
    const timer = window.setInterval(() => {
      index = (index + 1) % cycle.length;
      setCurrentWeather(cycle[index]);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [currentMode]);

  const handleReturnToMenu = () => {
    sound.playRadioTransmission();
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(false);
    sound.playBackgroundTheme('menu');
    setCurrentMode('MENU');
    setSplashMission(null);
    setBriefingMission(null);
    setIsStageSelectOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMode = (mode: GameMode) => {
    if (mode === 'MENU') {
      handleReturnToMenu();
      return;
    }
    if (mode.startsWith('MISSION_')) {
      sound.playMissionStartRadioAlert();
      sound.stopBackgroundTheme();
      if (MISSION_WEATHER_MAP[mode]) {
        setCurrentWeather(MISSION_WEATHER_MAP[mode]);
      }
      // Show HUGE comic splash poster before mission starts!
      setCurrentMode(mode);
      setSplashMission(mode);
    } else {
      sound.playRadioTransmission();
      sound.stopBackgroundTheme();
      setCurrentMode(mode);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDismissSplash = () => {
    if (!splashMission) return;
    const target = splashMission;
    sound.playRadioTransmission();
    setSplashMission(null);
    setBriefingMission(null);
    if (MISSION_WEATHER_MAP[target]) {
      setCurrentWeather(MISSION_WEATHER_MAP[target]);
    }
    // Start patriotic theme music for this stage!
    sound.playBackgroundTheme(THEME_MAP[target] || 'airStrike');
    // Launch stage in fullscreen!
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    setIsFullscreen(true);
    setCurrentMode(target);
  };

  const handleStartMissionFromBriefing = () => {
    if (!briefingMission) return;
    const target = briefingMission;
    setBriefingMission(null);
    setSplashMission(target);
  };

  const handleCountdownFinish = () => {
    if (countdownMission) {
      if (MISSION_WEATHER_MAP[countdownMission]) {
        setCurrentWeather(MISSION_WEATHER_MAP[countdownMission]);
      }
      setCurrentMode(countdownMission);
      setCountdownMission(null);
    }
  };

  const handleExitMission = () => {
    handleReturnToMenu();
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(false);
  };

  const handleMissionDefeat = (mission: GameMode) => {
    // الخسارة = إنهاء الجلسة فورًا، كتم الصوت، وإعادة البيئة للبداية بدل استمرار المؤقت/الطقس.
    sound.setMuted(true);
    setIsMuted(true);
    sound.stopBackgroundTheme();
    setCurrentWeather(MISSION_WEATHER_MAP[mission] ?? 'sun_glare');
    setSplashMission(null);
    setBriefingMission(null);
    setCountdownMission(null);
    setIsStageSelectOpen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(false);
    setCurrentMode('MENU');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddScore = (points: number) => {
    setStats((prev) => {
      const newScore = prev.score + points;
      // Calculate rank
      const newRank = RANKS.slice().reverse().find((r) => newScore >= r.minScore) || RANKS[0];
      return {
        ...prev,
        score: newScore,
        rank: newRank,
      };
    });
  };

  const handleMissionComplete = (mission: GameMode, scoreEarned: number) => {
    handleAddScore(scoreEarned);
    sound.playRadioTransmission();

    setStats((prev) => ({
      ...prev,
      completedMissions: Array.from(new Set([...prev.completedMissions, mission])),
    }));

    // Auto progress to next logical mission with huge comic splash
    if (mission === 'MISSION_AIR_STRIKE') {
      setSplashMission('MISSION_CROSSING');
    } else if (mission === 'MISSION_CROSSING') {
      setSplashMission('MISSION_BRIDGE');
    } else if (mission === 'MISSION_BRIDGE') {
      setSplashMission('MISSION_TANK_BATTLE');
    } else if (mission === 'MISSION_TANK_BATTLE') {
      setSplashMission('MISSION_FORTRESS');
    } else {
      sound.playBackgroundTheme('menu');
      setCurrentMode('MUSEUM');
    }
  };

  const isCombatMode = currentMode.startsWith('MISSION_');

  return (
    <div
      className={
        isCombatMode
          ? 'w-screen h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white fixed inset-0 z-40 overflow-hidden'
          : 'min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white'
      }
    >
      {/* 1. Stage Select Modal (Interactive stage menu accessible anytime) */}
      <StageSelectModal
        isOpen={isStageSelectOpen}
        onClose={() => {
          setIsStageSelectOpen(false);
          sound.setMuted(previousMuteRef.current);
          setIsMuted(previousMuteRef.current);
        }}
        onSelectStage={(m) => handleSelectMode(m)}
        currentStage={currentMode}
        completedMissions={stats.completedMissions}
      />

      {/* 2. Huge Full-Screen Comic Book Splash Page (Dismisses on ANY key press or click) */}
      {splashMission && (
        <ComicHugeSplashModal
          missionId={splashMission}
          onDismiss={handleDismissSplash}
        />
      )}

      {/* 3. Optional Detailed Dossier Briefing */}
      {briefingMission && (
        <ComicMissionBriefing
          missionId={briefingMission}
          onStartMission={handleStartMissionFromBriefing}
          onExit={() => setBriefingMission(null)}
        />
      )}

      {/* 4. Top Navigation Bar (Clean combat HUD without stage-switching clutter during gameplay) */}
      <Header
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        score={stats.score}
        rankTitle={stats.rank.title}
        onOpenStageSelect={() => {
          previousMuteRef.current = sound.getMuted();
          previousMuteRef.current = sound.getMuted();
          sound.playRadioTransmission();
          sound.setMuted(true);
          setIsMuted(true);
          setIsStageSelectOpen(true);
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <main
        className={
          isCombatMode
            ? 'flex-1 w-full h-full min-h-0 flex flex-col p-0 overflow-hidden'
            : 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8'
        }
      >
        <Suspense fallback={<div dir="rtl" className="flex-1 min-h-[40vh] flex items-center justify-center bg-stone-950 text-stone-300"><div className="text-center"><div className="text-amber-400 font-bold font-cairo mb-2">جاري تجهيز المهمة…</div><div className="text-xs text-stone-500">تحميل عناصر المعركة</div></div></div>}>
        {/* Render Specific Active Mission with Dynamic CSS Weather Lighting Container */}
        {currentMode.startsWith('MISSION_') ? (
          <WeatherLightingContainer
            weather={currentWeather}
            onWeatherChange={setCurrentWeather}
            missionName={MISSIONS.find((m) => m.id === currentMode)?.title}
            hideControls={true}
            className="flex-1 w-full h-full min-h-0"
          >
            {currentMode === 'MISSION_AIR_STRIKE' && (
              <AirStrikeMission
                difficulty={difficulty}
                onComplete={(pts) => handleMissionComplete('MISSION_AIR_STRIKE', pts)}
                onDefeat={() => handleMissionDefeat('MISSION_AIR_STRIKE')}\n                 onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_CROSSING' && (
              <CrossingMission
                difficulty={difficulty}
                onComplete={(pts) => handleMissionComplete('MISSION_CROSSING', pts)}
                onDefeat={() => handleMissionDefeat('MISSION_CROSSING')}\n                 onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_BRIDGE' && (
              <BridgeMission
                difficulty={difficulty}
                onComplete={(pts) => handleMissionComplete('MISSION_BRIDGE', pts)}
                onDefeat={() => handleMissionDefeat('MISSION_BRIDGE')}\n                 onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_TANK_BATTLE' && (
              <TankBattleMission
                difficulty={difficulty}
                onComplete={(pts) => handleMissionComplete('MISSION_TANK_BATTLE', pts)}
                onDefeat={() => handleMissionDefeat('MISSION_TANK_BATTLE')}\n                 onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_FORTRESS' && (
              <FortressAssaultMission
                onComplete={(pts) => handleMissionComplete('MISSION_FORTRESS', pts)}
                onDefeat={() => handleMissionDefeat('MISSION_FORTRESS')}\n                 onExit={handleExitMission}
              />
            )}
          </WeatherLightingContainer>
        ) : null}

        {currentMode === 'COMIC_STORY' && (
          <ComicStoryModal
            onSelectMission={handleSelectMode}
            onClose={handleReturnToMenu}
          />
        )}



        {currentMode === 'MUSEUM' && (
          <MuseumModal
            stats={stats}
            onClose={handleReturnToMenu}
          />
        )}

        </Suspense>

        {currentMode === 'MENU' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 shadow-2xl">
              {/* Background Hero Image */}
              <div className="absolute inset-0">
                <img
                  src={ASSET_IMAGES.crossing}
                  alt="لوحة ملحمة عبور قناة السويس 1973"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-35 filter brightness-75 contrast-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent" />
              </div>

              {/* Hero Content */}
              <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-3xl">
                <div className="flex items-center gap-3 text-xs font-semibold text-amber-400 mb-3">
                  <span>العاشر من رمضان 1393هـ</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span>السادس من أكتوبر 1973م</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span className="text-stone-300 font-mono">14:00 ساعة الصفر</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black font-cairo text-stone-100 tracking-tight leading-tight mb-4 text-balance">
                  ملحمة نصر أكتوبر 1973: ملحمة العبور واستعادة الكرامة
                </h1>

                <p className="text-sm sm:text-base text-stone-300 leading-relaxed mb-8">
                  عش أعظم معارك التاريخ العسكري الحديث: الضربة الجوية المفاجئة، عبور قناة السويس تحت صيحات "الله أكبر"، إسقاط خط بارليف بخراطيم المياه العبقرية، معارك الدبابات وحائط الصواريخ، وتحرير سيناء ورفع العلم المصري خفاقاً!
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <button
                    onClick={() => handleSelectMode('MISSION_AIR_STRIKE')}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-cairo rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>بدء معركة العبور (المرحلة الأولى)</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playRadioTransmission();
                      setIsStageSelectOpen(true);
                    }}
                    className="px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-2 border-amber-500/50 font-bold font-cairo rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>🗺️ قائمة اختيار المراحل</span>
                  </button>

                  <button
                    onClick={() => handleSelectMode('COMIC_STORY')}
                    className="px-5 py-3 bg-red-800 hover:bg-red-700 text-amber-200 border-2 border-red-600 font-bold font-cairo rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <BookOpen className="w-4 h-4 text-yellow-300" />
                    <span>📖 القصة المصورة (ملحمة النصر)</span>
                  </button>



                  <button
                    onClick={() => handleSelectMode('MUSEUM')}
                    className="px-4 py-3 bg-stone-900/60 hover:bg-stone-800 text-stone-300 border border-stone-800 font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trophy className="w-4 h-4 text-stone-400" />
                    <span>متحف وسجل الأبطال</span>
                  </button>
                </div>
              </div>

              <BackgroundMusicPicker />

              {/* Status Ticker Inside Hero Frame */}
              <div className="relative z-10 border-t border-stone-800/80 bg-stone-950/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-stone-500 block text-[11px]">الرتبة العسكرية</span>
                    <span className="text-stone-200 font-bold">{stats.rank.badge} {stats.rank.title}</span>
                  </div>
                  <span aria-hidden="true" className="text-stone-700">|</span>
                  <div>
                    <span className="text-stone-500 block text-[11px]">الرصيد القتالي</span>
                    <span className="text-amber-400 font-bold font-mono tabular-nums">{stats.score} نقطة</span>
                  </div>
                  <span aria-hidden="true" className="text-stone-700">|</span>
                  <div>
                    <span className="text-stone-500 block text-[11px]">المراحل المحررة</span>
                    <span className="text-emerald-400 font-bold font-mono">{stats.completedMissions.length} / 5 مراحل</span>
                  </div>
                </div>

                <div className="text-stone-400">
                  <span>خطة المآذن العالية · قيادة القوات المسلحة المصرية</span>
                </div>
              </div>
            </div>

            {/* Campaign Missions Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-cairo text-stone-100 mb-1">المراحل والعمليات التاريخية للحرب</h2>
                  <p className="text-xs text-stone-400">خض المعارك الخمس الكبرى بالترتيب أو اختر العملية مباشرة</p>
                </div>

                <span className="text-xs text-stone-500 font-medium">سجل العمليات 1973</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MISSIONS.map((mission) => {
                  const isCompleted = stats.completedMissions.includes(mission.id);

                  return (
                    <div
                      key={mission.id}
                      onClick={() => handleSelectMode(mission.id)}
                      className="group bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5"
                    >
                      {/* Mission Thumbnail Header */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-950">
                        <img
                          src={mission.image}
                          alt={mission.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-black/30" />

                        <div className="absolute top-3 right-3 bg-stone-950/80 backdrop-blur border border-stone-700 px-2.5 py-1 rounded text-xs font-mono text-amber-400 font-bold">
                          المرحلة {mission.number}
                        </div>

                        <div className="absolute bottom-3 right-3 text-xs font-bold text-stone-200 bg-stone-950/80 backdrop-blur px-2.5 py-1 rounded">
                          {mission.timeLabel}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold font-cairo text-stone-100 group-hover:text-amber-400 transition-colors">
                              {mission.title}
                            </h3>
                            {isCompleted && (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                ✓ تم التحرير
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-amber-500/90 font-medium mb-3">
                            {mission.subtitle}
                          </div>

                          <p className="text-xs text-stone-300 leading-relaxed mb-4 line-clamp-3">
                            {mission.description}
                          </p>

                          {/* Objectives Checklist */}
                          <div className="space-y-1.5 mb-4 bg-stone-950/60 p-3 rounded-lg border border-stone-800/80">
                            <span className="text-[11px] font-bold text-stone-400 block mb-1">الأهداف الاستراتيجية:</span>
                            {mission.objectives.slice(0, 3).map((obj, idx) => (
                              <div key={idx} className="text-xs text-stone-300 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>{obj}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA Row */}
                        <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-xs font-semibold text-amber-400">
                          <span>بدء العملية القتالية</span>
                          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Historical Facts Banner */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 sm:p-8">
              <h3 className="text-lg font-bold font-cairo text-amber-400 mb-2">
                حقائق عسكرية خالدة من حرب أكتوبر المجيدة
              </h3>
              <p className="text-xs text-stone-400 mb-6 max-w-2xl">
                معركة العبور التي غيرت النظريات العسكرية في أكاديميات العالم العسكرية
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                <div className="p-4 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-2xl sm:text-3xl font-black font-cairo text-amber-400 mb-1">6 ساعات</div>
                  <div className="text-xs text-stone-300 font-bold mb-1">سقوط خط بارليف الأسطوري</div>
                  <p className="text-[11px] text-stone-400">الذي ادعى العدو أنه يحتاج إلى قنبلة ذرية لاقتحامه</p>
                </div>

                <div className="p-4 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-2xl sm:text-3xl font-black font-cairo text-emerald-400 mb-1">100 ألف</div>
                  <div className="text-xs text-stone-300 font-bold mb-1">مقاتل مصري عبروا القناة</div>
                  <p className="text-[11px] text-stone-400">في أول 24 ساعة فقط ونصبوا 60 جسراً ومعبراً</p>
                </div>

                <div className="p-4 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-2xl sm:text-3xl font-black font-cairo text-sky-400 mb-1">222 طائرة</div>
                  <div className="text-xs text-stone-300 font-bold mb-1">الضربة الجوية الافتتاحية</div>
                  <p className="text-[11px] text-stone-400">شلّت رادارات ومطارات العدو في عمق سيناء في 20 دقيقة</p>
                </div>

                <div className="p-4 bg-stone-950 rounded-lg border border-stone-800">
                  <div className="text-2xl sm:text-3xl font-black font-cairo text-orange-400 mb-1">23 دبابة</div>
                  <div className="text-xs text-stone-300 font-bold mb-1">دمرها بطل واحد (عبد العاطي)</div>
                  <p className="text-[11px] text-stone-400">باستخدام صواريخ مالوتكا مسجلاً رقماً قياسياً عالمياً</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer strictly obeying anti-slop rules (clean text, no fake engines) */}
      {!isCombatMode && (
        <footer className="w-full border-t border-stone-800 bg-stone-950 py-6 px-4 text-center text-xs text-stone-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>ملحمة نصر أكتوبر 1973 · تخليداً لأرواح الشهداء وبطولات الجيش المصري العظيم</span>
            <div className="flex items-center gap-4 text-stone-400">
              <button onClick={() => handleSelectMode('MUSEUM')} className="hover:text-amber-400 transition-colors cursor-pointer">
                أرشيف الأبطال
              </button>
              <span aria-hidden="true">·</span>
              <span>«عاشت مصر حرة أبية»</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
