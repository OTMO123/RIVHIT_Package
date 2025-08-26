import axios from 'axios';
import { 
  RivhitDocument, 
  RivhitItem, 
  DocumentType,
  RivhitApiResponse 
} from '@packing/shared';

/**
 * Service for creating invoices (חשבונית) from orders
 * This service has WRITE permissions to RIVHIT API
 */
export class InvoiceCreatorService {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(apiUrl: string, apiToken: string) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
  }

  /**
   * Create invoice (חשבונית) from order
   * @param orderNumber - Order number (e.g., "039636")
   * @param actualItems - Items with actual packed quantities
   */
  async createInvoiceFromOrder(
    orderNumber: string,
    actualItems?: Array<{
      item_id: number;
      item_name?: string;
      quantity: number;
      price: number;
      cost_nis?: number;
    }>,
    customerId?: number
  ) {
    console.log('🔵 [INVOICE-CREATOR] Starting invoice creation process');
    console.log('📋 Order Number:', orderNumber);
    console.log('📦 Actual Items:', JSON.stringify(actualItems, null, 2));
    console.log('👤 Customer ID:', customerId);
    
    try {
      // If customerId is provided, use simplified flow
      if (customerId) {
        console.log('✅ [FAST-PATH] Using provided customer_id, skipping order lookup');
        
        const invoiceData = {
          document_type: 1, // חשבונית מס (Invoice)
          reference: parseInt(orderNumber.replace(/\D/g, '')), // Extract only digits
          customer_id: customerId,
          items: actualItems?.map((item, index) => ({
            item_id: item.item_id,
            item_name: item.item_name || `Item ${index + 1}`,
            quantity: item.quantity,
            price_nis: item.price || 0,
            cost_nis: item.cost_nis || 0,
            currency_id: 1,
            exempt_vat: false
          })) || [],
          issue_date: new Date().toISOString().split('T')[0],
          comments: `חשבונית עבור הזמנה ${orderNumber}`,
          payment_terms: 30,
          currency_id: 1 // NIS
        };
        
        console.log('📋 [FAST-PATH] Invoice data prepared:', {
          document_type: invoiceData.document_type,
          reference: invoiceData.reference,
          customer_id: invoiceData.customer_id,
          items_count: invoiceData.items.length
        });
        
        // Step 3: Create invoice directly
        const invoice = await this.createInvoice(invoiceData);
        
        console.log('🎉 [FAST-PATH] Invoice created successfully');
        return invoice;
      }
      
      // Step 1: Get order details first (fallback path)
      console.log('🔍 [STEP 1] Fetching order details for:', orderNumber);
      const orderDetails = await this.getOrderDetails(orderNumber);
      
      if (!orderDetails) {
        console.error('❌ [ERROR] Order not found:', orderNumber);
        throw new Error(`Order ${orderNumber} not found`);
      }
      
      console.log('✅ [STEP 1] Order found:', {
        document_id: orderDetails.document_id,
        customer_id: orderDetails.customer_id,
        items_count: orderDetails.items?.length
      });

      // Step 2: Prepare invoice data
      console.log('📝 [STEP 2] Preparing invoice data');
      const invoiceData = this.prepareInvoiceData(orderDetails, actualItems);
      console.log('📋 [STEP 2] Prepared invoice data:', JSON.stringify(invoiceData, null, 2));

      // Step 3: Create invoice via Document.New
      console.log('🚀 [STEP 3] Sending invoice to RIVHIT API');
      const invoice = await this.createInvoice(invoiceData);
      
      console.log('✅ [SUCCESS] Invoice created successfully:', invoice);
      return invoice;
    } catch (error) {
      console.error('❌ [INVOICE-CREATOR ERROR]:', error);
      console.error('Stack trace:', (error as Error).stack);
      throw error;
    }
  }

  /**
   * Get order details from RIVHIT
   */
  private async getOrderDetails(orderNumber: string) {
    console.log('📡 [GET-ORDER] Requesting order from RIVHIT API');
    console.log('🔗 URL:', `${this.apiUrl}/Document.List`);
    console.log('📄 Request params:', {
      document_type: 7,
      document_number: orderNumber,
      api_token: this.apiToken ? '***hidden***' : 'NOT SET!'
    });

    // Format dates for RIVHIT API (DD/MM/YYYY)
    const today = new Date();
    const fromDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const toDate = fromDate; // Same day
    
    console.log('📅 [GET-ORDER] Using date range:', fromDate, 'to', toDate);
    
    try {
      const response = await axios.post(
        `${this.apiUrl}/Document.List`,
        {
          api_token: this.apiToken,
          document_type: 7, // Order type (פרטי הזמנה)
          from_date: fromDate,
          to_date: toDate
        }
      );

      console.log('📥 [GET-ORDER] Response received:', {
        status: response.status,
        error_code: response.data?.error_code,
        has_data: !!response.data?.data,
        document_count: response.data?.data?.document_list?.length || 0
      });

      if (response.data?.data?.document_list?.length > 0) {
        const order = response.data.data.document_list[0];
        console.log('📋 [GET-ORDER] Order found:', {
          document_id: order.document_id,
          document_number: order.document_number,
          customer_id: order.customer_id
        });
        
        // Get full details including items
        console.log('🔍 [GET-ORDER] Fetching full order details');
        const detailsResponse = await axios.post(
          `${this.apiUrl}/Document.Details`,
          {
            api_token: this.apiToken,
            document_id: order.document_id,
            document_type: 7
          }
        );

        console.log('📦 [GET-ORDER] Full details received:', {
          has_items: !!detailsResponse.data?.data?.items,
          items_count: detailsResponse.data?.data?.items?.length || 0,
          customer_id: detailsResponse.data?.data?.customer_id
        });

        return detailsResponse.data?.data;
      }

      console.warn('⚠️ [GET-ORDER] No orders found for number:', orderNumber);
      return null;
    } catch (error) {
      console.error('❌ [GET-ORDER ERROR]:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      throw error;
    }
  }

  /**
   * Prepare invoice data structure
   */
  private prepareInvoiceData(orderData: any, actualItems?: any[]) {
    console.log('🔧 [PREPARE-DATA] Starting data preparation');
    console.log('📋 Order data received:', {
      document_number: orderData.document_number,
      document_id: orderData.document_id,
      customer_id: orderData.customer_id,
      original_items_count: orderData.items?.length,
      actual_items_provided: !!actualItems,
      actual_items_count: actualItems?.length
    });

    // Use actual items if provided, otherwise use order items
    const items = actualItems || orderData.items;
    
    console.log('📦 [PREPARE-DATA] Items to process:', items?.length);
    
    const preparedItems = items.map((item: any, index: number) => {
      const preparedItem = {
        item_id: item.item_id,
        item_name: item.item_name || item.description || `Item ${index + 1}`,
        quantity: item.quantity,
        price_nis: item.sale_nis || item.price || 0,
        cost_nis: item.cost_nis || 0,
        currency_id: 1, // NIS
        exempt_vat: item.exempt_vat || false
      };
      
      console.log(`  📦 Item ${index + 1}:`, {
        id: preparedItem.item_id,
        name: preparedItem.item_name,
        qty: preparedItem.quantity,
        price: preparedItem.price_nis
      });
      
      return preparedItem;
    });

    const invoiceData = {
      // Document info
      document_type: 1, // חשבונית מס (Invoice) - Type 1 is correct!
      
      // Reference to original order - ONLY the number, not full document number
      reference: parseInt(orderData.document_number.replace(/\D/g, '')), // Extract only digits
      
      // Customer info (from order)
      customer_id: orderData.customer_id,
      
      // Items with quantities
      items: preparedItems,
      
      // Dates
      issue_date: new Date().toISOString().split('T')[0],
      
      // Additional info
      comments: `חשבונית עבור הזמנה ${orderData.document_number}`,
      
      // Payment terms (from order if exists)
      payment_terms: orderData.payment_terms || 30,
      
      // Currency
      currency_id: 1 // NIS
    };

    console.log('✅ [PREPARE-DATA] Invoice data prepared:', {
      document_type: invoiceData.document_type,
      reference: invoiceData.reference,
      customer_id: invoiceData.customer_id,
      items_count: invoiceData.items.length,
      issue_date: invoiceData.issue_date,
      total_quantity: invoiceData.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    });

    return invoiceData;
  }

  /**
   * Create invoice via Document.New API
   */
  private async createInvoice(invoiceData: any) {
    console.log('🚀 [CREATE-INVOICE] Sending request to RIVHIT API');
    console.log('🔗 URL:', `${this.apiUrl}/Document.New`);
    console.log('📄 Full request data:', JSON.stringify({
      api_token: this.apiToken ? '***hidden***' : 'NOT SET!',
      ...invoiceData
    }, null, 2));

    try {
      const requestBody = {
        api_token: this.apiToken,
        ...invoiceData
      };

      console.log('📡 [CREATE-INVOICE] Making POST request...');
      const response = await axios.post<RivhitApiResponse<any>>(
        `${this.apiUrl}/Document.New`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      console.log('📥 [CREATE-INVOICE] Response received:', {
        status: response.status,
        error_code: response.data?.error_code,
        has_data: !!response.data?.data,
        client_message: response.data?.client_message,
        debug_message: response.data?.debug_message
      });

      if (response.data?.error_code !== 0) {
        console.error('❌ [CREATE-INVOICE] API returned error:', {
          error_code: response.data?.error_code,
          client_message: response.data?.client_message,
          debug_message: response.data?.debug_message
        });
        throw new Error(
          `Failed to create invoice: ${response.data?.client_message || 'Unknown error'} (Code: ${response.data?.error_code})`
        );
      }

      console.log('✅ [CREATE-INVOICE] Invoice created successfully!');
      console.log('📋 Invoice details:', response.data.data);
      
      return response.data.data;
    } catch (error) {
      console.error('❌ [CREATE-INVOICE ERROR]:', error);
      if (axios.isAxiosError(error)) {
        console.error('📛 Axios error details:', {
          message: error.message,
          code: error.code,
          response_status: error.response?.status,
          response_data: error.response?.data
        });
      }
      throw error;
    }
  }

  /**
   * Create invoice for specific order 039636
   */
  async createInvoiceForOrder039636() {
    // Based on the image, these are the items from order 039636
    const actualPackedItems = [
      {
        item_id: 7290011585198, // כוסות חשק גרי 1400
        quantity: 5, // As shown in image
        price: 35.00
      },
      {
        item_id: 7290011585228, // כוסות אריזה משושה 1500
        quantity: 5,
        price: 31.50
      },
      {
        item_id: 7290011585723, // כוסות ביני 900 גרי (פרטיים)
        quantity: 6,
        price: 24.50
      },
      {
        item_id: 7290011585754, // כוסות פרסיק 900 גרי (פרטיים)
        quantity: 6,
        price: 24.50
      },
      {
        item_id: 7290018749210, // מיני כוסות קלאסיק 700 גרי
        quantity: 11,
        price: 24.50
      }
    ];

    return await this.createInvoiceFromOrder('039636', actualPackedItems);
  }
}

// Export function for direct use
export async function createInvoiceForOrder(
  apiUrl: string,
  apiToken: string,
  orderNumber: string,
  actualItems?: any[]
) {
  const service = new InvoiceCreatorService(apiUrl, apiToken);
  return await service.createInvoiceFromOrder(orderNumber, actualItems);
}