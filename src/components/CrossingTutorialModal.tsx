import React, { useEffect, useRef } from 'react';
import { sound } from '../utils/audio';
import {
  Waves,
  Droplets,
  X,
  AlertTriangle,
  CheckCircle2,
  Target,
  Shield,
  Wind,
  Flag,
  ArrowRight,
  Crosshair,
  Sparkles,
  Ship,
} from 'lucide-react';
import { Difficulty } from '../game/difficulty';

interface CrossingTutorialModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLaunchBattle?: () => void;
  onCancel?: () => void;
  difficulty?: Difficulty;
}

export const CrossingTutorialModal: React.FC<CrossingTutorialModalProps> = ({
  isOpen,
  onClose,
  onLaunchBattle,
  onCancel,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const requiredBreaches = difficulty === 'easy' ? 2 : 3;
  const timeLimit = difficulty === 'easy' ? '02:30' : difficulty === 'hard' ? '01:30' : '02:00';

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

  // Canvas animated tactical video simulation
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let step = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      step += 1;

      // Loop animation every 460 frames (~7.6 seconds)
      const loopFrame = step % 460;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Sky with Sunset/Dusk Horizon Glow
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 115);
      skyGrad.addColorStop(0, '#021a36');
      skyGrad.addColorStop(0.5, '#0f3b6c');
      skyGrad.addColorStop(0.85, '#d9531e');
      skyGrad.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 115);

      // Distant Sinai mountains silhouette
      ctx.fillStyle = '#652b12';
      ctx.beginPath();
      ctx.moveTo(0, 115);
      ctx.lineTo(40, 104);
      ctx.lineTo(120, 110);
      ctx.lineTo(210, 98);
      ctx.lineTo(310, 107);
      ctx.lineTo(420, 100);
      ctx.lineTo(520, 109);
      ctx.lineTo(600, 102);
      ctx.lineTo(w, 115);
      ctx.closePath();
      ctx.fill();

      // 2. Bar-Lev Sand Rampart (الساتر الترابي لخط بارليف)
      // Height from y: 110 to y: 195
      const sandGrad = ctx.createLinearGradient(0, 110, 0, 195);
      sandGrad.addColorStop(0, '#d97706');
      sandGrad.addColorStop(0.35, '#b45309');
      sandGrad.addColorStop(0.7, '#92400e');
      sandGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 110, w, 85);

      // Barbed Wire Posts along the top ridge
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.2;
      for (let px = 8; px < w; px += 24) {
        ctx.beginPath();
        ctx.moveTo(px, 112);
        ctx.lineTo(px, 103);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px - 8, 106);
        ctx.lineTo(px + 16, 108);
        ctx.stroke();
      }

      // 3. Breach Sectors
      // Sector positions
      const sectors = [
        { id: 0, name: 'ثغرة القنطرة', x: 140 },
        { id: 1, name: 'ثغرة الفردان', x: 320 }, // Main focal breach in simulation
        { id: 2, name: 'ثغرة الشط', x: 500 },
      ];

      // Calculate erosion progress for focal sector (Ferdan)
      // Phase 1 (Frame 35 to 190): Water sprays, sand dissolves from 0% to 100%
      let ferdanProgress = 0;
      if (loopFrame >= 35 && loopFrame < 190) {
        ferdanProgress = Math.min(100, ((loopFrame - 35) / 150) * 100);
      } else if (loopFrame >= 190) {
        ferdanProgress = 100;
      }

      // Render each sector
      for (const sec of sectors) {
        const isFerdan = sec.id === 1;
        const progress = isFerdan ? ferdanProgress : 0;
        const isComplete = progress >= 100;

        // V-Cut erosion channel on sand barrier
        if (progress > 0) {
          const cutDepth = (progress / 100) * 80;
          const cutHalfWidth = 16 + (progress / 100) * 22;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sec.x - cutHalfWidth, 110);
          ctx.lineTo(sec.x - cutHalfWidth * 0.4, 110 + cutDepth);
          ctx.lineTo(sec.x + cutHalfWidth * 0.4, 110 + cutDepth);
          ctx.lineTo(sec.x + cutHalfWidth, 110);
          ctx.closePath();

          const cutGrad = ctx.createLinearGradient(0, 110, 0, 195);
          cutGrad.addColorStop(0, isComplete ? '#1e293b' : '#713f12');
          cutGrad.addColorStop(1, isComplete ? '#0284c7' : '#451a03');
          ctx.fillStyle = cutGrad;
          ctx.fill();

          ctx.strokeStyle = isComplete ? '#38bdf8' : '#f59e0b';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Muddy sand erosion slurry flowing down
          ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
          for (let m = -cutHalfWidth * 0.3; m <= cutHalfWidth * 0.3; m += 8) {
            ctx.fillRect(sec.x + m, 110 + cutDepth * 0.3, 3, cutDepth * 0.7);
          }
          ctx.restore();
        }

        // Sector Badge & HUD Progress Box
        ctx.save();
        const badgeY = 90;
        const badgeW = 86;
        const badgeH = 18;
        ctx.fillStyle = 'rgba(24, 20, 17, 0.9)';
        ctx.fillRect(sec.x - badgeW / 2, badgeY, badgeW, badgeH);

        ctx.strokeStyle = isComplete ? '#22c55e' : isFerdan ? '#f59e0b' : '#57534e';
        ctx.lineWidth = isFerdan ? 1.8 : 1;
        ctx.strokeRect(sec.x - badgeW / 2, badgeY, badgeW, badgeH);

        // Progress bar underline
        ctx.fillStyle = '#292524';
        ctx.fillRect(sec.x - badgeW / 2 + 2, badgeY + badgeH - 3, badgeW - 4, 3);
        ctx.fillStyle = isComplete ? '#22c55e' : '#f59e0b';
        ctx.fillRect(sec.x - badgeW / 2 + 2, badgeY + badgeH - 3, (badgeW - 4) * (progress / 100), 3);

        // Text label
        ctx.fillStyle = isComplete ? '#86efac' : isFerdan ? '#fef08a' : '#d6d3d1';
        ctx.font = 'bold 9px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sec.name, sec.x, badgeY + 10);
        ctx.restore();

        // Concrete Bunker above sector
        const bx = sec.x;
        const by = 120;
        const isBunkerSuppressed = isFerdan && loopFrame >= 120 && loopFrame <= 210;
        const isBunkerDestroyed = isFerdan && loopFrame > 210;

        ctx.save();
        if (!isBunkerDestroyed) {
          // Pillbox concrete
          ctx.fillStyle = '#44403c';
          ctx.fillRect(bx - 20, by - 10, 40, 16);
          ctx.fillStyle = '#57534e';
          ctx.fillRect(bx - 16, by - 15, 32, 7);

          // Slit
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(bx - 11, by - 5, 22, 5);

          // Bunker firing muzzle flashes (when not suppressed)
          if (isFerdan && loopFrame > 70 && loopFrame < 120 && loopFrame % 8 < 4) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(bx, by - 3, 5, 0, Math.PI * 2);
            ctx.fill();

            // Tracer bullet shooting towards pump
            const tracerProg = ((loopFrame % 8) / 8);
            const tx = bx + (110 - bx) * tracerProg;
            const ty = by + (315 - by) * tracerProg;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(tx, ty, 3, 3);
          }

          // HP Bar
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(bx - 16, by - 20, 32, 3);
          const bunkerHpPct = isBunkerSuppressed ? 0.4 : isBunkerDestroyed ? 0 : 1;
          ctx.fillStyle = isBunkerSuppressed ? '#38bdf8' : '#ef4444';
          ctx.fillRect(bx - 16, by - 20, 32 * bunkerHpPct, 3);

          ctx.fillStyle = isBunkerSuppressed ? '#7dd3fc' : '#fca5a5';
          ctx.font = 'bold 7px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(isBunkerSuppressed ? '💧 إخماد بالمياه!' : 'دشمة بارليف', bx, by - 23);
        } else {
          // Destroyed bunker ruin
          ctx.fillStyle = '#292524';
          ctx.fillRect(bx - 20, by - 4, 40, 8);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 8px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓ دُمرت الدشمة', bx, by - 8);
        }
        ctx.restore();

        // Egyptian flag hoisting atop Ferdan upon breach completion
        if (isFerdan && loopFrame >= 330) {
          const flagProg = Math.min(1, (loopFrame - 330) / 40);
          const fx = sec.x + 22;
          const fy = 185 - flagProg * 35;

          ctx.save();
          // Flagpole
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fx, 192);
          ctx.lineTo(fx, 142);
          ctx.stroke();

          // Egyptian Tri-color waving
          const fw = 22;
          const fh = 14;
          // Red
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(fx, fy, fw, fh / 3);
          // White
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx, fy + fh / 3, fw, fh / 3);
          // Golden Eagle
          ctx.fillStyle = '#d97706';
          ctx.fillRect(fx + fw * 0.4, fy + fh / 3 + 1, 4, 3);
          // Black
          ctx.fillStyle = '#000000';
          ctx.fillRect(fx, fy + (fh / 3) * 2, fw, fh / 3);
          ctx.restore();
        }
      }

      // 4. Suez Canal Water Surface (y: 195 to 295)
      const waterGrad = ctx.createLinearGradient(0, 195, 0, 295);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(0.4, '#0369a1');
      waterGrad.addColorStop(0.85, '#075985');
      waterGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 195, w, 100);

      // Water Waves Animated Glints
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 1.4;
      for (let wy = 205; wy < 290; wy += 14) {
        ctx.beginPath();
        for (let wx = 0; wx < w; wx += 25) {
          const waveY = wy + Math.sin((wx + loopFrame * 3) * 0.05) * 2;
          if (wx === 0) ctx.moveTo(wx, waveY);
          else ctx.lineTo(wx, waveY);
        }
        ctx.stroke();
      }

      // 5. West Bank Staging Area & Sandbag Fortifications (y: 295 to 360)
      const westGrad = ctx.createLinearGradient(0, 295, 0, h);
      westGrad.addColorStop(0, '#57534e');
      westGrad.addColorStop(0.3, '#78716c');
      westGrad.addColorStop(1, '#44403c');
      ctx.fillStyle = westGrad;
      ctx.fillRect(0, 295, w, h - 295);

      // Sandbag parapet line
      for (let sx = 6; sx < w; sx += 20) {
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.roundRect(sx, 292, 18, 8, 3);
        ctx.fill();
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.roundRect(sx + 8, 287, 18, 8, 3);
        ctx.fill();
      }

      // 6. Baqi Zaki High-Pressure Water Pump Station (West Bank)
      const pumpX = 95;
      const pumpY = 318;

      ctx.save();
      ctx.translate(pumpX, pumpY);

      // Chassis pontoon
      ctx.fillStyle = '#292524';
      ctx.fillRect(-32, -6, 64, 22);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-32, -6, 64, 22);

      // Wheels
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(-22, 16, 5, 0, Math.PI * 2);
      ctx.arc(22, 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Turbine engine box
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(-26, -20, 28, 16);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(-22, -17, 8, 10);

      // Pressure gauge
      ctx.beginPath();
      ctx.arc(-7, -12, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      // Heavy feed hose
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-4, -9);
      ctx.lineTo(16, -14);
      ctx.stroke();

      // Swiveling Water Monitor Turret & High-Pressure Nozzle
      const nozzleTargetX = 320;
      const nozzleTargetY = loopFrame >= 120 && loopFrame <= 180 ? 120 : 160;
      const nozzleAngle = Math.atan2(nozzleTargetY - (pumpY - 14), nozzleTargetX - (pumpX + 16));

      ctx.save();
      ctx.translate(16, -14);
      ctx.rotate(nozzleAngle);

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, -3.5, 18, 7);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(14, -5, 6, 10);
      ctx.restore();

      // Engineer crew
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(8, -2, 3.5, 0, Math.PI * 2);
      ctx.arc(-16, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Health bar above water pump
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-32, -32, 64, 5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-31, -31.5, 62, 4);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 7.5px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('مضخة مياه باقي زكي [100%]', 0, -35);

      ctx.restore();

      // 7. Volumetric High-Pressure Water Jet Spray (Frame 35 to 210)
      if (loopFrame >= 35 && loopFrame <= 210) {
        const startX = pumpX + 22;
        const startY = pumpY - 14;
        const targetX = 320;
        const targetY = loopFrame >= 120 && loopFrame <= 180 ? 122 : 160;

        ctx.save();
        // Central pressurized white core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const cpx = (startX + targetX) / 2;
        const cpy = (startY + targetY) / 2 - 25;
        ctx.quadraticCurveTo(cpx, cpy, targetX, targetY);
        ctx.stroke();

        // Cyan outer water stream envelope
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpx, cpy, targetX, targetY);
        ctx.stroke();

        // Spray droplet particles along the water jet
        for (let i = 0; i < 9; i++) {
          const t = Math.random();
          const px = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * cpx + Math.pow(t, 2) * targetX;
          const py = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * cpy + Math.pow(t, 2) * targetY;
          const spread = (Math.random() - 0.5) * (14 * t + 3);

          ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
          ctx.beginPath();
          ctx.arc(px + spread, py + spread, 1.5 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Violent water mist and splash burst at the point of impact
        ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
        for (let s = 0; s < 8; s++) {
          const sa = Math.random() * Math.PI * 2;
          const sr = 5 + Math.random() * 16;
          ctx.beginPath();
          ctx.arc(targetX + Math.cos(sa) * sr, targetY + Math.sin(sa) * sr, 2 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Blue Aiming Reticle
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(targetX - 18, targetY);
        ctx.lineTo(targetX + 18, targetY);
        ctx.moveTo(targetX, targetY - 18);
        ctx.lineTo(targetX, targetY + 18);
        ctx.stroke();

        ctx.restore();
      }

      // 8. Smoke Screen Cloud Deployment (Frame 180 to 360)
      if (loopFrame >= 180 && loopFrame <= 360) {
        ctx.save();
        for (let ci = 0; ci < 8; ci++) {
          const cx = 200 + ci * 28 + Math.sin(loopFrame * 0.05 + ci) * 12;
          const cy = 240 + Math.cos(loopFrame * 0.04 + ci) * 10;
          const cr = 28 + ci * 2;
          const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, cr);
          grad.addColorStop(0, 'rgba(240, 240, 240, 0.7)');
          grad.addColorStop(0.6, 'rgba(210, 210, 210, 0.45)');
          grad.addColorStop(1, 'rgba(180, 180, 180, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 9. Rubber Assault Boat Crossing (Frame 210 to 390)
      if (loopFrame >= 210 && loopFrame <= 390) {
        const boatProg = Math.min(1, (loopFrame - 210) / 130);
        // Departs from west bank (y: 285) to breached Ferdan east bank waterline (y: 195)
        const boatX = 130 + (320 - 130) * boatProg;
        const boatY = 285 + (195 - 285) * Math.pow(boatProg, 0.9);

        ctx.save();
        ctx.translate(boatX, boatY);

        // Boat Hull (Olive Green / Rubber Zodiac)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Egyptian Commandos (Helmets & uniforms)
        for (let si = -2; si <= 2; si++) {
          ctx.fillStyle = '#ca8a04';
          ctx.beginPath();
          ctx.arc(si * 5, -2.5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Small Egyptian Flag at stern
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-15, -7, 7, 1.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-15, -5.2, 7, 1.8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-15, -3.4, 7, 1.8);

        // Wake ripple
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(-14, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();
      }

      // 10. Military HUD Camcorder Overlay
      ctx.fillStyle = 'rgba(0, 255, 120, 0.85)';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('REC ● 1973-10-06 14:15:30 [SUEZ BAR-LEV CROSSING CAM]', 10, 18);

      let phaseText = '';
      if (loopFrame < 110) {
        phaseText = '1️⃣ توجيه خراطيم المياه عالي الضغط (Space) لإذابة الساتر الترابي';
      } else if (loopFrame < 190) {
        phaseText = '2️⃣ استمرار ضخ المياه حتى فتح الثغرة بالكامل (100%) وإخماد الدشم';
      } else if (loopFrame < 280) {
        phaseText = '3️⃣ تفعيل الستار الدخاني (S) لحماية القوات من قذائف الهاون';
      } else if (loopFrame < 360) {
        phaseText = '4️⃣ إطلاق قارب العبور (B) لنقل الجنود عبر القناة للثغرة المفتوحة';
      } else {
        phaseText = '🇪🇬 تم تأمين الثغرة ورفع العلم المصري فوق خط بارليف!';
      }
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`إجراء العمليات: ${phaseText}`, 10, 32);

      // Top Right Required Target
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`المطلوب: فتح ${requiredBreaches} ثغرات + عبور ${requiredBreaches} قوارب (${timeLimit})`, w - 10, 18);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, difficulty, requiredBreaches, timeLimit]);

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[140] bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 tutorial-modal-overlay touch-pan-y"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div
        className="relative w-full max-w-2xl bg-stone-900 border-2 sm:border-3 border-amber-500 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-950 border-b border-stone-800 p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-cairo text-amber-400">
                  فيديو تقديمي يشرح طريقة اللعب: فتح الساتر الترابي وإطلاق قوارب العبور
                </h3>
                <span className="text-[10px] bg-red-600 text-white font-mono px-2 py-0.5 rounded font-bold animate-pulse">
                  فيديو تقديمي إجباري 🎬
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                المرحلة الثانية · فيديو محاكاة يوضح أسلوب التحكم، إذابة الساتر الترابي، إخماد الدشم، وتأمين عبور القوارب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer border border-stone-800"
              title="إلغاء والعودة للقائمة"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Simulation Canvas */}
        <div
          data-tutorial-video="true"
          className="relative aspect-[16/9] w-full bg-stone-950 border-b border-stone-800 overflow-hidden tutorial-video-container touch-pan-y"
          style={{ touchAction: 'pan-y' }}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-fill block tutorial-video-canvas pointer-events-none"
            style={{ touchAction: 'pan-y' }}
          />

          {/* Floating Guidance Badge */}
          <div className="absolute bottom-3 right-3 bg-stone-950/90 border border-amber-500/60 rounded-xl px-3 py-1.5 backdrop-blur-md flex items-center gap-2 text-xs font-bold text-amber-300 pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>محاكاة العبور: إذابة الرمال بالمياه 🌊 + إطلاق قوارب العبور 🚤</span>
          </div>
        </div>

        {/* Tactical Explanation Rules */}
        <div className="p-3.5 sm:p-4 space-y-3 text-right text-xs leading-relaxed max-h-[42vh] overflow-y-auto">
          {/* Key Rule Callout */}
          <div className="p-3 bg-red-950/40 border border-red-500/60 rounded-xl space-y-1.5 text-red-200">
            <div className="flex items-center gap-2 font-bold font-cairo text-red-400 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 animate-bounce" />
              <span>قاعدة المعركة الحاسمة: إذابة الساتر الترابي وإيصال قوارب الصاعقة سالمة!</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-normal">
              لا يكفي فقط رش المياه؛{' '}
              <strong className="text-amber-300">
                شرط النصر هو فتح الثغرات المطلوبة بنسبة 100% وإطلاق قوارب العبور المطاطية
              </strong>{' '}
              لتصل إلى الضفة الشرقية وترفع العلم المصري، مع حماية المضخة بالستار الدخاني (S) من هاونات العدو.
            </p>
          </div>

          {/* Breakdown of Difficulties */}
          <div className="p-3 bg-stone-950/80 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold font-cairo text-amber-400 text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>المطلوب للانتصار في مستواك الحالي ({difficulty}):</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400 font-bold">
                المهلة الزمنية: {timeLimit} دقيقة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div
                className={`p-2 rounded-lg border ${
                  difficulty === 'easy'
                    ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/60 text-emerald-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-0.5 text-emerald-400">🟢 المستوى السهل</div>
                <div>
                  فتح <strong className="text-emerald-300">2 من 3</strong> ثغرات وقوارب
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">وقت كافٍ (02:30) ونيران معتدلة</div>
              </div>

              <div
                className={`p-2 rounded-lg border ${
                  difficulty === 'normal'
                    ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/60 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-0.5 text-amber-400">🟡 المستوى المتوسط</div>
                <div>
                  فتح <strong className="text-amber-300">3 من 3</strong> ثغرات وقوارب
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">الخطة القياسية (02:00)</div>
              </div>

              <div
                className={`p-2 rounded-lg border ${
                  difficulty === 'hard'
                    ? 'bg-red-950/80 border-red-500 ring-2 ring-red-500/60 text-red-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-0.5 text-red-400">🔴 المستوى الصعب</div>
                <div>
                  فتح <strong className="text-red-300">3 من 3</strong> ثغرات وقوارب
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">مهلة ضيقة (01:30) وقصف هاون عنيف</div>
              </div>
            </div>
          </div>

          {/* How to Play Tactical Steps */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl space-y-2 text-stone-300">
            <span className="font-bold text-sky-400 block mb-1">
              خطوات تنفيذ ملحمة العبور واختراق خط بارليف:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Droplets className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-300">1. رش المياه (Space أو زر الرش):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    اضغط واستمر لضخ تيار مياه جارف (300 بار) يفتت الساتر الرملي ويخفض ارتفاعه حتى 0%.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">2. اختيار الثغرة (أزرار القطاعات):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    تنقل بين قطاعات "القنطرة" و"الفردان" و"الشط" عبر الأزرار بالأعلى أو بالنقر على الثغرة.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Ship className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300">3. إطلاق قارب عبور (B أو زر القارب):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    بعد فتح الممر بالكامل، أطلق قارب الصاعقة المطاطي ليعبر القناة ويرفع علم النصر!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Wind className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200">4. ستار دخاني (S أو زر الدخان):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    احمِ القوارب والمضخة من نيران دشم وهاونات العدو بنشر ستار دخاني يحجب الرؤية تماماً.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
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
                ? 'فهمت طريقة اللعب والتحكم (الانطلاق لمعركة العبور) ⚡'
                : 'متابعة القتال واستئناف اللعب ⚡'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
