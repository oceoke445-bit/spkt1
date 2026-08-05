import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

async function createEmblemOnly() {
  try {
    console.log('Creating emblem-only version (without text)...');
    
    const image = sharp(join(publicDir, 'spkt-emblem-nobg.png'));
    const metadata = await image.metadata();
    
    const cropHeight = Math.floor(metadata.height * 0.85);
    
    await image
      .extract({
        left: 0,
        top: 0,
        width: metadata.width,
        height: cropHeight
      })
      .png()
      .toFile(join(publicDir, 'spkt-emblem-only.png'));
    
    console.log('✓ Successfully created spkt-emblem-only.png');
    console.log(`Cropped to ${metadata.width}x${cropHeight} (85% of original height)`);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

createEmblemOnly();
