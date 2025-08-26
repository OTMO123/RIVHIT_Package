import * as net from 'net';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export class ImageToZPLService {
  private printerIP: string = '192.168.14.200';
  private printerPort: number = 9101;
  private tempDir: string = path.join(process.cwd(), 'temp-images');

  constructor() {
    // Создаем временную директорию для картинок
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Печать изображений этикеток
   */
  async printImageLabels(labels: Array<{ boxNumber: number; imageData: string }>): Promise<any> {
    console.log(`🖼️ Printing ${labels.length} image labels...`);
    
    let printedCount = 0;
    const errors: string[] = [];

    for (const label of labels) {
      try {
        console.log(`📄 Processing box ${label.boxNumber}...`);
        
        // Конвертируем base64 в ZPL
        const zplCommand = await this.convertImageToZPL(label.imageData, label.boxNumber);
        
        // Отправляем на принтер
        const success = await this.sendToPrinter(zplCommand);
        
        if (success) {
          printedCount++;
          console.log(`✅ Printed label for box ${label.boxNumber}`);
        } else {
          errors.push(`Failed to print box ${label.boxNumber}`);
        }
        
      } catch (error) {
        console.error(`❌ Error printing box ${label.boxNumber}:`, error);
        errors.push(`Box ${label.boxNumber}: ${error}`);
      }
    }

    return {
      success: printedCount > 0,
      printedCount,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * Конвертация base64 изображения в ZPL команды
   */
  private async convertImageToZPL(base64Image: string, boxNumber: number): Promise<string> {
    try {
      // Удаляем префикс data:image/png;base64, если есть
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Сохраняем временный файл
      const tempFile = path.join(this.tempDir, `label_${Date.now()}_box${boxNumber}.png`);
      fs.writeFileSync(tempFile, buffer);
      
      // Конвертируем и изменяем размер изображения под принтер (203 dpi)
      // Для этикетки 80x50mm при 203dpi = 640x400 пикселей
      const processedImage = await sharp(tempFile)
        .resize(640, 400, { 
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .threshold(128) // Конвертируем в черно-белое
        .toBuffer();
      
      // Конвертируем в монохромный массив
      const metadata = await sharp(processedImage).metadata();
      const width = metadata.width || 640;
      const height = metadata.height || 400;
      
      // Получаем raw пиксели
      const { data } = await sharp(processedImage)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Конвертируем в hex для ZPL
      const hexData = this.convertToZPLHex(data, width, height);
      
      // Генерируем ZPL команду
      const bytesPerRow = Math.ceil(width / 8);
      const totalBytes = bytesPerRow * height;
      
      let zpl = '^XA\n'; // Начало этикетки
      zpl += '^FO0,0\n'; // Позиция изображения
      zpl += `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^FS\n`;
      zpl += '^XZ\n'; // Конец этикетки
      
      // Удаляем временный файл
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Игнорируем ошибки удаления
      }
      
      return zpl;
      
    } catch (error) {
      console.error('Error converting image to ZPL:', error);
      // Fallback - простая текстовая этикетка
      return this.generateFallbackZPL(boxNumber);
    }
  }

  /**
   * Конвертация пикселей в hex для ZPL
   */
  private convertToZPLHex(data: Buffer, width: number, height: number): string {
    const bytesPerRow = Math.ceil(width / 8);
    const hexArray: string[] = [];
    
    for (let y = 0; y < height; y++) {
      const row: number[] = new Array(bytesPerRow).fill(0);
      
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 3; // RGB
        const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        
        // Если пиксель темный (< 128), устанавливаем бит
        if (brightness < 128) {
          const byteIndex = Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          row[byteIndex] |= (1 << bitIndex);
        }
      }
      
      // Конвертируем байты в hex
      for (const byte of row) {
        hexArray.push(byte.toString(16).padStart(2, '0').toUpperCase());
      }
    }
    
    return hexArray.join('');
  }

  /**
   * Fallback ZPL для случаев ошибки
   */
  private generateFallbackZPL(boxNumber: number): string {
    let zpl = '^XA\n';
    zpl += '^FO50,50\n';
    zpl += '^A0N,40,40\n';
    zpl += `^FDBox ${boxNumber}^FS\n`;
    zpl += '^FO50,120\n';
    zpl += '^BY3\n';
    zpl += '^BCN,100,Y,N,N\n';
    zpl += `^FD${boxNumber.toString().padStart(6, '0')}^FS\n`;
    zpl += '^XZ\n';
    return zpl;
  }

  /**
   * Отправка ZPL на принтер
   */
  private async sendToPrinter(zplCommand: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(10000); // Увеличиваем таймаут для больших изображений
      
      client.connect(this.printerPort, this.printerIP, () => {
        console.log('📡 Connected to printer, sending image data...');
        
        // Отправляем данные частями для больших изображений
        const chunkSize = 4096;
        let offset = 0;
        
        const sendChunk = () => {
          if (offset < zplCommand.length) {
            const chunk = zplCommand.slice(offset, offset + chunkSize);
            client.write(chunk);
            offset += chunkSize;
            setTimeout(sendChunk, 10); // Небольшая задержка между частями
          } else {
            setTimeout(() => {
              client.end();
              resolve(true);
            }, 1000);
          }
        };
        
        sendChunk();
      });
      
      client.on('error', (err) => {
        console.error('❌ Printer connection error:', err.message);
        resolve(false);
      });
      
      client.on('timeout', () => {
        console.error('⏱️ Printer connection timeout');
        client.destroy();
        resolve(false);
      });
    });
  }
}

export default ImageToZPLService;