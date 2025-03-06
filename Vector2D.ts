export class Vector2D {
  scale(s: number) {
    return new Vector2D(this.x * s, this.y * s);
  }
  subtract(pos: Vector2D) {
    return new Vector2D(this.x - pos.x, this.y - pos.y);
  }
  round(): Vector2D {
    return new Vector2D(
      Math.round(this.x * 1000) / 1000,
      Math.round(this.y * 1000) / 1000
    );
  }

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

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
