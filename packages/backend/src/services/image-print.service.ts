import sharp from 'sharp';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

export class ImagePrintService {
  private printerIP: string = '192.168.14.200';
  private printerPort: number = 9101;

  /**
   * Печать этикеток коробок с изображениями
   */
  async printBoxLabelsWithImages(labels: Array<{ boxNumber: number; imageData: string; items?: any[] }>): Promise<any> {
    console.log(`🖨️ Printing ${labels.length} box labels with images...`);
    
    let printedCount = 0;
    const results = [];

    for (const label of labels) {
      try {
        // Сохраняем изображение во временный файл
        const tempPath = await this.saveImageToTemp(label.imageData, label.boxNumber);
        
        // Конвертируем и печатаем
        const success = await this.printImage(tempPath);
        
        if (success) {
          printedCount++;
          console.log(`✅ Printed box ${label.boxNumber}`);
        }
        
        results.push({
          boxNumber: label.boxNumber,
          success,
          itemsCount: label.items?.length || 0
        });
        
        // Удаляем временный файл
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (error) {
        console.error(`❌ Error printing box ${label.boxNumber}:`, error);
        results.push({
          boxNumber: label.boxNumber,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      success: printedCount > 0,
      printedCount,
      results
    };
  }

  /**
   * Сохранение base64 изображения во временный файл
   */
  private async saveImageToTemp(base64Data: string, boxNumber: number): Promise<string> {
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    const tempDir = path.join(process.cwd(), 'temp-labels');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempPath = path.join(tempDir, `box_${boxNumber}_${Date.now()}.png`);
    fs.writeFileSync(tempPath, buffer);
    
    return tempPath;
  }

  /**
   * Печать изображения на GoDEX принтере
   */
  private async printImage(imagePath: string): Promise<boolean> {
    try {
      // Загружаем и обрабатываем изображение
      // Уменьшаем размер, чтобы поместилось на этикетку (80x50mm при 203dpi = 640x400px)
      const imageBuffer = await sharp(imagePath)
        .resize(640, 640, { 
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255 },
          position: 'center' // Центрируем изображение
        })
        .threshold(128)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const { data, info } = imageBuffer;
      const width = info.width;
      const height = info.height;
      const bytesPerRow = Math.ceil(width / 8);
      
      // Конвертируем в hex
      let hexData = '';
      for (let y = 0; y < height; y++) {
        for (let byteX = 0; byteX < bytesPerRow; byteX++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = byteX * 8 + bit;
            if (x < width) {
              const pixelIndex = (y * width + x) * info.channels;
              if (data[pixelIndex] < 128) {
                byte |= (0x80 >> bit);
              }
            }
          }
          hexData += byte.toString(16).padStart(2, '0').toUpperCase();
        }
      }
      
      // Формируем ZPL команду (метод 1 - который работает)
      // ^FO20,20 - смещаем на 20 точек от левого и верхнего края для лучшего позиционирования
      const totalBytes = bytesPerRow * height;
      const zplCommand = `^XA^FO20,20^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^XZ`;
      
      // Отправляем на принтер
      return await this.sendToPrinter(zplCommand);
      
    } catch (error) {
      console.error('Error converting image:', error);
      return false;
    }
  }

  /**
   * Отправка команды на принтер
   */
  private async sendToPrinter(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      
      client.connect(this.printerPort, this.printerIP, () => {
        console.log('📡 Sending to printer...');
        
        client.write(Buffer.from(command));
        
        setTimeout(() => {
          client.end();
          resolve(true);
        }, 1000);
      });
      
      client.on('error', (err) => {
        console.error('❌ Printer connection error:', err.message);
        resolve(false);
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });
  }
}

export default ImagePrintService;