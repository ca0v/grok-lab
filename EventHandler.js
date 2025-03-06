import { Vector2D } from "./Vector2D.js";

// EventHandler.js
export class EventHandler {
  constructor(game) {
    this.game = game;
    this.CONFIG = game.CONFIG;
    this.INPUT_MAP = game.INPUT_MAP;
  }

  initializeEventHandlers() {
    this.game.eventHandlers = {
      hit: () => {
        this.game.score.hits++;
        this.game.currentTarget++;
        this.game.showAllTimer = 0;
      },
      miss: (target) => {
        if (target) target.flashTimer = this.CONFIG.FLASH_DURATION;
        this.game.showAllTimer = 0;
        this.game.score.lives--;
      },
    };
  }

  handleInput(input) {
    switch (input.action) {
      case "moveFar": {
        const pos = this.game.movementEngine.moveFar(
          this.game.tank.targetPos,
          input.dir
        );
        this.game.tank.targetPos = pos;
        this.game.tank.ignoreCollisions = false;
        this.game.movementEngine.updateTankDirection(input.dir);
        this.game.score.moves++;
        break;
      }
      case "moveOne": {
        // Check if tank direction matches input direction
        if (this.game.tank.dir !== input.dir) {
          // Only turn if direction differs
          this.game.movementEngine.updateTankDirection(input.dir);
        } else {
          // Move one cell if direction matches
          const newPos = this.game.tank.targetPos.add(
            this.game.DIRECTION_VECTORS[input.dir]
          );
          if (this.game.isValidMove(newPos)) {
            this.game.tank.targetPos = newPos;
            this.game.tank.ignoreCollisions = false;
            this.game.score.moves++;
          }
        }
        break;
      }
      case "move": {
        if (this.game.tank.dir !== input.dir) {
          this.game.movementEngine.updateTankDirection(input.dir);
          this.game.lastButtonDirection = input.dir;
        } else if (this.game.lastButtonDirection === input.dir) {
          const pos = this.game.movementEngine.moveFar(
            this.game.tank.targetPos,
            input.dir
          );
          this.game.tank.targetPos = pos;
          this.game.tank.dir = input.dir;
          this.game.tank.ignoreCollisions = false;
          this.game.score.moves++;
        }
        break;
      }
      case "shoot": {
        let bullet = {
          pos: this.game.tank.pos.copy().add(new Vector2D(0.5, 0.5)),
          dir: this.game.tank.dir,
        };
        if (!this.checkBulletCollision(bullet)) {
          this.game.bullets.push(bullet);
        }
        break;
      }
      case "marker": {
        if (!this.game.marker) {
          this.game.marker = this.game.tank.targetPos.copy();
          this.game.score.moves++;
        } else {
          this.game.tank.targetPos = this.game.marker.copy();
          this.game.tank.ignoreCollisions = true;
          this.game.marker = null;
          this.game.score.moves++;
        }
        break;
      }
      case "peek": {
        this.game.showNextTimer = this.CONFIG.FLASH_DURATION;
        this.game.score.lives--;
        break;
      }
    }
  }

  checkBulletCollision(bullet) {
    let hitTarget = false;
    const bulletGrid = new Vector2D(
      Math.floor(bullet.pos.x),
      Math.floor(bullet.pos.y)
    );

    for (const t of this.game.targets) {
      if (
        !t.hit &&
        bulletGrid.equals(t.pos) &&
        t.num === this.game.currentTarget
      ) {
        t.hit = true;
        this.game.eventHandlers.hit();
        return true;
      }
    }

    this.game.targets.forEach((t) => {
      if (!t.hit && bulletGrid.equals(t.pos)) {
        hitTarget = true;
        this.game.eventHandlers.miss(t);
      }
    });

    if (
      this.game.powerUps.some(
        (p) => bulletGrid.equals(p.pos) && p.opacity === 1
      )
    ) {
      this.game.showAllTimer = this.CONFIG.POWER_UP_REVEAL_DURATION;
      this.game.powerUps = this.game.powerUps.filter(
        (p) => !(bulletGrid.equals(p.pos) && p.opacity === 1)
      );
      if (this.game.powerUps.length)
        this.game.powerUps.at(-1).revealStart = performance.now();
      hitTarget = true;
    }

    if (!hitTarget) {
      if (
        bulletGrid.x >= 0 &&
        bulletGrid.x < this.game.mazeWidth &&
        bulletGrid.y >= 0 &&
        bulletGrid.y < this.game.mazeHeight
      ) {
        if (this.game.maze[bulletGrid.y][bulletGrid.x] === 1) {
          this.game.maze[bulletGrid.y][bulletGrid.x] = 0;
          this.game.eventHandlers.miss();
          hitTarget = true;
        }
      } else {
        this.game.eventHandlers.miss();
        hitTarget = true;
      }
    }
    return hitTarget;
  }

  setupInputHandlers() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" && (this.game.gameOver || this.game.levelCleared)) {
        this.game.clearGameState();
        this.game.level = 0;
        this.game.score.total = 0;
        this.game.score.hits = 0;
        this.game.resetLevel();
        return;
      }
      if (this.game.gameOver || this.game.levelCleared) return;
      if (this.game.keysPressed[e.key]) return;
      this.game.keysPressed[e.key] = true;

      const input =
        this.INPUT_MAP[e.key.toLowerCase()] || this.INPUT_MAP[e.key];
      if (input) {
        e.preventDefault();
        if (
          this.game.showNumbers &&
          this.game.numberTimer > 0 &&
          input.action !== "shoot"
        ) {
          this.game.showNumbers = false;
          this.game.numberTimer = 0;
          return;
        }
        this.handleInput(input);
      }
    });

    document.addEventListener("keyup", (e) => {
      this.game.keysPressed[e.key] = false;
    });

    Object.keys(this.INPUT_MAP).forEach((id) => {
      const button = document.getElementById(id);
      if (button && id !== "shoot") {
        const handleStart = (e) => {
          if (this.game.gameOver || this.game.levelCleared) return;
          e.preventDefault();
          if (
            this.game.showNumbers &&
            this.game.numberTimer > 0 &&
            this.INPUT_MAP[id].action !== "shoot"
          ) {
            this.game.showNumbers = false;
            this.game.numberTimer = 0;
            return;
          }
          this.handleInput(this.INPUT_MAP[id]);
        };
        button.addEventListener("mousedown", handleStart);
        button.addEventListener("touchstart", handleStart);
        button.addEventListener("mouseup", (e) => e.preventDefault());
        button.addEventListener("touchend", (e) => e.preventDefault());
      }
    });
  }
}
