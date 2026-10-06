/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameMode, PlayerStats } from './types';
import { Difficulty } from './game/difficulty';
import { MISSIONS, RANKS, MEDALS, ASSET_IMAGES } from './data/historyData';
import { sound } from './utils/audio';
import { Header } from './components/Header';
import { AirStrikeMission } from './components/AirStrikeMission';
import { CrossingMission } from './components/CrossingMission';
import { TankBattleMission } from './components/TankBattleMission';
import { BridgeMission } from './components/BridgeMission';
import { ComicStoryModal } from './components/ComicStoryModal';
import { FortressAssaultMission } from './components/FortressAssaultMission';
import { SurvivalTacticalMode } from './components/SurvivalTacticalMode';
import { MuseumModal } from './components/MuseumModal';
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
  const [stats, setStats] = useState<PlayerStats>({
    score: 1200,
    targetsDestroyed: 8,
    tanksDestroyed: 4,
    aircraftDowned: 3,
    bunkersCleared: 2,
    rank: RANKS[1], // نقيب صاعقة
    medals: MEDALS,
    completedMissions: [],
  });

  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'heroic'>('normal');

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

  const handleSelectDifficulty = (level: 'easy' | 'normal' | 'heroic') => {
    setDifficulty(level);
    sound.playRadioTransmission();
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
    SURVIVAL_TACTICAL: 'sandstorm',
  };

  const handleReturnToMenu = () => {
    sound.playRadioTransmission();
    sound.playBackgroundTheme('menu');
    setCurrentMode('MENU');
    setSplashMission(null);
    setBriefingMission(null);
    setIsStageSelectOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMode = (mode: GameMode) => {
    if (mode.startsWith('MISSION_')) {
      sound.playMissionStartRadioAlert();
      if (MISSION_WEATHER_MAP[mode]) {
        setCurrentWeather(MISSION_WEATHER_MAP[mode]);
      }
      // Show HUGE comic splash poster before mission starts!
      setSplashMission(mode);
    } else {
      sound.playRadioTransmission();
      if (mode === 'MENU') {
        sound.playBackgroundTheme('menu');
      } else {
        sound.stopBackgroundTheme();
      }
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

  const isCombatMode = currentMode.startsWith('MISSION_') || currentMode === 'SURVIVAL_TACTICAL';

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
        onClose={() => setIsStageSelectOpen(false)}
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
          sound.playRadioTransmission();
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
                onComplete={(pts) => handleMissionComplete('MISSION_AIR_STRIKE', pts)}
                onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_CROSSING' && (
              <CrossingMission
                onComplete={(pts) => handleMissionComplete('MISSION_CROSSING', pts)}
                onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_BRIDGE' && (
              <BridgeMission
                onComplete={(pts) => handleMissionComplete('MISSION_BRIDGE', pts)}
                onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_TANK_BATTLE' && (
              <TankBattleMission
                onComplete={(pts) => handleMissionComplete('MISSION_TANK_BATTLE', pts)}
                onExit={handleExitMission}
              />
            )}

            {currentMode === 'MISSION_FORTRESS' && (
              <FortressAssaultMission
                onComplete={(pts) => handleMissionComplete('MISSION_FORTRESS', pts)}
                onExit={handleExitMission}
              />
            )}
          </WeatherLightingContainer>
        ) : null}

        {currentMode === 'COMIC_STORY' && (
          <ComicStoryModal
            onSelectMission={(m) => setCurrentMode(m)}
            onClose={handleReturnToMenu}
          />
        )}

        {currentMode === 'SURVIVAL_TACTICAL' && (
          <WeatherLightingContainer
            weather={currentWeather}
            onWeatherChange={setCurrentWeather}
            missionName="طور الصمود التكتيكي"
            hideControls={true}
            className="flex-1 w-full h-full min-h-0"
          >
            <SurvivalTacticalMode
              onAddScore={handleAddScore}
              onExit={handleReturnToMenu}
            />
          </WeatherLightingContainer>
        )}

        {currentMode === 'MUSEUM' && (
          <MuseumModal
            stats={stats}
            onClose={() => setCurrentMode('MENU')}
          />
        )}

        {/* Operations Room Menu (غرفة العمليات المركزية) */}
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
                    onClick={() => handleSelectMode('SURVIVAL_TACTICAL')}
                    className="px-5 py-3 bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-stone-700 font-bold font-cairo rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-amber-500" />
                    <span>وضع الدفاع التكتيكي</span>
                  </button>

                  <button
                    onClick={() => handleSelectMode('MUSEUM')}
                    className="px-4 py-3 bg-stone-900/60 hover:bg-stone-800 text-stone-300 border border-stone-800 font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trophy className="w-4 h-4 text-stone-400" />
                    <span>متحف وسجل الأبطال</span>
                  </button>
                </div>

                {/* Quick Stage Jump Direct Bar */}
                <div className="mb-6 p-3 bg-stone-950/80 rounded-xl border border-stone-800/80">
                  <div className="text-[11px] font-bold text-stone-400 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>انتقال مباشر للعمليات والمراحل:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSelectMode('MISSION_AIR_STRIKE')}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-800 rounded-lg text-xs font-semibold font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>1. الضربة الجوية 🦅</span>
                    </button>

                    <button
                      onClick={() => handleSelectMode('MISSION_CROSSING')}
                      className="px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 hover:text-white border border-sky-800/60 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <span>2. تحطيم خط بارليف 🌊</span>
                    </button>

                    <button
                      onClick={() => handleSelectMode('MISSION_BRIDGE')}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-800 rounded-lg text-xs font-semibold font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>3. بناء الجسور 🔨</span>
                    </button>

                    <button
                      onClick={() => handleSelectMode('MISSION_TANK_BATTLE')}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-800 rounded-lg text-xs font-semibold font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>4. صراع الدبابات 🛡️</span>
                    </button>

                    <button
                      onClick={() => handleSelectMode('MISSION_FORTRESS')}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-800 rounded-lg text-xs font-semibold font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <span>5. سقوط الحصون 🇪🇬</span>
                    </button>
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-400 font-medium">مستوى الصعوبة والتوجيه:</span>
                  <div className="flex items-center gap-1 p-1 bg-stone-950/80 rounded-lg border border-stone-800">
                    <button
                      onClick={() => handleSelectDifficulty('easy')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                        difficulty === 'easy' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      سهل (توجيه مساعد)
                    </button>
                    <button
                      onClick={() => handleSelectDifficulty('normal')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                        difficulty === 'normal' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      عادي (تاريخي متوازن)
                    </button>
                    <button
                      onClick={() => handleSelectDifficulty('heroic')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                        difficulty === 'heroic' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      بطولي (أسطورة الصاعقة)
                    </button>
                  </div>
                </div>
              </div>

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
