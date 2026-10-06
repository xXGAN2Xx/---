import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Droplets, RotateCcw, Target, Waves, Shield, Zap, Clock3 } from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { Difficulty } from '../game/difficulty';
import { isGamePaused } from '../game/pause';
import { sound } from '../utils/audio';

interface CrossingMissionProps { difficulty?: Difficulty; onComplete: (scoreEarned: number) => void; onDefeat?: () => void; onExit: () => void; }
type Defender = { id: number; x: number; hp: number; maxHp: number; kind: 'bunker' | 'gun' | 'mortar'; cooldown: number; destroyed: boolean; };
type Breach = { id: number; progress: number; complete: boolean; };
type Boat = { id: number; lane: number; progress: number; hp: number; };

const defenderSeed: Defender[] = [
  { id: 1, x: 735, hp: 150, maxHp: 150, kind: 'bunker', cooldown: 1.8, destroyed: false },
  { id: 2, x: 825, hp: 110, maxHp: 110, kind: 'gun', cooldown: 1.2, destroyed: false },
  { id: 3, x: 915, hp: 170, maxHp: 170, kind: 'mortar', cooldown: 2.4, destroyed: false },
  { id: 4, x: 1005, hp: 110, maxHp: 110, kind: 'gun', cooldown: 1.5, destroyed: false },
];
const laneX = [725, 850, 975];
const defenderName: Record<Defender['kind'], string> = { bunker: 'دشمة', gun: 'مدفع ميدان', mortar: 'هاون' };

