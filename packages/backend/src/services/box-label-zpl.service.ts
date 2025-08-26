import * as net from 'net';
import { PackingBox } from '@packing/shared';

export interface BoxLabelPrintResult {
  success: boolean;
  printedCount: number;
  error?: string;
}

export class BoxLabelZPLService {
  private printerIP: string = '192.168.14.200';
  private printerPort: number = 9101;

  /**
   * Печать этикеток коробок
   */
  async printBoxLabels(boxes: any[]): Promise<BoxLabelPrintResult> {
    console.log(`📦 Printing ${boxes.length} box labels via ZPL...`);
    
    let printedCount = 0;
    const errors: string[] = [];

    for (const box of boxes) {
      try {
        const zplCommand = this.generateBoxLabelZPL(box);
        const success = await this.sendToPrinter(zplCommand);
        
        if (success) {
          printedCount++;
          console.log(`✅ Printed label for box ${box.boxNumber}`);
        } else {
          errors.push(`Failed to print box ${box.boxNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error printing box ${box.boxNumber}:`, error);
        errors.push(`Box ${box.boxNumber}: ${error}`);
      }
    }

    return {
      success: printedCount > 0,
      printedCount,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * Генерация ZPL команды для этикетки коробки
   */
  private generateBoxLabelZPL(box: any): string {
    const boxNumber = box.boxNumber || 1;
    const items = box.items || [];
    const orderId = box.orderId || '39344';
    const totalBoxes = box.totalBoxes || 1;
    
    // Размер этикетки 80x50mm (609x406 точек при 203dpi)
    let zpl = '^XA\n';
    zpl += '^CI28\n'; // UTF-8 encoding
    zpl += '^PW609\n'; // Print width
    zpl += '^LL406\n'; // Label length
    
    // Заголовок с номером коробки
    zpl += '^FO50,30\n';
    zpl += '^A0N,35,35\n';
    zpl += `^FDКоробка ${boxNumber}/${totalBoxes}^FS\n`;
    
    // Order ID
    zpl += '^FO50,80\n';
    zpl += '^A0N,25,25\n';
    zpl += `^FDЗаказ #${orderId}^FS\n`;
    
    // Штрих-код заказа в центре
    zpl += '^FO150,120\n';
    zpl += '^BY2,3,60\n';
    zpl += '^BCN,,Y,N\n';
    zpl += `^FD${orderId}^FS\n`;
    
    // Список товаров
    let yPos = 220;
    zpl += '^FO50,' + yPos + '\n';
    zpl += '^A0N,20,20\n';
    zpl += '^FDТовары:^FS\n';
    
    yPos += 30;
    items.forEach((item: any, index: number) => {
      if (index < 4 && yPos < 350) { // Максимум 4 товара на этикетке
        const itemName = item.name || item.nameHebrew || `Товар ${index + 1}`;
        const quantity = item.quantity || 1;
        
        zpl += `^FO70,${yPos}\n`;
        zpl += '^A0N,18,18\n';
        zpl += `^FD- ${this.truncateText(itemName, 30)} x${quantity}^FS\n`;
        
        yPos += 25;
      }
    });
    
    // Дата и время внизу
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU');
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    zpl += '^FO50,370\n';
    zpl += '^A0N,15,15\n';
    zpl += `^FD${dateStr} ${timeStr}^FS\n`;
    
    // Штрих-код коробки справа внизу
    if (items.length > 0 && items[0].barcode) {
      zpl += '^FO400,340\n';
      zpl += '^BY1,2,30\n';
      zpl += '^BCN,,N,N\n';
      zpl += `^FD${items[0].barcode}^FS\n`;
    }
    
    zpl += '^XZ\n';
    
    return zpl;
  }

  /**
   * Обрезка текста до максимальной длины
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Отправка ZPL команды на принтер
   */
  private async sendToPrinter(zplCommand: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(5000);
      
      client.connect(this.printerPort, this.printerIP, () => {
        console.log('📡 Connected to printer, sending ZPL...');
        client.write(zplCommand);
        setTimeout(() => {
          client.end();
          resolve(true);
        }, 500);
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

export default BoxLabelZPLService;