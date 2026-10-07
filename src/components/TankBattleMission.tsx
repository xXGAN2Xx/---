import React, { useEffect, useState, useRef } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Shield,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  HelpCircle,
  MoveUp,
  MoveDown,
  Play,
  Flame,
  Crosshair,
  Lock,
} from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';
import { isGamePaused } from '../game/pause';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface TankBattleMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
}

export interface HistoricalBattleEvent {
  id: string;
  correctIndex: number;
  timeLabel: string;
  phaseCode: string;
  title: string;
  subtitle: string;
  description: string;
  tacticalTactic: string;
  unit: string;
  weaponIcon: string;
  bannerColor: string;
  militaryImportance: string;
}

// Master pool of sequential historical events for the Tank Battle & Missile Wall (October 7 - 10, 1973)
const ALL_HISTORICAL_EVENTS: HistoricalBattleEvent[] = [
  {
    id: 'recon_counterattack',
    correctIndex: 0,
    timeLabel: 'فجر 7 أكتوبر · 05:30',
    phaseCode: 'المرحلة I: الاستطلاع التكتيكي',
    title: 'رصد تقدم اللواء 190 مدرع المعادي',
    subtitle: 'استطلاع وتحديد اتجاه الهجوم المضاد في سيناء',
    description: 'رصد طائرات الاستطلاع ودوريات المشاة تقدم أرتال دبابات الباتون والسينتوريون بقيادة عساف ياجوري لاستعادة القناة.',
    tacticalTactic: 'نشر نقاط المراقبة والرصد المتقدم على الساتر الترابي',
    unit: 'سلاح الاستطلاع والمخابرات الحربية',
    weaponIcon: '🔭',
    bannerColor: 'from-amber-700/40 to-amber-950/80',
    militaryImportance: 'كشف محور تقدم مدرعات العدو مبكراً لتجهيز منطقة القتل.',
  },
  {
    id: 'sagger_ambush',
    correctIndex: 1,
    timeLabel: 'صباح 8 أكتوبر · 08:00',
    phaseCode: 'المرحلة II: الكمين الهيكلي',
    title: 'نصب كمائن صواريخ مالوتكا (ساجر) في الكثبان',
    subtitle: 'تمركز صائدي الدبابات بقيادة البطل عبد العاطي والمصري',
    description: 'تموضع أطقم صواريخ "مالوتكا" السلكية الخفيفة بين التلال الرملية في صمت لاسلكي تام دون كشف مواقعهم للعدو.',
    tacticalTactic: 'كمين على شكل قوس لاصطياد دروع العدو من الأجناب',
    unit: 'الكتيبة 35 مقذوفات موجهة م/د (صائدو الدبابات)',
    weaponIcon: '🚀',
    bannerColor: 'from-emerald-700/40 to-emerald-950/80',
    militaryImportance: 'تحييد ميزة تفوق مدى مدافع دبابات العدو بصواريخ دقيقة.',
  },
  {
    id: 'sam_shield_activation',
    correctIndex: 2,
    timeLabel: 'ظهيرة 8 أكتوبر · 11:30',
    phaseCode: 'المرحلة III: مظلة الردع',
    title: 'تفعيل حائط الصواريخ (سام-6 وسام-3)',
    subtitle: 'إسقاط مقاتلات الفانتوم وكسر الذراع الطويلة لإسرائيل',
    description: 'انطلاق صواريخ الدفاع الجوي لصد أسراب الفانتوم وسكاي هوك المعادية التي حاولت توفير غطاء جوي لدباباتهم.',
    tacticalTactic: 'توجيه راداري متشابك لإسقاط الطائرات المهاجمة فور اقترابها',
    unit: 'قوات الدفاع الجوي المصري (حائط الصواريخ)',
    weaponIcon: '⚡',
    bannerColor: 'from-sky-700/40 to-sky-950/80',
    militaryImportance: 'حرمان دبابات العدو من أي دعم جوي وفرض سيادة سماء المعركة.',
  },
  {
    id: 'lure_into_pocket',
    correctIndex: 3,
    timeLabel: 'ظهر 8 أكتوبر · 13:15',
    phaseCode: 'المرحلة IV: الاستدراج',
    title: 'استدراج دروع العدو إلى منطقة القتل بوادي الفردان',
    subtitle: 'تراجع تكتيكي خادع للمشاة لإدخال دبابات العدو في الفخ',
    description: 'تظاهرت وحدات المشاة بالتراجع المنظم لدفع اللواء 190 مدرع للاندفاع السريع داخل جيب نيراني مُغلق ومحاصر.',
    tacticalTactic: 'المناورة بالانسحاب التكتيكي الوهمي لجر قوات العدو للكمين',
    unit: 'الفرقة الثانية مشاة والفرقة 16 مشاة',
    weaponIcon: '🎯',
    bannerColor: 'from-orange-700/40 to-orange-950/80',
    militaryImportance: 'تطويق أرتال الدبابات في مرمى نيران متقاطعة من ثلاث جهات.',
  },
  {
    id: 'tank_clash_t62',
    correctIndex: 4,
    timeLabel: 'عصر 8 أكتوبر · 14:45',
    phaseCode: 'المرحلة V: الالتحام المدرع',
    title: 'هجوم دبابات T-62 و T-55 وإبادة رتل العدو',
    subtitle: 'ملحمة معركة الفردان والمزرعة الصينية',
    description: 'خروج كتائب الدبابات المصرية من خلف السواتر وإطلاق صواريخ مالوتكا وقذائف المدافع الثقيلة لتدمير دبابات العدو وتفجيرها.',
    tacticalTactic: 'اشتباك نيراني مباشر من مسافات قريبة وسحق التشكيل المعادي',
    unit: 'اللواء 24 مدرع واللواء 14 مدرع المصري',
    weaponIcon: '💥',
    bannerColor: 'from-red-700/40 to-red-950/80',
    militaryImportance: 'تدمير أكثر من 120 دبابة معادية في غضون ساعتين واشتعال الصحراء.',
  },
  {
    id: 'surrender_yaguri',
    correctIndex: 5,
    timeLabel: 'مساء 8 أكتوبر · 17:00',
    phaseCode: 'المرحلة VI: الحسم التاريخي',
    title: 'أسر العقيد عساف ياجوري واستسلام فلول اللواء 190',
    subtitle: 'انهيار الهجوم المضاد وتأمين رؤوس الكباري بعمق 15 كم',
    description: 'محاصرة الدبابة القيادية واستسلام قائد اللواء المدرع الإسرائيلي عساف ياجوري وضباطه وتثبيت خط القتال المصري.',
    tacticalTactic: 'فرض الاستسلام الميداني وتأمين العمق العملياتي في سيناء',
    unit: 'قوات الصاعقة والمشاة البواسل',
    weaponIcon: '🏆',
    bannerColor: 'from-amber-600/40 to-yellow-950/80',
    militaryImportance: 'أكبر هزيمة مدرعة يتكبدها العدو وأسر أعلى رتبة عسكرية بالمعركة.',
  },
];

