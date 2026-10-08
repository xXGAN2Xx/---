import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Shield,
  Crosshair,
  Flame,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Target,
  Radio,
  Award,
  Sparkles,
  Wind,
  Video,
} from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';
import { isGamePaused } from '../game/pause';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface TankBattleMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
  onOpenTutorialVideo?: () => void;
}

// 7 Distinct authentic historical combat vehicle types from October 1973
type EnemyTankType =
  | 'patton_m60'      // دبابة باتون M60A1 (مغاح 6) - قتال رئيسية
  | 'centurion_shot'  // دبابة سينتوريون شوت كال - ثقيلة تدريع عالي
  | 'super_sherman'   // دبابة سوبر شيرمان M-51 - مدفع فرنسي 105 ملم
  | 'amx13_light'     // دبابة إيه إم إكس 13 - خفيفة وسريعة جداً
  | 'zelda_m113'      // ناقلة استطلاع زيلدا M113 - سريعة
  | 'breaching_tank'  // دبابة كاسحة هندسية - دروع فائقة ومجرفة
  | 'boss_yaguri';    // دبابة القيادة للواء 190 مدرع - عساف ياجوري

interface EnemyTank {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: EnemyTankType;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
  destroyed: boolean;
  fireCooldown: number;
  name: string;
  arabicRole: string;
  points: number;
  turretAngle: number;
  burnTimer: number;
  treadOffset: number;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
  damage: number;
  isMissile?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export const TankBattleMission: React.FC<TankBattleMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
  onOpenTutorialVideo,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const missionDuration = diffConfig.missionDuration; // 150s (easy), 120s (normal), 90s (hard)

  // Target count of tanks by difficulty: Easy = 5, Normal = 10, Hard = 15
  const targetTanksCount = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [tanksDestroyed, setTanksDestroyed] = useState(0);
  const [baseIntegrity, setBaseIntegrity] = useState(100);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(missionDuration);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'base_destroyed' | 'timeout'>('base_destroyed');
  const [activeWeapon, setActiveWeapon] = useState<'cannon' | 'sagger'>('cannon');
  const [saggerCooldown, setSaggerCooldown] = useState(0);
  const [artilleryCooldown, setArtilleryCooldown] = useState(0);
  const [smokeScreenTimer, setSmokeScreenTimer] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState(
    'وجّه منظار المدفعية واضغط بالماوس أو اللمس لإطلاق قذائف T-62 وصواريخ مالوتكا وسحق دبابات العدو!'
  );

  // High-performance Gameplay Engine Ref
  const stateRef = useRef({
    tanks: [] as EnemyTank[],
    shells: [] as Shell[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    crosshair: { x: 550, y: 320 },
    isPointerInside: false,
    hoveredTankId: null as number | null,
    reticleShock: 0,
    playerRecoil: 0,
    baseIntegrity: 100,
    tanksDestroyed: 0,
    tanksSpawned: 0,
    score: 0,
    timeLeft: missionDuration,
    screenShake: 0,
    cannonCooldownTimer: 0,
    saggerCooldownTimer: 0,
    artilleryCooldownTimer: 0,
    smokeTimer: 0,
    nextSpawnTimer: 0.5,
    bossSpawned: false,
    isComplete: false,
  });

  // Start Background Music
  useEffect(() => {
    sound.playBackgroundTheme('tankBattle');
    return () => {
      sound.stopBackgroundTheme();
    };
  }, []);

  // Keyboard Hotkeys (1: Cannon, 2: Sagger, 3: Artillery, 4: Smoke Screen, Space: Fire)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWon || isDefeated || isGamePaused()) return;

      if (e.key === '1' || e.key === 'q' || e.key === 'Q') {
        sound.playRadioClick();
        setActiveWeapon('cannon');
      } else if (e.key === '2' || e.key === 'w' || e.key === 'W') {
        sound.playRadioClick();
        setActiveWeapon('sagger');
      } else if (e.key === '3' || e.key === 'e' || e.key === 'E') {
        handleCallArtillery();
      } else if (e.key === '4' || e.key === 'r' || e.key === 'R') {
        handleDeploySmokeScreen();
      } else if (e.code === 'Space') {
        e.preventDefault();
        const s = stateRef.current;
        handleFireWeapon(s.crosshair.x, s.crosshair.y);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWon, isDefeated]);

  // Reset Game
  const resetGame = useCallback(() => {
    sound.playRadioTransmission();
    setTimeLeft(missionDuration);
    setTanksDestroyed(0);
    setBaseIntegrity(100);
    setScore(0);
    setIsWon(false);
    setIsDefeated(false);
    setActiveWeapon('cannon');
    setSaggerCooldown(0);
    setArtilleryCooldown(0);
    setSmokeScreenTimer(0);
    setFeedbackMsg(
      difficulty === 'easy'
        ? `المهمة: دمّر ${targetTanksCount} دبابات معادية قبل اختراق الساتر الترابي! صواريخ مالوتكا تلحق أضراراً خارقة.`
        : difficulty === 'normal'
        ? `المهمة: دمّر ${targetTanksCount} دبابات من أرتال اللواء 190 مدرع ودبابة القيادة لعساف ياجوري!`
        : `المهمة: معركة شرسة ضد ${targetTanksCount} دبابة معادية سريعة ومصفحة! ركّز على نقاط الضعف بدقة!`
    );

    const s = stateRef.current;
    s.tanks = [];
    s.shells = [];
    s.particles = [];
    s.floatingTexts = [];
    s.baseIntegrity = 100;
    s.tanksDestroyed = 0;
    s.tanksSpawned = 0;
    s.score = 0;
    s.timeLeft = missionDuration;
    s.screenShake = 0;
    s.playerRecoil = 0;
    s.reticleShock = 0;
    s.cannonCooldownTimer = 0;
    s.saggerCooldownTimer = 0;
    s.artilleryCooldownTimer = 0;
    s.smokeTimer = 0;
    s.nextSpawnTimer = 3.5; // Start with calm 3.5s preparation buffer
    s.bossSpawned = false;
    s.isComplete = false;
  }, [difficulty, missionDuration, targetTanksCount]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Mission Digital Timer Countdown
  useEffect(() => {
    if (isWon || isDefeated) return;

    const timer = setInterval(() => {
      if (isGamePaused()) return;

      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;

        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setIsDefeated(true);
          setDefeatReason('timeout');
          sound.playDefeatSound();
          sound.playExplosion(1.0);
          onDefeat?.('timeout');
          return 0;
        }

        if (next === 30 || next === 15 || next === 10) {
          sound.playRadarWarningAlarm();
        }

        return next;
      });

      setSaggerCooldown((prev) => Math.max(0, prev - 1));
      setArtilleryCooldown((prev) => Math.max(0, prev - 1));
      setSmokeScreenTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isWon, isDefeated, onDefeat]);

