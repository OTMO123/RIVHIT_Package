import { IPrinterService } from '../interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage } from 'canvas';

export interface PrintJobOptions {
  copies?: number;
  labelSize?: 'small' | 'medium' | 'large';
  includeBarcodes?: boolean;
  includeText?: boolean;
  includeQuantity?: boolean;
  includePrices?: boolean;
}

export interface PrintJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
  printedItems: number;
}

export class ImageZPLPrinterService implements IPrinterService {
  private printerIP: string = '192.168.14.200';
  private printerPort: number = 9101;
  private isConnected: boolean = false;
  private tempDir: string = path.join(process.cwd(), 'temp-labels');

  constructor() {
    // Создаем временную директорию для изображений
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async initialize(options?: any): Promise<boolean> {
    try {
      console.log('🖨️ Initializing Image ZPL printer service...');
      console.log(`📡 Printer: ${this.printerIP}:${this.printerPort}`);
      
      const connected = await this.testConnection();
      this.isConnected = connected;
      
      if (connected) {
        console.log('✅ Image ZPL printer initialized successfully');
      }
      
      return connected;
    } catch (error) {
      console.error('❌ Failed to initialize Image ZPL printer:', error);
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(3000);
      
      client.connect(this.printerPort, this.printerIP, () => {
        client.write('~HS'); // ZPL status command
        client.end();
        resolve(true);
      });
      
      client.on('error', () => {
        resolve(false);
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Печать изображений этикеток
   */
  async printImageLabels(imageDataArray: { boxNumber: number; imageData: string }[]): Promise<PrintJobResult> {
    console.log(`🏷️ Printing ${imageDataArray.length} image labels via ZPL...`);
    
    if (!imageDataArray || imageDataArray.length === 0) {
      return {
        success: false,
        error: 'No images to print',
        printedItems: 0
      };
    }

    try {
      const jobId = `job_${Date.now()}`;
      let printedCount = 0;
      
      for (const { boxNumber, imageData } of imageDataArray) {
        console.log(`📄 Printing label for box ${boxNumber}...`);
        
        // Сохраняем изображение во временный файл
        const imagePath = await this.saveBase64Image(imageData, boxNumber);
        
        // Конвертируем изображение в ZPL
        const zplCommand = await this.imageToZPL(imagePath);
        
        // Отправляем на принтер
        const sent = await this.sendToPrinter(zplCommand);
        
        if (sent) {
          printedCount++;
          console.log(`✅ Label for box ${boxNumber} printed`);
        } else {
          console.error(`❌ Failed to print label for box ${boxNumber}`);
        }
        
        // Удаляем временный файл
        try {
          fs.unlinkSync(imagePath);
        } catch (e) {
          // Игнорируем ошибки удаления
        }
      }
      
      console.log(`✅ Printed ${printedCount} labels successfully`);
      
      return {
        success: printedCount > 0,
        jobId,
        printedItems: printedCount
      };
      
    } catch (error) {
      console.error('❌ Print job failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        printedItems: 0
      };
    }
  }

  /**
   * Сохранение base64 изображения в файл
   */
  private async saveBase64Image(imageData: string, boxNumber: number): Promise<string> {
    // Удаляем префикс data:image/png;base64, если есть
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = `label_${Date.now()}_box${boxNumber}.png`;
    const filepath = path.join(this.tempDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    console.log(`💾 Saved temporary image: ${filename}`);
    
    return filepath;
  }

  /**
   * Конвертация изображения в ZPL формат
   */
  private async imageToZPL(imagePath: string): Promise<string> {
    try {
      // Загружаем изображение
      const image = await loadImage(imagePath);
      
      // Создаем canvas для обработки
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      
      // Рисуем изображение
      ctx.drawImage(image, 0, 0);
      
      // Получаем данные пикселей
      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      
      // Конвертируем в монохромное изображение
      const monoData = this.convertToMonochrome(imageData);
      
      // Генерируем ZPL команду с графикой
      let zpl = '^XA\n'; // Начало этикетки
      zpl += '^FO0,0\n'; // Позиция
      
      // Используем команду ^GFA для графики
      const bytesPerRow = Math.ceil(image.width / 8);
      const totalBytes = bytesPerRow * image.height;
      const hexData = this.monoToHex(monoData, image.width, image.height);
      
      zpl += `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^FS\n`;
      zpl += '^XZ\n'; // Конец этикетки
      
      return zpl;
      
    } catch (error) {
      console.error('Error converting image to ZPL:', error);
      // Fallback - простая текстовая этикетка
      return this.generateFallbackZPL();
    }
  }

  /**
   * Конвертация изображения в монохромное
   */
  private convertToMonochrome(imageData: any): Uint8Array {
    const { data, width, height } = imageData;
    const monoData = new Uint8Array(Math.ceil(width / 8) * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Получаем яркость пикселя
        const brightness = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
        
        // Threshold для конвертации в черно-белое
        const isBlack = brightness < 128;
        
        if (isBlack) {
          const byteIndex = y * Math.ceil(width / 8) + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          monoData[byteIndex] |= (1 << bitIndex);
        }
      }
    }
    
    return monoData;
  }

  /**
   * Конвертация монохромных данных в hex строку для ZPL
   */
  private monoToHex(monoData: Uint8Array, width: number, height: number): string {
    let hex = '';
    for (let i = 0; i < monoData.length; i++) {
      hex += monoData[i].toString(16).padStart(2, '0').toUpperCase();
    }
    return hex;
  }

  /**
   * Fallback ZPL для случаев когда не удалось обработать изображение
   */
  private generateFallbackZPL(): string {
    let zpl = '^XA\n';
    zpl += '^FO50,50\n';
    zpl += '^A0N,30,30\n';
    zpl += '^FDLabel Image^FS\n';
    zpl += '^FO50,100\n';
    zpl += '^A0N,25,25\n';
    zpl += `^FD${new Date().toLocaleString('he-IL')}^FS\n`;
    zpl += '^XZ\n';
    return zpl;
  }

  private async sendToPrinter(zplCommand: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(10000); // Увеличиваем таймаут для больших изображений
      
      client.connect(this.printerPort, this.printerIP, () => {
        client.write(zplCommand);
        setTimeout(() => {
          client.end();
          resolve(true);
        }, 1000);
      });
      
      client.on('error', (err) => {
        console.error('❌ Failed to send to printer:', err.message);
        resolve(false);
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });
  }

  // Методы интерфейса IPrinterService
  async printLabels(items: PackingItem[], options?: PrintJobOptions): Promise<PrintJobResult> {
    // Не используется для изображений
    return {
      success: false,
      error: 'Use printImageLabels for image printing',
      printedItems: 0
    };
  }

  async printBarcodeLabels(items: PackingItem[], options?: PrintJobOptions): Promise<PrintJobResult> {
    // Не используется для изображений
    return {
      success: false,
      error: 'Use printImageLabels for image printing',
      printedItems: 0
    };
  }

  async printSingleLabel(item: PackingItem, options?: PrintJobOptions): Promise<PrintJobResult> {
    // Не используется для изображений
    return {
      success: false,
      error: 'Use printImageLabels for image printing',
      printedItems: 0
    };
  }

  async getStatus(): Promise<any> {
    const connected = await this.testConnection();
    return {
      connected,
      model: 'GoDEX ZX420 (Image ZPL)',
      isReady: connected
    };
  }

  async configure(config: any): Promise<boolean> {
    if (config.printerIP) this.printerIP = config.printerIP;
    if (config.printerPort) this.printerPort = config.printerPort;
    return true;
  }

  async testPrint(): Promise<PrintJobResult> {
    // Создаем тестовое изображение
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return this.printImageLabels([{ boxNumber: 0, imageData: testImageData }]);
  }
}

export default ImageZPLPrinterService;