/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Waves,
  Droplet,
  Shield,
  Flame,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Zap,
  AlertTriangle,
  Crosshair,
  Volume2,
  Play,
  Pause,
} from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';

interface CrossingMissionProps {
  onComplete: (scoreEarned: number) => void;
  onExit: () => void;
}

type NozzleMode = 'drill' | 'extinguish' | 'slurry';

interface SandBreach {
  id: number;
  label: string;
  shortLabel: string;
  x: number;
  width: number;
  depth: number; // 0 to 100%
  layer: 'crust' | 'gravel' | 'clay' | 'open';
  breached: boolean;
  flagRaised: boolean;
}

interface NapalmSlick {
  id: number;
  x: number;
  y: number;
  width: number;
  life: number;
  maxLife: number;
  extinguished: boolean;
}

interface EnemyBunker {
  id: number;
  x: number;
  y: number;
  label: string;
  hp: number;
  maxHp: number;
  suppressedTimer: number;
  napalmCooldown: number;
  destroyed: boolean;
}

interface AssaultBoat {
  id: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
  arrived: boolean;
  destroyed: boolean;
  soldiers: number;
}

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  isFoam?: boolean;
}

interface MudParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const CrossingMission: React.FC<CrossingMissionProps> = ({ onComplete, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [nozzleMode, setNozzleMode] = useState<NozzleMode>('drill');
  const [isAutoFiring, setIsAutoFiring] = useState<boolean>(false);
  const [pressure, setPressure] = useState<number>(75);
  const [pumpHeat, setPumpHeat] = useState<number>(15);
  const [boatsCrossed, setBoatsCrossed] = useState<number>(0);
  const [breachesCompleted, setBreachesCompleted] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isDefeated, setIsDefeated] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<string>(
    'وجّه خراطيم المياه التوربينية لإسقاط الساتر الترابي لخط بارليف وفتح 3 ثغرات!'
  );
  const [activeTarget, setActiveTarget] = useState<string>('breach1');

  const stateRef = useRef({
    pump: {
      x: 90,
      y: 360,
      angle: -0.22,
      isFiring: false,
      pressure: 75,
      heat: 15,
      nozzle: 'drill' as NozzleMode,
    },
    aim: { x: 650, y: 320 },
    breaches: [
      {
        id: 1,
        label: 'ثغرة القنطرة شرق (الجيش الثاني)',
        shortLabel: 'القنطرة شرق',
        x: 600,
        width: 100,
        depth: 0,
        layer: 'crust' as const,
        breached: false,
        flagRaised: false,
      },
      {
        id: 2,
        label: 'ثغرة الإسماعيلية والدفرسوار (القطاع الأوسط)',
        shortLabel: 'الإسماعيلية',
        x: 735,
        width: 105,
        depth: 0,
        layer: 'crust' as const,
        breached: false,
        flagRaised: false,
      },
      {
        id: 3,
        label: 'ثغرة الشط والسويس (الجيش الثالث)',
        shortLabel: 'الشط والسويس',
        x: 875,
        width: 100,
        depth: 0,
        layer: 'crust' as const,
        breached: false,
        flagRaised: false,
      },
    ] as SandBreach[],
    bunkers: [
      { id: 1, x: 650, y: 155, label: 'دشمة الكيلو 19 الحصينة', hp: 100, maxHp: 100, suppressedTimer: 0, napalmCooldown: 8, destroyed: false },
      { id: 2, x: 805, y: 155, label: 'دشمة نمرة 6 (مدفعية ونفث نابالم)', hp: 100, maxHp: 100, suppressedTimer: 0, napalmCooldown: 14, destroyed: false },
    ] as EnemyBunker[],
    napalmSlicks: [] as NapalmSlick[],
    boats: [] as AssaultBoat[],
    waterParticles: [] as WaterParticle[],
    mudParticles: [] as MudParticle[],
    floatingTexts: [] as { id: number; x: number; y: number; text: string; color: string; life: number; maxLife: number }[],
    score: 0,
    timeLeft: 120,
    boatsArrivedCount: 0,
    breachesDoneCount: 0,
    isComplete: false,
    screenShake: 0,
    isMouseDown: false,
    isAutoFiring: false,
  });

  const addFloatingText = useCallback((x: number, y: number, text: string, color = '#38bdf8') => {
    stateRef.current.floatingTexts.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 50,
    });
  }, []);

  const handleLaunchAssaultBoat = useCallback(() => {
    const state = stateRef.current;
    if (state.boats.filter((b) => !b.arrived && !b.destroyed).length >= 4) return;
    sound.playRadioTransmission();

    state.boats.push({
      id: Date.now() + Math.random(),
      x: 140,
      y: 270 + Math.random() * 160,
      speed: 70 + Math.random() * 25,
      hp: 100,
      arrived: false,
      destroyed: false,
      soldiers: 8,
    });

    addFloatingText(160, 280, '«الله أكبر.. انطلاق قارب صاعقة» 🇪🇬', '#facc15');
  }, [addFloatingText]);

  // Quick Target Lock Action
  const handleQuickLock = useCallback(
    (targetType: 'breach1' | 'breach2' | 'breach3' | 'napalm' | 'bunker') => {
      setActiveTarget(targetType);
      sound.playRadioClick();
      const state = stateRef.current;

      if (targetType === 'breach1') {
        state.aim.x = 650;
        state.aim.y = 330;
        setActiveAlert('🎯 تم التصويب على: ثغرة القنطرة شرق (الجيش الثاني)');
      } else if (targetType === 'breach2') {
        state.aim.x = 785;
        state.aim.y = 330;
        setActiveAlert('🎯 تم التصويب على: ثغرة الإسماعيلية والدفرسوار (القطاع الأوسط)');
      } else if (targetType === 'breach3') {
        state.aim.x = 925;
        state.aim.y = 330;
        setActiveAlert('🎯 تم التصويب على: ثغرة الشط والسويس (الجيش الثالث)');
      } else if (targetType === 'napalm') {
        const activeSlick = state.napalmSlicks.find((s) => !s.extinguished);
        if (activeSlick) {
          state.aim.x = activeSlick.x;
          state.aim.y = activeSlick.y;
          setActiveAlert('🔥 تم توجيه تيار المياه لإخماد سائل النابالم الحارق!');
        } else {
          state.aim.x = 380;
          state.aim.y = 340;
          setActiveAlert('🌊 سطح القناة آمن حالياً من حرائق النابالم');
        }
      } else if (targetType === 'bunker') {
        const activeBunker = state.bunkers.find((b) => !b.destroyed) || state.bunkers[0];
        state.aim.x = activeBunker.x;
        state.aim.y = activeBunker.y;
        setActiveAlert(`💥 توجيه الضغط الهيدروليكي لدك: ${activeBunker.label}`);
      }

      // Quick-lock also enables continuous fire so the selected target is actually engaged.
      state.isAutoFiring = true;
      state.pump.isFiring = true;
      setIsAutoFiring(true);
    },
    []
  );

  const toggleAutoFire = useCallback(() => {
    sound.playRadioClick();
    setIsAutoFiring((prev) => {
      const next = !prev;
      stateRef.current.isAutoFiring = next;
      stateRef.current.pump.isFiring = next || stateRef.current.isMouseDown;
      return next;
    });
  }, []);

  // Countdown timer and game loop triggers
  useEffect(() => {
    if (isWon || isDefeated) return;

    const firstBoat = setTimeout(() => {
      handleLaunchAssaultBoat();
    }, 1200);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        stateRef.current.timeLeft = next;

        // Auto launch boats occasionally
        const activeBoats = stateRef.current.boats.filter((b) => !b.arrived && !b.destroyed);
        if (activeBoats.length < 3 && Math.random() < 0.65) {
          handleLaunchAssaultBoat();
        }

        // Bunkers trigger napalm release pipes
        for (const bk of stateRef.current.bunkers) {
          if (!bk.destroyed && bk.suppressedTimer <= 0) {
            bk.napalmCooldown -= 1;
            if (bk.napalmCooldown <= 0) {
              bk.napalmCooldown = 15 + Math.random() * 8;
              sound.playCannon();
              const slickX = 260 + Math.random() * 260;
              const slickY = 280 + Math.random() * 140;

              stateRef.current.napalmSlicks.push({
                id: Date.now() + Math.random(),
                x: slickX,
                y: slickY,
                width: 140,
                life: 1,
                maxLife: 20,
                extinguished: false,
              });

              setActiveAlert('⚠️ تحذير: اشتعال سائل النابالم على القناة! وجّه الماء فوراً لإخماده!');
              addFloatingText(slickX, slickY - 20, '⚠️ أنابيب نابالم مشتعلة! وجّه المياه لإخمادها!', '#ef4444');
            }
          }
        }

        if (next <= 0 && !stateRef.current.isComplete) {
          stateRef.current.isComplete = true;
          setIsDefeated(true);
          sound.playDefeatSound();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      clearTimeout(firstBoat);
      clearInterval(timer);
    };
  }, [isWon, isDefeated, handleLaunchAssaultBoat, addFloatingText]);

  // Main Canvas & Fluid Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let lastTelemetryDisplayTime = 0;

    const updateAimPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const canvasAspect = canvas.width / canvas.height;
      const rectAspect = rect.width / rect.height;
      let renderW = rect.width;
      let renderH = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (rectAspect > canvasAspect) {
        renderW = rect.height * canvasAspect;
        offsetX = (rect.width - renderW) / 2;
      } else {
        renderH = rect.width / canvasAspect;
        offsetY = (rect.height - renderH) / 2;
      }

      const scaleX = canvas.width / renderW;
      const scaleY = canvas.height / renderH;
      const targetX = (clientX - rect.left - offsetX) * scaleX;
      const targetY = (clientY - rect.top - offsetY) * scaleY;

      stateRef.current.aim.x = Math.max(160, Math.min(canvas.width - 20, targetX));
      stateRef.current.aim.y = Math.max(60, Math.min(canvas.height - 40, targetY));
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateAimPos(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        stateRef.current.isMouseDown = true;
        updateAimPos(e.clientX, e.clientY);
        stateRef.current.pump.isFiring = true;
      }
    };

    const handleMouseUp = () => {
      stateRef.current.isMouseDown = false;
      if (!stateRef.current.isAutoFiring) {
        stateRef.current.pump.isFiring = false;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        stateRef.current.isMouseDown = true;
        updateAimPos(e.touches[0].clientX, e.touches[0].clientY);
        stateRef.current.pump.isFiring = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateAimPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      stateRef.current.isMouseDown = false;
      if (!stateRef.current.isAutoFiring) {
        stateRef.current.pump.isFiring = false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        stateRef.current.pump.isFiring = true;
      }
      if (e.key === 'c' || e.key === 'C') {
        toggleAutoFire();
      }
      if (e.key === '1') {
        stateRef.current.pump.nozzle = 'drill';
        setNozzleMode('drill');
        sound.playRadioClick();
      }
      if (e.key === '2') {
        stateRef.current.pump.nozzle = 'extinguish';
        setNozzleMode('extinguish');
        sound.playRadioClick();
      }
      if (e.key === '3') {
        stateRef.current.pump.nozzle = 'slurry';
        setNozzleMode('slurry');
        sound.playRadioClick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!stateRef.current.isAutoFiring) {
          stateRef.current.pump.isFiring = false;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = (currentTime: number) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const state = stateRef.current;
      if (state.isComplete) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt * 14);
      }

      const pump = state.pump;
      const aim = state.aim;

      // Pump nozzle angle pointing at aim crosshair
      const aimDx = aim.x - pump.x;
      const aimDy = aim.y - pump.y;
      pump.angle = Math.atan2(aimDy, aimDx);

      // Hydraulic pressure build-up and heat dissipation
      if (pump.isFiring) {
        pump.heat = Math.min(100, pump.heat + dt * 4.5);
        pump.pressure = Math.min(100, pump.pressure + dt * 40);
        if (Math.random() < 0.2) sound.playSplash();
      } else {
        pump.heat = Math.max(10, pump.heat - dt * 25);
        pump.pressure = Math.max(50, pump.pressure - dt * 35);
      }
      if (currentTime - lastTelemetryDisplayTime >= 100) {
        lastTelemetryDisplayTime = currentTime;
        setPressure(Math.round(pump.pressure));
        setPumpHeat(Math.round(pump.heat));
      }

      const effectivePressure = pump.heat >= 98 ? pump.pressure * 0.75 : pump.pressure;

      // 1. Water Stream Particle Generation from High-Pressure Cannon
      if (pump.isFiring) {
        const streamCount = pump.nozzle === 'extinguish' ? 8 : pump.nozzle === 'slurry' ? 7 : 6;
        const baseSpeed = 880 + effectivePressure * 4.2;

        for (let i = 0; i < streamCount; i++) {
          const spread =
            pump.nozzle === 'extinguish'
              ? (Math.random() - 0.5) * 0.28
              : pump.nozzle === 'slurry'
              ? (Math.random() - 0.5) * 0.20
              : (Math.random() - 0.5) * 0.08;

          const pAngle = pump.angle + spread;
          const speed = baseSpeed * (0.94 + Math.random() * 0.2);

          state.waterParticles.push({
            x: pump.x + Math.cos(pump.angle) * 36,
            y: pump.y + Math.sin(pump.angle) * 36,
            vx: Math.cos(pAngle) * speed,
            vy: Math.sin(pAngle) * speed + 10,
            life: 0,
            maxLife: 100 + Math.random() * 30,
            size: pump.nozzle === 'extinguish' ? 6 + Math.random() * 4 : 5 + Math.random() * 3,
            color: Math.random() < 0.65 ? '#38bdf8' : '#e0f2fe',
            isFoam: Math.random() < 0.4,
          });
        }
      }

      // 2. Update Water Stream & Impacts on Sand Berm, Napalm & Bunkers
      for (let w = state.waterParticles.length - 1; w >= 0; w--) {
        const wp = state.waterParticles[w];
        wp.vy += 105 * dt; // gentle ballistic arc
        wp.x += wp.vx * dt;
        wp.y += wp.vy * dt;
        wp.life++;

        let hitSomething = false;

        // A. Hit on Sand Berm (x: 575 to 1000, y: 160 to 520)
        if (wp.x >= 575 && wp.x <= 1000 && wp.y >= 160 && wp.y <= 520) {
          hitSomething = true;

          const targetBreach = state.breaches.find((b) => wp.x >= b.x - 35 && wp.x <= b.x + b.width + 35);

          if (targetBreach && !targetBreach.breached) {
            // Erosion efficiency varies by chosen nozzle mode and layer resistance
            let erosionRate = 0.14 * (effectivePressure / 60);
            if (pump.nozzle === 'drill') {
              erosionRate *= targetBreach.layer === 'crust' ? 2.8 : 1.8;
            } else if (pump.nozzle === 'slurry') {
              erosionRate *= targetBreach.layer === 'clay' ? 3.0 : 2.2;
            } else {
              erosionRate *= 1.2;
            }

            targetBreach.depth += erosionRate * dt * 65;

            // Layer transitions
            if (targetBreach.depth < 25) {
              targetBreach.layer = 'crust';
            } else if (targetBreach.depth < 65) {
              targetBreach.layer = 'gravel';
            } else if (targetBreach.depth < 99) {
              targetBreach.layer = 'clay';
            } else {
              targetBreach.depth = 100;
              targetBreach.layer = 'open';
              if (!targetBreach.breached) {
                targetBreach.breached = true;
                targetBreach.flagRaised = true;
                state.breachesDoneCount++;
                setBreachesCompleted(state.breachesDoneCount);
                sound.playMissionStartRadioAlert();
                state.score += 2500;
                setScore(state.score);
                state.screenShake = 10;
                addFloatingText(targetBreach.x + targetBreach.width / 2, 220, `🌟 فُتحت ${targetBreach.label} بالكامل! 🇪🇬`, '#4ade80');
                setActiveAlert(`الله أكبر! رُفع علم مصر فوق ${targetBreach.label} وسقطت أسطورة خط بارليف!`);

                // Check victory condition
                if (state.breachesDoneCount >= 3 && !state.isComplete) {
                  state.isComplete = true;
                  const timeBonus = state.timeLeft * 35;
                  state.score += timeBonus;
                  setScore(state.score);
                  setIsWon(true);
                  sound.playVictoryFanfare();
                }
              }
            }

            // Spawn mud cascade particles down into the canal
            if (Math.random() < 0.7) {
              state.mudParticles.push({
                x: wp.x + (Math.random() - 0.5) * 15,
                y: wp.y,
                vx: -60 - Math.random() * 80,
                vy: 80 + Math.random() * 100,
                life: 1,
                maxLife: 32,
                size: 4 + Math.random() * 6,
                color: targetBreach.layer === 'clay' ? '#78350f' : '#b45309',
              });
            }
          }
        }

        // B. Hit on Napalm Slick on Canal surface
        if (!hitSomething) {
          for (const slick of state.napalmSlicks) {
            if (!slick.extinguished && Math.abs(wp.x - slick.x) < slick.width / 2 && Math.abs(wp.y - slick.y) < 45) {
              hitSomething = true;
              slick.life += (pump.nozzle === 'extinguish' ? 8.0 : 3.0) * dt;
              if (slick.life >= slick.maxLife) {
                slick.extinguished = true;
                sound.playSplash();
                state.score += 500;
                setScore(state.score);
                addFloatingText(slick.x, slick.y - 20, '+500 إخماد أنابيب النابالم بالماء! 🌊', '#38bdf8');
              }
              break;
            }
          }
        }

        // C. Hit on Enemy Bunkers
        if (!hitSomething) {
          for (const bk of state.bunkers) {
            if (!bk.destroyed && Math.hypot(wp.x - bk.x, wp.y - bk.y) < 55) {
              hitSomething = true;
              bk.suppressedTimer = 3.5;
              bk.hp -= 40 * dt;
              if (bk.hp <= 0 && !bk.destroyed) {
                bk.destroyed = true;
                sound.playExplosion(1.1);
                state.score += 800;
                setScore(state.score);
                addFloatingText(bk.x, bk.y - 25, `+800 دك دشمة بارليف بالضغط الهيدروليكي! 💥`, '#4ade80');
              }
              break;
            }
          }
        }

        // Despawn water particle
        if (hitSomething || wp.life >= wp.maxLife || wp.y > canvas.height + 20 || wp.x > canvas.width + 40) {
          state.waterParticles.splice(w, 1);
        }
      }

      // 3. Update Mud Particles
      for (let m = state.mudParticles.length - 1; m >= 0; m--) {
        const mp = state.mudParticles[m];
        mp.x += mp.vx * dt;
        mp.y += mp.vy * dt;
        mp.life++;
        if (mp.life >= mp.maxLife || mp.y > 540) {
          state.mudParticles.splice(m, 1);
        }
      }

      // 4. Update Assault Boats crossing from West (x=140) to East (x=600)
      for (let b = state.boats.length - 1; b >= 0; b--) {
        const boat = state.boats[b];
        if (boat.destroyed) continue;

        if (!boat.arrived) {
          boat.x += boat.speed * dt;

          // Check if boat enters an active flaming napalm slick
          for (const slick of state.napalmSlicks) {
            if (!slick.extinguished && Math.abs(boat.x - slick.x) < slick.width / 2 && Math.abs(boat.y - slick.y) < 30) {
              boat.hp -= 25 * dt;
              if (Math.random() < 0.15) {
                addFloatingText(boat.x, boat.y - 20, '⚠️ القارب يقترب من النابالم! أطفئه بالماء!', '#ef4444');
              }
              if (boat.hp <= 0) {
                boat.destroyed = true;
                sound.playExplosion(0.9);
                addFloatingText(boat.x, boat.y - 20, 'فقدنا قارب عبور بالنابالم! ⚠️', '#ef4444');
              }
            }
          }

          // Boat reached the breached sand rampart!
          if (boat.x >= 580) {
            boat.arrived = true;
            state.boatsArrivedCount++;
            setBoatsCrossed(state.boatsArrivedCount);
            state.score += 800;
            setScore(state.score);
            sound.playTargetLock();
            addFloatingText(boat.x, boat.y - 25, `+800 وصول أبطال الصاعقة إلى الشاطئ الشرقي! 🇪🇬`, '#4ade80');
          }
        }
      }

      // Clean up extinguished napalms
      for (let n = state.napalmSlicks.length - 1; n >= 0; n--) {
        if (state.napalmSlicks[n].extinguished) {
          state.napalmSlicks.splice(n, 1);
        }
      }

      // ----------------------------------------------------
      // RENDER CANVAS SCENE (Water, Sand Berm, Bunkers, Streams)
      // ----------------------------------------------------
      ctx.save();
      if (state.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
      skyGrad.addColorStop(0, '#0c4a6e');
      skyGrad.addColorStop(0.6, '#38bdf8');
      skyGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 240);

      // West Bank (Egypt): Green palm groves and pump platform (x: 0 to 140)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 240, 140, canvas.height - 240);

      // Suez Canal Water (x: 140 to 600)
      const waterGrad = ctx.createLinearGradient(140, 240, 600, 240);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(0.5, '#0369a1');
      waterGrad.addColorStop(1, '#075985');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(140, 240, 460, canvas.height - 240);

      // Animated Water Waves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      for (let r = 260; r < canvas.height; r += 26) {
        ctx.beginPath();
        for (let wx = 140; wx <= 600; wx += 20) {
          const waveY = r + Math.sin(wx * 0.05 + currentTime * 0.003) * 3;
          if (wx === 140) ctx.moveTo(wx, waveY);
          else ctx.lineTo(wx, waveY);
        }
        ctx.stroke();
      }

      // East Bank: The Colossal Bar Lev Sand Berm (x: 580 to 1000)
      // 20-meter high steep sloping mountain of sand (45° incline)
      const bermGrad = ctx.createLinearGradient(580, 180, 1000, 520);
      bermGrad.addColorStop(0, '#f59e0b');
      bermGrad.addColorStop(0.4, '#d97706');
      bermGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = bermGrad;

      ctx.beginPath();
      ctx.moveTo(580, canvas.height);
      ctx.lineTo(580, 260); // base of berm
      ctx.lineTo(660, 170); // crest
      ctx.lineTo(1000, 170);
      ctx.lineTo(1000, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Render the 3 Sand Breaches carved out by water cannons
      for (const b of state.breaches) {
        ctx.save();
        const breachH = (b.depth / 100) * 220;

        // Breached cut in the berm
        if (b.depth > 0) {
          ctx.fillStyle = '#0f172a'; // void / channel opening
          ctx.beginPath();
          ctx.moveTo(b.x, 260);
          ctx.lineTo(b.x + b.width / 2, 260 + breachH);
          ctx.lineTo(b.x + b.width, 260);
          ctx.lineTo(b.x + b.width, 490);
          ctx.lineTo(b.x, 490);
          ctx.closePath();
          ctx.fill();

          // Flowing mud channel
          ctx.fillStyle = b.layer === 'clay' ? '#451a03' : '#b45309';
          ctx.fillRect(b.x + 8, 260 + breachH * 0.5, b.width - 16, 230 - breachH * 0.5);
        }

        // Breach Progress Banner & Depth meter
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(b.x - 8, 480, b.width + 16, 36, 6);
        ctx.fill();
        ctx.strokeStyle = b.breached ? '#22c55e' : '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(b.breached ? 'فتح المسار 100% 🇪🇬' : `عمق التجريف: ${Math.round(b.depth)}%`, b.x + b.width / 2, 496);

        // Progress bar
        ctx.fillStyle = '#334155';
        ctx.fillRect(b.x - 2, 502, b.width + 4, 8);
        ctx.fillStyle = b.breached ? '#22c55e' : '#38bdf8';
        ctx.fillRect(b.x - 2, 502, ((b.width + 4) * b.depth) / 100, 8);

        // Raised Egyptian Flag when breach is complete!
        if (b.flagRaised) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(b.x + b.width / 2 - 2, 125, 4, 45); // flagpole
          // Flag colors: Red, White, Black
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(b.x + b.width / 2 + 2, 125, 26, 7);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x + b.width / 2 + 2, 132, 26, 7);
          ctx.fillStyle = '#000000';
          ctx.fillRect(b.x + b.width / 2 + 2, 139, 26, 7);
        }

        ctx.restore();
      }

      // Render Napalm Slicks on canal water
      for (const slick of state.napalmSlicks) {
        if (!slick.extinguished) {
          const glow = ctx.createRadialGradient(slick.x, slick.y, 10, slick.x, slick.y, slick.width / 2);
          glow.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
          glow.addColorStop(0.5, 'rgba(249, 115, 22, 0.8)');
          glow.addColorStop(1, 'rgba(234, 179, 8, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.ellipse(slick.x, slick.y, slick.width / 2, 22, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText('🔥 نابالم مشتعل! وجّه الماء لإطفائه', slick.x, slick.y - 12);
        }
      }

      // Render Enemy Bunkers on Bar Lev crest
      for (const bk of state.bunkers) {
        ctx.save();
        ctx.translate(bk.x, bk.y);

        ctx.fillStyle = bk.destroyed ? '#27272a' : '#52525b';
        ctx.fillRect(-30, -18, 60, 36);

        ctx.fillStyle = bk.suppressedTimer > 0 ? '#38bdf8' : '#000000';
        ctx.fillRect(-22, -4, 44, 8);

        ctx.fillStyle = bk.destroyed ? '#18181b' : '#3f3f46';
        ctx.fillRect(-34, -22, 68, 8);

        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillStyle = bk.destroyed ? '#ef4444' : '#e4e4e7';
        ctx.textAlign = 'center';
        ctx.fillText(bk.destroyed ? '💥 دُمرت الدشمة' : bk.label, 0, -28);

        if (!bk.destroyed) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-20, 22, (40 * bk.hp) / bk.maxHp, 4);
        }
        ctx.restore();
      }

      // Render Assault Boats
      for (const boat of state.boats) {
        if (boat.destroyed) continue;

        ctx.save();
        ctx.translate(boat.x, boat.y);

        // Boat Hull (Inflatable Rubber Zodiac Zodiak PMP)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Commando Soldiers inside
        ctx.fillStyle = '#15803d'; // Egyptian Army Olive Camouflage
        for (let s = -12; s <= 12; s += 8) {
          ctx.beginPath();
          ctx.arc(s, -2, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Little Egyptian Pennant on boat bow
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(16, -10, 8, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, -7, 8, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(16, -4, 8, 3);

        ctx.restore();
      }

      // Render Water Particles
      for (const wp of state.waterParticles) {
        ctx.fillStyle = wp.color;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Mud Particles
      for (const mp of state.mudParticles) {
        ctx.fillStyle = mp.color;
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, mp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render High-Pressure Turbine Water Cannon on West Bank Platform
      ctx.save();
      ctx.translate(pump.x, pump.y);

      // Platform
      ctx.fillStyle = '#334155';
      ctx.fillRect(-24, 18, 48, 14);

      // Turbine Turret Swivel Base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Nozzle Barrel pointing along pump.angle
      ctx.rotate(pump.angle);

      ctx.fillStyle = pump.nozzle === 'drill' ? '#0284c7' : pump.nozzle === 'extinguish' ? '#0d9488' : '#b45309';
      ctx.fillRect(0, -6, 36, 12);

      // Brass Nozzle Tip
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(36, -4, 8, 8);

      ctx.restore();

      // Aiming Reticle / Crosshair on Sand Berm
      ctx.save();
      const nozzleTipX = pump.x + Math.cos(pump.angle) * 44;
      const nozzleTipY = pump.y + Math.sin(pump.angle) * 44;

      // Sightline Trajectory
      ctx.strokeStyle = pump.isFiring ? 'rgba(56, 189, 248, 0.45)' : 'rgba(250, 204, 21, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(nozzleTipX, nozzleTipY);
      ctx.lineTo(aim.x, aim.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Identify target under crosshair
      let lockText = '';
      const hoverBreach = state.breaches.find((b) => aim.x >= b.x - 20 && aim.x <= b.x + b.width + 20 && aim.y >= 200 && aim.y <= 490);
      const hoverNapalm = state.napalmSlicks.find((s) => !s.extinguished && Math.abs(aim.x - s.x) < s.width / 2 && Math.abs(aim.y - s.y) < 35);
      const hoverBunker = state.bunkers.find((b) => !b.destroyed && Math.hypot(aim.x - b.x, aim.y - b.y) < 45);

      if (hoverBreach) {
        lockText = hoverBreach.breached ? 'مسار مفتوح 100% 🇪🇬' : `🎯 تجريف: ${hoverBreach.label}`;
      } else if (hoverNapalm) {
        lockText = '🔥 إخماد سائل النابالم الحارق';
      } else if (hoverBunker) {
        lockText = `💥 دك وقصف: ${hoverBunker.label}`;
      }

      const reticleColor = hoverNapalm
        ? '#f97316'
        : hoverBunker
        ? '#ef4444'
        : pump.isFiring
        ? '#38bdf8'
        : '#facc15';

      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, pump.isFiring ? 18 : 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(aim.x - 24, aim.y);
      ctx.lineTo(aim.x - 14, aim.y);
      ctx.moveTo(aim.x + 14, aim.y);
      ctx.lineTo(aim.x + 24, aim.y);
      ctx.moveTo(aim.x, aim.y - 24);
      ctx.lineTo(aim.x, aim.y - 14);
      ctx.moveTo(aim.x, aim.y + 14);
      ctx.lineTo(aim.x, aim.y + 24);
      ctx.stroke();

      ctx.fillStyle = reticleColor;
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (lockText) {
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.fillStyle = reticleColor;
        ctx.textAlign = 'center';
        ctx.fillText(lockText, aim.x, aim.y - 28);
      }
      ctx.restore();

      // Floating Texts
      for (let f = state.floatingTexts.length - 1; f >= 0; f--) {
        const ft = state.floatingTexts[f];
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
          state.floatingTexts.splice(f, 1);
        }
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
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleAutoFire]);

  const handleRestart = () => {
    sound.playRadioTransmission();
    const state = stateRef.current;
    state.isComplete = false;
    state.breaches.forEach((b) => {
      b.depth = 0;
      b.layer = 'crust';
      b.breached = false;
      b.flagRaised = false;
    });
    state.bunkers.forEach((bk) => {
      bk.destroyed = false;
      bk.hp = bk.maxHp;
      bk.suppressedTimer = 0;
    });
    state.boats = [];
    state.napalmSlicks = [];
    state.waterParticles = [];
    state.mudParticles = [];
    state.floatingTexts = [];
    state.breachesDoneCount = 0;
    state.boatsArrivedCount = 0;
    state.score = 0;
    state.timeLeft = 120;
    state.pump.heat = 15;
    state.pump.pressure = 75;
    state.pump.isFiring = false;
    state.isAutoFiring = false;
    setBreachesCompleted(0);
    setBoatsCrossed(0);
    setScore(0);
    setTimeLeft(120);
    setIsWon(false);
    setIsDefeated(false);
    setIsAutoFiring(false);
    setActiveAlert('ابدأ تشغيل مضخات المياه التوربينية وركز تيار الضغط على الساتر الترابي!');
  };

  return (
    <div dir="rtl" className="w-full h-full flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden">
      {/* Top Header / Tactical Status */}
      <div className="px-4 py-2 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700"
            title="العودة لغرفة العمليات"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-bold font-cairo text-sm sm:text-base text-amber-400">
              ملحمة اقتحام خط بارليف وخراطيم المياه التوربينية
            </h2>
            <div className="text-[11px] text-stone-400">
              عبقرية اللواء باقي زكي يوسف · تجريف 3 ملايين متر مكعب رمال
            </div>
          </div>
        </div>

        {/* Telemetry Bar */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Droplet className="w-4 h-4 text-sky-400" />
            <span className="text-stone-300">الضغط:</span>
            <span className="font-mono tabular-nums font-bold text-sky-400">{pressure} BAR</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-300">حرارة المضخة:</span>
            <span className={`font-mono tabular-nums font-bold ${pumpHeat > 85 ? 'text-red-400' : 'text-emerald-400'}`}>
              {pumpHeat}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-stone-300">الثغرات:</span>
            <span className="font-mono tabular-nums font-bold text-emerald-400">{breachesCompleted} / 3</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-amber-400" />
            <span className="text-stone-300">القوارب:</span>
            <span className="font-mono tabular-nums font-bold text-amber-400">{boatsCrossed}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="font-mono tabular-nums font-bold text-amber-400">{score} نقطة</span>
          </div>
        </div>
      </div>

      {/* Control Helpers & Quick Action Toolbar */}
      <div className="px-3 sm:px-4 py-2 bg-stone-900/90 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Nozzle Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-stone-300 hidden sm:inline">فوهة الضخ:</span>
          <button
            onClick={() => {
              setNozzleMode('drill');
              stateRef.current.pump.nozzle = 'drill';
              sound.playRadioClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              nozzleMode === 'drill'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-sky-300" />
            <span>[1] حفر نفاث ⚡</span>
          </button>

          <button
            onClick={() => {
              setNozzleMode('extinguish');
              stateRef.current.pump.nozzle = 'extinguish';
              sound.playRadioClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              nozzleMode === 'extinguish'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>[2] إخماد النابالم 🌊</span>
          </button>

          <button
            onClick={() => {
              setNozzleMode('slurry');
              stateRef.current.pump.nozzle = 'slurry';
              sound.playRadioClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              nozzleMode === 'slurry'
                ? 'bg-amber-600 text-stone-950 shadow-md font-black'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>[3] طوفان التجريف 🌪️</span>
          </button>
        </div>

        {/* Continuous Auto-Pump Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoFire}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all ${
              isAutoFiring
                ? 'bg-sky-500 text-stone-950 ring-2 ring-sky-300 animate-pulse'
                : 'bg-stone-800 hover:bg-stone-700 text-sky-400 border border-stone-700'
            }`}
            title="تشغيل أو إيقاف ضخ المياه المستمر التلقائي (اختصار C أو مسافة)"
          >
            {isAutoFiring ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoFiring ? 'الضخ المستمر مفعّل 🌊' : 'تشغيل ضخ مستمر [C]'}</span>
          </button>

          <button
            onClick={handleLaunchAssaultBoat}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>إطلاق قارب عبور 🚣</span>
          </button>
        </div>
      </div>

      {/* Quick Target Selector Bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-stone-950 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-stone-400 font-medium text-[11px] flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-amber-400" />
            <span>تصويب سريع:</span>
          </span>

          <button
            onClick={() => handleQuickLock('breach1')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              activeTarget === 'breach1' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            ثغرة 1 (القنطرة)
          </button>

          <button
            onClick={() => handleQuickLock('breach2')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              activeTarget === 'breach2' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            ثغرة 2 (الإسماعيلية)
          </button>

          <button
            onClick={() => handleQuickLock('breach3')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              activeTarget === 'breach3' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            ثغرة 3 (السويس)
          </button>

          <button
            onClick={() => handleQuickLock('napalm')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              activeTarget === 'napalm' ? 'bg-red-500 text-white' : 'bg-stone-900 text-red-400 hover:bg-stone-800'
            }`}
          >
            إطفاء النابالم 🔥
          </button>

          <button
            onClick={() => handleQuickLock('bunker')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              activeTarget === 'bunker' ? 'bg-orange-500 text-white' : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            دشم بارليف 💥
          </button>
        </div>

        <div className="text-amber-400 font-medium text-[11px] truncate max-w-sm sm:max-w-md">
          {activeAlert}
        </div>
      </div>

      {/* Canvas Battlefield Area */}
      <div className="relative flex-1 w-full min-h-0 bg-stone-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={560}
          className="w-full h-full max-w-full max-h-full object-contain cursor-crosshair select-none touch-none"
        />

        {/* Digital Countdown Timer */}
        {!isWon && !isDefeated && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={120}
            label="الزمن المتبقي للعبور"
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
              انهيار أسطورة خط بارليف وسقوط الساتر الترابي!
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              فتحت خراطيم المياه التوربينية 3 ممرات واسعة في أضخم ساتر ترابي في التاريخ العسكري، وعبرت قوات الصاعقة والمشاة رافعة علم جمهورية مصر العربية خفاقاً فوق تراب سيناء!
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6 max-w-md w-full text-center">
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">الثغرات المفتوحة</span>
                <span className="text-base font-bold font-mono text-emerald-400">3 من 3</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                <span className="block text-[11px] text-stone-400 mb-1">قوارب العبور</span>
                <span className="text-base font-bold font-mono text-sky-400">{boatsCrossed} قوارب</span>
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
              الانتقال إلى المرحلة الثالثة: بناء الكباري العائمة
            </button>
          </div>
        )}

        {/* Defeat / Timeout Modal */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-cairo text-red-500 mb-2">
              انتهت مدة الدقيقتين المخصصة لفتح الثغرات!
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-5 leading-relaxed">
              ركّز ضغط المياه النفاث باستمرار على الساتر الترابي، واستخدم وضع الضخ المستمر [C] وأطفئ حرائق النابالم لحماية قوارب العبور!
            </p>

            <button
              onClick={handleRestart}
              className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة محاولة الاقتحام 🔄
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
        <span>فكرة اللواء مهندس باقي زكي يوسف · مضخات مياه توربينية بريطانية وألمانية فائقة الضغط</span>
        <span className="text-amber-400 font-semibold">«بسم الله.. الله أكبر» 🇪🇬</span>
      </div>
    </div>
  );
};
