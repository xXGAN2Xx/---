import React, { useEffect, useRef, useState, useCallback } from 'react';
import { isGamePaused } from '../game/pause';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Flag,
  Shield,
  Flame,
  CheckCircle2,
  Award,
  RotateCcw,
  Target,
  Zap,
  Crosshair,
  Sparkles,
  Droplets,
  Bomb,
  Wind,
  Info,
  Radio,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';
import { FlagRaisingAnimationModal } from './FlagRaisingAnimationModal';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface FortressAssaultMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
}

// Tactical weapons available to the commando detachment
type CommandoWeaponType = 'rpg' | 'mg' | 'satchel' | 'foam' | 'smoke';

interface WeaponConfig {
  id: CommandoWeaponType;
  name: string;
  shortcut: string;
  icon: typeof Bomb;
  cooldown: number; // in seconds
  ammoName: string;
  effectiveAgainst: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBorderColor: string;
}

const WEAPONS: Record<CommandoWeaponType, WeaponConfig> = {
  rpg: {
    id: 'rpg',
    name: 'قاذف آر بي جي-7 (RPG)',
    shortcut: '1',
    icon: Bomb,
    cooldown: 1.6,
    ammoName: 'قذائف صاروخية PG-7V',
    effectiveAgainst: 'الدشم الخرسانية وأبراج المراقبة',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    activeBorderColor: 'border-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
  },
  mg: {
    id: 'mg',
    name: 'رشاش الصاعقة الثقيل (MG)',
    shortcut: '2',
    icon: Crosshair,
    cooldown: 0.35,
    ammoName: 'طلقات حارقة خارقة 7.62 مم',
    effectiveAgainst: 'القناصة ونقاط المراقبة والتحصينات الخفيفة',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    activeBorderColor: 'border-emerald-400 bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
  },
  satchel: {
    id: 'satchel',
    name: 'شحنة نسف الصاعقة (Satchel)',
    shortcut: '3',
    icon: Zap,
    cooldown: 3.0,
    ammoName: 'عبوة متفجرة TNT مركزة',
    effectiveAgainst: 'بوابات الحصن الفولاذية والمراكز القيادية',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-500/40',
    activeBorderColor: 'border-rose-400 bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.5)]',
  },
  foam: {
    id: 'foam',
    name: 'مضخة إخماد النابالم (Foam)',
    shortcut: '4',
    icon: Droplets,
    cooldown: 0.5,
    ammoName: 'سائل رغوي مضغوط عازل',
    effectiveAgainst: 'صمامات وأنابيب النابالم المشتعلة',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/40',
    activeBorderColor: 'border-sky-400 bg-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.5)]',
  },
  smoke: {
    id: 'smoke',
    name: 'قنابل ستائر الدخان (Cover)',
    shortcut: '5',
    icon: Wind,
    cooldown: 6.0,
    ammoName: 'ستار دخاني تكتيكي كثيف',
    effectiveAgainst: 'حجب رؤية نيران العدو واستعادة حماية الفصيلة',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    activeBorderColor: 'border-purple-400 bg-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.5)]',
  },
};

type TargetCategory = 'bunker' | 'napalm_valve' | 'tower' | 'blast_door' | 'patrol';

interface AssaultTarget {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  category: TargetCategory;
  name: string;
  roleHint: string;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  bestWeapon: CommandoWeaponType;
  shootCooldown: number;
  shootTimer: number;
  sniperLaserProgress: number; // 0 to 1
  flameIntensity: number;
  points: number;
  smokeLevel: number;
}

interface CommandoProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: CommandoWeaponType;
  damage: number;
  targetX: number;
  targetY: number;
  life: number;
  maxLife: number;
  isEnemy?: boolean;
}

interface CombatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
  isSmoke?: boolean;
}

