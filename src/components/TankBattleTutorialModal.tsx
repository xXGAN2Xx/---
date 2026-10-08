import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  Shield,
  X,
  AlertTriangle,
  CheckCircle2,
  Target,
  Crosshair,
  ArrowRight,
  Sparkles,
  Zap,
  Flame,
  Wind,
  Play,
  Pause,
  RotateCcw,
  Film,
  Bomb,
  Award,
} from 'lucide-react';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface TankBattleTutorialModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLaunchBattle?: () => void;
  onCancel?: () => void;
  difficulty?: Difficulty;
}

export const TankBattleTutorialModal: React.FC<TankBattleTutorialModalProps> = ({
  isOpen,
  onClose,
  onLaunchBattle,
  onCancel,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentSceneTitle, setCurrentSceneTitle] = useState('المشهد 1: رصد دبابات العدو وقصفها بمدفع T-62');
  const [currentSceneKey, setCurrentSceneKey] = useState('1 / النقر');

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const targetTanks = config.tankBattleTargetCount || (difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10);

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

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const stepRef = useRef(0);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleRestartVideo = () => {
    stepRef.current = 0;
    setIsPlaying(true);
  };

  // Canvas animated tactical video simulation
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const TOTAL_LOOP_FRAMES = 540; // ~9.0 seconds at 60fps

    const render = () => {
      if (isPlayingRef.current) {
        stepRef.current += 1;
      }

      const loopFrame = stepRef.current % TOTAL_LOOP_FRAMES;
      const progressFraction = loopFrame / TOTAL_LOOP_FRAMES;
      setPlaybackProgress(progressFraction);

      // Determine current scene caption
      if (loopFrame < 110) {
        setCurrentSceneTitle('المشهد 1: رصد دبابات العدو وقصفها بمدفع T-62 الرئيسي (115 ملم)');
        setCurrentSceneKey('قصف المدفع 🎯');
      } else if (loopFrame < 230) {
        setCurrentSceneTitle('المشهد 2: إطلاق صواريخ مالوتكا (ساجر) الموجهة سلكياً لاصطياد الدبابات الثقيلة');
        setCurrentSceneKey('صاروخ مالوتكا 🚀');
      } else if (loopFrame < 350) {
        setCurrentSceneTitle('المشهد 3: طلب قصف المدفعية الميدانية الثقيلة لدك أرتال العدو في المزرعة الصينية');
        setCurrentSceneKey('قصف مدفعي 💣');
      } else if (loopFrame < 450) {
        setCurrentSceneTitle('المشهد 4: إطلاق ستائر الدخان التكتيكية لحماية الموقع وإرباك رماة العدو');
        setCurrentSceneKey('ستارة الدخان 💨');
      } else {
        setCurrentSceneTitle('المشهد 5: تدمير دبابة قيادة اللواء 190 وسحق هجوم العدو المضاد وتحقيق النصر!');
        setCurrentSceneKey('إعلان النصر 🇪🇬');
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Sky & Sinai Desert Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 140);
      skyGrad.addColorStop(0, '#1c1917');
      skyGrad.addColorStop(0.6, '#451a03');
      skyGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 140);

      // Distant Sinai mountains silhouette
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(80, 105);
      ctx.lineTo(170, 130);
      ctx.lineTo(280, 95);
      ctx.lineTo(410, 125);
      ctx.lineTo(520, 100);
      ctx.lineTo(640, 135);
      ctx.lineTo(640, 140);
      ctx.closePath();
      ctx.fill();

      // Desert sand terrain
      const sandGrad = ctx.createLinearGradient(0, 140, 0, h);
      sandGrad.addColorStop(0, '#b45309');
      sandGrad.addColorStop(0.4, '#d97706');
      sandGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 140, w, h - 140);

      // Sand Berm on Left (Egyptian Defensive Line)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(135, 160);
      ctx.lineTo(155, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Sandbags & fortifications on berm
      ctx.fillStyle = '#92400e';
      ctx.fillRect(110, 205, 30, 14);
      ctx.fillRect(115, 275, 30, 14);

      // Egyptian Flag on the Berm
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(65, 160, 3, 55); // pole
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(68, 160, 22, 6); // red
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(68, 166, 22, 6); // white
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(68, 172, 22, 6); // black

      // Egyptian T-62 Tank on Berm
      const playerTankX = 90;
      const playerTankY = 240;

      // Tank Hull
      ctx.fillStyle = '#2d4a22';
      ctx.fillRect(playerTankX - 25, playerTankY - 10, 48, 22);
      // Treads
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(playerTankX - 28, playerTankY + 8, 54, 10);
      for (let wheel = 0; wheel < 5; wheel++) {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(playerTankX - 20 + wheel * 11, playerTankY + 13, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Turret
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.arc(playerTankX, playerTankY - 5, 12, 0, Math.PI * 2);
      ctx.fill();
      // Gun barrel
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(playerTankX + 6, playerTankY - 6);
      ctx.lineTo(playerTankX + 38, playerTankY - 10);
      ctx.stroke();

      // Player Label
      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 10px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('دبابة T-62 المصرية', playerTankX, playerTankY - 22);

      // 2. Enemy Tanks Advancing Slowly
      // Tank 1: Patton M60 advancing from right
      const tank1X = 570 - Math.min(260, (loopFrame % 250) * 1.05);
      const tank1Y = 230;

      // Tank 2: Centurion heavy tank
      const tank2X = 620 - Math.min(220, (loopFrame % 300) * 0.7);
      const tank2Y = 295;

      // Render Tank 1 (Patton M60)
      ctx.save();
      ctx.translate(tank1X, tank1Y);
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-26, -10, 52, 20);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-28, 8, 56, 9);
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(-34, -6);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('دبابة باتون M60', 0, -20);
      ctx.restore();

      // Render Tank 2 (Centurion)
      ctx.save();
      ctx.translate(tank2X, tank2Y);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(-28, -11, 56, 22);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-30, 9, 60, 9);
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.arc(0, -6, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(-38, -6);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('سينتوريون ثقيلة', 0, -22);
      ctx.restore();

      // 3. SCENE DEMONSTRATIONS ACCORDING TO TIMELINE

      // SCENE 1: Cannon Shot (Frames 20 to 80)
      if (loopFrame >= 20 && loopFrame <= 95) {
        const shotProg = (loopFrame - 20) / 45;
        // Animated Crosshair hovering over Patton
        const crosshairX = tank1X;
        const crosshairY = tank1Y - 6;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(crosshairX, crosshairY, 14, 0, Math.PI * 2);
        ctx.moveTo(crosshairX - 18, crosshairY);
        ctx.lineTo(crosshairX + 18, crosshairY);
        ctx.moveTo(crosshairX, crosshairY - 18);
        ctx.lineTo(crosshairX, crosshairY + 18);
        ctx.stroke();

        // Muzzle Flash at barrel tip
        if (loopFrame >= 20 && loopFrame <= 30) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(playerTankX + 40, playerTankY - 10, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        // Flying Shell
        if (shotProg < 1) {
          const curSx = (playerTankX + 40) + (tank1X - (playerTankX + 40)) * shotProg;
          const curSy = (playerTankY - 10) + (tank1Y - 6 - (playerTankY - 10)) * shotProg;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(curSx, curSy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Hit Explosion
        if (loopFrame >= 65) {
          const explProg = (loopFrame - 65) / 30;
          ctx.fillStyle = `rgba(239, 68, 68, ${1 - explProg})`;
          ctx.beginPath();
          ctx.arc(tank1X, tank1Y - 5, 25 * explProg, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💥 إصابة مباشرة بمدفع T-62 (+150)', tank1X, tank1Y - 32);
        }
      }

      // SCENE 2: Sagger Wire-Guided Missile (Frames 120 to 220)
      if (loopFrame >= 120 && loopFrame <= 220) {
        const missileProg = Math.min(1, (loopFrame - 120) / 60);
        const startMx = playerTankX + 15;
        const startMy = playerTankY - 12;
        const targetMx = tank2X;
        const targetMy = tank2Y - 5;

        const curMx = startMx + (targetMx - startMx) * missileProg;
        const curMy = startMy + (targetMy - startMy) * missileProg + Math.sin(missileProg * Math.PI * 3) * 8;

        // Wire guided dashed line
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(startMx, startMy);
        ctx.lineTo(curMx, curMy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Missile body & plume
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(curMx, curMy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(curMx - 6, curMy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillText('🚀 صاروخ مالوتكا موجه سلكياً (زر 2 / W)', curMx, curMy - 14);

        // Huge detonation
        if (loopFrame >= 180) {
          const boomProg = (loopFrame - 180) / 40;
          const radius = Math.sin(boomProg * Math.PI) * 38;
          const blastGrad = ctx.createRadialGradient(tank2X, tank2Y - 5, 2, tank2X, tank2Y - 5, radius);
          blastGrad.addColorStop(0, '#ffffff');
          blastGrad.addColorStop(0.3, '#f59e0b');
          blastGrad.addColorStop(0.7, '#ef4444');
          blastGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
          ctx.fillStyle = blastGrad;
          ctx.beginPath();
          ctx.arc(tank2X, tank2Y - 5, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 12px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💥 تدمير دبابة سينتوريون بضربة واحدة! (+300)', tank2X, tank2Y - 35);
        }
      }

      // SCENE 3: Field Artillery Strike (Frames 240 to 340)
      if (loopFrame >= 240 && loopFrame <= 340) {
        // Red target area on desert
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.ellipse(450, 260, 90, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 منطقة قصف المدفعية الميدانية (زر 3 / E)', 450, 205);

        // Falling artillery shells & multiple explosions
        if (loopFrame >= 270) {
          const artyProg = (loopFrame - 270) / 50;
          for (let s = 0; s < 3; s++) {
            const expX = 400 + s * 45;
            const expY = 250 + (s % 2) * 20;
            const expR = Math.sin(artyProg * Math.PI) * (20 + s * 5);
            ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
            ctx.beginPath();
            ctx.arc(expX, expY, Math.max(0, expR), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px Cairo, sans-serif';
          ctx.fillText('💣 قصف مدفعي ثقيل يطحن رتل الدبابات بالكامل!', 450, 230);
        }
      }

      // SCENE 4: Tactical Smoke Screen (Frames 360 to 445)
      if (loopFrame >= 360 && loopFrame <= 445) {
        const smokeAlpha = Math.min(0.8, (loopFrame - 360) / 30);
        ctx.fillStyle = `rgba(226, 232, 240, ${smokeAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(220, 240, 60, 0, Math.PI * 2);
        ctx.arc(280, 230, 70, 0, Math.PI * 2);
        ctx.arc(340, 245, 65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💨 ستارة دخان تكتيكية (زر 4 / R): تعمي رماة العدو وتحمي دباباتنا 100%', 280, 185);
      }

      // SCENE 5: Boss Assaf Yaguri Tank (Frames 450 to 540)
      if (loopFrame >= 450) {
        const bossX = 440;
        const bossY = 260;

        // Golden Command Tank
        ctx.save();
        ctx.translate(bossX, bossY);
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(-35, -14, 70, 28);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-38, 12, 76, 12);
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(0, -8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(-44, -8);
        ctx.stroke();

        // Boss Crest
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑 دبابة قيادة اللواء 190 (عساف ياجوري)', 0, -32);
        ctx.restore();

        // Explosion on boss
        if (loopFrame >= 485) {
          const bossExplProg = (loopFrame - 485) / 50;
          ctx.fillStyle = `rgba(234, 179, 8, ${1 - bossExplProg})`;
          ctx.beginPath();
          ctx.arc(bossX, bossY, 45 * bossExplProg, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 13px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🏆 سحق قائد اللواء 190 مدرع واستسلام القوات بالكامل!', 320, 165);
        }
      }

      // 4. Mission Target Box (Top Right)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(15, 12, 290, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`🎯 شرط النصر: سحق ${targetTanks} دبابات معادية`, 285, 30);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px Cairo, sans-serif';
      ctx.fillText('⏱️ وتيرة ظهور متباعدة (كل 5 ثوانٍ) وضربات أبطأ بدقة', 285, 48);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, targetTanks]);

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] bg-stone-950/92 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-3xl bg-stone-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-red-600 text-white font-mono px-2 py-0.5 rounded font-bold animate-pulse">
                  فيديو تقديمي إجباري 🎬
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  شرح طريقة اللعب والتحكم
                </span>
                <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded-full hidden sm:inline">
                  HD 1080p
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black font-cairo text-amber-400 mt-0.5">
                فيديو تقديمي يشرح طريقة اللعب: معركة الدبابات الكبرى وصائدو الدروع
              </h2>
              <p className="text-[11px] text-stone-400">
                المرحلة الرابعة · محاكاة مرئية تشرح استخدام مدفع T-62، صواريخ مالوتكا، قصف المدفعية، وستائر الدخان
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

        {/* Video Simulation Canvas */}
        <div className="relative aspect-[16/9] w-full bg-stone-950 border-b border-stone-800 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-full object-fill block"
          />

          {/* Video Subtitle Caption Overlay */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md bg-stone-950/90 border border-amber-500/60 rounded-xl p-2 backdrop-blur-md text-xs shadow-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-amber-300 text-[11px] sm:text-xs">{currentSceneTitle}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 shrink-0">
              {currentSceneKey}
            </span>
          </div>

          {/* Integrated Video Player Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-stone-950/95 border-t border-stone-800 px-3 py-2 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-stone-200" />}
              </button>

              <button
                type="button"
                onClick={handleRestartVideo}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                title="إعادة تشغيل الفيديو من البداية"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="text-[11px] font-mono text-stone-400 font-bold">
                {`00:0${Math.floor(playbackProgress * 9)} / 00:09`}
              </span>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="flex-1 max-w-xs sm:max-w-md h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-75"
                style={{ width: `${playbackProgress * 100}%` }}
              />
            </div>

            <div className="text-[10px] text-amber-400/90 font-bold font-cairo hidden sm:block">
              🎬 فيديو تدريبي عملي لطريقة اللعب
            </div>
          </div>
        </div>

        {/* Tactical Explanation Content */}
        <div className="p-3.5 sm:p-4 space-y-3 text-right text-xs leading-relaxed max-h-[38vh] overflow-y-auto">
          {/* Key Rule Callout */}
          <div className="p-3 bg-amber-950/40 border border-amber-500/60 rounded-xl space-y-1.5 text-amber-200">
            <div className="flex items-center gap-2 font-bold font-cairo text-amber-400 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 animate-bounce" />
              <span>قاعدة المعركة وشروط النصر للمرحلة:</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-normal">
              معركة الدبابات الكبرى وحائط الصواريخ وصد اللواء 190 مدرع تعتمد على التخطيط والتسلسل الزمني الدقيق. شرط النصر هو{' '}
              <strong className="text-amber-300">
                ترتيب كافة العمليات العسكرية بالتسلسل التاريخي الدقيق وتثبيتها بنجاح
              </strong>
              . عند الترتيب الصحيح تنطلق صواريخ الساجر لإبادة دبابات العدو وأسر العقيد عساف ياجوري!
            </p>
          </div>

          {/* Breakdown of Difficulties */}
          <div className="p-3 bg-stone-950/80 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold font-cairo text-amber-400 text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>شروط النصر حسب مستوى الصعوبة:</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400 font-bold">
                ترتيب العمليات التاريخية زمنيّاً
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div
                className={`p-2.5 rounded-lg border ${
                  difficulty === 'easy'
                    ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/60 text-emerald-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-1 text-emerald-400">🟢 المستوى السهل</div>
                <div className="font-bold text-emerald-300 text-sm">
                  4 محطات رئيسية
                </div>
                <div className="text-[10px] text-stone-400 mt-1">150 ثانية · 3 أخطاء مسموحة · 3 تلميحات</div>
              </div>

              <div
                className={`p-2.5 rounded-lg border ${
                  difficulty === 'normal'
                    ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/60 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-1 text-amber-400">🟡 المستوى المتوسط</div>
                <div className="font-bold text-amber-300 text-sm">
                  6 عمليات تكتيكية
                </div>
                <div className="text-[10px] text-stone-400 mt-1">120 ثانية · خطآن مسموحان · تلميحان</div>
              </div>

              <div
                className={`p-2.5 rounded-lg border ${
                  difficulty === 'hard'
                    ? 'bg-red-950/80 border-red-500 ring-2 ring-red-500/60 text-red-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-1 text-red-400">🔴 المستوى الصعب</div>
                <div className="font-bold text-red-300 text-sm">
                  8 أحداث تاريخية كاملة
                </div>
                <div className="text-[10px] text-stone-400 mt-1">90 ثانية · خطأ واحد فقط · تلميح واحد</div>
              </div>
            </div>
          </div>

          {/* Weapons and Controls */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl space-y-2 text-stone-300">
            <span className="font-bold text-sky-400 block mb-1">
              ترسانة الأسلحة وطريقة الاستخدام:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                  زر 1 / النقر
                </span>
                <div>
                  <strong className="text-stone-200 block">مدفع الدبابة T-62:</strong>
                  قذائف شديدة الانفجار لسحق الدروع الخفيفة والمدرعات.
                </div>
              </div>

              <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold text-[10px]">
                  زر 2 / W
                </span>
                <div>
                  <strong className="text-red-300 block">صاروخ مالوتكا (ساجر):</strong>
                  صاروخ موجه سلكياً عالي الدقة يدمر أقوى دبابات الباتون بضربة واحدة.
                </div>
              </div>

              <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono font-bold text-[10px]">
                  زر 3 / E
                </span>
                <div>
                  <strong className="text-orange-300 block">قصف المدفعية الميدانية:</strong>
                  إمطار المنطقة بقذائف مدفعية ثقيلة تصيب عدة أهداف معاً.
                </div>
              </div>

              <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800 flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">
                  زر 4 / R
                </span>
                <div>
                  <strong className="text-sky-300 block">ستائر الدخان التمويهية:</strong>
                  حجب الرؤية عن رماة العدو وتعطيل تصويبهم وإبطاء نيرانهم.
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
                ? 'فهمت طريقة اللعب والتحكم (الانطلاق لمعركة الدبابات) ⚡'
                : 'متابعة القتال واستئناف اللعب ⚡'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
