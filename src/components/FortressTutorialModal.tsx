import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface FortressTutorialModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLaunchBattle?: () => void;
  onCancel?: () => void;
  difficulty?: Difficulty;
}

export const FortressTutorialModal: React.FC<FortressTutorialModalProps> = ({
  isOpen,
  onClose,
  onLaunchBattle,
  onCancel,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentSceneTitle, setCurrentSceneTitle] = useState('المشهد 1: إخماد صمامات النابالم بمضخة الرغوة');
  const [currentSceneKey, setCurrentSceneKey] = useState('زر 4 / مضخة الرغوة');

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

      // Determine scene caption
      if (loopFrame < 110) {
        setCurrentSceneTitle('المشهد 1: إخماد صمامات وأنابيب النابالم المشتعلة بمضخة الرغوة العازلة');
        setCurrentSceneKey('زر 4 / مضخة الرغوة (Foam)');
      } else if (loopFrame < 220) {
        setCurrentSceneTitle('المشهد 2: تصويب وإطلاق قواذف RPG-7 لدك دشم الرشاشات الخرسانية');
        setCurrentSceneKey('زر 1 / النقر بالماوس (RPG)');
      } else if (loopFrame < 330) {
        setCurrentSceneTitle('المشهد 3: زرع شحنات النسف المركزة TNT لتفجير بوابات الحصن الفولاذية');
        setCurrentSceneKey('زر 3 / شحنات النسف (Satchel)');
      } else if (loopFrame < 440) {
        setCurrentSceneTitle('المشهد 4: نشر قنابل ستائر الدخان لحماية أفراد الصاعقة من نيران القناصة');
        setCurrentSceneKey('زر 5 / ستائر الدخان (Cover)');
      } else {
        setCurrentSceneTitle('المشهد 5: اقتحام مركز القيادة، رفع العلم المصري، واستسلام حامية الحصن! 🇪🇬');
        setCurrentSceneKey('تم النصر الحاسم 🏆');
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Dusk / Night Sky with Distant Artillery Flares
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 150);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 150);

      // Stars & Signal Flares in sky
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 12; s++) {
        const starX = (s * 53 + 20) % w;
        const starY = (s * 17 + 10) % 90;
        ctx.fillRect(starX, starY, 1.5, 1.5);
      }

      // 2. Bar-Lev Sand Rampart & Canal Shore
      const sandGrad = ctx.createLinearGradient(0, 150, 0, h);
      sandGrad.addColorStop(0, '#78350f');
      sandGrad.addColorStop(0.4, '#92400e');
      sandGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = sandGrad;
      ctx.beginPath();
      ctx.moveTo(0, 260);
      ctx.lineTo(340, 220);
      ctx.lineTo(340, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Suez Canal Water on bottom left
      const waterGrad = ctx.createLinearGradient(0, 290, 0, h);
      waterGrad.addColorStop(0, '#0369a1');
      waterGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 290, 180, h - 290);

      // 3. Concrete Fortress Bastion Structure (x: 340 to w)
      ctx.fillStyle = '#334155';
      ctx.fillRect(340, 95, 300, 225);
      // Concrete Texture panels
      ctx.fillStyle = '#475569';
      ctx.fillRect(340, 95, 300, 12);
      ctx.fillRect(340, 160, 300, 6);
      ctx.fillRect(340, 230, 300, 6);

      // Concrete Gunports (الدشم)
      // Gunport 1
      const bunker1Hp = loopFrame >= 170 ? 0 : 100;
      ctx.fillStyle = bunker1Hp > 0 ? '#0f172a' : '#1e293b';
      ctx.fillRect(365, 125, 45, 20);
      if (bunker1Hp > 0) {
        // Machine gun barrel protruding
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(365, 135);
        ctx.lineTo(345, 135);
        ctx.stroke();
      }

      // Gunport 2
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(445, 125, 45, 20);

      // Steel Blast Door (بوابة الحصن الفولاذية)
      const doorBreached = loopFrame >= 290;
      ctx.fillStyle = doorBreached ? '#1e293b' : '#64748b';
      ctx.fillRect(365, 185, 55, 45);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(365, 185, 55, 45);
      if (!doorBreached) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(388, 202, 8, 8); // Lock mechanism
      }

      // Observation Watchtower on Top
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(520, 45, 45, 50);
      ctx.fillStyle = '#475569';
      ctx.fillRect(510, 40, 65, 8); // roof

      // Napalm Pipeline (أنبوب النابالم الحارق)
      const napalmExtinguished = loopFrame >= 75;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(340, 255);
      ctx.lineTo(210, 275);
      ctx.lineTo(130, 295);
      ctx.stroke();

      // Napalm Valve
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(210, 275, 7, 0, Math.PI * 2);
      ctx.fill();

      // Napalm Fire Effect (if not yet extinguished)
      if (!napalmExtinguished) {
        const fireAlpha = 0.7 + Math.sin(loopFrame * 0.3) * 0.3;
        ctx.fillStyle = `rgba(239, 68, 68, ${fireAlpha})`;
        ctx.beginPath();
        ctx.arc(130, 295, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(130, 295, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 9px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 صمام نابالم مشتعل يهدد القناة!', 170, 260);
      } else {
        // Extinguished with white foam
        ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
        ctx.beginPath();
        ctx.arc(210, 275, 14, 0, Math.PI * 2);
        ctx.arc(130, 295, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Egyptian Commando Squad Position
      const commandoX = 140 + Math.min(130, (loopFrame / TOTAL_LOOP_FRAMES) * 140);
      const commandoY = 245;

      // Draw Commando Soldier
      ctx.fillStyle = '#166534';
      ctx.fillRect(commandoX - 8, commandoY - 18, 16, 22);
      // Head & Helmet
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.arc(commandoX, commandoY - 24, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(commandoX, commandoY - 26, 8, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#86efac';
      ctx.font = 'bold 9px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('فصيلة الصاعقة المصرية', commandoX, commandoY - 34);

      // 5. SCENE ANIMATION DETAILS

      // SCENE 1: Extinguishing Napalm with Foam (Frames 15 to 80)
      if (loopFrame >= 15 && loopFrame <= 95) {
        // Spray stream of white/cyan foam from commando to valve
        const sprayProg = Math.min(1, (loopFrame - 15) / 30);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(commandoX + 8, commandoY - 10);
        ctx.lineTo(210, 275);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillText('🚒 رش الرغوة العازلة وإخماد صمام النابالم بالكامل! (+200)', 210, 240);
      }

      // SCENE 2: Firing RPG-7 at Bunker (Frames 120 to 200)
      if (loopFrame >= 120 && loopFrame <= 200) {
        const rpgProg = Math.min(1, (loopFrame - 120) / 40);
        const curRx = (commandoX + 10) + (365 - (commandoX + 10)) * rpgProg;
        const curRy = (commandoY - 15) + (135 - (commandoY - 15)) * rpgProg;

        // Smoke trail behind rocket
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(commandoX + 10, commandoY - 15);
        ctx.lineTo(curRx, curRy);
        ctx.stroke();

        // RPG Rocket
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(curRx, curRy, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillText('🚀 إطلاق قذيفة RPG-7 على الدشمة (زر 1)', curRx, curRy - 12);

        // Explosion on bunker
        if (loopFrame >= 160) {
          const expProg = (loopFrame - 160) / 35;
          ctx.fillStyle = `rgba(239, 68, 68, ${1 - expProg})`;
          ctx.beginPath();
          ctx.arc(365, 135, 30 * expProg, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillText('💥 تدمير دشمة الرشاشات الخرسانية! (+250)', 390, 110);
        }
      }

      // SCENE 3: Satchel Charge on Blast Door (Frames 230 to 320)
      if (loopFrame >= 230 && loopFrame <= 320) {
        // Red ticking satchel on door
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(385, 200, 14, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('TNT', 392, 211);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillText('💣 شحنة نسف مركزة TNT على البوابة الفولاذية (زر 3)', 380, 175);

        // Detonation & Door Breach
        if (loopFrame >= 275) {
          const breachProg = (loopFrame - 275) / 40;
          ctx.fillStyle = `rgba(249, 115, 22, ${1 - breachProg})`;
          ctx.beginPath();
          ctx.arc(392, 207, 35 * breachProg, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 11px Cairo, sans-serif';
          ctx.fillText('💥 نسف البوابة الفولاذية واقتحام الحصن! (+350)', 390, 240);
        }
      }

      // SCENE 4: Smoke Screen Cover (Frames 340 to 425)
      if (loopFrame >= 340 && loopFrame <= 425) {
        const smokeAlpha = Math.min(0.8, (loopFrame - 340) / 25);
        ctx.fillStyle = `rgba(203, 213, 225, ${smokeAlpha * 0.65})`;
        ctx.beginPath();
        ctx.arc(commandoX + 20, commandoY - 10, 45, 0, Math.PI * 2);
        ctx.arc(commandoX + 60, commandoY - 15, 55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px Cairo, sans-serif';
        ctx.fillText('💨 ستارة دخان تكتيكية (زر 5): حماية الصاعقة من نيران القناصة 100%', commandoX + 50, commandoY - 45);
      }

      // SCENE 5: Raising Egyptian Flag atop Bastion (Frames 435 to 540)
      if (loopFrame >= 435) {
        // Flagpole on bastion roof
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(490, 25, 4, 70); // flagpole
        // Egyptian Flag waving
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(494, 25, 34, 9); // Red
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(494, 34, 34, 9); // White
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(494, 43, 34, 9); // Black
        // Golden Eagle
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(511, 38, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // White surrender flag from fortress bunker
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(370, 75, 20, 14);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(370, 75, 20, 14);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🇪🇬 رُفع العلم المصري خفاقاً واستسلمت حامية الحصن بالكامل! الله أكبر!', 450, 15);
      }

      // Floating Objective Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(15, 12, 280, 48, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🎯 الهدف: اقتحام الدشم وإخماد النابالم', 280, 30);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px Cairo, sans-serif';
      ctx.fillText('🏰 استسلام حصن بارليف ورفع علم مصر خفاقاً', 280, 48);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

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
              🏰
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
                فيديو تقديمي يشرح طريقة اللعب: اقتحام حصون خط بارليف ولسان بورتوفيق
              </h2>
              <p className="text-[11px] text-stone-400">
                المرحلة الخامسة · محاكاة مرئية توضح استخدام قواذف RPG، مضخة إخماد النابالم، شحنات نسف TNT، ورفع العلم المصري
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
                className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 transition-all duration-75"
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
              <span>خطة اقتحام الحصن واستعادة الأرض:</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-normal">
              1. إخماد صمامات وأنابيب النابالم الحارق بمضخة الرغوة قبل أن يشعل العدو مياه القناة.{' '}
              2. دك دشم الرشاشات الخرسانية بقواذف RPG-7 لفتح ثغرات في الجدار الساتر.{' '}
              3. زرع شحنات النسف المركزة TNT على البوابات الفولاذية لفتح الممرات إلى داخل الحصن.{' '}
              4. رفع العلم المصري فوق أعلى نقطة في الحصن لإجبار حاميته على الاستسلام التام 🇪🇬.
            </p>
          </div>

          {/* Difficulty Target */}
          <div className="p-3 bg-stone-950/80 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold font-cairo text-amber-400 text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>المطلوب للانتصار حسب مستوى الصعوبة ({difficulty}):</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400 font-bold">
                {config.label} ({config.badge})
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
                <div className="font-bold mb-0.5 text-emerald-400">🟢 سهل</div>
                <div>وقت موسع · دشم أقل كثافة</div>
              </div>

              <div
                className={`p-2 rounded-lg border ${
                  difficulty === 'normal'
                    ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/60 text-amber-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-0.5 text-amber-400">🟡 متوسط</div>
                <div>وقت متوازن · نيران دشم متبادلة</div>
              </div>

              <div
                className={`p-2 rounded-lg border ${
                  difficulty === 'hard'
                    ? 'bg-red-950/80 border-red-500 ring-2 ring-red-500/60 text-red-200'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                <div className="font-bold mb-0.5 text-red-400">🔴 صعب</div>
                <div>وقت ضيق · قصف مدفعي وهاونات كثيفة</div>
              </div>
            </div>
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
