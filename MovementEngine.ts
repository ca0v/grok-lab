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

  updateChaosMonster(deltaTime: number) {
    if (!this.game.chaosMonster) return;

    const chaosMonster = this.game.chaosMonster;

    // If holding a target, move back to origin and check if hit
    if (chaosMonster.holdingTarget) {
      const delta = chaosMonster.origin.subtract(chaosMonster.pos);
      const distance = delta.distanceTo(new Vector2D(0, 0));

      if (distance > 0.1) {
        const speed = chaosMonster.speed;
        const moveDistance = Math.min(distance, speed * deltaTime);
        const moveStep = delta.scale(1 / distance).scale(moveDistance);
        chaosMonster.pos = chaosMonster.pos.add(moveStep);
        console.log(
          `Monster moving to origin: (${chaosMonster.pos.x}, ${chaosMonster.pos.y})`
        );
      } else {
        chaosMonster.holdingTarget.pos = chaosMonster.origin.copy();
        chaosMonster.pos = chaosMonster.origin.copy();
        console.log(
          `Monster at origin, placed target at: (${chaosMonster.holdingTarget.pos.x}, ${chaosMonster.holdingTarget.pos.y})`
        );

        if (chaosMonster.holdingTarget.hit) {
          console.log(
            "updateChaosMonster",
            "Holding target hit, releasing target"
          );
          chaosMonster.holdingTarget = null;
        }
      }
    } else {
      // If not holding a target, move to the closest target
      if (!chaosMonster.target) {
        chaosMonster.target = this.game.findNearestTarget(chaosMonster.pos);
        if (!chaosMonster.target) {
          console.log("No targets left, removing chaos monster");
          this.game.chaosMonster = null;
          return;
        }
      }

      const delta = chaosMonster.target.pos.subtract(chaosMonster.pos);
      const distance = delta.distanceTo(new Vector2D(0, 0));

      if (distance > 0.1) {
        const speed = chaosMonster.speed;
        const moveDistance = Math.min(distance, speed * deltaTime);
        const moveStep = delta.scale(1 / distance).scale(moveDistance);
        chaosMonster.pos = chaosMonster.pos.add(moveStep);
        console.log(
          `Monster moving to target: (${chaosMonster.pos.x}, ${chaosMonster.pos.y})`
        );
      } else {
        chaosMonster.pos = chaosMonster.target.pos.copy();
        chaosMonster.holdingTarget = chaosMonster.target;
        chaosMonster.target = null;
        console.log("Picked up target, returning to origin");
      }
    }
  }

  // Helper method to get/set maze value at a Vector2D position
  private getMazeValue(pos: Vector2D): number {
    const gridPos = pos.round();
    if (
      gridPos.x < 0 ||
      gridPos.x >= this.game.mazeWidth ||
      gridPos.y < 0 ||
      gridPos.y >= this.game.mazeHeight
    ) {
      return -1; // Out of bounds indicator
    }
    return this.game.maze[gridPos.y][gridPos.x];
  }

  private setMazeValue(pos: Vector2D, value: number): void {
    const gridPos = pos.round();
    if (
      gridPos.x >= 0 &&
      gridPos.x < this.game.mazeWidth &&
      gridPos.y >= 0 &&
      gridPos.y < this.game.mazeHeight
    ) {
      this.game.maze[gridPos.y][gridPos.x] = value;
    }
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
          // Correct target: remove it and increment hits
          const index = this.game.targets.indexOf(hitTarget);
          this.game.targets.splice(index, 1);
          hitTarget.flashTimer = this.game.CONFIG.FLASH_DURATION;
          this.game.score.hits++;
          this.game.currentTarget++;
        } else {
          // Out of sequence: count as a miss and flash the target
          this.game.score.lives--;
          hitTarget.flashTimer = this.game.CONFIG.FLASH_DURATION; // Flash the missed target
          console.log(
            `Miss! Hit target #${hitTarget.num}, expected #${this.game.currentTarget}`
          );
        }
        return false;
      }

      const hitPowerUp = this.game.powerUps.find((p) => {
        const bulletToPowerUp = bullet.pos.subtract(p.pos);
        const distance = bulletToPowerUp.distanceTo(new Vector2D(0, 0));
        return (
          distance < this.game.CONFIG.POWER_UP_RADIUS_SCALE && p.opacity === 1
        );
      });

      if (hitPowerUp) {
        const index = this.game.powerUps.indexOf(hitPowerUp);
        this.game.powerUps.splice(index, 1);
        this.game.showNumbers = true;
        this.game.numberTimer = this.game.CONFIG.INITIAL_NUMBER_TIMER;
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
      tank.currentAngle = this.lerpAngle(currentAngle, targetAngle, progress);
      if (progress === 1) {
        tank.rotationStart = null;
        tank.currentAngle = targetAngle;
      }
    }
  }
}
