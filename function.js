// Game elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const finalScoreElement = document.getElementById('final-score');
const finalHighScoreElement = document.getElementById('final-high-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');

// Game variables
let bird = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  velocity: 0,
  gravity: 0,
  jumpForce: 0
};

let pipes = [];
let pipeWidth = 0;
let pipeGap = 0;
let pipeSpeed = 0;
let pipeFrequency = 0;
let lastPipeTime = 0;
let score = 0;
let highScore = localStorage.getItem('flappyBirdHighScore') || 0;
let gameRunning = false;
let gamePaused = false;
let animationId;
let groundOffset = 0;
let backgroundOffset = 0;

// Scaling factors based on screen size
let scaleFactor = 1;

// Images
const birdImg = new Image();
birdImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 20"><path d="M70,10 Q75,5 70,0 L15,10 L70,20 Q75,15 70,10 Z" fill="%23FFD700"/><circle cx="60" cy="8" r="3" fill="%23000"/><path d="M70,10 L75,8 L73,10 L75,12 Z" fill="%23FF8C00"/></svg>';

const pipeTopImg = new Image();
const pipeBottomImg = new Image();
const backgroundImg = new Image();
const groundImg = new Image();

pipeTopImg.src = pipeBottomImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="100"><rect width="60" height="100" fill="%23008000"/><rect x="5" width="50" height="100" fill="%2300A000" rx="5" ry="5"/></svg>';

backgroundImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="%2387CEEB"/><circle cx="60" cy="100" r="25" fill="white" opacity="0.5"/><circle cx="110" cy="120" r="30" fill="white" opacity="0.5"/><path d="M0,450 Q100,430 200,450 T400,450 L400,600 L0,600 Z" fill="%237CFC00"/><path d="M50,400 Q150,350 250,400 T450,400 L450,600 L50,600 Z" fill="%23228B22"/></svg>';

groundImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="20"><rect width="400" height="20" fill="%238B4513"/><path d="M0,15 Q25,5 50,15 T400,15" stroke="%23A0522D" stroke-width="2" fill="none"/></svg>';

