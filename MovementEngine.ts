import { lerpAngle } from "./fun.js";
import type { MazeMemoryGame } from "./maze-memory.js";
import { Vector2D } from "./Vector2D.js";

export class MovementEngine {
  game: MazeMemoryGame;

  constructor(game: MazeMemoryGame) {
    this.game = game;
  }

  updateTank(deltaTime: number) {
    const tank = this.game.tank;
    const speed = this.game.CONFIG.TANK_SPEED;
    const dx = tank.targetPos.x - tank.pos.x;
    const dy = tank.targetPos.y - tank.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.01) {
      const moveDistance = Math.min(distance, speed * deltaTime);
      const moveX = (dx / distance) * moveDistance;
      const moveY = (dy / distance) * moveDistance;

      tank.pos.x += moveX;
      tank.pos.y += moveY;

      if (distance < speed * deltaTime * 0.5) {
        tank.pos.x = tank.targetPos.x;
        tank.pos.y = tank.targetPos.y;
      }

      // Update angle based on movement direction
      const moveDir =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
          ? "down"
          : "up";
      const currentAngle = tank.currentAngle;
      const targetAngle = this.directionToAngle(moveDir);
      this.updateRotation(tank, currentAngle, targetAngle, deltaTime);
    } else {
      tank.pos.x = tank.targetPos.x;
      tank.pos.y = tank.targetPos.y;
      // Ensure rotation completes if still animating
      const currentAngle = tank.currentAngle;
      const targetAngle = this.directionToAngle(tank.dir); // Use tank.dir for final angle
      this.updateRotation(tank, currentAngle, targetAngle, deltaTime);
    }
  }

  // Helper method to get/set maze value at a Vector2D position
  private getMazeValue(pos: Vector2D): number {
    const gridPos = pos.round();
    if (
      gridPos.x < 0 ||
      gridPos.x >= this.game.mazeColCount ||
      gridPos.y < 0 ||
      gridPos.y >= this.game.mazeRowCount
    ) {
      return -1; // Out of bounds indicator
    }
    return this.game.maze[gridPos.y][gridPos.x];
  }

  private setMazeValue(pos: Vector2D, value: number): void {
    const gridPos = pos.round();
    if (
      gridPos.x >= 0 &&
      gridPos.x < this.game.mazeColCount &&
      gridPos.y >= 0 &&
      gridPos.y < this.game.mazeRowCount
    ) {
      this.game.maze[gridPos.y][gridPos.x] = value;
    }
  }

  updateCharacters(deltaTime: number) {
    this.game.castOfCharacters.forEach((character) => {
      character.update(deltaTime);
    });
  }

  updateBullets(deltaTime: number) {
    this.game.bullets = this.game.bullets.filter((bullet) => {
      const dirVec =
        this.game.DIRECTION_VECTORS[
          bullet.dir as keyof typeof this.game.DIRECTION_VECTORS
        ];
      const lastPos = bullet.pos.copy();
      const moveStep = dirVec
        .copy()
        .scale(this.game.CONFIG.BULLET_SPEED * deltaTime);
      bullet.pos = bullet.pos.add(moveStep);

      const bulletGridPos = bullet.pos.round();
      const mazeValue = this.getMazeValue(bulletGridPos);
      if (mazeValue === -1) {
        return false;
      } else if (mazeValue === 1) {
        this.setMazeValue(bulletGridPos, 0);
        if (!bullet.lifeDeducted) {
          this.game.score.lives--;
          bullet.lifeDeducted = true;
        }
        return false;
      }

      for (const character of this.game.castOfCharacters) {
        const distance = bullet.pos.distanceTo(character.pos);
        const hitRadius = this.game.CONFIG.TANK_RADIUS_SCALE; // Adjust if needed
        if (distance <= hitRadius) {
          if (character.onBulletHit) {
            return character.onBulletHit(bullet);
          }
          return true;
        }
      }

      const hitTarget = this.game.targets.find((target) => {
        if (target.hit) return false;
        const bulletToTarget = bullet.pos.subtract(target.pos);
        const distance = bulletToTarget.distanceTo(new Vector2D(0, 0));
        const hitRadius = this.game.CONFIG.TARGET_RADIUS_SCALE;
        const lastBulletToTarget = lastPos.subtract(target.pos);
        const lastDistance = lastBulletToTarget.distanceTo(new Vector2D(0, 0));
        const crossedTarget =
          (lastDistance > hitRadius && distance <= hitRadius) ||
          (lastDistance <= hitRadius && distance > hitRadius) ||
          distance <= hitRadius;
        return crossedTarget;
      });

      if (hitTarget) {
        if (hitTarget.num === this.game.currentTarget) {
          hitTarget.hit = true;
          const index = this.game.targets.indexOf(hitTarget);
          this.game.targets.splice(index, 1);
          hitTarget.flashTimer = this.game.CONFIG.FLASH_DURATION;
          this.game.score.hits++;
          this.game.currentTarget++;
        } else {
          this.game.score.lives--;
          hitTarget.flashTimer = this.game.CONFIG.FLASH_DURATION;
        }
        return false;
      }

      return true;
    });
  }

  moveFar(targetPos: Vector2D, dir: string): Vector2D {
    let newPos = targetPos.copy();
    while (
      this.game.isValidMove(
        newPos.add(
          this.game.DIRECTION_VECTORS[
            dir as keyof typeof this.game.DIRECTION_VECTORS
          ]
        )
      )
    ) {
      newPos = newPos.add(
        this.game.DIRECTION_VECTORS[
          dir as keyof typeof this.game.DIRECTION_VECTORS
        ]
      );
      if (this.game.isIntersection(newPos, this.oppositeDirection(dir))) break;
    }
    return newPos;
  }

  directionToAngle(dir: string): number {
    const angles: { [key: string]: number } = {
      up: -Math.PI / 2,
      down: Math.PI / 2,
      left: Math.PI,
      right: 0,
    };
    return angles[dir] || 0;
  }

  oppositeDirection(dir: string): string {
    const opposites: { [key: string]: string } = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };
    return opposites[dir] || dir;
  }

  updateTankDirection(dir: string) {
    const tank = this.game.tank;
    tank.dir = dir;
    const currentAngle = tank.currentAngle;
    const targetAngle = this.directionToAngle(dir);
    if (currentAngle !== targetAngle) {
      tank.rotationStart = performance.now(); // Start rotation animation
    }
  }

  updateRotation(
    tank: typeof this.game.tank,
    currentAngle: number,
    targetAngle: number,
    deltaTime: number
  ) {
    if (currentAngle !== targetAngle) {
      if (tank.rotationStart === null) tank.rotationStart = performance.now();
      const elapsed = performance.now() - tank.rotationStart!;
      const duration = this.game.CONFIG.ROTATION_DURATION;
      const progress = Math.min(elapsed / duration, 1);
      tank.currentAngle = lerpAngle(currentAngle, targetAngle, progress);
      if (progress === 1) {
        tank.rotationStart = null;
        tank.currentAngle = targetAngle;
      }
    }
  }
}
