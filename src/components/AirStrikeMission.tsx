import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Zap, Shield, Flame, CheckCircle2, Clock, Target, RotateCcw, AlertTriangle, Radio, Video } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';
import { isGamePaused } from '../game/pause';

interface AirStrikeMissionProps {
  difficulty: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
  onOpenTutorialVideo?: () => void;
}

interface GroundTarget {
  id: number;
  x: number;
  y: number;
  type: 'radar' | 'runway' | 'bunker';
  hp: number;
  maxHp: number;
  label: string;
  points: number;
  destroyed: boolean;
  flakTimer?: number;
}

type EnemyJetType = 'phantom' | 'mirage' | 'skyhawk' | 'nesher' | 'super_mystere';

interface EnemyJet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseY?: number;
  hp: number;
  maxHp?: number;
  type?: EnemyJetType;
  destroyed: boolean;
  burstRemaining?: number;
  burstCooldown?: number;
  lastBurstTime?: number;
  missileFired?: boolean;
  missileCooldown?: number;
  evasionTimer?: number;
  targetAltitude?: number;
  attackPattern?: 'patrol_line' | 'wingman_pair' | 'air_superiority' | 'tactical_sweep';
  patternTimer?: number;
  patternPhase?: number;
  flaresCooldown?: number;
  badgeShown?: boolean;
  tilt?: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isRocket: boolean;
  fromPlayer: boolean;
  isEnemyMissile?: boolean;
  isFlak?: boolean;
  flakDetonationY?: number;
  smokeTimer?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isSmoke?: boolean;
  growth?: number;
  gravity?: number;
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

