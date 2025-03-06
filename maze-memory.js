import { GestureEngine } from "./GestureEngine.js"
import { Vector2D } from "./Vector2D.js"
import { MovementEngine } from "./MovementEngine.js"
import { RenderEngine } from "./RenderEngine.js"
import { EventHandler } from "./EventHandler.js"

// maze-memory.js
function range(n) {
  return Array.from({ length: n }, (_, i) => i)
}

class MazeMemoryGame {
  CONFIG = {
    MAX_POWER_UP_COUNT: 5,
    BANNER_HEIGHT_PERCENT: 0.12,
    SCOREBOARD_FONT_SCALE: 3,
    MAZE_WALL_COLOR: "gray",
    TANK_COLOR: "green",
    BULLET_COLOR: "red",
    POWER_UP_COLOR: "yellow",
    TARGET_OUTLINE_COLOR: "black",
    CHAOS_MONSTER_COLOR: "rgba(0, 255, 0, 0.5)",
    GRID_SIZE: 40,
    CANVAS_MARGIN: { HORIZONTAL: 40, VERTICAL: 60 },
    MAX_MISSES: 5,
    FRAME_DELTA: 1000 / 30,
    BULLET_SPEED: 12,
    TANK_SPEED: 6,
    CHAOS_MONSTER_SPEED: 4,
    MIN_GRID_SIZE: 5,
    MAX_GRID_SIZE: 15,
    LEVELS_PER_CYCLE: 3,
    POWER_UP_REVEAL_DURATION: 3000,
    INITIAL_NUMBER_TIMER: 5000,
    GAME_OVER_DELAY: 3000,
    LEVEL_CLEAR_DELAY: 2000,
    CONTROLS_HEIGHT: 200,
    BULLET_SIZE: 5,
    TANK_RADIUS_SCALE: 0.5,
    TARGET_RADIUS_SCALE: 0.8,
    TARGET_OUTLINE_WIDTH: 2,
    POWER_UP_RADIUS_SCALE: 0.25,
    ROTATION_DURATION: 50,
    FLASH_DURATION: 1000,
    MAZE_SIZE_INCREMENT: 2,
    TARGETS_BASE: 3,
    TARGETS_PER_LEVEL: 3,
    MESSAGE_FONT_SCALE: 20,
    MARKER_FONT_SIZE: 30,
    TANK_FONT_SIZE: 20,
  }

  INPUT_MAP = {
    w: { action: "moveFar", dir: "up" },
    s: { action: "moveFar", dir: "down" },
    a: { action: "moveFar", dir: "left" },
    d: { action: "moveFar", dir: "right" },
    ArrowUp: { action: "moveOne", dir: "up" },
    ArrowDown: { action: "moveOne", dir: "down" },
    ArrowLeft: { action: "moveOne", dir: "left" },
    ArrowRight: { action: "moveOne", dir: "right" },
    " ": { action: "shoot" },
    x: { action: "marker" },
    m: { action: "marker" },
    "?": { action: "peek" },
    p: { action: "peek" },
    up: { action: "move", dir: "up" },
    down: { action: "move", dir: "down" },
    left: { action: "move", dir: "left" },
    right: { action: "move", dir: "right" },
    marker: { action: "marker" },
    peek: { action: "peek" },
  }

  DIRECTION_VECTORS = {
    up: new Vector2D(0, -1),
    down: new Vector2D(0, 1),
    left: new Vector2D(-1, 0),
    right: new Vector2D(1, 0),
  }

  constructor() {
    this.initializeCanvas()
    this.initializeGameState()
    this.loadGameState()
    this.initializeGameConstants()

    // Initialize helper classes
    this.movementEngine = new MovementEngine(this)
    this.renderEngine = new RenderEngine(this)
    this.eventHandler = new EventHandler(this)

    this.eventHandler.initializeEventHandlers()
    this.resetLevel(true)
    this.eventHandler.setupInputHandlers()
    window.addEventListener("resize", () => this.updateCanvasSize())
    this.lastTime = performance.now()
    this.accumulatedTime = 0
    this.gameLoop()
    if ("ontouchstart" in window) {
      this.setupGestureEngine()
    }
  }

