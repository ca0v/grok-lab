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

deploy();