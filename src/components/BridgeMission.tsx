import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Shield, Wind, Crosshair, CheckCircle2, Clock, RotateCcw, Wrench, AlertTriangle, Target, Zap } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { isGamePaused } from '../game/pause';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface BridgeMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: () => void;
  onExit: () => void;
}

interface PontoonSection {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  assembled: boolean;
}

interface CrossingTank {
  id: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
  status: 'advancing' | 'waiting_strike' | 'cleared_crossing' | 'destroyed';
  crossingComplete: boolean;
}

interface ArtilleryShell {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
}

interface EnemyPlane {
  x: number;
  y: number;
  vx: number;
  vy?: number;
  baseY?: number;
  hp: number;
  destroyed: boolean;
  strafeCooldown?: number;
  bombDropped?: boolean;
  bombsLeft?: number;
  nextBombTime?: number;
  pattern?: 'carpet_bomb' | 'dive_strafing' | 'artillery_guide' | 'torpedo_skim' | 'high_altitude_cluster';
  badgeShown?: boolean;
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

export const BridgeMission: React.FC<BridgeMissionProps> = ({ difficulty = 'normal', onComplete, onDefeat, onExit }) => {
  const missionDuration = DIFFICULTY_CONFIG[difficulty].missionDuration;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tanksCrossed, setTanksCrossed] = useState(0);
  const [lostOpportunities, setLostOpportunities] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(missionDuration); // 2-minute mission timer
  const [smokeScreenActive, setSmokeScreenActive] = useState(false);
  const [smokeCharges, setSmokeCharges] = useState(4);
  const [flakCharges, setFlakCharges] = useState(18);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [strikeActive, setStrikeActive] = useState(false);
  const [strikeCountdown, setStrikeCountdown] = useState(4.8);
  const [maxStrikeTime, setMaxStrikeTime] = useState(4.8);
  const [targetBridgeIndex, setTargetBridgeIndex] = useState(2);
  const [defeatReason, setDefeatReason] = useState<'lost_tanks' | 'timeout'>('lost_tanks');

  const stateRef = useRef({
    pontoons: [] as PontoonSection[],
    crossingTanks: [] as CrossingTank[],
    artilleryShells: [] as ArtilleryShell[],
    enemyPlanes: [] as EnemyPlane[],
    hostileBullets: [] as { x: number; y: number; vx: number; vy: number }[],
    hostileBombs: [] as { x: number; y: number; vx: number; vy: number; targetX: number; targetY: number }[],
    shockwaves: [] as Shockwave[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    mousePos: { x: 500, y: 300 },
    screenShake: 0,
    score: 0,
    timeLeft: 120,
    tanksCrossedCount: 0,
    lostOpportunities: 0,
    isComplete: false,
    smokeTimeRemaining: 0,
    smokeCharges: 4,
    flakCharges: 18,
    strikeActive: false,
    strikeCountdown: 4.8,
    maxStrikeTime: 4.8,
    targetBridgeIndex: 2,
    bridgeLocked: true,
  });

  // Initialize Pontoon bridge segments across the Suez Canal (x=230 to 770)
  useEffect(() => {
    const bridgeY = 270;
    const startX = 230;
    const totalSpan = 540;
    const count = 6;
    const segWidth = totalSpan / count;

    const sections: PontoonSection[] = [];
    for (let i = 0; i < count; i++) {
      sections.push({
        index: i,
        x: startX + i * segWidth,
        y: bridgeY,
        width: segWidth,
        height: 64,
        hp: 100,
        maxHp: 100,
        assembled: true,
      });
    }
    stateRef.current.pontoons = sections;
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

  const spawnExplosion = (x: number, y: number, color = '#f59e0b', count = 18, isMajor = false, isWater = false) => {
    sound.playExplosion(isMajor ? 1.3 : 0.8);
    stateRef.current.screenShake = isMajor ? 2.5 : 1.2;

    // Flash Shockwave
    stateRef.current.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: isMajor ? 95 : 55,
      alpha: 1.0,
      color: isWater ? '#38bdf8' : isMajor ? '#ffffff' : '#fef08a',
    });

    if (isWater) {
      for (let i = 0; i < 22; i++) {
        stateRef.current.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y,
          vx: (Math.random() - 0.5) * 14,
          vy: -60 - Math.random() * 70,
          life: 1,
          maxLife: 35,
          color: Math.random() < 0.6 ? '#e0f2fe' : '#38bdf8',
          size: Math.random() * 5 + 3,
          gravity: 190,
        });
      }
      return;
    }

