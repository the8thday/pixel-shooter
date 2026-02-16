const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const stats = document.getElementById("stats");
const hudTop = document.querySelector(".hud-top");

let VIEW_W = canvas.width;
let VIEW_H = canvas.height;
const WORLD_W = 2600;
const WORLD_H = 2600;

const keys = new Set();
const pointer = { x: VIEW_W / 2, y: VIEW_H / 2 };
let mouseDown = false;
let gameOver = false;
let win = false;
let gameInteracted = false;
let hudHideTimeout = null;

const player = {
  x: WORLD_W / 2,
  y: WORLD_H / 2,
  vx: 0,
  vy: 0,
  angle: 0,
  hp: 100,
  maxHp: 100,
  speed: 210,
  radius: 12,
  shootCooldown: 0,
  dodgeCooldown: 0,
  dodgeTimer: 0,
  score: 0,
  // Animation state
  animTime: 0,
  walkCycle: 0,
  isMoving: false,
  recoilTimer: 0,
  breathOffset: 0,
  dodgeTrail: []
};

/* ===================== WEAPON SYSTEM ===================== */
const WEAPONS = [
  {
    name: "手枪",
    fireRate: 0.12,
    damage: 17,
    bulletSpeed: 650,
    bulletSize: 4,
    bulletCount: 1,
    spreadAngle: 0,
    bulletLife: 0.9,
    bulletColor: "#ffe58a",
    recoil: 2,
    gunColor: "#f7cf5a",
    gunSize: 6
  },
  {
    name: "霰弹枪",
    fireRate: 0.55,
    damage: 9,
    bulletSpeed: 500,
    bulletSize: 3,
    bulletCount: 6,
    spreadAngle: 0.35,
    bulletLife: 0.45,
    bulletColor: "#ffaa55",
    recoil: 4,
    gunColor: "#aa7733",
    gunSize: 8
  },
  {
    name: "冲锋枪",
    fireRate: 0.06,
    damage: 8,
    bulletSpeed: 580,
    bulletSize: 3,
    bulletCount: 1,
    spreadAngle: 0.12,
    bulletLife: 0.7,
    bulletColor: "#aaffaa",
    recoil: 1,
    gunColor: "#77cc77",
    gunSize: 7
  },
  {
    name: "狙击枪",
    fireRate: 0.9,
    damage: 55,
    bulletSpeed: 1200,
    bulletSize: 2,
    bulletCount: 1,
    spreadAngle: 0,
    bulletLife: 1.4,
    bulletColor: "#55ccff",
    recoil: 5,
    gunColor: "#3399cc",
    gunSize: 9
  },
  {
    name: "火箭筒",
    fireRate: 1.2,
    damage: 40,
    bulletSpeed: 350,
    bulletSize: 6,
    bulletCount: 1,
    spreadAngle: 0,
    bulletLife: 2.0,
    bulletColor: "#ff5555",
    recoil: 6,
    gunColor: "#cc3333",
    gunSize: 10,
    explosive: true,
    explosionRadius: 60
  }
];

let currentWeaponIndex = 0;

function getCurrentWeapon() {
  return WEAPONS[currentWeaponIndex];
}

/* ===================== SUPER BOSS CONFIG ===================== */
const SUPER_BOSSES = {
  5: {
    name: "守卫者",
    hp: 600,
    radius: 35,
    speed: 50,
    scoreValue: 250,
    bodyColor: "#cc44ff",
    eyeColor: "#ffff00",
    phase2HpThreshold: 0.5,
    attacks: {
      phase1: {
        type: "spiral",
        fireRate: 0.3,
        bulletCount: 8,
        bulletSpeed: 250,
        bulletDamage: 13
      },
      phase2: {
        type: "burst",
        fireRate: 0.6,
        bulletCount: 16,
        bulletSpeed: 300,
        bulletDamage: 15
      }
    }
  },
  10: {
    name: "毁灭者",
    hp: 1000,
    radius: 42,
    speed: 45,
    scoreValue: 500,
    bodyColor: "#ff2222",
    eyeColor: "#00ffff",
    phase2HpThreshold: 0.5,
    attacks: {
      phase1: {
        type: "tracking",
        fireRate: 0.7,
        bulletCount: 4,
        bulletSpeed: 200,
        bulletDamage: 16,
        trackingStrength: 1.5
      },
      phase2: {
        type: "laser",
        fireRate: 0.05,
        bulletCount: 1,
        bulletSpeed: 400,
        bulletDamage: 10,
        sweepSpeed: 1.5
      }
    }
  }
};

/* ===================== MAP CONFIGS ===================== */
const MAP_CONFIGS = {
  1: { name: "火山", bgColor: "#2a1010", floorColor1: "#3d1a1a", floorColor2: "#4a2020",
    wallColor: "#6b3030", wallHighlight: "#8b4040", wallCount: 40,
    wallMinW: 60, wallMaxW: 160, wallMinH: 60, wallMaxH: 160,
    decoType: "lava", minimapBg: "rgba(42,16,16,0.95)", minimapWall: "#8b4040" },
  2: { name: "草原", bgColor: "#1a2a10", floorColor1: "#2a4418", floorColor2: "#305020",
    wallColor: "#5a7a3a", wallHighlight: "#7a9a5a", wallCount: 30,
    wallMinW: 50, wallMaxW: 140, wallMinH: 50, wallMaxH: 140,
    decoType: "grass", minimapBg: "rgba(26,42,16,0.95)", minimapWall: "#5a7a3a" },
  3: { name: "秘境森林", bgColor: "#0a1a20", floorColor1: "#152a20", floorColor2: "#1a3328",
    wallColor: "#2a5040", wallHighlight: "#3a6a55", wallCount: 55,
    wallMinW: 40, wallMaxW: 120, wallMinH: 40, wallMaxH: 120,
    decoType: "mushroom", minimapBg: "rgba(10,26,32,0.95)", minimapWall: "#3a6a55" },
  4: { name: "海洋", bgColor: "#0a1530", floorColor1: "#102040", floorColor2: "#152848",
    wallColor: "#2a4a6a", wallHighlight: "#3a6a8a", wallCount: 35,
    wallMinW: 80, wallMaxW: 200, wallMinH: 40, wallMaxH: 100,
    decoType: "bubble", minimapBg: "rgba(10,21,48,0.95)", minimapWall: "#3a6a8a" },
  5: { name: "沙漠", bgColor: "#2a2210", floorColor1: "#4a3a20", floorColor2: "#554428",
    wallColor: "#8a7a50", wallHighlight: "#aa9a70", wallCount: 25,
    wallMinW: 100, wallMaxW: 250, wallMinH: 60, wallMaxH: 140,
    decoType: "cactus", minimapBg: "rgba(42,34,16,0.95)", minimapWall: "#8a7a50" },
  6: { name: "废弃城市", bgColor: "#1a1a20", floorColor1: "#2a2a30", floorColor2: "#333340",
    wallColor: "#5a5a6a", wallHighlight: "#7a7a8a", wallCount: 50,
    wallMinW: 50, wallMaxW: 150, wallMinH: 50, wallMaxH: 200,
    decoType: "debris", minimapBg: "rgba(26,26,32,0.95)", minimapWall: "#5a5a6a" },
  7: { name: "太空", bgColor: "#050510", floorColor1: "#0a0a18", floorColor2: "#0e0e22",
    wallColor: "#3a3a6a", wallHighlight: "#5a5a9a", wallCount: 28,
    wallMinW: 60, wallMaxW: 160, wallMinH: 60, wallMaxH: 160,
    decoType: "star", minimapBg: "rgba(5,5,16,0.95)", minimapWall: "#3a3a6a" },
  8: { name: "战场", bgColor: "#1a1810", floorColor1: "#2a2818", floorColor2: "#333020",
    wallColor: "#5a5540", wallHighlight: "#7a7560", wallCount: 48,
    wallMinW: 50, wallMaxW: 180, wallMinH: 30, wallMaxH: 120,
    decoType: "trench", minimapBg: "rgba(26,24,16,0.95)", minimapWall: "#5a5540" },
  9: { name: "白骨森林", bgColor: "#181018", floorColor1: "#221822", floorColor2: "#2a1e2a",
    wallColor: "#6a5a6a", wallHighlight: "#8a7a8a", wallCount: 50,
    wallMinW: 30, wallMaxW: 100, wallMinH: 80, wallMaxH: 220,
    decoType: "bone", minimapBg: "rgba(24,16,24,0.95)", minimapWall: "#6a5a6a" },
  10: { name: "工厂", bgColor: "#151518", floorColor1: "#222228", floorColor2: "#2a2a32",
    wallColor: "#606068", wallHighlight: "#808090", wallCount: 42,
    wallMinW: 80, wallMaxW: 200, wallMinH: 80, wallMaxH: 200,
    decoType: "gear", minimapBg: "rgba(21,21,24,0.95)", minimapWall: "#606068" }
};

