// -----------------------------
// CONFIG
// -----------------------------
const SIZE = 300;
const GRID = 3; // 3x3
const TILE = SIZE / GRID;
const SCRAMBLE_STEPS = 20; // number of slides/rotations to scramble

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
let gameOver = false;

// -----------------------------
// DRAW ENGLISH FLAG
// -----------------------------
function drawFlag() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = "red";
  ctx.fillRect(SIZE/2 - SIZE/15, 0, SIZE/7.5, SIZE);
  ctx.fillRect(0, SIZE/2 - SIZE/15, SIZE, SIZE/7.5);
}

// -----------------------------
// TILE SYSTEM
// -----------------------------
function initTiles() {
  tiles = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      // Last tile is empty
      if (x === GRID-1 && y === GRID-1) {
        tiles.push({ x, y, correctX: x, correctY: y, rotation: 0, empty: true });
      } else {
        tiles.push({ x, y, correctX: x, correctY: y, rotation: 0, empty: false });
      }
    }
  }
}

// -----------------------------
// SCRAMBLE (slides + rotations)
// -----------------------------
function scramble(steps = SCRAMBLE_STEPS) {
  for (let i = 0; i < steps; i++) {
    const movable = tiles.filter(t => canSlide(t));
    if (movable.length === 0) continue;
    const t = movable[Math.floor(Math.random() * movable.length)];

    if (Math.random() < 0.5) {
      slideTile(t);
    } else {
      t.rotation = (t.rotation + 90) % 360;
    }
  }
}

// -----------------------------
// DRAW BOARD
// -----------------------------
function drawBoard() {
  bctx.clearRect(0, 0, SIZE, SIZE);

  tiles.forEach(tile => {
    if (tile.empty) return; // skip empty tile

    const sx = tile.correctX * TILE;
    const sy = tile.correctY * TILE;

    const dx = tile.x * TILE;
    const dy = tile.y * TILE;

    bctx.save();
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
// HELPER FUNCTIONS
// -----------------------------
function canSlide(tile) {
  const empty = tiles.find(t => t.empty);
  const dx = Math.abs(tile.x - empty.x);
  const dy = Math.abs(tile.y - empty.y);
  return dx + dy === 1; // adjacent
}

function slideTile(tile) {
  const empty = tiles.find(t => t.empty);
  if (!canSlide(tile)) return false;

  const tempX = tile.x;
  const tempY = tile.y;

  tile.x = empty.x;
  tile.y = empty.y;

  empty.x = tempX;
  empty.y = tempY;

  return true;
}

// -----------------------------
// USER INTERACTION
// -----------------------------
board.addEventListener("click", e => {
  if (gameOver) return;

  const x = Math.floor(e.offsetX / TILE);
  const y = Math.floor(e.offsetY / TILE);

  const tile = tiles.find(t => t.x === x && t.y === y && !t.empty);
  if (!tile) return;

  // If tile is adjacent to empty, slide it
  if (canSlide(tile)) {
    slideTile(tile);
    moves++;
  } else {
    // Otherwise rotate
    tile.rotation = (tile.rotation + 90) % 360;
    moves++;
  }

  movesCounter.textContent = moves;
  drawBoard();

  if (isSolved()) {
    gameOver = true;
    setTimeout(() => alert(`🎉 Congrats! You solved it in ${moves} moves!`), 50);
  }
});

// -----------------------------
// WIN CHECK
// -----------------------------
function isSolved() {
  return tiles.every(t => 
    t.empty ? (t.x === GRID-1 && t.y === GRID-1) : (t.x === t.correctX && t.y === t.correctY && t.rotation === 0)
  );
}

// -----------------------------
// INITIALIZE GAME
// -----------------------------
drawFlag();
initTiles();
scramble();
drawBoard();
