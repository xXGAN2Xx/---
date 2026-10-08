import React, { useState, useEffect, useRef } from 'react';
import { Flag, Sparkles, Trophy, Award, Volume2, VolumeX, Play, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface FlagRaisingAnimationModalProps {
  isOpen: boolean;
  initialProgress?: number;
  onComplete: () => void;
  onClose?: () => void;
}

export const FlagRaisingAnimationModal: React.FC<FlagRaisingAnimationModalProps> = ({
  isOpen,
  initialProgress = 0,
  onComplete,
  onClose,
}) => {
  const [progress, setProgress] = useState(initialProgress);
  const [isAutoHoisting, setIsAutoHoisting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pullCount, setPullCount] = useState(0);
  const [cheerText, setCheerText] = useState('الله أكبر! سقطت حصون العدو!');
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const autoHoistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial progress
  useEffect(() => {
    if (isOpen) {
      setProgress(initialProgress);
      if (initialProgress >= 100) {
        setIsCompleted(true);
      }
    }
  }, [isOpen, initialProgress]);

  // Handle Hoisting step
  const handlePullRope = () => {
    if (progress >= 100) return;

    sound.playTargetLock();
    setPullCount((prev) => prev + 1);

    const nextProgress = Math.min(100, progress + 20);
    setProgress(nextProgress);

    // Add visual sparks around the mast
    const colors = ['#ef4444', '#ffffff', '#fbbf24', '#22c55e'];
    const newSparks = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: 45 + Math.random() * 15,
      y: 75 - (nextProgress / 100) * 55 + (Math.random() * 10 - 5),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setSparks((prev) => [...prev.slice(-12), ...newSparks]);

    if (nextProgress === 20) {
      sound.playRadioTransmission();
      setCheerText('الله أكبر! أبطال الصاعقة يثبتون السارية على قمة الساتر الترابي!');
    } else if (nextProgress === 40) {
      sound.playHitSound();
      setCheerText('تحيا مصر! السارية تنتصب شامخة فوق خط بارليف!');
    } else if (nextProgress === 60) {
      sound.playRadioClick();
      setCheerText('الراية ترتفع خفاقة واستسلام جنود العدو ورفع الرايات البيضاء!');
    } else if (nextProgress === 80) {
      sound.playCountdownBeep(true);
      setCheerText('خطوة أخيرة حتى القمة! أبطال مصر يرفعون الراية عالياً!');
    } else if (nextProgress >= 100) {
      triggerVictoryCelebration();
    }
  };

  // Auto-hoist feature (smooth automated sequence)
  const toggleAutoHoist = () => {
    if (isCompleted || progress >= 100) return;
    setIsAutoHoisting((prev) => !prev);
  };

  useEffect(() => {
    if (isAutoHoisting && progress < 100) {
      autoHoistRef.current = setTimeout(() => {
        handlePullRope();
      }, 700);
    } else if (progress >= 100) {
      setIsAutoHoisting(false);
    }
    return () => {
      if (autoHoistRef.current) clearTimeout(autoHoistRef.current);
    };
  }, [isAutoHoisting, progress]);

  // Full victory trigger
  const triggerVictoryCelebration = () => {
    setIsCompleted(true);
    setIsAutoHoisting(false);
    sound.playVictoryFanfare();
    setCheerText('الله أكبر! رُفع علم جمهورية مصر العربية خفاقاً في سماء سيناء!');

    // Fireworks confetti effect
    const grandSparks = Array.from({ length: 24 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 10 + Math.random() * 40,
      color: ['#ef4444', '#ffffff', '#fbbf24', '#22c55e', '#38bdf8'][Math.floor(Math.random() * 5)],
    }));
    setSparks(grandSparks);

    // Auto proceed after 3.2 seconds if user doesn't click
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  };

  if (!isOpen) return null;

  // Mast parameters:
  // Mast base is at y=82%, top is at y=20%.
  // Flag travels from y=80% (base) to y=22% (top peak).
  const flagY = 80 - (progress / 100) * 58;
  const isPulling = pullCount % 2 === 1;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-cairo select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-stone-900/95 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.5)] overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 px-3 py-2 sm:px-5 sm:py-2.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-sm">
              <Flag className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-xs sm:text-base font-black text-amber-400 tracking-wide flex items-center gap-1.5">
                <span>مراسم رفع العلم المصري خفاقاً</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300">
                  سيناء 1973 🇪🇬
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-stone-300 font-medium">
                قمة الساتر الترابي - خط بارليف الحصين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 bg-stone-950/80 px-2.5 py-1 rounded-md border border-amber-500/40">
              {progress}%
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors text-xs font-bold px-2 border border-stone-800 cursor-pointer"
                title="تصغير المشهد للرؤية الميدانية"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Responsive Content Body: In landscape it flexes nicely */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row items-center p-2 sm:p-4 gap-3 sm:gap-5">
          {/* Animated Flag Scene (Interactive Canvas / SVG) */}
          <div className="relative w-full md:w-3/5 h-48 sm:h-64 md:h-72 rounded-xl bg-gradient-to-b from-sky-950 via-amber-950/30 to-amber-900/60 border border-stone-700/60 overflow-hidden shadow-inner flex items-center justify-center">
            {/* Background Sinai Dawn / Sunset Sky Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Sunburst Rays at Victory */}
            {isCompleted && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-spin-slow opacity-40">
                <div className="w-96 h-96 bg-[conic-gradient(from_0deg,_#fbbf24_0deg_15deg,_transparent_15deg_30deg,_#fbbf24_30deg_45deg,_transparent_45deg_60deg,_#fbbf24_60deg_75deg,_transparent_75deg_90deg,_#fbbf24_90deg_105deg,_transparent_105deg_120deg,_#fbbf24_120deg_135deg,_transparent_135deg_150deg,_#fbbf24_150deg_165deg,_transparent_165deg_180deg,_#fbbf24_180deg_195deg,_transparent_195deg_210deg,_#fbbf24_210deg_225deg,_transparent_225deg_240deg,_#fbbf24_240deg_255deg,_transparent_255deg_270deg,_#fbbf24_270deg_285deg,_transparent_285deg_300deg,_#fbbf24_300deg_315deg,_transparent_315deg_330deg,_#fbbf24_330deg_345deg,_transparent_345deg_360deg)]" />
              </div>
            )}

            {/* Captured Bunkers Silhouette in background */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 240"
              preserveAspectRatio="none"
            >
              {/* Distant Bar-Lev fortifications and Sand Berm */}
              <path
                d="M 0,195 Q 60,185 120,190 T 260,180 T 400,185 L 400,240 L 0,240 Z"
                fill="#292524"
                opacity="0.8"
              />
              <path
                d="M 0,205 Q 80,198 180,200 T 340,192 T 400,200 L 400,240 L 0,240 Z"
                fill="#1c1917"
              />

              {/* Concrete bunker shape on the left */}
              <rect x="25" y="170" width="70" height="30" rx="4" fill="#44403c" opacity="0.6" />
              <rect x="40" y="180" width="40" height="8" rx="2" fill="#1c1917" />
              {/* Surrendered white flag on bunker */}
              <line x1="85" y1="170" x2="85" y2="152" stroke="#d6d3d1" strokeWidth="2" />
              <polygon points="85,152 100,157 85,162" fill="#f5f5f4" opacity="0.85" />

              {/* Barbed wire fence silhouettes */}
              <line x1="120" y1="200" x2="160" y2="197" stroke="#78716c" strokeWidth="1.5" />
              <line x1="130" y1="195" x2="135" y2="202" stroke="#78716c" strokeWidth="1.5" />
              <line x1="145" y1="195" x2="150" y2="202" stroke="#78716c" strokeWidth="1.5" />
            </svg>

            {/* The Main Flagpole, Egyptian Flag, and Egyptian Commandos */}
            <svg
              className="absolute inset-0 w-full h-full overflow-visible"
              viewBox="0 0 400 240"
            >
              {/* Flagpole Mast (X=230, Y=45 to Y=200) */}
              <defs>
                {/* Metallic gradient for the mast */}
                <linearGradient id="mastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="50%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>

                {/* Golden Eagle Gradient */}
                <linearGradient id="eagleGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </linearGradient>

                {/* Waving Flag Filter / Animation */}
                <filter id="shadow">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Steel Mast Post */}
              <rect x="228" y="45" width="5" height="155" fill="url(#mastGrad)" rx="2.5" />

              {/* Golden Finial Sphere at top of the mast */}
              <circle cx="230.5" cy="42" r="6" fill="url(#eagleGold)" filter="url(#shadow)" />
              <circle cx="229" cy="40" r="2" fill="#ffffff" opacity="0.6" />

              {/* Pulley block at top */}
              <rect x="226" y="47" width="9" height="5" rx="1.5" fill="#334155" />

              {/* Halyard / Rope from top pulley to base and soldier's hands */}
              {/* Flag position on the SVG: Y ranges from 165 (0%) down to 52 (100%) */}
              {(() => {
                const svgFlagY = 165 - (progress / 100) * 115;
                return (
                  <>
                    {/* Left rope (going from top pulley to flag top, then flag bottom to soldier hands) */}
                    <line
                      x1="227"
                      y1="50"
                      x2="227"
                      y2={svgFlagY}
                      stroke="#e2e8f0"
                      strokeWidth="1.2"
                      strokeDasharray="3,2"
                    />
                    <line
                      x1="227"
                      y1={svgFlagY + 42}
                      x2="218"
                      y2={isPulling ? 186 : 180}
                      stroke="#e2e8f0"
                      strokeWidth="1.2"
                      strokeDasharray="3,2"
                    />
                    {/* Return rope from soldier hands to top pulley */}
                    <line
                      x1="216"
                      y1={isPulling ? 186 : 180}
                      x2="229"
                      y2="50"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />

                    {/* =========================================
                        THE EGYPTIAN NATIONAL FLAG
                        Red (top), White with Eagle (middle), Black (bottom)
                        Waving smoothly with CSS / sine ripple
                       ========================================= */}
                    <g
                      transform={`translate(233, ${svgFlagY})`}
                      className="transition-transform duration-500 ease-out"
                      filter="url(#shadow)"
                    >
                      {/* Flag Cloth Container (Width: 68, Height: 42) */}
                      {/* Top Red Stripe */}
                      <path
                        d="M 0,0 C 22,2 44,-2 68,0 L 68,14 C 44,12 22,16 0,14 Z"
                        fill="#dc2626"
                        className="animate-flag-wave origin-left"
                      />

                      {/* Middle White Stripe */}
                      <path
                        d="M 0,14 C 22,16 44,12 68,14 L 68,28 C 44,26 22,30 0,28 Z"
                        fill="#ffffff"
                        className="animate-flag-wave origin-left"
                      />

                      {/* Golden Eagle of Saladin (نسر صلاح الدين) in center */}
                      <g transform="translate(34, 21)" className="animate-flag-wave origin-left">
                        {/* Shield */}
                        <path d="M -4,-2 L 4,-2 L 3,4 L 0,6 L -3,4 Z" fill="#d97706" />
                        <path d="M -2,-1 L 2,-1 L 1.5,3 L 0,4.5 L -1.5,3 Z" fill="#ffffff" />
                        {/* Wings & Head */}
                        <path
                          d="M 0,-5 C 2,-5 3,-3 5,-1 C 4,1 2,2 0,2 C -2,2 -4,1 -5,-1 C -3,-3 -2,-5 0,-5 Z"
                          fill="#b45309"
                        />
                        <circle cx="0" cy="-4" r="1.5" fill="#f59e0b" />
                      </g>

                      {/* Bottom Black Stripe */}
                      <path
                        d="M 0,28 C 22,30 44,26 68,28 L 68,42 C 44,40 22,44 0,42 Z"
                        fill="#09090b"
                        className="animate-flag-wave origin-left"
                      />

                      {/* Flag attachments to mast (grommets and clips) */}
                      <circle cx="1" cy="2" r="1.5" fill="#e2e8f0" />
                      <circle cx="1" cy="40" r="1.5" fill="#e2e8f0" />
                      <line x1="-5" y1="2" x2="0" y2="2" stroke="#e2e8f0" strokeWidth="1.5" />
                      <line x1="-5" y1="40" x2="0" y2="40" stroke="#e2e8f0" strokeWidth="1.5" />
                    </g>
                  </>
                );
              })()}

              {/* =========================================
                  EGYPTIAN SOLDIERS (COMMANDOS / الصاعقة)
                  Silhouettes atop the sand berm
                 ========================================= */}
              {/* Soldier 1: Hoisting Soldier (pulling the ropes) */}
              <g transform="translate(205, 168)">
                {/* Helmet */}
                <ellipse cx="12" cy="4" rx="5" ry="4" fill="#3f3f46" />
                <path d="M 6,5 Q 12,3 18,5 Q 16,7 12,7 Q 8,7 6,5 Z" fill="#27272a" />
                {/* Head */}
                <circle cx="12" cy="7" r="3.5" fill="#52525b" />
                {/* Torso & Desert Uniform */}
                <path d="M 7,10 L 17,10 L 19,26 L 5,26 Z" fill="#3f3f46" />
                {/* Ammo webbing straps */}
                <line x1="8" y1="10" x2="16" y2="24" stroke="#71717a" strokeWidth="1.5" />
                <line x1="16" y1="10" x2="8" y2="24" stroke="#71717a" strokeWidth="1.5" />
                {/* Arms pulling rope (animated alternating based on pulling action) */}
                {isPulling ? (
                  <>
                    <path d="M 7,12 L 11,20 L 13,23" stroke="#52525b" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M 17,12 L 14,18 L 13,23" stroke="#71717a" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <path d="M 7,12 L 10,16 L 13,17" stroke="#52525b" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M 17,12 L 15,16 L 13,17" stroke="#71717a" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </>
                )}
                {/* Legs planted firmly on the sand berm */}
                <path d="M 6,26 L 4,40 L 1,41" stroke="#27272a" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M 18,26 L 20,40 L 23,41" stroke="#27272a" strokeWidth="4" fill="none" strokeLinecap="round" />
              </g>

              {/* Soldier 2: Saluting Commando / Celebrating Soldier */}
              <g transform="translate(170, 166)">
                {/* Helmet */}
                <ellipse cx="12" cy="4" rx="5" ry="4" fill="#3f3f46" />
                <path d="M 6,5 Q 12,3 18,5 Q 16,7 12,7 Q 8,7 6,5 Z" fill="#27272a" />
                {/* Head */}
                <circle cx="12" cy="7" r="3.5" fill="#52525b" />
                {/* Torso */}
                <path d="M 7,10 L 17,10 L 18,26 L 6,26 Z" fill="#52525b" />
                {/* Kalashnikov AK-47 slung on back */}
                <line x1="3" y1="8" x2="21" y2="30" stroke="#18181b" strokeWidth="2.5" />
                {/* Saluting Right Arm */}
                <path
                  d="M 17,12 L 21,8 L 16,5"
                  stroke="#71717a"
                  strokeWidth="3.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Left Arm at side */}
                <path d="M 7,12 L 5,22" stroke="#52525b" strokeWidth="3" fill="none" strokeLinecap="round" />
                {/* Legs */}
                <path d="M 8,26 L 7,42 L 5,43" stroke="#27272a" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M 16,26 L 17,42 L 19,43" stroke="#27272a" strokeWidth="4" fill="none" strokeLinecap="round" />
              </g>

              {/* Soldier 3: Commando on the ridge raising his weapon in victory */}
              <g transform="translate(258, 172)">
                <ellipse cx="10" cy="4" rx="4.5" ry="3.5" fill="#3f3f46" />
                <circle cx="10" cy="7" r="3" fill="#52525b" />
                <path d="M 6,10 L 14,10 L 15,24 L 5,24 Z" fill="#3f3f46" />
                {/* Raised weapon arm in triumph */}
                <path d="M 14,12 L 18,2 L 19,-5" stroke="#71717a" strokeWidth="3" fill="none" strokeLinecap="round" />
                <line x1="15" y1="-8" x2="23" y2="-2" stroke="#18181b" strokeWidth="2.5" />
                {/* Legs */}
                <path d="M 6,24 L 5,36" stroke="#27272a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M 14,24 L 16,36" stroke="#27272a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </g>

              {/* Sand Rampart Ground Surface */}
              <path
                d="M 120,205 Q 230,196 340,202 L 340,240 L 120,240 Z"
                fill="#78350f"
                opacity="0.8"
              />
            </svg>

            {/* Sparkles & Fireworks effect */}
            {sparks.map((s) => (
              <div
                key={s.id}
                className="absolute w-2 h-2 rounded-full pointer-events-none animate-ping"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  backgroundColor: s.color,
                  boxShadow: `0 0 10px ${s.color}`,
                }}
              />
            ))}

            {/* Victory Badge Tag in Scene */}
            {isCompleted && (
              <div className="absolute top-2 left-2 bg-amber-500/90 text-stone-950 font-black px-2.5 py-1 rounded-lg text-[10px] sm:text-xs flex items-center gap-1 shadow-lg animate-bounce">
                <Trophy className="w-3.5 h-3.5" />
                <span>رُفع العلم المصري خفاقاً!</span>
              </div>
            )}
          </div>

          {/* Right Side: Informational Controls & Interactive Buttons */}
          <div className="w-full md:w-2/5 flex flex-col justify-between h-full gap-2 sm:gap-3 text-right">
            {/* Cheer / Status Announcement */}
            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-2.5 sm:p-3 shadow-md">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>نداء النصر والكرامة:</span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-200 leading-relaxed min-h-[38px] sm:min-h-[44px]">
                {cheerText}
              </p>
            </div>

            {/* Progress Display Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] sm:text-xs text-stone-300 font-bold">
                <span>سارية حصن بارليف</span>
                <span className="text-amber-400">{progress}% من الارتفاع</span>
              </div>
              <div className="w-full h-3 sm:h-3.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 shadow-inner p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {!isCompleted ? (
                <>
                  {/* Primary interactive pull button */}
                  <button
                    type="button"
                    onClick={handlePullRope}
                    className="w-full py-2.5 sm:py-3 px-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm rounded-xl border border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6)] cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 group touch-manipulation"
                  >
                    <Flag className="w-4 h-4 fill-red-600 text-red-600 group-hover:scale-110 transition-transform" />
                    <span>ارفع العلم! (اسحب الحبل) 🇪🇬</span>
                  </button>

                  {/* Secondary auto-hoist button */}
                  <button
                    type="button"
                    onClick={toggleAutoHoist}
                    className="w-full py-1.5 sm:py-2 px-3 bg-stone-950/80 hover:bg-stone-800 text-stone-300 hover:text-amber-300 font-bold text-[11px] sm:text-xs rounded-lg border border-stone-700/80 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <Play className={`w-3 h-3 ${isAutoHoisting ? 'text-amber-400 animate-spin' : ''}`} />
                    <span>{isAutoHoisting ? 'جارِ الرفع التلقائي...' : 'رفع تلقائي للمشهد ▶'}</span>
                  </button>
                </>
              ) : (
                /* Once 100% complete: Grand finish button */
                <button
                  type="button"
                  onClick={onComplete}
                  className="w-full py-2.5 sm:py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm rounded-xl border border-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.7)] cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse touch-manipulation"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>عرض لوحة النصر والتكريم 🏆</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
