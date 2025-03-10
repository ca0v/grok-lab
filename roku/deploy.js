const rokuDeploy = require("roku-deploy");
const net = require("net");

// Load environment variables from .env file if it exists (optional)
require('dotenv').config();

// Define deploy options with environment variable fallbacks
const deployOptions = {
  host: process.env.ROKU_HOST || "192.168.1.98",
  password: process.env.ROKU_PASSWORD || "trkn",
  rootDir: "./app",
  outDir: "./dist",
  outFile: "maze-memory.zip",
  logLevel: "debug",
  retainStagingFolder: true
};

// Function to fetch logs for a short duration (used in error handling)
async function fetchRokuLogs(host) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let logs = "";
    client.connect(8085, host, () => {
      console.log(`Connected to Roku Telnet (port 8085) at ${host} for logs...`);
    });
    client.on("data", (data) => {
      logs += data.toString();
    });
    client.on("error", (err) => {
      console.error("Telnet error:", err.message);
      resolve("Unable to fetch logs via Telnet");
    });
    setTimeout(() => {
      client.destroy();
      resolve(logs);
    }, 2000); // Collect logs for 2 seconds
  });
}

// Function for real-time Telnet watching
function watchRokuLogs(host) {
  const client = new net.Socket();
  client.connect(8085, host, () => {
    console.log(`Connected to Roku Telnet (port 8085) at ${host}`);
    console.log('Watching logs in real-time... (Ctrl+C to exit)');
  });
  client.on("data", (data) => {
    process.stdout.write(data.toString());
  });
  client.on("error", (err) => {
    console.error("Telnet error:", err.message);
    process.exit(1);
  });
  client.on("close", () => {
    console.log("Telnet connection closed");
    process.exit(0);
  });
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    client.destroy();
    console.log('\nTelnet connection terminated');
    process.exit(0);
  });
}

// Deploy function
async function deploy() {
  try {
    console.log(`Zipping and deploying to Roku at ${deployOptions.host}...`);
    const result = await rokuDeploy.deploy(deployOptions);
    console.log("Deployment successful! Maze Memory should launch on your Roku.");
    console.log("Deployment details:", result);
  } catch (error) {
    console.error("Deployment failed:", error.message);
    if (error.rokuMessages) {
      console.error("Roku Messages:", error.rokuMessages);
    }
    if (error.results) {
      console.error("Detailed Results:", error.results);
    }
    console.log("Fetching detailed Roku logs...");
    const logs = await fetchRokuLogs(deployOptions.host);
    console.log("Roku Logs:\n", logs);
    process.exit(1);
  }
}

// Main logic based on command-line argument
const args = process.argv.slice(2);
if (args.includes('--telnet')) {
  if (!deployOptions.host) {
    console.error('Error: ROKU_HOST not set in .env file or environment');
    process.exit(1);
  }
  watchRokuLogs(deployOptions.host);
} else {
  deploy();
}