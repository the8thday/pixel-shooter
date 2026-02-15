const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const stats = document.getElementById("stats");

let VIEW_W = canvas.width;
let VIEW_H = canvas.height;
const WORLD_W = 2600;
const WORLD_H = 2600;

const keys = new Set();
const pointer = { x: VIEW_W / 2, y: VIEW_H / 2 };
let mouseDown = false;
let gameOver = false;
let win = false;

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
  score: 0
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

function setupWorld() {
  // Square blocks to keep movement tactical.
  for (let i = 0; i < 44; i++) {
    const w = rand(70, 180);
    const h = rand(70, 180);
    walls.push({
      x: rand(80, WORLD_W - 260),
      y: rand(80, WORLD_H - 260),
      w,
      h
    });
  }
  startLevel();
}

function startLevel() {
  if (currentLevel >= TOTAL_LEVELS) {
    if (!enemies.length) {
      win = true;
      gameOver = true;
      overlay.classList.remove("hidden");
      overlay.innerHTML = "任务完成<br/>点击刷新重开";
    }
    return;
  }
  currentLevel += 1;
  regularsLeftToSpawn = REGULARS_PER_LEVEL;
  bossPending = currentLevel % 3 === 0;
  bossAlive = false;
  spawnTimer = 0.2;
  spawnMedkitsForLevel();
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
  if (isBoss) {
    enemies.push({
      x,
      y,
      hp: 240,
      speed: rand(60, 78),
      radius: 22,
      fireCd: rand(0.45, 0.8),
      stateTimer: rand(0.8, 1.8),
      patrolAngle: rand(0, Math.PI * 2),
      isBoss: true,
      scoreValue: 80
    });
    return;
  }

  enemies.push({
    x,
    y,
    hp: 34,
    speed: rand(75, 105),
    radius: 13,
    fireCd: rand(0.8, 1.5),
    stateTimer: rand(0.5, 2.2),
    patrolAngle: rand(0, Math.PI * 2),
    isBoss: false,
    scoreValue: 10
  });
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
}

function playerShoot(targetX, targetY) {
  if (player.shootCooldown > 0 || gameOver) return;
  player.shootCooldown = 0.12;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const len = Math.hypot(dx, dy) || 1;
  bullets.push({
    x: player.x,
    y: player.y,
    vx: (dx / len) * 650,
    vy: (dy / len) * 650,
    life: 0.9
  });
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

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const toPlayerX = player.x - e.x;
    const toPlayerY = player.y - e.y;
    const dist = Math.hypot(toPlayerX, toPlayerY);

    e.stateTimer -= dt;
    e.fireCd -= dt;

    let dirX = 0;
    let dirY = 0;

    if (e.isBoss) {
      if (dist < 560) {
        dirX = toPlayerX / (dist || 1);
        dirY = toPlayerY / (dist || 1);
        if (e.fireCd <= 0 && dist < 650) {
          e.fireCd = rand(0.45, 0.9);
          enemyShoot(e, -0.2, 320, 11);
          enemyShoot(e, 0, 335, 11);
          enemyShoot(e, 0.2, 320, 11);
        }
      } else {
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
      if (e.fireCd <= 0 && dist < 460) {
        e.fireCd = rand(0.9, 1.6);
        enemyShoot(e);
      }
    } else {
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
      spawnEnemyDeath(e.x, e.y, e.isBoss);
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
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 <= (e.radius + 2) ** 2) {
          e.hp -= 17;
          arr.splice(i, 1);
          spawnBurst(b.x, b.y, "#ffffff", 4);
          break;
        }
      }
    } else if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 <= (player.radius + 2) ** 2) {
      if (player.dodgeTimer <= 0) {
        player.hp -= b.damage || 8;
        spawnBurst(player.x, player.y, "#ff5d5d", 10);
      }
      arr.splice(i, 1);
    }
  }
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: rand(-110, 110),
      vy: rand(-110, 110),
      life: rand(0.15, 0.45),
      color
    });
  }
}