const ENEMY_CONFIGS = {
  1: { name: "火焰怪", bodyColor: "#ff4422", eyeColor: "#ffdd00",
    hp: 30, speed: [80, 110], deathColor1: "#ff4422", deathColor2: "#ffaa44",
    bossName: "火山领主", bossColor: "#ff6600", bossEyeColor: "#ffff00", bossHp: 220 },
  2: { name: "野猪怪", bodyColor: "#8b6040", eyeColor: "#ff3333",
    hp: 38, speed: [85, 115], deathColor1: "#8b6040", deathColor2: "#ccaa80",
    bossName: "巨角野猪", bossColor: "#6a4020", bossEyeColor: "#ff4444", bossHp: 250 },
  3: { name: "蘑菇精", bodyColor: "#44aa66", eyeColor: "#ffff88",
    hp: 36, speed: [70, 95], deathColor1: "#44aa66", deathColor2: "#88ffaa",
    bossName: "树人长老", bossColor: "#338855", bossEyeColor: "#aaffcc", bossHp: 240 },
  4: { name: "水母", bodyColor: "#4488cc", eyeColor: "#aaddff",
    hp: 32, speed: [65, 90], deathColor1: "#4488cc", deathColor2: "#88ccff",
    bossName: "深海巨蟹", bossColor: "#2266aa", bossEyeColor: "#66ddff", bossHp: 260 },
  5: { name: "蝎子", bodyColor: "#cc9944", eyeColor: "#ff2200",
    hp: 40, speed: [90, 120], deathColor1: "#cc9944", deathColor2: "#ffcc88",
    bossName: null, bossColor: null, bossEyeColor: null, bossHp: null },
  6: { name: "机器人", bodyColor: "#7788aa", eyeColor: "#ff4444",
    hp: 44, speed: [75, 100], deathColor1: "#7788aa", deathColor2: "#aabbcc",
    bossName: "重装机甲", bossColor: "#556688", bossEyeColor: "#ff6666", bossHp: 280 },
  7: { name: "外星虫", bodyColor: "#8844cc", eyeColor: "#00ff88",
    hp: 42, speed: [80, 110], deathColor1: "#8844cc", deathColor2: "#cc88ff",
    bossName: "星际掠夺者", bossColor: "#6622aa", bossEyeColor: "#44ffaa", bossHp: 290 },
  8: { name: "丧尸兵", bodyColor: "#667744", eyeColor: "#ff0000",
    hp: 48, speed: [85, 115], deathColor1: "#667744", deathColor2: "#99aa66",
    bossName: "暴走坦克", bossColor: "#445530", bossEyeColor: "#ff3333", bossHp: 300 },
  9: { name: "骷髅", bodyColor: "#ccbbaa", eyeColor: "#ff2266",
    hp: 46, speed: [80, 105], deathColor1: "#ccbbaa", deathColor2: "#fff0dd",
    bossName: "骸骨巨龙", bossColor: "#aa9988", bossEyeColor: "#ff44aa", bossHp: 310 },
  10: { name: "激光机器", bodyColor: "#88aa44", eyeColor: "#ff8800",
    hp: 50, speed: [90, 120], deathColor1: "#88aa44", deathColor2: "#bbdd66",
    bossName: null, bossColor: null, bossEyeColor: null, bossHp: null }
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const medkits = [];
const particles = [];
const deathEffects = [];
const walls = [];

const TOTAL_LEVELS = 10;
const REGULARS_PER_LEVEL = 10;
const MEDKITS_PER_LEVEL = 2;
const MEDKIT_HEAL = 15;

let currentLevel = 0;
let regularsLeftToSpawn = 0;
let bossPending = false;
let bossAlive = false;
let spawnTimer = 0;

// Super boss state
let superBossPending = false;
let superBossAlive = false;

// Screen effects
let screenShakeTimer = 0;
let screenShakeIntensity = 0;
let screenFlashColor = "#ffffff";
let screenFlashTimer = 0;

// Level announcement
let levelAnnouncementTimer = 0;

// Level transition state machine
let levelTransitionState = null; // null | "celebrating" | "fadeOut" | "loading" | "fadeIn"
let levelTransitionTimer = 0;
let levelTransitionAlpha = 0;

const MINIMAP_VIEW_SCALE = 1.45;

let audioCtx = null;
let bgmStarted = false;
let musicNextTime = 0;
let musicStep = 0;
const musicTempo = 112;
const melody = [69, 72, 76, 72, 67, 69, 72, 69, 64, 67, 71, 67, 62, 66, 69, 66];
const bass = [45, 45, 43, 43, 41, 41, 38, 38];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resizeCanvas() {
  canvas.width = Math.max(640, Math.floor(window.innerWidth));
  canvas.height = Math.max(360, Math.floor(window.innerHeight));
  VIEW_W = canvas.width;
  VIEW_H = canvas.height;
  pointer.x = VIEW_W * 0.5;
  pointer.y = VIEW_H * 0.5;
}

function generateWalls(level) {
  walls.length = 0;
  const cfg = MAP_CONFIGS[level] || MAP_CONFIGS[1];
  const centerX = WORLD_W / 2;
  const centerY = WORLD_H / 2;
  for (let i = 0; i < cfg.wallCount; i++) {
    const w = rand(cfg.wallMinW, cfg.wallMaxW);
    const h = rand(cfg.wallMinH, cfg.wallMaxH);
    const wx = rand(80, WORLD_W - 260);
    const wy = rand(80, WORLD_H - 260);
    // Ensure spawn area is clear
    if (Math.abs(wx + w / 2 - centerX) < 120 && Math.abs(wy + h / 2 - centerY) < 120) continue;
    walls.push({ x: wx, y: wy, w, h });
  }
}

function tileHash(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) ^ 0x5bf03635;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  return ((h >> 16) ^ h) & 0xff;
}

function drawFloorDecorations(camX, camY, mapCfg) {
  const startTX = Math.floor(camX / 32);
  const startTY = Math.floor(camY / 32);
  const endTX = startTX + Math.ceil(VIEW_W / 32) + 1;
  const endTY = startTY + Math.ceil(VIEW_H / 32) + 1;
  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      if (tileHash(tx, ty) > 38) continue; // ~15% of tiles
      const sx = tx * 32 - Math.floor(camX);
      const sy = ty * 32 - Math.floor(camY);
      drawTileDecoration(sx, sy, mapCfg.decoType, tx, ty);
    }
  }
}

