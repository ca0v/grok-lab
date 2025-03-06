export class Vector2D {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  copy(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  distanceTo(other: Vector2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  equals(other: Vector2D): boolean {
    return this.x === other.x && this.y === other.y;
  }
}
