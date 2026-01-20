// -----------------------------
// CONFIGURATION
// -----------------------------
const SIZE = 300;      // canvas size
const GRID = 3;        // 3x3 grid
const TILE = SIZE / GRID;
const SCRAMBLE_STEPS = 7; // how many moves to scramble

// -----------------------------
// HTML ELEMENTS
// -----------------------------
const target = document.getElementById("target");
const ctx = target.getContext("2d");

const board = document.getElementById("board");
const bctx = board.getContext("2d");

const movesCounter = document.getElementById("moves");

let tiles = [];
let moves = 0;

// -----------------------------
// HELPER FUNCTIONS
// -----------------------------

// Deterministic pseudo-random number generator
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Generate daily seed
const today = new Date().toISOString().slice(0,10);
let seed = 0;
for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
const random = mulberry32(seed);

// Generate procedural target image
function drawTarget() {
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `hsl(${Math.floor(random()*360)}, 70%, 60%)`;
    ctx.fillRect(
      Math.floor(random() * SIZE),
      Math.floor(random() * SIZE),
      60,
      60
    );
  }
}

// -----------------------------
// TILE SYSTEM
// -----------------------------
function initTiles() {
  tiles = [];
  for (let y=0; y<GRID; y++) {
    for (let x=0; x<GRID; x++) {
      tiles.push({
        x, y,             // current position
        correctX: x,      // correct position
        correctY: y,
        rotation: 0       // rotation in degrees (0,90,180,270)
      });
    }
  }
}

// Scramble tiles with rotations and slides
function scramble(steps = SCRAMBLE_STEPS) {
  for (let i=0; i<steps; i++) {
    const t = tiles[Math.floor(random() * tiles.length)];
    if (random() > 0.5) {
      // rotate
      t.rotation = (t.rotation + 90) % 360;
    } else {
      // slide (random direction)
      const dir = random() > 0.5 ? 1 : -1;
      t.x = Math.max(0, Math.min(GRID-1, t.x + dir));
    }
  }
}

// Draw interactive board
function drawBoard() {
  bctx.clearRect(0,0,SIZE,SIZE);

  tiles.forEach(tile => {
    bctx.save();

    // Source slice from target
    const sx = tile.correctX * TILE;
    const sy = tile.correctY * TILE;

    // Destination
    const dx = tile.x * TILE;
    const dy = tile.y * TILE;

    bctx.translate(dx + TILE/2, dy + TILE/2);
    bctx.rotate(tile.rotation * Math.PI / 180);

    bctx.drawImage(
      target,
      sx, sy, TILE, TILE,
      -TILE/2, -TILE/2, TILE, TILE
    );

    bctx.restore();
  });
}

// -----------------------------
// USER INTERACTION
// -----------------------------
board.addEventListener("click", e => {
  const x = Math.floor(e.offsetX / TILE);
  const y = Math.floor(e.offsetY / TILE);

  const tile = tiles.find(t => t.x === x && t.y === y);
  if (!tile) return;

  tile.rotation = (tile.rotation + 90) % 360;
  moves++;
  movesCounter.textContent = moves;

  drawBoard();

  if (isSolved()) {
    setTimeout(() => alert(`Congrats! You solved it in ${moves} moves!`), 100);
  }
});

// -----------------------------
// WIN DETECTION
// -----------------------------
function isSolved() {
  return tiles.every(t => 
    t.x === t.correctX &&
    t.y === t.correctY &&
    t.rotation === 0
  );
}

// -----------------------------
// INITIALIZE GAME
// -----------------------------
drawTarget();
initTiles();
scramble();
drawBoard();