function drawTileDecoration(sx, sy, type, tx, ty) {
  const h = tileHash(tx * 7, ty * 13);
  switch (type) {
    case "lava":
      ctx.fillStyle = "#ff4400";
      ctx.globalAlpha = 0.4;
      ctx.fillRect(sx + (h % 12), sy + 10, 18, 2);
      ctx.fillRect(sx + (h % 8) + 4, sy + 14, 10, 2);
      ctx.globalAlpha = 1.0;
      break;
    case "grass":
      ctx.fillStyle = "#4a8830";
      ctx.fillRect(sx + 6, sy + 8, 2, 10);
      ctx.fillRect(sx + 12, sy + 12, 2, 8);
      ctx.fillRect(sx + 20, sy + 10, 2, 9);
      ctx.fillStyle = "#5aa840";
      ctx.fillRect(sx + 16, sy + 14, 2, 7);
      break;
    case "mushroom":
      ctx.fillStyle = "#88ddaa";
      ctx.globalAlpha = 0.6;
      ctx.fillRect(sx + 12, sy + 18, 3, 6);
      ctx.fillStyle = h % 2 ? "#ff66aa" : "#66ffcc";
      ctx.fillRect(sx + 10, sy + 14, 7, 5);
      ctx.globalAlpha = 1.0;
      break;
    case "bubble":
      ctx.strokeStyle = "#6699cc";
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 16, 4 + (h % 4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      break;
    case "cactus":
      ctx.fillStyle = "#44882a";
      ctx.fillRect(sx + 14, sy + 6, 4, 20);
      ctx.fillRect(sx + 10, sy + 12, 4, 3);
      ctx.fillRect(sx + 18, sy + 10, 4, 3);
      break;
    case "debris":
      ctx.fillStyle = "#555560";
      ctx.fillRect(sx + (h % 10) + 4, sy + 12, 6, 4);
      ctx.fillStyle = "#44444a";
      ctx.fillRect(sx + (h % 8) + 10, sy + 18, 4, 3);
      break;
    case "star":
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.3 + Math.sin(player.animTime * 3 + h) * 0.2;
      ctx.fillRect(sx + (h % 24) + 4, sy + (h % 20) + 4, 2, 2);
      ctx.globalAlpha = 1.0;
      break;
    case "trench":
      ctx.fillStyle = "#1a1808";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(sx + 2, sy + 14, 28, 3);
      ctx.fillRect(sx + 8, sy + 12, 16, 2);
      ctx.globalAlpha = 1.0;
      break;
    case "bone":
      ctx.fillStyle = "#ddccbb";
      ctx.fillRect(sx + 12, sy + 10, 8, 2);
      ctx.fillRect(sx + 15, sy + 7, 2, 8);
      break;
    case "gear":
      ctx.fillStyle = "#888890";
      ctx.fillRect(sx + 10, sy + 10, 8, 8);
      ctx.fillStyle = "#666670";
      ctx.fillRect(sx + 13, sy + 13, 3, 3);
      ctx.fillRect(sx + 8, sy + 12, 2, 4);
      ctx.fillRect(sx + 20, sy + 12, 2, 4);
      break;
  }
}

function drawLevelAnnouncement(dt) {
  if (levelAnnouncementTimer <= 0) return;
  if (levelTransitionState) return; // don't tick during transition
  levelAnnouncementTimer -= dt;
  const mapCfg = MAP_CONFIGS[currentLevel] || MAP_CONFIGS[1];
  const alpha = levelAnnouncementTimer > 1.5
    ? (2.0 - levelAnnouncementTimer) * 2
    : Math.min(1, levelAnnouncementTimer / 0.5);
  ctx.globalAlpha = clamp(alpha, 0, 0.9);
  ctx.fillStyle = "#000000";
  ctx.fillRect(VIEW_W / 2 - 160, VIEW_H / 2 - 40, 320, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`第${currentLevel}关 - ${mapCfg.name}`, VIEW_W / 2, VIEW_H / 2 + 10);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1.0;
}

function setupWorld() {
  startLevel();
}

function startLevel() {
  if (currentLevel >= TOTAL_LEVELS) {
    if (!enemies.length) {
      win = true;
      gameOver = true;
      showHud();
      overlay.classList.remove("hidden");
      overlay.innerHTML = "任务完成<br/>点击刷新重开";
    }
    return;
  }
  currentLevel += 1;

  // Generate new map walls
  generateWalls(currentLevel);

  // Reset player to center
  player.x = WORLD_W / 2;
  player.y = WORLD_H / 2;

  // Clear projectiles and effects from previous level
  bullets.length = 0;
  enemyBullets.length = 0;
  particles.length = 0;

  // Level announcement
  levelAnnouncementTimer = 2.0;

  regularsLeftToSpawn = REGULARS_PER_LEVEL;

  // Super boss on levels 5, 10
  if (currentLevel % 5 === 0) {
    bossPending = false;
    superBossPending = true;
  } else if (currentLevel % 3 === 0) {
    bossPending = true;
    superBossPending = false;
  } else {
    bossPending = false;
    superBossPending = false;
  }

  bossAlive = false;
  superBossAlive = false;
  spawnTimer = 0.2;
  spawnMedkitsForLevel();
}

/* ===================== LEVEL TRANSITION ===================== */
function beginLevelTransition() {
  if (currentLevel >= TOTAL_LEVELS) {
    startLevel(); // triggers win condition
    return;
  }
  levelTransitionState = "celebrating";
  levelTransitionTimer = 1.0;
  levelTransitionAlpha = 0;
}

function updateLevelTransition(dt) {
  levelTransitionTimer -= dt;
  switch (levelTransitionState) {
    case "celebrating":
      if (levelTransitionTimer <= 0) {
        levelTransitionState = "fadeOut";
        levelTransitionTimer = 0.5;
        levelTransitionAlpha = 0;
      }
      break;
    case "fadeOut":
      levelTransitionAlpha = clamp(1 - levelTransitionTimer / 0.5, 0, 1);
      if (levelTransitionTimer <= 0) {
        levelTransitionState = "loading";
        levelTransitionTimer = 0.3;
        levelTransitionAlpha = 1;
        startLevel(); // switch map while screen is black
      }
      break;
    case "loading":
      levelTransitionAlpha = 1;
      if (levelTransitionTimer <= 0) {
        levelTransitionState = "fadeIn";
        levelTransitionTimer = 0.5;
      }
      break;
    case "fadeIn":
      levelTransitionAlpha = clamp(levelTransitionTimer / 0.5, 0, 1);
      if (levelTransitionTimer <= 0) {
        levelTransitionState = null;
        levelTransitionAlpha = 0;
      }
      break;
  }
}

function drawLevelTransitionOverlay() {
  // Black fade overlay
  if (levelTransitionAlpha > 0) {
    ctx.globalAlpha = levelTransitionAlpha;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1.0;
  }
  // "关卡完成!" celebration text
  if (levelTransitionState === "celebrating") {
    const progress = 1 - (levelTransitionTimer / 1.0);
    const textAlpha = progress < 0.2 ? (progress / 0.2) : 1.0;
    ctx.globalAlpha = clamp(textAlpha, 0, 1);
    ctx.fillStyle = "#50d4a8";
    ctx.font = "bold 36px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("关卡完成!", VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = "#f7cf5a";
    ctx.font = "20px 'Courier New', monospace";
    ctx.fillText(`分数: ${player.score}`, VIEW_W / 2, VIEW_H / 2 + 25);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1.0;
  }
}

function spawnEnemy(isBoss = false) {
  const side = Math.floor(rand(0, 4));
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = rand(40, WORLD_W - 40);
    y = rand(20, 60);
  } else if (side === 1) {
    x = rand(WORLD_W - 60, WORLD_W - 20);
    y = rand(40, WORLD_H - 40);
  } else if (side === 2) {
    x = rand(40, WORLD_W - 40);
    y = rand(WORLD_H - 60, WORLD_H - 20);
  } else {
    x = rand(20, 60);
    y = rand(40, WORLD_H - 40);
  }
  const ecfg = ENEMY_CONFIGS[currentLevel] || ENEMY_CONFIGS[1];
  if (isBoss) {
    const bHp = ecfg.bossHp || 240;
    enemies.push({
      x, y,
      hp: bHp,
      maxHp: bHp,
      speed: rand(60, 78),
      radius: 22,
      fireCd: rand(0.45, 0.8),
      stateTimer: rand(0.8, 1.8),
      patrolAngle: rand(0, Math.PI * 2),
      isBoss: true,
      isSuperBoss: false,
      scoreValue: 80,
      bodyColor: ecfg.bossColor || ecfg.bodyColor,
      eyeColor: ecfg.bossEyeColor || ecfg.eyeColor,
      deathColor1: ecfg.bossColor || ecfg.deathColor1,
      deathColor2: ecfg.deathColor2,
      // Animation fields
      animTime: 0,
      attackFlashTimer: 0,
      wobblePhase: rand(0, Math.PI * 2),
      chaseStretch: 0
    });
    return;
  }

  const eHp = ecfg.hp || 34;
  enemies.push({
    x, y,
    hp: eHp,
    maxHp: eHp,
    speed: rand(ecfg.speed[0], ecfg.speed[1]),
    radius: 13,
    fireCd: rand(0.8, 1.5),
    stateTimer: rand(0.5, 2.2),
    patrolAngle: rand(0, Math.PI * 2),
    isBoss: false,
    isSuperBoss: false,
    scoreValue: 10,
    bodyColor: ecfg.bodyColor,
    eyeColor: ecfg.eyeColor,
    deathColor1: ecfg.deathColor1,
    deathColor2: ecfg.deathColor2,
    // Animation fields
    animTime: 0,
    attackFlashTimer: 0,
    wobblePhase: rand(0, Math.PI * 2),
    chaseStretch: 0
  });
}

