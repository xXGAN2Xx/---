import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Shield, Flame, RotateCcw, Crosshair, Zap, Rocket, Plus, CheckCircle2, ToggleRight } from 'lucide-react';
import { sound } from '../utils/audio';
import { isGamePaused } from '../game/pause';
import { Difficulty } from '../game/difficulty';

interface Props {
  difficulty: Difficulty;
  onAddScore: (points: number) => void;
  onExit: () => void;
}

interface Unit {
  id: string;
  type: 'sagger' | 'tank' | 'sam';
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  cost: number;
}

const RESET_LOGS = [
  'تم تأمين رأس جسر القناة والتحصن في الساتر الشرقي.',
  'وحدات الاستطلاع ترصد تحركات مدرعات معادية في عمق الممرات.',
];

const BASE_UNITS: Unit[] = [
  { id: '1', type: 'tank', name: 'فصيل دبابات T-62', hp: 120, maxHp: 120, damage: 40, cost: 150 },
  { id: '2', type: 'sagger', name: 'كمين صواريخ مالوتكا', hp: 70, maxHp: 70, damage: 60, cost: 100 },
  { id: '3', type: 'sam', name: 'مظلة صواريخ سام-6', hp: 90, maxHp: 90, damage: 80, cost: 180 },
];

const TUNING: Record<Difficulty, { supplies: number; enemyPressure: number; unitEfficiency: number }> = {
  easy: { supplies: 600, enemyPressure: 0.72, unitEfficiency: 1.12 },
  normal: { supplies: 500, enemyPressure: 1, unitEfficiency: 1 },
  heroic: { supplies: 450, enemyPressure: 1.35, unitEfficiency: 0.9 },
};

