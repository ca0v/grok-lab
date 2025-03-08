import { Vector2D } from "./Vector2D.js"; // Will update to .ts

export const CONFIG = {
  MAX_POWER_UP_COUNT: 5,
  BANNER_HEIGHT_RATIO: 0.08,
  MAZE_WALL_COLOR: "gray",
  TANK_COLOR: "rgba(182, 182, 233, 0.8)",
  BULLET_COLOR: "red",
  POWER_UP_COLOR: "yellow",
  TARGET_OUTLINE_COLOR: "black",
  CHAOS_MONSTER_COLOR: "rgba(0, 255, 0, 0.5)",
  CHAOS_MONSTER_START_LEVEL: 4,
  POWER_UP_START_LEVEL: 3,
  CELL_SIZE_DEFAULT: 40, // Renamed from GRID_SIZE
  CANVAS_MARGIN: { HORIZONTAL: 40, VERTICAL: 60 },
  MAX_MISSES: 5,
  FRAME_DELTA: 1000 / 30,
  BULLET_SPEED: 12,
  TANK_SPEED: 6,
  CHAOS_MONSTER_SPEED: 4,
  MIN_CELL_COUNT: 7, // Renamed from MIN_GRID_SIZE
  MAX_CELL_COUNT: 15, // Renamed from MAX_GRID_WIDTH
  LEVELS_PER_CYCLE: 3,
  POWER_UP_REVEAL_DURATION: 3000,
  INITIAL_NUMBER_TIMER: 5000,
  GAME_OVER_DELAY: 3000,
  LEVEL_CLEAR_DELAY: 2000,
  CONTROLS_HEIGHT: 200,
  BULLET_SIZE: 5,
  TANK_RADIUS_SCALE: 0.4,
  TARGET_RADIUS_SCALE: 0.8,
  TARGET_OUTLINE_WIDTH: 2,
  POWER_UP_RADIUS_SCALE: 0.25,
  ROTATION_DURATION: 50,
  FLASH_DURATION: 1000,
  LEVEL_SIZE_INCREMENT: 2, // Renamed from MAZE_SIZE_INCREMENT
  TARGETS_BASE: 3,
  TARGETS_PER_LEVEL: 3,
  MESSAGE_FONT_SCALE: 20,
  MARKER_FONT_SIZE: 30,
  TANK_FONT_SIZE: 20,
  TARGET_FONT_SIZE: 30,
} as const;

export const INPUT_MAP = {
  w: { action: "moveFar", dir: "up" },
  s: { action: "moveFar", dir: "down" },
  a: { action: "moveFar", dir: "left" },
  d: { action: "moveFar", dir: "right" },
  ArrowUp: { action: "moveOne", dir: "up" },
  ArrowDown: { action: "moveOne", dir: "down" },
  ArrowLeft: { action: "moveOne", dir: "left" },
  ArrowRight: { action: "moveOne", dir: "right" },
  " ": { action: "shoot" },
  x: { action: "marker" },
  m: { action: "marker" },
  "?": { action: "peek" },
  p: { action: "peek" },
  up: { action: "move", dir: "up" },
  down: { action: "move", dir: "down" },
  left: { action: "move", dir: "left" },
  right: { action: "move", dir: "right" },
  marker: { action: "marker" },
  peek: { action: "peek" },
} as const;

export const DIRECTION_VECTORS = {
  up: new Vector2D(0, -1),
  down: new Vector2D(0, 1),
  left: new Vector2D(-1, 0),
  right: new Vector2D(1, 0),
} as const;
