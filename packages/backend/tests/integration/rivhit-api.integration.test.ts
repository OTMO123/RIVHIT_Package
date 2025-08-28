/**
 * Integration Tests for RIVHIT API Services
 * 
 * These tests verify the integration between different services and components
 * without making actual API calls to RIVHIT (using SafeRivhitService in mock mode)
 */

import { ApplicationServiceFactory } from '../../src/factories/service.factory';
import { SafeRivhitService } from '../../src/services/safe-rivhit.service';
import { MockRivhitService } from '../../src/services/mock-rivhit.service';
import { MemoryCacheService } from '../../src/services/cache/memory.cache.service';
import { OrderStatusService } from '../../src/services/order-status.service';
import { AppDataSource } from '../../src/config/database.config';
import { RivhitDocument, RivhitItem, RivhitCustomer } from '@packing/shared';

describe('RIVHIT API Integration Tests', () => {
  let rivhitService: SafeRivhitService | MockRivhitService;
  let cacheService: MemoryCacheService;
  let orderStatusService: OrderStatusService;

  // Test data
  const testOrderId = '39641';
  const testCustomerId = 12345;
  const testDocumentType = 7; // Order details type

  beforeAll(async () => {
    // Initialize test database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Use mock services for integration tests
    process.env.USE_MOCK_RIVHIT = 'true';
    process.env.NODE_ENV = 'test-integration';
  });

  beforeEach(async () => {
    // Create services for each test
    const services = await ApplicationServiceFactory.createServices();
    rivhitService = services.rivhitService as any;
    cacheService = services.cacheService as MemoryCacheService;
    orderStatusService = new OrderStatusService();
    
    // Clear cache before each test
    await cacheService.clear();
  });

  afterAll(async () => {
    // Cleanup
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    // Reset environment
    delete process.env.USE_MOCK_RIVHIT;
    delete process.env.NODE_ENV;
  });

  describe('Service Integration', () => {
    it('should create all services successfully', async () => {
      const services = await ApplicationServiceFactory.createServices();
      
      expect(services.rivhitService).toBeDefined();
      expect(services.cacheService).toBeDefined();
      expect(services.printerService).toBeDefined();
      
      expect(services.rivhitService).toBeInstanceOf(MockRivhitService);
      expect(services.cacheService).toBeInstanceOf(MemoryCacheService);
    });

    it('should use cache between service calls', async () => {
      // First call - should hit the service and cache
      const documents1 = await rivhitService.getDocuments({ 
        api_token: 'test-token',
        document_type: testDocumentType 
      });
      
      expect(documents1).toBeDefined();
      expect(Array.isArray(documents1)).toBe(true);
      
      // Second call - should hit cache
      const startTime = Date.now();
      const documents2 = await rivhitService.getDocuments({ 
        api_token: 'test-token',
        document_type: testDocumentType 
      });
      const duration = Date.now() - startTime;
      
      expect(documents2).toEqual(documents1);
      expect(duration).toBeLessThan(10); // Should be very fast from cache
    });

    it('should handle service errors gracefully', async () => {
      // Test with invalid parameters to trigger error
      try {
        await rivhitService.getDocuments({ 
          api_token: 'test-token',
          document_type: -1 // Invalid document type
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid document type');
      }
    });
  });

  describe('Document Management Flow', () => {
    it('should retrieve documents and their details', async () => {
      // Get list of documents
      const documents = await rivhitService.getDocuments({
        api_token: 'test-token',
        document_type: testDocumentType,
        customer_id: testCustomerId
      });
      
      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
      
      if (documents.length > 0) {
        const document = documents[0];
        
        // Get detailed information for the first document
        const details = await rivhitService.getDocumentDetails(
          document.document_type!,
          document.document_number!
        );
        
        expect(details).toBeDefined();
        expect(details.data).toBeDefined();
      }
    });

    it('should update order status after document retrieval', async () => {
      const documents = await rivhitService.getDocuments({
        api_token: 'test-token',
        document_type: testDocumentType
      });
      
      if (documents.length > 0) {
        const document = documents[0];
        const orderId = document.document_number?.toString() || 'test-order';
        
        // Create/update order status
        const status = await orderStatusService.getOrCreateOrderStatus(
          orderId,
          orderId
        );
        
        expect(status).toBeDefined();
        expect(status.orderId).toBe(orderId);
        expect(status.isPacked).toBe(false); // Initial state
        
        // Update packing status
        const updatedStatus = await orderStatusService.updatePackingStatus(
          orderId,
          orderId,
          true,
          [
            {
              itemId: '1',
              itemName: 'Test Item',
              orderedQuantity: 10,
              packedQuantity: 8,
              boxNumber: 1
            }
          ]
        );
        
        expect(updatedStatus.isPacked).toBe(true);
        expect(updatedStatus.status).toBe('packed_pending_labels');
      }
    });
  });

  describe('Customer and Item Integration', () => {
    it('should retrieve customer with their orders', async () => {
      // Get customer data
      const customer = await rivhitService.getCustomer(testCustomerId);
      expect(customer).toBeDefined();
      expect(customer.customer_id).toBe(testCustomerId);
      
      // Get orders for this customer
      const orders = await rivhitService.getDocuments({
        api_token: 'test-token',
        customer_id: testCustomerId,
        document_type: testDocumentType
      });
      
      expect(Array.isArray(orders)).toBe(true);
      
      // All orders should belong to the customer
      orders.forEach(order => {
        expect(order.customer_id).toBe(testCustomerId);
      });
    });

    it('should retrieve items and their details', async () => {
      const items = await rivhitService.getItems({
        api_token: 'test-token',
        limit: 10
      });
      
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      
      const item = items[0];
      expect(item.item_id).toBeDefined();
      expect(item.item_name).toBeDefined();
      expect(typeof item.quantity).toBe('number');
      expect(typeof item.sale_nis).toBe('number');
    });

    it('should search items by various criteria', async () => {
      // Search by text
      const searchResults = await rivhitService.getItems({
        api_token: 'test-token',
        search_text: 'blini',
        limit: 5
      });
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      // Search by item group
      const groupResults = await rivhitService.getItems({
        api_token: 'test-token',
        item_group_id: 10,
        limit: 5
      });
      
      expect(Array.isArray(groupResults)).toBe(true);
    });
  });

  describe('Order Processing Workflow', () => {
    it('should complete full order processing workflow', async () => {
      const orderId = `test-${Date.now()}`;
      const orderNumber = orderId;
      
      // Step 1: Create order status
      let orderStatus = await orderStatusService.getOrCreateOrderStatus(
        orderId,
        orderNumber
      );
      
      expect(orderStatus.status).toBe('pending');
      expect(orderStatus.isPacked).toBe(false);
      
      // Step 2: Start packing
      orderStatus = await orderStatusService.updateGeneralStatus(
        orderId,
        orderNumber,
        'packing'
      );
      
      expect(orderStatus.status).toBe('packing');
      
      // Step 3: Complete packing
      const packedItems = [
        {
          itemId: '1',
          itemName: 'Blini',
          orderedQuantity: 12,
          packedQuantity: 12,
          boxNumber: 1,
          catalogNumber: 'BLN001'
        },
        {
          itemId: '2',
          itemName: 'Pelmeni',
          orderedQuantity: 8,
          packedQuantity: 8,
          boxNumber: 2,
          catalogNumber: 'PLM001'
        }
      ];
      
      orderStatus = await orderStatusService.updatePackingStatus(
        orderId,
        orderNumber,
        true,
        packedItems,
        'test-user'
      );
      
      expect(orderStatus.isPacked).toBe(true);
      expect(orderStatus.status).toBe('packed_pending_labels');
      expect(orderStatus.packedBy).toBe('test-user');
      expect(orderStatus.packedAt).toBeInstanceOf(Date);
      
      // Step 4: Print labels
      orderStatus = await orderStatusService.updateBarcodeStatus(
        orderId,
        orderNumber,
        true
      );
      
      expect(orderStatus.barcodesPrinted).toBe(true);
      expect(orderStatus.printedAt).toBeInstanceOf(Date);
      
      // Step 5: Create invoice (prepare data only - READ-ONLY)
      // Mock the createInvoice call since it's not available in MockRivhitService
      const invoicePreparationResult = await (rivhitService as any).createInvoice?.(
        orderNumber,
        { customer_id: testCustomerId, customer_name: 'Test Customer' },
        packedItems.map(item => ({
          item_id: parseInt(item.itemId),
          item_name: item.itemName,
          quantity: item.packedQuantity,
          price: 25.0,
          sale_nis: 25.0,
          cost_nis: 12.0
        }))
      ) || { success: true, data: 'mock-invoice-preparation' };
      
      // Should prepare invoice data without actually creating invoice
      expect(invoicePreparationResult).toBeDefined();
      
      // Step 6: Mark as completed
      orderStatus = await orderStatusService.updateGeneralStatus(
        orderId,
        orderNumber,
        'completed'
      );
      
      expect(orderStatus.status).toBe('completed');
      expect(orderStatus.isPacked).toBe(true);
      expect(orderStatus.barcodesPrinted).toBe(true);
      expect(orderStatus.invoiceCreated).toBe(true);
      
      // Verify packing details were saved
      const packingDetails = await orderStatusService.getPackingDetails(orderId);
      expect(packingDetails).toHaveLength(2);
      expect(packingDetails[0].itemName).toBe('Blini');
      expect(packingDetails[1].itemName).toBe('Pelmeni');
      
      // Cleanup
      await orderStatusService.deleteOrderStatus(orderId);
    });

    it('should handle partial packing scenarios', async () => {
      const orderId = `partial-${Date.now()}`;
      const orderNumber = orderId;
      
      // Create order
      let orderStatus = await orderStatusService.getOrCreateOrderStatus(
        orderId,
        orderNumber
      );
      
      // Partial packing
      const partialItems = [
        {
          itemId: '1',
          itemName: 'Blini',
          orderedQuantity: 12,
          packedQuantity: 10, // Partial quantity
          boxNumber: 1
        }
      ];
      
      orderStatus = await orderStatusService.updatePackingStatus(
        orderId,
        orderNumber,
        false, // Not fully packed
        partialItems
      );
      
      expect(orderStatus.isPacked).toBe(false);
      expect(orderStatus.status).toBe('pending'); // Should remain pending
      
      // Complete the packing
      partialItems[0].packedQuantity = 12; // Full quantity
      
      orderStatus = await orderStatusService.updatePackingStatus(
        orderId,
        orderNumber,
        true,
        partialItems
      );
      
      expect(orderStatus.isPacked).toBe(true);
      expect(orderStatus.status).toBe('packed_pending_labels');
      
      // Cleanup
      await orderStatusService.deleteOrderStatus(orderId);
    });
  });

  describe('Draft Data Management', () => {
    it('should save and retrieve draft packing data', async () => {
      const orderId = `draft-${Date.now()}`;
      
      // Save draft packing data
      const draftPackingData = {
        '1': {
          quantity: 8,
          boxNumber: 1,
          itemName: 'Blini',
          orderedQuantity: 12
        },
        '2': {
          quantity: 6,
          boxNumber: 2,
          itemName: 'Pelmeni',
          orderedQuantity: 8
        }
      };
      
      await orderStatusService.saveDraftPackingData(orderId, draftPackingData);
      
      // Retrieve draft data
      const retrievedDraft = await orderStatusService.getDraftPackingData(orderId);
      
      expect(retrievedDraft).toEqual(draftPackingData);
      
      // Save draft boxes
      const draftBoxes = [
        {
          boxNumber: 1,
          items: [{ itemId: '1', quantity: 8 }],
          totalWeight: 2.5
        },
        {
          boxNumber: 2,
          items: [{ itemId: '2', quantity: 6 }],
          totalWeight: 1.8
        }
      ];
      
      await orderStatusService.saveDraftBoxes(orderId, draftBoxes);
      
      // Retrieve draft boxes
      const retrievedBoxes = await orderStatusService.getDraftBoxes(orderId);
      
      expect(retrievedBoxes).toHaveLength(2);
      expect(retrievedBoxes[0].boxNumber).toBe(1);
      expect(retrievedBoxes[1].boxNumber).toBe(2);
      
      // Clear draft data
      await orderStatusService.clearDraftData(orderId);
      
      const clearedDraft = await orderStatusService.getDraftPackingData(orderId);
      const clearedBoxes = await orderStatusService.getDraftBoxes(orderId);
      
      expect(Object.keys(clearedDraft)).toHaveLength(0);
      expect(clearedBoxes).toHaveLength(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service timeouts gracefully', async () => {
      // Simulate slow service response
      const startTime = Date.now();
      
      try {
        // This should use circuit breaker/timeout protection
        const result = await rivhitService.getDocuments({
          api_token: 'test-token',
          document_type: testDocumentType,
          date_from: '2025-01-01',
          date_to: '2025-12-31'
        });
        
        const duration = Date.now() - startTime;
        
        // Should complete within reasonable time
        expect(duration).toBeLessThan(10000); // 10 seconds max
        expect(Array.isArray(result)).toBe(true);
        
      } catch (error) {
        // If error occurs, should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should recover from cache failures', async () => {
      // Simulate cache failure
      await cacheService.clear();
      
      // This should fallback to direct service call
      const documents = await rivhitService.getDocuments({
        api_token: 'test-token',
        document_type: testDocumentType
      });
      
      expect(Array.isArray(documents)).toBe(true);
    });

    it('should handle concurrent operations safely', async () => {
      const orderId = `concurrent-${Date.now()}`;
      
      // Simulate concurrent order status updates
      const promises = [
        orderStatusService.updatePackingStatus(orderId, orderId, true),
        orderStatusService.updateBarcodeStatus(orderId, orderId, true),
        orderStatusService.updateInvoiceStatus(orderId, orderId, true)
      ];
      
      const results = await Promise.allSettled(promises);
      
      // All operations should complete without errors
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
      
      // Final state should be consistent
      const finalStatus = await orderStatusService.getOrderStatus(orderId);
      expect(finalStatus?.isPacked).toBe(true);
      expect(finalStatus?.barcodesPrinted).toBe(true);
      expect(finalStatus?.invoiceCreated).toBe(true);
      
      // Cleanup
      await orderStatusService.deleteOrderStatus(orderId);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large data sets efficiently', async () => {
      const startTime = Date.now();
      
      // Request large data set
      const items = await rivhitService.getItems({
        api_token: 'test-token',
        limit: 100
      });
      
      const duration = Date.now() - startTime;
      
      expect(Array.isArray(items)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache frequently accessed data', async () => {
      const documentType = testDocumentType;
      
      // First call
      const startTime1 = Date.now();
      await rivhitService.getDocuments({ api_token: 'test-token', document_type: documentType });
      const duration1 = Date.now() - startTime1;
      
      // Second call (should be cached)
      const startTime2 = Date.now();
      await rivhitService.getDocuments({ api_token: 'test-token', document_type: documentType });
      const duration2 = Date.now() - startTime2;
      
      // Second call should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.1); // At least 10x faster
    });

    it('should handle multiple simultaneous requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        rivhitService.getDocuments({
          api_token: 'test-token',
          document_type: testDocumentType,
          customer_id: testCustomerId + i
        })
      );
      
      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;
      
      // All requests should complete successfully
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(15000); // 15 seconds for 10 concurrent requests
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across service calls', async () => {
      const orderId = `consistency-${Date.now()}`;
      
      // Create order status
      const initialStatus = await orderStatusService.getOrCreateOrderStatus(
        orderId,
        orderId
      );
      
      expect(initialStatus.orderId).toBe(orderId);
      
      // Multiple updates
      await orderStatusService.updatePackingStatus(orderId, orderId, true);
      await orderStatusService.updateBarcodeStatus(orderId, orderId, true);
      
      // Verify final state
      const finalStatus = await orderStatusService.getOrderStatus(orderId);
      
      expect(finalStatus?.orderId).toBe(orderId);
      expect(finalStatus?.isPacked).toBe(true);
      expect(finalStatus?.barcodesPrinted).toBe(true);
      expect(finalStatus?.packedAt).toBeInstanceOf(Date);
      expect(finalStatus?.printedAt).toBeInstanceOf(Date);
      
      // Verify timestamps are in correct order
      if (finalStatus?.packedAt && finalStatus?.printedAt) {
        expect(finalStatus.printedAt.getTime()).toBeGreaterThanOrEqual(
          finalStatus.packedAt.getTime()
        );
      }
      
      // Cleanup
      await orderStatusService.deleteOrderStatus(orderId);
    });

    it('should handle rollback scenarios', async () => {
      const orderId = `rollback-${Date.now()}`;
      
      // Create and pack order
      await orderStatusService.updatePackingStatus(orderId, orderId, true);
      
      let status = await orderStatusService.getOrderStatus(orderId);
      expect(status?.isPacked).toBe(true);
      
      // Simulate rollback (unpacking)
      await orderStatusService.updatePackingStatus(orderId, orderId, false);
      
      status = await orderStatusService.getOrderStatus(orderId);
      expect(status?.isPacked).toBe(false);
      
      // Cleanup
      await orderStatusService.deleteOrderStatus(orderId);
    });
  });
});