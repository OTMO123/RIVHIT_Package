/**
 * Printer Discovery Service - автоматический поиск GoDEX принтеров в сети
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PrinterInfo {
  ip: string;
  port: number;
  status: 'connected' | 'error';
  model?: string;
  responseTime?: number;
}

export class PrinterDiscoveryService {
  private static readonly GODEX_PORTS = [9100, 9101, 9102];
  private static readonly TIMEOUT_MS = 2000;

  /**
   * Автоматический поиск GoDEX принтеров в локальной сети
   */
  public async findGoDEXPrinters(): Promise<PrinterInfo[]> {
    try {
      const localNetwork = await this.getLocalNetwork();
      console.log(`🔍 Поиск GoDEX принтеров в сети ${localNetwork}...`);
      
      const results: PrinterInfo[] = [];
      
      // Проверяем типичные IP адреса для принтеров
      const commonIPs = this.generatePrinterIPs(localNetwork);
      
      // Параллельная проверка всех IP и портов
      const promises = commonIPs.flatMap(ip => 
        PrinterDiscoveryService.GODEX_PORTS.map(port => 
          this.testPrinterConnection(ip, port)
        )
      );
      
      const testResults = await Promise.allSettled(promises);
      
      for (const result of testResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }
      
      // Сортируем по времени отклика
      results.sort((a, b) => (a.responseTime || 999) - (b.responseTime || 999));
      
      console.log(`✅ Найдено ${results.length} GoDEX принтеров`);
      return results;
      
    } catch (error) {
      console.error('❌ Ошибка поиска принтеров:', error);
      return [];
    }
  }

  /**
   * Быстрая проверка конкретного принтера
   */
  public async testPrinter(ip: string, port: number = 9101): Promise<PrinterInfo | null> {
    // Обрабатываем IP с ведущими нулями (например 192.168.014.200)
    const normalizedIP = this.normalizeIPAddress(ip);
    console.log(`🔍 Тестирование принтера: ${ip} → ${normalizedIP}:${port}`);
    
    return this.testPrinterConnection(normalizedIP, port);
  }

  /**
   * Нормализация IP адреса (убираем ведущие нули для правильной работы netcat)
   */
  private normalizeIPAddress(ip: string): string {
    try {
      const octets = ip.split('.');
      if (octets.length !== 4) {
        console.warn(`⚠️  Не удалось нормализовать IP ${ip}, используем как есть`);
        return ip;
      }
      
      const normalizedOctets = octets.map(octet => {
        const parsed = parseInt(octet, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid octet: ${octet}`);
        }
        return parsed.toString();
      });
      
      return normalizedOctets.join('.');
    } catch (error) {
      console.warn(`⚠️  Не удалось нормализовать IP ${ip}, используем как есть`);
      return ip;
    }
  }

  /**
   * Получить локальную сеть
   */
  private async getLocalNetwork(): Promise<string> {
    try {
      const { stdout } = await execAsync("ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1");
      const match = stdout.match(/inet (\d+\.\d+\.\d+)\.\d+/);
      
      if (match) {
        return match[1]; // Например: 192.168.14
      }
      
      return '192.168.1'; // Fallback
    } catch (error) {
      console.warn('⚠️  Не удалось определить локальную сеть, используем 192.168.1');
      return '192.168.1';
    }
  }

  /**
   * Генерирует список IP адресов для проверки
   */
  private generatePrinterIPs(network: string): string[] {
    // Типичные IP адреса для принтеров
    const commonEndings = [
      1, 2, 10, 11, 20, 50, 100, 101, 102, 110, 111, 
      150, 200, 201, 210, 220, 250, 254
    ];
    
    return commonEndings.map(ending => `${network}.${ending}`);
  }

  /**
   * Тестирует подключение к принтеру (проверенный метод)
   */
  private async testPrinterConnection(ip: string, port: number): Promise<PrinterInfo | null> {
    const startTime = Date.now();
    
    try {
      // Используем тот же точный способ что и в терминале
      const { stdout, stderr } = await execAsync(
        `nc -z -v ${ip} ${port}`,
        { timeout: PrinterDiscoveryService.TIMEOUT_MS }
      );
      
      const responseTime = Date.now() - startTime;
      const output = stdout + stderr;
      
      console.log(`🔍 Тест ${ip}:${port} - output: ${output.trim()}`);
      
      // Точно такая же проверка как в терминале
      if (output.includes('succeeded')) {
        console.log(`✅ Принтер найден: ${ip}:${port}`);
        
        // Попробуем определить модель принтера
        const model = await this.detectPrinterModel(ip, port);
        
        return {
          ip,
          port,
          status: 'connected',
          model: model || 'GoDEX Label Printer',
          responseTime
        };
      }
      
      console.log(`❌ Принтер не отвечает: ${ip}:${port}`);
      return null;
      
    } catch (error) {
      console.log(`⚠️  Ошибка подключения к ${ip}:${port}:`, error);
      return null;
    }
  }

  /**
   * Попытка определить модель принтера
   */
  private async detectPrinterModel(ip: string, port: number): Promise<string | undefined> {
    try {
      // Для GoDEX принтеров можно послать команду статуса
      const { stdout } = await execAsync(
        `echo "~!T" | timeout 1 nc ${ip} ${port}`,
        { timeout: 1000 }
      );
      
      if (stdout.includes('GoDEX') || stdout.includes('GODEX')) {
        return 'GoDEX Label Printer';
      }
      
      return 'Unknown Label Printer';
      
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Быстрый поиск в локальной подсети
   */
  public async quickScan(): Promise<PrinterInfo[]> {
    console.log('⚡ Запуск быстрого поиска GoDEX принтеров...');
    
    // Проверяем известный принтер из настроек
    const knownPrinters = [
      '192.168.14.200', // Известный статический IP
      '192.168.014.200' // Версия с ведущими нулями
    ];
    
    const results: PrinterInfo[] = [];
    
    // Сначала проверяем известные адреса
    for (const ip of knownPrinters) {
      console.log(`🔍 Проверка известного принтера: ${ip}`);
      for (const port of PrinterDiscoveryService.GODEX_PORTS) {
        const printer = await this.testPrinterConnection(this.normalizeIPAddress(ip), port);
        if (printer) {
          results.push(printer);
          console.log(`✅ Найден принтер: ${printer.ip}:${printer.port}`);
          break; // Найден принтер, переходим к следующему IP
        }
      }
    }
    
    // Если не найден, ищем в локальной сети
    if (results.length === 0) {
      const localNetwork = await this.getLocalNetwork();
      console.log(`🌐 Поиск в локальной сети: ${localNetwork}.x`);
      
      const quickIPs = [
        `${localNetwork}.200`,
        `${localNetwork}.100`,
        `${localNetwork}.101`,
        `${localNetwork}.1`,
        `${localNetwork}.10`
      ];
      
      for (const ip of quickIPs) {
        for (const port of PrinterDiscoveryService.GODEX_PORTS) {
          const printer = await this.testPrinterConnection(ip, port);
          if (printer) {
            results.push(printer);
            console.log(`✅ Найден принтер в сети: ${printer.ip}:${printer.port}`);
          }
        }
      }
    }
    
    console.log(`🏁 Быстрый поиск завершен. Найдено принтеров: ${results.length}`);
    return results;
  }
}

export const printerDiscoveryService = new PrinterDiscoveryService();