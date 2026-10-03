import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Shield, Wind, Crosshair, CheckCircle2, Clock, RotateCcw, Wrench, AlertTriangle } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';

interface BridgeMissionProps {
  onComplete: (scoreEarned: number) => void;
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
  hp: number;
  destroyed: boolean;
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

export const BridgeMission: React.FC<BridgeMissionProps> = ({ onComplete, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pontoonsCount, setPontoonsCount] = useState(0);
  const [tanksCrossed, setTanksCrossed] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2-minute timer
  const [smokeScreenActive, setSmokeScreenActive] = useState(false);
  const [smokeCharges, setSmokeCharges] = useState(4);
  const [flakCharges, setFlakCharges] = useState(15);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [bridgeIntegrity, setBridgeIntegrity] = useState(100);

  const stateRef = useRef({
    pontoons: [] as PontoonSection[],
    crossingTanks: [] as CrossingTank[],
    artilleryShells: [] as ArtilleryShell[],
    enemyPlanes: [] as EnemyPlane[],
    shockwaves: [] as Shockwave[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    mousePos: { x: 500, y: 300 },
    screenShake: 0,
    score: 0,
    timeLeft: 120,
    tanksCrossedCount: 0,
    isComplete: false,
    smokeTimeRemaining: 0,
    lastTankDeployTime: 0,
    bridgeLocked: false,
  });

  // Initialize Pontoon bridge segments across the canal
  useEffect(() => {
    // Canvas: width 1000, height 560
    // West Bank: x = 0 to 220
    // Canal Water: x = 220 to 780 (width = 560px)
    // East Bank (Sinai): x = 780 to 1000
    // Bridge spans from x=220 to x=780 in 6 pontoon segments
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
        assembled: false,
      });
    }
    stateRef.current.pontoons = sections;
  }, []);

  // 2-Minute Timer & Artillery Threat
  useEffect(() => {
    if (isWon) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;

        // Auto victory if 2 minutes elapse
        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setIsWon(true);
          sound.playVictoryFanfare();
          return 0;
        }

        // Spawn periodic artillery strikes (distracted if smoke screen active!)
        if (Math.random() < (stateRef.current.smokeTimeRemaining > 0 ? 0.2 : 0.65)) {
          const targetSection = stateRef.current.pontoons[Math.floor(Math.random() * stateRef.current.pontoons.length)];
          if (targetSection) {
            const spread = stateRef.current.smokeTimeRemaining > 0 ? 120 : 30;
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

        // Spawn enemy strike plane occasionally
        if (Math.random() < 0.25 && stateRef.current.enemyPlanes.length < 2) {
          stateRef.current.enemyPlanes.push({
            x: 1050,
            y: 80 + Math.random() * 90,
            vx: -220,
            hp: 30,
            destroyed: false,
          });
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWon]);

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

  const spawnExplosion = (x: number, y: number, color = '#f59e0b', count = 16, isMajor = false, isWater = false) => {
    sound.playExplosion(isMajor ? 1.2 : 0.7);
    stateRef.current.screenShake = isMajor ? 2.2 : 1.1;

    // 1. Instant Flash Shockwave
    stateRef.current.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: isMajor ? 90 : 50,
      alpha: 1.0,
      color: isWater ? '#38bdf8' : isMajor ? '#ffffff' : '#fef08a',
    });

    if (isWater) {
      // Water geyser plume
      for (let i = 0; i < 24; i++) {
        stateRef.current.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y,
          vx: (Math.random() - 0.5) * 12,
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

    // 2. Dense Billowing Black Smoke
    const smokeCount = isMajor ? 26 : 14;
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

    // 3. Fire and Embers
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

    // 4. Shrapnel
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

  // Build Next Pontoon Section
  const handleAssembleNextPontoon = () => {
    const state = stateRef.current;
    const nextUnassembled = state.pontoons.find((p) => !p.assembled);
    if (!nextUnassembled) return;

    sound.playTargetLock();
    nextUnassembled.assembled = true;
    nextUnassembled.hp = 100;
    state.score += 400;
    setScore(state.score);

    const assembledCount = state.pontoons.filter((p) => p.assembled).length;
    setPontoonsCount(assembledCount);

    addFloatingText(nextUnassembled.x + 40, nextUnassembled.y - 30, `+400 تثبيت بنتون كوبري ${assembledCount}/6! ⚓`, '#38bdf8');

    // Check if whole bridge is complete
    if (assembledCount === 6) {
      state.bridgeLocked = true;
      sound.playVictoryFanfare();
      addFloatingText(500, 200, '🌟 اكتمل الجسر بالكامل! انطلاق أرتال الدبابات! 🌟', '#4ade80');
      // Auto-deploy first tank immediately
      handleDeployTank();
    }
  };

  // Repair Damaged Pontoons
  const handleRepairBridge = () => {
    const state = stateRef.current;
    let repairedAny = false;
    for (const p of state.pontoons) {
      if (p.assembled && p.hp < 100) {
        p.hp = 100;
        repairedAny = true;
      }
    }
    if (repairedAny) {
      sound.playHitSound();
      addFloatingText(500, 250, 'تم ترميم أجزاء الكوبري بنجاح 🛠️', '#4ade80');
    }
  };

  // Deploy Smoke Screen
  const handleDeploySmokeScreen = () => {
    if (smokeCharges <= 0) return;
    setSmokeCharges((prev) => prev - 1);
    setSmokeScreenActive(true);
    stateRef.current.smokeTimeRemaining = 12; // 12 seconds
    sound.playMissileLaunch();
    addFloatingText(500, 240, 'ستارة دخان تكتيكية نشطة! تعمية مدفعية العدو 💨', '#e2e8f0');

    // Create massive smoke clouds across canal
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

  // Fire Anti-Aircraft Flak Gun
  const handleFireFlak = (targetX?: number, targetY?: number) => {
    if (flakCharges <= 0) return;
    setFlakCharges((prev) => prev - 1);
    sound.playGunshot();

    const tx = targetX ?? stateRef.current.mousePos.x;
    const ty = targetY ?? stateRef.current.mousePos.y;

    spawnExplosion(tx, ty, '#f59e0b', 12, false, false);

    // Check hit on enemy planes
    for (const plane of stateRef.current.enemyPlanes) {
      if (plane.destroyed) continue;
      if (Math.hypot(plane.x - tx, plane.y - ty) < 70) {
        plane.hp -= 35;
        sound.playHitSound();
        if (plane.hp <= 0) {
          plane.destroyed = true;
          spawnExplosion(plane.x, plane.y, '#ef4444', 28, true);
          stateRef.current.score += 800;
          setScore(stateRef.current.score);
          addFloatingText(plane.x, plane.y - 20, '+800 إسقاط طائرة معادية بمدافع م/ط! 🎯', '#38bdf8');
        }
      }
    }
  };

  // Deploy Tank across the bridge
  const handleDeployTank = () => {
    const state = stateRef.current;
    if (!state.bridgeLocked) return;

    const now = performance.now();
    if (now - state.lastTankDeployTime < 1800) return;
    state.lastTankDeployTime = now;

    sound.playCannon();
    state.crossingTanks.push({
      id: Date.now() + Math.random(),
      x: 180,
      y: 282,
      speed: 130,
      hp: 100,
      crossingComplete: false,
    });

    addFloatingText(190, 260, 'دبابة T-62 تعبر الجسر! 🚜', '#fbbf24');
  };

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mousePos.x = (e.clientX - rect.left) * scaleX;
      stateRef.current.mousePos.y = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // If clicking in the sky, fire flak gun; if clicking in water/bridge, interact
        if (stateRef.current.mousePos.y < 200) {
          handleFireFlak();
        } else {
          // If bridge not fully built, assemble next pontoon!
          if (!stateRef.current.bridgeLocked) {
            handleAssembleNextPontoon();
          } else {
            handleDeployTank();
          }
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);

    const loop = (currTime: number) => {
      const dt = (currTime - lastTime) / 1000;
      lastTime = currTime;

      const state = stateRef.current;
      if (state.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt * 14);
      }

      // Update smoke duration
      if (state.smokeTimeRemaining > 0) {
        state.smokeTimeRemaining -= dt;
        if (state.smokeTimeRemaining <= 0) {
          setSmokeScreenActive(false);
        }
      }

      // Update Artillery Shells
      for (let i = state.artilleryShells.length - 1; i >= 0; i--) {
        const sh = state.artilleryShells[i];
        sh.progress += sh.speed * dt;
        sh.x += (sh.targetX - sh.x) * 2.5 * dt;
        sh.y += (sh.targetY - sh.y) * 2.5 * dt;

        if (sh.progress >= 1.0) {
          // Shell impacts!
          const hitWater = sh.targetY < 250 || sh.targetY > 340 || sh.targetX < 230 || sh.targetX > 770;
          if (hitWater) {
            spawnExplosion(sh.targetX, sh.targetY, '#38bdf8', 12, false, true);
          } else {
            // Hit pontoon or bridge
            spawnExplosion(sh.targetX, sh.targetY, '#f97316', 22, true, false);
            for (const p of state.pontoons) {
              if (p.assembled && sh.targetX >= p.x && sh.targetX <= p.x + p.width) {
                p.hp = Math.max(20, p.hp - 25);
              }
            }
          }
          state.artilleryShells.splice(i, 1);
        }
      }

      // Update Enemy Planes
      for (let j = state.enemyPlanes.length - 1; j >= 0; j--) {
        const pl = state.enemyPlanes[j];
        if (pl.destroyed) {
          pl.y += 140 * dt;
          pl.x += pl.vx * 0.5 * dt;
          if (Math.random() < 0.5) {
            state.particles.push({
              x: pl.x,
              y: pl.y,
              vx: (Math.random() - 0.5) * 12,
              vy: -20 - Math.random() * 15,
              color: '#18181b',
              life: 1,
              maxLife: 35,
              size: Math.random() * 6 + 4,
              isSmoke: true,
              growth: 0.35,
            });
          }
          if (pl.y > canvas.height - 60) {
            spawnExplosion(pl.x, pl.y, '#f59e0b', 24, true);
            state.enemyPlanes.splice(j, 1);
          }
          continue;
        }

        pl.x += pl.vx * dt;
        if (pl.x < -60) state.enemyPlanes.splice(j, 1);
      }

      // Update Crossing Tanks
      for (let t = state.crossingTanks.length - 1; t >= 0; t--) {
        const tk = state.crossingTanks[t];
        tk.x += tk.speed * dt;

        // Dust and exhaust particles
        if (Math.random() < 0.4) {
          state.particles.push({
            x: tk.x - 20,
            y: tk.y + 10,
            vx: -20 + (Math.random() - 0.5) * 10,
            vy: -10 + (Math.random() - 0.5) * 10,
            color: '#78716c',
            life: 1,
            maxLife: 20,
            size: Math.random() * 4 + 3,
            isSmoke: true,
            growth: 0.2,
          });
        }

        // Reached Sinai bank! (x >= 820)
        if (tk.x >= 820 && !tk.crossingComplete) {
          tk.crossingComplete = true;
          state.tanksCrossedCount++;
          state.score += 1000;
          setScore(state.score);
          setTanksCrossed(state.tanksCrossedCount);
          sound.playVictoryFanfare();
          addFloatingText(tk.x, tk.y - 30, `+1000 وصول الدبابة رقم ${state.tanksCrossedCount} إلى سيناء! 🇪🇬`, '#4ade80');

          // FAST VICTORY CONDITION: 5 tanks crossed!
          if (state.tanksCrossedCount >= 5 && !state.isComplete) {
            state.isComplete = true;
            state.score += state.timeLeft * 30;
            setScore(state.score);
            setIsWon(true);
          }
        }

        if (tk.x > canvas.width + 80) {
          state.crossingTanks.splice(t, 1);
        }
      }

      // Calculate total bridge integrity
      const assembledP = state.pontoons.filter((p) => p.assembled);
      if (assembledP.length > 0) {
        const avgHp = Math.round(assembledP.reduce((sum, p) => sum + p.hp, 0) / assembledP.length);
        setBridgeIntegrity(avgHp);

        if (avgHp <= 0 && assembledP.length >= 2 && !state.isComplete) {
          state.isComplete = true;
          setIsDefeated(true);
          sound.playDefeatSound();
        }
      }

      // DRAW SCENE
      ctx.save();
      if (state.screenShake > 0) {
        const sx = (Math.random() - 0.5) * state.screenShake;
        const sy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(sx, sy);
      }

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.5, '#1e293b');
      skyGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 220);

      // Distant dunes & Sinai backdrop
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(0, 190);
      for (let x = 0; x <= canvas.width; x += 30) {
        const my = Math.sin(x * 0.015) * 18;
        ctx.lineTo(x, 190 + my);
      }
      ctx.lineTo(canvas.width, 220);
      ctx.lineTo(0, 220);
      ctx.fill();

      // Suez Canal Water
      const waterGrad = ctx.createLinearGradient(0, 220, 0, canvas.height);
      waterGrad.addColorStop(0, '#0369a1');
      waterGrad.addColorStop(0.4, '#0284c7');
      waterGrad.addColorStop(1, '#075985');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 220, canvas.width, canvas.height - 220);

      // Water ripples
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      for (let y = 230; y < canvas.height; y += 22) {
        ctx.beginPath();
        const offset = Math.sin(currTime * 0.002 + y) * 15;
        ctx.moveTo(220, y);
        ctx.lineTo(780 + offset, y);
        ctx.stroke();
      }

      // West Bank (Egyptian Staging Shoreline)
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 220, 220, canvas.height - 220);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(205, 220, 15, canvas.height - 220);

      // West Bank Fortifications / Sand ramparts
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(10, 230, 190, 80, 8);
      ctx.fill();
      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText('الضفة الغربية · نقطة انطلاق سلاح المهندسين', 105, 255);

      // East Bank (Sinai Conquered Shoreline / Breached Bar Lev)
      ctx.fillStyle = '#d97706';
      ctx.fillRect(780, 220, 220, canvas.height - 220);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(780, 220, 15, canvas.height - 220);

      // Breached sand rampart on Sinai side
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(780, 220);
      ctx.lineTo(840, 250);
      ctx.lineTo(1000, 250);
      ctx.lineTo(1000, canvas.height);
      ctx.lineTo(780, canvas.height);
      ctx.fill();

      // Egyptian Flag on East Bank
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(860, 240, 4, 60);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(864, 240, 28, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(864, 248, 28, 8);
      ctx.fillStyle = '#000000';
      ctx.fillRect(864, 256, 28, 8);

      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'center';
      ctx.fillText('الضفة الشرقية (سيناء المحررة)', 890, 325);

      // PONTOON BRIDGE SECTIONS (PMP Pontoon Bridge)
      for (const p of state.pontoons) {
        if (p.assembled) {
          // Floating metal pontoon structure
          ctx.fillStyle = '#334155';
          ctx.fillRect(p.x, p.y - 8, p.width, p.height + 16);

          // Wooden roadway deck
          ctx.fillStyle = '#78350f';
          ctx.fillRect(p.x + 2, p.y, p.width - 4, p.height);

          // Steel beam treads
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(p.x, p.y + 12, p.width, 6);
          ctx.fillRect(p.x, p.y + 46, p.width, 6);

          // Connecting bolts / links
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(p.x, p.y + p.height / 2, 4, 0, Math.PI * 2);
          ctx.arc(p.x + p.width, p.y + p.height / 2, 4, 0, Math.PI * 2);
          ctx.fill();

          // Health bar on pontoon
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(p.x + 6, p.y - 14, p.width - 12, 4);
          ctx.fillStyle = p.hp > 50 ? '#22c55e' : '#ef4444';
          ctx.fillRect(p.x + 6, p.y - 14, ((p.width - 12) * p.hp) / p.maxHp, 4);
        } else {
          // Ghost outline showing next spot to build
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(p.x, p.y, p.width, p.height);
          ctx.setLineDash([]);

          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText(`بنتون #${p.index + 1}`, p.x + p.width / 2, p.y + p.height / 2 + 4);
        }
      }

      // Crossing Tanks
      for (const tk of state.crossingTanks) {
        ctx.save();
        ctx.translate(tk.x, tk.y);

        // Tank hull
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
        ctx.moveTo(30, 0);
        ctx.lineTo(-20, -10);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-20, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Incoming Artillery Shells
      for (const sh of state.artilleryShells) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x + 16, sh.y - 10);
        ctx.stroke();
      }

      // Render Momentary Flash Shockwaves
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
        ctx.lineWidth = 4 * sw.alpha;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Particles (Dense Billowing Black Smoke, Water Plumes, Sparks)
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

      // Aim Reticle
      ctx.strokeStyle = state.mousePos.y < 200 ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(state.mousePos.x, state.mousePos.y, 14, 0, Math.PI * 2);
      ctx.moveTo(state.mousePos.x - 18, state.mousePos.y);
      ctx.lineTo(state.mousePos.x + 18, state.mousePos.y);
      ctx.moveTo(state.mousePos.x, state.mousePos.y - 18);
      ctx.lineTo(state.mousePos.x, state.mousePos.y + 18);
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
      {/* Top HUD */}
      <div className="p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold font-cairo text-amber-400">بناء الجسور والكباري العائمة (سلاح المهندسين)</h2>
            <p className="text-xs text-stone-400">الشهيد أحمد حمدي واللواء باقي زكي · أرتال دبابات النصر</p>
          </div>
        </div>

        {/* Meters */}
        <div className="flex items-center gap-5 text-xs font-semibold">
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
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-stone-300">أجزاء الكوبري:</span>
            <span className="font-mono tabular-nums font-bold text-sky-400">{pontoonsCount} / 6 بنتون</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-300">الدبابات العابرة:</span>
            <span className="font-mono tabular-nums font-bold text-amber-400">{tanksCrossed} / 5 للنصر السريع</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-300">سلامة الجسر:</span>
            <div className="w-16 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className={`h-full ${bridgeIntegrity > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${bridgeIntegrity}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{bridgeIntegrity}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums font-bold text-amber-400">{score} نقطة</span>
          </div>
        </div>
      </div>

      {/* Tactical Engineering Actions Strip */}
      <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAssembleNextPontoon}
            disabled={pontoonsCount >= 6}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow"
          >
            <Shield className="w-4 h-4" />
            <span>تركيب بنتون كوبري ({pontoonsCount}/6)</span>
          </button>

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

          <button
            onClick={handleRepairBridge}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>ترميم الكوبري</span>
          </button>
        </div>

        <button
          onClick={handleDeployTank}
          disabled={pontoonsCount < 6}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow active:scale-95"
        >
          <span>إطلاق رتل دبابات عبر الجسر 🚜</span>
        </button>
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
        {!isWon && (
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
            <h3 className="text-2xl font-black font-cairo text-amber-400 mb-1">
              تم بناء الجسور بنجاح وتدفقت دبابات النصر إلى سيناء!
            </h3>
            <p className="text-xs text-stone-300 max-w-md mb-4">
              سجل سلاح المهندسين العسكريين ملحمة تاريخية بإقامة الجسور والكباري العائمة تحت نيران العدو، مما مكن القوات المدرعة من حسم المعركة والسيطرة الكاملة على رؤوس الكباري!
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5 max-w-md w-full text-center">
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">الدبابات العابرة</span>
                <span className="text-base font-bold font-mono text-emerald-400">{tanksCrossed} دبابات</span>
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
              الانتقال إلى المرحلة التالية: معارك الدبابات الكبرى
            </button>
          </div>
        )}

        {/* Defeat Modal when bridge is destroyed */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold font-cairo text-red-400 mb-2">
              تضرر جسر العبور وفشلت محاولة التدفق!
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              تعرضت بنتونات الجسر لغارات جوية مكثفة أدت لتعطيل مسار الدبابات. أطلق نيران الدفاع الجوي م/ط واستخدم ستائر الدخان لتأمين المهندسين العسكريين!
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setTimeLeft(120);
                  setIsDefeated(false);
                  stateRef.current.timeLeft = 120;
                  stateRef.current.isComplete = false;
                  stateRef.current.pontoons.forEach((p) => {
                    p.hp = 100;
                  });
                  setBridgeIntegrity(100);
                  setFlakCharges(15);
                  setSmokeCharges(4);
                  sound.playRadioTransmission();
                }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة تشييد الجسر 🔄
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
      <div className="p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>انقر في السماء لإطلاق مدافع م/ط، وانقر على الكوبري لتركيب البنتونات وإطلاق الدبابات</span>
        <span className="text-amber-400 font-semibold">«سلاح المهندسين.. درع النصر وجسر التحرير»</span>
      </div>
    </div>
  );
};
