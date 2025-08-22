import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IPrinterService } from '../interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';

const execAsync = promisify(exec);

/**
 * WinLabel Printer Service
 * Интеграция с WINCODE Technology WinLabel для печати этикеток
 * 
 * Поддерживаемые принтеры:
 * - C342 - Компактный термопринтер этикеток
 * - LP4 - Профессиональный термотрансферный принтер
 * 
 * Основано на реальной команде: WinLabel.exe -s -f "template.wlf" -d "data.txt"
 */
export class WinLabelPrinterService implements IPrinterService {
  private winLabelPath: string;
  private templatesPath: string;
  private dataPath: string;
  private isConnected: boolean = false;

  constructor(config: {
    winLabelPath?: string;
    templatesPath?: string;
    dataPath?: string;
  } = {}) {
    // Путь к WinLabel.exe (по умолчанию стандартная установка)
    this.winLabelPath = config.winLabelPath || 
      '"C:\\Program Files (x86)\\WINCODE Technology\\WinLabel\\WinLabel.exe"';
    
    // Путь к шаблонам этикеток (.wlf файлы)
    this.templatesPath = config.templatesPath || 'C:\\Barcode4u\\templates';
    
    // Путь для временных файлов с данными
    this.dataPath = config.dataPath || 'C:\\Barcode4u\\temp';
  }

