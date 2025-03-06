// RenderEngine.js
export class RenderEngine {
  constructor(game) {
    this.game = game;
    this.ctx = game.ctx;
    this.CONFIG = game.CONFIG;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    this.drawMaze();
    this.drawTargets();
    this.drawPowerUp();
    this.drawMarker(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--grid-bg"
      ) === "#333"
        ? "#fff"
        : "#000"
    );
    this.drawTank();
    this.drawChaosMonster();
    this.drawBullets();
    this.drawScoreboard(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--grid-bg"
      ) === "#333"
    );
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

  drawTargets() {
    this.game.targets.forEach((t) => {
      if (!t.hit) {
        const targetRadius =
          (this.game.gridSize / 2) * this.CONFIG.TARGET_RADIUS_SCALE;
        const x = t.pos.x * this.game.gridSize + this.game.gridSize / 2;
        const y =
          t.pos.y * this.game.gridSize +
          this.game.gridSize / 2 +
          this.game.topBorderSize;

        // Draw target outline
        this.ctx.fillStyle = this.CONFIG.TARGET_OUTLINE_COLOR;
        this.ctx.beginPath();
        this.ctx.arc(x, y, targetRadius + 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw target fill
        this.ctx.fillStyle = t.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, targetRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw target number
        if (
          this.game.showNumbers ||
          t.flashTimer > 0 ||
          this.game.showAllTimer > 0 ||
          (t.num === this.game.currentTarget && this.game.showNextTimer > 0)
        ) {
          const fontSize = Math.floor(
            (this.game.gridSize / 40) * this.CONFIG.TARGET_FONT_SIZE
          );
          this.ctx.font = `bold ${fontSize}px Arial`;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";

          // Outline for contrast
          this.ctx.strokeStyle = "black";
          this.ctx.lineWidth = 2;
          this.ctx.strokeText(t.num.toString(), x, y);

          // Fill with white
          this.ctx.fillStyle = "white";
          this.ctx.fillText(t.num.toString(), x, y);
        }
      }
    });
  }

  drawMarker(color) {
    if (this.game.marker) {
      this.ctx.fillStyle = color;
      this.ctx.font = `${this.CONFIG.MARKER_FONT_SIZE}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        "📍",
        this.game.marker.x * this.game.gridSize + this.game.gridSize / 2,
        this.game.marker.y * this.game.gridSize +
          this.game.gridSize / 2 +
          this.game.topBorderSize
      );
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
    this.ctx.fillStyle = this.CONFIG.TANK_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(
      0,
      0,
      (this.game.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.rotate(this.game.tank.currentAngle);
    this.ctx.fillStyle = "white";
    this.ctx.font = `${this.CONFIG.TANK_FONT_SIZE}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("➔", 0, 0);
    this.ctx.restore();
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
      this.ctx.fillStyle = this.CONFIG.CHAOS_MONSTER_COLOR;
      this.ctx.beginPath();
      this.ctx.arc(
        0,
        0,
        (this.game.gridSize / 2) * this.CONFIG.TANK_RADIUS_SCALE,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawBullets() {
    this.ctx.fillStyle = this.CONFIG.BULLET_COLOR;
    this.game.bullets.forEach((b) => {
      this.ctx.fillRect(
        b.pos.x * this.game.gridSize,
        b.pos.y * this.game.gridSize + this.game.topBorderSize,
        this.CONFIG.BULLET_SIZE,
        this.CONFIG.BULLET_SIZE
      );
    });
  }

  drawPowerUp() {
    this.game.powerUps.forEach((p) => {
      if (p.opacity > 0) {
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = this.CONFIG.POWER_UP_COLOR;
        this.ctx.beginPath();
        this.ctx.arc(
          p.pos.x * this.game.gridSize + this.game.gridSize / 2,
          p.pos.y * this.game.gridSize +
            this.game.gridSize / 2 +
            this.game.topBorderSize,
          this.game.gridSize * this.CONFIG.POWER_UP_RADIUS_SCALE,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }
    });
  }

  drawScoreboard(isDarkMode) {
    const fontSize = Math.floor(
      this.game.bannerHeight / this.CONFIG.SCOREBOARD_FONT_SCALE
    );
    this.ctx.fillStyle = isDarkMode ? "#222" : "#ddd";
    this.ctx.fillRect(0, 0, this.game.canvas.width, this.game.bannerHeight);
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    this.ctx.font = `${fontSize * 1.1}px Arial`;
    this.ctx.textBaseline = "middle";

    this.ctx.fillStyle = isDarkMode ? "#fff" : "black";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "Hits",
      this.game.canvas.width * 0.2,
      this.game.bannerHeight * 0.4
    );
    this.ctx.fillText(
      `Level: ${this.game.level}`,
      this.game.canvas.width * 0.5,
      this.game.bannerHeight * 0.4
    );
    this.ctx.fillText(
      "Lives",
      this.game.canvas.width * 0.8,
      this.game.bannerHeight * 0.4
    );

    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.fillStyle = isDarkMode ? "#ccc" : "black";
    this.ctx.fillText(
      this.game.score.hits,
      this.game.canvas.width * 0.2,
      this.game.bannerHeight * 0.7
    );
    this.ctx.fillStyle = isDarkMode ? "#fff" : "black";
    this.ctx.fillText(
      `Score: ${this.game.score.total} (Moves: ${this.game.score.moves})`,
      this.game.canvas.width * 0.5,
      this.game.bannerHeight * 0.7
    );

    this.ctx.fillStyle = "green";
    const circleRadius = fontSize / 4;
    const circleSpacing = circleRadius * 2;
    const totalIconsWidth =
      (this.game.score.lives + this.game.powerUps.length - 1) * circleSpacing +
      2 * circleRadius;
    const iconsStartX = this.game.canvas.width * 0.8 - totalIconsWidth / 2;

    for (let i = 0; i < this.game.score.lives; i++) {
      this.ctx.beginPath();
      this.ctx.arc(
        iconsStartX + i * circleSpacing + circleRadius,
        this.game.bannerHeight * 0.7,
        circleRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    this.ctx.fillStyle = this.CONFIG.POWER_UP_COLOR;
    for (let i = 0; i < this.game.powerUps.length; i++) {
      this.ctx.beginPath();
      this.ctx.arc(
        iconsStartX +
          (this.game.score.lives + i) * circleSpacing +
          circleRadius,
        this.game.bannerHeight * 0.7,
        circleRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  drawMessages() {
    if (this.game.levelCleared) {
      this.ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--textColor")
        .trim();
      this.ctx.font = `${Math.floor(
        this.game.canvas.height / this.CONFIG.MESSAGE_FONT_SCALE
      )}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        "Level Cleared! Starting New Level...",
        this.game.canvas.width / 2,
        this.game.canvas.height / 2
      );
    }

    if (this.game.gameOver) {
      this.ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--textColor")
        .trim();
      this.ctx.font = `${Math.floor(
        this.game.canvas.height / this.CONFIG.MESSAGE_FONT_SCALE
      )}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        "Game Over! Restarting...",
        this.game.canvas.width / 2,
        this.game.canvas.height / 2
      );
    }
  }
}
