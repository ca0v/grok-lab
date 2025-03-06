export class GestureEngine {
  constructor(joystickElement, game) {
    this.joystick = joystickElement;
    this.game = game;
    this.touchStart = null;
    this.lastDirection = null;
    this.threshold = 30; // Pixels to detect movement
    this.isActive = false;
    this.touchStartTime = null; // Track touch start time
    this.tapDurationThreshold = 300; // Max duration for a tap (in ms)
    this.hasMoved = false; // Track if significant movement occurred

    console.log("GestureEngine initialized with joystick:", this.joystick);
    this.joystick.addEventListener("touchstart", this.handleTouchStart.bind(this));
    this.joystick.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.joystick.addEventListener("touchend", this.handleTouchEnd.bind(this));
    // Add mouse support for browser simulation
    this.joystick.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.joystick.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.joystick.addEventListener("mouseup", this.handleMouseUp.bind(this));
  }

  handleTouchStart(e) {
    console.log("Touch started:", e);
    e.preventDefault();
    const touch = e.touches[0];
    this.touchStart = { x: touch.clientX, y: touch.clientY };
    this.touchStartTime = performance.now();
    this.isActive = true;
    this.hasMoved = false;
    this.joystick.classList.add("joystick-active");
    this.lastDirection = null;
    console.log(
      "Touch start position:",
      this.touchStart,
      "Active:",
      this.isActive,
      "Start time:",
      this.touchStartTime
    );
  }

  handleMouseDown(e) {
    console.log("Mouse down:", e);
    e.preventDefault();
    this.touchStart = { x: e.clientX, y: e.clientY };
    this.touchStartTime = performance.now();
    this.isActive = true;
    this.hasMoved = false;
    this.joystick.classList.add("joystick-active");
    this.lastDirection = null;
    console.log(
      "Mouse down position:",
      this.touchStart,
      "Active:",
      this.isActive,
      "Start time:",
      this.touchStartTime
    );
  }

  handleTouchMove(e) {
    console.log("Touch moved:", e);
    if (!this.isActive || !this.touchStart) {
      console.log("Inactive or no touch start, skipping move:", {
        isActive: this.isActive,
        touchStart: this.touchStart,
      });
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStart.x;
    const deltaY = touch.clientY - this.touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    console.log("Delta:", { deltaX, deltaY }, "Distance:", distance);

    if (distance > this.threshold) {
      this.hasMoved = true;
      const direction = this.getDirection(deltaX, deltaY);
      console.log("Direction detected:", direction, "Last direction:", this.lastDirection);
      if (
        direction !== this.lastDirection ||
        (direction === this.lastDirection && distance > this.threshold * 1.5)
      ) {
        this.lastDirection = direction;
        this.triggerMove(direction);
        console.log("Triggering move with direction:", direction);
        this.touchStart = { x: touch.clientX, y: touch.clientY };
        console.log("Updated touch start:", this.touchStart);
      }
    }
  }

  handleMouseMove(e) {
    console.log("Mouse moved:", e);
    if (!this.isActive || !this.touchStart) {
      console.log("Inactive or no touch start, skipping move:", {
        isActive: this.isActive,
        touchStart: this.touchStart,
      });
      return;
    }
    e.preventDefault();
    const deltaX = e.clientX - this.touchStart.x;
    const deltaY = e.clientY - this.touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    console.log("Delta:", { deltaX, deltaY }, "Distance:", distance);

    if (distance > this.threshold) {
      this.hasMoved = true;
      const direction = this.getDirection(deltaX, deltaY);
      console.log("Direction detected:", direction, "Last direction:", this.lastDirection);
      if (
        direction !== this.lastDirection ||
        (direction === this.lastDirection && distance > this.threshold * 1.5)
      ) {
        this.lastDirection = direction;
        this.triggerMove(direction);
        console.log("Triggering move with direction:", direction);
        this.touchStart = { x: e.clientX, y: e.clientY };
        console.log("Updated touch start:", this.touchStart);
      }
    }
  }

  handleTouchEnd(e) {
    console.log("Touch ended:", e);
    e.preventDefault();
    if (this.isActive) {
      const touchDuration = performance.now() - this.touchStartTime;
      this.isActive = false;
      this.joystick.classList.remove("joystick-active");
      const startX = this.touchStart.x;
      const startY = this.touchStart.y;
      this.touchStart = null;
      this.lastDirection = null;
      console.log(
        "Joystick deactivated, touchStart and lastDirection cleared. Duration:",
        touchDuration,
        "Has moved:",
        this.hasMoved
      );

      if (e.changedTouches.length === 1 && e.type === "touchend" && touchDuration < this.tapDurationThreshold) {
        if (!this.hasMoved) {
          // Check if the tap was on an edge
          const tappedEdge = this.checkEdgeTap(startX, startY);
          if (tappedEdge) {
            console.log(`Detected edge tap: ${tappedEdge}, triggering ${tappedEdge}`);
            this.game.handleInput(this.game.INPUT_MAP[tappedEdge]);
          } else {
            console.log("Detected center tap, triggering shoot");
            this.game.handleInput({ action: "shoot" });
          }
        } else {
          console.log("Not a tap (moved), skipping shoot");
        }
      }
    }
  }

  handleMouseUp(e) {
    console.log("Mouse up:", e);
    e.preventDefault();
    if (this.isActive) {
      const touchDuration = performance.now() - this.touchStartTime;
      this.isActive = false;
      this.joystick.classList.remove("joystick-active");
      const startX = this.touchStart.x;
      const startY = this.touchStart.y;
      this.touchStart = null;
      this.lastDirection = null;
      console.log(
        "Joystick deactivated, touchStart and lastDirection cleared. Duration:",
        touchDuration,
        "Has moved:",
        this.hasMoved
      );

      if (touchDuration < this.tapDurationThreshold) {
        if (!this.hasMoved) {
          // Check if the tap was on an edge
          const tappedEdge = this.checkEdgeTap(startX, startY);
          if (tappedEdge) {
            console.log(`Detected edge tap: ${tappedEdge}, triggering ${tappedEdge}`);
            this.game.handleInput(this.game.INPUT_MAP[tappedEdge]);
          } else {
            console.log("Detected center tap, triggering shoot");
            this.game.handleInput({ action: "shoot" });
          }
        } else {
          console.log("Not a tap (moved), skipping shoot");
        }
      }
    }
  }

  getDirection(deltaX, deltaY) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const direction = absX > absY ? (deltaX > 0 ? "d" : "a") : (deltaY > 0 ? "s" : "w");
    console.log("Calculated direction with deltas:", { deltaX, deltaY, absX, absY }, "Result:", direction);
    return direction;
  }

  triggerMove(direction) {
    console.log("Attempting to trigger move with direction:", direction);
    const inputMap = {
      w: this.game.INPUT_MAP["w"],
      a: this.game.INPUT_MAP["a"],
      s: this.game.INPUT_MAP["s"],
      d: this.game.INPUT_MAP["d"],
    };
    const input = inputMap[direction];
    if (input) {
      console.log("Input found, handling:", input);
      this.game.handleInput(input);
    } else {
      console.log("No input mapping found for direction:", direction);
    }
  }

  checkEdgeTap(clientX, clientY) {
    const joystickRect = this.joystick.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const edgeThreshold = joystickRect.width / 4; // Edge zone is the outer 25% of the joystick radius

    const distanceFromCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const joystickRadius = joystickRect.width / 2;

    // Check if the tap is in the outer 25% of the joystick
    if (distanceFromCenter > joystickRadius - edgeThreshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? "ArrowRight" : "ArrowLeft";
      } else {
        return deltaY > 0 ? "ArrowDown" : "ArrowUp";
      }
    }
    return null; // Not an edge tap
  }
}