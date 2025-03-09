# Maze Memory Roku App

This is a Roku port of the "Maze Memory" game, originally developed as a web app hosted at [https://ca0v.github.io/grok-lab/maze-memory.html](https://ca0v.github.io/grok-lab/maze-memory.html). The game features a tank navigating a maze, shooting targets in sequence, avoiding a chaos monster, collecting power-ups, and managing lives and scores across levels. This port was created by Grok, an AI assistant from xAI, translating the original TypeScript, HTML, and CSS into BrightScript and SceneGraph for Roku compatibility.

## Project Structure

The app is contained in the `app/` directory, which is zipped and deployed to a Roku device. Here’s what each file does:

- **`manifest`**:

  - Metadata for the Roku app, including title ("Maze Memory"), version (1.0.0), and icon/splash screen paths (`pkg:/images/...`). These images are generated from a screenshot and stored in the project root’s `images/` folder.

- **`source/Main.brs`**:

  - The entry point of the app. Creates a `roSGScreen`, sets up a message port, and launches the `MazeScene` component. Runs an infinite loop to keep the app active.

- **`components/MazeScene.xml`**:

  - Defines the SceneGraph UI structure. Includes a dark gray background, maze group, tank, chaos monster, bullets, targets, power-ups, marker, scoreboard, instructions, and message labels. Uses relative sizing and positioning for adaptability across screen resolutions.

- **`components/MazeScene.brs`**:

  - The core logic of the game. Implements maze generation, tank movement (arrows for `moveFar`, rewind/play/fast-forward for `moveOne`/rotate), shooting (OK), target hitting, chaos monster AI, power-ups, markers (\*), peek (options), scoring, and level progression. Uses a 30 FPS timer for updates and scales elements based on screen size from `roDeviceInfo.GetDisplaySize()`.

- **`deploy.js`**:

  - A Node.js script that zips `app/` into `maze-memory.zip` and uploads it to the Roku device at IP `123.123.123.123` using `roku-deploy`.

- **`generate-images.js`**:
  - A Node.js script that generates `icon_hd.png`, `icon_sd.png`, `splash_hd.png`, and `splash_sd.png` from `screenshot.png`, scaling the full image to fit each target size with padding, and saves them to `./images/`.

## Prerequisites

- **Roku Device**: Any Roku model (e.g., Roku Express, Streaming Stick).
- **Node.js**: Installed on your computer (v16+ recommended).
- **Roku in Developer Mode**: See below for setup.
- **Network**: Your Roku and computer must be on the same Wi-Fi network.

## Enabling Developer Mode on Roku

To sideload the app, enable developer mode on your Roku device:

1. **Access Developer Settings**:

   - On your Roku remote, press: **Home 3x, Up 2x, Right, Left, Right, Left, Right**.
   - The "Developer Settings" screen will appear.

2. **Enable Developer Mode**:

   - Note the IP address displayed (e.g., `123.123.123.123`—used in `deploy.js`).
   - Click "Enable installer and restart".
   - Accept the SDK License Agreement.

3. **Set a Password**:

   - Choose a password (e.g., "rokutest") and write it down. This is used for authentication during deployment.
   - The Roku will reboot into developer mode.

4. **Verify**:
   - After reboot, visit `http://123.123.123.123` in a browser. You should see the "Development Application Installer" page. Log in with `rokudev` and your password.

## Setup

1. **Install Dependencies**:
   - In the project root (where `app/`, `deploy.js`, and `generate-images.js` are), run:
     ```bash
     npm install
     ```
