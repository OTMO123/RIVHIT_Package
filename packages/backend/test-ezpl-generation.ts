#!/usr/bin/env ts-node

import { BoxLabelEZPLService, BoxLabelEZPLData } from './src/services/box-label-ezpl.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Test script for EZPL generation
 * Generates sample EZPL code for box labels
 */
async function testEZPLGeneration() {
  console.log('🔍 Testing EZPL Generation for Box Labels\n');
  
  const service = new BoxLabelEZPLService();
  
  // Test data matching the order from the screenshot
  const testData: BoxLabelEZPLData = {
    orderId: '39641',
    boxNumber: 2,
    totalBoxes: 2,
    customerName: 'סיטי מרקט בכיכר חולון זיו',
    customerCity: 'חולון',
    region: 'NORTH2',  // Север 2 / צפון 2
    items: [
      {
        name: 'כיסוני השף 1400 גרי',
        nameHebrew: 'כיסוני השף 1400 גרי',
        nameRussian: 'Пельмени Шеф 1400г',
        quantity: 11,
        barcode: '7290011585198',
        catalogNumber: '7290011585198'
      },
      {
        name: 'כיסונים אריזה משפחתית 1500 גר',
        nameHebrew: 'כיסונים אריזה משפחתית 1500 גר',
        nameRussian: 'Пельмени семейная упаковка 1500г',
        quantity: 10,
        barcode: '7290011585228',
        catalogNumber: '7290011585228'
      },
      {
        name: 'כיסונים ביתי 900 גרי',
        nameHebrew: 'כיסונים ביתי 900 גרי',
        nameRussian: 'Пельмени домашние 900г',
        quantity: 11,
        barcode: '7290011585723',
        catalogNumber: '7290011585723'
      }
    ],
    deliveryDate: '23.8.2025'
  };

  try {
    // Generate standard EZPL
    console.log('📝 Generating standard EZPL label...');
    const standardEZPL = service.generateBoxLabelEZPL(testData);
    
    // Save to file
    const outputDir = path.join(process.cwd(), 'temp', 'ezpl-test');
    await fs.mkdir(outputDir, { recursive: true });
    
    const standardFile = path.join(outputDir, `box-label-${testData.orderId}-box${testData.boxNumber}.ezpl`);
    await fs.writeFile(standardFile, standardEZPL, 'utf-8');
    console.log(`✅ Standard EZPL saved to: ${standardFile}`);
    console.log(`   Size: ${standardEZPL.length} bytes`);
    console.log(`   Lines: ${standardEZPL.split('\n').length}`);
    
    // Generate compact EZPL
    console.log('\n📝 Generating compact EZPL label...');
    const compactEZPL = service.generateCompactBoxLabelEZPL(testData);
    
    const compactFile = path.join(outputDir, `box-label-${testData.orderId}-box${testData.boxNumber}-compact.ezpl`);
    await fs.writeFile(compactFile, compactEZPL, 'utf-8');
    console.log(`✅ Compact EZPL saved to: ${compactFile}`);
    console.log(`   Size: ${compactEZPL.length} bytes`);
    console.log(`   Lines: ${compactEZPL.split('\n').length}`);
    
    // Display sample of generated EZPL
    console.log('\n📄 Sample of generated EZPL (first 20 lines):');
    console.log('─'.repeat(50));
    const lines = standardEZPL.split('\n').slice(0, 20);
    lines.forEach((line, index) => {
      console.log(`${(index + 1).toString().padStart(3)}: ${line}`);
    });
    console.log('─'.repeat(50));
    
    // Test with multiple boxes
    console.log('\n📦 Generating labels for multiple boxes...');
    for (let i = 1; i <= 3; i++) {
      const multiBoxData = { ...testData, boxNumber: i, totalBoxes: 3 };
      const ezpl = service.generateBoxLabelEZPL(multiBoxData);
      const file = path.join(outputDir, `multi-box-${i}-of-3.ezpl`);
      await fs.writeFile(file, ezpl, 'utf-8');
      console.log(`   Box ${i}/3: ${file}`);
    }
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const apiResponse = await fetch('http://localhost:3001/api/print/box-label-ezpl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: testData.orderId,
        boxNumber: testData.boxNumber,
        totalBoxes: testData.totalBoxes,
        customerName: testData.customerName,
        customerCity: testData.customerCity,
        region: testData.region,
        items: testData.items,
        format: 'standard'
      })
    });
    
    if (apiResponse.ok) {
      const result = await apiResponse.json();
      console.log('✅ API endpoint working!');
      console.log(`   Message: ${result.message}`);
      console.log(`   EZPL length: ${result.ezpl?.length || 0} bytes`);
    } else {
      console.log('❌ API endpoint failed:', apiResponse.status, apiResponse.statusText);
    }
    
    console.log('\n✨ EZPL generation test completed successfully!');
    console.log(`📁 Output files saved in: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEZPLGeneration().catch(console.error);