function spawnSuperBoss(level) {
  const config = SUPER_BOSSES[level];
  if (!config) return;

  const x = WORLD_W / 2;
  const y = WORLD_H / 2;

  enemies.push({
    x, y,
    hp: config.hp,
    maxHp: config.hp,
    speed: config.speed,
    radius: config.radius,
    fireCd: 1.0,
    stateTimer: rand(0.8, 1.8),
    patrolAngle: 0,
    isBoss: false,
    isSuperBoss: true,
    superBossLevel: level,
    phase: 1,
    phaseTransitionTimer: 0,
    scoreValue: config.scoreValue,
    attackAngle: 0,
    entranceTimer: 1.5,
    // Animation fields
    animTime: 0,
    attackFlashTimer: 0,
    wobblePhase: 0,
    chaseStretch: 0
  });

  screenShakeTimer = 0.8;
  screenShakeIntensity = 8;
  triggerScreenFlash("#ffffff", 0.3);
}

function spawnMedkitsForLevel() {
  medkits.length = 0;
  for (let i = 0; i < MEDKITS_PER_LEVEL; i++) {
    let placed = false;
    for (let tries = 0; tries < 120; tries++) {
      const x = rand(80, WORLD_W - 80);
      const y = rand(80, WORLD_H - 80);
      if (hitWall(x, y)) continue;
      if ((x - player.x) ** 2 + (y - player.y) ** 2 < 170 ** 2) continue;
      let overlap = false;
      for (const m of medkits) {
        if ((x - m.x) ** 2 + (y - m.y) ** 2 < 70 ** 2) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;
      medkits.push({ x, y, radius: 10, heal: MEDKIT_HEAL });
      placed = true;
      break;
    }
    if (!placed) {
      medkits.push({ x: player.x + rand(-120, 120), y: player.y + rand(-120, 120), radius: 10, heal: MEDKIT_HEAL });
    }
  }
}

function ensureBgmStarted() {
  if (bgmStarted) {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  audioCtx = new AudioCtx();
  musicNextTime = audioCtx.currentTime + 0.05;
  musicStep = 0;
  bgmStarted = true;
}

function midiToFreq(n) {
  return 440 * 2 ** ((n - 69) / 12);
}

function scheduleTone(time, freq, duration, type, volume) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function updateBgm() {
  if (!bgmStarted || !audioCtx || audioCtx.state !== "running") return;
  const stepDur = 60 / musicTempo / 2;
  while (musicNextTime < audioCtx.currentTime + 0.2) {
    const m = melody[musicStep % melody.length];
    scheduleTone(musicNextTime, midiToFreq(m), stepDur * 0.9, "square", 0.04);
    if (musicStep % 2 === 0) {
      const b = bass[Math.floor(musicStep / 2) % bass.length];
      scheduleTone(musicNextTime, midiToFreq(b), stepDur * 1.8, "triangle", 0.05);
    }
    musicStep += 1;
    musicNextTime += stepDur;
  }
}

/* ===================== SCREEN EFFECTS ===================== */
function triggerScreenFlash(color, duration) {
  screenFlashColor = color;
  screenFlashTimer = duration;
}

function playSuperBossVictorySound() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const now = audioCtx.currentTime;
  const notes = [60, 64, 67, 72, 76];
  notes.forEach((n, i) => {
    scheduleTone(now + i * 0.12, midiToFreq(n), 0.5, "square", 0.06);
  });
  scheduleTone(now, midiToFreq(36), 1.0, "triangle", 0.08);
}

/* ===================== UPDATE LOGIC ===================== */
function updatePlayer(dt) {
  let ix = 0;
  let iy = 0;
  if (keys.has("KeyW")) iy -= 1;
  if (keys.has("KeyS")) iy += 1;
  if (keys.has("KeyA")) ix -= 1;
  if (keys.has("KeyD")) ix += 1;

  const len = Math.hypot(ix, iy) || 1;
  ix /= len;
  iy /= len;

  player.dodgeCooldown -= dt;
  player.dodgeTimer -= dt;
  player.shootCooldown -= dt;

  let moveSpeed = player.speed;
  if (player.dodgeTimer > 0) {
    moveSpeed = 420;
  }

  player.vx = ix * moveSpeed;
  player.vy = iy * moveSpeed;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  resolveWallCollision(player);

  player.x = clamp(player.x, 16, WORLD_W - 16);
  player.y = clamp(player.y, 16, WORLD_H - 16);

  // Animation updates
  player.animTime += dt;
  player.isMoving = (Math.abs(player.vx) > 5 || Math.abs(player.vy) > 5);

  if (player.isMoving) {
    player.walkCycle = (player.walkCycle + dt * 8) % 1;
  } else {
    player.walkCycle = 0;
  }

  player.breathOffset = Math.sin(player.animTime * 2.5) * 1.5;

  if (player.recoilTimer > 0) player.recoilTimer -= dt;

  // Dodge trail
  if (player.dodgeTimer > 0) {
    player.dodgeTrail.push({ x: player.x, y: player.y, alpha: 0.6 });
    if (player.dodgeTrail.length > 8) player.dodgeTrail.shift();
  }
  for (let i = player.dodgeTrail.length - 1; i >= 0; i--) {
    player.dodgeTrail[i].alpha -= dt * 3;
    if (player.dodgeTrail[i].alpha <= 0) player.dodgeTrail.splice(i, 1);
  }
}

function playerShoot(targetX, targetY) {
  if (player.shootCooldown > 0 || gameOver) return;
  const w = getCurrentWeapon();
  player.shootCooldown = w.fireRate;
  player.recoilTimer = 0.08;

  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const baseAngle = Math.atan2(dy, dx);

  for (let i = 0; i < w.bulletCount; i++) {
    let angle = baseAngle;
    if (w.bulletCount > 1) {
      angle = baseAngle - w.spreadAngle / 2
              + (w.spreadAngle / (w.bulletCount - 1)) * i;
    } else if (w.spreadAngle > 0) {
      angle += rand(-w.spreadAngle, w.spreadAngle);
    }
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * w.bulletSpeed,
      vy: Math.sin(angle) * w.bulletSpeed,
      life: w.bulletLife,
      damage: w.damage,
      size: w.bulletSize,
      color: w.bulletColor,
      explosive: w.explosive || false,
      explosionRadius: w.explosionRadius || 0
    });
  }
}

function enemyShoot(enemy, spread = 0, speed = 280, damage = 8) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const baseAngle = Math.atan2(dy, dx);
  const angle = baseAngle + spread;
  enemyBullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 2.6,
    damage
  });
}

/* ===================== SUPER BOSS AI ===================== */
function updateSuperBoss(e, dt, dist, toPlayerX, toPlayerY) {
  const config = SUPER_BOSSES[e.superBossLevel];
  if (!config) return;

  // Dramatic entrance: no movement or attacks
  if (e.entranceTimer > 0) {
    e.entranceTimer -= dt;
    return;
  }

  // Phase transition check
  const hpRatio = e.hp / e.maxHp;
  if (e.phase === 1 && hpRatio <= config.phase2HpThreshold) {
    e.phase = 2;
    e.phaseTransitionTimer = 1.0;
    screenShakeTimer = 1.2;
    screenShakeIntensity = 12;
    triggerScreenFlash("#ff0000", 0.5);
    spawnBurst(e.x, e.y, config.bodyColor, 30);
  }

  // Invulnerable during phase transition
  if (e.phaseTransitionTimer > 0) {
    e.phaseTransitionTimer -= dt;
    return;
  }

  // Movement: slowly pursue player
  const dirX = toPlayerX / (dist || 1);
  const dirY = toPlayerY / (dist || 1);
  e.x += dirX * e.speed * dt;
  e.y += dirY * e.speed * dt;

  // Attack based on current phase
  e.fireCd -= dt;
  const attack = e.phase === 1 ? config.attacks.phase1 : config.attacks.phase2;

  if (e.fireCd <= 0) {
    e.fireCd = attack.fireRate;
    e.attackFlashTimer = 0.1;
    superBossAttack(e, attack);
  }

  // Update spiral/sweep rotation
  const spiralSpeed = attack.type === "spiral" ? 2 : 0;
  const sweepSpeed = attack.sweepSpeed || 0;
  e.attackAngle += (spiralSpeed + sweepSpeed) * dt;
}

