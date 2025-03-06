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

      // Update position without snapping mid-move
      tank.pos.x += moveX;
      tank.pos.y += moveY;

      // Snap only when very close to target, preserving animation
      if (distance < speed * deltaTime * 0.5) {
        tank.pos.x = tank.targetPos.x;
        tank.pos.y = tank.targetPos.y;
      }

      const dir =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
          ? "down"
          : "up";
      const currentAngle = tank.currentAngle;
      const targetAngle = this.directionToAngle(dir);

      if (currentAngle !== targetAngle) {
        if (tank.rotationStart === null) tank.rotationStart = performance.now();
        const elapsed = performance.now() - tank.rotationStart!;
        const duration = this.game.CONFIG.ROTATION_DURATION;
        const progress = Math.min(elapsed / duration, 1);
        tank.currentAngle = this.lerpAngle(currentAngle, targetAngle, progress);
        if (progress === 1) {
          tank.rotationStart = null;
          tank.currentAngle = targetAngle;
        }
      }
    } else {
      tank.pos.x = tank.targetPos.x;
      tank.pos.y = tank.targetPos.y;
      tank.rotationStart = null;
    }
    console.log(`Tank pos: (${tank.pos.x}, ${tank.pos.y})`);
  }

  updateChaosMonster(deltaTime: number) {
    if (!this.game.chaosMonster) return;

    const chaosMonster = this.game.chaosMonster;
    if (!chaosMonster.target || chaosMonster.holdingTarget) return;

    const dx = chaosMonster.target.pos.x - chaosMonster.pos.x;
    const dy = chaosMonster.target.pos.y - chaosMonster.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.1) {
      const speed = chaosMonster.speed;
      const moveDistance = Math.min(distance, speed * deltaTime);
      chaosMonster.pos.x += (dx / distance) * moveDistance;
      chaosMonster.pos.y += (dy / distance) * moveDistance;
    } else {
      chaosMonster.pos.x = chaosMonster.target.pos.x;
      chaosMonster.pos.y = chaosMonster.target.pos.y;
      chaosMonster.holdingTarget = chaosMonster.target;

      const newTarget = this.game.targets.find(
        (t) => !t.hit && t !== chaosMonster.target
      );
      chaosMonster.target = newTarget || null;
    }
  }

  updateBullets(deltaTime: number) {
    this.game.bullets = this.game.bullets.filter((bullet) => {
      const dirVec =
        this.game.DIRECTION_VECTORS[
          bullet.dir as keyof typeof this.game.DIRECTION_VECTORS
        ];
      const lastPos = bullet.pos.copy(); // Previous position
      const moveStep = dirVec
        .copy()
        .scale(this.game.CONFIG.BULLET_SPEED * deltaTime); // Vector movement
      bullet.pos = bullet.pos.add(moveStep);

      const bulletGridPos = new Vector2D(
        Math.round(bullet.pos.x),
        Math.round(bullet.pos.y)
      );
      if (
        bulletGridPos.x < 0 ||
        bulletGridPos.x >= this.game.mazeWidth ||
        bulletGridPos.y < 0 ||
        bulletGridPos.y >= this.game.mazeHeight ||
        this.game.maze[bulletGridPos.y][bulletGridPos.x] === 1
      ) {
        return false;
      }

      const hitTarget = this.game.targets.find((target) => {
        if (target.hit) return false;
        const bulletToTarget = bullet.pos.subtract(target.pos);
        const distance = bulletToTarget.distanceTo(new Vector2D(0, 0)); // Length from origin
        const hitRadius = this.game.CONFIG.TARGET_RADIUS_SCALE; // Full radius (0.8)

        // Check if bullet passed through target this frame
        const lastBulletToTarget = lastPos.subtract(target.pos);
        const lastDistance = lastBulletToTarget.distanceTo(new Vector2D(0, 0));
        const crossedTarget =
          (lastDistance > hitRadius && distance <= hitRadius) ||
          (lastDistance <= hitRadius && distance > hitRadius) ||
          distance <= hitRadius;

        return crossedTarget;
      });

      if (hitTarget) {
        hitTarget.hit = true;
        hitTarget.flashTimer = this.game.CONFIG.FLASH_DURATION;
        this.game.score.hits++;

        if (hitTarget.num === this.game.currentTarget) {
          this.game.currentTarget++;
        } else {
          this.game.score.lives--;
          this.game.currentTarget = 1;
          this.game.targets.forEach((t) => (t.hit = false));
        }
        return false;
      }

      const hitPowerUp = this.game.powerUps.find((p) => {
        const bulletToPowerUp = bullet.pos.subtract(p.pos);
        const distance = bulletToPowerUp.distanceTo(new Vector2D(0, 0));
        return (
          distance < this.game.CONFIG.POWER_UP_RADIUS_SCALE &&
          p.opacity === 1
        );
      });

      if (hitPowerUp) {
        const index = this.game.powerUps.indexOf(hitPowerUp);
        this.game.powerUps.splice(index, 1);
        this.game.score.lives = Math.min(
          this.game.score.lives + 1,
          this.game.CONFIG.MAX_MISSES
        );
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

  lerpAngle(from: number, to: number, progress: number): number {
    const difference = ((to - from + Math.PI) % (2 * Math.PI)) - Math.PI;
    return from + difference * progress;
  }

  updateTankDirection(dir: string) {
    this.game.tank.dir = dir;
  }
}