  setupGestureEngine() {
    const joystick = document.getElementById("shoot")
    joystick.classList.remove("control-btn")
    joystick.classList.add("joystick")
    new GestureEngine(joystick, this)
  }

  handleInput(input) {
    this.eventHandler.handleInput(input)
  }

  initializeGameConstants() {
    this.mazeSize = this.CONFIG.MIN_GRID_SIZE
    this.level = this.level || 1
    this.maxTargets = this.CONFIG.TARGETS_BASE
  }

  initializeCanvas() {
    this.canvas = document.getElementById("gameCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.gridSize = this.CONFIG.GRID_SIZE
    this.controlsHeight = this.CONFIG.CONTROLS_HEIGHT
    this.topBorderSize = 0
    this.updateCanvasSize()
  }

  initializeGameState() {
    this.maze = []
    this.tank = {
      pos: new Vector2D(0, 0),
      targetPos: new Vector2D(0, 0),
      dir: "right",
      currentAngle: 0,
      targetAngle: 0,
      rotationStart: null,
      ignoreCollisions: false,
    }
    this.chaosMonster = null
    this.targets = []
    this.bullets = []
    this.powerUps = []
    this.currentTarget = 1
    this.showNumbers = true
    this.numberTimer = this.CONFIG.INITIAL_NUMBER_TIMER
    this.keysPressed = {}
    this.score = this.score || {
      hits: 0,
      lives: this.CONFIG.MAX_MISSES,
      total: 0,
      moves: 0,
    }
    this.gameOverDelay = 0
    this.marker = null
    this.gameOver = false
    this.levelCleared = false
    this.targetColors = []
    this.colorIndex = 0
    this.lastButtonDirection = null
    this.showAllTimer = 0
    this.showNextTimer = 0
  }

  resetLevel(restartSameLevel = false) {
    if (this.gameOver && !restartSameLevel) return

    const levelCycle = (this.level - 1) % this.CONFIG.LEVELS_PER_CYCLE
    const difficulty = Math.floor(
      (this.level - 1) / this.CONFIG.LEVELS_PER_CYCLE
    )
    this.mazeSize = Math.min(
      this.CONFIG.MAX_GRID_SIZE,
      this.CONFIG.MIN_GRID_SIZE +
        (difficulty + levelCycle) * this.CONFIG.MAZE_SIZE_INCREMENT
    )
    this.updateCanvasSize()

    this.maze = this.generateMaze()
    const startPos = this.getRandomOpenPosition()
    this.tank.pos = startPos.copy()
    this.tank.targetPos = startPos.copy()

    const monsterPos = this.getRandomOpenPosition()
    this.chaosMonster = {
      pos: monsterPos.copy(),
      origin: monsterPos.copy(),
      speed: this.CONFIG.CHAOS_MONSTER_SPEED + difficulty,
      holdingTarget: null,
      target: null,
    }

    this.maxTargets =
      this.CONFIG.TARGETS_BASE +
      Math.floor((this.level - 1) / this.CONFIG.TARGETS_PER_LEVEL)
    this.targets = []
    this.assignTargetColors()
    for (let i = 1; i <= this.maxTargets; i++) {
      let pos
      do {
        pos = this.getRandomOpenPosition()
      } while (
        this.targets.some((t) => t.pos.equals(pos)) ||
        pos.equals(this.tank.pos) ||
        pos.equals(this.chaosMonster.pos)
      )
      this.targets.push({
        pos: pos,
        num: i,
        hit: false,
        flashTimer: 0,
        color: this.targetColors[i - 1],
      })
    }
    this.chaosMonster.target = this.findNearestTarget(this.chaosMonster.pos)

    this.bullets = []
    this.powerUps = range(this.CONFIG.MAX_POWER_UP_COUNT).map(() => {
      let pos
      do {
        pos = this.getRandomOpenPosition()
      } while (
        this.targets.some((t) => t.pos.equals(pos)) ||
        pos.equals(this.tank.pos) ||
        pos.equals(this.chaosMonster.pos) ||
        this.powerUps.some((p) => p.pos.equals(pos))
      )
      return { pos: pos, opacity: 0, revealStart: null }
    })

    this.powerUps[this.powerUps.length - 1].revealStart = performance.now()

    this.currentTarget = 1
    this.showNumbers = true
    this.numberTimer = this.CONFIG.INITIAL_NUMBER_TIMER
    this.marker = null

    if (this.level === 1 && !localStorage.getItem("tankMemoryMazeState")) {
      this.score.lives = this.CONFIG.MAX_MISSES
      this.score.total = 0
      this.score.hits = 0
    } else if (this.levelCleared && !restartSameLevel) {
      this.score.lives = Math.min(this.score.lives + 1, this.CONFIG.MAX_MISSES)
      const moveBonus = Math.max(0, 100 - this.score.moves * 2)
      this.score.total += this.score.hits * this.score.lives + moveBonus
      this.level++
    }

    this.score.moves = 0
    this.levelCleared = false
    this.saveGameState()
  }

  updateCanvasSize() {
    const windowWidth = window.innerWidth - this.CONFIG.CANVAS_MARGIN.HORIZONTAL
    const windowHeight =
      window.innerHeight -
      this.CONFIG.CANVAS_MARGIN.VERTICAL -
      this.controlsHeight
    const maxSize = Math.min(windowWidth, windowHeight)
    this.canvas.width = maxSize
    this.bannerHeight = maxSize * this.CONFIG.BANNER_HEIGHT_PERCENT
    this.canvas.height = maxSize + this.bannerHeight
    this.gridSize = Math.floor(maxSize / this.mazeSize)
    this.topBorderSize = this.bannerHeight
    this.canvas.dataset.bannerHeight = this.bannerHeight
  }

  generateMaze() {
    const size = this.mazeSize
    const maze = Array(size)
      .fill()
      .map(() => Array(size).fill(1))
    const directions = [
      [0, 2],
      [2, 0],
      [0, -2],
      [-2, 0],
    ]
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
    }
    const carve = (x, y) => {
      maze[y][x] = 0
      const dirs = directions.slice()
      shuffle(dirs)
      for (let [dy, dx] of dirs) {
        const newY = y + dy
        const newX = x + dx
        if (
          newY > 0 &&
          newY < size - 1 &&
          newX > 0 &&
          newX < size - 1 &&
          maze[newY][newX] === 1
        ) {
          maze[y + dy / 2][x + dx / 2] = 0
          carve(newX, newY)
        }
      }
    }
    carve(1, 1)
    for (let x = 0; x < size; x++) {
      maze[size - 1][x] = 1
    }
    return maze
  }

