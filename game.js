// -----------------------------
// CONFIG
// -----------------------------
const TILE_SIZE = 80; // tile size
const ROWS = 3;
const COLS = 3;
const SCRAMBLE_STEPS = 30;
const TWIST_ROTATION_INTERVAL = 5; // Rotate board every 5 moves in twist mode

// Empty slot inside the 3x3 square (starting position)
const emptySlot = { row: 2, col: 2 };

// Get today's date for puzzle seeding
function getTodaysSeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

// Seeded random number generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

let random = new SeededRandom(getTodaysSeed());

// Generate daily colors based on seed
function generateDailyColors(){
  const colors = [];
  const baseHues = [];
  
  // Generate 8 random hues for today's puzzle
  for(let i = 0; i < 8; i++){
    baseHues.push(Math.floor(random.next() * 360));
  }
  
  // Convert hues to colors
  baseHues.forEach(hue => {
    colors.push(`hsl(${hue}, 70%, 50%)`);
  });
  
  return colors;
}

const dailyColors = generateDailyColors();

let moves = 0;
let optimalMoves = 0;
let gameOver = false;
let tiles = [];
let gameMode = null; // "classic" or "twist"
let boardRotation = 0; // For twist mode: 0, 90, 180, 270

// -----------------------------
// HTML ELEMENTS
// -----------------------------
const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const classicBtn = document.getElementById("classicBtn");
const twistBtn = document.getElementById("twistBtn");
const backBtn = document.getElementById("backBtn");
const gameTitle = document.getElementById("gameTitle");
const gameModeDesc = document.getElementById("gameModeDesc");

const targetCanvas = document.getElementById("target");
const tctx = targetCanvas.getContext("2d");

const referenceCanvas = document.getElementById("referenceCanvas");
const rctx = referenceCanvas.getContext("2d");

const board = document.getElementById("board");
const ctx = board.getContext("2d");

const movesCounter = document.getElementById("moves");

// Menu button handlers
classicBtn.addEventListener("click", () => startGame("classic"));
twistBtn.addEventListener("click", () => startGame("twist"));
backBtn.addEventListener("click", () => {
  gameMode = null;
  boardRotation = 0;
  menuScreen.style.display = "block";
  gameScreen.style.display = "none";
});

function updateDebugDisplay(){
  // Debug display removed
}

// -----------------------------
// DRAW TARGET IMAGE (for tile rendering)
function drawFlag(){
  const SIZE = targetCanvas.width;
  const tileSize = SIZE / 3;
  
  // Define the snake path through the tiles: 0->1->2->5->4->3->6->7 (skipping 8 which is empty)
  const snakePath = [
    { row: 0, col: 0 },   // tile 1
    { row: 0, col: 1 },   // tile 2
    { row: 0, col: 2 },   // tile 3
    { row: 1, col: 2 },   // tile 4
    { row: 1, col: 1 },   // tile 5
    { row: 1, col: 0 },   // tile 6
    { row: 2, col: 0 },   // tile 7
    { row: 2, col: 1 }    // tile 8
    // Empty slot at [2,2] - no tile
  ];
  
  // Fill each tile with daily color and add number
  snakePath.forEach((tile, index) => {
    const x = tile.col * tileSize;
    const y = tile.row * tileSize;
    tctx.fillStyle = dailyColors[index];
    tctx.fillRect(x, y, tileSize, tileSize);
    
    // Draw a number to show order and rotation
    tctx.fillStyle = "white";
    tctx.font = "bold 30px Arial";
    tctx.textAlign = "center";
    tctx.textBaseline = "middle";
    tctx.fillText(index + 1, x + tileSize/2, y + tileSize/2);
  });
}

// -----------------------------
// INIT TILES
function initTiles(){
  tiles = [];
  let id = 0;
  for(let row=0; row<ROWS; row++){
    for(let col=0; col<COLS; col++){
      // Skip the empty slot position
      if(row === emptySlot.row && col === emptySlot.col) continue;
      
      tiles.push({
        id: id++,
        row,
        col,
        correctRow: row,
        correctCol: col,
        rotation: 0,
        empty: false
      });
    }
  }
}

// -----------------------------
// SCRAMBLE
function scramble(steps=SCRAMBLE_STEPS){
  for(let i=0;i<steps;i++){
    const movable = tiles.filter(canSlide);
    if(movable.length===0) continue;
    const t = movable[Math.floor(random.next()*movable.length)];
    if(random.next()<0.5) slideTile(t);
    else t.rotation = (t.rotation + 90) % 360;
  }
  
  // Calculate optimal moves: count tiles that are out of place or have wrong rotation
  optimalMoves = 0;
  tiles.forEach(tile => {
    if(tile.row !== tile.correctRow || tile.col !== tile.correctCol){
      optimalMoves++; // Need to slide this tile
    }
    if(tile.rotation !== 0){
      optimalMoves++; // Need to rotate this tile
    }
  });
  
  // Calculate actual optimal using BFS
  optimalMoves = calculateOptimalMoves();
}

