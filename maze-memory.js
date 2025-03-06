import { GestureEngine } from "./GestureEngine.js";
import { Vector2D } from "./Vector2D.js";
import { MovementEngine } from "./MovementEngine.js";
import { RenderEngine } from "./RenderEngine.js";
import { EventHandler } from "./EventHandler.js";
import { CONFIG, INPUT_MAP, DIRECTION_VECTORS } from "./config.js";

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

class MazeMemoryGame {
  constructor() {
    this.CONFIG = CONFIG; // Assign the imported CONFIG to a class property
    this.INPUT_MAP = INPUT_MAP; // Assign the imported INPUT_MAP to a class property
    this.DIRECTION_VECTORS = DIRECTION_VECTORS; // Assign the imported DIRECTION_VECTORS to a class property

    this.initializeCanvas();
    this.initializeGameState();
    this.loadGameState();

    if (window.innerWidth <= 480) {
      this.CONFIG.MAX_GRID_WIDTH = 11;
    }

    this.initializeGameConstants();

    this.movementEngine = new MovementEngine(this);
    this.renderEngine = new RenderEngine(this);
    this.eventHandler = new EventHandler(this);

    this.eventHandler.initializeEventHandlers();
    this.resetLevel(true);
    this.eventHandler.setupInputHandlers();
    window.addEventListener("resize", () => this.updateCanvasSize());
    this.lastTime = performance.now();
    this.accumulatedTime = 0;

    const isTouchSupported = "ontouchstart" in window;
    const joystickContainer = document.getElementById("joystick-container");

    if (isTouchSupported) {
      joystickContainer.style.display = "flex";
      this.setupGestureEngine();
      this.canvas.addEventListener(
        "touchstart",
        this.handleCanvasTap.bind(this)
      );
    } else {
      joystickContainer.style.display = "none";
    }

    this.gameLoop();
  }

  setupGestureEngine() {
    const joystick = document.getElementById("shoot");
    joystick.classList.remove("control-btn");
    joystick.classList.add("joystick");
    new GestureEngine(joystick, this);
  }

  handleInput(input) {
    this.eventHandler.handleInput(input);
  }

  handleCanvasTap(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const canvasRect = this.canvas.getBoundingClientRect();
    const tapX = touch.clientX - canvasRect.left;
    const tapY = touch.clientY - canvasRect.top;

    // Convert tap coordinates to grid coordinates
    const gridX = Math.floor(tapX / this.gridSize);
    const gridY = Math.floor((tapY - this.topBorderSize) / this.gridSize);

    // Check if the tap is within the chaos monster's bounds
    if (this.chaosMonster) {
      const monsterPos = this.chaosMonster.pos;
      const monsterGridX = Math.floor(monsterPos.x);
      const monsterGridY = Math.floor(monsterPos.y);
      const monsterRadius = (this.gridSize / 2) * CONFIG.TANK_RADIUS_SCALE;

      // Calculate the pixel position of the monster for more precise tap detection
      const monsterPixelX = monsterPos.x * this.gridSize + this.gridSize / 2;
      const monsterPixelY =
        monsterPos.y * this.gridSize + this.gridSize / 2 + this.topBorderSize;
      const distance = Math.sqrt(
        (tapX - monsterPixelX) ** 2 + (tapY - monsterPixelY) ** 2
      );

      if (distance <= monsterRadius) {
        console.log(
          "Chaos monster tapped! Moving tank to monster position:",
          monsterPos
        );
        // Move the tank directly to the monster's position
        this.tank.targetPos = monsterPos.copy();
        this.tank.ignoreCollisions = true; // Allow the tank to move through walls
        this.score.moves++; // Increment moves as this is a navigation action
      }
    }
  }

