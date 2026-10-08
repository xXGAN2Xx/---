import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  Shield,
  X,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowRight,
  Flame,
  Flag,
  Crosshair,
  Bomb,
  Droplets,
  Wind,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface FortressTutorialModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLaunchBattle?: () => void;
  onCancel?: () => void;
  difficulty?: Difficulty;
}

const TOTAL_LOOP_FRAMES = 720; // 12.0 seconds at 60fps

interface SceneDefinition {
  startFrame: number;
  endFrame: number;
  title: string;
  badge: string;
  weaponKey: string;
  weaponName: string;
}

const SCENES: SceneDefinition[] = [
  {
    startFrame: 0,
    endFrame: 130,
    title: 'المشهد 1: استخدام مضخة الرغوة [4] لإخماد صمامات وأنابيب النابالم المشتعلة',
    badge: 'مفتاح 4 / مضخة الرغوة (Foam)',
    weaponKey: '4',
    weaponName: 'رغوة Foam',
  },
  {
    startFrame: 130,
    endFrame: 250,
    title: 'المشهد 2: إطلاق قاذف RPG-7 [1] لدك دشم الرشاشات والمدافع الخرسانية',
    badge: 'مفتاح 1 / قاذف RPG-7',
    weaponKey: '1',
    weaponName: 'قاذف RPG-7',
  },
  {
    startFrame: 250,
    endFrame: 370,
    title: 'المشهد 3: استخدام رشاش الصاعقة الثقيل MG [2] لقمع القناصة وأبراج المراقبة',
    badge: 'مفتاح 2 / رشاش الصاعقة (MG)',
    weaponKey: '2',
    weaponName: 'رشاش MG',
  },
  {
    startFrame: 370,
    endFrame: 490,
    title: 'المشهد 4: زرع شحنة نسف مركزة TNT [3] لتفجير بوابات الحصن الفولاذية',
    badge: 'مفتاح 3 / شحنة نسف TNT',
    weaponKey: '3',
    weaponName: 'شحنة TNT',
  },
  {
    startFrame: 490,
    endFrame: 590,
    title: 'المشهد 5: نشر قنابل ستائر الدخان [5] لحجب رؤية نيران العدو وحماية الصاعقة بنسبة 100%',
    badge: 'مفتاح 5 / ستائر الدخان (Cover)',
    weaponKey: '5',
    weaponName: 'ستار دخان',
  },
  {
    startFrame: 590,
    endFrame: 720,
    title: 'المشهد 6: سقوط حصن بارليف، رفع العلم المصري على القمة، واستسلام الحامية! 🇪🇬',
    badge: 'تم النصر الحاسم 🏆',
    weaponKey: 'flag',
    weaponName: 'رفع العلم 🇪🇬',
  },
];