// Calculate optimal moves using A* with Manhattan distance heuristic
function calculateOptimalMoves(){
  // Create a state string from puzzle state
  function stateToString(tls, empty) {
    return tls.map(t => `${t.id}:${t.row},${t.col},${t.rotation}`).join("|");
  }
  
  // Calculate Manhattan distance heuristic
  function heuristic(tls) {
    let distance = 0;
    tls.forEach(t => {
      distance += Math.abs(t.row - t.correctRow) + Math.abs(t.col - t.correctCol);
      distance += (t.rotation !== 0 ? 1 : 0); // Add cost for rotation
    });
    return distance;
  }
  
  // Create goal state string
  function getGoalStateString() {
    const goalTiles = [];
    for(let id=0; id<8; id++){
      const tile = tiles.find(t => t.id === id);
      goalTiles.push(`${tile.id}:${tile.correctRow},${tile.correctCol},0`);
    }
    return goalTiles.join("|");
  }
  
  const goalState = getGoalStateString();
  const currentState = stateToString(tiles, emptySlot);
  
  if(currentState === goalState) return 0;
  
  // A* - priority queue ordered by f = g + h
  const openSet = []; // {state, tiles, empty, g (moves), h (heuristic), f (total)}
  const initialState = {
    state: currentState,
    tiles: JSON.parse(JSON.stringify(tiles)),
    empty: {...emptySlot},
    g: 0,
    h: heuristic(tiles),
    f: heuristic(tiles)
  };
  openSet.push(initialState);
  
  const visited = new Set();
  
  let iterations = 0;
  const MAX_ITERATIONS = 50000;
  
  while(openSet.length > 0 && iterations < MAX_ITERATIONS){
    iterations++;
    
    // Find node with lowest f score
    let currentIdx = 0;
    for(let i = 1; i < openSet.length; i++){
      if(openSet[i].f < openSet[currentIdx].f){
        currentIdx = i;
      }
    }
    
    const current = openSet.splice(currentIdx, 1)[0];
    
    if(current.state === goalState) return current.g;
    
    if(visited.has(current.state)) continue;
    visited.add(current.state);
    
    const currentTiles = current.tiles;
    const currentEmpty = current.empty;
    
    // Try sliding adjacent tiles
    const directions = [{row: -1, col: 0}, {row: 1, col: 0}, {row: 0, col: -1}, {row: 0, col: 1}];
    
    for(let dir of directions){
      const newRow = currentEmpty.row + dir.row;
      const newCol = currentEmpty.col + dir.col;
      
      if(newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS){
        const tileIdx = currentTiles.findIndex(t => t.row === newRow && t.col === newCol);
        if(tileIdx >= 0){
          const newTiles = JSON.parse(JSON.stringify(currentTiles));
          newTiles[tileIdx].row = currentEmpty.row;
          newTiles[tileIdx].col = currentEmpty.col;
          
          const newEmpty = {row: newRow, col: newCol};
          const newState = stateToString(newTiles, newEmpty);
          
          if(!visited.has(newState)){
            const newG = current.g + 1;
            const newH = heuristic(newTiles);
            const newF = newG + newH;
            
            openSet.push({
              state: newState,
              tiles: newTiles,
              empty: newEmpty,
              g: newG,
              h: newH,
              f: newF
            });
          }
        }
      }
    }
    
    // Try rotating tiles (only if it improves heuristic)
    for(let i = 0; i < currentTiles.length; i++){
      if(currentTiles[i].rotation !== 0){ // Only rotate if not already at 0
        const newTiles = JSON.parse(JSON.stringify(currentTiles));
        newTiles[i].rotation = (newTiles[i].rotation + 90) % 360;
        const newState = stateToString(newTiles, currentEmpty);
        
        if(!visited.has(newState)){
          const newG = current.g + 1;
          const newH = heuristic(newTiles);
          const newF = newG + newH;
          
          openSet.push({
            state: newState,
            tiles: newTiles,
            empty: currentEmpty,
            g: newG,
            h: newH,
            f: newF
          });
        }
      }
    }
  }
  
  return 30; // Fallback
}

