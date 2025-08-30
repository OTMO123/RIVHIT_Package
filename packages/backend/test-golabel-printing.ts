#!/usr/bin/env ts-node

/**
 * Manual test script for GoLabel box label printing
 * Run with: npx ts-node test-golabel-printing.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppDataSource } from './src/config/database.config';
import { OrderStatus } from './src/entities/OrderStatus';
import { OrderBoxes } from './src/entities/OrderBoxes';
import { BoxLabelTemplateService } from './src/services/golabel/generators/box-label-template-service';
import { BoxLabelGoLabelGeneratorService } from './src/services/golabel/generators/box-label-golabel-generator.service';
import { GoLabelCliService } from './src/services/golabel/cli/golabel-cli.service';
import { ConsoleLoggerService } from './src/services/logging/console.logger.service';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testGoLabelPrinting() {
  log('\n🚀 GoLabel Box Label Printing Test\n', colors.bright);
  
  const logger = new ConsoleLoggerService('GoLabelTest');
  const tempDir = path.join(os.tmpdir(), 'golabel-test-' + Date.now());
  
  try {
    // Initialize database
    log('📊 Initializing database connection...', colors.blue);
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    log('✅ Database connected', colors.green);

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    log(`📁 Temp directory: ${tempDir}`, colors.cyan);

    // Step 1: Find an existing order with boxes
    log('\n📦 Step 1: Finding orders with boxes...', colors.yellow);
    
    const orderBoxesRepo = AppDataSource.getRepository(OrderBoxes);
    const ordersWithBoxes = await orderBoxesRepo
      .createQueryBuilder('box')
      .select('DISTINCT box.orderId', 'orderId')
      .where('box.isDraft = :isDraft', { isDraft: true })
      .getRawMany();

    if (ordersWithBoxes.length === 0) {
      log('❌ No orders with draft boxes found!', colors.red);
      log('   Please pack some orders first using the application', colors.yellow);
      return;
    }

    log(`✅ Found ${ordersWithBoxes.length} orders with boxes`, colors.green);
    
    // Use the first order for testing
    const testOrderId = ordersWithBoxes[0].orderId;
    log(`📋 Using order: ${testOrderId}`, colors.cyan);

    // Step 2: Get order details
    log('\n👤 Step 2: Getting order details...', colors.yellow);
    
    const orderStatusRepo = AppDataSource.getRepository(OrderStatus);
    const orderStatus = await orderStatusRepo.findOne({
      where: { orderId: testOrderId }
    });

    if (!orderStatus) {
      log('❌ Order status not found!', colors.red);
      return;
    }

    log(`✅ Order Number: ${orderStatus.orderNumber}`, colors.green);
    log(`   Customer: ${orderStatus.customerName || 'Unknown'}`, colors.cyan);
    log(`   Status: ${orderStatus.status}`, colors.cyan);

    // Step 3: Get boxes for this order
    log('\n📦 Step 3: Getting boxes...', colors.yellow);
    
    const boxes = await orderBoxesRepo.find({
      where: { orderId: testOrderId, isDraft: true },
      order: { boxNumber: 'ASC' }
    });

    log(`✅ Found ${boxes.length} boxes:`, colors.green);
    
    boxes.forEach(box => {
      const items = JSON.parse(box.itemsJson || '[]');
      log(`   📦 Box ${box.boxNumber}: ${items.length} items`, colors.cyan);
      items.forEach((item: any) => {
        log(`      - ${item.quantity}x ${item.nameHebrew || item.name} (${item.catalogNumber || 'N/A'})`, colors.reset);
      });
    });

    // Step 4: Generate EZPX labels
    log('\n🏷️  Step 4: Generating EZPX labels...', colors.yellow);
    
    const templateService = new BoxLabelTemplateService(logger);
    const dynamicGenerator = new BoxLabelGoLabelGeneratorService(logger);
    const useTemplate = templateService.isTemplateAvailable();
    
    log(`   Using: ${useTemplate ? 'Template Service' : 'Dynamic Generator'}`, colors.cyan);
    
    const generatedFiles: string[] = [];
    
    for (const box of boxes) {
      const items = JSON.parse(box.itemsJson || '[]');
      
      const boxData = {
        orderId: testOrderId,
        boxNumber: box.boxNumber,
        totalBoxes: boxes.length,
        customerName: orderStatus.customerName || 'Test Customer',
        items: items,
        region: 'north1',
        deliveryDate: new Date().toLocaleDateString('he-IL')
      };

      const ezpxContent = useTemplate 
        ? templateService.generateBoxLabel(boxData)
        : dynamicGenerator.generateBoxLabel(boxData);

      const filename = `box_${testOrderId}_${box.boxNumber}_${Date.now()}.ezpx`;
      const filepath = path.join(tempDir, filename);
      
      fs.writeFileSync(filepath, ezpxContent, 'utf8');
      generatedFiles.push(filepath);
      
      log(`   ✅ Generated: ${filename} (${ezpxContent.length} bytes)`, colors.green);
    }

    // Step 5: Test GoLabel integration
    log('\n🖨️  Step 5: Testing GoLabel integration...', colors.yellow);
    
    const golabelService = new GoLabelCliService(logger);
    const isGoLabelAvailable = await golabelService.initialize();
    
    if (isGoLabelAvailable) {
      log('✅ GoLabel is available!', colors.green);
      log(`   GoLabel is available for printing`, colors.cyan);
      
      // Ask user if they want to open in GoLabel
      log('\n❓ Open first label in GoLabel? (y/n)', colors.yellow);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>(resolve => {
        rl.question('', (answer: string) => {
          rl.close();
          resolve(answer.toLowerCase());
        });
      });
      
      if (answer === 'y' && generatedFiles.length > 0) {
        log('\n🚀 Sending to GoLabel...', colors.blue);
        try {
          const result = await golabelService.print(generatedFiles[0]);
          if (result.success) {
            log('✅ Label sent to GoLabel!', colors.green);
            log(`   Method: ${result.method}`, colors.cyan);
            log(`   Duration: ${result.duration}ms`, colors.cyan);
          } else {
            log(`⚠️  ${result.message}`, colors.yellow);
            if (result.error) {
              log(`   Error: ${result.error}`, colors.yellow);
            }
          }
        } catch (error) {
          log(`❌ Error: ${error}`, colors.red);
        }
      }
    } else {
      log('⚠️  GoLabel not found on this system', colors.yellow);
      log('   Install GoLabel from GoDEX to enable printing', colors.cyan);
    }

    // Step 6: Summary
    log('\n📊 Test Summary:', colors.bright);
    log(`   ✅ Order ID: ${testOrderId}`, colors.green);
    log(`   ✅ Boxes: ${boxes.length}`, colors.green);
    log(`   ✅ Labels Generated: ${generatedFiles.length}`, colors.green);
    log(`   ✅ Output Directory: ${tempDir}`, colors.green);
    
    log('\n💡 Next Steps:', colors.yellow);
    log('   1. Check the generated EZPX files in the temp directory', colors.cyan);
    log('   2. Open them manually in GoLabel if needed', colors.cyan);
    log('   3. Verify the label layout matches your requirements', colors.cyan);
    
  } catch (error) {
    log(`\n❌ Error: ${error}`, colors.red);
    console.error(error);
  } finally {
    // Cleanup
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    log('\n👋 Test completed!', colors.bright);
  }
}

// Run the test
testGoLabelPrinting().catch(console.error);