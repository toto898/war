/* enemies.js — COMPLET et robuste
   - Ne spawn pas dans/près de la tente (padding)
   - N’entre pas dans la tente (éjection par chevauchement)
   - Patrouille + poursuite
   - Limites écran
*/

window.enemies = window.enemies || [];

// ⚠️ Doit correspondre à ta tente dans game.js : fillRect(350, 250, 100, 60)
const TENT = { x: 350, y: 250, w: 100, h: 60 };

// Réglages
const ENEMY_SIZE = 18;
const ENEMY_SPEED = 1.1;
const DETECT_RADIUS = 140;
const GIVEUP_RADIUS = 190;

// Zone interdite autour de la tente pour le spawn
const SPAWN_PAD = 90; // augmente si tu les veux plus loin

const WANDER_TIME_MIN = 60;
const WANDER_TIME_MAX = 140;

// ----------------- Helpers -----------------
function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Test : l’ennemi (carré) chevauche tente + padding
function enemyOverlapsTent(enemyX, enemyY, padding = 0) {
  return rectsOverlap(
    enemyX, enemyY, ENEMY_SIZE, ENEMY_SIZE,
    TENT.x - padding, TENT.y - padding,
    TENT.w + padding * 2, TENT.h + padding * 2
  );
}

function pickWanderTarget(canvas) {
  return {
    tx: rand(0, canvas.width - ENEMY_SIZE),
    ty: rand(0, canvas.height - ENEMY_SIZE),
    t: Math.floor(rand(WANDER_TIME_MIN, WANDER_TIME_MAX))
  };
}

// Spawn sûr (jamais boucle infinie)
function randomSpawnOutsideTent(canvas, player) {
  for (let i = 0; i < 800; i++) {
    const x = rand(0, canvas.width - ENEMY_SIZE);
    const y = rand(0, canvas.height - ENEMY_SIZE);

    // interdit : tente + padding
    if (enemyOverlapsTent(x, y, SPAWN_PAD)) continue;

    // optionnel : pas trop proche du joueur
    if (player) {
      const px = player.x + player.size / 2;
      const py = player.y + player.size / 2;
      const ex = x + ENEMY_SIZE / 2;
      const ey = y + ENEMY_SIZE / 2;
      if (dist2(px, py, ex, ey) < 140 * 140) continue;
    }

    return { x, y };
  }

  // fallback garanti (coin haut gauche, hors tente)
  return { x: 20, y: 20 };
}

// Éjection propre si l’ennemi chevauche la tente (sans padding)
function preventTentEntry(e) {
  if (!enemyOverlapsTent(e.x, e.y, 0)) return;

  // Profondeurs de chevauchement
  const overlapLeft   = (e.x + ENEMY_SIZE) - TENT.x;
  const overlapRight  = (TENT.x + TENT.w) - e.x;
  const overlapTop    = (e.y + ENEMY_SIZE) - TENT.y;
  const overlapBottom = (TENT.y + TENT.h) - e.y;

  const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

  if (minOverlap === overlapLeft) {
    e.x = TENT.x - ENEMY_SIZE - 1;
  } else if (minOverlap === overlapRight) {
    e.x = TENT.x + TENT.w + 1;
  } else if (minOverlap === overlapTop) {
    e.y = TENT.y - ENEMY_SIZE - 1;
  } else {
    e.y = TENT.y + TENT.h + 1;
  }
}

// ----------------- API -----------------
window.spawnEnemies = function spawnEnemies(count, canvas, player) {
  window.enemies.length = 0;

  for (let i = 0; i < count; i++) {
    const pos = randomSpawnOutsideTent(canvas, player);
    const w = pickWanderTarget(canvas);

    window.enemies.push({
      x: pos.x,
      y: pos.y,
      size: ENEMY_SIZE,
      speed: ENEMY_SPEED,
      state: "wander",
      tx: w.tx,
      ty: w.ty,
      t: w.t
    });
  }
};

window.updateEnemies = function updateEnemies(player) {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const px = player.x + player.size / 2;
  const py = player.y + player.size / 2;

  for (const e of window.enemies) {
    const ex = e.x + e.size / 2;
    const ey = e.y + e.size / 2;

    const d2 = dist2(px, py, ex, ey);
    const seen = d2 <= DETECT_RADIUS * DETECT_RADIUS;
    const tooFar = d2 >= GIVEUP_RADIUS * GIVEUP_RADIUS;

    if (e.state === "wander" && seen) e.state = "chase";
    if (e.state === "chase" && tooFar) e.state = "wander";

    let vx = 0, vy = 0;

    if (e.state === "chase") {
      const dx = px - ex;
      const dy = py - ey;
      const len = Math.hypot(dx, dy) || 1;
      vx = (dx / len) * e.speed;
      vy = (dy / len) * e.speed;
    } else {
      e.t--;
      if (e.t <= 0 || dist2(e.tx, e.ty, e.x, e.y) < 10 * 10) {
        const w = pickWanderTarget(canvas);
        e.tx = w.tx; e.ty = w.ty; e.t = w.t;
      }
      const dx = e.tx - e.x;
      const dy = e.ty - e.y;
      const len = Math.hypot(dx, dy) || 1;
      vx = (dx / len) * (e.speed * 0.7);
      vy = (dy / len) * (e.speed * 0.7);
    }

    e.x += vx;
    e.y += vy;

    e.x = clamp(e.x, 0, canvas.width - e.size);
    e.y = clamp(e.y, 0, canvas.height - e.size);

    preventTentEntry(e);
  }
};

window.drawEnemies = function drawEnemies(ctx) {
  for (const e of window.enemies) {
    ctx.fillStyle = "red";
    ctx.fillRect(e.x, e.y, e.size, e.size);
  }
};




		


		