function spawnEnemyDeath(x, y, isBoss = false) {
  const shards = [];
  const count = isBoss ? 28 : 16;
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = isBoss ? rand(120, 260) : rand(80, 210);
    shards.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: isBoss ? rand(0.35, 0.75) : rand(0.2, 0.55),
      size: isBoss ? rand(3, 7) : rand(2, 5),
      color: Math.random() > 0.5 ? "#ff5d5d" : "#ffd3d3"
    });
  }
  deathEffects.push({
    x,
    y,
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

function drawEntityPlayer(camX, camY) {
  drawPixelCircle(player.x, player.y, player.radius, "#50d4a8", camX, camY);
  const sx = Math.floor(player.x - camX);
  const sy = Math.floor(player.y - camY);

  const gunX = sx + Math.cos(player.angle) * 15;
  const gunY = sy + Math.sin(player.angle) * 15;
  ctx.fillStyle = "#f7cf5a";
  ctx.fillRect(Math.floor(gunX - 3), Math.floor(gunY - 3), 6, 6);
}

function drawEnemy(e, camX, camY) {
  drawPixelCircle(e.x, e.y, e.radius, e.isBoss ? "#ff8c3a" : "#ff5d5d", camX, camY);
  const sx = Math.floor(e.x - camX);
  const sy = Math.floor(e.y - camY);
  ctx.fillStyle = "#1b1111";
  if (e.isBoss) {
    ctx.fillRect(sx - 7, sy - 3, 4, 4);
    ctx.fillRect(sx + 3, sy - 3, 4, 4);
    ctx.fillStyle = "#ffe58a";
    ctx.fillRect(sx - 2, sy + 2, 4, 3);
  } else {
    ctx.fillRect(sx - 4, sy - 2, 3, 3);
    ctx.fillRect(sx + 1, sy - 2, 3, 3);
  }
}

function drawWorld(dt) {
  const camX = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  const camY = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);

  ctx.fillStyle = "#1a2130";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Pixel grid floor.
  for (let y = -(camY % 32); y < VIEW_H; y += 32) {
    for (let x = -(camX % 32); x < VIEW_W; x += 32) {
      ctx.fillStyle = (Math.floor((x + camX) / 32) + Math.floor((y + camY) / 32)) % 2 ? "#232d40" : "#273246";
      ctx.fillRect(x, y, 32, 32);
    }
  }

  ctx.fillStyle = "#4a5674";
  for (const w of walls) {
    ctx.fillRect(Math.floor(w.x - camX), Math.floor(w.y - camY), Math.floor(w.w), Math.floor(w.h));
    ctx.fillStyle = "#637399";
    ctx.fillRect(Math.floor(w.x - camX + 4), Math.floor(w.y - camY + 4), Math.floor(w.w - 8), 6);
    ctx.fillStyle = "#4a5674";
  }

  for (const b of bullets) {
    ctx.fillStyle = "#ffe58a";
    ctx.fillRect(Math.floor(b.x - camX - 2), Math.floor(b.y - camY - 2), 4, 4);
  }
  for (const b of enemyBullets) {
    ctx.fillStyle = "#ff7c7c";
    ctx.fillRect(Math.floor(b.x - camX - 2), Math.floor(b.y - camY - 2), 4, 4);
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

  // Crosshair.
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

  drawHud(dt);
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
  ctx.fillText(`HP ${Math.max(player.hp, 0)}`, 30, topSafe + 12);

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

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x0 - 3, y0 - 3, mapW + 6, mapH + 6);
  ctx.fillStyle = "rgba(26,33,48,0.95)";
  ctx.fillRect(x0, y0, mapW, mapH);
  ctx.strokeStyle = "#8ba0c8";
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, mapW, mapH);

  // Obstacles.
  ctx.fillStyle = "#5d6f95";
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
    if (e.isBoss) {
      ctx.fillStyle = "#ffb347";
      ctx.fillRect(ex - 2, ey - 2, 5, 5);
    } else {
      ctx.fillStyle = "#ff5d5d";
      ctx.fillRect(ex - 1, ey - 1, 3, 3);
    }
  }

  // Player.
  const px = Math.floor(x0 + player.x * sx);
  const py = Math.floor(y0 + player.y * sy);
  ctx.fillStyle = "#50d4a8";
  ctx.fillRect(px - 2, py - 2, 5, 5);

  // Medkits.
  ctx.fillStyle = "#ffffff";
  for (const m of medkits) {
    const mx = Math.floor(x0 + m.x * sx);
    const my = Math.floor(y0 + m.y * sy);
    ctx.fillRect(mx - 1, my - 1, 3, 3);
  }

  // Viewport frame (what camera currently sees).
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

let lastTs = 0;
function gameLoop(ts) {
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;

  if (!gameOver) {
    updateBgm();
    updatePlayer(dt);

    const camX = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    const camY = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    const aimX = camX + pointer.x;
    const aimY = camY + pointer.y;
    player.angle = Math.atan2(aimY - player.y, aimX - player.x);

    if (mouseDown) playerShoot(aimX, aimY);

    if (regularsLeftToSpawn > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy(false);
        regularsLeftToSpawn -= 1;
        spawnTimer = rand(0.2, 0.8);
      }
    } else if (bossPending && !bossAlive && !enemies.length) {
      spawnEnemy(true);
      bossAlive = true;
    } else if (!bossPending && !enemies.length) {
      startLevel();
    }

    updateEnemies(dt);
    updateMedkits();
    updateBullets(bullets, dt, false);
    updateBullets(enemyBullets, dt, true);
    updateParticles(dt);
    updateDeathEffects(dt);

    if (player.hp <= 0) {
      gameOver = true;
      overlay.classList.remove("hidden");
      overlay.innerHTML = "你已被击败<br/>点击刷新重开";
    }
  }

  drawWorld(dt);
  const bossState = bossAlive ? "在场" : bossPending ? "待出现" : "无";
  stats.textContent = `关卡 ${currentLevel}/${TOTAL_LEVELS} | 待刷普通 ${regularsLeftToSpawn} | 药包 ${medkits.length} | BOSS ${bossState} | 场上敌人 ${enemies.length} | 分数 ${player.score} | 翻滚冷却 ${Math.max(0, player.dodgeCooldown).toFixed(1)}s`;
  requestAnimationFrame(gameLoop);
}

function onDodge() {
  if (player.dodgeCooldown > 0 || gameOver) return;
  player.dodgeCooldown = 2.2;
  player.dodgeTimer = 0.2;
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") onDodge();
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
  mouseDown = true;
});
window.addEventListener("mouseup", () => {
  mouseDown = false;
});

window.addEventListener("keydown", () => {
  ensureBgmStarted();
}, { once: true });

window.addEventListener("click", () => {
  if (gameOver) window.location.reload();
});

window.addEventListener("resize", resizeCanvas);

overlay.classList.add("hidden");
resizeCanvas();
setupWorld();
requestAnimationFrame(gameLoop);