function superBossAttack(e, attack) {
  switch (attack.type) {
    case "spiral":
      for (let i = 0; i < attack.bulletCount; i++) {
        const angle = e.attackAngle + (Math.PI * 2 / attack.bulletCount) * i;
        enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * attack.bulletSpeed,
          vy: Math.sin(angle) * attack.bulletSpeed,
          life: 3.0,
          damage: attack.bulletDamage
        });
      }
      break;

    case "burst":
      for (let i = 0; i < attack.bulletCount; i++) {
        const angle = (Math.PI * 2 / attack.bulletCount) * i;
        enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * attack.bulletSpeed,
          vy: Math.sin(angle) * attack.bulletSpeed,
          life: 2.5,
          damage: attack.bulletDamage
        });
      }
      break;

    case "tracking":
      for (let i = 0; i < attack.bulletCount; i++) {
        const angle = (Math.PI * 2 / attack.bulletCount) * i;
        enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * attack.bulletSpeed,
          vy: Math.sin(angle) * attack.bulletSpeed,
          life: 3.5,
          damage: attack.bulletDamage,
          tracking: true,
          trackingStrength: attack.trackingStrength || 1.5
        });
      }
      break;

    case "laser": {
      const angle = e.attackAngle;
      enemyBullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * attack.bulletSpeed,
        vy: Math.sin(angle) * attack.bulletSpeed,
        life: 2.0,
        damage: attack.bulletDamage
      });
      break;
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const toPlayerX = player.x - e.x;
    const toPlayerY = player.y - e.y;
    const dist = Math.hypot(toPlayerX, toPlayerY);

    e.stateTimer -= dt;
    e.animTime += dt;

    // Decay attack flash
    if (e.attackFlashTimer > 0) e.attackFlashTimer -= dt;

    let dirX = 0;
    let dirY = 0;

    if (e.isSuperBoss) {
      // Super boss uses its own AI
      updateSuperBoss(e, dt, dist, toPlayerX, toPlayerY);

      e.x = clamp(e.x, e.radius, WORLD_W - e.radius);
      e.y = clamp(e.y, e.radius, WORLD_H - e.radius);
      resolveWallCollision(e);

      // Check death
      if (e.hp <= 0) {
        superBossAlive = false;
        superBossPending = false;
        screenShakeTimer = 1.5;
        screenShakeIntensity = 15;
        triggerScreenFlash("#ffffff", 0.8);
        spawnSuperBossDeathEffect(e);
        playSuperBossVictorySound();
        enemies.splice(i, 1);
        player.score += e.scoreValue || 10;
      }
      continue;
    }

    e.fireCd -= dt;

    if (e.isBoss) {
      if (dist < 560) {
        dirX = toPlayerX / (dist || 1);
        dirY = toPlayerY / (dist || 1);
        e.chaseStretch = Math.min(e.chaseStretch + dt * 4, 1.0);
        if (e.fireCd <= 0 && dist < 650) {
          e.fireCd = rand(0.45, 0.9);
          e.attackFlashTimer = 0.15;
          enemyShoot(e, -0.2, 320, 11);
          enemyShoot(e, 0, 335, 11);
          enemyShoot(e, 0.2, 320, 11);
        }
      } else {
        e.chaseStretch = Math.max(e.chaseStretch - dt * 3, 0);
        if (e.stateTimer <= 0) {
          e.stateTimer = rand(0.8, 1.8);
          e.patrolAngle = rand(0, Math.PI * 2);
        }
        dirX = Math.cos(e.patrolAngle);
        dirY = Math.sin(e.patrolAngle);
      }
    } else if (dist < 320) {
      dirX = toPlayerX / (dist || 1);
      dirY = toPlayerY / (dist || 1);
      e.chaseStretch = Math.min(e.chaseStretch + dt * 4, 1.0);
      if (e.fireCd <= 0 && dist < 460) {
        e.fireCd = rand(0.9, 1.6);
        e.attackFlashTimer = 0.15;
        enemyShoot(e);
      }
    } else {
      e.chaseStretch = Math.max(e.chaseStretch - dt * 3, 0);
      if (e.stateTimer <= 0) {
        e.stateTimer = rand(1.1, 2.4);
        e.patrolAngle = rand(0, Math.PI * 2);
      }
      dirX = Math.cos(e.patrolAngle);
      dirY = Math.sin(e.patrolAngle);
    }

    e.x += dirX * e.speed * dt;
    e.y += dirY * e.speed * dt;

    e.x = clamp(e.x, 16, WORLD_W - 16);
    e.y = clamp(e.y, 16, WORLD_H - 16);
    resolveWallCollision(e);

    if (e.hp <= 0) {
      spawnEnemyDeath(e.x, e.y, e.isBoss, e.deathColor1 || "#ff5d5d", e.deathColor2 || "#ffd3d3");
      spawnBurst(e.x, e.y, "#50d4a8", 12);
      if (e.isBoss) {
        bossAlive = false;
        bossPending = false;
      }
      enemies.splice(i, 1);
      player.score += e.scoreValue || 10;
    }
  }
}

function updateMedkits() {
  for (let i = medkits.length - 1; i >= 0; i--) {
    const m = medkits[i];
    const r = player.radius + m.radius;
    if ((player.x - m.x) ** 2 + (player.y - m.y) ** 2 <= r * r) {
      player.hp = clamp(player.hp + m.heal, 0, player.maxHp);
      spawnBurst(m.x, m.y, "#ffffff", 14);
      medkits.splice(i, 1);
    }
  }
}

function updateBullets(arr, dt, isEnemy = false) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    b.life -= dt;

    // Tracking bullet logic
    if (b.tracking) {
      const dx = player.x - b.x;
      const dy = player.y - b.y;
      const targetAngle = Math.atan2(dy, dx);
      const currentAngle = Math.atan2(b.vy, b.vx);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const turn = clamp(angleDiff, -b.trackingStrength * dt, b.trackingStrength * dt);
      const newAngle = currentAngle + turn;
      const speed = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(newAngle) * speed;
      b.vy = Math.sin(newAngle) * speed;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H) {
      arr.splice(i, 1);
      continue;
    }

    if (hitWall(b.x, b.y)) {
      arr.splice(i, 1);
      spawnBurst(b.x, b.y, "#f7cf5a", 5);
      continue;
    }

    if (!isEnemy) {
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        // Skip super boss during phase transition
        if (e.isSuperBoss && e.phaseTransitionTimer > 0) continue;
        const hitR = e.radius + (b.size || 4) / 2;
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 <= hitR * hitR) {
          e.hp -= b.damage || 17;
          spawnBurst(b.x, b.y, "#ffffff", 4);

          // Explosive: splash damage
          if (b.explosive) {
            spawnExplosion(b.x, b.y, b.explosionRadius);
            for (const other of enemies) {
              if (other === e) continue;
              if (other.isSuperBoss && other.phaseTransitionTimer > 0) continue;
              const eDist = Math.hypot(other.x - b.x, other.y - b.y);
              if (eDist < b.explosionRadius) {
                other.hp -= (b.damage || 17) * 0.5;
                spawnBurst(other.x, other.y, "#ff8844", 4);
              }
            }
          }

          arr.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    } else if (!levelTransitionState && (b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= (player.radius + 2) ** 2) {
      if (player.dodgeTimer <= 0) {
        player.hp -= b.damage || 8;
        spawnBurst(player.x, player.y, "#ff5d5d", 10);
      }
      arr.splice(i, 1);
    }
  }
}

function spawnExplosion(x, y, radius) {
  deathEffects.push({
    x, y,
    life: 0.35,
    maxLife: 0.35,
    ring: radius * 0.3,
    shards: []
  });
  spawnBurst(x, y, "#ff8844", 16);
  spawnBurst(x, y, "#ffcc44", 8);
}

function spawnSuperBossDeathEffect(e) {
  const config = SUPER_BOSSES[e.superBossLevel];
  const color = config ? config.bodyColor : "#ff2222";
  for (let ring = 0; ring < 3; ring++) {
    const shards = [];
    for (let j = 0; j < 40; j++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(150, 400);
      shards.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.5, 1.2),
        size: rand(3, 8),
        color: Math.random() > 0.5 ? color : "#ffffff"
      });
    }
    deathEffects.push({
      x: e.x, y: e.y,
      life: 1.2,
      maxLife: 1.2,
      ring: 10 + ring * 20,
      shards
    });
  }
  spawnBurst(e.x, e.y, "#ffdd44", 30);
  spawnBurst(e.x, e.y, "#ff44ff", 20);
  spawnBurst(e.x, e.y, "#44ffff", 20);
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: rand(-110, 110),
      vy: rand(-110, 110),
      life: rand(0.15, 0.45),
      color
    });
  }
}

