import React, { useEffect, useRef } from 'react';
import { sound } from '../utils/audio';
import {
  Wrench,
  X,
  AlertTriangle,
  CheckCircle2,
  Target,
  Shield,
  Wind,
  Plane,
  ArrowRight,
  Crosshair,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface BridgeTutorialModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLaunchBattle?: () => void;
  onCancel?: () => void;
  difficulty?: Difficulty;
}

export const BridgeTutorialModal: React.FC<BridgeTutorialModalProps> = ({
  isOpen,
  onClose,
  onLaunchBattle,
  onCancel,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const requiredTanks = config.requiredBridgeTanks || (difficulty === 'easy' ? 10 : difficulty === 'hard' ? 20 : 15);

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

      // 1. Sky with Sunset/Evening Horizon Glow (18:00 October 6)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 115);
      skyGrad.addColorStop(0, '#041d3b');
      skyGrad.addColorStop(0.5, '#1e4870');
      skyGrad.addColorStop(0.85, '#c25a1f');
      skyGrad.addColorStop(1, '#ea8638');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 115);

      // Distant Sinai mountains silhouette
      ctx.fillStyle = '#5c2710';
      ctx.beginPath();
      ctx.moveTo(0, 115);
      ctx.lineTo(60, 106);
      ctx.lineTo(160, 112);
      ctx.lineTo(260, 100);
      ctx.lineTo(380, 108);
      ctx.lineTo(480, 98);
      ctx.lineTo(580, 106);
      ctx.lineTo(w, 115);
      ctx.closePath();
      ctx.fill();

      // 2. Three Terrain Zones
      // Left: Egyptian West Bank (Green grass & asphalt road, x: 0 to 140, y: 115 to h)
      const westGrad = ctx.createLinearGradient(0, 115, 140, 115);
      westGrad.addColorStop(0, '#14532d');
      westGrad.addColorStop(0.85, '#166534');
      westGrad.addColorStop(1, '#1e3a1f');
      ctx.fillStyle = westGrad;
      ctx.fillRect(0, 115, 140, h - 115);

      // Road staging approach on West Bank (y: 200 to 260)
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, 205, 140, 52);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 231);
      ctx.lineTo(140, 231);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center: Suez Canal Water (x: 140 to 500, y: 115 to h)
      const waterGrad = ctx.createLinearGradient(140, 0, 500, 0);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(0.5, '#0369a1');
      waterGrad.addColorStop(1, '#075985');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(140, 115, 360, h - 115);

      // Animated Water Waves Currents
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 1.4;
      for (let wy = 130; wy < h - 10; wy += 22) {
        ctx.beginPath();
        for (let wx = 140; wx <= 500; wx += 25) {
          const waveY = wy + Math.sin((wx + loopFrame * 3.5) * 0.05) * 2.5;
          if (wx === 140) ctx.moveTo(wx, waveY);
          else ctx.lineTo(wx, waveY);
        }
        ctx.stroke();
      }

      // Right: Sinai Eastern Shore (Golden orange sand, x: 500 to w, y: 115 to h)
      const eastGrad = ctx.createLinearGradient(500, 115, w, 115);
      eastGrad.addColorStop(0, '#b45309');
      eastGrad.addColorStop(0.3, '#d97706');
      eastGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = eastGrad;
      ctx.fillRect(500, 115, w - 500, h - 115);

      // 3. Heavy PMP Pontoon Bridge (x: 130 to 510, y: 210, height: 44)
      const bridgeY = 210;
      const bridgeH = 44;

      // Steel Pontoon Floats under bridge (6 pontoons)
      const pontoonCount = 6;
      const pontoonSpan = 370;
      const segW = pontoonSpan / pontoonCount;
      for (let i = 0; i < pontoonCount; i++) {
        const px = 135 + i * segW;
        ctx.fillStyle = '#44403c';
        ctx.fillRect(px + 4, bridgeY + 34, segW - 8, 14);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(px + 8, bridgeY + 44, segW - 16, 4);

        // Yellow Pontoon Joint Connector pins
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(px + segW / 2, bridgeY + 22, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wood/Steel Deck Planks
      ctx.fillStyle = '#78350f';
      ctx.fillRect(130, bridgeY, 380, bridgeH);

      // Deck side curbs (Dark Brown)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(130, bridgeY, 380, 6);
      ctx.fillRect(130, bridgeY + bridgeH - 6, 380, 6);

      // Inner Steel Guide Rails (for tanks)
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(130, bridgeY + 11);
      ctx.lineTo(510, bridgeY + 11);
      ctx.moveTo(130, bridgeY + bridgeH - 11);
      ctx.lineTo(510, bridgeY + bridgeH - 11);
      ctx.stroke();

      // Planks Separator Lines
      ctx.strokeStyle = '#5c2d10';
      ctx.lineWidth = 1;
      for (let bx = 145; bx < 510; bx += 20) {
        ctx.beginPath();
        ctx.moveTo(bx, bridgeY + 6);
        ctx.lineTo(bx, bridgeY + bridgeH - 6);
        ctx.stroke();
      }

      // 4. Tank 1 Movement & Precision Strike Timing Window
      // Phase 1 (Frame 0 to 90): Tank advances on West Bank to bridge entrance (x: 30 to 120)
      // Phase 2 (Frame 90 to 170): Halts at entrance. Red Precision Strike target reticle active at x: 310
      // Frame 170: Precision strike detonates, clears the path!
      // Phase 3 (Frame 170 to 340): Tank 1 crosses pontoon bridge smoothly (x: 120 to 520)
      // Phase 4 (Frame 340 to 460): Tank 1 arrives in Sinai! Flag rises. Tank 2 starts advancing.

      let tank1X = 30;
      let tank1Status: 'advancing' | 'waiting_strike' | 'cleared_crossing' | 'reached_sinai' = 'advancing';

      if (loopFrame < 90) {
        tank1X = 30 + (loopFrame / 90) * 90; // reaches 120
        tank1Status = 'advancing';
      } else if (loopFrame < 170) {
        tank1X = 120; // waiting at entrance
        tank1Status = 'waiting_strike';
      } else if (loopFrame < 340) {
        const crossProg = (loopFrame - 170) / 170;
        tank1X = 120 + crossProg * 400; // reaches 520 (Sinai!)
        tank1Status = 'cleared_crossing';
      } else {
        tank1X = 520 + ((loopFrame - 340) / 120) * 80;
        tank1Status = 'reached_sinai';
      }

      // Render Tank 1
      const renderTank = (x: number, y: number, isWaiting: boolean) => {
        ctx.save();
        ctx.translate(x, y);

        // Track treads
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-22, -14, 44, 7);
        ctx.fillRect(-22, 7, 44, 7);

        // Tread wheels
        ctx.fillStyle = '#57534e';
        for (let wIdx = -16; wIdx <= 16; wIdx += 8) {
          ctx.beginPath();
          ctx.arc(wIdx, -10.5, 2.8, 0, Math.PI * 2);
          ctx.arc(wIdx, 10.5, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Hull (Olive Drab Green T-62)
        ctx.fillStyle = '#3f6212';
        ctx.fillRect(-18, -10, 36, 20);

        // Turret
        ctx.fillStyle = '#4d7c0f';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 115mm Cannon Barrel pointing East towards Sinai
        ctx.fillStyle = '#365314';
        ctx.fillRect(8, -2, 22, 4);
        ctx.fillRect(28, -3, 3, 6); // muzzle brake

        // Egyptian Armed Forces Insignia
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-8, -4, 6, 2.5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -1.5, 6, 2.5);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-8, 1, 6, 2.5);

        // Status callout above tank
        if (isWaiting) {
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 8.5px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⏳ بالانتظار: نفّذ الضربة الدقيقة للعبور!', 0, -22);
        }

        ctx.restore();
      };

      // Draw Tank 1
      renderTank(tank1X, bridgeY + 22, tank1Status === 'waiting_strike');

      // Tank 2 advancing on West Bank in Phase 4 (creating an ongoing convoy!)
      if (loopFrame >= 240) {
        const tank2X = Math.min(120, 20 + ((loopFrame - 240) / 140) * 100);
        renderTank(tank2X, bridgeY + 22, tank2X >= 118);
      }

      // 5. Precision Strike Target Window (Frame 90 to 170)
      const targetSectorX = 320;
      const targetSectorY = bridgeY + 22;

      if (loopFrame >= 90 && loopFrame < 170) {
        const countdownTime = Math.max(0, 4.8 - ((loopFrame - 90) / 80) * 4.8);

        ctx.save();
        // Red Pulsing Target Box
        const pulse = Math.sin(loopFrame * 0.15) * 4;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(targetSectorX - 28 - pulse / 2, bridgeY + 4 - pulse / 2, 56 + pulse, bridgeH - 8 + pulse);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(targetSectorX - 28, bridgeY + 4, 56, bridgeH - 8);

        // Crosshairs Reticle
        ctx.beginPath();
        ctx.arc(targetSectorX, targetSectorY, 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(targetSectorX - 22, targetSectorY);
        ctx.lineTo(targetSectorX + 22, targetSectorY);
        ctx.moveTo(targetSectorX, targetSectorY - 20);
        ctx.lineTo(targetSectorX, targetSectorY + 20);
        ctx.stroke();

        // Banner above target
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(targetSectorX - 60, bridgeY - 32, 120, 22);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(targetSectorX - 60, bridgeY - 32, 120, 22);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9.5px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`اضغط هنا للضربة! 🎯 [${countdownTime.toFixed(1)}s]`, targetSectorX, bridgeY - 17);

        // Progress bar inside banner
        ctx.fillStyle = '#292524';
        ctx.fillRect(targetSectorX - 56, bridgeY - 14, 112, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(targetSectorX - 56, bridgeY - 14, 112 * (countdownTime / 4.8), 3);
        ctx.restore();
      }

      // Precision Strike Detonation Impact (Frame 170 to 195)
      if (loopFrame >= 170 && loopFrame <= 195) {
        ctx.save();
        const blastRadius = (loopFrame - 170) * 2;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
        ctx.beginPath();
        ctx.arc(targetSectorX, targetSectorY, blastRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetSectorX, targetSectorY, blastRadius * 1.3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 10px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💥 ضربة دقيقة في التوقيت الحاسم! فتح المعبر للدبابة!', targetSectorX, bridgeY - 20);
        ctx.restore();
      }

      // 6. Hostile Air Strike & Smoke Screen Defense (Frame 210 to 330)
      if (loopFrame >= 210 && loopFrame <= 330) {
        // Billowing Smoke Screen protecting the canal
        ctx.save();
        for (let si = 0; si < 7; si++) {
          const sx = 200 + si * 38 + Math.sin(loopFrame * 0.04 + si) * 10;
          const sy = bridgeY + Math.cos(loopFrame * 0.05 + si) * 14;
          const grad = ctx.createRadialGradient(sx, sy, 6, sx, sy, 32);
          grad.addColorStop(0, 'rgba(240, 240, 240, 0.75)');
          grad.addColorStop(0.6, 'rgba(210, 210, 210, 0.45)');
          grad.addColorStop(1, 'rgba(180, 180, 180, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, 32, 0, Math.PI * 2);
          ctx.fill();
        }

        // Allied MiG-21 intercepting hostile jet
        const jetX = 100 + (loopFrame - 210) * 4;
        const jetY = 60 + Math.sin(loopFrame * 0.08) * 8;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(jetX + 18, jetY);
        ctx.lineTo(jetX - 14, jetY - 5);
        ctx.lineTo(jetX - 10, jetY);
        ctx.lineTo(jetX - 14, jetY + 5);
        ctx.closePath();
        ctx.fill();

        // Jet roundel
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(jetX - 2, jetY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8.5px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✈️ نسور الجو (A) والستار الدخاني (S) يصدان غارات العدو!', 330, 48);
        ctx.restore();
      }

      // 7. Safe Arrival in Sinai & Egyptian Flag Raising (Frame 330 to 460)
      if (loopFrame >= 330) {
        ctx.save();
        const fx = 560;
        const fy = bridgeY - 30;

        // Flagpole
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, bridgeY);
        ctx.lineTo(fx, fy - 18);
        ctx.stroke();

        // Egyptian Flag waving
        const fw = 22;
        const fh = 14;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(fx, fy - 18, fw, fh / 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx, fy - 18 + fh / 3, fw, fh / 3);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(fx + fw * 0.4, fy - 18 + fh / 3 + 1, 4, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(fx, fy - 18 + (fh / 3) * 2, fw, fh / 3);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 10px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ عبور ناجح للدبابة إلى سيناء! 🚜🇪🇬 (+1500)', 540, bridgeY - 42);
        ctx.restore();
      }

      // 8. Military HUD Camcorder Overlay
      ctx.fillStyle = 'rgba(0, 255, 120, 0.85)';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('REC ● 1973-10-06 18:30:15 [PMP PONTOON BRIDGE CROSSING CAM]', 10, 18);

      let phaseText = '';
      if (loopFrame < 90) {
        phaseText = '1️⃣ تحرك الدبابة T-62 من الضفة الغربية نحو مدخل كوبري PMP';
      } else if (loopFrame < 170) {
        phaseText = '2️⃣ تنفيذ الضربة الدقيقة (Space أو النقر) على مقطع الكوبري لتأمين العبور';
      } else if (loopFrame < 240) {
        phaseText = '3️⃣ فتح المعبر وانطلاق الدبابة بسرعة عبر ألواح الكوبري العائم';
      } else if (loopFrame < 340) {
        phaseText = '4️⃣ تفعيل ستارة الدخان (S) وضربات الطيران (A) لصد قصف وغارات العدو';
      } else {
        phaseText = '🇪🇬 وصول الدبابة لسيناء وتدفق الأرتال المدرعة تباعاً!';
      }
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`إجراء العمليات: ${phaseText}`, 10, 32);

      // Top Right Required Target (Fixed 2 minutes)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`المطلوب: عبور ${requiredTanks} دبابة (الوقت 02:00 ثابت)`, w - 10, 18);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, difficulty, requiredTanks]);

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[140] bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl bg-stone-900 border-2 sm:border-3 border-amber-500 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-950 border-b border-stone-800 p-3.5 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-cairo text-stone-100">
                  دليل معركة الكباري: تأمين عبور أرتال الدبابات إلى سيناء
                </h3>
                <span className="text-[10px] bg-red-600 text-white font-mono px-2 py-0.5 rounded font-bold animate-pulse">
                  إجباري
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                مساء 6 أكتوبر · سلاح المهندسين · الضربة الدقيقة لفتح المعبر وصد الغارات الجوية
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
        <div className="relative aspect-[16/9] w-full bg-stone-950 border-b border-stone-800 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-fill block"
          />

          {/* Floating Guidance Badge */}
          <div className="absolute bottom-3 right-3 bg-stone-950/90 border border-amber-500/60 rounded-xl px-3 py-1.5 backdrop-blur-md flex items-center gap-2 text-xs font-bold text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>محاكاة الكباري: الضربة الدقيقة 🎯 + تدفق أرتال الدبابات إلى سيناء 🚜</span>
          </div>
        </div>

        {/* Tactical Explanation Rules */}
        <div className="p-3.5 sm:p-4 space-y-3 text-right text-xs leading-relaxed max-h-[42vh] overflow-y-auto">
          {/* Key Special Perks Callout */}
          <div className="p-3 bg-sky-950/40 border border-sky-500/60 rounded-xl space-y-1.5 text-sky-200">
            <div className="flex items-center gap-2 font-bold font-cairo text-sky-400 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 shrink-0 text-sky-400 animate-spin" />
              <span>ميزات خارقة جديدة: ضربات الطيران وسرعة ستائر الدخان التوربينية!</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-stone-300">
              <div className="bg-stone-900/80 p-2 rounded-lg border border-sky-800/80">
                <span className="text-sky-300 font-bold block mb-0.5">✈️ ميزة ضربات الطيران المعاون (A):</span>
                <span>سرب مقاتلات ميج-21 يمسح كل طائرات وقنابل العدو فوراً، ويفتح المعبر للدبابة تلقائياً، ويشل مدفعية العدو لمدة 10 ثوانٍ!</span>
              </div>
              <div className="bg-stone-900/80 p-2 rounded-lg border border-cyan-800/80">
                <span className="text-cyan-300 font-bold block mb-0.5">💨 ميزة ستائر الدخان التكتيكية (S):</span>
                <span>تمنح الدبابات سرعة عبور فائقة توربينية (+40%)، وتحمي الدبابة من الانفجار حتى لو نفد الوقت، وتشتت 100% من قذائف المدفعية!</span>
              </div>
            </div>
            <div className="text-[10px] text-amber-300 font-mono mt-1 pt-1 border-t border-sky-800/50">
              🎖️ ميزة الإمداد التكتيكي: كل 3 دبابات تعبر بنجاح تمنحك +1 ضربة طيران و +1 ستارة دخان إضافية!
            </div>
          </div>

          {/* Breakdown of Difficulties */}
          <div className="p-3 bg-stone-950/80 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold font-cairo text-amber-400 text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>المطلوب للانتصار في مستواك الحالي ({difficulty}):</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400 font-bold">
                المهلة الزمنية: دقيقتان (02:00) ثابت لجميع المستويات
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
                  عبور <strong className="text-emerald-300">10 دبابات</strong> بنجاح
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">وقت 02:00 · نافذة توقيت مريحة وتدريب</div>
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
                  عبور <strong className="text-amber-300">15 دبابة</strong> بنجاح
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">وقت 02:00 · تدفق عسكري قياسي</div>
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
                  عبور <strong className="text-red-300">20 دبابة</strong> بنجاح
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">وقت 02:00 · وتيرة سريعة وقصف مكثف</div>
              </div>
            </div>
          </div>

          {/* How to Play Tactical Steps */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl space-y-2 text-stone-300">
            <span className="font-bold text-sky-400 block mb-1">
              خطوات قيادة عملية نصب الكباري وتمرير أرتال الدبابات:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-yellow-300">1. الضربة الدقيقة (Space أو النقر أو الزر):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    سارع بالضغط فور ظهور المربع الأحمر على الكوبري قبل نفاد العداد التنازلي لتنطلق الدبابة.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Plane className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-300">2. ضربات الطائرة (A أو زر الطائرة [3]):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    استدعِ مقاتلات سلاح الجو لتدمير كافة طائرات وقنابل العدو وفتح المعبر للدبابة فوراً.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Wind className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-200">3. ستارة الدخان (S أو زر الدخان):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    انشر الدخان لحماية الكوبري وتشتيت قذائف المدفعية وحماية الدبابات المتوقفة عند المدخل.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800">
                <Crosshair className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-red-300">4. مدافع م/ط (النقر بالماوس):</strong>
                  <p className="text-stone-400 text-[10.5px]">
                    انقر على مقاتلات وقنابل العدو المتساقطة لإسقاطها قبل أن تصيب ألواح الكوبري العائم.
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
            <span>العودة للقائمة</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-cairo text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 fill-stone-950 text-amber-500" />
            <span>فهمت شروط عبور الدبابات (بدء معركة الكباري) 🚜</span>
          </button>
        </div>
      </div>
    </div>
  );
};
