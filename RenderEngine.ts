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
      "0000000110000000",
      "0111100110011110",
      "0111100110011110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111111111111110",
      "0111000000001110",
      "0111000000001110",
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
          const text = target.num.toString();
          this.ctx.font = `${
            this.CONFIG.TARGET_FONT_SIZE / Math.sqrt(text.length)
          }px Arial`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(text, x, y);
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
      this.ctx.stroke();

      this.ctx.font = `${this.CONFIG.MARKER_FONT_SIZE}px Arial`;
      this.ctx.fillStyle = "white";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("X", x, y);
    }
  }

  // Convert column (0 to 11) to pixel x-coordinate
  private col(column: number): number {
    const colWidth = this.game.canvas.width / 12; // 12 columns
    return column * colWidth;
  }

  // Convert row (0 to 3) to pixel y-coordinate within the banner
  private row(row: number): number {
    const rowHeight = this.game.topBorderSize / 4; // 4 rows
    return row * rowHeight;
  }

  drawScoreboard() {
    const isSmallDevice = this.CONFIG.DEVICE_FLAG.small;

    this.ctx.fillStyle = "white";
    const bannerHeight =
      this.game.canvas.width * this.CONFIG.BANNER_HEIGHT_RATIO;
    const fontSize = bannerHeight * 0.3 * (isSmallDevice ? 1.5 : 1);
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const circleRadius = fontSize / 3; // Circle size based on font size

    const livesCount = this.game.score.lives;
    this.ctx.fillStyle = this.CONFIG.LIFE_COLOR; // e.g., "blue"
    for (let i = 0; i < livesCount; i++) {
      const x = this.col(0.5 * (1 + i)); // Col 0 to 2
      const y = this.row(0.5); // Row 0
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

    const powerUpCount = this.game.powerUps.length;
    this.ctx.fillStyle = this.CONFIG.POWER_UP_COLOR; // e.g., "yellow"
    for (let i = 0; i < powerUpCount; i++) {
      const x = this.col(0.5 * (1 + i)); // Col 0 to 2
      const y = this.row(2); // Row 1
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

    // Center: Total (col 6, row 0)
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "center";

    if (!isSmallDevice) {
      this.ctx.fillText("SCORE", this.col(4), this.row(0));
      this.ctx.fillText(this.game.score.total + "", this.col(4), this.row(2));
      this.ctx.fillText("MOVES", this.col(6), this.row(0));
      this.ctx.fillText(this.game.score.moves + "", this.col(6), this.row(2));
      this.ctx.fillText("HITS", this.col(8), this.row(0));
      this.ctx.fillText(this.game.score.hits + "", this.col(8), this.row(2));
      this.ctx.fillText("LEVEL", this.col(10), this.row(0));
      this.ctx.fillText(this.game.level + "", this.col(10), this.row(2));
    } else {
      this.ctx.fillText("SCORE", this.col(6), this.row(0));
      this.ctx.fillText(this.game.score.total + "", this.col(6), this.row(2));
      this.ctx.fillText("LEVEL", this.col(10), this.row(0));
      this.ctx.fillText(this.game.level + "", this.col(10), this.row(2));
    }
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
