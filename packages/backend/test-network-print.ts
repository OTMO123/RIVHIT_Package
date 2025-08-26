import { PrinterService } from './src/services/printer.service';
import { PackingItem } from '@packing/shared';
import * as path from 'path';

async function testNetworkPrint() {
  console.log('🚀 Starting network printer test...');
  console.log('=' .repeat(50));
  
  // Создаем экземпляр сервиса принтера
  const printerService = new PrinterService(
    path.join(__dirname, 'printer-templates')
  );

  try {
    // Инициализируем принтер с сетевыми настройками
    console.log('\n📡 Initializing network printer connection...');
    const initialized = await printerService.initialize({
      connectionType: 'ethernet',
      port: '192.168.14.200' // IP адрес принтера из конфига
    });

    if (!initialized) {
      throw new Error('Failed to initialize printer');
    }

    console.log('✅ Printer initialized successfully!\n');

    // Проверяем статус принтера
    console.log('📊 Checking printer status...');
    const status = await printerService.getStatus();
    console.log('Printer Status:', {
      connected: status.connected,
      model: status.model,
      isReady: status.isReady,
      paperLevel: status.paperLevel + '%',
      ribbonLevel: status.ribbonLevel + '%'
    });

    if (!status.isReady) {
      throw new Error('Printer is not ready: ' + status.lastError);
    }

    console.log('\n🏷️ Preparing test label...');
    
    // Создаем тестовый товар для печати
    const testItem: PackingItem = {
      item_id: 1001,
      item_name: 'Пельмени тестовые',
      item_part_num: 'TEST-NET-001',
      item_extended_description: 'Тестовая этикетка для сетевой печати',
      quantity: 1,
      cost_nis: 25.00,
      sale_nis: 35.00,
      currency_id: 1,
      cost_mtc: 25.00,
      sale_mtc: 35.00,
      picture_link: null,
      exempt_vat: false,
      avitem: 0,
      storage_id: 1,
      item_group_id: 1,
      location: 'A-01',
      is_serial: 0,
      sapak: 0,
      item_name_en: 'Test Pelmeni Network',
      item_order: 1,
      barcode: '7290011580001',
      line_id: 'test_network_print',
      isPacked: true,
      isAvailable: true,
      packedQuantity: 1
    };

    console.log('Item details:');
    console.log(`  Name: ${testItem.item_name}`);
    console.log(`  Barcode: ${testItem.barcode}`);
    console.log(`  Location: ${testItem.location}`);
    console.log(`  Price: ₪${testItem.sale_nis}`);

    // Печатаем этикетку
    console.log('\n🖨️ Sending label to network printer...');
    const result = await printerService.printSingleLabel(testItem, {
      copies: 1,
      labelSize: 'medium',
      includeBarcodes: true,
      includeText: true,
      includeQuantity: true,
      includePrices: true
    });

    if (result.success) {
      console.log('\n✅ SUCCESS! Label printed successfully!');
      console.log('Print job details:');
      console.log(`  Job ID: ${result.jobId}`);
      console.log(`  Printed items: ${result.printedItems}`);
      console.log(`  Estimated time: ${result.estimatedTime}s`);
      
      if (result.ezplCommands && result.ezplCommands.length > 0) {
        console.log(`\n📜 EZPL Commands sent (first 200 chars):`)
        console.log(result.ezplCommands[0].substring(0, 200) + '...');
      }
    } else {
      console.error('\n❌ FAILED! Print job failed:');
      console.error(`  Error: ${result.error}`);
    }

    // Отключаемся от принтера
    console.log('\n🔌 Disconnecting from printer...');
    await printerService.disconnect();
    console.log('✅ Disconnected successfully');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    
    // Пробуем отключиться даже при ошибке
    try {
      await printerService.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect:', disconnectError);
    }
    
    process.exit(1);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎉 Network printer test completed successfully!');
}

// Запускаем тест
testNetworkPrint().then(() => {
  console.log('\n👋 Test finished');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});