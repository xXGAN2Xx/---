import React, { useState } from 'react';
import { HEROES, EQUIPMENT, BULLETINS, MEDALS, RANKS } from '../data/historyData';
import { PlayerStats, Medal } from '../types';
import { ArrowLeft, Award, BookOpen, Shield, Users, Crosshair } from 'lucide-react';

interface MuseumModalProps {
  stats: PlayerStats;
  onClose: () => void;
}

export const MuseumModal: React.FC<MuseumModalProps> = ({ stats, onClose }) => {
  const [activeTab, setActiveTab] = useState<'heroes' | 'bulletins' | 'weapons' | 'medals'>('heroes');

  return (
    <div className="w-full max-w-6xl mx-auto rounded-xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl flex flex-col min-h-[640px]">
      {/* Top Header */}
      <div className="p-6 bg-stone-900/80 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="العودة"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-cairo text-amber-400">بانوراما وأرشيف نصر أكتوبر العظيم</h1>
            <p className="text-xs text-stone-400">سجل الشرف والبطولات العسكرية الخالدة لحرب أكتوبر 1973</p>
          </div>
        </div>

        {/* Tab Controls (Functional buttons without pills) */}
        <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-lg border border-stone-800">
          <button
            onClick={() => setActiveTab('heroes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'heroes' ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>قادة وأبطال النصر</span>
          </button>
          <button
            onClick={() => setActiveTab('weapons')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'weapons' ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>ترسانة المعركة</span>
          </button>
          <button
            onClick={() => setActiveTab('bulletins')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bulletins' ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>بيانات الحرب التاريخية</span>
          </button>
          <button
            onClick={() => setActiveTab('medals')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'medals' ? 'bg-stone-800 text-amber-400' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>الأوسمة والرتب العسكرية</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 overflow-y-auto max-h-[580px]">
        {/* Tab 1: Heroes */}
        {activeTab === 'heroes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HEROES.map((hero) => (
              <div
                key={hero.id}
                className="bg-stone-900 border border-stone-800 p-5 rounded-lg flex flex-col justify-between hover:border-stone-700 transition-colors"
              >
                <div>
                  <h3 className="text-base font-bold text-stone-100 font-cairo mb-1">{hero.name}</h3>
                  <div className="text-xs text-amber-500 font-medium mb-3">
                    <span>{hero.role}</span>
                    <span aria-hidden="true" className="mx-1.5 text-stone-600">·</span>
                    <span className="text-stone-400">{hero.title}</span>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed mb-4">{hero.bio}</p>
                </div>

                <div className="border-t border-stone-800 pt-3">
                  <div className="text-xs text-stone-400 mb-2 italic bg-stone-950/60 p-2.5 rounded border border-stone-800/80">
                    «{hero.quote}»
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span>الدور الحاسم:</span>
                    <span className="text-stone-300">{hero.keyAction}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Weapons & Inventions */}
        {activeTab === 'weapons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {EQUIPMENT.map((eq, i) => (
              <div
                key={i}
                className="bg-stone-900 border border-stone-800 p-5 rounded-lg hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-stone-100 font-cairo">{eq.name}</h3>
                  <div className="text-xs text-stone-400">
                    <span>{eq.category}</span>
                  </div>
                </div>

                <div className="text-xs text-amber-500 mb-3">{eq.role}</div>

                <p className="text-xs text-stone-300 leading-relaxed mb-3">{eq.description}</p>

                <div className="text-xs text-emerald-400 bg-stone-950 p-2.5 rounded border border-stone-800">
                  <span className="font-bold text-emerald-500 ml-1">الأثر التاريخي:</span>
                  <span>{eq.historicalImpact}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Historical Bulletins & Speeches */}
        {activeTab === 'bulletins' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {BULLETINS.map((b, i) => (
              <div key={i} className="bg-stone-900 border border-stone-800 p-6 rounded-lg">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-400 font-cairo">{b.number}</span>
                    <span aria-hidden="true" className="text-stone-600">·</span>
                    <span className="text-sm font-semibold text-stone-200">{b.title}</span>
                  </div>
                  <div className="text-xs text-stone-400">
                    <span>{b.date}</span>
                    <span aria-hidden="true" className="mx-1">·</span>
                    <span className="font-mono">{b.time}</span>
                  </div>
                </div>

                <p className="text-sm text-stone-300 leading-relaxed font-amiri text-base bg-stone-950/70 p-4 rounded border border-stone-800/80">
                  «{b.text}»
                </p>
              </div>
            ))}

            <div className="bg-stone-900 border border-stone-800 p-6 rounded-lg">
              <h3 className="text-sm font-bold text-amber-400 mb-2">من خطاب النصر التاريخي للرئيس الراحل محمد أنور السادات</h3>
              <p className="text-xs text-stone-400 mb-3">أمام مجلس الشعب المصري - 16 أكتوبر 1973</p>
              <blockquote className="text-sm text-stone-300 leading-relaxed font-amiri text-base bg-stone-950/70 p-4 rounded border border-stone-800/80">
                «إن التاريخ سوف يسجل لهذه الأمة أن درعها لم ينكسر، وأن سيفها لم ينثن، وأنها استطاعت في ساعات معدودة أن تبهر الدنيا، وأن تعيد للكرامة العربية عزتها وهيبتها، وللعلم المصري مكانه السامي فوق تراب سيناء العزيز.»
              </blockquote>
            </div>
          </div>
        )}

        {/* Tab 4: Player Military Career, Medals & Ranks */}
        {activeTab === 'medals' && (
          <div className="space-y-8">
            {/* Rank progression */}
            <div>
              <h3 className="text-sm font-bold text-stone-300 font-cairo mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>الرتب العسكرية ومسار الترقية</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {RANKS.map((rk) => {
                  const isCurrent = stats.rank.level === rk.level;
                  const isUnlocked = stats.score >= rk.minScore;

                  return (
                    <div
                      key={rk.level}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        isCurrent
                          ? 'bg-amber-950/40 border-amber-500'
                          : isUnlocked
                          ? 'bg-stone-900 border-stone-700'
                          : 'bg-stone-950/40 border-stone-900 opacity-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{rk.badge}</div>
                      <div className="text-xs font-bold text-stone-200 mb-1">{rk.title}</div>
                      <div className="text-[10px] text-stone-400 font-mono tabular-nums">{rk.minScore} نقطة</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Medals */}
            <div>
              <h3 className="text-sm font-bold text-stone-300 font-cairo mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>أوسمة وأنواط الشجاعة العسكرية</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MEDALS.map((medal) => (
                  <div
                    key={medal.id}
                    className="p-4 bg-stone-900 border border-stone-800 rounded-lg flex items-start gap-3"
                  >
                    <div className="text-3xl p-2 bg-stone-950 rounded border border-stone-800 shrink-0">
                      {medal.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-400 mb-1">{medal.name}</h4>
                      <p className="text-[11px] text-stone-300 leading-relaxed mb-2">{medal.description}</p>
                      <span className="text-[10px] text-emerald-400 font-medium">مستحق للمقاتل الباسل</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
