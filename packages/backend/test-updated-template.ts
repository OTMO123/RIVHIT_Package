// Test Updated Box Label Template Service
import * as fs from 'fs';
import * as path from 'path';
import { BoxLabelTemplateService } from './src/services/golabel/generators/box-label-template-service';
import { ConsoleLoggerService } from './src/services/logging/console.logger.service';

console.log('🖨️ Testing Updated GoLabel Box Label Template\n');

// Test data matching the template format
const boxData = {
  orderId: '39798',  // This will replace 38987 in the template
  boxNumber: 2,
  totalBoxes: 2,
  customerName: 'מעדני לאון יוליה',
  region: 'north2',
  items: [
    {
      nameHebrew: 'בלינצ\'ס במילוי בשר',
      nameRussian: 'блинчики с мясом',  
      name: 'Meat Blintzes',
      quantity: 5,
      barcode: '7290011505853',
      catalogNumber: '7290011505853'
    },
    {
      nameHebrew: 'בלינצ\'ס במילוי חזרتן',
      nameRussian: 'блинчики с хреном',
      name: 'Horseradish Blintzes', 
      quantity: 5,
      barcode: '7290011505891',
      catalogNumber: '7290011505891'
    },
    {
      nameHebrew: 'בלינצ\'ס במילוי תפו"א עם פטריות',
      nameRussian: 'блинчики с карт. с грибами',
      name: 'Potato Mushroom Blintzes',
      quantity: 5,
      barcode: '7290011505877',
      catalogNumber: '7290011505877'
    }
  ]
};

async function testTemplate() {
  try {
    const logger = new ConsoleLoggerService('TemplateTest');
    const templateService = new BoxLabelTemplateService(logger);
    
    // Check if template exists
    if (!templateService.isTemplateAvailable()) {
      console.error('❌ Template not found at:', templateService.getTemplatePath());
      return;
    }
    
    console.log('✅ Template found at:', templateService.getTemplatePath());
    console.log('\n📋 Generating label with data:');
    console.log('   Order ID:', boxData.orderId);
    console.log('   Box:', `${boxData.boxNumber}/${boxData.totalBoxes}`);
    console.log('   Customer:', boxData.customerName);
    console.log('   Region:', boxData.region);
    console.log('   Items:', boxData.items.length);
    
    // Generate label
    const ezpxContent = templateService.generateBoxLabel(boxData);
    
    // Save output
    const timestamp = Date.now();
    const filename = `box_template_test_${boxData.orderId}_${timestamp}.ezpx`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, ezpxContent, 'utf8');
    console.log('\n✅ Generated label:', filename);
    console.log('   Size:', fs.statSync(filepath).size, 'bytes');
    
    // Quick validation
    console.log('\n🔍 Validating replacements:');
    
    // Check order number replacement
    if (ezpxContent.includes('<Data>38987</Data>')) {
      console.log('❌ Order number 38987 was not replaced');
    } else if (ezpxContent.includes(`<Data>${boxData.orderId}</Data>`)) {
      console.log('✅ Order number replaced correctly');
    }
    
    // Check if EAN13 barcodes were replaced
    const originalBarcodes = ['7290018749210', '7290011585853', '7290011585891'];
    let replacedCount = 0;
    for (let i = 0; i < boxData.items.length && i < 3; i++) {
      if (!ezpxContent.includes(`<Data>${originalBarcodes[i]}</Data>`)) {
        replacedCount++;
      }
    }
    console.log(`✅ Replaced ${replacedCount} of 3 EAN13 barcodes`);
    
    // Check customer name
    if (ezpxContent.includes('Name of the client')) {
      console.log('❌ Customer name placeholder not replaced');
    } else {
      console.log('✅ Customer name replaced');
    }
    
    // Check quantities
    const qtys = ['Q1', 'Q2', 'Q3'];
    let qtyReplaced = 0;
    for (const qty of qtys) {
      if (!ezpxContent.includes(`<Data>${qty}</Data>`)) {
        qtyReplaced++;
      }
    }
    console.log(`✅ Replaced ${qtyReplaced} of 3 quantity placeholders`);
    
    // Check box number
    if (ezpxContent.includes('X / Y')) {
      console.log('❌ Box number placeholder not replaced');
    } else {
      console.log('✅ Box number replaced');
    }
    
    // Check regions
    if (ezpxContent.includes('Region H') || ezpxContent.includes('Region R')) {
      console.log('❌ Some region placeholders not replaced');
    } else {
      console.log('✅ Region placeholders replaced');
    }
    
    console.log('\n✅ Template test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testTemplate();