import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Target,
  Sparkles,
  Flame,
  Radio,
  Clock,
  Video,
  ChevronUp,
  ChevronDown,
  Check,
  Compass,
} from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';
import { isGamePaused } from '../game/pause';
import { Difficulty } from '../game/difficulty';

interface TankBattleMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
  onOpenTutorialVideo?: () => void;
}

export interface TacticalBattleEvent {
  id: string;
  order: number; // 1 to 8 absolute chronological order
  timeLabel: string;
  dateLabel: string;
  title: string;
  shortTitle: string;
  description: string;
  significance: string;
  enemyForce: string;
  egyptianForce: string;
  iconName: 'air' | 'crossing' | 'missile' | 'tank' | 'ambush' | 'sagger' | 'capture';
}

// Complete authentic historical timeline of the October 1973 Tank Battle & Sagger Ambush
const ALL_HISTORICAL_EVENTS: TacticalBattleEvent[] = [
  {
    id: 'evt-1',
    order: 1,
    timeLabel: '14:15 ظهراً',
    dateLabel: '6 أكتوبر 1973',
    title: 'الضربة الجوية الافتتاحية وفتح ثغرات الساتر الترابي',
    shortTitle: 'ساعة الصفر وتجريف الساتر',
    description: 'تمهيد مدفعي وجوي كاسح من 222 طائرة وفتح ثغرات خط بارليف بمضخات المياه العملاقة.',
    significance: 'شل مراكز القيادة والسيطرة الإسرائيلية وتأمين رأس الكوبري الأولي.',
    enemyForce: 'دشم وتحصينات خط بارليف',
    egyptianForce: 'القوات الجوية وسلاح المهندسين',
    iconName: 'air',
  },
  {
    id: 'evt-2',
    order: 2,
    timeLabel: '18:30 مساءً',
    dateLabel: '6 أكتوبر 1973',
    title: 'تدفق طلائع المشاة والصاعقة وتأسيس رؤوس الجسور',
    shortTitle: 'عبور المشاة ونصب الكمائن',
    description: 'صعود 80 ألف جندي مصري للضفة الشرقية ونصب منصات صواريخ م/د وتطويق نقاط العدو القوية.',
    significance: 'حرمان دبابات الاحتياطي الإسرائيلي من التقدم نحو حافة القناة مباشرة.',
    enemyForce: 'دوريات المدرعات التكتيكية',
    egyptianForce: 'قوات الصاعقة والمشاة المسلحة',
    iconName: 'crossing',
  },
  {
    id: 'evt-3',
    order: 3,
    timeLabel: '06:00 صباحاً',
    dateLabel: '7 أكتوبر 1973',
    title: 'نشر مظلة حائط الصواريخ وتحييد طيران الفانتوم',
    shortTitle: 'تفعيل حائط الصواريخ SAM',
    description: 'امتداد مظلة شبكة الدفاع الجوي (سام 2 و 3 و 6) وتكبيد سلاح الجو الإسرائيلي خسائر فادحة.',
    significance: 'حرمان الدبابات الإسرائيلية من أي غطاء جوي وفرض السيطرة على سماء المعركة.',
    enemyForce: 'مقاتلات فانتوم وسكاي هوك',
    egyptianForce: 'قوات الدفاع الجوي المصري',
    iconName: 'missile',
  },
  {
    id: 'evt-4',
    order: 4,
    timeLabel: '10:00 صباحاً',
    dateLabel: '7 أكتوبر 1973',
    title: 'عبور دبابات T-55 و T-62 وتجهيز مرابض الرمال',
    shortTitle: 'عبور الدروع والمواضع الدفاعية',
    description: 'تدفق الألوية المدرعة عبر الكباري الثقيلة واحتلال مواقع الدفن التكتيكي بين الكثبان الرملية.',
    significance: 'بناء حائط ناري مدرع متكامل مع صائدي الدبابات بالصواريخ.',
    enemyForce: 'استطلاعات الدروع المعادية',
    egyptianForce: 'الفرقة 2 مشاة والفرقة 16 مشاة',
    iconName: 'tank',
  },
  {
    id: 'evt-5',
    order: 5,
    timeLabel: '07:30 صباحاً',
    dateLabel: '8 أكتوبر 1973',
    title: 'رصد تقدم اللواء 190 مدرع المعادي باتجاه الفردان',
    shortTitle: 'بدء الهجوم المضاد الإسرائيلي',
    description: 'انطلاق أكثر من 100 دبابة إسرائيلية بقيادة العقيد عساف ياجوري بهجوم مضاد عنيف وواثق.',
    significance: 'محاولة إسرائيلية يائسة لاختراق القوات المصرية وإلقائها مجدداً في مياه القناة.',
    enemyForce: 'اللواء 190 مدرع (دبابات باتون M60)',
    egyptianForce: 'استطلاع المدفعية والفرقة الثانية',
    iconName: 'tank',
  },
  {
    id: 'evt-6',
    order: 6,
    timeLabel: '09:15 صباحاً',
    dateLabel: '8 أكتوبر 1973',
    title: 'استدراج دبابات العدو داخل كمين الفردان (مصيدة الموت)',
    shortTitle: 'تطويق العدو داخل كمين القوس',
    description: 'القيادة المصرية تأمر بضبط النفس والصمت اللاسلكي حتى دخل اللواء الإسرائيلي في عمق الجيب الدفاعي.',
    significance: 'إطباق كماشة نيرانية ثلاثية المحاور على كامل دروع العدو من الأمام والجانبين.',
    enemyForce: 'أرتال دبابات باتون محاصرة بالكامل',
    egyptianForce: 'كتائب المشاة والمدفعية المضادة للدروع',
    iconName: 'ambush',
  },
  {
    id: 'evt-7',
    order: 7,
    timeLabel: '11:30 صباحاً',
    dateLabel: '8 أكتوبر 1973',
    title: 'انطلاق صواريخ الساجر وحصاد صائد الدبابات عبد العاطي',
    shortTitle: 'جحيم صواريخ الساجر الموجهة',
    description: 'فتح النيران المفاجئة بالصواريخ السلكية وقذائف الـ RPG واشتعال عشرات الدبابات المعادية في دقائق.',
    significance: 'تدمير أكثر من 70 دبابة ومدرعة معادية في ملحمة صائدي الدبابات الأسطورية.',
    enemyForce: 'انهيار وتدمير أرتال اللواء 190',
    egyptianForce: 'البطل محمد عبد العاطي وفرسان الصواريخ',
    iconName: 'sagger',
  },
  {
    id: 'evt-8',
    order: 8,
    timeLabel: '14:00 ظهراً',
    dateLabel: '8 أكتوبر 1973',
    title: 'سحق ما تبقى من اللواء 190 وأسر قائده عساف ياجوري حياً',
    shortTitle: 'أسر العقيد عساف ياجوري وإعلان النصر',
    description: 'تدمير آخر دبابات اللواء واستسلام قائده العقيد عساف ياجوري حياً للأبطال المصريين.',
    significance: 'أكبر هزيمة مدرعة لإسرائيل في التاريخ وإثبات عبقرية التخطيط والتنفيذ العسكري المصري.',
    enemyForce: 'استسلام بقايا أطقم دبابات العدو',
    egyptianForce: 'أبطال الفرقة الثانية مشاة ميكانيكي',
    iconName: 'capture',
  },
];