  // Spawn Varied Enemy Tanks
  const spawnEnemyTank = (isBoss = false) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1000;
    const h = canvas ? canvas.height : 520;

    // Calm and steady tank speeds: slower advance for strategic aiming
    const speedScale = difficulty === 'easy' ? 0.55 : difficulty === 'hard' ? 0.95 : 0.75;

    let type: EnemyTankType = 'patton_m60';
    let hp = 75;
    let width = 56;
    let height = 26;
    let speed = (36 + Math.random() * 12) * speedScale;
    let name = 'دبابة باتون M60A1 (مغاح 6)';
    let arabicRole = 'دبابة قتال رئيسية';
    let points = 250;

    if (isBoss) {
      type = 'boss_yaguri';
      hp = 300;
      width = 76;
      height = 36;
      speed = 26 * speedScale;
      name = 'دبابة قيادة العقيد عساف ياجوري';
      arabicRole = 'دبابة قيادة اللواء 190 مدرع';
      points = 1800;
    } else {
      const rand = Math.random();
      if (rand < 0.2) {
        // Fast AMX-13
        type = 'amx13_light';
        hp = 42;
        width = 44;
        height = 20;
        speed = (62 + Math.random() * 18) * speedScale;
        name = 'دبابة AMX-13 خفيفة وسريعة';
        arabicRole = 'اقتحام سريع';
        points = 180;
      } else if (rand < 0.4) {
        // Zelda APC
        type = 'zelda_m113';
        hp = 38;
        width = 40;
        height = 21;
        speed = (54 + Math.random() * 16) * speedScale;
        name = 'مدرعة استطلاع زيلدا M113';
        arabicRole = 'استطلاع مدرع';
        points = 150;
      } else if (rand < 0.65) {
        // Patton M60A1
        type = 'patton_m60';
        hp = 80;
        width = 56;
        height = 26;
        speed = (36 + Math.random() * 12) * speedScale;
        name = 'دبابة باتون M60A1';
        arabicRole = 'دروع متقدمة';
        points = 260;
      } else if (rand < 0.82) {
        // Super Sherman M-51
        type = 'super_sherman';
        hp = 65;
        width = 52;
        height = 25;
        speed = (32 + Math.random() * 10) * speedScale;
        name = 'دبابة سوبر شيرمان M-51';
        arabicRole = 'مدفع ثقيل 105 ملم';
        points = 290;
      } else if (rand < 0.93) {
        // Heavy Centurion Sho't Kal
        type = 'centurion_shot';
        hp = 125;
        width = 62;
        height = 29;
        speed = (24 + Math.random() * 10) * speedScale;
        name = 'دبابة سينتوريون (شوت كال)';
        arabicRole = 'دروع فولاذية ثقيلة';
        points = 380;
      } else {
        // Breaching engineering tank with heavy armor
        type = 'breaching_tank';
        hp = 150;
        width = 64;
        height = 30;
        speed = (20 + Math.random() * 8) * speedScale;
        name = 'دبابة كاسحة السواتر الهندسية';
        arabicRole = 'كاسحة ألغام مصفحة';
        points = 420;
      }
    }

    const yMin = h * 0.48;
    const yMax = h * 0.88;
    const spawnY = yMin + Math.random() * (yMax - yMin);

    s.tanks.push({
      id: Date.now() + Math.random(),
      x: w + 50,
      y: spawnY,
      speed,
      type,
      hp,
      maxHp: hp,
      width,
      height,
      destroyed: false,
      fireCooldown: (difficulty === 'easy' ? 6.5 : difficulty === 'hard' ? 4.5 : 5.5) + Math.random() * 2.5,
      name,
      arabicRole,
      points,
      turretAngle: Math.PI,
      burnTimer: 0,
      treadOffset: 0,
    });

