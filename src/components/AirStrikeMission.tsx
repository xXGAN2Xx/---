import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Zap, Shield, Flame, CheckCircle2, Clock, Target, RotateCcw, AlertTriangle, Radio } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';

interface AirStrikeMissionProps {
  onComplete: (scoreEarned: number) => void;
  onExit: () => void;
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

interface EnemyJet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  destroyed: boolean;
  burstRemaining?: number;
  burstCooldown?: number;
  lastBurstTime?: number;
  missileFired?: boolean;
  evasionTimer?: number;
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

export const AirStrikeMission: React.FC<AirStrikeMissionProps> = ({ onComplete, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hp, setHp] = useState(100);
  const [rockets, setRockets] = useState(12);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2-minute timer for automatic victory
  const [totalDestroyed, setTotalDestroyed] = useState(0);
  const [missionWon, setMissionWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'shot_down' | 'crash' | 'timeout'>('shot_down');
  const [altitudeWarning, setAltitudeWarning] = useState<boolean>(false);
  const [playerAltitude, setPlayerAltitude] = useState<number>(320);
  const [victoryReason, setVictoryReason] = useState<'fast' | 'timer'>('fast');
  const [countdownSec, setCountdownSec] = useState<number>(5);
  const [isCombatActive, setIsCombatActive] = useState<boolean>(false);
  const [currentAlert, setCurrentAlert] = useState<string>('تجهيز المقاتلة: المرحلة خالية، استعد للاشتباك خلال 5 ثوانٍ');

  const handleRestartMission = () => {
    sound.playRadioTransmission();
    setHp(100);
    setScore(0);
    setRockets(12);
    setTimeLeft(120);
    setTotalDestroyed(0);
    setMissionWon(false);
    setIsDefeated(false);
    setDefeatReason('shot_down');
    setAltitudeWarning(false);
    setCountdownSec(5);
    setIsCombatActive(false);
    setCurrentAlert('تجهيز المقاتلة: المرحلة خالية، استعد للاشتباك خلال 5 ثوانٍ');

    const state = stateRef.current;
    state.isCountdown = true;
    state.isComplete = false;
    state.player.hp = 100;
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
    state.destroyedCount = 0;
    state.spawnedTimes = new Set<number>();
    sound.playBackgroundTheme('airStrike');
  };

  // State: Stage starts empty, countdown 5s, then enemies, then stations after 20s
  const stateRef = useRef({
    isCountdown: true,
    player: {
      x: 160,
      y: 260,
      tilt: 0,
      hp: 100,
    },
    mouse: {
      x: 350,
      y: 260,
      isLeftDown: false,
    },
    screenShake: 0,
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
    timeLeft: 120,
    destroyedCount: 0,
    isComplete: false,
    radarAngle: 0,
    spawnedTimes: new Set<number>(),
  });

  // Target stations scheduled along the 2-minute mission
  // The first station appears exactly 20 seconds after combat starts!
  const SCHEDULE = [
    { sec: 20, type: 'radar' as const, label: 'محطة رادار أم مرجم (إسرائيلية) 🇮🇱', hp: 30, points: 500 },
    { sec: 40, type: 'runway' as const, label: 'مطار وقاعدة المليز (إسرائيلي) 🇮🇱', hp: 35, points: 600 },
    { sec: 60, type: 'bunker' as const, label: 'مرابض مدفعية عيون موسى (إسرائيلية) 🇮🇱', hp: 35, points: 500 },
    { sec: 80, type: 'radar' as const, label: 'محطة تشويش الطاسة (إسرائيلية) 🇮🇱', hp: 30, points: 500 },
    { sec: 100, type: 'runway' as const, label: 'مطار بير جفجافة (إسرائيلي) 🇮🇱', hp: 35, points: 600 },
    { sec: 115, type: 'bunker' as const, label: 'مركز قيادة حصن أم خشيب (إسرائيلي) 🇮🇱', hp: 35, points: 700 },
  ];

  // 1. Initial 5-Second Countdown while stage is empty
  useEffect(() => {
    if (missionWon || isDefeated) return;

    const countTimer = setInterval(() => {
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
              y: 120 + Math.random() * 120,
              vx: -230,
              vy: 8,
              hp: 25,
              destroyed: false,
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
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;
        const elapsed = 120 - next;

        // Pre-alert 4 seconds before next station
        const upcoming = SCHEDULE.find((s) => s.sec === elapsed + 4);
        if (upcoming) {
          setCurrentAlert(`🎯 رصد راداري: ${upcoming.label} تقترب`);
          sound.playTargetLock();
        }

        // Spawn target station when time reaches its schedule (first station at sec 20!)
        const scheduled = SCHEDULE.find((s) => s.sec === elapsed);
        if (scheduled && !stateRef.current.spawnedTimes.has(elapsed)) {
          stateRef.current.spawnedTimes.add(elapsed);

          const canvas = canvasRef.current;
          const canvasW = canvas ? canvas.width : 1000;
          const spawnX = stateRef.current.scrollX + canvasW + 120;

          stateRef.current.targets.push({
            id: elapsed,
            x: spawnX,
            y: scheduled.type === 'runway' ? 475 : scheduled.type === 'bunker' ? 440 : 425,
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

        // Continuous patrol station if no active ground targets after 25s
        if (elapsed >= 25 && stateRef.current.targets.filter((t) => !t.destroyed).length === 0) {
          const canvas = canvasRef.current;
          if (canvas) {
            const types: ('radar' | 'runway' | 'bunker')[] = ['radar', 'runway', 'bunker'];
            const chosen = types[Math.floor(Math.random() * types.length)];
            const labels = {
              radar: 'محطة رادار إسناد معادية',
              runway: 'مهبط طائرات الدعم الميداني',
              bunker: 'دشمة مدفعية متقدمة',
            };
            stateRef.current.targets.push({
              id: Date.now() + Math.random(),
              x: stateRef.current.scrollX + canvas.width + 120,
              y: chosen === 'runway' ? 475 : chosen === 'bunker' ? 440 : 425,
              type: chosen,
              hp: 30,
              maxHp: 30,
              label: labels[chosen],
              points: 500,
              destroyed: false,
            });
          }
        }

        // Automatic Victory when 2 minutes elapse!
        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setVictoryReason('timer');
          setMissionWon(true);
          sound.playVictoryFanfare();
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
    const now = performance.now();
    const state = stateRef.current;
    if (now - state.lastRocketTime < 320) return;

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

        addFloatingText(p.x, p.y - 20, 'صاروخ ذاتي التوجيه 🚀', '#f59e0b');
        return prev - 1;
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

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (clientX - rect.left) * scaleX;
      const my = (clientY - rect.top) * scaleY;
      stateRef.current.mouse.x = Math.max(60, Math.min(canvas.width - 60, mx));
      stateRef.current.mouse.y = Math.max(50, Math.min(370, my));
    };

    const handleMouseMove = (e: MouseEvent) => updateMouse(e.clientX, e.clientY);

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
              setScore(state.score);
              setTotalDestroyed(state.destroyedCount);
              addFloatingText(targetScreenX, target.y - 30, `+${target.points} ${target.label} مدمر! 🎯`, '#4ade80');
              if (state.destroyedCount >= 3 && !state.isComplete) {
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
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
        stateRef.current.mouse.isLeftDown = true;
      }
    };

    const handleTouchEnd = () => {
      stateRef.current.mouse.isLeftDown = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const state = stateRef.current;
      if (state.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      state.radarAngle += dt * 3.5;

      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt * 12);
      }

      // Flight movement following mouse smoothly
      const p = state.player;
      const m = state.mouse;
      p.x += (Math.min(canvas.width * 0.5, m.x) - p.x) * 8 * dt;
      p.y += (m.y - p.y) * 8 * dt;
      p.tilt = Math.max(-0.2, Math.min(0.2, (m.y - p.y) * 0.005));

      // Calculate altitude and low altitude ground warning
      const groundFloorY = 465;
      const altMeters = Math.max(10, Math.round((groundFloorY - p.y) * 2.2));
      setPlayerAltitude(altMeters);

      const isLow = p.y > 425;
      setAltitudeWarning(isLow);

      // Ground Impact Collision (ملامسة رمال سيناء والأرض)
      if (p.y >= groundFloorY) {
        p.y = groundFloorY - 10;
        p.hp -= 35;
        const remainingHp = Math.max(0, p.hp);
        setHp(remainingHp);
        state.screenShake = 1.8;
        sound.playExplosion(1.2);
        spawnExplosion(p.x, p.y + 12, '#f59e0b', 22, true);
        addFloatingText(p.x, p.y - 20, '⚠️ ملامسة الأرض! -35', '#ef4444');

        if (remainingHp <= 0 && !state.isComplete) {
          state.isComplete = true;
          setIsDefeated(true);
          setDefeatReason('crash');
          sound.playDefeatSound();
          spawnExplosion(p.x, p.y, '#ef4444', 36, true);
        }
      }

      state.scrollX += 150 * dt;

      // Cannon shooting when LEFT MOUSE BUTTON is held
      const now = performance.now();
      if (m.isLeftDown && now - state.lastShotTime > 180) {
        state.lastShotTime = now;
        sound.playGunshot();

        // Calculate aim vector from jet nose to mouse crosshair
        const aimDx = m.x - (p.x + 36);
        const aimDy = m.y - p.y;
        const aimDist = Math.hypot(aimDx, aimDy) || 1;

        let bulletVx = 900;
        let bulletVy = 0;
        if (aimDx > 30) {
          bulletVx = (aimDx / aimDist) * 920;
          bulletVy = (aimDy / aimDist) * 920;
        } else {
          bulletVy = 60;
        }

        // Twin-barrel heavy cannon shots
        state.projectiles.push({
          x: p.x + 38,
          y: p.y - 4,
          vx: bulletVx,
          vy: bulletVy,
          isRocket: false,
          fromPlayer: true,
        });
        state.projectiles.push({
          x: p.x + 38,
          y: p.y + 4,
          vx: bulletVx,
          vy: bulletVy,
          isRocket: false,
          fromPlayer: true,
        });
      }

      // Spawn Enemy Interceptor Jets only after the 5-second countdown finishes
      if (!state.isCountdown && Math.random() < 0.016 && state.enemyJets.length < 3) {
        state.enemyJets.push({
          x: canvas.width + 50,
          y: 70 + Math.random() * 200,
          vx: -(220 + Math.random() * 50),
          vy: (Math.random() - 0.5) * 35,
          hp: 25,
          destroyed: false,
        });
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
            let minDist = 1400;

            // Priority 1: Active enemy jets
            for (const jet of state.enemyJets) {
              if (jet.destroyed) continue;
              const d = Math.hypot(jet.x - pr.x, jet.y - pr.y);
              if (d < minDist) {
                minDist = d;
                targetX = jet.x;
                targetY = jet.y;
                foundTarget = true;
              }
            }

            // Priority 2: Ground target stations on screen
            if (!foundTarget || minDist > 450) {
              for (const st of state.targets) {
                if (st.destroyed) continue;
                const sx = st.x - state.scrollX;
                if (sx > 20 && sx < canvas.width + 120) {
                  const d = Math.hypot(sx - pr.x, st.y - pr.y);
                  if (d < minDist) {
                    minDist = d;
                    targetX = sx;
                    targetY = st.y;
                    foundTarget = true;
                  }
                }
              }
            }

            if (foundTarget) {
              const dx = targetX - pr.x;
              const dy = targetY - pr.y;
              const dist = Math.hypot(dx, dy) || 1;
              const rocketSpeed = 760;
              const targetVx = (dx / dist) * rocketSpeed;
              const targetVy = (dy / dist) * rocketSpeed;
              // Smooth homing turn
              pr.vx += (targetVx - pr.vx) * 9 * dt;
              pr.vy += (targetVy - pr.vy) * 9 * dt;
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
          // Player cannon can intercept incoming enemy missiles!
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
          // Check ground targets (stations)
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
                setScore(state.score);
                setTotalDestroyed(state.destroyedCount);
                addFloatingText(targetScreenX, target.y - 30, `+${target.points} ${target.label} مدمر! 🎯`, '#4ade80');

                // FAST VICTORY CONDITION: Destroying 3 targets wins immediately!
                if (state.destroyedCount >= 3 && !state.isComplete) {
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

          // Check enemy jets
          for (const jet of state.enemyJets) {
            if (jet.destroyed) continue;
            if (Math.hypot(pr.x - jet.x, pr.y - jet.y) < 32) {
              const damage = pr.isRocket ? 60 : 25;
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
        } else {
          // Enemy projectile hit player
          if (Math.hypot(pr.x - p.x, pr.y - p.y) < 22) {
            p.hp -= 10;
            const remainingHp = Math.max(0, p.hp);
            setHp(remainingHp);
            spawnPlaneHitEffect(p.x, p.y);
            state.projectiles.splice(i, 1);

            if (remainingHp <= 0 && !state.isComplete) {
              state.isComplete = true;
              setIsDefeated(true);
              setDefeatReason('shot_down');
              sound.playDefeatSound();
              sound.playExplosion(1.4);
              spawnExplosion(p.x, p.y, '#ef4444', 36, true);
            }
          }
        }
      }

      // Update Enemy Jets (Clean flight & fall, zero screen-covering smoke plumes)
      for (let j = state.enemyJets.length - 1; j >= 0; j--) {
        const jet = state.enemyJets[j];
        if (jet.destroyed) {
          jet.y += 150 * dt;
          jet.x += jet.vx * 0.4 * dt;

          // No massive smoke clouds while falling - clean view remains clear!
          if (jet.y > canvas.height - 40) {
            spawnPlaneHitEffect(jet.x, canvas.height - 25);
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
            setDefeatReason('shot_down');
            sound.playDefeatSound();
            sound.playExplosion(1.4);
            spawnExplosion(p.x, p.y, '#ef4444', 36, true);
          }
        }

        jet.x += jet.vx * dt;
        jet.y += jet.vy * dt;

        if (Math.random() < 0.016 && jet.x > p.x && jet.x < canvas.width) {
          sound.playGunshot();
          state.projectiles.push({
            x: jet.x - 20,
            y: jet.y,
            vx: -400,
            vy: (p.y - jet.y) * 0.35,
            isRocket: false,
            fromPlayer: false,
          });
        }

        if (jet.x < -80) state.enemyJets.splice(j, 1);
      }

      // Continuous smoke plumes from destroyed ground stations (low, restrained, target ground level)
      for (const target of state.targets) {
        if (target.destroyed) {
          const sx = target.x - state.scrollX;
          if (sx > -60 && sx < canvas.width + 60 && Math.random() < 0.22) {
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
        }
      }

      // Draw Scene
      ctx.save();
      if (state.screenShake > 0) {
        const sx = (Math.random() - 0.5) * state.screenShake;
        const sy = (Math.random() - 0.5) * state.screenShake;
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

        // 1. Twin-Engine Afterburner Exhaust Glow
        const jGlow = 10 + Math.sin(currentTime * 0.05) * 4;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.beginPath();
        ctx.ellipse(-30, -5, jGlow, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(-30, 5, jGlow, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Fuselage (Israeli Desert Tan & Olive Camouflage)
        ctx.fillStyle = '#b45309'; // Desert tan base
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
        ctx.fillStyle = '#4d7c0f';
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

        // 4. Swept Delta Wings with October 1973 Yellow Triangles
        ctx.fillStyle = '#ca8a04'; // Wing base
        // Top Wing
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-14, -34);
        ctx.lineTo(-26, -30);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        // Bottom Wing
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-14, 34);
        ctx.lineTo(-26, 30);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();

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

        // Floating Tactical Tag: "مقاتلة إسرائيلية معادية 🇮🇱 (فانتوم)" with Health Bar
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
          ctx.fillRect(jet.x - 30, jet.y - 22, Math.max(0, (jet.hp / 25) * 60), 4);
          ctx.restore();
        }
      }

      // Projectiles
      for (const pr of state.projectiles) {
        if (pr.isRocket) {
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
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(pr.x - 12, pr.y - 2, 24, 4);
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

      // Aim Reticle
      ctx.strokeStyle = m.isLeftDown ? '#22c55e' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
      ctx.moveTo(m.x - 18, m.y);
      ctx.lineTo(m.x + 18, m.y);
      ctx.moveTo(m.x, m.y - 18);
      ctx.lineTo(m.x, m.y + 18);
      ctx.stroke();

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
      <div className="p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
        <div className="flex items-center gap-4 sm:gap-5 text-xs font-semibold flex-wrap">
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

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-stone-300">الأهداف:</span>
            <span className="font-mono tabular-nums font-bold text-emerald-400">{totalDestroyed} / 3</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-xs">
            <span className="text-stone-400">الارتفاع:</span>
            <span className={`font-mono font-bold tabular-nums ${altitudeWarning ? 'text-red-400 animate-pulse font-black' : 'text-sky-400'}`}>
              {playerAltitude} م
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div className="h-full bg-emerald-500" style={{ width: `${hp}%` }} />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{hp}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-mono tabular-nums font-bold text-amber-400">{score}</span>
          </div>

          <button
            onClick={() => fireRocket()}
            disabled={rockets <= 0}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>صاروخ موجه تلقائياً [{rockets}]</span>
          </button>
        </div>
      </div>

      {/* Battle Telemetry */}
      <div className="px-4 py-1.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs text-stone-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-amber-400">{currentAlert}</span>
        </div>
        <div className="text-stone-400 font-mono text-[11px]">
          صواريخ موجهة ذاتياً · كشف راداري مباشر
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 w-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={560}
          className="w-full h-full max-w-full max-h-full object-contain cursor-crosshair select-none"
        />

        {/* Digital Countdown Timer at the TOP */}
        {isCombatActive && !missionWon && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={120}
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

        {/* Low Altitude Ground Warning Banner */}
        {altitudeWarning && !missionWon && !isDefeated && isCombatActive && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/95 border-2 border-red-500 text-red-300 text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
            <span>⚠️ تحذير: اقتراب شديد من رمال الأرض! ارتفع للأعلى (PULL UP!)</span>
          </div>
        )}

        {/* Victory Overlay Modal */}
        {missionWon && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black font-cairo text-amber-400 mb-1">
              {victoryReason === 'fast' ? 'نصر ساحق وسريع! دُمرت محطات وقواعد العدو!' : 'تمت طلعة الضربة الجوية بنجاح وتمت السيطرة على سماء سيناء!'}
            </h3>
            <p className="text-xs text-stone-300 max-w-md mb-4">
              {victoryReason === 'fast'
                ? 'حققت الفوز السريع بتدمير محطات الرادار ومطارات العدو في عمق سيناء بدقة استثنائية!'
                : 'اكتملت مدة طلعة الضربة الجوية (دقيقتان كاملتان) وسيطرت القوات الجوية المصرية على سماء المعركة!'}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5 max-w-md w-full text-center">
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">المحطات المدمرة</span>
                <span className="text-base font-bold font-mono text-emerald-400">{totalDestroyed} محطات</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">الوقت المتبقي</span>
                <span className="text-base font-bold font-mono text-sky-400">{formatTimer(timeLeft)}</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">النقاط الكلية</span>
                <span className="text-base font-bold font-mono text-amber-400">{score}</span>
              </div>
            </div>

            <button
              onClick={() => onComplete(score)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer shadow-lg active:scale-95"
            >
              الانتقال إلى المرحلة التالية: معركة العبور العظيم
            </button>
          </div>
        )}

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
                : defeatReason === 'timeout'
                ? 'انتهى الوقت المخصص للطلعة الجوية!'
                : 'فشلت المهمة: استشهاد البطل وسقوط المقاتلة!'}
            </h3>

            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              {defeatReason === 'crash'
                ? 'انخفض ارتفاع طائرتك ميج-21 عن المستوى الآمن واصطدمت برمال وهضاب سيناء. احرص على مراقبة مؤشر الارتفاع وتفادي الأرض!'
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
                <span className="text-base font-bold font-mono text-sky-400">{formatTimer(120 - timeLeft)}</span>
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
      <div className="p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>ساعة الصفر: 14:00 · الصواريخ موجهة ذاتياً نحو الأهداف</span>
        <span className="text-amber-400 font-semibold">«بسم الله.. توكلنا على الله»</span>
      </div>
    </div>
  );
};
