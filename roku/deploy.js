const rokuDeploy = require("roku-deploy");
const net = require("net"); // For Telnet

const deployOptions = {
  host: "192.168.1.98",
  password: "trkn",
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
      console.log("Connected to Roku Telnet (port 8085) for logs...");
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
    console.log("Zipping and deploying to Roku at 192.168.1.98...");
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