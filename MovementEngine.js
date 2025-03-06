import { Vector2D } from "./Vector2D.js"

// MovementEngine.js
export class MovementEngine {
  constructor(game) {
    this.game = game
    this.DIRECTION_VECTORS = game.DIRECTION_VECTORS
    this.CONFIG = game.CONFIG
  }

  moveFar(startPos, dir) {
    let pos = startPos.copy()
    const dirVec = this.DIRECTION_VECTORS[dir]
    let fromDir
    switch (dir) {
      case "up":
        fromDir = "down"
        break
      case "down":
        fromDir = "up"
        break
      case "left":
        fromDir = "right"
        break
      case "right":
        fromDir = "left"
        break
    }
    while (true) {
      const nextPos = pos.add(dirVec)
      if (!this.game.isValidMove(nextPos)) break
      pos = nextPos
      if (this.game.isIntersection(pos, fromDir)) break
    }
    return pos
  }

  updateTankDirection(newDir) {
    if (this.game.tank.dir !== newDir) {
      this.game.tank.dir = newDir
      this.game.tank.rotationStart = performance.now()
      this.game.score.moves++
      switch (newDir) {
        case "up":
          this.game.tank.targetAngle = -Math.PI / 2
          break
        case "down":
          this.game.tank.targetAngle = Math.PI / 2
          break
        case "left":
          this.game.tank.targetAngle = Math.PI
          break
        case "right":
          this.game.tank.targetAngle = 0
          break
      }
    }
  }

  updateTank(deltaTime) {
    if (!this.game.tank.pos.equals(this.game.tank.targetPos)) {
      const dir = this.game.tank.targetPos.subtract(this.game.tank.pos)
      const distance = dir.distanceTo(new Vector2D(0, 0))
      const speed = this.CONFIG.TANK_SPEED * deltaTime
      if (distance > speed) {
        const move = dir.multiply(speed / distance)
        this.game.tank.pos = this.game.tank.pos.add(move)
      } else {
        this.game.tank.pos = this.game.tank.targetPos.copy()
        this.game.tank.ignoreCollisions = false
      }
    }

    if (this.game.tank.rotationStart !== null) {
      const elapsed = performance.now() - this.game.tank.rotationStart
      if (elapsed < this.CONFIG.ROTATION_DURATION) {
        const progress = elapsed / this.CONFIG.ROTATION_DURATION
        this.game.tank.currentAngle +=
          (this.game.tank.targetAngle - this.game.tank.currentAngle) * progress
      } else {
        this.game.tank.currentAngle = this.game.tank.targetAngle
        this.game.tank.rotationStart = null
      }
    }
  }

  updateChaosMonster(deltaTime) {
    if (this.game.chaosMonster) {
      if (!this.game.chaosMonster.holdingTarget) {
        if (this.game.chaosMonster.target) {
          const dx =
            this.game.chaosMonster.target.pos.x - this.game.chaosMonster.pos.x
          const dy =
            this.game.chaosMonster.target.pos.y - this.game.chaosMonster.pos.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance > 0.001) {
            const move = new Vector2D(dx, dy).multiply(
              Math.min(this.game.chaosMonster.speed * deltaTime, distance) /
                distance
            )
            this.game.chaosMonster.pos = this.game.chaosMonster.pos.add(move)
          } else {
            this.game.chaosMonster.holdingTarget = this.game.chaosMonster.target
            this.game.chaosMonster.target = null
          }
        } else {
          this.game.chaosMonster.target = this.game.findNearestTarget(
            this.game.chaosMonster.pos
          )
        }
      } else {
        const dx =
          this.game.chaosMonster.origin.x - this.game.chaosMonster.pos.x
        const dy =
          this.game.chaosMonster.origin.y - this.game.chaosMonster.pos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > 0.001) {
          const move = new Vector2D(dx, dy).multiply(
            Math.min(this.game.chaosMonster.speed * deltaTime, distance) /
              distance
          )
          this.game.chaosMonster.pos = this.game.chaosMonster.pos.add(move)
        } else {
          this.game.chaosMonster.holdingTarget.pos =
            this.game.chaosMonster.origin.copy()
          this.game.chaosMonster.holdingTarget = null
        }
      }
    }
  }

  updateBullets(deltaTime) {
    this.game.bullets = this.game.bullets.filter((b) => {
      const dirVec = this.DIRECTION_VECTORS[b.dir]
      b.pos = b.pos.add(dirVec.multiply(this.CONFIG.BULLET_SPEED * deltaTime))
      return !this.game.eventHandler.checkBulletCollision(b)
    })
  }
}
