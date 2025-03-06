const fs = require("fs").promises;
const path = require("path");

async function processFolder(folderPath) {
  try {
    // Ensure the folder path is absolute
    const absolutePath = path.resolve(folderPath);

    // Read all items in the folder
    const items = await fs.readdir(absolutePath, { withFileTypes: true });

    // Process each item
    for (const item of items) {
      // Skip directories (no recursion)
      if (item.isDirectory()) continue;

      // Process only .ts files
      if (item.isFile() && path.extname(item.name).toLowerCase() === ".ts") {
        const fullPath = path.join(absolutePath, item.name);
        const content = await fs.readFile(fullPath, "utf-8");
        console.log(`--- ${item.name} ---`);
        console.log(content);
        console.log(`--- End ${item.name} ---`);
        console.log(); // Add a blank line between files
      }
    }
  } catch (error) {
    console.error("Error processing folder:", error.message);
  }
}

// Usage: Provide the path to your folder
const folderPath = process.argv[2] || "./"; // Default to current directory if no arg
processFolder(folderPath).then(() => console.log("Processing complete"));
