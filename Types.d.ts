import type { Vector2D } from "./Vector2D";

/**
 * Represents the state and properties of the player's tank in the game.
 * @property {Vector2D} pos - The current position of the tank on the grid.
 * @property {Vector2D} targetPos - The target position the tank is moving toward.
 * @property {string} dir - The current direction the tank is facing ("up", "down", "left", "right").
 * @property {number} currentAngle - The current rotation angle of the tank in radians.
 * @property {number} targetAngle - The target rotation angle the tank is animating toward in radians.
 * @property {number | null} rotationStart - The timestamp (in milliseconds) when the rotation animation started, or null if not rotating.
 * @property {boolean} ignoreCollisions - Flag indicating whether the tank should ignore collision detection (e.g., when moving through walls).
 */
export interface Tank {
  pos: Vector2D;
  targetPos: Vector2D;
  dir: string;
  currentAngle: number;
  targetAngle: number;
  rotationStart: number | null;
  ignoreCollisions: boolean;
}

/**
 * Represents the state and behavior of the chaos monster entity in the game.
 * @property {Vector2D} pos - The current position of the chaos monster on the grid.
 * @property {Vector2D} origin - The original position where the chaos monster starts or returns to.
 * @property {number} speed - The movement speed of the chaos monster.
 * @property {any} holdingTarget - The target currently being held by the chaos monster (type to be refined based on target structure).
 * @property {any} target - The target the chaos monster is currently pursuing (type to be refined based on target structure).
 */
export interface ChaosMonster {
  pos: Vector2D;
  origin: Vector2D;
  speed: number;
  holdingTarget: any;
  target: any;
}

/**
 * Represents a target object that the player must hit in sequence.
 * @property {Vector2D} pos - The position of the target on the grid.
 * @property {number} num - The sequence number of the target (e.g., 1, 2, 3).
 * @property {boolean} hit - Indicates whether the target has been hit by the player.
 * @property {number} flashTimer - The remaining time (in milliseconds) for the target to flash after being hit or missed.
 * @property {string} color - The color of the target, used for visual distinction.
 */
export interface Target {
  pos: Vector2D;
  num: number;
  hit: boolean;
  flashTimer: number;
  color: string;
}

/**
 * Represents a bullet fired by the tank.
 * @property {Vector2D} pos - The current position of the bullet on the grid.
 * @property {string} dir - The direction the bullet is traveling ("up", "down", "left", "right").
 * @property {boolean} lifeDeducted - Indicates whether a life has already been deducted when the bullet hit a wall.
 */
export interface Bullet {
  pos: Vector2D;
  dir: string;
  lifeDeducted: boolean;
}

/**
 * Represents a power-up item that can be collected by the player.
 * @property {Vector2D} pos - The position of the power-up on the grid.
 * @property {number} opacity - The current opacity level of the power-up (0 to 1) for fade-in effect.
 * @property {number | null} revealStart - The timestamp (in milliseconds) when the power-up started revealing, or null if fully revealed.
 */
export interface PowerUp {
  pos: Vector2D;
  opacity: number;
  revealStart: number | null;
}

/**
 * Represents the player's score and game statistics.
 * @property {number} hits - The number of targets successfully hit by the player.
 * @property {number} lives - The number of lives remaining for the player.
 * @property {number} total - The total score accumulated by the player.
 * @property {number} moves - The number of moves made by the player.
 */
export interface Score {
  hits: number;
  lives: number;
  total: number;
  moves: number;
}
