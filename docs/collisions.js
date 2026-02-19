
function respawnAtTent(player) {
	player.x = TENT.x + TENT.w / 2 - player.size / 2;
	player.y = TENT.y + TENT.h /2 - player.size / 2;
}

let hurtcooldown = 0;
const HURT_COOLDOWN_FRAME = 60;

function updateHurtCooldown() {
	if (hurtcooldown > 0) hurtcooldown--;
}

function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
	return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function enemyHitsPlayer(player, enemy) {
	const ex = enemy.x ?? 0;
	const ey = enemy.y ?? 0;
	
	const ew = enemy.size ?? enemy.w ?? (enemy.r ? enemy.r * 2: 20);
	const eh = enemy.size ?? enemy.h ?? (enemy.r ? enemy.r * 2: 20);
	
	const rx = enemy.r ? ex - enemy.r: ex;
	const ry = enemy.r ? ey - enemy.r: ey;
	
	return rectsOverlap(player.x,player.y,player.size, player.size,rx,ry,ew,eh);
}

function handleEnemyPlayerCollision(player, enemies, enemiesActive) {
	if (!enemiesActive || hurtcooldown > 0) return;
	
	for (const en of enemies) {
		if (enemyHitsPlayer(player, en)){
			respawnAtTent(player);
			hurtcooldown = HURT_COOLDOWN_FRAME;
			break;
		}
	}
}
	