    s.tanksSpawned++;
  };

  // Explosions & Particles
  const spawnExplosion = (x: number, y: number, color = '#f59e0b', count = 18, isBig = false) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isBig ? 130 : 75) + 10;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (isBig ? 6 : 3.5) + 1.5,
        color,
        life: 0,
        maxLife: isBig ? 36 : 24,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color = '#fbbf24') => {
    stateRef.current.floatingTexts.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 45,
    });
  };

  // Fire Player Weapons
  const handleFireWeapon = (targetX: number, targetY: number) => {
    if (isWon || isDefeated || isGamePaused()) return;
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const playerTankX = 90;
    const playerTankY = canvas.height * 0.74;

    // Reticle blast & barrel recoil animation
    s.reticleShock = 1.0;
    s.playerRecoil = 12;

    if (activeWeapon === 'sagger') {
      // Sagger Wire-Guided Missile
      if (s.saggerCooldownTimer > 0) {
        sound.playRadioClick();
        return;
      }

      s.saggerCooldownTimer = 2.5;
      setSaggerCooldown(3);

      sound.playMissileLaunch();
      s.screenShake = 1.8;

      const dx = targetX - playerTankX;
      const dy = targetY - playerTankY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 420;

      s.shells.push({
        x: playerTankX + 30,
        y: playerTankY - 14,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        isPlayer: true,
        damage: 140, // High penetration anti-tank damage
        isMissile: true,
      });

      addFloatingText(playerTankX + 40, playerTankY - 35, '🚀 انطلاق صاروخ مالوتكا!', '#34d399');
    } else {
      // 115mm Tank Cannon
      if (s.cannonCooldownTimer > 0) return;
      s.cannonCooldownTimer = 0.35;

      sound.playCannon();
      s.screenShake = 2.4;

      const dx = targetX - playerTankX;
      const dy = targetY - playerTankY;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 600;

      s.shells.push({
        x: playerTankX + 48,
        y: playerTankY - 5,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        isPlayer: true,
        damage: 65,
      });

      // Muzzle blast flame
      spawnExplosion(playerTankX + 54, playerTankY - 5, '#fef08a', 9);
    }
  };

  // Call Artillery Barrage
  const handleCallArtillery = () => {
    const s = stateRef.current;
    if (s.artilleryCooldownTimer > 0 || isWon || isDefeated || isGamePaused()) return;

    s.artilleryCooldownTimer = 11.0;
    setArtilleryCooldown(11);

    sound.playExplosion(1.5);
    sound.playCannon();
    s.screenShake = 4.0;

    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1000;
    const h = canvas ? canvas.height : 520;

    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        if (s.isComplete || isGamePaused()) return;
        const barrageX = w * 0.38 + Math.random() * (w * 0.58);
        const barrageY = h * 0.48 + Math.random() * (h * 0.38);

        spawnExplosion(barrageX, barrageY, '#f97316', 30, true);
        sound.playExplosion(0.9);

        s.tanks.forEach((tank) => {
          if (!tank.destroyed && Math.hypot(tank.x - barrageX, tank.y - barrageY) < 95) {
            tank.hp -= 95;
            if (tank.hp <= 0) {
              tank.destroyed = true;
              s.tanksDestroyed++;
              s.score += tank.points;
              setTanksDestroyed(s.tanksDestroyed);
              setScore(s.score);
              addFloatingText(tank.x, tank.y - 20, `+${tank.points} مدمرة!`, '#4ade80');
            }
          }
        });
      }, i * 220);
    }

    addFloatingText(w * 0.5, h * 0.4, '💥 قصف مدفعي مركز من مدفعية الجيش الثاني!', '#f59e0b');
    setFeedbackMsg('مدفعية الهاوتزر المصرية تدك أرتال الدبابات المعادية!');
  };

  // Deploy Tactical Smoke Screen (blinds enemy tanks)
  const handleDeploySmokeScreen = () => {
    const s = stateRef.current;
    if (s.smokeTimer > 0 || isWon || isDefeated || isGamePaused()) return;

    sound.playRadioTransmission();
    s.smokeTimer = 7.0;
    setSmokeScreenTimer(7);

    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1000;
    const h = canvas ? canvas.height : 520;

    // Spawn massive cloud of white smoke
    for (let i = 0; i < 40; i++) {
      s.particles.push({
        x: 180 + Math.random() * 250,
        y: h * 0.45 + Math.random() * (h * 0.45),
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 25 - 5,
        size: Math.random() * 16 + 10,
        color: 'rgba(214, 211, 209, 0.55)',
        life: 0,
        maxLife: 80,
      });
    }

    addFloatingText(220, h * 0.6, '💨 ستارة دخان تكتيكية تحجب الرؤية عن العدو!', '#e2e8f0');
    setFeedbackMsg('ستارة الدخان الكثيفة تحجب رؤية دبابات العدو وتشتت نيرانها!');
  };

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (!isGamePaused() && !stateRef.current.isComplete) {
        updateGame(dt);
      }

      renderGame(ctx, canvas.width, canvas.height);
      animId = requestAnimationFrame(loop);
    };

    const updateGame = (dt: number) => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Update cooldowns
      if (s.cannonCooldownTimer > 0) s.cannonCooldownTimer -= dt;
      if (s.saggerCooldownTimer > 0) s.saggerCooldownTimer -= dt;
      if (s.artilleryCooldownTimer > 0) s.artilleryCooldownTimer -= dt;
      if (s.smokeTimer > 0) s.smokeTimer -= dt;

      // Screen shake and recoil decay
      if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 4);
      if (s.playerRecoil > 0) s.playerRecoil = Math.max(0, s.playerRecoil - dt * 35);
      if (s.reticleShock > 0) s.reticleShock = Math.max(0, s.reticleShock - dt * 3);

      // Spawning tanks strictly up to targetTanksCount
      s.nextSpawnTimer -= dt;
      if (s.nextSpawnTimer <= 0) {
        if (s.tanksSpawned < targetTanksCount) {
          // If this is the final tank of the stage, spawn Assaf Yaguri's command tank!
          if (s.tanksSpawned === targetTanksCount - 1 && !s.bossSpawned) {
            s.bossSpawned = true;
            spawnEnemyTank(true);
            sound.playRadarWarningAlarm();
            sound.playRadioTransmission();
            addFloatingText(w * 0.8, h * 0.5, '⚠️ رصد دبابة قيادة عساف ياجوري!', '#ef4444');
            setFeedbackMsg('تحذير: تقدم دبابة قيادة اللواء 190 مدرع الإسرائيلي بقيادة العقيد عساف ياجوري!');
          } else {
            spawnEnemyTank(false);
          }
          // Spacing between tanks - exactly around 5 seconds as requested (5.5s easy, 5.0s normal, 4.5s hard)
          const baseInterval = difficulty === 'easy' ? 5.5 : difficulty === 'hard' ? 4.5 : 5.0;
          s.nextSpawnTimer = baseInterval + (Math.random() - 0.5) * 0.8;
        }
      }

      // Target Hover Detection for Reticle Snap
      let foundHover: number | null = null;
      for (const tank of s.tanks) {
        if (!tank.destroyed) {
          if (
            s.crosshair.x >= tank.x - tank.width / 2 - 12 &&
            s.crosshair.x <= tank.x + tank.width / 2 + 12 &&
            s.crosshair.y >= tank.y - tank.height / 2 - 12 &&
            s.crosshair.y <= tank.y + tank.height / 2 + 12
          ) {
            foundHover = tank.id;
            break;
          }
        }
      }
      if (foundHover && foundHover !== s.hoveredTankId) {
        sound.playTargetLock();
      }
      s.hoveredTankId = foundHover;

      // Update Tanks
      for (let i = s.tanks.length - 1; i >= 0; i--) {
        const tank = s.tanks[i];

        if (tank.destroyed) {
          tank.burnTimer += dt;
          if (Math.random() < 0.28) {
            s.particles.push({
              x: tank.x + (Math.random() - 0.5) * 20,
              y: tank.y - 12,
              vx: (Math.random() - 0.5) * 15,
              vy: -Math.random() * 45 - 15,
              size: Math.random() * 4.5 + 2,
              color: 'rgba(100, 95, 90, 0.45)',
              life: 0,
              maxLife: 32,
            });
          }
          continue;
        }

        tank.x -= tank.speed * dt;
        tank.treadOffset += tank.speed * dt * 0.15;

        // Sand Dust kicked up behind tracks
        if (Math.random() < 0.35) {
          s.particles.push({
            x: tank.x + tank.width / 2 + 5,
            y: tank.y + tank.height / 2 - 2,
            vx: Math.random() * 15 + 5,
            vy: -Math.random() * 10 - 2,
            size: Math.random() * 3 + 1.5,
            color: 'rgba(180, 83, 9, 0.35)',
            life: 0,
            maxLife: 20,
          });
        }

        // Firing at Egyptian Berm (reduced if smoke screen is active, slower fire rate for strategic play)
        tank.fireCooldown -= dt;
        if (tank.fireCooldown <= 0 && tank.x < w * 0.84) {
          const baseCooldown = difficulty === 'easy' ? 9.5 : difficulty === 'hard' ? 6.5 : 8.0;
          tank.fireCooldown = (s.smokeTimer > 0 ? baseCooldown * 1.6 : baseCooldown) + Math.random() * 2.5;

          const targetBermX = 140;
          const targetBermY = tank.y + (Math.random() - 0.5) * (s.smokeTimer > 0 ? 120 : 40);
          const dx = targetBermX - tank.x;
          const dy = targetBermY - tank.y;
          const dist = Math.hypot(dx, dy) || 1;
          const shellSpeed = 260; // Slower shell flight speed (was 390) for fair reaction time

          s.shells.push({
            x: tank.x - 22,
            y: tank.y - 3,
            vx: (dx / dist) * shellSpeed,
            vy: (dy / dist) * shellSpeed,
            isPlayer: false,
            damage: tank.type === 'boss_yaguri' ? 24 : tank.type === 'centurion_shot' ? 18 : 11,
          });

          spawnExplosion(tank.x - 26, tank.y - 3, '#fbbf24', 6);
        }

        // Defense Berm Breach Check
        if (tank.x <= 180) {
          tank.destroyed = true;
          s.baseIntegrity = Math.max(0, s.baseIntegrity - (tank.type === 'boss_yaguri' ? 40 : 20));
          setBaseIntegrity(s.baseIntegrity);
          sound.playExplosion(1.2);
          s.screenShake = 3.5;
          addFloatingText(tank.x, tank.y, '⚠️ اختراق النسق الدفاعي!', '#ef4444');

          if (s.baseIntegrity <= 0) {
            s.isComplete = true;
            setIsDefeated(true);
            setDefeatReason('base_destroyed');
            sound.playDefeatSound();
            onDefeat?.('base_destroyed');
            return;
          }
        }
      }

      // Update Shells & Hits
      for (let i = s.shells.length - 1; i >= 0; i--) {
        const shell = s.shells[i];
        shell.x += shell.vx * dt;
        shell.y += shell.vy * dt;

        if (shell.isPlayer) {
          let hit = false;
          for (const tank of s.tanks) {
            if (tank.destroyed) continue;

            const hitDist = Math.hypot(tank.x - shell.x, tank.y - shell.y);
            if (hitDist < tank.width / 2 + 12) {
              hit = true;
              tank.hp -= shell.damage;
              spawnExplosion(shell.x, shell.y, shell.isMissile ? '#ef4444' : '#f59e0b', shell.isMissile ? 26 : 14);
              sound.playExplosion(shell.isMissile ? 1.1 : 0.8);

              if (tank.hp <= 0) {
                tank.destroyed = true;
                s.tanksDestroyed++;
                s.score += tank.points;
                setTanksDestroyed(s.tanksDestroyed);
                setScore(s.score);

                addFloatingText(
                  tank.x,
                  tank.y - 25,
                  `+${tank.points} ${tank.type === 'boss_yaguri' ? 'أسر عساف ياجوري! 🏆' : 'دبابة مدمرة! 💥'}`,
                  tank.type === 'boss_yaguri' ? '#f59e0b' : '#4ade80'
                );

                if (tank.type === 'boss_yaguri') {
                  sound.playVictoryFanfare();
                  setFeedbackMsg('تم تدمير دبابة القيادة الإسرائيلية واستسلام العقيد عساف ياجوري!');
                }

                // Victory check strictly upon reaching targetTanksCount (5, 10, or 15)
                if (s.tanksDestroyed >= targetTanksCount) {
                  s.isComplete = true;
                  sound.playVictoryFanfare();
                  sound.playCannon();

                  const timeBonus = s.timeLeft * 40;
                  const basePoints = difficulty === 'easy' ? 4500 : difficulty === 'normal' ? 6000 : 7500;
                  const finalScore = s.score + basePoints + timeBonus;
                  setScore(finalScore);
                  setIsWon(true);
                  setFeedbackMsg('نصر تاريخي عظيم! تم سحق دبابات اللواء 190 مدرع المعادي بالكامل وتأمين سيناء!');
                }
              }
              break;
            }
          }

          if (hit || shell.x > w + 50 || shell.y < 0 || shell.y > h) {
            s.shells.splice(i, 1);
          }
        } else {
          if (shell.x <= 180) {
            s.baseIntegrity = Math.max(0, s.baseIntegrity - shell.damage);
            setBaseIntegrity(s.baseIntegrity);
            sound.playExplosion(0.7);
            s.screenShake = 1.8;
            spawnExplosion(shell.x, shell.y, '#ef4444', 12);
            s.shells.splice(i, 1);

            if (s.baseIntegrity <= 0) {
              s.isComplete = true;
              setIsDefeated(true);
              setDefeatReason('base_destroyed');
              sound.playDefeatSound();
              onDefeat?.('base_destroyed');
              return;
            }
          } else if (shell.x < -20 || shell.y > h || shell.y < 0) {
            s.shells.splice(i, 1);
          }
        }
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life++;
        if (p.life >= p.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // Update Floating Texts
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y -= 30 * dt;
        ft.life++;
        if (ft.life >= ft.maxLife) {
          s.floatingTexts.splice(i, 1);
        }
      }
    };

    const renderGame = (context: CanvasRenderingContext2D, w: number, h: number) => {
      const s = stateRef.current;

      context.save();
      if (s.screenShake > 0) {
        const dx = (Math.random() - 0.5) * s.screenShake * 5;
        const dy = (Math.random() - 0.5) * s.screenShake * 5;
        context.translate(dx, dy);
      }

      // Sky Gradient
      const skyGrad = context.createLinearGradient(0, 0, 0, h * 0.48);
      skyGrad.addColorStop(0, '#240e02');
      skyGrad.addColorStop(0.5, '#451a03');
      skyGrad.addColorStop(0.85, '#78350f');
      skyGrad.addColorStop(1, '#92400e');
      context.fillStyle = skyGrad;
      context.fillRect(0, 0, w, h * 0.48);

      // Sun
      context.fillStyle = '#fef08a';
      context.beginPath();
      context.arc(w * 0.85, 45, 24, 0, Math.PI * 2);
      context.fill();

      // Distant Dunes
      context.fillStyle = '#78350f';
      context.beginPath();
      context.moveTo(0, h * 0.42);
      for (let x = 0; x <= w; x += 35) {
        context.lineTo(x, h * 0.42 + Math.sin(x * 0.009) * 14);
      }
      context.lineTo(w, h);
      context.lineTo(0, h);
      context.closePath();
      context.fill();

      // Foreground Combat Desert Sands
      const sandGrad = context.createLinearGradient(0, h * 0.45, 0, h);
      sandGrad.addColorStop(0, '#652805');
      sandGrad.addColorStop(0.5, '#542004');
      sandGrad.addColorStop(1, '#3a1703');
      context.fillStyle = sandGrad;
      context.fillRect(0, h * 0.45, w, h * 0.55);

      // Tank tracks in the sand
      context.strokeStyle = 'rgba(40, 15, 3, 0.45)';
      context.lineWidth = 2.5;
      for (let y = h * 0.52; y <= h * 0.86; y += 45) {
        context.beginPath();
        context.moveTo(180, y);
        context.lineTo(w, y);
        context.stroke();
      }

      // Egyptian Sand Berm Defense Line (Left Side: x <= 180)
      context.fillStyle = '#78350f';
      context.beginPath();
      context.moveTo(180, h * 0.45);
      context.lineTo(190, h);
      context.lineTo(0, h);
      context.lineTo(0, h * 0.45);
      context.closePath();
      context.fill();

      // Berm Sandbags and Barbed Wire
      context.strokeStyle = '#d97706';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(180, h * 0.45);
      context.lineTo(190, h);
      context.stroke();

      // Egyptian T-62 Tank with Smooth Turret Rotation & Recoil
      const ptX = 85;
      const ptY = h * 0.74;

      // Tank Hull
      context.fillStyle = '#1c1917';
      context.beginPath();
      context.roundRect(ptX - 35, ptY + 6, 75, 18, 4);
      context.fill();

      context.fillStyle = '#262626';
      context.fillRect(ptX - 25, ptY - 2, 55, 10);

      // Turret
      context.fillStyle = '#1c1917';
      context.beginPath();
      context.ellipse(ptX + 6, ptY - 4, 20, 10, 0, 0, Math.PI * 2);
      context.fill();

      // Cannon Barrel aiming towards crosshair with recoil
      const cannonAngle = Math.atan2(s.crosshair.y - ptY, s.crosshair.x - ptX);
      context.save();
      context.translate(ptX + 12, ptY - 4);
      context.rotate(cannonAngle);
      context.fillStyle = '#262626';
      context.fillRect(-s.playerRecoil, -3, 46, 6);
      context.restore();

      // Egyptian Flag on antenna
      context.strokeStyle = '#e7e5e4';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(ptX - 15, ptY - 4);
      context.lineTo(ptX - 15, ptY - 32);
      context.stroke();

      context.fillStyle = '#dc2626';
      context.fillRect(ptX - 15, ptY - 32, 14, 4);
      context.fillStyle = '#ffffff';
      context.fillRect(ptX - 15, ptY - 28, 14, 4);
      context.fillStyle = '#09090b';
      context.fillRect(ptX - 15, ptY - 24, 14, 4);

      // Render Enemy Tanks with authentic historical vehicle silhouettes
      s.tanks.forEach((tank) => {
        context.save();
        context.translate(tank.x, tank.y);

        const isHovered = s.hoveredTankId === tank.id;

        if (tank.destroyed) {
          // Burning wreck
          context.fillStyle = '#09090b';
          context.fillRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height);
          context.fillStyle = '#ef4444';
          context.beginPath();
          context.arc(0, -6, 7 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
          context.fill();
        } else {
          // Shadow
          context.fillStyle = 'rgba(0,0,0,0.3)';
          context.beginPath();
          context.ellipse(0, tank.height / 2 + 2, tank.width / 2 + 6, 6, 0, 0, Math.PI * 2);
          context.fill();

          // Tracks
          context.fillStyle = '#1c1917';
          context.beginPath();
          context.roundRect(-tank.width / 2, -tank.height / 2, tank.width, tank.height, 4);
          context.fill();

          // Vehicle Body based on Type
          if (tank.type === 'centurion_shot') {
            context.fillStyle = '#78350f';
            context.fillRect(-tank.width / 2 + 3, -tank.height / 2 + 2, tank.width - 6, tank.height - 4);
            context.fillStyle = '#451a03';
            context.fillRect(-tank.width / 2 + 2, -tank.height / 2 + 1, tank.width - 4, 4);
            context.fillRect(-tank.width / 2 + 2, tank.height / 2 - 5, tank.width - 4, 4);
            context.fillStyle = '#292524';
            context.fillRect(-10, -8, 22, 16);
            context.fillStyle = '#1c1917';
            context.fillRect(-tank.width / 2 - 18, -3, 22, 6);
          } else if (tank.type === 'super_sherman') {
            context.fillStyle = '#854d0e';
            context.fillRect(-tank.width / 2 + 4, -tank.height / 2 + 3, tank.width - 8, tank.height - 6);
            context.fillStyle = '#1c1917';
            context.beginPath();
            context.arc(2, 0, 11, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#18181b';
            context.fillRect(-tank.width / 2 - 20, -2.5, 24, 5);
            context.fillRect(-tank.width / 2 - 23, -4, 4, 8);
          } else if (tank.type === 'amx13_light') {
            context.fillStyle = '#a16207';
            context.fillRect(-tank.width / 2 + 3, -tank.height / 2 + 2, tank.width - 6, tank.height - 4);
            context.fillStyle = '#1c1917';
            context.fillRect(-6, -6, 16, 12);
            context.fillStyle = '#18181b';
            context.fillRect(-tank.width / 2 - 14, -2, 18, 4);
          } else if (tank.type === 'zelda_m113') {
            context.fillStyle = '#92400e';
            context.fillRect(-tank.width / 2 + 3, -tank.height / 2 + 2, tank.width - 6, tank.height - 4);
            context.fillStyle = '#1c1917';
            context.fillRect(-4, -5, 8, 10);
            context.fillRect(-12, -2, 10, 3);
          } else if (tank.type === 'breaching_tank') {
            context.fillStyle = '#713f12';
            context.fillRect(-tank.width / 2 + 4, -tank.height / 2 + 3, tank.width - 8, tank.height - 6);
            context.fillStyle = '#292524';
            context.fillRect(-tank.width / 2 - 6, -tank.height / 2 - 2, 8, tank.height + 4);
            context.fillStyle = '#1c1917';
            context.beginPath();
            context.arc(0, 0, 10, 0, Math.PI * 2);
            context.fill();
            context.fillRect(-tank.width / 2 - 10, -2.5, 14, 5);
          } else if (tank.type === 'boss_yaguri') {
            context.fillStyle = '#5f2905';
            context.fillRect(-tank.width / 2 + 4, -tank.height / 2 + 3, tank.width - 8, tank.height - 6);
            context.fillStyle = '#1c1917';
            context.beginPath();
            context.arc(2, 0, 14, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#18181b';
            context.fillRect(-tank.width / 2 - 20, -3.5, 24, 7);
            context.strokeStyle = '#e7e5e4';
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(10, -8);
            context.lineTo(10, -26);
            context.moveTo(-5, -8);
            context.lineTo(-5, -24);
            context.stroke();
            context.fillStyle = '#ef4444';
            context.fillRect(10, -26, 12, 6);
            context.fillStyle = '#ffffff';
            context.font = 'bold 9px sans-serif';
            context.fillText('عساف', -14, -tank.height - 8);
          } else {
            context.fillStyle = '#854d0e';
            context.fillRect(-tank.width / 2 + 4, -tank.height / 2 + 3, tank.width - 8, tank.height - 6);
            context.fillStyle = '#1c1917';
            context.beginPath();
            context.arc(0, 0, tank.height / 2.2, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#18181b';
            context.fillRect(-tank.width / 2 - 14, -2.5, 18, 5);
          }

          // Health bar
          const barW = tank.width;
          const barH = 4;
          const hpPercent = Math.max(0, tank.hp / tank.maxHp);
          context.fillStyle = 'rgba(0,0,0,0.6)';
          context.fillRect(-barW / 2, -tank.height / 2 - 8, barW, barH);
          context.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
          context.fillRect(-barW / 2, -tank.height / 2 - 8, barW * hpPercent, barH);

          // Target Locked HUD Brackets if cursor is hovering over tank
          if (isHovered) {
            context.strokeStyle = '#ef4444';
            context.lineWidth = 2;
            const bPad = 8;
            context.beginPath();
            context.moveTo(-tank.width / 2 - bPad, -tank.height / 2 - bPad + 6);
            context.lineTo(-tank.width / 2 - bPad, -tank.height / 2 - bPad);
            context.lineTo(-tank.width / 2 - bPad + 8, -tank.height / 2 - bPad);

            context.moveTo(tank.width / 2 + bPad, -tank.height / 2 - bPad + 6);
            context.lineTo(tank.width / 2 + bPad, -tank.height / 2 - bPad);
            context.lineTo(tank.width / 2 + bPad - 8, -tank.height / 2 - bPad);

            context.moveTo(-tank.width / 2 - bPad, tank.height / 2 + bPad - 6);
            context.lineTo(-tank.width / 2 - bPad, tank.height / 2 + bPad);
            context.lineTo(-tank.width / 2 - bPad + 8, tank.height / 2 + bPad);

            context.moveTo(tank.width / 2 + bPad, tank.height / 2 + bPad - 6);
            context.lineTo(tank.width / 2 + bPad, tank.height / 2 + bPad);
            context.lineTo(tank.width / 2 + bPad - 8, tank.height / 2 + bPad);
            context.stroke();

            // Target Name & Role Tag
            context.fillStyle = 'rgba(12, 10, 9, 0.85)';
            context.fillRect(-tank.width / 2 - 12, tank.height / 2 + 14, tank.width + 24, 16);
            context.font = 'bold 9px "Cairo", sans-serif';
            context.fillStyle = '#ef4444';
            context.textAlign = 'center';
            context.fillText(`🎯 ${tank.name}`, 0, tank.height / 2 + 25);
            context.textAlign = 'start';
          }
        }

        context.restore();
      });

      // Render Shells
      s.shells.forEach((shell) => {
        if (shell.isPlayer) {
          if (shell.isMissile) {
            context.fillStyle = '#f59e0b';
            context.beginPath();
            context.arc(shell.x, shell.y, 4, 0, Math.PI * 2);
            context.fill();

            context.strokeStyle = 'rgba(251, 191, 36, 0.45)';
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(shell.x - 22, shell.y);
            context.lineTo(shell.x, shell.y);
            context.stroke();
          } else {
            context.fillStyle = '#fde047';
            context.beginPath();
            context.arc(shell.x, shell.y, 3.5, 0, Math.PI * 2);
            context.fill();
          }
        } else {
          context.fillStyle = '#ef4444';
          context.beginPath();
          context.arc(shell.x, shell.y, 3, 0, Math.PI * 2);
          context.fill();
        }
      });

      // Render Particles
      s.particles.forEach((p) => {
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        context.fillStyle = p.color;
        context.globalAlpha = alpha;
        context.beginPath();
        context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1.0;
      });

      // Render Floating Texts
      s.floatingTexts.forEach((ft) => {
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
        context.font = 'bold 12px "Cairo", sans-serif';
        context.fillStyle = ft.color;
        context.globalAlpha = alpha;
        context.fillText(ft.text, ft.x, ft.y);
        context.globalAlpha = 1.0;
      });

      // ==========================================
      // ADVANCED MILITARY TANK GUNNER HUD CROSSHAIR
      // ==========================================
      const isTargetLocked = s.hoveredTankId !== null;
      const crosshairColor = isTargetLocked ? '#ef4444' : '#f59e0b';
      const rSize = 18 + s.reticleShock * 6;

      // Laser guide line from tank barrel to reticle
      context.strokeStyle = isTargetLocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.15)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(ptX + 40, ptY - 4);
      context.lineTo(s.crosshair.x, s.crosshair.y);
      context.stroke();

      // Outer Range Ring
      context.strokeStyle = crosshairColor;
      context.lineWidth = 1.8;
      context.beginPath();
      context.arc(s.crosshair.x, s.crosshair.y, rSize, 0, Math.PI * 2);
      context.stroke();

      // Crosshairs tick marks (Stadia range marks)
      const gap = 6;
      const length = 16;
      context.beginPath();
      context.moveTo(s.crosshair.x - rSize - length, s.crosshair.y);
      context.lineTo(s.crosshair.x - gap, s.crosshair.y);
      context.moveTo(s.crosshair.x + gap, s.crosshair.y);
      context.lineTo(s.crosshair.x + rSize + length, s.crosshair.y);
      context.moveTo(s.crosshair.x, s.crosshair.y - rSize - length);
      context.lineTo(s.crosshair.x, s.crosshair.y - gap);
      context.moveTo(s.crosshair.x, s.crosshair.y + gap);
      context.lineTo(s.crosshair.x, s.crosshair.y + rSize + length);
      context.stroke();

      // Center Aiming Chevron / Dot
      context.fillStyle = crosshairColor;
      context.beginPath();
      context.arc(s.crosshair.x, s.crosshair.y, 2.5, 0, Math.PI * 2);
      context.fill();

      // When target is locked: rotating lock-on ring
      if (isTargetLocked) {
        context.save();
        context.translate(s.crosshair.x, s.crosshair.y);
        context.rotate(Date.now() * 0.003);
        context.strokeStyle = '#ef4444';
        context.lineWidth = 1.5;
        context.setLineDash([6, 6]);
        context.beginPath();
        context.arc(0, 0, rSize + 8, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

      context.restore();
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, targetTanksCount]);

  // Pointer & Touch Handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 500, y: 300 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    stateRef.current.crosshair = coords;
    stateRef.current.isPointerInside = true;
    handleFireWeapon(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    stateRef.current.crosshair = coords;
    stateRef.current.isPointerInside = true;
  };

  const handlePointerLeave = () => {
    stateRef.current.isPointerInside = false;
    stateRef.current.hoveredTankId = null;
  };

  return (
    <div
      dir="rtl"
      className="relative w-full h-full min-h-0 bg-stone-950 flex flex-col justify-between overflow-hidden select-none font-cairo text-stone-100"
    >
      {/* Top Operations Header Bar */}
      <header className="relative z-10 px-3 py-2 sm:px-6 sm:py-2.5 bg-stone-950/95 border-b border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
            title="الانسحاب للقائمة"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">انسحاب</span>
          </button>
          {onOpenTutorialVideo && (
            <button
              type="button"
              onClick={onOpenTutorialVideo}
              className="px-2.5 py-1.5 rounded-xl bg-red-600/25 hover:bg-red-600/40 text-red-300 hover:text-white border border-red-500/50 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95 shadow-sm"
              title="مشاهدة فيديو الشرح التكتيكي (يوقف اللعبة مؤقتاً)"
            >
              <Video className="w-3.5 h-3.5 text-red-400" />
              <span>فيديو الشرح 🎬</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">⚔️</span>
              <h2 className="text-xs sm:text-base font-black font-cairo text-amber-400">
                المرحلة 4: معركة الدبابات الكبرى
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                {diffConfig.badge}
              </span>
              <span className="hidden lg:inline text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
                ظهور الدبابات: كل 5 ثوانٍ
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden md:block">
              صد هجوم اللواء 190 مدرع المعادي: اضرب الدبابات المتقدمة بصواريخ مالوتكا وقذائف T-62
            </p>
          </div>
        </div>

        {/* Tactical Indicators */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold">
          {/* Tanks Destroyed Progress */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 shadow">
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span>
              دبابات مدمرة: {tanksDestroyed}/{targetTanksCount}
            </span>
          </div>

          {/* Defense Line Integrity */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border shadow ${
              baseIntegrity <= 30
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : 'bg-stone-900 border-stone-800 text-emerald-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <div className="flex items-center gap-1">
              <span>سلامة الدفاع:</span>
              <div className="w-12 h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    baseIntegrity > 50 ? 'bg-emerald-500' : baseIntegrity > 25 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${baseIntegrity}%` }}
                />
              </div>
              <span className="font-mono text-[11px]">{baseIntegrity}%</span>
            </div>
          </div>

          {/* Digital Timer */}
          <div className="flex items-center">
            <MissionDigitalTimer
              timeLeft={timeLeft}
              totalTime={missionDuration}
              label="الوقت المتبقي"
              position="top-center"
            />
          </div>
        </div>
      </header>

      {/* Advisory Status Ticker */}
      <div className="relative z-10 px-3 sm:px-6 py-1 bg-stone-900/80 border-b border-stone-800/80 backdrop-blur-sm flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 text-stone-300 min-w-0">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold truncate text-[11px] sm:text-xs text-amber-200/90">
            {feedbackMsg}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-mono text-stone-400">
            النقاط: <strong className="text-amber-400 font-bold">{score}</strong>
          </span>
          <button
            type="button"
            onClick={resetGame}
            className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title="إعادة بدء المعركة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Combat Battlefield Canvas */}
      <main className="relative z-10 flex-1 w-full h-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden cursor-none">
        <canvas
          ref={canvasRef}
          width={1000}
          height={520}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="w-full h-full object-fill touch-none cursor-none block select-none"
        />
      </main>

      {/* Bottom Tactical Weapons & Command Bar */}
      <footer className="relative z-10 p-2.5 sm:p-3.5 bg-stone-950/95 border-t border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-2xl">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-400 hidden md:inline">الأسلحة الميدانية:</span>

          {/* Cannon Switch */}
          <button
            type="button"
            onClick={() => {
              sound.playRadioClick();
              setActiveWeapon('cannon');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-black font-cairo border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              activeWeapon === 'cannon'
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>مدفع T-62 (115 ملم) [1]</span>
          </button>

          {/* Sagger Missile Switch */}
          <button
            type="button"
            onClick={() => {
              sound.playRadioClick();
              setActiveWeapon('sagger');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-black font-cairo border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              activeWeapon === 'sagger'
                ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>صاروخ مالوتكا ساجر [2] {saggerCooldown > 0 ? `(${saggerCooldown}ث)` : 'جاهز'}</span>
          </button>
        </div>

        {/* Tactical Support Powers (Artillery & Smoke Screen) */}
        <div className="flex items-center gap-2">
          {/* Artillery Barrage Call */}
          <button
            type="button"
            disabled={artilleryCooldown > 0 || isWon || isDefeated}
            onClick={handleCallArtillery}
            className="px-3.5 py-2 rounded-xl bg-orange-950 hover:bg-orange-900 border border-orange-600/70 text-orange-200 text-xs font-black font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            title="طلب قصف مدفعي مركز من مدفعية الجيش الثاني الميداني [3]"
          >
            <Zap className="w-4 h-4 text-orange-400" />
            <span>قصف مدفعي [3] {artilleryCooldown > 0 ? `(${artilleryCooldown}ث)` : 'جاهز'}</span>
          </button>

          {/* Tactical Smoke Screen Call */}
          <button
            type="button"
            disabled={smokeScreenTimer > 0 || isWon || isDefeated}
            onClick={handleDeploySmokeScreen}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-black font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            title="إطلاق ستارة دخان لحجب الرؤية عن دبابات العدو [4]"
          >
            <Wind className="w-4 h-4 text-stone-400" />
            <span>ستارة دخان [4] {smokeScreenTimer > 0 ? `(${smokeScreenTimer}ث)` : 'جاهز'}</span>
          </button>
        </div>
      </footer>

      {/* Victory Modal */}
      <VictoryModal
        isOpen={isWon}
        missionId="MISSION_TANK_BATTLE"
        missionTitle="المرحلة 4: معركة الدبابات الكبرى"
        congratulatoryMessage="مبروك النصر العظيم! تم صد وتدمير لواء المدرعات المعادي بالكامل، وأُسرت دبابة القيادة واستسلم العقيد عساف ياجوري!"
        score={score}
        timeLeft={timeLeft}
        targetsDestroyed={tanksDestroyed}
        totalTargets={targetTanksCount}
        onNextMission={() => onComplete(score)}
        onReturnToBase={onExit}
        onReplay={resetGame}
      />

      {/* Defeat Modal */}
      {isDefeated && (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-red-950/90 border-2 border-red-500 flex items-center justify-center text-3xl mb-4 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            ⚠️
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-cairo text-red-400 mb-2">
            {defeatReason === 'timeout'
              ? 'نفد الوقت المخصص لصد الهجوم المضاد!'
              : 'تم اختراق النسق الدفاعي ورأس الكوبري في سيناء!'}
          </h3>

          <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
            {defeatReason === 'timeout'
              ? `عليك تدمير دبابات العدو (${targetTanksCount} دبابات) قبل نفاد الوقت.`
              : 'دمر دبابات الباتون والسينتوريون قبل وصولها إلى الساتر الترابي، واستخدم صواريخ مالوتكا والقصف المدفعي لصد الهجوم.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95 text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة المحاولة
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
