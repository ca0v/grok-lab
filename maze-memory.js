import { GestureEngine } from "./GestureEngine.js"
import { Vector2D } from "./Vector2D.js"

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
    shoot: { action: "shoot" },
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
    this.initializeEventHandlers()
    this.resetLevel(true)
    this.setupInputHandlers()
    window.addEventListener("resize", () => this.updateCanvasSize())
    this.lastTime = performance.now()
    this.accumulatedTime = 0
    this.gameLoop()
    if ("ontouchstart" in window) {
      this.setupGestureEngine()
    }
  }

  setupGestureEngine() {
    const joystick = document.getElementById("shoot") // Reuse the shoot button as joystick
    joystick.classList.remove("control-btn")
    joystick.classList.add("joystick")
    new GestureEngine(joystick, this)
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

  initializeEventHandlers() {
    this.eventHandlers = {
      hit: () => {
        this.score.hits++
        this.currentTarget++
        this.showAllTimer = 0
      },
      miss: (target) => {
        if (target) target.flashTimer = this.CONFIG.FLASH_DURATION
        this.showAllTimer = 0
        this.score.lives--
      },
    }
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
      this.level++ // Only increment on level clear
    }

    this.score.moves = 0
    this.levelCleared = false
    this.saveGameState()
  }

  setupInputHandlers() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" && (this.gameOver || this.levelCleared)) {
        this.clearGameState()
        this.level = 0
        this.score.total = 0
        this.score.hits = 0
        this.resetLevel()
        return
      }
      if (this.gameOver || this.levelCleared) return
      if (this.keysPressed[e.key]) return
      this.keysPressed[e.key] = true

      const input = this.INPUT_MAP[e.key.toLowerCase()] || this.INPUT_MAP[e.key]
      if (input) {
        e.preventDefault()
        if (
          this.showNumbers &&
          this.numberTimer > 0 &&
          input.action !== "shoot"
        ) {
          this.showNumbers = false
          this.numberTimer = 0
          return
        }
        this.handleInput(input)
      }
    })

    document.addEventListener("keyup", (e) => {
      this.keysPressed[e.key] = false
    })

    Object.keys(this.INPUT_MAP).forEach((id) => {
      const button = document.getElementById(id)
      if (button) {
        const handleStart = (e) => {
          if (this.gameOver || this.levelCleared) return
          e.preventDefault()
          if (
            this.showNumbers &&
            this.numberTimer > 0 &&
            this.INPUT_MAP[id].action !== "shoot"
          ) {
            this.showNumbers = false
            this.numberTimer = 0
            return
          }
          this.handleInput(this.INPUT_MAP[id])
        }
        button.addEventListener("mousedown", handleStart)
        button.addEventListener("touchstart", handleStart)
        button.addEventListener("mouseup", (e) => e.preventDefault())
        button.addEventListener("touchend", (e) => e.preventDefault())
      }
    })
  }

  handleInput(input) {
    switch (input.action) {
      case "moveFar": {
        const pos = this.moveFar(this.tank.targetPos, input.dir)
        this.tank.targetPos = pos
        this.tank.ignoreCollisions = false
        this.updateTankDirection(input.dir)
        this.score.moves++
        break
      }
      case "moveOne": {
        if (this.tank.dir === input.dir) {
          const newPos = this.tank.targetPos.add(
            this.DIRECTION_VECTORS[input.dir]
          )
          if (this.isValidMove(newPos)) {
            this.tank.targetPos = newPos
            this.tank.ignoreCollisions = false
            this.score.moves++
          }
        }
        this.updateTankDirection(input.dir)
        break
      }
      case "move": {
        if (this.tank.dir !== input.dir) {
          this.updateTankDirection(input.dir)
          this.lastButtonDirection = input.dir
        } else if (this.lastButtonDirection === input.dir) {
          const pos = this.moveFar(this.tank.targetPos, input.dir)
          this.tank.targetPos = pos
          this.tank.dir = input.dir
          this.tank.ignoreCollisions = false
          this.score.moves++
        }
        break
      }
      case "shoot": {
        let bullet = {
          pos: this.tank.pos.copy().add(new Vector2D(0.5, 0.5)),
          dir: this.tank.dir,
        }
        if (!this.checkBulletCollision(bullet)) {
          this.bullets.push(bullet)
        }
        break
      }
      case "marker": {
        if (!this.marker) {
          this.marker = this.tank.targetPos.copy()
          this.score.moves++
        } else {
          this.tank.targetPos = this.marker.copy()
          this.tank.ignoreCollisions = true
          this.marker = null
          this.score.moves++
        }
        break
      }
      case "peek": {
        this.showNextTimer = this.CONFIG.FLASH_DURATION
        this.score.lives--
        break
      }
    }
  }

  updateTankDirection(newDir) {
    if (this.tank.dir !== newDir) {
      this.tank.dir = newDir
      this.tank.rotationStart = performance.now()
      this.score.moves++
      switch (newDir) {
        case "up":
          this.tank.targetAngle = -Math.PI / 2
          break
        case "down":
          this.tank.targetAngle = Math.PI / 2
          break
        case "left":
          this.tank.targetAngle = Math.PI
          break
        case "right":
          this.tank.targetAngle = 0
          break
      }
    }
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
      maze[size - 1][x] = 1 // Solid bottom row
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

  moveFar(startPos, dir) {
    let pos = startPos.copy()
    const dirVec = this.DIRECTION_VECTORS[dir]
    let fromDir
    switch (dir) {
      case "up":
        fromDir = "down"
        break
      case "down":
        fromDir = "up"
        break
      case "left":
        fromDir = "right"
        break
      case "right":
        fromDir = "left"
        break
    }
    while (true) {
      const nextPos = pos.add(dirVec)
      if (!this.isValidMove(nextPos)) break
      pos = nextPos
      if (this.isIntersection(pos, fromDir)) break
    }
    return pos
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

  checkBulletCollision(bullet) {
    let hitTarget = false
    const bulletGrid = new Vector2D(
      Math.floor(bullet.pos.x),
      Math.floor(bullet.pos.y)
    )

    for (const t of this.targets) {
      if (!t.hit && bulletGrid.equals(t.pos) && t.num === this.currentTarget) {
        t.hit = true
        this.eventHandlers.hit()
        return true
      }
    }

    this.targets.forEach((t) => {
      if (!t.hit && bulletGrid.equals(t.pos)) {
        hitTarget = true
        this.eventHandlers.miss(t)
      }
    })

    if (
      this.powerUps.some((p) => bulletGrid.equals(p.pos) && p.opacity === 1)
    ) {
      this.showAllTimer = this.CONFIG.POWER_UP_REVEAL_DURATION
      this.powerUps = this.powerUps.filter(
        (p) => !(bulletGrid.equals(p.pos) && p.opacity === 1)
      )
      if (this.powerUps.length)
        this.powerUps.at(-1).revealStart = performance.now()
      hitTarget = true
    }

    if (!hitTarget) {
      if (
        bulletGrid.x >= 0 &&
        bulletGrid.x < this.mazeSize &&
        bulletGrid.y >= 0 &&
        bulletGrid.y < this.mazeSize
      ) {
        if (this.maze[bulletGrid.y][bulletGrid.x] === 1) {
          this.maze[bulletGrid.y][bulletGrid.x] = 0
          this.eventHandlers.miss()
          hitTarget = true
        }
      } else {
        this.eventHandlers.miss()
        hitTarget = true
      }
    }
    return hitTarget
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
      if (!this.tank.pos.equals(this.tank.targetPos)) {
        const dir = this.tank.targetPos.subtract(this.tank.pos)
        const distance = dir.distanceTo(new Vector2D(0, 0))
        const speed = this.CONFIG.TANK_SPEED * deltaTime
        if (distance > speed) {
          const move = dir.multiply(speed / distance)
          this.tank.pos = this.tank.pos.add(move)
        } else {
          this.tank.pos = this.tank.targetPos.copy()
          this.tank.ignoreCollisions = false
        }
      }

      if (this.tank.rotationStart !== null) {
        const elapsed = performance.now() - this.tank.rotationStart
        if (elapsed < this.CONFIG.ROTATION_DURATION) {
          const progress = elapsed / this.CONFIG.ROTATION_DURATION
          this.tank.currentAngle +=
            (this.tank.targetAngle - this.tank.currentAngle) * progress
        } else {
          this.tank.currentAngle = this.tank.targetAngle
          this.tank.rotationStart = null
        }
      }

      if (this.chaosMonster) {
        if (!this.chaosMonster.holdingTarget) {
          if (this.chaosMonster.target) {
            const dx = this.chaosMonster.target.pos.x - this.chaosMonster.pos.x
            const dy = this.chaosMonster.target.pos.y - this.chaosMonster.pos.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance > 0.001) {
              const move = new Vector2D(dx, dy).multiply(
                Math.min(this.chaosMonster.speed * deltaTime, distance) /
                  distance
              )
              this.chaosMonster.pos = this.chaosMonster.pos.add(move)
            } else {
              this.chaosMonster.holdingTarget = this.chaosMonster.target
              this.chaosMonster.target = null
            }
          } else {
            this.chaosMonster.target = this.findNearestTarget(
              this.chaosMonster.pos
            )
          }
        } else {
          const dx = this.chaosMonster.origin.x - this.chaosMonster.pos.x
          const dy = this.chaosMonster.origin.y - this.chaosMonster.pos.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance > 0.001) {
            const move = new Vector2D(dx, dy).multiply(
              Math.min(this.chaosMonster.speed * deltaTime, distance) / distance
            )
            this.chaosMonster.pos = this.chaosMonster.pos.add(move)
          } else {
            this.chaosMonster.holdingTarget.pos =
              this.chaosMonster.origin.copy()
            this.chaosMonster.holdingTarget = null
          }
        }
      }

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

      this.bullets = this.bullets.filter((b) => {
        const dirVec = this.DIRECTION_VECTORS[b.dir]
        b.pos = b.pos.add(dirVec.multiply(this.CONFIG.BULLET_SPEED * deltaTime))
        return !this.checkBulletCollision(b)
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

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.drawMaze()
    this.drawTargets()
    this.drawPowerUp()
    this.drawMarker(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--grid-bg"
      ) === "#333"
        ? "#fff"
        : "#000"
    )
    this.drawTank()
    this.drawChaosMonster()
    this.drawBullets()
    this.drawScoreboard(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--grid-bg"
      ) === "#333"
    )
    this.drawMessages()
  }

  drawMaze() {
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--grid-bg")
      .trim()
    for (let y = 0; y < this.mazeSize; y++) {
      for (let x = 0; x < this.mazeSize; x++) {
        this.ctx.fillStyle =
          this.maze[y][x] === 1 ? this.CONFIG.MAZE_WALL_COLOR : bgColor
        this.ctx.fillRect(
          x * this.gridSize,
          y * this.gridSize + this.topBorderSize,
          this.gridSize,
          this.gridSize
        )
      }
    }
  }

  drawTargets() {
    this.targets.forEach((t) => {
      if (!t.hit) {
        const targetRadius =
          (this.gridSize / 2) * this.CONFIG.TARGET_RADIUS_SCALE
        this.ctx.fillStyle = this.CONFIG.TARGET_OUTLINE_COLOR
        this.ctx.beginPath()
        this.ctx.arc(
          t.pos.x * this.gridSize + this.gridSize / 2,
          t.pos.y * this.gridSize + this.gridSize / 2 + this.topBorderSize,
          targetRadius + 2,
          0,
          Math.PI * 2
        )
        this.ctx.fill()
        this.ctx.fillStyle = t.color
        this.ctx.beginPath()
        this.ctx.arc(
          t.pos.x * this.gridSize + this.gridSize / 2,
          t.pos.y * this.gridSize + this.gridSize / 2 + this.topBorderSize,
          targetRadius,
          0,
          Math.PI * 2
        )
        this.ctx.fill()

        if (
          this.showNumbers ||
          t.flashTimer > 0 ||
          this.showAllTimer > 0 ||
          (t.num === this.currentTarget && this.showNextTimer > 0)
        ) {
          this.ctx.fillStyle = "white"
          this.ctx.font = `${Math.floor(targetRadius)}px Arial`
          this.ctx.textAlign = "center"
          this.ctx.textBaseline = "middle"
          this.ctx.fillText(
            t.num,
            t.pos.x * this.gridSize + this.gridSize / 2,
            t.pos.y * this.gridSize + this.gridSize / 2 + this.topBorderSize
          )
        }
      }
    })
  }

  drawMarker(color) {
    if (this.marker) {
      this.ctx.fillStyle = color
      this.ctx.font = `${this.CONFIG.MARKER_FONT_SIZE}px Arial`
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"
      this.ctx.fillText(
        "📍",
        this.marker.x * this.gridSize + this.gridSize / 2,
        this.marker.y * this.gridSize + this.gridSize / 2 + this.topBorderSize
      )
    }
  }

  drawTank() {
    this.ctx.save()
    this.ctx.translate(
      this.tank.pos.x * this.gridSize + this.gridSize / 2,
      this.tank.pos.y * this.gridSize + this.gridSize / 2 + this.topBorderSize
    )
    this.ctx.fillStyle = this.CONFIG.TANK_COLOR
    this.ctx.beginPath()
    this.ctx.arc(
      0,
      0,
      (this.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE,
      0,
      Math.PI * 2
    )
    this.ctx.fill()
    this.ctx.rotate(this.tank.currentAngle)
    this.ctx.fillStyle = "white"
    this.ctx.font = `${this.CONFIG.TANK_FONT_SIZE}px Arial`
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.fillText("➔", 0, 0)
    this.ctx.restore()
  }

  drawChaosMonster() {
    if (this.chaosMonster) {
      this.ctx.save()
      this.ctx.translate(
        this.chaosMonster.pos.x * this.gridSize + this.gridSize / 2,
        this.chaosMonster.pos.y * this.gridSize +
          this.gridSize / 2 +
          this.topBorderSize
      )
      this.ctx.fillStyle = this.CONFIG.CHAOS_MONSTER_COLOR
      this.ctx.beginPath()
      this.ctx.arc(
        0,
        0,
        (this.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE,
        0,
        Math.PI * 2
      )
      this.ctx.fill()
      this.ctx.restore()
    }
  }

  drawBullets() {
    this.ctx.fillStyle = this.CONFIG.BULLET_COLOR
    this.bullets.forEach((b) => {
      this.ctx.fillRect(
        b.pos.x * this.gridSize,
        b.pos.y * this.gridSize + this.topBorderSize,
        this.CONFIG.BULLET_SIZE,
        this.CONFIG.BULLET_SIZE
      )
    })
  }

  drawPowerUp() {
    this.powerUps.forEach((p) => {
      if (p.opacity > 0) {
        this.ctx.globalAlpha = p.opacity
        this.ctx.fillStyle = this.CONFIG.POWER_UP_COLOR
        this.ctx.beginPath()
        this.ctx.arc(
          p.pos.x * this.gridSize + this.gridSize / 2,
          p.pos.y * this.gridSize + this.gridSize / 2 + this.topBorderSize,
          this.gridSize * this.CONFIG.POWER_UP_RADIUS_SCALE,
          0,
          Math.PI * 2
        )
        this.ctx.fill()
        this.ctx.globalAlpha = 1
      }
    })
  }

  drawScoreboard(isDarkMode) {
    const fontSize = Math.floor(
      this.bannerHeight / this.CONFIG.SCOREBOARD_FONT_SCALE
    )
    this.ctx.fillStyle = isDarkMode ? "#222" : "#ddd"
    this.ctx.fillRect(0, 0, this.canvas.width, this.bannerHeight)
    this.ctx.shadowBlur = 5
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)"
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2

    // Use slightly larger font for labels, smaller for values
    this.ctx.font = `${fontSize * 1.1}px Arial` // Larger font for labels
    this.ctx.textBaseline = "middle"

    // First Row: Labels
    // Hits (left column)
    this.ctx.fillStyle = isDarkMode ? "#fff" : "black"
    this.ctx.textAlign = "center"
    this.ctx.fillText("Hits", this.canvas.width * 0.2, this.bannerHeight * 0.4) // Left column, middle of top row

    // Level (center column)
    this.ctx.fillText(
      `Level: ${this.level}`,
      this.canvas.width * 0.5,
      this.bannerHeight * 0.4
    ) // Center column, middle of top row

    // Lives (right column)
    this.ctx.fillText("Lives", this.canvas.width * 0.8, this.bannerHeight * 0.4) // Right column, middle of top row

    // Second Row: Values
    this.ctx.font = `${fontSize}px Arial` // Smaller font for values
    // Hit count (left column)
    this.ctx.fillStyle = isDarkMode ? "#ccc" : "black"
    this.ctx.fillText(
      this.score.hits,
      this.canvas.width * 0.2,
      this.bannerHeight * 0.7
    ) // Left column, middle of bottom row

    // Score (center column)
    this.ctx.fillStyle = isDarkMode ? "#fff" : "black"
    this.ctx.fillText(
      `Score: ${this.score.total} (Moves: ${this.score.moves})`,
      this.canvas.width * 0.5,
      this.bannerHeight * 0.7
    ) // Center column, middle of bottom row

    // Lives + Power-ups (right column)
    this.ctx.fillStyle = "green"
    const circleRadius = fontSize / 4 // Smaller circles
    const circleSpacing = circleRadius * 2
    const totalIconsWidth =
      (this.score.lives + this.powerUps.length - 1) * circleSpacing +
      2 * circleRadius
    const iconsStartX = this.canvas.width * 0.8 - totalIconsWidth / 2 // Center horizontally in right column

    // Draw Lives (green circles)
    for (let i = 0; i < this.score.lives; i++) {
      this.ctx.beginPath()
      this.ctx.arc(
        iconsStartX + i * circleSpacing + circleRadius,
        this.bannerHeight * 0.7,
        circleRadius,
        0,
        Math.PI * 2
      )
      this.ctx.fill()
    }

    // Draw Power-ups (yellow circles) after Lives
    this.ctx.fillStyle = this.CONFIG.POWER_UP_COLOR // Yellow
    for (let i = 0; i < this.powerUps.length; i++) {
      this.ctx.beginPath()
      this.ctx.arc(
        iconsStartX + (this.score.lives + i) * circleSpacing + circleRadius,
        this.bannerHeight * 0.7,
        circleRadius,
        0,
        Math.PI * 2
      )
      this.ctx.fill()
    }
  }

  drawMessages() {
    if (this.levelCleared) {
      this.ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--textColor")
        .trim()
      this.ctx.font = `${Math.floor(
        this.canvas.height / this.CONFIG.MESSAGE_FONT_SCALE
      )}px Arial`
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"
      this.ctx.fillText(
        "Level Cleared! Starting New Level...",
        this.canvas.width / 2,
        this.canvas.height / 2
      )
    }

    if (this.gameOver) {
      this.ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--textColor")
        .trim()
      this.ctx.font = `${Math.floor(
        this.canvas.height / this.CONFIG.MESSAGE_FONT_SCALE
      )}px Arial`
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"
      this.ctx.fillText(
        "Game Over! Restarting...",
        this.canvas.width / 2,
        this.canvas.height / 2
      )
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

    this.draw()
    requestAnimationFrame((time) => this.gameLoop(time))
  }
}

export function run() {
  // Start the game
  new MazeMemoryGame()
}
