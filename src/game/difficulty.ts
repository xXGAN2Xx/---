export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  missionDuration: number;
  label: string;
  badge: string;
  description: string;
  requiredAirStrikeStations: number; // سهل: 3، متوسط: 4، صعب: 5
  totalAirStrikeStations: number;    // من أصل 6 محطات
  tankBattleTargetCount: number;     // سهل: 5، متوسط: 10، صعب: 15
  tankSpawnInterval: number;         // ظهور كل 5 ثوانٍ
  requiredBridgeTanks: number;
  enemySpawnRateMultiplier: number;
}> = {
  easy: {
    missionDuration: 150,
    label: 'سهل',
    badge: '🟢 سهل',
    description: 'الجوية: 3 محطات من 6 · الكباري: 5 دبابات عبور (دقيقتان) · الدبابات: 5 دبابات · تدريب هادئ',
    requiredAirStrikeStations: 3,
    totalAirStrikeStations: 6,
    tankBattleTargetCount: 5,
    tankSpawnInterval: 5.5,
    requiredBridgeTanks: 5,
    enemySpawnRateMultiplier: 0.75,
  },
  normal: {
    missionDuration: 120, // دقيقتين للمتوسط
    label: 'متوسط',
    badge: '🟡 متوسط',
    description: 'الجوية: 4 محطات من 6 · الكباري: 10 دبابات عبور (دقيقتان) · الدبابات: 10 دبابات · وتيرة متوازنة',
    requiredAirStrikeStations: 4,
    totalAirStrikeStations: 6,
    tankBattleTargetCount: 10,
    tankSpawnInterval: 5.0,
    requiredBridgeTanks: 10,
    enemySpawnRateMultiplier: 1.0,
  },
  hard: {
    missionDuration: 90, // دقيقة ونصف للصعب
    label: 'صعب',
    badge: '🔴 صعب',
    description: 'الجوية: 5 محطات من 6 · الكباري: 15 دبابة عبور (دقيقتان) · الدبابات: 15 دبابة · اشتباك شرس وتحدٍ كبير',
    requiredAirStrikeStations: 5,
    totalAirStrikeStations: 6,
    tankBattleTargetCount: 15,
    tankSpawnInterval: 4.5,
    requiredBridgeTanks: 15,
    enemySpawnRateMultiplier: 1.3,
  },
};

