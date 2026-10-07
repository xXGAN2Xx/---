import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Shield,
  Droplets,
  Waves,
  Wind,
  Target,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Flag,
  Crosshair,
  Flame,
  Zap,
} from 'lucide-react';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';
import { isGamePaused } from '../game/pause';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';

interface CrossingMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
}

interface BreachSector {
  id: number;
  name: string;
  subName: string;
  x: number;
  sandHeight: number;       // Current sand height (0 = fully breached, 100 = full 20m sand barrier)
  breachProgress: number;   // 0% to 100%
  completed: boolean;
  bunkerHp: number;
  bunkerMaxHp: number;
  bunkerDestroyed: boolean;
  bunkerSuppressedTimer: number;
  bunkerFireCooldown: number;
  flagHoisted: boolean;
  flagHeight: number;       // 0 to 1 for hoisting animation
}

interface AssaultBoat {
  id: number;
  targetSectorId: number;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  progress: number;         // 0 (west bank) to 1 (east bank breach)
  status: 'crossing' | 'landing' | 'secured' | 'destroyed';
  soldiersCount: number;
}

interface EnemyShot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetType: 'pump' | 'boat';
  targetBoatId?: number;
  life: number;
  isMortar?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity?: number;
  isWater?: boolean;
  isSand?: boolean;
  isSmoke?: boolean;
  alpha?: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export const CrossingMission: React.FC<CrossingMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
}) => {
  // Base duration is 2 minutes (120s), scaling with difficulty: easy (150s), normal (120s), hard (90s)
  const initialDuration =
    difficulty === 'easy' ? 150 : difficulty === 'hard' ? 90 : 120;
  const requiredBreaches = difficulty === 'easy' ? 2 : 3;
  const requiredBoats = requiredBreaches; // 1 boat dispatched per breach automatically

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for HUD & Modals
  const [timeLeft, setTimeLeft] = useState<number>(initialDuration);
  const [score, setScore] = useState<number>(0);
  const [pumpHp, setPumpHp] = useState<number>(100);
  const [isSpraying, setIsSpraying] = useState<boolean>(false);
  const [isTurboBoost, setIsTurboBoost] = useState<boolean>(false);
  const [smokeScreenActive, setSmokeScreenActive] = useState<boolean>(false);
  const [smokeCooldown, setSmokeCooldown] = useState<number>(0);
  const [activeSector, setActiveSector] = useState<number>(1);
  const [breachesCompleted, setBreachesCompleted] = useState<number>(0);
  const [boatsCrossed, setBoatsCrossed] = useState<number>(0);
  const [boatsAvailable, setBoatsAvailable] = useState<number>(requiredBreaches);
  const [missionWon, setMissionWon] = useState<boolean>(false);
  const [isDefeated, setIsDefeated] = useState<boolean>(false);
  const [defeatReason, setDefeatReason] = useState<string>('');

  // Mutable Game Loop State
  const stateRef = useRef({
    timeLeft: initialDuration,
    score: 0,
    pumpHp: 100,
    isSpraying: false,
    isTurboBoost: false,
    smokeTimeRemaining: 0,
    smokeCooldownTimer: 0,
    activeSector: 1,
    aimX: 600,
    aimY: 260,
    isMouseDown: false,
    spraySoundPlaying: false,
    nextBoatId: 1,
    nextTextId: 1,
    boatsCrossedCount: 0,
    completedBreachesCount: 0,
    won: false,
    defeated: false,
    sectors: [
      {
        id: 0,
        name: 'ثغرة القنطرة',
        subName: 'القطاع الشمالي',
        x: 310,
        sandHeight: 100,
        breachProgress: 0,
        completed: false,
        bunkerHp: 120,
        bunkerMaxHp: 120,
        bunkerDestroyed: false,
        bunkerSuppressedTimer: 0,
        bunkerFireCooldown: 2.2,
        flagHoisted: false,
        flagHeight: 0,
      },
      {
        id: 1,
        name: 'ثغرة الفردان',
        subName: 'القطاع الأوسط',
        x: 600,
        sandHeight: 100,
        breachProgress: 0,
        completed: false,
        bunkerHp: 150,
        bunkerMaxHp: 150,
        bunkerDestroyed: false,
        bunkerSuppressedTimer: 0,
        bunkerFireCooldown: 1.8,
        flagHoisted: false,
        flagHeight: 0,
      },
      {
        id: 2,
        name: 'ثغرة الشط',
        subName: 'القطاع الجنوبي',
        x: 890,
        sandHeight: 100,
        breachProgress: 0,
        completed: false,
        bunkerHp: 130,
        bunkerMaxHp: 130,
        bunkerDestroyed: false,
        bunkerSuppressedTimer: 0,
        bunkerFireCooldown: 2.5,
        flagHoisted: false,
        flagHeight: 0,
      },
    ] as BreachSector[],
    boats: [] as AssaultBoat[],
    enemyShots: [] as EnemyShot[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    waterWaveOffset: 0,
  });

  const addFloatingText = (x: number, y: number, text: string, color: string = '#fef08a') => {
    stateRef.current.floatingTexts.push({
      id: stateRef.current.nextTextId++,
      x,
      y,
      text,
      color,
      life: 1.6,
      maxLife: 1.6,
    });
  };

  const createWaterSplash = (x: number, y: number, isBoost = false) => {
    // Rich water splash and impact particles
    if (stateRef.current.particles.length > 320) return;
    const count = isBoost ? 6 : 4;
    const colors = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
      const speed = Math.random() * (isBoost ? 130 : 90) + 35;
      stateRef.current.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.28 + Math.random() * 0.16,
        maxLife: 0.44,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * (isBoost ? 4 : 3) + 2,
        gravity: 280,
        isWater: true,
      });
    }

    // Occasional wet mud/sand droplets flying from impact
    if (Math.random() < 0.35) {
      stateRef.current.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 60,
        vy: -Math.random() * 60 - 20,
        life: 0.32,
        maxLife: 0.32,
        color: Math.random() < 0.5 ? '#d97706' : '#b45309',
        size: Math.random() * 2.5 + 1.5,
        gravity: 260,
        isSand: true,
      });
    }
  };

  const createExplosion = (x: number, y: number, scale = 1.0) => {
    sound.playExplosion(scale);
    // Lightweight, fast-fading sparks that do not blind the player
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 70 + 20) * scale;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.4,
        color: ['#f59e0b', '#ef4444', '#dc2626'][Math.floor(Math.random() * 3)],
        size: Math.random() * 2.5 + 1.5,
        gravity: 40,
      });
    }
  };

  // Dispatch an assault boat directly to a specific breached sector
  const dispatchBoatToSector = (sectorId: number) => {
    const s = stateRef.current;
    if (s.won || s.defeated) return;
    const targetSector = s.sectors[sectorId];
    if (!targetSector) return;

    // Check if boat is already en route or landing
    const existing = s.boats.find(
      (b) => b.targetSectorId === sectorId && (b.status === 'crossing' || b.status === 'landing')
    );
    if (existing) return;

    sound.playRadioTransmission();
    sound.playSplash();

    s.boats.push({
      id: s.nextBoatId++,
      targetSectorId: sectorId,
      x: 130 + Math.random() * 30,
      y: 470 + (Math.random() - 0.5) * 20,
      speed: 0.22,
      hp: 250, // Heavily armored to guarantee safe landing
      maxHp: 250,
      progress: 0,
      status: 'crossing',
      soldiersCount: 8,
    });

    addFloatingText(targetSector.x, 340, `🚤 انطلاق قارب الصاعقة تلقائياً إلى ${targetSector.name}! 🇪🇬`, '#38bdf8');
  };

  // Reset Mission
  const resetMission = useCallback(() => {
    const s = stateRef.current;
    s.timeLeft = initialDuration;
    s.score = 0;
    s.pumpHp = 100;
    s.isSpraying = false;
    s.isTurboBoost = false;
    s.smokeTimeRemaining = 0;
    s.smokeCooldownTimer = 0;
    s.activeSector = 1;
    s.aimX = 600;
    s.aimY = 260;
    s.isMouseDown = false;
    s.spraySoundPlaying = false;
    s.boatsCrossedCount = 0;
    s.completedBreachesCount = 0;
    s.won = false;
    s.defeated = false;
    s.sectors = [
      {
        id: 0,
        name: 'ثغرة القنطرة',
        subName: 'القطاع الشمالي',
        x: 310,
        sandHeight: 100,
        breachProgress: 0,
        completed: false,
        bunkerHp: 120,
        bunkerMaxHp: 120,
        bunkerDestroyed: false,
        bunkerSuppressedTimer: 0,
        bunkerFireCooldown: 2.2,
        flagHoisted: false,
        flagHeight: 0,
      },
      {
        id: 1,
        name: 'ثغرة الفردان',
        subName: 'القطاع الأوسط',
        x: 600,
        sandHeight: 100,
        breachProgress: 0,
        completed: false,
        bunkerHp: 150,
        bunkerMaxHp: 150,
        bunkerDestroyed: false,
        bunkerSuppressedTimer: 0,
        bunkerFireCooldown: 1.8,
        flagHoisted: false,
        flagHeight: 0,
      },
      {
        id: 2,
        name: 'ثغرة الشط',
        subName: 'القطاع الجنوبي',
        x: 890,
        sandHeight: 100,
        breachProgress: 0,
        completed: false,
        bunkerHp: 130,
        bunkerMaxHp: 130,
        bunkerDestroyed: false,
        bunkerSuppressedTimer: 0,
        bunkerFireCooldown: 2.5,
        flagHoisted: false,
        flagHeight: 0,
      },
    ];
    s.boats = [];
    s.enemyShots = [];
    s.particles = [];
    s.floatingTexts = [];

    setTimeLeft(initialDuration);
    setScore(0);
    setPumpHp(100);
    setIsSpraying(false);
    setIsTurboBoost(false);
    setSmokeScreenActive(false);
    setSmokeCooldown(0);
    setActiveSector(1);
    setBreachesCompleted(0);
    setBoatsCrossed(0);
    setBoatsAvailable(requiredBreaches);
    setMissionWon(false);
    setIsDefeated(false);
    setDefeatReason('');
    sound.playMissionStartRadioAlert();
  }, [initialDuration, requiredBreaches]);

  // Launch Assault Boat
  const launchBoat = useCallback(() => {
    const s = stateRef.current;
    if (s.won || s.defeated || isGamePaused()) return;
    if (s.boats.filter((b) => b.status === 'crossing' || b.status === 'landing').length >= 4) {
      addFloatingText(150, 500, 'القوارب في عرض القناة · انتظر وصولها', '#fca5a5');
      return;
    }

    // Determine target sector: prefer active sector or first open breach
    let targetSector = s.sectors[s.activeSector];
    if (!targetSector.completed) {
      const openSector = s.sectors.find((sec) => sec.completed);
      if (openSector) targetSector = openSector;
    }

    sound.playRadioClick();
    sound.playSplash();

    s.boats.push({
      id: s.nextBoatId++,
      targetSectorId: targetSector.id,
      x: 140 + Math.random() * 40,
      y: 470 + (Math.random() - 0.5) * 40,
      speed: 0.2,
      hp: 200,
      maxHp: 200,
      progress: 0,
      status: 'crossing',
      soldiersCount: 6,
    });

    addFloatingText(160, 480, 'الله أكبر! انطلاق قارب العبور 🚤', '#38bdf8');
  }, []);

  // Deploy Artillery Smoke Screen
  const deploySmokeScreen = useCallback(() => {
    const s = stateRef.current;
    if (s.won || s.defeated || isGamePaused() || s.smokeCooldownTimer > 0) return;

    sound.playCannon();
    s.smokeTimeRemaining = 9.0;
    s.smokeCooldownTimer = 18.0;
    setSmokeScreenActive(true);
    setSmokeCooldown(18);

    // Generate gentle, non-obtrusive smoke puffs across canal
    for (let i = 0; i < 6; i++) {
      s.particles.push({
        x: 280 + Math.random() * 640,
        y: 350 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 12 - 4,
        life: 3.0 + Math.random() * 2.0,
        maxLife: 5.0,
        color: 'rgba(245, 245, 244, 0.18)',
        size: Math.random() * 12 + 8,
        isSmoke: true,
      });
    }

    addFloatingText(600, 380, 'ستار دخان خفيف لحماية القوارب! 💨', '#e2e8f0');
  }, []);

  // Toggle Turbo Boost
  const toggleTurboBoost = useCallback(() => {
    const s = stateRef.current;
    s.isTurboBoost = !s.isTurboBoost;
    setIsTurboBoost(s.isTurboBoost);
    sound.playRadioClick();
    if (s.isTurboBoost) {
      addFloatingText(120, 460, '⚡ تفعيل الضغط التوربيني الفائق!', '#facc15');
    }
  }, []);

  // Select Sector (Aim jump)
  const selectSector = useCallback((sectorId: number) => {
    const s = stateRef.current;
    s.activeSector = sectorId;
    setActiveSector(sectorId);
    const target = s.sectors[sectorId];
    if (target) {
      s.aimX = target.x;
      s.aimY = 270;
    }
    sound.playRadioClick();
  }, []);

  // Main 1-second Interval for Mission Clock & Cooldowns
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isGamePaused() || stateRef.current.won || stateRef.current.defeated) return;
      const s = stateRef.current;
      s.timeLeft = Math.max(0, s.timeLeft - 1);
      setTimeLeft(s.timeLeft);

      if (s.smokeCooldownTimer > 0) {
        s.smokeCooldownTimer = Math.max(0, s.smokeCooldownTimer - 1);
        setSmokeCooldown(Math.ceil(s.smokeCooldownTimer));
      }

      if (s.timeLeft <= 0) {
        s.timeLeft = 0;
        s.defeated = true;
        s.isSpraying = false;
        setIsSpraying(false);
        setIsDefeated(true);
        setDefeatReason('timeout');
        sound.playDefeatSound();
        onDefeat?.('timeout');
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onDefeat]);

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const s = stateRef.current;

      if (!isGamePaused() && !s.won && !s.defeated) {
        s.waterWaveOffset += dt * 30;

        // Smoke screen timer
        if (s.smokeTimeRemaining > 0) {
          s.smokeTimeRemaining = Math.max(0, s.smokeTimeRemaining - dt);
          if (s.smokeTimeRemaining === 0) {
            setSmokeScreenActive(false);
          }
        }

        const isSmokeActive = s.smokeTimeRemaining > 0;

        // High Pressure Water Jet Spray Logic
        if (s.isSpraying && s.pumpHp > 0) {
          const targetX = s.aimX;
          const targetY = s.aimY;
          const boostMul = s.isTurboBoost ? 1.9 : 1.0;

          // Sound trigger throttle
          if (Math.random() < 0.15) {
            sound.playWaterCannon();
          }

          // Generate dense realistic water spray and particles along the entire trajectory
          const nozzleX = 140;
          const nozzleY = 510;
          const spawnCount = s.isTurboBoost ? 10 : 7;
          const waterColors = ['#ffffff', '#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'];

          if (s.particles.length < 320) {
            for (let i = 0; i < spawnCount; i++) {
              // Position along the trajectory
              const t = Math.pow(Math.random(), 0.82); // distributed along the arc
              const px = nozzleX + (targetX - nozzleX) * t;
              // Arc drop from water pressure
              const arcOffset = -Math.sin(t * Math.PI) * (26 / boostMul);
              const py = nozzleY + (targetY - nozzleY) * t + arcOffset;

              // Spray cone widens naturally as it travels towards target
              const coneSpread = 4 + t * 26;
              const perpAngle = Math.atan2(targetY - nozzleY, targetX - nozzleX) + Math.PI / 2;
              const scatter = (Math.random() - 0.5) * coneSpread;

              // High-speed water flow velocity along spray vector
              const flowSpeed = (Math.random() * 120 + 320) * (s.isTurboBoost ? 1.3 : 1.0);
              const sprayAngle = Math.atan2(targetY - nozzleY, targetX - nozzleX) + (Math.random() - 0.5) * 0.14;

              s.particles.push({
                x: px + Math.cos(perpAngle) * scatter,
                y: py + Math.sin(perpAngle) * scatter,
                vx: Math.cos(sprayAngle) * flowSpeed * 0.32 + (Math.random() - 0.5) * 20,
                vy: Math.sin(sprayAngle) * flowSpeed * 0.32 + (Math.random() - 0.5) * 20,
                life: 0.18 + Math.random() * 0.16,
                maxLife: 0.34,
                color: waterColors[Math.floor(Math.random() * waterColors.length)],
                size: Math.random() * (s.isTurboBoost ? 4.2 : 3.2) + 1.8,
                gravity: 95,
                isWater: true,
              });
            }
          }

          // Rich water splash and churning at target impact point
          createWaterSplash(targetX, targetY, s.isTurboBoost);

          // Check if hitting one of the 3 breach sectors
          for (const sec of s.sectors) {
            const dist = Math.hypot(targetX - sec.x, targetY - (280 - (100 - sec.sandHeight) * 0.8));
            if (dist < 75 && !sec.completed) {
              const erosionRate = 22.0 * boostMul * dt;
              sec.sandHeight = Math.max(0, sec.sandHeight - erosionRate);
              sec.breachProgress = Math.min(100, Math.round(100 - sec.sandHeight));

              s.score += Math.round(12 * boostMul);

              if (sec.breachProgress >= 100 && !sec.completed) {
                sec.completed = true;
                sec.sandHeight = 0;
                s.completedBreachesCount++;
                setBreachesCompleted(s.completedBreachesCount);
                s.score += 1200;
                sound.playSplash();
                sound.playVictoryFanfare();
                createExplosion(sec.x, 290, 0.7);
                addFloatingText(sec.x, 230, `✓ تم فتح ${sec.name} بالكامل! (+1200) 🎯`, '#4ade80');

                // 🚤 Dispatches boat automatically to this exact breach location!
                dispatchBoatToSector(sec.id);
              }
            }

            // Check if water jet is hitting the enemy bunker above this sector
            const bunkerDist = Math.hypot(targetX - sec.x, targetY - 210);
            if (bunkerDist < 55 && !sec.bunkerDestroyed) {
              sec.bunkerSuppressedTimer = 2.0; // Blind the bunker
              const bunkerDmg = 38 * boostMul * dt;
              sec.bunkerHp = Math.max(0, sec.bunkerHp - bunkerDmg);

              if (sec.bunkerHp <= 0 && !sec.bunkerDestroyed) {
                sec.bunkerDestroyed = true;
                s.score += 600;
                createExplosion(sec.x, 210, 1.4);
                addFloatingText(sec.x, 190, `تدمير دشمة معادية بمدافع المياه! (+600)`, '#facc15');
              }
            }
          }
        }

        // Enemy Bunkers Fire Mechanics (Tracer bullets & Mortar rounds)
        for (const sec of s.sectors) {
          if (sec.bunkerDestroyed) continue;

          if (sec.bunkerSuppressedTimer > 0) {
            sec.bunkerSuppressedTimer = Math.max(0, sec.bunkerSuppressedTimer - dt);
            continue; // Suppressed by water pressure
          }

          sec.bunkerFireCooldown -= dt;
          if (sec.bunkerFireCooldown <= 0) {
            sec.bunkerFireCooldown = (Math.random() * 1.8 + 1.6) * (isSmokeActive ? 2.5 : 1.0);

            // Choose target: a crossing boat if available, else west bank pump raft
            const crossingBoats = s.boats.filter((b) => b.status === 'crossing');
            if (crossingBoats.length > 0 && Math.random() < 0.65) {
              const targetBoat = crossingBoats[Math.floor(Math.random() * crossingBoats.length)];
              const dx = targetBoat.x - sec.x;
              const dy = targetBoat.y - 210;
              const len = Math.hypot(dx, dy) || 1;
              const spd = 180;
              s.enemyShots.push({
                id: Math.random(),
                x: sec.x,
                y: 210,
                vx: (dx / len) * spd + (Math.random() - 0.5) * (isSmokeActive ? 60 : 20),
                vy: (dy / len) * spd + (Math.random() - 0.5) * (isSmokeActive ? 60 : 20),
                targetType: 'boat',
                targetBoatId: targetBoat.id,
                life: 3.5,
                isMortar: Math.random() < 0.35,
              });
            } else {
              // Fire toward west bank water pump raft (x: 140, y: 510)
              const dx = 140 - sec.x;
              const dy = 510 - 210;
              const len = Math.hypot(dx, dy) || 1;
              const spd = 200;
              s.enemyShots.push({
                id: Math.random(),
                x: sec.x,
                y: 210,
                vx: (dx / len) * spd + (Math.random() - 0.5) * (isSmokeActive ? 70 : 25),
                vy: (dy / len) * spd + (Math.random() - 0.5) * (isSmokeActive ? 70 : 25),
                targetType: 'pump',
                life: 3.5,
                isMortar: Math.random() < 0.4,
              });
            }
          }
        }

        // Enemy Shots update & collision
        for (const shot of s.enemyShots) {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          shot.life -= dt;

          // Hit pump raft check
          if (shot.targetType === 'pump' && Math.hypot(shot.x - 140, shot.y - 510) < 40) {
            shot.life = 0;
            const dmg = shot.isMortar ? 14 : 6;
            s.pumpHp = Math.max(0, s.pumpHp - dmg);
            setPumpHp(Math.round(s.pumpHp));
            sound.playHitSound();
            createExplosion(shot.x, shot.y, 0.6);

            if (s.pumpHp <= 0 && !s.defeated) {
              s.defeated = true;
              setIsDefeated(true);
              setDefeatReason('crew_casualty');
              sound.playDefeatSound();
              onDefeat?.('crew_casualty');
            }
          }

          // Hit boat check
          if (shot.targetType === 'boat' && shot.targetBoatId) {
            const boat = s.boats.find((b) => b.id === shot.targetBoatId);
            if (boat && Math.hypot(shot.x - boat.x, shot.y - boat.y) < 28) {
              shot.life = 0;
              const dmg = shot.isMortar ? 14 : 7;
              boat.hp = Math.max(0, boat.hp - dmg);
              sound.playHitSound();
              createWaterSplash(shot.x, shot.y);

              if (boat.hp <= 0 && boat.status !== 'destroyed') {
                boat.status = 'destroyed';
                createExplosion(boat.x, boat.y, 0.4);
                addFloatingText(boat.x, boat.y - 15, 'استهداف قارب! جاري إرسال قارب بديل ⚠️', '#ef4444');
                const targetSec = s.sectors[boat.targetSectorId];
                if (targetSec && targetSec.completed) {
                  dispatchBoatToSector(targetSec.id);
                }
              }
            }
          }
        }
        s.enemyShots = s.enemyShots.filter((sh) => sh.life > 0);

        // Update Assault Boats
        for (const boat of s.boats) {
          if (boat.status === 'crossing') {
            const targetSec = s.sectors[boat.targetSectorId];
            const targetX = targetSec.x;
            const targetY = 320; // Canal east waterline

            // Move smoothly toward breach
            const dx = targetX - boat.x;
            const dy = targetY - boat.y;
            const dist = Math.hypot(dx, dy);

            boat.progress += dt * boat.speed;
            boat.x += (dx / Math.max(1, dist)) * 95 * dt;
            boat.y += (dy / Math.max(1, dist)) * 60 * dt;

            // Generate wake ripples (throttled)
            if (Math.random() < 0.15 && s.particles.length < 25) {
              s.particles.push({
                x: boat.x - 14,
                y: boat.y,
                vx: -10,
                vy: (Math.random() - 0.5) * 5,
                life: 0.3,
                maxLife: 0.3,
                color: 'rgba(255, 255, 255, 0.4)',
                size: 2,
                isWater: true,
              });
            }

            // Arrive at east bank breach
            if (dist < 32 || boat.progress >= 1.0) {
              boat.status = 'landing';
              boat.x = targetSec.x;
              boat.y = 320;
              if (targetSec.completed) {
                if (!targetSec.flagHoisted) {
                  targetSec.flagHoisted = true;
                  s.boatsCrossedCount++;
                  setBoatsCrossed(s.boatsCrossedCount);
                  s.score += 500;
                  sound.playSplash();
                  sound.playVictoryFanfare();
                  addFloatingText(boat.x, boat.y - 25, `✓ عبور ناجح! تأمين ${targetSec.name} 🇪🇬 (+500)`, '#22c55e');
                }
              } else {
                // Sits taking fire waiting for breach to complete
                addFloatingText(boat.x, boat.y - 20, 'الساتر لم يُفتح بعد! افتح الثغرة سريعاً!', '#fbbf24');
              }
            }
          } else if (boat.status === 'landing') {
            const targetSec = s.sectors[boat.targetSectorId];
            if (targetSec.completed) {
              if (!targetSec.flagHoisted) {
                targetSec.flagHoisted = true;
                s.boatsCrossedCount++;
                setBoatsCrossed(s.boatsCrossedCount);
                s.score += 500;
                sound.playSplash();
                sound.playVictoryFanfare();
                addFloatingText(boat.x, boat.y - 25, `✓ عبور ناجح! تأمين ${targetSec.name} 🇪🇬 (+500)`, '#22c55e');
              }
              if (targetSec.flagHeight < 1.0) {
                targetSec.flagHeight = Math.min(1.0, targetSec.flagHeight + dt * 0.8);
              }
            }
          }
        }
        s.boats = s.boats.filter((b) => b.status !== 'destroyed' || b.hp > 0);

        // Update Particles
        for (const p of s.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.gravity) p.vy += p.gravity * dt;
          p.life -= dt;
        }
        s.particles = s.particles.filter((p) => p.life > 0);

        // Update Floating Texts
        for (const ft of s.floatingTexts) {
          ft.y -= 22 * dt;
          ft.life -= dt;
        }
        s.floatingTexts = s.floatingTexts.filter((ft) => ft.life > 0);

        // Check Victory Condition
        const allBreachesOpen = s.completedBreachesCount >= requiredBreaches;
        const allBoatsCrossed = s.boatsCrossedCount >= requiredBoats;
        if (allBreachesOpen && allBoatsCrossed && !s.won) {
          s.won = true;
          s.score += 2500 + s.timeLeft * 15;
          setScore(s.score);
          setMissionWon(true);
          sound.playVictoryFanfare();
        }

        setScore(s.score);
      }

      // ==========================================
      // RENDER PHASE: 1200x650 Canvas Coordinate Space
      // ==========================================
      const w = canvas.width;
      const h = canvas.height;

      // 1. Sinai Sky with Midday Desert Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
      skyGrad.addColorStop(0, '#0c2340');
      skyGrad.addColorStop(0.45, '#1e4d75');
      skyGrad.addColorStop(0.8, '#c27d38');
      skyGrad.addColorStop(1, '#e5a158');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 240);

      // Distant Sinai Mountains Silhouette
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, 240);
      ctx.lineTo(80, 215);
      ctx.lineTo(240, 228);
      ctx.lineTo(410, 205);
      ctx.lineTo(580, 222);
      ctx.lineTo(760, 208);
      ctx.lineTo(950, 225);
      ctx.lineTo(1120, 212);
      ctx.lineTo(w, 230);
      ctx.lineTo(w, 240);
      ctx.closePath();
      ctx.fill();

      // 2. Bar Lev Line Sand Rampart (الساتر الترابي لخط بارليف)
      // 20-meter high steep sand barrier on east bank (y: 190 to 330)
      const sandGrad = ctx.createLinearGradient(0, 190, 0, 335);
      sandGrad.addColorStop(0, '#d97706');
      sandGrad.addColorStop(0.3, '#b45309');
      sandGrad.addColorStop(0.7, '#92400e');
      sandGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 190, w, 145);

      // Sand Dune Contours & Barbed Wire Fence Layer
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      for (let x = 10; x < w; x += 35) {
        // Barbed wire posts
        ctx.beginPath();
        ctx.moveTo(x, 195);
        ctx.lineTo(x, 180);
        ctx.stroke();
        // Cross wire
        ctx.beginPath();
        ctx.moveTo(x - 10, 184);
        ctx.lineTo(x + 25, 188);
        ctx.stroke();
      }

      // 3. Render the 3 Breach Sectors on the Sand Rampart
      for (const sec of s.sectors) {
        const sx = sec.x;
        const progress = sec.breachProgress; // 0 to 100
        const isCut = progress > 0;

        // V-Cut Erosion channel if breached
        if (isCut) {
          const cutDepth = (progress / 100) * 135;
          const cutHalfWidth = 28 + (progress / 100) * 36;

          ctx.save();
          // Draw carved breach passage down to water level
          ctx.beginPath();
          ctx.moveTo(sx - cutHalfWidth, 190);
          ctx.lineTo(sx - cutHalfWidth * 0.45, 190 + cutDepth);
          ctx.lineTo(sx + cutHalfWidth * 0.45, 190 + cutDepth);
          ctx.lineTo(sx + cutHalfWidth, 190);
          ctx.closePath();

          // Inside passage is wet muddy silt / canal level
          const cutGrad = ctx.createLinearGradient(0, 190, 0, 330);
          cutGrad.addColorStop(0, sec.completed ? '#1e293b' : '#713f12');
          cutGrad.addColorStop(1, sec.completed ? '#0284c7' : '#451a03');
          ctx.fillStyle = cutGrad;
          ctx.fill();

          ctx.strokeStyle = sec.completed ? '#38bdf8' : '#ca8a04';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Wet mud slurry tracks flowing down to canal
          ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
          for (let m = -cutHalfWidth * 0.3; m <= cutHalfWidth * 0.3; m += 14) {
            ctx.fillRect(sx + m, 190 + cutDepth * 0.4, 4, cutDepth * 0.6);
          }

          ctx.restore();
        }

        // Sector Badge & Erosion Progress Bar
        ctx.save();
        const hudY = 155;
        ctx.fillStyle = 'rgba(28, 25, 23, 0.88)';
        ctx.fillRect(sx - 65, hudY, 130, 26);
        ctx.strokeStyle = sec.completed ? '#22c55e' : s.activeSector === sec.id ? '#f59e0b' : '#57534e';
        ctx.lineWidth = s.activeSector === sec.id ? 2 : 1;
        ctx.strokeRect(sx - 65, hudY, 130, 26);

        // Progress Bar
        ctx.fillStyle = '#292524';
        ctx.fillRect(sx - 61, hudY + 18, 122, 5);
        ctx.fillStyle = sec.completed ? '#22c55e' : '#f59e0b';
        ctx.fillRect(sx - 61, hudY + 18, 122 * (progress / 100), 5);

        // Label
        ctx.fillStyle = sec.completed ? '#86efac' : '#fef08a';
        ctx.font = 'bold 11px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sec.name, sx, hudY + 12);
        ctx.restore();

        // Fortified Israeli Bunker above this sector
        const bx = sx;
        const by = 205;
        if (!sec.bunkerDestroyed) {
          ctx.save();
          // Concrete pillbox base
          ctx.fillStyle = '#44403c';
          ctx.fillRect(bx - 32, by - 16, 64, 24);
          ctx.fillStyle = '#57534e';
          ctx.fillRect(bx - 26, by - 24, 52, 12);

          // Gun embrasure / slit
          ctx.fillStyle = '#09090b';
          ctx.fillRect(bx - 18, by - 8, 36, 7);

          // Muzzle flash when firing
          if (sec.bunkerFireCooldown < 0.15 && sec.bunkerSuppressedTimer <= 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(bx, by - 5, 8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bunker HP Bar
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(bx - 24, by - 32, 48, 5);
          ctx.fillStyle = sec.bunkerSuppressedTimer > 0 ? '#38bdf8' : '#ef4444';
          ctx.fillRect(bx - 24, by - 32, 48 * (sec.bunkerHp / sec.bunkerMaxHp), 5);

          // Bunker Label
          ctx.fillStyle = sec.bunkerSuppressedTimer > 0 ? '#7dd3fc' : '#fca5a5';
          ctx.font = 'bold 9px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(sec.bunkerSuppressedTimer > 0 ? '💧 تحت ضغط المياه!' : 'دشمة خط بارليف', bx, by - 36);

          ctx.restore();
        } else {
          // Collapsed ruin bunker
          ctx.fillStyle = '#292524';
          ctx.fillRect(bx - 32, by - 6, 64, 12);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 10px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓ دُمرت الدشمة', bx, by - 10);
        }

        // Hoisted Egyptian Flag on breach completion
        if (sec.flagHoisted) {
          const fx = sx + 32;
          const fy = 310 - sec.flagHeight * 45;
          ctx.save();
          // Flagpole
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(fx, 320);
          ctx.lineTo(fx, 255);
          ctx.stroke();

          // Egyptian Tri-color Flag waving
          const flagWave = Math.sin(currentTime * 0.006) * 4;
          const fw = 28;
          const fh = 18;
          // Red stripe
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(fx, fy, fw, fh / 3);
          // White stripe with eagle
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx, fy + fh / 3, fw, fh / 3);
          ctx.fillStyle = '#d97706';
          ctx.fillRect(fx + fw * 0.4, fy + fh / 3 + 1, 5, 4);
          // Black stripe
          ctx.fillStyle = '#000000';
          ctx.fillRect(fx, fy + (fh / 3) * 2, fw, fh / 3);
          ctx.restore();
        }
      }

      // 4. Suez Canal Water Surface (y: 330 to 520)
      const waterGrad = ctx.createLinearGradient(0, 330, 0, 520);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(0.4, '#0369a1');
      waterGrad.addColorStop(0.85, '#075985');
      waterGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 330, w, 190);

      // Water Ripples & Specular Glints
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      for (let y = 345; y < 515; y += 22) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 40) {
          const waveY = y + Math.sin((x + s.waterWaveOffset) * 0.04) * 3;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }

      // 5. Render Assault Boats (قوارب الكوماندوز واللواء 130 برمائي)
      for (const boat of s.boats) {
        ctx.save();
        ctx.translate(boat.x, boat.y);

        // Boat Hull (Olive Green / Rubber Zodiac)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d'; // Camouflage inside
        ctx.beginPath();
        ctx.ellipse(0, 0, 21, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Egyptian Commandos Soldiers (Helm + Uniform)
        for (let si = -2; si <= 2; si++) {
          ctx.fillStyle = '#ca8a04'; // Camo helmet
          ctx.beginPath();
          ctx.arc(si * 7, -4, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Small Egyptian Flag at boat stern
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-22, -12, 10, 2.5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-22, -9.5, 10, 2.5);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-22, -7, 10, 2.5);

        // Boat HP Bar if damaged
        if (boat.hp < 100) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-18, -18, 36, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-18, -18, 36 * (boat.hp / 100), 4);
        }

        ctx.restore();
      }

      // 6. West Bank: Egyptian Staging Area & Turbine Water Monitor (y: 500 to h)
      const westGrad = ctx.createLinearGradient(0, 500, 0, h);
      westGrad.addColorStop(0, '#57534e');
      westGrad.addColorStop(0.2, '#78716c');
      westGrad.addColorStop(1, '#44403c');
      ctx.fillStyle = westGrad;
      ctx.fillRect(0, 500, w, h - 500);

      // Sandbag Fortification Line on West Bank
      for (let x = 10; x < w; x += 28) {
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.roundRect(x, 495, 26, 12, 4);
        ctx.fill();
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.roundRect(x + 12, 487, 26, 12, 4);
        ctx.fill();
      }

      // High-Pressure Turbine Water Pumps Station (English Paxman / German Deutz)
      const pumpX = 140;
      const pumpY = 515;

      ctx.save();
      ctx.translate(pumpX, pumpY);

      // Steel Raft / Pontoon
      ctx.fillStyle = '#292524';
      ctx.fillRect(-50, -10, 100, 35);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2;
      ctx.strokeRect(-50, -10, 100, 35);

      // Turbine Engine Box
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(-40, -32, 45, 26);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(-35, -28, 12, 18);

      // Spinning Pump Pressure Gauge
      ctx.beginPath();
      ctx.arc(-10, -20, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();

      // Heavy Pressure Pipe to Water Monitor
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-5, -15);
      ctx.lineTo(25, -22);
      ctx.stroke();

      // Swiveling Water Monitor Turret & High-Pressure Nozzle
      const nozzleAngle = Math.atan2(s.aimY - (pumpY - 22), s.aimX - (pumpX + 25));
      ctx.save();
      ctx.translate(25, -22);
      ctx.rotate(nozzleAngle);

      // Monitor Turret Base
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Barrel / Nozzle
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, -5, 26, 10);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(20, -7, 8, 14);

      ctx.restore(); // nozzle

      // Engineer Squad Crew
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(15, -4, 5, 0, Math.PI * 2); // Crew 1
      ctx.arc(-25, -4, 5, 0, Math.PI * 2); // Crew 2
      ctx.fill();

      // Health bar above water pump
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-45, -48, 90, 7);
      ctx.fillStyle = s.pumpHp > 40 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-44, -47, 88 * (s.pumpHp / 100), 5);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`مضخة مياه باقي زكي [${Math.round(s.pumpHp)}%]`, 0, -53);

      ctx.restore(); // pump

      // 7. Render Realistic Volumetric High-Pressure Water Spray (Not a single line!)
      if (s.isSpraying && s.pumpHp > 0) {
        const startX = pumpX + 25;
        const startY = pumpY - 22;
        const endX = s.aimX;
        const endY = s.aimY;

        ctx.save();

        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const startWidth = 5;
        const endWidth = s.isTurboBoost ? 38 : 28;

        // A. Volumetric Expanding Spray Cone Envelope (Soft aerated mist fan)
        const sprayGrad = ctx.createLinearGradient(startX, startY, endX, endY);
        sprayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        sprayGrad.addColorStop(0.25, 'rgba(224, 242, 254, 0.40)');
        sprayGrad.addColorStop(0.65, 'rgba(186, 230, 253, 0.28)');
        sprayGrad.addColorStop(1, 'rgba(125, 211, 252, 0.16)');

        const midX = (startX + endX) * 0.5;
        const midY = (startY + endY) * 0.5 - 20;

        ctx.fillStyle = sprayGrad;
        ctx.beginPath();
        ctx.moveTo(startX + nx * startWidth, startY + ny * startWidth);
        ctx.quadraticCurveTo(
          midX + nx * (startWidth + endWidth) * 0.4,
          midY + ny * (startWidth + endWidth) * 0.4,
          endX + nx * endWidth,
          endY + ny * endWidth
        );
        ctx.lineTo(endX - nx * endWidth, endY - ny * endWidth);
        ctx.quadraticCurveTo(
          midX - nx * (startWidth + endWidth) * 0.4,
          midY - ny * (startWidth + endWidth) * 0.4,
          startX - nx * startWidth,
          startY - ny * startWidth
        );
        ctx.closePath();
        ctx.fill();

        // B. Turbulent High-Velocity Water Filaments & Moving Pulses
        const timeSec = currentTime * 0.001;
        for (let r = 0; r < 4; r++) {
          const strandOffset = (r - 1.5) * (s.isTurboBoost ? 7 : 5);
          const wavePhase = timeSec * 22 + r * 1.6;
          const waveAmp = 3.5 + Math.sin(wavePhase) * 2;

          ctx.save();
          ctx.strokeStyle = r === 1 || r === 2 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(186, 230, 253, 0.6)';
          ctx.lineWidth = r === 1 || r === 2 ? (s.isTurboBoost ? 4.5 : 3.5) : (s.isTurboBoost ? 3 : 2);
          ctx.lineCap = 'round';
          // Animated dash creating the visual appearance of high-pressure water gushing forward
          ctx.setLineDash([14, 10]);
          ctx.lineDashOffset = -(currentTime * 0.14 + r * 10);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          const sMidX = midX + nx * (strandOffset + Math.sin(wavePhase) * waveAmp);
          const sMidY = midY + ny * (strandOffset + Math.cos(wavePhase) * waveAmp);
          ctx.quadraticCurveTo(sMidX, sMidY, endX + nx * strandOffset * 1.8, endY + ny * strandOffset * 1.8);
          ctx.stroke();
          ctx.restore();
        }

        // C. Continuous In-Flight Spray Droplets Scattered Through Cone
        const dropletPalette = ['#ffffff', '#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc'];
        for (let d = 0; d < 32; d++) {
          const progress = (d * 0.031 + (currentTime * 0.0015)) % 1;
          const px = startX + (endX - startX) * progress;
          const py = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 22;
          const lateralFactor = (4 + progress * endWidth) * (Math.sin(d * 5.1 + currentTime * 0.006) * 0.45);
          const sign = d % 2 === 0 ? 1 : -1;
          const dotX = px + nx * lateralFactor * sign;
          const dotY = py + ny * lateralFactor * sign;
          const dotSize = 1.6 + (Math.sin(d * 3.3) * 0.5 + 0.5) * (s.isTurboBoost ? 3.5 : 2.5);

          ctx.fillStyle = dropletPalette[d % dropletPalette.length];
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // D. Impact Froth & Expanding Splash Ripples at Sand Barrier
        const splashRadius = (s.isTurboBoost ? 22 : 16) + Math.sin(currentTime * 0.02) * 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(endX, endY, splashRadius, splashRadius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cascading water slurry runoff down the sand bank into the canal
        for (let w = -2; w <= 2; w++) {
          const runoffX = endX + w * 8;
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(runoffX, endY + 4);
          ctx.quadraticCurveTo(runoffX + Math.sin(currentTime * 0.01 + w) * 6, endY + 25, runoffX + (w * 4), endY + 50);
          ctx.stroke();
        }

        // Splash ripple ring
        const rippleT = (currentTime * 0.003) % 1;
        ctx.strokeStyle = `rgba(224, 242, 254, ${Math.max(0, 0.8 - rippleT)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endX, endY, 6 + rippleT * 25, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 8. Render Enemy Tracer Shots & Mortar Shells
      for (const shot of s.enemyShots) {
        ctx.save();
        if (shot.isMortar) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(shot.x, shot.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Machine gun tracer line
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(shot.x, shot.y);
          ctx.lineTo(shot.x - shot.vx * 0.05, shot.y - shot.vy * 0.05);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 9. Render Particles (Water drops, mud, smoke)
      for (const p of s.particles) {
        ctx.save();
        ctx.fillStyle = p.color;
        if (p.isSmoke) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.isWater) {
          // High-speed water droplet with velocity elongation for dynamic spray feel
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 60) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 10. Smoke Screen Overlay Veil (Subtle, transparent, preserves full gameplay visibility)
      if (s.smokeTimeRemaining > 0) {
        ctx.fillStyle = `rgba(245, 245, 244, ${Math.min(0.04, s.smokeTimeRemaining * 0.005)})`;
        ctx.fillRect(0, 240, w, 280);
      }

      // 11. Tactical Water Cannon Aiming Crosshair
      const tx = s.aimX;
      const ty = s.aimY;
      ctx.save();
      ctx.strokeStyle = s.isTurboBoost ? '#facc15' : '#38bdf8';
      ctx.lineWidth = 2;
      // Crosshair Circle
      ctx.beginPath();
      ctx.arc(tx, ty, 16, 0, Math.PI * 2);
      ctx.stroke();
      // Tick lines
      ctx.beginPath();
      ctx.moveTo(tx - 22, ty);
      ctx.lineTo(tx - 10, ty);
      ctx.moveTo(tx + 10, ty);
      ctx.lineTo(tx + 22, ty);
      ctx.moveTo(tx, ty - 22);
      ctx.lineTo(tx, ty - 10);
      ctx.moveTo(tx, ty + 10);
      ctx.lineTo(tx, ty + 22);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = s.isTurboBoost ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 12. Floating Action Text (+500, +1200, etc.)
      for (const ft of s.floatingTexts) {
        ctx.save();
        ctx.font = 'black 14px Tajawal, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Mouse & Touch Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    stateRef.current.aimX = clickX;
    stateRef.current.aimY = clickY;
    stateRef.current.isMouseDown = true;
    stateRef.current.isSpraying = true;
    setIsSpraying(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    stateRef.current.aimX = (e.clientX - rect.left) * scaleX;
    stateRef.current.aimY = (e.clientY - rect.top) * scaleY;
  };

  const handlePointerUp = () => {
    stateRef.current.isMouseDown = false;
    stateRef.current.isSpraying = false;
    setIsSpraying(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stateRef.current.isSpraying = true;
        setIsSpraying(true);
      } else if (e.code === 'KeyB') {
        launchBoat();
      } else if (e.code === 'KeyS') {
        deploySmokeScreen();
      } else if (e.key === '1') {
        selectSector(0);
      } else if (e.key === '2') {
        selectSector(1);
      } else if (e.key === '3') {
        selectSector(2);
      } else if (e.code === 'Escape') {
        onExit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        stateRef.current.isSpraying = false;
        setIsSpraying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [deploySmokeScreen, launchBoat, onExit, selectSector]);

  return (
    <div
      dir="rtl"
      className="w-full h-full min-h-0 flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden"
    >
      {/* Top Header Tactical Bar */}
      <div className="desktop-only-bar px-3 sm:px-4 py-2 bg-stone-950/95 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="الانسحاب والعودة للقائمة"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-cairo font-black text-amber-400 text-sm sm:text-base leading-tight">
                المرحلة 2: اختراق خط بارليف وتجريف الساتر الترابي
              </h2>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded">
                خراطيم مياه باقي زكي
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-400 leading-tight">
              وجّه خراطيم المياه بالضغط العالي لفتح 3 ثغرات، وأرسل قوارب الاقتحام تحت غطاء الدخان
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono font-bold">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-amber-300">
            <span className="text-stone-400 text-[10px]">النقاط:</span>
            <span>{score}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-stone-400 text-[10px]">الثغرات:</span>
            <span>{breachesCompleted}/{requiredBreaches}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-sky-300">
            <Waves className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-stone-400 text-[10px]">القوارب:</span>
            <span>{boatsCrossed}/{requiredBoats}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            pumpHp < 35 ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' : 'bg-stone-900 border-stone-800 text-stone-200'
          }`}>
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-stone-400 text-[10px]">المضخة:</span>
            <span>{Math.round(pumpHp)}%</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Combat Viewport */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-stone-950 flex overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={650}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none combat-canvas block object-fill cursor-crosshair"
          aria-label="مشهد اختراق خط بارليف بمدافع المياه وقوارب الاقتحام"
        />

        {/* Digital Mission Timer */}
        {!missionWon && !isDefeated && (
          <MissionDigitalTimer
            timeLeft={timeLeft}
            totalTime={initialDuration}
            label="الوقت المتبقي لفتح الثغرات"
            position="top-center"
          />
        )}

        {/* Tactical Sector Quick-Select Buttons (Top Right) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
          {[
            { id: 0, label: 'القنطرة' },
            { id: 1, label: 'الفردان' },
            { id: 2, label: 'الشط' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => selectSector(sec.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-cairo shadow-lg transition-all cursor-pointer ${
                activeSector === sec.id
                  ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                  : 'bg-stone-950/85 hover:bg-stone-900 border-stone-800 text-stone-300'
              }`}
            >
              <span>{sec.label}</span>
              {stateRef.current.sectors[sec.id]?.completed && (
                <span className="mr-1 text-emerald-400">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Bottom Tactile Action Deck for Mobile & Desktop */}
        <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-3 pointer-events-none select-none">
          {/* Left Controls: Smoke Screen & Turbo Boost */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={deploySmokeScreen}
              disabled={smokeCooldown > 0 || missionWon || isDefeated}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold font-cairo border shadow-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                smokeScreenActive
                  ? 'bg-stone-100 text-stone-900 border-white animate-pulse'
                  : smokeCooldown > 0
                  ? 'bg-stone-900/80 text-stone-500 border-stone-800 cursor-not-allowed'
                  : 'bg-stone-900/90 hover:bg-stone-800 text-stone-200 border-stone-700'
              }`}
              title="إطلاق ستار دخاني لحجب رؤية دشم ونيران العدو (حرف S)"
            >
              <Wind className="w-4 h-4 text-sky-400" />
              <span>{smokeCooldown > 0 ? `دخان (${smokeCooldown}ث)` : 'ستار دخاني (S)'}</span>
            </button>
          </div>

          {/* Right Controls: Spray Water & Launch Boat */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={launchBoat}
              disabled={missionWon || isDefeated}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black font-cairo text-xs sm:text-sm border-2 border-amber-300 shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              title="إرسال قارب اقتحام مطاطي عبر القناة نحو الثغرة (حرف B)"
            >
              <Waves className="w-4 h-4 fill-stone-950" />
              <span>إطلاق قارب عبور (B)</span>
            </button>

            <button
              type="button"
              onPointerDown={() => {
                stateRef.current.isSpraying = true;
                setIsSpraying(true);
              }}
              onPointerUp={() => {
                stateRef.current.isSpraying = false;
                setIsSpraying(false);
              }}
              className={`px-5 py-2.5 rounded-xl font-black font-cairo text-xs sm:text-sm border-2 shadow-xl flex items-center gap-2 cursor-pointer transition-all ${
                isSpraying
                  ? 'bg-sky-400 text-stone-950 border-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.7)] scale-95'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400'
              }`}
              title="اضغط واستمر لرش المياه بالضغط العالي وتجريف الرمال (المسافة أو النقر)"
            >
              <Droplets className="w-4 h-4 fill-current" />
              <span>{isSpraying ? 'ضخ المياه جارٍ 🌊' : 'اضغط لرش المياه (Space)'}</span>
            </button>
          </div>
        </div>

        {/* Victory Modal */}
        <VictoryModal
          isOpen={missionWon}
          missionId="MISSION_CROSSING"
          missionTitle="المرحلة 2: اختراق خط بارليف وتجريف الساتر الترابي"
          congratulatoryMessage="مبروك النصر العظيم! تم تجريف الساتر الترابي بعبقرية خراطيم المياه وتدفق قوارب الأبطال وتحرير الضفة الشرقية!"
          score={score}
          timeLeft={timeLeft}
          targetsDestroyed={breachesCompleted}
          totalTargets={requiredBreaches}
          customStats={[
            { label: 'الثغرات المفتوحة بالكامل', value: `${breachesCompleted} / ${requiredBreaches}`, highlight: true },
            { label: 'قوارب الكوماندوز العابرة بنجاح', value: `${boatsCrossed} قوارب`, highlight: true },
            { label: 'سلامة مضخات المهندسين', value: `${Math.round(pumpHp)}%` },
          ]}
          onNextMission={() => onComplete(score)}
          onReturnToBase={onExit}
          onReplay={resetMission}
        />

        {/* Defeat Overlay Modal */}
        {isDefeated && (
          <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-red-500 mb-3 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black font-cairo text-red-500 mb-2">
              {defeatReason === 'crew_casualty'
                ? 'فشلت المهمة: استشهاد طاقم المضخات تحت نيران العدو!'
                : 'فشلت المهمة: نفد الوقت المحدد للمعركة!'}
            </h3>

            <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
              {defeatReason === 'crew_casualty'
                ? 'تعرضت مضخات المياه التوربينية وطواقم المهندسين لقصف مكثف من دشم ومدفعية خط بارليف. احرص على استخدام الستار الدخاني (S) وتوجيه المياه نحو الدشم لتعطيل نيرانها!'
                : `انتهت المهلة الزمنية المحددة لفتح الثغرات (${Math.floor(initialDuration / 60)} دقيقة${initialDuration % 60 > 0 ? ` و${initialDuration % 60} ثانية` : ''}) دون استكمال فتح الثغرات المطلوبة قبل وصول تعزيزات العدو. أعد المحاولة، فعّل الضغط التوربيني الفائق (T) ووجّه رش المياه نحو مواضع الثغرات الثلاث!` }
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetMission}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-cairo rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة فوراً</span>
              </button>

              <button
                type="button"
                onClick={onExit}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold font-cairo rounded-xl transition-all cursor-pointer"
              >
                <span>العودة للقائمة الرئيسية</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
