        <div className="flex items-center gap-2 sm:gap-5 text-[11px] sm:text-xs font-semibold flex-wrap justify-end">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              timeLeft <= 30
                ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-stone-900 border-stone-800 text-amber-400'
            }`}
          >
            <Clock className={`w-4 h-4 ${timeLeft <= 30 ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className="text-stone-300 font-bold">المؤقت:</span>
            <span className={`font-mono text-sm font-black tabular-nums ${timeLeft <= 30 ? 'text-red-400' : 'text-amber-400'}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-stone-300">الأهداف:</span>
            <span className="font-mono tabular-nums font-bold text-emerald-400">{totalDestroyed} / 5</span>
            <span className="text-[10px] text-stone-500">من 6</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-xs">
            <span className="text-stone-400">الارتفاع:</span>
            <span className={`font-mono font-bold tabular-nums ${altitudeWarning ? 'text-red-400 animate-pulse font-black' : 'text-sky-400'}`}>
              {playerAltitude} م
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-20 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${Math.min(100, (hp / 210) * 100)}%` }} />
            </div>
            <span className="font-mono tabular-nums text-stone-200">{hp}/210</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-mono tabular-nums font-bold text-amber-400">{score}</span>
          </div>
          <div className="hidden sm:block px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
            تطوير الطائرة ×{totalDestroyed}
          </div>

          <button
            onClick={() => fireRocket()}
            disabled={rockets <= 0}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>صاروخ موجه تلقائياً [{rockets}]</span>
          </button>
        </div>
      </div>

      {/* Battle Telemetry */}
      <div className="px-4 py-1.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs text-stone-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-amber-400">{currentAlert}</span>
        </div>
        <div className="hidden sm:block text-stone-300 font-bold text-[11px]">
          ✈️ تحكم مباشر بحركة الفأرة في كل الاتجاهات · انقر باليسار لإطلاق المدافع · انقر باليمين للصواريخ
        </div>
      </div>

      {!missionWon && !isDefeated && isCombatActive && (
        <div className="px-3 sm:px-4 py-1.5 bg-stone-950 border-b border-stone-800/80 flex items-center gap-2 overflow-x-auto text-[10px] whitespace-nowrap">
          <span className="text-stone-500 font-bold">جدول الأهداف:</span>
          {SCHEDULE.map((item, index) => (
            <span
              key={item.sec}
              className={`px-2 py-0.5 rounded border ${index < totalDestroyed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : item.sec === 90 ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-stone-900 border-stone-800 text-stone-400'}`}
            >
              {String(Math.floor(item.sec / 60)).padStart(2, '0')}:{String(item.sec % 60).padStart(2, '0')} · {index + 1}{index === 5 ? ' (احتياطي)' : ''}
            </span>
          ))}
        </div>
      )}

        <div className="sm:hidden px-3 py-1.5 bg-amber-500/5 border-b border-amber-500/15 text-center text-[10px] text-amber-300">
          📱 حرّك إصبعك لتوجيه المقاتلة · اضغط زر الصاروخ · اللمس المستمر يطلق المدافع
        </div>

      {/* Canvas Area */}