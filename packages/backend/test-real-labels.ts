import { ZPLPrinterService } from './src/services/zpl-printer.service';
import { PackingItem } from '@packing/shared';

async function testRealLabels() {
  console.log('🚀 Тестируем печать реальных этикеток товаров...');
  console.log('=' .repeat(50));
  
  const printerService = new ZPLPrinterService();

  try {
    // Инициализация принтера
    console.log('\n📡 Подключаемся к принтеру GoDEX...');
    const initialized = await printerService.initialize();

    if (!initialized) {
      throw new Error('Не удалось инициализировать принтер');
    }

    console.log('✅ Принтер подключен!\n');

    // Создаем тестовые товары для печати
    const items: PackingItem[] = [
      {
        item_id: 101,
        item_name: 'Пельмени Сибирские',
        item_name_en: 'Siberian Pelmeni',
        item_part_num: 'PEL-001',
        barcode: '7290011580101',
        quantity: 2,
        packedQuantity: 2,
        location: 'A-12',
        sale_nis: 45.90,
        cost_nis: 30.00,
        isPacked: true,
        isAvailable: true,
        // остальные поля
        item_extended_description: '',
        currency_id: 1,
        cost_mtc: 30.00,
        sale_mtc: 45.90,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        storage_id: 1,
        item_group_id: 1,
        is_serial: 0,
        sapak: 0,
        item_order: 1,
        line_id: 'line_1'
      },
      {
        item_id: 102,
        item_name: 'Вареники с картошкой',
        item_name_en: 'Potato Vareniki',
        item_part_num: 'VAR-002',
        barcode: '7290011580102',
        quantity: 3,
        packedQuantity: 3,
        location: 'B-05',
        sale_nis: 38.50,
        cost_nis: 25.00,
        isPacked: true,
        isAvailable: true,
        // остальные поля
        item_extended_description: '',
        currency_id: 1,
        cost_mtc: 25.00,
        sale_mtc: 38.50,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        storage_id: 1,
        item_group_id: 1,
        is_serial: 0,
        sapak: 0,
        item_order: 2,
        line_id: 'line_2'
      },
      {
        item_id: 103,
        item_name: 'Блины с мясом',
        item_name_en: 'Meat Blini',
        item_part_num: 'BLI-003',
        barcode: '7290011580103',
        quantity: 1,
        packedQuantity: 1,
        location: 'C-18',
        sale_nis: 52.00,
        cost_nis: 35.00,
        isPacked: true,
        isAvailable: true,
        // остальные поля
        item_extended_description: '',
        currency_id: 1,
        cost_mtc: 35.00,
        sale_mtc: 52.00,
        picture_link: null,
        exempt_vat: false,
        avitem: 0,
        storage_id: 1,
        item_group_id: 1,
        is_serial: 0,
        sapak: 0,
        item_order: 3,
        line_id: 'line_3'
      }
    ];

    console.log('📦 Товары для печати:');
    items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.item_name}`);
      console.log(`     Количество: ${item.packedQuantity}`);
      console.log(`     Штрих-код: ${item.barcode}`);
      console.log(`     Локация: ${item.location}`);
      console.log(`     Цена: ₪${item.sale_nis}`);
      console.log('');
    });

    // Печатаем этикетки
    console.log('🖨️ Отправляем этикетки на печать...\n');
    
    const result = await printerService.printLabels(items, {
      copies: 1,
      includeBarcodes: true,
      includeText: true,
      includeQuantity: true,
      includePrices: true
    });

    if (result.success) {
      console.log('\n✅ УСПЕХ! Все этикетки отправлены на печать!');
      console.log(`📊 Напечатано этикеток: ${result.printedItems}`);
      console.log(`🆔 ID задания: ${result.jobId}`);
      console.log('\n🏷️ Проверьте принтер - должны напечататься 3 этикетки товаров!');
    } else {
      console.error('\n❌ Ошибка печати:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Тест завершился с ошибкой:');
    console.error(error);
    process.exit(1);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✨ Тест завершен!');
}

// Запуск теста
testRealLabels().then(() => {
  console.log('\n👋 Готово!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Непредвиденная ошибка:', error);
  process.exit(1);
});