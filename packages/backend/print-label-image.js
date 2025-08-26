const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PRINTER_IP = '192.168.14.200';
const PRINTER_PORT = 9101;

// Путь к изображению этикетки
const labelPath = process.argv[2] || '/Users/user/Desktop/Projects/RIVHIT_Package/packages/backend/temp-labels/order_label_box1_1755869546873.png';

console.log('🖨️ Printing label image:', labelPath);

// Метод 1: Отправка изображения как RAW данных
function printRawImage() {
  console.log('\n1️⃣ Trying RAW image printing...');
  
  if (!fs.existsSync(labelPath)) {
    console.error('❌ File not found:', labelPath);
    return;
  }

  // Читаем изображение
  const imageBuffer = fs.readFileSync(labelPath);
  
  const client = new net.Socket();
  
  client.connect(PRINTER_PORT, PRINTER_IP, () => {
    console.log('✅ Connected to printer');
    
    // Пробуем отправить изображение напрямую
    client.write(imageBuffer);
    
    setTimeout(() => {
      client.end();
      console.log('📤 Raw image data sent');
    }, 2000);
  });
  
  client.on('error', (err) => {
    console.error('❌ Error:', err.message);
  });
}

// Метод 2: Использование EZPL команд для печати изображения
function printWithEZPL() {
  console.log('\n2️⃣ Trying EZPL image printing...');
  
  const client = new net.Socket();
  
  client.connect(PRINTER_PORT, PRINTER_IP, () => {
    console.log('✅ Connected for EZPL');
    
    // EZPL команды для печати изображения
    const commands = [
      '^Q50,3',     // Длина этикетки
      '^W80',       // Ширина
      '^H10',       // Скорость
      '^P1',        // Количество копий
      '^S2',        // Скорость печати
      '^C1',        // Количество копий
      '^L',         // Начало этикетки
      'Y50,50,"' + labelPath + '"', // Попытка печати изображения
      'E'           // Конец
    ].join('\n');
    
    client.write(commands);
    
    setTimeout(() => {
      client.end();
      console.log('📤 EZPL commands sent');
    }, 1000);
  });
  
  client.on('error', (err) => {
    console.error('❌ EZPL Error:', err.message);
  });
}

// Метод 3: Конвертация в PCX формат (поддерживается многими принтерами)
function printPCX() {
  console.log('\n3️⃣ Converting to PCX and printing...');
  
  // Для конвертации нужен ImageMagick или другой инструмент
  const pcxPath = labelPath.replace('.png', '.pcx');
  
  // Попробуем конвертировать через ImageMagick если установлен
  exec(`convert "${labelPath}" -monochrome -resize 640x400 "${pcxPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('⚠️ ImageMagick not available, skipping PCX conversion');
      return;
    }
    
    console.log('✅ Converted to PCX:', pcxPath);
    
    // Отправляем PCX файл
    const pcxData = fs.readFileSync(pcxPath);
    
    const client = new net.Socket();
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log('📡 Sending PCX data...');
      
      // EZPL команда для PCX
      const header = '^L\nY50,50,P,"' + path.basename(pcxPath) + '"\nE\n';
      client.write(header);
      client.write(pcxData);
      
      setTimeout(() => {
        client.end();
        console.log('✅ PCX sent');
      }, 2000);
    });
    
    client.on('error', (err) => {
      console.error('❌ PCX Error:', err.message);
    });
  });
}

// Метод 4: Простая ZPL с описанием этикетки
function printSimpleZPL() {
  console.log('\n4️⃣ Printing simple ZPL label...');
  
  const client = new net.Socket();
  
  client.connect(PRINTER_PORT, PRINTER_IP, () => {
    console.log('✅ Connected for ZPL');
    
    // Простая ZPL этикетка
    const zpl = [
      '^XA',
      '^FO50,50',
      '^A0N,40,40',
      '^FDBox Label^FS',
      '^FO50,120',
      '^A0N,25,25',
      '^FDOrder #39344^FS',
      '^FO50,170',
      '^BY2,3,70',
      '^BCN,,Y,N',
      '^FD39344^FS',
      '^FO50,280',
      '^A0N,20,20',
      '^FDPrinted from saved image^FS',
      '^XZ'
    ].join('\n');
    
    console.log('📤 Sending ZPL:', zpl);
    client.write(zpl);
    
    setTimeout(() => {
      client.end();
      console.log('✅ ZPL sent');
    }, 1000);
  });
  
  client.on('error', (err) => {
    console.error('❌ ZPL Error:', err.message);
  });
}

// Запускаем все методы по очереди
console.log('🚀 Starting print tests...\n');

// Сначала пробуем простой ZPL (чтобы убедиться что принтер работает)
printSimpleZPL();

setTimeout(() => {
  // Потом пробуем RAW изображение
  printRawImage();
}, 3000);

setTimeout(() => {
  // Потом EZPL
  printWithEZPL();
}, 6000);

setTimeout(() => {
  // И наконец PCX
  printPCX();
}, 9000);

console.log('\n📌 Проверьте принтер через 10 секунд...');