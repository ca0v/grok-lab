export class Vector2D {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  add(other) {
    return new Vector2D(this.x + other.x, this.y + other.y)
  }

  subtract(other) {
    return new Vector2D(this.x - other.x, this.y - other.y)
  }

  equals(other) {
    return this.x === other.x && this.y === other.y
  }

  distanceTo(other) {
    const dx = this.x - other.x
    const dy = this.y - other.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  copy() {
    return new Vector2D(this.x, this.y)
  }

  multiply(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar)
  }
}
