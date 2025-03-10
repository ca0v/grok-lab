// PowerUpLoader.ts
import { Vector2D } from "./Vector2D.js";
import type { MazeMemoryGame } from "./maze-memory.js";
import type { PowerUp, ICharacterLoader, Bullet } from "./Types.js";
import { range } from "./fun.js";

export class PowerUpLoader implements ICharacterLoader {
  load(game: MazeMemoryGame) {
    if (game.level >= game.CONFIG.POWER_UP_START_LEVEL) {
      const powerUpCount = Math.min(
        Math.floor(
          (game.level - game.CONFIG.POWER_UP_START_LEVEL) /
            game.CONFIG.LEVELS_PER_CYCLE
        ),
        game.CONFIG.MAX_POWER_UP_COUNT
      );
      range(powerUpCount).forEach(() => {
        let pos;
        do {
          pos = game.getRandomOpenPosition();
        } while (
          game.targets.some((t) => t.pos.equals(pos)) ||
          pos.equals(game.tank.pos) ||
          game.castOfCharacters.some((c) => c.pos.equals(pos))
        );
        const powerUp: PowerUp = {
          pos,
          type: "powerUp",
          opacity: 0,
          revealStart: performance.now(),
          update(deltaTime: number) {
            if (this.revealStart !== null) {
              const elapsed = performance.now() - this.revealStart;
              const duration = 1000;
              if (elapsed < duration) {
                this.opacity = Math.min(1, elapsed / duration);
              } else {
                this.opacity = 1;
                this.revealStart = null;
              }
            }
          },
          onBulletHit(bullet: Bullet) {
            if (this.opacity === 1) {
              game.numberTimer = game.CONFIG.INITIAL_NUMBER_TIMER;
              const index = game.castOfCharacters.indexOf(this);
              if (index !== -1) game.castOfCharacters.splice(index, 1);
              return true;
            }
            return false;
          },
          draw(ctx: CanvasRenderingContext2D) {
            ctx.save();
            ctx.translate(
              this.pos.x * game.cellSize + game.cellSize / 2,
              this.pos.y * game.cellSize +
                game.cellSize / 2 +
                game.topBorderSize
            );
            const radius =
              (game.cellSize / 2) * game.CONFIG.POWER_UP_RADIUS_SCALE;
            ctx.fillStyle = `rgba(255, 255, 0, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          },
        };
        game.castOfCharacters.push(powerUp);
      });
    }
  }
}
