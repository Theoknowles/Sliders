// -----------------------------
// CONFIGURATION
// -----------------------------
const SIZE = 300;
const GRID = 3; // 3x3 grid
const TILE = SIZE / GRID;
const SCRAMBLE_STEPS = 7; // number of rotations to scramble

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
// DRAW ENGLISH FLAG
// -----------------------------
function drawFlag() {
  // white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // vertical red cross
  ctx.fillStyle = "red";
  ctx.fillRect(SIZE/2 - SIZE/15, 0, SIZE/7.5, SIZE);

  // horizontal red cross
  ctx.fillRect(0, SIZE/2 - SIZE/15, SIZE, SIZE/7.5);
}

// -----------------------------
// TILE SYSTEM
// -----------------------------
function initTiles() {
  tiles = [];
  for (let y=0; y<GRID; y++) {
    for (let x=0; x<GRID; x++) {
      tiles.push({
        x, y,
        correctX: x,
        correctY: y,
        rotation: 0
      });
    }
  }
}

// Scramble tiles (only rotation for now)
function scramble(steps = SCRAMBLE_STEPS) {
  for (let i=0; i<steps; i++) {
    const t = tiles[Math.floor(Math.random() * tiles.length)];
    t.rotation = (t.rotation + 90) % 360;
  }
}

// Draw board with tiles
function drawBoard() {
  bctx.clearRect(0,0,SIZE,SIZE);

  tiles.forEach(tile => {
    bctx.save();

    const sx = tile.correctX * TILE;
    const sy = tile.correctY * TILE;

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
drawFlag();
initTiles();
scramble();
drawBoard();
