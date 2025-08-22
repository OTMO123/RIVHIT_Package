// Integration test for RivhitService with real API
import { RivhitService } from './services/rivhit.service';
import { MemoryCacheService } from './services/cache/memory.cache.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

interface TestResults {
  itemsTest: boolean;
  customersTest: boolean;
  documentsTest: boolean;
  totalApiCalls: number;
  errors: string[];
}

async function testRivhitIntegration(): Promise<TestResults> {
  console.log('🧪 Testing RIVHIT Service Integration');
  console.log('=====================================\n');

  const results: TestResults = {
    itemsTest: false,
    customersTest: false,
    documentsTest: false,
    totalApiCalls: 0,
    errors: []
  };

  // Check API token
  const apiToken = process.env.RIVHIT_API_TOKEN;
  if (!apiToken) {
    results.errors.push('No API token found in environment variables');
    console.error('❌ No API token found');
    return results;
  }

  console.log(`🔑 API Token loaded: ${apiToken.substring(0, 10)}...`);

  // Initialize services
  const cacheService = new MemoryCacheService();
  const rivhitService = new RivhitService({
    baseUrl: 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
    apiToken: apiToken,
    timeout: 15000,
    retryAttempts: 2,
    testMode: true
  }, cacheService);

  // Test 1: Get Items
  console.log('1️⃣ Testing Items API...');
  try {
    const items = await rivhitService.getItems({ 
      api_token: process.env.RIVHIT_API_TOKEN || '',
      limit: 3 
    });
    results.totalApiCalls++;
    
    if (items && items.length > 0) {
      results.itemsTest = true;
      console.log(`✅ Items API works! Retrieved ${items.length} items`);
      
      // Show sample item
      const sample = items[0];
      console.log(`📋 Sample item:`);
      console.log(`   ID: ${sample.item_id}`);
      console.log(`   Name: ${sample.item_name}`);
      console.log(`   Quantity: ${sample.quantity}`);
      console.log(`   Price: ${sample.sale_nis} NIS`);
      console.log(`   Available: ${sample.quantity > 0 ? 'Yes' : 'No'}`);
    } else {
      results.errors.push('Items API returned empty result');
      console.log('⚠️ Items API returned empty result');
    }
  } catch (error: any) {
    results.errors.push(`Items API error: ${error.message}`);
    console.error('❌ Items API failed:', error.message);
  }

  console.log('');

  // Test 2: Get Customers  
  console.log('2️⃣ Testing Customers API...');
  try {
    const customers = await rivhitService.getCustomers({ 
      api_token: process.env.RIVHIT_API_TOKEN || '',
      limit: 2 
    });
    results.totalApiCalls++;
    
    if (customers && customers.length > 0) {
      results.customersTest = true;
      console.log(`✅ Customers API works! Retrieved ${customers.length} customers`);
      
      // Show sample customer
      const sample = customers[0];
      console.log(`📋 Sample customer:`);
      console.log(`   ID: ${sample.customer_id}`);
      console.log(`   Name: ${sample.first_name} ${sample.last_name}`);
      console.log(`   City: ${sample.city}`);
    } else {
      results.errors.push('Customers API returned empty result');
      console.log('⚠️ Customers API returned empty result');
    }
  } catch (error: any) {
    results.errors.push(`Customers API error: ${error.message}`);
    console.error('❌ Customers API failed:', error.message);
  }

  console.log('');

  // Test 3: Get Documents
  console.log('3️⃣ Testing Documents API...');
  try {
    const documents = await rivhitService.getDocuments({ 
      api_token: process.env.RIVHIT_API_TOKEN || '',
      limit: 2 
    });
    results.totalApiCalls++;
    
    if (documents && documents.length > 0) {
      results.documentsTest = true;
      console.log(`✅ Documents API works! Retrieved ${documents.length} documents`);
    } else {
      results.errors.push('Documents API returned empty result');
      console.log('⚠️ Documents API returned empty result');
    }
  } catch (error: any) {
    results.errors.push(`Documents API error: ${error.message}`);
    console.error('❌ Documents API failed:', error.message);
  }

  return results;
}

// Test data converter integration
async function testDataConverter(): Promise<void> {
  console.log('\n4️⃣ Testing Data Converter...');
  
  try {
    // Import converter utilities
    const { RivhitConverter } = await import('@packing/shared');
    
    // Mock item data based on real API structure
    const mockItem = {
      item_id: 123,
      item_name: "Test Item",
      item_extended_description: "Test description",
      item_part_num: "TEST-001",
      barcode: "1234567890",
      item_group_id: 1,
      storage_id: 1,
      quantity: 10,
      cost_nis: 50.0,
      sale_nis: 75.0,
      currency_id: 1,
      cost_mtc: 50.0,
      sale_mtc: 75.0,
      picture_link: null,
      exempt_vat: false,
      avitem: 0,
      location: "A1-B2",
      is_serial: 0,
      sapak: 0,
      item_name_en: "Test Item EN",
      item_order: 1
    };

    // Test conversion
    const appItem = RivhitConverter.toAppItem(mockItem);
    const packingItem = RivhitConverter.toPackingItem(mockItem);
    
    console.log('✅ Data converter works!');
    console.log(`   AppItem ID: ${appItem.id}`);
    console.log(`   PackingItem available: ${packingItem.isAvailable}`);
    
  } catch (error: any) {
    console.error('❌ Data converter failed:', error.message);
  }
}

// Main execution
async function main() {
  try {
    const results = await testRivhitIntegration();
    await testDataConverter();
    
    console.log('\n===============================================');
    console.log('📊 FINAL RESULTS');
    console.log('===============================================');
    console.log(`Total API calls: ${results.totalApiCalls}`);
    console.log(`Items API: ${results.itemsTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Customers API: ${results.customersTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Documents API: ${results.documentsTest ? '✅ PASS' : '❌ FAIL'}`);
    
    const passedTests = [results.itemsTest, results.customersTest, results.documentsTest].filter(Boolean).length;
    const totalTests = 3;
    
    console.log(`\n🎯 Score: ${passedTests}/${totalTests} tests passed`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! RivhitService is ready for production.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the errors above.');
    }
    
  } catch (error: any) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main();
}

export { testRivhitIntegration };