import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Shield, Flame, RotateCcw, Crosshair, Zap, Rocket, Plus, CheckCircle2, ToggleRight } from 'lucide-react';
import { Difficulty } from '../game/difficulty';

interface SurvivalTacticalModeProps {
  onAddScore: (points: number) => void;
  onExit: () => void;
}

interface Unit {
  id: string;
  type: 'sagger' | 'tank' | 'sam';
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  cost: number;
}

export const SurvivalTacticalMode: React.FC<SurvivalTacticalModeProps> = ({ onAddScore, onExit }) => {
  const [wave, setWave] = useState(1);
  const [supplies, setSupplies] = useState(500);
  const [bridgeIntegrity, setBridgeIntegrity] = useState(100);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [waveActive, setWaveActive] = useState(false);
  const [enemiesRemaining, setEnemiesRemaining] = useState(6);
  const [autoDefend, setAutoDefend] = useState(true);
  const [combatLogs, setCombatLogs] = useState<string[]>([
    'تم تأمين رأس جسر القناة والتحصن في الساتر الشرقي.',
    'وحدات الاستطلاع ترصد تحركات مدرعات معادية في عمق الممرات.',
  ]);

  const [deployedUnits, setDeployedUnits] = useState<Unit[]>([
    { id: '1', type: 'tank', name: 'فصيل دبابات تي-62', x: 25, y: 35, hp: 120, maxHp: 120, damage: 40, cost: 150 },
    { id: '2', type: 'sagger', name: 'كمين صواريخ مالوتكا', x: 25, y: 65, hp: 70, maxHp: 70, damage: 60, cost: 100 },
    { id: '3', type: 'sam', name: 'مظلة صواريخ سام-6', x: 25, y: 85, hp: 90, maxHp: 90, damage: 80, cost: 180 },
  ]);

  const addLog = (msg: string) => {
    setCombatLogs((prev) => [msg, ...prev.slice(0, 4)]);
  };

  // Start next wave
  const startWave = () => {
    setWaveActive(true);
    const count = 4 + wave * 3;
    setEnemiesRemaining(count);
    sound.playRadioClick();
    addLog(`بدء الهجوم المعاكس للعدو (الموجة #${wave})!`);
  };

  // Wave combat simulation tick
  useEffect(() => {
    if (!waveActive || isGameOver) return;

    const interval = setInterval(() => {
      setEnemiesRemaining((prev) => {
        if (prev <= 1) {
          // Wave Cleared
          sound.playVictoryFanfare();
          setWaveActive(false);
          setWave((w) => w + 1);
          setSupplies((s) => s + 300);
          const bonus = wave * 650;
          setScore((sc) => sc + bonus);
          onAddScore(bonus);
          addLog(`✓ تم صد الموجة #${wave} بنجاح ساحق والحفاظ على رأس الكوبري!`);
          return 0;
        }

        // Combat exchange
        if (Math.random() < 0.6) {
          sound.playCannon();
        } else {
          sound.playGunshot();
        }

        // Bridge or unit damage
        if (Math.random() < 0.25) {
          setBridgeIntegrity((b) => {
            const next = Math.max(0, b - 4);
            if (next <= 0) {
              setIsGameOver(true);
              sound.playExplosion(1.5);
              addLog('⚠️ سقط المعبر تحت وابل نيران العدو!');
            }
            return next;
          });
        }

        return prev - 1;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [waveActive, isGameOver, wave]);

  // Deploy Unit
  const deployUnit = (type: 'sagger' | 'tank' | 'sam', cost: number) => {
    if (supplies < cost) return;
    setSupplies((s) => s - cost);
    sound.playRadioClick();

    const name = type === 'tank' ? 'فصيل دبابات T-62' : type === 'sagger' ? 'كمين مالوتكا' : 'مظلة سام-6';
    const newUnit: Unit = {
      id: Date.now().toString(),
      type,
      name,
      x: 15 + Math.random() * 20,
      y: 20 + Math.random() * 60,
      hp: type === 'tank' ? 120 : 80,
      maxHp: type === 'tank' ? 120 : 80,
      damage: type === 'tank' ? 40 : 65,
      cost,
    };
    setDeployedUnits((prev) => [...prev, newUnit]);
    addLog(`تم نشر ${name} في الخطوط الأمامية.`);
  };

  // Repair Bridgehead
  const repairBridge = () => {
    if (supplies < 100 || bridgeIntegrity >= 100) return;
    setSupplies((s) => s - 100);
    setBridgeIntegrity((b) => Math.min(100, b + 25));
    sound.playRadioClick();
    addLog('سلاح المهندسين أنجز صيانة وتدعيم الجسر العائم.');
  };

  // Call Emergency Airstrike
  const callAirstrike = () => {
    if (supplies < 180 || !waveActive) return;
    setSupplies((s) => s - 180);
    sound.playJetFlyby();
    setTimeout(() => sound.playExplosion(1.5), 500);
    setEnemiesRemaining((e) => Math.max(0, e - 3));
    setScore((sc) => sc + 450);
    onAddScore(450);
    addLog('نسور الجو نفذوا قصفاً دقيقاً لرتل العدو المتقدم!');
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-stone-900 shadow-2xl">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-stone-950/95 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold font-cairo text-amber-400">الدفاع التكتيكي عن رؤوس الكباري</h2>
            <p className="text-xs text-stone-400">تأمين الجسور العائمة وصد الهجمات المضادة في سيناء</p>
          </div>
        </div>

        {/* Meters */}
        <div className="flex items-center gap-6 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-stone-300">سلامة الكوبري:</span>
            <span className="font-mono tabular-nums text-emerald-400 font-bold">{bridgeIntegrity}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-stone-300">النقاط اللوجستية:</span>
            <span className="font-mono tabular-nums text-amber-400 font-bold">{supplies}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-stone-300">الموجة:</span>
            <span className="font-mono tabular-nums text-stone-100 font-bold">#{wave}</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Tactical Map */}
      <div className="relative w-full aspect-[16/9] max-h-[500px] bg-stone-950 p-6 flex flex-col justify-between overflow-hidden">
        {/* Tactical Map Grid */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Suez Canal & Bridge Representation */}
        <div className="absolute left-[38%] top-0 bottom-0 w-24 bg-sky-950/80 border-x border-sky-800/40 flex flex-col justify-center items-center">
          <span className="text-[10px] text-sky-400/80 -rotate-90 whitespace-nowrap font-cairo">قناة السويس</span>
          <div className="w-full h-14 bg-stone-700 border-y border-stone-500 flex items-center justify-center">
            <span className="text-[9px] font-bold text-amber-400 font-mono">PMP كوبري</span>
          </div>
        </div>

        {/* Sectors */}
        <div className="relative z-10 grid grid-cols-2 h-full gap-8 pointer-events-none">
          {/* Western Bank */}
          <div className="border border-stone-800/80 rounded-xl p-4 bg-stone-900/60 backdrop-blur-sm">
            <span className="text-xs font-bold text-stone-300 block mb-3 font-cairo">
              الضفة الغربية (قواعد الإمداد وحائط الصواريخ)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {deployedUnits.map((u) => (
                <div key={u.id} className="p-2.5 bg-stone-800/90 rounded-lg border border-stone-700 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-emerald-400 font-bold">{u.name}</span>
                    <span className="text-[10px] text-stone-400">جاهز ✓</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Eastern Bank */}
          <div className="border border-amber-900/40 rounded-xl p-4 bg-stone-900/60 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400 block mb-2 font-cairo">
                الضفة الشرقية (رأس جسر سيناء)
              </span>
              <p className="text-xs text-stone-300">
                {waveActive ? `قوات العدو المهاجمة: ${enemiesRemaining} وحدة متبقية!` : 'القطاع تحت السيطرة. استعد للموجة القادمة!'}
              </p>
            </div>

            {/* Combat Activity Ticker */}
            <div className="bg-stone-950/70 p-3 rounded-lg border border-stone-800 text-[11px] space-y-1">
              <span className="text-stone-400 font-bold block mb-1">برقيات المعركة المباشرة:</span>
              {combatLogs.map((log, idx) => (
                <div key={idx} className="text-stone-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{log}</span>
                </div>
              ))}
            </div>

            {waveActive && (
              <div className="w-full bg-stone-900 border border-stone-800 p-3 rounded-lg flex items-center gap-3">
                <Crosshair className="w-6 h-6 text-red-500 animate-spin" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-stone-300 mb-1">
                    <span>الاشتباك مع ألوية العدو</span>
                    <span className="font-mono text-red-400">{enemiesRemaining} هدف</span>
                  </div>
                  <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${(enemiesRemaining / (4 + wave * 3)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Actions */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => deployUnit('tank', 150)}
              disabled={supplies < 150}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-bold rounded-lg cursor-pointer border border-stone-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              دبابة T-62 (150)
            </button>
            <button
              onClick={() => deployUnit('sagger', 100)}
              disabled={supplies < 100}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-bold rounded-lg cursor-pointer border border-stone-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" />
              فريق مالوتكا (100)
            </button>
            <button
              onClick={repairBridge}
              disabled={supplies < 100 || bridgeIntegrity >= 100}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs font-bold rounded-lg cursor-pointer border border-stone-700 flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              إصلاح الكوبري (100)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={callAirstrike}
              disabled={supplies < 180 || !waveActive}
              className="px-3.5 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow active:scale-95"
            >
              <Rocket className="w-3.5 h-3.5" />
              دعم جوي عاجل (180)
            </button>

            {!waveActive && (
              <button
                onClick={startWave}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-lg cursor-pointer transition-colors shadow-lg active:scale-95"
              >
                بدء الموجة #{wave}
              </button>
            )}
          </div>
        </div>

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50">
            <h3 className="text-xl font-bold font-cairo text-red-400 mb-2">تضرر المعبر الرئيسي بالكامل!</h3>
            <p className="text-sm text-stone-300 max-w-md mb-6">
              حققت الصمود حتى الموجة #{wave} بإجمالي نقاط {score}. أعد الكرة وركز على نشر صواريخ مالوتكا في الوقت المناسب.
            </p>
            <button
              onClick={() => {
                setBridgeIntegrity(100);
                setSupplies(500);
                setWave(1);
                setScore(0);
                setEnemiesRemaining(6);
                setIsGameOver(false);
                setWaveActive(false);
                setCombatLogs([
                  'تم تأمين رأس جسر القناة والتحصن في الساتر الشرقي.',
                  'وحدات الاستطلاع ترصد تحركات مدرعات معادية في عمق الممرات.',
                ]);
              }}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة الدفاع التكتيكي
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
