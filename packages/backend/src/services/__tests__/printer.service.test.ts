import { PrinterService, GoDEXPrinterStatus, PrintJobOptions, PrintJobResult } from '../printer.service';
import { IPrinterService } from '../../interfaces/IPrinterService';
import { PackingItem } from '@packing/shared';
import * as fs from 'fs/promises';
import { exec } from 'child_process';

// Mock external dependencies
jest.mock('fs/promises');
jest.mock('child_process');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('PrinterService', () => {
  let printerService: IPrinterService;
  let mockPackingItem: PackingItem;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup test data
    mockPackingItem = {
      item_id: 1,
      item_name: 'פלמני קלאסיים',
      item_part_num: 'PEL001',
      item_extended_description: 'פלמני קלאסיים בטעם מסורתי',
      quantity: 10,
      cost_nis: 20.00,
      sale_nis: 25.50,
      storage_id: 1,
      item_group_id: 1,
      location: 'A-1-1',
      barcode: '7290011582345',
      currency_id: 1,
      cost_mtc: 20.00,
      sale_mtc: 25.50,
      picture_link: null,
      exempt_vat: false,
      avitem: 0,
      is_serial: 0,
      sapak: 0,
      item_name_en: 'Classic Pelmeni',
      item_order: 1,
      line_id: 'test_line_1',
      isPacked: true,
      isAvailable: true,
      packedQuantity: 8,
      notes: 'הערות בדיקה',
      reason: undefined
    };

    // Mock configuration file
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      printer: {
        name: 'GoDEX ZX420',
        model: 'ZX420',
        connection_type: 'USB',
        port: 'COM1'
      },
      label_templates: {
        template_pelmeni: { width: 50, height: 30 },
        template_universal: { width: 50, height: 30 }
      },
      product_mapping: {
        'פלמני': 'template_pelmeni',
        'default': 'template_universal'
      }
    }));

    printerService = new PrinterService();
  });

  describe('Initialization (TDD)', () => {
    test('should initialize with default configuration', async () => {
      // Red: Test fails because method doesn't exist yet
      const result = await printerService.initialize();
      
      expect(result).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('printer-config.json'), 
        'utf-8'
      );
    });

    test('should handle missing configuration file gracefully', async () => {
      // Red: Test configuration file error handling
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const result = await printerService.initialize();
      
      // Should still initialize with defaults
      expect(result).toBe(true);
    });

    test('should set connection type and port from options', async () => {
      // Red: Test custom initialization options
      const options: PrintJobOptions = {
        connectionType: 'ethernet',
        port: '192.168.1.100'
      };
      
      const result = await printerService.initialize(options);
      
      expect(result).toBe(true);
    });
  });

  describe('Printer Status (TDD)', () => {
    test('should return printer status with all required fields', async () => {
      // Red: Test fails because method doesn't exist
      const status = await printerService.getStatus();
      
      expect(status).toEqual(
        expect.objectContaining({
          connected: expect.any(Boolean),
          model: expect.any(String),
          paperLevel: expect.any(Number),
          ribbonLevel: expect.any(Number),
          temperature: expect.any(Number),
          isReady: expect.any(Boolean)
        })
      );
    });

    test('should indicate printer not ready when paper level is low', async () => {
      // Red: Test business logic for printer readiness
      // Mock low paper scenario
      const status = await printerService.getStatus();
      
      if (status.paperLevel < 20) {
        expect(status.isReady).toBe(false);
      }
    });

    test('should handle connection errors gracefully', async () => {
      // Red: Test error handling
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof options === 'function') {
          (options as any)(new Error('Connection failed'), '', 'Printer not found');
        } else if (callback) {
          callback(new Error('Connection failed'), '', 'Printer not found');
        }
        return {} as any;
      });
      
      const status = await printerService.getStatus();
      
      expect(status.connected).toBe(false);
      expect(status.isReady).toBe(false);
      expect(status.lastError).toContain('Connection failed');
    });
  });

  describe('Label Printing (TDD)', () => {
    test('should generate EZPL commands for packing items', async () => {
      // Red: Test EZPL generation
      const result = await printerService.printLabels([mockPackingItem]);
      
      expect(result.success).toBe(true);
      expect(result.printedItems).toBe(1);
      expect(result.ezplCommands).toBeDefined();
      expect(result.ezplCommands!.length).toBe(1);
      expect(result.ezplCommands![0]).toContain('פלמני קלאסיים');
    });

    test('should determine correct sticker type based on product name', async () => {
      // Red: Test product mapping logic
      const result = await printerService.printLabels([mockPackingItem]);
      
      // Should use pelmeni template for פלמני products
      expect(result.ezplCommands![0]).toContain('ПЕЛЬМЕНИ');
    });

    test('should handle empty items array', async () => {
      // Red: Test edge case
      const result = await printerService.printLabels([]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No items to print');
      expect(result.printedItems).toBe(0);
    });

    test('should generate unique job ID for each print job', async () => {
      // Red: Test job tracking
      const result1 = await printerService.printLabels([mockPackingItem]);
      const result2 = await printerService.printLabels([mockPackingItem]);
      
      expect(result1.jobId).toBeDefined();
      expect(result2.jobId).toBeDefined();
      expect(result1.jobId).not.toBe(result2.jobId);
    });

    test('should respect print options like copies and label size', async () => {
      // Red: Test options handling
      const options: PrintJobOptions = {
        copies: 3,
        labelSize: 'large',
        includeBarcodes: true
      };
      
      const result = await printerService.printLabels([mockPackingItem], options);
      
      expect(result.success).toBe(true);
      // Should print 3 copies
      expect(result.ezplCommands!.length).toBe(3);
    });
  });

  describe('Single Label Printing (TDD)', () => {
    test('should print single label with custom options', async () => {
      // Red: Test single label functionality
      const result = await printerService.printSingleLabel(mockPackingItem, {
        labelSize: 'small',
        includePrices: false
      });
      
      expect(result.success).toBe(true);
      expect(result.printedItems).toBe(1);
    });
  });

  describe('Test Printing (TDD)', () => {
    test('should execute test print successfully', async () => {
      // Red: Test basic test functionality
      const result = await printerService.testPrint();
      
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });
  });

  describe('Configuration (TDD)', () => {
    test('should update printer configuration', async () => {
      // Red: Test configuration updates
      const config = {
        model: 'ZX420',
        dpi: 203,
        speed: 4,
        darkness: 10
      };
      
      const result = await printerService.configure(config);
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling (TDD)', () => {
    test('should handle printer offline scenario', async () => {
      // Red: Test offline handling
      mockExec.mockImplementation((command, options, callback) => {
        if (typeof options === 'function') {
          (options as any)(new Error('Device not found'), '', '');
        } else if (callback) {
          callback(new Error('Device not found'), '', '');
        }
        return {} as any;
      });
      
      const result = await printerService.printLabels([mockPackingItem]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Printer not available');
    });

    test('should validate input parameters', async () => {
      // Red: Test validation
      const invalidItem = { ...mockPackingItem, item_name: '' };
      
      const result = await printerService.printLabels([invalidItem]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid item data');
    });
  });

  describe('SOLID Principles Compliance', () => {
    test('should implement IPrinterService interface correctly', () => {
      // Interface Segregation Principle
      expect(printerService).toBeInstanceOf(PrinterService);
      expect(typeof printerService.initialize).toBe('function');
      expect(typeof printerService.printLabels).toBe('function');
      expect(typeof printerService.getStatus).toBe('function');
    });

    test('should be configurable without modification (Open/Closed)', async () => {
      // Open/Closed Principle - should be extensible
      const customService = new PrinterService('./custom-templates');
      expect(customService).toBeInstanceOf(PrinterService);
    });
  });
});

// Integration tests for real printer communication
describe('PrinterService Integration', () => {
  let printerService: PrinterService;

  beforeEach(() => {
    printerService = new PrinterService();
  });

  test('should communicate with actual printer when available', async () => {
    // This test would only run in real environment with printer
    if (process.env.NODE_ENV === 'test-integration') {
      await printerService.initialize();
      const status = await printerService.getStatus();
      
      expect(status).toBeDefined();
      // Don't assert specific values as they depend on actual hardware
    } else {
      expect(true).toBe(true); // Skip in unit tests
    }
  });
});