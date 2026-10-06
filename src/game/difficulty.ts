export type Difficulty = 'easy' | 'normal' | 'heroic';

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  missionDuration: number;
  label: string;
  description: string;
}> = {
  easy: {
    missionDuration: 150,
    label: 'سهل',
    description: 'وقت أطول وضغط أقل لإتقان التحكم',
  },
  normal: {
    missionDuration: 120,
    label: 'عادي',
    description: 'توازن بين السرعة والدقة',
  },
  heroic: {
    missionDuration: 95,
    label: 'بطولي',
    description: 'وقت أقل وقرار أسرع',
  },
};
