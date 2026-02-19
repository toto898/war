console.log("✅ game.js chargé");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =========================
// Sécurité si enemies.js n'est pas chargé
// =========================
window.enemies = window.enemies || [];
window.spawnEnemies = window.spawnEnemies || function () {};
window.updateEnemies = window.updateEnemies || function () {};
window.drawEnemies = window.drawEnemies || function () {};

// =========================
// Joueur + état global
// =========================
let player = { x: 350, y: 250, size: 20, speed: 2 };

let keys = {};
document.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
document.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// UI lecture
let ui = { reading: false, text: "", fromJournal: false };

// Journal
let inventoryLetters = [];
let journalOpen = false;
let journalHitBoxes = [];

// Lettres placées dans le monde (depuis LETTERS)
let lettersState =
  typeof LETTERS !== "undefined"
    ? LETTERS.map((l) => ({ ...l, collected: false }))
    : [];

// Total fragments = nombre réel de lettres (robuste)
const TOTAL_FRAGMENTS = lettersState.length || 8;

// Fin de jeu
let gameFinished = false;

// Lettre finale (invisible au début)
let finalLetter = {
  x: 400,
  y: 330,
  r: 10,
  collected: true, // invisible tant qu'on n'a pas fini
  title: "La fin ?",
  body: "on dirait que tu a récupéré ce qui devait l'être...\nbien joué !\n\nEst ce que ces fragments signifient quelques chose ?\nJe ne sais pas\n\nOnt-ils un lien entre eux ?\nPeut être c'est à vous de me le dire\n\nMais peut importe le but de vos actions,\nmerci d'avoir joué\n\n\n(E pour fermer)",
};

// Just pressed
let eWasDown = false;
let jWasDown = false;

// Enemies (spawn)
spawnEnemies(8, canvas, player);

// =========================
// Helpers
// =========================
function enemiesActive() {
  return !ui.reading && !journalOpen && !gameFinished;
}

function isNearPlayerObj(p, obj, dist) {
  const px = p.x + p.size / 2;
  const py = p.y + p.size / 2;
  const dx = px - obj.x;
  const dy = py - obj.y;
  return dx * dx + dy * dy <= dist * dist;
}

