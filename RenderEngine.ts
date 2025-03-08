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
    for (let y = 0; y < this.game.mazeRowCount; y++) {
      for (let x = 0; x < this.game.mazeColCount; x++) {
        this.ctx.fillStyle =
          this.game.maze[y][x] === 1 ? this.CONFIG.MAZE_WALL_COLOR : bgColor;
        this.ctx.fillRect(
          x * this.game.cellSize,
          y * this.game.cellSize + this.game.topBorderSize,
          this.game.cellSize,
          this.game.cellSize
        );
      }
    }
  }

  drawTank() {
    this.ctx.save();
    this.ctx.translate(
      this.game.tank.pos.x * this.game.cellSize + this.game.cellSize / 2,
      this.game.tank.pos.y * this.game.cellSize +
        this.game.cellSize / 2 +
        this.game.topBorderSize
    );
    this.ctx.rotate(this.game.tank.currentAngle + Math.PI / 2); // Add 90 degrees clockwise

    const tankSize = this.game.cellSize * this.CONFIG.TANK_RADIUS_SCALE; // e.g., 0.5 * gridSize
    const cellSize = (tankSize * 2) / 16; // 16x16 grid, fit within tankSize * 2
    const center = (16 / 2) * cellSize; // Center of 16x16 grid

    // Adjusted 16x16 pixel map
    const pixelMap = [
      "0000000110000000",
      "0000000BB0000000",
      "0000000110000000",
      "0000000110000000",
      "0010100110010100",
      "0111100110011110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111110000111110",
      "0010100000010100",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
    ];

    for (let y = 0; y < 16; y++) {
      const row = pixelMap[y];
      for (let x = 0; x < 16; x++) {
        if (row[x] !== "0") {
          // Override fillStyle with BULLET_COLOR for "B" cells
          this.ctx.fillStyle =
            row[x] === "B" ? this.CONFIG.BULLET_COLOR : this.CONFIG.TANK_COLOR;
          this.ctx.fillRect(
            x * cellSize - center,
            y * cellSize - center,
            cellSize,
            cellSize
          );
        }
      }
    }

    this.ctx.restore();
  }

  drawTargets() {
    this.game.targets.forEach((target) => {
      if (!target.hit || target.flashTimer > 0) {
        const targetRadius =
          (this.game.cellSize / 2) * this.CONFIG.TARGET_RADIUS_SCALE;
        const x = target.pos.x * this.game.cellSize + this.game.cellSize / 2;
        const y =
          target.pos.y * this.game.cellSize +
          this.game.cellSize / 2 +
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
          this.game.numberTimer > 0 ||
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
        this.game.chaosMonster.pos.x * this.game.cellSize +
          this.game.cellSize / 2,
        this.game.chaosMonster.pos.y * this.game.cellSize +
          this.game.cellSize / 2 +
          this.game.topBorderSize
      );

      const radius = (this.game.cellSize / 2) * this.CONFIG.TANK_RADIUS_SCALE;
      this.ctx.fillStyle = this.CONFIG.CHAOS_MONSTER_COLOR;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawPowerUp() {
    this.game.powerUps.forEach((p) => {
      const radius =
        (this.game.cellSize / 2) * this.CONFIG.POWER_UP_RADIUS_SCALE;
      this.ctx.fillStyle = `rgba(255, 255, 0, ${p.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(
        p.pos.x * this.game.cellSize + this.game.cellSize / 2,
        p.pos.y * this.game.cellSize +
          this.game.cellSize / 2 +
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
        bullet.pos.x * this.game.cellSize + this.game.cellSize / 2,
        bullet.pos.y * this.game.cellSize +
          this.game.cellSize / 2 +
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
        this.game.marker.x * this.game.cellSize + this.game.cellSize / 2;
      const y =
        this.game.marker.y * this.game.cellSize +
        this.game.cellSize / 2 +
        this.game.topBorderSize;

      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = this.CONFIG.TARGET_OUTLINE_WIDTH;
      this.ctx.beginPath();
      this.ctx.arc(
        x,
        y,
        (this.game.cellSize / 2) * this.CONFIG.TANK_RADIUS_SCALE,
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
    const bannerHeight =
      this.game.canvas.width * this.CONFIG.BANNER_HEIGHT_RATIO;
    const fontSize = bannerHeight * 0.3;
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    // Calculate line height to fit within banner (topBorderSize)
    const lineHeight = Math.min(fontSize * 1.2, this.game.topBorderSize / 3); // Fit up to 3 lines
    const padding = 10; // Left/right padding
    const circleRadius = fontSize / 2; // Circle size based on font size

    // Left side: Lives as TANK_COLOR circles, PowerUps as POWER_UP_COLOR circles
    const livesCount = this.game.score.lives;
    this.ctx.fillStyle = this.CONFIG.TANK_COLOR; // e.g., "blue"
    for (let i = 0; i < livesCount; i++) {
      const x = padding + i * (circleRadius * 2 + 2); // Space circles horizontally
      const y = padding;
      this.ctx.beginPath();
      this.ctx.arc(
        x + circleRadius,
        y + circleRadius,
        circleRadius,
        0,
        Math.PI * 2
      ); // Offset by radius for proper positioning
      this.ctx.fill();
    }

    const powerUpCount = this.game.powerUps.length;
    this.ctx.fillStyle = this.CONFIG.POWER_UP_COLOR; // e.g., "yellow"
    for (let i = 0; i < powerUpCount; i++) {
      const x = padding + i * (circleRadius * 2 + 2); // Space circles horizontally
      const y = padding + lineHeight;
      this.ctx.beginPath();
      this.ctx.arc(
        x + circleRadius,
        y + circleRadius,
        circleRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    // Center: Total, Moves
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "center";
    const total = `Score: ${this.game.score.total}`;
    const moves = `Moves: ${this.game.score.moves}`;
    this.ctx.fillText(total, this.game.canvas.width / 2, padding);
    this.ctx.fillText(moves, this.game.canvas.width / 2, padding + lineHeight);

    // Right side: Level, Hits
    this.ctx.textAlign = "right";
    const level = `Level: ${this.game.level}`;
    const hits = `Hits: ${this.game.score.hits}`;
    this.ctx.fillText(level, this.game.canvas.width - padding, padding);
    this.ctx.fillText(
      hits,
      this.game.canvas.width - padding,
      padding + lineHeight
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