function spawnEnemyDeath(x, y, isBoss = false, dColor1 = "#ff5d5d", dColor2 = "#ffd3d3") {
  const shards = [];
  const count = isBoss ? 28 : 16;
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = isBoss ? rand(120, 260) : rand(80, 210);
    shards.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: isBoss ? rand(0.35, 0.75) : rand(0.2, 0.55),
      size: isBoss ? rand(3, 7) : rand(2, 5),
      color: Math.random() > 0.5 ? dColor1 : dColor2
    });
  }
  deathEffects.push({
    x, y,
    life: isBoss ? 0.85 : 0.55,
    maxLife: isBoss ? 0.85 : 0.55,
    ring: isBoss ? 12 : 8,
    shards
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateDeathEffects(dt) {
  for (let i = deathEffects.length - 1; i >= 0; i--) {
    const fx = deathEffects[i];
    fx.life -= dt;
    fx.ring += dt * 130;
    for (const s of fx.shards) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.92;
      s.vy *= 0.92;
    }
    if (fx.life <= 0) deathEffects.splice(i, 1);
  }
}

function resolveWallCollision(entity) {
  for (const w of walls) {
    const nx = clamp(entity.x, w.x, w.x + w.w);
    const ny = clamp(entity.y, w.y, w.y + w.h);
    const dx = entity.x - nx;
    const dy = entity.y - ny;
    const d2 = dx * dx + dy * dy;
    const r = entity.radius;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      const overlap = r - d;
      entity.x += (dx / d) * overlap;
      entity.y += (dy / d) * overlap;
    }
  }
}

function hitWall(x, y) {
  for (const w of walls) {
    if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
  }
  return false;
}

/* ===================== DRAWING ===================== */
function drawPixelCircle(x, y, r, color, camX, camY) {
  const sx = Math.floor(x - camX);
  const sy = Math.floor(y - camY);
  ctx.fillStyle = color;
  for (let yy = -r; yy <= r; yy += 3) {
    for (let xx = -r; xx <= r; xx += 3) {
      if (xx * xx + yy * yy <= r * r) {
        ctx.fillRect(sx + xx, sy + yy, 3, 3);
      }
    }
  }
}

function drawStretchedPixelCircle(x, y, r, color, camX, camY, stretch, angle) {
  const sx = Math.floor(x - camX);
  const sy = Math.floor(y - camY);
  ctx.fillStyle = color;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const rx = r * (1 + stretch);
  const ry = r * (1 - stretch * 0.5);
  for (let yy = -r - 3; yy <= r + 3; yy += 3) {
    for (let xx = -r - 3; xx <= r + 3; xx += 3) {
      const lx = xx * cos - yy * sin;
      const ly = xx * sin + yy * cos;
      if ((lx / rx) ** 2 + (ly / ry) ** 2 <= 1) {
        ctx.fillRect(sx + xx, sy + yy, 3, 3);
      }
    }
  }
}

function drawEntityPlayer(camX, camY) {
  // Dodge trail (afterimages)
  for (const t of player.dodgeTrail) {
    const a = Math.max(0, t.alpha * 0.4);
    if (a > 0.01) {
      ctx.globalAlpha = a;
      drawPixelCircle(t.x, t.y, player.radius, "#50d4a8", camX, camY);
      ctx.globalAlpha = 1.0;
    }
  }

  const bOff = player.breathOffset;
  const sx = Math.floor(player.x - camX);
  const sy = Math.floor(player.y - camY + bOff);

  // Body with breath offset
  drawPixelCircle(player.x, player.y + bOff, player.radius, "#50d4a8", camX, camY);

  // Walking legs
  if (player.isMoving) {
    const legOffset = Math.sin(player.walkCycle * Math.PI * 2) * 4;
    ctx.fillStyle = "#3aaa88";
    ctx.fillRect(sx - 5, sy + player.radius - 2, 4, Math.max(2, 6 + legOffset));
    ctx.fillRect(sx + 1, sy + player.radius - 2, 4, Math.max(2, 6 - legOffset));
  } else {
    ctx.fillStyle = "#3aaa88";
    ctx.fillRect(sx - 5, sy + player.radius - 2, 4, 6);
    ctx.fillRect(sx + 1, sy + player.radius - 2, 4, 6);
  }

  // Gun with weapon-specific rendering + recoil
  const w = getCurrentWeapon();
  const recoilPull = (player.recoilTimer > 0)
    ? -w.recoil * (player.recoilTimer / 0.08)
    : 0;
  const gunDist = 15 + recoilPull;
  const gunX = sx + Math.cos(player.angle) * gunDist;
  const gunY = sy + Math.sin(player.angle) * gunDist;
  ctx.fillStyle = w.gunColor;
  const gs = w.gunSize;
  ctx.fillRect(Math.floor(gunX - gs / 2), Math.floor(gunY - gs / 2), gs, gs);

  // Muzzle flash
  if (player.recoilTimer > 0.05) {
    const flashDist = gunDist + gs / 2 + 3;
    const fx = sx + Math.cos(player.angle) * flashDist;
    const fy = sy + Math.sin(player.angle) * flashDist;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.floor(fx - 2), Math.floor(fy - 2), 4, 4);
  }
}

function drawEnemy(e, camX, camY) {
  if (e.isSuperBoss) {
    drawSuperBoss(e, camX, camY);
    return;
  }

  const sx = Math.floor(e.x - camX);
  const sy = Math.floor(e.y - camY);

  // Patrol wobble
  const wobble = Math.sin(e.animTime * 4 + e.wobblePhase) * 2;

  // Attack flash: draw white before shooting
  const bodyColor = e.attackFlashTimer > 0
    ? "#ffffff"
    : (e.bodyColor || (e.isBoss ? "#ff8c3a" : "#ff5d5d"));

  // Chase stretch
  if (e.chaseStretch > 0.1) {
    const toPlayerAngle = Math.atan2(player.y - e.y, player.x - e.x);
    drawStretchedPixelCircle(e.x, e.y, e.radius, bodyColor,
      camX, camY, e.chaseStretch * 0.2, toPlayerAngle);
  } else {
    drawPixelCircle(e.x + wobble, e.y, e.radius, bodyColor, camX, camY);
  }

  // Face
  ctx.fillStyle = e.eyeColor || "#1b1111";
  if (e.isBoss) {
    drawBossAnimatedFace(e, sx + wobble, sy);
  } else {
    ctx.fillRect(sx + wobble - 4, sy - 2, 3, 3);
    ctx.fillRect(sx + wobble + 1, sy - 2, 3, 3);
  }
}

function drawBossAnimatedFace(e, sx, sy) {
  // Pulsing eyes
  const eyePulse = Math.sin(e.animTime * 6) * 0.5 + 0.5;
  const eyeSize = Math.floor(4 + eyePulse);
  ctx.fillStyle = e.attackFlashTimer > 0 ? "#ff0000" : (e.eyeColor || "#1b1111");
  ctx.fillRect(sx - 7, sy - 3, eyeSize, eyeSize);
  ctx.fillRect(sx + 3, sy - 3, eyeSize, eyeSize);

  // Animated mouth
  const mouthOpen = Math.abs(Math.sin(e.animTime * 3)) * 3;
  ctx.fillStyle = e.eyeColor || "#ffe58a";
  ctx.fillRect(sx - 2, sy + 2, 4, Math.floor(3 + mouthOpen));
}

/* ===================== SUPER BOSS DRAWING ===================== */
function drawSuperBoss(e, camX, camY) {
  const config = SUPER_BOSSES[e.superBossLevel];
  if (!config) return;
  const sx = Math.floor(e.x - camX);
  const sy = Math.floor(e.y - camY);

  let bodyColor = config.bodyColor;

  // Phase transition: flash
  if (e.phaseTransitionTimer > 0) {
    bodyColor = Math.floor(e.phaseTransitionTimer * 10) % 2
      ? "#ffffff" : config.bodyColor;
  }

  // Entrance animation
  if (e.entranceTimer > 0) {
    const t = 1 - (e.entranceTimer / 1.5);
    const drawR = Math.max(3, e.radius * t);
    drawPixelCircle(e.x, e.y, drawR, bodyColor, camX, camY);
    return;
  }

  // Phase 2 glow
  if (e.phase === 2) {
    const pulse = Math.sin(e.animTime * 8) * 0.3 + 0.7;
    ctx.globalAlpha = pulse * 0.3;
    drawPixelCircle(e.x, e.y, e.radius + 5, "#ff4444", camX, camY);
    ctx.globalAlpha = 1.0;
  }

  // Main body
  drawPixelCircle(e.x, e.y, e.radius, bodyColor, camX, camY);

  // Face
  if (e.superBossLevel === 5) {
    drawGuardianFace(e, sx, sy, config);
  } else if (e.superBossLevel === 10) {
    drawDestroyerFace(e, sx, sy, config);
  }

  // HP bar
  drawBossHpBar(e, sx, sy, config);
}

