import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Target, Shield, Rocket, Flame, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { isGamePaused } from '../game/pause';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface TankBattleMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: () => void;
  onExit: () => void;
}

interface EnemyTank {
  id: number;
  x: number;
  y: number;
  speed: number;
  vy?: number;
  baseY?: number;
  hp: number;
  maxHp: number;
  label: string;
  isPatton: boolean;
  destroyed: boolean;
  reloadCooldown?: number;
  smokeCooldown?: number;
  salvoRemaining?: number;
  nextSalvoTime?: number;
  pattern?: 'salvo' | 'dune_flank' | 'standard' | 'hull_down_ambush' | 'smoke_rush';
  hullDown?: boolean;
  ambushTimer?: number;
  badgeShown?: boolean;
}

interface HostileJet {
  id: number;
  x: number;
  y: number;
  hp: number;
  destroyed: boolean;
  rocketCooldown?: number;
  pattern?: 'cluster' | 'dive_pass' | 'napalm_strike' | 'top_attack';
  flareCooldown?: number;
  badgeShown?: boolean;
}

interface GuidedMissile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  targetTankId?: number;
  active: boolean;
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
  color: string;
  life: number;
  maxLife: number;
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

export const TankBattleMission: React.FC<TankBattleMissionProps> = ({ difficulty = 'normal', onComplete, onDefeat, onExit }) => {
  const missionDuration = DIFFICULTY_CONFIG[difficulty].missionDuration;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tanksDestroyed, setTanksDestroyed] = useState(0);
  const [jetsDowned, setJetsDowned] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(missionDuration); // 2-minute timer
  const [saggerAmmo, setSaggerAmmo] = useState(14);
  const [samMissiles, setSamMissiles] = useState(8);
  const [platoonHealth, setPlatoonHealth] = useState(100);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);

  const stateRef = useRef({
    playerTank: { x: 180, y: 380, targetY: 380, hp: 100, turretAngle: 0, vx: 0, vy: 0 },
    keys: { up: false, down: false, left: false, right: false },
    saggerTeams: [
      { x: 130, y: 300, label: 'البطل عبد العاطي (صائد الدبابات)' },
      { x: 140, y: 470, label: 'البطل محمد المصري' },
    ],
    enemyTanks: [] as EnemyTank[],
    hostileJets: [] as HostileJet[],
    guidedMissiles: [] as GuidedMissile[],
    samRockets: [] as { x: number; y: number; vx: number; vy: number; targetId: number }[],
    shells: [] as { x: number; y: number; vx: number; vy: number; fromPlayer: boolean; isAirRocket?: boolean }[],
    particles: [] as Particle[],
    shockwaves: [] as Shockwave[],
    floatingTexts: [] as FloatingText[],
    mousePos: { x: 650, y: 350 },
    screenShake: 0,
    score: 0,
    timeLeft: 120,
    tanksDown: 0,
    jetsDown: 0,
    isComplete: false,
    lastSpawnTime: 0,
    saggerAmmo: 14,
    samMissiles: 8,
  });

  // 2-Minute Timer
  useEffect(() => {
    if (isWon || isDefeated) return;

    const timer = setInterval(() => {
      if (isGamePaused()) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;

        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setIsWon(true);
          sound.playVictoryFanfare();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWon, isDefeated]);

  // Initial tanks with faster waves
  useEffect(() => {
    stateRef.current.enemyTanks = [
      { id: 1, x: 700, y: 300, speed: -28, hp: 55, maxHp: 55, label: 'دبابة باتون M48', isPatton: true, destroyed: false },
      { id: 2, x: 840, y: 380, speed: -30, hp: 70, maxHp: 70, label: 'دبابة سينتوريون', isPatton: false, destroyed: false },
      { id: 3, x: 960, y: 460, speed: -24, hp: 75, maxHp: 75, label: 'دبابة لواء 190 مدرع', isPatton: false, destroyed: false },
    ];
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = true;
      if (e.key === ' ' || e.key === 'Enter') fireTankCannon();
      if (e.key === 'x' || e.key === 'X') launchSaggerMissile();
      if (e.key === 'c' || e.key === 'C') launchSamMissile();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const addFloatingText = (x: number, y: number, text: string, color = '#facc15') => {
    stateRef.current.floatingTexts.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 40,
    });
  };

  // Launch Sagger Missile with fast guidance and smart auto-lock
  const launchSaggerMissile = (targetTank?: EnemyTank) => {
    const state = stateRef.current;
    if (state.saggerAmmo <= 0) return;
    sound.playMissileLaunch();
    state.saggerAmmo -= 1;
    setSaggerAmmo(state.saggerAmmo);

    // If no targetTank is explicitly clicked, automatically lock onto the closest advancing enemy tank!
    let chosenTank = targetTank;
    if (!chosenTank) {
      const active = state.enemyTanks.filter((t) => !t.destroyed && t.x > 50 && t.x < 1100);
      if (active.length > 0) {
        active.sort((a, b) => a.x - b.x); // Pick closest threat
        chosenTank = active[0];
      }
    }

    const targetX = chosenTank ? chosenTank.x : state.mousePos.x;
    const targetY = chosenTank ? chosenTank.y : state.mousePos.y;

    state.guidedMissiles.push({
      x: 160,
      y: 330,
      targetX,
      targetY,
      vx: 650, // Fast punchy missile flight
      vy: 0,
      targetTankId: chosenTank?.id,
      active: true,
    });

    addFloatingText(170, 310, `صاروخ مالوتكا موجه 🎯${chosenTank ? ` [إقفال على ${chosenTank.label}]` : ''}`, '#f59e0b');
  };

  const launchSamMissile = () => {
    const state = stateRef.current;
    if (state.samMissiles <= 0) return;
    const targetJet = state.hostileJets.find((j) => !j.destroyed);
    if (!targetJet) {
      addFloatingText(state.playerTank.x, state.playerTank.y - 40, 'لا توجد مقاتلات فانتوم معادية حالياً', '#38bdf8');
      return;
    }

    sound.playMissileLaunch();
    state.samMissiles -= 1;
    setSamMissiles(state.samMissiles);

    state.samRockets.push({
      x: 80,
      y: 490,
      vx: 550,
      vy: -320,
      targetId: targetJet.id,
    });

    addFloatingText(100, 460, 'حائط الصواريخ سام-6 منطلق! 🚀', '#34d399');
  };

  const fireTankCannon = (targetX?: number, targetY?: number) => {
    const state = stateRef.current;
    sound.playCannon();
    state.screenShake = 2.0;
    const p = state.playerTank;
    const tx = targetX ?? state.mousePos.x;
    const ty = targetY ?? state.mousePos.y;
    const angle = Math.atan2(ty - p.y, tx - p.x);
    p.turretAngle = angle;

    state.shells.push({
      x: p.x + Math.cos(angle) * 36,
      y: p.y + Math.sin(angle) * 36,
      vx: Math.cos(angle) * 850,
      vy: Math.sin(angle) * 850,
      fromPlayer: true,
    });
  };

  const resetBattle = () => {
    const state = stateRef.current;
    state.playerTank = { x: 180, y: 380, targetY: 380, hp: 100, turretAngle: 0, vx: 0, vy: 0 };
    state.keys.up = false;
    state.keys.down = false;
    state.keys.left = false;
    state.keys.right = false;
    state.enemyTanks = [
      { id: 1, x: 700, y: 300, speed: -28, hp: 55, maxHp: 55, label: 'دبابة باتون M48', isPatton: true, destroyed: false },
      { id: 2, x: 840, y: 380, speed: -30, hp: 70, maxHp: 70, label: 'دبابة سينتوريون', isPatton: false, destroyed: false },
      { id: 3, x: 960, y: 460, speed: -24, hp: 75, maxHp: 75, label: 'دبابة لواء 190 مدرع', isPatton: false, destroyed: false },
    ];
    state.hostileJets = [];
    state.guidedMissiles = [];
    state.samRockets = [];
    state.shells = [];
    state.particles = [];
    state.shockwaves = [];
    state.floatingTexts = [];
    state.mousePos = { x: 650, y: 350 };
    state.screenShake = 0;
    state.score = 0;
    state.timeLeft = missionDuration;
    state.tanksDown = 0;
    state.jetsDown = 0;
    state.isComplete = false;
    state.lastSpawnTime = 0;
    state.saggerAmmo = 14;
    state.samMissiles = 8;

    setTanksDestroyed(0);
    setJetsDowned(0);
    setScore(0);
    setTimeLeft(missionDuration);
    setSaggerAmmo(14);
    setSamMissiles(8);
    setPlatoonHealth(100);
    setIsWon(false);
    setIsDefeated(false);
    sound.playRadioTransmission();
  };

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const updateInputPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mousePos.x = (clientX - rect.left) * scaleX;
      stateRef.current.mousePos.y = (clientY - rect.top) * scaleY;
    };

    const handlePointerAction = (clientX: number, clientY: number) => {
      updateInputPos(clientX, clientY);
      const state = stateRef.current;
      const mx = state.mousePos.x;
      const my = state.mousePos.y;

      // 1. Direct tap on enemy jet in sky
      for (const jet of state.hostileJets) {
        if (!jet.destroyed && Math.hypot(mx - jet.x, my - jet.y) < 65) {
          launchSamMissile();
          return;
        }
      }

      // 2. Direct tap on enemy tank
      for (const tank of state.enemyTanks) {
        if (!tank.destroyed && Math.hypot(mx - tank.x, my - tank.y) < 60) {
          sound.playTargetLock();
          if (state.saggerAmmo > 0) {
            launchSaggerMissile(tank);
          } else {
            fireTankCannon(tank.x, tank.y);
          }
          return;
        }
      }

      // 3. Tap in sky region when jets are active
      if (my < 210 && state.hostileJets.some((j) => !j.destroyed)) {
        launchSamMissile();
        return;
      }

      // 4. Default: fire cannon towards tap position
      fireTankCannon(mx, my);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateInputPos(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      handlePointerAction(e.clientX, e.clientY);
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
        updateInputPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    const spawnExplosion = (x: number, y: number, color = '#f59e0b', count = 16, isMajor = false) => {
      sound.playExplosion(isMajor ? 1.25 : 0.85);
      stateRef.current.screenShake = isMajor ? 2.5 : 1.2;

      // 1. Instantaneous Flash Shockwave (وميض انفجار لحظي)
      stateRef.current.shockwaves.push({
        x,
        y,
        radius: 8,
        maxRadius: isMajor ? 100 : 55,
        alpha: 1.0,
        color: isMajor ? '#ffffff' : '#fef08a',
      });

      // 2. Dense Billowing Black Smoke (دخان أسود كثيف)
      const smokeCount = isMajor ? 30 : 14;
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

      // 3. Fiery Core and Sparks
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

      // 4. Shrapnel metal debris with gravity
      const shrapnelCount = isMajor ? 12 : 5;
      for (let i = 0; i < shrapnelCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 5 + 1.5;
        stateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          color: '#fbbf24',
          life: 1,
          maxLife: 30 + Math.random() * 20,
          size: Math.random() * 3 + 1.5,
          gravity: 190,
        });
      }
    };

    const loop = (currTime: number) => {
      if (isGamePaused()) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const dt = (currTime - lastTime) / 1000;
      lastTime = currTime;

      const state = stateRef.current;
      if (state.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt * 15);
      }

      const p = state.playerTank;
      const k = state.keys;
      const moveSpd = 200 * dt;
      const oldPx = p.x;
      const oldPy = p.y;
      if (k.up && p.y > 270) p.y -= moveSpd;
      if (k.down && p.y < canvas.height - 80) p.y += moveSpd;
      if (k.left && p.x > 80) p.x -= moveSpd;
      if (k.right && p.x < 320) p.x += moveSpd;
      p.vx = dt > 0 ? (p.x - oldPx) / dt : 0;
      p.vy = dt > 0 ? (p.y - oldPy) / dt : 0;

      const m = state.mousePos;
      p.turretAngle = Math.atan2(m.y - p.y, m.x - p.x);

      // 0. Clean up dead or off-screen enemy tanks to keep battlefield active and prevent freezing!
      for (let i = state.enemyTanks.length - 1; i >= 0; i--) {
        const t = state.enemyTanks[i];
        if (t.destroyed || t.x < -80) {
          state.enemyTanks.splice(i, 1);
        }
      }

      // Continuous assault waves: always keep 3 to 4 active enemy tanks pushing forward
      const activeTanks = state.enemyTanks.filter((t) => !t.destroyed && t.x > -50);
      if (activeTanks.length < 3 || (currTime - state.lastSpawnTime > 3200 && activeTanks.length < 5)) {
        state.lastSpawnTime = currTime;
        const tankPatterns: ('salvo' | 'dune_flank' | 'standard' | 'hull_down_ambush' | 'smoke_rush')[] = [
          'salvo',
          'dune_flank',
          'standard',
          'hull_down_ambush',
          'smoke_rush',
        ];
        const chosenPattern = tankPatterns[Math.floor(Math.random() * tankPatterns.length)];
        const spawnY = 280 + Math.random() * 200;

        state.enemyTanks.push({
          id: Date.now() + Math.random(),
          x: canvas.width + 60,
          y: spawnY,
          baseY: spawnY,
          speed:
            chosenPattern === 'dune_flank'
              ? -(45 + Math.random() * 20)
              : chosenPattern === 'smoke_rush'
              ? -(48 + Math.random() * 15)
              : -(28 + Math.random() * 15),
          vy: 0,
          hp: 70,
          maxHp: 70,
          label: Math.random() < 0.5 ? 'دبابة معادية M60 باتون' : 'دبابة سينتوريون إسرائيلية',
          isPatton: true,
          destroyed: false,
          pattern: chosenPattern,
          salvoRemaining: chosenPattern === 'salvo' ? 2 : 1,
          ambushTimer: 0,
        });
      }

      // Hostile Jet with randomized attack pattern
      if (Math.random() < 0.012 && state.hostileJets.length < 2) {
        sound.playTargetLock();
        const jetPatterns: ('cluster' | 'dive_pass' | 'napalm_strike' | 'top_attack')[] = [
          'cluster',
          'dive_pass',
          'napalm_strike',
          'top_attack',
        ];
        const chosenJetPattern = jetPatterns[Math.floor(Math.random() * jetPatterns.length)];

        state.hostileJets.push({
          id: Date.now() + Math.random(),
          x: canvas.width + 40,
          y: chosenJetPattern === 'top_attack' ? 50 : 70 + Math.random() * 110,
          hp: 40,
          destroyed: false,
          pattern: chosenJetPattern,
        });
      }

      // 1. Update Guided Sagger Missiles
      for (let i = state.guidedMissiles.length - 1; i >= 0; i--) {
        const gm = state.guidedMissiles[i];
        if (!gm.active) {
          state.guidedMissiles.splice(i, 1);
          continue;
        }

        let targetX = state.mousePos.x;
        let targetY = state.mousePos.y;

        if (gm.targetTankId) {
          const targetTank = state.enemyTanks.find((t) => t.id === gm.targetTankId && !t.destroyed);
          if (targetTank) {
            targetX = targetTank.x;
            targetY = targetTank.y;
          }
        }

        const mdx = targetX - gm.x;
        const mdy = targetY - gm.y;
        const dist = Math.hypot(mdx, mdy);
        if (dist > 5) {
          gm.vx = (mdx / dist) * 580;
          gm.vy = (mdy / dist) * 580;
        }

        gm.x += gm.vx * dt;
        gm.y += gm.vy * dt;

        // Check impact
        for (const tank of state.enemyTanks) {
          if (!tank.destroyed && Math.hypot(gm.x - tank.x, gm.y - tank.y) < 48) {
            tank.hp -= 75;
            sound.playHitSound();
            spawnExplosion(tank.x, tank.y, '#ef4444', 20);
            gm.active = false;

            if (tank.hp <= 0) {
              tank.destroyed = true;
              sound.playExplosion(1.3);
              state.tanksDown++;
              state.score += 800;
              setScore(state.score);
              setTanksDestroyed(state.tanksDown);
              addFloatingText(tank.x, tank.y - 25, `+800 صيد دبابة (بطل العبور)! 🎯`, '#4ade80');

              if (state.tanksDown >= 6 && !state.isComplete) {
                state.isComplete = true;
                const timeBonus = state.timeLeft * 25;
                state.score += timeBonus;
                setScore(state.score);
                setIsWon(true);
                sound.playVictoryFanfare();
              }
            }
            break;
          }
        }

        if (gm.x > canvas.width || gm.x < 0 || gm.y > canvas.height || gm.y < 0) {
          gm.active = false;
        }
      }

      // 2. Update SAM-6 Missiles
      for (let s = state.samRockets.length - 1; s >= 0; s--) {
        const sam = state.samRockets[s];
        const target = state.hostileJets.find((j) => j.id === sam.targetId && !j.destroyed);
        if (target) {
          const tdx = target.x - sam.x;
          const tdy = target.y - sam.y;
          const tdist = Math.hypot(tdx, tdy);
          sam.vx = (tdx / tdist) * 650;
          sam.vy = (tdy / tdist) * 650;

          if (tdist < 30) {
            target.destroyed = true;
            spawnExplosion(target.x, target.y, '#f59e0b', 25);
            state.samRockets.splice(s, 1);
            state.jetsDown++;
            state.score += 1000;
            setScore(state.score);
            setJetsDowned(state.jetsDown);
            addFloatingText(target.x, target.y - 20, '+1000 إسقاط فانتوم بحائط الصواريخ! 🚀', '#38bdf8');
            continue;
          }
        }
        sam.x += sam.vx * dt;
        sam.y += sam.vy * dt;

        if (sam.y < -50 || sam.x > canvas.width + 50) {
          state.samRockets.splice(s, 1);
        }
      }

      // 3. Update Shells
      for (let b = state.shells.length - 1; b >= 0; b--) {
        const sh = state.shells[b];
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;

        if (sh.fromPlayer) {
          for (const tank of state.enemyTanks) {
            if (!tank.destroyed && Math.hypot(sh.x - tank.x, sh.y - tank.y) < 44) {
              tank.hp -= 42;
              sound.playHitSound();
              spawnExplosion(sh.x, sh.y, '#f59e0b', 12);
              state.shells.splice(b, 1);

              if (tank.hp <= 0) {
                tank.destroyed = true;
                sound.playExplosion(1.3);
                state.tanksDown++;
                state.score += 800;
                setScore(state.score);
                setTanksDestroyed(state.tanksDown);
                state.saggerAmmo = Math.min(18, state.saggerAmmo + 2);
            setSaggerAmmo(state.saggerAmmo);
                addFloatingText(tank.x, tank.y - 25, `+800 صيد دبابة معادية! 💥 (+2 مالوتكا)`, '#4ade80');

                if (state.tanksDown >= 6 && !state.isComplete) {
                  state.isComplete = true;
                  const timeBonus = state.timeLeft * 25;
                  state.score += timeBonus;
                  setScore(state.score);
                  setIsWon(true);
                  sound.playVictoryFanfare();
                }
              }
              break;
            }
          }
        } else {
          if (Math.hypot(sh.x - p.x, sh.y - p.y) < 32) {
            const dmg = sh.isAirRocket ? 18 : 10;
            p.hp -= dmg;
            setPlatoonHealth(Math.max(0, p.hp));
            sound.playHitSound();
            spawnExplosion(p.x, p.y, '#ef4444', sh.isAirRocket ? 20 : 14);
            if (sh.isAirRocket) {
              addFloatingText(p.x, p.y - 25, '⚠️ إصابة صاروخ جوي معادٍ! -18', '#ef4444');
            } else {
              addFloatingText(p.x, p.y - 25, 'إصابة دانة دبابة معادية! -10', '#f87171');
            }
            state.shells.splice(b, 1);

            if (p.hp <= 0 && !state.isComplete) {
              state.isComplete = true;
              setIsDefeated(true);
          onDefeat?.();
              sound.playDefeatSound();
            }
          }
        }

        if (sh.x < 0 || sh.x > canvas.width || sh.y < 0 || sh.y > canvas.height) {
          state.shells.splice(b, 1);
        }
      }

      // 4. Update Enemy Tanks (Predictive Deflection Aiming, Evasion & Salvos)
      for (const tank of state.enemyTanks) {
        if (!tank.destroyed) {
          if (!tank.badgeShown) {
            tank.badgeShown = true;
            const badgeMap: Record<string, string> = {
              salvo: '⚠️ رمي سابوت ثنائي!',
              dune_flank: '⚠️ التفاف مدرع سريع عبر الكثبان!',
              standard: '⚠️ تقدم رتل مدرع!',
              hull_down_ambush: '⚠️ كمين تكتيكي خلف الساتر!',
              smoke_rush: '⚠️ هجوم خاطف بستارة دخانية!',
            };
            addFloatingText(tank.x, tank.y - 25, badgeMap[tank.pattern || 'standard'] || 'دبابة معادية!', '#f59e0b');
          }

          // Smooth dune undulating movement and forward advance
          tank.y += Math.sin(currTime * 0.002 + tank.id) * 12 * dt;
          tank.y = Math.max(260, Math.min(canvas.height - 70, tank.y));

          // Pattern Specific Movement
          if (tank.pattern === 'hull_down_ambush') {
            tank.ambushTimer = (tank.ambushTimer ?? 0) + dt;
            if (tank.x < canvas.width - 150 && tank.ambushTimer < 3.2) {
              tank.speed = 0; // Halt in depression
              tank.hullDown = true;
            } else {
              tank.speed = -32;
              tank.hullDown = false;
            }
          } else if (tank.pattern === 'smoke_rush') {
            // Emits constant dust and smoke
            if (Math.random() < 0.25) {
              state.particles.push({
                x: tank.x + 10,
                y: tank.y + 10,
                vx: 15,
                vy: -5,
                color: '#cbd5e1',
                life: 1,
                maxLife: 15,
                size: 4,
                isSmoke: true,
              });
            }
          }

          tank.x += tank.speed * dt;

          tank.reloadCooldown = (tank.reloadCooldown ?? (1.8 + Math.random() * 1.5)) - dt;

          if (tank.reloadCooldown <= 0 && tank.x < canvas.width - 40 && tank.x > p.x + 60) {
            const isSalvo = tank.pattern === 'salvo';
            tank.reloadCooldown = isSalvo ? 3.0 + Math.random() * 1.5 : 2.2 + Math.random() * 1.6;
            sound.playCannon();

            // Calculate intercept lead
            const shellSpeed = 520;
            const dist = Math.hypot(p.x - tank.x, p.y - tank.y);
            const timeToTarget = dist / shellSpeed;

            const predX = p.x + (p.vx || 0) * timeToTarget * 0.85;
            const predY = p.y + (p.vy || 0) * timeToTarget * 0.85;

            const edx = predX - tank.x;
            const edy = predY - tank.y;
            const angle = Math.atan2(edy, edx) + (Math.random() - 0.5) * 0.05;

            state.shells.push({
              x: tank.x - 24,
              y: tank.y,
              vx: Math.cos(angle) * shellSpeed,
              vy: Math.sin(angle) * shellSpeed,
              fromPlayer: false,
            });

            // If salvo pattern: fire second shell slightly offset
            if (isSalvo) {
              const angle2 = angle + (Math.random() - 0.5) * 0.08;
              state.shells.push({
                x: tank.x - 26,
                y: tank.y + 4,
                vx: Math.cos(angle2) * (shellSpeed * 0.96),
                vy: Math.sin(angle2) * (shellSpeed * 0.96),
                fromPlayer: false,
              });
              addFloatingText(tank.x, tank.y - 20, '⚠️ رمي سابوت ثنائي!', '#ef4444');
            }

            // Muzzle flash particle
            state.particles.push({
              x: tank.x - 26,
              y: tank.y,
              vx: -35,
              vy: (Math.random() - 0.5) * 15,
              color: '#fef08a',
              life: 1,
              maxLife: 10,
              size: 5,
            });
          }
        }
      }

      // 5. Update Hostile Jets (Air-to-Ground Strikes with Randomized Patterns & Flares)
      for (let j = state.hostileJets.length - 1; j >= 0; j--) {
        const jet = state.hostileJets[j];
        if (jet.destroyed) {
          jet.y += 140 * dt;
          if (jet.y > canvas.height - 80) {
            spawnExplosion(jet.x, jet.y, '#ef4444', 18);
            state.hostileJets.splice(j, 1);
          }
          continue;
        }

        if (!jet.badgeShown) {
          jet.badgeShown = true;
          const jetBadgeMap: Record<string, string> = {
            cluster: '⚠️ غارة فانتوم عنقودية!',
            dive_pass: '⚠️ انقضاض صاروخي مباشر!',
            napalm_strike: '⚠️ إلقاء نابالم حارق!',
            top_attack: '⚠️ هجوم من زاوية عليا حادة!',
          };
          addFloatingText(jet.x, jet.y - 20, jetBadgeMap[jet.pattern || 'dive_pass'] || 'غارة معادية!', '#ef4444');
        }

        // Reactive Evasion against SAM-6 Missiles
        for (const sam of state.samRockets) {
          if (sam.targetId === jet.id) {
            const distSam = Math.hypot(sam.x - jet.x, sam.y - jet.y);
            if (distSam < 240) {
              jet.flareCooldown = (jet.flareCooldown ?? 0) - dt;
              if (jet.flareCooldown <= 0) {
                jet.flareCooldown = 3.2;
                // Deploy defensive flares
                for (let f = 0; f < 3; f++) {
                  state.particles.push({
                    x: jet.x + 15,
                    y: jet.y + (Math.random() - 0.5) * 15,
                    vx: 50 + Math.random() * 20,
                    vy: (Math.random() - 0.5) * 40,
                    color: '#fef08a',
                    life: 1,
                    maxLife: 20,
                    size: 4,
                  });
                }
                addFloatingText(jet.x, jet.y - 20, 'شعلات حرارية تكتيكية! 💥', '#fef08a');
                // Violent pitch juke
                jet.y += (jet.y > sam.y ? 65 : -65) * dt * 4;
              }
              break;
            }
          }
        }

        jet.x -= 240 * dt;

        // Tactical Air Strike AI
        jet.rocketCooldown = (jet.rocketCooldown ?? (1.6 + Math.random() * 1.2)) - dt;
        if (jet.rocketCooldown <= 0 && jet.x > p.x - 50 && jet.x < canvas.width - 60) {
          jet.rocketCooldown = 3.6 + Math.random() * 2.0;
          sound.playMissileLaunch();
          sound.playTargetLock();

          const rdx = p.x - jet.x;
          const rdy = p.y - jet.y;
          const rdist = Math.hypot(rdx, rdy) || 1;
          const rSpeed = 440;

          if (jet.pattern === 'cluster') {
            for (let c = -1; c <= 1; c++) {
              state.shells.push({
                x: jet.x,
                y: jet.y + 12,
                vx: ((rdx + c * 40) / rdist) * rSpeed,
                vy: ((rdy + c * 30) / rdist) * rSpeed,
                fromPlayer: false,
                isAirRocket: true,
              });
            }
          } else if (jet.pattern === 'napalm_strike') {
            // Napalm canister
            state.shells.push({
              x: jet.x,
              y: jet.y + 12,
              vx: (rdx / rdist) * 380,
              vy: 120,
              fromPlayer: false,
              isAirRocket: true,
            });
            addFloatingText(jet.x, jet.y - 20, '⚠️ إلقاء نابالم حارق!', '#f97316');
          } else {
            // Single precision rocket
            state.shells.push({
              x: jet.x,
              y: jet.y + 12,
              vx: (rdx / rdist) * rSpeed,
              vy: (rdy / rdist) * rSpeed,
              fromPlayer: false,
              isAirRocket: true,
            });
          }
        }

        if (jet.x < -80) state.hostileJets.splice(j, 1);
      }

      // 6. Draw Scene
      ctx.save();
      if (state.screenShake > 0) {
        const sx = (Math.random() - 0.5) * state.screenShake;
        const sy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(sx, sy);
      }

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 250);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.7, '#1e293b');
      skyGrad.addColorStop(1, '#9a3412');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 250);

      // Desert dunes
      const duneGrad = ctx.createLinearGradient(0, 250, 0, canvas.height);
      duneGrad.addColorStop(0, '#d97706');
      duneGrad.addColorStop(0.4, '#b45309');
      duneGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = duneGrad;
      ctx.fillRect(0, 250, canvas.width, canvas.height - 250);

      // SAM-6 launcher
      ctx.fillStyle = '#065f46';
      ctx.fillRect(35, 470, 75, 26);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(55, 470);
      ctx.lineTo(80, 438);
      ctx.moveTo(65, 470);
      ctx.lineTo(90, 438);
      ctx.moveTo(75, 470);
      ctx.lineTo(100, 438);
      ctx.stroke();

      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('حائط الصواريخ (سام-6)', 35, 514);

      // Sagger Teams
      state.saggerTeams.forEach((team) => {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(team.x, team.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(team.x + 6, team.y);
        ctx.lineTo(team.x + 14, team.y - 4);
        ctx.stroke();

        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(team.label, team.x - 30, team.y - 12);
      });

      // Enemy Jets (فانتوم إسرائيلية 🇮🇱)
      for (const jet of state.hostileJets) {
        ctx.save();
        ctx.translate(jet.x, jet.y);
        ctx.fillStyle = jet.destroyed ? '#451a03' : '#b45309';
        // Delta swept wings
        ctx.beginPath();
        ctx.moveTo(-32, 0);
        ctx.lineTo(24, -14);
        ctx.lineTo(12, 0);
        ctx.lineTo(24, 14);
        ctx.closePath();
        ctx.fill();

        if (!jet.destroyed) {
          // Israeli Star of David on enemy jet
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Yellow wing identification mark
          ctx.fillStyle = '#eab308';
          ctx.fillRect(14, -12, 6, 4);
          ctx.fillRect(14, 8, 6, 4);
        }
        ctx.restore();

        if (!jet.destroyed) {
          ctx.save();
          ctx.font = 'bold 10px Cairo, sans-serif';
          ctx.fillStyle = '#f87171';
          ctx.textAlign = 'center';
          ctx.fillText('فانتوم إسرائيلية 🇮🇱', jet.x, jet.y - 18);
          ctx.restore();
        }
      }

      // Enemy Tanks (دبابات إسرائيلية معادية 🇮🇱)
      for (const tank of state.enemyTanks) {
        if (tank.destroyed) {
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(tank.x - 26, tank.y - 12, 52, 24);
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(tank.x, tank.y - 10, 11, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(tank.x, tank.y, 35, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#854d0e'; // Desert tan
          ctx.fillRect(tank.x - 26, tank.y - 12, 52, 24);
          ctx.fillStyle = '#292524';
          ctx.fillRect(tank.x - 28, tank.y - 14, 56, 4);
          ctx.fillRect(tank.x - 28, tank.y + 10, 56, 4);

          // Israeli White Identification Chevron V on turret
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tank.x + 8, tank.y - 6);
          ctx.lineTo(tank.x + 2, tank.y);
          ctx.lineTo(tank.x + 8, tank.y + 6);
          ctx.stroke();

          // Star of David on enemy tank chassis
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tank.x - 14, tank.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 0.9;
          ctx.stroke();

          ctx.fillStyle = '#713f12';
          ctx.beginPath();
          ctx.arc(tank.x, tank.y, 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tank.x, tank.y);
          ctx.lineTo(tank.x - 30, tank.y);
          ctx.stroke();

          // HP Bar
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(tank.x - 25, tank.y - 25, 50, 5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(tank.x - 25, tank.y - 25, (tank.hp / tank.maxHp) * 50, 5);

          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#f87171';
          ctx.textAlign = 'center';
          ctx.fillText(`دبابة ${tank.label} 🇮🇱`, tank.x, tank.y - 32);
        }
      }

      // Player Tank (دبابة مصرية T-62 🇪🇬)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#15803d'; // Egyptian armor green
      ctx.fillRect(-28, -16, 56, 32);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(-30, -18, 60, 5);
      ctx.fillRect(-30, 13, 60, 5);

      // Egyptian Flag on rear chassis
      const tfX = -24, tfY = -6;
      ctx.fillStyle = '#dc2626'; // Red
      ctx.fillRect(tfX, tfY, 8, 3);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(tfX, tfY + 3, 8, 3);
      ctx.fillStyle = '#ca8a04'; // Eagle
      ctx.fillRect(tfX + 3, tfY + 4, 2, 1.5);
      ctx.fillStyle = '#000000'; // Black
      ctx.fillRect(tfX, tfY + 6, 8, 3);

      ctx.save();
      ctx.rotate(p.turretAngle);
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(40, 0);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // Sagger Missiles with glowing guidance line
      for (const gm of state.guidedMissiles) {
        if (!gm.active) continue;

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(160, 330);
        ctx.lineTo(gm.x, gm.y);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(gm.x, gm.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(gm.x - 8, gm.y - 2, 8, 4);
      }

      // SAM-6 Missiles
      for (const sam of state.samRockets) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sam.x, sam.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sam.x, sam.y);
        ctx.lineTo(sam.x - sam.vx * 0.05, sam.y - sam.vy * 0.05);
        ctx.stroke();
      }

      // Improved Glowing Cannon Shells & Hostile Air Rockets
      for (const sh of state.shells) {
        if (sh.fromPlayer) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (sh.isAirRocket) {
          // Hostile Air Rocket
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sh.x, sh.y);
          ctx.lineTo(sh.x - sh.vx * 0.04, sh.y - sh.vy * 0.04);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Continuous black smoke rising from burning destroyed tanks
      for (const tank of state.enemyTanks) {
        if (tank.destroyed && Math.random() < 0.28) {
          state.particles.push({
            x: tank.x + (Math.random() - 0.5) * 24,
            y: tank.y - 10,
            vx: (Math.random() - 0.5) * 12 - 6,
            vy: -32 - Math.random() * 20,
            color: Math.random() < 0.7 ? '#18181b' : '#3f3f46',
            life: 1,
            maxLife: 48,
            size: Math.random() * 6 + 5,
            isSmoke: true,
            growth: 0.35,
          });
        }
      }

      // Render Momentary Flash Shockwaves (وميض انفجار لحظي)
      ctx.save();
      for (let s = state.shockwaves.length - 1; s >= 0; s--) {
        const sw = state.shockwaves[s];
        sw.radius += (sw.maxRadius - sw.radius) * 14 * dt;
        sw.alpha -= 4.8 * dt;
        if (sw.alpha <= 0) {
          state.shockwaves.splice(s, 1);
          continue;
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5 * sw.alpha;
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
        ft.y -= 25 * dt;
        ft.life++;
        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
        if (ft.life >= ft.maxLife) state.floatingTexts.splice(t, 1);
      }

      // Reticle
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 16, 0, Math.PI * 2);
      ctx.moveTo(m.x - 22, m.y);
      ctx.lineTo(m.x + 22, m.y);
      ctx.moveTo(m.x, m.y - 22);
      ctx.lineTo(m.x, m.y + 22);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-stone-900 shadow-2xl">
      {/* Top Bar HUD with 2-Minute Timer */}
      <div className="p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold font-cairo text-amber-400">معارك الدبابات وحائط الصواريخ</h2>
            <p className="text-xs text-stone-400">صائدو الدبابات · بطولات معركة المزرعة الصينية</p>
          </div>
        </div>

        {/* Meters & 2-Minute Timer */}
        <div className="flex items-center gap-6 text-xs font-semibold">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              timeLeft < 30
                ? 'bg-red-950/60 border-red-500 text-red-400 animate-pulse'
                : 'bg-stone-900 border-stone-800 text-amber-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-stone-300 font-bold">الوقت المتبقي:</span>
            <span className="font-mono text-sm font-black tabular-nums">{formatTimer(timeLeft)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${platoonHealth}%` }} />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{platoonHealth}%</span>
          </div>

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            <span className="font-mono tabular-nums font-bold text-amber-400">{tanksDestroyed} / 6 دبابات</span>
          </div>

          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-emerald-400" />
            <span className="font-mono tabular-nums font-bold text-emerald-400">{jetsDowned} طائرات</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="font-mono tabular-nums font-bold text-amber-400">{score} نقطة</span>
          </div>
        </div>
      </div>

      {/* Control Helpers Bar */}
      <div className="px-4 py-2 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => launchSaggerMissile()}
            disabled={saggerAmmo <= 0}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>صاروخ مالوتكا موجه (باقي: {saggerAmmo})</span>
          </button>

          <button
            onClick={launchSamMissile}
            disabled={samMissiles <= 0}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>حائط الصواريخ سام-6 (باقي: {samMissiles})</span>
          </button>
        </div>

        <div className="text-xs text-amber-400 font-semibold">
          💡 انقر مباشرة على أي دبابة لإطلاق صاروخ مالوتكا إليها تلقائياً
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={560}
          className="w-full h-full max-w-full max-h-full object-contain cursor-crosshair select-none"
        />

        {/* Digital Countdown Timer at the TOP */}
        {!isWon && !isDefeated && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={missionDuration}
            label="الزمن المتبقي للفوز"
            position="top-center"
          />
        )}

        {/* On-screen Tank Controls for Touch & Mobile Devices */}
        {!isWon && !isDefeated && (
          <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between sm:hidden pointer-events-none select-none">
            {/* Steering D-pad */}
            <div className="pointer-events-auto bg-stone-950/90 p-2 rounded-2xl border border-stone-700/80 backdrop-blur-md shadow-2xl">
              <div className="grid grid-cols-3 gap-1.5 w-32 h-24 text-sm font-black">
                <div />
                <button
                  type="button"
                  onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.up = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.up = false; }}
                  className="bg-stone-800 text-amber-400 active:bg-amber-500 active:text-stone-950 rounded-xl flex items-center justify-center shadow"
                >
                  ▲
                </button>
                <div />
                <button
                  type="button"
                  onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.left = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }}
                  className="bg-stone-800 text-amber-400 active:bg-amber-500 active:text-stone-950 rounded-xl flex items-center justify-center shadow"
                >
                  ◀
                </button>
                <div className="flex items-center justify-center text-[10px] font-mono text-stone-500">T-62</div>
                <button
                  type="button"
                  onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.right = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }}
                  className="bg-stone-800 text-amber-400 active:bg-amber-500 active:text-stone-950 rounded-xl flex items-center justify-center shadow"
                >
                  ▶
                </button>
                <div />
                <button
                  type="button"
                  onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.down = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.down = false; }}
                  className="bg-stone-800 text-amber-400 active:bg-amber-500 active:text-stone-950 rounded-xl flex items-center justify-center shadow"
                >
                  ▼
                </button>
                <div />
              </div>
            </div>

            {/* Fire Action Buttons */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); fireTankCannon(); }}
                className="w-14 h-12 bg-amber-600 active:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-lg border border-amber-400 flex flex-col items-center justify-center"
              >
                <span>💥</span>
                <span className="text-[10px]">مدفع</span>
              </button>
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); launchSaggerMissile(); }}
                disabled={saggerAmmo <= 0}
                className="w-14 h-12 bg-red-600 active:bg-red-400 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg border border-red-400 flex flex-col items-center justify-center"
              >
                <span>🎯</span>
                <span className="text-[10px]">مالوتكا</span>
              </button>
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); launchSamMissile(); }}
                disabled={samMissiles <= 0}
                className="w-14 h-12 bg-emerald-600 active:bg-emerald-400 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg border border-emerald-400 flex flex-col items-center justify-center"
              >
                <span>🚀</span>
                <span className="text-[10px]">سام-6</span>
              </button>
            </div>
          </div>
        )}

        {/* Victory Modal */}
        {isWon && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black font-cairo text-amber-400 mb-1">تم سحق هجوم الدبابات المعادي!</h3>
            <p className="text-xs text-stone-300 max-w-md mb-4">
              أبيدت دبابات العدو وأُسقط طيرانه في زمن قياسي قبل انتهاء الدقيقتين بنجاح مظفر!
            </p>

            <button
              onClick={() => onComplete(score + 2500)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer shadow-lg active:scale-95"
            >
              الانتقال إلى المرحلة الرابعة: إسقاط الحصن ورفع العلم
            </button>
          </div>
        )}

        {/* Defeat / Timeout Modal */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <h3 className="text-xl font-bold font-cairo text-red-400 mb-2">
              {timeLeft <= 0 ? 'انتهت مدة الدقيقتين المخصصة للمهمة!' : 'تعرضت فصيلة الدبابات لأضرار بالغة!'}
            </h3>
            <p className="text-xs text-stone-300 max-w-md mb-5">
              انقر سريعاً على الدبابات المعادية فور ظهورها لإطلاق صواريخ مالوتكا السلكية وسحقها قبل نفاد الوقت.
            </p>
            <button
              onClick={resetBattle}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة المعركة (دقيقتان)
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>انقر بالماوس للتصويب وإطلاق القذائف السريعة أو توجيه صواريخ مالوتكا</span>
        <span className="text-amber-400 font-semibold">«صائد الدبابات» البطل محمد عبد العاطي والبطل محمد المصري</span>
      </div>
    </div>
  );
};