// -----------------------------
// DRAW BOARD + REFERENCE
function drawBoard(){
  ctx.clearRect(0,0,board.width,board.height);

  // Draw puzzle tiles
  tiles.forEach(tile=>{
    // Skip drawing the tile if it's at the empty slot position
    if(tile.row === emptySlot.row && tile.col === emptySlot.col) return;

    const x = tile.col*TILE_SIZE;
    const y = tile.row*TILE_SIZE;

    ctx.save();
    
    // Apply board rotation for twist mode
    if(gameMode === "twist" && boardRotation !== 0){
      const centerX = TILE_SIZE * 1.5;
      const centerY = TILE_SIZE * 1.5;
      ctx.translate(centerX, centerY);
      ctx.rotate(boardRotation * Math.PI / 180);
      ctx.translate(-centerX, -centerY);
    }
    
    ctx.translate(x + TILE_SIZE/2, y + TILE_SIZE/2);
    ctx.rotate(tile.rotation * Math.PI/180);

    const sx = tile.correctCol*TILE_SIZE;
    const sy = tile.correctRow*TILE_SIZE;

    ctx.drawImage(targetCanvas, sx, sy, TILE_SIZE, TILE_SIZE, -TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);

    ctx.restore();
  });

  // Draw empty slot outline
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(emptySlot.col*TILE_SIZE, emptySlot.row*TILE_SIZE, TILE_SIZE, TILE_SIZE);
  
  updateDebugDisplay();
}

// DRAW REFERENCE IMAGE
function drawReference(){
  rctx.clearRect(0,0,referenceCanvas.width,referenceCanvas.height);
  
  // Draw the target image on the reference canvas
  const SIZE = referenceCanvas.width;
  const tileSize = SIZE / 3;
  
  // Define the snake path through the tiles: 0->1->2->5->4->3->6->7 (skipping 8 which is empty)
  const snakePath = [
    { row: 0, col: 0 },   // tile 1
    { row: 0, col: 1 },   // tile 2
    { row: 0, col: 2 },   // tile 3
    { row: 1, col: 2 },   // tile 4
    { row: 1, col: 1 },   // tile 5
    { row: 1, col: 0 },   // tile 6
    { row: 2, col: 0 },   // tile 7
    { row: 2, col: 1 }    // tile 8
    // Empty slot at [2,2] - no tile
  ];
  
  // Fill each tile with daily color and add number
  snakePath.forEach((tile, index) => {
    const x = tile.col * tileSize;
    const y = tile.row * tileSize;
    rctx.fillStyle = dailyColors[index];
    rctx.fillRect(x, y, tileSize, tileSize);
    
    // Draw a number to show order
    rctx.fillStyle = "white";
    rctx.font = "bold 30px Arial";
    rctx.textAlign = "center";
    rctx.textBaseline = "middle";
    rctx.fillText(index + 1, x + tileSize/2, y + tileSize/2);
  });
  
  // Draw white square for the empty slot position
  const emptyX = emptySlot.col * tileSize;
  const emptyY = emptySlot.row * tileSize;
  rctx.fillStyle = "white";
  rctx.fillRect(emptyX, emptyY, tileSize, tileSize);
}

// -----------------------------
// HELPER FUNCTIONS
function canSlide(tile){
  const rowDiff = Math.abs(tile.row - emptySlot.row);
  const colDiff = Math.abs(tile.col - emptySlot.col);
  return (rowDiff + colDiff) === 1;
}

function slideTile(tile){
  if(!canSlide(tile)) return false;
  const tempRow = tile.row;
  const tempCol = tile.col;

  tile.row = emptySlot.row;
  tile.col = emptySlot.col;

  emptySlot.row = tempRow;
  emptySlot.col = tempCol;
  return true;
}