export const FortressTutorialModal: React.FC<FortressTutorialModalProps> = ({
  isOpen,
  onClose,
  onLaunchBattle,
  onCancel,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const timeDisplayRef = useRef<HTMLSpanElement | null>(null);
  const scrubberContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const stepRef = useRef(0);
  const lastSoundTriggerRef = useRef<number>(-1);
  const currentSceneIndexRef = useRef(0);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleRestartVideo = () => {
    stepRef.current = 0;
    lastSoundTriggerRef.current = -1;
    setIsPlaying(true);
  };

  const jumpToScene = (targetSceneIndex: number) => {
    if (targetSceneIndex >= 0 && targetSceneIndex < SCENES.length) {
      stepRef.current = SCENES[targetSceneIndex].startFrame;
      lastSoundTriggerRef.current = -1;
      setIsPlaying(true);
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberContainerRef.current) return;
    const rect = scrubberContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    stepRef.current = Math.floor(fraction * TOTAL_LOOP_FRAMES);
    lastSoundTriggerRef.current = -1;
  };

  const handleConfirm = () => {
    sound.playRadioTransmission();
    if (onLaunchBattle) {
      onLaunchBattle();
    } else if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    sound.playRadioClick();
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  // High-fidelity Canvas animated video simulation
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (isPlayingRef.current) {
        stepRef.current += 1;
      }

      const loopFrame = stepRef.current % TOTAL_LOOP_FRAMES;
      const progressFraction = loopFrame / TOTAL_LOOP_FRAMES;

      // Direct DOM updates for butter-smooth 60fps performance without React re-render lag
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progressFraction * 100}%`;
      }
      if (timeDisplayRef.current) {
        const currentSec = Math.floor(loopFrame / 60);
        const totalSec = 12;
        timeDisplayRef.current.textContent = `00:${currentSec < 10 ? '0' : ''}${currentSec} / 00:${totalSec}`;
      }

      // Determine active scene
      let activeScene = 0;
      for (let i = 0; i < SCENES.length; i++) {
        if (loopFrame >= SCENES[i].startFrame && loopFrame < SCENES[i].endFrame) {
          activeScene = i;
          break;
        }
      }

      if (activeScene !== currentSceneIndexRef.current) {
        currentSceneIndexRef.current = activeScene;
        setCurrentSceneIndex(activeScene);
      }

      // Audio triggers synchronized with scene events (throttled & safe)
      if (!isMutedRef.current) {
        if (loopFrame === 25 && lastSoundTriggerRef.current !== 1) {
          lastSoundTriggerRef.current = 1;
          sound.playWaterCannon();
        } else if (loopFrame === 75 && lastSoundTriggerRef.current !== 15) {
          lastSoundTriggerRef.current = 15;
          sound.playWaterCannon();
        } else if (loopFrame === 145 && lastSoundTriggerRef.current !== 2) {
          lastSoundTriggerRef.current = 2;
          sound.playMissileLaunch(); // Fixed: playMissileLaunch instead of non-existent playRocket
        } else if (loopFrame === 180 && lastSoundTriggerRef.current !== 25) {
          lastSoundTriggerRef.current = 25;
          sound.playExplosion(1.1);
        } else if (loopFrame === 265 && lastSoundTriggerRef.current !== 3) {
          lastSoundTriggerRef.current = 3;
          sound.playGunshot();
        } else if (loopFrame === 390 && lastSoundTriggerRef.current !== 4) {
          lastSoundTriggerRef.current = 4;
          sound.playRadioClick();
        } else if (loopFrame === 425 && lastSoundTriggerRef.current !== 45) {
          lastSoundTriggerRef.current = 45;
          sound.playExplosion(1.4);
        } else if (loopFrame === 500 && lastSoundTriggerRef.current !== 5) {
          lastSoundTriggerRef.current = 5;
          sound.playCannon();
        } else if (loopFrame === 600 && lastSoundTriggerRef.current !== 6) {
          lastSoundTriggerRef.current = 6;
          sound.playVictoryFanfare();
        } else if (loopFrame === 0) {
          lastSoundTriggerRef.current = -1;
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Sinai Sunset Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
      skyGrad.addColorStop(0, '#1c1917');
      skyGrad.addColorStop(0.3, '#451a03');
      skyGrad.addColorStop(0.6, '#7c2d12');
      skyGrad.addColorStop(0.85, '#b45309');
      skyGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant Sinai mountains silhouette
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.44);
      ctx.lineTo(w * 0.16, h * 0.36);
      ctx.lineTo(w * 0.32, h * 0.42);
      ctx.lineTo(w * 0.58, h * 0.32);
      ctx.lineTo(w * 0.78, h * 0.36);
      ctx.lineTo(w, h * 0.30);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // 2. The Grand Sand Rampart of the Bar-Lev Line
      const rampartGrad = ctx.createLinearGradient(0, h * 0.25, 0, h);
      rampartGrad.addColorStop(0, '#78350f');
      rampartGrad.addColorStop(0.35, '#92400e');
      rampartGrad.addColorStop(0.7, '#b45309');
      rampartGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = rampartGrad;

      ctx.beginPath();
      ctx.moveTo(w * 0.08, h);
      ctx.quadraticCurveTo(w * 0.24, h * 0.54, w * 0.46, h * 0.36);
      ctx.lineTo(w * 0.86, h * 0.22);
      ctx.lineTo(w, h * 0.22);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Barbed Wire Obstacles along the rampart slope
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let wx = w * 0.22; wx < w * 0.82; wx += 24) {
        const wy = h * 0.53 - (wx - w * 0.22) * 0.36;
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + 12, wy - 7);
        ctx.lineTo(wx + 18, wy + 2);
      }
      ctx.stroke();

      // 3. Suez Canal Water at Bottom-Left
      const canalGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
      canalGrad.addColorStop(0, '#0c4a6e');
      canalGrad.addColorStop(0.5, '#075985');
      canalGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = canalGrad;
      ctx.fillRect(0, h * 0.68, w * 0.20, h * 0.32);

      // Water ripples
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 1.5;
      for (let yWater = h * 0.72; yWater < h - 40; yWater += 14) {
        ctx.beginPath();
        ctx.moveTo(0, yWater);
        ctx.lineTo(w * 0.18, yWater + Math.sin(loopFrame * 0.08 + yWater) * 3);
        ctx.stroke();
      }

      // 4. Egyptian Forward Commando Trench (Bottom-Left)
      const trenchY = h - 110;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(25, trenchY, 175, 70);

      // Sandbags redoubt stack
      ctx.fillStyle = '#a16207';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.beginPath();
          ctx.roundRect(28 + c * 33, trenchY + 6 + r * 16, 29, 13, 3);
          ctx.fill();
          ctx.strokeStyle = '#713f12';
          ctx.stroke();
        }
      }

      // Commando Soldiers
      ctx.fillStyle = '#1c1917';
      // Soldier 1 (Rocket gunner)
      ctx.beginPath();
      ctx.arc(70, trenchY - 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(63, trenchY, 14, 22);
      // Gun / RPG
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(66, trenchY - 4);
      ctx.lineTo(108, trenchY - 18);
      ctx.stroke();

      // Soldier 2 (Officer / Radioman)
      ctx.beginPath();
      ctx.arc(125, trenchY - 4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(118, trenchY + 4, 14, 20);

      // Unit badge label
      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
      ctx.font = 'bold 10px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ فصيلة الصاعقة المقتحمة', 110, trenchY + 62);

      // 5. IN-GAME TARGETS ON THE RAMPART
      const targetNapalm1 = { x: 235, y: 265, name: 'صمام نابالم 1' };
      const targetNapalm2 = { x: 365, y: 235, name: 'صمام نابالم 2' };
      const targetBunker = { x: 450, y: 190, name: 'دشمة رشاشات' };
      const targetTower = { x: 295, y: 145, name: 'برج مراقبة' };
      const targetDoor = { x: 610, y: 190, name: 'بوابة الحصن' };
      const poleX = 710;
      const poleY = 150;

      // Helper function to draw in-game target health bar and weapon recommendation
      const drawTargetBadge = (tx: number, ty: number, keyNum: string, hpRatio: number, isDead: boolean) => {
        if (isDead) {
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 10px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓ تم التدمير', tx, ty - 22);
          return;
        }
        // Small square badge with weapon shortcut
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tx - 34, ty - 28, 14, 14, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(keyNum, tx - 27, ty - 18);

        // HP bar background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tx - 16, ty - 26, 48, 5);
        ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(tx - 16, ty - 26, 48 * Math.max(0, hpRatio), 5);
      };

      // TARGET A: Watchtower & Sniper [2]
      const towerDestroyed = loopFrame >= 330;
      ctx.save();
      ctx.translate(targetTower.x, targetTower.y);
      if (towerDestroyed) {
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-15, 0, 30, 20);
        drawTargetBadge(0, 0, '2', 0, true);
      } else {
        // Tower lattice legs
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-16, 26);
        ctx.lineTo(-8, -10);
        ctx.moveTo(16, 26);
        ctx.lineTo(8, -10);
        ctx.moveTo(-16, 26);
        ctx.lineTo(8, 6);
        ctx.moveTo(16, 26);
        ctx.lineTo(-8, 6);
        ctx.stroke();
        // Cabin
        ctx.fillStyle = '#292524';
        ctx.fillRect(-14, -22, 28, 14);
        ctx.strokeStyle = '#44403c';
        ctx.strokeRect(-14, -22, 28, 14);
        // Sniper laser if active
        if (loopFrame >= 250 && loopFrame < 320) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(-175, 150);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        drawTargetBadge(0, 0, '2', loopFrame >= 280 ? 0.3 : 1.0, false);
      }
      ctx.restore();

      // TARGET B: Concrete Bunker [1]
      const bunkerDestroyed = loopFrame >= 180;
      ctx.save();
      ctx.translate(targetBunker.x, targetBunker.y);
      if (bunkerDestroyed) {
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(0, 0, 35, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        drawTargetBadge(0, 0, '1', 0, true);
      } else {
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.roundRect(-32, -16, 64, 32, 6);
        ctx.fill();
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Gun slit
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(-22, -4, 44, 8);
        drawTargetBadge(0, 0, '1', loopFrame >= 160 ? 0.3 : 1.0, false);
      }
      ctx.restore();

      // TARGET C: Napalm Valves [4]
      const napalm1Extinguished = loopFrame >= 65;
      const napalm2Extinguished = loopFrame >= 115;

      [
        { ...targetNapalm1, extinguished: napalm1Extinguished },
        { ...targetNapalm2, extinguished: napalm2Extinguished },
      ].forEach((nv) => {
        ctx.save();
        ctx.translate(nv.x, nv.y);
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.roundRect(-18, -12, 36, 24, 4);
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Valve wheel
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();

        if (!nv.extinguished) {
          // Flame spewing effect
          for (let f = 0; f < 4; f++) {
            const fAngle = (f * 1.5 + loopFrame * 0.15) % 3;
            ctx.fillStyle = f % 2 === 0 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(249, 115, 22, 0.95)';
            ctx.beginPath();
            ctx.arc(-10 - f * 4, 8 + fAngle * 4, 5 + fAngle * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          drawTargetBadge(0, 0, '4', 1.0, false);
        } else {
          // White bubbling foam
          ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
          ctx.beginPath();
          ctx.arc(-4, 0, 11, 0, Math.PI * 2);
          ctx.arc(6, 2, 9, 0, Math.PI * 2);
          ctx.fill();
          drawTargetBadge(0, 0, '4', 0, true);
        }
        ctx.restore();
      });

      // TARGET D: Reinforced Steel Blast Door [3]
      const doorDestroyed = loopFrame >= 425;
      ctx.save();
      ctx.translate(targetDoor.x, targetDoor.y);
      if (doorDestroyed) {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-28, -20, 56, 40);
        drawTargetBadge(0, 0, '3', 0, true);
      } else {
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.roundRect(-28, -20, 56, 40, 6);
        ctx.fill();
        ctx.strokeStyle = '#eab308'; // Yellow hazard border
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Vault wheel
        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        drawTargetBadge(0, 0, '3', loopFrame >= 405 ? 0.35 : 1.0, false);
      }
      ctx.restore();

      // TARGET E: Tall Egyptian Flagpole on the right
      ctx.save();
      // Tall white pole
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(poleX, poleY - 95, 4, 115);
      // Gold finial on top
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(poleX + 2, poleY - 96, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Flag Raising Animation: in Scene 6 (frame 590 to 720) climbs to top
      const flagRaiseProgress = loopFrame >= 590 ? Math.min(1.0, (loopFrame - 590) / 60) : 0;
      const flagCurrentY = (poleY + 10) - (flagRaiseProgress * 95);
      const flagWave = Math.sin(loopFrame * 0.15) * 3;

      // Egyptian Flag
      ctx.fillStyle = '#dc2626'; // Red
      ctx.fillRect(poleX + 4, flagCurrentY, 40, 9 + flagWave * 0.1);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(poleX + 4, flagCurrentY + 9, 40, 9 + flagWave * 0.2);
      ctx.fillStyle = '#0f172a'; // Black
      ctx.fillRect(poleX + 4, flagCurrentY + 18, 40, 9 + flagWave * 0.3);
      // Golden Eagle emblem
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(poleX + 24, flagCurrentY + 13, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 6. DYNAMIC ACTION SIMULATION & VISUAL EFFECTS BY PHASE

      // Phase 1 Action: Foam Spray on Napalm Valve 1 (frame 20-65) and Valve 2 (frame 70-115)
      if (loopFrame >= 20 && loopFrame <= 65) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(125, trenchY - 4);
        ctx.quadraticCurveTo(180, 220, targetNapalm1.x, targetNapalm1.y);
        ctx.stroke();

        // Bubbling foam particles
        ctx.fillStyle = '#e0f2fe';
        for (let b = 0; b < 6; b++) {
          const bx = targetNapalm1.x + (Math.random() - 0.5) * 20;
          const by = targetNapalm1.y + (Math.random() - 0.5) * 16;
          ctx.beginPath();
          ctx.arc(bx, by, Math.random() * 4 + 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (loopFrame >= 70 && loopFrame <= 115) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(125, trenchY - 4);
        ctx.quadraticCurveTo(240, 210, targetNapalm2.x, targetNapalm2.y);
        ctx.stroke();

        // Bubbling foam particles on valve 2
        ctx.fillStyle = '#e0f2fe';
        for (let b = 0; b < 6; b++) {
          const bx = targetNapalm2.x + (Math.random() - 0.5) * 20;
          const by = targetNapalm2.y + (Math.random() - 0.5) * 16;
          ctx.beginPath();
          ctx.arc(bx, by, Math.random() * 4 + 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Phase 2 Action: RPG-7 In-Flight Rocket & Explosion on Bunker (frame 140 to 220)
      if (loopFrame >= 140 && loopFrame <= 180) {
        const rProg = (loopFrame - 140) / 40;
        const rx = 108 + (targetBunker.x - 108) * rProg;
        const ry = (trenchY - 18) + (targetBunker.y - (trenchY - 18)) * rProg;

        // Smoke trail
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(108, trenchY - 18);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        // Rocket
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (loopFrame > 180 && loopFrame <= 230) {
        // Fireball explosion on bunker
        const exProg = (loopFrame - 180) / 50;
        ctx.save();
        const rad = 42 * Math.sin(exProg * Math.PI);
        const grad = ctx.createRadialGradient(targetBunker.x, targetBunker.y, 2, targetBunker.x, targetBunker.y, rad);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#fde047');
        grad.addColorStop(0.7, '#ea580c');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetBunker.x, targetBunker.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Phase 3 Action: Machine Gun (MG) Tracers at Tower (frame 265 to 330)
      if (loopFrame >= 265 && loopFrame <= 330) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        for (let t = 0; t < 3; t++) {
          const tProg = ((loopFrame * 0.16 + t * 0.33) % 1);
          const tX = 125 + (targetTower.x - 125) * tProg;
          const tY = (trenchY - 4) + (targetTower.y - (trenchY - 4)) * tProg;
          ctx.beginPath();
          ctx.moveTo(tX, tY);
          ctx.lineTo(tX + 12, tY - 6);
          ctx.stroke();
        }
      }

      // Phase 4 Action: Satchel TNT Toss & Detonation on Blast Door (frame 385 to 470)
      if (loopFrame >= 385 && loopFrame <= 425) {
        const satchelProg = (loopFrame - 385) / 40;
        const sx = 125 + (targetDoor.x - 125) * satchelProg;
        const arcY = -Math.sin(satchelProg * Math.PI) * 80;
        const sy = (trenchY - 4) + (targetDoor.y - (trenchY - 4)) * satchelProg + arcY;

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(sx - 8, sy - 7, 16, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TNT', sx, sy + 3);

        // Blinking red fuse LED
        if (Math.floor(loopFrame / 4) % 2 === 0) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(sx + 5, sy - 8, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (loopFrame > 425 && loopFrame <= 480) {
        // Massive door breach explosion
        const exProg = (loopFrame - 425) / 55;
        ctx.save();
        const rad = 50 * Math.sin(exProg * Math.PI);
        const grad = ctx.createRadialGradient(targetDoor.x, targetDoor.y, 2, targetDoor.x, targetDoor.y, rad);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#f59e0b');
        grad.addColorStop(0.8, '#dc2626');
        grad.addColorStop(1, 'rgba(185, 28, 28, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetDoor.x, targetDoor.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Phase 5 Action: Smoke Screen Expanding around Commandos (frame 490 to 580)
      if (loopFrame >= 490 && loopFrame <= 580) {
        ctx.save();
        const smokeSize = Math.min(95, (loopFrame - 490) * 1.6 + 35);
        ctx.fillStyle = 'rgba(216, 180, 254, 0.45)';
        ctx.beginPath();
        ctx.arc(110, trenchY + 10, smokeSize, 0, Math.PI * 2);
        ctx.arc(160, trenchY, smokeSize * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Cover Badge floating
        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ حماية تامة 100% بستار الدخان', 135, trenchY - 35);
        ctx.restore();
      }

      // Phase 6 Action: Victory celebration fireworks & banner (frame 590 to 720)
      if (loopFrame >= 590) {
        // Gold celebration sparks and fireworks
        ctx.fillStyle = '#fbbf24';
        for (let sp = 0; sp < 16; sp++) {
          const sparkAngle = sp * 0.4 + loopFrame * 0.05;
          const sparkDist = 25 + ((loopFrame + sp * 8) % 75);
          ctx.beginPath();
          ctx.arc(poleX + Math.cos(sparkAngle) * sparkDist, (poleY - 75) + Math.sin(sparkAngle) * sparkDist, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // White surrender flag waving from bunker
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(targetBunker.x - 12, targetBunker.y - 35, 18, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(targetBunker.x - 12, targetBunker.y - 35);
        ctx.lineTo(targetBunker.x - 12, targetBunker.y - 20);
        ctx.stroke();

        // Victory banner across upper canvas
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(w * 0.2, 50, w * 0.6, 36, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.font = 'black 14px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 سقط خط بارليف ورُفع علم مصر خفاقاً! 🇪🇬', w * 0.5, 73);
        ctx.restore();
      }

      // 7. WEAPON TRAY AT BOTTOM OF CANVAS
      const trayY = h - 34;
      const trayW = 480;
      const trayX = (w - trayW) / 2;

      ctx.fillStyle = 'rgba(12, 10, 9, 0.92)';
      ctx.strokeStyle = 'rgba(87, 83, 78, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(trayX, trayY, trayW, 26, 6);
      ctx.fill();
      ctx.stroke();

      const weaponList = [
        { key: '1', name: 'RPG-7', active: activeScene === 1 },
        { key: '2', name: 'MG رشاش', active: activeScene === 2 },
        { key: '3', name: 'TNT نسف', active: activeScene === 3 },
        { key: '4', name: 'Foam رغوة', active: activeScene === 0 },
        { key: '5', name: 'ستار دخان', active: activeScene === 4 },
      ];

      weaponList.forEach((wp, wIdx) => {
        const itemX = trayX + 8 + wIdx * 94;
        if (wp.active) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(itemX, trayY + 3, 84, 20, 4);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = wp.active ? '#facc15' : '#a8a29e';
        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`[${wp.key}] ${wp.name}`, itemX + 42, trayY + 16);
      });

      // 8. ANIMATED CROSSHAIR TARGETING RETICLE
      let aimPos = { x: targetNapalm1.x, y: targetNapalm1.y };
      if (activeScene === 0) {
        aimPos = loopFrame < 68 ? { x: targetNapalm1.x, y: targetNapalm1.y } : { x: targetNapalm2.x, y: targetNapalm2.y };
      } else if (activeScene === 1) {
        aimPos = { x: targetBunker.x, y: targetBunker.y };
      } else if (activeScene === 2) {
        aimPos = { x: targetTower.x, y: targetTower.y };
      } else if (activeScene === 3) {
        aimPos = { x: targetDoor.x, y: targetDoor.y };
      } else if (activeScene === 4) {
        aimPos = { x: 125, y: trenchY - 10 };
      } else {
        aimPos = { x: poleX + 22, y: poleY - 70 };
      }

      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(aimPos.x, aimPos.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(aimPos.x - 18, aimPos.y);
      ctx.lineTo(aimPos.x - 8, aimPos.y);
      ctx.moveTo(aimPos.x + 8, aimPos.y);
      ctx.lineTo(aimPos.x + 18, aimPos.y);
      ctx.moveTo(aimPos.x, aimPos.y - 18);
      ctx.lineTo(aimPos.x, aimPos.y - 8);
      ctx.moveTo(aimPos.x, aimPos.y + 8);
      ctx.lineTo(aimPos.x, aimPos.y + 18);
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentScene = SCENES[currentSceneIndex] || SCENES[0];

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[140] bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 select-none tutorial-modal-overlay touch-pan-y"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div
        className="relative w-full max-w-2xl sm:max-w-3xl bg-stone-900 border-2 sm:border-3 border-amber-500 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm">
              🏰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-600 text-white font-mono px-2 py-0.5 rounded font-bold animate-pulse">
                  فيديو تقديمي 🎬
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  شرح تكتيكي دقيق لأسلحة الصاعقة
                </span>
                <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded-full hidden sm:inline">
                  محاكاة ميدانية حية 60FPS
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black font-cairo text-amber-400 mt-0.5">
                فيديو الشرح التكتيكي: اقتحام حصون خط بارليف ورفع علم مصر
              </h2>
              <p className="text-[11px] text-stone-400">
                المرحلة الخامسة · شاهد عملياً كيفية استخدام الأسلحة الخمسة وإخماد النابالم لدك الحصن وتحقيق النصر
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer border border-stone-800"
            title="إغلاق ومتابعة المعركة"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Simulation Canvas Viewport (16:9 Aspect Ratio) */}
        <div
          data-tutorial-video="true"
          className="relative aspect-[16/9] w-full bg-stone-950 border-b border-stone-800 overflow-hidden tutorial-video-container touch-pan-y"
          style={{ touchAction: 'pan-y' }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full object-fill block tutorial-video-canvas pointer-events-none"
            style={{ touchAction: 'pan-y' }}
          />

          {/* Subtitle Caption Overlay */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-lg bg-stone-950/95 border border-amber-500/60 rounded-xl p-2.5 backdrop-blur-md text-xs shadow-lg flex items-center justify-between gap-2 transition-all pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-amber-300 text-[11px] sm:text-xs leading-tight">
                {currentScene.title}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 shrink-0">
              {currentScene.badge}
            </span>
          </div>
        </div>

        {/* Dedicated Video Player Control & Chapter Bar (Cleanly separated below canvas) */}
        <div className="bg-stone-950 border-b border-stone-800 px-3 sm:px-4 py-2.5 flex flex-col gap-2">
          {/* Controls + Scrubber row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="p-1.5 sm:p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-stone-200" />}
              </button>

              <button
                type="button"
                onClick={handleRestartVideo}
                className="p-1.5 sm:p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                title="إعادة تشغيل الفيديو من البداية"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                  isMuted ? 'bg-stone-800 text-stone-500' : 'bg-stone-800 hover:bg-stone-700 text-amber-400'
                }`}
                title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span
                ref={timeDisplayRef}
                className="text-[11px] font-mono text-stone-400 font-bold px-1"
              >
                00:00 / 00:12
              </span>
            </div>

            {/* Clickable Scrubber Progress Bar */}
            <div
              ref={scrubberContainerRef}
              onClick={handleScrubberClick}
              className="flex-1 h-3 bg-stone-800 hover:bg-stone-750 rounded-full overflow-hidden border border-stone-700 cursor-pointer relative"
              title="انقر في أي مكان للانتقال السريع في الفيديو"
            >
              <div
                ref={progressBarRef}
                className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 transition-[width] duration-75"
                style={{ width: '0%' }}
              />
            </div>

            <div className="text-[10px] text-amber-400/90 font-bold font-cairo hidden md:block shrink-0">
              🎬 فيديو تدريبي تفاعلي لطريقة اللعب
            </div>
          </div>

          {/* Quick Chapter Tabs for Direct Scene Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-[10px]">
            <span className="text-stone-400 font-bold shrink-0 ml-1">الانتقال للمشهد:</span>
            {SCENES.map((scene, idx) => (
              <button
                key={scene.title}
                type="button"
                onClick={() => jumpToScene(idx)}
                className={`px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer shrink-0 ${
                  currentSceneIndex === idx
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                {`[${idx + 1}] ${scene.weaponName}`}
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Strategy Guide */}
        <div className="p-3.5 sm:p-4 space-y-3 text-right text-xs leading-relaxed max-h-[35vh] overflow-y-auto">
          {/* Key Rule Callout */}
          <div className="p-3 bg-amber-950/40 border border-amber-500/60 rounded-xl space-y-1.5 text-amber-200">
            <div className="flex items-center gap-2 font-bold font-cairo text-amber-400 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 animate-bounce" />
              <span>خطة اقتحام الحصن واستعادة الأرض:</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-normal">
              1. إخماد صمامات وأنابيب النابالم الحارق بمضخة الرغوة [4] قبل أن تشعل النيران القناة وتلحق الضرر بالفصيلة.{' '}
              2. دك دشم الرشاشات الخرسانية بقواذف RPG-7 [1] لفتح ثغرات في الجدار الساتر.{' '}
              3. قمع القناصة وأبراج المراقبة برشاش الصاعقة MG [2].{' '}
              4. زرع شحنات النسف المركزة TNT [3] على البوابات الفولاذية لفتح ممرات الاقتحام.{' '}
              5. نشر ستائر الدخان [5] كلما اشتدت نيران العدو لحماية أفراد الصاعقة بنسبة 100%.{' '}
              6. تدمير كافة الأهداف يرفع العلم المصري فوق السارية ويعلن النصر التام 🇪🇬!
            </p>
          </div>

          {/* Weapons and Controls Guide */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl space-y-2 text-stone-300">
            <span className="font-bold text-sky-400 block mb-1">
              ترسانة أسلحة الصاعقة المصرية وطريقة الاستخدام:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-start gap-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                  1 / النقر
                </span>
                <div>
                  <strong className="text-amber-300 block">قواذف RPG-7:</strong>
                  قذائف صاروخية لدك الدشم الخرسانية وأبراج المراقبة.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                  2
                </span>
                <div>
                  <strong className="text-emerald-300 block">رشاش الصاعقة الثقيل (MG):</strong>
                  طلقات حارقة خارقة 7.62 مم لقمع القناصة ونقاط المراقبة.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px]">
                  3
                </span>
                <div>
                  <strong className="text-rose-300 block">شحنات نسف الصاعقة (Satchel):</strong>
                  عبوات متفجرة TNT مركزة لنسف بوابات الحصن الفولاذية.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">
                  4
                </span>
                <div>
                  <strong className="text-sky-300 block">مضخة إخماد النابالم (Foam):</strong>
                  سائل رغوي مضغوط لإطفاء صمامات وأنابيب النابالم الحارق.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                  5
                </span>
                <div>
                  <strong className="text-purple-300 block">ستائر الدخان التكتيكية (Cover):</strong>
                  حجب رؤية نيران العدو واستعادة حماية الفصيلة.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                  🇪🇬
                </span>
                <div>
                  <strong className="text-emerald-300 block">رفع العلم المصري:</strong>
                  فور تطهير الدشم يرتفع العلم ويعلن النصر التام!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold font-cairo text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{onLaunchBattle && !onClose ? 'العودة للقائمة' : 'إغلاق ومتابعة المعركة'}</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-cairo text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 fill-stone-950 text-amber-500" />
            <span>
              {onLaunchBattle && !onClose
                ? 'فهمت طريقة اللعب والتحكم (بدء اقتحام الحصن واستعادة الأرض) ⚡'
                : 'متابعة القتال واستئناف اللعب ⚡'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
