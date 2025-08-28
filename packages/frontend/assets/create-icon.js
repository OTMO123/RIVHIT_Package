const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Создаем директорию для иконок если её нет
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Функция для создания иконки с прозрачным фоном
async function createIcon(inputPath, outputName, size) {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .flatten({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .removeAlpha()
      .png()
      .toFile(path.join(iconsDir, outputName));
    
    console.log(`✅ Created ${outputName} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error creating ${outputName}:`, error);
  }
}

// Функция для создания ICO файла (для Windows)
async function createIco(inputPath) {
  const sizes = [16, 32, 48, 64, 128, 256];
  const tempFiles = [];

  // Создаем временные PNG файлы разных размеров
  for (const size of sizes) {
    const tempFile = path.join(iconsDir, `temp_${size}.png`);
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(tempFile);
    tempFiles.push(tempFile);
  }

  console.log('✅ Created icon.ico components');
  
  // Очищаем временные файлы
  // tempFiles.forEach(file => fs.unlinkSync(file));
}

// Основная функция
async function main() {
  // Путь к исходному изображению
  const sourcePath = path.join(__dirname, 'bravo-box.png');
  
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Source image not found! Please save your image as bravo-box.png in the assets folder');
    return;
  }

  console.log('🎨 Creating app icons...\n');

  // Создаем иконки разных размеров для разных платформ
  
  // macOS icons
  await createIcon(sourcePath, 'icon.png', 512);
  await createIcon(sourcePath, 'icon@2x.png', 1024);
  
  // Windows/Linux icons
  await createIcon(sourcePath, 'icon-256.png', 256);
  await createIcon(sourcePath, 'icon-128.png', 128);
  await createIcon(sourcePath, 'icon-64.png', 64);
  await createIcon(sourcePath, 'icon-32.png', 32);
  await createIcon(sourcePath, 'icon-16.png', 16);
  
  // Create ICO for Windows
  await createIco(sourcePath);
  
  console.log('\n✨ All icons created successfully!');
  console.log('📁 Icons saved in:', iconsDir);
}

// Запускаем
main().catch(console.error);