export const AirStrikeMission: React.FC<AirStrikeMissionProps> = ({ difficulty, onComplete, onDefeat, onExit, onOpenTutorialVideo }) => {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const targetStationsRequired = config.requiredAirStrikeStations; // سهل: 3، متوسط: 4، صعب: 5
  const totalStations = config.totalAirStrikeStations; // 6
  const missionDuration = config.missionDuration;
  // المرحلة الأولى متوازنة حسب مستوى الصعوبة
  const enemyTuning = {
    spawnChance: 0.032 * config.enemySpawnRateMultiplier,
    maxJets: difficulty === 'easy' ? 5 : difficulty === 'hard' ? 8 : 7,
    hpScale: difficulty === 'easy' ? 1.0 : difficulty === 'hard' ? 1.35 : 1.22,
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hp, setHp] = useState(180);
  const [rockets, setRockets] = useState(8);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(missionDuration); // Timer for combat
  const [totalDestroyed, setTotalDestroyed] = useState(0);
  const [hitsTaken, setHitsTaken] = useState(0);
  const [missionWon, setMissionWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'shot_down' | 'crash' | 'timeout' | 'radar'>('shot_down');
  const [playerAltitude, setPlayerAltitude] = useState<number>(320);
  const [isGroundDanger, setIsGroundDanger] = useState<boolean>(false);
  const [groundDangerRemaining, setGroundDangerRemaining] = useState<number>(2.5);
  const [isRadarDanger, setIsRadarDanger] = useState<boolean>(false);
  const [radarDangerRemaining, setRadarDangerRemaining] = useState<number>(2.5);
  const [damageVignette, setDamageVignette] = useState<number>(0);
  const [victoryReason, setVictoryReason] = useState<'fast'>('fast');
  const [countdownSec, setCountdownSec] = useState<number>(5);
  const [isCombatActive, setIsCombatActive] = useState<boolean>(false);
  const [currentAlert, setCurrentAlert] = useState<string>('تجهيز المقاتلة: المرحلة خالية، استعد للاشتباك خلال 5 ثوانٍ');

  const handleRestartMission = () => {
    sound.playRadioTransmission();
    setHp(180);
    setScore(0);
    setRockets(8);
    setTimeLeft(missionDuration);
    setTotalDestroyed(0);
    setHitsTaken(0);
    setMissionWon(false);
    setIsDefeated(false);
    setDefeatReason('shot_down');
    setIsGroundDanger(false);
    setGroundDangerRemaining(2.5);
    setIsRadarDanger(false);
    setRadarDangerRemaining(2.5);
    setDamageVignette(0);
    setCountdownSec(5);
    setIsCombatActive(false);
    setCurrentAlert('تجهيز المقاتلة: المرحلة خالية، استعد للاشتباك خلال 5 ثوانٍ');

    const state = stateRef.current;
    state.isCountdown = true;
    state.isComplete = false;
    state.groundDangerTimer = 0;
    state.radarDangerTimer = 0;
    state.vignetteAlpha = 0;
    state.player.hp = 180;
    state.player.x = 160;
    state.player.y = 240;
    state.targets = [];
    state.enemyJets = [];
    state.projectiles = [];
    state.particles = [];
    state.shockwaves = [];
    state.floatingTexts = [];
    state.scrollX = 0;
    state.score = 0;
    state.rockets = 8;
    state.destroyedCount = 0;
    state.spawnedTimes = new Set<number>();
    sound.playBackgroundTheme('airStrike');
  };

  // State: Stage starts empty, countdown 5s, then enemies, then stations after 20s
  const stateRef = useRef({
    isCountdown: true,
    groundDangerTimer: 0,
    radarDangerTimer: 0,
    player: {
      x: 160,
      y: 260,
      vx: 0,
      vy: 0,
      tilt: 0,
      hp: 180,
    },
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    mouse: {
      x: 350,
      y: 260,
      isLeftDown: false,
    },
    screenShake: 0,
    vignetteAlpha: 0,
    // Stage starts completely empty!
    targets: [] as GroundTarget[],
    enemyJets: [] as EnemyJet[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    shockwaves: [] as Shockwave[],
    floatingTexts: [] as FloatingText[],
    scrollX: 0,
    lastShotTime: 0,
    lastRocketTime: 0,
    score: 0,
    rockets: 8,
    timeLeft: 120,
    destroyedCount: 0,
    isComplete: false,
    radarAngle: 0,
    spawnedTimes: new Set<number>(),
  });

  // Six fixed target windows, exactly 20 seconds apart.
  // Target 5 appears at 01:30; target 6 appears at 01:50 and is optional.
  const SCHEDULE = [
    { sec: 10, type: 'radar' as const, label: 'محطة رادار الإنذار المبكر', hp: 30, points: 500 },
    { sec: 30, type: 'runway' as const, label: 'مطار المليز العسكري', hp: 35, points: 600 },
    { sec: 50, type: 'bunker' as const, label: 'مرابض المدفعية الثقيلة', hp: 35, points: 550 },
    { sec: 70, type: 'radar' as const, label: 'محطة تشويش ورصد بعيدة', hp: 30, points: 500 },
    { sec: 90, type: 'runway' as const, label: 'مطار بير جفجافة — الهدف الخامس الحاسم', hp: 40, points: 700 },
    { sec: 110, type: 'bunker' as const, label: 'مركز القيادة المتقدم — الهدف السادس الاحتياطي', hp: 40, points: 750 },
  ];

  // 1. Initial 5-Second Countdown while stage is empty
  useEffect(() => {
    if (missionWon || isDefeated) return;

    const countTimer = setInterval(() => {
      if (isGamePaused()) return;
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(countTimer);
          stateRef.current.isCountdown = false;
          setIsCombatActive(true);
          sound.playCountdownBeep(true);
          setCurrentAlert('⚠️ رصد مقاتلات معادية اعتراضية في المدى الجوي - ابدأ الاشتباك!');

          // Spawn first enemy interceptor immediately when 5 seconds end!
          const canvas = canvasRef.current;
          if (canvas) {
            stateRef.current.enemyJets.push({
              x: canvas.width + 60,
              y: 150,
              baseY: 150,
              vx: -220,
              vy: 0,
              hp: 34,
              maxHp: 34,
              type: 'phantom',
              destroyed: false,
              attackPattern: 'patrol_line',
              patternTimer: 0,
              patternPhase: 0,
            });
          }
          return 0;
        }
        sound.playCountdownBeep(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countTimer);
  }, [missionWon, isDefeated]);

  // 2. 2-Minute Combat Timer & Progressive Spawning (starts after 5s countdown)
  useEffect(() => {
    if (!isCombatActive || missionWon || isDefeated) return;

    const timer = setInterval(() => {
      if (isGamePaused()) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;
        const elapsed = missionDuration - next;

        // Pre-alert 4 seconds before next station
        const upcoming = SCHEDULE.find((s) => s.sec === elapsed + 4);
        if (upcoming) {
          setCurrentAlert(`🎯 رصد راداري: ${upcoming.label} تقترب`);
          sound.playTargetLock();
        }

        // Spawn only the six planned targets; there are no bonus ground targets.
        const scheduled = SCHEDULE.find((s) => s.sec === elapsed);
        if (scheduled && !stateRef.current.spawnedTimes.has(elapsed)) {
          stateRef.current.spawnedTimes.add(elapsed);

          const canvas = canvasRef.current;
          const canvasW = canvas ? canvas.width : 1000;
          const spawnX = stateRef.current.scrollX + canvasW + 120;

          stateRef.current.targets.push({
            id: elapsed,
            x: spawnX,
            y: scheduled.type === 'runway' ? 465 : scheduled.type === 'bunker' ? 455 : 450,
            type: scheduled.type,
            hp: scheduled.hp,
            maxHp: scheduled.hp,
            label: scheduled.label,
            points: scheduled.points,
            destroyed: false,
          });

          sound.playTargetLock();
          setCurrentAlert(`🎯 ظهرت في المدى: ${scheduled.label}!`);
        }



        // Timeout is a real mission failure: waiting must never count as victory.
        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setDefeatReason('timeout');
          setIsDefeated(true);
          onDefeat?.('timeout');
          sound.playDefeatSound();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCombatActive, missionWon, isDefeated]);

  useEffect(() => {
    sound.playJetFlyby();
  }, []);

  const addFloatingText = (x: number, y: number, text: string, color = '#facc15') => {
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

  // Launch Auto-Homing Rocket (موجهة تلقائياً لوحدها)
  const fireRocket = () => {
    if (isGamePaused()) return;
    const now = performance.now();
    const state = stateRef.current;
    if (now - state.lastRocketTime < 320) return;

    if (state.rockets <= 0) return;
    setRockets((prev) => {
      if (prev > 0) {
        state.lastRocketTime = now;
        sound.playMissileLaunch();
        const p = state.player;

        // Rocket starts with fast forward speed and auto-homes dynamically to nearest target
        state.projectiles.push({
          x: p.x + 38,
          y: p.y + 6,
          vx: 750,
          vy: 40,
          isRocket: true,
          fromPlayer: true,
        });

        addFloatingText(p.x, p.y - 20, 'صاروخ موجه للمحطات 🚀', '#f59e0b');
        state.rockets -= 1;
        return state.rockets;
      }
      return 0;
    });
  };

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let lastAltitudeDisplayTime = 0;

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (clientX - rect.left) * scaleX;
      const my = (clientY - rect.top) * scaleY;

      // Full canvas reticle coverage: aim anywhere from sky to ground
      stateRef.current.mouse.x = Math.max(0, Math.min(canvas.width, mx));
      stateRef.current.mouse.y = Math.max(0, Math.min(canvas.height, my));
    };

    const handleMouseMove = (e: MouseEvent) => updateMouse(e.clientX, e.clientY);

    // Keyboard Flight Controls directly drive plane movement
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGamePaused()) return;
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = true;
      if (e.key === ' ') {
        e.preventDefault();
        stateRef.current.mouse.isLeftDown = true;
      }
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        e.preventDefault();
        fireRocket();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false;
      if (e.key === ' ') stateRef.current.mouse.isLeftDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Clean, crisp effects for aircraft hits & destruction (NO screen-covering smoke or shockwave disc)
    const spawnPlaneHitEffect = (x: number, y: number) => {
      sound.playHitSound();
      // Fast, tiny sparks that dissipate quickly without blocking screen
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 10 + Math.random() * 6,
          color: Math.random() < 0.5 ? '#fef08a' : '#f97316',
          size: Math.random() * 2 + 1.2,
          isSmoke: false,
        });
      }
    };

    const spawnPlaneDestroyEffect = (x: number, y: number) => {
      sound.playExplosion(0.65);
      // Clean tactical spark burst and tiny metallic debris - ZERO screen coverage!
      const sparkColors = ['#ffffff', '#fef08a', '#f59e0b', '#f97316'];
      for (let i = 0; i < 9; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3.5 + 1.5;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 12 + Math.random() * 6,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          size: Math.random() * 2.2 + 1.2,
          isSmoke: false,
        });
      }
    };

    // Ground Station Explosions (Controlled ground smoke, thin shockwave ring, no full-screen disc)
    const spawnExplosion = (x: number, y: number, color = '#f59e0b', count = 14, isMajor = false) => {
      sound.playExplosion(isMajor ? 1.1 : 0.7);
      stateRef.current.screenShake = isMajor ? 1.2 : 0.6;

      // Thin tactical shockwave ring (line only)
      stateRef.current.shockwaves.push({
        x,
        y,
        radius: 6,
        maxRadius: isMajor ? 55 : 35,
        alpha: 0.9,
        color: isMajor ? '#ffffff' : '#fef08a',
      });

      // Ground smoke (low, controlled, stays at target ground level)
      const smokeCount = isMajor ? 10 : 5;
      const smokeTones = ['#27272a', '#3f3f46', '#52525b'];
      for (let i = 0; i < smokeCount; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const spd = Math.random() * 2 + 0.8;
        stateRef.current.particles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 0.8,
          vy: Math.sin(angle) * spd - 0.6,
          life: 1,
          maxLife: 30 + Math.random() * 15,
          color: smokeTones[Math.floor(Math.random() * smokeTones.length)],
          size: Math.random() * 3 + 3,
          isSmoke: true,
          growth: 0.1,
        });
      }

      // Fiery Core and Embers
      const fireColors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#f97316'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isMajor ? 5 : 3.5) + 1.2;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 16 + Math.random() * 12,
          color: fireColors[Math.floor(Math.random() * fireColors.length)],
          size: Math.random() * 3 + 1.5,
        });
      }

      // Flying Shrapnel with Gravity
      const shrapnelCount = isMajor ? 8 : 4;
      for (let i = 0; i < shrapnelCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1.5;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 1,
          maxLife: 22 + Math.random() * 12,
          color: '#fbbf24',
          size: Math.random() * 2 + 1,
          gravity: 190,
        });
      }
    };

    // Controlled firing on LEFT MOUSE BUTTON ONLY
    const handleMouseDown = (e: MouseEvent) => {
      if (isGamePaused()) return;
      updateMouse(e.clientX, e.clientY);

      if (e.button === 0) {
        stateRef.current.mouse.isLeftDown = true;

        // Direct click on active ground target
        const state = stateRef.current;
        for (const target of state.targets) {
          if (target.destroyed) continue;
          const targetScreenX = target.x - state.scrollX;
          if (Math.hypot(state.mouse.x - targetScreenX, state.mouse.y - target.y) < 65) {
            target.hp -= 20;
            sound.playHitSound();
            spawnExplosion(state.mouse.x, state.mouse.y, '#f97316', 10);
            if (target.hp <= 0) {
              target.destroyed = true;
              spawnExplosion(targetScreenX, target.y, '#f59e0b', 28, true);
              state.score += target.points;
              state.destroyedCount++;
              const upgrade = state.destroyedCount;
              state.player.hp = Math.min(210, state.player.hp + 10);
              setHp(state.player.hp);
              setScore(state.score);
              setTotalDestroyed(state.destroyedCount);
              addFloatingText(targetScreenX, target.y - 30, `+${target.points} ${target.label} مدمر! 🎯`, '#4ade80');
                addFloatingText(targetScreenX, target.y - 8, `⚙ ترقية ${upgrade}: سرعة/استجابة +${Math.round(1.35)} · تعافي +12`, '#facc15');
              if (state.destroyedCount >= 5 && !state.isComplete) {
                state.isComplete = true;
                state.score += state.timeLeft * 25;
                setScore(state.score);
                setVictoryReason('fast');
                setMissionWon(true);
                sound.playVictoryFanfare();
              }
            }
            break;
          }
        }
      }

      if (e.button === 2) {
        fireRocket();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        stateRef.current.mouse.isLeftDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      fireRocket();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isGamePaused()) return;
      e.preventDefault();
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
        stateRef.current.mouse.isLeftDown = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stateRef.current.mouse.isLeftDown = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    const loop = (currentTime: number) => {
      const state = stateRef.current;
      if (isGamePaused()) {
        lastTime = currentTime;
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (state.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      state.radarAngle += dt * 3.5;

      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt * 14);
      }
      if (state.vignetteAlpha > 0) {
        state.vignetteAlpha = Math.max(0, state.vignetteAlpha - dt * 2.2);
        setDamageVignette(state.vignetteAlpha);
      } else if (damageVignette > 0) {
        setDamageVignette(0);
      }

      // Direct Mouse Flight Control: Plane stays exactly on mouse position in all directions
      const p = state.player;
      const m = state.mouse;
      const oldPx = p.x;
      const oldPy = p.y;

      // Full freedom of movement in all directions: up, down, left, right
      const targetX = Math.max(50, Math.min(canvas.width - 60, m.x));
      const targetY = Math.max(40, Math.min(canvas.height - 75, m.y));

      // Ultra-responsive direct tracking so the plane stays exactly on the mouse
      const steeringResponse = Math.min(16.5, 10 + state.destroyedCount * 1.35);
      p.x += (targetX - p.x) * steeringResponse * dt;
      p.y += (targetY - p.y) * steeringResponse * dt;
      if (Math.hypot(targetX - p.x, targetY - p.y) < 2) {
        p.x = targetX;
        p.y = targetY;
      }

      p.vx = dt > 0 ? (p.x - oldPx) / dt : 0;
      p.vy = dt > 0 ? (p.y - oldPy) / dt : 0;
      // Aerodynamic pitch tilt matching vertical speed
      p.tilt = Math.max(-0.28, Math.min(0.28, (p.vy / 280) * 0.28));

      // Calculate altitude and telemetry
      const groundFloorY = 465;
      const altMeters = Math.max(10, Math.round((groundFloorY - p.y) * 2.2));
      if (currentTime - lastAltitudeDisplayTime >= 100) {
        lastAltitudeDisplayTime = currentTime;
        setPlayerAltitude(altMeters);
      }

      // Ground Danger check (staying on/skimming ground Y>=395 too long explodes the jet)
      if (!state.isCountdown && !state.isComplete) {
        if (p.y >= 395) {
          state.groundDangerTimer += dt;
          // Apply proximity damage from intense ground anti-aircraft machine gun and dune fire
          p.hp = Math.max(1, p.hp - dt * 14);
          setHp(Math.round(p.hp));

          // Spawn ground fire tracers and smoke bursting up around MiG-21
          if (Math.random() < 0.5) {
            state.particles.push({
              x: p.x + (Math.random() - 0.5) * 50,
              y: p.y + 12 + Math.random() * 15,
              vx: (Math.random() - 0.5) * 110,
              vy: -160 - Math.random() * 90,
              life: 1,
              maxLife: 22,
              color: Math.random() < 0.6 ? '#ef4444' : '#f59e0b',
              size: 4.5,
            });
          }

          // Apply subtle, gentle screen-shake and soft red vignette overlay
          state.screenShake = Math.max(state.screenShake, 0.35 + state.groundDangerTimer * 0.2);
          state.vignetteAlpha = Math.max(state.vignetteAlpha, 0.06 + state.groundDangerTimer * 0.04);
          setDamageVignette(state.vignetteAlpha);

          if (state.groundDangerTimer > 0.25) {
            sound.playGroundProximityAlarm();
            setIsGroundDanger(true);
            setGroundDangerRemaining(Math.max(0, 2.5 - state.groundDangerTimer));
          }
          if (state.groundDangerTimer >= 2.5) {
            state.groundDangerTimer = 0;
            p.hp = 0;
            setHp(0);
            state.isComplete = true;
            sound.playExplosion();
            sound.playDefeatSound();
            for (let k = 0; k < 28; k++) {
              state.particles.push({
                x: p.x + (Math.random() - 0.5) * 35,
                y: p.y + (Math.random() - 0.5) * 35,
                vx: (Math.random() - 0.5) * 260,
                vy: (Math.random() - 0.5) * 260,
                life: 1,
                maxLife: 35,
                color: Math.random() < 0.5 ? '#ef4444' : '#f59e0b',
                size: 8,
              });
            }
            state.shockwaves.push({
              x: p.x,
              y: p.y,
              radius: 10,
              maxRadius: 160,
              alpha: 1,
              color: '#ef4444',
            });
            setIsDefeated(true);
            setDefeatReason('crash');
            onDefeat?.('crash');
            return;
          }
        } else {
          state.groundDangerTimer = Math.max(0, state.groundDangerTimer - dt * 2.5);
          if (state.groundDangerTimer <= 0.1) {
            setIsGroundDanger(false);
          }
        }

        // Radar Danger check (flying too high in the sky Y<=95 triggers enemy Hawk radar detection)
        if (p.y <= 95) {
          state.radarDangerTimer += dt;
          // Apply proximity damage from Hawk radar lock electronic jamming & anti-air flak
          p.hp = Math.max(1, p.hp - dt * 14);
          setHp(Math.round(p.hp));

          // Spawn radar lock-on interference sparks and electronic tracking pulses
          if (Math.random() < 0.5) {
            state.particles.push({
              x: p.x + (Math.random() - 0.5) * 45,
              y: p.y + (Math.random() - 0.5) * 30,
              vx: (Math.random() - 0.5) * 140,
              vy: (Math.random() - 0.5) * 140,
              life: 1,
              maxLife: 20,
              color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444',
              size: 4.5,
            });
          }

          // Apply subtle, gentle screen-shake and soft red vignette from enemy radar lock
          state.screenShake = Math.max(state.screenShake, 0.45 + state.radarDangerTimer * 0.25);
          state.vignetteAlpha = Math.max(state.vignetteAlpha, 0.08 + state.radarDangerTimer * 0.05);
          setDamageVignette(state.vignetteAlpha);

          if (state.radarDangerTimer > 0.25) {
            sound.playRadarWarningAlarm();
            setIsRadarDanger(true);
            setRadarDangerRemaining(Math.max(0, 2.5 - state.radarDangerTimer));
          }
          if (state.radarDangerTimer >= 2.5) {
            state.radarDangerTimer = 0;
            p.hp = 0;
            setHp(0);
            state.isComplete = true;
            sound.playExplosion();
            sound.playDefeatSound();
            for (let k = 0; k < 30; k++) {
              state.particles.push({
                x: p.x + (Math.random() - 0.5) * 45,
                y: p.y + (Math.random() - 0.5) * 45,
                vx: (Math.random() - 0.5) * 290,
                vy: (Math.random() - 0.5) * 290,
                life: 1,
                maxLife: 40,
                color: Math.random() < 0.5 ? '#f97316' : '#dc2626',
                size: 9,
              });
            }
            state.shockwaves.push({
              x: p.x,
              y: p.y,
              radius: 10,
              maxRadius: 180,
              alpha: 1,
              color: '#f59e0b',
            });
            setIsDefeated(true);
            setDefeatReason('radar');
            onDefeat?.('radar');
            return;
          }
        } else {
          state.radarDangerTimer = Math.max(0, state.radarDangerTimer - dt * 2.5);
          if (state.radarDangerTimer <= 0.1) {
            setIsRadarDanger(false);
          }
        }
      }

      state.scrollX += (95 + state.destroyedCount * 6) * dt;

      // Autocannon Fire Streams directly forward from MiG-21 twin guns
      const now = performance.now();
      const fireDelay = Math.max(120, 190 - state.destroyedCount * 12);
      if (m.isLeftDown && now - state.lastShotTime > fireDelay) {
        state.lastShotTime = now;
        sound.playGunshot();

        const bulletSpeed = 850 + state.destroyedCount * 25;
        state.projectiles.push({
          x: p.x + 40,
          y: p.y - 6,
          vx: bulletSpeed,
          vy: 0,
          isRocket: false,
          fromPlayer: true,
        });
        state.projectiles.push({
          x: p.x + 40,
          y: p.y + 6,
          vx: bulletSpeed,
          vy: 0,
          isRocket: false,
          fromPlayer: true,
        });
      }

      // Spawn Enemy Interceptor Jets in disciplined formations strictly in the balanced corridor (Y=140 to 290)
      if (!state.isCountdown && Math.random() < enemyTuning.spawnChance && state.enemyJets.length < enemyTuning.maxJets) {
        const patterns: ('patrol_line' | 'wingman_pair' | 'air_superiority' | 'tactical_sweep')[] = [
          'patrol_line',
          'wingman_pair',
          'air_superiority',
          'tactical_sweep',
        ];
        const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];
        const enemyTypes: EnemyJetType[] = ['phantom', 'mirage', 'skyhawk', 'nesher', 'super_mystere'];
        const chosenType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const typeStats: Record<EnemyJetType, { hp: number; speed: number }> = {
          phantom: { hp: 44, speed: 160 },
          mirage: { hp: 32, speed: 178 },
          skyhawk: { hp: 48, speed: 148 },
          nesher: { hp: 36, speed: 168 },
          super_mystere: { hp: 52, speed: 138 },
        };
        const tunedHp = Math.round(typeStats[chosenType].hp * enemyTuning.hpScale);

        if (chosenPattern === 'wingman_pair' && state.enemyJets.length <= enemyTuning.maxJets - 2) {
          // Coordinated 2-plane echelon formation safely centered in sky
          state.enemyJets.push({
            x: canvas.width + 60,
            y: 160,
            baseY: 160,
            vx: -240,
            vy: 0,
            hp: tunedHp,
            maxHp: tunedHp,
            type: chosenType,
            destroyed: false,
            attackPattern: 'wingman_pair',
            patternTimer: 0,
            patternPhase: 0,
          });
          state.enemyJets.push({
            x: canvas.width + 120,
            y: 220,
            baseY: 220,
            vx: -240,
            vy: 0,
            hp: Math.round(22 * enemyTuning.hpScale),
            maxHp: Math.round(22 * enemyTuning.hpScale),
            type: chosenType === 'phantom' ? 'mirage' : 'phantom',
            destroyed: false,
            attackPattern: 'wingman_pair',
            patternTimer: 0,
            patternPhase: 1,
          });
        } else {
          // Balanced corridor: Not too high (>= 150) and not too low (<= 290)
          const spawnY =
            chosenPattern === 'air_superiority'
              ? 150 + Math.random() * 35      // Mid-high sky: 150 - 185
              : chosenPattern === 'tactical_sweep'
              ? 195 + Math.random() * 40     // Mid sky: 195 - 235
              : 245 + Math.random() * 45;    // Mid-low sky: 245 - 290

          state.enemyJets.push({
            x: canvas.width + 60,
            y: spawnY,
            baseY: spawnY,
            vx: -typeStats[chosenType].speed,
            vy: 0,
            hp: tunedHp,
            maxHp: tunedHp,
            type: chosenType,
            destroyed: false,
            attackPattern: chosenPattern,
            patternTimer: 0,
            patternPhase: 0,
          });
        }
      }

      // Update Projectiles (with AUTO-HOMING ROCKETS)
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const pr = state.projectiles[i];

        // AUTO-HOMING ROCKET (موجهة تلقائياً لوحدها): Locks on and chases nearest enemy!
        if (pr.isRocket) {
          if (pr.isEnemyMissile) {
            // Guided enemy missile tracking player MiG-21
            const mdy = p.y - pr.y;
            pr.vy += Math.sign(mdy) * Math.min(180, Math.abs(mdy) * 4.5) * dt;
            pr.vx = Math.min(-340, pr.vx - 70 * dt);

            if (Math.random() < 0.65) {
              state.particles.push({
                x: pr.x + 12,
                y: pr.y,
                vx: 30 + (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                maxLife: 20,
                color: '#ffffff',
                size: Math.random() * 4 + 3,
                isSmoke: true,
                growth: 0.2,
              });
            }
          } else {
            let targetX = 0;
            let targetY = 0;
            let foundTarget = false;
            let minDist = 3000;

            // Guided rockets track EXCLUSIVELY ground target stations!
            for (const st of state.targets) {
              if (st.destroyed) continue;
              const sx = st.x - state.scrollX;
              if (sx > -80 && sx < canvas.width + 600) {
                const d = Math.hypot(sx - pr.x, st.y - pr.y);
                if (d < minDist) {
                  minDist = d;
                  targetX = sx;
                  targetY = st.y;
                  foundTarget = true;
                }
              }
            }

            if (foundTarget) {
              const dx = targetX - pr.x;
              const dy = targetY - pr.y;
              const dist = Math.hypot(dx, dy) || 1;
              const rocketSpeed = 780;
              const targetVx = (dx / dist) * rocketSpeed;
              const targetVy = (dy / dist) * rocketSpeed;
              // Smooth, sharp homing turn directly down towards the ground station
              pr.vx += (targetVx - pr.vx) * 12 * dt;
              pr.vy += (targetVy - pr.vy) * 12 * dt;
            }

            // Smoke puff and flame particles behind rocket
            if (Math.random() < 0.65) {
              state.particles.push({
                x: pr.x - 14,
                y: pr.y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1,
                maxLife: 15,
                color: Math.random() < 0.5 ? '#f97316' : '#71717a',
                size: Math.random() * 3 + 2,
                isSmoke: true,
                growth: 0.25,
              });
            }
          }
        }

        // Israeli Ground Station Anti-Aircraft Flak Burst
        if (pr.isFlak) {
          if (pr.flakDetonationY && pr.y <= pr.flakDetonationY) {
            spawnExplosion(pr.x, pr.y, '#f59e0b', 20, false);
            sound.playExplosion(0.85);
            // Black flak burst smoke puff
            for (let k = 0; k < 6; k++) {
              state.particles.push({
                x: pr.x + (Math.random() - 0.5) * 16,
                y: pr.y + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 35,
                vy: (Math.random() - 0.5) * 35 - 10,
                life: 1,
                maxLife: 30,
                color: '#27272a',
                size: Math.random() * 6 + 4,
                isSmoke: true,
                growth: 0.25,
              });
            }
            // Check splash damage against player MiG-21
            if (Math.hypot(pr.x - p.x, pr.y - p.y) < 65) {
              p.hp -= 12;
              const remainingHp = Math.max(0, p.hp);
              setHp(remainingHp);
              state.screenShake = 1.0;
              state.vignetteAlpha = 0.14;
              setDamageVignette(0.14);
              spawnPlaneHitEffect(p.x, p.y);
              sound.playHitSound();
              addFloatingText(p.x, p.y - 25, '⚠️ شظايا مضادات أرضية (فلاك)! -12', '#ef4444');
              if (remainingHp <= 0 && !state.isComplete) {
                state.isComplete = true;
                setIsDefeated(true);
                onDefeat?.('shot_down');
                setDefeatReason('shot_down');
                sound.playDefeatSound();
                sound.playExplosion(1.4);
                spawnExplosion(p.x, p.y, '#ef4444', 36, true);
              }
            }
            state.projectiles.splice(i, 1);
            continue;
          }
        }

        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;

        if (pr.y > canvas.height - 50) {
          spawnExplosion(pr.x, pr.y, '#eab308', 5, false);
          state.projectiles.splice(i, 1);
          continue;
        }

        if (pr.x < -40 || pr.x > canvas.width + 120 || pr.y < -40) {
          state.projectiles.splice(i, 1);
          continue;
        }

        if (pr.fromPlayer) {
          // Player cannon (not rockets) can intercept incoming enemy missiles!
          if (!pr.isRocket) {
            for (let m = state.projectiles.length - 1; m >= 0; m--) {
              const ep = state.projectiles[m];
              if (ep.isEnemyMissile && Math.hypot(pr.x - ep.x, pr.y - ep.y) < 24) {
                state.projectiles.splice(m, 1);
                spawnExplosion(ep.x, ep.y, '#f59e0b', 20, true);
                sound.playExplosion(1.0);
                state.score += 200;
                setScore(state.score);
                addFloatingText(ep.x, ep.y - 20, '+200 اعتراض صاروخ معادٍ! 💥', '#38bdf8');
                break;
              }
            }
          }
          // Check ground targets (stations) - guided rockets target ONLY stations!
          for (const target of state.targets) {
            if (target.destroyed) continue;
            const targetScreenX = target.x - state.scrollX;
            if (
              pr.x >= targetScreenX - 55 &&
              pr.x <= targetScreenX + 55 &&
              pr.y >= target.y - 45 &&
              pr.y <= target.y + 40
            ) {
              const damage = pr.isRocket ? 55 : 18;
              target.hp -= damage;
              sound.playHitSound();
              spawnExplosion(pr.x, pr.y, '#f97316', pr.isRocket ? 16 : 7, pr.isRocket);
              state.projectiles.splice(i, 1);

              if (target.hp <= 0 && !target.destroyed) {
                target.destroyed = true;
                spawnExplosion(targetScreenX, target.y, '#f59e0b', 28, true);
                state.score += target.points;
                state.destroyedCount++;
                const upgrade = state.destroyedCount;
                state.player.hp = Math.min(210, state.player.hp + 12);
                setHp(state.player.hp);
                setScore(state.score);
                setTotalDestroyed(state.destroyedCount);
                addFloatingText(targetScreenX, target.y - 30, `+${target.points} ${target.label} مدمر! 🎯`, '#4ade80');

                // FAST VICTORY CONDITION: Destroying targets wins immediately!
                if (state.destroyedCount >= targetStationsRequired && !state.isComplete) {
                  state.isComplete = true;
                  const timeBonus = state.timeLeft * 25;
                  state.score += timeBonus;
                  setScore(state.score);
                  setVictoryReason('fast');
                  setMissionWon(true);
                  sound.playVictoryFanfare();
                }
              }
              break;
            }
          }

          // Check enemy jets (cannons hit jets, guided rockets are reserved exclusively for stations)
          if (!pr.isRocket) {
            for (const jet of state.enemyJets) {
              if (jet.destroyed) continue;
              if (Math.hypot(pr.x - jet.x, pr.y - jet.y) < 32) {
                const damage = 25;
                jet.hp -= damage;
                spawnPlaneHitEffect(pr.x, pr.y);
                state.projectiles.splice(i, 1);

                if (jet.hp <= 0 && !jet.destroyed) {
                  jet.destroyed = true;
                  spawnPlaneDestroyEffect(jet.x, jet.y);
                  state.score += 500;
                  setScore(state.score);
                  addFloatingText(jet.x, jet.y - 20, '+500 إسقاط مقاتلة! 🦅', '#38bdf8');
                }
                break;
              }
            }
          }
        } else {
          // Enemy projectile hit player
          if (Math.hypot(pr.x - p.x, pr.y - p.y) < 24) {
            const isMissile = pr.isEnemyMissile;
            const isFlak = pr.isFlak;
            const dmg = isMissile ? 26 : (isFlak ? 12 : 9);
            p.hp -= dmg;
            const remainingHp = Math.max(0, p.hp);
            setHp(remainingHp);
            state.screenShake = isMissile ? 1.4 : 0.7;
            state.vignetteAlpha = isMissile ? 0.16 : 0.10;
            setDamageVignette(state.vignetteAlpha);
            spawnPlaneHitEffect(p.x, p.y);
            state.projectiles.splice(i, 1);

            if (isMissile) {
              sound.playExplosion(1.1);
              spawnExplosion(p.x, p.y, '#ef4444', 24, true);
              addFloatingText(p.x, p.y - 20, '⚠️ إصابة صاروخ معادٍ! -26', '#ef4444');
            } else if (isFlak) {
              sound.playHitSound();
              addFloatingText(p.x, p.y - 20, '⚠️ شظايا دفاع جوي! -12', '#f97316');
            } else {
              sound.playHitSound();
              addFloatingText(p.x, p.y - 20, `إصابة طلقات معادية! -${dmg}`, '#f87171');
            }

            if (remainingHp <= 0 && !state.isComplete) {
              state.isComplete = true;
              setIsDefeated(true);
              onDefeat?.('shot_down');
              setDefeatReason('shot_down');
              sound.playDefeatSound();
              sound.playExplosion(1.4);
              spawnExplosion(p.x, p.y, '#ef4444', 36, true);
            }
          }
        }
      }

      // Update Enemy Jets with Tactical Dogfight AI & Predictive Fire
      for (let j = state.enemyJets.length - 1; j >= 0; j--) {
        const jet = state.enemyJets[j];
        if (jet.destroyed) {
          jet.y += 180 * dt;
          jet.x += (jet.vx || -200) * 0.35 * dt;
          jet.tilt = 0.55; // Nose down in fatal dive

          if (jet.y >= 440) {
            spawnPlaneHitEffect(jet.x, 445);
            spawnExplosion(jet.x, 445, '#f59e0b', 18, true);
            sound.playExplosion(1.1);
            state.enemyJets.splice(j, 1);
          }
          continue;
        }

        // Collision with player jet
        if (Math.hypot(jet.x - p.x, jet.y - p.y) < 32) {
          jet.destroyed = true;
          spawnPlaneDestroyEffect(jet.x, jet.y);
          p.hp -= 25;
          const remainingHp = Math.max(0, p.hp);
          setHp(remainingHp);
          sound.playExplosion(1.1);
          state.screenShake = 1.3;

          if (remainingHp <= 0 && !state.isComplete) {
            state.isComplete = true;
            setIsDefeated(true);
            onDefeat?.('shot_down');
            setDefeatReason('shot_down');
            sound.playDefeatSound();
            sound.playExplosion(1.4);
            spawnExplosion(p.x, p.y, '#ef4444', 36, true);
          }
        }

        // 1. Disciplined Military Flight Formations (Strictly above ground in the open sky corridor)
        jet.patternTimer = (jet.patternTimer ?? 0) + dt;
        jet.patternPhase = jet.patternPhase ?? 0;
        jet.flaresCooldown = (jet.flaresCooldown ?? 0) - dt;
        jet.baseY = jet.baseY ?? jet.y;

        const pattern = jet.attackPattern ?? 'patrol_line';

        if (!jet.badgeShown) {
          jet.badgeShown = true;
          const badgeMap: Record<string, string> = {
            patrol_line: '✈️ دورية اعتراض أفقية منتظمة',
            wingman_pair: '👥 تشكيل ثنائي مقاتل منسق',
            air_superiority: '🦅 سيادة جوية على ارتفاع شاهق',
            tactical_sweep: '🔄 مسح تكتيكي متوازن في الأجواء',
          };
          addFloatingText(jet.x, jet.y - 25, badgeMap[pattern] || 'مقاتلة معادية في الأجواء!', '#38bdf8');
        }

        // Clean, structured flight mechanics without random twitching.
        // Every enemy type keeps its own deliberately moderate cruise speed.
        const speedByType: Record<EnemyJetType, number> = {
          phantom: 165,
          mirage: 185,
          skyhawk: 150,
          nesher: 175,
          super_mystere: 140,
        };
        const jetSpeed = speedByType[jet.type ?? 'phantom'];

        if (pattern === 'patrol_line') {
          // Horizontal steady patrol at set altitude with gentle aerodynamic float
          const targetY = (jet.baseY ?? 245) + Math.sin(currentTime * 0.0018 + j) * 8;
          jet.vy = (targetY - jet.y) * 3.0;
          jet.vx = -jetSpeed;
        } else if (pattern === 'wingman_pair') {
          // Disciplined echelon pair maintaining altitude and formation
          const targetY = (jet.baseY ?? (jet.patternPhase === 0 ? 160 : 220)) + Math.sin(currentTime * 0.0015 + j) * 6;
          jet.vy = (targetY - jet.y) * 3.0;
          jet.vx = -jetSpeed;
        } else if (pattern === 'air_superiority') {
          // Interceptor staying comfortably in mid-high sky (Y=150 to 185)
          const targetY = (jet.baseY ?? 165) + Math.sin(currentTime * 0.002 + j) * 10;
          jet.vy = (targetY - jet.y) * 3.0;
          jet.vx = -Math.min(190, jetSpeed + 8);
        } else {
          // Tactical sweep: Predictable, gentle mid-sky wave (amplitude 18px)
          const sweepY = (jet.baseY ?? 210) + Math.sin(currentTime * 0.0022 + j * 1.2) * 18;
          jet.vy = (sweepY - jet.y) * 2.8;
          jet.vx = -Math.max(135, jetSpeed - 5);
        }

        // Guided rockets fly directly down to ground stations, jets do not intercept them

        // Apply smooth movement
        jet.x += jet.vx * dt;
        jet.y += jet.vy * dt;

        // STRICT CORRIDOR: Always stay well above ground and below radar (living jets strictly stay between 135 and 310)
        jet.y = Math.max(135, Math.min(310, jet.y));
        jet.tilt = Math.max(-0.25, Math.min(0.25, (jet.vy / 200) * 0.3));

        // 3. Intelligent Predictive Firing AI
        const distToPlayer = Math.hypot(jet.x - p.x, jet.y - p.y);
        const isAheadOfPlayer = jet.x > p.x + 30 && jet.x < canvas.width + 40;

        // Timers update
        jet.burstCooldown = (jet.burstCooldown ?? (2.4 + Math.random() * 1.2)) - dt;
        jet.burstRemaining = jet.burstRemaining ?? 0;
        jet.missileCooldown = (jet.missileCooldown ?? (8.5 + Math.random() * 3.5)) - dt;
        jet.lastBurstTime = jet.lastBurstTime ?? 0;

        if (isAheadOfPlayer) {
          // A. Air-to-Air Guided Missile Attack (Shafrir / Sidewinder)
          if (
            distToPlayer > 200 &&
            distToPlayer < 640 &&
            Math.abs(jet.y - p.y) < 70 &&
            jet.missileCooldown <= 0
          ) {
            jet.missileCooldown = 12.0 + Math.random() * 3.0;
            sound.playMissileLaunch();
            sound.playTargetLock();
            state.projectiles.push({
              x: jet.x - 28,
              y: jet.y + 4,
              vx: -360,
              vy: (p.y - jet.y) * 0.42,
              isRocket: true,
              fromPlayer: false,
              isEnemyMissile: true,
            });
            addFloatingText(jet.x, jet.y - 22, '⚠️ صاروخ جو-جو معادٍ مقبل!', '#ef4444');
          }

          // B. Predictive Autocannon Burst Firing (Deflection Shooting)
          if (distToPlayer < 800) {
            if (jet.burstRemaining > 0) {
              const shotInterval = pattern === 'air_superiority' ? 170 : 205;
              if (currentTime - jet.lastBurstTime >= shotInterval) {
                jet.lastBurstTime = currentTime;
                jet.burstRemaining--;
                sound.playGunshot();

                // Advanced lead calculation
                const bulletSpeed = pattern === 'air_superiority' ? 500 : 470;
                const timeToTarget = distToPlayer / bulletSpeed;
                // Predict where MiG-21 will be based on velocity
                const predX = p.x + (p.vx || 0) * timeToTarget * 0.85;
                const predY = Math.max(70, Math.min(270, p.y + (p.vy || 0) * timeToTarget * 0.85));

                const bdx = predX - (jet.x - 22);
                const bdy = predY - jet.y;
                const angle = Math.atan2(bdy, bdx) + (Math.random() - 0.5) * 0.05;

                state.projectiles.push({
                  x: jet.x - 22,
                  y: jet.y,
                  vx: Math.cos(angle) * bulletSpeed,
                  vy: Math.sin(angle) * bulletSpeed,
                  isRocket: false,
                  fromPlayer: false,
                });

                // Muzzle flash particle at enemy nose
                state.particles.push({
                  x: jet.x - 24,
                  y: jet.y,
                  vx: -40,
                  vy: (Math.random() - 0.5) * 20,
                  life: 1,
                  maxLife: 8,
                  color: '#fef08a',
                  size: 4,
                });
              }
            } else if (jet.burstCooldown <= 0) {
              const angleToPlayer = Math.atan2(p.y - jet.y, p.x - jet.x);
              if (Math.abs(angleToPlayer - Math.PI) < 0.7 || Math.abs(angleToPlayer + Math.PI) < 0.7) {
                jet.burstRemaining = pattern === 'air_superiority' ? 4 : 3;
                jet.burstCooldown = pattern === 'air_superiority' ? 2.9 : (3.2 + Math.random() * 1.2);
                jet.lastBurstTime = currentTime - 90;
              }
            }
          }
        }

        if (jet.x < -80) state.enemyJets.splice(j, 1);
      }

      // Ground Stations Anti-Air FLAK Defense & Smoke Plumes
      for (const target of state.targets) {
        const sx = target.x - state.scrollX;
        const onScreen = sx > -40 && sx < canvas.width + 40;

        if (target.destroyed) {
          // Continuous smoke plumes from destroyed ground stations
          if (onScreen && Math.random() < 0.22) {
            state.particles.push({
              x: sx + (Math.random() - 0.5) * 16,
              y: target.y - 8,
              vx: (Math.random() - 0.5) * 6 + 4,
              vy: -18 - Math.random() * 12,
              life: 1,
              maxLife: 32,
              color: '#3f3f46',
              size: Math.random() * 3 + 2,
              isSmoke: true,
              growth: 0.08,
            });
          }
        } else if (onScreen) {
          // Active enemy ground station anti-air defense (Flak & SAM)
          target.flakTimer = (target.flakTimer ?? (2.0 + Math.random() * 1.5)) - dt;
          if (target.flakTimer <= 0) {
            target.flakTimer = 2.2 + Math.random() * 1.3;
            sound.playCannon();

            // Calculate trajectory to player's altitude
            const leadPx = p.x + (p.vx || 0) * 0.7;
            const leadPy = p.y + (p.vy || 0) * 0.7;
            const fdx = leadPx - sx;
            const fdy = leadPy - (target.y - 20);
            const fdist = Math.hypot(fdx, fdy) || 1;
            const fSpeed = 540;

            state.projectiles.push({
              x: sx,
              y: target.y - 20,
              vx: (fdx / fdist) * fSpeed,
              vy: (fdy / fdist) * fSpeed,
              isRocket: false,
              fromPlayer: false,
              isFlak: true,
              flakDetonationY: Math.max(50, Math.min(430, leadPy + (Math.random() - 0.5) * 35)),
            });

            // Ground muzzle flash and smoke
            state.particles.push({
              x: sx,
              y: target.y - 22,
              vx: (Math.random() - 0.5) * 15,
              vy: -30,
              life: 1,
              maxLife: 15,
              color: '#f97316',
              size: 5,
            });
          }
        }
      }

      // Draw Scene
      ctx.save();
      if (state.screenShake > 0) {
        const shakePower = Math.min(1.4, state.screenShake);
        const sx = (Math.random() - 0.5) * shakePower * 0.25;
        const sy = (Math.random() - 0.5) * shakePower * 0.25;
        ctx.translate(sx, sy);
      }

      // 1. Dynamic Egyptian Desert Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.78);
      skyGrad.addColorStop(0, '#041d3b');      // Deep Egyptian stratosphere
      skyGrad.addColorStop(0.28, '#0b3b68');   // High-altitude azure
      skyGrad.addColorStop(0.58, '#1e5b8d');   // Warm lower atmosphere
      skyGrad.addColorStop(0.82, '#d97706');   // Golden desert horizon
      skyGrad.addColorStop(1, '#f59e0b');      // Radiant sunlit amber
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. High-Altitude Sinai Sun & Luminous Corona (ساعة الصفر 14:00)
      const sunX = canvas.width - 150;
      const sunY = 65;

      // God rays / Sunbeams piercing down
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#fef08a';
      for (let r = -2; r <= 3; r++) {
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        const spread = r * 110;
        ctx.lineTo(sunX + spread - 70, canvas.height);
        ctx.lineTo(sunX + spread + 70, canvas.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Outer golden sun halo
      const sunHalo = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 150);
      sunHalo.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      sunHalo.addColorStop(0.22, 'rgba(254, 240, 138, 0.65)');
      sunHalo.addColorStop(0.55, 'rgba(245, 158, 11, 0.22)');
      sunHalo.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 150, 0, Math.PI * 2);
      ctx.fill();

      // Core brilliant sun disc
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
      ctx.fill();

      // 3. High-Altitude Golden Cirrus Clouds (Parallax Wisps)
      ctx.save();
      ctx.fillStyle = 'rgba(254, 243, 199, 0.2)';
      for (let c = 0; c < 5; c++) {
        const cx = ((c * 270) - (state.scrollX * 0.04) % (canvas.width + 350));
        const cy = 35 + (c % 3) * 24;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 85, 12, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(253, 230, 138, 0.15)';
      for (let c = 0; c < 4; c++) {
        const cx = ((c * 320 + 100) - (state.scrollX * 0.08) % (canvas.width + 450));
        const cy = 70 + (c % 2) * 30;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 110, 16, 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. Far Sinai Mountain Range (جبال الراحة وجبل الحلال البعيدة)
      const farMtnGrad = ctx.createLinearGradient(0, 240, 0, 340);
      farMtnGrad.addColorStop(0, '#2e2640'); // Atmospheric slate purple
      farMtnGrad.addColorStop(1, '#57415e');
      ctx.fillStyle = farMtnGrad;
      ctx.beginPath();
      ctx.moveTo(0, 310);
      for (let x = 0; x <= canvas.width + 30; x += 30) {
        const mx = (x + state.scrollX * 0.1) % (canvas.width * 2.5);
        const my = Math.sin(mx * 0.01) * 36 + Math.cos(mx * 0.022) * 20;
        ctx.lineTo(x, 290 + my);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // 5. Mid Mountain Escarpments & Desert Ridges (هضاب وتلال سيناء الصخرية)
      const midMtnGrad = ctx.createLinearGradient(0, 310, 0, 390);
      midMtnGrad.addColorStop(0, '#78350f'); // Warm terracotta burnt sienna
      midMtnGrad.addColorStop(1, '#9a3412');
      ctx.fillStyle = midMtnGrad;
      ctx.beginPath();
      ctx.moveTo(0, 360);
      for (let x = 0; x <= canvas.width + 25; x += 25) {
        const mx = (x + state.scrollX * 0.25) % (canvas.width * 2);
        const my = Math.sin(mx * 0.018) * 26 + Math.cos(mx * 0.035) * 12;
        ctx.lineTo(x, 350 + my);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // 6. Near Rolling Sand Dunes with Sunlit Crests (كثبان رمال سيناء المتموجة)
      const duneGrad = ctx.createLinearGradient(0, 365, 0, 430);
      duneGrad.addColorStop(0, '#f59e0b'); // Radiant golden sand
      duneGrad.addColorStop(0.5, '#d97706');
      duneGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = duneGrad;
      ctx.beginPath();
      ctx.moveTo(0, 400);
      for (let x = 0; x <= canvas.width + 20; x += 20) {
        const mx = (x + state.scrollX * 0.5) % (canvas.width * 2);
        const my = Math.sin(mx * 0.024) * 18;
        ctx.lineTo(x, 395 + my);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // 7. Solid Sinai Desert Ground Floor & Battlefield (أرض صحراء سيناء الشاسعة الواضحة)
      // Ground is clearly visible from y = 410 to canvas bottom (150px of detailed terrain)
      const groundGrad = ctx.createLinearGradient(0, 410, 0, canvas.height);
      groundGrad.addColorStop(0, '#d97706'); // Warm desert golden sand
      groundGrad.addColorStop(0.35, '#b45309'); // Sinai terracotta earth
      groundGrad.addColorStop(0.75, '#92400e'); // Deep bedrock
      groundGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 410, canvas.width, canvas.height - 410);

      // Desert sand ripples & vehicle tracks
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.28)';
      ctx.lineWidth = 1.4;
      for (let rx = 0; rx < canvas.width; rx += 50) {
        const sxR = (rx - (state.scrollX * 0.85) % 90);
        ctx.beginPath();
        ctx.moveTo(sxR, 442);
        ctx.lineTo(sxR + 24, 445);
        ctx.moveTo(sxR + 15, 482);
        ctx.lineTo(sxR + 42, 485);
        ctx.stroke();
      }

      // Military Patrol Asphalt Road (طريق الإمداد والتموين الصحراوي)
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, 515, canvas.width, 24);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([16, 14]);
      ctx.beginPath();
      ctx.moveTo(0, 527);
      ctx.lineTo(canvas.width, 527);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 8. West Bank Date Palm Trees (واحات ونخيل غرب القناة)
      ctx.save();
      for (let pIdx = 0; pIdx < 7; pIdx++) {
        const px = ((pIdx * 180 + 50) - (state.scrollX * 0.75) % (canvas.width + 250));
        const py = 422;
        // Trunk
        ctx.strokeStyle = '#573315';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + 3, py - 14, px + 2, py - 26);
        ctx.stroke();
        // Green Palm Fronds
        ctx.fillStyle = '#15803d';
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3;
          ctx.beginPath();
          ctx.ellipse(px + 2 + Math.cos(ang) * 9, py - 26 + Math.sin(ang) * 4.5, 8, 2.8, ang, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 9. Suez Canal Waterway Shoreline (مجرى قناة السويس العظيم)
      const canalY = 546;
      const canalH = 14;
      const canalGrad = ctx.createLinearGradient(0, canalY, 0, canvas.height);
      canalGrad.addColorStop(0, '#0284c7');   // Azure turquoise shoreline
      canalGrad.addColorStop(0.5, '#0369a1');  // Deep blue channel
      canalGrad.addColorStop(1, '#075985');
      ctx.fillStyle = canalGrad;
      ctx.fillRect(0, canalY, canvas.width, canalH);

      // Canal Water Sunlight Ripples
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.lineWidth = 1.4;
      for (let w = 0; w < canvas.width; w += 40) {
        const wx = (w - (state.scrollX * 1.05) % 80);
        ctx.beginPath();
        ctx.moveTo(wx, canalY + 5);
        ctx.lineTo(wx + 20, canalY + 5);
        ctx.stroke();
      }
      ctx.restore();

      // 10. Bar-Lev Line High Sand Wall Profile on East Bank (الساتر الترابي لخط بارليف)
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(0, 420);
      for (let x = 0; x <= canvas.width + 30; x += 30) {
        const mx = (x + state.scrollX * 0.85) % 360;
        const by = Math.sin(mx * 0.03) * 5;
        ctx.lineTo(x, 412 + by);
      }
      ctx.lineTo(canvas.width, 424);
      ctx.lineTo(0, 424);
      ctx.fill();

      // Ground Targets (Stations)
      for (const target of state.targets) {
        const sx = target.x - state.scrollX;

        // Off-screen indicator on the right edge if station is coming up soon
        if (sx > canvas.width && sx < canvas.width + 600 && !target.destroyed) {
          const distMeters = Math.round((sx - canvas.width) * 2);
          ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
          ctx.beginPath();
          ctx.roundRect(canvas.width - 150, canvas.height - 105, 140, 26, 6);
          ctx.fill();
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#0c0a09';
          ctx.textAlign = 'center';
          ctx.fillText(`🎯 ${target.label}: ${distMeters}م ⬅️`, canvas.width - 80, canvas.height - 88);
        }

        if (sx < -140 || sx > canvas.width + 140) continue;

        if (target.destroyed) {
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.ellipse(sx, target.y + 10, 50, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(sx, target.y + 5, 14, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, target.y, 48, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(sx - 54, target.y);
          ctx.lineTo(sx - 42, target.y);
          ctx.moveTo(sx + 42, target.y);
          ctx.lineTo(sx + 54, target.y);
          ctx.moveTo(sx, target.y - 54);
          ctx.lineTo(sx, target.y - 42);
          ctx.moveTo(sx, target.y + 42);
          ctx.lineTo(sx, target.y + 54);
          ctx.stroke();

          if (target.type === 'radar') {
            ctx.fillStyle = '#334155';
            ctx.fillRect(sx - 18, target.y - 34, 36, 46);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(sx, target.y - 36, 20, Math.PI * 0.8, Math.PI * 1.8);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#cbd5e1';
            ctx.stroke();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, target.y - 36, 28 + (currentTime * 0.02 % 15), 0, Math.PI * 2);
            ctx.stroke();

            // Israeli Star of David emblem on enemy radar housing
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, target.y - 12, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx, target.y - 16);
            ctx.lineTo(sx + 3.5, target.y - 10);
            ctx.lineTo(sx - 3.5, target.y - 10);
            ctx.closePath();
            ctx.moveTo(sx, target.y - 8);
            ctx.lineTo(sx + 3.5, target.y - 14);
            ctx.lineTo(sx - 3.5, target.y - 14);
            ctx.closePath();
            ctx.stroke();
          } else if (target.type === 'runway') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(sx - 55, target.y - 15, 110, 26);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(sx - 45, target.y - 4, 90, 4);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(sx - 45, target.y - 12, 3, 0, Math.PI * 2);
            ctx.arc(sx + 45, target.y - 12, 3, 0, Math.PI * 2);
            ctx.fill();

            // Israeli emblem on runway tarmac
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, target.y - 4, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 0.9;
            ctx.stroke();
          } else {
            ctx.fillStyle = '#57534e';
            ctx.beginPath();
            ctx.roundRect(sx - 40, target.y - 30, 80, 42, [12, 12, 0, 0]);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(sx - 24, target.y - 14, 48, 10);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(sx - 16, target.y + 2, 32, 4);

            // Israeli emblem on bunker wall
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx + 24, target.y - 18, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Health bar
          const barWidth = 70;
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(sx - barWidth / 2, target.y - 50, barWidth, 7);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(sx - barWidth / 2, target.y - 50, (target.hp / target.maxHp) * barWidth, 7);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - barWidth / 2, target.y - 50, barWidth, 7);

          ctx.font = 'bold 12px Cairo, sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.fillText(`🎯 ${target.label}`, sx, target.y - 58);
        }
      }

      // Enemy Jets (المقاتلات الإسرائيلية المعادية - فانتوم وميراج بنجمة داوود وشارات التمييز)
      for (const jet of state.enemyJets) {
        ctx.save();
        ctx.translate(jet.x, jet.y);
        ctx.scale(-1, 1); // Facing left towards Egyptian player
        if (jet.tilt) {
          ctx.rotate(-jet.tilt); // Smooth aerodynamic banking
        }

        if (jet.destroyed) {
          // Burning wreckage silhouette
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.moveTo(36, 0);
          ctx.lineTo(-24, -12);
          ctx.lineTo(-14, 0);
          ctx.lineTo(-24, 12);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          continue;
        }

        const visual = {
          phantom: { body: '#b45309', wing: '#ca8a04', accent: '#4d7c0f', label: 'فانتوم F-4' },
          mirage: { body: '#64748b', wing: '#94a3b8', accent: '#334155', label: 'ميراج III' },
          skyhawk: { body: '#78716c', wing: '#a8a29e', accent: '#57534e', label: 'سكاي هوك A-4' },
          nesher: { body: '#a16207', wing: '#d6a84f', accent: '#3f6212', label: 'نيشر' },
          super_mystere: { body: '#475569', wing: '#cbd5e1', accent: '#1e293b', label: 'سوبر ميستير' },
        }[jet.type ?? 'phantom'];

        // 1. Twin-Engine Afterburner Exhaust Glow
        const jGlow = 10 + Math.sin(currentTime * 0.05) * 4;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.beginPath();
        if (jet.type === 'phantom') {
          ctx.ellipse(-30, -5, jGlow, 3.5, 0, 0, Math.PI * 2);
          ctx.ellipse(-30, 5, jGlow, 3.5, 0, 0, Math.PI * 2);
        } else {
          ctx.ellipse(-30, 0, jGlow, 3.5, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // 2. Fuselage (Israeli Desert Tan & Olive Camouflage)
        ctx.fillStyle = visual.body;
        ctx.beginPath();
        ctx.moveTo(46, 0);         // Pointed nose radome
        ctx.lineTo(24, -8);
        ctx.lineTo(-24, -11);
        ctx.lineTo(-32, -6);
        ctx.lineTo(-32, 6);
        ctx.lineTo(-24, 11);
        ctx.lineTo(24, 8);
        ctx.closePath();
        ctx.fill();

        // Camouflage green patches
        ctx.fillStyle = visual.accent;
        ctx.beginPath();
        ctx.ellipse(4, -3, 14, 5.5, -0.15, 0, Math.PI * 2);
        ctx.ellipse(-14, 4, 12, 5, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Black Nose Radome
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(46, 0);
        ctx.lineTo(34, -4);
        ctx.lineTo(34, 4);
        ctx.closePath();
        ctx.fill();

        // 3. Cockpit Canopy (Twin seats)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(14, -5, 13, 5, -0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4. Aircraft-specific wing geometry
        ctx.fillStyle = visual.wing;
        if (jet.type === 'skyhawk') {
          // Compact attack aircraft: broad, shorter straight wings.
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-12, -24);
          ctx.lineTo(-30, -20);
          ctx.lineTo(-18, 0);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-12, 24);
          ctx.lineTo(-30, 20);
          ctx.lineTo(-18, 0);
          ctx.closePath();
          ctx.fill();
        } else if (jet.type === 'phantom') {
          // Heavy twin-engine interceptor: large swept wings.
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-14, -34);
          ctx.lineTo(-26, -30);
          ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-14, 34);
          ctx.lineTo(-26, 30);
          ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          // Mirage / Nesher: sharp delta-wing silhouette.
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-22, -38);
          ctx.lineTo(-30, -28);
          ctx.lineTo(-12, 0);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-22, 38);
          ctx.lineTo(-30, 28);
          ctx.lineTo(-12, 0);
          ctx.closePath();
          ctx.fill();
        }

        // October 1973 Yellow Identification Triangle with black border
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(-14, -34);
        ctx.lineTo(-22, -22);
        ctx.lineTo(-8, -22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-14, 34);
        ctx.lineTo(-22, 22);
        ctx.lineTo(-8, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 5. Star of David Roundels (نجمة داوود الإسرائيلية على الجناحين)
        // White circular background & blue Star of David on top wing
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-14, -16, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Blue 6-pointed Star of David (نجمة سداسية زرقاء واضحة)
        const drawStarOfDavid = (starX: number, starY: number, starR: number) => {
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 1.4;
          // Triangle 1 (up)
          ctx.beginPath();
          ctx.moveTo(starX, starY - starR);
          ctx.lineTo(starX + starR * 0.866, starY + starR * 0.5);
          ctx.lineTo(starX - starR * 0.866, starY + starR * 0.5);
          ctx.closePath();
          ctx.stroke();
          // Triangle 2 (down)
          ctx.beginPath();
          ctx.moveTo(starX, starY + starR);
          ctx.lineTo(starX + starR * 0.866, starY - starR * 0.5);
          ctx.lineTo(starX - starR * 0.866, starY - starR * 0.5);
          ctx.closePath();
          ctx.stroke();
        };

        drawStarOfDavid(-14, -16, 6);

        // Star of David on bottom wing as well!
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-14, 16, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        drawStarOfDavid(-14, 16, 6);

        // 6. Vertical Tail Fin with Tail Star
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-36, -20);
        ctx.lineTo(-28, -20);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();

        // Mini Star of David on tail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-26, -12, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1;
        ctx.stroke();
        drawStarOfDavid(-26, -12, 3);

        ctx.restore();

        // Floating Tactical Tag: "مقاتلة معادية (فانتوم)" with Health Bar
        if (!jet.destroyed) {
          ctx.save();
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.textAlign = 'center';

          // Dark badge with red outline
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.roundRect(jet.x - 65, jet.y - 44, 130, 20, 6);
          ctx.fill();
          ctx.stroke();

          // Flag and label
          ctx.fillStyle = '#fca5a5';
          ctx.fillText('مقاتلة إسرائيلية معادية 🇮🇱', jet.x, jet.y - 30);

          // Mini HP bar
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(jet.x - 30, jet.y - 22, 60, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(jet.x - 30, jet.y - 22, Math.max(0, (jet.hp / Math.max(1, jet.maxHp ?? 25)) * 60), 4);
          ctx.restore();
        }
      }

      // Projectiles
      for (const pr of state.projectiles) {
        if (pr.isRocket) {
          if (pr.isEnemyMissile) {
            // Hostile air-to-air missile (Shafrir / Sidewinder)
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Exhaust flame & smoke trail
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pr.x, pr.y);
            ctx.lineTo(pr.x + 24, pr.y - (pr.vy * 0.04));
            ctx.stroke();
            ctx.restore();
          } else {
            // Player rocket
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fed7aa';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pr.x, pr.y);
            ctx.lineTo(pr.x - 26, pr.y - (pr.vy * 0.04));
            ctx.stroke();

            // Rocket glow
            ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (pr.isFlak) {
          // Israeli Anti-Air Flak Shell
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f59e0b';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(pr.x, pr.y);
          ctx.lineTo(pr.x - pr.vx * 0.035, pr.y - pr.vy * 0.035);
          ctx.stroke();
          ctx.restore();
        } else {
          if (pr.fromPlayer) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#38bdf8';
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(pr.x - 16, pr.y - 2, 32, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(pr.x - 8, pr.y - 1, 18, 2);
            ctx.shadowBlur = 0;
          } else {
            // Enemy heavy autocannon tracer
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(pr.x - 14, pr.y - 2.5, 28, 5);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(pr.x - 7, pr.y - 1.5, 14, 3);
            ctx.shadowBlur = 0;
          }
        }
      }

      // Render Momentary Flash Shockwaves (Thin crisp ring only - NO filled disc covering the screen)
      ctx.save();
      for (let s = state.shockwaves.length - 1; s >= 0; s--) {
        const sw = state.shockwaves[s];
        sw.radius += (sw.maxRadius - sw.radius) * 14 * dt;
        sw.alpha -= 5.5 * dt;
        if (sw.alpha <= 0) {
          state.shockwaves.splice(s, 1);
          continue;
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2 * sw.alpha;
        ctx.globalAlpha = Math.max(0, sw.alpha * 0.7);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Particles (Dense Billowing Black Smoke, Fire, Shrapnel)
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        if (pt.gravity) pt.vy += pt.gravity * dt;
        pt.x += pt.vx * dt * 60;
        pt.y += pt.vy * dt * 60;
        if (pt.growth) pt.size += pt.growth;
        pt.life++;
        ctx.fillStyle = pt.color;
        const progress = pt.life / pt.maxLife;
        ctx.globalAlpha = Math.max(0, pt.isSmoke ? (1 - progress) * 0.85 : 1 - progress);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        if (pt.life >= pt.maxLife) state.particles.splice(i, 1);
      }

      // Floating Texts
      for (let t = state.floatingTexts.length - 1; t >= 0; t--) {
        const ft = state.floatingTexts[t];
        ft.y -= 35 * dt;
        ft.life++;
        ctx.font = 'bold 13px Cairo, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
        if (ft.life >= ft.maxLife) state.floatingTexts.splice(t, 1);
      }

      // Player Jet MiG-21 (المقاتلة المصرية ميج-21 بعلم وشعار القوات الجوية المصرية)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tilt);

      // 1. Afterburner Jet Flame
      const flameLen = 22 + Math.sin(currentTime * 0.05) * 8;
      const flameGrad = ctx.createLinearGradient(-34, 0, -34 - flameLen, 0);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#38bdf8');
      flameGrad.addColorStop(0.7, '#f59e0b');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(-34 - flameLen / 2, 0, flameLen / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Fuselage (Egyptian Desert & Olive Camouflage)
      ctx.fillStyle = '#15803d'; // Egyptian olive green base
      ctx.beginPath();
      ctx.moveTo(50, 0);        // Nose tip
      ctx.lineTo(40, -6);
      ctx.lineTo(-28, -9);
      ctx.lineTo(-36, -5);
      ctx.lineTo(-36, 5);
      ctx.lineTo(-28, 9);
      ctx.lineTo(40, 6);
      ctx.closePath();
      ctx.fill();

      // Desert sand camouflage patches
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.ellipse(14, -2, 16, 5, -0.15, 0, Math.PI * 2);
      ctx.ellipse(-12, 2, 14, 5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Conical Nose Shock Cone (مخروط السحب المميز لميج-21)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(54, 0);
      ctx.lineTo(46, -3);
      ctx.lineTo(46, 3);
      ctx.closePath();
      ctx.fill();

      // Needle Pitot Boom
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(54, 0);
      ctx.lineTo(62, 0);
      ctx.stroke();

      // 3. Cockpit Canopy (Sky Blue Glass with Reflection)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(14, -4, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(12, -4, 10, -Math.PI * 0.7, -Math.PI * 0.2);
      ctx.stroke();

      // 4. Classic MiG-21 Delta Wings (أجنحة دلتا المثلثية)
      ctx.fillStyle = '#166534';
      // Upper Wing
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-18, -32);
      ctx.lineTo(-28, -24);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      // Lower Wing
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-18, 32);
      ctx.lineTo(-28, 24);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();

      // Wing-Tip Missiles (صواريخ جو-جو أتول)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-22, -33, 14, 2.5);
      ctx.fillRect(-22, 31, 14, 2.5);
      ctx.fillStyle = '#ef4444'; // Red seeker
      ctx.fillRect(-8, -33, 3, 2.5);
      ctx.fillRect(-8, 31, 3, 2.5);

      // 5. Official Egyptian Air Force Roundel (شعار القوات الجوية المصرية)
      // Red outer, White middle, Black center with golden eagle
      const drawRoundel = (rx: number, ry: number, r: number) => {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rx, ry, r * 0.66, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(rx, ry, r * 0.33, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(rx, ry, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      };

      drawRoundel(-16, -16, 7.5);
      drawRoundel(-16, 16, 7.5);

      // 6. Vertical Tail Fin with Egyptian Flag Stripes (علم مصر على ذيل الطائرة)
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-36, -22);
      ctx.lineTo(-28, -22);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();

      // Egyptian Flag (Red, White with Eagle, Black)
      const flagX = -31, flagY = -18;
      ctx.fillStyle = '#dc2626'; // Red
      ctx.fillRect(flagX, flagY, 8, 3);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(flagX, flagY + 3, 8, 3);
      ctx.fillStyle = '#ca8a04'; // Eagle
      ctx.fillRect(flagX + 3, flagY + 4, 2, 1.5);
      ctx.fillStyle = '#000000'; // Black
      ctx.fillRect(flagX, flagY + 6, 8, 3);

      ctx.restore();

      // Floating Tactical Identification Tag: "نسر الجو: مقاتلة ميج-21 مصرية 🇪🇬"
      ctx.save();
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(p.x - 72, p.y - 44, 144, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#4ade80';
      ctx.fillText('نسر الجو: مقاتلة ميج-21 مصرية 🇪🇬', p.x, p.y - 30);
      ctx.restore();

      // TACTICAL RADAR
      const radarX = canvas.width - 80;
      const radarY = 80;
      const radarRadius = 55;

      ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarRadius * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(radarX - radarRadius, radarY);
      ctx.lineTo(radarX + radarRadius, radarY);
      ctx.moveTo(radarX, radarY - radarRadius);
      ctx.lineTo(radarX, radarY + radarRadius);
      ctx.stroke();

      // Radar Sweep Line
      const sweepX = radarX + Math.cos(state.radarAngle) * radarRadius;
      const sweepY = radarY + Math.sin(state.radarAngle) * radarRadius;
      const radarSweepGrad = ctx.createLinearGradient(radarX, radarY, sweepX, sweepY);
      radarSweepGrad.addColorStop(0, 'rgba(52, 211, 153, 0.1)');
      radarSweepGrad.addColorStop(1, 'rgba(52, 211, 153, 0.9)');
      ctx.strokeStyle = radarSweepGrad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(radarX, radarY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Player Blip
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(radarX, radarY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Stations on Radar
      for (const t of state.targets) {
        if (t.destroyed) continue;
        const distFromPlayer = (t.x - (state.scrollX + p.x));
        if (distFromPlayer >= -200 && distFromPlayer <= 1400) {
          const radarDist = (distFromPlayer / 1400) * (radarRadius - 8);
          const rx = radarX + radarDist;
          const ry = radarY + 16;
          if (Math.hypot(rx - radarX, ry - radarY) < radarRadius - 4) {
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rx, ry, 6 + Math.sin(currentTime * 0.01) * 3, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Enemy Jets on Radar
      for (const jet of state.enemyJets) {
        if (jet.destroyed) continue;
        const jrel = (jet.x - p.x) / canvas.width;
        const jrx = radarX + jrel * radarRadius * 1.2;
        const jry = radarY + (jet.y - p.y) * 0.15;
        if (Math.hypot(jrx - radarX, jry - radarY) < radarRadius - 4) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(jrx, jry, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.font = 'bold 10px Cairo, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.fillText('رادار الكشف الميداني', radarX, radarY - radarRadius - 6);

      // Subtle Red Vignette on Canvas for Proximity Damage & Radar/Ground Danger
      if (state.vignetteAlpha > 0.02) {
        const vigGrad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.height * 0.28,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.62
        );
        vigGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        vigGrad.addColorStop(0.65, `rgba(220, 38, 38, ${Math.min(0.35, state.vignetteAlpha * 0.45)})`);
        vigGrad.addColorStop(1, `rgba(185, 28, 28, ${Math.min(0.75, state.vignetteAlpha * 0.85)})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-stone-900 shadow-2xl">
      {/* Clean Combat Top HUD */}
      <div className="desktop-only-bar p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {onOpenTutorialVideo && (
            <button
              onClick={onOpenTutorialVideo}
              className="px-2.5 py-1.5 rounded-lg bg-red-600/25 hover:bg-red-600/40 text-red-300 hover:text-white border border-red-500/50 text-xs font-bold font-cairo transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
              title="مشاهدة فيديو الشرح التكتيكي (يوقف اللعبة مؤقتاً)"
            >
              <Video className="w-4 h-4 text-red-400" />
              <span>فيديو الشرح 🎬</span>
            </button>
          )}
          <div>
            <h2 className="text-base font-bold font-cairo text-amber-400">الضربة الجوية المفاجئة (ساعة الصفر 14:00)</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 font-bold">ميج-21 مصرية 🇪🇬</span>
              <span className="text-stone-500">ضد</span>
              <span className="text-red-400 font-bold">مقاتلات إسرائيلية معادية 🇮🇱</span>
            </div>
          </div>
        </div>

        {/* Tactical Metrics & Direct Rocket Control */}
        <div className="flex items-center gap-2 sm:gap-5 text-[11px] sm:text-xs font-semibold flex-wrap justify-end">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              timeLeft <= 30
                ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-stone-900 border-stone-800 text-amber-400'
            }`}
          >
            <Clock className={`w-4 h-4 ${timeLeft <= 30 ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className="text-stone-300 font-bold">المؤقت:</span>
            <span className={`font-mono text-sm font-black tabular-nums ${timeLeft <= 30 ? 'text-red-400' : 'text-amber-400'}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-amber-300 font-mono font-bold">
            <span className="text-stone-400 font-cairo">السكور:</span>
            <span>{score}</span>
          </div>

          {/* Remaining Stations */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 font-mono font-bold shadow-sm">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-stone-300 font-cairo text-xs">المحطات المتبقية:</span>
            <span className="text-emerald-300 text-sm font-black">{Math.max(0, targetStationsRequired - totalDestroyed)}</span>
            <span className="text-[10px] text-stone-400 font-cairo">محطات ({totalDestroyed}/{targetStationsRequired})</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] font-bold text-amber-300 font-mono">
            {config.badge}
          </span>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-xs">
            <span className="text-stone-400">الارتفاع:</span>
            <span className={`font-mono font-bold tabular-nums ${isGroundDanger ? 'text-red-400 font-black' : 'text-sky-400'}`}>
              {playerAltitude} م
            </span>
          </div>

          {/* Health */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-stone-900 border border-stone-800">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-16 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${Math.min(100, (hp / 210) * 100)}%` }} />
            </div>
            <span className="font-mono tabular-nums text-emerald-300 text-xs font-bold">{Math.round((hp / 210) * 100)}%</span>
          </div>

          {/* Casualties / Hits Taken */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono font-bold text-xs ${
            hitsTaken > 0 ? 'bg-red-950/60 border-red-800 text-red-400' : 'bg-stone-900 border-stone-800 text-stone-400'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-stone-400 font-cairo">الإصابات:</span>
            <span>{hitsTaken}</span>
          </div>

          <div className="hidden lg:block px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
            تطوير الطائرة ×{totalDestroyed}
          </div>

          <button
            onClick={() => fireRocket()}
            disabled={rockets <= 0}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow active:scale-95"
            title="صاروخ موجه مخصص لضرب المحطات الأرضية الاستراتيجية فقط (8 صواريخ للمهمة)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>صاروخ موجه للمحطات [{rockets}/8]</span>
          </button>
        </div>
      </div>

      {/* Battle Telemetry */}
      <div className="desktop-only-bar px-4 py-1.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs text-stone-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-amber-400">{currentAlert}</span>
        </div>
        <div className="hidden sm:block text-stone-300 font-bold text-[11px]">
          ✈️ تحكم مباشر بحركة الفأرة في كل الاتجاهات · انقر باليسار لإطلاق المدافع · انقر باليمين للصواريخ
        </div>
      </div>

      {!missionWon && !isDefeated && isCombatActive && (
        <div className="desktop-only-bar px-3 sm:px-4 py-1.5 bg-stone-950 border-b border-stone-800/80 flex items-center gap-2 overflow-x-auto text-[10px] whitespace-nowrap">
          <span className="text-stone-500 font-bold">جدول الأهداف:</span>
          {SCHEDULE.map((item, index) => (
            <span
              key={item.sec}
              className={`px-2 py-0.5 rounded border ${index < totalDestroyed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : item.sec === 90 ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-stone-900 border-stone-800 text-stone-400'}`}
            >
              {String(Math.floor(item.sec / 60)).padStart(2, '0')}:{String(item.sec % 60).padStart(2, '0')} · {index + 1}{index === 5 ? ' (احتياطي)' : ''}
            </span>
          ))}
        </div>
      )}

      <div className="desktop-only-bar sm:hidden px-3 py-1.5 bg-amber-500/5 border-b border-amber-500/15 text-center text-[10px] text-amber-300">
        📱 حرّك إصبعك لتوجيه المقاتلة · اضغط زر الصاروخ · اللمس المستمر يطلق المدافع
      </div>

      {/* Canvas Area with smooth subtle shake and gentle vignette overlay */}
      <div
        className={`relative flex-1 w-full h-full min-h-0 bg-stone-950 flex overflow-hidden ${
          (damageVignette > 0.45 || isRadarDanger) ? 'animate-combat-shake' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          width={1000}
          height={560}
          style={{ width: '100%', height: '100%', objectFit: 'fill' }}
          className="w-full h-full cursor-none select-none combat-canvas block"
        />

        {/* Gentle Red Vignette Overlay for Proximity Damage from Ground Fire / Radar Detection */}
        {(damageVignette > 0.05 || isRadarDanger) && (
          <div
            className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-200 ${
              isRadarDanger ? 'animate-vignette-pulse' : ''
            }`}
            style={{
              background: `radial-gradient(ellipse at center, rgba(239, 68, 68, 0) 55%, rgba(220, 38, 38, ${Math.min(0.12, damageVignette * 0.25)}) 85%, rgba(185, 28, 28, ${Math.min(0.2, damageVignette * 0.35)}) 100%)`,
              boxShadow: (isRadarDanger) ? 'inset 0 0 20px rgba(239, 68, 68, 0.25)' : undefined,
            }}
          />
        )}

        {/* Floating Minimal In-Combat HUD for Mobile Landscape ("اللعبة وبس") */}
        <div className="mobile-landscape-hud hidden pointer-events-none absolute top-3 right-3 z-30 flex items-center gap-2">
          {onOpenTutorialVideo && (
            <button
              type="button"
              onClick={onOpenTutorialVideo}
              className="pointer-events-auto px-2.5 py-1 rounded-xl bg-red-600/85 hover:bg-red-600 text-white border border-red-400 text-[10px] font-bold font-cairo shadow-lg flex items-center gap-1 active:scale-95 cursor-pointer"
              title="فيديو الشرح التكتيكي (إيقاف مؤقت)"
            >
              <Video className="w-3 h-3 text-white" />
              <span>فيديو الشرح 🎬</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-950/80 border border-stone-800 backdrop-blur-md text-[11px] font-bold text-emerald-400">
            <Target className="w-3.5 h-3.5" />
            <span>المحطات المتبقية: {Math.max(0, targetStationsRequired - totalDestroyed)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-950/80 border border-stone-800 backdrop-blur-md text-[11px] font-bold">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-stone-200">{hp}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-950/80 border border-stone-800 backdrop-blur-md text-[11px] font-bold text-sky-400">
            <span>{playerAltitude}م</span>
          </div>
        </div>

        {/* Digital Countdown Timer at the TOP */}
        {isCombatActive && !missionWon && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={missionDuration}
            label="الزمن المتبقي للنصر"
            position="top-center"
          />
        )}

        {/* 5-Second Tactical Countdown at the TOP (leaves center completely clear) */}
        {countdownSec > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-3 px-4 py-2 rounded-xl bg-stone-950/95 border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.6)] backdrop-blur-md animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="text-xs sm:text-sm font-bold font-cairo text-stone-200">
              ساعة الصفر واشتباك مقاتلات العدو بعد:
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tabular-nums drop-shadow-[0_0_10px_rgba(245,158,11,1)]">
              00:0{countdownSec}
            </span>
          </div>
        )}

        {/* Ground Collision Countdown Timer HUD */}
        {isGroundDanger && !missionWon && !isDefeated && isCombatActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-stone-950/90 border border-red-500/80 text-red-200 text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-red-300">خطر الاصطدام بالأرض:</span>
            <span className="font-mono text-base font-black text-red-400 tabular-nums">
              {groundDangerRemaining.toFixed(1)} ثانية
            </span>
          </div>
        )}

        {/* High Altitude Radar Detection HUD Warning */}
        {isRadarDanger && !missionWon && !isDefeated && isCombatActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/95 border-2 border-amber-400 text-amber-200 text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-pulse">
            <Radio className="w-5 h-5 text-amber-400 shrink-0 animate-ping" />
            <span>🚨 كشف راداري معادٍ! انخفض تحت سقف الرادار فوراً! [{radarDangerRemaining.toFixed(1)} ثانية]</span>
          </div>
        )}

        {/* Mobile Rocket Button */}
        {!missionWon && !isDefeated && isCombatActive && (
          <div className="absolute bottom-4 right-4 z-30 select-none mobile-touch-action-btn">
            <button
              type="button"
              onTouchStart={(e) => { e.preventDefault(); fireRocket(); }}
              onClick={() => fireRocket()}
              disabled={rockets <= 0}
              className="w-18 h-18 rounded-2xl bg-amber-500 active:bg-amber-400 disabled:opacity-40 text-stone-950 font-black flex flex-col items-center justify-center shadow-2xl border-2 border-amber-300 text-xs cursor-pointer touch-manipulation"
              title="صاروخ موجه للمحطات الأرضية فقط"
            >
              <Zap className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] leading-tight font-black">صاروخ محطات</span>
              <span className="text-[10px] font-mono font-black">[{rockets}/8]</span>
            </button>
          </div>
        )}

        {/* Victory Overlay Modal */}
        <VictoryModal
          isOpen={missionWon}
          missionId="MISSION_AIR_STRIKE"
          missionTitle="المرحلة 1: الضربة الجوية المفاجئة (ساعة الصفر)"
          congratulatoryMessage="مبروك النصر العظيم! تم تدمير محطات ورادارات العدو بنجاح ساحق!"
          score={score}
          timeLeft={timeLeft}
          targetsDestroyed={totalDestroyed}
          totalTargets={targetStationsRequired}
          onNextMission={() => onComplete(score)}
          onReturnToBase={onExit}
          onReplay={handleRestartMission}
        />

        {/* Defeat Overlay Modal when health reaches 0 or mission fails */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-700/60 text-red-400 text-xs font-bold font-mono mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              انقطاع الاتصال اللاسلكي · نداء Mayday
            </div>

            <h3 className="text-2xl sm:text-3xl font-black font-cairo text-red-500 mb-2">
              {defeatReason === 'crash'
                ? 'فشلت المهمة: اصطدام المقاتلة بتضاريس الأرض!'
                : defeatReason === 'radar'
                ? 'فشلت المهمة: كشف راداري معادٍ وإسقاط بصواريخ الهوك!'
                : defeatReason === 'timeout'
                ? 'انتهى الوقت المخصص للطلعة الجوية!'
                : 'فشلت المهمة: استشهاد البطل وسقوط المقاتلة!'}
            </h3>

            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              {defeatReason === 'crash'
                ? 'انخفض ارتفاع طائرتك ميج-21 عن المستوى الآمن وظللت على الأرض فترة طويلة فاصطدمت برمال وهضاب سيناء. احرص على مراقبة مؤشر الارتفاع وتفادي الأرض!'
                : defeatReason === 'radar'
                ? 'حلقت مقاتلتك فوق السقف الراداري المسموح لفترة طويلة، فتم كشفها برادارات العدو (أم مرجم) وأسقطتها صواريخ الدفاع الجوي المعادية. احرص على الطيران المنخفض تحت مستوى الرادار!'
                : defeatReason === 'timeout'
                ? 'انتهت مدة الدقيقتين المخصصة للضربة الجوية دون حسم الأهداف. أعد تنظيم صفوفك وانطلق في طلعة جديدة!'
                : 'نفدت طاقة درع المقاتلة بعد اشتباك ضارٍ مع طائرات ودفاعات العدو الجوية. شجاعة نسور الجو مستمرة، أعد المحاولة وسدد ضرباتك بدقة!'}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6 max-w-md w-full text-center">
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">المحطات المدمرة</span>
                <span className="text-base font-bold font-mono text-emerald-400">{totalDestroyed} محطات</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">الوقت المنقضي</span>
                <span className="text-base font-bold font-mono text-sky-400">{formatTimer(missionDuration - timeLeft)}</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">النقاط الكلية</span>
                <span className="text-base font-bold font-mono text-amber-400">{score}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleRestartMission}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة الطلعة الجوية 🔄
              </button>
              <button
                onClick={onExit}
                className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-lg transition-colors cursor-pointer"
              >
                العودة لغرفة العمليات
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="desktop-only-bar p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>ساعة الصفر: 14:00 · الصواريخ موجهة ذاتياً نحو الأهداف</span>
        <span className="text-amber-400 font-semibold">«بسم الله.. توكلنا على الله»</span>
      </div>
    </div>
  );
};
