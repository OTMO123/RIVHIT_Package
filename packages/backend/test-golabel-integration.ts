#!/usr/bin/env ts-node
/**
 * Test script for GoLabel integration
 * Tests all layers of the new GoLabel architecture
 */

import { GodexPrinterService } from './src/services/golabel/godex-printer.service';
import { GoLabelCliService } from './src/services/golabel/cli/golabel-cli.service';
import { GoLabelSdkService } from './src/services/golabel/sdk/golabel-sdk.service';
import { EzpxGeneratorService } from './src/services/golabel/generators/ezpx-generator.service';
import { LabelData } from './src/services/golabel/types/golabel.types';
import { ConsoleLoggerService } from './src/services/logging/console.logger.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = new ConsoleLoggerService('GoLabelIntegrationTest');

async function testEzpxGenerator() {
  console.log('\n🧪 Testing EZPX Generator...');
  
  const generator = new EzpxGeneratorService(logger);
  
  const testLabel: LabelData = {
    size: { width: 100, height: 50 },
    elements: [
      {
        type: 'text',
        position: { x: 10, y: 10 },
        properties: {
          text: 'GoLabel Integration Test',
          size: 24,
          bold: true
        }
      },
      {
        type: 'text',
        position: { x: 10, y: 20 },
        properties: {
          text: `Timestamp: ${new Date().toISOString()}`,
          size: 12
        }
      },
      {
        type: 'barcode',
        position: { x: 10, y: 30 },
        properties: {
          data: '123456789',
          barcodeType: 'Code128',
          height: 50,
          showText: true
        }
      },
      {
        type: 'rectangle',
        position: { x: 5, y: 5 },
        properties: {
          width: 90,
          height: 40,
          lineWidth: 2
        }
      }
    ],
    variables: [
      {
        name: 'CustomerName',
        defaultValue: 'Test Customer',
        prompt: 'Enter customer name'
      }
    ]
  };
  
  try {
    const ezpx = generator.generate(testLabel);
    console.log('✅ EZPX generated successfully');
    console.log('📄 EZPX length:', ezpx.length, 'characters');
    console.log('📄 First 200 chars:', ezpx.substring(0, 200) + '...');
    return true;
  } catch (error) {
    console.error('❌ EZPX generation failed:', error);
    return false;
  }
}

async function testGoLabelCli() {
  console.log('\n🧪 Testing GoLabel CLI Service...');
  
  const cliService = new GoLabelCliService(logger);
  
  try {
    // Initialize
    const initialized = await cliService.initialize();
    console.log('🔧 Initialization:', initialized ? '✅ Success' : '❌ Failed');
    
    if (!initialized) {
      console.log('⚠️  GoLabel.exe not found. Please install GoLabel II.');
      return false;
    }
    
    // Check availability
    const available = await cliService.isAvailable();
    console.log('🔍 Availability:', available ? '✅ Available' : '❌ Not available');
    
    // Get status
    const status = await cliService.getStatus();
    console.log('📊 Status:', status);
    
    // Test print (preview mode)
    const testLabel: LabelData = {
      size: { width: 80, height: 50 },
      elements: [
        {
          type: 'text',
          position: { x: 10, y: 10 },
          properties: {
            text: 'GoLabel CLI Test',
            size: 20
          }
        }
      ]
    };
    
    console.log('🖨️  Attempting test print (preview mode)...');
    const result = await cliService.print(testLabel);
    console.log('📄 Print result:', result);
    
    return result.success;
  } catch (error) {
    console.error('❌ GoLabel CLI test failed:', error);
    return false;
  } finally {
    await cliService.dispose();
  }
}

async function testGoLabelSdk() {
  console.log('\n🧪 Testing GoLabel SDK Service...');
  
  const sdkService = new GoLabelSdkService(logger);
  
  try {
    // Initialize
    const initialized = await sdkService.initialize();
    console.log('🔧 Initialization:', initialized ? '✅ Success' : '❌ Failed');
    
    if (!initialized) {
      console.log('⚠️  Godex SDK not found. Please install Godex SDK.');
      return false;
    }
    
    // Check availability
    const available = await sdkService.isAvailable();
    console.log('🔍 Availability:', available ? '✅ Available' : '❌ Not available');
    
    // Get status
    const status = await sdkService.getStatus();
    console.log('📊 Status:', status);
    
    // Test connection
    const connected = await sdkService.testConnection();
    console.log('🔌 Connection test:', connected ? '✅ Connected' : '❌ Not connected');
    
    return connected;
  } catch (error) {
    console.error('❌ GoLabel SDK test failed:', error);
    return false;
  } finally {
    await sdkService.dispose();
  }
}

