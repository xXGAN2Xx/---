import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Crosshair, Flame, Plane, RotateCcw, Shield, Target, Timer, Trophy, Zap } from 'lucide-react';
import { sound } from '../utils/audio';
import { isGamePaused } from '../game/pause';
import { Difficulty } from '../game/difficulty';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';

interface TankBattleMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
  onOpenTutorialVideo?: () => void;
}

type EnemyTank = {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireCooldown: number;
  type: 'tank' | 'heavy';
};

type EnemyPlane = {
  id: number;
  x: number;
  y: number;
  speed: number;
  bombCooldown: number;
  hp: number;
};

type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'player' | 'enemy-shell' | 'bomb';
  target?: 'tank' | 'plane';
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  big?: boolean;
};

export const TankBattleMission: React.FC<TankBattleMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
  onOpenTutorialVideo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const nextIdRef = useRef(1);
  const finishRef = useRef(false);

  const settings = {
    easy: {
      duration: 150,
      startingHealth: 125,
      tankTarget: 7,
      planeTarget: 2,
      tankHp: 2,
      heavyHp: 4,
      tankSpeed: 42,
      fireEvery: 2.8,
      planeEvery: 5.0,
    },
    normal: {
      duration: 120,
      startingHealth: 100,
      tankTarget: 9,
      planeTarget: 3,
      tankHp: 2,
      heavyHp: 4,
      tankSpeed: 52,
      fireEvery: 2.25,
      planeEvery: 4.2,
    },
    hard: {
      duration: 105,
      startingHealth: 90,
      tankTarget: 12,
      planeTarget: 4,
      tankHp: 3,
      heavyHp: 5,
      tankSpeed: 62,
      fireEvery: 1.8,
      planeEvery: 3.4,
    },
  }[difficulty] ?? {
    duration: 120,
    startingHealth: 100,
    tankTarget: 9,
    planeTarget: 3,
    tankHp: 2,
    heavyHp: 4,
    tankSpeed: 52,
    fireEvery: 2.25,
    planeEvery: 4.2,
  };

  const worldRef = useRef({
    width: 1200,
    height: 700,
    aimX: 820,
    aimY: 300,
    playerHealth: settings.startingHealth,
    tanksDestroyed: 0,
    planesDestroyed: 0,
    score: 0,
    elapsed: 0,
    tankSpawnTimer: 1.2,
    planeSpawnTimer: 4.2,
    fireCooldown: 0,
    tanks: [] as EnemyTank[],
    planes: [] as EnemyPlane[],
    projectiles: [] as Projectile[],
    explosions: [] as Explosion[],
    stars: Array.from({ length: 42 }, (_, i) => ({
      x: (i * 173) % 1200,
      y: 30 + ((i * 71) % 240),
      r: 0.8 + (i % 3) * 0.55,
    })),
  });

  const [timeLeft, setTimeLeft] = useState(settings.duration);
  const [health, setHealth] = useState(settings.startingHealth);
  const [tanksDestroyed, setTanksDestroyed] = useState(0);
  const [planesDestroyed, setPlanesDestroyed] = useState(0);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'health' | 'timeout'>('health');
  const [feedback, setFeedback] = useState('وجّه المدفع نحو دبابات العدو واضغط إطلاق النار. أسقط الطائرات قبل أن ترمي القنابل!');

  const resetWorld = useCallback(() => {
    const world = worldRef.current;
    world.playerHealth = settings.startingHealth;
    world.tanksDestroyed = 0;
    world.planesDestroyed = 0;
    world.score = 0;
    world.elapsed = 0;
    world.tankSpawnTimer = 1.4;
    world.planeSpawnTimer = 4.2;
    world.fireCooldown = 0;
    world.aimX = 820;
    world.aimY = 300;
    world.tanks = [];
    world.planes = [];
    world.projectiles = [];
    world.explosions = [];
    setTimeLeft(settings.duration);
    setHealth(settings.startingHealth);
    setTanksDestroyed(0);
    setPlanesDestroyed(0);
    setScore(0);
    setIsWon(false);
    setIsDefeated(false);
    setDefeatReason('health');
    setFeedback('وجّه المدفع نحو دبابات العدو واضغط إطلاق النار. أسقط الطائرات قبل أن ترمي القنابل!');
    finishRef.current = false;
  }, [settings.duration, settings.startingHealth]);

  const endVictory = useCallback(() => {
    if (finishRef.current) return;
    finishRef.current = true;
    const world = worldRef.current;
    const timeBonus = Math.max(0, Math.round(timeLeft * 5));
    const earned = world.tanksDestroyed * 450 + world.planesDestroyed * 700 + timeBonus;
    world.score = earned;
    setScore(earned);
    setIsWon(true);
    setFeedback('الله أكبر! تم صد الهجوم المدرع والجوي وحماية الموقع المصري! 🇪🇬');
    sound.playVictoryFanfare();
  }, [timeLeft]);

  const endDefeat = useCallback((reason: 'health' | 'timeout') => {
    if (finishRef.current) return;
    finishRef.current = true;
    setDefeatReason(reason);
    setIsDefeated(true);
    setFeedback(reason === 'health' ? 'تعرضت الدبابة لنيران كثيفة من الدبابات والطائرات المعادية.' : 'انتهى الوقت قبل صد الهجوم المعادي.');
    sound.playDefeatSound();
    onDefeat?.(reason === 'health' ? 'breach' : 'timeout');
  }, [onDefeat]);

  const firePlayerShell = useCallback(() => {
    const world = worldRef.current;
    if (finishRef.current || world.fireCooldown > 0 || isGamePaused()) return;
    world.fireCooldown = 0.42;

    const tankX = 145;
    const tankY = 585;
    const dx = world.aimX - tankX;
    const dy = world.aimY - tankY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = 900;

    world.projectiles.push({
      id: nextIdRef.current++,
      x: tankX + 28,
      y: tankY - 24,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      kind: 'player',
      target: 'tank',
    });
    sound.playCannon();
  }, []);

  const updateAimFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = worldRef.current.width / rect.width;
    const scaleY = worldRef.current.height / rect.height;
    worldRef.current.aimX = Math.max(250, Math.min(worldRef.current.width - 30, (event.clientX - rect.left) * scaleX));
    worldRef.current.aimY = Math.max(80, Math.min(worldRef.current.height - 90, (event.clientY - rect.top) * scaleY));
  };

  const spawnTank = () => {
    const world = worldRef.current;
    const heavy = (world.tanksDestroyed + world.tanks.length) % 4 === 3;
    const maxHp = heavy ? settings.heavyHp : settings.tankHp;
    world.tanks.push({
      id: nextIdRef.current++,
      x: world.width + 70,
      y: 465 + ((world.tanks.length * 47) % 110),
      hp: maxHp,
      maxHp,
      speed: settings.tankSpeed * (heavy ? 0.72 : 1),
      fireCooldown: settings.fireEvery * (0.7 + Math.random() * 0.55),
      type: heavy ? 'heavy' : 'tank',
    });
  };

  const spawnPlane = () => {
    const world = worldRef.current;
    world.planes.push({
      id: nextIdRef.current++,
      x: world.width + 80,
      y: 90 + Math.random() * 130,
      speed: 105 + Math.random() * 45,
      bombCooldown: 1.8 + Math.random() * 1.6,
      hp: 2,
    });
  };

  const addExplosion = (x: number, y: number, big = false) => {
    worldRef.current.explosions.push({
      id: nextIdRef.current++,
      x,
      y,
      life: 0,
      maxLife: big ? 0.8 : 0.45,
      radius: big ? 48 : 25,
      big,
    });
  };

  const damagePlayer = (amount: number) => {
    const world = worldRef.current;
    world.playerHealth = Math.max(0, world.playerHealth - amount);
    setHealth(world.playerHealth);
    addExplosion(145, 585, amount >= 14);
    sound.playHitSound();
    if (world.playerHealth <= 0) endDefeat('health');
  };

  const hitEnemyAt = (p: Projectile) => {
    const world = worldRef.current;

    for (let i = world.tanks.length - 1; i >= 0; i -= 1) {
      const tank = world.tanks[i];
      if (Math.hypot(p.x - tank.x, p.y - tank.y) < (tank.type === 'heavy' ? 52 : 42)) {
        tank.hp -= 1;
        addExplosion(p.x, p.y, tank.hp <= 0);
        sound.playExplosion(tank.hp <= 0 ? 1.0 : 0.45);
        if (tank.hp <= 0) {
          world.tanks.splice(i, 1);
          world.tanksDestroyed += 1;
          world.score += tank.type === 'heavy' ? 700 : 450;
          setTanksDestroyed(world.tanksDestroyed);
          setScore(world.score);
          setFeedback('إصابة مباشرة! دمرت دبابة معادية.');
        } else {
          setFeedback('إصابة مباشرة — الدبابة المعادية تضررت.');
        }
        return true;
      }
    }

    for (let i = world.planes.length - 1; i >= 0; i -= 1) {
      const plane = world.planes[i];
      if (Math.hypot(p.x - plane.x, p.y - plane.y) < 45) {
        plane.hp -= 1;
        addExplosion(p.x, p.y, plane.hp <= 0);
        if (plane.hp <= 0) {
          world.planes.splice(i, 1);
          world.planesDestroyed += 1;
          world.score += 700;
          setPlanesDestroyed(world.planesDestroyed);
          setScore(world.score);
          setFeedback('طائرة معادية سقطت! ✈️');
          sound.playExplosion(1.1);
        } else {
          sound.playHitSound();
          setFeedback('أصبت الطائرة المعادية — أطلق مرة أخرى لإسقاطها.');
        }
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    resetWorld();
  }, [resetWorld]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isGamePaused() || isWon || isDefeated || finishRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endDefeat('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endDefeat, isWon, isDefeated]);

  useEffect(() => {
    if (tanksDestroyed >= settings.tankTarget && planesDestroyed >= settings.planeTarget) {
      endVictory();
    }
  }, [tanksDestroyed, planesDestroyed, settings.tankTarget, settings.planeTarget, endVictory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    const drawTank = (x: number, y: number, enemy = false, heavy = false) => {
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = enemy ? '#6b7280' : '#365314';
      ctx.strokeStyle = enemy ? '#27272a' : '#17220d';
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.roundRect(-34, -18, 68, 30, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#18181b';
      for (let i = -25; i <= 25; i += 12) {
        ctx.beginPath();
        ctx.arc(i, 15, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = enemy ? '#9ca3af' : '#4d7c0f';
      ctx.beginPath();
      ctx.arc(0, -16, heavy ? 23 : 19, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = enemy ? '#111827' : '#1f2937';
      ctx.lineWidth = heavy ? 9 : 7;
      ctx.beginPath();
      ctx.moveTo(8, -19);
      ctx.lineTo(enemy ? -72 : 80, -28);
      ctx.stroke();

      if (!enemy) {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(-8, -17, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawPlane = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(-12, -8);
      ctx.lineTo(8, -30);
      ctx.lineTo(18, -8);
      ctx.lineTo(50, 0);
      ctx.lineTo(18, 8);
      ctx.lineTo(8, 30);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-17, -3, 27, 6);
      ctx.restore();
    };

    const render = (now: number) => {
      if (cancelled) return;
      const world = worldRef.current;
      const dt = lastFrameRef.current ? Math.min(0.033, (now - lastFrameRef.current) / 1000) : 0.016;
      lastFrameRef.current = now;

      if (!isGamePaused() && !finishRef.current) {
        world.elapsed += dt;
        world.fireCooldown = Math.max(0, world.fireCooldown - dt);

        world.tankSpawnTimer -= dt;
        world.planeSpawnTimer -= dt;

        const targetTankSpawn = Math.max(0.9, 2.8 - world.elapsed * 0.012);
        if (world.tankSpawnTimer <= 0 && world.tanksDestroyed < settings.tankTarget + 3) {
          spawnTank();
          world.tankSpawnTimer = targetTankSpawn;
        }

        if (world.planeSpawnTimer <= 0 && world.planesDestroyed < settings.planeTarget + 2) {
          spawnPlane();
          world.planeSpawnTimer = settings.planeEvery;
        }

        for (const tank of world.tanks) {
          tank.x -= tank.speed * dt;
          tank.fireCooldown -= dt;
          if (tank.fireCooldown <= 0 && tank.x < world.width - 80) {
            world.projectiles.push({
              id: nextIdRef.current++,
              x: tank.x - 42,
              y: tank.y - 18,
              vx: -320,
              vy: (585 - tank.y) * 0.12,
              kind: 'enemy-shell',
            });
            tank.fireCooldown = settings.fireEvery * (0.8 + Math.random() * 0.55);
            sound.playGunshot();
          }
          if (tank.x < 235) {
            tank.x = 235;
            if (Math.random() < dt * 0.6) damagePlayer(tank.type === 'heavy' ? 11 : 7);
          }
        }

        for (const plane of world.planes) {
          plane.x -= plane.speed * dt;
          plane.bombCooldown -= dt;
          if (plane.bombCooldown <= 0 && plane.x < 900) {
            world.projectiles.push({
              id: nextIdRef.current++,
              x: plane.x,
              y: plane.y + 24,
              vx: -55,
              vy: 250,
              kind: 'bomb',
            });
            plane.bombCooldown = 2.2 + Math.random() * 1.4;
            setFeedback('⚠️ طائرة معادية أسقطت قنبلة — حاول إسقاطها بسرعة!');
          }
        }

        for (let i = world.projectiles.length - 1; i >= 0; i -= 1) {
          const p = world.projectiles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          if (p.kind === 'player') {
            if (hitEnemyAt(p)) {
              world.projectiles.splice(i, 1);
              continue;
            }
          } else if (p.kind === 'enemy-shell' && Math.hypot(p.x - 145, p.y - 585) < 42) {
            world.projectiles.splice(i, 1);
            damagePlayer(8);
            continue;
          } else if (p.kind === 'bomb' && Math.hypot(p.x - 145, p.y - 585) < 50) {
            world.projectiles.splice(i, 1);
            damagePlayer(15);
            continue;
          }

          if (p.x < -80 || p.x > world.width + 100 || p.y < -80 || p.y > world.height + 80) {
            world.projectiles.splice(i, 1);
          }
        }

        for (let i = world.explosions.length - 1; i >= 0; i -= 1) {
          const e = world.explosions[i];
          e.life += dt;
          if (e.life >= e.maxLife) world.explosions.splice(i, 1);
        }
      }

      const w = world.width;
      const h = world.height;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#081426');
      sky.addColorStop(0.45, '#1e3a50');
      sky.addColorStop(0.72, '#9a5b20');
      sky.addColorStop(1, '#c0842c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      for (const s of world.stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#422006';
      ctx.beginPath();
      ctx.moveTo(0, 410);
      ctx.quadraticCurveTo(180, 330, 370, 405);
      ctx.quadraticCurveTo(590, 325, 800, 395);
      ctx.quadraticCurveTo(1010, 330, 1200, 385);
      ctx.lineTo(1200, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#713f12';
      ctx.fillRect(0, 430, w, h - 430);

      ctx.strokeStyle = 'rgba(68, 42, 8, 0.65)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i += 1) {
        const y = 455 + i * 28;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(350, y - 12, 700, y + 6);
        ctx.quadraticCurveTo(950, y + 16, 1200, y - 2);
        ctx.stroke();
      }

      // Defensive position.
      ctx.fillStyle = '#92400e';
      ctx.fillRect(55, 515, 220, 95);
      ctx.fillStyle = '#a8a29e';
      for (let i = 0; i < 7; i += 1) {
        ctx.fillRect(48 + i * 30, 500 + (i % 2) * 7, 26, 15);
      }

      drawTank(145, 585, false, false);

      // Player aim line.
      ctx.strokeStyle = 'rgba(250,204,21,0.2)';
      ctx.setLineDash([10, 9]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(185, 558);
      ctx.lineTo(world.aimX, world.aimY);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const tank of world.tanks) {
        drawTank(tank.x, tank.y, true, tank.type === 'heavy');

        const barW = tank.type === 'heavy' ? 74 : 60;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(tank.x - barW / 2, tank.y - 58, barW, 7);
        ctx.fillStyle = tank.hp / tank.maxHp > 0.45 ? '#22c55e' : '#ef4444';
        ctx.fillRect(tank.x - barW / 2, tank.y - 58, barW * (tank.hp / tank.maxHp), 7);
      }

      for (const plane of world.planes) {
        drawPlane(plane.x, plane.y);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(plane.x - 24, plane.y + 38, 48 * (plane.hp / 2), 5);
      }

      for (const p of world.projectiles) {
        if (p.kind === 'player') {
          ctx.fillStyle = '#fde047';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.kind === 'enemy-shell') {
          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Crosshair.
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(world.aimX, world.aimY, 22, 0, Math.PI * 2);
      ctx.moveTo(world.aimX - 34, world.aimY);
      ctx.lineTo(world.aimX - 8, world.aimY);
      ctx.moveTo(world.aimX + 8, world.aimY);
      ctx.lineTo(world.aimX + 34, world.aimY);
      ctx.moveTo(world.aimX, world.aimY - 34);
      ctx.lineTo(world.aimX, world.aimY - 8);
      ctx.moveTo(world.aimX, world.aimY + 8);
      ctx.lineTo(world.aimX, world.aimY + 34);
      ctx.stroke();

      for (const e of world.explosions) {
        const t = e.life / e.maxLife;
        const alpha = 1 - t;
        const radius = e.radius * (0.35 + t * 0.9);

        ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius * 0.58, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(55, 65, 81, ${alpha * 0.55})`;
        ctx.beginPath();
        ctx.arc(e.x - radius * 0.45, e.y - radius * 0.8, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Target progress.
      ctx.fillStyle = 'rgba(2,6,23,0.75)';
      ctx.fillRect(18, 18, 440, 58);
      ctx.fillStyle = '#fef3c7';
      ctx.font = '700 22px Cairo, sans-serif';
      ctx.fillText('معركة الدبابات — موقع المدفعية المصري', 34, 45);
      ctx.font = '700 15px Cairo, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`الدبابات: ${world.tanksDestroyed}/${settings.tankTarget}   |   الطائرات: ${world.planesDestroyed}/${settings.planeTarget}`, 34, 67);

      ctx.fillStyle = 'rgba(2,6,23,0.62)';
      ctx.fillRect(w - 380, 18, 350, 60);
      ctx.fillStyle = '#fef3c7';
      ctx.font = '700 16px Cairo, sans-serif';
      ctx.fillText('اضغط داخل الميدان للتصويب', w - 355, 43);
      ctx.fillText('ثم اضغط زر إطلاق النار', w - 355, 66);

      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);
    return () => {
      cancelled = true;
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [endDefeat, settings, timeLeft]);

  const handleReset = () => {
    sound.playRadioTransmission();
    resetWorld();
  };

  const progressTotal = settings.tankTarget + settings.planeTarget;
  const progressDone = tanksDestroyed + planesDestroyed;
  const readyToWin = tanksDestroyed >= settings.tankTarget && planesDestroyed >= settings.planeTarget;

  return (
    <div dir="rtl" className="w-full h-full min-h-0 flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden">
      <div className="desktop-only-bar px-3 sm:px-4 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onExit}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
            aria-label="العودة"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-cairo font-black text-amber-400 text-sm sm:text-base truncate">المرحلة 4: معركة الدبابات</h2>
            <p className="text-[11px] text-stone-400">دافع عن الموقع المصري أمام هجوم الدبابات والطائرات</p>
          </div>
          {onOpenTutorialVideo && (
            <button
              onClick={onOpenTutorialVideo}
              className="hidden sm:flex px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold"
            >
              فيديو الشرح
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-cairo">
          <div className="px-2.5 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>الدرع {health}%</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            <span>{score}</span>
          </div>
          <MissionDigitalTimer timeLeft={timeLeft} totalTime={settings.duration} />
        </div>
      </div>

      <div className="relative flex-1 min-h-0 bg-black">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          className="combat-canvas w-full h-full block"
          onPointerMove={updateAimFromPointer}
          onPointerDown={(event) => {
            updateAimFromPointer(event);
            if (event.pointerType === 'mouse') firePlayerShell();
          }}
          aria-label="معركة تفاعلية بالدبابات والطائرات"
        />

        <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none gap-2">
          <div className="px-3 py-2 rounded-xl bg-stone-950/80 border border-stone-700/70 backdrop-blur-sm text-[11px] sm:text-xs font-cairo text-amber-200 max-w-[70%]">
            {feedback}
          </div>
          <div className="px-3 py-2 rounded-xl bg-stone-950/80 border border-stone-700/70 backdrop-blur-sm text-[11px] font-bold text-stone-200">
            {progressDone}/{progressTotal}
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleReset}
              className="w-11 h-11 rounded-xl bg-stone-950/90 border border-stone-700 text-stone-200 flex items-center justify-center active:scale-95"
              title="إعادة المهمة"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <div className="px-3 py-2 rounded-xl bg-stone-950/90 border border-stone-700 text-[11px] sm:text-xs text-stone-300 font-cairo">
              الدبابة ثابتة — حرّك مؤشر التصويب وأطلق
            </div>
          </div>

          <button
            type="button"
            onClick={firePlayerShell}
            disabled={isWon || isDefeated}
            className="pointer-events-auto w-24 h-16 sm:w-28 sm:h-18 rounded-2xl bg-red-600 hover:bg-red-500 border-2 border-red-300 text-white font-black font-cairo text-base sm:text-lg shadow-[0_0_24px_rgba(239,68,68,0.35)] active:scale-95 flex flex-col items-center justify-center gap-1"
          >
            <Crosshair className="w-7 h-7" />
            <span>إطلاق</span>
          </button>
        </div>

        {isDefeated && (
          <div className="absolute inset-0 z-40 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-5 text-center">
            <div className="max-w-md rounded-2xl border border-red-700/70 bg-stone-900 p-6 shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-xl sm:text-2xl font-black font-cairo text-red-400 mb-2">فشل الدفاع عن الموقع</h3>
              <p className="text-sm text-stone-300 leading-relaxed mb-5">
                {defeatReason === 'health'
                  ? 'وصلت نيران الدبابات والقنابل إلى الموقع. أعد التصويب بسرعة وركز على الأهداف الأقرب.'
                  : 'انتهى الوقت قبل إسقاط العدد المطلوب من الدبابات والطائرات.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-black font-cairo flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> إعادة المحاولة
                </button>
                <button
                  onClick={onExit}
                  className="px-5 py-2.5 rounded-xl bg-stone-800 text-stone-200 font-bold font-cairo"
                >
                  خروج
                </button>
              </div>
            </div>
          </div>
        )}

        {readyToWin && !isWon && !isDefeated && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="px-5 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-black font-cairo">
              تم صد الهجوم — إعلان النصر...
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-stone-900 border-t border-stone-800 px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-cairo text-stone-300">
          <Target className="w-4 h-4 text-amber-400" />
          <span>الهدف: تدمير {settings.tankTarget} دبابات و{settings.planeTarget} طائرات</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-stone-400 font-cairo">
          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-red-400" /> دبابات مهاجمة</span>
          <span className="flex items-center gap-1"><Plane className="w-3.5 h-3.5 text-sky-300" /> طائرات مهاجمة</span>
          <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-300" /> قذيفة الدبابة</span>
        </div>
      </div>

      <VictoryModal
        isOpen={isWon}
        missionId="MISSION_TANK_BATTLE"
        missionTitle="المرحلة 4: معركة الدبابات"
        congratulatoryMessage="مبروك! دافعت عن الموقع المصري وصدّدت هجوم الدبابات والطائرات بنجاح."
        score={score}
        timeLeft={timeLeft}
        targetsDestroyed={tanksDestroyed + planesDestroyed}
        totalTargets={progressTotal}
        customStats={[
          { label: 'الدبابات المدمرة', value: String(tanksDestroyed), highlight: true },
          { label: 'الطائرات المسقطة', value: String(planesDestroyed), highlight: true },
          { label: 'سلامة الدبابة', value: `${health}%`, highlight: true },
        ]}
        onNextMission={() => onComplete(score)}
        onReturnToBase={onExit}
        onReplay={handleReset}
      />
    </div>
  );
};
