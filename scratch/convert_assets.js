const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function convertAll() {
  const assetsDir = 'c:/Users/shivam/Desktop/lazycricscore/assets';
  const files = fs.readdirSync(assetsDir);
  
  for (const file of files) {
    const filepath = path.join(assetsDir, file);
    const buffer = fs.readFileSync(filepath);
    
    // Check if it's a JPEG (starts with 0xFFD8)
    const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8;
    
    if (isJpg && file.endsWith('.png')) {
      console.log(`Converting ${file} from JPG to a real PNG...`);
      try {
        // Read the image using Jimp
        const image = await Jimp.read(filepath);
        // Write it back as PNG
        await image.write(filepath);
        console.log(`Successfully converted ${file}!`);
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err);
      }
    } else {
      console.log(`Skipping ${file} (already valid or not a fake PNG)`);
    }
  }
}

convertAll();
