import { Router, Request, Response } from 'express';
import { InvoiceCreatorService } from '../services/invoice-creator.service';

const router = Router();

/**
 * Create invoice from order
 * POST /api/invoices/create-from-order
 */
router.post('/create-from-order', async (req: Request, res: Response) => {
  console.log('🟢 [ROUTE] Invoice creation request received');
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { orderNumber, items, customer_id } = req.body;

    console.log('📝 [ROUTE] Extracted params:', {
      orderNumber,
      items_count: items?.length,
      customer_id: customer_id
    });

    if (!orderNumber) {
      console.error('❌ [ROUTE] Missing order number');
      return res.status(400).json({
        error: 'Order number is required'
      });
    }

    // Get API credentials from environment
    const apiUrl = process.env.RIVHIT_API_URL || 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc';
    const apiToken = process.env.RIVHIT_API_TOKEN;

    console.log('🔧 [ROUTE] Configuration:', {
      api_url: apiUrl,
      has_token: !!apiToken,
      token_length: apiToken?.length
    });

    if (!apiToken) {
      console.error('❌ [ROUTE] No API token configured');
      return res.status(500).json({
        error: 'RIVHIT API token not configured. Set RIVHIT_API_TOKEN in .env file'
      });
    }

    // Check if write operations are allowed
    const allowWrites = process.env.ALLOW_RIVHIT_WRITES === 'true';
    console.log('🔐 [ROUTE] Write permission:', allowWrites);
    
    if (!allowWrites) {
      console.warn('⚠️ [ROUTE] Write operations disabled, returning prepared data');
      return res.status(200).json({
        success: false,
        message: 'Invoice data prepared but not sent (writes disabled)',
        preparedData: {
          message: 'Invoice data prepared but not sent to RIVHIT',
          orderNumber,
          items,
          customer_id
        },
        instruction: 'Set ALLOW_RIVHIT_WRITES=true in .env to enable actual invoice creation'
      });
    }
    
    // Create invoice
    console.log('🚀 [ROUTE] Creating invoice service and calling createInvoiceFromOrder');
    console.log('👤 [ROUTE] Customer ID:', customer_id);
    const invoiceService = new InvoiceCreatorService(apiUrl, apiToken);
    const invoice = await invoiceService.createInvoiceFromOrder(orderNumber, items, customer_id);

    console.log('✅ [ROUTE] Invoice created successfully');
    res.json({
      success: true,
      message: `Invoice created successfully for order ${orderNumber}`,
      invoice
    });

  } catch (error: any) {
    console.error('❌ [ROUTE ERROR] Failed to create invoice:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      error: error.message || 'Failed to create invoice',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Create invoice for specific order 039636
 * POST /api/invoices/create-039636
 */
router.post('/create-039636', async (req: Request, res: Response) => {
  try {
    const apiUrl = process.env.RIVHIT_API_URL || 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc';
    const apiToken = process.env.RIVHIT_API_TOKEN;

    if (!apiToken) {
      return res.status(500).json({
        error: 'RIVHIT API token not configured'
      });
    }

    const allowWrites = process.env.ALLOW_RIVHIT_WRITES === 'true';
    
    if (!allowWrites) {
      // Return prepared data without actually creating
      return res.status(200).json({
        success: false,
        message: 'Invoice data prepared for order 039636 (write disabled)',
        preparedData: {
          document_type: 1, // חשבונית מס
          reference: 39636,
          customer_id: 21134,
          items: [
            { item_id: 7290011585198, quantity: 5, price: 35.00 },
            { item_id: 7290011585228, quantity: 5, price: 31.50 },
            { item_id: 7290011585723, quantity: 6, price: 24.50 },
            { item_id: 7290011585754, quantity: 6, price: 24.50 },
            { item_id: 7290018749210, quantity: 11, price: 24.50 }
          ],
          total: 951.60
        },
        enableWrites: 'Set ALLOW_RIVHIT_WRITES=true in .env to enable actual invoice creation'
      });
    }

    // Create actual invoice
    const invoiceService = new InvoiceCreatorService(apiUrl, apiToken);
    const invoice = await invoiceService.createInvoiceForOrder039636();

    res.json({
      success: true,
      message: 'Invoice created successfully for order 039636',
      invoice
    });

  } catch (error: any) {
    console.error('Error creating invoice for 039636:', error);
    res.status(500).json({
      error: error.message || 'Failed to create invoice'
    });
  }
});

/**
 * Get invoice creation status
 * GET /api/invoices/status
 */
router.get('/status', (req: Request, res: Response) => {
  const allowWrites = process.env.ALLOW_RIVHIT_WRITES === 'true';
  const hasToken = !!process.env.RIVHIT_API_TOKEN;

  res.json({
    writeEnabled: allowWrites,
    apiConfigured: hasToken,
    message: allowWrites 
      ? 'Invoice creation is enabled' 
      : 'Invoice creation is disabled (read-only mode)',
    instructions: !allowWrites 
      ? 'To enable invoice creation, set ALLOW_RIVHIT_WRITES=true in your .env file'
      : null
  });
});

export default router;