function drawGuardianFace(e, sx, sy, config) {
  const eyePulse = Math.sin(e.animTime * 5);
  const eyeSize = Math.floor(5 + eyePulse);
  ctx.fillStyle = config.eyeColor;
  ctx.fillRect(sx - 10, sy - 8, eyeSize, eyeSize);
  ctx.fillRect(sx + 5, sy - 8, eyeSize, eyeSize);
  ctx.fillRect(sx - 2, sy + 4, eyeSize, eyeSize);

  // Crown decoration
  ctx.fillStyle = "#ffdd44";
  for (let i = -2; i <= 2; i++) {
    const h = (i % 2 === 0) ? 8 : 5;
    ctx.fillRect(sx + i * 6 - 2, sy - e.radius - h, 4, h);
  }
}

function drawDestroyerFace(e, sx, sy, config) {
  const eyePulse = Math.sin(e.animTime * 7) * 1.5;
  ctx.fillStyle = config.eyeColor;
  ctx.fillRect(sx - 14, sy - 6, 7, Math.floor(4 + eyePulse));
  ctx.fillRect(sx - 11, sy - 9, 4, 3);
  ctx.fillRect(sx + 7, sy - 6, 7, Math.floor(4 + eyePulse));
  ctx.fillRect(sx + 7, sy - 9, 4, 3);

  // Jagged mouth
  ctx.fillStyle = "#ff4444";
  for (let i = -3; i <= 3; i++) {
    const toothH = (i % 2 === 0) ? 5 : 3;
    ctx.fillRect(sx + i * 4 - 1, sy + 8, 3, toothH);
  }

  // Rotating spikes
  ctx.fillStyle = "#ff6666";
  for (let i = 0; i < 8; i++) {
    const spikeAngle = (Math.PI * 2 / 8) * i + e.animTime * 0.5;
    const spikeX = sx + Math.cos(spikeAngle) * (e.radius + 6);
    const spikeY = sy + Math.sin(spikeAngle) * (e.radius + 6);
    ctx.fillRect(Math.floor(spikeX - 2), Math.floor(spikeY - 2), 5, 5);
  }
}

function drawBossHpBar(e, sx, sy) {
  const barW = 60;
  const barH = 6;
  const barX = sx - barW / 2;
  const barY = sy - e.radius - 18;
  const ratio = clamp(e.hp / e.maxHp, 0, 1);

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = "#333";
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = e.phase === 2 ? "#ff3333" : "#f7cf5a";
  ctx.fillRect(barX, barY, Math.floor(barW * ratio), barH);

  // Phase threshold marker
  const config = SUPER_BOSSES[e.superBossLevel];
  if (config) {
    const thresholdX = barX + barW * config.phase2HpThreshold;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.floor(thresholdX), barY, 1, barH);
  }
}

/* ===================== HUD & DRAW WORLD ===================== */
function drawWeaponHud() {
  const topSafe = Math.max(86, Math.floor(VIEW_H * 0.12));
  const baseY = topSafe + 46;

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(18, baseY, 220, 28);

  // Weapon name
  const w = getCurrentWeapon();
  ctx.fillStyle = w.gunColor;
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText(`[${currentWeaponIndex + 1}] ${w.name}`, 30, baseY + 18);

  // Slot indicators
  for (let i = 0; i < WEAPONS.length; i++) {
    const slotX = 140 + i * 18;
    ctx.fillStyle = i === currentWeaponIndex
      ? WEAPONS[i].gunColor
      : "rgba(255,255,255,0.2)";
    ctx.fillRect(slotX, baseY + 8, 12, 12);
    ctx.fillStyle = "#fff";
    ctx.font = "9px monospace";
    ctx.fillText(String(i + 1), slotX + 3, baseY + 17);
  }
}

function drawWorld(dt) {
  let camX = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  let camY = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);

  // Screen shake
  if (screenShakeTimer > 0) {
    screenShakeTimer -= dt;
    const intensity = screenShakeIntensity * (screenShakeTimer / 0.8);
    camX += rand(-intensity, intensity);
    camY += rand(-intensity, intensity);
  }

  const mapCfg = MAP_CONFIGS[currentLevel] || MAP_CONFIGS[1];

  ctx.fillStyle = mapCfg.bgColor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Pixel grid floor
  for (let y = -(camY % 32); y < VIEW_H; y += 32) {
    for (let x = -(camX % 32); x < VIEW_W; x += 32) {
      ctx.fillStyle = (Math.floor((x + camX) / 32) + Math.floor((y + camY) / 32)) % 2 ? mapCfg.floorColor1 : mapCfg.floorColor2;
      ctx.fillRect(x, y, 32, 32);
    }
  }

  // Floor decorations
  drawFloorDecorations(camX, camY, mapCfg);

  ctx.fillStyle = mapCfg.wallColor;
  for (const w of walls) {
    ctx.fillRect(Math.floor(w.x - camX), Math.floor(w.y - camY), Math.floor(w.w), Math.floor(w.h));
    ctx.fillStyle = mapCfg.wallHighlight;
    ctx.fillRect(Math.floor(w.x - camX + 4), Math.floor(w.y - camY + 4), Math.floor(w.w - 8), 6);
    ctx.fillStyle = mapCfg.wallColor;
  }

  // Player bullets with per-bullet color/size
  for (const b of bullets) {
    ctx.fillStyle = b.color || "#ffe58a";
    const sz = b.size || 4;
    ctx.fillRect(Math.floor(b.x - camX - sz / 2), Math.floor(b.y - camY - sz / 2), sz, sz);
  }
  // Enemy bullets - tracking bullets glow cyan
  for (const b of enemyBullets) {
    if (b.tracking) {
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(Math.floor(b.x - camX - 3), Math.floor(b.y - camY - 3), 6, 6);
    } else {
      ctx.fillStyle = "#ff7c7c";
      ctx.fillRect(Math.floor(b.x - camX - 2), Math.floor(b.y - camY - 2), 4, 4);
    }
  }

  for (const m of medkits) {
    const mx = Math.floor(m.x - camX);
    const my = Math.floor(m.y - camY);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mx - 6, my - 6, 12, 12);
    ctx.fillStyle = "#cfe8ff";
    ctx.fillRect(mx - 2, my - 5, 4, 10);
    ctx.fillRect(mx - 5, my - 2, 10, 4);
  }

  for (const e of enemies) drawEnemy(e, camX, camY);
  drawEntityPlayer(camX, camY);
  drawDeathEffects(camX, camY);

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y - camY), 3, 3);
  }

  // Crosshair
  const cx = pointer.x;
  const cy = pointer.y;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx + 7, cy);
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();

  // Screen flash overlay
  if (screenFlashTimer > 0) {
    screenFlashTimer -= dt;
    ctx.globalAlpha = clamp(screenFlashTimer * 2, 0, 0.5);
    ctx.fillStyle = screenFlashColor;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1.0;
  }

  // Level announcement
  drawLevelAnnouncement(dt);

  drawHud(dt);

  // 关卡过渡遮罩（必须在最上层）
  if (levelTransitionState !== null) {
    drawLevelTransitionOverlay();
  }
}

