const rokuDeploy = require("roku-deploy");

const deployOptions = {
  host: "123.123.123.123", // Your Roku IP
  password: "rokutest", // Replace with your actual password
  rootDir: "./app", // Source folder
  outDir: "./dist", // Output folder for the zip
  outFile: "maze-memory.zip", // Zip file name
};

async function deploy() {
  try {
    console.log("Zipping and deploying to Roku at 123.123.123.123...");
    await rokuDeploy.deploy(deployOptions);
    console.log(
      "Deployment successful! Maze Memory should launch on your Roku."
    );
  } catch (error) {
    console.error("Deployment failed:", error);
  }
}

deploy();
