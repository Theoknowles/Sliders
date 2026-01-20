// -----------------------------
// CONFIG
// -----------------------------
const SIZE = 300;
const GRID = 3;
const TILE = SIZE / GRID;
const SCRAMBLE_STEPS = 20;

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
      tiles.push({
        x, y,
        correctX: x,
        correctY: y,
        rotation: 0,
        empty: (x === GRID-1 && y === GRID-1)
      });
    }
  }
}

// -----------------------------
// SCRAMBLE
// -----------------------------
function scramble(steps = SCRAMBLE_STEPS) {
  for (let i = 0; i < steps; i++) {
    const movable = tiles.filter(t => canSlide(t));
    if (movable.length === 0) continue;
    const t = movable[Math.floor(Math.random() * movable.length)];

    if (Math.random() < 0.5) slideTile(t);
    else t.rotation = (t.rotation + 90) % 360;
  }
}

// -----------------------------
// DRAW BOARD
// -----------------------------
function drawBoard() {
  bctx.clearRect(0, 0, SIZE, SIZE);

  tiles.forEach(tile => {
    if (tile.empty) return;

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
  return dx + dy === 1;
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
// ROTATE ON TAP / CLICK
// -----------------------------
board.addEventListener("click", e => {
  if (gameOver) return;

  const x = Math.floor(e.offsetX / TILE);
  const y = Math.floor(e.offsetY / TILE);

  const tile = tiles.find(t => t.x === x && t.y === y && !t.empty);
  if (!tile) return;

  tile.rotation = (tile.rotation + 90) % 360;
  moves++;
  movesCounter.textContent = moves;

  drawBoard();

  if (isSolved()) endGame();
});

// -----------------------------
// SLIDE ON ARROW KEYS (Desktop)
// -----------------------------
document.addEventListener("keydown", e => {
  if (gameOver) return;

  let moved = false;
  switch (e.key) {
    case "ArrowUp": moved = trySlide("up"); break;
    case "ArrowDown": moved = trySlide("down"); break;
    case "ArrowLeft": moved = trySlide("left"); break;
    case "ArrowRight": moved = trySlide("right"); break;
  }
  if (moved) {
    moves++;
    movesCounter.textContent = moves;
    drawBoard();
    if (isSolved()) endGame();
  }
});

// -----------------------------
// SLIDE ON SWIPE (Mobile)
// -----------------------------
let touchStart = null;

board.addEventListener("touchstart", e => {
  if (gameOver) return;
  const touch = e.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
});

board.addEventListener("touchend", e => {
  if (gameOver || !touchStart) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 30) trySlide("right");
    else if (dx < -30) trySlide("left");
  } else {
    if (dy > 30) trySlide("down");
    else if (dy < -30) trySlide("up");
  }

  touchStart = null;
});

function trySlide(dir) {
  const empty = tiles.find(t => t.empty);
  let targetTile;
  switch(dir) {
    case "up": targetTile = tiles.find(t => t.x === empty.x && t.y === empty.y + 1 && !t.empty); break;
    case "down": targetTile = tiles.find(t => t.x === empty.x && t.y === empty.y - 1 && !t.empty); break;
    case "left": targetTile = tiles.find(t => t.x === empty.x + 1 && t.y === empty.y && !t.empty); break;
    case "right": targetTile = tiles.find(t => t.x === empty.x - 1 && t.y === empty.y && !t.empty); break;
  }
  if (targetTile) {
    slideTile(targetTile);
    return true;
  }
  return false;
}

// -----------------------------
// WIN CHECK
// -----------------------------
function isSolved() {
  return tiles.every(t =>
    t.empty ? (t.x === GRID-1 && t.y === GRID-1) : (t.x === t.correctX && t.y === t.correctY && t.rotation === 0)
  );
}

function endGame() {
  gameOver = true;
  setTimeout(() => alert(`🎉 Congrats! You solved it in ${moves} moves!`), 50);
}

// -----------------------------
// INITIALIZE GAME
// -----------------------------
drawFlag();
initTiles();
scramble();
drawBoard();
