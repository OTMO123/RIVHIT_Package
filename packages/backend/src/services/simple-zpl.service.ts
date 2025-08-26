import * as net from 'net';

export class SimpleZPLService {
  private printerIP: string = '192.168.14.200';
  private printerPort: number = 9101;

  /**
   * Печать простых этикеток коробок
   */
  async printBoxLabels(labels: any[]): Promise<any> {
    console.log(`🏷️ Printing ${labels.length} box labels...`);
    
    let printedCount = 0;

    for (const label of labels) {
      try {
        // Генерируем простую ZPL этикетку
        const zpl = this.generateSimpleLabel(label);
        
        // Отправляем напрямую без обработки
        const success = await this.sendRawZPL(zpl);
        
        if (success) {
          printedCount++;
          console.log(`✅ Printed box ${label.boxNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error printing box ${label.boxNumber}:`, error);
      }
    }

    return {
      success: printedCount > 0,
      printedCount
    };
  }

  /**
   * Генерация простой ZPL этикетки
   */
  private generateSimpleLabel(label: any): string {
    const boxNumber = label.boxNumber || 1;
    const orderId = label.orderId || '39344';
    const items = label.items || [];
    
    // Используем минимальный ZPL без спецсимволов
    const lines = [];
    
    // Начало этикетки
    lines.push(String.fromCharCode(94) + 'XA'); // ^XA
    
    // Заголовок - номер коробки
    lines.push(String.fromCharCode(94) + 'FO50,30');
    lines.push(String.fromCharCode(94) + 'A0N,40,40');
    lines.push(String.fromCharCode(94) + `FDBox ${boxNumber}` + String.fromCharCode(94) + 'FS');
    
    // Номер заказа
    lines.push(String.fromCharCode(94) + 'FO50,80');
    lines.push(String.fromCharCode(94) + 'A0N,25,25');
    lines.push(String.fromCharCode(94) + `FDOrder ${orderId}` + String.fromCharCode(94) + 'FS');
    
    // Штрих-код
    lines.push(String.fromCharCode(94) + 'FO150,120');
    lines.push(String.fromCharCode(94) + 'BY2,3,70');
    lines.push(String.fromCharCode(94) + 'BCN,,Y,N');
    lines.push(String.fromCharCode(94) + `FD${orderId}` + String.fromCharCode(94) + 'FS');
    
    // Список товаров (первые 3)
    let yPos = 220;
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const item = items[i];
      if (item) {
        lines.push(String.fromCharCode(94) + `FO50,${yPos}`);
        lines.push(String.fromCharCode(94) + 'A0N,20,20');
        const itemText = `${item.name || 'Item'} x${item.quantity || 1}`;
        lines.push(String.fromCharCode(94) + `FD${itemText}` + String.fromCharCode(94) + 'FS');
        yPos += 30;
      }
    }
    
    // Конец этикетки
    lines.push(String.fromCharCode(94) + 'XZ'); // ^XZ
    
    return lines.join('\n');
  }

  /**
   * Отправка сырого ZPL на принтер
   */
  private async sendRawZPL(zpl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      
      client.connect(this.printerPort, this.printerIP, () => {
        console.log('📡 Sending ZPL to printer...');
        
        // Отправляем команду как есть
        client.write(zpl);
        
        setTimeout(() => {
          client.end();
          resolve(true);
        }, 500);
      });
      
      client.on('error', (err) => {
        console.error('❌ Connection error:', err.message);
        resolve(false);
      });
      
      client.on('timeout', () => {
        client.destroy();
        resolve(false);
      });
    });
  }
}

export default SimpleZPLService;