import React, { useState } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, BookOpen, ChevronRight, ChevronLeft, Play, Sparkles, Volume2, Shield } from 'lucide-react';
import { GameMode } from '../types';
import { ASSET_IMAGES } from '../data/historyData';

interface ComicStoryModalProps {
  onSelectMission: (mode: GameMode) => void;
  onClose: () => void;
}

interface ComicChapter {
  id: number;
  title: string;
  subtitle: string;
  missionId: GameMode;
  heroImage: string;
  badge: string;
  panels: {
    label: string;
    caption: string;
    soundEffect: string;
    speaker?: string;
    speech?: string;
    color: string;
  }[];
  historicQuote: string;
  quoteAuthor: string;
}

export const ComicStoryModal: React.FC<ComicStoryModalProps> = ({ onSelectMission, onClose }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  const CHAPTERS: ComicChapter[] = [
    {
      id: 1,
      title: 'ساعة الصفر: نسور الجو في سماء المعركة',
      subtitle: 'الساعة 14:00 - 6 أكتوبر 1973',
      missionId: 'MISSION_AIR_STRIKE',
      heroImage: ASSET_IMAGES.airStrike,
      badge: 'الضربة الجوية',
      panels: [
        {
          label: 'غرفة العمليات المركزية',
          caption: 'الساعة تدق الثانية ظهراً في سرية تامة.. القائد يعطي الإشارة التاريخية: انطلقوا باسم الله!',
          soundEffect: 'تيك.. توك.. زوووووم!',
          speaker: 'غرفة العمليات',
          speech: '«ساعة الصفر بدأت.. نسور مصر نحو أهدافهم!»',
          color: 'from-amber-600/30 to-amber-950/60',
        },
        {
          label: 'اختراق حاجز الصمت فوق القناة',
          caption: 'أكثر من 200 طائرة مقاتلة ميج-21 وسوخوي تحلق على ارتفاع أمتار قليلة فوق مياه القناة لتفادي رادارات العدو.',
          soundEffect: 'فششششش.. روووور!',
          speaker: 'قائد السرب',
          speech: '«الرادارات لم تكتشفنا.. الهجوم مباغت وصاعق!»',
          color: 'from-sky-600/30 to-slate-950/60',
        },
        {
          label: 'قصف مطارات ومراكز قيادة العدو',
          caption: 'صواريخ وقنابل نسور مصر تسقط على مدارج مطارات المليز وبير جفجافة وتشل 90% من قدرات العدو في 20 دقيقة.',
          soundEffect: 'BOOM!! طااااخ!',
          speaker: 'نسور الجو',
          speech: '«الهدف دُمّر بالكامل.. الله أكبر!»',
          color: 'from-red-600/30 to-amber-950/60',
        },
      ],
      historicQuote: '«لقد استعادت القوات الجوية المصرية شرف الأمة، وحلقت فوق سيناء لتكتب أول حروف النصر المبين.»',
      quoteAuthor: 'من مذكرات حرب أكتوبر المجيدة',
    },
    {
      id: 2,
      title: 'طوفان العبور: خراطيم المياه تذيب المستحيل',
      subtitle: 'الساعة 14:15 - اقتحام الساتر الترابي',
      missionId: 'MISSION_CROSSING',
      heroImage: ASSET_IMAGES.crossing,
      badge: 'إسقاط بارليف',
      panels: [
        {
          label: 'قوارب الاقتحام الأولى',
          caption: '8000 مقاتل من بواسل المشاة والصاعقة يقتحمون مياه القناة في قوارب مطاطية تحت وابل القذائف وصيحات التكبير.',
          soundEffect: 'الله أكبر!! الله أكبر!!',
          speaker: 'جنود الاقتحام',
          speech: '«بسم الله.. إلى أرض الفيروز الغالية!»',
          color: 'from-emerald-600/30 to-stone-950/60',
        },
        {
          label: 'فكرة اللواء باقي زكي العبقرية',
          caption: 'مضخات المياه التوربينية الإنجليزية والألمانية تضخ مياه القناة بقوة 300 ضغط جوي نحو الساتر الترابي بارتفاع 20 متراً.',
          soundEffect: 'تشششششش!! فشششش!',
          speaker: 'سلاح المهندسين',
          speech: '«المياه تقطع الرمال كالسكين في الزبد!»',
          color: 'from-cyan-600/30 to-slate-950/60',
        },
        {
          label: 'انهيار أسطورة خط بارليف',
          caption: '3 ملايين متر مكعب من الرمال تنهار في مياه القناة، وفُتحت 60 ثغرة لدخول الدبابات والأسلحة الثقيلة!',
          soundEffect: 'كراااااش!! انهيار!',
          speaker: 'المقاتل المصري',
          speech: '«سقط الخط الذي زعموا أنه لا يقهر في ساعات!»',
          color: 'from-amber-600/30 to-stone-950/60',
        },
      ],
      historicQuote: '«لقد انهار خط بارليف كقلعة من رمال أمام عزم وبطولة الجندي المصري.»',
      quoteAuthor: 'صحيفة التايمز البريطانية - أكتوبر 1973',
    },
    {
      id: 3,
      title: 'جسور النصر: ملحمة الكباري وتدفق الدبابات',
      subtitle: 'مساء 6 أكتوبر - سلاح المهندسين العسكريين',
      missionId: 'MISSION_BRIDGE',
      heroImage: ASSET_IMAGES.bridge,
      badge: 'سلاح المهندسين',
      panels: [
        {
          label: 'تحت نيران المدفعية المعادية',
          caption: 'رجال الشهيد أحمد حمدي ينصبون أجزاء الكباري العائمة (PMP) وسط وابل القذائف بدون تردد أو خوف.',
          soundEffect: 'طراااخ!! بوم!!',
          speaker: 'الشهيد أحمد حمدي',
          speech: '«الجسر يجب أن يكتمل.. دباباتنا تنتظر العبور!»',
          color: 'from-orange-600/30 to-stone-950/60',
        },
        {
          label: 'ستائر الدخان تعمي العدو',
          caption: 'إطلاق مئات قنابل الدخان لحجب الرؤية عن مراصد مدفعية العدو وتأمين نقاط التثبيت المعدنية.',
          soundEffect: 'ووووش.. فششش!',
          speaker: 'طاقم الدخان',
          speech: '«حجبنا رؤية طيران ومدفعية العدو تماماً!»',
          color: 'from-slate-500/30 to-stone-950/60',
        },
        {
          label: 'هدير دبابات النصر إلى سيناء',
          caption: '1000 دبابة ومدرعة تعبر الجسور العائمة واحداً تلو الآخر لتلتحم مع المشاة وتؤمن رؤوس الكباري بعمق سيناء.',
          soundEffect: 'هديرررر الدبابات! طقطقة الجنازير!',
          speaker: 'سلاح المدرعات',
          speech: '«عبرنا القناة.. الدبابات تطارد فلول العدو!»',
          color: 'from-amber-600/30 to-stone-950/60',
        },
      ],
      historicQuote: '«لولا جسور المهندسين العسكريين وتضحياتهم لتعذر حسم معركة العبور في ساعاتها الأولى.»',
      quoteAuthor: 'وثائق القيادة العامة للقوات المسلحة',
    },
    {
      id: 4,
      title: 'مقبرة الدبابات: صائدو المدرعات وحائط الصواريخ',
      subtitle: '7 - 10 أكتوبر - معارك المدرعات في سيناء',
      missionId: 'MISSION_TANK_BATTLE',
      heroImage: ASSET_IMAGES.tankBattle,
      badge: 'صائدو الدبابات',
      panels: [
        {
          label: 'كمين صواريخ مالوتكا (ساجر)',
          caption: 'البطل محمد عبد العاطي والبطل محمد المصري يتربصون بأرتال دبابات اللواء 190 مدرع المعادي.',
          soundEffect: 'فززززززز.. قفل الهدف!',
          speaker: 'محمد عبد العاطي',
          speech: '«الهدف في المرمى.. أطلق الصاروخ!»',
          color: 'from-red-600/30 to-stone-950/60',
        },
        {
          label: 'سقوط فانتوم بحائط الصواريخ',
          caption: 'مقاتلات العدو تحاول ضرب القوات فتصطدم بشبكة صواريخ سام-6 وسام-3 المصرية التي شلت طيران العدو.',
          soundEffect: 'كابووووم!! إشعال!',
          speaker: 'الدفاع الجوي',
          speech: '«الصاروخ أصاب الفانتوم في مقتل.. سماء مصر محرمة!»',
          color: 'from-sky-600/30 to-amber-950/60',
        },
        {
          label: 'تحطيم اللواء 190 مدرع وأسر قائده عساف ياجوري',
          caption: 'احتراق عشرات دبابات العدو في أضخم معركة دبابات بعد الحرب العالمية الثانية، واستسلام قائد اللواء المدرع.',
          soundEffect: 'استسلام! نصر مؤزر!',
          speaker: 'قوات المشاة',
          speech: '«تحطمت أسطورة دروعهم تحت أقدام بواسلنا!»',
          color: 'from-emerald-600/30 to-stone-950/60',
        },
      ],
      historicQuote: '«كانت صواريخ المشاة المصرية تخرج من تحت الأرض كالأشباح لتصيد دباباتنا واحدة تلو الأخرى.»',
      quoteAuthor: 'الجنرال حاييم هرتزوج - رئيس إسرائيل الأسبق',
    },
    {
      id: 5,
      title: 'سقوط الحصون: رفع العلم المصري خفاقاً',
      subtitle: 'تتويج النصر والتحرير المجيد',
      missionId: 'MISSION_FORTRESS',
      heroImage: ASSET_IMAGES.victoryFlag,
      badge: 'رفع العلم',
      panels: [
        {
          label: 'حصار آخر نقاط خط بارليف',
          caption: 'قوات الصاعقة والمشاة تقتحم دشم العدو الخرسانية المحصنة وتقطع خراطيم النابالم وتجبر الحامية على الاستسلام.',
          soundEffect: 'استسلام الحصن.. نصر!',
          speaker: 'قوات الصاعقة',
          speech: '«سلّم سلاحك.. الأرض عادت لأصحابها!»',
          color: 'from-amber-600/30 to-stone-950/60',
        },
        {
          label: 'لحظة الفخر التاريخية',
          caption: 'أبطال مصر يعتلون أعلى قمة في الساتر الترابي ويرفعون علم جمهورية مصر العربية يرفرف عالياً في سماء سيناء.',
          soundEffect: 'تحيا مصر!! تحيا مصر!!',
          speaker: 'جموع الجنود',
          speech: '«عاشت مصر حرة أبية.. دماء شهدائنا لم تذهب سدى!»',
          color: 'from-red-600/30 to-stone-950/60',
        },
        {
          label: 'خطاب النصر التاريخي',
          caption: 'الرئيس الراحل محمد أنور السادات يعلن أمام مجلس الشعب والشعب المصري والعالم استرداد الكرامة والنصر العظيم.',
          soundEffect: 'تصفيق حاشد وابتهاج شعبي عظيم!',
          speaker: 'الرئيس السادات',
          speech: '«إن القوات المسلحة قامت بمعجزة على أي مقياس عسكري..»',
          color: 'from-emerald-600/30 to-amber-950/60',
        },
      ],
      historicQuote: '«سوف يسجل التاريخ لهذه الأمة أن قواتها المسلحة قامت بمعجزة، وإن النصر في يوم السادس من أكتوبر كان انتصاراً للحق والكرامة.»',
      quoteAuthor: 'الرئيس الراحل محمد أنور السادات - خطاب النصر',
    },
  ];

  const chapter = CHAPTERS[activeChapterIndex];

  const handleNext = () => {
    sound.playTargetLock();
    setActiveChapterIndex((prev) => Math.min(CHAPTERS.length - 1, prev + 1));
  };

  const handlePrev = () => {
    sound.playTargetLock();
    setActiveChapterIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md overflow-y-auto flex flex-col p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Top Bar with Comic Branding */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b-2 border-amber-500/40 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono text-[11px] font-black tracking-wider uppercase shadow">
                COMIC CHRONICLES
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-cairo text-amber-400">
                القصة المصورة: ملحمة نصر أكتوبر 1973
              </h1>
            </div>
            <p className="text-xs text-stone-400">
              مشاهد وبانيلات سردية مرسومة تروي ملاحم العبور خطوة بخطوة
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playVictoryFanfare();
            onSelectMission(chapter.missionId);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-xs sm:text-sm"
        >
          <Play className="w-4 h-4 fill-stone-950" />
          <span>العب هذه المعركة الآن</span>
        </button>
      </div>

      {/* Chapters Selector Ribbon */}
      <div className="w-full max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
        {CHAPTERS.map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => {
              sound.playTargetLock();
              setActiveChapterIndex(idx);
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeChapterIndex === idx
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 border-stone-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-stone-950/30 flex items-center justify-center font-mono font-black text-[11px]">
              {ch.id}
            </span>
            <span>{ch.badge}</span>
          </button>
        ))}
      </div>

      {/* Main Comic Page Spread */}
      <div className="w-full max-w-6xl mx-auto bg-stone-900 border-4 border-black rounded-2xl p-5 sm:p-7 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.9)] mb-6 flex-1 flex flex-col justify-between">
        {/* Chapter Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>الفصل {chapter.id} من {CHAPTERS.length}</span>
              <span>·</span>
              <span className="text-stone-400">{chapter.subtitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-cairo text-stone-100">
              {chapter.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={activeChapterIndex === 0}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 border border-stone-700 cursor-pointer transition-all"
              title="الفصل السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="font-mono text-xs font-bold text-amber-400 px-2">
              {activeChapterIndex + 1} / {CHAPTERS.length}
            </span>
            <button
              onClick={handleNext}
              disabled={activeChapterIndex === CHAPTERS.length - 1}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200 border border-stone-700 cursor-pointer transition-all"
              title="الفصل التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Artwork Header Banner */}
        <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border-2 border-stone-800 mb-6 shadow-inner group">
          <img
            src={chapter.heroImage}
            alt={chapter.title}
            className="w-full h-full object-cover object-center filter saturate-125 contrast-110 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

          {/* Comic Action Sound Badge overlay */}
          <div className="absolute top-4 left-4 bg-yellow-400 text-stone-950 font-black text-xs sm:text-sm px-3.5 py-1 rounded-md rotate-[-4deg] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider font-mono">
            {chapter.panels[0].soundEffect}
          </div>

          <div className="absolute bottom-4 right-4 max-w-xl text-right">
            <span className="inline-block px-2.5 py-0.5 bg-red-600 text-white font-bold text-[11px] rounded mb-1.5 shadow">
              {chapter.badge}
            </span>
            <p className="text-xs sm:text-sm text-stone-200 font-medium drop-shadow-md">
              {chapter.historicQuote}
            </p>
          </div>
        </div>

        {/* 3 Comic Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {chapter.panels.map((panel, pIdx) => (
            <div
              key={pIdx}
              className="relative bg-stone-950 border-3 border-stone-800 rounded-xl p-4 flex flex-col justify-between shadow-[5px_5px_0px_0px_rgba(0,0,0,0.8)] hover:border-amber-500/60 transition-all group"
            >
              {/* Halftone / Comic Angle Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-mono font-black text-stone-400 tracking-wider">
                  PANEL #{pIdx + 1}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                  {panel.label}
                </span>
              </div>

              {/* Action Sound Explosion Sticker */}
              <div className="my-2 self-center">
                <div className="inline-block px-3 py-1 bg-red-600 text-yellow-300 font-black text-xs rounded border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rotate-[2deg] group-hover:scale-110 transition-transform">
                  💥 {panel.soundEffect}
                </div>
              </div>

              {/* Speech Bubble if present */}
              {panel.speech && (
                <div className="relative bg-white text-stone-950 p-2.5 rounded-lg border-2 border-black mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] text-xs font-bold leading-relaxed">
                  <span className="block text-[10px] font-black text-red-600 mb-0.5">
                    {panel.speaker}:
                  </span>
                  {panel.speech}
                  {/* Bubble Tail */}
                  <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
                </div>
              )}

              {/* Narrator Caption Box */}
              <div className="bg-amber-950/40 border border-amber-600/30 p-2.5 rounded-lg text-[11px] text-stone-300 leading-relaxed font-sans">
                <span className="font-bold text-amber-300 block mb-0.5">السرد التاريخي:</span>
                {panel.caption}
              </div>
            </div>
          ))}
        </div>

        {/* Historic Quote Footer */}
        <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-stone-200">{chapter.historicQuote}</span>
            <span className="text-stone-500">· {chapter.quoteAuthor}</span>
          </div>

          <button
            onClick={() => onSelectMission(chapter.missionId)}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <span>خوض المعركة في اللعبة</span>
            <Play className="w-3.5 h-3.5 fill-stone-950" />
          </button>
        </div>
      </div>
    </div>
  );
};