// -----------------------------
// ROTATE ON CLICK / TAP
board.addEventListener("click", e=>{
  if(gameOver) return;
  const rect = board.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  // Account for board rotation in twist mode
  if(gameMode === "twist" && boardRotation !== 0){
    const centerX = TILE_SIZE * 1.5;
    const centerY = TILE_SIZE * 1.5;
    
    // Translate to center
    x -= centerX;
    y -= centerY;
    
    // Rotate back by the board rotation amount
    const angle = -(boardRotation * Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newX = x * cos - y * sin;
    const newY = x * sin + y * cos;
    
    // Translate back
    x = newX + centerX;
    y = newY + centerY;
  }

  const tile = tiles.find(t=>!t.empty &&
    x >= t.col*TILE_SIZE && x < t.col*TILE_SIZE + TILE_SIZE &&
    y >= t.row*TILE_SIZE && y < t.row*TILE_SIZE + TILE_SIZE
  );
  if(!tile) return;

  tile.rotation = (tile.rotation + 90) % 360;
  moves++;
  movesCounter.textContent = moves;
  
  // In twist mode, rotate board every 5 moves
  if(gameMode === "twist" && moves % TWIST_ROTATION_INTERVAL === 0){
    boardRotation = (boardRotation + 90) % 360;
  }
  
  drawBoard();
  checkWin();
});

// -----------------------------
// SLIDE ON ARROWS
document.addEventListener("keydown", e=>{
  if(gameOver) return;
  let moved = false;
  switch(e.key){
    case "ArrowUp": moved = trySlide("up"); break;
    case "ArrowDown": moved = trySlide("down"); break;
    case "ArrowLeft": moved = trySlide("left"); break;
    case "ArrowRight": moved = trySlide("right"); break;
  }
  if(moved){
    moves++;
    movesCounter.textContent = moves;
    
    // In twist mode, rotate board every 5 moves
    if(gameMode === "twist" && moves % TWIST_ROTATION_INTERVAL === 0){
      boardRotation = (boardRotation + 90) % 360;
    }
    
    drawBoard();
    checkWin();
  }
});

function trySlide(dir){
  // In twist mode, adjust direction based on board rotation
  if(gameMode === "twist" && boardRotation !== 0){
    const rotations = Math.round(boardRotation / 90);
    const directions = ["up", "right", "down", "left"];
    const dirIndex = directions.indexOf(dir);
    const adjustedIndex = (dirIndex - rotations + 4) % 4;
    dir = directions[adjustedIndex];
  }
  
  let target;
  switch(dir){
    case "up": target = tiles.find(t=>t.row===emptySlot.row+1 && t.col===emptySlot.col); break;
    case "down": target = tiles.find(t=>t.row===emptySlot.row-1 && t.col===emptySlot.col); break;
    case "left": target = tiles.find(t=>t.row===emptySlot.row && t.col===emptySlot.col+1); break;
    case "right": target = tiles.find(t=>t.row===emptySlot.row && t.col===emptySlot.col-1); break;
  }
  if(target){
    slideTile(target);
    return true;
  }
  return false;
}

// -----------------------------
// SWIPE FOR MOBILE
let touchStart = null;
board.addEventListener("touchstart", e=>{
  const t = e.touches[0];
  touchStart = {x:t.clientX, y:t.clientY};
});

board.addEventListener("touchend", e=>{
  if(!touchStart || gameOver) return;
  let dx = e.changedTouches[0].clientX - touchStart.x;
  let dy = e.changedTouches[0].clientY - touchStart.y;

  // Account for board rotation in twist mode
  if(gameMode === "twist" && boardRotation !== 0){
    const angle = -(boardRotation * Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newDx = dx * cos - dy * sin;
    const newDy = dx * sin + dy * cos;
    dx = newDx;
    dy = newDy;
  }

  let moved = false;
  if(Math.abs(dx) > Math.abs(dy)){
    if(dx>30) moved = trySlide("right");
    else if(dx<-30) moved = trySlide("left");
  } else {
    if(dy>30) moved = trySlide("down");
    else if(dy<-30) moved = trySlide("up");
  }
  
  if(moved){
    moves++;
    movesCounter.textContent = moves;
    
    // In twist mode, rotate board every 5 moves
    if(gameMode === "twist" && moves % TWIST_ROTATION_INTERVAL === 0){
      boardRotation = (boardRotation + 90) % 360;
    }
    
    drawBoard();
    checkWin();
  }
  touchStart = null;
});

// -----------------------------
// WIN CHECK
function checkWin(){
  if(gameOver) return; // Already won
  
  const won = tiles.every(t => t.row === t.correctRow && t.col === t.correctCol && t.rotation === 0);
  
  if(won){
    gameOver = true;
    const difference = moves - optimalMoves;
    const message = difference === 0 
      ? `🎉 Perfect! You solved it in ${moves} moves (optimal)!`
      : `🎉 Congrats! You solved it in ${moves} moves.\nOptimal: ${optimalMoves} moves\nYou used ${difference} extra moves.`;
    setTimeout(() => alert(message), 100);
  }
}

// -----------------------------
// INITIALIZE GAME
function initGame(){
  drawFlag();
  drawReference();
  initTiles();
  scramble();

  moves=0;
  boardRotation = 0;
  gameOver = false;
  movesCounter.textContent = moves;
  drawBoard();
}

// START GAME WITH MODE SELECTION
function startGame(mode){
  gameMode = mode;
  
  if(mode === "classic"){
    gameTitle.textContent = "One Move - Classic";
    gameModeDesc.textContent = "Click/tap to rotate. Slide tiles into the empty slot (bottom-right).";
  } else if(mode === "twist"){
    gameTitle.textContent = "One Move - Twist";
    gameModeDesc.textContent = "Click/tap to rotate. Slide tiles into the empty slot. Board rotates every 5 moves!";
  }
  
  menuScreen.style.display = "none";
  gameScreen.style.display = "block";
  
  initGame();
}

// Initially show menu
menuScreen.style.display = "block";
gameScreen.style.display = "none";