interface FloatingCombatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export const FortressAssaultMission: React.FC<FortressAssaultMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const initialDuration = diffConfig.missionDuration || 120; // 150s (easy), 120s (normal), 90s (hard)

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Difficulty parameters
  // Increased squad health in normal mode (180 HP) to make combat much more durable and forgiving
  const maxSquadHp = difficulty === 'easy' ? 220 : difficulty === 'hard' ? 110 : 180;
  // Slower enemy fire rate: easy is very relaxed (0.35), normal is moderate (0.55), hard is (0.85)
  const enemyFireRateMultiplier = difficulty === 'easy' ? 0.35 : difficulty === 'hard' ? 0.85 : 0.55;

  // React state for HUD
  const [squadHp, setSquadHp] = useState(maxSquadHp);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [activeWeapon, setActiveWeapon] = useState<CommandoWeaponType>('rpg');
  const [weaponCooldowns, setWeaponCooldowns] = useState<Record<CommandoWeaponType, number>>({
    rpg: 0,
    mg: 0,
    satchel: 0,
    foam: 0,
    smoke: 0,
  });

  const [targetsRemaining, setTargetsRemaining] = useState(0);
  const [totalTargetsCount, setTotalTargetsCount] = useState(0);

  // Victory / Flag Raising Phase
  const [isFlagPhase, setIsFlagPhase] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagProgress, setFlagProgress] = useState(0); // 0 to 100%
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'squad_wiped' | 'timeout'>('squad_wiped');

  // Tactical situational radio feedback message
  const [radioMsg, setRadioMsg] = useState(
    'الصاعقة تقتحم خط بارليف! استخدم الأسلحة التكتيكية لتدمير الدشم وتعطيل النابالم وتأمين القمة!'
  );
  const [showIntelDrawer, setShowIntelDrawer] = useState(false);
  const [smokeScreenActive, setSmokeScreenActive] = useState(0); // seconds remaining

  // Engine state ref for 60fps render loop
  const engineRef = useRef({
    targets: [] as AssaultTarget[],
    projectiles: [] as CommandoProjectile[],
    particles: [] as CombatParticle[],
    floatingTexts: [] as FloatingCombatText[],
    crosshair: { x: 500, y: 300 },
    isCrosshairActive: false,
    squadHp: maxSquadHp,
    maxSquadHp,
    score: 0,
    timeLeft: initialDuration,
    screenShake: 0,
    cooldowns: {
      rpg: 0,
      mg: 0,
      satchel: 0,
      foam: 0,
      smoke: 0,
    },
    smokeScreenTimer: 0,
    flagProgress: 0,
    flagPole: { x: 860, y: 155 },
    isFlagPhase: false,
    isComplete: false,
    nextTextId: 1,
    patrolOffset: 0,
    patrolDir: 1,
  });

  // Background Theme
  useEffect(() => {
    sound.playBackgroundTheme('fortress');
    return () => {
      sound.stopBackgroundTheme();
    };
  }, []);

  // Initialize targets based on difficulty
  const generateTargets = useCallback(
    (diff: Difficulty, width: number, height: number): AssaultTarget[] => {
      const targets: AssaultTarget[] = [];
      let idCounter = 1;

      // 1. Coastal Napalm Discharge Valve 1 (near bottom slope of the sand rampart)
      targets.push({
        id: idCounter++,
        x: width * 0.28,
        y: height * 0.64,
        width: 54,
        height: 42,
        category: 'napalm_valve',
        name: 'صمام النابالم الشاطئي (قطاع 1)',
        roleHint: 'أنابيب سائل حارق موجهة للمياه؛ استخدم مضخة الرغوة [4] لإخمادها!',
        hp: 70,
        maxHp: 70,
        destroyed: false,
        bestWeapon: 'foam',
        shootCooldown: 999, // Spews fire, doesn't fire bullets
        shootTimer: 0,
        sniperLaserProgress: 0,
        flameIntensity: 1.0,
        points: 400,
        smokeLevel: 0,
      });

      // 2. Sand Rampart Napalm Valve 2 (Normal and Hard)
      if (diff !== 'easy') {
        targets.push({
          id: idCounter++,
          x: width * 0.46,
          y: height * 0.53,
          width: 52,
          height: 40,
          category: 'napalm_valve',
          name: 'صمام النابالم الأوسط (قطاع 2)',
          roleHint: 'أنابيب ضخ وقود ثانوية؛ استخدم مضخة الرغوة [4] أو الآر بي جي [1]!',
          hp: 80,
          maxHp: 80,
          destroyed: false,
          bestWeapon: 'foam',
          shootCooldown: 999,
          shootTimer: 0,
          sniperLaserProgress: 0,
          flameIntensity: 1.0,
          points: 450,
          smokeLevel: 0,
        });
      }

      // 3. Concrete Gun Pillbox 1 (Left flank)
      targets.push({
        id: idCounter++,
        x: width * 0.18,
        y: height * 0.44,
        width: 78,
        height: 52,
        category: 'bunker',
        name: 'دشمة رشاشات ثقيلة مصفحة 1',
        roleHint: 'دشمة خرسانية تمطر القوات بنيران غزيرة؛ استخدم قاذف RPG [1] لتدميرها!',
        hp: 120,
        maxHp: 120,
        destroyed: false,
        bestWeapon: 'rpg',
        shootCooldown: 2.8 / enemyFireRateMultiplier,
        shootTimer: 1.0,
        sniperLaserProgress: 0,
        flameIntensity: 0,
        points: 500,
        smokeLevel: 0,
      });

      // 4. Concrete Gun Pillbox 2 (Center-Right flank - Normal and Hard)
      if (diff !== 'easy') {
        targets.push({
          id: idCounter++,
          x: width * 0.54,
          y: height * 0.38,
          width: 82,
          height: 54,
          category: 'bunker',
          name: 'دشمة مدافع محصنة 2',
          roleHint: 'دشمة القيادة الميدانية؛ اضربها بالـ RPG [1] أو شحنة النسف [3]!',
          hp: 140,
          maxHp: 140,
          destroyed: false,
          bestWeapon: 'rpg',
          shootCooldown: 2.4 / enemyFireRateMultiplier,
          shootTimer: 2.0,
          sniperLaserProgress: 0,
          flameIntensity: 0,
          points: 550,
          smokeLevel: 0,
        });
      }

      // 5. Sniper / Observation Tower 1
      targets.push({
        id: idCounter++,
        x: width * 0.36,
        y: height * 0.28,
        width: 48,
        height: 78,
        category: 'tower',
        name: 'برج مراقبة وقناصة الحصن',
        roleHint: 'قناص يرصد تحركات الفصيلة بليزر أحمر؛ اقضه عليه بالرشاش [2] أو RPG [1]!',
        hp: 90,
        maxHp: 90,
        destroyed: false,
        bestWeapon: 'mg',
        shootCooldown: 3.5 / enemyFireRateMultiplier,
        shootTimer: 0.5,
        sniperLaserProgress: 0,
        flameIntensity: 0,
        points: 450,
        smokeLevel: 0,
      });

      // 6. Sniper Tower 2 (Hard mode)
      if (diff === 'hard') {
        targets.push({
          id: idCounter++,
          x: width * 0.68,
          y: height * 0.25,
          width: 48,
          height: 78,
          category: 'tower',
          name: 'برج القناصة الشرقي الإضافي',
          roleHint: 'قناص متقدم يشل الحركة؛ اقضِ عليه سريعاً قبل تصويبه!',
          hp: 95,
          maxHp: 95,
          destroyed: false,
          bestWeapon: 'mg',
          shootCooldown: 2.8 / enemyFireRateMultiplier,
          shootTimer: 1.5,
          sniperLaserProgress: 0,
          flameIntensity: 0,
          points: 500,
          smokeLevel: 0,
        });
      }

      // 7. Reinforced Blast Door of the Bar-Lev Main Bunker (Top ridge near flagpole)
      targets.push({
        id: idCounter++,
        x: width * 0.76,
        y: height * 0.36,
        width: 72,
        height: 60,
        category: 'blast_door',
        name: 'بوابة الحصن الفولاذية المركزية',
        roleHint: 'بوابة المخبأ القيادي الحصين؛ استخدم شحنة نسف الصاعقة [3] لتفجيرها!',
        hp: 160,
        maxHp: 160,
        destroyed: false,
        bestWeapon: 'satchel',
        shootCooldown: 3.2 / enemyFireRateMultiplier,
        shootTimer: 1.8,
        sniperLaserProgress: 0,
        flameIntensity: 0,
        points: 650,
        smokeLevel: 0,
      });

      // 8. Mobile Armored Patrol / Half-track (Hard mode)
      if (diff === 'hard') {
        targets.push({
          id: idCounter++,
          x: width * 0.42,
          y: height * 0.68,
          width: 66,
          height: 38,
          category: 'patrol',
          name: 'مدرعة دورية الحصن السريعة',
          roleHint: 'مدرعة معادية تحاول صد الاقتحام؛ دمرها بقاذف RPG [1] فوراً!',
          hp: 130,
          maxHp: 130,
          destroyed: false,
          bestWeapon: 'rpg',
          shootCooldown: 2.0 / enemyFireRateMultiplier,
          shootTimer: 0.8,
          sniperLaserProgress: 0,
          flameIntensity: 0,
          points: 600,
          smokeLevel: 0,
        });
      }

      return targets;
    },
    [enemyFireRateMultiplier]
  );

  // Initialize or reset game
  const resetMission = useCallback(() => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1000;
    const h = canvas ? canvas.height : 550;

    const initialTargets = generateTargets(difficulty, w, h);

    engineRef.current = {
      targets: initialTargets,
      projectiles: [],
      particles: [],
      floatingTexts: [],
      crosshair: { x: w / 2, y: h / 2 },
      isCrosshairActive: false,
      squadHp: maxSquadHp,
      maxSquadHp,
      score: 0,
      timeLeft: initialDuration,
      screenShake: 0,
      cooldowns: {
        rpg: 0,
        mg: 0,
        satchel: 0,
        foam: 0,
        smoke: 0,
      },
      smokeScreenTimer: 0,
      flagProgress: 0,
      flagPole: { x: w * 0.86, y: h * 0.28 },
      isFlagPhase: false,
      isComplete: false,
      nextTextId: 1,
      patrolOffset: 0,
      patrolDir: 1,
    };

    setSquadHp(maxSquadHp);
    setScore(0);
    setTimeLeft(initialDuration);
    setTargetsRemaining(initialTargets.length);
    setTotalTargetsCount(initialTargets.length);
    setIsFlagPhase(false);
    setShowFlagModal(false);
    setFlagProgress(0);
    setIsWon(false);
    setIsDefeated(false);
    setSmokeScreenActive(0);
    setActiveWeapon('rpg');
    setRadioMsg('بدأت عملية اقتحام حصن بارليف! اضرب تحصينات العدو وصمامات النابالم بدقة وحزم!');
    sound.playMissionStartRadioAlert();
  }, [difficulty, generateTargets, initialDuration, maxSquadHp]);

  // Setup on mount
  useEffect(() => {
    resetMission();
  }, [resetMission]);

  // Helper to add combat floating texts
  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    const engine = engineRef.current;
    engine.floatingTexts.push({
      id: engine.nextTextId++,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      vy: -1.2,
    });
  };

  // Helper to create particle explosions
  const createExplosion = (
    x: number,
    y: number,
    count = 25,
    colors = ['#f59e0b', '#ef4444', '#fbbf24', '#78716c', '#ffffff'],
    scale = 1.0
  ) => {
    const engine = engineRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 2) * scale;
      engine.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (Math.random() * 4 + 2) * scale,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 30 + 20,
        gravity: 0.08,
      });
    }
  };

  // Execute player firing active weapon towards (targetX, targetY)
  const fireActiveWeapon = useCallback(
    (targetX: number, targetY: number) => {
      if (isGamePaused()) return;
      const engine = engineRef.current;
      if (engine.isComplete || engine.isFlagPhase) return;

      const weapon = WEAPONS[activeWeapon];
      if (engine.cooldowns[activeWeapon] > 0) {
        sound.playRadioClick();
        return;
      }

      // Origin point: Forward Egyptian commando position on bottom left
      const originX = 140;
      const originY = 500;

      // Put weapon on cooldown
      engine.cooldowns[activeWeapon] = weapon.cooldown;
      setWeaponCooldowns((prev) => ({ ...prev, [activeWeapon]: weapon.cooldown }));

      if (activeWeapon === 'rpg') {
        sound.playMissileLaunch();
        const dx = targetX - originX;
        const dy = targetY - originY;
        const dist = Math.hypot(dx, dy);
        const speed = 14;

        engine.projectiles.push({
          x: originX,
          y: originY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          type: 'rpg',
          damage: 60,
          targetX,
          targetY,
          life: 0,
          maxLife: 60,
        });

        engine.screenShake = 4;
      } else if (activeWeapon === 'mg') {
        sound.playGunshot();
        // Fire rapid burst of 3 bullets with slight spread
        for (let i = -1; i <= 1; i++) {
          const spread = i * 6;
          const dx = targetX + spread - originX;
          const dy = targetY + spread - originY;
          const dist = Math.hypot(dx, dy);
          const speed = 22;

          engine.projectiles.push({
            x: originX,
            y: originY,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            type: 'mg',
            damage: 22,
            targetX: targetX + spread,
            targetY: targetY + spread,
            life: 0,
            maxLife: 45,
          });
        }
      } else if (activeWeapon === 'satchel') {
        sound.playCannon();
        const dx = targetX - originX;
        const dy = targetY - originY;
        const dist = Math.hypot(dx, dy);
        const speed = 11;

        engine.projectiles.push({
          x: originX,
          y: originY,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed - 2.5, // parabolic arc
          type: 'satchel',
          damage: 100,
          targetX,
          targetY,
          life: 0,
          maxLife: 55,
        });

        addFloatingText('شحنة متفجرة منطلقة!', originX + 40, originY - 30, '#f43f5e');
      } else if (activeWeapon === 'foam') {
        sound.playWaterCannon();
        // High pressure extinguishing foam stream (5 droplets)
        for (let i = 0; i < 7; i++) {
          const spreadAngle = (Math.random() - 0.5) * 0.15;
          const dx = targetX - originX;
          const dy = targetY - originY;
          const baseAngle = Math.atan2(dy, dx) + spreadAngle;
          const speed = Math.random() * 5 + 16;

          engine.projectiles.push({
            x: originX,
            y: originY,
            vx: Math.cos(baseAngle) * speed,
            vy: Math.sin(baseAngle) * speed,
            type: 'foam',
            damage: 35,
            targetX,
            targetY,
            life: 0,
            maxLife: 50,
          });
        }
      } else if (activeWeapon === 'smoke') {
        sound.playSplash();
        engine.smokeScreenTimer = 6.0;
        setSmokeScreenActive(6);
        addFloatingText('ستار دخاني كثيف! حماية الفصيلة مفعلة!', originX, originY - 50, '#c084fc');

        // Spawn dense smoke particles around player position
        for (let i = 0; i < 40; i++) {
          engine.particles.push({
            x: originX + (Math.random() - 0.5) * 120,
            y: originY + (Math.random() - 0.5) * 60,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 1.5 - 0.5,
            size: Math.random() * 30 + 20,
            color: '#a8a29e',
            alpha: 0.7,
            life: 0,
            maxLife: 90,
            isSmoke: true,
          });
        }

        // Restore small health bonus from cover
        engine.squadHp = Math.min(engine.maxSquadHp, engine.squadHp + 20);
        setSquadHp(engine.squadHp);
      }
    },
    [activeWeapon]
  );

  // Keyboard weapon selector & firing controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGamePaused()) return;
      if (e.key === '1') {
        sound.playRadioClick();
        setActiveWeapon('rpg');
      } else if (e.key === '2') {
        sound.playRadioClick();
        setActiveWeapon('mg');
      } else if (e.key === '3') {
        sound.playRadioClick();
        setActiveWeapon('satchel');
      } else if (e.key === '4') {
        sound.playRadioClick();
        setActiveWeapon('foam');
      } else if (e.key === '5') {
        sound.playRadioClick();
        setActiveWeapon('smoke');
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const engine = engineRef.current;
        if (engine.isFlagPhase) {
          handleHoistFlag();
        } else {
          fireActiveWeapon(engine.crosshair.x, engine.crosshair.y);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fireActiveWeapon]);

  // Complete Flag Raising from animated scene
  const handleFlagAnimationComplete = useCallback(() => {
    const engine = engineRef.current;
    engine.isComplete = true;
    engine.flagProgress = 100;
    setFlagProgress(100);
    setShowFlagModal(false);
    setIsWon(true);
    sound.playVictoryFanfare();
    setRadioMsg('الله أكبر! تم رفع علم جمهورية مصر العربية خفاقاً فوق خط بارليف!');

    // Big victory fireworks
    createExplosion(engine.flagPole.x, engine.flagPole.y - 80, 60, ['#ef4444', '#ffffff', '#000000', '#fbbf24'], 2.0);
  }, []);

  // Hoist the Egyptian Flag step
  const handleHoistFlag = useCallback(() => {
    if (isWon || !isFlagPhase) return;
    setShowFlagModal(true);
  }, [isFlagPhase, isWon]);

  // Canvas Mouse / Pointer handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engineRef.current.crosshair = { x, y };
    engineRef.current.isCrosshairActive = true;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engineRef.current.crosshair = { x, y };

    if (engineRef.current.isFlagPhase) {
      handleHoistFlag();
    } else {
      fireActiveWeapon(x, y);
    }
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isGamePaused()) {
        const engine = engineRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (canvas && ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // 1. Update Weapon Cooldowns
          let updatedCd = false;
          (Object.keys(engine.cooldowns) as CommandoWeaponType[]).forEach((k) => {
            if (engine.cooldowns[k] > 0) {
              engine.cooldowns[k] = Math.max(0, engine.cooldowns[k] - dt);
              updatedCd = true;
            }
          });
          if (updatedCd) {
            setWeaponCooldowns({ ...engine.cooldowns });
          }

          // 2. Update Smoke Screen Cover Timer
          if (engine.smokeScreenTimer > 0) {
            engine.smokeScreenTimer = Math.max(0, engine.smokeScreenTimer - dt);
            setSmokeScreenActive(Math.ceil(engine.smokeScreenTimer));
          }

          // 3. Update Mission Timer
          if (!engine.isComplete && !engine.isFlagPhase) {
            engine.timeLeft -= dt;
            if (engine.timeLeft <= 0) {
              engine.timeLeft = 0;
              engine.isComplete = true;
              setIsDefeated(true);
              setDefeatReason('timeout');
              sound.playDefeatSound();
              if (onDefeat) onDefeat('timeout');
            }
            setTimeLeft(Math.ceil(engine.timeLeft));
          }

          // 4. Update Screen Shake
          if (engine.screenShake > 0) {
            engine.screenShake = Math.max(0, engine.screenShake - dt * 10);
          }

          // 5. Update Mobile Patrol Position (Hard mode)
          engine.patrolOffset += engine.patrolDir * dt * 45;
          if (engine.patrolOffset > 70) engine.patrolDir = -1;
          if (engine.patrolOffset < -70) engine.patrolDir = 1;

          // 6. Update Targets & Enemy AI Firing
          let remaining = 0;
          engine.targets.forEach((t) => {
            if (t.destroyed) return;
            remaining++;

            // Mobile patrol moves horizontally
            if (t.category === 'patrol') {
              t.x = w * 0.42 + engine.patrolOffset;
            }

            // Snipers charge their aiming laser before taking a shot
            if (t.category === 'tower') {
              t.sniperLaserProgress = Math.min(1.0, t.sniperLaserProgress + dt * 0.35);
            }

            // Enemy Attack Timers (suppressed by smoke cover)
            if (t.category !== 'napalm_valve') {
              t.shootTimer += dt;
              const isCovered = engine.smokeScreenTimer > 0;
              const shootThreshold = isCovered ? t.shootCooldown * 2.5 : t.shootCooldown;

              if (t.shootTimer >= shootThreshold) {
                t.shootTimer = 0;
                t.sniperLaserProgress = 0;

                // Fire tracer projectile towards Egyptian commando line (x: 140, y: 500)
                const playerX = 140 + (Math.random() - 0.5) * 60;
                const playerY = 500 + (Math.random() - 0.5) * 30;
                const dx = playerX - t.x;
                const dy = playerY - t.y;
                const dist = Math.hypot(dx, dy);
                const bulletSpeed = 6.2; // Slower bullet travel speed for player reaction

                const enemyDmg = isCovered
                  ? 3
                  : t.category === 'bunker'
                  ? 9
                  : t.category === 'tower'
                  ? 12
                  : 8;

                engine.projectiles.push({
                  x: t.x,
                  y: t.y,
                  vx: (dx / dist) * bulletSpeed,
                  vy: (dy / dist) * bulletSpeed,
                  type: 'mg',
                  damage: enemyDmg,
                  targetX: playerX,
                  targetY: playerY,
                  life: 0,
                  maxLife: 70,
                  isEnemy: true,
                });

                sound.playGunshot();
              }
            } else {
              // Napalm valve spews flame particles
              if (Math.random() < 0.4) {
                engine.particles.push({
                  x: t.x + (Math.random() - 0.5) * 15,
                  y: t.y + (Math.random() - 0.5) * 10,
                  vx: (Math.random() - 0.5) * 2 - 1.5,
                  vy: Math.random() * 2 + 1,
                  size: Math.random() * 8 + 4,
                  color: Math.random() < 0.6 ? '#f97316' : '#ef4444',
                  alpha: 0.85,
                  life: 0,
                  maxLife: 35,
                });
              }
            }
          });

          setTargetsRemaining(remaining);

          // Check if all targets destroyed -> Transition to Grand Flag Hoisting Phase
          if (remaining === 0 && !engine.isFlagPhase && !engine.isComplete) {
            engine.isFlagPhase = true;
            setIsFlagPhase(true);
            setShowFlagModal(true);
            sound.playVictoryFanfare();
            setRadioMsg(
              'الله أكبر! سقطت جميع دشم وحصون خط بارليف! تم بدء مراسم رفع علم مصر خفاقاً!'
            );
          }

          // 7. Update Projectiles
          for (let i = engine.projectiles.length - 1; i >= 0; i--) {
            const p = engine.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life++;

            // Parabolic gravity on Satchel charges
            if (p.type === 'satchel') {
              p.vy += 0.12;
            }

            // Spawn missile smoke trail for RPG
            if (p.type === 'rpg' && Math.random() < 0.8) {
              engine.particles.push({
                x: p.x,
                y: p.y,
                vx: -p.vx * 0.1 + (Math.random() - 0.5) * 1,
                vy: -p.vy * 0.1 + (Math.random() - 0.5) * 1,
                size: Math.random() * 6 + 3,
                color: '#e7e5e4',
                alpha: 0.7,
                life: 0,
                maxLife: 25,
                isSmoke: true,
              });
            }

            let projectileRemoved = false;

            // Player projectiles collision with targets
            if (!p.isEnemy) {
              for (const target of engine.targets) {
                if (target.destroyed) continue;

                // Bounding box hit check
                const inX = p.x >= target.x - target.width / 2 && p.x <= target.x + target.width / 2;
                const inY = p.y >= target.y - target.height / 2 && p.y <= target.y + target.height / 2;

                if (inX && inY) {
                  // Calculate damage with weapon bonus
                  let effectiveDmg = p.damage;
                  let isBonus = false;

                  if (p.type === target.bestWeapon) {
                    effectiveDmg *= 1.8;
                    isBonus = true;
                  }

                  target.hp -= effectiveDmg;
                  sound.playHitSound();

                  // Visual impact sparks & text
                  createExplosion(p.x, p.y, 10, ['#f59e0b', '#fbbf24', '#ffffff'], 0.6);

                  if (isBonus) {
                    addFloatingText(`إصابة مباشرة فائقة! -${Math.round(effectiveDmg)}`, target.x, target.y - 20, '#fbbf24');
                  } else {
                    addFloatingText(`-${Math.round(effectiveDmg)}`, target.x, target.y - 15, '#e2e8f0');
                  }

                  // Target destroyed check
                  if (target.hp <= 0) {
                    target.destroyed = true;
                    target.hp = 0;
                    engine.score += target.points;
                    setScore(engine.score);
                    sound.playExplosion(1.2);
                    createExplosion(target.x, target.y, 45, ['#ef4444', '#f59e0b', '#fbbf24', '#78716c'], 1.5);
                    engine.screenShake = 6;
                    addFloatingText(`تم إسقاط ${target.name}! +${target.points}`, target.x, target.y - 35, '#22c55e');

                    if (target.category === 'napalm_valve') {
                      setRadioMsg('تم إخماد صمام النابالم وتأمين الساتر الترابي من النيران الحارقة!');
                    } else if (target.category === 'bunker') {
                      setRadioMsg('سقطت دشمة العدو الخرسانية تحت قصف بواسل الصاعقة!');
                    } else if (target.category === 'blast_door') {
                      setRadioMsg('تفجير بوابة الحصن الرئيسية واختراق التحصينات المركزية!');
                    }
                  }

                  engine.projectiles.splice(i, 1);
                  projectileRemoved = true;
                  break;
                }
              }
            } else {
              // Enemy projectile hitting Egyptian commando positions (near x: 140, y: 500)
              const commandoBaseX = 140;
              const commandoBaseY = 500;
              const distToSquad = Math.hypot(p.x - commandoBaseX, p.y - commandoBaseY);

              if (distToSquad < 60) {
                engine.squadHp = Math.max(0, engine.squadHp - p.damage);
                setSquadHp(engine.squadHp);
                sound.playHitSound();
                engine.screenShake = 3;
                createExplosion(p.x, p.y, 6, ['#ef4444', '#f87171'], 0.4);
                addFloatingText(`-${Math.round(p.damage)} HP`, commandoBaseX, commandoBaseY - 30, '#ef4444');

                if (engine.squadHp <= 0) {
                  engine.isComplete = true;
                  setIsDefeated(true);
                  setDefeatReason('squad_wiped');
                  sound.playDefeatSound();
                  if (onDefeat) onDefeat('squad_wiped');
                }

                engine.projectiles.splice(i, 1);
                projectileRemoved = true;
              }
            }

            // Clean up off-screen / expired projectiles
            if (!projectileRemoved && (p.life >= p.maxLife || p.x < 0 || p.x > w || p.y < 0 || p.y > h)) {
              if (p.type === 'satchel') {
                // Explode upon landing
                sound.playExplosion(1.0);
                createExplosion(p.x, p.y, 20, ['#ef4444', '#f97316', '#fbbf24'], 1.2);
              }
              engine.projectiles.splice(i, 1);
            }
          }

          // 8. Update Particles
          for (let i = engine.particles.length - 1; i >= 0; i--) {
            const pt = engine.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            if (pt.gravity) pt.vy += pt.gravity;
            pt.life++;
            pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

            if (pt.isSmoke) {
              pt.size += 0.25;
            }

            if (pt.life >= pt.maxLife) {
              engine.particles.splice(i, 1);
            }
          }

          // 9. Update Floating Texts
          for (let i = engine.floatingTexts.length - 1; i >= 0; i--) {
            const ft = engine.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;
            if (ft.alpha <= 0) {
              engine.floatingTexts.splice(i, 1);
            }
          }

          // ================= RENDER PASS =================
          ctx.save();

          // Apply screen shake
          if (engine.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * engine.screenShake * 2;
            const shakeY = (Math.random() - 0.5) * engine.screenShake * 2;
            ctx.translate(shakeX, shakeY);
          }

          // A. Dramatic Sinai Desert & Sunset Sky
          const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
          skyGrad.addColorStop(0, '#1c1917');
          skyGrad.addColorStop(0.3, '#451a03');
          skyGrad.addColorStop(0.6, '#7c2d12');
          skyGrad.addColorStop(0.85, '#b45309');
          skyGrad.addColorStop(1, '#d97706');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, w, h);

          // Distant mountains of Sinai silhouette
          ctx.fillStyle = '#292524';
          ctx.beginPath();
          ctx.moveTo(0, h * 0.45);
          ctx.lineTo(w * 0.15, h * 0.38);
          ctx.lineTo(w * 0.3, h * 0.42);
          ctx.lineTo(w * 0.55, h * 0.32);
          ctx.lineTo(w * 0.75, h * 0.36);
          ctx.lineTo(w, h * 0.3);
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fill();

          // B. The Huge Sand Rampart of the Bar-Lev Line (الساتر الترابي بارليف)
          const rampartGrad = ctx.createLinearGradient(0, h * 0.25, 0, h);
          rampartGrad.addColorStop(0, '#78350f');
          rampartGrad.addColorStop(0.35, '#92400e');
          rampartGrad.addColorStop(0.7, '#b45309');
          rampartGrad.addColorStop(1, '#d97706');
          ctx.fillStyle = rampartGrad;

          ctx.beginPath();
          ctx.moveTo(w * 0.1, h); // Start at Suez canal water edge
          ctx.quadraticCurveTo(w * 0.25, h * 0.55, w * 0.45, h * 0.38);
          ctx.lineTo(w * 0.85, h * 0.24); // Crest of Bar-Lev rampart
          ctx.lineTo(w, h * 0.24);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();

          // Sand texture contours & defense tiers
          ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
          ctx.lineWidth = 2;
          for (let yLine = 0.35; yLine < 0.9; yLine += 0.12) {
            ctx.beginPath();
            ctx.moveTo(w * 0.15, h * yLine);
            ctx.quadraticCurveTo(w * 0.4, h * (yLine - 0.05), w * 0.8, h * (yLine - 0.08));
            ctx.stroke();
          }

          // Barbed wire obstacles along the slope
          ctx.strokeStyle = '#44403c';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let wx = w * 0.22; wx < w * 0.75; wx += 25) {
            const wy = h * 0.52 - (wx - w * 0.22) * 0.35;
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx + 15, wy - 8);
            ctx.lineTo(wx + 22, wy + 2);
          }
          ctx.stroke();

          // C. Suez Canal Water Surface (Left edge / bottom)
          const canalGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
          canalGrad.addColorStop(0, '#0c4a6e');
          canalGrad.addColorStop(0.5, '#075985');
          canalGrad.addColorStop(1, '#0284c7');
          ctx.fillStyle = canalGrad;
          ctx.fillRect(0, h * 0.72, w * 0.22, h * 0.28);

          // Water wave ripples
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.25)';
          ctx.lineWidth = 1.5;
          for (let yWater = h * 0.75; yWater < h; yWater += 15) {
            ctx.beginPath();
            ctx.moveTo(0, yWater);
            ctx.lineTo(w * 0.2, yWater + Math.sin(now * 0.003 + yWater) * 3);
            ctx.stroke();
          }

          // D. Forward Egyptian Commando Post / Sandbag Redoubt (Bottom-Left)
          ctx.fillStyle = '#78350f';
          ctx.fillRect(40, h - 80, 180, 80);

          // Sandbags stack
          ctx.fillStyle = '#a16207';
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 5; c++) {
              ctx.beginPath();
              ctx.roundRect(45 + c * 32, h - 75 + r * 18, 30, 14, 5);
              ctx.fill();
              ctx.strokeStyle = '#713f12';
              ctx.stroke();
            }
          }

          // Egyptian Commando Soldier Silhouettes firing from cover
          ctx.fillStyle = '#1c1917';
          // Soldier 1 (Rocket gunner)
          ctx.beginPath();
          ctx.arc(90, h - 88, 10, 0, Math.PI * 2); // helmet
          ctx.fill();
          ctx.fillRect(82, h - 78, 16, 25); // torso
          // RPG tube
          ctx.strokeStyle = '#44403c';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(85, h - 82);
          ctx.lineTo(135, h - 98);
          ctx.stroke();

          // Soldier 2 (Machine gunner)
          ctx.beginPath();
          ctx.arc(150, h - 82, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(142, h - 72, 16, 20);

          // Commando unit identification badge on trench
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ فصيلة الصاعقة المقتحمة', 125, h - 15);

          // E. Draw Assault Targets (Fortresses, Valves, Towers, Blast Doors, Patrols)
          engine.targets.forEach((t) => {
            ctx.save();
            ctx.translate(t.x, t.y);

            if (t.destroyed) {
              // Destroyed wreckage: blackened rubble, smoking ruins
              ctx.fillStyle = '#1c1917';
              ctx.beginPath();
              ctx.ellipse(0, 0, t.width * 0.5, t.height * 0.3, 0, 0, Math.PI * 2);
              ctx.fill();

              // Smoke puffs from ruins
              if (Math.random() < 0.2) {
                engine.particles.push({
                  x: t.x + (Math.random() - 0.5) * 20,
                  y: t.y - 10,
                  vx: (Math.random() - 0.5) * 0.5,
                  vy: -Math.random() * 1 - 0.5,
                  size: Math.random() * 6 + 3,
                  color: '#57534e',
                  alpha: 0.6,
                  life: 0,
                  maxLife: 30,
                  isSmoke: true,
                });
              }

              // Small surrender or destroyed marker
              ctx.fillStyle = '#78716c';
              ctx.font = 'bold 10px Cairo, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('❌ تم التدمير', 0, 4);
              ctx.restore();
              return;
            }

            // Target Active Rendering by Category:
            if (t.category === 'bunker') {
              // Heavy concrete pillbox
              ctx.fillStyle = '#44403c';
              ctx.beginPath();
              ctx.roundRect(-t.width / 2, -t.height / 2, t.width, t.height, 8);
              ctx.fill();
              ctx.strokeStyle = '#292524';
              ctx.lineWidth = 3;
              ctx.stroke();

              // Armored gun embrasure / firing slit
              ctx.fillStyle = '#0c0a09';
              ctx.fillRect(-t.width * 0.35, -t.height * 0.1, t.width * 0.7, t.height * 0.25);

              // Gun barrel protruding
              ctx.fillStyle = '#1c1917';
              ctx.fillRect(-t.width * 0.45, -t.height * 0.05, t.width * 0.2, 5);

              // Camouflage nets on top
              ctx.fillStyle = '#78350f';
              ctx.beginPath();
              ctx.arc(0, -t.height / 2, t.width * 0.45, Math.PI, 0);
              ctx.fill();
            } else if (t.category === 'napalm_valve') {
              // Heavy industrial Napalm pipe and flame valve
              ctx.fillStyle = '#7f1d1d';
              ctx.beginPath();
              ctx.roundRect(-t.width / 2, -t.height / 2, t.width, t.height, 6);
              ctx.fill();
              ctx.strokeStyle = '#dc2626';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Valve wheel
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, 12, 0, Math.PI * 2);
              ctx.stroke();

              // Flame hazard icon
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.moveTo(0, -8);
              ctx.lineTo(6, 4);
              ctx.lineTo(-6, 4);
              ctx.closePath();
              ctx.fill();
            } else if (t.category === 'tower') {
              // Metal lattice sniper tower
              ctx.strokeStyle = '#57534e';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              // Legs
              ctx.moveTo(-t.width * 0.4, t.height / 2);
              ctx.lineTo(-t.width * 0.25, -t.height * 0.3);
              ctx.moveTo(t.width * 0.4, t.height / 2);
              ctx.lineTo(t.width * 0.25, -t.height * 0.3);
              // Cross bracing
              ctx.moveTo(-t.width * 0.4, t.height / 2);
              ctx.lineTo(t.width * 0.25, 0);
              ctx.moveTo(t.width * 0.4, t.height / 2);
              ctx.lineTo(-t.width * 0.25, 0);
              ctx.stroke();

              // Observation cabin on top
              ctx.fillStyle = '#292524';
              ctx.fillRect(-t.width * 0.4, -t.height / 2, t.width * 0.8, t.height * 0.3);
              ctx.strokeStyle = '#44403c';
              ctx.strokeRect(-t.width * 0.4, -t.height / 2, t.width * 0.8, t.height * 0.3);

              // Sniper laser aiming beam (sweeps towards player position)
              if (t.sniperLaserProgress > 0.4) {
                ctx.save();
                ctx.strokeStyle = `rgba(239, 68, 68, ${t.sniperLaserProgress * 0.8})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(0, -t.height * 0.35);
                ctx.lineTo(140 - t.x, 500 - t.y);
                ctx.stroke();
                ctx.restore();
              }
            } else if (t.category === 'blast_door') {
              // Reinforced command bunker vault door
              ctx.fillStyle = '#3f3f46';
              ctx.beginPath();
              ctx.roundRect(-t.width / 2, -t.height / 2, t.width, t.height, 8);
              ctx.fill();
              ctx.strokeStyle = '#18181b';
              ctx.lineWidth = 3;
              ctx.stroke();

              // Hazard stripes
              ctx.fillStyle = '#eab308';
              ctx.fillRect(-t.width / 2 + 4, -t.height / 2 + 4, t.width - 8, 8);
              ctx.fillStyle = '#18181b';
              ctx.fillRect(-t.width / 2 + 4, t.height / 2 - 12, t.width - 8, 8);

              // Steel reinforced wheel
              ctx.strokeStyle = '#71717a';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(0, 2, 14, 0, Math.PI * 2);
              ctx.stroke();
            } else if (t.category === 'patrol') {
              // Half-track scout vehicle
              ctx.fillStyle = '#52525b';
              ctx.beginPath();
              ctx.roundRect(-t.width / 2, -t.height / 2, t.width, t.height, 6);
              ctx.fill();
              // Tracks
              ctx.fillStyle = '#18181b';
              ctx.fillRect(-t.width / 2, t.height / 2 - 8, t.width, 8);
              // Machine gun mount
              ctx.fillStyle = '#27272a';
              ctx.fillRect(-t.width * 0.2, -t.height * 0.7, 10, 10);
            }

            // Health Bar above target
            const barW = Math.max(t.width, 48);
            const barH = 5;
            const barY = -t.height / 2 - 12;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-barW / 2, barY, barW, barH);

            const hpRatio = Math.max(0, t.hp / t.maxHp);
            ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barW / 2, barY, barW, barH);

            // Recommended weapon badge icon indicator
            const recWeapon = WEAPONS[t.bestWeapon];
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.beginPath();
            ctx.roundRect(-barW / 2 - 16, barY - 4, 14, 14, 3);
            ctx.fill();
            ctx.strokeStyle = '#f59e0b';
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 9px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(recWeapon.shortcut, -barW / 2 - 9, barY + 7);

            ctx.restore();
          });

          // F. The Grand Egyptian Flagpole atop Bar-Lev Summit
          const poleX = engine.flagPole.x;
          const poleY = engine.flagPole.y;
          const poleHeight = 110;

          // Metal mast
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(poleX, poleY + poleHeight);
          ctx.lineTo(poleX, poleY);
          ctx.stroke();

          // Gold finial sphere at mast peak
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(poleX, poleY - 4, 6, 0, Math.PI * 2);
          ctx.fill();

          // Flag hoisting animation: flag climbs from bottom (poleY + poleHeight) to top (poleY)
          const currentFlagY = poleY + poleHeight - (engine.flagProgress / 100) * (poleHeight - 15);
          const flagWidth = 55;
          const flagHeight = 34;

          // Egyptian Flag (Red, White with Gold Eagle, Black)
          const wave = Math.sin(now * 0.006) * 4;

          ctx.save();
          ctx.translate(poleX, currentFlagY);

          // Top red stripe
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(flagWidth * 0.5, wave, flagWidth, 0);
          ctx.lineTo(flagWidth, flagHeight / 3);
          ctx.quadraticCurveTo(flagWidth * 0.5, flagHeight / 3 + wave, 0, flagHeight / 3);
          ctx.closePath();
          ctx.fill();

          // Middle white stripe
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(0, flagHeight / 3);
          ctx.quadraticCurveTo(flagWidth * 0.5, flagHeight / 3 + wave, flagWidth, flagHeight / 3);
          ctx.lineTo(flagWidth, (flagHeight * 2) / 3);
          ctx.quadraticCurveTo(flagWidth * 0.5, (flagHeight * 2) / 3 + wave, 0, (flagHeight * 2) / 3);
          ctx.closePath();
          ctx.fill();

          // Golden Eagle in the center
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(flagWidth * 0.5, flagHeight * 0.5 + wave * 0.5, 4, 0, Math.PI * 2);
          ctx.fill();

          // Bottom black stripe
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(0, (flagHeight * 2) / 3);
          ctx.quadraticCurveTo(flagWidth * 0.5, (flagHeight * 2) / 3 + wave, flagWidth, (flagHeight * 2) / 3);
          ctx.lineTo(flagWidth, flagHeight);
          ctx.quadraticCurveTo(flagWidth * 0.5, flagHeight + wave, 0, flagHeight);
          ctx.closePath();
          ctx.fill();

          ctx.restore();

          // Soldiers standing on the rampart celebrating in Victory Phase
          if (engine.isFlagPhase) {
            ctx.fillStyle = '#1c1917';
            // Flag bearer soldier
            ctx.beginPath();
            ctx.arc(poleX - 16, poleY + poleHeight - 16, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(poleX - 22, poleY + poleHeight - 8, 12, 22);

            // Arm raised in victory
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(poleX - 16, poleY + poleHeight - 2);
            ctx.lineTo(poleX - 28, poleY + poleHeight - 18);
            ctx.stroke();

            // Second soldier giving salute
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.arc(poleX + 18, poleY + poleHeight - 16, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(poleX + 12, poleY + poleHeight - 8, 12, 22);
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(poleX + 22, poleY + poleHeight - 4);
            ctx.lineTo(poleX + 26, poleY + poleHeight - 16);
            ctx.lineTo(poleX + 20, poleY + poleHeight - 18);
            ctx.stroke();

            // Egyptian Flag Hoisting Pulse Aura
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(poleX, poleY + 20, 45 + Math.sin(now * 0.008) * 8, 0, Math.PI * 2);
            ctx.stroke();
          }

          // G. Draw Projectiles
          engine.projectiles.forEach((p) => {
            ctx.save();
            if (p.type === 'rpg') {
              // Rocket with glowing warhead
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
              ctx.fill();

              // Flame jet exhaust
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.arc(p.x - p.vx * 0.4, p.y - p.vy * 0.4, 3, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'mg') {
              // Tracer line
              ctx.strokeStyle = p.isEnemy ? '#ef4444' : '#fbbf24';
              ctx.lineWidth = p.isEnemy ? 2.5 : 3;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
              ctx.stroke();
            } else if (p.type === 'satchel') {
              // Satchel charge with blinking LED
              ctx.fillStyle = '#991b1b';
              ctx.beginPath();
              ctx.roundRect(p.x - 6, p.y - 4, 12, 8, 2);
              ctx.fill();

              // Blinking LED fuse
              ctx.fillStyle = Math.floor(now / 150) % 2 === 0 ? '#ef4444' : '#f59e0b';
              ctx.beginPath();
              ctx.arc(p.x, p.y - 2, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'foam') {
              // Expanding foam droplet
              ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          });

          // H. Draw Particles
          engine.particles.forEach((pt) => {
            ctx.save();
            ctx.globalAlpha = pt.alpha;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          // I. Draw Floating Combat Texts
          engine.floatingTexts.forEach((ft) => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 13px Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
          });

          // J. Draw Custom Military Crosshair
          if (engine.isCrosshairActive && !engine.isFlagPhase) {
            const ch = engine.crosshair;
            ctx.save();
            ctx.translate(ch.x, ch.y);

            const activeWp = WEAPONS[activeWeapon];
            const cd = engine.cooldowns[activeWeapon];
            const isReady = cd <= 0;

            // Outer reticle circle
            ctx.strokeStyle = isReady ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.6)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.stroke();

            // Crosshair ticks
            ctx.strokeStyle = isReady ? '#fbbf24' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -22);
            ctx.lineTo(0, -8);
            ctx.moveTo(0, 8);
            ctx.lineTo(0, 22);
            ctx.moveTo(-22, 0);
            ctx.lineTo(-8, 0);
            ctx.moveTo(8, 0);
            ctx.lineTo(22, 0);
            ctx.stroke();

            // Center pip
            ctx.fillStyle = isReady ? '#f59e0b' : '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Reload cooldown circle indicator if reloading
            if (!isReady) {
              const reloadRatio = cd / activeWp.cooldown;
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + (1 - reloadRatio) * Math.PI * 2);
              ctx.stroke();
            }

            ctx.restore();
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeWeapon, isFlagPhase, onDefeat]);

  return (
    <div className="relative w-full h-full min-h-0 h-[100dvh] max-h-[100dvh] flex flex-col bg-stone-950 text-stone-100 overflow-hidden font-cairo select-none">
      {/* Top Operations Tactical Bar (Visible on desktop / normal views, hidden in mobile landscape) */}
      <header className="desktop-only-bar relative z-20 flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-stone-950/95 border-b border-stone-800 shadow-xl backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="الانسحاب التكتيكي"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">القائمة</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-black text-xs sm:text-sm tracking-wide">
                المرحلة الخامسة: اقتحام حصون خط بارليف ورفع علم مصر
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  difficulty === 'easy'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : difficulty === 'hard'
                    ? 'bg-red-950 text-red-400 border-red-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}
              >
                {diffConfig.badge}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden md:block">
              الصاعقة والمشاة: دمر دشم خط بارليف وصمامات النابالم وارفع راية النصر خفاقة!
            </p>
          </div>
        </div>

        {/* Squad Health & Mission Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
          {/* Squad Health Bar */}
          <div className="flex items-center gap-2 bg-stone-900/90 px-3 py-1.5 rounded-xl border border-stone-800 shadow-inner">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[10px] text-stone-400 gap-2 font-cairo">
                <span>صحة الفصيلة</span>
                <span className="font-mono font-bold text-stone-200">
                  {squadHp}/{maxSquadHp}
                </span>
              </div>
              <div className="w-24 sm:w-32 h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800 mt-0.5">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    squadHp / maxSquadHp > 0.5
                      ? 'bg-emerald-500'
                      : squadHp / maxSquadHp > 0.25
                      ? 'bg-amber-500'
                      : 'bg-red-500 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, (squadHp / maxSquadHp) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Targets Remaining Counter */}
          <div className="flex items-center gap-2 bg-stone-900/90 px-3 py-1.5 rounded-xl border border-stone-800 text-xs font-cairo font-bold">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-stone-300">
              الدشم المتبقية:{' '}
              <span className="text-amber-400 font-mono text-sm">{targetsRemaining}</span> / {totalTargetsCount}
            </span>
          </div>

          {/* Mission Digital Countdown Timer */}
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={initialDuration}
          />

          {/* Score counter */}
          <div className="hidden lg:flex items-center gap-1.5 bg-stone-900/90 px-3 py-1.5 rounded-xl border border-stone-800 text-xs font-mono font-bold text-amber-400">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{score} نقطة</span>
          </div>

          {/* Tactical Intel Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowIntelDrawer(!showIntelDrawer)}
            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              showIntelDrawer
                ? 'bg-amber-500 text-stone-950 border-amber-400'
                : 'bg-stone-900 text-stone-300 hover:text-white border-stone-800'
            }`}
            title="دليل الأسلحة والأهداف"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Replay / Reset Mission */}
          <button
            type="button"
            onClick={resetMission}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-400 border border-stone-800 transition-all cursor-pointer active:scale-95"
            title="إعادة بدء الاقتحام"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Radio Transmission Banner (Hidden on landscape phone to save vertical height) */}
      <div className="desktop-only-bar hidden md:flex relative z-10 bg-amber-950/40 border-b border-amber-500/20 px-4 py-1.5 items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-2 truncate">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
          <span className="font-bold text-amber-400 shrink-0">إشارة اللاسلكي الميدانية:</span>
          <span className="truncate text-stone-200">{radioMsg}</span>
        </div>
        {smokeScreenActive > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500 text-purple-300 text-[11px] font-bold shrink-0 animate-pulse">
            <Wind className="w-3.5 h-3.5" />
            <span>ستار الدخان: {smokeScreenActive} ث</span>
          </div>
        )}
      </div>

      {/* Main Interactive Battlefield Canvas Container */}
      <main className="relative z-10 flex-1 w-full h-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={1000}
          height={550}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className="w-full h-full object-fill touch-none cursor-crosshair block select-none combat-canvas"
        />

        {/* Floating Minimal In-Combat HUD for Mobile Landscape ("اللعبة وبس") */}
        <div className="mobile-landscape-hud hidden pointer-events-none absolute top-2 left-2 right-2 z-30 flex items-center justify-between gap-2">
          {/* Right section: Exit + Health + Targets */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExit}
              className="px-2 py-1 rounded-lg bg-stone-950/85 hover:bg-stone-900 border border-stone-800 text-stone-300 active:scale-95 text-[11px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md cursor-pointer touch-manipulation"
              title="انسحاب"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>

            {/* Squad Health Meter */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-950/85 border border-stone-800 backdrop-blur-md text-[11px] font-bold shadow-lg">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <div className="w-12 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    squadHp / maxSquadHp > 0.5 ? 'bg-emerald-500' : squadHp / maxSquadHp > 0.25 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, (squadHp / maxSquadHp) * 100)}%` }}
                />
              </div>
              <span className="text-stone-200 font-mono text-[10px]">{squadHp}</span>
            </div>

            {/* Targets count */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-950/85 border border-stone-800 backdrop-blur-md text-[11px] font-bold text-amber-400 shadow-lg">
              <Target className="w-3.5 h-3.5" />
              <span>{targetsRemaining} دشم</span>
            </div>
          </div>

          {/* Center: Timer & Status */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-950/85 border border-stone-800 backdrop-blur-md text-[11px] font-bold text-stone-200 shadow-lg font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}</span>
            </div>

            {smokeScreenActive > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/90 border border-purple-500 text-purple-300 text-[10px] font-bold shadow-lg animate-pulse">
                <Wind className="w-3 h-3" />
                <span>دخان {smokeScreenActive}ث</span>
              </div>
            )}
          </div>

          {/* Left: Replay & Info */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowIntelDrawer(!showIntelDrawer)}
              className="p-1.5 rounded-lg bg-stone-950/85 hover:bg-stone-900 border border-stone-800 text-stone-300 active:scale-95 text-[11px] shadow-lg backdrop-blur-md cursor-pointer touch-manipulation"
              title="دليل الأسلحة"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={resetMission}
              className="p-1.5 rounded-lg bg-stone-950/85 hover:bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 active:scale-95 text-[11px] shadow-lg backdrop-blur-md cursor-pointer touch-manipulation"
              title="إعادة"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Flag Hoisting Phase Banner & Action Prompt */}
        {isFlagPhase && !isWon && (
          <div className="absolute inset-x-0 bottom-1 sm:bottom-4 flex flex-col items-center justify-center z-30 pointer-events-auto px-2 sm:px-4">
            <div className="bg-stone-950/95 border-2 border-amber-500/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-[0_0_35px_rgba(245,158,11,0.6)] backdrop-blur-md max-w-sm sm:max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-xs sm:text-base mb-1">
                <Flag className="w-4 h-4 text-red-500 fill-red-500 animate-bounce" />
                <span>سقطت حصون بارليف! ارفع علم مصر خفاقاً!</span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 mb-2">
                انقر على الزر أدناه لمشاهدة مراسم رفع العلم المصري على قمة الساتر!
              </p>

              {/* Flag Hoist Progress Bar */}
              <div className="w-full h-2.5 sm:h-3.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800 mb-2 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500 transition-all duration-300"
                  style={{ width: `${flagProgress}%` }}
                />
              </div>

              {/* Big Interactive Hoisting Button */}
              <button
                type="button"
                onClick={() => setShowFlagModal(true)}
                className="w-full py-2 sm:py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.7)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 animate-pulse touch-manipulation"
              >
                <Flag className="w-4 h-4 fill-red-600" />
                <span>مشهد مراسم رفع العلم ({flagProgress}%) 🇪🇬</span>
              </button>
            </div>
          </div>
        )}

        {/* Tactical Intel Drawer (Collapsible Info on weapons vs targets) */}
        {showIntelDrawer && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 w-72 sm:w-80 max-h-[85vh] overflow-y-auto bg-stone-950/95 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md text-xs font-cairo animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2 sm:mb-3">
              <span className="font-black text-amber-400 flex items-center gap-1.5 text-xs">
                <Target className="w-4 h-4" />
                دليل الأسلحة والأهداف التكتيكية
              </span>
              <button
                type="button"
                onClick={() => setShowIntelDrawer(false)}
                className="text-stone-400 hover:text-white cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-[11px]">
              <div className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <Bomb className="w-3.5 h-3.5" />
                  <span>آر بي جي [1]:</span>
                </div>
                <span className="text-stone-300">سلاح حاسم ضد دشم الرشاشات والمدافع الخرسانية.</span>
              </div>

              <div className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>الرشاش الآلي [2]:</span>
                </div>
                <span className="text-stone-300">طلقات سريعة لإسكات أبراج القناصة قبل تصويبهم.</span>
              </div>

              <div className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-bold text-rose-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>شحنة النسف [3]:</span>
                </div>
                <span className="text-stone-300">عبوة متفجرة لتفجير بوابات الحصن الفولاذية المركزية.</span>
              </div>

              <div className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-bold text-sky-400 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>مضخة الرغوة [4]:</span>
                </div>
                <span className="text-stone-300">إخماد فوري لصمامات وأنابيب سائل النابالم الحارق.</span>
              </div>

              <div className="p-1.5 sm:p-2 rounded-lg bg-stone-900 border border-stone-800">
                <div className="font-bold text-purple-400 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" />
                  <span>ستار الدخان [5]:</span>
                </div>
                <span className="text-stone-300">حجب نيران العدو لمدة 6 ثوانٍ واستعادة درع الفصيلة.</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tactical Arsenal Control Bar (Optimized for Landscape Touch) */}
      <footer className="relative z-20 px-2 sm:px-3 py-1 sm:py-2 bg-stone-950/95 border-t border-stone-800 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 shadow-2xl">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-0.5 max-w-full">
          <span className="text-stone-400 text-xs hidden lg:inline font-bold">ترسانة الصاعقة:</span>

          {(Object.values(WEAPONS) as WeaponConfig[]).map((wp) => {
            const Icon = wp.icon;
            const isActive = activeWeapon === wp.id;
            const cd = weaponCooldowns[wp.id] || 0;
            const isCooling = cd > 0;

            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => {
                  sound.playRadioClick();
                  setActiveWeapon(wp.id);
                }}
                className={`relative px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold font-cairo border transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 touch-manipulation active:scale-95 ${
                  isActive ? wp.activeBorderColor : `${wp.borderColor} ${wp.bgColor} hover:bg-stone-800 text-stone-300`
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${wp.color}`} />
                <span className="hidden sm:inline">{wp.name}</span>
                <span className="sm:hidden font-mono text-[11px]">{wp.shortcut}</span>
                <span className="hidden md:inline text-[10px] opacity-70 font-mono">[{wp.shortcut}]</span>

                {/* Cooldown Overlay */}
                {isCooling && (
                  <div className="absolute inset-0 bg-stone-950/80 rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] sm:text-[10px] font-mono text-red-400 font-bold backdrop-blur-xs">
                    {cd.toFixed(1)}s
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </footer>

      {/* Egyptian Flag Raising Animation Scene */}
      <FlagRaisingAnimationModal
        isOpen={showFlagModal && isFlagPhase && !isWon}
        initialProgress={flagProgress}
        onComplete={handleFlagAnimationComplete}
        onClose={() => setShowFlagModal(false)}
      />

      {/* Grand Victory Modal */}
      <VictoryModal
        isOpen={isWon}
        missionId="MISSION_FORTRESS"
        missionTitle="المرحلة 5: سقوط الحصون ورفع العلم المصري"
        congratulatoryMessage="مبروك النصر العظيم! الله أكبر.. سقطت حصون خط بارليف ورُفع علم جمهورية مصر العربية خفاقاً في سماء سيناء!"
        score={score}
        timeLeft={timeLeft}
        onNextMission={() => onComplete(score)}
        onReturnToBase={onExit}
        onReplay={resetMission}
      />

      {/* Defeat Modal */}
      {isDefeated && (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-red-950/90 border-2 border-red-500 flex items-center justify-center text-3xl mb-4 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-cairo text-red-400 mb-2">
            {defeatReason === 'timeout'
              ? 'نفد الوقت المحدد لاقتحام حصون بارليف!'
              : 'استشهد بواسل الصاعقة تحت نيران دشم العدو!'}
          </h3>

          <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
            {defeatReason === 'timeout'
              ? `عليك تدمير دشم خط بارليف وإخماد صمامات النابالم ورفع العلم قبل نهاية الوقت (${initialDuration} ثانية).`
              : 'استخدم قاذف RPG [1] لضرب دشم المدافع والرشاش الآلي [2] لإسكات القناصة، وفعّل ستار الدخان [5] لاستعادة حماية الفصيلة!'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetMission}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95 text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة الاقتحام
            </button>

            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للقائمة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
