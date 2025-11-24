// script.js - Side-Scroller Runner Game

// References to DOM elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const player = document.getElementById('player');
const scoreElem = document.getElementById('score');
const highscoreElem = document.getElementById('highscore');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let gameWidth, gameHeight;
let obstacles = [];
let obstacleSpeed = 3;
let obstacleInterval = 2000; // ms between obstacles
let lastObstacleTime = 0;
let score = 0;
let highscore = 0;
let gameRunning = false;
let playerX = 50;
let playerY = 0; // vertical offset for jump
let playerSpeed = 5;
let jumping = false;
let jumpStart = null;
const jumpDuration = 600; // ms total jump duration
const jumpHeight = 100; // px jump height
let keys = {};
let speedBoostActive = false;
let speedBoostTimeout = null;
let speedBoostDuration = 3000; // ms speed boost duration
let gameStartTime = 0;

// Initialize canvas size and listen for resize
function resizeCanvas() {
  gameWidth = canvas.width = canvas.clientWidth;
  gameHeight = canvas.height = canvas.clientHeight;
  player.style.bottom = '40px';
  player.style.left = `${playerX}px`;
}
window.addEventListener('resize', resizeCanvas);

function resetGame() {
  obstacles = [];
  obstacleSpeed = 3;
  lastObstacleTime = 0;
  score = 0;
  scoreElem.textContent = score;
  playerX = 50;
  player.style.left = `${playerX}px`;
  playerY = 0;
  jumping = false;
  player.classList.remove('jumping', 'speed-boost', 'power-up');
  clearTimeout(speedBoostTimeout);
  speedBoostActive = false;
  gameStartTime = performance.now();
}

function loadHighscore() {
  const saved = localStorage.getItem('runner_highscore');
  if (saved) highscore = parseInt(saved, 10);
  highscoreElem.textContent = highscore;
}

function saveHighscore() {
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('runner_highscore', highscore);
    highscoreElem.textContent = highscore;
  }
}

function createObstacle() {
  // Obstacle is a box from right side, with random height and fixed width
  const size = 30 + Math.random() * 20;
  const yPos = gameHeight - size - 40; // ground level is 40px from bottom
  return { x: gameWidth, y: yPos, width: size, height: size };
}

function createPowerUp() {
  // PowerUp is smaller box with distinct color and size
  const size = 25;
  const yPos = gameHeight - size - 40;
  return { x: gameWidth, y: yPos, width: size, height: size, isPowerUp: true };
}

function updateObstacles(deltaTime) {
  // Add obstacles or power-ups periodically
  if (performance.now() - lastObstacleTime > obstacleInterval) {
    lastObstacleTime = performance.now();
    if (Math.random() < 0.15) {
      obstacles.push(createPowerUp());
    } else {
      obstacles.push(createObstacle());
    }
  }

  // Move obstacles leftwards
  obstacles.forEach(o => {
    o.x -= obstacleSpeed + (speedBoostActive ? 3 : 0);
  });

  // Remove offscreen obstacles and increase score
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (o.x + o.width < 0) {
      obstacles.splice(i, 1);
      if (!o.isPowerUp) {
        score += 10;
        scoreElem.textContent = score;
        saveHighscore();
      }
    }
  }
}

function drawObstacles() {
  ctx.clearRect(0, 0, gameWidth, gameHeight);
  obstacles.forEach(o => {
    if (o.isPowerUp) {
      ctx.fillStyle = '#ebcb8b'; // gold color for power-up
      ctx.shadowColor = '#ebcb8b';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#4c566a';
      ctx.shadowBlur = 0;
    }
    ctx.fillRect(o.x, o.y, o.width, o.height);
    ctx.shadowBlur = 0;
  });
}

function rectsOverlap(r1, r2) {
  return !(r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y);
}

function checkCollision() {
  const playerRect = {
    x: playerX,
    y: gameHeight - 40 - 80 + playerY, // player's top-left corner in canvas coords
    width: 60,
    height: 80,
  };
  // Collides if any obstacle overlaps player's rect
  for (const o of obstacles) {
    if (rectsOverlap(playerRect, o)) {
      if (o.isPowerUp) {
        activateSpeedBoost();
        obstacles = obstacles.filter(obs => obs !== o);
      } else {
        return true;
      }
    }
  }
  return false;
}

function activateSpeedBoost() {
  if (speedBoostTimeout) clearTimeout(speedBoostTimeout);
  speedBoostActive = true;
  player.classList.add('speed-boost', 'power-up');
  speedBoostTimeout = setTimeout(() => {
    speedBoostActive = false;
    player.classList.remove('speed-boost', 'power-up');
  }, speedBoostDuration);
}

function updatePlayerPosition() {
  // Left/right movement
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    playerX = Math.max(0, playerX - (speedBoostActive ? playerSpeed * 1.5 : playerSpeed));
    player.classList.add('walking');
  } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    playerX = Math.min(gameWidth - 60, playerX + (speedBoostActive ? playerSpeed * 1.5 : playerSpeed));
    player.classList.add('walking');
  } else {
    player.classList.remove('walking');
  }
  player.style.left = playerX + 'px';

  // Jumping mechanics
  if (jumping) {
    const now = performance.now();
    const elapsed = now - jumpStart;
    if (elapsed >= jumpDuration) {
      jumping = false;
      playerY = 0;
      player.classList.remove('jumping');
    } else {
      // Parabolic jump calculation
      const t = elapsed / jumpDuration;
      playerY = jumpHeight * 4 * t * (1 - t);
      player.style.bottom = 40 + playerY + 'px';
    }
  } else {
    player.style.bottom = '40px';
  }
}

// Game loop
function gameLoop(timestamp) {
  if (!gameRunning) return;

  // Increase difficulty over time
  if (timestamp - gameStartTime > 10000) {
    obstacleSpeed = 5;
  }
  if (timestamp - gameStartTime > 20000) {
    obstacleSpeed = 7;
  }

  updateObstacles(timestamp);
  drawObstacles();
  updatePlayerPosition();

  if (checkCollision()) {
    gameOver();
    return;
  }

  requestAnimationFrame(gameLoop);
}

function gameOver() {
  gameRunning = false;
  alert('Game Over! Your Score: ' + score);
  restartBtn.style.display = 'inline-block';
  startBtn.style.display = 'none';
}

// Event handlers
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if ((e.key === ' ' || e.key === 'Spacebar') && !jumping && gameRunning) {
    jumping = true;
    jumpStart = performance.now();
    player.classList.add('jumping');
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Start game
startBtn.addEventListener('click', () => {
  resetGame();
  gameRunning = true;
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  requestAnimationFrame(gameLoop);
});

// Restart game
restartBtn.addEventListener('click', () => {
  resetGame();
  gameRunning = true;
  restartBtn.style.display = 'none';
  requestAnimationFrame(gameLoop);
});

// Initial setup
resizeCanvas();
loadHighscore();
