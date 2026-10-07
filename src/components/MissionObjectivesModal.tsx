import React, { useEffect, useState } from 'react';
import { sound } from '../utils/audio';
import { narration } from '../utils/narration';
import { GameMode } from '../types';
import { MISSIONS } from '../data/historyData';
import { Target, BookOpen, Shield, Crosshair, ArrowRight, Play, Sparkles, X, Volume2, VolumeX, Image as ImageIcon, FileText, Radio } from 'lucide-react';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface MissionObjectivesModalProps {
  isOpen: boolean;
  missionId: GameMode;
  difficulty?: Difficulty;
  onStartMission: () => void;
  onClose: () => void;
}

export const MissionObjectivesModal: React.FC<MissionObjectivesModalProps> = ({
  isOpen,
  missionId,
  difficulty = 'normal',
  onStartMission,
  onClose,
}) => {
  const [imageOnlyMode, setImageOnlyMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(narration.isEnabled());

  const mission = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;

  const TACTICAL_TIPS: Record<string, { controls: string; proTip: string; dangerNote: string }> = {
    MISSION_AIR_STRIKE: {
      controls: 'حرّك الماوس أو إصبعك لتوجيه طائرة الميج-21، انقر لإطلاق المدافع الرشاشة، واستخدم زر الصاروخ لإطلاق صواريخ ذاتية التوجيه.',
      proTip: 'الصواريخ موجهة وتتعقب مقاتلات العدو ومحطات الرادار تلقائياً بمجرد إطلاقها!',
      dangerNote: 'احذر! البقاء على الأرض لفترة طويلة يؤدي للانفجار، والتحليق العالي يكشفك لرادارات العدو (أم مرجم) وصواريخ الهوك!',
    },
    MISSION_CROSSING: {
      controls: 'وجّه خراطيم المياه التوربينية نحو الساتر الترابي لإذابته، وانقر لإنزال قوارب المشاة ودك دشم العدو.',
      proTip: 'التركيز على نقاط الرمال الأكثر كثافة يسرع فتح الثغرات وتدفق القوات.',
      dangerNote: 'تعامل مع رشاشات ودشم العدو لحماية قوارب الصاعقة أثناء العبور.',
    },
    MISSION_BRIDGE: {
      controls: 'انقر لتركيب أجزاء الكوبري العائم الستة، فعّل ستائر الدخان ومدافع م/ط، ثم أطلق الدبابات.',
      proTip: 'ستائر الدخان تعمي مدفعية العدو وتمنع قصف وتضرر بنتونات الجسر!',
      dangerNote: 'أصلح أي جزء متضرر فوراً لضمان عدم توقف تدفق أرتال الدبابات.',
    },
    MISSION_TANK_BATTLE: {
      controls: 'حرّك دبابتك، انقر لإطلاق قذائف المدفع، وانقر على دبابات العدو لإطلاق صواريخ ساجر (مالوتكا).',
      proTip: 'صواريخ ساجر تدمر دبابات العدو بضربة حاسمة واحدة من مسافة بعيدة!',
      dangerNote: 'احذر قذائف دبابات الباتون المركزة واستغل التضاريس والكمائن.',
    },
    MISSION_FORTRESS: {
      controls: 'وجّه بطل الصاعقة، اقطع أنابيب النابالم الحارق، دمر الدشم بالمتفجرات، وارفع العلم المصري.',
      proTip: 'قطع أنابيب النابالم يحيد الخطر الأكبر ويمهد الطريق لاقتحام الحصن.',
      dangerNote: 'حافظ على صحة الفصيلة من نيران قناصة ورشاشات الحصن الخرساني.',
    },
  };

  const tips = TACTICAL_TIPS[missionId] || TACTICAL_TIPS.MISSION_AIR_STRIKE;

  // Text-to-Speech briefing narration script with immersive 1973 military command styling
  const getNarrationScript = () => {
    const obj1 = missionId === 'MISSION_AIR_STRIKE'
      ? `تدمير ${diffConfig.requiredAirStrikeStations} محطات رادار ودشم أرضية من أصل 6 محطات لتحقيق النصر الحاسم`
      : (mission.objectives[0] || 'تدمير الأهداف المحددة');
    const obj2 = mission.objectives[1] || 'حماية القوات المتقدمة';
    const obj3 = mission.objectives[2] || 'تحقيق النصر التام';

    if (missionId === 'MISSION_AIR_STRIKE') {
      return `بيان القيادة العامة للقوات المسلحة. ساعة الصفر: السادس من أكتوبر 1973، الساعة الثانية ظهراً. المهمة الأولى: الضربة الجوية الافتتاحية الكبرى. مستوى الصعوبة: ${diffConfig.label}. نسور القوات الجوية المصرية، شرط النصر الوحيد هو تدمير ${diffConfig.requiredAirStrikeStations} محطات من أصل 6 محطات رادار ودشم أرضية للعدو. تنبيه عملياتي بالغ الأهمية: احذروا الاصطدام بالأرض، وتفادوا التحليق الشاهق لتجنب كشف رادارات العدو. توكلوا على الله، الله أكبر، والنصر لمصر!`;
    } else if (missionId === 'MISSION_CROSSING') {
      return `بيان عسكري. المرحلة الثانية: طوفان العبور واقتحام الساتر الترابي لخط بارليف. رجال سلاح المهندسين والمشاة البواسل، إليكم أهداف العملية: أولاً: ${obj1}. ثانياً: ${obj2}. ثالثاً: ${obj3}. وجهوا مضخات مياه القناة التوربينية لفتح الثغرات ودكوا دشم العدو لتأمين عبور قوارب الصاعقة. الله أكبر، فوق كيد المعتدي!`;
    } else if (missionId === 'MISSION_BRIDGE') {
      return `بيان عسكري. المرحلة الثالثة: كباري النصر وجسور العبور العائمة. أبطال سلاح المهندسين، إليكم الأهداف الميدانية: أولاً: ${obj1}. ثانياً: ${obj2}. ثالثاً: ${obj3}. نصب ستين جسراً تحت وابل نيران العدو، وتأمين تدفق أرتال الدبابات إلى أرض سيناء الحبيبة. انطلقوا على بركة الله!`;
    } else if (missionId === 'MISSION_TANK_BATTLE') {
      return `بيان عسكري. المرحلة الرابعة: مقبرة الدبابات وصائدو الدروع في سيناء. فرسان سلاح المدرعات والصواريخ المضادة للدروع، أهدافكم هي: أولاً: ${obj1}. ثانياً: ${obj2}. ثالثاً: ${obj3}. اكمنوا لدبابات العدو بصواريخ ساجر وحطموا لواء المدرعات المعادي. النصر حليفكم والله معكم!`;
    } else {
      return `بيان عسكري. المرحلة الخامسة: اقتحام حصن خط بارليف ورفع علم مصر. بواسل قوات الصاعقة المصرية، أهدافكم هي: أولاً: ${obj1}. ثانياً: ${obj2}. ثالثاً: ${obj3}. اقتحموا الدشم المحصنة واقطعوا أنابيب النابالم الحارق، وارفعوا علم مصر خفاقاً في سماء سيناء. الله أكبر والنصر لمصر!`;
    }
  };

  // Start TTS narration when modal opens (ONLY if TTS is enabled by user)
  useEffect(() => {
    if (!isOpen) {
      narration.stop();
      setIsSpeaking(false);
      return;
    }

    // Respect user's choice: do NOT auto-play if TTS is disabled
    if (!narration.isEnabled()) {
      setIsSpeaking(false);
      return;
    }

    const script = getNarrationScript();
    sound.playRadioClick();

    const timer = setTimeout(() => {
      narration.speak(script, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      narration.stop();
      setIsSpeaking(false);
    };
  }, [isOpen, missionId, difficulty]);

  if (!isOpen) return null;

  const handleToggleNarration = () => {
    narration.unlockMobile();
    sound.playRadioClick();

    if (isSpeaking) {
      narration.stop();
      setIsSpeaking(false);
    } else {
      // If currently disabled, re-enable it
      if (!narration.isEnabled()) {
        narration.setEnabled(true);
        setIsTtsEnabled(true);
      }
      narration.speak(getNarrationScript(), {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  const handleToggleTtsMaster = () => {
    narration.unlockMobile();
    sound.playRadioClick();
    const next = narration.toggleEnabled();
    setIsTtsEnabled(next);
    if (!next) {
      narration.stop();
      setIsSpeaking(false);
    } else {
      narration.speak(getNarrationScript(), {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  const handleStart = () => {
    narration.unlockMobile();
    narration.stop();
    setIsSpeaking(false);
    sound.playCountdownBeep(false);
    onStartMission();
  };

  const handleCloseModal = () => {
    narration.stop();
    setIsSpeaking(false);
    sound.playRadioClick();
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[110] bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl bg-stone-900 border-3 sm:border-4 border-amber-500/80 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col my-auto max-h-[95vh] overflow-hidden">
        {/* Top Military Command Header */}
        <div className="bg-amber-500 text-stone-950 px-3 sm:px-5 py-2.5 border-b-3 border-black flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="bg-red-600 text-white font-mono text-[10px] sm:text-xs font-black px-2 py-0.5 rounded border border-black shadow">
              المرحلة {mission.number}
            </span>
            <div className="text-right">
              <h2 className="text-sm sm:text-lg font-black font-cairo text-stone-950 leading-tight">
                {mission.title}
              </h2>
              <span className="text-[10px] sm:text-xs font-bold text-stone-900">
                {mission.subtitle} · {mission.timeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Optional Master TTS Narration Switch */}
            <button
              type="button"
              onClick={handleToggleTtsMaster}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold font-cairo flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow ${
                isTtsEnabled
                  ? (isSpeaking ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-emerald-950 text-emerald-300 border-emerald-500/80')
                  : 'bg-stone-900 text-stone-400 border-stone-700'
              }`}
              title={isTtsEnabled ? 'الراوي الصوتي مفعل (انقر للتعطيل)' : 'الراوي الصوتي معطل (انقر للتفعيل)'}
            >
              {isTtsEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">{isSpeaking ? 'جاري التلاوة...' : 'الراوي: مفعّل'}</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                  <span className="hidden xs:inline">الراوي: معطّل</span>
                </>
              )}
            </button>

            {/* Toggle Image Only / Full Details Mode */}
            <button
              type="button"
              onClick={() => {
                sound.playRadioClick();
                setImageOnlyMode(!imageOnlyMode);
              }}
              className="px-2.5 py-1 rounded-lg bg-stone-950 text-amber-300 hover:text-white border border-amber-400/80 text-[11px] font-bold font-cairo flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
              title={imageOnlyMode ? 'عرض تفاصيل وأهداف المعركة' : 'عرض اللوحة الفنية كاملة بدون نصوص'}
            >
              {imageOnlyMode ? (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">الأهداف والتفاصيل</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>الصورة فقط</span>
                </>
              )}
            </button>

            <button
              onClick={handleCloseModal}
              className="p-1 sm:p-1.5 rounded-lg bg-stone-950/20 hover:bg-stone-950/40 text-stone-950 transition-colors cursor-pointer"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Live Speaking Indicator Banner */}
        {isSpeaking && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-3 py-1.5 flex items-center justify-between text-xs text-amber-300 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>🎙️ القيادة العامة تتلو الأهداف والتوجيهات العسكرية الآن...</span>
            </div>
            <button
              type="button"
              onClick={handleToggleNarration}
              className="text-[10px] text-stone-300 bg-stone-900 px-2 py-0.5 rounded border border-stone-700 hover:text-white"
            >
              إيقاف الصوت ⏸️
            </button>
          </div>
        )}

        {/* Modal Body */}
        {imageOnlyMode ? (
          /* Pure Full-Artwork Mode (Ideal for mobile landscape unobstructed view) */
          <div className="relative flex-1 w-full min-h-[300px] overflow-hidden bg-black flex items-center justify-center p-1">
            <img
              src={mission.image}
              alt={mission.title}
              className="w-full h-full max-h-[68vh] object-contain object-center filter saturate-125 contrast-110 brightness-95 rounded-xl"
            />
            <div className="absolute bottom-3 right-3 bg-stone-950/85 border border-amber-500/60 rounded-xl px-3 py-1.5 backdrop-blur-md text-amber-300 text-xs font-bold font-cairo shadow-lg">
              {mission.title} · {mission.timeLabel}
            </div>
          </div>
        ) : (
          /* Detailed Objectives & Historical Context View */
          <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 text-right flex-1">
            {/* Hero Artwork Banner */}
            <div className="relative w-full h-32 sm:h-44 rounded-xl overflow-hidden border-2 border-stone-800 shadow-inner shrink-0">
              <img
                src={mission.image}
                alt={mission.title}
                className="w-full h-full object-cover object-center filter saturate-125 brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
              <div className="absolute bottom-2 right-3 text-right max-w-lg">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/90 text-stone-950 font-black text-[10px] sm:text-[11px] rounded mb-1 shadow">
                  <Sparkles className="w-3 h-3" />
                  ساعة الصفر: 6 أكتوبر 1973
                </span>
                <p className="text-[11px] sm:text-xs font-medium font-cairo text-stone-200 line-clamp-2">
                  {mission.description}
                </p>
              </div>
            </div>

            {/* 1. Historical Context Box (السياق التاريخي لمعركة أكتوبر 1973) */}
            <div className="p-3 sm:p-3.5 bg-amber-950/30 border border-amber-600/40 rounded-xl shadow-inner">
              <div className="flex items-center gap-2 mb-1 text-amber-400 font-bold font-cairo text-xs sm:text-sm">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span>السياق التاريخي لمعركة أكتوبر 1973:</span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-200 leading-relaxed font-tajawal">
                {mission.historicalContext}
              </p>
            </div>

            {/* 2. Mission Objectives Box (أهداف المهمة القتالية الميدانية) */}
            <div className="p-3 sm:p-3.5 bg-stone-950/80 border border-stone-800 rounded-xl shadow-inner">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-cairo text-xs sm:text-sm">
                  <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>أهداف المهمة القتالية المطلوبة للانتصار:</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNarration}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-bold font-cairo flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="الاستماع لتلاوة أهداف المعركة صوتياً"
                >
                  <Radio className={`w-3.5 h-3.5 ${isSpeaking ? 'text-red-400 animate-ping' : 'text-amber-400'}`} />
                  <span>{isSpeaking ? 'إيقاف الراوي الصوتي ⏸️' : 'استمع لأهداف المعركة 🎙️'}</span>
                </button>
              </div>
              {/* Air Strike Specific Station Objective Callout */}
              {missionId === 'MISSION_AIR_STRIKE' && (
                <div className="bg-red-950/40 p-2.5 rounded-lg border border-red-500/60 mb-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-red-300 mb-1 flex-wrap gap-1">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>شرط النصر الحاسم: تدمير محطات العدو الأرضية</span>
                    </span>
                    <span className="text-[10px] font-mono bg-red-900/80 text-white px-2 py-0.5 rounded border border-red-500">
                      المطلوب: {diffConfig.requiredAirStrikeStations} من 6 محطات ({diffConfig.label})
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    إسقاط طائرات الفانتوم لا يكفي للفوز! يجب قصف وتدمير <strong>{diffConfig.requiredAirStrikeStations} محطات رادار ودشم ومطارات أرضية</strong> لتأمين النصر واكتمال المهمة.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs text-stone-300">
                {mission.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 bg-stone-900/70 p-2 rounded-lg border border-stone-800/80">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    <span className="leading-snug">{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Tactical Intel & Danger Rules */}
            <div className="p-3 sm:p-3.5 bg-stone-950/80 border border-amber-500/30 rounded-xl space-y-2 text-[11px] sm:text-xs">
              <div className="flex items-start gap-2 text-sky-300">
                <Crosshair className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sky-400 block mb-0.5">طريقة التحكم:</span>
                  <span className="text-stone-300 leading-relaxed">{tips.controls}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-amber-300 pt-1.5 border-t border-stone-800">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-400 block mb-0.5">نصيحة تكتيكية:</span>
                  <span className="text-stone-300 leading-relaxed">{tips.proTip}</span>
                </div>
              </div>

              {tips.dangerNote && (
                <div className="flex items-start gap-2 text-red-300 pt-1.5 border-t border-stone-800">
                  <span className="text-base shrink-0">⚠️</span>
                  <div>
                    <span className="font-bold text-red-400 block mb-0.5">تحذير أمني وميداني:</span>
                    <span className="text-stone-300 leading-relaxed">{tips.dangerNote}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Bar: Single Launch Button Direct to Battle */}
        <div className="bg-stone-950 p-2.5 sm:p-3 border-t-2 border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold font-cairo text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لغرفة العمليات</span>
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto flex-1 sm:flex-initial px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black font-cairo text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>الانطلاق للعملية ⚡</span>
          </button>
        </div>
      </div>
    </div>
  );
};
