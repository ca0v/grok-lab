have a level where you are given the proper firing sequence, e.g 4,1,7,9,3,2,5,6,8 and then the numbers stay visible.

# Tank Memory Maze

A maze-based memory game where you control a tank to shoot numbered targets in order while avoiding a chaos monster that moves targets around.

## Project Files

The following table lists the core TypeScript files in the project along with their descriptions:

| File                | Description                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `EventHandler.ts`   | Manages user input events (keyboard, mouse, touch) and translates them into game actions like moving the tank or shooting.           |
| `GestureEngine.ts`  | Handles touch and mouse gestures for joystick controls, enabling directional movement, shooting, and other actions via gestures.     |
| `MovementEngine.ts` | Controls game object movements, including the tank, chaos monster, bullets, and maze interactions like wall destruction.             |
| `RenderEngine.ts`   | Renders the game visuals, including the maze, tank, targets, chaos monster, bullets, power-ups, and UI elements like the scoreboard. |
| `Vector2D.ts`       | Provides a 2D vector class with utility methods for position and movement calculations, used throughout the game for coordinates.    |
| `config.ts`         | Defines game configuration constants, input mappings, and direction vectors for consistent settings across the game.                 |
| `maze-memory.ts`    | The main game logic file, orchestrating game state, maze generation, updates, and the game loop for the Maze Memory game.            |

## How to Play

- **Move Far:** Use WASD to move to the next wall or intersection.
- **Move One:** Use arrow keys to move one cell.
- **Shoot:** Press spacebar to fire at targets or the power-up.
- **Marker:** Press X to set or move to a marker.
- **Peek:** Press ? to briefly reveal the next target (costs a life).
- **Goal:** Hit targets in numerical order. Game over at 0 lives.

## Features

- Chaos monster (ghost) starts at level 1, moves targets to its origin.
- Power-up reveals all numbers when shot.
- Lives displayed as green circles, gain one per level (max 5).
- Score rewards fewer moves.

## Play Online

[Play Tank Memory Maze](https://ca0v.github.io/grok-lab/maze-memory.html)

## Requirements

- Modern web browser (Chrome, Firefox, etc.)
