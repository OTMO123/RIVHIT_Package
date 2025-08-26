const sharp = require('sharp');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PRINTER_IP = '192.168.14.200';
const PRINTER_PORT = 9101;

// Путь к изображению
const imagePath = process.argv[2] || '/Users/user/Desktop/Projects/RIVHIT_Package/packages/backend/temp-labels/order_label_box1_1755869546873.png';

console.log('🖼️ Printing image to GoDEX:', imagePath);

async function convertAndPrint() {
  try {
    // Загружаем и обрабатываем изображение с помощью Sharp
    const imageBuffer = await sharp(imagePath)
      .resize(812, 812, { fit: 'contain', background: { r: 255, g: 255, b: 255 } }) // 100x100mm at 203dpi
      .threshold(128) // Конвертируем в черно-белое
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data, info } = imageBuffer;
    const width = info.width;
    const height = info.height;
    const bytesPerRow = Math.ceil(width / 8);
    
    console.log(`📐 Image: ${width}x${height}px, ${bytesPerRow} bytes per row`);
    
    // Конвертируем в hex для принтера
    let hexData = '';
    for (let y = 0; y < height; y++) {
      for (let byteX = 0; byteX < bytesPerRow; byteX++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = byteX * 8 + bit;
          if (x < width) {
            const pixelIndex = (y * width + x) * info.channels;
            // Инвертируем: белый = 0, черный = 1
            if (data[pixelIndex] < 128) {
              byte |= (0x80 >> bit);
            }
          }
        }
        hexData += byte.toString(16).padStart(2, '0').toUpperCase();
      }
    }
    
    console.log(`💾 Hex data: ${hexData.length} chars`);
    
    // Пробуем разные форматы команд для GoDEX
    const commands = [
      // Формат 1: Стандартный ZPL
      {
        name: 'Standard ZPL',
        data: `^XA^FO0,0^GFA,${bytesPerRow * height},${bytesPerRow * height},${bytesPerRow},${hexData}^XZ`
      },
      // Формат 2: ZPL с переносами строк
      {
        name: 'ZPL with newlines',
        data: [
          '^XA',
          '^FO0,0',
          `^GFA,${bytesPerRow * height},${bytesPerRow * height},${bytesPerRow},${hexData}`,
          '^XZ'
        ].join('\n')
      },
      // Формат 3: EZPL для GoDEX
      {
        name: 'EZPL Graphics',
        data: [
          '^Q100,3',
          '^W100',
          '^H10',
          '^P1',
          '^S2',
          '^AT',
          '^C1',
          '^L',
          `GM,"IMAGE",${hexData.length},${hexData}`,
          'GG10,10,"IMAGE"',
          'E'
        ].join('\r\n')
      },
      // Формат 4: Прямая загрузка графики
      {
        name: 'Direct Graphics Download',
        data: `~DGR:IMAGE.GRF,${bytesPerRow * height},${bytesPerRow},${hexData}`
      },
      // Формат 5: EPL2 формат
      {
        name: 'EPL2 Format',
        data: [
          'N',
          'q812',
          'Q812,20',
          `GW0,0,${bytesPerRow},${height},${hexData}`,
          'P1'
        ].join('\n')
      }
    ];
    
    // Отправляем команды
    for (const cmd of commands) {
      console.log(`\n🚀 Trying ${cmd.name}...`);
      await sendCommand(cmd.data);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n✅ All formats sent. Check printer!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function sendCommand(data) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log('   📡 Connected');
      
      // Отправляем данные
      client.write(Buffer.from(data));
      
      setTimeout(() => {
        client.end();
        console.log('   ✅ Sent');
        resolve(true);
      }, 1000);
    });
    
    client.on('error', (err) => {
      console.error('   ❌ Error:', err.message);
      resolve(false);
    });
    
    client.on('timeout', () => {
      console.error('   ⏱️ Timeout');
      client.destroy();
      resolve(false);
    });
  });
}

// Запускаем
convertAndPrint();