  getRandomOpenPosition() {
    let pos
    do {
      pos = new Vector2D(
        Math.floor(Math.random() * this.mazeSize),
        Math.floor(Math.random() * (this.mazeSize - 1))
      )
    } while (this.maze[pos.y][pos.x] !== 0)
    return pos
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
    ]
    const color = niceColors[this.colorIndex % niceColors.length]
    this.colorIndex++
    return color
  }

  assignTargetColors() {
    this.targetColors = []
    for (let i = 1; i <= this.maxTargets; i++) {
      this.targetColors[i - 1] = this.getRandomColor()
    }
  }

  isValidMove(pos) {
    return (
      pos.x >= 0 &&
      pos.x < this.mazeSize &&
      pos.y >= 0 &&
      pos.y < this.mazeSize &&
      this.maze[pos.y][pos.x] === 0
    )
  }

  isIntersection(pos, fromDir) {
    const directions = [
      { vec: new Vector2D(0, -1), dir: "up" },
      { vec: new Vector2D(0, 1), dir: "down" },
      { vec: new Vector2D(-1, 0), dir: "left" },
      { vec: new Vector2D(1, 0), dir: "right" },
    ]
    let openPaths = 0
    directions.forEach((d) => {
      const newPos = pos.add(d.vec)
      if (this.isValidMove(newPos) && d.dir !== fromDir) openPaths++
    })
    return openPaths > 1
  }

  findNearestTarget(pos) {
    let nearestTarget = null
    let minDistance = Infinity
    this.targets.forEach((t) => {
      if (!t.hit) {
        const distance = pos.distanceTo(t.pos)
        if (distance < minDistance) {
          minDistance = distance
          nearestTarget = t
        }
      }
    })
    return nearestTarget
  }

  update(deltaTime) {
    if (this.levelCleared) return

    if (this.showNumbers && this.numberTimer > 0) {
      this.numberTimer -= deltaTime * 1000
      if (this.numberTimer <= 0) this.showNumbers = false
      return
    }

    if (this.showAllTimer > 0) {
      this.showAllTimer -= deltaTime * 1000
      if (this.showAllTimer < 0) this.showAllTimer = 0
    }

    if (this.showNextTimer > 0) {
      this.showNextTimer -= deltaTime * 1000
      if (this.showNextTimer < 0) this.showNextTimer = 0
    }

    if (!this.gameOver) {
      this.movementEngine.updateTank(deltaTime)
      this.movementEngine.updateChaosMonster(deltaTime)
      this.movementEngine.updateBullets(deltaTime)

      this.powerUps.forEach((p) => {
        if (p.revealStart !== null) {
          const elapsed = performance.now() - p.revealStart
          const duration = 1000
          if (elapsed < duration) {
            p.opacity = Math.min(1, elapsed / duration)
          } else {
            p.opacity = 1
            p.revealStart = null
          }
        }
      })

      this.targets.forEach((t) => {
        if (t.flashTimer > 0) {
          t.flashTimer -= deltaTime * 1000
          if (t.flashTimer < 0) t.flashTimer = 0
        }
      })
    }

    if (this.score.lives <= 0) {
      if (!this.gameOver) {
        this.gameOver = true
        this.gameOverDelay = this.CONFIG.GAME_OVER_DELAY
      }
      this.gameOverDelay -= deltaTime * 1000
      if (this.gameOverDelay <= 0) {
        this.gameOver = false
        this.score.lives = this.CONFIG.MAX_MISSES
        if (this.level > 1) this.level--
        this.resetLevel(true)
        this.saveGameState()
      }
    } else if (this.targets.every((t) => t.hit)) {
      this.levelCleared = true
      setTimeout(() => this.resetLevel(), this.CONFIG.LEVEL_CLEAR_DELAY)
    }
  }

  saveGameState() {
    const gameState = {
      level: this.level,
      score: {
        total: this.score.total,
        hits: this.score.hits,
      },
    }
    localStorage.setItem("tankMemoryMazeState", JSON.stringify(gameState))
  }

  loadGameState() {
    const savedState = localStorage.getItem("tankMemoryMazeState")
    if (savedState) {
      const gameState = JSON.parse(savedState)
      this.level = gameState.level
      this.score.total = gameState.score.total
      this.score.hits = gameState.score.hits
    }
  }

  clearGameState() {
    localStorage.removeItem("tankMemoryMazeState")
  }

  gameLoop(currentTime = performance.now()) {
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    this.accumulatedTime += deltaTime

    while (this.accumulatedTime >= this.CONFIG.FRAME_DELTA) {
      this.update(this.CONFIG.FRAME_DELTA / 1000)
      this.accumulatedTime -= this.CONFIG.FRAME_DELTA
    }

    this.renderEngine.draw()
    requestAnimationFrame((time) => this.gameLoop(time))
  }
}

export function run() {
  new MazeMemoryGame()
}
