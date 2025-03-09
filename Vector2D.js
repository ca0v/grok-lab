export class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(other) {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }
    copy() {
        return new Vector2D(this.x, this.y);
    }
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    scale(s) {
        return new Vector2D(this.x * s, this.y * s);
    }
    subtract(pos) {
        return new Vector2D(this.x - pos.x, this.y - pos.y);
    }
    round(places = 0) {
        const factor = Math.pow(10, places);
        return new Vector2D(Math.round(this.x * factor) / factor, Math.round(this.y * factor) / factor);
    }
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
    toString() {
        return `(${this.x}, ${this.y})`;
    }
    isWithinBounds(width, height) {
        return this.x >= 0 && this.x < width && this.y >= 0 && this.y < height;
    }
}