// Set canvas size based on container
function resizeCanvas() {
  const container = document.getElementById('game-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

// Initial resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function initGame() {
  // Set game parameters based on canvas size
  scaleFactor = canvas.width / 400;
  
  bird = {
    x: canvas.width * 0.25,
    y: canvas.height / 2,
    width: 75 * scaleFactor,
    height: 20 * scaleFactor,
    velocity: 0,
    gravity: 0.3 * scaleFactor,
    jumpForce: -6 * scaleFactor
  };
  
  pipeWidth = 60 * scaleFactor;
  pipeGap = 165 * scaleFactor;
  pipeSpeed = 2 * scaleFactor;
  pipeFrequency = 1500;
  
  pipes = [];
  score = 0;
  scoreDisplay.textContent = score;
  highScoreDisplay.textContent = `High Score: ${highScore}`;
  gameRunning = true;
  gamePaused = false;
  lastPipeTime = 0;
  backgroundOffset = 0;
  groundOffset = 0;
  pauseBtn.textContent = '⏸️';

  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  pauseBtn.style.display = 'block';

  gameLoop();
}

function gameLoop(timestamp) {
  if (!gameRunning || gamePaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background with parallax effect
  backgroundOffset = (backgroundOffset + pipeSpeed * 0.5) % canvas.width;
  ctx.drawImage(backgroundImg, -backgroundOffset, 0, canvas.width, canvas.height);
  ctx.drawImage(backgroundImg, canvas.width - backgroundOffset, 0, canvas.width, canvas.height);

  updatePipes(timestamp);
  drawPipes();
  updateBird();
  drawBird();
  checkCollisions();
  drawGround();

  scoreDisplay.textContent = score;

  animationId = requestAnimationFrame(gameLoop);
}

function updateBird() {
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  let rotation = Math.min(Math.max(bird.velocity * 5, -30), 30);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
  ctx.restore();
}

function updatePipes(timestamp) {
  if (timestamp - lastPipeTime > pipeFrequency) {
    createPipe();
    lastPipeTime = timestamp;

    if (score > 0 && score % 5 === 0) {
      pipeSpeed = Math.min(pipeSpeed + (0.2 * scaleFactor), 5 * scaleFactor);
      pipeFrequency = Math.max(pipeFrequency - 50, 1000);
    }
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= pipeSpeed;

    if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
      pipes[i].passed = true;
      // Only increment score for bottom pipe to avoid double counting
      if (!pipes[i].top) {
        score++;
      }
    }

    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }
}

function createPipe() {
  const minPipeHeight = 50 * scaleFactor;
  const maxPipeHeight = canvas.height - pipeGap - (150 * scaleFactor);
  const pipeHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;
  
  pipes.push({ 
    x: canvas.width, 
    y: 0, 
    height: pipeHeight, 
    passed: false, 
    top: true,
    pairId: Date.now() // Unique identifier for pipe pairs
  });
  
  pipes.push({ 
    x: canvas.width, 
    y: pipeHeight + pipeGap, 
    height: canvas.height - pipeHeight - pipeGap - (20 * scaleFactor), 
    passed: false, 
    top: false,
    pairId: Date.now() // Same ID for matching pair
  });
}

function drawPipes() {
  pipes.forEach(pipe => {
    const pipeImg = pipe.top ? pipeTopImg : pipeBottomImg;
    const scaledWidth = pipeWidth;
    const scaledHeight = pipe.height;
    
    ctx.drawImage(pipeImg, pipe.x, pipe.y, scaledWidth, scaledHeight);
  });
}

function drawGround() {
  const groundHeight = 20 * scaleFactor;
  groundOffset = (groundOffset + pipeSpeed) % (20 * scaleFactor);
  
  ctx.drawImage(
    groundImg, 
    -groundOffset, 
    canvas.height - groundHeight, 
    canvas.width + groundOffset, 
    groundHeight
  );
}

function checkCollisions() {
  // Check ground collision
  if (bird.y + bird.height > canvas.height - (20 * scaleFactor)) {
    gameOver();
    return;
  }
  
  // Check ceiling collision
  if (bird.y < 0) {
    bird.y = 0;
    bird.velocity = 0;
  }
  
  // Check pipe collisions
  for (let i = 0; i < pipes.length; i++) {
    const pipe = pipes[i];
    
    // Check if bird is horizontally aligned with this pipe
    if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipeWidth) {
      // For top pipes, check if bird is above the pipe bottom
      if (pipe.top && bird.y < pipe.height) {
        gameOver();
        return;
      }
      // For bottom pipes, check if bird is below the pipe top
      if (!pipe.top && bird.y + bird.height > pipe.y) {
        gameOver();
        return;
      }
    }
  }
}

function gameOver() {
  gameRunning = false;
  cancelAnimationFrame(animationId);

  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyBirdHighScore', highScore);
  }

  finalScoreElement.textContent = score;
  finalHighScoreElement.textContent = highScore;
  gameOverScreen.style.display = 'flex';
  pauseBtn.style.display = 'none';
}

function togglePause() {
  if (!gameRunning) return;
  gamePaused = !gamePaused;
  pauseBtn.textContent = gamePaused ? '▶️' : '⏸️';
  if (!gamePaused) {
    lastPipeTime = performance.now() - (pipeFrequency - 100);
    gameLoop();
  }
}

function flap() {
  if (gameRunning && !gamePaused) {
    bird.velocity = bird.jumpForce;
  }
}

// Event Listeners
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);
pauseBtn.addEventListener('click', togglePause);

// Touch controls
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  flap();
}, { passive: false });

// Click/tap controls
canvas.addEventListener('mousedown', flap);
canvas.addEventListener('click', flap);

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    flap();
  } else if (e.code === 'KeyP') {
    togglePause();
  } else if (e.code === 'KeyR' && !gameRunning) {
    initGame();
  }
});

// Prevent scrolling on mobile when touching game area
document.addEventListener('touchmove', (e) => {
  if (gameRunning) {
    e.preventDefault();
  }
}, { passive: false });

// Initialize High Score
highScoreDisplay.textContent = `High Score: ${highScore}`;

// Set initial bird position after canvas is sized
setTimeout(() => {
  bird.x = canvas.width * 0.25;
  bird.y = canvas.height / 2;
}, 100);