const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function processAndCropIcon(inputPath, outputPath, targetSize) {
  try {
    // First, load the image and get its metadata
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Calculate crop dimensions to remove extra whitespace
    // We'll crop to a square centered on the logo
    const cropSize = Math.min(metadata.width * 0.7, metadata.height * 0.7);
    const left = Math.floor((metadata.width - cropSize) / 2);
    const top = Math.floor((metadata.height - cropSize) / 2);
    
    // Process the image: crop, resize, and save
    await sharp(inputPath)
      .extract({
        left: left,
        top: top,
        width: Math.floor(cropSize),
        height: Math.floor(cropSize)
      })
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
      
    console.log(`✅ Created ${path.basename(outputPath)} (${targetSize}x${targetSize})`);
  } catch (error) {
    console.error(`❌ Error creating ${outputPath}:`, error);
  }
}

async function generateAllIcons() {
  const sourcePath = path.join(__dirname, '..', 'src', 'assets', 'bravo-icon.png');
  
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ bravo-icon.png not found in src/assets/');
    return;
  }
  
  console.log('🎨 Generating BRAVO app icons with improved cropping...\n');
  
  // Generate PNG icons for different platforms
  const iconSizes = [
    { name: 'icon.png', size: 512 },           // Main icon
    { name: 'icon@2x.png', size: 1024 },       // macOS retina
    { name: 'icon-512.png', size: 512 },       // Linux
    { name: 'icon-256.png', size: 256 },       // Windows/Linux
    { name: 'icon-128.png', size: 128 },       
    { name: 'icon-64.png', size: 64 },         
    { name: 'icon-48.png', size: 48 },         
    { name: 'icon-32.png', size: 32 },         
    { name: 'icon-24.png', size: 24 },         
    { name: 'icon-16.png', size: 16 }          
  ];
  
  for (const { name, size } of iconSizes) {
    await processAndCropIcon(sourcePath, path.join(iconsDir, name), size);
  }
  
  // Generate ICO file for Windows
  console.log('\n📦 Creating Windows ICO file...');
  await generateWindowsIco(sourcePath);
  
  // Generate ICNS file for macOS (if on macOS)
  if (process.platform === 'darwin') {
    console.log('\n🍎 Creating macOS ICNS file...');
    await generateMacIcns();
  }
  
  console.log('\n✨ All icons generated successfully!');
  console.log('📁 Icons saved in:', iconsDir);
}

async function generateWindowsIco(sourcePath) {
  const sizes = [256, 128, 64, 48, 32, 24, 16];
  const tempDir = path.join(iconsDir, 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate PNGs for ICO
  for (const size of sizes) {
    await processAndCropIcon(
      sourcePath, 
      path.join(tempDir, `icon_${size}.png`), 
      size
    );
  }
  
  // Use png2ico if available, otherwise keep individual PNGs
  try {
    const iconPath = path.join(iconsDir, 'icon.ico');
    const pngFiles = sizes.map(s => path.join(tempDir, `icon_${s}.png`)).join(' ');
    
    // Try to use ImageMagick if available
    try {
      execSync(`magick convert ${pngFiles} ${iconPath}`);
      console.log('✅ Created icon.ico using ImageMagick');
    } catch {
      // Fall back to copying largest PNG as ICO placeholder
      fs.copyFileSync(path.join(tempDir, 'icon_256.png'), iconPath);
      console.log('⚠️  Created icon.ico (placeholder - install ImageMagick for proper ICO)');
    }
  } catch (error) {
    console.log('⚠️  Could not create ICO file:', error.message);
  }
  
  // Clean up temp files
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function generateMacIcns() {
  try {
    const iconsetPath = path.join(iconsDir, 'icon.iconset');
    
    if (!fs.existsSync(iconsetPath)) {
      fs.mkdirSync(iconsetPath, { recursive: true });
    }
    
    // macOS iconset requires specific sizes and names
    const macSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' }
    ];
    
    const sourcePath = path.join(__dirname, '..', 'src', 'assets', 'bravo-icon.png');
    
    for (const { size, name } of macSizes) {
      await processAndCropIcon(
        sourcePath,
        path.join(iconsetPath, name),
        size
      );
    }
    
    // Convert iconset to icns
    execSync(`iconutil -c icns ${iconsetPath} -o ${path.join(iconsDir, 'icon.icns')}`);
    console.log('✅ Created icon.icns');
    
    // Clean up iconset
    fs.rmSync(iconsetPath, { recursive: true, force: true });
  } catch (error) {
    console.log('⚠️  Could not create ICNS file:', error.message);
  }
}

// Run the script
generateAllIcons().catch(console.error);