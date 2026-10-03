import React, { useEffect } from 'react';
import { sound } from '../utils/audio';
import { GameMode } from '../types';
import { ASSET_IMAGES } from '../data/historyData';
import { Play, Sparkles } from 'lucide-react';

interface ComicHugeSplashModalProps {
  missionId: GameMode;
  onDismiss: () => void;
}

interface ComicSplashData {
  title: string;
  badge: string;
  image: string;
  actionStickers: string[];
  speechBubble: {
    speaker: string;
    text: string;
  };
  narration: string;
}

export function ComicHugeSplashModal({ missionId, onDismiss }: ComicHugeSplashModalProps) {
  const SPLASH_DATA: Record<string, ComicSplashData> = {
    MISSION_AIR_STRIKE: {
      title: 'الضربة الجوية المفاجئة: نسور سيناء',
      badge: 'المرحلة 1 · ساعة الصفر 14:00',
      image: ASSET_IMAGES.comicSplash,
      actionStickers: ['⚡ الله أكبر!!', '💥 كابوووم!!', '🦅 صقور الجو!'],
      speechBubble: {
        speaker: 'قائد التشكيل الجوي',
        text: '«ساعة الصفر دقت يا نسور مصر! طيران منخفض تحت رادارات العدو ودك مدارجهم ومراكز قيادتهم في عمق سيناء!»',
      },
      narration: 'أكثر من 200 طائرة مقاتلة تدك مطارات المليز وبير جفجافة ومحطات رادار أم مرجم في أول 20 دقيقة!',
    },
    MISSION_CROSSING: {
      title: 'طوفان العبور: إسقاط أسطورة بارليف',
      badge: 'المرحلة 2 · اقتحام الساتر الترابي',
      image: ASSET_IMAGES.crossing,
      actionStickers: ['🌊 طوفان السويس!', '✊ الله أكبر.. بسم الله!', '💥 انهيار بارليف!'],
      speechBubble: {
        speaker: 'بواسل المشاة والصاعقة',
        text: '«خراطيم المياه تسقط خط بارليف الأسطوري.. اعبروا يا أبطال وسيروا على بركة الله!»',
      },
      narration: 'عبقرية عسكرية مصرية أذهلت العالم بإسقاط أضخم ساتر ترابي في التاريخ بواسطة مضخات مياه القناة!',
    },
    MISSION_BRIDGE: {
      title: 'ملحمة المهندسين: بناء الكباري العائمة',
      badge: 'المرحلة 3 · جسور النصر والعبور',
      image: ASSET_IMAGES.bridge,
      actionStickers: ['🔨 سلاح المهندسين!', '🛡️ ستائر الدخان!', '🚜 انطلاق الدبابات!'],
      speechBubble: {
        speaker: 'قائد سلاح المهندسين',
        text: '«كباري العبور اكتملت تحت وابل النيران والدخان.. مهدوا الطريق لأرتال الدبابات نحو سيناء!»',
      },
      narration: 'أبطال سلاح المهندسين يربطون ضفتي القناة في زمن قياسي لتدفق الدبابات والمدرعات إلى قلب المعركة.',
    },
    MISSION_TANK_BATTLE: {
      title: 'صراع الفولاذ: أكبر معركة دبابات',
      badge: 'المرحلة 4 · معركة الدبابات الكبرى',
      image: ASSET_IMAGES.tankBattle,
      actionStickers: ['🔥 صيد الدبابات!', '💥 اشتباك بالدروع!', '🇪🇬 صمود الفرسان!'],
      speechBubble: {
        speaker: 'قائد لواء المدرعات',
        text: '«العدو يدفع بمئات الدبابات في هجوم مضاد.. اثبتوا ودمروا كل درع يقترب من خطوطنا!»',
      },
      narration: 'مواجهة تاريخية بين مئات الدبابات في صحراء سيناء، حيث سحقت الدبابات المصرية ألوية المدرعات المعادية.',
    },
    MISSION_FORTRESS: {
      title: 'اقتحام الحصن: رفع العلم على سيناء',
      badge: 'المرحلة 5 · ملحمة الصاعقة والتحرير',
      image: ASSET_IMAGES.victoryFlag,
      actionStickers: ['🇪🇬 تحيا مصر!', '⚔️ اقتحام الدشم!', '🏆 النصر المبين!'],
      speechBubble: {
        speaker: 'أبطال الصاعقة المصرية',
        text: '«الحصن سقط بالكامل.. ارفعوا علم جمهورية مصر العربية خفاقاً فوق تراب سيناء الطاهر!»',
      },
      narration: 'استسلام حاميات خط بارليف ورفع علم مصر خفاقاً في مشهد تاريخي خالد أعاد العزة والكرامة للأمة العربية.',
    },
  };

  const data = SPLASH_DATA[missionId] || SPLASH_DATA.MISSION_AIR_STRIKE;

  // Dismiss on ANY keyboard key press!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on space/arrows when dismissing
      if (['Space', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      sound.playRadioClick();
      onDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const handleBackdropClick = () => {
    sound.playRadioClick();
    onDismiss();
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none cursor-pointer overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Huge Grand Comic Book Splash Poster Panel */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          sound.playRadioClick();
          onDismiss();
        }}
        className="relative w-full max-w-5xl h-[88vh] max-h-[820px] bg-stone-900 border-4 sm:border-6 border-black rounded-3xl overflow-hidden shadow-[12px_12px_0px_0px_rgba(245,158,11,0.9)] flex flex-col justify-between"
        style={{
          backgroundImage: 'radial-gradient(#262626 15%, transparent 16%)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Top Comic Strip Header */}
        <div className="relative z-20 bg-amber-500 text-stone-950 px-4 py-2 sm:py-2.5 border-b-4 border-black flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded border border-black shadow">
              OCTOBER 1973 COMIC
            </span>
            <span className="font-cairo font-black text-sm sm:text-base text-stone-950 tracking-wide">
              {data.badge}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold bg-stone-950 text-amber-400 px-3 py-1 rounded-full border border-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>قصة مصورة تمهيدية</span>
          </div>
        </div>

        {/* Huge Central Comic Artwork Container */}
        <div className="relative flex-1 w-full overflow-hidden bg-black">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover object-center filter saturate-135 contrast-110 brightness-95"
          />

          {/* Comic Halftone Overlay Effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply"
            style={{
              backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)',
              backgroundSize: '8px 8px',
            }}
          />

          {/* Dramatic Vignette & Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

          {/* Action Stickers / Sound Bubble Popups (Comic Style) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            {data.actionStickers.map((sticker, idx) => (
              <div
                key={idx}
                className="bg-yellow-400 text-stone-950 font-cairo font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-lg border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider"
                style={{
                  transform: `rotate(${idx % 2 === 0 ? '-3deg' : '4deg'})`,
                }}
              >
                {sticker}
              </div>
            ))}
          </div>

          {/* Comic Speech Bubble */}
          <div className="absolute top-4 left-4 max-w-xs sm:max-w-sm z-20">
            <div className="relative bg-white text-stone-950 rounded-2xl p-3.5 border-3 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[11px] font-black text-red-600 mb-0.5 font-cairo">
                🗣️ {data.speechBubble.speaker}:
              </div>
              <p className="text-xs sm:text-sm font-black font-cairo leading-snug">
                {data.speechBubble.text}
              </p>
              {/* Comic bubble triangle tail */}
              <div className="absolute -bottom-3 left-6 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[14px] border-t-white" />
            </div>
          </div>

          {/* Bottom Title & Dramatic Narration Box */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-stone-950/95 border-3 border-amber-500/80 rounded-2xl p-3.5 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-right">
              <h2 className="text-xl sm:text-3xl font-black font-cairo text-amber-400 mb-1 drop-shadow-md">
                {data.title}
              </h2>
              <p className="text-xs sm:text-sm font-medium font-cairo text-stone-200 leading-relaxed">
                📖 {data.narration}
              </p>
            </div>
          </div>
        </div>

        {/* Pulsing Footer Prompt Bar - Press Any Key to Start */}
        <div className="relative z-20 bg-stone-950 border-t-4 border-black p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs sm:text-sm font-bold font-cairo text-stone-100">
              اضغط <span className="text-amber-400 underline font-black">أي زر في الكيبورد</span> أو انقر في أي مكان لبدء المرحلة فوراً
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playRadioClick();
              onDismiss();
            }}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-cairo rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-xs sm:text-sm"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>انطلق الآن (بدء المعركة) ⚡</span>
          </button>
        </div>
      </div>
    </div>
  );
}
