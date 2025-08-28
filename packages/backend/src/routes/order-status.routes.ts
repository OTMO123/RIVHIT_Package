import { Router, Request, Response } from 'express';
import { OrderStatusService } from '../services/order-status.service';

const router = Router();
const orderStatusService = new OrderStatusService();

/**
 * Get order status
 */
router.get('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const status = await orderStatusService.getOrderStatus(orderId);
    
    if (!status) {
      return res.json({
        success: true,
        data: {
          orderId,
          isPacked: false,
          barcodesPrinted: false,
          invoiceCreated: false,
          exists: false
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        ...status,
        exists: true
      }
    });
  } catch (error) {
    console.error('Error getting order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order status'
    });
  }
});

/**
 * Update packing status
 */
router.put('/:orderId/status/packing', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderNumber, isPacked, packedItems, packedBy } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required'
      });
    }
    
    const status = await orderStatusService.updatePackingStatus(
      orderId,
      orderNumber,
      isPacked,
      packedItems,
      packedBy
    );
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error updating packing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update packing status'
    });
  }
});

/**
 * Update barcode printing status
 */
router.put('/:orderId/status/barcodes', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderNumber, printed } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required'
      });
    }
    
    const status = await orderStatusService.updateBarcodeStatus(
      orderId,
      orderNumber,
      printed
    );
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error updating barcode status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update barcode status'
    });
  }
});

/**
 * Update invoice status
 */
router.put('/:orderId/status/invoice', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderNumber, created, invoiceLink } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required'
      });
    }
    
    const status = await orderStatusService.updateInvoiceStatus(
      orderId,
      orderNumber,
      created,
      invoiceLink
    );
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update invoice status'
    });
  }
});

/**
 * Update general order status (pending/processing/packed/shipped)
 */
router.put('/:orderId/status/general', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderNumber, status } = req.body;
    
    if (!orderNumber || !status) {
      return res.status(400).json({
        success: false,
        error: 'Order number and status are required'
      });
    }
    
    const validStatuses = ['pending', 'packing', 'packed_pending_labels', 'labels_printed', 'completed', 'shipped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const orderStatus = await orderStatusService.updateGeneralStatus(
      orderId,
      orderNumber,
      status
    );
    
    res.json({
      success: true,
      data: orderStatus
    });
  } catch (error) {
    console.error('Error updating general status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update general status'
    });
  }
});

/**
 * Update multiple status fields
 */
router.put('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderNumber, ...updates } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Order number is required'
      });
    }
    
    const status = await orderStatusService.updateOrderStatus(
      orderId,
      orderNumber,
      updates
    );
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

/**
 * Get packing details for an order
 */
router.get('/:orderId/packing-details', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const details = await orderStatusService.getPackingDetails(orderId);
    
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error getting packing details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get packing details'
    });
  }
});

/**
 * Get all order statuses
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const statuses = await orderStatusService.getAllOrderStatuses();
    
    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('Error getting all order statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order statuses'
    });
  }
});

/**
 * Delete order status (for testing/cleanup)
 */
router.delete('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    await orderStatusService.deleteOrderStatus(orderId);
    
    res.json({
      success: true,
      message: 'Order status deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete order status'
    });
  }
});

/**
 * Save draft boxes
 */
router.put('/:orderId/draft-boxes', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { boxes } = req.body;
    
    if (!Array.isArray(boxes)) {
      return res.status(400).json({
        success: false,
        error: 'Boxes must be an array'
      });
    }
    
    await orderStatusService.saveDraftBoxes(orderId, boxes);
    
    res.json({
      success: true,
      message: 'Draft boxes saved successfully'
    });
  } catch (error) {
    console.error('Error saving draft boxes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft boxes'
    });
  }
});

/**
 * Get draft boxes
 */
router.get('/:orderId/draft-boxes', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const boxes = await orderStatusService.getDraftBoxes(orderId);
    
    // Parse the itemsJson field to items for each box
    const parsedBoxes = boxes.map(box => {
      const items = JSON.parse(box.itemsJson || '[]');
      console.log(`📦 Box ${box.boxNumber} items from DB:`, items.map((i: any) => ({
        id: i.itemId,
        qty: i.quantity
      })));
      return {
        ...box,
        items
      };
    });
    
    res.json({
      success: true,
      data: parsedBoxes
    });
  } catch (error) {
    console.error('Error getting draft boxes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draft boxes'
    });
  }
});

/**
 * Save draft packing data
 */
router.put('/:orderId/draft-packing', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { packingData } = req.body;
    
    if (!packingData || typeof packingData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid packing data'
      });
    }
    
    await orderStatusService.saveDraftPackingData(orderId, packingData);
    
    res.json({
      success: true,
      message: 'Draft packing data saved successfully'
    });
  } catch (error) {
    console.error('Error saving draft packing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft packing data'
    });
  }
});

/**
 * Get draft packing data
 */
router.get('/:orderId/draft-packing', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const packingData = await orderStatusService.getDraftPackingData(orderId);
    
    res.json({
      success: true,
      data: packingData
    });
  } catch (error) {
    console.error('Error getting draft packing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draft packing data'
    });
  }
});

/**
 * Clear draft data
 */
router.delete('/:orderId/draft', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    await orderStatusService.clearDraftData(orderId);
    
    res.json({
      success: true,
      message: 'Draft data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing draft data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear draft data'
    });
  }
});

export default router;