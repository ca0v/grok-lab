export class GestureEngine {
  constructor(joystickElement, game) {
    this.joystick = joystickElement
    this.game = game
    this.touchStart = null
    this.lastDirection = null
    this.threshold = 30 // Pixels to detect movement
    this.isActive = false

    this.joystick.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    )
    this.joystick.addEventListener("touchmove", this.handleTouchMove.bind(this))
    this.joystick.addEventListener("touchend", this.handleTouchEnd.bind(this))
  }

  handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    this.touchStart = { x: touch.clientX, y: touch.clientY }
    this.isActive = true
    this.joystick.classList.add("joystick-active")
  }

  handleTouchMove(e) {
    if (!this.isActive || !this.touchStart) return
    e.preventDefault()
    const touch = e.touches[0]
    const deltaX = touch.clientX - this.touchStart.x
    const deltaY = touch.clientY - this.touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance > this.threshold) {
      const direction = this.getDirection(deltaX, deltaY)
      if (direction !== this.lastDirection) {
        this.lastDirection = direction
        this.triggerMove(direction)
      }
      this.touchStart = { x: touch.clientX, y: touch.clientY } // Update start for repeated moves
    }
  }

  handleTouchEnd(e) {
    e.preventDefault()
    if (this.isActive) {
      this.isActive = false
      this.joystick.classList.remove("joystick-active")
      this.touchStart = null
      this.lastDirection = null
      if (e.changedTouches.length === 1 && e.type === "touchend") {
        // Treat a tap (quick lift) as a shoot
        this.game.handleInput(this.game.INPUT_MAP["shoot"])
      }
    }
  }

  getDirection(deltaX, deltaY) {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    if (absX > absY) {
      return deltaX > 0 ? "d" : "a"
    } else {
      return deltaY > 0 ? "s" : "w"
    }
  }

  triggerMove(direction) {
    const inputMap = {
      w: this.game.INPUT_MAP["w"],
      a: this.game.INPUT_MAP["a"],
      s: this.game.INPUT_MAP["s"],
      d: this.game.INPUT_MAP["d"],
    }
    const input = inputMap[direction]
    if (input) {
      this.game.handleInput(input)
    }
  }
}
