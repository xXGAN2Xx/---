export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  missionDuration: number;
  label: string;
  badge: string;
  description: string;
  requiredAirStrikeStations: number; // سهل: 3، متوسط: 4، صعب: 5
  totalAirStrikeStations: number;    // من أصل 6 محطات
  enemySpawnRateMultiplier: number;
}> = {
  easy: {
    missionDuration: 135,
    label: 'سهل',
    badge: '🟢 سهل',
    description: 'تدمير 3 محطات من أصل 6 لتحقيق النصر · نيران دفاعات معتدلة وتدريب',
    requiredAirStrikeStations: 3,
    totalAirStrikeStations: 6,
    enemySpawnRateMultiplier: 0.75,
  },
  normal: {
    missionDuration: 120,
    label: 'متوسط',
    badge: '🟡 متوسط',
    description: 'تدمير 4 محطات من أصل 6 لتحقيق النصر · خطة العمليات التكتيكية المتوازنة',
    requiredAirStrikeStations: 4,
    totalAirStrikeStations: 6,
    enemySpawnRateMultiplier: 1.0,
  },
  hard: {
    missionDuration: 110,
    label: 'صعب',
    badge: '🔴 صعب',
    description: 'تدمير 5 محطات من أصل 6 لتحقيق النصر · اشتباكات شرسة ودفاعات جوية يقظة',
    requiredAirStrikeStations: 5,
    totalAirStrikeStations: 6,
    enemySpawnRateMultiplier: 1.3,
  },
};

