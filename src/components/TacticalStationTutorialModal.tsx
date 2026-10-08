import React, { useEffect, useRef } from 'react';
import { sound } from '../utils/audio';
import {
  Target,
  X,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface TacticalStationTutorialModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLaunchBattle?: () => void;
  onCancel?: () => void;
  difficulty?: Difficulty;
}

export const TacticalStationTutorialModal: React.FC<TacticalStationTutorialModalProps> = ({
  isOpen,
  onClose,
  onLaunchBattle,
  onCancel,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;

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

  // Canvas animated video simulation
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let step = 0;
    let fireTimer = 0;
    let explosionProgress = 0;
    let stationHp = 100;
    let destroyed = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      step += 1;

      // Loop tutorial animation every 360 frames (~6 seconds)
      const loopFrame = step % 360;

      if (loopFrame === 0) {
        stationHp = 100;
        destroyed = false;
        explosionProgress = 0;
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Sky & Ground
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      skyGrad.addColorStop(0, '#041d3b');
      skyGrad.addColorStop(0.6, '#1e5b8d');
      skyGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ground (Sinai desert dunes)
      const groundGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
      groundGrad.addColorStop(0, '#c28535');
      groundGrad.addColorStop(1, '#784617');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.7, w, h * 0.3);

      // Station position moves smoothly across screen
      const stationX = w - ((loopFrame * 1.8) % (w + 200));
      const stationY = h * 0.72;

      // Station state determined by guided rocket hits only (no autocannons)
      let currentStationHp = 100;
      let isStationDestroyed = false;
      if (loopFrame >= 145 && loopFrame < 190) {
        currentStationHp = 50;
      } else if (loopFrame >= 190) {
        currentStationHp = 0;
        isStationDestroyed = true;
      }

      // Draw Station (Radar Dish & Bunker)
      ctx.save();
      ctx.translate(stationX, stationY);

      if (!isStationDestroyed) {
        // Bunker base
        ctx.fillStyle = '#44403c';
        ctx.fillRect(-40, -10, 80, 20);
        ctx.fillStyle = '#57534e';
        ctx.fillRect(-30, -25, 60, 15);

        // Radar mast & dish
        ctx.fillStyle = '#78716c';
        ctx.fillRect(-4, -45, 8, 25);

        // Rotating dish
        const dishRot = Math.sin(loopFrame * 0.08) * 0.4;
        ctx.save();
        ctx.translate(0, -45);
        ctx.rotate(dishRot);
        ctx.beginPath();
        ctx.arc(0, 0, 22, Math.PI * 0.8, Math.PI * 1.8);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#e7e5e4';
        ctx.stroke();
        ctx.restore();

        // HP bar above station
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-35, -60, 70, 7);
        const hpPct = Math.max(0, currentStationHp / 100);
        ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : '#ef4444';
        ctx.fillRect(-34, -59, 68 * hpPct, 5);

        // Text label
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`محطة رادار العدو [صحة: ${currentStationHp}%]`, 0, -66);
      } else {
        // Destroyed ruin
        ctx.fillStyle = '#292524';
        ctx.fillRect(-40, -5, 80, 15);

        // Smoke & Fire particles
        for (let i = 0; i < 7; i++) {
          const pAngle = i * 0.95 + loopFrame * 0.04;
          const px = Math.cos(pAngle) * (14 + i * 3);
          const py = -18 - ((loopFrame * 0.9) % 45) - i * 6;
          ctx.beginPath();
          ctx.arc(px, py, 9 + i * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(40, 36, 32, ${Math.max(0, 0.75 - py / -75)})`;
          ctx.fill();
        }

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 11px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ تم تدمير المحطة بالصاروخ الموجه (+500) 🎯', 0, -35);
      }
      ctx.restore();

      // MiG-21 player plane flying on the left
      const planeX = 110;
      const planeY = h * 0.45 + Math.sin(loopFrame * 0.06) * 12;

      ctx.save();
      ctx.translate(planeX, planeY);
      // Jet fuselage
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(-30, -10);
      ctx.lineTo(-25, 0);
      ctx.lineTo(-30, 10);
      ctx.closePath();
      ctx.fill();
      // Wings
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-5, -24);
      ctx.lineTo(10, 0);
      ctx.lineTo(-5, 24);
      ctx.lineTo(-18, 0);
      ctx.closePath();
      ctx.fill();
      // Egyptian Air Force Roundel
      ctx.beginPath();
      ctx.arc(-2, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-2, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-2, 0, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();

      // GUIDED ROCKETS ONLY: Lock-on and fire 2 guided rockets into the station
      if (loopFrame > 70 && loopFrame < 195 && !isStationDestroyed) {
        // Red Lock Reticle on station
        ctx.save();
        ctx.translate(stationX, stationY - 20);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-26, -26, 52, 52);

        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 إطلاق صاروخ موجه للمحطة [GUIDED ROCKET ONLY]', 0, 40);
        ctx.restore();
      }

      // Rocket 1 (Frame 105 to 145) - Guided Rocket homing into station
      if (loopFrame >= 105 && loopFrame <= 145) {
        const r1Prog = (loopFrame - 105) / 40;
        // Curving homing arc
        const rx = planeX + 25 + (stationX - (planeX + 25)) * r1Prog;
        const ry = planeY + 4 + (stationY - 18 - (planeY + 4)) * Math.pow(r1Prog, 1.2);

        // Rocket body
        ctx.save();
        ctx.translate(rx, ry);
        const angle = Math.atan2(stationY - 18 - planeY, stationX - planeX);
        ctx.rotate(angle);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, -2, 16, 4);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(4, -3);
        ctx.lineTo(4, 3);
        ctx.fill();
        // Thruster flame
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-9, 0, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Thick smoke trail
        ctx.strokeStyle = 'rgba(240, 240, 240, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(planeX + 25, planeY + 4);
        ctx.lineTo(rx - 10, ry);
        ctx.stroke();

        if (loopFrame === 145) {
          // Impact explosion on station
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(stationX, stationY - 15, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rocket 2 (Frame 150 to 190) - Second Guided Rocket finishing the station
      if (loopFrame >= 150 && loopFrame <= 190) {
        const r2Prog = (loopFrame - 150) / 40;
        const rx = planeX + 25 + (stationX - (planeX + 25)) * r2Prog;
        const ry = planeY - 4 + (stationY - 15 - (planeY - 4)) * Math.pow(r2Prog, 1.2);

        // Rocket body
        ctx.save();
        ctx.translate(rx, ry);
        const angle = Math.atan2(stationY - 15 - planeY, stationX - planeX);
        ctx.rotate(angle);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, -2, 16, 4);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(4, -3);
        ctx.lineTo(4, 3);
        ctx.fill();
        // Thruster flame
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-9, 0, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Thick smoke trail
        ctx.strokeStyle = 'rgba(240, 240, 240, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(planeX + 25, planeY - 4);
        ctx.lineTo(rx - 10, ry);
        ctx.stroke();

        if (loopFrame === 190) {
          // Massive destruction explosion
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(stationX, stationY - 15, 38, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 1973 Gun-Camera HUD Overlay
      ctx.fillStyle = 'rgba(0, 255, 120, 0.85)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('REC ● 1973-10-06 14:02:18 [GUN-CAM MIG-21]', 12, 20);
      ctx.fillText('WEAPON: GUIDED ROCKETS ONLY (8 ROCKETS TOTAL)', 12, 36);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`REQUIRED: ${config.requiredAirStrikeStations} / 6 STATIONS`, w - 12, 20);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, difficulty]);

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
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-cairo text-amber-400">
                  فيديو تقديمي يشرح طريقة اللعب: تدمير محطات ورادارات العدو بالصواريخ الموجهة
                </h3>
                <span className="text-[10px] bg-red-600 text-white font-mono px-2 py-0.5 rounded font-bold animate-pulse">
                  فيديو تقديمي إجباري 🎬
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                المرحلة الأولى · فيديو محاكاة يوضح أسلوب التحليق، تفادي الأرض، وإطلاق الصواريخ الموجهة الـ 8 لتدمير المحطات
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
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>محاكاة هجوم: تدمير محطات العدو بالصواريخ الموجهة فقط (8 صواريخ للمهمة) 🚀</span>
          </div>
        </div>

        {/* Tactical Explanation Rules */}
        <div className="p-3.5 sm:p-4 space-y-3 text-right text-xs leading-relaxed max-h-[42vh] overflow-y-auto">
          {/* Key Rule Callout */}
          <div className="p-3 bg-red-950/40 border border-red-500/60 rounded-xl space-y-1.5 text-red-200">
            <div className="flex items-center gap-2 font-bold font-cairo text-red-400 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 animate-bounce" />
              <span>قاعدة المعركة الحاسمة: الصواريخ الموجهة مخصصة للمحطات الأرضية فقط!</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-normal">
              إسقاط مقاتلات الفانتوم المعادية يحميك من نيرانها ويمنحك نقاطاً فقط.{' '}
              <strong className="text-amber-300">
                شرط النصر الوحيد هو تدمير المحطات الأرضية الاستراتيجية بالصواريخ الموجهة
              </strong>{' '}
              (محطات الرادار، المطارات، ودشم المدفعية). لديك 8 صواريخ موجهة للمهمة.
            </p>
          </div>

          {/* Breakdown of Difficulties */}
          <div className="p-3 bg-stone-950/80 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold font-cairo text-amber-400 text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>المحطات المطلوبة للفوز في مستواك الحالي:</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400 font-bold">
                إجمالي المحطات المتاحة: 6 محطات · الصواريخ: 8 صواريخ
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
                  تدمير <strong className="text-emerald-300">3 من أصل 6</strong> محطات
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">نيران معادية معتدلة وتدريب</div>
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
                  تدمير <strong className="text-amber-300">4 من أصل 6</strong> محطات
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">توازن العمليات القياسي</div>
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
                  تدمير <strong className="text-red-300">5 من أصل 6</strong> محطات
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">معركة شرسة ومكثفة</div>
              </div>
            </div>
          </div>

          {/* How to Destroy Station Steps */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl space-y-1.5 text-stone-300">
            <span className="font-bold text-sky-400 block mb-1">
              طريقة استهداف وتدمير المحطة بالصواريخ الموجهة فقط:
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span>
                  <strong>1. انتبه لصافرة الإنذار:</strong> يظهر إشعار راداري قبل وصول المحطة بـ 4
                  ثوانٍ مع سهم برتقالي على اليمين.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span>
                  <strong>2. إطلاق الصواريخ الموجهة فقط:</strong> اضغط زر الصاروخ لإطلاق صاروخ موجه؛ الصاروخ مبرمج تلقائياً ليتجه نحو المحطة الأرضية ويدمرها مباشرة! (لديك 8 صواريخ موجهة للمهمة).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span>
                  <strong>3. تفادَ الاصطدام:</strong> حلق فوق المحطة بعد ضربها ولا تصطدم بها أو
                  بالأرض حتى لا تنفجر مقاتلتك.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar: Confirmation and Transition */}
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
                ? 'فهمت طريقة اللعب والتحكم (الانطلاق للضربة الجوية) ⚡'
                : 'متابعة القتال واستئناف اللعب ⚡'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
