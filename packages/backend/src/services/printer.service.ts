import { IPrinterService } from '../interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PrintJobOptions {
  copies?: number;
  labelSize?: 'small' | 'medium' | 'large';
  includeBarcodes?: boolean;
  includeText?: boolean;
  includeQuantity?: boolean;
  includePrices?: boolean;
  connectionType?: 'usb' | 'serial' | 'ethernet';
  port?: string; // COM1, COM2, или IP адрес
}

export interface PrintJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
  printedItems: number;
  estimatedTime?: number;
  ezplCommands?: string[];
}

export interface LabelData {
  item: PackingItem;
  barcode?: string;
  qrCode?: string;
  customText?: string;
  stickerType: string;
  ezplTemplate?: string;
}

export interface GoDEXPrinterStatus {
  connected: boolean;
  model: string;
  paperLevel: number;
  ribbonLevel: number;
  temperature: number;
  lastError?: string;
  isReady: boolean;
}

/**
 * GoDEX ZX420 Printer Service с поддержкой EZPL
 * Поддерживает USB, Serial и Ethernet подключения
 */
export class PrinterService implements IPrinterService {
  private isConnected: boolean = false;
  private printerModel: string = 'GoDEX ZX420';
  private supportedFormats: string[] = ['barcode', 'qr', 'text', 'ezpl'];
  private connectionType: 'usb' | 'serial' | 'ethernet' = 'usb';
  private port: string = 'COM1';
  private templatesPath: string;
  private jobQueue: Map<string, PrintJobResult> = new Map();
  private config: any = null;

