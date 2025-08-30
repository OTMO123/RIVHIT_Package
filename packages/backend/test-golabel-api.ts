#!/usr/bin/env ts-node

/**
 * Test GoLabel API endpoints to verify file saving locations
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:3001/api';

async function testGoLabelAPI() {
  console.log('🧪 Testing GoLabel API File Locations\n');
  
  // Test data
  const testData = {
    orderId: 'TEST-' + Date.now(),
    boxNumber: 1,
    totalBoxes: 2,
    customerName: 'בדיקה טסט',
    region: 'north1',
    items: [
      {
        itemId: 'ITEM001',
        name: 'Test Product 1',
        nameHebrew: 'מוצר בדיקה 1',
        quantity: 5,
        catalogNumber: '123456',
        barcode: '7290000000001'
      },
      {
        itemId: 'ITEM002',
        name: 'Test Product 2',
        nameHebrew: 'מוצר בדיקה 2',
        quantity: 3,
        catalogNumber: '789012',
        barcode: '7290000000002'
      }
    ]
  };
  
  try {
    // Test 1: Generation endpoint
    console.log('📝 Test 1: Testing generation endpoint (/api/print/box-label/golabel)');
    const genResponse = await axios.post(`${API_BASE}/print/box-label/golabel`, testData);
    
    if (genResponse.data.success) {
      console.log('✅ Generation successful');
      console.log(`   Filename: ${genResponse.data.filename}`);
      console.log(`   Path: ${genResponse.data.filepath}`);
      
      // Check if file exists
      if (fs.existsSync(genResponse.data.filepath)) {
        console.log('✅ File exists at specified location');
        const stats = fs.statSync(genResponse.data.filepath);
        console.log(`   File size: ${stats.size} bytes`);
      } else {
        console.log('❌ File not found at specified location');
      }
    }
    
    console.log('');
    
    // Test 2: Print endpoint
    console.log('📝 Test 2: Testing print endpoint (/api/print/box-label/golabel/print)');
    const printData = {
      ...testData,
      boxes: [
        {
          boxNumber: 1,
          totalBoxes: 2,
          items: testData.items
        },
        {
          boxNumber: 2,
          totalBoxes: 2,
          items: [testData.items[0]]
        }
      ]
    };
    
    const printResponse = await axios.post(`${API_BASE}/print/box-label/golabel/print`, printData);
    
    if (printResponse.data.results) {
      console.log('✅ Print endpoint responded');
      printResponse.data.results.forEach((result: any) => {
        console.log(`\n   Box ${result.boxNumber}:`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Filename: ${result.filename}`);
        console.log(`   Path: ${result.filepath}`);
        
        if (result.filepath && fs.existsSync(result.filepath)) {
          console.log('   ✅ File exists');
        } else {
          console.log('   ❌ File not found');
        }
      });
    }
    
    // Check directories
    console.log('\n📁 Checking directories:');
    
    // Check temp/labels directory
    const tempLabelsDir = path.join(__dirname, 'temp', 'labels');
    console.log(`\n1. Generation directory: ${tempLabelsDir}`);
    if (fs.existsSync(tempLabelsDir)) {
      console.log('   ✅ Directory exists');
      const files = fs.readdirSync(tempLabelsDir).filter(f => f.endsWith('.ezpx'));
      console.log(`   Files: ${files.length} EZPX files`);
      files.slice(-5).forEach(f => console.log(`   - ${f}`));
    } else {
      console.log('   ❌ Directory not found');
    }
    
    // Check system temp directory
    const osTempDir = path.join(require('os').tmpdir(), 'golabel-labels');
    console.log(`\n2. Print directory: ${osTempDir}`);
    if (fs.existsSync(osTempDir)) {
      console.log('   ✅ Directory exists');
      const files = fs.readdirSync(osTempDir).filter(f => f.endsWith('.ezpx'));
      console.log(`   Files: ${files.length} EZPX files`);
      files.slice(-5).forEach(f => console.log(`   - ${f}`));
    } else {
      console.log('   ❌ Directory not found');
    }
    
    // Windows-accessible location check
    const windowsTempDir = '/mnt/c/Temp/golabel-api-test';
    console.log(`\n3. Windows-accessible test: ${windowsTempDir}`);
    try {
      if (!fs.existsSync(windowsTempDir)) {
        fs.mkdirSync(windowsTempDir, { recursive: true });
      }
      
      // Copy a file to Windows location
      if (genResponse.data.filepath && fs.existsSync(genResponse.data.filepath)) {
        const destPath = path.join(windowsTempDir, genResponse.data.filename);
        fs.copyFileSync(genResponse.data.filepath, destPath);
        console.log('   ✅ File copied to Windows location');
        console.log(`   Windows path: C:\\Temp\\golabel-api-test\\${genResponse.data.filename}`);
      }
    } catch (error) {
      console.log('   ❌ Could not create Windows-accessible directory');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('   Response:', error.response?.data);
    }
  }
  
  console.log('\n✅ Test completed!');
}

// Check if server is running
axios.get(`${API_BASE}/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    testGoLabelAPI();
  })
  .catch(() => {
    console.log('❌ Server is not running');
    console.log('   Start the backend server first: npm run dev:backend');
  });