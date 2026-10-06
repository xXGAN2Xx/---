import { isGamePaused } from '../game/pause';
import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Flag, Shield, Flame, CheckCircle2, Award, Clock, RotateCcw, MousePointer, AlertTriangle, Zap } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';

interface FortressAssaultMissionProps {
  onComplete: (scoreEarned: number) => void;
  onDefeat?: () => void;
  onExit: () => void;
}

interface EnemySentry {
  id: number;
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  isTakingCover: boolean;
  evasionTimer: number;
  attackPattern: 'suppressive_burst' | 'frag_grenade' | 'sniper_overwatch';
  patternTimer: number;
  burstCooldown: number;
  badgeShown?: boolean;
}

export const FortressAssaultMission: React.FC<FortressAssaultMissionProps> = ({ onComplete, onDefeat, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [napalmPipesCut, setNapalmPipesCut] = useState(0);
  const [bunkersCaptured, setBunkersCaptured] = useState(0);
  const [flagProgress, setFlagProgress] = useState(0);
  const [flagHoisted, setFlagHoisted] = useState(false);
  const [commandoHp, setCommandoHp] = useState(100);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2-minute timer
  const [nearbyAction, setNearbyAction] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);

  const stateRef = useRef({
    commando: { x: 120, y: 440, targetX: 120, targetY: 440, hp: 100 },
    keys: { up: false, down: false, left: false, right: false },
    pipes: [
      { id: 1, x: 260, y: 470, cut: false, label: 'صمام نابالم 1' },
      { id: 2, x: 380, y: 470, cut: false, label: 'صمام نابالم 2' },
    ],
    bunkers: [
      { id: 1, x: 520, y: 390, captured: false, hp: 100, label: 'دشمة الرشاش الثقيل', burstRemaining: 0, burstCooldown: 0, lastBurstTime: 0, specialPatternTimer: 4.0 },
      { id: 2, x: 740, y: 330, captured: false, hp: 100, label: 'مركز قيادة الحصن', burstRemaining: 0, burstCooldown: 0.6, lastBurstTime: 0, specialPatternTimer: 6.5 },
    ],
    enemySentries: [
      { id: 1, x: 440, y: 440, vx: 40, minX: 360, maxX: 500, hp: 40, maxHp: 40, destroyed: false, isTakingCover: false, evasionTimer: 0, attackPattern: 'suppressive_burst', patternTimer: 0, burstCooldown: 1.8 },
      { id: 2, x: 650, y: 360, vx: -35, minX: 580, maxX: 720, hp: 40, maxHp: 40, destroyed: false, isTakingCover: false, evasionTimer: 0, attackPattern: 'frag_grenade', patternTimer: 0, burstCooldown: 2.5 },
    ] as EnemySentry[],
    bullets: [] as { x: number; y: number; vx: number; vy: number; isGrenade?: boolean; grenadeTimer?: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number }[],
    shockwaves: [] as { x: number; y: number; radius: number; maxRadius: number; alpha: number; color: string }[],
    lastBunkerShot: 0,
    flagPole: { x: 880, y: 220, hoisted: 0 },
    floatingTexts: [] as { id: number; x: number; y: number; text: string; color: string; life: number; maxLife: number }[],
    score: 0,
    timeLeft: 120,
    screenShake: 0,
    isComplete: false,
    lastInteractTime: 0,
  });

  // 2-Minute Timer
  useEffect(() => {
    if (flagHoisted || isTimeout) return;

    const timer = setInterval(() => {
      if (isGamePaused()) return;
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;

        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setIsTimeout(true);
          sound.playExplosion(1.0);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [flagHoisted, isTimeout]);

  const resetMission = () => {
    const initialState = stateRef.current;
    initialState.commando.x = 120;
    initialState.commando.y = 440;
    initialState.commando.targetX = 120;
    initialState.commando.targetY = 440;
    initialState.commando.hp = 100;
    initialState.keys.up = false;
    initialState.keys.down = false;
    initialState.keys.left = false;
    initialState.keys.right = false;
    initialState.pipes.forEach((p) => { p.cut = false; });
    initialState.bunkers.forEach((b) => {
      b.captured = false;
      b.hp = 100;
      b.burstRemaining = 0;
      b.burstCooldown = 0;
      b.lastBurstTime = 0;
      b.specialPatternTimer = b.id === 1 ? 4.0 : 6.5;
    });
    initialState.enemySentries.forEach((s) => {
      s.destroyed = false;
      s.hp = s.maxHp;
      s.isTakingCover = false;
      s.evasionTimer = 0;
      s.burstCooldown = s.id === 1 ? 1.8 : 2.5;
      s.patternTimer = 0;
      s.badgeShown = false;
    });
    initialState.bullets = [];
    initialState.particles = [];
    initialState.shockwaves = [];
    initialState.floatingTexts = [];
    initialState.flagPole.hoisted = 0;
    initialState.score = 0;
    initialState.timeLeft = 120;
    initialState.screenShake = 0;
    initialState.isComplete = false;
    initialState.lastInteractTime = 0;

    setNapalmPipesCut(0);
    setBunkersCaptured(0);
    setFlagProgress(0);
    setFlagHoisted(false);
    setCommandoHp(100);
    setScore(0);
    setTimeLeft(120);
    setNearbyAction(null);
    setIsTimeout(false);
    setIsDefeated(false);
    sound.playRadioTransmission();
  };

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

  const handleInteract = () => {
    const s = stateRef.current;
    const c = s.commando;

    // Check napalm pipes
    for (const pipe of s.pipes) {
      if (!pipe.cut && Math.hypot(c.x - pipe.x, c.y - pipe.y) < 70) {
        pipe.cut = true;
        sound.playRadioClick();
        s.score += 500;
        setScore(s.score);
        setNapalmPipesCut((cnt) => cnt + 1);
        addFloatingText(pipe.x, pipe.y - 20, '+500 إغلاق صمام النابالم! 🌊', '#4ade80');
        return;
      }
    }

    // Check bunkers
    for (const bunker of s.bunkers) {
      if (!bunker.captured && Math.hypot(c.x - bunker.x, c.y - bunker.y) < 80) {
        sound.playExplosion(1.0);
        bunker.captured = true;
        s.score += 1000;
        setScore(s.score);
        setBunkersCaptured((cnt) => cnt + 1);
        addFloatingText(bunker.x, bunker.y - 30, '+1000 استسلام حامية الدشمة! ⚔️', '#f59e0b');
        return;
      }
    }

    // Check sentries
    for (const sentry of s.enemySentries) {
      if (!sentry.destroyed && Math.hypot(c.x - sentry.x, c.y - sentry.y) < 70) {
        sentry.destroyed = true;
        sound.playHitSound();
        s.score += 700;
        setScore(s.score);
        addFloatingText(sentry.x, sentry.y - 25, '+700 شل حركة حارس الحصن! ⚔️', '#38bdf8');
        return;
      }
    }

    // Check Flagpole
    if (Math.hypot(c.x - s.flagPole.x, c.y - s.flagPole.y) < 90) {
      const allBunkersCaptured = s.bunkers.every((b) => b.captured);
      const allPipesCut = s.pipes.every((p) => p.cut);

      if (allBunkersCaptured && allPipesCut) {
        s.flagPole.hoisted = Math.min(100, s.flagPole.hoisted + 35);
        setFlagProgress(s.flagPole.hoisted);
        sound.playRadioClick();
        addFloatingText(s.flagPole.x, s.flagPole.y - 40, `رفع العلم: ${s.flagPole.hoisted}% 🇪🇬`, '#38bdf8');

        if (s.flagPole.hoisted >= 100 && !s.isComplete) {
          s.isComplete = true;
          setFlagHoisted(true);
          const timeBonus = s.timeLeft * 30;
          s.score += 3000 + timeBonus;
          setScore(s.score);
          sound.playVictoryFanfare();
        }
      } else {
        addFloatingText(s.flagPole.x, s.flagPole.y - 40, 'عطل صمامات النابالم والدشم أولاً!', '#ef4444');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = true;
      if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
        handleInteract();
      }
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

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const tx = (e.clientX - rect.left) * scaleX;
      const ty = (e.clientY - rect.top) * scaleY;

      stateRef.current.commando.targetX = Math.max(80, Math.min(canvas.width - 60, tx));
      stateRef.current.commando.targetY = Math.max(220, Math.min(canvas.height - 60, ty));

      const s = stateRef.current;
      for (const p of s.pipes) {
        if (!p.cut && Math.hypot(tx - p.x, ty - p.y) < 40) {
          s.commando.targetX = p.x;
          s.commando.targetY = p.y;
        }
      }
      for (const b of s.bunkers) {
        if (!b.captured && Math.hypot(tx - b.x, ty - b.y) < 50) {
          s.commando.targetX = b.x;
          s.commando.targetY = b.y;
        }
      }
      if (Math.hypot(tx - s.flagPole.x, ty - s.flagPole.y) < 60) {
        s.commando.targetX = s.flagPole.x;
        s.commando.targetY = s.flagPole.y;
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    const loop = (currTime: number) => {
      if (isGamePaused()) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const dt = (currTime - lastTime) / 1000;
      lastTime = currTime;

      const s = stateRef.current;
      const c = s.commando;
      const k = s.keys;
      const spd = 260 * dt; // Faster dash speed

      if (k.up || k.down || k.left || k.right) {
        if (k.up && c.y > 220) c.y -= spd;
        if (k.down && c.y < canvas.height - 60) c.y += spd;
        if (k.left && c.x > 80) c.x -= spd;
        if (k.right && c.x < canvas.width - 60) c.x += spd;
        c.targetX = c.x;
        c.targetY = c.y;
      } else {
        const tdx = c.targetX - c.x;
        const tdy = c.targetY - c.y;
        const tdist = Math.hypot(tdx, tdy);
        if (tdist > 4) {
          c.x += (tdx / tdist) * Math.min(tdist, 260 * dt);
          c.y += (tdy / tdist) * Math.min(tdist, 260 * dt);
        }
      }

      // Check nearby interactive items
      let currentNearby: string | null = null;
      for (const p of s.pipes) {
        if (!p.cut && Math.hypot(c.x - p.x, c.y - p.y) < 65) {
          currentNearby = `قطع صمام النابالم (${p.label})`;
          break;
        }
      }
      if (!currentNearby) {
        for (const b of s.bunkers) {
          if (!b.captured && Math.hypot(c.x - b.x, c.y - b.y) < 75) {
            currentNearby = `اقتحام وتطهير (${b.label})`;
            break;
          }
        }
      }
      if (!currentNearby && Math.hypot(c.x - s.flagPole.x, c.y - s.flagPole.y) < 85) {
        currentNearby = 'رفع العلم المصري على قمة الحصن 🇪🇬';
      }
      setNearbyAction(currentNearby);

      // Auto interact if reached closely, with 500ms debounce
      const now = performance.now();
      if (!s.lastInteractTime || now - s.lastInteractTime > 500) {
        for (const p of s.pipes) {
          if (!p.cut && Math.hypot(c.x - p.x, c.y - p.y) < 30) {
            s.lastInteractTime = now;
            handleInteract();
            break;
          }
        }
        for (const b of s.bunkers) {
          if (!b.captured && Math.hypot(c.x - b.x, c.y - b.y) < 40) {
            s.lastInteractTime = now;
            handleInteract();
            break;
          }
        }
        if (Math.hypot(c.x - s.flagPole.x, c.y - s.flagPole.y) < 45 && s.flagPole.hoisted < 100) {
          const allBunkersCaptured = s.bunkers.every((b) => b.captured);
          const allPipesCut = s.pipes.every((p) => p.cut);
          if (allBunkersCaptured && allPipesCut) {
            s.lastInteractTime = now;
            handleInteract();
          }
        }
      }

      // Uncaptured enemy bunkers fire suppressive machine gun bursts with predictive lead
      for (const b of s.bunkers) {
        if (!b.captured) {
          b.burstCooldown = (b.burstCooldown ?? (1.2 + Math.random() * 0.8)) - dt;
          b.burstRemaining = b.burstRemaining ?? 0;
          b.lastBurstTime = b.lastBurstTime ?? 0;

          const dist = Math.hypot(c.x - b.x, c.y - b.y) || 1;
          if (dist < 460) {
            if (b.burstRemaining > 0) {
              if (currTime - b.lastBurstTime >= 95) {
                b.lastBurstTime = currTime;
                b.burstRemaining--;
                sound.playGunshot();

                const bulletSpeed = 380;
                const timeToTarget = dist / bulletSpeed;

                // Commando velocity
                const tdx = c.targetX - c.x;
                const tdy = c.targetY - c.y;
                const tdist = Math.hypot(tdx, tdy);
                const cvx = tdist > 4 ? (tdx / tdist) * 260 : 0;
                const cvy = tdist > 4 ? (tdy / tdist) * 260 : 0;

                const predX = c.x + cvx * timeToTarget * 0.85;
                const predY = c.y + cvy * timeToTarget * 0.85;

                const bdx = predX - b.x;
                const bdy = predY - b.y;
                const angle = Math.atan2(bdy, bdx) + (Math.random() - 0.5) * 0.08;

                s.bullets.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(angle) * bulletSpeed,
                  vy: Math.sin(angle) * bulletSpeed,
                });
              }
            } else if (b.burstCooldown <= 0) {
              b.burstRemaining = 3;
              b.burstCooldown = 1.5 + Math.random() * 0.9;
              b.lastBurstTime = currTime - 95;
            }
          }
        }
      }

      // Update Enemy Sentries: Evasive Movement & Tactical Attack Patterns
      for (const sentry of s.enemySentries) {
        if (sentry.destroyed) continue;

        if (!sentry.badgeShown) {
          sentry.badgeShown = true;
          const badgeMap: Record<string, string> = {
            suppressive_burst: '⚠️ حارس مجهز برشاش عوزي!',
            frag_grenade: '⚠️ إلقاء قنبلة شظايا!',
            sniper_overwatch: '⚠️ قناص خط بارليف المترصد!',
          };
          addFloatingText(sentry.x, sentry.y - 25, badgeMap[sentry.attackPattern] || 'دورية حراسة!', '#f97316');
        }

        const distToCommando = Math.hypot(c.x - sentry.x, c.y - sentry.y);

        // Reactive Evasion when commando approaches or charges
        if (distToCommando < 100) {
          sentry.isTakingCover = true;
          sentry.evasionTimer = 1.2;
          sentry.vx = c.x > sentry.x ? -130 : 130;
        }

        sentry.evasionTimer -= dt;
        if (sentry.evasionTimer <= 0) {
          sentry.isTakingCover = false;
        }

        sentry.x += sentry.vx * dt;
        if (sentry.x < sentry.minX) {
          sentry.x = sentry.minX;
          sentry.vx = Math.abs(sentry.vx);
        } else if (sentry.x > sentry.maxX) {
          sentry.x = sentry.maxX;
          sentry.vx = -Math.abs(sentry.vx);
        }

        // Sentry Attack patterns with predictive aiming
        sentry.burstCooldown -= dt;
        if (sentry.burstCooldown <= 0 && distToCommando < 400) {
          sentry.burstCooldown = 2.0 + Math.random() * 1.2;

          const tdx = c.targetX - c.x;
          const tdy = c.targetY - c.y;
          const tdist = Math.hypot(tdx, tdy);
          const cvx = tdist > 4 ? (tdx / tdist) * 260 : 0;
          const cvy = tdist > 4 ? (tdy / tdist) * 260 : 0;

          if (sentry.attackPattern === 'frag_grenade') {
            sound.playMissileLaunch();
            s.bullets.push({
              x: sentry.x,
              y: sentry.y - 10,
              vx: (c.x - sentry.x) * 0.9,
              vy: -180,
              isGrenade: true,
              grenadeTimer: 1.4,
            });
            addFloatingText(sentry.x, sentry.y - 25, '⚠️ قنبلة يدوية متدحرجة!', '#ef4444');
          } else {
            sound.playGunshot();
            const bSpeed = 420;
            const timeToTarget = distToCommando / bSpeed;
            const predX = c.x + cvx * timeToTarget * 0.85;
            const predY = c.y + cvy * timeToTarget * 0.85;
            const angle = Math.atan2(predY - sentry.y, predX - sentry.x) + (Math.random() - 0.5) * 0.06;

            s.bullets.push({
              x: sentry.x,
              y: sentry.y - 8,
              vx: Math.cos(angle) * bSpeed,
              vy: Math.sin(angle) * bSpeed,
            });
          }
        }
      }

      // Update bullets & grenades
      for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
        const bullet = s.bullets[bi];

        if (bullet.isGrenade) {
          bullet.vy += 320 * dt; // Gravity
          bullet.x += bullet.vx * dt;
          bullet.y += bullet.vy * dt;
          bullet.grenadeTimer = (bullet.grenadeTimer ?? 1.4) - dt;

          if (bullet.y > 450) {
            bullet.y = 450;
            bullet.vx *= 0.82;
            bullet.vy = -bullet.vy * 0.35;
          }

          if (bullet.grenadeTimer <= 0) {
            sound.playExplosion(1.0);
            s.screenShake = 1.3;
            s.bullets.splice(bi, 1);
            if (Math.hypot(bullet.x - c.x, bullet.y - c.y) < 55) {
              c.hp -= 25;
              const remHp = Math.max(0, c.hp);
              setCommandoHp(remHp);
              addFloatingText(c.x, c.y - 25, '⚠️ انفجار شظايا قنبلة! -25', '#ef4444');
              if (remHp <= 0 && !s.isComplete) {
                s.isComplete = true;
                setIsDefeated(true);
          onDefeat?.();
                sound.playDefeatSound();
              }
            }
            continue;
          }
        } else {
          bullet.x += bullet.vx * dt;
          bullet.y += bullet.vy * dt;
        }

        // Check hit on commando
        if (!bullet.isGrenade && Math.hypot(bullet.x - c.x, bullet.y - c.y) < 18) {
          s.bullets.splice(bi, 1);
          c.hp -= 15;
          const remHp = Math.max(0, c.hp);
          setCommandoHp(remHp);
          s.screenShake = 1.2;
          addFloatingText(c.x, c.y - 25, 'إصابة! -15', '#ef4444');

          if (remHp <= 0 && !s.isComplete) {
            s.isComplete = true;
            setIsDefeated(true);
          onDefeat?.();
            sound.playDefeatSound();
            sound.playExplosion(1.0);
          }
          continue;
        }

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
          s.bullets.splice(bi, 1);
        }
      }

      // Draw Scene
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 220);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.7, '#fed7aa');
      skyGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 220);

      // Sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(160, 80, 48, 0, Math.PI * 2);
      ctx.fill();

      // Sand Rampart & Citadel
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 100);
      ctx.lineTo(280, canvas.height - 120);
      ctx.lineTo(580, 320);
      ctx.lineTo(840, 230);
      ctx.lineTo(canvas.width, 230);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // Concrete fortress terraces
      ctx.fillStyle = '#78716c';
      ctx.fillRect(480, 330, 360, 170);
      ctx.fillStyle = '#44403c';
      for (let step = 0; step < 7; step++) {
        ctx.fillRect(450 + step * 20, 330 + step * 16, 32, 10);
      }

      // Target indicator
      if (Math.hypot(c.targetX - c.x, c.targetY - c.y) > 8) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.targetX, c.targetY, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Napalm Pipes
      s.pipes.forEach((p) => {
        if (Math.hypot(c.x - p.x, c.y - p.y) < 70) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = p.cut ? '#22c55e' : '#dc2626';
        ctx.fillRect(p.x - 16, p.y - 7, 32, 14);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(p.x - 22, p.y - 2, 44, 4);

        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.fillStyle = p.cut ? '#4ade80' : '#f87171';
        ctx.textAlign = 'center';
        ctx.fillText(p.cut ? 'نابالم معطّل ✓' : p.label, p.x, p.y - 16);
      });

      // Bunkers
      s.bunkers.forEach((b) => {
        if (Math.hypot(c.x - b.x, c.y - b.y) < 80) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 42, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = b.captured ? '#15803d' : '#3f3f46';
        ctx.beginPath();
        ctx.roundRect(b.x - 42, b.y - 26, 84, 52, 10);
        ctx.fill();

        ctx.fillStyle = '#09090b';
        ctx.fillRect(b.x - 26, b.y - 8, 52, 14);

        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.fillStyle = b.captured ? '#4ade80' : '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(b.captured ? 'تم تحرير الدشمة ⚔️' : b.label, b.x, b.y - 34);
      });

      // Flagpole
      const fp = s.flagPole;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(fp.x - 3, fp.y - 120, 6, 140);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(fp.x, fp.y - 120, 8, 0, Math.PI * 2);
      ctx.fill();

      // Egyptian Flag
      const flagHeight = 44;
      const flagWidth = 70;
      const flagY = fp.y - (fp.hoisted / 100) * 115;
      const wave = Math.sin(currTime * 0.007) * 5;

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(fp.x + 3, flagY, flagWidth + wave, flagHeight / 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fp.x + 3, flagY + flagHeight / 3, flagWidth + wave, flagHeight / 3);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(fp.x + 3 + (flagWidth + wave) / 2, flagY + flagHeight / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(fp.x + 3, flagY + (flagHeight * 2) / 3, flagWidth + wave, flagHeight / 3);

      ctx.font = 'bold 12px Cairo, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(fp.hoisted >= 100 ? 'رُفِعَ علم مصر خفاقاً! 🇪🇬' : 'سارية العلم (انقر لرفع العلم)', fp.x, fp.y + 32);

      // Commando Player
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-10, -20, 20, 30);
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(0, -25, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(18, -4);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-12, -16, 4, 6);
      ctx.restore();

      // Enemy Sentries on Fortress Citadel
      for (const sentry of s.enemySentries) {
        if (sentry.destroyed) continue;
        ctx.save();
        ctx.translate(sentry.x, sentry.y);

        // Body
        ctx.fillStyle = sentry.isTakingCover ? '#52525b' : '#3f3f46';
        ctx.fillRect(-8, -18, 16, 20);

        // Helmet
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -22, 7, Math.PI, 0);
        ctx.fill();

        // Weapon
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-16, -6);
        ctx.stroke();

        // Health bar
        const sw = 32;
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(-sw / 2, -34, sw, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-sw / 2, -34, (sentry.hp / sentry.maxHp) * sw, 4);

        if (sentry.isTakingCover) {
          ctx.font = 'bold 9px Cairo, sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText('احتماء 🛡️', 0, -38);
        }

        ctx.restore();
      }

      // Draw enemy machine gun tracer bullets & grenades
      for (const bullet of s.bullets) {
        ctx.save();
        if (bullet.isGrenade) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#18181b';
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
          ctx.fill();
          // Blinking red fuse
          ctx.fillStyle = Math.sin(currTime * 0.02) > 0 ? '#ef4444' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y - 4, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(bullet.x, bullet.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (let t = s.floatingTexts.length - 1; t >= 0; t--) {
        const ft = s.floatingTexts[t];
        ft.y -= 25 * dt;
        ft.life++;
        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
        if (ft.life >= ft.maxLife) s.floatingTexts.splice(t, 1);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleCanvasClick);
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
            <h2 className="text-base font-bold font-cairo text-amber-400">سقوط حصن خط بارليف ورفع العلم</h2>
            <p className="text-xs text-stone-400">قوات الصاعقة · المجموعة 39 قتال وأبطال العبور</p>
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
              <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${commandoHp}%` }} />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{commandoHp}%</span>
          </div>

          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span className="font-mono tabular-nums text-emerald-400 font-bold">{napalmPipesCut} / 2 معطلة</span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-mono tabular-nums text-amber-400 font-bold">{bunkersCaptured} / 2 دشم</span>
          </div>

          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${flagProgress}%` }} />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{flagProgress}%</span>
          </div>
        </div>
      </div>

      {/* Action / Proximity Notice Bar */}
      <div className="px-4 py-2 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <MousePointer className="w-4 h-4 text-amber-400" />
          <span className="text-stone-300 font-medium">
            انقر بالماوس أو المس أي مكان على الشاشة لتحريك البطل سريعاً
          </span>
        </div>

        {nearbyAction ? (
          <button
            onClick={handleInteract}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg shadow cursor-pointer transition-all animate-pulse"
          >
            تنفيذ: {nearbyAction} [اضغط هنا أو زر E]
          </button>
        ) : (
          <span className="text-stone-400">اقترب من الصمامات والدشم للتنفيذ</span>
        )}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={560}
          className="w-full h-full max-w-full max-h-full object-contain select-none cursor-pointer"
        />

        {/* Digital Countdown Timer at the TOP */}
        {!flagHoisted && !isTimeout && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={120}
            label="الزمن المتبقي للفوز"
            position="top-center"
          />
        )}

        {/* On-screen Action Button when near objective */}
        {nearbyAction && !flagHoisted && !isTimeout && !isDefeated && (
          <button
            onClick={handleInteract}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-cairo rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.6)] border-2 border-stone-950 text-xs sm:text-sm flex items-center gap-2 cursor-pointer active:scale-95 animate-bounce z-40"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{nearbyAction} [انقر هنا أو اضغط E]</span>
          </button>
        )}

        {/* Mobile Touch Direction Controls */}
        {!flagHoisted && !isTimeout && !isDefeated && (
          <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 z-30 md:hidden opacity-90">
            <button
              onPointerDown={() => { stateRef.current.keys.up = true; }}
              onPointerUp={() => { stateRef.current.keys.up = false; }}
              onPointerCancel={() => { stateRef.current.keys.up = false; }}
              className="w-11 h-11 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-bold flex items-center justify-center active:bg-amber-500 active:text-stone-950 text-base"
              aria-label="أعلى"
            >
              ▲
            </button>
            <div className="flex gap-1">
              <button
                onPointerDown={() => { stateRef.current.keys.left = true; }}
                onPointerUp={() => { stateRef.current.keys.left = false; }}
                onPointerCancel={() => { stateRef.current.keys.left = false; }}
                className="w-10 h-10 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-bold flex items-center justify-center active:bg-amber-500 active:text-stone-950 text-base"
                aria-label="يمين"
              >
                ▶
              </button>
              <button
                onPointerDown={() => { stateRef.current.keys.down = true; }}
                onPointerUp={() => { stateRef.current.keys.down = false; }}
                onPointerCancel={() => { stateRef.current.keys.down = false; }}
                className="w-10 h-10 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-bold flex items-center justify-center active:bg-amber-500 active:text-stone-950 text-base"
                aria-label="أسفل"
              >
                ▼
              </button>
              <button
                onPointerDown={() => { stateRef.current.keys.right = true; }}
                onPointerUp={() => { stateRef.current.keys.right = false; }}
                onPointerCancel={() => { stateRef.current.keys.right = false; }}
                className="w-10 h-10 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-bold flex items-center justify-center active:bg-amber-500 active:text-stone-950 text-base"
                aria-label="يسار"
              >
                ◀
              </button>
            </div>
          </div>
        )}

        {/* Grand Victory Modal */}
        {flagHoisted && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 z-50">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 mb-3 animate-bounce">
              <Award className="w-12 h-12" />
            </div>

            <h3 className="text-3xl font-black font-cairo text-amber-400 mb-1">
              الله أكبر.. عاشت مصر حرة أبية!
            </h3>
            <p className="text-sm text-stone-200 max-w-lg mb-1 font-medium">
              «لقد حطمت القوات المسلحة المصرية أسطورة الجيش الذي لا يُقهر، وارتفع علم مصر خفاقاً على تراب سيناء الطاهر.»
            </p>
            <p className="text-xs text-amber-400 font-bold mb-5 font-mono">
              أنجزت تحرير الحصن ورفع العلم قبل نفاد الدقيقتين بمكافأة وقت +{timeLeft * 30} نقطة!
            </p>

            <button
              onClick={() => onComplete(score)}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer shadow-lg active:scale-95"
            >
              عرض سجل الشرف والأوسمة المستحقة
            </button>
          </div>
        )}

        {/* Timeout Modal */}
        {isTimeout && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <h3 className="text-xl font-bold font-cairo text-red-400 mb-2">انتهت مدة الدقيقتين المخصصة لاقتحام الحصن!</h3>
            <p className="text-xs text-stone-300 max-w-md mb-5">
              تحرك بسرعة وانقر مباشرة على الصمامات والدشم لتعطيلها ثم اصعد فوراً لسارية العلم لرفعه خفاقاً.
            </p>
            <button
              onClick={resetMission}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة الاقتحام (دقيقتان)
            </button>
          </div>
        )}

        {/* Defeat Modal when commando health drops to 0 */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold font-cairo text-red-400 mb-2">
              استشهاد بطل الصاعقة بنيران دشم العدو!
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              سقط البطل أثناء اقتحام حصن خط بارليف تحت وابل نيران الرشاشات المعادية. دماء الشهداء هي نبراس النصر، أعد تنظيم الهجوم واقتحم الدشم سريعاً!
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={resetMission}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة الاقتحام 🔄
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

      {/* Footer Instructions */}
      <div className="hidden sm:flex p-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>تحرك بالنقر السريع في أي مكان واقترب من الأهداف لتعطيلها ورفع العلم قبل نهاية المؤقت</span>
        <span className="text-amber-400 font-semibold">«تحيا جمهورية مصر العربية»</span>
      </div>
    </div>
  );
};
