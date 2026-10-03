import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Waves, Droplet, Shield, Trophy, CheckCircle2, RotateCcw, Clock, Sparkles } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';

interface CrossingMissionProps {
  onComplete: (scoreEarned: number) => void;
  onExit: () => void;
}

interface SandSection {
  id: number;
  x: number;
  width: number;
  height: number;
  maxHeight: number;
  erodedPercent: number;
  breached: boolean;
}

interface AssaultBoat {
  id: number;
  x: number;
  y: number;
  targetX: number;
  soldiers: number;
  arrived: boolean;
  destroyed: boolean;
}

interface EnemyBunker {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  label: string;
  destroyed: boolean;
  cooldown: number;
}

export const CrossingMission: React.FC<CrossingMissionProps> = ({ onComplete, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [boatsCrossed, setBoatsCrossed] = useState(0);
  const [bridgeProgress, setBridgeProgress] = useState(0);
  const [tanksCrossed, setTanksCrossed] = useState(0);
  const [missionScore, setMissionScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2-minute timer
  const [continuousSpray, setContinuousSpray] = useState(true);
  const [bothPumpsActive, setBothPumpsActive] = useState(true);
  const [isWon, setIsWon] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  const gameRef = useRef({
    waterPumps: [
      { x: 110, y: 290, angle: 0, firing: true },
      { x: 110, y: 430, angle: 0, firing: true },
    ],
    sandSections: [
      { id: 1, x: 590, width: 105, height: 180, maxHeight: 180, erodedPercent: 0, breached: false },
      { id: 2, x: 720, width: 105, height: 180, maxHeight: 180, erodedPercent: 0, breached: false },
      { id: 3, x: 850, width: 105, height: 180, maxHeight: 180, erodedPercent: 0, breached: false },
    ] as SandSection[],
    bunkers: [
      { id: 1, x: 640, y: 130, hp: 80, maxHp: 80, label: 'دشمة رقم 14 (مدفعية)', destroyed: false, cooldown: 0 },
      { id: 2, x: 800, y: 130, hp: 80, maxHp: 80, label: 'دشمة الكيلو 19 (رشاشات)', destroyed: false, cooldown: 35 },
    ] as EnemyBunker[],
    boats: [] as AssaultBoat[],
    bullets: [] as { x: number; y: number; vx: number; vy: number; fromEnemy: boolean }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number }[],
    floatingTexts: [] as { id: number; x: number; y: number; text: string; color: string; life: number; maxLife: number }[],
    tanks: [] as { x: number; y: number; crossed: boolean }[],
    bridgeBuilt: 0,
    aimMouse: { x: 720, y: 320, isDown: true },
    score: 0,
    timeLeft: 120,
    screenShake: 0,
    continuousSprayEnabled: true,
    bothPumpsEnabled: true,
    lastBoatLaunch: 0,
    isComplete: false,
  });

  useEffect(() => {
    gameRef.current.continuousSprayEnabled = continuousSpray;
  }, [continuousSpray]);

  useEffect(() => {
    gameRef.current.bothPumpsEnabled = bothPumpsActive;
  }, [bothPumpsActive]);

  // 2-Minute Countdown Timer
  useEffect(() => {
    if (isWon || isFailed) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        gameRef.current.timeLeft = next;

        if (next <= 0 && !gameRef.current.isComplete) {
          gameRef.current.isComplete = true;
          setIsFailed(true);
          sound.playDefeatSound();
          sound.playExplosion(1.0);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWon, isFailed]);

  const addFloatingText = (x: number, y: number, text: string, color = '#38bdf8') => {
    gameRef.current.floatingTexts.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 40,
    });
  };

  const launchAssaultBoat = () => {
    const game = gameRef.current;
    if (game.boats.length >= 7) return;
    sound.playRadioClick();
    game.boats.push({
      id: Date.now() + Math.random(),
      x: 80,
      y: 220 + Math.random() * 260,
      targetX: 600,
      soldiers: 8,
      arrived: false,
      destroyed: false,
    });
    addFloatingText(120, 240, '«الله أكبر.. بسم الله» 🇪🇬', '#facc15');
  };

  const buildBridgeSegment = () => {
    const game = gameRef.current;
    const anyBreached = game.sandSections.some((s) => s.breached);
    if (!anyBreached) {
      addFloatingText(300, 360, 'يجب أولاً فتح ثغرة بالساتر الترابي!', '#ef4444');
      return;
    }

    sound.playCannon();
    game.bridgeBuilt = Math.min(100, game.bridgeBuilt + 34);
    setBridgeProgress(game.bridgeBuilt);
    addFloatingText(320, 340, `+${game.bridgeBuilt}% تركيب جسر عائم PMP`, '#4ade80');

    if (game.bridgeBuilt >= 100) {
      game.tanks.push({ x: 60, y: 360, crossed: false });
      game.score += 1000;
      setMissionScore(game.score);
      addFloatingText(320, 320, 'عبرت فصائل الدبابات إلى سيناء! ⚔️', '#38bdf8');
    }
  };

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const updateAim = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      gameRef.current.aimMouse.x = (clientX - rect.left) * scaleX;
      gameRef.current.aimMouse.y = (clientY - rect.top) * scaleY;
    };

    const handleMouseMove = (e: MouseEvent) => updateAim(e.clientX, e.clientY);
    const handleMouseDown = (e: MouseEvent) => {
      gameRef.current.aimMouse.isDown = true;
      updateAim(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      if (!gameRef.current.continuousSprayEnabled) {
        gameRef.current.aimMouse.isDown = false;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateAim(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) updateAim(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    launchAssaultBoat();
    setTimeout(launchAssaultBoat, 1200);

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const game = gameRef.current;
      if (game.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      // Fast-paced automatic boat launch
      if (currentTime - game.lastBoatLaunch > 3800 && game.boats.length < 5) {
        game.lastBoatLaunch = currentTime;
        launchAssaultBoat();
      }

      // 1. Water Cannons with High Pressure (35%/s erosion)
      const aim = game.aimMouse;
      const isFiring = game.continuousSprayEnabled || aim.isDown;

      game.waterPumps.forEach((pump, pIdx) => {
        if (!game.bothPumpsEnabled && pIdx === 1) return;

        const dx = aim.x - pump.x;
        const dy = aim.y - pump.y;
        pump.angle = Math.atan2(dy, dx);
        pump.firing = isFiring;

        if (pump.firing) {
          if (Math.random() < 0.25) sound.playWaterCannon();

          // Water jet particles
          for (let i = 0; i < 3; i++) {
            const spread = (Math.random() - 0.5) * 0.12;
            const speed = 800 + Math.random() * 220;
            game.particles.push({
              x: pump.x + Math.cos(pump.angle) * 32,
              y: pump.y + Math.sin(pump.angle) * 32,
              vx: Math.cos(pump.angle + spread) * speed,
              vy: Math.sin(pump.angle + spread) * speed,
              color: i % 2 === 0 ? '#38bdf8' : '#7dd3fc',
              life: 1,
              maxLife: 30,
              size: Math.random() * 5 + 3,
            });
          }

          // Erode sand sections rapidly
          for (const section of game.sandSections) {
            if (aim.x >= section.x - 20 && aim.x <= section.x + section.width + 20) {
              section.erodedPercent = Math.min(100, section.erodedPercent + 35 * dt);

              if (section.erodedPercent >= 100 && !section.breached) {
                section.breached = true;
                sound.playExplosion(1.0);
                game.score += 800;
                setMissionScore(game.score);
                addFloatingText(section.x + 30, 240, '+800 فُتِحَت ثغرة بالساتر الترابي! 🌊', '#4ade80');
              }
            }
          }

          // Suppress Bunkers
          for (const bunker of game.bunkers) {
            if (!bunker.destroyed && Math.hypot(aim.x - bunker.x, aim.y - bunker.y) < 55) {
              bunker.hp -= 45 * dt;
              if (bunker.hp <= 0) {
                bunker.destroyed = true;
                sound.playExplosion(1.3);
                game.score += 1200;
                setMissionScore(game.score);
                addFloatingText(bunker.x, bunker.y - 30, '+1200 إخماد الدشمة! 💥', '#f59e0b');
              }
            }
          }
        }
      });

      // 2. Faster Boat Movement (140 px/s)
      for (let i = game.boats.length - 1; i >= 0; i--) {
        const boat = game.boats[i];
        if (boat.destroyed) {
          game.boats.splice(i, 1);
          continue;
        }

        if (!boat.arrived) {
          boat.x += 140 * dt;
          if (boat.x >= boat.targetX) {
            boat.arrived = true;
            sound.playRadioClick();
            setBoatsCrossed((prev) => {
              const next = prev + 1;
              if (next >= 5 && game.sandSections.some((s) => s.breached) && !game.isComplete) {
                game.isComplete = true;
                const timeBonus = game.timeLeft * 20;
                game.score += timeBonus;
                setMissionScore(game.score);
                setIsWon(true);
                sound.playVictoryFanfare();
              }
              return next;
            });
            game.score += 400;
            setMissionScore(game.score);
            addFloatingText(boat.targetX, boat.y, '+400 نزول المشاة في سيناء!', '#38bdf8');
          }
        }
      }

      // 3. Enemy Bunkers firing
      for (const bunker of game.bunkers) {
        if (bunker.destroyed) continue;
        bunker.cooldown++;
        if (bunker.cooldown > 90) {
          bunker.cooldown = 0;
          const activeBoat = game.boats.find((b) => !b.arrived && !b.destroyed);
          if (activeBoat) {
            sound.playGunshot();
            const bdx = activeBoat.x - bunker.x;
            const bdy = activeBoat.y - bunker.y;
            const dist = Math.hypot(bdx, bdy);
            game.bullets.push({
              x: bunker.x,
              y: bunker.y,
              vx: (bdx / dist) * 380,
              vy: (bdy / dist) * 380,
              fromEnemy: true,
            });
          }
        }
      }

      // 4. Update Bullets
      for (let b = game.bullets.length - 1; b >= 0; b--) {
        const bullet = game.bullets[b];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        for (const boat of game.boats) {
          if (!boat.arrived && !boat.destroyed) {
            if (Math.hypot(bullet.x - boat.x, bullet.y - boat.y) < 25) {
              boat.soldiers -= 2;
              game.bullets.splice(b, 1);
              if (boat.soldiers <= 0) {
                boat.destroyed = true;
                sound.playExplosion(0.6);
              }
              break;
            }
          }
        }

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
          game.bullets.splice(b, 1);
        }
      }

      // 5. Update Tanks on bridge
      for (const tank of game.tanks) {
        if (!tank.crossed) {
          tank.x += 150 * dt;
          if (tank.x > 750) {
            tank.crossed = true;
            setTanksCrossed((c) => c + 1);
            game.score += 600;
            setMissionScore(game.score);
            sound.playCannon();
          }
        }
      }

      // Check Victory Condition
      const allBreached = game.sandSections.every((s) => s.breached);
      if (allBreached && game.bunkers.every((b) => b.destroyed) && !game.isComplete) {
        game.isComplete = true;
        const timeBonus = game.timeLeft * 20;
        game.score += timeBonus;
        setMissionScore(game.score);
        setIsWon(true);
        sound.playVictoryFanfare();
      }

      // 6. Draw Scene
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 180);
      skyGrad.addColorStop(0, '#78350f');
      skyGrad.addColorStop(0.7, '#d97706');
      skyGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 180);

      // Canal
      const canalGrad = ctx.createLinearGradient(0, 180, 0, canvas.height);
      canalGrad.addColorStop(0, '#0369a1');
      canalGrad.addColorStop(0.4, '#0284c7');
      canalGrad.addColorStop(1, '#075985');
      ctx.fillStyle = canalGrad;
      ctx.fillRect(0, 180, canvas.width, canvas.height - 180);

      // Western Bank
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 180, 80, canvas.height - 180);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(72, 180, 6, canvas.height - 180);

      // Bridges
      if (game.bridgeBuilt > 0) {
        const bridgeWidth = (game.bridgeBuilt / 100) * 530;
        ctx.fillStyle = '#52525b';
        ctx.fillRect(80, 345, bridgeWidth, 32);
        ctx.fillStyle = '#27272a';
        for (let bx = 85; bx < 80 + bridgeWidth; bx += 18) {
          ctx.fillRect(bx, 345, 4, 32);
        }
        ctx.fillStyle = '#eab308';
        ctx.fillRect(80, 360, bridgeWidth, 2);
      }

      // Sand Ramparts
      for (const section of game.sandSections) {
        if (section.breached) {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(section.x, 180, section.width, canvas.height - 180);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 13px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ثغرة مفتوحة! ⚔️', section.x + section.width / 2, 220);
        } else {
          const sandGrad = ctx.createLinearGradient(section.x, 180, section.x + section.width, 180);
          sandGrad.addColorStop(0, '#d97706');
          sandGrad.addColorStop(0.5, '#f59e0b');
          sandGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = sandGrad;
          ctx.fillRect(section.x, 180, section.width, canvas.height - 180);

          const erodedBar = Math.floor(section.erodedPercent);
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(section.x + 8, 195, section.width - 16, 8);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(section.x + 8, 195, ((section.width - 16) * erodedBar) / 100, 8);

          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(`جرف: ${erodedBar}%`, section.x + section.width / 2, 220);
        }
      }

      // Enemy Bunkers
      for (const bunker of game.bunkers) {
        if (bunker.destroyed) {
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(bunker.x, bunker.y, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('دشمة مدمرة 🔥', bunker.x, bunker.y - 30);
        } else {
          ctx.fillStyle = '#57534e';
          ctx.beginPath();
          ctx.roundRect(bunker.x - 32, bunker.y - 22, 64, 44, 8);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.fillRect(bunker.x - 22, bunker.y - 6, 44, 12);

          const bw = 50;
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(bunker.x - bw / 2, bunker.y - 34, bw, 6);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(bunker.x - bw / 2, bunker.y - 34, (bunker.hp / bunker.maxHp) * bw, 6);

          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.fillText(bunker.label, bunker.x, bunker.y - 42);
        }
      }

      // Draw Boats
      for (const boat of game.boats) {
        if (boat.destroyed) continue;

        ctx.save();
        ctx.translate(boat.x, boat.y);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        for (let s = -14; s <= 14; s += 8) {
          ctx.beginPath();
          ctx.arc(s, -2, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(s, 2, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-22, -10, 6, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-22, -8, 6, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-22, -6, 6, 2);
        ctx.restore();
      }

      // Draw Water Pumps
      game.waterPumps.forEach((p, idx) => {
        if (!game.bothPumpsEnabled && idx === 1) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, -6, 30, 12);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(22, -4, 10, 8);
        ctx.restore();
      });

      // Draw Particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const pt = game.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life++;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        if (pt.life >= pt.maxLife) game.particles.splice(i, 1);
      }

      // Draw Glowing Tracer Bullets
      for (const bullet of game.bullets) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bullet.x - 8, bullet.y - 2, 16, 4);
        ctx.shadowBlur = 0;
      }

      // Draw Floating Texts
      for (let t = game.floatingTexts.length - 1; t >= 0; t--) {
        const ft = game.floatingTexts[t];
        ft.y -= 25 * dt;
        ft.life++;
        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
        if (ft.life >= ft.maxLife) game.floatingTexts.splice(t, 1);
      }

      // Crosshair
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 14, 0, Math.PI * 2);
      ctx.moveTo(aim.x - 18, aim.y);
      ctx.lineTo(aim.x + 18, aim.y);
      ctx.moveTo(aim.x, aim.y - 18);
      ctx.lineTo(aim.x, aim.y + 18);
      ctx.stroke();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
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
      {/* Top HUD with 2-Minute Timer */}
      <div className="p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold font-cairo text-amber-400">معركة العبور وتحطيم خط بارليف</h2>
            <p className="text-xs text-stone-400">خراطيم المياه النفاثة للواء باقي زكي يوسف</p>
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
            <Waves className="w-4 h-4 text-sky-400" />
            <span className="font-mono tabular-nums text-emerald-400 font-bold">{boatsCrossed} قوارب عابرة</span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <div className="w-20 h-2.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${bridgeProgress}%` }} />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{bridgeProgress}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-mono tabular-nums font-bold text-amber-400">{missionScore} نقطة</span>
          </div>
        </div>
      </div>

      {/* Control Action Buttons Bar */}
      <div className="px-4 py-2 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setContinuousSpray(!continuousSpray)}
            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              continuousSpray
                ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>رش المياه التلقائي {continuousSpray ? '(مفعل ✓)' : '(معطل)'}</span>
          </button>

          <button
            onClick={() => setBothPumpsActive(!bothPumpsActive)}
            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              bothPumpsActive
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>مضختين مياه معاً {bothPumpsActive ? '(مزدوج ✓)' : '(مفرد)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={launchAssaultBoat}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
          >
            <Waves className="w-3.5 h-3.5" />
            إطلاق قارب مشاة
          </button>

          <button
            onClick={buildBridgeSegment}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            مد قطعة كوبري (PMP)
          </button>
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
        {!isWon && !isFailed && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={120}
            label="الزمن المتبقي للفوز"
            position="top-center"
          />
        )}

        {/* Victory Modal */}
        {isWon && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black font-cairo text-amber-400 mb-1">سقط خط بارليف وعبرت القوات!</h3>
            <p className="text-xs text-stone-300 max-w-md mb-4">
              أنجزت معركة العبور وإذابة الساتر الترابي في زمن قياسي قبل انتهاء الدقيقتين!
            </p>

            <button
              onClick={() => onComplete(missionScore + 2000)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer shadow-lg active:scale-95"
            >
              الانتقال إلى المرحلة الثالثة: معارك الدبابات وحائط الصواريخ
            </button>
          </div>
        )}

        {/* Failed / Timeout Modal */}
        {isFailed && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <h3 className="text-xl font-bold font-cairo text-red-400 mb-2">انتهت مدة الدقيقتين المخصصة للمهمة!</h3>
            <p className="text-xs text-stone-300 max-w-md mb-5">
              استمر في توجيه خراطيم المياه على الساتر الترابي لإسقاطه وفتح الثغرات ومد الجسور سريعاً.
            </p>
            <button
              onClick={() => {
                setTimeLeft(120);
                setIsFailed(false);
                gameRef.current.timeLeft = 120;
                gameRef.current.isComplete = false;
              }}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة المحاولة (دقيقتان)
            </button>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>وجه الفأرة نحو الساتر الترابي لإذابة الرمال وإخماد نيران الدشم قبل انتهاء المؤقت</span>
        <span className="text-amber-400 font-semibold">«بسم الله.. الله أكبر»</span>
      </div>
    </div>
  );
};
