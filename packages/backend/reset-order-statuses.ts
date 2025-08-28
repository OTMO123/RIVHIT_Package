import { AppDataSource } from './src/config/database.config';
import { OrderStatus } from './src/entities/OrderStatus';

async function resetOrderStatuses() {
  try {
    // Initialize database
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const orderStatusRepo = AppDataSource.getRepository(OrderStatus);
    
    // Find order 39721 that incorrectly shows as packed
    const order39721 = await orderStatusRepo.findOne({
      where: { orderId: '39721' }
    });
    
    if (order39721) {
      console.log(`Found order 39721 with status: ${order39721.status}`);
      
      // Reset to pending since it was incorrectly marked
      order39721.status = 'pending';
      order39721.isPacked = false;
      order39721.barcodesPrinted = false;
      order39721.invoiceCreated = false;
      order39721.packedAt = undefined;
      order39721.printedAt = undefined;
      order39721.invoiceCreatedAt = undefined;
      
      await orderStatusRepo.save(order39721);
      console.log('✅ Reset order 39721 to pending status');
    }
    
    // Also check any orders with old "processing" status and convert to new system
    const processingOrders = await orderStatusRepo.find();
    
    for (const order of processingOrders) {
      let needsUpdate = false;
      
      // Convert old statuses to new ones
      if ((order.status as any) === 'processing') {
        order.status = 'packing';
        needsUpdate = true;
      } else if ((order.status as any) === 'packed') {
        // If marked as packed in old system, set to packed_pending_labels
        order.status = 'packed_pending_labels';
        needsUpdate = true;
      }
      
      // Fix any status that's not in the valid list
      const validStatuses = ['pending', 'packing', 'packed_pending_labels', 'labels_printed', 'completed', 'shipped'];
      if (!validStatuses.includes(order.status)) {
        console.log(`Invalid status found for order ${order.orderId}: ${order.status}`);
        order.status = 'pending';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await orderStatusRepo.save(order);
        console.log(`✅ Updated order ${order.orderId} status to ${order.status}`);
      }
    }
    
    console.log('✅ All order statuses have been checked and fixed');
    
    // Close database connection
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting statuses:', error);
    process.exit(1);
  }
}

resetOrderStatuses();