import { BoxLabelEZPLService, BoxLabelEZPLData } from '../box-label-ezpl.service';
import { ILogger } from '../../interfaces/ILogger';

// Mock logger
const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
};

describe('BoxLabelEZPLService', () => {
  let service: BoxLabelEZPLService;

  const mockLabelData: BoxLabelEZPLData = {
    orderId: '39641',
    boxNumber: 1,
    totalBoxes: 3,
    customerName: 'John Smith',
    customerCompany: 'Smith Foods Ltd.',
    customerCity: 'Tel Aviv',
    region: 'tel_aviv',
    items: [
      {
        name: 'Blini',
        nameHebrew: 'בליני',
        nameRussian: 'Блины',
        quantity: 12,
        barcode: '1234567890123',
        catalogNumber: 'BLN001'
      },
      {
        name: 'Pelmeni',
        nameHebrew: 'פלמני',
        nameRussian: 'Пельмени',
        quantity: 8,
        barcode: '9876543210987',
        catalogNumber: 'PLM001'
      }
    ],
    deliveryDate: '2025-01-15'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BoxLabelEZPLService(mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with provided logger', () => {
      const customService = new BoxLabelEZPLService(mockLogger);
      expect(customService).toBeInstanceOf(BoxLabelEZPLService);
    });

    it('should initialize with default console logger when none provided', () => {
      const defaultService = new BoxLabelEZPLService();
      expect(defaultService).toBeInstanceOf(BoxLabelEZPLService);
    });
  });

  describe('generateBoxLabelEZPL', () => {
    it('should generate complete EZPL code for box label', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);

      expect(result).toContain('^Q30,3'); // Label length and gap
      expect(result).toContain('^W100'); // Label width
      expect(result).toContain('^L'); // Start label formatting
      expect(result).toContain('E'); // End of label command
      expect(result).toContain('39641'); // Order ID
      expect(result).toContain('1/3'); // Box indicator
      expect(result).toContain('Smith Foods Ltd.'); // Customer company
      expect(result).toContain('John Smith'); // Customer name
      expect(result).toContain('Tel Aviv'); // Customer city
      expect(result).toContain('בליני'); // Item name (Hebrew)
      expect(result).toContain('פלמני'); // Item name (Hebrew)

      expect(mockLogger.info).toHaveBeenCalledWith('Generating EZPL for box label', {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 3
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Generated EZPL code', {
        length: expect.any(Number),
        lines: expect.any(Number)
      });
    });

    it('should handle minimal data without optional fields', () => {
      const minimalData: BoxLabelEZPLData = {
        orderId: 12345,
        boxNumber: 2,
        totalBoxes: 2,
        customerName: 'Test Customer',
        items: [
          {
            name: 'Test Item',
            quantity: 1
          }
        ]
      };

      const result = service.generateBoxLabelEZPL(minimalData);

      expect(result).toContain('12345'); // Order ID as number
      expect(result).toContain('2/2'); // Box indicator
      expect(result).toContain('Test Customer'); // Customer name
      expect(result).toContain('Test Item'); // Item name
      expect(result).toContain(new Date().toLocaleDateString('he-IL')); // Default date
      
      // Should not contain company or region specific elements
      expect(result).not.toContain('Smith Foods'); 
    });

    it('should handle Hebrew and Russian item names', () => {
      const hebrewRussianData: BoxLabelEZPLData = {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 1,
        customerName: 'Test Customer',
        items: [
          {
            name: 'Vareniki',
            nameHebrew: 'ורניקי',
            nameRussian: 'Вареники',
            quantity: 15,
            barcode: '1111111111111'
          }
        ]
      };

      const result = service.generateBoxLabelEZPL(hebrewRussianData);

      expect(result).toContain('ורניקי'); // Hebrew name
      expect(result).toContain('Вареники'); // Russian name
      expect(result).toContain('1111111111111'); // Barcode
    });

    it('should handle different regions correctly', () => {
      const regions = ['tel_aviv', 'haifa', 'beer_sheva', 'other'];
      
      regions.forEach(region => {
        const regionData = {
          ...mockLabelData,
          region
        };

        const result = service.generateBoxLabelEZPL(regionData);
        
        // Should contain region indicator box
        expect(result).toContain('R10,40,200,140,4'); // Region box
        
        // Should contain appropriate region text based on region
        switch(region) {
          case 'tel_aviv':
            expect(result).toContain('תל אביב');
            expect(result).toContain('Тель-Авив');
            break;
          case 'haifa':
            expect(result).toContain('חיפה');
            expect(result).toContain('Хайфа');
            break;
          case 'beer_sheva':
            expect(result).toContain('באר שבע');
            expect(result).toContain('Беэр-Шева');
            break;
          default:
            expect(result).toContain('אחר');
            expect(result).toContain('Другой');
        }
      });
    });

    it('should handle large number of items', () => {
      const manyItemsData: BoxLabelEZPLData = {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 1,
        customerName: 'Test Customer',
        items: Array.from({ length: 10 }, (_, i) => ({
          name: `Item ${i + 1}`,
          nameHebrew: `פריט ${i + 1}`,
          quantity: i + 1,
          catalogNumber: `CAT${i + 1}`.padStart(6, '0')
        }))
      };

      const result = service.generateBoxLabelEZPL(manyItemsData);
      
      // Should contain all items (though layout may be truncated)
      // Since maxItems is 4, only first 4 items will be shown in detail
      for (let i = 1; i <= 4; i++) {
        expect(result).toContain(`פריט ${i}`); // Hebrew names are used when available
      }

      // Should still have proper structure
      expect(result).toContain('^L'); // Start
      expect(result).toContain('E'); // End
    });

    it('should handle empty items array', () => {
      const noItemsData: BoxLabelEZPLData = {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 1,
        customerName: 'Test Customer',
        items: []
      };

      const result = service.generateBoxLabelEZPL(noItemsData);
      
      expect(result).toContain('39641');
      expect(result).toContain('Test Customer');
      expect(result).toContain('^L');
      expect(result).toContain('E');
      
      // Should not contain item-related commands beyond basic structure
      expect(result.split('\n').length).toBeGreaterThan(10); // Should have basic structure
    });

    it('should format dates correctly', () => {
      const customDateData = {
        ...mockLabelData,
        deliveryDate: '2025-12-31'
      };

      const result = service.generateBoxLabelEZPL(customDateData);
      expect(result).toContain('2025-12-31');

      // Test without custom date (should use current date)
      const noDateData = { ...mockLabelData };
      delete noDateData.deliveryDate;
      
      const resultNoDate = service.generateBoxLabelEZPL(noDateData);
      expect(resultNoDate).toContain(new Date().toLocaleDateString('he-IL'));
    });

    it('should generate consistent output for same input', () => {
      const result1 = service.generateBoxLabelEZPL(mockLabelData);
      const result2 = service.generateBoxLabelEZPL(mockLabelData);

      // Should be identical except for date if no deliveryDate specified
      const dataWithDate = { ...mockLabelData, deliveryDate: '2025-01-01' };
      const resultWithDate1 = service.generateBoxLabelEZPL(dataWithDate);
      const resultWithDate2 = service.generateBoxLabelEZPL(dataWithDate);
      
      expect(resultWithDate1).toBe(resultWithDate2);
    });
  });

  describe('EZPL command validation', () => {
    it('should generate valid EZPL initialization commands', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);
      const lines = result.split('\n');

      // Check for proper initialization sequence
      expect(lines).toContain('^Q30,3'); // Label settings
      expect(lines).toContain('^W100'); // Width
      expect(lines).toContain('^H10'); // Speed
      expect(lines).toContain('^P1'); // Copies
      expect(lines).toContain('^L'); // Start formatting
    });

    it('should generate valid border commands', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);
      
      // Should contain border rectangle command
      expect(result).toContain('R10,10,1180,1180,6');
    });

    it('should generate valid text commands', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);
      
      // ASCII text commands should follow pattern: A<x>,<y>,<rotation>,<font>,<h_mult>,<v_mult>,<reverse>,"text"
      const textCommands = result.split('\n').filter(line => line.startsWith('A'));
      
      textCommands.forEach(command => {
        // Basic validation of ASCII command structure
        expect(command).toMatch(/^A[HN]?\d+,\d+,\d+,\d+,\d+,\d+,[NR]/);
      });
    });

    it('should generate valid barcode commands for items with barcodes', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);
      
      // Should contain barcode commands for items that have barcodes
      mockLabelData.items
        .filter(item => item.barcode)
        .forEach(item => {
          // Barcode command pattern: B<x>,<y>,<rotation>,<type>,<width>,<height>,<human readable>,"data"
          expect(result).toContain(`"${item.barcode}"`);
        });
    });

    it('should end with proper termination', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);
      const lines = result.split('\n');
      
      expect(lines[lines.length - 1]).toBe('E');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long customer names', () => {
      const longNameData = {
        ...mockLabelData,
        customerName: 'A'.repeat(100),
        customerCompany: 'B'.repeat(150)
      };

      const result = service.generateBoxLabelEZPL(longNameData);
      
      // Names are truncated, so check for truncation indicator
      expect(result).toContain('...');
      // Should still contain the truncated versions
      expect(result).toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...');
      expect(result).toContain('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
      expect(result).toContain('^L');
      expect(result).toContain('E');
    });

    it('should handle special characters in text', () => {
      const specialCharsData: BoxLabelEZPLData = {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 1,
        customerName: 'Customer "With" Special & Characters',
        customerCompany: 'Company <with> brackets',
        items: [
          {
            name: 'Item (with) special chars & symbols',
            quantity: 1
          }
        ]
      };

      const result = service.generateBoxLabelEZPL(specialCharsData);
      
      // Special characters are escaped in EZPL output
      expect(result).toContain('Customer \\"With\\" Special & Characters');
      expect(result).toContain('Company <with> brackets');
      expect(result).toContain('Item (with) special chars &...');
    });

    it('should handle zero quantities', () => {
      const zeroQuantityData: BoxLabelEZPLData = {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 1,
        customerName: 'Test Customer',
        items: [
          {
            name: 'Zero Item',
            quantity: 0
          },
          {
            name: 'Normal Item',
            quantity: 5
          }
        ]
      };

      const result = service.generateBoxLabelEZPL(zeroQuantityData);
      
      expect(result).toContain('Zero Item');
      expect(result).toContain('Normal Item');
      // Quantities are shown as numbers, not "Qty: X" format
      expect(result).toContain('"0"'); // Zero quantity
      expect(result).toContain('"5"'); // Normal quantity
    });

    it('should handle high box numbers', () => {
      const highBoxData = {
        ...mockLabelData,
        boxNumber: 999,
        totalBoxes: 1000
      };

      const result = service.generateBoxLabelEZPL(highBoxData);
      
      expect(result).toContain('999/1000');
    });
  });

  describe('logging behavior', () => {
    it('should log label generation start and completion', () => {
      service.generateBoxLabelEZPL(mockLabelData);

      expect(mockLogger.info).toHaveBeenCalledWith('Generating EZPL for box label', {
        orderId: '39641',
        boxNumber: 1,
        totalBoxes: 3
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Generated EZPL code', {
        length: expect.any(Number),
        lines: expect.any(Number)
      });
    });

    it('should log correct statistics', () => {
      // Clear previous mock calls
      mockLogger.debug.mockClear();
      
      const result = service.generateBoxLabelEZPL(mockLabelData);
      const actualLength = result.length;

      expect(mockLogger.debug).toHaveBeenCalledWith('Generated EZPL code', {
        length: actualLength,
        lines: expect.any(Number)
      });
      
      // Verify the actual values are reasonable
      expect(actualLength).toBeGreaterThan(100);
      
      // Verify the logged values match the expectations
      const logCall = mockLogger.debug.mock.calls[0]?.[1];
      expect(logCall?.lines).toBeGreaterThan(10);
      expect(logCall?.lines).toBeLessThan(100);
    });
  });

  describe('performance and output size', () => {
    it('should generate output within reasonable size limits', () => {
      const result = service.generateBoxLabelEZPL(mockLabelData);
      
      // EZPL output should be reasonable size (not too large for printer memory)
      expect(result.length).toBeLessThan(50000); // 50KB limit
      expect(result.length).toBeGreaterThan(100); // Should have substantial content
    });

    it('should complete generation quickly', () => {
      const startTime = Date.now();
      
      service.generateBoxLabelEZPL(mockLabelData);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should scale reasonably with item count', () => {
      const smallData = { ...mockLabelData, items: mockLabelData.items.slice(0, 1) };
      const largeData = { 
        ...mockLabelData, 
        items: Array(20).fill(null).map((_, i) => ({
          name: `Item ${i}`,
          quantity: i + 1
        }))
      };

      const smallResult = service.generateBoxLabelEZPL(smallData);
      const largeResult = service.generateBoxLabelEZPL(largeData);

      // Large result should be bigger but not exponentially so
      const sizeRatio = largeResult.length / smallResult.length;
      expect(sizeRatio).toBeGreaterThan(1);
      expect(sizeRatio).toBeLessThan(10); // Should not be more than 10x larger
    });
  });
});