  /**
   * Инициализация принтера
   */
  async initialize(options?: any): Promise<boolean> {
    try {
      // Проверяем наличие WinLabel.exe
      await this.checkWinLabelInstallation();
      
      // Создаем необходимые директории
      await this.ensureDirectories();
      
      this.isConnected = true;
      console.log('✅ WinLabel printer service initialized successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize WinLabel printer:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Получить статус принтера
   */
  async getStatus(): Promise<{
    connected: boolean;
    model: string;
    paperLevel: number;
    ribbonLevel: number;
    temperature: number;
    isReady: boolean;
    lastError?: string;
    supportedModels?: string[];
  }> {
    return {
      connected: this.isConnected,
      model: 'WINCODE WinLabel',
      paperLevel: 100, // WinLabel не предоставляет эту информацию
      ribbonLevel: 100,
      temperature: 25,
      isReady: this.isConnected,
      supportedModels: [
        'C342 - Компактный термопринтер этикеток',
        'LP4 - Профессиональный термотрансферный принтер',
        'GoDEX серии',
        'Zebra совместимые'
      ]
    };
  }

  /**
   * Печать этикеток для товаров
   */
  async printLabels(items: PackingItem[], options?: {
    template?: string;
    copies?: number;
    silent?: boolean;
  }): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
    ezplCommands?: string[];
  }> {
    if (!this.isConnected) {
      return {
        success: false,
        error: 'WinLabel printer not connected',
        printedItems: 0
      };
    }

    try {
      const jobId = `winlabel_${Date.now()}`;
      const templateFile = options?.template || 'CUPON_50X25.wlf';
      const templatePath = path.join(this.templatesPath, templateFile);
      
      let totalPrinted = 0;
      const commands: string[] = [];

      for (const item of items) {
        // Создаем файл с данными для каждого товара
        const dataFile = await this.createDataFile(item, jobId);
        
        // Формируем команду WinLabel
        const command = `${this.winLabelPath} ${options?.silent ? '-s' : ''} -f "${templatePath}" -d "${dataFile}"`;
        commands.push(command);
        
        // Выполняем печать
        try {
          await execAsync(command);
          totalPrinted++;
          
          // Копии если нужно
          if (options?.copies && options.copies > 1) {
            for (let i = 1; i < options.copies; i++) {
              await execAsync(command);
            }
          }
          
          console.log(`✅ Printed label for item: ${item.item_name}`);
        } catch (printError: any) {
          console.error(`❌ Failed to print item ${item.item_id}:`, printError.message);
        }
        
        // Удаляем временный файл
        await this.cleanupDataFile(dataFile);
      }

      return {
        success: totalPrinted > 0,
        jobId,
        printedItems: totalPrinted,
        ezplCommands: commands
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        printedItems: 0
      };
    }
  }

  /**
   * Печать одной этикетки
   */
  async printSingleLabel(item: PackingItem, options?: {
    template?: string;
    copies?: number;
  }): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
    ezplCommands?: string[];
  }> {
    return this.printLabels([item], options);
  }

  /**
   * Конфигурация принтера
   */
  async configure(config: {
    template?: string;
    winLabelPath?: string;
    templatesPath?: string;
  }): Promise<boolean> {
    try {
      if (config.winLabelPath) {
        this.winLabelPath = config.winLabelPath;
      }
      if (config.templatesPath) {
        this.templatesPath = config.templatesPath;
        await this.ensureDirectories();
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to configure WinLabel printer:', error.message);
      return false;
    }
  }

  /**
   * Тестовая печать
   */
  async testPrint(): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
  }> {
    // Создаем тестовый товар
    const testItem: PackingItem = {
      item_id: 999999,
      item_name: 'TEST PRINT',
      item_part_num: 'TEST-001',
      item_extended_description: 'Test print for WinLabel',
      barcode: '1234567890123',
      quantity: 1,
      cost_nis: 0,
      sale_nis: 0,
      currency_id: 1,
      cost_mtc: 0,
      sale_mtc: 0,
      picture_link: '',
      exempt_vat: false,
      location: '',
      is_serial: 0,
      item_name_en: 'TEST PRINT',
      item_order: 0,
      item_group_id: 1,
      storage_id: 1,
      line_id: 'test_winlabel_line',
      isPacked: false,
      isAvailable: true,
      avitem: 0,
      sapak: 0,
      packedQuantity: 0,
      notes: 'Test print',
      reason: ''
    };

    const result = await this.printSingleLabel(testItem, { template: 'CUPON_50X25.wlf' });
    
    return {
      success: result.success,
      jobId: result.jobId,
      error: result.error,
      printedItems: result.printedItems
    };
  }

  /**
   * Проверка наличия WinLabel
   */
  private async checkWinLabelInstallation(): Promise<void> {
    try {
      // Пробуем выполнить WinLabel с параметром помощи
      const command = `${this.winLabelPath} /?`;
      await execAsync(command, { timeout: 5000 });
    } catch (error: any) {
      // Если команда не найдена, WinLabel не установлен
      if (error.message.includes('not found') || error.code === 'ENOENT') {
        throw new Error('WinLabel.exe not found. Please install WINCODE Technology WinLabel software.');
      }
      // Другие ошибки могут быть нормальными (например, неправильные параметры)
    }
  }

  /**
   * Создание необходимых директорий
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.templatesPath, { recursive: true });
      await fs.mkdir(this.dataPath, { recursive: true });
    } catch (error: any) {
      // Игнорируем ошибки если директории уже существуют
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Создание файла с данными для печати
   */
  private async createDataFile(item: PackingItem, jobId: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${jobId}_${item.item_id}_${timestamp}.txt`;
    const filePath = path.join(this.dataPath, fileName);

    // Формат данных для WinLabel (пример, может отличаться в зависимости от шаблона)
    const data = [
      item.item_name || '',           // Название товара
      item.item_part_num || '',       // Артикул
      item.barcode || '',             // Штрих-код
      item.quantity.toString(),       // Количество
      item.sale_nis.toFixed(2),      // Цена
      new Date().toLocaleDateString('he-IL'), // Дата
      item.storage_id?.toString() || '1',     // Склад
      item.notes || ''                // Примечания
    ].join('\n');

    await fs.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  /**
   * Удаление временного файла
   */
  private async cleanupDataFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Игнорируем ошибки удаления
      console.warn('⚠️ Could not cleanup data file:', filePath);
    }
  }
}

/**
 * Фабрика для создания WinLabel принтера
 */
export class WinLabelPrinterFactory {
  static create(config?: {
    winLabelPath?: string;
    templatesPath?: string;
    dataPath?: string;
  }): WinLabelPrinterService {
    return new WinLabelPrinterService(config);
  }

  /**
   * Создание с конфигурацией по умолчанию для RIVHIT
   */
  static createForRivhit(): WinLabelPrinterService {
    return new WinLabelPrinterService({
      winLabelPath: '"C:\\Program Files (x86)\\WINCODE Technology\\WinLabel\\WinLabel.exe"',
      templatesPath: 'C:\\Barcode4u\\templates',
      dataPath: 'C:\\Barcode4u\\temp'
    });
  }
}