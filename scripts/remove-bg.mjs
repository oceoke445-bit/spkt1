import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

async function removeBlackBackground(inputFile, outputFile) {
  try {
    console.log(`Processing ${inputFile}...`);
    
    await sharp(join(publicDir, inputFile))
      .removeAlpha() // Remove existing alpha channel
      .ensureAlpha() // Add new alpha channel
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        // Process pixels to make black/dark pixels transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is dark (close to black), make it transparent
          // Threshold: if RGB values are all below 30, consider it black
          if (r < 30 && g < 30 && b < 30) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }
        
        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
        .png()
        .toFile(join(publicDir, outputFile));
      });
    
    console.log(`✓ Successfully saved to ${outputFile}`);
  } catch (error) {
    console.error(`✗ Error processing ${inputFile}:`, error.message);
  }
}

// Process both logo files
(async () => {
  console.log('Removing black backgrounds from logos...\n');
  
  await removeBlackBackground('spkt-emblem.png', 'spkt-emblem-nobg.png');
  await removeBlackBackground('spkt-emblem-nokatakata.png', 'spkt-emblem-nokatakata-nobg.png');
  
  console.log('\nDone! Files saved with -nobg suffix.');
  console.log('Preview the results, then rename to replace originals if satisfied.');
})();
