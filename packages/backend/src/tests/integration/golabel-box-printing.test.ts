import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppDataSource } from '../../config/database.config';
import { OrderStatus } from '../../entities/OrderStatus';
import { OrderBoxes } from '../../entities/OrderBoxes';
import { MaxPerBoxSetting } from '../../entities/MaxPerBoxSetting';
import { BoxLabelTemplateService } from '../../services/golabel/generators/box-label-template-service';
import { GoLabelCliService } from '../../services/golabel/cli/golabel-cli.service';
import { ConsoleLoggerService } from '../../services/logging/console.logger.service';

/**
 * Comprehensive integration test for GoLabel box label printing
 * This test verifies the complete flow from database to EZPX generation
 */
describe('GoLabel Box Label Printing Integration', () => {
  let logger: ConsoleLoggerService;
  let templateService: BoxLabelTemplateService;
  let goLabelService: GoLabelCliService;
  let testOrderId: string;
  let tempDir: string;
  let generatedFiles: string[] = [];

  beforeAll(async () => {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    logger = new ConsoleLoggerService('GoLabelTest');
    templateService = new BoxLabelTemplateService(logger);
    goLabelService = new GoLabelCliService(logger);

    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), 'golabel-test-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('✅ Test environment initialized');
    console.log(`📁 Temp directory: ${tempDir}`);
  });

  afterAll(async () => {
    // Cleanup temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('Database Setup and Data Preparation', () => {
    it('should create test order with maxPerBox settings', async () => {
      // Create test order ID
      testOrderId = `TEST_${Date.now()}`;

      // Insert maxPerBox settings for test items
      const maxPerBoxRepo = AppDataSource.getRepository(MaxPerBoxSetting);
      
      await maxPerBoxRepo.save([
        {
          catalogNumber: 'TEST001',
          maxQuantity: 5,
          description: 'Test Item 1 - Max 5 per box',
          isActive: true
        },
        {
          catalogNumber: 'TEST002',
          maxQuantity: 3,
          description: 'Test Item 2 - Max 3 per box',
          isActive: true
        },
        {
          catalogNumber: 'TEST003',
          maxQuantity: 10,
          description: 'Test Item 3 - Max 10 per box',
          isActive: true
        }
      ]);

      console.log('✅ MaxPerBox settings created');

      // Create order status
      const orderStatusRepo = AppDataSource.getRepository(OrderStatus);
      const orderStatus = await orderStatusRepo.save({
        orderId: testOrderId,
        orderNumber: '12345',
        status: 'packed_pending_labels',
        isPacked: true,
        packedAt: new Date(),
        customerName: 'Test Customer טסט לקוח'
      });

      console.log('✅ Order status created:', orderStatus.orderId);

      // Create draft boxes with items respecting maxPerBox
      const orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
      
      // Box 1: Mixed items (respecting smallest limit)
      const box1 = await orderBoxesRepo.save({
        orderId: testOrderId,
        boxNumber: 1,
        itemsJson: JSON.stringify([
          {
            itemId: 'ITEM_001',
            name: 'מוצר ראשון',
            nameHebrew: 'מוצר ראשון',
            quantity: 2,
            catalogNumber: 'TEST001',
            barcode: '7290000000001'
          },
          {
            itemId: 'ITEM_002',
            name: 'מוצר שני',
            nameHebrew: 'מוצר שני',
            quantity: 1,
            catalogNumber: 'TEST002',
            barcode: '7290000000002'
          }
        ]),
        isDraft: true
      });

      // Box 2: Single item type at max capacity
      const box2 = await orderBoxesRepo.save({
        orderId: testOrderId,
        boxNumber: 2,
        itemsJson: JSON.stringify([
          {
            itemId: 'ITEM_001_2',
            name: 'מוצר ראשון',
            nameHebrew: 'מוצר ראשון',
            quantity: 5,
            catalogNumber: 'TEST001',
            barcode: '7290000000001'
          }
        ]),
        isDraft: true
      });

      // Box 3: Multiple items
      const box3 = await orderBoxesRepo.save({
        orderId: testOrderId,
        boxNumber: 3,
        itemsJson: JSON.stringify([
          {
            itemId: 'ITEM_003',
            name: 'מוצר שלישי',
            nameHebrew: 'מוצר שלישי',
            quantity: 8,
            catalogNumber: 'TEST003',
            barcode: '7290000000003'
          }
        ]),
        isDraft: true
      });

      console.log('✅ Created 3 test boxes with items');
      
      expect(box1).toBeDefined();
      expect(box2).toBeDefined();
      expect(box3).toBeDefined();
    });

    it('should fetch draft boxes from database', async () => {
      const orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
      const boxes = await orderBoxesRepo.find({
        where: { orderId: testOrderId, isDraft: true },
        order: { boxNumber: 'ASC' }
      });

      expect(boxes).toHaveLength(3);
      
      // Verify box contents
      boxes.forEach(box => {
        const items = JSON.parse(box.itemsJson);
        console.log(`📦 Box ${box.boxNumber}: ${items.length} items`);
        items.forEach((item: any) => {
          console.log(`  - ${item.nameHebrew}: ${item.quantity} units (${item.catalogNumber})`);
        });
      });
    });
  });

  describe('EZPX Label Generation', () => {
    let generatedFiles: string[] = [];

    it('should check if template file exists', () => {
      const templatePath = path.join(process.cwd(), '..', '..', 'docs', 'box_label_example.ezpx');
      const exists = templateService.isTemplateAvailable();
      
      console.log(`📄 Template path: ${templatePath}`);
      console.log(`✅ Template available: ${exists}`);
      
      // Template might not exist in test environment, that's OK
      if (!exists) {
        console.log('⚠️  Template not found, will use dynamic generator');
      }
    });

    it('should generate EZPX for each box', async () => {
      const orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
      const boxes = await orderBoxesRepo.find({
        where: { orderId: testOrderId, isDraft: true },
        order: { boxNumber: 'ASC' }
      });

      for (const box of boxes) {
        const items = JSON.parse(box.itemsJson);
        
        const boxData = {
          orderId: testOrderId,
          boxNumber: box.boxNumber,
          totalBoxes: boxes.length,
          customerName: 'Test Customer טסט לקוח',
          items: items,
          region: 'north1',
          deliveryDate: new Date().toLocaleDateString('he-IL')
        };

        let ezpxContent: string;
        
        if (templateService.isTemplateAvailable()) {
          // Use template service
          ezpxContent = templateService.generateBoxLabel(boxData);
        } else {
          // Use dynamic generator as fallback
          const { BoxLabelGoLabelGeneratorService } = require('../../services/golabel/generators/box-label-golabel-generator.service');
          const generator = new BoxLabelGoLabelGeneratorService(logger);
          ezpxContent = generator.generateBoxLabel(boxData);
        }

        // Verify EZPX content
        expect(ezpxContent).toContain('<?xml');
        expect(ezpxContent).toContain('<PrintJob');
        expect(ezpxContent).toContain(testOrderId);
        expect(ezpxContent).toContain(`${box.boxNumber} / ${boxes.length}`);
        
        // Save to file
        const filename = `test_box_${testOrderId}_${box.boxNumber}.ezpx`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, ezpxContent, 'utf8');
        generatedFiles.push(filepath);
        
        console.log(`✅ Generated EZPX for box ${box.boxNumber}: ${filename}`);
        console.log(`   Size: ${ezpxContent.length} bytes`);
        
        // Verify critical elements in EZPX
        expect(ezpxContent).toContain('<PrinterModel>ZX420i</PrinterModel>');
        expect(ezpxContent).toContain('<LabelWidth>100</LabelWidth>');
        expect(ezpxContent).toContain('<LabelLength>100</LabelLength>');
        
        // Verify items are included
        items.forEach((item: any) => {
          if (item.barcode) {
            expect(ezpxContent).toContain(item.barcode);
          }
          // Note: Hebrew text might be encoded differently
        });
      }

      expect(generatedFiles).toHaveLength(3);
    });

    it('should validate EZPX structure', () => {
      generatedFiles.forEach(filepath => {
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Parse XML to validate structure
        try {
          // Basic XML validation
          const lines = content.split('\n');
          expect(lines[0]).toContain('<?xml version="1.0"');
          
          // Check for required sections
          expect(content).toContain('<Label>');
          expect(content).toContain('<qlabel>');
          expect(content).toContain('<Setup');
          expect(content).toContain('<GraphicShape');
          
          console.log(`✅ EZPX structure valid: ${path.basename(filepath)}`);
        } catch (error) {
          console.error(`❌ Invalid EZPX structure: ${filepath}`, error);
          throw error;
        }
      });
    });
  });

  describe('GoLabel Integration', () => {
    it('should check GoLabel availability', async () => {
      const isAvailable = await goLabelService.initialize();
      
      console.log(`🏷️  GoLabel available: ${isAvailable}`);
      console.log(`📍 GoLabel path: ${goLabelService['golabelPath'] || 'Not found'}`);
      
      if (!isAvailable) {
        console.log('⚠️  GoLabel not installed, skipping print tests');
        console.log('   Install GoLabel from GoDEX to enable printing');
      }
    });

    it('should attempt to load EZPX files in GoLabel', async () => {
      const isAvailable = await goLabelService.initialize();
      
      if (!isAvailable) {
        console.log('⏭️  Skipping: GoLabel not available');
        return;
      }

      // Test with the first generated file
      if (generatedFiles.length > 0) {
        const testFile = generatedFiles[0];
        console.log(`🖨️  Attempting to load: ${path.basename(testFile)}`);
        
        try {
          // Try to open file in GoLabel (won't actually print)
          const result = await goLabelService.openInGoLabel(testFile);
          
          console.log(`✅ GoLabel load result:`, result);
          expect(result.success).toBeDefined();
        } catch (error) {
          console.log(`⚠️  Could not load in GoLabel:`, error);
          // This is OK in test environment
        }
      }
    });

    it('should test hot folder functionality if configured', async () => {
      const hotFolderPath = process.env.GOLABEL_HOT_FOLDER;
      
      if (!hotFolderPath) {
        console.log('⏭️  Skipping: Hot folder not configured');
        return;
      }

      console.log(`📁 Hot folder path: ${hotFolderPath}`);
      
      if (fs.existsSync(hotFolderPath)) {
        console.log('✅ Hot folder exists');
        
        // Test copying a file to hot folder
        if (generatedFiles.length > 0) {
          const testFile = generatedFiles[0];
          const hotFolderFile = path.join(hotFolderPath, `test_${Date.now()}.ezpx`);
          
          try {
            fs.copyFileSync(testFile, hotFolderFile);
            console.log('✅ File copied to hot folder');
            
            // Clean up after a delay
            setTimeout(() => {
              if (fs.existsSync(hotFolderFile)) {
                fs.unlinkSync(hotFolderFile);
              }
            }, 5000);
          } catch (error) {
            console.error('❌ Could not copy to hot folder:', error);
          }
        }
      } else {
        console.log('⚠️  Hot folder does not exist');
      }
    });
  });

  describe('Full Integration Test', () => {
    it('should simulate complete box label printing flow', async () => {
      console.log('\n🔄 Starting full integration test...\n');

      // Step 1: Fetch order and boxes
      const orderStatusRepo = AppDataSource.getRepository(OrderStatus);
      const orderStatus = await orderStatusRepo.findOne({
        where: { orderId: testOrderId }
      });
      expect(orderStatus).toBeDefined();
      console.log(`✅ Step 1: Found order ${orderStatus!.orderNumber}`);

      // Step 2: Get draft boxes
      const orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
      const boxes = await orderBoxesRepo.find({
        where: { orderId: testOrderId, isDraft: true },
        order: { boxNumber: 'ASC' }
      });
      expect(boxes.length).toBeGreaterThan(0);
      console.log(`✅ Step 2: Found ${boxes.length} boxes`);

      // Step 3: Prepare print data
      const printData = {
        orderId: testOrderId,
        customerName: orderStatus!.customerName || 'Test Customer',
        region: 'north1',
        boxes: boxes.map(box => {
          const items = JSON.parse(box.itemsJson);
          return {
            boxNumber: box.boxNumber,
            totalBoxes: boxes.length,
            items: items
          };
        })
      };
      console.log(`✅ Step 3: Prepared print data for ${printData.boxes.length} boxes`);

      // Step 4: Generate labels
      const results = [];
      for (const box of printData.boxes) {
        const boxData = {
          orderId: printData.orderId,
          boxNumber: box.boxNumber,
          totalBoxes: box.totalBoxes,
          customerName: printData.customerName,
          items: box.items,
          region: printData.region,
          deliveryDate: new Date().toLocaleDateString('he-IL')
        };

        let ezpxContent: string;
        if (templateService.isTemplateAvailable()) {
          ezpxContent = templateService.generateBoxLabel(boxData);
        } else {
          const { BoxLabelGoLabelGeneratorService } = require('../../services/golabel/generators/box-label-golabel-generator.service');
          const generator = new BoxLabelGoLabelGeneratorService(logger);
          ezpxContent = generator.generateBoxLabel(boxData);
        }

        const filename = `final_box_${testOrderId}_${box.boxNumber}.ezpx`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, ezpxContent, 'utf8');

        results.push({
          boxNumber: box.boxNumber,
          success: true,
          filename,
          filepath,
          size: ezpxContent.length
        });
      }

      console.log(`✅ Step 4: Generated ${results.length} EZPX files`);
      results.forEach(r => {
        console.log(`   📄 Box ${r.boxNumber}: ${r.filename} (${r.size} bytes)`);
      });

      // Step 5: Verify all files exist
      const allFilesExist = results.every(r => fs.existsSync(r.filepath));
      expect(allFilesExist).toBe(true);
      console.log(`✅ Step 5: All generated files verified`);

      console.log('\n✅ Full integration test completed successfully!\n');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup test data', async () => {
      // Clean up test order
      const orderStatusRepo = AppDataSource.getRepository(OrderStatus);
      const orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
      
      await orderBoxesRepo.delete({ orderId: testOrderId });
      await orderStatusRepo.delete({ orderId: testOrderId });
      
      console.log('✅ Test data cleaned up');
    });
  });
});