export const TankBattleMission: React.FC<TankBattleMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
  onOpenTutorialVideo,
}) => {
  // Difficulty settings
  const eventCount = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 8 : 6;
  const initialDuration = difficulty === 'easy' ? 150 : difficulty === 'hard' ? 90 : 120;
  const maxAllowedMistakes = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 1 : 2;

  // Selected events subset based on difficulty
  const activeEventsRef = useRef<TacticalBattleEvent[]>([]);
  if (activeEventsRef.current.length === 0) {
    if (difficulty === 'easy') {
      // 4 key milestones: [1, 3, 6, 8] re-indexed 1 to 4
      activeEventsRef.current = [
        { ...ALL_HISTORICAL_EVENTS[0], order: 1 },
        { ...ALL_HISTORICAL_EVENTS[2], order: 2 },
        { ...ALL_HISTORICAL_EVENTS[5], order: 3 },
        { ...ALL_HISTORICAL_EVENTS[7], order: 4 },
      ];
    } else if (difficulty === 'normal') {
      // 6 key milestones: [1, 2, 3, 5, 7, 8] re-indexed 1 to 6
      activeEventsRef.current = [
        { ...ALL_HISTORICAL_EVENTS[0], order: 1 },
        { ...ALL_HISTORICAL_EVENTS[1], order: 2 },
        { ...ALL_HISTORICAL_EVENTS[2], order: 3 },
        { ...ALL_HISTORICAL_EVENTS[4], order: 4 },
        { ...ALL_HISTORICAL_EVENTS[6], order: 5 },
        { ...ALL_HISTORICAL_EVENTS[7], order: 6 },
      ];
    } else {
      // 8 full historical events for hard mode
      activeEventsRef.current = ALL_HISTORICAL_EVENTS.map((e) => ({ ...e }));
    }
  }

  // Shuffle events initially so player must sort them
  const shuffleEvents = (events: TacticalBattleEvent[]) => {
    const list = [...events];
    let isSameOrder = true;
    while (isSameOrder && list.length > 1) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      isSameOrder = list.every((item, idx) => item.order === idx + 1);
    }
    return list;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Gameplay State
  const [orderedEvents, setOrderedEvents] = useState<TacticalBattleEvent[]>(() =>
    shuffleEvents(activeEventsRef.current)
  );
  const [lockedEvents, setLockedEvents] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(initialDuration);
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [defenseHealth, setDefenseHealth] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>(
    'رتب الأحداث التاريخية لمعركة الدبابات وحائط الصواريخ بالترتيب الزمني الصحيح 📜'
  );
  const [feedbackType, setFeedbackType] = useState<'info' | 'success' | 'danger'>('info');
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isDefeated, setIsDefeated] = useState<boolean>(false);
  const [defeatReason, setDefeatReason] = useState<string>('');
  const [hintsAvailable, setHintsAvailable] = useState<number>(difficulty === 'easy' ? 3 : difficulty === 'normal' ? 2 : 1);
  const [activeHintEventId, setActiveHintEventId] = useState<string | null>(null);

  // Dynamic visual animation state on Canvas
  const animStateRef = useRef({
    step: 0,
    missileFlying: false,
    missileProgress: 0,
    missileStartY: 220,
    tankTargetX: 720,
    tankTargetY: 210,
    explosionTimer: 0,
    explosionX: 720,
    explosionY: 210,
    tanksDestroyedVisual: 0,
    enemyAdvanceProgress: 0,
    screenShake: 0,
  });

  // Calculate remaining unverified/unplaced events
  const remainingCount = activeEventsRef.current.length - lockedEvents.size;

  // Sound & Visual Trigger on verification
  const triggerMissileStrike = useCallback((targetIndex: number) => {
    sound.playMissileLaunch();
    const anim = animStateRef.current;
    anim.missileFlying = true;
    anim.missileProgress = 0;
    anim.tankTargetX = 640 + (targetIndex % 3) * 110;
    anim.tankTargetY = 190 + Math.sin(targetIndex) * 35;

    window.setTimeout(() => {
      anim.missileFlying = false;
      anim.explosionTimer = 35;
      anim.explosionX = anim.tankTargetX;
      anim.explosionY = anim.tankTargetY;
      anim.tanksDestroyedVisual += 1;
      anim.screenShake = 12;
      sound.playExplosion(1.2);
    }, 450);
  }, []);

  const triggerEnemyCounterFire = useCallback(() => {
    sound.playHitSound();
    const anim = animStateRef.current;
    anim.screenShake = 16;
    anim.enemyAdvanceProgress = Math.min(100, anim.enemyAdvanceProgress + 25);
  }, []);

  // Main 1-second Interval for Battle Clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isGamePaused() || isWon || isDefeated) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsDefeated(true);
          setDefeatReason('timeout');
          sound.playDefeatSound();
          onDefeat?.('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isWon, isDefeated, onDefeat]);

  // Canvas visual battlefield background animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const anim = animStateRef.current;
      anim.step += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Handle Screen Shake
      ctx.save();
      if (anim.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * anim.screenShake;
        const shakeY = (Math.random() - 0.5) * anim.screenShake;
        ctx.translate(shakeX, shakeY);
        anim.screenShake = Math.max(0, anim.screenShake - 1);
      }

      // 1. Sky & Sinai Sunset Battlefield Lighting
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      skyGrad.addColorStop(0, '#0c1a2c');
      skyGrad.addColorStop(0.4, '#1e293b');
      skyGrad.addColorStop(0.75, '#78350f');
      skyGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Distant Sinai Sand Dunes & Mountains
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, 160);
      ctx.bezierCurveTo(240, 130, 480, 180, 720, 140);
      ctx.bezierCurveTo(860, 120, 1050, 165, w, 150);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Middle Ground Desert Plateau (Battlefield ground)
      const groundGrad = ctx.createLinearGradient(0, 150, 0, h);
      groundGrad.addColorStop(0, '#78350f');
      groundGrad.addColorStop(0.3, '#92400e');
      groundGrad.addColorStop(0.7, '#a16207');
      groundGrad.addColorStop(1, '#713f12');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 160, w, h - 160);

      // Desert sand ridges and tank tracks
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const yLine = 190 + i * 25;
        ctx.beginPath();
        ctx.moveTo(0, yLine + Math.sin(i * 1.5) * 5);
        ctx.bezierCurveTo(300, yLine - 8, 700, yLine + 8, w, yLine - 5);
        ctx.stroke();
      }

      // 3. EGYPTIAN DEFENSE SECTOR (Left side - Bridgehead at El-Ferdan)
      // Sand rampart fortification
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, 190);
      ctx.lineTo(260, 200);
      ctx.lineTo(240, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Egyptian Sandbag Fortifications
      ctx.fillStyle = '#d97706';
      for (let sb = 0; sb < 8; sb++) {
        ctx.fillRect(40 + sb * 24, 215, 20, 10);
        ctx.fillRect(52 + sb * 22, 207, 18, 9);
      }

      // Dug-in Egyptian T-62 Tank in Hull-Down position
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(80, 230, 75, 25);
      // Turret
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(115, 226, 22, Math.PI, 0);
      ctx.fill();
      // Cannon pointing right towards advancing tanks
      ctx.strokeStyle = '#0c0a09';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(130, 220);
      ctx.lineTo(195, 214);
      ctx.stroke();

      // Egyptian Flag flapping proudly on rampart
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, 180);
      ctx.lineTo(60, 240);
      ctx.stroke();
      // Tri-color Egyptian Flag
      const flagWave = Math.sin(anim.step * 0.12) * 4;
      ctx.fillStyle = '#dc2626'; // Red
      ctx.fillRect(62, 180 + flagWave * 0.2, 28, 6);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(62, 186 + flagWave * 0.5, 28, 6);
      ctx.fillStyle = '#000000'; // Black
      ctx.fillRect(62, 192 + flagWave * 0.8, 28, 6);
      // Golden Eagle emblem
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(76, 189 + flagWave * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Sagger ATGM Missile Operator (صائد الدبابات)
      ctx.fillStyle = '#15803d'; // Green Egyptian uniform
      ctx.fillRect(205, 218, 12, 16);
      ctx.fillStyle = '#fde047'; // Helmet
      ctx.beginPath();
      ctx.arc(211, 214, 5, 0, Math.PI * 2);
      ctx.fill();
      // Sagger suitcase missile launcher on tripod
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(218, 222, 16, 6);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(226, 228);
      ctx.lineTo(220, 238);
      ctx.moveTo(226, 228);
      ctx.lineTo(232, 238);
      ctx.stroke();

      // SAM-6 Missile Battery in the background
      ctx.fillStyle = '#334155';
      ctx.fillRect(15, 175, 28, 14);
      ctx.strokeStyle = '#f87171'; // Red missile tips
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 175);
      ctx.lineTo(38, 155);
      ctx.moveTo(26, 175);
      ctx.lineTo(44, 155);
      ctx.stroke();

      // 4. ADVANCING ISRAELI TANK BATTALION (Right side)
      const enemyTanks = [
        { x: 620, y: 220, type: 'Patton M60', isLead: false },
        { x: 740, y: 205, type: 'Centurion', isLead: false },
        { x: 860, y: 235, type: 'Col. Asaf Yaguri (190th Brigade)', isLead: true },
        { x: 970, y: 215, type: 'Patton M60', isLead: false },
      ];

      enemyTanks.forEach((tank, idx) => {
        const isDestroyed = idx < anim.tanksDestroyedVisual;
        const tx = tank.x - (anim.enemyAdvanceProgress * 0.8);
        const ty = tank.y;

        ctx.save();
        if (isDestroyed) {
          // Burned out wreckage with smoke
          ctx.fillStyle = '#292524';
          ctx.fillRect(tx - 30, ty - 10, 60, 20);
          // Turret blown off or askew
          ctx.beginPath();
          ctx.arc(tx, ty - 12, 14, 0, Math.PI * 2);
          ctx.fill();
          // Cannon bent down
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx - 8, ty - 12);
          ctx.lineTo(tx - 35, ty + 8);
          ctx.stroke();

          // Smoke and flame billows
          for (let p = 0; p < 4; p++) {
            const pTime = (anim.step * 0.05 + p * 1.5) % 4;
            const smokeY = ty - 15 - pTime * 14;
            const smokeX = tx + Math.sin(anim.step * 0.08 + p) * 8;
            ctx.fillStyle = p % 2 === 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(55, 65, 81, 0.55)';
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, 6 + pTime * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Active enemy tank
          ctx.fillStyle = '#78716c'; // Israeli desert camouflage gray
          ctx.fillRect(tx - 30, ty - 10, 60, 20);
          // Wheels / Treads
          ctx.fillStyle = '#1c1917';
          for (let wIdx = 0; wIdx < 5; wIdx++) {
            ctx.beginPath();
            ctx.arc(tx - 22 + wIdx * 11, ty + 10, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          // Turret
          ctx.fillStyle = '#a8a29e';
          ctx.beginPath();
          ctx.arc(tx, ty - 12, 15, Math.PI, 0);
          ctx.fill();
          // Main Gun pointing Left towards Egyptian lines
          ctx.strokeStyle = '#57534e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx - 5, ty - 14);
          ctx.lineTo(tx - 48, ty - 16);
          ctx.stroke();

          // Tank label
          ctx.font = 'bold 9px Tajawal, sans-serif';
          ctx.fillStyle = tank.isLead ? '#f87171' : '#fef08a';
          ctx.textAlign = 'center';
          ctx.fillText(tank.type, tx, ty - 26);

          // White flag if won and this is commander tank
          if (isWon && tank.isLead) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tx, ty - 45, 16, 11);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty - 45);
            ctx.lineTo(tx, ty - 30);
            ctx.stroke();
            ctx.fillStyle = '#22c55e';
            ctx.fillText('أسر عساف ياجوري 🎯', tx + 8, ty - 50);
          }
        }
        ctx.restore();
      });

      // 5. ATGM Sagger In-Flight Guided Missile Animation
      if (anim.missileFlying) {
        anim.missileProgress = Math.min(1, anim.missileProgress + 0.05);
        const startX = 230;
        const startY = 222;
        const curX = startX + (anim.tankTargetX - startX) * anim.missileProgress;
        const curY =
          startY +
          (anim.tankTargetY - startY) * anim.missileProgress +
          Math.sin(anim.missileProgress * Math.PI) * -35;

        // Smoke / wire trail
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(curX, curY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Missile Body
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(curX, curY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Rocket exhaust plume
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(curX - 6, curY + (Math.random() - 0.5) * 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Secondary Explosions on Tanks
      if (anim.explosionTimer > 0) {
        anim.explosionTimer -= 1;
        const exRadius = (35 - anim.explosionTimer) * 1.5;
        const grad = ctx.createRadialGradient(
          anim.explosionX,
          anim.explosionY,
          2,
          anim.explosionX,
          anim.explosionY,
          exRadius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#fde047');
        grad.addColorStop(0.65, '#ea580c');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(anim.explosionX, anim.explosionY, exRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isWon]);

  // Player action: Move event UP in chronological queue
  const moveEventUp = (index: number) => {
    if (index <= 0 || isWon || isDefeated) return;
    sound.playRadioClick();
    setOrderedEvents((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  // Player action: Move event DOWN in chronological queue
  const moveEventDown = (index: number) => {
    if (index >= orderedEvents.length - 1 || isWon || isDefeated) return;
    sound.playRadioClick();
    setOrderedEvents((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  // Player action: Swap with selected item
  const handleSelectOrSwap = (id: string) => {
    if (isWon || isDefeated) return;
    if (lockedEvents.has(id)) {
      setFeedbackMessage('هذا الحدث مثبت بالفعل في ترتيبه التاريخي الصحيح! ✓');
      setFeedbackType('info');
      return;
    }

    if (!selectedEventId) {
      setSelectedEventId(id);
      sound.playRadioClick();
    } else if (selectedEventId === id) {
      setSelectedEventId(null);
    } else {
      // Swap positions
      sound.playRadioClick();
      setOrderedEvents((prev) => {
        const idxA = prev.findIndex((e) => e.id === selectedEventId);
        const idxB = prev.findIndex((e) => e.id === id);
        if (idxA === -1 || idxB === -1) return prev;
        const next = [...prev];
        [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
        return next;
      });
      setSelectedEventId(null);
    }
  };

  // Action: Validate & Execute Current Tactical Sequence
  const handleValidateSequence = () => {
    if (isWon || isDefeated) return;

    sound.playRadioTransmission();
    const newlyLocked = new Set(lockedEvents);
    let correctCount = 0;
    let wrongCount = 0;

    orderedEvents.forEach((event, index) => {
      const expectedOrder = index + 1;
      if (event.order === expectedOrder) {
        correctCount += 1;
        newlyLocked.add(event.id);
      } else {
        wrongCount += 1;
      }
    });

    setLockedEvents(newlyLocked);

    // If all events are in correct chronological sequence: VICTORY!
    if (correctCount === activeEventsRef.current.length) {
      setIsWon(true);
      const earnedScore = 3500 + timeLeft * 20 + (maxAllowedMistakes - mistakesCount) * 500;
      setScore(earnedScore);
      sound.playVictoryFanfare();
      triggerMissileStrike(3);
      setFeedbackMessage('الله أكبر! تم تنظيم التسلسل التكتيكي بنجاح وسحق اللواء 190 وأسر عساف ياجوري! 🇪🇬');
      setFeedbackType('success');
      return;
    }

    // Partial success or mistakes
    if (wrongCount > 0) {
      const newMistakes = mistakesCount + 1;
      setMistakesCount(newMistakes);
      const damagePercent = Math.round(100 / maxAllowedMistakes);
      const newHealth = Math.max(0, defenseHealth - damagePercent);
      setDefenseHealth(newHealth);

      triggerEnemyCounterFire();

      if (newMistakes >= maxAllowedMistakes || newHealth <= 0) {
        setIsDefeated(true);
        setDefeatReason('breach');
        sound.playDefeatSound();
        onDefeat?.('breach');
        setFeedbackMessage('فشلت الخطة: ارتباك في التسلسل الزمني أدى لاختراق دبابات العدو للنسق الدفاعي!');
        setFeedbackType('danger');
        return;
      }

      setFeedbackMessage(
        `تنبيه تكتيكي: ${correctCount} أحداث في مكانها الصحيح، لكن يوجد ${wrongCount} غير مرتبة زمنياً! حافظ على تركيزك (${newMistakes}/${maxAllowedMistakes} إصابات).`
      );
      setFeedbackType('danger');
    } else {
      triggerMissileStrike(correctCount);
      setScore((prev) => prev + correctCount * 400);
      setFeedbackMessage(`ممتاز! تم تثبيت ${correctCount} محطات تكتيكية بنجاح، أكمل ترتيب بقية الأحداث!`);
      setFeedbackType('success');
    }
  };

  // Provide tactical hint
  const handleUseHint = () => {
    if (hintsAvailable <= 0 || isWon || isDefeated) return;
    sound.playRadioClick();
    setHintsAvailable((prev) => prev - 1);

    // Find first misplaced event
    const misplaced = orderedEvents.find((evt, idx) => evt.order !== idx + 1 && !lockedEvents.has(evt.id));
    if (misplaced) {
      setActiveHintEventId(misplaced.id);
      setFeedbackMessage(
        `💡 تلميح تكتيكي: الحدث "${misplaced.shortTitle}" يقع في الترتيب رقم (${misplaced.order}) في المعركة (${misplaced.dateLabel} - ${misplaced.timeLabel})!`
      );
      setFeedbackType('info');
      window.setTimeout(() => setActiveHintEventId(null), 6000);
    }
  };

  // Reset mission state
  const handleResetMission = () => {
    sound.playRadioTransmission();
    setOrderedEvents(shuffleEvents(activeEventsRef.current));
    setLockedEvents(new Set());
    setSelectedEventId(null);
    setTimeLeft(initialDuration);
    setMistakesCount(0);
    setDefenseHealth(100);
    setScore(0);
    setIsWon(false);
    setIsDefeated(false);
    setDefeatReason('');
    setHintsAvailable(difficulty === 'easy' ? 3 : difficulty === 'normal' ? 2 : 1);
    setFeedbackMessage('رتب الأحداث التاريخية لمعركة الدبابات وحائط الصواريخ بالترتيب الزمني الصحيح 📜');
    setFeedbackType('info');
    animStateRef.current.tanksDestroyedVisual = 0;
    animStateRef.current.enemyAdvanceProgress = 0;
  };

  return (
    <div
      dir="rtl"
      className="w-full h-full min-h-0 flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden"
    >
      {/* 1. TOP RESPONSIVE MILITARY HUD (Meeting Request 4 with all essential stats) */}
      <div className="desktop-only-bar px-3 sm:px-4 py-2 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="العودة للقائمة"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {onOpenTutorialVideo && (
            <button
              onClick={onOpenTutorialVideo}
              className="px-2.5 py-1.5 rounded-lg bg-red-600/25 hover:bg-red-600/40 text-red-300 hover:text-white border border-red-500/50 text-xs font-bold font-cairo transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
              title="مشاهدة فيديو الشرح التكتيكي"
            >
              <Video className="w-4 h-4 text-red-400" />
              <span>فيديو الشرح 🎬</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-cairo font-black text-amber-400 text-sm sm:text-base leading-tight">
                المرحلة 4: ترتيب أحداث معركة الدبابات الكبرى وحائط الصواريخ
              </h2>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
                صد اللواء 190 مدرع
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-400 leading-tight">
              رتب الخطوات والعمليات العسكرية تاريخياً من ساعة الصفر حتى أسر عساف ياجوري
            </p>
          </div>
        </div>

        {/* Live Counters & Meters (Remaining, Casualties, Health, Score, Timer) */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono font-bold flex-wrap justify-end">
          {/* SCore */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-amber-300">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-stone-400 text-[10px] font-cairo">السكور:</span>
            <span>{score}</span>
          </div>

          {/* Remaining events to lock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-500/60 text-sky-300 font-mono font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            <span className="text-stone-300 text-xs font-cairo">الأحداث المتبقية:</span>
            <span className="text-sky-300 text-sm font-black">{remainingCount}</span>
            <span className="text-[10px] text-stone-400 font-cairo">أحداث ({lockedEvents.size}/{activeEventsRef.current.length})</span>
          </div>

          {/* Defense Health */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              defenseHealth < 40
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : 'bg-stone-900 border-stone-800 text-emerald-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-stone-400 text-[10px] font-cairo">صحة النسق:</span>
            <span>{defenseHealth}%</span>
          </div>

          {/* Casualties / Mistakes */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              mistakesCount > 0 ? 'bg-red-950/60 border-red-800 text-red-400' : 'bg-stone-900 border-stone-800 text-stone-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-stone-400 text-[10px] font-cairo">الإصابات:</span>
            <span>{mistakesCount}/{maxAllowedMistakes}</span>
          </div>

          {/* Digital Timer */}
          <MissionDigitalTimer timeLeft={timeLeft} totalTime={initialDuration} />
        </div>
      </div>

      {/* 2. DYNAMIC BATTLEFIELD SIMULATION CANVAS (Live missile launches & tank battles) */}
      <div className="relative w-full h-36 sm:h-44 md:h-52 bg-stone-950 border-b border-stone-800 shrink-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1100}
          height={320}
          className="w-full h-full object-fill block"
          aria-label="محاكاة معركة الدبابات وحائط الصواريخ"
        />

        {/* Tactical Feedback Strip Overlay */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div
            className={`px-3 py-1 rounded-lg text-xs font-bold font-cairo border backdrop-blur-md transition-all ${
              feedbackType === 'success'
                ? 'bg-emerald-950/85 border-emerald-500 text-emerald-300'
                : feedbackType === 'danger'
                ? 'bg-red-950/85 border-red-500 text-red-300 animate-pulse'
                : 'bg-stone-950/85 border-stone-700 text-amber-300'
            }`}
          >
            <span>{feedbackMessage}</span>
          </div>

          {/* Controls: Hints & Reset */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={handleUseHint}
              disabled={hintsAvailable <= 0 || isWon || isDefeated}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-cairo flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="تلميح استخباراتي لموضع أحد الأحداث"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>تلميح تكتيكي [{hintsAvailable}]</span>
            </button>

            <button
              onClick={handleResetMission}
              className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer"
              title="إعادة المحاولة"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE CHRONOLOGICAL EVENT TIMELINE DECK */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto bg-stone-950 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="font-bold font-cairo text-stone-200">
              سلسلة العمليات التكتيكية (استخدم أزرار الأسهم أو انقر للتبديل والترتيب من الأقدم للأحدث):
            </span>
          </div>
          <span className="text-[11px] text-amber-400 font-mono">
            {lockedEvents.size} / {activeEventsRef.current.length} مكتمل
          </span>
        </div>

        {/* Events List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {orderedEvents.map((evt, idx) => {
            const isLocked = lockedEvents.has(evt.id);
            const isSelected = selectedEventId === evt.id;
            const isHinted = activeHintEventId === evt.id;

            return (
              <div
                key={evt.id}
                onClick={() => handleSelectOrSwap(evt.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isLocked
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-default'
                    : isSelected
                    ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/50 scale-[1.01]'
                    : isHinted
                    ? 'bg-sky-950/70 border-sky-400 animate-pulse'
                    : 'bg-stone-900/90 hover:bg-stone-900 border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Slot Number Badge */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
                    isLocked
                      ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                      : isSelected
                      ? 'bg-amber-400 text-stone-950 border-amber-300'
                      : 'bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                >
                  {isLocked ? <Check className="w-4 h-4" /> : idx + 1}
                </div>

                {/* Event Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`font-cairo font-bold text-xs sm:text-sm leading-snug ${
                        isLocked ? 'text-emerald-300' : 'text-stone-100'
                      }`}
                    >
                      {evt.title}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400/90 bg-stone-950/80 px-1.5 py-0.5 rounded border border-stone-800 shrink-0">
                      {evt.timeLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-relaxed mb-1.5 line-clamp-2">
                    {evt.description}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-stone-500 flex-wrap">
                    <span className="text-emerald-400">🇪🇬 {evt.egyptianForce}</span>
                    <span>·</span>
                    <span className="text-red-400">⚔️ {evt.enemyForce}</span>
                  </div>
                </div>

                {/* Move Up / Down Buttons */}
                {!isLocked && (
                  <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => moveEventUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="تحريك لأعلى"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEventDown(idx)}
                      disabled={idx === orderedEvents.length - 1}
                      className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="تحريك لأسفل"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM ACTION CONTROL DECK */}
      <div className="p-3 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
        <div className="text-xs text-stone-400 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span>
            {lockedEvents.size === activeEventsRef.current.length
              ? 'تم ترتيب كافة الأحداث بالكامل! اضغط للتأكيد وحصد النصر.'
              : 'قم بترتيب كافة الأحداث زمنياً ثم اضغط لتأكيد التسلسل وفحصه.'}
          </span>
        </div>

        <button
          onClick={handleValidateSequence}
          disabled={isWon || isDefeated}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black font-cairo text-sm border-2 border-amber-300 shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          <Zap className="w-4 h-4 fill-stone-950" />
          <span>تأكيد وفحص التسلسل التكتيكي 🎯</span>
        </button>
      </div>

      {/* 5. VICTORY OVERLAY MODAL */}
      <VictoryModal
        isOpen={isWon}
        missionId="MISSION_TANK_BATTLE"
        missionTitle="المرحلة 4: معركة الدبابات الكبرى وحائط الصواريخ"
        congratulatoryMessage="مبروك النصر العظيم! تم ترتيب أحداث المعركة بدقة وصد هجوم اللواء 190 مدرع المعادي وأسر العقيد عساف ياجوري حياً!"
        score={score}
        timeLeft={timeLeft}
        targetsDestroyed={activeEventsRef.current.length}
        totalTargets={activeEventsRef.current.length}
        customStats={[
          { label: 'الأحداث التاريخية المرتبة', value: `${activeEventsRef.current.length} أحداث`, highlight: true },
          { label: 'سلامة النسق الدفاعي', value: `${defenseHealth}%`, highlight: true },
          { label: 'الإصابات والأخطاء التكتيكية', value: `${mistakesCount}` },
        ]}
        onNextMission={() => onComplete(score)}
        onReturnToBase={onExit}
        onReplay={handleResetMission}
      />

      {/* 6. DEFEAT OVERLAY MODAL */}
      {isDefeated && (
        <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse">
            <AlertTriangle className="w-9 h-9" />
          </div>

          <h3 className="text-2xl sm:text-3xl font-black font-cairo text-red-500 mb-2">
            {defeatReason === 'breach'
              ? 'فشلت المهمة: اختراق دبابات العدو للنسق الدفاعي!'
              : 'فشلت المهمة: نفد الوقت المحدد للملحمة!'}
          </h3>

          <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
            {defeatReason === 'breach'
              ? 'أدى الترتيب الزمني الخاطئ للعمليات إلى ثغرة تكتيكية مكنت مدرعات العدو من الالتفاف. راجع التسلسل التاريخي لحرب أكتوبر (من الضربة الجوية وحائط الصواريخ وصولاً لكمين الفردان) واستفد من التلميحات!'
              : 'انتهت المهلة الزمنية قبل استكمال تنظيم النسق التكتيكي لصد الهجوم المضاد. أعد المحاولة فوراً واعتمد على التواريخ وساعات الصفر لسرعة الترتيب!'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetMission}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-cairo rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة المحاولة فوراً</span>
            </button>

            <button
              type="button"
              onClick={onExit}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold font-cairo rounded-xl transition-all cursor-pointer"
            >
              <span>العودة للقائمة الرئيسية</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
