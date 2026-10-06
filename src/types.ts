export type GameMode = 
  | 'MENU' 
  | 'MISSION_AIR_STRIKE'     // المرحلة 1: الضربة الجوية
  | 'MISSION_CROSSING'       // المرحلة 2: عبور القناة وخراطيم المياه
  | 'MISSION_BRIDGE'         // المرحلة 3: بناء الكباري والجسور لعبور الدبابات
  | 'MISSION_TANK_BATTLE'   // المرحلة 4: صد هجوم الدبابات وحائط الصواريخ
  | 'MISSION_FORTRESS'       // المرحلة 5: إسقاط الحصن ورفع العلم
  | 'COMIC_STORY'            // القصة المصورة لملحمة النصر
  | 'MUSEUM';                // متحف النصر التاريخي

export interface MissionInfo {
  id: GameMode;
  number: number;
  title: string;
  subtitle: string;
  timeLabel: string;
  description: string;
  image: string;
  objectives: string[];
  historicalContext: string;
}

export interface PlayerStats {
  score: number;
  targetsDestroyed: number;
  tanksDestroyed: number;
  aircraftDowned: number;
  bunkersCleared: number;
  rank: MilitaryRank;
  medals: Medal[];
  completedMissions: GameMode[];
}

export interface MilitaryRank {
  title: string;
  level: number;
  minScore: number;
  badge: string;
}

export interface Medal {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  dateUnlocked?: string;
  icon: string;
}

export interface HeroProfile {
  id: string;
  name: string;
  role: string;
  title: string;
  bio: string;
  quote: string;
  keyAction: string;
}

export interface MilitaryEquipment {
  name: string;
  category: 'طيران' | 'دفاع جوي' | 'مدرعات' | 'سلاح المهندسين' | 'مشاة';
  role: string;
  description: string;
  historicalImpact: string;
}

export interface HistoricalBulletin {
  number: string;
  time: string;
  date: string;
  title: string;
  text: string;
}