export const SurvivalTacticalModeV2: React.FC<Props> = ({ difficulty, onAddScore, onExit }) => {
  const tuning = TUNING[difficulty];
  const [wave, setWave] = useState(1);
  const [supplies, setSupplies] = useState(tuning.supplies);
  const [bridgeIntegrity, setBridgeIntegrity] = useState(100);
  const [score, setScore] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [enemiesRemaining, setEnemiesRemaining] = useState(6);
  const [autoDefend, setAutoDefend] = useState(true);
  const [combatLogs, setCombatLogs] = useState<string[]>(RESET_LOGS);
  const [deployedUnits, setDeployedUnits] = useState<Unit[]>(BASE_UNITS);

  const refs = useRef({
    wave: 1,
    enemies: 6,
    supplies: tuning.supplies,
    bridge: 100,
    autoDefend: true,
    units: BASE_UNITS,
    waveActive: false,
  });

  const sync = () => {
    refs.current.supplies = supplies;
    refs.current.bridge = bridgeIntegrity;
    refs.current.enemies = enemiesRemaining;
    refs.current.wave = wave;
    refs.current.autoDefend = autoDefend;
    refs.current.units = deployedUnits;
    refs.current.waveActive = waveActive;
  };

  const addLog = (msg: string) => setCombatLogs((prev) => [msg, ...prev.slice(0, 4)]);

  useEffect(sync, [supplies, bridgeIntegrity, enemiesRemaining, wave, autoDefend, deployedUnits, waveActive]);

  const startWave = () => {
    if (refs.current.waveActive || isGameOver) return;
    const next = 4 + refs.current.wave * 3;
    refs.current.enemies = next;
    refs.current.waveActive = true;
    setEnemiesRemaining(next);
    setWaveActive(true);
    sound.playRadioClick();
    addLog(`بدأت الموجة #${refs.current.wave}: ${next} هدفاً معادياً تقترب من المعبر.`);
  };

  useEffect(() => {
    if (!waveActive || isGameOver) return;

    const interval = setInterval(() => {
      if (isGamePaused()) return;
      const s = refs.current;
      const alive = s.units.filter((u) => u.hp > 0);

      if (s.autoDefend && alive.length) {
        const output = alive.reduce((sum, unit) => {
          const health = Math.max(0.35, unit.hp / unit.maxHp);
          const roleBonus = unit.type === 'sagger' ? 1.15 : unit.type === 'sam' ? 0.9 : 1;
          return sum + unit.damage * health * roleBonus;
        }, 0) * tuning.unitEfficiency;
        const dealt = Math.max(1, Math.round(output / 14));
        const remaining = Math.max(0, s.enemies - dealt);
        s.enemies = remaining;
        setEnemiesRemaining(remaining);

        sound.playCannon();

        if (remaining <= 0) {
          const bonus = s.wave * 650;
          s.waveActive = false;
          s.wave += 1;
          s.supplies += 300 + s.wave * 30;
          setWave((v) => v + 1);
          setSupplies(s.supplies);
          setWaveActive(false);
          setScore((v) => v + bonus);
          onAddScore(bonus);
          addLog(`✓ تم صد الموجة #${s.wave - 1} وحافظت الوحدات على المعبر.`);
          sound.playVictoryFanfare();
          return;
        }
      } else if (alive.length && Math.random() < 0.35) {
        addLog('⚠️ الدفاع الآلي متوقف — الوحدات في انتظار أوامر.');
      }

      const bridgeDamage = Math.max(1, Math.round((2 + s.wave * 0.75) * tuning.enemyPressure));
      s.bridge = Math.max(0, s.bridge - bridgeDamage);
      setBridgeIntegrity(s.bridge);

      if (alive.length && Math.random() < Math.min(0.55, 0.2 + s.wave * 0.02)) {
        const index = Math.floor(Math.random() * s.units.length);
        const target = s.units[index];
        if (target?.hp > 0) {
          const damage = Math.max(2, Math.round((4 + s.wave) * tuning.enemyPressure));
          const updated = s.units.map((unit, i) => i === index ? { ...unit, hp: Math.max(0, unit.hp - damage) } : unit);
          s.units = updated;
          setDeployedUnits(updated);
          if (updated[index].hp === 0) addLog(`⚠️ ${target.name} خرجت من الخدمة.`);
        }
      }

      if (s.bridge <= 0) {
        s.waveActive = false;
        setWaveActive(false);
        setIsGameOver(true);
        sound.playExplosion(1.5);
        addLog('⚠️ انهار المعبر الرئيسي. انتهت عملية الدفاع.');
      }
    }, 900);

    return () => clearInterval(interval);
  }, [waveActive, isGameOver, tuning, onAddScore]);

  const deployUnit = (type: Unit['type'], cost: number) => {
    const s = refs.current;
    if (s.supplies < cost || s.units.length >= 8) return;
    const data = {
      tank: { name: 'فصيل دبابات T-62', hp: 120, damage: 40 },
      sagger: { name: 'كمين صواريخ مالوتكا', hp: 70, damage: 60 },
      sam: { name: 'مظلة صواريخ سام-6', hp: 90, damage: 80 },
    }[type];
    const nextUnit: Unit = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      name: data.name,
      hp: data.hp,
      maxHp: data.hp,
      damage: data.damage,
      cost,
    };
    const nextUnits = [...s.units, nextUnit];
    s.supplies -= cost;
    s.units = nextUnits;
    setSupplies(s.supplies);
    setDeployedUnits(nextUnits);
    sound.playRadioClick();
    addLog(`تم نشر ${data.name} في الموضع الدفاعي. (${nextUnits.length}/8)`);
  };

  const repairBridge = () => {
    const s = refs.current;
    if (s.supplies < 100 || s.bridge >= 100) return;
    s.supplies -= 100;
    s.bridge = Math.min(100, s.bridge + 25);
    setSupplies(s.supplies);
    setBridgeIntegrity(s.bridge);
    sound.playRadioClick();
    addLog('سلاح المهندسين أصلح ودعّم أجزاء الكوبري المتضررة.');
  };

  const callAirstrike = () => {
    const s = refs.current;
    if (s.supplies < 180 || !s.waveActive || s.enemies <= 0 || isGameOver) return;
    s.supplies -= 180;
    const cleared = Math.min(3, s.enemies);
    s.enemies -= cleared;
    setSupplies(s.supplies);
    setEnemiesRemaining(s.enemies);
    const earned = cleared * 150;
    setScore((v) => v + earned);
    onAddScore(earned);
    sound.playJetFlyby();
    sound.playExplosion(1.5);
    addLog(`✓ دعم جوي عاجل: تم تدمير ${cleared} أهداف معادية.`);
  };

  const toggleAutoDefend = () => {
    refs.current.autoDefend = !refs.current.autoDefend;
    setAutoDefend(refs.current.autoDefend);
    sound.playRadioClick();
    addLog(refs.current.autoDefend ? 'تم تفعيل الدفاع الآلي.' : 'تم إيقاف الدفاع الآلي.');
  };

  const reset = () => {
    const units = BASE_UNITS.map((u) => ({ ...u }));
    refs.current = {
      wave: 1, enemies: 6, supplies: tuning.supplies, bridge: 100,
      autoDefend: true, units, waveActive: false,
    };
    setWave(1); setSupplies(tuning.supplies); setBridgeIntegrity(100); setScore(0);
    setWaveActive(false); setIsGameOver(false); setEnemiesRemaining(6);
    setAutoDefend(true); setDeployedUnits(units); setCombatLogs(RESET_LOGS);
    sound.playRadioTransmission();
  };

  const activeUnits = deployedUnits.filter((u) => u.hp > 0).length;
  const waveMax = 4 + wave * 3;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-stone-900 shadow-2xl" dir="rtl">
      <div className="p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors" aria-label="العودة لغرفة العمليات"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-base font-bold font-cairo text-amber-400">الدفاع التكتيكي عن رؤوس الكباري</h2>
            <p className="text-xs text-stone-400">الموجات المعادية · الوحدات المنشورة تشتبك فعلياً</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="text-emerald-400">سلامة الكوبري: <b>{bridgeIntegrity}%</b></span>
          <span className="text-amber-400">الإمداد: <b>{supplies}</b></span>
          <span className="text-stone-200">الموجة: <b>#{wave}</b></span>
          <span className="text-sky-300">الوحدات: <b>{activeUnits}/{deployedUnits.length}</b></span>
        </div>
      </div>

      <div className="relative w-full flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 grid lg:grid-cols-2 gap-4 h-full">
          <section className="rounded-xl border border-stone-800 bg-stone-950/70 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-cairo font-bold text-stone-100">الوحدات المنتشرة</h3>
              <span className="text-[11px] text-stone-400">حد أقصى 8</span>
            </div>
            <div className="space-y-2">
              {deployedUnits.map((u) => (
                <div key={u.id} className={`rounded-lg border p-3 ${u.hp > 0 ? 'border-stone-800 bg-stone-900' : 'border-red-900/60 bg-red-950/20 opacity-70'}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-stone-100">{u.name}</span>
                    <span className={u.hp > 0 ? 'text-emerald-400' : 'text-red-400'}>{u.hp > 0 ? 'جاهزة' : 'خارج الخدمة'}</span>
                  </div>
                  <div className="h-2 bg-stone-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-900/40 bg-stone-950/70 p-4 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-cairo font-bold text-amber-400">المعركة الجارية</h3>
                <p className="text-xs text-stone-400 mt-1">{waveActive ? `${enemiesRemaining} هدفاً معادياً باقياً` : 'القطاع هادئ — ابدأ الموجة التالية.'}</p>
              </div>
              <span className="font-mono text-amber-400">#{wave}</span>
            </div>
            <div className="h-3 bg-stone-900 rounded-full overflow-hidden border border-stone-800 mb-5">
              <div className="h-full bg-red-600 transition-all" style={{ width: `${waveActive ? (enemiesRemaining / Math.max(1, waveMax)) * 100 : 0}%` }} />
            </div>
            <div className="bg-stone-900/80 border border-stone-800 rounded-lg p-3 flex-1 min-h-[180px]">
              <div className="text-[11px] font-bold text-stone-400 mb-2">برقيات المعركة</div>
              <div className="space-y-1.5 text-xs">
                {combatLogs.map((log, i) => <div key={i} className="text-stone-300">{log}</div>)}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="p-3 sm:p-4 border-t border-stone-800 bg-stone-950 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => deployUnit('tank', 150)} disabled={supplies < 150 || deployedUnits.length >= 8} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-xs font-bold rounded-lg border border-stone-700"><Plus className="inline w-3.5 h-3.5 ml-1 text-emerald-400" />دبابة T-62</button>
          <button type="button" onClick={() => deployUnit('sagger', 100)} disabled={supplies < 100 || deployedUnits.length >= 8} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-xs font-bold rounded-lg border border-stone-700"><Plus className="inline w-3.5 h-3.5 ml-1 text-red-400" />فريق مالوتكا</button>
          <button type="button" onClick={() => deployUnit('sam', 180)} disabled={supplies < 180 || deployedUnits.length >= 8} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-xs font-bold rounded-lg border border-stone-700"><Plus className="inline w-3.5 h-3.5 ml-1 text-sky-400" />بطارية سام-6</button>
          <button type="button" onClick={repairBridge} disabled={supplies < 100 || bridgeIntegrity >= 100} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-xs font-bold rounded-lg border border-stone-700"><Shield className="inline w-3.5 h-3.5 ml-1 text-emerald-400" />إصلاح 100</button>
          <button type="button" onClick={toggleAutoDefend} className={`px-3 py-2 rounded-lg border text-xs font-bold ${autoDefend ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-stone-700 bg-stone-900 text-stone-300'}`}><ToggleRight className="inline w-3.5 h-3.5 ml-1" />الدفاع الآلي {autoDefend ? 'مفعّل' : 'متوقف'}</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={callAirstrike} disabled={supplies < 180 || !waveActive} className="px-3.5 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-black rounded-lg"><Rocket className="inline w-3.5 h-3.5 ml-1" />دعم جوي</button>
          {!waveActive && !isGameOver && <button type="button" onClick={startWave} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-lg">بدء الموجة #{wave}</button>}
        </div>
      </div>

      {isGameOver && (
        <div className="absolute inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="text-5xl mb-2">⚠️</div>
            <h3 className="text-2xl font-black font-cairo text-red-400 mb-2">انهار رأس الجسر</h3>
            <p className="text-xs text-stone-300 mb-5">وصلت إلى الموجة #{wave} وسجلت ${score} نقطة. الإدارة الأفضل للإمدادات والوحدات ستطيل مدة الصمود.</p>
            <button type="button" onClick={reset} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg inline-flex items-center gap-2"><RotateCcw className="w-4 h-4" />إعادة الدفاع</button>
          </div>
        </div>
      )}
    </div>
  );
};
