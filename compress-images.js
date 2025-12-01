const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = './app/data/Icons/Conquest Images';
const maxSizeKB = 500; // Target max size in KB

async function compressImage(filePath) {
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  
  if (sizeKB < maxSizeKB) {
    console.log(`Skipping ${path.basename(filePath)} (${sizeKB.toFixed(0)}KB - already small)`);
    return;
  }
  
  console.log(`Compressing ${path.basename(filePath)} (${sizeKB.toFixed(0)}KB)...`);
  
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Resize if very large (max 1024px on longest side)
    let resizedImage = image;
    if (metadata.width > 1024 || metadata.height > 1024) {
      resizedImage = image.resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Compress to JPEG with quality reduction
    const outputPath = filePath.replace('.png', '.jpg');
    await resizedImage
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    const newStats = fs.statSync(outputPath);
    const newSizeKB = newStats.size / 1024;
    
    // If JPEG is smaller, keep it and delete PNG
    if (newSizeKB < sizeKB) {
      fs.unlinkSync(filePath);
      console.log(`  -> Converted to JPG: ${newSizeKB.toFixed(0)}KB (saved ${(sizeKB - newSizeKB).toFixed(0)}KB)`);
    } else {
      // Keep PNG, delete JPG
      fs.unlinkSync(outputPath);
      
      // Try compressing PNG instead
      const pngOutput = filePath + '.tmp';
      await sharp(filePath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, quality: 80 })
        .toFile(pngOutput);
      
      const pngStats = fs.statSync(pngOutput);
      const pngSizeKB = pngStats.size / 1024;
      
      if (pngSizeKB < sizeKB) {
        fs.unlinkSync(filePath);
        fs.renameSync(pngOutput, filePath);
        console.log(`  -> Compressed PNG: ${pngSizeKB.toFixed(0)}KB (saved ${(sizeKB - pngSizeKB).toFixed(0)}KB)`);
      } else {
        fs.unlinkSync(pngOutput);
        console.log(`  -> Could not compress further`);
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

async function main() {
  const files = fs.readdirSync(targetDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));
  
  console.log(`Found ${pngFiles.length} PNG files in ${targetDir}`);
  console.log('');
  
  for (const file of pngFiles) {
    await compressImage(path.join(targetDir, file));
  }
  
  console.log('');
  console.log('Done!');
}

main().catch(console.error);

