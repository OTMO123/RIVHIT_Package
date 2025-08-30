#!/usr/bin/env ts-node

/**
 * Test GoLabel printing with sample data
 * This creates test data and generates labels without needing existing orders
 * Run with: npx ts-node test-golabel-with-sample-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BoxLabelTemplateService } from './src/services/golabel/generators/box-label-template-service';
import { BoxLabelGoLabelGeneratorService } from './src/services/golabel/generators/box-label-golabel-generator.service';
import { GoLabelCliService } from './src/services/golabel/cli/golabel-cli.service';
import { ConsoleLoggerService } from './src/services/logging/console.logger.service';

async function testWithSampleData() {
  console.log('\n🧪 GoLabel Test with Sample Data\n');
  
  const logger = new ConsoleLoggerService('GoLabelTest');
  const tempDir = path.join(os.tmpdir(), 'golabel-sample-test-' + Date.now());
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  console.log(`📁 Output directory: ${tempDir}\n`);

  // Sample test scenarios
  const testScenarios = [
    {
      name: 'Single Item Box',
      data: {
        orderId: '39773',
        boxNumber: 1,
        totalBoxes: 4,
        customerName: 'יעקב כהן',
        region: 'north1',
        deliveryDate: new Date().toLocaleDateString('he-IL'),
        items: [
          {
            itemId: 'ITEM_001',
            name: 'חלב 3% 1 ליטר תנובה',
            nameHebrew: 'חלב 3% 1 ליטר תנובה',
            quantity: 10,
            catalogNumber: '100123',
            barcode: '7290000042015'
          }
        ]
      }
    },
    {
      name: 'Two Items Box',
      data: {
        orderId: '39773',
        boxNumber: 2,
        totalBoxes: 4,
        customerName: 'יעקב כהן',
        region: 'north1',
        deliveryDate: new Date().toLocaleDateString('he-IL'),
        items: [
          {
            itemId: 'ITEM_002',
            name: 'לחם אחיד פרוס',
            nameHebrew: 'לחם אחיד פרוס',
            quantity: 12,
            catalogNumber: '200456',
            barcode: '7290000042022'
          },
          {
            itemId: 'ITEM_003',
            name: 'ביצים L גודל 12 יח׳',
            nameHebrew: 'ביצים L גודל 12 יח׳',
            quantity: 6,
            catalogNumber: '300789',
            barcode: '7290000042039'
          }
        ]
      }
    },
    {
      name: 'Three Items Box (Max)',
      data: {
        orderId: '39773',
        boxNumber: 3,
        totalBoxes: 4,
        customerName: 'יעקב כהן',
        region: 'south2',
        deliveryDate: new Date().toLocaleDateString('he-IL'),
        items: [
          {
            itemId: 'ITEM_004',
            name: 'עגבניות שרי',
            nameHebrew: 'עגבניות שרי',
            quantity: 5,
            catalogNumber: '400111',
            barcode: '7290000042046'
          },
          {
            itemId: 'ITEM_005',
            name: 'מלפפונים',
            nameHebrew: 'מלפפונים',
            quantity: 8,
            catalogNumber: '400222',
            barcode: '7290000042053'
          },
          {
            itemId: 'ITEM_006',
            name: 'בצל יבש',
            nameHebrew: 'בצל יבש',
            quantity: 3,
            catalogNumber: '400333',
            barcode: '7290000042060'
          }
        ]
      }
    },
    {
      name: 'Partial Box',
      data: {
        orderId: '39773',
        boxNumber: 4,
        totalBoxes: 4,
        customerName: 'יעקב כהן',
        region: 'south2',
        deliveryDate: new Date().toLocaleDateString('he-IL'),
        items: [
          {
            itemId: 'ITEM_007',
            name: 'אורז בסמטי',
            nameHebrew: 'אורז בסמטי',
            quantity: 2,
            catalogNumber: '500123',
            barcode: '7290000042077'
          }
        ]
      }
    }
  ];

  // Initialize services
  const templateService = new BoxLabelTemplateService(logger);
  const dynamicGenerator = new BoxLabelGoLabelGeneratorService(logger);
  const golabelService = new GoLabelCliService(logger);
  
  const useTemplate = templateService.isTemplateAvailable();
  console.log(`🔧 Using: ${useTemplate ? 'Template Service (box_label_example.ezpx)' : 'Dynamic Generator'}\n`);

  // Generate labels for each scenario
  const generatedFiles: string[] = [];
  
  for (const scenario of testScenarios) {
    console.log(`📦 Generating: ${scenario.name}`);
    console.log(`   Box ${scenario.data.boxNumber}/${scenario.data.totalBoxes} - ${scenario.data.items.length} items`);
    
    try {
      const ezpxContent = useTemplate 
        ? templateService.generateBoxLabel(scenario.data)
        : dynamicGenerator.generateBoxLabel(scenario.data);
      
      const filename = `test_${scenario.data.orderId}_box${scenario.data.boxNumber}.ezpx`;
      const filepath = path.join(tempDir, filename);
      
      fs.writeFileSync(filepath, ezpxContent, 'utf8');
      generatedFiles.push(filepath);
      
      console.log(`   ✅ Generated: ${filename} (${ezpxContent.length} bytes)`);
      
      // Show items
      scenario.data.items.forEach(item => {
        console.log(`      - ${item.quantity}x ${item.nameHebrew}`);
      });
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }

  // Check GoLabel availability
  console.log('🖨️  Checking GoLabel...');
  const isGoLabelAvailable = await golabelService.initialize();
  
  if (isGoLabelAvailable) {
    console.log('✅ GoLabel is installed!\n');
    
    // Show options
    console.log('📋 Generated files:');
    generatedFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${path.basename(file)}`);
    });
    
    console.log('\n💡 Options:');
    console.log('   1. Open files manually from:', tempDir);
    console.log('   2. Run: npx ts-node test-golabel-printing.ts (for real order test)');
    console.log('   3. Copy .ezpx files to GoLabel hot folder for auto-print');
    
    // Open first file in GoLabel (optional)
    console.log('\n🚀 Attempting to print first label via GoLabel...');
    try {
      const result = await golabelService.print(generatedFiles[0]);
      if (result.success) {
        console.log('✅ Label sent to GoLabel!');
        console.log(`   Method: ${result.method}`);
        console.log(`   Duration: ${result.duration}ms`);
      } else {
        console.log(`⚠️  ${result.message}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not print via GoLabel: ${error}`);
    }
    
  } else {
    console.log('⚠️  GoLabel not found\n');
    console.log('📥 To test printing:');
    console.log('   1. Install GoLabel from GoDEX');
    console.log('   2. Open the .ezpx files from:', tempDir);
  }

  // Create a summary HTML file for easy viewing
  const summaryHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>GoLabel Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .box { border: 1px solid #ccc; padding: 15px; margin: 10px 0; }
        .item { margin-left: 20px; }
        code { background: #f4f4f4; padding: 2px 5px; }
    </style>
</head>
<body>
    <h1>GoLabel Box Label Test Results</h1>
    <p>Generated ${generatedFiles.length} test labels</p>
    
    ${testScenarios.map((scenario, index) => `
    <div class="box">
        <h3>${scenario.name}</h3>
        <p><strong>Order:</strong> ${scenario.data.orderId} | 
           <strong>Box:</strong> ${scenario.data.boxNumber}/${scenario.data.totalBoxes} | 
           <strong>Customer:</strong> ${scenario.data.customerName}</p>
        <p><strong>Items:</strong></p>
        ${scenario.data.items.map(item => `
        <div class="item">
            - ${item.quantity}x ${item.nameHebrew} 
            <code>${item.barcode || 'No barcode'}</code>
        </div>
        `).join('')}
        <p><strong>File:</strong> <code>${path.basename(generatedFiles[index])}</code></p>
    </div>
    `).join('')}
    
    <hr>
    <p><strong>Output Directory:</strong> <code>${tempDir}</code></p>
</body>
</html>
  `;
  
  const summaryPath = path.join(tempDir, 'test-summary.html');
  fs.writeFileSync(summaryPath, summaryHtml, 'utf8');
  console.log(`\n📄 Test summary saved: ${summaryPath}`);
  
  console.log('\n✅ Test completed!\n');
}

// Run the test
testWithSampleData().catch(console.error);