  initializeGameConstants() {
    const isLandscape = window.innerWidth > window.innerHeight;
    this.mazeWidth = isLandscape
      ? this.CONFIG.MAX_GRID_WIDTH
      : this.CONFIG.MIN_GRID_SIZE;
    this.mazeHeight = isLandscape
      ? Math.floor(this.CONFIG.MAX_GRID_HEIGHT / 2)
      : this.CONFIG.MIN_GRID_SIZE;
    this.level = this.level || 1;
    this.maxTargets = this.CONFIG.TARGETS_BASE;
  }

  initializeCanvas() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.controlsHeight = this.CONFIG.CONTROLS_HEIGHT;
    this.topBorderSize = 0;
    this.updateCanvasSize();
  }

  updateCanvasSize() {
    const windowWidth =
      window.innerWidth - this.CONFIG.CANVAS_MARGIN.HORIZONTAL;
    const windowHeight =
      window.innerHeight -
      this.CONFIG.CANVAS_MARGIN.VERTICAL -
      this.controlsHeight;

    this.canvas.width = windowWidth;
    this.bannerHeight = this.canvas.width * this.CONFIG.BANNER_HEIGHT_PERCENT;
    this.topBorderSize = this.bannerHeight;

    const maxGridHeight = windowHeight - this.bannerHeight;
    const isLandscape = window.innerWidth > window.innerHeight;

    // Adjust grid size to prioritize width in landscape
    const gridSizeWidth = Math.floor(windowWidth / this.mazeWidth);
    const gridSizeHeight = Math.floor(maxGridHeight / this.mazeHeight);
    this.gridSize = Math.max(
      this.CONFIG.GRID_SIZE,
      Math.min(gridSizeWidth, gridSizeHeight)
    );

    // Set canvas height to fit grid and banner
    this.canvas.height = this.mazeHeight * this.gridSize + this.bannerHeight;

    this.canvas.dataset.bannerHeight = this.bannerHeight;

    console.log(
      "Canvas resized: width=",
      this.canvas.width,
      "height=",
      this.canvas.height,
      "gridSize=",
      this.gridSize,
      "mazeWidth=",
      this.mazeWidth,
      "mazeHeight=",
      this.mazeHeight
    );
  }

  initializeGameState() {
    this.maze = [];
    this.tank = {
      pos: new Vector2D(0, 0),
      targetPos: new Vector2D(0, 0),
      dir: "right",
      currentAngle: 0,
      targetAngle: 0,
      rotationStart: null,
      ignoreCollisions: false,
    };
    this.chaosMonster = null;
    this.targets = [];
    this.bullets = [];
    this.powerUps = [];
    this.currentTarget = 1;
    this.showNumbers = true;
    this.numberTimer = CONFIG.INITIAL_NUMBER_TIMER;
    this.keysPressed = {};
    this.score = this.score || {
      hits: 0,
      lives: CONFIG.MAX_MISSES,
      total: 0,
      moves: 0,
    };
    this.gameOverDelay = 0;
    this.marker = null;
    this.gameOver = false;
    this.levelCleared = false;
    this.targetColors = [];
    this.colorIndex = 0;
    this.lastButtonDirection = null;
    this.showAllTimer = 0;
    this.showNextTimer = 0;
  }

  resetLevel(restartSameLevel = false) {
    if (this.gameOver && !restartSameLevel) return;

    const isLandscape = window.innerWidth > window.innerHeight;
    const levelCycle = (this.level - 1) % this.CONFIG.LEVELS_PER_CYCLE;
    const difficulty = Math.floor(
      (this.level - 1) / this.CONFIG.LEVELS_PER_CYCLE
    );

    this.mazeWidth = isLandscape
      ? Math.max(
          this.CONFIG.MIN_GRID_SIZE,
          Math.min(
            this.CONFIG.MAX_GRID_WIDTH,
            this.CONFIG.MIN_GRID_SIZE +
              (difficulty + levelCycle) * this.CONFIG.MAZE_SIZE_INCREMENT
          )
        )
      : Math.max(
          this.CONFIG.MIN_GRID_SIZE,
          Math.min(
            this.CONFIG.MAX_GRID_WIDTH,
            this.CONFIG.MIN_GRID_SIZE +
              (difficulty + levelCycle) * this.CONFIG.MAZE_SIZE_INCREMENT
          )
        );
    this.mazeHeight = isLandscape
      ? Math.max(
          this.CONFIG.MIN_GRID_SIZE,
          Math.min(
            Math.floor(this.CONFIG.MAX_GRID_HEIGHT / 2),
            this.CONFIG.MIN_GRID_SIZE +
              Math.floor(
                ((difficulty + levelCycle) * this.CONFIG.MAZE_SIZE_INCREMENT) /
                  2
              )
          )
        )
      : Math.max(
          this.CONFIG.MIN_GRID_SIZE,
          Math.min(
            this.CONFIG.MAX_GRID_HEIGHT,
            this.CONFIG.MIN_GRID_SIZE +
              (difficulty + levelCycle) * this.CONFIG.MAZE_SIZE_INCREMENT
          )
        );

    this.updateCanvasSize();

    this.maze = this.generateMaze(this.mazeWidth, this.mazeHeight);
    const startPos = this.getRandomOpenPosition();
    this.tank.pos = startPos.copy();
    this.tank.targetPos = startPos.copy();

    // Conditionally spawn chaos monster
    if (this.level >= this.CONFIG.CHAOS_MONSTER_START_LEVEL) {
      const monsterPos = this.getRandomOpenPosition();
      this.chaosMonster = {
        pos: monsterPos.copy(),
        origin: monsterPos.copy(),
        speed: this.CONFIG.CHAOS_MONSTER_SPEED + difficulty,
        holdingTarget: null,
        target: null,
      };
    } else {
      this.chaosMonster = null;
    }

    this.maxTargets =
      this.CONFIG.TARGETS_BASE +
      Math.floor((this.level - 1) / this.CONFIG.TARGETS_PER_LEVEL);
    this.targets = [];
    this.assignTargetColors();
    for (let i = 1; i <= this.maxTargets; i++) {
      let pos;
      do {
        pos = this.getRandomOpenPosition();
      } while (
        this.targets.some((t) => t.pos.equals(pos)) ||
        pos.equals(this.tank.pos) ||
        (this.chaosMonster && pos.equals(this.chaosMonster.pos))
      );
      this.targets.push({
        pos: pos,
        num: i,
        hit: false,
        flashTimer: 0,
        color: this.targetColors[i - 1],
      });
    }
    if (this.chaosMonster) {
      this.chaosMonster.target = this.findNearestTarget(this.chaosMonster.pos);
    }

    this.bullets = [];

    // Power-up accumulation logic
    if (this.level < this.CONFIG.POWER_UP_START_LEVEL) {
      this.powerUps = []; // No power-ups before level 7
    } else if (
      this.levelCleared &&
      !restartSameLevel &&
      this.powerUps.length < this.CONFIG.MAX_POWER_UP_COUNT
    ) {
      // Add one new power-up when clearing a level, if under max
      let pos;
      do {
        pos = this.getRandomOpenPosition();
      } while (
        this.targets.some((t) => t.pos.equals(pos)) ||
        pos.equals(this.tank.pos) ||
        (this.chaosMonster && pos.equals(this.chaosMonster.pos)) ||
        this.powerUps.some((p) => p.pos.equals(pos))
      );
      this.powerUps.push({
        pos: pos,
        opacity: 0,
        revealStart: performance.now(),
      });
    }
    // Otherwise, keep existing powerUps unchanged

    this.currentTarget = 1;
    this.showNumbers = true;
    this.numberTimer = this.CONFIG.INITIAL_NUMBER_TIMER;
    this.marker = null;

    if (this.level === 1 && !localStorage.getItem("tankMemoryMazeState")) {
      this.score.lives = this.CONFIG.MAX_MISSES;
      this.score.total = 0;
      this.score.hits = 0;
      this.powerUps = []; // Ensure no power-ups at level 1 start
    } else if (this.levelCleared && !restartSameLevel) {
      this.score.lives = Math.min(this.score.lives + 1, this.CONFIG.MAX_MISSES);
      const moveBonus = Math.max(0, 100 - this.score.moves * 2);
      this.score.total += this.score.hits * this.score.lives + moveBonus;
      this.level++;
    }

    this.score.moves = 0;
    this.levelCleared = false;
    this.saveGameState();
  }

  updateCanvasSize() {
    const windowWidth = window.innerWidth - CONFIG.CANVAS_MARGIN.HORIZONTAL;
    const windowHeight =
      window.innerHeight - CONFIG.CANVAS_MARGIN.VERTICAL - this.controlsHeight;
    const maxSizeWidth = windowWidth;
    const maxSizeHeight = windowHeight - this.bannerHeight;
    this.canvas.width = maxSizeWidth;
    this.bannerHeight = maxSizeWidth * CONFIG.BANNER_HEIGHT_PERCENT;
    this.canvas.height = maxSizeHeight + this.bannerHeight;
    this.gridSize = Math.floor(
      Math.min(maxSizeWidth / this.mazeWidth, maxSizeHeight / this.mazeHeight)
    );
    this.topBorderSize = this.bannerHeight;
    this.canvas.dataset.bannerHeight = this.bannerHeight;
  }

  generateMaze(width, height) {
    const maze = Array(height)
      .fill()
      .map(() => Array(width).fill(1));
    const directions = [
      [0, 2],
      [2, 0],
      [0, -2],
      [-2, 0],
    ];
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };
    const carve = (x, y) => {
      maze[y][x] = 0;
      const dirs = directions.slice();
      shuffle(dirs);
      for (let [dy, dx] of dirs) {
        const newY = y + dy;
        const newX = x + dx;
        if (
          newY > 0 &&
          newY < height - 1 &&
          newX > 0 &&
          newX < width - 1 &&
          maze[newY][newX] === 1
        ) {
          maze[y + dy / 2][x + dx / 2] = 0;
          carve(newX, newY);
        }
      }
    };
    carve(1, 1);
    for (let x = 0; x < width; x++) {
      maze[height - 1][x] = 1;
    }
    return maze;
  }

  getRandomOpenPosition() {
    let pos;
    do {
      pos = new Vector2D(
        Math.floor(Math.random() * this.mazeWidth),
        Math.floor(Math.random() * (this.mazeHeight - 1))
      );
    } while (this.maze[pos.y][pos.x] !== 0);
    return pos;
  }

  getRandomColor() {
    const niceColors = [
      "#8B4513",
      "#483D8B",
      "#A52A2A",
      "#4B0082",
      "#8A2BE2",
      "#9932CC",
      "#800080",
      "#B22222",
      "#4682B4",
      "#191970",
      "#9B30FF",
      "#CD5C5C",
      "#9400D3",
      "#FF4500",
      "#8B0000",
      "#4169E1",
      "#C71585",
      "#00008B",
      "#DC143C",
      "#6A5ACD",
      "#FF6347",
      "#7B68EE",
      "#DAA520",
      "#BA55D3",
    ];
    const color = niceColors[this.colorIndex % niceColors.length];
    this.colorIndex++;
    return color;
  }

  assignTargetColors() {
    this.targetColors = [];
    for (let i = 1; i <= this.maxTargets; i++) {
      this.targetColors[i - 1] = this.getRandomColor();
    }
  }

  isValidMove(pos) {
    return (
      pos.x >= 0 &&
      pos.x < this.mazeWidth &&
      pos.y >= 0 &&
      pos.y < this.mazeHeight &&
      this.maze[pos.y][pos.x] === 0
    );
  }

  isIntersection(pos, fromDir) {
    const directions = [
      { vec: new Vector2D(0, -1), dir: "up" },
      { vec: new Vector2D(0, 1), dir: "down" },
      { vec: new Vector2D(-1, 0), dir: "left" },
      { vec: new Vector2D(1, 0), dir: "right" },
    ];
    let openPaths = 0;
    directions.forEach((d) => {
      const newPos = pos.add(d.vec);
      if (this.isValidMove(newPos) && d.dir !== fromDir) openPaths++;
    });
    return openPaths > 1;
  }

  findNearestTarget(pos) {
    let nearestTarget = null;
    let minDistance = Infinity;
    this.targets.forEach((t) => {
      if (!t.hit) {
        const distance = pos.distanceTo(t.pos);
        if (distance < minDistance) {
          minDistance = distance;
          nearestTarget = t;
        }
      }
    });
    return nearestTarget;
  }

  update(deltaTime) {
    if (this.levelCleared) return;

    if (this.showNumbers && this.numberTimer > 0) {
      this.numberTimer -= deltaTime * 1000;
      if (this.numberTimer <= 0) this.showNumbers = false;
      return;
    }

    if (this.showAllTimer > 0) {
      this.showAllTimer -= deltaTime * 1000;
      if (this.showAllTimer < 0) this.showAllTimer = 0;
    }

    if (this.showNextTimer > 0) {
      this.showNextTimer -= deltaTime * 1000;
      if (this.showNextTimer < 0) this.showNextTimer = 0;
    }

    if (!this.gameOver) {
      this.movementEngine.updateTank(deltaTime);
      this.movementEngine.updateChaosMonster(deltaTime);
      this.movementEngine.updateBullets(deltaTime);

      this.powerUps.forEach((p) => {
        if (p.revealStart !== null) {
          const elapsed = performance.now() - p.revealStart;
          const duration = 1000;
          if (elapsed < duration) {
            p.opacity = Math.min(1, elapsed / duration);
          } else {
            p.opacity = 1;
            p.revealStart = null;
          }
        }
      });

      this.targets.forEach((t) => {
        if (t.flashTimer > 0) {
          t.flashTimer -= deltaTime * 1000;
          if (t.flashTimer < 0) t.flashTimer = 0;
        }
      });
    }

    if (this.score.lives <= 0) {
      if (!this.gameOver) {
        this.gameOver = true;
        this.gameOverDelay = CONFIG.GAME_OVER_DELAY;
      }
      this.gameOverDelay -= deltaTime * 1000;
      if (this.gameOverDelay <= 0) {
        this.gameOver = false;
        this.score.lives = CONFIG.MAX_MISSES;
        if (this.level > 1) this.level--;
        this.resetLevel(true);
        this.saveGameState();
      }
    } else if (this.targets.every((t) => t.hit)) {
      this.levelCleared = true;
      setTimeout(() => this.resetLevel(), CONFIG.LEVEL_CLEAR_DELAY);
    }
  }

  saveGameState() {
    const gameState = {
      level: this.level,
      score: {
        total: this.score.total,
        hits: this.score.hits,
      },
    };
    localStorage.setItem("tankMemoryMazeState", JSON.stringify(gameState));
  }

  loadGameState() {
    const savedState = localStorage.getItem("tankMemoryMazeState");
    if (savedState) {
      const gameState = JSON.parse(savedState);
      this.level = gameState.level;
      this.score.total = gameState.score.total;
      this.score.hits = gameState.score.hits;
    }
  }

  clearGameState() {
    localStorage.removeItem("tankMemoryMazeState");
  }

  gameLoop(currentTime = performance.now()) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulatedTime += deltaTime;

    while (this.accumulatedTime >= CONFIG.FRAME_DELTA) {
      this.update(CONFIG.FRAME_DELTA / 1000);
      this.accumulatedTime -= CONFIG.FRAME_DELTA;
    }

    this.renderEngine.draw();
    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

export function run() {
  new MazeMemoryGame();
}
