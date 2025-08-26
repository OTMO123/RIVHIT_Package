import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class WindowsPrintService {
  private tempDir: string = path.join(process.cwd(), 'temp-labels');
  private printerName: string = 'GoDEX ZX420'; // Имя принтера в Windows

  constructor() {
    // Создаем временную директорию
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Печать этикеток через Windows драйвер
   */
  async printLabels(labels: Array<{ boxNumber: number; imageData: string }>): Promise<any> {
    console.log(`🖨️ Printing ${labels.length} labels via Windows driver...`);
    
    let printedCount = 0;
    const errors: string[] = [];

    for (const label of labels) {
      try {
        // Сохраняем изображение во временный файл
        const imagePath = await this.saveImage(label.imageData, label.boxNumber);
        
        // Печатаем через Windows
        const success = await this.printImageWindows(imagePath);
        
        if (success) {
          printedCount++;
          console.log(`✅ Printed label for box ${label.boxNumber}`);
        } else {
          errors.push(`Failed to print box ${label.boxNumber}`);
        }
        
        // Удаляем временный файл
        try {
          fs.unlinkSync(imagePath);
        } catch (e) {
          // Игнорируем ошибки
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
   * Сохранение base64 изображения в файл
   */
  private async saveImage(imageData: string, boxNumber: number): Promise<string> {
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = `label_${Date.now()}_box${boxNumber}.png`;
    const filepath = path.join(this.tempDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    console.log(`💾 Saved image: ${filename}`);
    
    return filepath;
  }

  /**
   * Печать изображения через Windows
   */
  private async printImageWindows(imagePath: string): Promise<boolean> {
    try {
      // Проверяем операционную систему
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // Windows: используем PowerShell для печати
        const command = `powershell -Command "Start-Process -FilePath '${imagePath}' -Verb Print -PassThru | Wait-Process"`;
        
        console.log('🖨️ Sending to Windows printer...');
        await execAsync(command);
        
        return true;
      } else {
        // macOS/Linux: используем lp команду
        console.log('⚠️ Non-Windows system detected, trying lp command...');
        
        // Попробуем напечатать через CUPS если доступно
        try {
          const command = `lp -d "GoDEX_ZX420" "${imagePath}"`;
          await execAsync(command);
          return true;
        } catch (error) {
          console.error('❌ CUPS printing failed:', error);
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Print command failed:', error);
      return false;
    }
  }

  /**
   * Альтернативный метод - создание файла для ручной печати
   */
  async saveLabelsForManualPrint(labels: Array<{ boxNumber: number; imageData: string }>): Promise<string[]> {
    const savedFiles: string[] = [];
    
    for (const label of labels) {
      const base64Data = label.imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filename = `order_label_box${label.boxNumber}_${Date.now()}.png`;
      const filepath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(filepath, buffer);
      savedFiles.push(filepath);
    }
    
    console.log(`💾 Saved ${savedFiles.length} labels to: ${this.tempDir}`);
    return savedFiles;
  }
}

export default WindowsPrintService;