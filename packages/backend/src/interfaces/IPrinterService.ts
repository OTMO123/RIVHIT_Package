import { PackingItem } from '@packing/shared';

// Interface Segregation Principle - разделяем интерфейсы по ответственности
export interface IPrinterConnection {
  /**
   * Инициализация принтера
   * @param options - Опции подключения
   * @returns Promise<boolean>
   */
  initialize(options?: any): Promise<boolean>;

  /**
   * Получить статус принтера
   * @returns Promise<PrinterStatus>
   */
  getStatus(): Promise<{
    connected: boolean;
    model: string;
    paperLevel: number;
    ribbonLevel: number;
    temperature: number;
    isReady: boolean;
    lastError?: string;
  }>;
}

export interface IPrinterLabels {
  /**
   * Печать этикеток для товаров
   * @param items - Список товаров для печати
   * @param options - Опции печати
   * @returns Promise<PrintJobResult>
   */
  printLabels(items: PackingItem[], options?: any): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
    ezplCommands?: string[];
  }>;

  /**
   * Печать одной этикетки
   * @param item - Товар для печати
   * @param options - Опции печати
   * @returns Promise<PrintJobResult>
   */
  printSingleLabel(item: PackingItem, options?: any): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
    ezplCommands?: string[];
  }>;
}

export interface IPrinterConfiguration {
  /**
   * Конфигурация принтера
   * @param config - Настройки принтера
   * @returns Promise<boolean>
   */
  configure(config: any): Promise<boolean>;

  /**
   * Тестовая печать
   * @returns Promise<PrintJobResult>
   */
  testPrint(): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
  }>;
}

// Композитный интерфейс следуя ISP
export interface IPrinterService extends IPrinterConnection, IPrinterLabels, IPrinterConfiguration {
  // Основной интерфейс объединяет все возможности
}