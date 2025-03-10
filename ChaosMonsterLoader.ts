// ChaosMonsterLoader.ts
import { Vector2D } from "./Vector2D.js";
import type { MazeMemoryGame } from "./maze-memory.js";
import type { ChaosMonster, Target, ICharacterLoader } from "./Types.js";

export class ChaosMonsterLoader implements ICharacterLoader {
  load(game: MazeMemoryGame) {
    if (game.level >= game.CONFIG.CHAOS_MONSTER_START_LEVEL) {
      const monsterPos = game.getRandomOpenPosition();
      const difficulty = Math.floor(
        (game.level - 1) / game.CONFIG.LEVELS_PER_CYCLE
      );
      const chaosMonster: ChaosMonster = {
        pos: monsterPos.copy(),
        origin: monsterPos.copy(),
        speed: game.CONFIG.CHAOS_MONSTER_SPEED + difficulty,
        holdingTarget: null,
        target: null,
        update(deltaTime: number) {
          if (this.holdingTarget) {
            const delta = this.origin.subtract(this.pos);
            const distance = delta.distanceTo(new Vector2D(0, 0));
            if (distance > 0.1) {
              const moveDistance = Math.min(distance, this.speed * deltaTime);
              const moveStep = delta.scale(1 / distance).scale(moveDistance);
              this.pos = this.pos.add(moveStep);
            } else {
              this.pos = this.origin.copy();
              if (this.holdingTarget.hit) {
                this.holdingTarget = null;
              } else {
                this.holdingTarget.pos = this.origin.copy();
              }
            }
          } else if (!this.target) {
            this.target = game.findNearestTarget(this.pos);
            if (!this.target) {
              const index = game.castOfCharacters.indexOf(this);
              if (index !== -1) game.castOfCharacters.splice(index, 1);
              return;
            }
          } else {
            const delta = this.target.pos.subtract(this.pos);
            const distance = delta.distanceTo(new Vector2D(0, 0));
            if (distance > 0.1) {
              const moveDistance = Math.min(distance, this.speed * deltaTime);
              const moveStep = delta.scale(1 / distance).scale(moveDistance);
              this.pos = this.pos.add(moveStep);
            } else {
              this.pos = this.target.pos.copy();
              this.holdingTarget = this.target;
              this.target = null;
            }
          }
        },
      };
      game.castOfCharacters.push(chaosMonster);
      chaosMonster.target = game.findNearestTarget(chaosMonster.pos);
    }
  }
}
