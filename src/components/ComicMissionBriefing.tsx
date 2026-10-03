import React from 'react';
import { sound } from '../utils/audio';
import { Play, BookOpen, Shield, Target, Crosshair, Award, ArrowLeft } from 'lucide-react';
import { GameMode } from '../types';
import { ASSET_IMAGES } from '../data/historyData';

interface ComicMissionBriefingProps {
  missionId: GameMode;
  onStartMission: () => void;
  onExit: () => void;
}

interface BriefingData {
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  quote: string;
  author: string;
  panels: {
    panelNumber: number;
    title: string;
    actionSound: string;
    caption: string;
    speech?: { speaker: string; text: string };
  }[];
  howToPlay: {
    controls: string;
    objective: string;
    proTip: string;
  };
}

export const ComicMissionBriefing: React.FC<ComicMissionBriefingProps> = ({
  missionId,
  onStartMission,
  onExit,
}) => {
  const BRIEFINGS: Record<string, BriefingData> = {
    MISSION_AIR_STRIKE: {
      title: 'ساعة الصفر: الضربة الجوية المفاجئة',
      subtitle: 'الساعة 14:00 - 6 أكتوبر 1973',
      badge: 'المرحلة 1: نسور الجو المصري',
      image: ASSET_IMAGES.airStrike,
      quote: '«لقد حلقت مقاتلاتنا فوق سيناء لتكتب بالدماء والشرف أول حروف النصر المبين.»',
      author: 'نسور القوات الجوية المصرية',
      panels: [
        {
          panelNumber: 1,
          title: 'الخداع الاستراتيجي والتسلل المنخفض',
          actionSound: 'زووووم.. فشششش!',
          caption: 'أكثر من 200 طائرة مقاتلة ميج-21 وسوخوي تنطلق في سرية تامة بارتفاع أمتار معدودة فوق مياه القناة لتفادي شبكات الرادار المعادية.',
          speech: {
            speaker: 'قائد التشكيل',
            text: '«ساعة الصفر بدأت.. الهجوم مباغت وصاعق، دمروا مدارجهم ومراكز قيادتهم!»',
          },
        },
        {
          panelNumber: 2,
          title: 'قصف الرادارات والمطارات في عمق سيناء',
          actionSound: 'BOOM!! طااااخ!',
          caption: 'قصف مركز لمدارج مطارات المليز وبير جفجافة ومحطات رادار أم مرجم وإسكات بطاريات صواريخ الهوك في أول 20 دقيقة.',
          speech: {
            speaker: 'الطيار المقاتل',
            text: '«المحطة دُمرت بالكامل والصواريخ تصيب أهدافها بدقة.. الله أكبر!»',
          },
        },
        {
          panelNumber: 3,
          title: 'الاشتباك الجوي وإسقاط الفانتوم',
          actionSound: 'كابوووم!! صيد نسر!',
          caption: 'مقاتلات الميج-21 تشتبك في معارك جوية عنيفة وتسقط مقاتلات العدو لتبسط السيادة الجوية فوق سماء المعركة.',
          speech: {
            speaker: 'غرفة العمليات',
            text: '«سماء سيناء أصبحت مفتوحة لقوات العبور.. عودوا سالمين يا أبطال!»',
          },
        },
      ],
      howToPlay: {
        controls: 'حرك الماوس لقيادة طائرة الميج-21، اضغط زر الفأرة الأيسر لإطلاق المدفع، واضغط زر الصاروخ لإطلاق صواريخ ذاتية التوجيه.',
        objective: 'دمر 3 محطات ومطارات معادية لتحقيق نصر سريع، أو اصمد طوال دقيقتين لتحقيق النصر التلقائي.',
        proTip: 'الصواريخ موجهة لوحدها وتتعقب الطائرات والمحطات تلقائياً!',
      },
    },
    MISSION_CROSSING: {
      title: 'طوفان العبور: خراطيم المياه وإسقاط بارليف',
      subtitle: 'الساعة 14:15 - 6 أكتوبر 1973',
      badge: 'المرحلة 2: معركة العبور',
      image: ASSET_IMAGES.crossing,
      quote: '«لقد انهار خط بارليف الأسطوري كقلعة رمال أمام عزم وعبقرية المقاتل المصري.»',
      author: 'الصحافة العالمية - أكتوبر 1973',
      panels: [
        {
          panelNumber: 1,
          title: 'موجات الاقتحام الأولى بالقوارب المطاطية',
          actionSound: 'الله أكبر!! الله أكبر!!',
          caption: 'آلاف الجنود البواسل يقتحمون مياه قناة السويس بالقوارب المطاطية ويسارعون بتسلق الساتر الترابي بحبال الشجاعة.',
          speech: {
            speaker: 'جنود المشاة',
            text: '«بسم الله الرحمن الرحيم.. إلى الضفة الشرقية ولن نعود إلا منتصرين!»',
          },
        },
        {
          panelNumber: 2,
          title: 'فكرة اللواء باقي زكي العبقرية',
          actionSound: 'تشششششش!! فشششش!',
          caption: 'مضخات مياه توربينية تقذف مياه القناة بقوة هائلة نحو الساتر الترابي البالغ ارتفاعه 20 متراً لتفتيته وإذابته في ساعات.',
          speech: {
            speaker: 'اللواء باقي زكي',
            text: '«المياه تذيب الرمال كالسحر.. افتحوا الثغرات لتدفق أرتال الدبابات!»',
          },
        },
        {
          panelNumber: 3,
          title: 'سقوط حصون ودشم خط بارليف',
          actionSound: 'انهياااار!! نصر مؤزر!',
          caption: 'فتح 60 ثغرة في الساتر الترابي وإزاحة 3 ملايين متر مكعب من الرمال ورفع رايات النصر على الضفة الشرقية.',
          speech: {
            speaker: 'أبطال الصاعقة',
            text: '«سقط خط بارليف المنيع تحت أقدامنا.. طريق سيناء أصبح مفتوحاً!»',
          },
        },
      ],
      howToPlay: {
        controls: 'وجه خراطيم المياه لإسقاط كتل الرمال، انقر على قوارب المشاة لإنزالها، ودمر رشاشات ودشم العدو.',
        objective: 'إذابة الساتر الترابي بنسبة 100% وإنزال قوارب المشاة لإسقاط دفاعات خط بارليف.',
        proTip: 'الرش المزدوج والتركيز على نقاط الرمال يذيب الساتر بسرعة قياسية!',
      },
    },
    MISSION_BRIDGE: {
      title: 'جسور النصر: ملحمة سلاح المهندسين وتدفق الدبابات',
      subtitle: 'مساء 6 أكتوبر 1973',
      badge: 'المرحلة 3: سلاح المهندسين العسكريين',
      image: ASSET_IMAGES.bridge,
      quote: '«لولا تضحيات وبطولات سلاح المهندسين تحت القصف لما عبرت دبابة واحدة إلى سيناء.»',
      author: 'الشهيد البطل أحمد حمدي',
      panels: [
        {
          panelNumber: 1,
          title: 'نصب البنتونات تحت نيران المدفعية',
          actionSound: 'طراااخ!! بوم!! بوم!!',
          caption: 'رجال الشهيد أحمد حمدي يثبتون وحدات الكباري العائمة الثقيلة (PMP) وسط وابل من قذائف مدفعية العدو.',
          speech: {
            speaker: 'الشهيد أحمد حمدي',
            text: '«الجسر يجب أن يكتمل في موعده مهما كلفنا الثمن.. دباباتنا تنتظر العبور!»',
          },
        },
        {
          panelNumber: 2,
          title: 'ستائر الدخان ومدافع م/ط',
          actionSound: 'ووووش.. طاااخ م/ط!',
          caption: 'إطلاق ستائر دخانية تحجب الرؤية عن مراصد العدو وتشغيل مدافع الدفاع الجوي لصد طائرات العدو المهاجمة.',
          speech: {
            speaker: 'طاقم الدفاع الجوي',
            text: '«حجبنا رؤية طيران ومدفعية العدو وأسقطنا طائراتهم المهاجمة للكوبري!»',
          },
        },
        {
          panelNumber: 3,
          title: 'تدفق أرتال الدبابات إلى سيناء',
          actionSound: 'هديررر دبابات T-62 و T-55!',
          caption: 'اكتمال الجسر وعبور مئات الدبابات والمدرعات المصرية إلى سيناء لدعم المشاة وتأمين رؤوس الكباري.',
          speech: {
            speaker: 'قائد لواء المدرعات',
            text: '«عبرنا الجسر إلى أرض الفيروز.. أرتال النصر تندفع في عمق سيناء!»',
          },
        },
      ],
      howToPlay: {
        controls: 'انقر لتركيب أجزاء الكوبري الستة (بنتونات)، فعل ستائر الدخان ومدافع م/ط، ثم أطلق الدبابات لتعبر الجسر.',
        objective: 'تأمين عبور 5 دبابات إلى الضفة الشرقية لسيناء أو الصمود لمدة دقيقتين.',
        proTip: 'ستائر الدخان تعمي مدفعية العدو وتمنع تضرر أجزاء الكوبري!',
      },
    },
    MISSION_TANK_BATTLE: {
      title: 'مقبرة الدبابات: صائدو المدرعات وحائط الصواريخ',
      subtitle: '7 - 10 أكتوبر 1973',
      badge: 'المرحلة 4: معارك الدبابات في سيناء',
      image: ASSET_IMAGES.tankBattle,
      quote: '«كانت صواريخ المشاة المصرية تخرج من رمال الصحراء لتصيد دباباتنا كالأشباح.»',
      author: 'الجنرال عساف ياجوري - قائد اللواء 190 مدرع المعادي',
      panels: [
        {
          panelNumber: 1,
          title: 'الهجمات المضادة لدبابات العدو',
          actionSound: 'فززززز.. قفل الهدف ساجر!',
          caption: 'العدو يدفع بمئات دبابات الباتون وسينتوريون لمحاولة طرد القوات من القناة، فتستدرجهم القوات لكمائن محكمة.',
          speech: {
            speaker: 'البطل محمد عبد العاطي',
            text: '«دبابات العدو في المرمى.. الصاروخ ينطلق ويصيب قلب الدبابة!»',
          },
        },
        {
          panelNumber: 2,
          title: 'حائط الصواريخ يسقط الفانتوم',
          actionSound: 'كابوووم!! إسقاط طائرة!',
          caption: 'شبكة صواريخ الدفاع الجوي (سام-6 سام-3 سام-2) تشكل مظلة نارية محكمة تسقط طائرات الفانتوم وسكاي هوك.',
          speech: {
            speaker: 'ضباط الدفاع الجوي',
            text: '«سماء المعركة محرمة على العدو.. ذراع إسرائيل الطويلة كُسرت!»',
          },
        },
        {
          panelNumber: 3,
          title: 'تحطيم اللواء 190 مدرع وأسر قائده',
          actionSound: 'استسلام اللواء المدرع!',
          caption: 'تدمير عشرات الدبابات المعادية في معارك الفردان والمزرعة الصينية وأسر قائد اللواء المدرع عساف ياجوري.',
          speech: {
            speaker: 'صائدو الدبابات',
            text: '«دمرنا أكثر من 150 دبابة في ساعات.. كبرياء دروعهم تبدد في رمال سيناء!»',
          },
        },
      ],
      howToPlay: {
        controls: 'حرك دبابتك، انقر لإطلاق قذائف المدفع، انقر على دبابات العدو لإطلاق صواريخ ساجر، وانقر في السماء لإطلاق صواريخ سام.',
        objective: 'تدمير 6 دبابات معادية أو الصمود لدقيقتين لتأمين رأس الكوبري.',
        proTip: 'صواريخ ساجر تدمر دبابات العدو بضربة واحدة حاسمة!',
      },
    },
    MISSION_FORTRESS: {
      title: 'سقوط الحصون: استسلام بارليف ورفع العلم',
      subtitle: 'تتويج النصر والتحرير المجيد',
      badge: 'المرحلة 5: ملحمة النصر والتحرير',
      image: ASSET_IMAGES.victoryFlag,
      quote: '«سوف يسجل التاريخ لهذه الأمة أن قواتها المسلحة قامت بمعجزة عسكرية كبرى.»',
      author: 'الرئيس الراحل محمد أنور السادات',
      panels: [
        {
          panelNumber: 1,
          title: 'حصار دشم ونقاط خط بارليف الحصينة',
          actionSound: 'تكبيرات النصر.. اقتحام!',
          caption: 'قوات الصاعقة والمشاة تفرض حصاراً مطبقاً على حصون خط بارليف الخرسانية وتقطع أنابيب النابالم الحارق.',
          speech: {
            speaker: 'قائد فصيلة الصاعقة',
            text: '«اقطعوا أنابيب النابالم.. الحصن ساقط لا محالة، سلموا تسلموا!»',
          },
        },
        {
          panelNumber: 2,
          title: 'استسلام حامية الحصن بالكامل',
          actionSound: 'استسلام وإلقاء السلاح!',
          caption: 'جنود العدو يرفعون الرايات البيضاء ويخرجون من الدشم المحصنة أسرى أمام بواسل الجيش المصري.',
          speech: {
            speaker: 'الجنود البواسل',
            text: '«الأرض استردت بحق.. كرامة الوطن عادت مرفوعة الرأس!»',
          },
        },
        {
          panelNumber: 3,
          title: 'رفع علم مصر خفاقاً فوق سيناء',
          actionSound: 'تحيا مصر!! تحيا جمهورية مصر العربية!!',
          caption: 'أبطال مصر يرفعون علم الوطن الحبيب على أعلى قمة في الساتر الترابي ليرفرف حراً أبد الدهر.',
          speech: {
            speaker: 'جموع الأبطال',
            text: '«عاشت مصر حرة أبية.. تحيا مصر.. تحيا مصر!»',
          },
        },
      ],
      howToPlay: {
        controls: 'وجه قائد الصاعقة بالفأرة أو الأسهم، اقطع أنابيب النابالم، دمر دشم العدو، وارفع العلم على قمة الساتر.',
        objective: 'تطهير الحصن ورفع العلم المصري لتحقيق النصر التام.',
        proTip: 'استخدم القنابل اليدوية لتدمير الدشم الحصينة بسرعة!',
      },
    },
  };

  const briefing = BRIEFINGS[missionId] || BRIEFINGS.MISSION_AIR_STRIKE;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md overflow-y-auto flex flex-col p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between pb-4 border-b-2 border-amber-500/40 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono text-[11px] font-black uppercase shadow">
                COMIC BRIEFING
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-cairo text-amber-400">
                القصة المصورة للمرحلة: تمهيد العمليات
              </h1>
            </div>
            <p className="text-xs text-stone-400">
              اقرأ تفاصيل المعركة وسيناريو النصر قبل انطلاق العمليات الميدانية
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playCountdownBeep(false);
            onStartMission();
          }}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm"
        >
          <Play className="w-4 h-4 fill-stone-950" />
          <span>بدء المعركة (العد التنازلي 5 ثوانٍ) ⚡</span>
        </button>
      </div>

      {/* Main Comic Page */}
      <div className="w-full max-w-5xl mx-auto bg-stone-900 border-4 border-black rounded-2xl p-5 sm:p-7 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.9)] flex-1 flex flex-col justify-between">
        {/* Banner with artwork & title */}
        <div className="relative w-full h-44 sm:h-56 rounded-xl overflow-hidden border-2 border-stone-800 mb-6 shadow-inner">
          <img
            src={briefing.image}
            alt={briefing.title}
            className="w-full h-full object-cover object-center filter saturate-125 brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />

          {/* Action Sound Sticker */}
          <div className="absolute top-3 left-3 bg-yellow-400 text-stone-950 font-black text-xs sm:text-sm px-3 py-1 rounded rotate-[-4deg] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-mono">
            ⚡ {briefing.panels[0].actionSound}
          </div>

          <div className="absolute bottom-3 right-4 max-w-lg text-right">
            <span className="inline-block px-2.5 py-0.5 bg-red-600 text-white font-bold text-[11px] rounded mb-1 shadow">
              {briefing.badge}
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-cairo text-stone-100 drop-shadow-md">
              {briefing.title}
            </h2>
            <p className="text-xs text-amber-300 font-medium">{briefing.subtitle}</p>
          </div>
        </div>

        {/* 3 Storyboard Comic Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {briefing.panels.map((p) => (
            <div
              key={p.panelNumber}
              className="bg-stone-950 border-3 border-stone-800 rounded-xl p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:border-amber-500/60 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-black text-stone-400">
                    مشهد #{p.panelNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-red-600 text-yellow-300 font-black text-[11px] rounded border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {p.actionSound}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-amber-400 mb-2">{p.title}</h4>

                {p.speech && (
                  <div className="relative bg-white text-stone-950 p-2.5 rounded-lg border-2 border-black mb-3 text-xs font-bold leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)]">
                    <span className="block text-[10px] font-black text-red-600 mb-0.5">
                      {p.speech.speaker}:
                    </span>
                    {p.speech.text}
                    <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
                  </div>
                )}
              </div>

              <div className="bg-amber-950/30 border border-amber-600/30 p-2.5 rounded-lg text-[11px] text-stone-300 leading-relaxed font-sans">
                <span className="font-bold text-amber-300 block mb-0.5">الرواية العسكرية:</span>
                {p.caption}
              </div>
            </div>
          ))}
        </div>

        {/* Tactical How-To-Play Guide */}
        <div className="p-4 bg-stone-950 border border-amber-500/30 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 bg-stone-900 rounded-lg border border-stone-800">
            <span className="text-amber-400 font-bold block mb-1 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              <span>طريقة التحكم:</span>
            </span>
            <span className="text-stone-300">{briefing.howToPlay.controls}</span>
          </div>

          <div className="p-2.5 bg-stone-900 rounded-lg border border-stone-800">
            <span className="text-emerald-400 font-bold block mb-1 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>الهدف المطلوب:</span>
            </span>
            <span className="text-stone-300">{briefing.howToPlay.objective}</span>
          </div>

          <div className="p-2.5 bg-stone-900 rounded-lg border border-stone-800">
            <span className="text-sky-400 font-bold block mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>نصيحة تكتيكية:</span>
            </span>
            <span className="text-stone-300">{briefing.howToPlay.proTip}</span>
          </div>
        </div>

        {/* Action Button Bottom Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-800">
          <div className="text-xs text-stone-400 max-w-md">
            <span className="text-amber-400 font-bold">{briefing.quote}</span>
            <span className="block text-stone-500 mt-0.5">· {briefing.author}</span>
          </div>

          <button
            onClick={() => {
              sound.playCountdownBeep(false);
              onStartMission();
            }}
            className="px-7 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-cairo rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer active:scale-95 text-base"
          >
            <Play className="w-5 h-5 fill-stone-950" />
            <span>بدء المعركة (العد التنازلي 5 ثوانٍ) ⚡</span>
          </button>
        </div>
      </div>
    </div>
  );
};
