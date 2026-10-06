import React, { useEffect, useRef, useState } from 'react';
import { Music2, Upload, X } from 'lucide-react';
import { sound } from '../utils/audio';

export const BackgroundMusicPicker: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [trackName, setTrackName] = useState<string | null>(() => sound.getCustomTrackName());

  useEffect(() => {
    const storedName = window.localStorage.getItem('october-73-custom-track-name');
    if (storedName) setTrackName(storedName);
  }, []);

  const chooseTrack = (file: File) => {
    if (!file.type.startsWith('audio/')) return;
    const name = sound.setCustomBackgroundTrack(file);
    setTrackName(name);
    window.localStorage.setItem('october-73-custom-track-name', name);
  };

  const clearTrack = () => {
    sound.clearCustomBackgroundTrack();
    setTrackName(null);
    window.localStorage.removeItem('october-73-custom-track-name');
  };

  return (
    <section dir="rtl" className="mt-5 rounded-xl border border-stone-800 bg-stone-950/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black font-cairo text-amber-300">
            <Music2 className="w-4 h-4" />
            موسيقى الخلفية الخاصة بك
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            حط أغنية 6 أكتوبر أو أي ملف صوتي تملكه بصيغة MP3 / OGG / WAV.
          </p>
          {trackName && (
            <div className="mt-2 text-[11px] text-emerald-300 truncate max-w-[min(100%,420px)]">
              تعمل الآن: {trackName}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) chooseTrack(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            اختيار أغنية
          </button>
          {trackName && (
            <button
              type="button"
              onClick={clearTrack}
              className="p-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-400 hover:text-red-300"
              aria-label="إزالة أغنية الخلفية"
              title="العودة لموسيقى اللعبة"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 text-[10px] text-stone-600">
        للموسيقى الثابتة داخل الموقع: أضف الملف باسم <span className="font-mono text-stone-400">public/audio/october-6.mp3</span>.
      </div>
    </section>
  );
};