export const TankBattleMission: React.FC<TankBattleMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const missionDuration = diffConfig.missionDuration; // 150s (easy), 120s (normal), 90s (hard)

  // Configure number of events by difficulty
  const eventCount = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 6 : 5;
  const maxMistakes = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 2 : 3;

  // Sliced pool for current difficulty
  const targetEvents = ALL_HISTORICAL_EVENTS.slice(0, eventCount);

  // States
  const [orderedEvents, setOrderedEvents] = useState<HistoricalBattleEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(missionDuration);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'timeout' | 'mistakes'>('mistakes');
  const [streakCount, setStreakCount] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(
    'رتّب الأحداث التاريخية لمعركة الدبابات وحائط الصواريخ بالتسلسل العملياتي الصحيح!'
  );
  const [isCheckingOrder, setIsCheckingOrder] = useState(false);
  const [correctPositionsCount, setCorrectPositionsCount] = useState(0);
  const [showHistoricHint, setShowHistoricHint] = useState(difficulty === 'easy');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Background visual battle simulation canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize and shuffle events deterministically so it's a real puzzle
  const initMission = () => {
    sound.playRadioTransmission();
    setTimeLeft(missionDuration);
    setMistakesCount(0);
    setScore(0);
    setIsWon(false);
    setIsDefeated(false);
    setSelectedEventId(null);
    setStreakCount(0);
    setFeedbackMsg(
      difficulty === 'easy'
        ? 'رتّب الأحداث الأربعة بالترتيب العسكري الصحيح (لديك إشارات التوقيت الاسترشادية).'
        : difficulty === 'normal'
        ? 'رتّب الأحداث الخمسة لصد هجوم اللواء 190 مدرع وإسقاط طائرات الفانتوم.'
        : 'رتّب الأحداث الستة بدقة تكتيكية فائقة قبل نفاد الوقت وبدون أخطاء!'
    );

    // Deterministic shuffle that ensures events do not start in already-solved order
    const pool = [...targetEvents];
    let shuffled = [...pool];
    let attempts = 0;
    while (attempts < 10) {
      shuffled = [...pool].sort(() => Math.random() - 0.5);
      // check if any is out of position
      const isAlreadySolved = shuffled.every((ev, i) => ev.correctIndex === i);
      if (!isAlreadySolved) break;
      attempts++;
    }
    setOrderedEvents(shuffled);
    calculateCorrectPositions(shuffled);
  };

  useEffect(() => {
    initMission();
  }, [difficulty]);

  const calculateCorrectPositions = (list: HistoricalBattleEvent[]) => {
    let matches = 0;
    list.forEach((ev, idx) => {
      if (ev.correctIndex === idx) matches++;
    });
    setCorrectPositionsCount(matches);
    return matches;
  };

  // Timer Countdown with Defeat Logic
  useEffect(() => {
    if (isWon || isDefeated) return;

    const timer = setInterval(() => {
      if (isGamePaused()) return;

      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsDefeated(true);
          setDefeatReason('timeout');
          sound.playDefeatSound();
          sound.playExplosion(1.2);
          onDefeat?.('timeout');
          return 0;
        }

        // Warning sound when time runs low
        if (next === 30 || next === 15 || next === 10) {
          sound.playRadarWarningAlarm();
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWon, isDefeated, onDefeat]);

  // Animated Desert Battlefield Canvas in the background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Desert Sky with sandstorm gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
      skyGrad.addColorStop(0, '#451a03');
      skyGrad.addColorStop(0.5, '#78350f');
      skyGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

      // Sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(canvas.width * 0.8, 60, 26, 0, Math.PI * 2);
      ctx.fill();

      // Distant Dunes
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.5);
      for (let x = 0; x <= canvas.width; x += 40) {
        ctx.lineTo(x, canvas.height * 0.5 + Math.sin(x * 0.008 + t * 0.2) * 20);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Foreground Dunes
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.68);
      for (let x = 0; x <= canvas.width; x += 30) {
        ctx.lineTo(x, canvas.height * 0.68 + Math.cos(x * 0.012 + t * 0.3) * 15);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Sand Dune Floor
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0, canvas.height * 0.82, canvas.width, canvas.height * 0.18);

      // SAM Missile Trail in sky occasionally
      const missileX = ((t * 80) % (canvas.width + 200)) - 100;
      const missileY = 120 - Math.sin(t * 1.5) * 40;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
      ctx.beginPath();
      ctx.arc(missileX, missileY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Smoke trail
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(missileX - 40, missileY + 8);
      ctx.lineTo(missileX, missileY);
      ctx.stroke();

      // Egyptian Sagger Ambush position silhouette on left
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(60, canvas.height * 0.74, 38, 14);
      ctx.fillRect(72, canvas.height * 0.7, 16, 8);
      ctx.fillRect(84, canvas.height * 0.72, 30, 3); // missile rail

      // Egyptian Flag on left dune
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(35, canvas.height * 0.68 - 25, 20, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(35, canvas.height * 0.68 - 20, 20, 5);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(35, canvas.height * 0.68 - 15, 20, 5);
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(35, canvas.height * 0.68 - 28);
      ctx.lineTo(35, canvas.height * 0.68);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Event Reordering Logic: Move Up
  const moveEventUp = (index: number) => {
    if (index <= 0 || isWon || isDefeated) return;
    sound.playRadioClick();
    const updated = [...orderedEvents];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setOrderedEvents(updated);
    calculateCorrectPositions(updated);
  };

  // Event Reordering Logic: Move Down
  const moveEventDown = (index: number) => {
    if (index >= orderedEvents.length - 1 || isWon || isDefeated) return;
    sound.playRadioClick();
    const updated = [...orderedEvents];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setOrderedEvents(updated);
    calculateCorrectPositions(updated);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    sound.playRadioClick();
    const updated = [...orderedEvents];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, moved);

    setOrderedEvents(updated);
    setDraggedIndex(null);
    calculateCorrectPositions(updated);
  };

  // Click-to-swap selection
  const handleCardClick = (id: string, index: number) => {
    if (isWon || isDefeated) return;

    if (!selectedEventId) {
      sound.playRadioClick();
      setSelectedEventId(id);
      setFeedbackMsg('تم تحديد الحدث. انقر على حدث آخر للتبديل بين موقعيهما.');
      return;
    }

    if (selectedEventId === id) {
      setSelectedEventId(null);
      setFeedbackMsg('تم إلغاء التحديد.');
      return;
    }

    // Swap selected with this clicked one
    sound.playTargetLock();
    const fromIndex = orderedEvents.findIndex((ev) => ev.id === selectedEventId);
    const toIndex = index;

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...orderedEvents];
      const temp = updated[fromIndex];
      updated[fromIndex] = updated[toIndex];
      updated[toIndex] = temp;

      setOrderedEvents(updated);
      setSelectedEventId(null);
      calculateCorrectPositions(updated);
      setFeedbackMsg('تم التبديل بنجاح! راجع التسلسل أو اضغط "تأكيد خطة العمليات".');
    }
  };

  // Submit and verify sequence
  const handleVerifySequence = () => {
    if (isWon || isDefeated) return;
    setIsCheckingOrder(true);

    let allCorrect = true;
    let correctCount = 0;

    orderedEvents.forEach((ev, idx) => {
      if (ev.correctIndex === idx) {
        correctCount++;
      } else {
        allCorrect = false;
      }
    });

    setCorrectPositionsCount(correctCount);

    if (allCorrect) {
      // VICTORY!
      sound.playVictoryFanfare();
      sound.playCannon();
      const timeBonus = timeLeft * 35;
      const basePoints = difficulty === 'easy' ? 4000 : difficulty === 'normal' ? 5500 : 7000;
      const totalPoints = basePoints + timeBonus;

      setScore(totalPoints);
      setIsWon(true);
      setFeedbackMsg('نصر تاريخي مؤزر! تم تطبيق الخطة العسكرية بدقة تامة وسحق اللواء المدرع!');
    } else {
      // Mistake handling
      const nextMistakes = mistakesCount + 1;
      setMistakesCount(nextMistakes);
      sound.playDefeatSound();
      sound.playExplosion(0.8);

      if (nextMistakes >= maxMistakes) {
        setIsDefeated(true);
        setDefeatReason('mistakes');
        onDefeat?.('mistakes');
        setFeedbackMsg('فشلت الخطة العسكرية! تكررت الأخطاء التكتيكية واخترق العدو النسق الدفاعي!');
      } else {
        setFeedbackMsg(
          `التسلسل غير دقيق! (${correctCount} من ${orderedEvents.length} أحداث في موضعها الصحيح). احذر: تبقت ${
            maxMistakes - nextMistakes
          } محاولات قبل الاختراق المعادي!`
        );
      }
    }

    setTimeout(() => {
      setIsCheckingOrder(false);
    }, 600);
  };

  return (
    <div
      dir="rtl"
      className="relative w-full h-full min-h-0 bg-stone-950 flex flex-col justify-between overflow-hidden select-none font-cairo text-stone-100"
    >
      {/* Background Desert Canvas */}
      <div className="absolute inset-0 pointer-events-none opacity-25 z-0">
        <canvas ref={canvasRef} width={800} height={400} className="w-full h-full object-cover" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 px-3 py-2 sm:px-6 sm:py-3 bg-stone-950/90 border-b border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
            title="العودة للقائمة"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">انسحاب</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">⚔️</span>
              <h2 className="text-sm sm:text-base font-black font-cairo text-amber-400">
                المرحلة 4: ترتيب معارك الدبابات وحائط الصواريخ
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                {diffConfig.badge}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden sm:block">
              رتّب الأحداث التاريخية بالتسلسل التكتيكي من رصد الهجوم وحتى أسر قائد اللواء 190 مدرع
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold">
          {/* Correct Position Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900/90 border border-stone-800 text-emerald-400 shadow">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              الصحيح: {correctPositionsCount}/{orderedEvents.length}
            </span>
          </div>

          {/* Mistakes Remaining */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow ${
              maxMistakes - mistakesCount <= 1
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : 'bg-stone-900/90 border-stone-800 text-amber-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>
              فرص الخطأ: {maxMistakes - mistakesCount}/{maxMistakes}
            </span>
          </div>

          {/* Time Remaining Digital Timer */}
          <div className="flex items-center">
            <MissionDigitalTimer
              timeLeft={timeLeft}
              totalTime={missionDuration}
              label="الوقت المتبقي"
              position="top-center"
            />
          </div>
        </div>
      </div>

      {/* Mission Advisory & Feedback Banner */}
      <div className="relative z-10 px-4 py-2 bg-stone-900/70 border-b border-stone-800/80 backdrop-blur-sm flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-300">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{feedbackMsg}</span>
        </div>

        <div className="flex items-center gap-2">
          {difficulty === 'easy' && (
            <button
              type="button"
              onClick={() => setShowHistoricHint(!showHistoricHint)}
              className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-bold border border-stone-700 cursor-pointer transition-colors"
            >
              {showHistoricHint ? 'إخفاء التواريخ' : 'إظهار التواريخ 💡'}
            </button>
          )}

          <button
            type="button"
            onClick={initMission}
            className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
            title="إعادة خلط الأحداث"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Reordering Workspace */}
      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto p-2 sm:p-4 overflow-y-auto space-y-2.5">
        <div className="text-center text-[11px] text-stone-400 sm:hidden">
          اضغط على أي حدث ثم اضغط على آخر لتبديل ترتيبهما، أو استخدم أسهم الترتيب.
        </div>

        {orderedEvents.map((event, index) => {
          const isSelected = selectedEventId === event.id;
          const isAtCorrectPosition = event.correctIndex === index;

          return (
            <div
              key={event.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => handleCardClick(event.id, index)}
              className={`group relative rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden p-3 sm:p-4 shadow-md backdrop-blur-md ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-400/50 scale-[1.01]'
                  : isAtCorrectPosition && isWon
                  ? 'border-emerald-500 bg-emerald-950/40'
                  : 'border-stone-800 hover:border-stone-700 bg-stone-900/80 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between gap-3">
                {/* Left: Tactical Step Number & Move Arrows */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveEventUp(index);
                      }}
                      className="p-1 rounded-lg bg-stone-800 hover:bg-amber-600 disabled:opacity-20 text-stone-200 hover:text-stone-950 transition-all cursor-pointer disabled:cursor-not-allowed"
                      title="تحريك لأعلى"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedEvents.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveEventDown(index);
                      }}
                      className="p-1 rounded-lg bg-stone-800 hover:bg-amber-600 disabled:opacity-20 text-stone-200 hover:text-stone-950 transition-all cursor-pointer disabled:cursor-not-allowed"
                      title="تحريك لأسفل"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center font-black font-mono text-sm sm:text-base text-amber-400 shadow-inner">
                    {index + 1}
                  </div>
                </div>

                {/* Middle: Event Title, Details & Historical Insight */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-base sm:text-lg">{event.weaponIcon}</span>
                    <h3 className="text-xs sm:text-sm font-black font-cairo text-stone-100 group-hover:text-amber-300 transition-colors">
                      {event.title}
                    </h3>

                    {(showHistoricHint || isWon) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                        {event.timeLabel}
                      </span>
                    )}

                    <span className="text-[10px] text-stone-400 font-semibold hidden md:inline">
                      ({event.unit})
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-stone-300 leading-relaxed mb-1.5">
                    {event.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-400">
                    <span className="text-amber-400/90 font-bold">التكتيك:</span>
                    <span>{event.tacticalTactic}</span>
                  </div>
                </div>

                {/* Right: Select / Status Indicator */}
                <div className="shrink-0 flex items-center">
                  {isSelected ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 text-xs font-black animate-pulse shadow">
                      مُحدد للتبديل
                    </span>
                  ) : isWon ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs">
                      ✓
                    </span>
                  ) : (
                    <span className="text-stone-500 text-xs opacity-60 group-hover:opacity-100">
                      انقر للتبديل
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Command Bar */}
      <div className="relative z-10 p-3 sm:p-4 bg-stone-950/95 border-t border-stone-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xl">
        <div className="text-xs text-stone-400">
          <span className="text-amber-400 font-bold">نصيحة تكتيكية: </span>
          <span>
            {difficulty === 'easy'
              ? 'الاستطلاع يسبق الكمين، وحائط الصواريخ يحمي سماء المعركة قبل الاشتباك المدرع.'
              : 'ابدأ بالاستطلاع ثم كمين الصواريخ السلكية وإسقاط الطيران قبل هجوم دبابات T-62.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={initMission}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة الترتيب</span>
          </button>

          <button
            type="button"
            disabled={isCheckingOrder || isWon || isDefeated}
            onClick={handleVerifySequence}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black font-cairo text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>تأكيد خطة العمليات</span>
          </button>
        </div>
      </div>

      {/* Victory Modal */}
      <VictoryModal
        isOpen={isWon}
        missionId="MISSION_TANK_BATTLE"
        missionTitle="المرحلة 4: معارك الدبابات وحائط الصواريخ"
        congratulatoryMessage="مبروك النصر العظيم! تم ترتيب العمليات التكتيكية بدقة عسكرية فائقة، وسُحق اللواء 190 مدرع وأُسر قائده عساف ياجوري!"
        score={score}
        timeLeft={timeLeft}
        onNextMission={() => onComplete(score)}
        onReturnToBase={onExit}
        onReplay={initMission}
      />

      {/* Defeat / Timeout Modal */}
      {isDefeated && (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-red-950/90 border-2 border-red-500 flex items-center justify-center text-3xl mb-4 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            ⚠️
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-cairo text-red-400 mb-2">
            {defeatReason === 'timeout'
              ? 'نفد الوقت المخصص لترتيب العمليات العسكرية!'
              : 'فشلت الخطة العسكرية وتكررت الأخطاء التكتيكية!'}
          </h3>

          <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
            {defeatReason === 'timeout'
              ? `عليك ترتيب خطوات معركة الدبابات وحائط الصواريخ قبل نفاد الوقت (${missionDuration} ثانية).`
              : 'اخترق اللواء 190 مدرع النسق الدفاعي نتيجة الأخطاء في تسلسل خطة المعركة. تذكر: الاستطلاع ⬅️ كمين ساجر ⬅️ حائط الصواريخ ⬅️ استدراج العدو ⬅️ اشتباك دبابات T-62 ⬅️ استسلام قائد العدو.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={initMission}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95 text-xs sm:text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة المحاولة
            </button>

            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للقائمة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
