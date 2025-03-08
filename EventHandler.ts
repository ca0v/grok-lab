import type { MazeMemoryGame } from "./maze-memory.js";
import { INPUT_MAP } from "./config.js";

export class EventHandler {
  game: MazeMemoryGame;
  INPUT_MAP: typeof INPUT_MAP;

  constructor(game: MazeMemoryGame) {
    this.game = game;
    this.INPUT_MAP = this.game.INPUT_MAP;
  }

  initializeEventHandlers() {
    const controls = document.getElementById("controls");
    if (!controls) return;

    controls
      .querySelectorAll<HTMLButtonElement>(".control-btn")
      .forEach((btn) => {
        btn.addEventListener("mousedown", () => {
          const direction = btn.dataset.direction;
          if (direction) this.handleInput({ action: "move", dir: direction });
        });
      });
  }

  setupInputHandlers() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "r") {
        this.game.clearGameState();
        this.game.level = 1;
        this.game.score.total = 0;
        this.game.score.hits = 0;
        this.game.resetLevel();
        return;
      }

      if (this.game.gameOver || this.game.levelCleared) return;
      if (this.game.keysPressed[e.key]) return;
      this.game.keysPressed[e.key] = true;

      const input =
        this.INPUT_MAP[e.key.toLowerCase() as keyof typeof this.INPUT_MAP] ||
        this.INPUT_MAP[e.key as keyof typeof this.INPUT_MAP];
      if (input) {
        e.preventDefault();
        this.handleInput(input);
        // Hide numbers after handling input, if applicable
        this.game.numberTimer = 0;
      }
    });

    document.addEventListener("keyup", (e) => {
      this.game.keysPressed[e.key] = false;
    });

    const controls = document.getElementById("controls");
    if (!controls) return;

    controls
      .querySelectorAll<HTMLButtonElement>(".control-btn")
      .forEach((btn) => {
        btn.addEventListener("mousedown", () => {
          const direction = btn.dataset.direction;
          if (direction) {
            this.game.lastButtonDirection = direction;
            this.handleInput({ action: "move", dir: direction });
          }
        });

        btn.addEventListener("mouseup", () => {
          this.game.lastButtonDirection = null;
        });

        btn.addEventListener("mouseleave", () => {
          this.game.lastButtonDirection = null;
        });

        btn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          const direction = btn.dataset.direction;
          if (direction) {
            this.game.lastButtonDirection = direction;
            this.handleInput({ action: "move", dir: direction });
          }
        });

        btn.addEventListener("touchend", () => {
          this.game.lastButtonDirection = null;
        });

        btn.addEventListener("touchcancel", () => {
          this.game.lastButtonDirection = null;
        });
      });
  }

  handleInput(input: { action: string; dir?: string }) {
    const tank = this.game.tank;

    if (this.game.gameOver || this.game.levelCleared) return;

    switch (input.action) {
      case "moveFar":
        if (input.dir) {
          tank.targetPos = this.game.movementEngine.moveFar(
            tank.targetPos,
            input.dir
          );
          tank.ignoreCollisions = false;
          this.game.score.moves++;
          this.game.movementEngine.updateTankDirection(input.dir);
        }
        break;

      case "moveOne":
        if (input.dir) {
          // If tank isn't facing the input direction, rotate only
          if (tank.dir !== input.dir) {
            this.game.movementEngine.updateTankDirection(input.dir);
          } else {
            // Tank is facing the right direction, move one cell
            const newPos = tank.targetPos.add(
              this.game.DIRECTION_VECTORS[
                input.dir as keyof typeof this.game.DIRECTION_VECTORS
              ]
            );
            if (this.game.isValidMove(newPos)) {
              tank.targetPos = newPos;
              tank.ignoreCollisions = false;
              this.game.score.moves++;
            }
          }
        }
        break;

      case "shoot":
        // Calculate bullet origin at the neighboring cell (barrel tip)
        const dirVec =
          this.game.DIRECTION_VECTORS[
            tank.dir as keyof typeof this.game.DIRECTION_VECTORS
          ];
        const bulletOrigin = tank.pos.copy();
        this.game.bullets.push({
          pos: bulletOrigin,
          dir: tank.dir,
          lifeDeducted: false,
        });
        break;

      case "marker":
        if (!this.game.marker) {
          // If there is no marker, create one at the tank's position
          this.game.marker = tank.pos.copy();
        } else {
          // If there is a marker, move the tank to it and remove the marker
          tank.targetPos = this.game.marker.copy();
          this.game.score.lives--;
          this.game.marker = null; // Remove the marker
        }
        break;

      case "peek":
        if (this.game.showAllTimer <= 0 && this.game.showNextTimer <= 0) {
          this.game.showNextTimer = this.game.CONFIG.POWER_UP_REVEAL_DURATION;
        }
        break;
    }
  }
}