function wrapText(ctx, texte, x, y, maxWidth, lineHeight) {
  const words = String(texte).split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// =========================
// Clic sur un titre dans le journal
// =========================
canvas.addEventListener("mousedown", (e) => {
  if (!journalOpen) return;

  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  for (const hb of journalHitBoxes) {
    if (mx >= hb.x && mx <= hb.x + hb.w && my >= hb.y && my <= hb.y + hb.h) {
      const item = inventoryLetters[hb.index];
      ui.reading = true;
      ui.fromJournal = true;
      ui.text = item.title + "\n\n" + item.body + "\n\n(E pour revenir au journal)";
      journalOpen = false;
      break;
    }
  }
});

// =========================
// Update
// =========================
function update() {
  const eDown = !!keys["e"];
  const eJustPressed = eDown && !eWasDown;
  eWasDown = eDown;

  const jDown = !!keys["j"];
  const jJustPressed = jDown && !jWasDown;
  jWasDown = jDown;

  // Journal toggle
  if (jJustPressed) {
    journalOpen = !journalOpen;
    if (journalOpen) {
      ui.reading = false;
      ui.text = "";
      ui.fromJournal = false;
    }
  }

  // Si on lit : E ferme (ou retourne au journal)
  if (ui.reading) {
    if (eJustPressed) {
      ui.reading = false;
      ui.text = "";
      if (ui.fromJournal) journalOpen = true;
      ui.fromJournal = false;
    }
    return;
  }

  // Journal ouvert : pause jeu
  if (journalOpen) return;

  // Déplacement (ZQSD + WASD)
  if (keys["z"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["q"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Limites écran
  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

  // Collecte d'une lettre
  if (eJustPressed) {
    for (const L of lettersState) {
      if (!L.collected && isNearPlayerObj(player, L, 22)) {
        L.collected = true;
        inventoryLetters.push({ title: L.title, body: L.body });

        ui.reading = true;
        ui.fromJournal = false;
        ui.text = L.title + "\n\n" + L.body + "\n\n(E pour fermer)";
        break;
      }
    }
  }

  // Fin de jeu (robuste : quand toutes les lettres sont collected)
  if (!gameFinished && lettersState.length > 0 && lettersState.every((L) => L.collected)) {
    gameFinished = true;

    // Cacher / neutraliser ennemis même si leur tableau est ailleurs
    // (on ne dépend pas de enemies.length = 0)
    finalLetter.collected = false; // la rendre visible
    finalLetter.x = 400;
    finalLetter.y = 330;
  }

  // Collecte lettre finale
  if (gameFinished && !finalLetter.collected && eJustPressed && isNearPlayerObj(player, finalLetter, 24)) {
    finalLetter.collected = true;
    ui.reading = true;
    ui.fromJournal = false;
    ui.text = finalLetter.title + "\n\n" + finalLetter.body;
  }

  // Ennemis (uniquement si jeu actif)
  if (enemiesActive()) {
    updateEnemies(player);
  }
  updateHurtCooldown();
  handleEnemyPlayerCollision(player,enemies,enemiesActive());
  
}

// =========================
// Draw
// =========================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // décor minimal (arbres + tente + feu)
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(200, 150, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(500, 400, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(350, 250, 100, 60);

  ctx.fillStyle = "orange";
  ctx.beginPath();
  ctx.arc(400, 330, 10, 0, Math.PI * 2);
  ctx.fill();

  // lettres sur la map
  for (const L of lettersState) {
    if (!L.collected) {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(L.x, L.y, L.r, 0, Math.PI * 2);
      ctx.fill();

      if (isNearPlayerObj(player, L, 22) && !ui.reading && !journalOpen) {
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.fillText("E — interagir", L.x - 5, L.y - 16);
      }
    }
  }

  // lettre finale visible après fin
  if (gameFinished && !finalLetter.collected) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(finalLetter.x, finalLetter.y, finalLetter.r, 0, Math.PI * 2);
    ctx.fill();

    if (isNearPlayerObj(player, finalLetter, 24)) {
      ctx.fillStyle = "black";
      ctx.font = "16px Arial";
      ctx.fillText("E — interagir", finalLetter.x - 5, finalLetter.y - 16);
    }
  }

  // joueur
  ctx.fillStyle = "white";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // ennemis (cachés pendant lecture/journal/fin)
  if (enemiesActive()) {
    drawEnemies(ctx);
  }

  // UI compteur fragments
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  if (!gameFinished){
	  ctx.fillText(`Fragments : ${inventoryLetters.length} / ${TOTAL_FRAGMENTS}`, 20, 30);
  } else {
	  ctx.fillText("objectif complété",20,30);
  }
  // popup lecture
  if (ui.reading) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    const lines = String(ui.text).split("\n");
    let y = 80;
    for (const line of lines) {
      wrapText(ctx, line, 70, y, canvas.width - 140, 26);
      y += 26;
    }
  }

  // journal (cliquable)
  if (journalOpen) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Journal", 70, 80);

    ctx.font = "18px Arial";
    journalHitBoxes = [];

    if (inventoryLetters.length === 0) {
      ctx.fillText("Aucune lettre collectée.", 70, 120);
    } else {
      let y = 120;
      for (let i = 0; i < inventoryLetters.length; i++) {
        const title = "- " + inventoryLetters[i].title;
        ctx.fillStyle = "white";
        ctx.fillText(title, 70, y);

        const w = ctx.measureText(title).width;
        journalHitBoxes.push({ index: i, x: 70, y: y - 18, w: w, h: 24 });
        y += 28;
      }
    }

    ctx.fillStyle = "white";
    ctx.fillText("J pour fermer — Cliquer sur un fragment pour le consulter", 70, canvas.height - 50);
  }
}

function resizeCanvasDisplay() {
	const canvas = document.getElementById("game");
	
	const baseWidth = canvas.width;
	const baseHeight = canvas.height;
	
	const scaleX = window.innerWidth / baseWidth;
	const scaleY = window.innerHeight / baseHeight;
	
	const scale = Math.min(scaleX,scaleY);
	
	canvas.style.width = baseWidth * scale + "px";
	canvas.style.height = baseHeight * scale  + "px";
}

window.addEventListener("resize",resizeCanvasDisplay);
resizeCanvasDisplay();

// =========================
// Loop
// =========================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
