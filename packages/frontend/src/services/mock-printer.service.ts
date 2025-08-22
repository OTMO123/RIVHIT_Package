import { IPrinterService } from '../../../backend/src/interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';

// Mock printer service for development without physical printer
export class MockPrinterService implements IPrinterService {
  private isConnected = true;
  private paperCount = 100;
  private printQueue: Array<{ id: string; data: any; timestamp: Date }> = [];

  async initialize(options?: any): Promise<boolean> {
    console.log('🔧 Mock Printer: Initializing...', options);
    await this.delay(500);
    this.isConnected = true;
    return true;
  }

  async printLabels(items: PackingItem[], options?: any): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
    ezplCommands?: string[];
  }> {
    console.log('🖨️ Mock Printer: Printing labels for items', items);
    
    // Simulate printing delay
    await this.delay(1000 + Math.random() * 2000);
    
    if (!this.isConnected) {
      return {
        success: false,
        error: 'Printer not connected',
        printedItems: 0
      };
    }
    
    if (this.paperCount <= 0) {
      return {
        success: false,
        error: 'Out of paper',
        printedItems: 0
      };
    }
    
    const jobId = `job_${Date.now()}`;
    const ezplCommands = items.map(item => this.generateItemEZPL(item));
    
    // Add to queue
    this.printQueue.push({
      id: jobId,
      data: { items, options },
      timestamp: new Date()
    });
    
    this.paperCount -= items.length;
    
    console.log('✅ Mock Printer: Labels printed successfully');
    console.log(`📄 Paper remaining: ${this.paperCount}`);
    
    return {
      success: true,
      jobId,
      printedItems: items.length,
      ezplCommands
    };
  }

  async printSingleLabel(item: PackingItem, options?: any): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
    ezplCommands?: string[];
  }> {
    return this.printLabels([item], options);
  }

  async configure(config: any): Promise<boolean> {
    console.log('⚙️ Mock Printer: Configuring...', config);
    await this.delay(300);
    return true;
  }

  async testPrint(): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
    printedItems: number;
  }> {
    console.log('🧪 Mock Printer: Test print');
    
    if (!this.isConnected) {
      return {
        success: false,
        error: 'Printer not connected',
        printedItems: 0
      };
    }
    
    await this.delay(500);
    const jobId = `test_${Date.now()}`;
    
    this.printQueue.push({
      id: jobId,
      data: { test: true },
      timestamp: new Date()
    });
    
    this.paperCount--;
    
    return {
      success: true,
      jobId,
      printedItems: 1
    };
  }

  async getStatus(): Promise<{
    connected: boolean;
    model: string;
    paperLevel: number;
    ribbonLevel: number;
    temperature: number;
    isReady: boolean;
    lastError?: string;
  }> {
    return {
      connected: this.isConnected,
      model: 'Mock Printer v1.0',
      paperLevel: Math.round((this.paperCount / 100) * 100),
      ribbonLevel: 85,
      temperature: 25,
      isReady: this.isConnected && this.paperCount > 0,
      lastError: this.paperCount <= 0 ? 'Out of paper' : undefined
    };
  }

  async testConnection(): Promise<boolean> {
    console.log('🔍 Mock Printer: Testing connection...');
    await this.delay(500);
    return this.isConnected;
  }

  // Mock methods for testing
  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Mock Printer: Disconnected');
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    console.log('🔌 Mock Printer: Connected');
  }

  async addPaper(count: number): Promise<void> {
    this.paperCount += count;
    console.log(`📄 Mock Printer: Added ${count} sheets. Total: ${this.paperCount}`);
  }

  async clearQueue(): Promise<void> {
    this.printQueue = [];
    console.log('🗑️ Mock Printer: Queue cleared');
  }

  getRecentJobs(): Array<{ id: string; data: any; timestamp: Date }> {
    return this.printQueue.slice(-10); // Last 10 jobs
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate mock EZPL commands for items
  private generateItemEZPL(item: PackingItem): string {
    return `
N
q609
Q203,26
ZT
A50,50,0,3,1,1,N,"${item.item_name}"
A50,80,0,2,1,1,N,"מק״ט: ${item.item_part_num || 'N/A'}"
A50,110,0,2,1,1,N,"כמות: ${item.quantity}"
B50,140,0,1,2,2,60,B,"${item.barcode || '123456789'}"
A50,220,0,1,1,1,N,"${new Date().toLocaleDateString('he-IL')}"
P1
    `.trim();
  }

  // Generate mock ZPL commands for stickers
  generateStickerZPL(data: {
    orderNumber: string;
    customerName: string;
    items: Array<{ name: string; quantity: number }>;
    barcode?: string;
  }): string {
    return `
^XA
^CF0,30
^FO50,50^FD הזמנה: ${data.orderNumber}^FS
^FO50,100^FD לקוח: ${data.customerName}^FS
^FO50,150^FD פריטים: ${data.items.length}^FS
${data.items.map((item, index) => 
  `^FO70,${200 + index * 30}^FD${item.name} (${item.quantity})^FS`
).join('')}
${data.barcode ? `^FO50,400^BY2^BCN,70,Y,N,N^FD${data.barcode}^FS` : ''}
^FO50,500^FD תאריך: ${new Date().toLocaleDateString('he-IL')}^FS
^XZ
    `.trim();
  }
}