    // Dense Smoke
    const smokeCount = isMajor ? 24 : 12;
    const smokeTones = ['#18181b', '#27272a', '#3f3f46', '#09090b'];
    for (let i = 0; i < smokeCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const spd = Math.random() * (isMajor ? 3.8 : 2.2) + 0.8;
      stateRef.current.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 1.2,
        vy: Math.sin(angle) * spd - 0.8,
        color: smokeTones[Math.floor(Math.random() * smokeTones.length)],
        life: 1,
        maxLife: 45 + Math.random() * 35,
        size: Math.random() * 6 + 6,
        isSmoke: true,
        growth: 0.45,
      });
    }

    // Fire and Embers
    const fireColors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#f97316'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * (isMajor ? 6.5 : 4.5) + 1.2;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        life: 1,
        maxLife: 24 + Math.random() * 14,
        size: Math.random() * 4 + 2,
      });
    }
  };

  // Deploy Tank from West Bank approach
  const handleDeployTank = () => {
    const state = stateRef.current;
    if (state.crossingTanks.some((t) => t.status === 'advancing' || t.status === 'waiting_strike')) {
      return;
    }

    sound.playCannon();
    state.crossingTanks.push({
      id: Date.now() + Math.random(),
      x: 60,
      y: 282,
      speed: 95,
      hp: 100,
      status: 'advancing',
      crossingComplete: false,
    });

    addFloatingText(80, 250, 'انطلاق دبابة T-62 نحو معبر القناة! 🚜', '#fbbf24');
  };

  // Execute the Precision Timing Strike on the targeted bridge section
  const handleExecutePrecisionStrike = () => {
    const state = stateRef.current;
    if (!state.strikeActive) return;

    const targetPontoon = state.pontoons[state.targetBridgeIndex];
    if (!targetPontoon) return;

    sound.playExplosion(1.4);
    sound.playTargetLock();
    state.screenShake = 2.5;

    // Precision blast destroys obstacle and opens crossing window
    spawnExplosion(targetPontoon.x + targetPontoon.width / 2, targetPontoon.y + 25, '#f59e0b', 30, true);

    addFloatingText(
      targetPontoon.x + targetPontoon.width / 2,
      targetPontoon.y - 35,
      '💥 ضربة دقيقة في التوقيت الحاسم! انطلاق الدبابة عبر الكوبري!',
      '#4ade80'
    );

    // Cleared! Waiting tank surges forward across the canal into Sinai
    const tank = state.crossingTanks.find((t) => t.status === 'waiting_strike');
    if (tank) {
      tank.status = 'cleared_crossing';
      tank.speed = 150;
      sound.playCannon();
    }

    state.strikeActive = false;
    setStrikeActive(false);
    state.score += 500;
    setScore(state.score);
  };

  // Deploy Smoke Screen to blind enemy spotters
  const handleDeploySmokeScreen = () => {
    const state = stateRef.current;
    if (state.smokeCharges <= 0) return;
    state.smokeCharges -= 1;
    setSmokeCharges(state.smokeCharges);
    setSmokeScreenActive(true);
    stateRef.current.smokeTimeRemaining = 12;
    sound.playMissileLaunch();
    addFloatingText(500, 240, 'ستارة دخان تكتيكية نشطة! تعمية مدفعية العدو 💨', '#e2e8f0');

    for (let i = 0; i < 40; i++) {
      stateRef.current.particles.push({
        x: 230 + Math.random() * 540,
        y: 240 + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 15 + 5,
        vy: -15 - Math.random() * 20,
        color: Math.random() < 0.5 ? '#cbd5e1' : '#94a3b8',
        life: 1,
        maxLife: 140,
        size: Math.random() * 25 + 20,
        isSmoke: true,
        growth: 0.2,
      });
    }
  };

  // Fire Anti-Aircraft Flak Gun at enemy planes or falling bombs
  const handleFireFlak = (targetX?: number, targetY?: number) => {
    const state = stateRef.current;
    if (state.flakCharges <= 0) return;
    state.flakCharges -= 1;
    setFlakCharges(state.flakCharges);
    sound.playGunshot();

    const tx = targetX ?? stateRef.current.mousePos.x;
    const ty = targetY ?? stateRef.current.mousePos.y;

    spawnExplosion(tx, ty, '#f59e0b', 12, false, false);

    // Hit enemy planes
    for (const plane of stateRef.current.enemyPlanes) {
      if (plane.destroyed) continue;
      const flakDist = Math.hypot(plane.x - tx, plane.y - ty);

      if (flakDist < 70) {
        plane.hp -= 35;
        sound.playHitSound();
        if (plane.hp <= 0) {
          plane.destroyed = true;
          spawnExplosion(plane.x, plane.y, '#ef4444', 28, true);
          stateRef.current.score += 800;
          setScore(stateRef.current.score);
          addFloatingText(plane.x, plane.y - 20, '+800 إسقاط فانتوم بمدافع م/ط! 🎯', '#38bdf8');
        }
      }
    }

    // Hit falling aerial bombs
    for (let b = stateRef.current.hostileBombs.length - 1; b >= 0; b--) {
      const bomb = stateRef.current.hostileBombs[b];
      if (Math.hypot(bomb.x - tx, bomb.y - ty) < 65) {
        stateRef.current.hostileBombs.splice(b, 1);
        spawnExplosion(bomb.x, bomb.y, '#f59e0b', 22, true, false);
        sound.playExplosion(1.0);
        stateRef.current.score += 350;
        setScore(stateRef.current.score);
        addFloatingText(bomb.x, bomb.y - 20, '+350 اعتراض قنبلة جوية! 💥', '#38bdf8');
      }
    }
  };

  // 2-Minute Timer & Artillery Threat
  useEffect(() => {
    if (isWon || isDefeated) return;

    // Start with the first tank arriving shortly
    const deployTimeout = setTimeout(() => {
      handleDeployTank();
    }, 700);

    const timer = setInterval(() => {
      if (isGamePaused()) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;

        // Auto victory if 2 minutes elapse and at least some tanks crossed
        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          if (stateRef.current.tanksCrossedCount >= 3) {
            setIsWon(true);
            sound.playVictoryFanfare();
          } else {
            setDefeatReason('timeout');
            setIsDefeated(true);
          onDefeat?.();
            sound.playDefeatSound();
          }
          return 0;
        }

        // Periodic background artillery harassment
        if (Math.random() < (stateRef.current.smokeTimeRemaining > 0 ? 0.2 : 0.6)) {
          const targetSection = stateRef.current.pontoons[Math.floor(Math.random() * stateRef.current.pontoons.length)];
          if (targetSection) {
            const spread = stateRef.current.smokeTimeRemaining > 0 ? 120 : 35;
            stateRef.current.artilleryShells.push({
              x: 850 + Math.random() * 100,
              y: 50 + Math.random() * 80,
              targetX: targetSection.x + targetSection.width / 2 + (Math.random() - 0.5) * spread,
              targetY: targetSection.y + targetSection.height / 2 + (Math.random() - 0.5) * spread,
              progress: 0,
              speed: 1.1 + Math.random() * 0.4,
            });
          }
        }

        // Periodic enemy fighter jets
        if (Math.random() < 0.28 && stateRef.current.enemyPlanes.length < 2) {
          const spawnY = 70 + Math.random() * 90;
          stateRef.current.enemyPlanes.push({
            x: 1050,
            y: spawnY,
            baseY: spawnY,
            vx: -240,
            vy: 0,
            hp: 30,
            destroyed: false,
            bombsLeft: 1,
            nextBombTime: 0,
          });
        }

        return next;
      });
    }, 1000);

    return () => {
      clearTimeout(deployTimeout);
      clearInterval(timer);
    };
  }, [isWon, isDefeated]);

  // Main Canvas & Precision Timing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let lastStrikeCountdownDisplay = -1;

    const handlePointerAction = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (clientX - rect.left) * scaleX;
      const my = (clientY - rect.top) * scaleY;
      stateRef.current.mousePos.x = mx;
      stateRef.current.mousePos.y = my;

      // 1. If Precision Strike is active and player clicks on/near the bridge target or clicks bridge area:
      if (stateRef.current.strikeActive) {
        const targetPontoon = stateRef.current.pontoons[stateRef.current.targetBridgeIndex];
        if (targetPontoon) {
          // If clicked near target pontoon or anywhere on the bridge waterway during strike window
          if (Math.abs(my - 300) < 100 && mx >= 190 && mx <= 800) {
            handleExecutePrecisionStrike();
            return;
          }
        }
      }

      // 2. Click in the sky -> Fire Anti-Aircraft Flak
      if (my < 220) {
        handleFireFlak(mx, my);
        return;
      }

      // 3. Otherwise, if strike is active, execute strike as well
      if (stateRef.current.strikeActive) {
        handleExecutePrecisionStrike();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      stateRef.current.mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        handlePointerAction(e.clientX, e.clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handlePointerAction(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        stateRef.current.mousePos.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        stateRef.current.mousePos.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (stateRef.current.strikeActive) {
          handleExecutePrecisionStrike();
        } else {
          handleFireFlak();
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    const loop = (currTime: number) => {
      if (isGamePaused()) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.1, (currTime - lastTime) / 1000);
      lastTime = currTime;

      const state = stateRef.current;
      if (state.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt * 14);
      }

      if (state.smokeTimeRemaining > 0) {
        state.smokeTimeRemaining -= dt;
        if (state.smokeTimeRemaining <= 0) {
          setSmokeScreenActive(false);
        }
      }

      // 1. Tank Movement & Triggering Precision Strike Window
      for (const tk of state.crossingTanks) {
        if (tk.status === 'advancing') {
          tk.x += tk.speed * dt;

          // Reached bridge entrance (x = 210): HALT and open Precision Strike Countdown!
          if (tk.x >= 210) {
            tk.x = 210;
            tk.status = 'waiting_strike';
            tk.speed = 0;

            // Open Precision Strike Window!
            state.strikeActive = true;
            // Escalating difficulty: countdown duration shrinks with each crossed tank!
            // Tank 1: 4.8s -> Tank 2: 4.0s -> Tank 3: 3.4s -> Tank 4: 2.9s -> Tank 5: 2.4s
            const strikeDuration = Math.max(2.3, 4.8 - state.tanksCrossedCount * 0.6);
            state.strikeCountdown = strikeDuration;
            state.maxStrikeTime = strikeDuration;
            state.targetBridgeIndex = 1 + Math.floor(Math.random() * 4); // Section index 1 to 4
            setStrikeActive(true);
            setStrikeCountdown(strikeDuration);
            setMaxStrikeTime(strikeDuration);
            setTargetBridgeIndex(state.targetBridgeIndex);

            sound.playMissionStartRadioAlert();
            addFloatingText(210, 240, '⚡ فرصة العبور بدأت! نفّذ الضربة الدقيقة على المعبر!', '#facc15');
          }
        } else if (tk.status === 'cleared_crossing') {
          tk.x += tk.speed * dt;

          // Reached Sinai Eastern Bank! (x >= 820)
          if (tk.x >= 820 && !tk.crossingComplete) {
            tk.crossingComplete = true;
            state.tanksCrossedCount++;
            state.score += 1500;
            setScore(state.score);
            setTanksCrossed(state.tanksCrossedCount);
            sound.playMissionStartRadioAlert();
            addFloatingText(tk.x, tk.y - 30, `+1500 عبور ناجح للدبابة ${state.tanksCrossedCount}/5 إلى سيناء! 🚜🇪🇬`, '#4ade80');

            // VICTORY CONDITION: 5 tanks successfully crossed!
            if (state.tanksCrossedCount >= 5 && !state.isComplete) {
              state.isComplete = true;
              state.score += state.timeLeft * 35;
              setScore(state.score);
              setIsWon(true);
              sound.playVictoryFanfare();
            } else {
              // Deploy next tank after 1.8 seconds
              setTimeout(() => {
                if (!stateRef.current.isComplete) {
                  handleDeployTank();
                }
              }, 1800);
            }
          }
        }
      }

      // 2. Active Precision Strike Countdown Tick
      if (state.strikeActive) {
        state.strikeCountdown -= dt;
        const displayCountdown = Math.max(0, Math.ceil(state.strikeCountdown * 10) / 10);
        if (displayCountdown !== lastStrikeCountdownDisplay) {
          lastStrikeCountdownDisplay = displayCountdown;
          setStrikeCountdown(displayCountdown);
        }

        // Urgent audio beeps when under 1.6s
        if (state.strikeCountdown < 1.6 && Math.random() < 0.08) {
          sound.playCountdownBeep(false);
        }

        // TIMEOUT: Opportunity Lost! (ضياع فرصة عبور الدبابة)
        if (state.strikeCountdown <= 0) {
          state.strikeActive = false;
          setStrikeActive(false);

          const stalledTank = state.crossingTanks.find((t) => t.status === 'waiting_strike');
          if (stalledTank) {
            stalledTank.status = 'destroyed';
            spawnExplosion(stalledTank.x, stalledTank.y, '#ef4444', 30, true);
            sound.playExplosion(1.3);
            sound.playDefeatSound();

            state.lostOpportunities++;
            setLostOpportunities(state.lostOpportunities);
            addFloatingText(stalledTank.x, 240, '⚠️ ضاعت فرصة العبور! دُمّرت الدبابة بالقصف!', '#ef4444');

            // 3 lost opportunities = Mission Failed!
            if (state.lostOpportunities >= 3 && !state.isComplete) {
              state.isComplete = true;
              setDefeatReason('lost_tanks');
              setIsDefeated(true);
          onDefeat?.();
              sound.playDefeatSound();
            } else {
              // Deploy another tank after 2.2s to try again
              setTimeout(() => {
                if (!stateRef.current.isComplete) {
                  handleDeployTank();
                }
              }, 2200);
            }
          }
        }
      }

      // 3. Update Artillery Shells
      for (let i = state.artilleryShells.length - 1; i >= 0; i--) {
        const sh = state.artilleryShells[i];
        sh.progress += sh.speed * dt;
        sh.x += (sh.targetX - sh.x) * 2.5 * dt;
        sh.y += (sh.targetY - sh.y) * 2.5 * dt;

        if (sh.progress >= 1.0) {
          const hitWater = sh.targetY < 250 || sh.targetY > 340 || sh.targetX < 230 || sh.targetX > 770;
          if (hitWater) {
            spawnExplosion(sh.targetX, sh.targetY, '#38bdf8', 12, false, true);
          } else {
            spawnExplosion(sh.targetX, sh.targetY, '#f97316', 20, false, false);
          }
          state.artilleryShells.splice(i, 1);
        }
      }

      // 4. Update Enemy Strike Planes & Bombs
      for (let j = state.enemyPlanes.length - 1; j >= 0; j--) {
        const pl = state.enemyPlanes[j];
        if (pl.destroyed) {
          pl.y += 140 * dt;
          pl.x += pl.vx * 0.5 * dt;
          if (pl.y > canvas.height - 60) {
            spawnExplosion(pl.x, pl.y, '#f59e0b', 24, true);
            state.enemyPlanes.splice(j, 1);
          }
          continue;
        }

        pl.x += pl.vx * dt;

        // Drop aerial bomb over bridge
        if (!pl.bombDropped && pl.x > 450 && pl.x < 650) {
          pl.bombDropped = true;
          sound.playMissileLaunch();
          state.hostileBombs.push({
            x: pl.x,
            y: pl.y + 12,
            vx: pl.vx * 0.4,
            vy: 90,
            targetX: pl.x - 50,
            targetY: 305,
          });
        }

        if (pl.x < -60) state.enemyPlanes.splice(j, 1);
      }

      // 5. Update Falling Aerial Bombs
      for (let b = state.hostileBombs.length - 1; b >= 0; b--) {
        const bomb = state.hostileBombs[b];
        bomb.x += bomb.vx * dt;
        bomb.vy += 220 * dt;
        bomb.y += bomb.vy * dt;

        if (bomb.y >= 305) {
          spawnExplosion(bomb.x, bomb.y, '#f59e0b', 24, true, false);
          state.hostileBombs.splice(b, 1);
        }
      }

      // ----------------------------------------------------
      // RENDER CANVAS SCENE (Water, Pontoon Bridge, Tanks, Strike Reticle)
      // ----------------------------------------------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.5, '#1e293b');
      skyGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 240);

      // West Bank (Egypt): green shoreline & staging area (x: 0 to 230)
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 240, 230, canvas.height - 240);

      // East Bank (Sinai): golden desert sand berm (x: 770 to 1000)
      const desertGrad = ctx.createLinearGradient(770, 240, 1000, 240);
      desertGrad.addColorStop(0, '#d97706');
      desertGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = desertGrad;
      ctx.fillRect(770, 240, 230, canvas.height - 240);

      // Suez Canal Waterway (x: 230 to 770)
      const canalGrad = ctx.createLinearGradient(230, 240, 770, 240);
      canalGrad.addColorStop(0, '#0284c7');
      canalGrad.addColorStop(0.5, '#0369a1');
      canalGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = canalGrad;
      ctx.fillRect(230, 240, 540, canvas.height - 240);

      // Water waves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      for (let r = 260; r < canvas.height; r += 32) {
        ctx.beginPath();
        for (let wx = 230; wx <= 770; wx += 25) {
          const waveY = r + Math.sin(wx * 0.04 + currTime * 0.003) * 3;
          if (wx === 230) ctx.moveTo(wx, waveY);
          else ctx.lineTo(wx, waveY);
        }
        ctx.stroke();
      }

      // Pontoon Bridge Sections (PMP Floating Bridge across Canal)
      for (let i = 0; i < state.pontoons.length; i++) {
        const p = state.pontoons[i];
        const isTarget = state.strikeActive && i === state.targetBridgeIndex;

        // Pontoon steel pontoons
        ctx.fillStyle = isTarget ? '#7f1d1d' : '#334155';
        ctx.fillRect(p.x, p.y - 8, p.width, p.height + 16);

        // Wooden roadway deck
        ctx.fillStyle = isTarget ? '#991b1b' : '#78350f';
        ctx.fillRect(p.x + 2, p.y, p.width - 4, p.height);

        // Steel wheel treads
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(p.x, p.y + 12, p.width, 6);
        ctx.fillRect(p.x, p.y + 46, p.width, 6);

        // Connecting hinge bolts
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(p.x, p.y + p.height / 2, 4, 0, Math.PI * 2);
        ctx.arc(p.x + p.width, p.y + p.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // ----------------------------------------------------
        // DYNAMIC PRECISION STRIKE TARGET RETICLE (when window is active)
        // ----------------------------------------------------
        if (isTarget) {
          ctx.save();
          const targetX = p.x + p.width / 2;
          const targetY = p.y + p.height / 2;
          const pulse = (Math.sin(currTime * 0.012) + 1) * 0.5;

          // Red glowing strike zone
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x + 4, p.y + 4, p.width - 8, p.height - 8);

          // Concentric animated pulsing crosshairs
          ctx.beginPath();
          ctx.arc(targetX, targetY, 28 + pulse * 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(targetX, targetY, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();

          // Crosshair lines
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(targetX - 34, targetY);
          ctx.lineTo(targetX + 34, targetY);
          ctx.moveTo(targetX, targetY - 34);
          ctx.lineTo(targetX, targetY + 34);
          ctx.stroke();

          // Reticle Banner
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.roundRect(targetX - 70, p.y - 36, 140, 24, 6);
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = 'black 11px Cairo, sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.fillText(`اضغط هنا للضربة! 🎯 [${state.strikeCountdown.toFixed(1)}s]`, targetX, p.y - 20);
          ctx.restore();
        }
      }

      // Crossing Tanks
      for (const tk of state.crossingTanks) {
        if (tk.status === 'destroyed') continue;

        ctx.save();
        ctx.translate(tk.x, tk.y);

        // Status badge above tank
        if (tk.status === 'waiting_strike') {
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#facc15';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ بانتظار توقيت الضربة الدقيقة للعبور!', 0, -26);
        } else if (tk.status === 'cleared_crossing') {
          ctx.font = 'bold 10px Cairo, sans-serif';
          ctx.fillStyle = '#4ade80';
          ctx.textAlign = 'center';
          ctx.fillText('انطلاق بأقصى سرعة! 🚜', 0, -24);
        }

        // Tank Hull
        ctx.fillStyle = '#166534';
        ctx.fillRect(-24, -14, 48, 28);

        // Treads
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-28, -17, 56, 5);
        ctx.fillRect(-28, 12, 56, 5);

        // Turret
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // Cannon barrel
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24, 0);
        ctx.stroke();

        ctx.restore();
      }

      // Enemy Planes
      for (const pl of state.enemyPlanes) {
        ctx.save();
        ctx.translate(pl.x, pl.y);
        ctx.scale(-1, 1);
        ctx.fillStyle = pl.destroyed ? '#451a03' : '#64748b';
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.lineTo(-18, -10);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-18, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Particles & Explosions
      for (let pIdx = state.particles.length - 1; pIdx >= 0; pIdx--) {
        const pt = state.particles[pIdx];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.gravity) pt.vy += pt.gravity * dt;
        pt.life++;

        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();

        if (pt.life >= pt.maxLife) {
          state.particles.splice(pIdx, 1);
        }
      }

      // Shockwaves
      for (let sIdx = state.shockwaves.length - 1; sIdx >= 0; sIdx--) {
        const sw = state.shockwaves[sIdx];
        sw.radius += 180 * dt;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        if (sw.radius >= sw.maxRadius) {
          state.shockwaves.splice(sIdx, 1);
        }
      }

      // Floating Texts
      for (let fIdx = state.floatingTexts.length - 1; fIdx >= 0; fIdx--) {
        const ft = state.floatingTexts[fIdx];
        ft.y -= 30 * dt;
        ft.life++;
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);

        ctx.font = 'bold 13px Cairo, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;

        if (ft.life >= ft.maxLife) {
          state.floatingTexts.splice(fIdx, 1);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleRestart = () => {
    sound.playRadioTransmission();
    const state = stateRef.current;
    state.isComplete = false;
    state.crossingTanks = [];
    state.artilleryShells = [];
    state.enemyPlanes = [];
    state.hostileBombs = [];
    state.tanksCrossedCount = 0;
    state.lostOpportunities = 0;
    state.strikeActive = false;
    state.strikeCountdown = 4.8;
    state.maxStrikeTime = 4.8;
    state.targetBridgeIndex = 2;
    state.bridgeLocked = true;
    state.smokeTimeRemaining = 0;
    state.score = 0;
    state.smokeCharges = 4;
    state.flakCharges = 18;
    setTanksCrossed(0);
    setLostOpportunities(0);
    setScore(0);
    setTimeLeft(missionDuration);
    setStrikeActive(false);
    setStrikeCountdown(4.8);
    setMaxStrikeTime(4.8);
    setTargetBridgeIndex(2);
    setIsWon(false);
    setIsDefeated(false);
    setFlakCharges(18);
    setSmokeCharges(4);
    setTimeout(() => {
      handleDeployTank();
    }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 select-none overflow-hidden">
      {/* Top HUD */}
      <div className="p-2 sm:p-3 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="p-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 hover:text-white cursor-pointer transition-colors"
            title="العودة"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold font-cairo text-sm sm:text-base text-amber-400">
              ملحمة كباري العبور والضربة الدقيقة الحاسمة
            </h2>
            <div className="text-[11px] text-stone-400">
              سلاح المهندسين العسكريين · توقيت دقيق ومحسوب لعبور الدبابات
            </div>
          </div>
        </div>

        {/* Meters */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-stone-300">الدبابات العابرة:</span>
            <span className="font-mono tabular-nums font-bold text-emerald-400 text-sm">{tanksCrossed} / 5</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-300">الفرص الضائعة:</span>
            <span className={`font-mono tabular-nums font-bold text-sm ${lostOpportunities > 0 ? 'text-red-400 animate-pulse' : 'text-stone-400'}`}>
              {lostOpportunities} / 3
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums font-bold text-amber-400">{score} نقطة</span>
          </div>
        </div>
      </div>

      {/* TACTICAL ACTION STRIP & PRECISION STRIKE COUNTDOWN BANNER */}
      {strikeActive ? (
        <div className="px-4 py-2.5 bg-red-950/95 border-b-2 border-red-500 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-cairo font-black text-sm text-yellow-300">
              ⚡ نافذة الضربة الدقيقة للكوبري: سارع بالضرب لتأمين عبور الدبابة قبل فوات الأوان!
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 h-3 bg-stone-900 rounded-full overflow-hidden border border-red-400">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 transition-all duration-100"
                style={{ width: `${(strikeCountdown / maxStrikeTime) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xl sm:text-2xl font-black text-amber-400 tabular-nums drop-shadow">
              {strikeCountdown.toFixed(1)}s
            </span>

            <button
              onClick={handleExecutePrecisionStrike}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-1.5 border border-red-300"
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>تنفيذ الضربة الدقيقة 🎯</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 bg-stone-950 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-300">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeploySmokeScreen}
              disabled={smokeCharges <= 0 || smokeScreenActive}
              className={`px-3.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow ${
                smokeScreenActive
                  ? 'bg-slate-700 text-stone-200 animate-pulse'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
              }`}
            >
              <Wind className="w-4 h-4 text-sky-400" />
              <span>ستارة دخان كثيفة [{smokeCharges}]</span>
            </button>

            <button
              onClick={() => handleFireFlak()}
              disabled={flakCharges <= 0}
              className="px-3.5 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow"
            >
              <Crosshair className="w-4 h-4" />
              <span>مدافع م/ط ضد الطيران [{flakCharges}]</span>
            </button>
          </div>

          <div className="text-stone-400 text-xs font-semibold">
            🚜 تتقدم الدبابة نحو المعبر.. استعد لتوقيت الضربة الدقيقة عند وصولها!
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 w-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={560}
          className="w-full h-full max-w-full max-h-full object-contain cursor-crosshair select-none"
        />

        {/* Digital Countdown Timer */}
        {!isWon && !isDefeated && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={missionDuration}
            label="الزمن المتبقي للمهمة"
            position="top-center"
          />
        )}

        {/* Victory Modal */}
        {isWon && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_25px_rgba(34,197,94,0.5)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black font-cairo text-amber-400 mb-2">
              نصر عسكري مبين! عبرت أرتال الدبابات بالضربات الدقيقة!
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              سددت ضرباتك الدقيقة في التوقيت المثالي قبل فوات الأوان، مما سمح لـ 5 دبابات قتالية بالتدفق الكامل عبر كباري العبور والسيطرة على خط بارليف في سيناء!
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6 max-w-md w-full text-center">
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">الدبابات العابرة</span>
                <span className="text-base font-bold font-mono text-emerald-400">5 من 5</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">الفرص الضائعة</span>
                <span className="text-base font-bold font-mono text-sky-400">{lostOpportunities} / 3</span>
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
              الانتقال إلى المرحلة التالية: معارك الدبابات الكبرى
            </button>
          </div>
        )}

        {/* Defeat Modal */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold font-cairo text-red-400 mb-2">
              {defeatReason === 'timeout'
                ? 'انتهى الوقت المخصص للمهمة قبل إتمام العبور!'
                : 'فشلت المهمة: ضاعت فرص عبور أرتال الدبابات!'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              {defeatReason === 'timeout'
                ? 'انتهت مدة الدقيقتين دون عبور الدبابات الكافية إلى سيناء. اضبط توقيت ضرباتك وسددها بسرعة!'
                : 'تأخرت في توجيه الضربة الدقيقة على الكوبري قبل نفاد العداد التنازلي، مما أدى لقصف دبابات العبور من طيران ومدفعية العدو!'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة المحاولة 🔄
              </button>
              <button
                onClick={onExit}
                className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-lg transition-colors cursor-pointer"
              >
                العودة للقيادة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="hidden sm:flex p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>انقر على موقع الضربة الدقيقة بالكوبري أو اضغط زر المسافة (Space) فور ظهور العداد التنازلي</span>
        <span className="text-amber-400 font-semibold">«سلاح المهندسين.. درع النصر وجسر التحرير»</span>
      </div>
    </div>
  );
};
