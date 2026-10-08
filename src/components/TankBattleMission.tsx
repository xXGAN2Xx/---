import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Crosshair,
  Flame,
  Plane,
  RotateCcw,
  Shield,
  Target,
  Trophy,
  Zap,
  Radio,
  Eye,
  Rocket,
  Bomb,
  Wind,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { isGamePaused } from '../game/pause';
import { Difficulty, DIFFICULTY_CONFIG } from '../game/difficulty';
import { MissionDigitalTimer } from './MissionDigitalTimer';
import { VictoryModal } from './VictoryModal';

interface TankBattleMissionProps {
  difficulty?: Difficulty;
  onComplete: (scoreEarned: number) => void;
  onDefeat?: (reason?: string) => void;
  onExit: () => void;
  onOpenTutorialVideo?: () => void;
}

type WeaponType = 'cannon' | 'sagger' | 'artillery' | 'smoke';

interface EnemyTank {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireCooldown: number;
  type: 'patton' | 'centurion' | 'boss_yaguri';
  isWreck: boolean;
  smokeTimer: number;
  treadOffset: number;
  breachCooldown?: number;
}

interface EnemyPlane {
  id: number;
  x: number;
  y: number;
  speed: number;
  bombCooldown: number;
  hp: number;
  maxHp: number;
  diving: boolean;
  exhaustTimer: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'player-cannon' | 'player-sagger' | 'player-artillery' | 'player-sam' | 'enemy-shell' | 'enemy-bomb';
  targetX?: number;
  targetY?: number;
  life: number;
  trail: { x: number; y: number }[];
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  isSmoke?: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface FloatingCombatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export const TankBattleMission: React.FC<TankBattleMissionProps> = ({
  difficulty = 'normal',
  onComplete,
  onDefeat,
  onExit,
  onOpenTutorialVideo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const nextIdRef = useRef(1);
  const finishRef = useRef(false);

  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const targetTanks = diffConfig.tankBattleTargetCount || (difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10);
  const targetPlanes = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
  const missionDuration = diffConfig.missionDuration || (difficulty === 'easy' ? 150 : difficulty === 'hard' ? 90 : 120);

  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('cannon');
  const [saggerMissiles, setSaggerMissiles] = useState(6);
  const [artilleryCharges, setArtilleryCharges] = useState(3);
  const [smokeCharges, setSmokeCharges] = useState(3);
  const [smokeActiveTimer, setSmokeActiveTimer] = useState(0);
  const [artilleryCooldown, setArtilleryCooldown] = useState(0);
  const [opticsMode, setOpticsMode] = useState<'standard' | 'periscope'>('standard');

  const [timeLeft, setTimeLeft] = useState(missionDuration);
  const [health, setHealth] = useState(100);
  const [tanksDestroyed, setTanksDestroyed] = useState(0);
  const [planesDestroyed, setPlanesDestroyed] = useState(0);
  const [saggerHits, setSaggerHits] = useState(0);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isDefeated, setIsDefeated] = useState(false);
  const [defeatReason, setDefeatReason] = useState<'health' | 'timeout'>('health');
  const [radioDispatch, setRadioDispatch] = useState('الله أكبر! تمركز في رأس الكوبري واستعد لصد أرتال دبابات العدو الزاحفة نحو القناة.');
  const [bossSpawned, setBossSpawned] = useState(false);

  const worldRef = useRef({
    width: 1200,
    height: 700,
    aimX: 840,
    aimY: 340,
    playerHealth: 100,
    tanksDestroyed: 0,
    planesDestroyed: 0,
    saggerHits: 0,
    score: 0,
    elapsed: 0,
    screenShake: 0,
    recoilOffset: 0,
    muzzleFlashTime: 0,
    turretAngle: 0,
    tankSpawnTimer: 2.0,
    planeSpawnTimer: 5.5,
    cannonCooldown: 0,
    artilleryCooldownTimer: 0,
    smokeTimeRemaining: 0,
    tanks: [] as EnemyTank[],
    planes: [] as EnemyPlane[],
    projectiles: [] as Projectile[],
    particles: [] as ExplosionParticle[],
    shockwaves: [] as Shockwave[],
    floatingTexts: [] as FloatingCombatText[],
    ambientDust: Array.from({ length: 36 }, (_, i) => ({
      x: (i * 123) % 1200,
      y: 200 + ((i * 73) % 480),
      size: 1.5 + (i % 4) * 0.8,
      speed: 25 + (i % 5) * 12,
    })),
  });

  // Start background tank battle theme
  useEffect(() => {
    sound.playBackgroundTheme('tankBattle');
  }, []);

  const addFloatingText = useCallback((text: string, x: number, y: number, color = '#fef08a') => {
    worldRef.current.floatingTexts.push({
      id: nextIdRef.current++,
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 1.6,
    });
  }, []);

  const triggerScreenShake = useCallback((amount: number) => {
    worldRef.current.screenShake = Math.max(worldRef.current.screenShake, amount);
  }, []);

  const resetWorld = useCallback(() => {
    const world = worldRef.current;
    world.playerHealth = 100;
    world.tanksDestroyed = 0;
    world.planesDestroyed = 0;
    world.saggerHits = 0;
    world.score = 0;
    world.elapsed = 0;
    world.screenShake = 0;
    world.recoilOffset = 0;
    world.muzzleFlashTime = 0;
    world.tankSpawnTimer = 1.8;
    world.planeSpawnTimer = 5.0;
    world.cannonCooldown = 0;
    world.artilleryCooldownTimer = 0;
    world.smokeTimeRemaining = 0;
    world.aimX = 840;
    world.aimY = 340;
    world.tanks = [];
    world.planes = [];
    world.projectiles = [];
    world.particles = [];
    world.shockwaves = [];
    world.floatingTexts = [];

    setTimeLeft(missionDuration);
    setHealth(100);
    setTanksDestroyed(0);
    setPlanesDestroyed(0);
    setSaggerHits(0);
    setScore(0);
    setSaggerMissiles(6);
    setArtilleryCharges(3);
    setSmokeCharges(3);
    setSmokeActiveTimer(0);
    setArtilleryCooldown(0);
    setSelectedWeapon('cannon');
    setIsWon(false);
    setIsDefeated(false);
    setDefeatReason('health');
    setBossSpawned(false);
    setRadioDispatch('الله أكبر! تمركز في رأس الكوبري واستعد لصد أرتال دبابات العدو الزاحفة نحو القناة.');
    finishRef.current = false;
  }, [missionDuration]);

  const endVictory = useCallback(() => {
    if (finishRef.current) return;
    finishRef.current = true;
    const world = worldRef.current;
    const timeBonus = Math.max(0, Math.round(timeLeft * 6));
    const healthBonus = Math.round(world.playerHealth * 12);
    const earned = world.tanksDestroyed * 400 + world.planesDestroyed * 700 + world.saggerHits * 250 + timeBonus + healthBonus;
    world.score = earned;
    setScore(earned);
    setIsWon(true);
    setRadioDispatch('الله أكبر والنصر لمصر! تم سحق الهجوم المضاد ودحر اللواء 190 بالكامل وأسر قادته! 🇪🇬');
    sound.playVictoryFanfare();
  }, [timeLeft]);

  const endDefeat = useCallback((reason: 'health' | 'timeout') => {
    if (finishRef.current) return;
    finishRef.current = true;
    setDefeatReason(reason);
    setIsDefeated(true);
    setRadioDispatch(reason === 'health' ? 'اخترقت نيران الدبابات المعادية الساتر الترابي. أعد تنظيم خط النار وتمركز مجدداً.' : 'انتهى الوقت قبل كسر الهجوم المعادي بالكامل.');
    sound.playDefeatSound();
    onDefeat?.(reason === 'health' ? 'breach' : 'timeout');
  }, [onDefeat]);

  // Create explosion particles and shockwaves
  const createExplosion = useCallback((x: number, y: number, big = false, isMissile = false) => {
    const world = worldRef.current;
    const count = big ? 28 : 16;
    triggerScreenShake(big ? 14 : 7);

    world.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: big ? 65 : 38,
      alpha: 0.9,
      color: isMissile ? '#ef4444' : '#f59e0b',
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = (big ? 80 : 50) + Math.random() * (big ? 140 : 90);
      const isSmoke = Math.random() > 0.45;

      world.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSmoke ? 30 : 0),
        life: 0,
        maxLife: isSmoke ? 0.9 + Math.random() * 0.7 : 0.4 + Math.random() * 0.35,
        size: isSmoke ? (big ? 14 : 9) : (big ? 7 : 4),
        color: isSmoke
          ? Math.random() > 0.5 ? '#1c1917' : '#44403c'
          : Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
        isSmoke,
      });
    }
  }, [triggerScreenShake]);

  // Damage player
  const damagePlayer = useCallback((amount: number) => {
    const world = worldRef.current;
    // Smoke screen reduces damage by 80%
    const finalAmount = world.smokeTimeRemaining > 0 ? Math.max(1, Math.round(amount * 0.2)) : amount;
    world.playerHealth = Math.max(0, world.playerHealth - finalAmount);
    setHealth(world.playerHealth);
    triggerScreenShake(12);
    createExplosion(150, 560, finalAmount >= 12);
    sound.playHitSound();

    if (world.smokeTimeRemaining > 0) {
      addFloatingText('🛡️ حمتك ستارة الدخان! (-80%)', 160, 520, '#38bdf8');
    } else {
      addFloatingText(`💥 إصابة الموقع! -${finalAmount}%`, 160, 520, '#ef4444');
    }

    if (world.playerHealth <= 0) {
      endDefeat('health');
    }
  }, [createExplosion, endDefeat, triggerScreenShake, addFloatingText]);

  // Fire currently selected weapon
  const fireCurrentWeapon = useCallback(() => {
    const world = worldRef.current;
    if (finishRef.current || isGamePaused()) return;

    const tankMuzzleX = 175;
    const tankMuzzleY = 540;
    const dx = world.aimX - tankMuzzleX;
    const dy = world.aimY - tankMuzzleY;
    const dist = Math.max(1, Math.hypot(dx, dy));

    if (selectedWeapon === 'cannon') {
      if (world.cannonCooldown > 0) return;
      world.cannonCooldown = 0.45;
      world.recoilOffset = 14;
      world.muzzleFlashTime = 0.12;
      triggerScreenShake(6);

      world.projectiles.push({
        id: nextIdRef.current++,
        x: tankMuzzleX,
        y: tankMuzzleY,
        vx: (dx / dist) * 1100,
        vy: (dy / dist) * 1100,
        kind: 'player-cannon',
        life: 0,
        trail: [],
      });
      sound.playCannon();
    } else if (selectedWeapon === 'sagger') {
      if (saggerMissiles <= 0) {
        addFloatingText('نفدت صواريخ مالوتكا!', tankMuzzleX + 60, tankMuzzleY - 30, '#f87171');
        sound.playRadioClick();
        return;
      }
      setSaggerMissiles((prev) => prev - 1);
      triggerScreenShake(4);

      world.projectiles.push({
        id: nextIdRef.current++,
        x: tankMuzzleX,
        y: tankMuzzleY - 18,
        vx: (dx / dist) * 450,
        vy: (dy / dist) * 450,
        targetX: world.aimX,
        targetY: world.aimY,
        kind: 'player-sagger',
        life: 0,
        trail: [],
      });
      sound.playMissileLaunch();
      setRadioDispatch('🚀 صاروخ مالوتكا أُطلق! سلك التوجيه نشط باتجاه الهدف.');
    } else if (selectedWeapon === 'artillery') {
      if (artilleryCharges <= 0 || artilleryCooldown > 0) {
        sound.playRadioClick();
        return;
      }
      setArtilleryCharges((prev) => prev - 1);
      setArtilleryCooldown(12);
      world.artilleryCooldownTimer = 12;

      // Call artillery strikes around target
      const targetAreaX = Math.max(380, world.aimX);
      const targetAreaY = Math.max(380, world.aimY);

      sound.playCannon();
      sound.playRadioTransmission();
      setRadioDispatch('💣 جاري دك المنطقة المستهدفة بقذائف الهاوتزر 130 ملم الثقيلة!');
      addFloatingText('🎯 إحداثيات قصف مدفعي تم تأكيدها', targetAreaX, targetAreaY - 40, '#f59e0b');

      for (let s = 0; s < 4; s++) {
        setTimeout(() => {
          if (finishRef.current) return;
          const shellX = targetAreaX + (Math.random() - 0.5) * 140;
          const shellY = targetAreaY + (Math.random() - 0.5) * 80;

          world.projectiles.push({
            id: nextIdRef.current++,
            x: shellX - 120,
            y: 0,
            vx: 300,
            vy: 950,
            targetX: shellX,
            targetY: shellY,
            kind: 'player-artillery',
            life: 0,
            trail: [],
          });
        }, s * 300 + 400);
      }
    } else if (selectedWeapon === 'smoke') {
      if (smokeCharges <= 0) {
        sound.playRadioClick();
        return;
      }
      setSmokeCharges((prev) => prev - 1);
      setSmokeActiveTimer(6);
      world.smokeTimeRemaining = 6;
      sound.playWaterCannon();
      setRadioDispatch('💨 تم تفعيل ستارة الدخان التكتيكية! رماة العدو فقدوا الرؤية المباشرة لمدة 6 ثوانٍ.');
      addFloatingText('💨 ستارة دخان مفعلة (حماية 80%)', 220, 500, '#38bdf8');
    }
  }, [selectedWeapon, saggerMissiles, artilleryCharges, artilleryCooldown, smokeCharges, triggerScreenShake, addFloatingText]);

  // Intercept diving planes with SAM-6 air defense
  const fireSamMissile = useCallback(() => {
    const world = worldRef.current;
    if (finishRef.current || isGamePaused() || world.planes.length === 0) {
      sound.playRadioClick();
      return;
    }

    const targetPlane = world.planes[0];
    sound.playMissileLaunch();
    triggerScreenShake(5);
    setRadioDispatch('🚀 صاروخ سام-6 انطلق من خلف الساتر لاعتراض المقاتلة المعادية!');

    world.projectiles.push({
      id: nextIdRef.current++,
      x: 120,
      y: 520,
      vx: (targetPlane.x - 120) * 1.5,
      vy: (targetPlane.y - 520) * 1.5,
      targetX: targetPlane.x,
      targetY: targetPlane.y,
      kind: 'player-sam',
      life: 0,
      trail: [],
    });
  }, [triggerScreenShake]);

  // Aim crosshair with pointer or touch
  const updateAimCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = worldRef.current.width / rect.width;
    const scaleY = worldRef.current.height / rect.height;
    worldRef.current.aimX = Math.max(260, Math.min(worldRef.current.width - 25, (clientX - rect.left) * scaleX));
    worldRef.current.aimY = Math.max(60, Math.min(worldRef.current.height - 85, (clientY - rect.top) * scaleY));
  }, []);

  // Keyboard hotkeys for weapons & SAM
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGamePaused() || isWon || isDefeated) return;
      if (e.key === '1') {
        setSelectedWeapon('cannon');
        sound.playRadioClick();
      } else if (e.key === '2') {
        setSelectedWeapon('sagger');
        sound.playRadioClick();
      } else if (e.key === '3') {
        setSelectedWeapon('artillery');
        sound.playRadioClick();
      } else if (e.key === '4') {
        setSelectedWeapon('smoke');
        sound.playRadioClick();
      } else if (e.code === 'Space' || e.key === 's' || e.key === 'S' || e.key === 'س') {
        fireSamMissile();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'ب') {
        fireCurrentWeapon();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fireCurrentWeapon, fireSamMissile, isDefeated, isWon]);

  // Main countdown & cooldown timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isGamePaused() || isWon || isDefeated || finishRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endDefeat('timeout');
          return 0;
        }
        return prev - 1;
      });

      // Cooldown updates
      if (worldRef.current.smokeTimeRemaining > 0) {
        worldRef.current.smokeTimeRemaining -= 1;
        setSmokeActiveTimer(Math.max(0, Math.ceil(worldRef.current.smokeTimeRemaining)));
      }
      if (worldRef.current.artilleryCooldownTimer > 0) {
        worldRef.current.artilleryCooldownTimer -= 1;
        setArtilleryCooldown(Math.max(0, Math.ceil(worldRef.current.artilleryCooldownTimer)));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endDefeat, isWon, isDefeated]);

  // Check victory condition
  useEffect(() => {
    if (tanksDestroyed >= targetTanks && planesDestroyed >= targetPlanes) {
      endVictory();
    }
  }, [tanksDestroyed, planesDestroyed, targetTanks, targetPlanes, endVictory]);

  // Spawn tank logic
  const spawnTank = useCallback(() => {
    const world = worldRef.current;
    const remainingToWin = targetTanks - world.tanksDestroyed;

    // Check if boss tank should spawn (last tank or on hard mode)
    const shouldSpawnBoss = !bossSpawned && (remainingToWin <= 1 || (difficulty === 'hard' && world.tanksDestroyed >= 10));

    let type: 'patton' | 'centurion' | 'boss_yaguri' = 'patton';
    let hp = 2;
    let speed = 46;

    if (shouldSpawnBoss) {
      type = 'boss_yaguri';
      hp = 6;
      speed = 36;
      setBossSpawned(true);
      setRadioDispatch('⚠️ تحذير تكتيكي: ظهور دبابة قيادة اللواء 190 (عساف ياجوري)! ركز النيران عليها!');
      addFloatingText('👑 ظهور دبابة قيادة اللواء 190!', world.width - 200, 360, '#facc15');
      sound.playRadioTransmission();
    } else if (world.tanks.length % 3 === 2) {
      type = 'centurion';
      hp = 4;
      speed = 38;
    }

    world.tanks.push({
      id: nextIdRef.current++,
      x: world.width + 80,
      y: 470 + ((world.tanks.length * 53) % 115),
      hp,
      maxHp: hp,
      speed,
      fireCooldown: 2.2 + Math.random() * 1.5,
      type,
      isWreck: false,
      smokeTimer: 0,
      treadOffset: 0,
      breachCooldown: 0,
    });
  }, [addFloatingText, bossSpawned, difficulty, targetTanks]);

  // Spawn enemy plane
  const spawnPlane = useCallback(() => {
    const world = worldRef.current;
    world.planes.push({
      id: nextIdRef.current++,
      x: world.width + 90,
      y: 85 + Math.random() * 120,
      speed: 130 + Math.random() * 45,
      bombCooldown: 2.5 + Math.random() * 1.8,
      hp: 2,
      maxHp: 2,
      diving: false,
      exhaustTimer: 0,
    });
  }, []);

  // Main game rendering loop on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    // Helper: Draw detailed Egyptian T-62
    const drawPlayerT62 = (x: number, y: number, recoil: number, aimAngle: number) => {
      ctx.save();
      ctx.translate(x, y);

      // Tank Hull Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 36, 75, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tracks and lower hull
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(-65, 12, 130, 26, 8);
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Road Wheels (5 large road wheels typical of T-62)
      for (let w = 0; w < 5; w++) {
        const wx = -48 + w * 24;
        const wy = 25;
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.arc(wx, wy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(wx, wy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper Hull with desert camouflage (Ochre & Olive)
      const hullGrad = ctx.createLinearGradient(-60, -10, 60, 20);
      hullGrad.addColorStop(0, '#78350f');
      hullGrad.addColorStop(0.5, '#a16207');
      hullGrad.addColorStop(1, '#4d7c0f');
      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(-60, 14);
      ctx.lineTo(-50, -8);
      ctx.lineTo(55, -8);
      ctx.lineTo(65, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Camouflage stripes on hull
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-5, -8);
      ctx.lineTo(5, 14);
      ctx.lineTo(-10, 14);
      ctx.closePath();
      ctx.fill();

      // Turret and Gun Assembly
      ctx.save();
      ctx.translate(0, -12);

      // Gun Barrel (elevates and recoils)
      ctx.save();
      ctx.rotate(aimAngle * 0.7); // smooth scaled elevation

      // Recoil translation along barrel axis
      ctx.translate(-recoil, 0);

      // Gun Mantlet
      ctx.fillStyle = '#44403c';
      ctx.fillRect(14, -8, 16, 16);

      // 115mm Smoothbore Barrel
      const barrelGrad = ctx.createLinearGradient(0, -6, 0, 6);
      barrelGrad.addColorStop(0, '#292524');
      barrelGrad.addColorStop(0.5, '#78716c');
      barrelGrad.addColorStop(1, '#1c1917');
      ctx.fillStyle = barrelGrad;
      ctx.fillRect(28, -5, 75, 10);

      // Bore Evacuator on barrel
      ctx.fillStyle = '#44403c';
      ctx.fillRect(65, -8, 18, 16);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(65, -8, 18, 16);

      // Muzzle Brake / Crown
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(101, -6, 6, 12);

      // Muzzle Flash Effect
      if (worldRef.current.muzzleFlashTime > 0) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(114, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(110, 0, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(106, 0, 36, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Cast Rounded Turret (Egg-shaped dome of T-62)
      const turretGrad = ctx.createRadialGradient(-5, -6, 4, 0, 0, 32);
      turretGrad.addColorStop(0, '#ca8a04');
      turretGrad.addColorStop(0.65, '#854d0e');
      turretGrad.addColorStop(1, '#3f6212');
      ctx.fillStyle = turretGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 26, Math.PI, 0);
      ctx.lineTo(24, 6);
      ctx.lineTo(-24, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Commander Cupola & Periscope
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(-10, -18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-12, -22, 5, 4); // optic glass

      // Luna Infrared Searchlight
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(12, -16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.beginPath();
      ctx.arc(12, -16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Egyptian Army Identification Number / Roundel
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-2, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-2, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Antenna with Egyptian Pennant
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, -18);
      ctx.lineTo(-18, -48);
      ctx.stroke();

      // Little fluttering Egyptian flag on antenna
      const wave = Math.sin(worldRef.current.elapsed * 6) * 3;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-18, -48, 14, 3.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-18, -44.5, 14 + wave * 0.4, 3.5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-18, -41, 14 + wave, 3.5);

      ctx.restore();
      ctx.restore();
    };

    // Helper: Draw detailed Enemy Tanks (Patton, Centurion, or Boss Yaguri)
    const drawEnemyTank = (tank: EnemyTank) => {
      ctx.save();
      ctx.translate(tank.x, tank.y);

      if (tank.isWreck) {
        // Charred smoldering wreck
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.roundRect(-42, -12, 84, 32, 6);
        ctx.fill();
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(-4, -14, 18, Math.PI, 0);
        ctx.fill();

        // Broken barrel dipping down
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.lineTo(-58, 8);
        ctx.stroke();

        // Rising smoke from wreck
        ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
        for (let s = 0; s < 3; s++) {
          const sy = -25 - s * 16 - ((worldRef.current.elapsed * 25 + s * 14) % 40);
          const sx = -4 + Math.sin(worldRef.current.elapsed * 3 + s) * 12;
          ctx.beginPath();
          ctx.arc(sx, sy, 10 + s * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return;
      }

      const isBoss = tank.type === 'boss_yaguri';
      const isCenturion = tank.type === 'centurion';

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 24, isBoss ? 68 : isCenturion ? 58 : 50, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Treads
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(isBoss ? -46 : -38, 6, isBoss ? 92 : 76, 22, 6);
      ctx.fill();
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Road wheels
      const wheelCount = isBoss ? 6 : isCenturion ? 6 : 5;
      for (let w = 0; w < wheelCount; w++) {
        const wx = (isBoss ? -34 : -28) + w * (isBoss ? 14 : 13);
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.arc(wx, 17, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hull
      const hullGrad = ctx.createLinearGradient(0, -10, 0, 15);
      if (isBoss) {
        hullGrad.addColorStop(0, '#854d0e');
        hullGrad.addColorStop(0.5, '#b45309');
        hullGrad.addColorStop(1, '#713f12');
      } else if (isCenturion) {
        hullGrad.addColorStop(0, '#52525b');
        hullGrad.addColorStop(0.5, '#71717a');
        hullGrad.addColorStop(1, '#3f3f46');
      } else {
        hullGrad.addColorStop(0, '#78716c');
        hullGrad.addColorStop(0.5, '#a8a29e');
        hullGrad.addColorStop(1, '#57534e');
      }

      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(isBoss ? 42 : 36, 8);
      ctx.lineTo(isBoss ? 35 : 30, -10);
      ctx.lineTo(isBoss ? -40 : -32, -10);
      ctx.lineTo(isBoss ? -46 : -38, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Turret
      ctx.fillStyle = isBoss ? '#eab308' : isCenturion ? '#71717a' : '#854d0e';
      ctx.beginPath();
      ctx.arc(0, -12, isBoss ? 22 : isCenturion ? 19 : 16, Math.PI, 0);
      ctx.lineTo(isBoss ? 18 : 14, 0);
      ctx.lineTo(isBoss ? -18 : -14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gun Barrel pointing towards Egyptian line (to the left)
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = isBoss ? 9 : isCenturion ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(-6, -14);
      ctx.lineTo(isBoss ? -76 : isCenturion ? -68 : -58, -14);
      ctx.stroke();

      // Israeli insignia (Blue star or chevron)
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-2, -18, 5, 5);

      // Boss decorative crown or crest
      if (isBoss) {
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 12px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑 قيادة اللواء 190', 0, -38);
      }

      // Health bar above tank
      const barW = isBoss ? 80 : isCenturion ? 60 : 46;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-barW / 2, -28, barW, 6);
      ctx.fillStyle = tank.hp / tank.maxHp > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-barW / 2, -28, barW * (tank.hp / tank.maxHp), 6);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, -28, barW, 6);

      ctx.restore();
    };

    // Helper: Draw detailed Enemy Plane (Phantom / Skyhawk)
    const drawEnemyPlane = (plane: EnemyPlane) => {
      ctx.save();
      ctx.translate(plane.x, plane.y);

      // Shadow on ground
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 480 - plane.y, 45, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jet Body
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(-58, 0);
      ctx.lineTo(-16, -10);
      ctx.lineTo(10, -38); // wing tip top
      ctx.lineTo(24, -10);
      ctx.lineTo(60, 0);
      ctx.lineTo(24, 10);
      ctx.lineTo(10, 38); // wing tip bottom
      ctx.lineTo(-16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Cockpit Glass
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-28, -4, 22, 8);

      // Jet Exhaust Trails
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(62, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(66, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Smoke trail
      ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.beginPath();
      ctx.arc(85, 0, 10, 0, Math.PI * 2);
      ctx.arc(115, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-25, -24, 50, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-25, -24, 50 * (plane.hp / plane.maxHp), 5);

      ctx.restore();
    };

    // Main frame loop
    const render = (now: number) => {
      if (cancelled) return;
      const world = worldRef.current;
      const dt = lastFrameRef.current ? Math.min(0.033, (now - lastFrameRef.current) / 1000) : 0.016;
      lastFrameRef.current = now;

      const w = world.width;
      const h = world.height;

      // Update game physics & state
      if (!isGamePaused() && !finishRef.current) {
        world.elapsed += dt;
        world.screenShake = Math.max(0, world.screenShake - dt * 25);
        world.recoilOffset = Math.max(0, world.recoilOffset - dt * 45);
        world.muzzleFlashTime = Math.max(0, world.muzzleFlashTime - dt);
        world.cannonCooldown = Math.max(0, world.cannonCooldown - dt);

        // Update turret angle towards aim
        const tankX = 150;
        const tankY = 560;
        const targetAngle = Math.atan2(world.aimY - tankY, world.aimX - tankX);
        world.turretAngle += (targetAngle - world.turretAngle) * 0.18;

        // Spawns
        world.tankSpawnTimer -= dt;
        world.planeSpawnTimer -= dt;

        if (world.tankSpawnTimer <= 0 && world.tanksDestroyed < targetTanks + 2) {
          spawnTank();
          world.tankSpawnTimer = Math.max(2.8, 5.5 - world.elapsed * 0.025);
        }

        if (world.planeSpawnTimer <= 0 && world.planesDestroyed < targetPlanes + 1) {
          spawnPlane();
          world.planeSpawnTimer = Math.max(5.0, 9.0 - world.elapsed * 0.03);
        }

        // Enemy Tanks update
        for (const tank of world.tanks) {
          if (!tank.isWreck) {
            tank.x -= tank.speed * dt;
            tank.fireCooldown -= dt;

            // Enemy tank fires shells directly aimed at Egyptian position (150, 560)
            if (tank.fireCooldown <= 0 && tank.x < w - 60) {
              tank.fireCooldown = 2.4 + Math.random() * 1.6;
              const muzzleX = tank.x - 45;
              const muzzleY = tank.y - 14;
              const targetBunkerX = 150 + (Math.random() - 0.5) * 40;
              const targetBunkerY = 560 + (Math.random() - 0.5) * 40;
              const toX = targetBunkerX - muzzleX;
              const toY = targetBunkerY - muzzleY;
              const dist = Math.max(1, Math.hypot(toX, toY));
              const shellSpeed = 440;

              world.projectiles.push({
                id: nextIdRef.current++,
                x: muzzleX,
                y: muzzleY,
                vx: (toX / dist) * shellSpeed,
                vy: (toY / dist) * shellSpeed,
                kind: 'enemy-shell',
                life: 0,
                trail: [],
              });
              sound.playGunshot();
            }

            // Close range breach
            tank.breachCooldown = (tank.breachCooldown ?? 0) - dt;
            if (tank.x < 240) {
              tank.x = 240;
              if ((tank.breachCooldown ?? 0) <= 0) {
                tank.breachCooldown = 1.4;
                damagePlayer(tank.type === 'boss_yaguri' ? 16 : 9);
                addFloatingText('⚠️ هجوم مباشر من مسافة قريبة!', 180, 530, '#ef4444');
              }
            }
          }
        }

        // Enemy Planes update
        for (let pIdx = world.planes.length - 1; pIdx >= 0; pIdx--) {
          const plane = world.planes[pIdx];
          plane.x -= plane.speed * dt;
          plane.bombCooldown -= dt;

          // Enemy plane drops bomb aimed at Egyptian position
          if (plane.bombCooldown <= 0 && plane.x < 800 && plane.x > 180) {
            plane.bombCooldown = 3.6 + Math.random() * 1.4;
            const bombSpeedY = 280;
            const targetX = 150 + (Math.random() - 0.5) * 40;
            const targetY = 560;
            const fallTime = Math.max(0.6, (targetY - (plane.y + 26)) / bombSpeedY);
            const neededVx = (targetX - plane.x) / fallTime;

            world.projectiles.push({
              id: nextIdRef.current++,
              x: plane.x,
              y: plane.y + 26,
              vx: Math.max(-280, Math.min(60, neededVx)),
              vy: bombSpeedY,
              kind: 'enemy-bomb',
              life: 0,
              trail: [],
            });
            setRadioDispatch('⚠️ غارة جوية معادية! قنبلة متجهة نحو موقعنا — أسقط المقاتلة فوراً!');
          }

          if (plane.x < -100) {
            world.planes.splice(pIdx, 1);
          }
        }

        // Projectiles update
        for (let i = world.projectiles.length - 1; i >= 0; i--) {
          const p = world.projectiles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life += dt;

          // Wire-guided missile steering physics (Sagger)
          if (p.kind === 'player-sagger') {
            const steerX = (world.aimX - p.x);
            const steerY = (world.aimY - p.y);
            const steerDist = Math.max(1, Math.hypot(steerX, steerY));
            p.vx += (steerX / steerDist) * 350 * dt;
            p.vy += (steerY / steerDist) * 350 * dt;

            // Wire coil line smoke
            if (Math.random() > 0.4) {
              world.particles.push({
                x: p.x,
                y: p.y,
                vx: -20,
                vy: (Math.random() - 0.5) * 10,
                life: 0,
                maxLife: 0.35,
                size: 3,
                color: '#f97316',
              });
            }
          }

          // SAM surface-to-air missile guidance
          if (p.kind === 'player-sam') {
            if (world.planes.length > 0) {
              const target = world.planes[0];
              const sDx = target.x - p.x;
              const sDy = target.y - p.y;
              const sDist = Math.max(1, Math.hypot(sDx, sDy));
              p.vx = (sDx / sDist) * 850;
              p.vy = (sDy / sDist) * 850;

              if (sDist < 45) {
                target.hp = 0;
                createExplosion(target.x, target.y, true, true);
                sound.playExplosion(1.4);
                world.planes.splice(0, 1);
                world.planesDestroyed += 1;
                world.score += 700;
                setPlanesDestroyed(world.planesDestroyed);
                setScore(world.score);
                addFloatingText('🎯 إسقاط فانتوم بحائط الصواريخ سام-6! (+700)', target.x, target.y, '#38bdf8');
                setRadioDispatch('🚀 الله أكبر! حائط الصواريخ سام-6 أسقط المقاتلة المعادية في سماء سيناء!');
                world.projectiles.splice(i, 1);
                continue;
              }
            }
          }

          // Check collisions for player weapons
          if (p.kind === 'player-cannon' || p.kind === 'player-sagger' || p.kind === 'player-artillery') {
            let hit = false;

            // Collision with enemy tanks
            for (const tank of world.tanks) {
              if (tank.isWreck) continue;
              const distToTank = Math.hypot(p.x - tank.x, p.y - tank.y);
              const hitRadius = tank.type === 'boss_yaguri' ? 56 : 45;

              if (distToTank < hitRadius) {
                hit = true;
                const isSagger = p.kind === 'player-sagger';
                const isArtillery = p.kind === 'player-artillery';
                const damage = isSagger ? 4 : isArtillery ? 3 : 1;

                tank.hp -= damage;
                createExplosion(p.x, p.y, tank.hp <= 0 || isSagger || isArtillery, isSagger);
                sound.playExplosion(tank.hp <= 0 ? 1.2 : 0.6);

                if (isSagger) {
                  world.saggerHits += 1;
                  setSaggerHits(world.saggerHits);
                  addFloatingText('🚀 ضربة ساجر مدمرة! (+250)', tank.x, tank.y - 25, '#ef4444');
                } else if (isArtillery) {
                  addFloatingText('💣 إصابة مدفعية ثقيلة!', tank.x, tank.y - 25, '#f59e0b');
                } else {
                  addFloatingText('🎯 إصابة قذيفة 115 ملم', tank.x, tank.y - 20, '#fde047');
                }

                if (tank.hp <= 0) {
                  tank.isWreck = true;
                  world.tanksDestroyed += 1;
                  const pts = tank.type === 'boss_yaguri' ? 1800 : tank.type === 'centurion' ? 650 : 450;
                  world.score += pts;
                  setTanksDestroyed(world.tanksDestroyed);
                  setScore(world.score);

                  if (tank.type === 'boss_yaguri') {
                    addFloatingText('👑 سحق دبابة قائد اللواء 190! (+1800)', tank.x, tank.y - 45, '#facc15');
                    setRadioDispatch('الله أكبر! تم تدمير دبابة القيادة للواء 190 وقطع خطوط إمداد العدو بالكامل!');
                  } else {
                    addFloatingText(`💥 تدمير دبابة معادية! (+${pts})`, tank.x, tank.y - 30, '#4ade80');
                    setRadioDispatch('إصابة قاتلة! اشتعلت النيران في برج الدبابة المعادية.');
                  }
                }
                break;
              }
            }

            // Direct cannon or Sagger (Malyutka) missile hit on enemy planes
            if (!hit && (p.kind === 'player-cannon' || p.kind === 'player-sagger')) {
              for (let pIdx = world.planes.length - 1; pIdx >= 0; pIdx--) {
                const plane = world.planes[pIdx];
                const hitRadius = p.kind === 'player-sagger' ? 54 : 48;
                if (Math.hypot(p.x - plane.x, p.y - plane.y) < hitRadius) {
                  hit = true;
                  const isSagger = p.kind === 'player-sagger';
                  const damage = isSagger ? 4 : 1;
                  plane.hp -= damage;
                  createExplosion(p.x, p.y, plane.hp <= 0 || isSagger, isSagger);

                  if (isSagger) {
                    world.saggerHits += 1;
                    setSaggerHits(world.saggerHits);
                  }

                  if (plane.hp <= 0) {
                    world.planes.splice(pIdx, 1);
                    world.planesDestroyed += 1;
                    world.score += 700;
                    setPlanesDestroyed(world.planesDestroyed);
                    setScore(world.score);
                    addFloatingText(isSagger ? '🚀 صيد جوي! صاروخ مالوتكا أسقط الطائرة! (+700)' : '✈️ إسقاط مقاتلة معادية! (+700)', plane.x, plane.y, '#38bdf8');
                    setRadioDispatch(isSagger ? 'الله أكبر! صاروخ مالوتكا أصاب المقاتلة المعادية وفجرها في الجو! 🇪🇬' : 'طائرة معادية هوت محترقة في رمال سيناء! 🇪🇬');
                    sound.playExplosion(1.4);
                  } else {
                    sound.playHitSound();
                    addFloatingText(isSagger ? '🚀 إصابة صاروخ مالوتكا!' : 'إصابة الطائرة!', plane.x, plane.y, '#fde047');
                  }
                  break;
                }
              }
            }

            if (hit) {
              world.projectiles.splice(i, 1);
              continue;
            }
          }

          // Enemy shells hitting player Egyptian position
          if (p.kind === 'enemy-shell') {
            const hitBunker = Math.hypot(p.x - 150, p.y - 560) < 75 || (p.x <= 200 && p.y >= 470 && p.y <= 620);
            if (hitBunker) {
              world.projectiles.splice(i, 1);
              damagePlayer(8);
              continue;
            }
          }

          // Enemy bombs hitting player Egyptian position
          if (p.kind === 'enemy-bomb') {
            const hitBunker = Math.hypot(p.x - 150, p.y - 560) < 85 || (p.x <= 210 && p.y >= 470 && p.y <= 620);
            if (hitBunker) {
              world.projectiles.splice(i, 1);
              damagePlayer(18);
              continue;
            }
          }

          // Remove out of bounds
          if (p.x < -100 || p.x > w + 120 || p.y < -100 || p.y > h + 100) {
            world.projectiles.splice(i, 1);
          }
        }

        // Particles update
        for (let i = world.particles.length - 1; i >= 0; i--) {
          const pt = world.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life += dt;
          if (pt.isSmoke) {
            pt.size += dt * 8;
          }
          if (pt.life >= pt.maxLife) {
            world.particles.splice(i, 1);
          }
        }

        // Shockwaves update
        for (let i = world.shockwaves.length - 1; i >= 0; i--) {
          const sw = world.shockwaves[i];
          sw.radius += (sw.maxRadius - sw.radius) * 12 * dt;
          sw.alpha -= dt * 2.2;
          if (sw.alpha <= 0) {
            world.shockwaves.splice(i, 1);
          }
        }

        // Floating texts update
        for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
          const ft = world.floatingTexts[i];
          ft.y -= dt * 32;
          ft.life += dt;
          if (ft.life >= ft.maxLife) {
            world.floatingTexts.splice(i, 1);
          }
        }
      }

      // DRAW CANVAS
      ctx.save();

      // Apply Screen Shake
      if (world.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * world.screenShake;
        const shakeY = (Math.random() - 0.5) * world.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // 1. SKY GRADIENT (Dusk over Sinai desert with golden hour glow)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      skyGrad.addColorStop(0, '#0c192c');   // Twilight dark blue
      skyGrad.addColorStop(0.35, '#23374d'); // Atmospheric haze
      skyGrad.addColorStop(0.7, '#854d0e');  // Golden desert sunset glow
      skyGrad.addColorStop(1, '#d97706');    // Fiery orange horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun disc & golden corona
      const sunGrad = ctx.createRadialGradient(920, 160, 10, 920, 160, 90);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.3, 'rgba(251, 191, 36, 0.7)');
      sunGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(920, 160, 90, 0, Math.PI * 2);
      ctx.fill();

      // 2. DISTANT SINAI MOUNTAIN RIDGES
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, 360);
      ctx.lineTo(120, 305);
      ctx.lineTo(240, 335);
      ctx.lineTo(380, 290);
      ctx.lineTo(540, 340);
      ctx.lineTo(710, 280);
      ctx.lineTo(890, 325);
      ctx.lineTo(1050, 275);
      ctx.lineTo(1200, 330);
      ctx.lineTo(1200, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Second closer ridge with warm desert tint
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, 390);
      ctx.quadraticCurveTo(220, 330, 460, 385);
      ctx.quadraticCurveTo(720, 320, 980, 375);
      ctx.quadraticCurveTo(1110, 340, 1200, 365);
      ctx.lineTo(1200, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Distant burning smoke columns (Chinese Farm & Sinai skirmishes)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      for (let sc = 0; sc < 4; sc++) {
        const scx = 360 + sc * 220;
        const scy = 360;
        ctx.beginPath();
        ctx.moveTo(scx, scy);
        ctx.quadraticCurveTo(scx + 15, scy - 50, scx + 35, scy - 110);
        ctx.quadraticCurveTo(scx - 20, scy - 60, scx, scy);
        ctx.fill();

        // Flickering fire at base
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(scx, scy, 6 + Math.sin(world.elapsed * 8 + sc) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      }

      // 3. DESERT ROLLING DUNES
      const duneGrad = ctx.createLinearGradient(0, 400, 0, h);
      duneGrad.addColorStop(0, '#b45309');
      duneGrad.addColorStop(0.4, '#92400e');
      duneGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = duneGrad;
      ctx.beginPath();
      ctx.moveTo(0, 425);
      ctx.quadraticCurveTo(320, 390, 650, 430);
      ctx.quadraticCurveTo(940, 385, 1200, 420);
      ctx.lineTo(1200, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Dune crest highlights & wind ripple lines
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 2.5;
      for (let r = 0; r < 7; r++) {
        const ry = 445 + r * 34;
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.quadraticCurveTo(360, ry - 14, 750, ry + 10);
        ctx.quadraticCurveTo(1020, ry - 10, 1200, ry + 4);
        ctx.stroke();
      }

      // Ambient windblown sand dust
      ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
      for (const d of world.ambientDust) {
        d.x = (d.x + d.speed * dt) % w;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. DRAW ENEMY TANKS (Sorted by Y for correct depth)
      const sortedTanks = [...world.tanks].sort((a, b) => a.y - b.y);
      for (const tank of sortedTanks) {
        drawEnemyTank(tank);
      }

      // 5. DRAW ENEMY PLANES
      for (const plane of world.planes) {
        drawEnemyPlane(plane);
      }

      // 6. EGYPTIAN DEFENSIVE REDOUBT & POSITION (Left Foreground)
      // Fortified Sand Berm Rampart
      const bermGrad = ctx.createLinearGradient(0, 460, 260, h);
      bermGrad.addColorStop(0, '#78350f');
      bermGrad.addColorStop(0.5, '#451a03');
      bermGrad.addColorStop(1, '#292524');
      ctx.fillStyle = bermGrad;
      ctx.beginPath();
      ctx.moveTo(0, 460);
      ctx.lineTo(240, 490);
      ctx.lineTo(285, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Sandbag Emplacements
      ctx.fillStyle = '#a8a29e';
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 1.5;
      for (let row = 0; row < 3; row++) {
        for (let b = 0; b < 6; b++) {
          const bx = 45 + b * 32 + (row % 2) * 16;
          const by = 485 + row * 16;
          ctx.beginPath();
          ctx.roundRect(bx, by, 30, 14, 4);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Camouflage Netting over dugout
      ctx.strokeStyle = 'rgba(77, 124, 15, 0.6)';
      ctx.lineWidth = 2;
      for (let net = 0; net < 8; net++) {
        ctx.beginPath();
        ctx.moveTo(35 + net * 24, 480);
        ctx.lineTo(45 + net * 24, 535);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(35, 485 + net * 6);
        ctx.lineTo(210, 495 + net * 6);
        ctx.stroke();
      }

      // Sagger Missile Tripod Launcher beside the tank
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(55, 525, 4, 30);
      ctx.beginPath();
      ctx.moveTo(57, 525);
      ctx.lineTo(42, 555);
      ctx.lineTo(72, 555);
      ctx.stroke();
      // Missile on rail
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(48, 518, 22, 6);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(45, 519, 4, 4);

      // Draw Egyptian T-62
      drawPlayerT62(150, 560, world.recoilOffset, world.turretAngle);

      // 7. ACTIVE SMOKE SCREEN EFFECT OVER POSITION
      if (world.smokeTimeRemaining > 0) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
        for (let sm = 0; sm < 6; sm++) {
          const smX = 80 + sm * 38 + Math.sin(world.elapsed * 4 + sm) * 15;
          const smY = 520 + Math.cos(world.elapsed * 3 + sm) * 12;
          ctx.beginPath();
          ctx.arc(smX, smY, 55 + sm * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 8. PROJECTILES
      for (const p of world.projectiles) {
        if (p.kind === 'player-cannon') {
          // Tracer glow
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Tracer streak tail
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
        } else if (p.kind === 'player-sagger') {
          // Guidance Wire Line
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.65)';
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(150, 545);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Sagger Body
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          // Fiery Booster exhaust
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(p.x - 7, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.kind === 'player-artillery') {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.kind === 'player-sam') {
          // SAM interceptor rocket
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // White rocket exhaust plume
          ctx.strokeStyle = 'rgba(241, 245, 249, 0.8)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
        } else if (p.kind === 'enemy-shell') {
          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'enemy-bomb') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(p.x - 6, p.y - 12, 12, 22);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y + 10, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 9. SHOCKWAVES
      for (const sw of world.shockwaves) {
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = sw.alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // 10. EXPLOSION PARTICLES
      for (const pt of world.particles) {
        const prog = pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = 1.0 - prog;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (1 + prog * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 11. FLOATING COMBAT TEXTS
      for (const ft of world.floatingTexts) {
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 15px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
      }

      // 12. PERISCOPE RETICLE & TACTICAL SIGHT
      // Player Aim Line (dashed tracer line)
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(175, 540);
      ctx.lineTo(world.aimX, world.aimY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tactical Crosshair (TSh2B-41 Periscope Style)
      const ax = world.aimX;
      const ay = world.aimY;
      const reticleColor = selectedWeapon === 'sagger' ? '#ef4444' : selectedWeapon === 'artillery' ? '#f59e0b' : '#fde047';

      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 2.5;

      // Outer ring
      ctx.beginPath();
      ctx.arc(ax, ay, 26, 0, Math.PI * 2);
      ctx.stroke();

      // Rangefinder chevrons and stadia marks
      ctx.beginPath();
      ctx.moveTo(ax - 38, ay);
      ctx.lineTo(ax - 10, ay);
      ctx.moveTo(ax + 10, ay);
      ctx.lineTo(ax + 38, ay);
      ctx.moveTo(ax, ay - 38);
      ctx.lineTo(ax, ay - 10);
      ctx.moveTo(ax, ay + 10);
      ctx.lineTo(ax, ay + 38);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = reticleColor;
      ctx.beginPath();
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Weapon label beside crosshair
      ctx.fillStyle = reticleColor;
      ctx.font = 'bold 11px Cairo, sans-serif';
      ctx.textAlign = 'center';
      const wLabel = selectedWeapon === 'cannon' ? 'مدفع 115 ملم' : selectedWeapon === 'sagger' ? `مالوتكا [${saggerMissiles}]` : selectedWeapon === 'artillery' ? `مدفعية [${artilleryCharges}]` : 'ستارة دخان';
      ctx.fillText(wLabel, ax, ay + 42);

      // 13. PERISCOPE OPTICS OVERLAY (if active)
      if (opticsMode === 'periscope') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;

        // Grid lines
        for (let gy = 80; gy < h; gy += 100) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
          ctx.stroke();
        }
        for (let gx = 100; gx < w; gx += 150) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, h);
          ctx.stroke();
        }
      }

      ctx.restore();

      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);
    return () => {
      cancelled = true;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [opticsMode, saggerMissiles, artilleryCharges, selectedWeapon, spawnPlane, spawnTank, targetPlanes, targetTanks, addFloatingText, createExplosion, damagePlayer]);

  const progressTotal = targetTanks + targetPlanes;
  const progressDone = tanksDestroyed + planesDestroyed;

  return (
    <div dir="rtl" className="w-full h-full min-h-0 flex flex-col bg-stone-950 text-stone-100 select-none overflow-hidden">
      {/* 3-Zone Top Bar: Hidden completely on mobile landscape so game fills the whole screen */}
      <header className="tank-battle-top-bar desktop-only-bar px-3 sm:px-5 py-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0 hidden md:flex [@media(orientation:landscape)_and_(max-height:600px)]:!hidden">
        {/* Zone 1: Title and Exit */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onExit}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            aria-label="العودة للقائمة الرئيسية"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-cairo font-black text-amber-400 text-sm sm:text-base leading-tight truncate">
              المرحلة 4: معركة الدبابات وحائط الصواريخ
            </h1>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>رأس كوبري الفرقة الثانية</span>
              <span aria-hidden="true">·</span>
              <span>المزرعة الصينية</span>
            </div>
          </div>
          {onOpenTutorialVideo && (
            <button
              onClick={onOpenTutorialVideo}
              className="hidden md:flex px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              فيديو الشرح
            </button>
          )}
        </div>

        {/* Zone 2: Objectives Progress */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-stone-300">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span>الدبابات: {tanksDestroyed}/{targetTanks}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-sky-400" />
            <span>الطائرات: {planesDestroyed}/{targetPlanes}</span>
          </div>
        </div>

        {/* Zone 3: Actions & Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold font-cairo">
          <button
            onClick={() => setOpticsMode((prev) => (prev === 'standard' ? 'periscope' : 'standard'))}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              opticsMode === 'periscope'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
            title="منظار الرامي الميداني"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden lg:inline">{opticsMode === 'periscope' ? 'المنظار مفعل' : 'منظار الرامي'}</span>
          </button>

          <div className="px-2.5 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 flex items-center gap-1.5 tabular-nums">
            <Shield className="w-4 h-4" />
            <span>الدرع {health}%</span>
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 flex items-center gap-1.5 tabular-nums">
            <Trophy className="w-4 h-4" />
            <span>{score}</span>
          </div>

          <MissionDigitalTimer timeLeft={timeLeft} totalTime={missionDuration} />
        </div>
      </header>

      {/* Main Tactical Canvas Container: Fills 100% of viewport in mobile landscape */}
      <div className="relative flex-1 min-h-0 w-full h-full bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          className="combat-canvas w-full h-full block cursor-crosshair select-none"
          onPointerMove={(e) => {
            updateAimCoords(e.clientX, e.clientY);
          }}
          onPointerDown={(e) => {
            updateAimCoords(e.clientX, e.clientY);
            fireCurrentWeapon();
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              updateAimCoords(e.touches[0].clientX, e.touches[0].clientY);
              fireCurrentWeapon();
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              updateAimCoords(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          aria-label="الميدان التكتيكي لمعركة الدبابات في سيناء"
        />

        {/* Floating Minimal HUD in Mobile Landscape ("اللعبة وبس") */}
        <div className="mobile-landscape-hud hidden pointer-events-none absolute top-2 left-2 right-2 z-30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onExit}
              className="p-1.5 rounded-lg bg-stone-950/85 hover:bg-stone-800 text-stone-300 border border-stone-700/80 backdrop-blur-md cursor-pointer active:scale-95 transition-transform"
              aria-label="العودة"
              title="خروج"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {onOpenTutorialVideo && (
              <button
                onClick={onOpenTutorialVideo}
                className="px-2 py-1 rounded-lg bg-red-600/85 hover:bg-red-600 text-white border border-red-400 text-[10px] font-bold font-cairo shadow-md flex items-center gap-1 active:scale-95"
              >
                <span>فيديو الشرح</span>
              </button>
            )}
            <button
              onClick={() => setOpticsMode((prev) => (prev === 'standard' ? 'periscope' : 'standard'))}
              className={`p-1.5 rounded-lg border backdrop-blur-md cursor-pointer active:scale-95 ${
                opticsMode === 'periscope'
                  ? 'bg-emerald-950/85 border-emerald-500 text-emerald-300'
                  : 'bg-stone-950/85 border-stone-700/80 text-stone-300'
              }`}
              title="منظار الرامي"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-cairo text-[11px] font-bold">
            <div className="px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 backdrop-blur-md flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>{health}%</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-stone-950/80 border border-stone-700/80 text-amber-300 backdrop-blur-md flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{tanksDestroyed}/{targetTanks}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-stone-950/80 border border-stone-700/80 text-sky-300 backdrop-blur-md flex items-center gap-1">
              <Plane className="w-3 h-3" />
              <span>{planesDestroyed}/{targetPlanes}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-stone-950/80 border border-stone-700/80 text-stone-200 backdrop-blur-md">
              <span>{timeLeft}ث</span>
            </div>
          </div>
        </div>

        {/* Tactical Radio Dispatch Ribbon */}
        <div className="absolute top-2.5 sm:top-2.5 [@media(orientation:landscape)_and_(max-height:600px)]:top-10 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none transition-all">
          <div className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-stone-950/85 border border-stone-700/80 backdrop-blur-md text-[11px] sm:text-sm font-cairo text-amber-200 flex items-center gap-2 max-w-[80%] shadow-lg">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="truncate">{radioDispatch}</span>
          </div>
          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-stone-950/85 border border-stone-700/80 backdrop-blur-md text-[11px] sm:text-xs font-bold text-stone-200 tabular-nums">
            {progressDone}/{progressTotal}
          </div>
        </div>

        {/* Bottom Weapon Selection Dock & Quick Action Controls */}
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-end justify-between gap-2 sm:gap-3 pointer-events-none">
          {/* Weapon Dock Selector */}
          <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-stone-950/90 border border-stone-700/90 backdrop-blur-md pointer-events-auto shadow-2xl overflow-x-auto max-w-[62%] sm:max-w-none">
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedWeapon('cannon');
                sound.playRadioClick();
              }}
              onClick={() => {
                setSelectedWeapon('cannon');
                sound.playRadioClick();
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-bold font-cairo flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedWeapon === 'cannon'
                  ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(217,119,6,0.5)]'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>مدفع [1]</span>
            </button>

            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedWeapon('sagger');
                sound.playRadioClick();
              }}
              onClick={() => {
                setSelectedWeapon('sagger');
                sound.playRadioClick();
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-bold font-cairo flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedWeapon === 'sagger'
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>مالوتكا ({saggerMissiles}) [2]</span>
            </button>

            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedWeapon('artillery');
                sound.playRadioClick();
              }}
              onClick={() => {
                setSelectedWeapon('artillery');
                sound.playRadioClick();
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-bold font-cairo flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedWeapon === 'artillery'
                  ? 'bg-orange-600 text-white shadow-[0_0_12px_rgba(234,88,12,0.5)]'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              <Bomb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>مدفعية ({artilleryCharges}) [3]</span>
              {artilleryCooldown > 0 && <span className="text-[9px] text-amber-300">({artilleryCooldown}ث)</span>}
            </button>

            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedWeapon('smoke');
                sound.playRadioClick();
              }}
              onClick={() => {
                setSelectedWeapon('smoke');
                sound.playRadioClick();
              }}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-bold font-cairo flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedWeapon === 'smoke'
                  ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(2,132,199,0.5)]'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>دخان ({smokeCharges}) [4]</span>
              {smokeActiveTimer > 0 && <span className="text-[9px] text-emerald-300">({smokeActiveTimer}ث)</span>}
            </button>
          </div>

          {/* Right Action Buttons: SAM Intercept & Main Fire */}
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fireSamMissile();
              }}
              onClick={fireSamMissile}
              className="h-11 sm:h-16 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-sky-900/90 hover:bg-sky-800 border-2 border-sky-400/60 text-sky-100 font-bold font-cairo text-[11px] sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform cursor-pointer select-none"
              title="اعتراض الطائرات بحائط الصواريخ سام-6 (المسافة)"
            >
              <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300" />
              <span>سام-6</span>
            </button>

            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isWon && !isDefeated) {
                  fireCurrentWeapon();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (!isWon && !isDefeated) {
                  fireCurrentWeapon();
                }
              }}
              disabled={isWon || isDefeated}
              className="w-20 sm:w-32 h-11 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border-2 border-amber-300 text-white font-black font-cairo text-sm sm:text-lg shadow-[0_0_24px_rgba(239,68,68,0.45)] active:scale-95 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none"
            >
              <Crosshair className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>إطلاق</span>
            </button>
          </div>
        </div>

        {/* Defeat Overlay Modal */}
        {isDefeated && (
          <div className="absolute inset-0 z-40 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-5 text-center">
            <div className="max-w-md w-full rounded-2xl border border-red-700/80 bg-stone-900/95 p-6 shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h2 className="text-xl sm:text-2xl font-black font-cairo text-red-400 mb-2">فشل الدفاع عن رأس الكوبري</h2>
              <p className="text-sm text-stone-300 leading-relaxed mb-5 font-cairo">
                {defeatReason === 'health'
                  ? 'اخترقت نيران الدبابات والغارات الجوية الساتر الترابي. استخدم ستارة الدخان لحجب الرؤية وصواريخ مالوتكا لسحق الدبابات الثقيلة قبل اقترابها.'
                  : 'نفد الوقت قبل صد الهجوم المعادي بالكامل.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={resetWorld}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black font-cairo flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> إعادة المحاولة
                </button>
                <button
                  onClick={onExit}
                  className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold font-cairo cursor-pointer transition-colors"
                >
                  خروج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Strip: Hidden in mobile landscape */}
      <footer className="tank-battle-footer shrink-0 bg-stone-900 border-t border-stone-800 px-3 sm:px-4 py-2 hidden md:flex [@media(orientation:landscape)_and_(max-height:600px)]:!hidden items-center justify-between gap-3 text-xs font-cairo text-stone-400">
        <div className="flex items-center gap-2 text-stone-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>تكتيك 1973: صائدو الدبابات (مالوتكا) + حائط الصواريخ (سام-6) لحماية رؤوس الكباري</span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span>اختصارات: [1] مدفع · [2] مالوتكا · [3] مدفعية · [4] دخان · [مسافة] سام-6</span>
        </div>
      </footer>

      {/* Victory Celebration Modal */}
      <VictoryModal
        isOpen={isWon}
        missionId="MISSION_TANK_BATTLE"
        missionTitle="المرحلة 4: معركة الدبابات وحائط الصواريخ"
        congratulatoryMessage="الله أكبر! تم سحق اللواء 190 المدرع ودحر الهجوم المضاد في سيناء بنجاح مؤزر."
        score={score}
        timeLeft={timeLeft}
        targetsDestroyed={tanksDestroyed + planesDestroyed}
        totalTargets={progressTotal}
        customStats={[
          { label: 'الدبابات المدمرة', value: String(tanksDestroyed), highlight: true },
          { label: 'ضربات صواريخ مالوتكا', value: String(saggerHits), highlight: true },
          { label: 'الطائرات المسقطة', value: String(planesDestroyed), highlight: true },
          { label: 'سلامة الموقع', value: `${health}%`, highlight: true },
        ]}
        onNextMission={() => onComplete(score)}
        onReturnToBase={onExit}
        onReplay={resetWorld}
      />
    </div>
  );
};
