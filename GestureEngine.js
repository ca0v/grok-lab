export class GestureEngine {
  constructor(joystickElement, game) {
    this.joystick = joystickElement
    this.game = game
    this.touchStart = null
    this.lastDirection = null
    this.threshold = 30 // Pixels to detect movement
    this.isActive = false

    console.log("GestureEngine initialized with joystick:", this.joystick)
    this.joystick.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    )
    this.joystick.addEventListener("touchmove", this.handleTouchMove.bind(this))
    this.joystick.addEventListener("touchend", this.handleTouchEnd.bind(this))
  }

  handleTouchStart(e) {
    console.log("Touch started:", e)
    e.preventDefault()
    const touch = e.touches[0]
    this.touchStart = { x: touch.clientX, y: touch.clientY }
    this.isActive = true
    this.joystick.classList.add("joystick-active")
    this.lastDirection = null // Reset direction on new touch
    console.log(
      "Touch start position:",
      this.touchStart,
      "Active:",
      this.isActive
    )
  }

  handleTouchMove(e) {
    console.log("Touch moved:", e)
    if (!this.isActive || !this.touchStart) {
      console.log("Inactive or no touch start, skipping move:", {
        isActive: this.isActive,
        touchStart: this.touchStart,
      })
      return
    }
    e.preventDefault()
    const touch = e.touches[0]
    const deltaX = touch.clientX - this.touchStart.x
    const deltaY = touch.clientY - this.touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    console.log("Delta:", { deltaX, deltaY }, "Distance:", distance)

    if (distance > this.threshold) {
      const direction = this.getDirection(deltaX, deltaY)
      console.log(
        "Direction detected:",
        direction,
        "Last direction:",
        this.lastDirection
      )
      // Trigger move if direction changes or if it's a new significant move in the same direction
      if (
        direction !== this.lastDirection ||
        (direction === this.lastDirection && distance > this.threshold * 1.5)
      ) {
        this.lastDirection = direction
        this.triggerMove(direction)
        console.log("Triggering move with direction:", direction)
        this.touchStart = { x: touch.clientX, y: touch.clientY } // Update start for repeated moves
        console.log("Updated touch start:", this.touchStart)
      }
    }
  }

  handleTouchEnd(e) {
    console.log("Touch ended:", e)
    e.preventDefault()
    if (this.isActive) {
      this.isActive = false
      this.joystick.classList.remove("joystick-active")
      this.touchStart = null
      this.lastDirection = null
      console.log("Joystick deactivated, touchStart and lastDirection cleared")
      if (e.changedTouches.length === 1 && e.type === "touchend") {
        console.log("Detected tap, triggering shoot")
        this.game.handleInput(this.game.INPUT_MAP["shoot"])
      }
    }
  }

  getDirection(deltaX, deltaY) {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const direction =
      absX > absY ? (deltaX > 0 ? "d" : "a") : deltaY > 0 ? "s" : "w"
    console.log(
      "Calculated direction with deltas:",
      { deltaX, deltaY, absX, absY },
      "Result:",
      direction
    )
    return direction
  }

  triggerMove(direction) {
    console.log("Attempting to trigger move with direction:", direction)
    const inputMap = {
      w: this.game.INPUT_MAP["w"],
      a: this.game.INPUT_MAP["a"],
      s: this.game.INPUT_MAP["s"],
      d: this.game.INPUT_MAP["d"],
    }
    const input = inputMap[direction]
    if (input) {
      console.log("Input found, handling:", input)
      this.game.handleInput(input)
    } else {
      console.log("No input mapping found for direction:", direction)
    }
  }
}
