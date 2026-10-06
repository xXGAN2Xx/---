export type Difficulty = 'normal';

export const DIFFICULTY_CONFIG: Record<Difficulty, {
  missionDuration: number;
  label: string;
  description: string;
}> = {
  normal: {
    missionDuration: 120,
    label: 'متوسط',
    description: 'تجربة متوازنة وثابتة',
  },
};
