import type { CONFIG } from "./config.js";
import type { MazeMemoryGame } from "./maze-memory.js";

export class RenderEngine {
  game: MazeMemoryGame;
  ctx: CanvasRenderingContext2D;
  CONFIG: typeof CONFIG;

  constructor(game: MazeMemoryGame) {
    this.game = game;
    this.ctx = game.ctx;
    this.CONFIG = game.CONFIG;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    this.drawMaze();
    this.drawPowerUp();
    this.drawBullets();
    this.drawTargets();
    this.drawChaosMonster();
    this.drawTank();
    this.drawMarker();
    this.drawScoreboard();
    this.drawMessages();
  }

  drawMaze() {
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--grid-bg")
      .trim();
    for (let y = 0; y < this.game.mazeHeight; y++) {
      for (let x = 0; x < this.game.mazeWidth; x++) {
        this.ctx.fillStyle =
          this.game.maze[y][x] === 1 ? this.CONFIG.MAZE_WALL_COLOR : bgColor;
        this.ctx.fillRect(
          x * this.game.gridSize,
          y * this.game.gridSize + this.game.topBorderSize,
          this.game.gridSize,
          this.game.gridSize
        );
      }
    }
  }

  drawTank() {
    this.ctx.save();
    this.ctx.translate(
      this.game.tank.pos.x * this.game.gridSize + this.game.gridSize / 2,
      this.game.tank.pos.y * this.game.gridSize +
        this.game.gridSize / 2 +
        this.game.topBorderSize
    );
    this.ctx.rotate(this.game.tank.currentAngle);
    const radius = (this.game.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE;
    this.ctx.fillStyle = this.CONFIG.TANK_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "black";
    this.ctx.beginPath();
    this.ctx.arc(radius * 0.75, 0, radius / 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.font = `${this.CONFIG.TANK_FONT_SIZE}px Arial`;
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("T", 0, 0);

    this.ctx.restore();
  }

  drawTargets() {
    this.game.targets.forEach((target) => {
      if (!target.hit || target.flashTimer > 0) {
        const targetRadius =
          (this.game.gridSize / 2) * this.CONFIG.TARGET_RADIUS_SCALE;
        const x = target.pos.x * this.game.gridSize + this.game.gridSize / 2;
        const y =
          target.pos.y * this.game.gridSize +
          this.game.gridSize / 2 +
          this.game.topBorderSize;

        this.ctx.fillStyle = this.CONFIG.TARGET_OUTLINE_COLOR;
        this.ctx.beginPath();
        this.ctx.arc(
          x,
          y,
          targetRadius + this.CONFIG.TARGET_OUTLINE_WIDTH,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        this.ctx.fillStyle = target.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, targetRadius, 0, Math.PI * 2);
        this.ctx.fill();

        if (
          this.game.showNumbers ||
          target.flashTimer > 0 ||
          (this.game.showNextTimer > 0 &&
            target.num === this.game.currentTarget)
        ) {
          const alpha =
            target.flashTimer > 0
              ? Math.max(0, target.flashTimer / this.CONFIG.FLASH_DURATION)
              : 1;
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.font = `${this.CONFIG.TARGET_FONT_SIZE}px Arial`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(target.num.toString(), x, y);
        }
      }
    });
  }

  drawChaosMonster() {
    if (this.game.chaosMonster) {
      this.ctx.save();
      this.ctx.translate(
        this.game.chaosMonster.pos.x * this.game.gridSize +
          this.game.gridSize / 2,
        this.game.chaosMonster.pos.y * this.game.gridSize +
          this.game.gridSize / 2 +
          this.game.topBorderSize
      );

      const radius = (this.game.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE;
      this.ctx.fillStyle = this.CONFIG.CHAOS_MONSTER_COLOR;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (this.game.chaosMonster.holdingTarget) {
        const targetRadius =
          (this.game.gridSize / 2) * this.CONFIG.TARGET_RADIUS_SCALE;
        this.ctx.fillStyle = this.game.chaosMonster.holdingTarget.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  drawPowerUp() {
    this.game.powerUps.forEach((p) => {
      const radius =
        (this.game.gridSize / 2) * this.CONFIG.POWER_UP_RADIUS_SCALE;
      this.ctx.fillStyle = `rgba(255, 255, 0, ${p.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(
        p.pos.x * this.game.gridSize + this.game.gridSize / 2,
        p.pos.y * this.game.gridSize +
          this.game.gridSize / 2 +
          this.game.topBorderSize,
        radius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });
  }

  drawBullets() {
    this.game.bullets.forEach((bullet) => {
      this.ctx.fillStyle = this.CONFIG.BULLET_COLOR;
      this.ctx.beginPath();
      this.ctx.arc(
        bullet.pos.x * this.game.gridSize + this.game.gridSize / 2,
        bullet.pos.y * this.game.gridSize +
          this.game.gridSize / 2 +
          this.game.topBorderSize,
        this.CONFIG.BULLET_SIZE,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    });
  }

  drawMarker() {
    if (this.game.marker) {
      const x =
        this.game.marker.x * this.game.gridSize + this.game.gridSize / 2;
      const y =
        this.game.marker.y * this.game.gridSize +
        this.game.gridSize / 2 +
        this.game.topBorderSize;

      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = this.CONFIG.TARGET_OUTLINE_WIDTH;
      this.ctx.beginPath();
      this.ctx.arc(
        x,
        y,
        (this.game.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();

      this.ctx.font = `${this.CONFIG.MARKER_FONT_SIZE}px Arial`;
      this.ctx.fillStyle = "white";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("X", x, y);
    }
  }

  drawScoreboard() {
    this.ctx.fillStyle = "white";
    this.ctx.font = `${
      this.game.gridSize / this.CONFIG.SCOREBOARD_FONT_SCALE
    }px Arial`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const lives = `Lives: ${this.game.score.lives}`;
    const hits = `Hits: ${this.game.score.hits}`;
    const total = `Score: ${this.game.score.total}`;
    const moves = `Moves: ${this.game.score.moves}`;
    const level = `Level: ${this.game.level}`;

    this.ctx.fillText(lives, 10, 10);
    this.ctx.fillText(
      hits,
      10,
      10 + this.game.gridSize / this.CONFIG.SCOREBOARD_FONT_SCALE
    );
    this.ctx.fillText(total, this.game.canvas.width / 2, 10);
    this.ctx.fillText(
      moves,
      this.game.canvas.width / 2,
      10 + this.game.gridSize / this.CONFIG.SCOREBOARD_FONT_SCALE
    );
    this.ctx.fillText(
      level,
      this.game.canvas.width - this.game.gridSize * 2,
      10
    );
  }

  drawMessages() {
    if (this.game.gameOver || this.game.levelCleared) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      this.ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

      this.ctx.fillStyle = "white";
      this.ctx.font = `${this.CONFIG.MESSAGE_FONT_SCALE}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      const message = this.game.gameOver ? "Game Over" : "Level Cleared!";
      this.ctx.fillText(
        message,
        this.game.canvas.width / 2,
        this.game.canvas.height / 2
      );
    }
  }
}