function drawDeathEffects(camX, camY) {
  for (const fx of deathEffects) {
    const t = fx.life / fx.maxLife;
    const sx = Math.floor(fx.x - camX);
    const sy = Math.floor(fx.y - camY);
    ctx.strokeStyle = `rgba(255, 93, 93, ${0.75 * t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, fx.ring, 0, Math.PI * 2);
    ctx.stroke();

    for (const s of fx.shards) {
      if (s.life <= 0) continue;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.floor(s.x - camX), Math.floor(s.y - camY), Math.floor(s.size), Math.floor(s.size));
    }
  }
}

function drawHud() {
  const topSafe = Math.max(86, Math.floor(VIEW_H * 0.12));
  const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(18, topSafe, 220, 42);
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(30, topSafe + 18, 180, 12);
  ctx.fillStyle = hpRatio > 0.35 ? "#50d4a8" : "#ff5d5d";
  ctx.fillRect(30, topSafe + 18, Math.floor(180 * hpRatio), 12);
  ctx.fillStyle = "#fff";
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillText(`HP ${Math.max(Math.floor(player.hp), 0)}`, 30, topSafe + 12);

  drawWeaponHud();
  drawMinimap();
}

function drawMinimap() {
  const mapW = 180;
  const mapH = 180;
  const pad = 18;
  const x0 = VIEW_W - mapW - pad;
  const y0 = Math.max(86, Math.floor(VIEW_H * 0.12));
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;

  const mmCfg = MAP_CONFIGS[currentLevel] || MAP_CONFIGS[1];
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x0 - 3, y0 - 3, mapW + 6, mapH + 6);
  ctx.fillStyle = mmCfg.minimapBg;
  ctx.fillRect(x0, y0, mapW, mapH);
  ctx.strokeStyle = "#8ba0c8";
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, mapW, mapH);

  // Obstacles
  ctx.fillStyle = mmCfg.minimapWall;
  for (const w of walls) {
    ctx.fillRect(
      Math.floor(x0 + w.x * sx),
      Math.floor(y0 + w.y * sy),
      Math.max(1, Math.floor(w.w * sx)),
      Math.max(1, Math.floor(w.h * sy))
    );
  }

  for (const e of enemies) {
    const ex = Math.floor(x0 + e.x * sx);
    const ey = Math.floor(y0 + e.y * sy);
    if (e.isSuperBoss) {
      const config = SUPER_BOSSES[e.superBossLevel];
      ctx.fillStyle = config ? config.bodyColor : "#ff2222";
      ctx.fillRect(ex - 3, ey - 3, 7, 7);
    } else if (e.isBoss) {
      ctx.fillStyle = e.bodyColor || "#ffb347";
      ctx.fillRect(ex - 2, ey - 2, 5, 5);
    } else {
      ctx.fillStyle = e.bodyColor || "#ff5d5d";
      ctx.fillRect(ex - 1, ey - 1, 3, 3);
    }
  }

  // Player
  const px = Math.floor(x0 + player.x * sx);
  const py = Math.floor(y0 + player.y * sy);
  ctx.fillStyle = "#50d4a8";
  ctx.fillRect(px - 2, py - 2, 5, 5);

  // Medkits
  ctx.fillStyle = "#ffffff";
  for (const m of medkits) {
    const mx = Math.floor(x0 + m.x * sx);
    const my = Math.floor(y0 + m.y * sy);
    ctx.fillRect(mx - 1, my - 1, 3, 3);
  }

  // Viewport frame
  ctx.strokeStyle = "#f7cf5a";
  ctx.lineWidth = 2;
  const frameW = clamp(VIEW_W * MINIMAP_VIEW_SCALE, VIEW_W, WORLD_W);
  const frameH = clamp(VIEW_H * MINIMAP_VIEW_SCALE, VIEW_H, WORLD_H);
  const frameX = clamp(player.x - frameW / 2, 0, WORLD_W - frameW);
  const frameY = clamp(player.y - frameH / 2, 0, WORLD_H - frameH);
  ctx.strokeRect(
    Math.floor(x0 + frameX * sx),
    Math.floor(y0 + frameY * sy),
    Math.max(1, Math.floor(frameW * sx)),
    Math.max(1, Math.floor(frameH * sy))
  );
}

/* ===================== GAME LOOP ===================== */
let lastTs = 0;
function gameLoop(ts) {
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;

  if (!gameOver) {
    updateBgm();
    const inTransition = !!levelTransitionState;

    // Player movement: allowed during celebrating, frozen otherwise in transition
    if (!inTransition || levelTransitionState === "celebrating") {
      updatePlayer(dt);
    }

    const camX = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    const camY = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    const aimX = camX + pointer.x;
    const aimY = camY + pointer.y;
    player.angle = Math.atan2(aimY - player.y, aimX - player.x);

    if (mouseDown && !inTransition) playerShoot(aimX, aimY);

    if (!inTransition) {
      if (regularsLeftToSpawn > 0) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy(false);
          regularsLeftToSpawn -= 1;
          spawnTimer = rand(0.2, 0.8);
        }
      } else if (superBossPending && !superBossAlive && !enemies.length) {
        spawnSuperBoss(currentLevel);
        superBossAlive = true;
      } else if (bossPending && !bossAlive && !enemies.length) {
        spawnEnemy(true);
        bossAlive = true;
      } else if (!bossPending && !superBossPending && !enemies.length) {
        beginLevelTransition();
      }
    }

    // Update transition state machine
    if (levelTransitionState) {
      updateLevelTransition(dt);
    }

    if (!inTransition) {
      updateEnemies(dt);
      updateMedkits();
    }
    updateBullets(bullets, dt, false);
    updateBullets(enemyBullets, dt, true);
    updateParticles(dt);
    updateDeathEffects(dt);

    if (player.hp <= 0) {
      gameOver = true;
      showHud();
      overlay.classList.remove("hidden");
      overlay.innerHTML = "你已被击败<br/>点击刷新重开";
    }
  }

  drawWorld(dt);
  const w = getCurrentWeapon();
  const statMapCfg = MAP_CONFIGS[currentLevel] || MAP_CONFIGS[1];
  const bossState = superBossAlive ? "超级BOSS" : bossAlive ? "在场" : (bossPending || superBossPending) ? "待出现" : "无";
  stats.textContent = `地图 ${statMapCfg.name} | 关卡 ${currentLevel}/${TOTAL_LEVELS} | 武器 ${w.name} | 待刷普通 ${regularsLeftToSpawn} | BOSS ${bossState} | 敌人 ${enemies.length} | 分数 ${player.score} | 翻滚 ${Math.max(0, player.dodgeCooldown).toFixed(1)}s`;
  requestAnimationFrame(gameLoop);
}

function onDodge() {
  if (player.dodgeCooldown > 0 || gameOver) return;
  player.dodgeCooldown = 2.2;
  player.dodgeTimer = 0.2;
}

/* ===================== HUD AUTO-HIDE ===================== */
function hideHud() {
  if (hudTop) hudTop.classList.add("hidden-hud");
}

function showHud() {
  if (hudTop) hudTop.classList.remove("hidden-hud");
}

function onFirstInteraction() {
  if (gameInteracted) return;
  gameInteracted = true;
  hudHideTimeout = setTimeout(hideHud, 3000);
}

/* ===================== EVENT HANDLERS ===================== */
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  onFirstInteraction();
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") onDodge();

  // Weapon switching with number keys 1-5
  if (e.code === "Digit1") currentWeaponIndex = 0;
  if (e.code === "Digit2") currentWeaponIndex = 1;
  if (e.code === "Digit3") currentWeaponIndex = 2;
  if (e.code === "Digit4") currentWeaponIndex = 3;
  if (e.code === "Digit5") currentWeaponIndex = 4;
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  pointer.x = (e.clientX - rect.left) * sx;
  pointer.y = (e.clientY - rect.top) * sy;
});
canvas.addEventListener("mousedown", () => {
  ensureBgmStarted();
  onFirstInteraction();
  mouseDown = true;
});
window.addEventListener("mouseup", () => {
  mouseDown = false;
});

// Weapon switching with scroll wheel
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    currentWeaponIndex = (currentWeaponIndex + 1) % WEAPONS.length;
  } else {
    currentWeaponIndex = (currentWeaponIndex - 1 + WEAPONS.length) % WEAPONS.length;
  }
}, { passive: false });

window.addEventListener("keydown", () => {
  ensureBgmStarted();
}, { once: true });

// HUD hover-to-reveal: mouse near top shows HUD, moving away hides it
window.addEventListener("mousemove", (e) => {
  if (!gameInteracted || gameOver) return;
  if (e.clientY < 50) {
    if (hudHideTimeout) { clearTimeout(hudHideTimeout); hudHideTimeout = null; }
    showHud();
  } else if (e.clientY > 120) {
    if (!hudHideTimeout && hudTop && !hudTop.classList.contains("hidden-hud")) {
      hudHideTimeout = setTimeout(hideHud, 500);
    }
  }
});

window.addEventListener("click", () => {
  if (gameOver) window.location.reload();
});

window.addEventListener("resize", resizeCanvas);

overlay.classList.add("hidden");
resizeCanvas();
setupWorld();
requestAnimationFrame(gameLoop);
