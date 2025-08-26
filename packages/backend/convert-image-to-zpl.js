const net = require('net');
const fs = require('fs');

// Dynamic import for Jimp
let Jimp;
(async () => {
  const jimpModule = await import('jimp');
  Jimp = jimpModule.default;
})();

const PRINTER_IP = '192.168.14.200';
const PRINTER_PORT = 9101;

// Путь к изображению
const imagePath = process.argv[2] || '/Users/user/Desktop/Projects/RIVHIT_Package/packages/backend/temp-labels/order_label_box1_1755869546873.png';

console.log('🖼️ Converting image to GoDEX format:', imagePath);

async function imageToZPL() {
  try {
    // Ждем загрузки Jimp
    if (!Jimp) {
      const jimpModule = await import('jimp');
      Jimp = jimpModule.default;
    }
    
    // Загружаем изображение
    const image = await Jimp.read(imagePath);
    
    // Изменяем размер под принтер (80x50mm при 203dpi = 640x400px)
    image.resize(640, 400);
    
    // Конвертируем в черно-белое
    image.greyscale();
    image.contrast(1); // Увеличиваем контраст
    
    // Получаем bitmap данные
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const bytesPerRow = Math.ceil(width / 8);
    
    console.log(`📐 Image size: ${width}x${height}px`);
    console.log(`📊 Bytes per row: ${bytesPerRow}`);
    
    // Конвертируем в hex данные для ZPL
    let hexData = '';
    
    for (let y = 0; y < height; y++) {
      let rowData = [];
      
      for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
        let byte = 0;
        
        for (let bit = 0; bit < 8; bit++) {
          const x = byteIndex * 8 + bit;
          
          if (x < width) {
            const idx = image.getPixelIndex(x, y);
            const brightness = image.bitmap.data[idx]; // Grayscale, so R=G=B
            
            // Если темный пиксель (< 128), устанавливаем бит
            if (brightness < 128) {
              byte |= (1 << (7 - bit));
            }
          }
        }
        
        rowData.push(byte.toString(16).padStart(2, '0').toUpperCase());
      }
      
      hexData += rowData.join('');
    }
    
    console.log(`💾 Generated ${hexData.length} hex characters`);
    
    // Создаем команду для GoDEX принтера
    const totalBytes = bytesPerRow * height;
    
    // GoDEX использует другой формат - попробуем несколько вариантов
    console.log('\n🔧 Trying different formats...');
    
    // Вариант 1: Чистый ZPL без escape-символов
    let zpl = '';
    zpl += '^XA\r\n';  // Начало с CRLF
    zpl += '^FO0,0\r\n';
    zpl += '^GFA,' + totalBytes + ',' + totalBytes + ',' + bytesPerRow + ',' + hexData + '\r\n';
    zpl += '^FS\r\n';
    zpl += '^XZ\r\n';  // Конец с CRLF
    
    console.log('📝 Command length:', zpl.length);
    
    // Сохраняем команду в файл для проверки
    const cmdPath = imagePath.replace('.png', '.txt');
    fs.writeFileSync(cmdPath, zpl);
    console.log('💾 Command saved to:', cmdPath);
    
    // Пробуем разные методы отправки
    console.log('\n🚀 Testing multiple send methods...');
    
    // Метод 1: Отправка как есть
    await sendToPrinter(zpl, 'Method 1: Raw ZPL');
    
    // Метод 2: С префиксом для GoDEX
    const godexCommand = '~DG' + hexData + '\r\n';
    await sendToPrinter(godexCommand, 'Method 2: GoDEX DG command');
    
    // Метод 3: EZPL формат для GoDEX
    const ezpl = createEZPLCommand(width, height, hexData);
    await sendToPrinter(ezpl, 'Method 3: EZPL format');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error converting image:', error);
  }
}

function sendToPrinter(command, method = 'Default') {
  return new Promise((resolve) => {
    const client = new net.Socket();
    
    console.log(`\n📡 ${method} - Connecting...`);
    
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log(`✅ ${method} - Connected`);
      
      // Отправляем команду
      client.write(command);
      
      setTimeout(() => {
        client.end();
        console.log(`📤 ${method} - Sent`);
        resolve(true);
      }, 1500);
    });
    
    client.on('error', (err) => {
      console.error(`❌ ${method} - Error:`, err.message);
      resolve(false);
    });
    
    client.on('timeout', () => {
      console.error(`⏱️ ${method} - Timeout`);
      client.destroy();
      resolve(false);
    });
  });
}

// Создание EZPL команды для GoDEX
function createEZPLCommand(width, height, hexData) {
  let ezpl = '';
  
  // EZPL заголовок
  ezpl += '^Q50,3\r\n';     // Длина этикетки
  ezpl += '^W80\r\n';       // Ширина
  ezpl += '^H10\r\n';       // Скорость
  ezpl += '^P1\r\n';        // Количество
  ezpl += '^S2\r\n';        // Скорость печати
  ezpl += '^L\r\n';         // Начало
  
  // Графика в EZPL формате
  ezpl += 'GM"GRAPHIC",' + hexData.length + '\r\n';
  ezpl += hexData + '\r\n';
  ezpl += 'GG50,50,"GRAPHIC"\r\n';
  
  ezpl += 'E\r\n';          // Конец
  
  return ezpl;
}

// Запускаем конвертацию и печать
imageToZPL()
  .then(() => {
    console.log('\n✨ All methods tested! Check your printer.');
    console.log('\n📌 If nothing printed, try:');
    console.log('1. Check printer status and connection');
    console.log('2. Verify printer is in correct mode (ZPL/EPL/EZPL)');
    console.log('3. Try the simple test script: node print-label-image.js');
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
  });