export const CrossingMission: React.FC<CrossingMissionProps> = ({ difficulty = 'normal', onComplete, onDefeat, onExit }) => {
  const [timeLeft, setTimeLeft] = useState(120);
  const [water, setWater] = useState(100);
  const [score, setScore] = useState(0);
  const [selectedLane, setSelectedLane] = useState(1);
  const [spraying, setSpraying] = useState(false);
  const [breaches, setBreaches] = useState<Breach[]>(() => [0, 1, 2].map((id) => ({ id, progress: 0, complete: false })) );
  const [defenders, setDefenders] = useState<Defender[]>(() => defenderSeed.map((d) => ({ ...d })) );
  const [boats, setBoats] = useState<Boat[]>([]);
  const [missionWon, setMissionWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [message, setMessage] = useState('حدد موضع الثغرة ثم شغّل خرطوم المياه.');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ timeLeft: 120, water: 100, score: 0, selectedLane: 1, spraying: false, breaches: [0,1,2].map((id) => ({ id, progress: 0, complete: false })) as Breach[], defenders: defenderSeed.map((d) => ({ ...d })), boats: [] as Boat[], shots: [] as Array<{ x:number; y:number; vx:number; vy:number; life:number }>, lastShot: 0, won: false, defeated: false });

  const reset = () => {
    const freshBreaches = [0,1,2].map((id) => ({ id, progress: 0, complete: false }));
    const freshDefenders = defenderSeed.map((d) => ({ ...d }));
    stateRef.current = { timeLeft: 120, water: 100, score: 0, selectedLane: 1, spraying: false, breaches: freshBreaches, defenders: freshDefenders, boats: [], shots: [], lastShot: 0, won: false, defeated: false };
    setTimeLeft(120); setWater(100); setScore(0); setSelectedLane(1); setSpraying(false); setBreaches(freshBreaches); setDefenders(freshDefenders); setBoats([]); setMissionWon(false); setIsDefeated(false); setMessage('حدد موضع الثغرة ثم شغّل خرطوم المياه.');
    sound.playRadioTransmission();
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isGamePaused() || stateRef.current.won || stateRef.current.defeated) return;
      const s = stateRef.current;
      s.timeLeft = Math.max(0, s.timeLeft - 1);
      setTimeLeft(s.timeLeft);
      if (s.timeLeft === 0) { s.defeated = true; s.spraying = false; setSpraying(false); setIsDefeated(true);
          onDefeat?.(); sound.playDefeatSound(); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const s = stateRef.current;
      if (!isGamePaused() && !s.won && !s.defeated) {
        for (const d of s.defenders) {
          if (d.destroyed) continue;
          d.cooldown -= dt;
          if (d.cooldown <= 0) {
            d.cooldown = d.kind === 'gun' ? 2.2 : d.kind === 'bunker' ? 3.0 : 3.8;
            const bx = laneX[s.selectedLane];
            const dx = bx - d.x; const dy = 390 - 300;
            const len = Math.max(1, Math.hypot(dx, dy));
            s.shots.push({ x: d.x, y: d.kind === 'mortar' ? 286 : 307, vx: (dx / len) * 120, vy: (dy / len) * 120, life: 6 });
          }
        }
        for (const sh of s.shots) {
          sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
          const bx = laneX[s.selectedLane];
          if (Math.hypot(sh.x - bx, sh.y - 390) < 22) { sh.life = 0; setMessage('نيران معادية على القطاع المحدد — بدّل الثغرة أو أسرع بالمياه.'); }
        }
        s.shots = s.shots.filter((sh) => sh.life > 0);

        for (const b of s.breaches) {
          if (s.spraying && b.id === s.selectedLane && s.water > 0 && !b.complete) {
            b.progress = Math.min(100, b.progress + dt * 24);
            s.water = Math.max(0, s.water - dt * 6.2);
            if (b.progress >= 100) {
              b.complete = true; b.progress = 100; s.spraying = false; setSpraying(false); s.score += 900;
              sound.playWaterCannon();
              setMessage('✓ الثغرة ' + String(b.id + 1) + ' فُتحت. حرّك الخراطيم إلى الثغرة التالية.');
            }
          }
        }

        for (const boat of s.boats) {
          const lane = s.breaches[boat.lane];
          boat.progress += dt * (0.085 + lane.progress / 2200);
          if (boat.progress < 0.92 && Math.random() < 0.0025) boat.hp -= 8;
        }
        const crossed = s.boats.filter((b) => b.progress >= 1 && b.hp > 0).length;
        if (crossed > 0) {
          s.score += crossed * 350; s.boats = s.boats.filter((b) => b.progress < 1 && b.hp > 0);
          setMessage('✓ عبرت ' + String(crossed) + ' زوارق اقتحام بأمان.');
        }
        setWater(Math.round(s.water)); setScore(s.score); setBreaches(s.breaches.map((b) => ({ ...b }))); setDefenders(s.defenders.map((d) => ({ ...d }))); setBoats(s.boats.map((b) => ({ ...b })));

        if (s.breaches.every((b) => b.complete) && !s.won) {
          s.won = true; s.score += 1800 + s.timeLeft * 6; setScore(s.score); setMissionWon(true); sound.playVictoryFanfare();
        }
      }

      const w = canvas.width; const h = canvas.height;
      const sky = ctx.createLinearGradient(0, 0, 0, 285); sky.addColorStop(0, '#0f2740'); sky.addColorStop(1, '#d39b58');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#a87b4e'; ctx.fillRect(0, 290, w, 95);
      ctx.fillStyle = '#8b633f'; ctx.fillRect(670, 260, 430, 125);
      ctx.fillStyle = '#146b90'; ctx.fillRect(0, 385, w, 120);
      ctx.fillStyle = '#2da5cf'; for (let y = 400; y < 500; y += 18) ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = '#6b4b31'; ctx.fillRect(0, 505, w, 55);
      ctx.fillStyle = '#e5c38d'; ctx.font = 'bold 14px Cairo, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('الضفة الشرقية · كل الدفاعات على الأرض', 22, 28);
      ctx.fillText('الضفة الغربية · قوارب الاقتحام', 22, 55);

      for (const b of s.breaches) {
        const x = laneX[b.id];
        ctx.fillStyle = b.complete ? '#14532d' : '#513a28'; ctx.fillRect(x - 48, 358, 96, 34);
        ctx.strokeStyle = b.complete ? '#4ade80' : '#facc15'; ctx.lineWidth = 3; ctx.strokeRect(x - 48, 358, 96, 34);
        ctx.fillStyle = '#171717'; ctx.fillRect(x - 34, 398, 68, 7);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(x - 34, 398, 68 * (b.progress / 100), 7);
        ctx.fillStyle = '#fef3c7'; ctx.font = 'bold 11px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ثغرة ' + String(b.id + 1), x, 380);
      }

      for (const d of s.defenders) {
        const x = d.x; const y = 300;
        ctx.fillStyle = 'rgba(28,25,23,0.55)'; ctx.beginPath(); ctx.ellipse(x, y + 14, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (d.destroyed || d.hp <= 0) { ctx.fillStyle = '#292524'; ctx.fillRect(x - 28, y - 10, 56, 14); continue; }
        if (d.kind === 'bunker') { ctx.fillStyle = '#57534e'; ctx.fillRect(x - 34, y - 28, 68, 30); ctx.fillStyle = '#111827'; ctx.fillRect(x - 7, y - 9, 20, 9); }
        if (d.kind === 'gun') { ctx.fillStyle = '#374151'; ctx.fillRect(x - 24, y - 10, 48, 12); ctx.strokeStyle = '#111827'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x - 34, y - 28); ctx.stroke(); }
        if (d.kind === 'mortar') { ctx.fillStyle = '#14532d'; ctx.fillRect(x - 22, y - 28, 44, 26); ctx.strokeStyle = '#111827'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x - 8, y - 48); ctx.stroke(); }
        ctx.fillStyle = '#450a0a'; ctx.fillRect(x - 30, y - 54, 60, 6); ctx.fillStyle = '#22c55e'; ctx.fillRect(x - 30, y - 54, 60 * (d.hp / d.maxHp), 6);
        ctx.fillStyle = '#fde68a'; ctx.font = 'bold 10px Cairo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(defenderName[d.kind], x, y - 62);
      }

      for (const boat of s.boats) {
        const x = laneX[boat.lane] * boat.progress + 585 * (1 - boat.progress); const y = 430 + boat.lane * 17;
        ctx.fillStyle = '#111827'; ctx.fillRect(x - 24, y - 8, 48, 13); ctx.fillStyle = '#e5e7eb'; ctx.fillRect(x - 17, y - 12, 34, 4); ctx.fillStyle = '#facc15'; ctx.fillRect(x - 4, y - 22, 3, 10);
      }
      for (const sh of s.shots) { ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2); ctx.fill(); }
      if (s.spraying && s.water > 0) { const x = laneX[s.selectedLane]; ctx.strokeStyle = 'rgba(186,230,253,0.8)'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(160, 520); ctx.lineTo(x, 380); ctx.stroke(); }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const launchBoat = () => {
    const s = stateRef.current; if (!s.breaches[s.selectedLane].complete || s.boats.length >= 5 || s.won || s.defeated) return;
    s.boats.push({ id: Date.now(), lane: s.selectedLane, progress: 0, hp: 100 });
    setBoats(s.boats.map((b) => ({ ...b }))); sound.playRadioClick();
  };

  const toggleSpray = () => {
    const s = stateRef.current; if (s.water <= 0 || s.won || s.defeated) return;
    const target = s.breaches[s.selectedLane];
    if (target.complete) { setMessage('الثغرة دي مفتوحة بالفعل — اختار ثغرة تانية.'); return; }
    s.spraying = !s.spraying; setSpraying(s.spraying);
    setMessage(s.spraying ? 'خرطوم المية شغال — وجّه الرش على الثغرة المحددة.' : 'تم إيقاف خرطوم المية.');
    if (s.spraying) sound.playWaterCannon();
  };

  return (
    <div dir='rtl' className='w-full h-full min-h-0 flex flex-col bg-stone-950 text-stone-100 overflow-hidden'>
      <div className='px-3 sm:px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <button type='button' onClick={onExit} className='p-2 rounded-lg bg-stone-900 border border-stone-800'><ArrowLeft className='w-4 h-4'/></button>
          <div><h2 className='font-cairo font-black text-amber-400 text-sm sm:text-base'>اختراق خط بارليف · عملية فتح الثغرات</h2><p className='text-[10px] sm:text-xs text-stone-400'>دافع عن فرق المهندسين وافتح 3 ممرات آمنة لعبور القوارب</p></div>
        </div>
        <div className='flex items-center gap-2 text-[11px] sm:text-xs'><span className='px-2 py-1 rounded bg-stone-900 border border-stone-800 text-amber-300'>{score} نقطة</span><span className='px-2 py-1 rounded bg-stone-900 border border-stone-800 text-sky-300'>ماء {water}%</span><span className='px-2 py-1 rounded bg-stone-900 border border-stone-800 text-emerald-300'>ثغرات {breaches.filter((b) => b.complete).length}/3</span></div>
      </div>
      <div className='px-3 sm:px-4 py-2 bg-stone-900 border-b border-stone-800 flex flex-wrap gap-2 items-center'>
        {[0,1,2].map((id) => <button key={id} type='button' onClick={() => { stateRef.current.selectedLane = id; setSelectedLane(id); }} className={'min-h-11 px-3 py-2 rounded-lg border text-xs font-bold touch-manipulation ' + (selectedLane === id ? 'bg-amber-500 text-stone-950 border-amber-300' : 'bg-stone-950 text-stone-300 border-stone-800')}>الثغرة {id + 1}</button>)}
        <span className='mr-auto text-[10px] text-stone-500 hidden md:inline'>{message}</span>
      </div>
      <div className='relative flex-1 min-h-0'>
        <canvas ref={canvasRef} width={1100} height={560} className='w-full h-full object-contain touch-none' aria-label='مشهد خط بارليف وخراطيم المياه' />
        {!missionWon && !isDefeated && <MissionDigitalTimer timeLeft={timeLeft} totalTime={120} label='الوقت المتبقي' position='top-center'/>}
        <div className='absolute left-3 right-3 bottom-3 flex items-center justify-between gap-2 pointer-events-none'>
          <div className='px-3 py-2 rounded-xl bg-stone-950/90 border border-stone-800 text-[11px] text-stone-200'><Target className='inline w-4 h-4 text-amber-400 ml-1'/> الهدف: فتح كل الثغرات الثلاث ثم إرسال القوارب</div>
          <div className='px-3 py-2 rounded-xl bg-stone-950/90 border border-stone-800 text-[11px] text-amber-300'><Shield className='inline w-4 h-4 ml-1'/> الدفاعات مثبتة على الأرض</div>
        </div>
        {missionWon && <div className='absolute inset-0 bg-stone-950/90 flex items-center justify-center p-5 z-30'><div className='max-w-md w-full text-center'><CheckCircle2 className='w-16 h-16 mx-auto text-emerald-400 mb-3'/><h3 className='text-2xl font-black font-cairo text-amber-400'>تم اختراق الساتر وفتح الطريق!</h3><p className='text-xs text-stone-300 mt-2 mb-5'>الثغرات الثلاث أصبحت جاهزة لعبور القوات.</p><button type='button' onClick={() => onComplete(score)} className='px-6 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-lg'>المرحلة التالية</button></div></div>}
        {isDefeated && <div className='absolute inset-0 bg-stone-950/90 flex items-center justify-center p-5 z-30'><div className='max-w-md w-full text-center'><Clock3 className='w-14 h-14 mx-auto text-red-400 mb-3'/><h3 className='text-2xl font-black font-cairo text-red-400'>انتهى وقت العملية</h3><p className='text-xs text-stone-300 mt-2 mb-5'>أعد توزيع المياه وابدأ بالثغرة الأقل تعرضًا للنيران.</p><button type='button' onClick={reset} className='px-6 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-lg inline-flex items-center gap-2'><RotateCcw className='w-4 h-4'/>إعادة العملية</button></div></div>}
      </div>
      <div className='hidden sm:flex px-3 sm:px-4 py-2.5 border-t border-stone-800 bg-stone-950 flex-wrap items-center justify-between gap-2'>
        <div className='text-[11px] text-stone-400 truncate'>{message}</div>
        <div className='flex gap-2'>
          <button type='button' onClick={toggleSpray} disabled={water <= 0 || missionWon || isDefeated} className={'min-h-11 px-4 py-2.5 rounded-lg text-xs font-bold border touch-manipulation ' + (spraying ? 'bg-sky-500 text-stone-950 border-sky-300' : 'bg-stone-800 text-stone-100 border-stone-700')}><Droplets className='inline w-4 h-4 ml-1'/>{spraying ? 'إيقاف المياه' : 'تشغيل الخراطيم'}</button>
          <button type='button' onClick={launchBoat} disabled={!breaches[selectedLane].complete || boats.length >= 5 || missionWon || isDefeated} className='min-h-11 px-4 py-2.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-black disabled:opacity-40'><Waves className='inline w-4 h-4 ml-1'/>إرسال قارب</button>
        </div>
      </div>
    </div>
  );
}
