const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Configuration
const inputFile = "screenshot.jpg"; // Input screenshot in project root
const outputDir = "./app/images"; // Output folder (updated per your change)
const imageConfigs = [
  { name: "icon_hd.png", width: 540, height: 405 },
  { name: "icon_sd.png", width: 290, height: 218 },
  { name: "splash_hd.png", width: 1280, height: 720 },
  { name: "splash_sd.png", width: 720, height: 480 },
];

async function generateImages() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    // Load the screenshot
    const image = sharp(inputFile);
    const metadata = await image.metadata();
    console.log(`Loaded ${inputFile}: ${metadata.width}x${metadata.height}`);

    // Process each image configuration
    for (const config of imageConfigs) {
      const { name, width, height } = config;
      const outputPath = path.join(outputDir, name);
      const sourceAspect = metadata.width / metadata.height;
      const targetAspect = width / height;

      // Calculate scaled dimensions to fit entire image
      let scaledWidth, scaledHeight;
      if (sourceAspect > targetAspect) {
        // Source wider: fit width, pad height
        scaledWidth = width;
        scaledHeight = Math.round(scaledWidth / sourceAspect);
      } else {
        // Source taller: fit height, pad width
        scaledHeight = height;
        scaledWidth = Math.round(scaledHeight * sourceAspect);
      }

      console.log(
        `Generating ${name}: scale to ${scaledWidth}x${scaledHeight}, pad to ${width}x${height}`
      );

      // Scale and pad to target size
      await sharp(inputFile)
        .resize({
          width: scaledWidth,
          height: scaledHeight,
          fit: "inside", // Scale to fit, no cropping
          position: "center",
        })
        .extend({
          top: Math.round((height - scaledHeight) / 2),
          bottom: Math.round((height - scaledHeight) / 2),
          left: Math.round((width - scaledWidth) / 2),
          right: Math.round((width - scaledWidth) / 2),
          background: { r: 51, g: 51, b: 51, alpha: 1 }, // #333333 to match app background
        })
        .toFile(outputPath);

      console.log(`Generated ${name}: ${width}x${height}`);
    }

    console.log("All images generated successfully!");
  } catch (error) {
    console.error("Error generating images:", error.message);
  }
}

generateImages();