  constructor(templatesPath: string = './printer-templates') {
    this.templatesPath = templatesPath;
    this.loadConfiguration();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'printer-config.json');
      const configFile = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configFile);
      
      // Применяем настройки из конфигурации
      if (this.config.printer) {
        this.printerModel = this.config.printer.name || this.printerModel;
        this.connectionType = this.config.printer.connection_type?.toLowerCase() || this.connectionType;
        this.port = this.config.printer.port || this.port;
      }
      
      console.log('✅ Printer configuration loaded successfully');
      console.log(`📋 Model: ${this.printerModel}, Connection: ${this.connectionType}, Port: ${this.port}`);
    } catch (error) {
      console.warn('⚠️ Could not load printer-config.json, using defaults:', error instanceof Error ? error.message : String(error));
    }
  }

  async initialize(options: PrintJobOptions = {}): Promise<boolean> {
    try {
      console.log('🖨️ Initializing GoDEX ZX420 printer service...');
      
      // Установка параметров подключения
      if (options.connectionType) {
        this.connectionType = options.connectionType;
      }
      if (options.port) {
        this.port = options.port;
      }

      console.log(`📡 Connection: ${this.connectionType.toUpperCase()}, Port: ${this.port}`);
      
      // В тестовом режиме просто сразу возвращаем успех
      if (this.port === 'TEST_PORT') {
        console.log('🧪 Test mode: Skipping real printer initialization');
        this.isConnected = true;
        return true;
      }
      
      // Создание директории для шаблонов если не существует
      await this.ensureTemplatesDirectory();
      
      // Проверка подключения к принтеру
      const connectionTest = await this.testConnection();
      if (!connectionTest) {
        throw new Error(`Failed to connect to printer on ${this.port}`);
      }
      
      // Инициализация принтера EZPL командами
      await this.initializePrinter();
      
      this.isConnected = true;
      console.log(`✅ GoDEX ZX420 printer initialized successfully`);
      console.log(`📋 Supported formats: ${this.supportedFormats.join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize printer:', error);
      this.isConnected = false;
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing printer connection...');
      
      // В тестовом режиме просто возвращаем успех
      if (this.port === 'TEST_PORT') {
        console.log('📊 Test mode: Simulating successful connection');
        return true;
      }
      
      // Отправка команды статуса принтера
      const statusCommand = '~!S'; // EZPL команда запроса статуса
      const result = await this.sendRawCommand(statusCommand);
      
      console.log('📊 Printer status response:', result);
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private async initializePrinter(): Promise<void> {
    console.log('⚙️ Initializing printer with EZPL commands from config...');
    
    // Используем настройки из конфигурации
    const ezplSettings = this.config?.ezpl_settings || {};
    
    const initCommands = [
      '^Q25,3',                                      // Установка размера этикетки
      '^W80',                                        // Ширина печати 80mm
      `^${ezplSettings.density || 'H10'}`,           // Плотность печати из конфига
      '^P1',                                         // Количество копий
      `^${ezplSettings.speed || 'S4'}`,              // Скорость печати из конфига
      `^${ezplSettings.darkness || 'E20'}`,          // Темнота печати из конфига
      '^AT',                                         // Автоматический tear-off
      '^C1',                                         // Continuous mode
    ];

    for (const command of initCommands) {
      await this.sendRawCommand(command);
      await this.delay(100);
    }
    
    console.log('✅ Printer initialized with EZPL settings from config');
    console.log(`📊 Settings applied: ${ezplSettings.density}, ${ezplSettings.speed}, ${ezplSettings.darkness}`);
  }

  private async ensureTemplatesDirectory(): Promise<void> {
    try {
      await fs.access(this.templatesPath);
    } catch {
      await fs.mkdir(this.templatesPath, { recursive: true });
      console.log(`📁 Created templates directory: ${this.templatesPath}`);
      
      // Создаем базовые шаблоны
      await this.createDefaultTemplates();
    }
  }

  async printBarcodeLabels(
    items: PackingItem[], 
    options: PrintJobOptions = {}
  ): Promise<PrintJobResult> {
    console.log('🏷️ Starting GoDEX ZX420 label printing job...');
    console.log(`📦 Items to print: ${items.length}`);
    
    if (!this.isConnected) {
      throw new Error('Printer not connected. Call initialize() first.');
    }

    const defaultOptions: PrintJobOptions = {
      copies: 1,
      labelSize: 'medium',
      includeBarcodes: true,
      includeText: true,
      includeQuantity: true,
      includePrices: false,
      ...options
    };

    try {
      // Подготовка данных для печати
      const labelData: LabelData[] = await this.prepareLabelData(items, defaultOptions);
      
      console.log('📋 Prepared label data with EZPL templates:');
      labelData.forEach((label, index) => {
        console.log(`  ${index + 1}. ${label.item.item_name} [${label.stickerType}]`);
        console.log(`     Barcode: ${label.barcode}`);
        console.log(`     Quantity: ${label.item.packedQuantity}`);
      });

      // Генерация EZPL команд
      const ezplCommands = await this.generateEZPLCommands(labelData, defaultOptions);
      
      const jobId = `job_${Date.now()}`;
      const estimatedTime = ezplCommands.length * 3; // 3 секунды на команду
      
      console.log(`⏱️ Estimated printing time: ${estimatedTime} seconds`);
      console.log(`🔄 Job ID: ${jobId}`);
      console.log(`📜 Generated ${ezplCommands.length} EZPL commands`);
      
      // Реальная печать EZPL команд
      await this.executeEZPLCommands(ezplCommands, jobId);

      const result: PrintJobResult = {
        success: true,
        jobId,
        printedItems: labelData.length * defaultOptions.copies!,
        estimatedTime,
        ezplCommands
      };

      // Сохранение результата в очереди
      this.jobQueue.set(jobId, result);

      console.log('✅ EZPL printing job completed successfully!');
      console.log(`📊 Total labels printed: ${result.printedItems}`);

      return result;

    } catch (error) {
      console.error('❌ EZPL printing job failed:', error);
      
      const result: PrintJobResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        printedItems: 0
      };
      
      return result;
    }
  }

  async printLabels(items: PackingItem[], options: PrintJobOptions = {}): Promise<PrintJobResult> {
    console.log(`🏷️ Printing ${items.length} label(s) with EZPL...`);
    
    // Валидация входных данных (TDD requirement)
    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No items to print',
        printedItems: 0
      };
    }

    // Валидация каждого элемента
    for (const item of items) {
      if (!item.item_name || item.item_name.trim() === '') {
        return {
          success: false,
          error: 'Invalid item data: item_name is required',
          printedItems: 0
        };
      }
    }

    console.log('📋 Items to print:', items.map(item => `${item.item_name} (x${item.packedQuantity || item.quantity})`));
    
    if (!this.isConnected) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: 'Printer not available',
          printedItems: 0
        };
      }
    }

    const defaultOptions: PrintJobOptions = {
      copies: 1,
      labelSize: 'medium',
      includeBarcodes: true,
      includeText: true,
      includeQuantity: true,
      includePrices: true,
      connectionType: this.connectionType,
      port: this.port,
      ...options
    };

    try {
      // Подготовка данных для печати
      const labelData: LabelData[] = await this.prepareLabelData(items, defaultOptions);
      
      console.log('📋 Prepared label data with EZPL templates:');
      labelData.forEach((label, index) => {
        console.log(`  ${index + 1}. ${label.item.item_name} [${label.stickerType}]`);
        console.log(`     Barcode: ${label.barcode}`);
        console.log(`     Quantity: ${label.item.packedQuantity}`);
      });

      // Генерация EZPL команд
      const ezplCommands = await this.generateEZPLCommands(labelData, defaultOptions);
      
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const estimatedTime = ezplCommands.length * 3; // 3 секунды на команду
      
      console.log(`⏱️ Estimated printing time: ${estimatedTime} seconds`);
      console.log(`🔄 Job ID: ${jobId}`);
      console.log(`📜 Generated ${ezplCommands.length} EZPL commands`);
      
      // Реальная печать EZPL команд
      await this.executeEZPLCommands(ezplCommands, jobId);

      const result: PrintJobResult = {
        success: true,
        jobId,
        printedItems: labelData.length * defaultOptions.copies!,
        estimatedTime,
        ezplCommands
      };

      // Сохранение результата в очереди
      this.jobQueue.set(jobId, result);

      console.log('✅ EZPL printing job completed successfully!');
      console.log(`📊 Total labels printed: ${result.printedItems}`);

      return result;

    } catch (error) {
      console.error('❌ EZPL printing job failed:', error);
      
      const result: PrintJobResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        printedItems: 0
      };
      
      return result;
    }
  }

  async printSingleLabel(item: PackingItem, options: PrintJobOptions = {}): Promise<PrintJobResult> {
    console.log('🏷️ Printing single label for:', item.item_name);
    
    return this.printLabels([item], options);
  }

  async getStatus(): Promise<GoDEXPrinterStatus> {
    try {
      console.log('📊 Checking printer status...');
      
      // Тест подключения
      const connected = await this.testConnection();
      
      // Симуляция получения статуса принтера
      // В реальной реализации здесь будут EZPL команды статуса
      const status: GoDEXPrinterStatus = {
        connected,
        model: this.printerModel,
        paperLevel: connected ? 85 : 0, // Симуляция уровня бумаги
        ribbonLevel: connected ? 70 : 0, // Симуляция уровня ленты
        temperature: connected ? 35 : 0, // Симуляция температуры
        isReady: connected && this.isConnected,
        lastError: connected ? undefined : 'Connection failed'
      };

      console.log('📋 Printer status:', status);
      return status;
    } catch (error) {
      console.error('❌ Failed to get printer status:', error);
      
      return {
        connected: false,
        model: this.printerModel,
        paperLevel: 0,
        ribbonLevel: 0,
        temperature: 0,
        isReady: false,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async testPrint(): Promise<PrintJobResult> {
    console.log('🧪 Executing test print...');
    
    try {
      const testItem: PackingItem = {
        item_id: 999,
        item_name: 'בדיקת הדפסה',
        item_part_num: 'TEST001',
        item_extended_description: 'פריט בדיקה להדפסה',
        quantity: 1,
        cost_nis: 0.01,
        sale_nis: 0.01,
        currency_id: 1,
        cost_mtc: 0.01,
        sale_mtc: 0.01,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        storage_id: 1,
        item_group_id: 1,
        location: 'TEST',
        is_serial: 0,
        sapak: 0,
        item_name_en: 'Test Print',
        item_order: 999,
        barcode: '1234567890123',
        line_id: 'test_print_line',
        isPacked: true,
        isAvailable: true,
        packedQuantity: 1
      };

      const result = await this.printSingleLabel(testItem, {
        copies: 1,
        labelSize: 'medium',
        includeBarcodes: true,
        includeText: true
      });

      console.log('✅ Test print completed');
      return result;
    } catch (error) {
      console.error('❌ Test print failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        printedItems: 0
      };
    }
  }

  async configure(config: any): Promise<boolean> {
    try {
      console.log('⚙️ Configuring printer with:', config);
      
      // Обновление конфигурации принтера
      if (config.model) this.printerModel = config.model;
      if (config.dpi || config.speed || config.darkness) {
        // Отправка EZPL команд конфигурации
        const configCommands = [];
        
        if (config.speed) {
          configCommands.push(`^S${config.speed}`); // Скорость печати
        }
        if (config.darkness) {
          configCommands.push(`^H${config.darkness}`); // Плотность печати
        }
        
        for (const command of configCommands) {
          await this.sendRawCommand(command);
        }
      }
      
      console.log('✅ Printer configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to configure printer:', error);
      return false;
    }
  }

  private async generateEZPLCommands(labelData: LabelData[], options: PrintJobOptions): Promise<string[]> {
    const commands: string[] = [];
    
    for (const label of labelData) {
      for (let copy = 0; copy < options.copies!; copy++) {
        const ezplCommand = await this.generateSingleLabelEZPL(label, options);
        commands.push(ezplCommand);
      }
    }
    
    return commands;
  }

  private async generateSingleLabelEZPL(label: LabelData, options: PrintJobOptions): Promise<string> {
    const template = await this.loadTemplate(label.stickerType);
    
    // Замена переменных в шаблоне
    let ezplCode = template
      .replace('${ITEM_NAME}', this.escapeText(label.item.item_name))
      .replace('${ITEM_NAME_HE}', this.escapeText(label.item.item_name))
      .replace('${BARCODE}', label.barcode || '')
      .replace('${QUANTITY}', label.item.packedQuantity?.toString() || '0')
      .replace('${PRICE}', label.item.sale_nis?.toFixed(2) || '0.00')
      .replace('${DATE}', new Date().toLocaleDateString('he-IL'))
      .replace('${TIME}', new Date().toLocaleTimeString('he-IL'))
      .replace('${STORAGE}', label.item.storage_id?.toString() || '');

    return ezplCode;
  }

  private async executeEZPLCommands(commands: string[], jobId: string): Promise<void> {
    console.log(`🖨️ Executing ${commands.length} EZPL commands...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`📄 Printing label ${i + 1}/${commands.length} (Job: ${jobId})`);
      
      try {
        await this.sendRawCommand(command);
        console.log(`✅ Label ${i + 1} sent successfully`);
        
        // Задержка между этикетками
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ Failed to print label ${i + 1}:`, error instanceof Error ? error.message : String(error));
        
        // Retry механизм
        console.log(`🔄 Retrying label ${i + 1}...`);
        await this.delay(1000);
        
        try {
          await this.sendRawCommand(command);
          console.log(`✅ Label ${i + 1} printed on retry`);
        } catch (retryError) {
          console.error(`❌ Retry failed for label ${i + 1}:`, retryError instanceof Error ? retryError.message : String(retryError));
          throw new Error(`Failed to print label ${i + 1} after retry`);
        }
      }
    }
    
    console.log(`✅ All ${commands.length} labels printed successfully!`);
  }


  async checkPrinterStatus(): Promise<GoDEXPrinterStatus> {
    if (!this.isConnected) {
      return {
        connected: false,
        model: this.printerModel,
        paperLevel: 0,
        ribbonLevel: 0,
        temperature: 0,
        lastError: 'Printer not connected',
        isReady: false
      };
    }

    try {
      // Запрос статуса принтера EZPL командой
      const statusResponse = await this.sendRawCommand('~!S');
      
      // Парсинг ответа статуса (пример для GoDEX)
      const status = this.parseStatusResponse(statusResponse);
      
      return {
        connected: true,
        model: this.printerModel,
        paperLevel: status.paperLevel,
        ribbonLevel: status.ribbonLevel,
        temperature: status.temperature,
        isReady: status.isReady,
        lastError: status.error
      };
    } catch (error) {
      console.error('❌ Failed to get printer status:', error instanceof Error ? error.message : String(error));
      
      return {
        connected: this.isConnected,
        model: this.printerModel,
        paperLevel: 75, // Предполагаемые значения при ошибке связи
        ribbonLevel: 80,
        temperature: 25,
        lastError: `Status check failed: ${error instanceof Error ? error.message : String(error)}`,
        isReady: false
      };
    }
  }

  private parseStatusResponse(response: string): {
    paperLevel: number;
    ribbonLevel: number;
    temperature: number;
    isReady: boolean;
    error?: string;
  } {
    // Простой парсер статуса для GoDEX принтера
    // В реальности нужно смотреть документацию на конкретную модель
    
    const defaultStatus = {
      paperLevel: 90,
      ribbonLevel: 85,
      temperature: 28,
      isReady: true
    };

    if (!response || response.length < 5) {
      return { ...defaultStatus, isReady: false, error: 'Invalid status response' };
    }

    // Пример парсинга (зависит от модели принтера)
    try {
      if (response.includes('ERROR') || response.includes('FAULT')) {
        return { ...defaultStatus, isReady: false, error: 'Printer error detected' };
      }
      
      if (response.includes('PAPER') && response.includes('OUT')) {
        return { ...defaultStatus, paperLevel: 0, isReady: false, error: 'Paper out' };
      }
      
      if (response.includes('RIBBON') && response.includes('OUT')) {
        return { ...defaultStatus, ribbonLevel: 0, isReady: false, error: 'Ribbon out' };
      }

      return defaultStatus;
    } catch (error) {
      return { ...defaultStatus, isReady: false, error: 'Status parsing error' };
    }
  }


  // Методы для работы с очередью печати
  getJobStatus(jobId: string): PrintJobResult | undefined {
    return this.jobQueue.get(jobId);
  }

  getAllJobs(): PrintJobResult[] {
    return Array.from(this.jobQueue.values());
  }

  clearJobHistory(): void {
    this.jobQueue.clear();
    console.log('🗑️ Print job history cleared');
  }

  getJobsByStatus(success: boolean): PrintJobResult[] {
    return this.getAllJobs().filter(job => job.success === success);
  }

  private async prepareLabelData(
    items: PackingItem[], 
    options: PrintJobOptions
  ): Promise<LabelData[]> {
    const labelData: LabelData[] = [];

    for (const item of items) {
      // Генерация или использование существующего штрихкода
      const barcode = item.barcode || this.generateBarcode(item.item_id);
      
      // Определение типа стикера на основе названия товара
      const stickerType = this.determineStickerType(item.item_name);
      
      // Генерация QR кода с информацией о товаре
      const qrData = JSON.stringify({
        id: item.item_id,
        name: item.item_name,
        quantity: item.packedQuantity,
        storage: item.storage_id,
        type: stickerType
      });

      // Формирование дополнительного текста для этикетки
      let customText = item.item_name;
      
      if (options.includeQuantity) {
        customText += `\nКоличество: ${item.packedQuantity}`;
      }
      
      if (options.includePrices && item.sale_nis > 0) {
        customText += `\nЦена: ₪${item.sale_nis.toFixed(2)}`;
      }

      if (item.location) {
        customText += `\nМесто: ${item.location}`;
      }

      labelData.push({
        item,
        barcode,
        qrCode: qrData,
        customText,
        stickerType
      });
    }

    return labelData;
  }

  private determineStickerType(itemName: string): string {
    const name = itemName.toLowerCase();
    
    // Используем маппинг из конфигурации или константы
    const productMapping = this.config?.product_mapping || {};
    
    // Сначала проверяем точное соответствие в конфигурации
    for (const [productKey, templateName] of Object.entries(productMapping)) {
      if (name.includes(productKey.toLowerCase())) {
        return (templateName as string).replace('template_', ''); // template_pelmeni -> pelmeni
      }
    }
    
    // Fallback на константы из shared пакета
    // Убираем использование STICKER_MAPPING пока не определим его
    // for (const [hebrewName, templateName] of Object.entries(STICKER_MAPPING)) {
    //   if (name.includes(hebrewName.toLowerCase())) {
    //     return (templateName as string).replace('template_', '');
    //   }
    // }
    
    // Дополнительные проверки для русских названий
    if (name.includes('пельмени')) return 'pelmeni';
    if (name.includes('блин')) return 'blini';
    if (name.includes('вареник')) return 'vareniki';
    if (name.includes('манты')) return 'manty';
    
    return 'universal'; // Универсальный стикер по умолчанию
  }

  private async loadTemplate(stickerType: string): Promise<string> {
    const templatePath = path.join(this.templatesPath, `${stickerType}.ezpl`);
    
    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      return template;
    } catch (error) {
      console.warn(`⚠️ Template not found: ${templatePath}, using universal template`);
      
      // Fallback на универсальный шаблон
      const universalPath = path.join(this.templatesPath, 'universal.ezpl');
      try {
        return await fs.readFile(universalPath, 'utf-8');
      } catch {
        // Если нет даже универсального шаблона, создаем базовый
        return this.createBasicEZPLTemplate();
      }
    }
  }

  private createBasicEZPLTemplate(): string {
    return `
^Q25,3
^W80
^H10
^P1
^S4
^AD
^C1
^R0
~Q+0
^O0
^D0
^E20
~R255
^L

Dy2-me-dd
Th:m:s

T12,25,0,2,1,1,N,"\${ITEM_NAME}"
T12,50,0,1,1,1,N,"Qty: \${QUANTITY}"
T12,75,0,1,1,1,N,"\${DATE} \${TIME}"
B12,100,0,1,2,6,60,B,"\${BARCODE}"

E
`.trim();
  }

  private async createDefaultTemplates(): Promise<void> {
    console.log('📝 Creating default EZPL templates...');
    
    const templates = {
      'pelmeni.ezpl': `
^Q25,3
^W80
^H10
^P1
^S4
^AD
^C1
^R0
~Q+0
^O0
^D0
^E20
~R255
^L

Dy2-me-dd
Th:m:s

T5,15,0,3,1,1,N,"ПЕЛЬМЕНИ"
T5,35,0,2,1,1,N,"\${ITEM_NAME}"
T5,55,0,1,1,1,N,"Количество: \${QUANTITY}"
T5,70,0,1,1,1,N,"Цена: ₪\${PRICE}"
T5,85,0,1,1,1,N,"\${DATE} \${TIME}"
B5,100,0,1,2,6,60,B,"\${BARCODE}"

E
`,
      'blini.ezpl': `
^Q25,3
^W80
^H10
^P1
^S4
^AD
^C1
^R0
~Q+0
^O0
^D0
^E20
~R255
^L

Dy2-me-dd
Th:m:s

T5,15,0,3,1,1,N,"БЛИНЫ"
T5,35,0,2,1,1,N,"\${ITEM_NAME}"
T5,55,0,1,1,1,N,"Количество: \${QUANTITY}"
T5,70,0,1,1,1,N,"Цена: ₪\${PRICE}"
T5,85,0,1,1,1,N,"\${DATE} \${TIME}"
B5,100,0,1,2,6,60,B,"\${BARCODE}"

E
`,
      'vareniki.ezpl': `
^Q25,3
^W80
^H10
^P1
^S4
^AD
^C1
^R0
~Q+0
^O0
^D0
^E20
~R255
^L

Dy2-me-dd
Th:m:s

T5,15,0,3,1,1,N,"ВАРЕНИКИ"
T5,35,0,2,1,1,N,"\${ITEM_NAME}"
T5,55,0,1,1,1,N,"Количество: \${QUANTITY}"
T5,70,0,1,1,1,N,"Цена: ₪\${PRICE}"
T5,85,0,1,1,1,N,"\${DATE} \${TIME}"
B5,100,0,1,2,6,60,B,"\${BARCODE}"

E
`,
      'manty.ezpl': `
^Q25,3
^W80
^H10
^P1
^S4
^AD
^C1
^R0
~Q+0
^O0
^D0
^E20
~R255
^L

Dy2-me-dd
Th:m:s

T5,15,0,3,1,1,N,"МАНТЫ"
T5,35,0,2,1,1,N,"\${ITEM_NAME}"
T5,55,0,1,1,1,N,"Количество: \${QUANTITY}"
T5,70,0,1,1,1,N,"Цена: ₪\${PRICE}"
T5,85,0,1,1,1,N,"\${DATE} \${TIME}"
B5,100,0,1,2,6,60,B,"\${BARCODE}"

E
`,
      'universal.ezpl': this.createBasicEZPLTemplate()
    };

    for (const [filename, content] of Object.entries(templates)) {
      const filePath = path.join(this.templatesPath, filename);
      await fs.writeFile(filePath, content.trim(), 'utf-8');
      console.log(`✅ Created template: ${filename}`);
    }
  }

  private async sendRawCommand(command: string): Promise<string> {
    console.log(`📤 Sending EZPL command: ${command.substring(0, 50)}...`);
    
    // В тестовом режиме возвращаем мок-ответ
    if (this.port === 'TEST_PORT') {
      console.log('📊 Test mode: Simulating command response');
      return 'TEST_RESPONSE_OK';
    }
    
    // Используем методы подключения из конфигурации с приоритетами
    const connectionMethods = this.config?.connection_methods || [];
    
    if (connectionMethods.length > 0) {
      // Сортируем по приоритету
      const sortedMethods = connectionMethods.sort((a: any, b: any) => a.priority - b.priority);
      
      for (const method of sortedMethods) {
        try {
          console.log(`🔄 Trying method: ${method.method} (priority ${method.priority})`);
          const result = await this.executeConnectionMethod(method, command);
          console.log(`✅ Command sent successfully via ${method.method}`);
          return result;
        } catch (error) {
          console.warn(`⚠️ Method ${method.method} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      throw new Error('All configured connection methods failed');
    }
    
    // Fallback на старые методы
    try {
      switch (this.connectionType) {
        case 'usb':
        case 'serial':
          return await this.sendSerialCommand(command);
        case 'ethernet':
          return await this.sendNetworkCommand(command);
        default:
          throw new Error(`Unsupported connection type: ${this.connectionType}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send command:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async executeConnectionMethod(method: any, command: string): Promise<string> {
    switch (method.method) {
      case 'raw_copy':
        return await this.sendViaCopy(command);
      case 'lpt_redirect':
        return await this.sendViaLPT(command);
      case 'powershell_print':
        return await this.sendViaPowerShell(command);
      case 'system_print':
        return await this.sendViaSystemPrint(command);
      default:
        throw new Error(`Unknown connection method: ${method.method}`);
    }
  }

  private async sendViaLPT(command: string): Promise<string> {
    const { stdout, stderr } = await execAsync(`echo "${command}" > LPT1`);
    if (stderr) throw new Error(stderr);
    return stdout;
  }

  private async sendViaPowerShell(command: string): Promise<string> {
    const tempFile = path.join(this.templatesPath, 'temp_print.ezpl');
    await fs.writeFile(tempFile, command, 'utf-8');
    
    try {
      const { stdout, stderr } = await execAsync(
        `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${this.printerModel}'"`
      );
      if (stderr) throw new Error(stderr);
      return stdout;
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Игнорируем ошибки удаления
      }
    }
  }

  private async sendViaSystemPrint(command: string): Promise<string> {
    const tempFile = path.join(this.templatesPath, 'temp_print.ezpl');
    await fs.writeFile(tempFile, command, 'utf-8');
    
    try {
      const { stdout, stderr } = await execAsync(`print "${tempFile}"`);
      if (stderr && !stderr.includes('printed')) throw new Error(stderr);
      return stdout;
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Игнорируем ошибки удаления
      }
    }
  }

  private async sendSerialCommand(command: string): Promise<string> {
    // Для Windows используем PowerShell для отправки на COM порт
    const psCommand = `
      $port = New-Object System.IO.Ports.SerialPort('${this.port}', 9600, 'None', 8, 'One')
      try {
        $port.Open()
        $port.WriteLine('${command.replace(/'/g, "''")}')
        Start-Sleep -Milliseconds 500
        $response = $port.ReadExisting()
        $port.Close()
        Write-Output $response
      } catch {
        if ($port.IsOpen) { $port.Close() }
        throw $_.Exception.Message
      }
    `;

    try {
      const { stdout, stderr } = await execAsync(`powershell -Command "${psCommand}"`);
      if (stderr) throw new Error(stderr);
      return stdout.trim();
    } catch (error) {
      // Fallback: попробуем через copy команду
      console.warn('⚠️ PowerShell method failed, trying copy method...');
      return await this.sendViaCopy(command);
    }
  }

  private async sendViaCopy(command: string): Promise<string> {
    // Создаем временный файл с EZPL командой
    const tempFile = path.join(this.templatesPath, 'temp_print.ezpl');
    await fs.writeFile(tempFile, command, 'utf-8');
    
    try {
      // Отправляем файл на принтер через copy команду
      const { stdout, stderr } = await execAsync(`copy "${tempFile}" ${this.port}`);
      if (stderr && !stderr.includes('copied')) {
        throw new Error(stderr);
      }
      
      return 'Command sent via copy';
    } finally {
      // Удаляем временный файл
      try {
        await fs.unlink(tempFile);
      } catch {
        // Игнорируем ошибки удаления
      }
    }
  }

  private async sendNetworkCommand(command: string): Promise<string> {
    // Для Ethernet подключения используем socket connection
    const net = require('net');
    
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(9100, this.port, () => {
        socket.write(command);
        socket.end();
      });

      let response = '';
      socket.on('data', (data: any) => {
        response += data.toString();
      });

      socket.on('end', () => {
        resolve(response);
      });

      socket.on('error', (error: any) => {
        reject(error);
      });

      // Timeout через 10 секунд
      setTimeout(() => {
        socket.destroy();
        reject(new Error('Network command timeout'));
      }, 10000);
    });
  }

  private escapeText(text: string): string {
    // Экранирование специальных символов для EZPL
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  private async simulatePrinting(
    labelData: LabelData[], 
    options: PrintJobOptions,
    jobId: string
  ): Promise<void> {
    const totalLabels = labelData.length * options.copies!;
    
    console.log(`🖨️ Starting to print ${totalLabels} labels...`);
    
    for (let copy = 0; copy < options.copies!; copy++) {
      for (let i = 0; i < labelData.length; i++) {
        const currentLabel = (copy * labelData.length) + i + 1;
        const label = labelData[i];
        
        console.log(`📄 Printing label ${currentLabel}/${totalLabels}: ${label.item.item_name}`);
        
        // Симуляция времени печати
        await this.delay(1500 + Math.random() * 1000);
        
        // Симуляция возможной ошибки (очень редко)
        if (Math.random() < 0.02) { // 2% шанс ошибки
          console.warn(`⚠️ Warning: Paper jam detected, retrying...`);
          await this.delay(3000);
        }
      }
    }
    
    console.log(`✅ All ${totalLabels} labels printed successfully!`);
  }

  private generateBarcode(itemId: number): string {
    // Генерация простого штрихкода на основе ID товара
    // В реальной системе это будет использовать стандарт EAN-13 или Code 128
    return `729001158${itemId.toString().padStart(4, '0')}`;
  }

  // Конфигурация принтера
  async configurePrinter(config: {
    model?: string;
    dpi?: number;
    speed?: number;
    darkness?: number;
    connectionType?: 'usb' | 'serial' | 'ethernet';
    port?: string;
  }): Promise<boolean> {
    console.log('⚙️ Configuring GoDEX ZX420 with:', config);
    
    if (config.model) {
      this.printerModel = config.model;
    }
    
    if (config.connectionType) {
      this.connectionType = config.connectionType;
    }
    
    if (config.port) {
      this.port = config.port;
    }
    
    try {
      const configCommands: string[] = [];
      
      if (config.speed) {
        configCommands.push(`^S${config.speed}`); // Скорость печати (1-5)
      }
      
      if (config.darkness) {
        configCommands.push(`^E${config.darkness}`); // Темнота (0-30)
      }
      
      if (config.dpi) {
        // DPI настраивается через ширину печати
        const width = config.dpi === 300 ? 80 : 60;
        configCommands.push(`^W${width}`);
      }
      
      // Отправляем команды конфигурации
      for (const command of configCommands) {
        await this.sendRawCommand(command);
        await this.delay(100);
      }
      
      console.log('✅ Printer configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Printer configuration failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  getSupportedFormats(): string[] {
    return [...this.supportedFormats];
  }

  getConnectionInfo(): { type: string; port: string; model: string; status: string } {
    return {
      type: this.connectionType,
      port: this.port,
      model: this.printerModel,
      status: this.isConnected ? 'connected' : 'disconnected'
    };
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting GoDEX ZX420 printer...');
    
    try {
      // Отправляем команду reset принтера
      if (this.isConnected) {
        await this.sendRawCommand('~R'); // Reset команда
      }
    } catch (error) {
      console.warn('⚠️ Warning during disconnect:', error instanceof Error ? error.message : String(error));
    }
    
    this.isConnected = false;
    this.jobQueue.clear();
    
    console.log('✅ Printer disconnected');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Фабрика для создания сервиса печати GoDEX ZX420
export class PrinterServiceFactory {
  static createGoDEXService(templatesPath?: string): PrinterService {
    return new PrinterService(templatesPath);
  }
  
  static create(
    printerModel: string = 'GoDEX ZX420', 
    templatesPath?: string,
    config?: {
      connectionType?: 'usb' | 'serial' | 'ethernet';
      port?: string;
      speed?: number;
      darkness?: number;
    }
  ): PrinterService {
    const service = new PrinterService(templatesPath);
    
    if (config) {
      // Конфигурация будет применена при инициализации
      service.configurePrinter({ model: printerModel, ...config });
    }
    
    return service;
  }
  
  // Готовые конфигурации для разных типов подключений
  static createUSBService(port: string = 'COM1', templatesPath?: string): PrinterService {
    return PrinterServiceFactory.create('GoDEX ZX420', templatesPath, {
      connectionType: 'usb',
      port,
      speed: 4,
      darkness: 20
    });
  }
  
  static createEthernetService(ipAddress: string, templatesPath?: string): PrinterService {
    return PrinterServiceFactory.create('GoDEX ZX420', templatesPath, {
      connectionType: 'ethernet',
      port: ipAddress,
      speed: 4,
      darkness: 20
    });
  }
}

// Экспорт типов для использования в других модулях
// export type {
//   PrintJobOptions,
//   PrintJobResult,
//   LabelData,
//   GoDEXPrinterStatus
// };