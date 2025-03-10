import { GestureEngine } from "./GestureEngine.js";
import { Vector2D } from "./Vector2D.js";
import { MovementEngine } from "./MovementEngine.js";
import { RenderEngine } from "./RenderEngine.js";
import { EventHandler } from "./EventHandler.js";
import { CONFIG, INPUT_MAP, DIRECTION_VECTORS } from "./config.js";
import { clamp, range } from "./fun.js";
import { Tank, ChaosMonster, Target, Bullet, PowerUp, Score } from "./Types.js";

export class MazeMemoryGame {
  CONFIG = CONFIG;
  INPUT_MAP = INPUT_MAP;
  DIRECTION_VECTORS = DIRECTION_VECTORS;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  controlsHeight: number;
  topBorderSize: number;
  cellSize: number;
  mazeColCount: number;
  mazeRowCount: number;
  movementEngine: MovementEngine;
  renderEngine: RenderEngine;
  eventHandler: EventHandler;

  maze: number[][];
  tank: Tank;
  chaosMonster: ChaosMonster | null;
  targets: Target[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  currentTarget: number;
  numberTimer: number;
  keysPressed: { [key: string]: boolean };
  score: Score;
  gameOverDelay: number;
  marker: Vector2D | null;
  gameOver: boolean;
  levelCleared: boolean;
  targetColors: string[];
  colorIndex: number;
  lastButtonDirection: string | null;
  showAllTimer: number;
  showNextTimer: number;
  level: number;
  maxTargets: number;
  lastTime: number;
  accumulatedTime: number;

  constructor() {
    this.initializeCanvas();
    this.initializeGameState();
    this.loadGameState();

    this.initializeGameConstants();

    this.movementEngine = new MovementEngine(this);
    this.renderEngine = new RenderEngine(this);
    this.eventHandler = new EventHandler(this);

    this.eventHandler.initializeEventHandlers();
    this.eventHandler.setupInputHandlers();
    window.addEventListener("resize", () => this.resetLevel(true));
    this.lastTime = performance.now();
    this.accumulatedTime = 0;

    const joystickContainer = document.getElementById("joystick-container");

    if (this.CONFIG.DEVICE_FLAG.isTouchSupported) {
      joystickContainer!.style.display = "flex";
      this.setupGestureEngine();
      this.canvas.addEventListener(
        "touchstart",
        this.handleCanvasTap.bind(this)
      );
    } else {
      joystickContainer!.style.display = "none";
    }

    this.resetLevel(true);
    this.gameLoop();
  }

  setupGestureEngine() {
    const joystick = document.getElementById("shoot")!;
    joystick.classList.remove("control-btn");
    joystick.classList.add("joystick");
    new GestureEngine(joystick, this);
  }

  handleInput(input: any) {
    this.eventHandler.handleInput(input);
  }

  handleCanvasTap(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const canvasRect = this.canvas.getBoundingClientRect();
    const tapX = touch.clientX - canvasRect.left;
    const tapY = touch.clientY - canvasRect.top - this.topBorderSize; // Adjust for banner

    // Convert tap coordinates to grid coordinates
    const gridX = Math.floor(tapX / this.cellSize);
    const gridY = Math.floor(tapY / this.cellSize);

    // Check if the tap is within the maze bounds
    if (
      gridX >= 0 &&
      gridX < this.mazeColCount &&
      gridY >= 0 &&
      gridY < this.mazeRowCount
    ) {
      const tappedPos = new Vector2D(gridX, gridY);

      if (this.marker && this.marker.equals(tappedPos)) {
        this.tank.targetPos = this.marker.copy();
        this.marker = null;
      } else {
        // No marker or tapped a new cell: place or move marker
        this.marker = this.tank.pos.copy();
      }
    } else {
      console.log("Tap outside maze bounds:", gridX, gridY);
    }
  }

  initializeGameConstants() {
    this.level = this.level || 1;
    this.maxTargets = this.CONFIG.TARGETS_BASE;
  }

  initializeCanvas() {
    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.controlsHeight = this.CONFIG.CONTROLS_HEIGHT;
    this.topBorderSize = 0;
    this.updateCanvasSize();
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
    this.numberTimer = this.CONFIG.INITIAL_NUMBER_TIMER;
    this.keysPressed = {};
    this.score = this.score || {
      hits: 0,
      lives: this.CONFIG.MAX_MISSES,
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

  resetLevel(restartSameLevel: boolean = false) {
    if (this.gameOver && !restartSameLevel) return;

    const levelCycle = (this.level - 1) % this.CONFIG.LEVELS_PER_CYCLE;
    const difficulty =
      levelCycle + Math.floor((this.level - 1) / this.CONFIG.LEVELS_PER_CYCLE);

    this.updateCanvasSize();

    this.maze = this.generateMaze();
    const startPos = this.getRandomOpenPosition();
    this.tank.pos = startPos.copy();
    this.tank.targetPos = startPos.copy();

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

    if (this.level < this.CONFIG.POWER_UP_START_LEVEL) {
      this.powerUps = [];
    } else {
      const powerUpCount = Math.min(
        Math.floor(
          (this.level - this.CONFIG.POWER_UP_START_LEVEL) /
            this.CONFIG.LEVELS_PER_CYCLE
        ),
        this.CONFIG.MAX_POWER_UP_COUNT
      );
      this.powerUps = range(powerUpCount).map(() => {
        let pos;
        do {
          pos = this.getRandomOpenPosition();
        } while (
          this.targets.some((t) => t.pos.equals(pos)) ||
          pos.equals(this.tank.pos) ||
          (this.chaosMonster && pos.equals(this.chaosMonster.pos)) ||
          this.powerUps.some((p) => p.pos.equals(pos))
        );
        return { pos: pos, opacity: 0, revealStart: performance.now() };
      });
    }

    this.currentTarget = 1;
    this.numberTimer = this.CONFIG.INITIAL_NUMBER_TIMER;
    this.marker = null;

    if (this.level === 1 && !localStorage.getItem("tankMemoryMazeState")) {
      this.score.lives = this.CONFIG.MAX_MISSES;
      this.score.total = 0;
      this.score.hits = 0;
      this.powerUps = [];
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
    const windowWidth =
      window.innerWidth - this.CONFIG.CANVAS_MARGIN.HORIZONTAL;

    const windowHeight =
      window.innerHeight -
      this.CONFIG.CANVAS_MARGIN.VERTICAL -
      (this.CONFIG.DEVICE_FLAG.isTouchSupported ? this.controlsHeight : 0);

    const bannerHeight = windowHeight * this.CONFIG.BANNER_HEIGHT_RATIO;

    const gridSize = { x: windowWidth, y: windowHeight - bannerHeight };

    const majorCellCount = makeOdd(
      clamp(
        this.CONFIG.MIN_CELL_COUNT + Math.floor(this.level / 3),
        this.CONFIG.MIN_CELL_COUNT,
        this.CONFIG.MAX_CELL_COUNT
      )
    );

    const cellSize = Math.max(
      Math.floor(gridSize.x / majorCellCount),
      Math.floor(gridSize.y / majorCellCount)
    );

    const minorCellCount = makeOdd(
      clamp(
        Math.min(
          Math.floor(gridSize.x / cellSize),
          Math.floor(gridSize.y / cellSize)
        ),
        this.CONFIG.MIN_CELL_COUNT,
        this.CONFIG.MAX_CELL_COUNT
      )
    );

    if (this.CONFIG.DEVICE_FLAG.portrait) {
      this.mazeColCount = minorCellCount;
      this.mazeRowCount = majorCellCount;
    } else {
      this.mazeColCount = majorCellCount;
      this.mazeRowCount = minorCellCount;
    }

    this.cellSize = Math.min(
      Math.floor(gridSize.x / minorCellCount),
      Math.floor(gridSize.y / minorCellCount)
    );

    console.log(`${cellSize} -> ${this.cellSize}`);

    this.topBorderSize = bannerHeight;

    this.canvas.width = this.mazeColCount * this.cellSize;
    this.canvas.height = this.mazeRowCount * this.cellSize + bannerHeight;
  }

  generateMaze(): number[][] {
    const width = this.mazeColCount;
    const height = this.mazeRowCount;

    const maze = Array(height)
      .fill(null)
      .map(() => Array(width).fill(1));
    const directions = [
      [0, 2],
      [2, 0],
      [0, -2],
      [-2, 0],
    ];
    const shuffle = (array: number[][]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };
    const carve = (x: number, y: number) => {
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

  getRandomOpenPosition(): Vector2D {
    let pos: Vector2D;
    let attempts = 0;
    const maxAttempts = 13;

    do {
      pos = new Vector2D(
        Math.floor(Math.random() * this.mazeColCount),
        Math.floor(Math.random() * this.mazeRowCount)
      );
      attempts++;
    } while (this.maze[pos.y][pos.x] !== 0 && attempts < maxAttempts);
    return pos;
  }

  getRandomColor(): string {
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

  isValidMove(pos: Vector2D): boolean {
    if (this.tank.ignoreCollisions) return true; // Bypass check during wall traversal
    const { x, y } = pos.round();
    return (
      x >= 0 &&
      x < this.mazeColCount &&
      y >= 0 &&
      y < this.mazeRowCount &&
      this.maze[y][x] === 0
    );
  }

  isIntersection(pos: Vector2D, fromDir: string): boolean {
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

  findNearestTarget(pos: Vector2D): any {
    let nearestTarget: Target | null = null;
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

  update(deltaTime: number) {
    if (this.levelCleared) return;

    if (this.numberTimer > 0) {
      this.numberTimer -= deltaTime * 1000;
      if (this.numberTimer < 0) this.numberTimer = 0;
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
        this.gameOverDelay = this.CONFIG.GAME_OVER_DELAY;
      }
      this.gameOverDelay -= deltaTime * 1000;
      if (this.gameOverDelay <= 0) {
        this.gameOver = false;
        this.score.lives = this.CONFIG.MAX_MISSES;
        if (this.level > 1) this.level--;
        this.resetLevel(true);
        this.saveGameState();
      }
    } else if (this.targets.every((t) => t.hit)) {
      this.levelCleared = true;
      setTimeout(() => this.resetLevel(), this.CONFIG.LEVEL_CLEAR_DELAY);
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
    } else {
      this.level = 1;
      this.score.total = 0;
      this.score.hits = 0;
    }
  }

  clearGameState() {
    localStorage.removeItem("tankMemoryMazeState");
  }

  gameLoop(currentTime: number = performance.now()) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulatedTime += deltaTime;

    while (this.accumulatedTime >= this.CONFIG.FRAME_DELTA) {
      this.update(this.CONFIG.FRAME_DELTA / 1000);
      this.accumulatedTime -= this.CONFIG.FRAME_DELTA;
    }

    this.renderEngine.draw();
    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

export function run() {
  new MazeMemoryGame();
}
function makeOdd(arg0: number): number {
  arg0 = Math.round(arg0);
  return arg0 % 2 === 0 ? arg0 + 1 : arg0;
}