async function testUnifiedService() {
  console.log('\n🧪 Testing Unified Godex Printer Service...');
  
  const printerService = new GodexPrinterService(logger);
  
  try {
    // Initialize
    const initialized = await printerService.initialize();
    console.log('🔧 Initialization:', initialized ? '✅ Success' : '❌ Failed');
    
    // Check availability
    const available = await printerService.isAvailable();
    console.log('🔍 Availability:', available ? '✅ Available' : '❌ Not available');
    
    // Get current method
    const method = printerService.getCurrentMethod();
    console.log('🎯 Current method:', method);
    
    // Get status
    const status = await printerService.getStatus();
    console.log('📊 Status:', status);
    
    // Test connection
    const connected = await printerService.testConnection();
    console.log('🔌 Connection test:', connected ? '✅ Connected' : '❌ Not connected');
    
    // Test print with LabelData
    console.log('\n🖨️  Testing print with LabelData...');
    const testLabel: LabelData = {
      size: { width: 100, height: 50 },
      elements: [
        {
          type: 'text',
          position: { x: 10, y: 10 },
          properties: {
            text: 'Unified Service Test',
            size: 24,
            bold: true
          }
        },
        {
          type: 'text',
          position: { x: 10, y: 20 },
          properties: {
            text: `Method: ${method}`,
            size: 16
          }
        },
        {
          type: 'text',
          position: { x: 10, y: 30 },
          properties: {
            text: new Date().toLocaleString(),
            size: 12
          }
        }
      ]
    };
    
    const printResult = await printerService.print(testLabel);
    console.log('📄 Print result:', printResult);
    
    // Test print with raw EZPL
    console.log('\n🖨️  Testing print with raw EZPL...');
    const ezpl = `^L
A,10,10,0,4,1,1,N,"Raw EZPL Test"
A,10,50,0,2,1,1,N,"${new Date().toLocaleTimeString()}"
B,10,100,0,1,2,100,B,"TEST123"
E`;
    
    const ezplResult = await printerService.print(ezpl);
    console.log('📄 EZPL print result:', ezplResult);
    
    // Test IPrinterService compatibility
    console.log('\n🔧 Testing IPrinterService compatibility...');
    const testPrintResult = await printerService.testPrint();
    console.log('📄 Test print result:', testPrintResult);
    
    return printResult.success || ezplResult.success;
  } catch (error) {
    console.error('❌ Unified service test failed:', error);
    return false;
  } finally {
    await printerService.dispose();
  }
}

async function runAllTests() {
  console.log('🚀 Starting GoLabel Integration Tests...');
  console.log('📋 Environment:', {
    GOLABEL_PATH: process.env.GOLABEL_PATH || 'Not set',
    GODEX_SDK_PATH: process.env.GODEX_SDK_PATH || 'Not set',
    USE_GOLABEL: process.env.USE_GOLABEL || 'Not set',
    PRINTER_TYPE: process.env.PRINTER_TYPE || 'Not set',
    GOLABEL_INTERFACE: process.env.GOLABEL_INTERFACE || 'Not set'
  });
  
  const results = {
    ezpxGenerator: false,
    goLabelCli: false,
    goLabelSdk: false,
    unifiedService: false
  };
  
  // Test each component
  results.ezpxGenerator = await testEzpxGenerator();
  results.goLabelCli = await testGoLabelCli();
  results.goLabelSdk = await testGoLabelSdk();
  results.unifiedService = await testUnifiedService();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('  EZPX Generator:', results.ezpxGenerator ? '✅ PASSED' : '❌ FAILED');
  console.log('  GoLabel CLI:', results.goLabelCli ? '✅ PASSED' : '❌ FAILED');
  console.log('  GoLabel SDK:', results.goLabelSdk ? '✅ PASSED' : '❌ FAILED');
  console.log('  Unified Service:', results.unifiedService ? '✅ PASSED' : '❌ FAILED');
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log('\n🎯 Overall:', allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED');
  
  // Recommendations
  if (!results.goLabelCli) {
    console.log('\n💡 Recommendation: Install GoLabel II from Godex website');
  }
  if (!results.goLabelSdk) {
    console.log('\n💡 Recommendation: Install Godex SDK with EZio32.dll');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('🚨 Fatal error:', error);
  process.exit(1);
});