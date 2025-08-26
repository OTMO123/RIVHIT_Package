# 📋 Invoice Creation Feature (חשבונית)

## Overview
This feature allows creating invoices (חשבונית/hashbonit) in RIVHIT directly from packed orders.

## 🔧 Configuration

### Environment Variables
Add to `packages/backend/.env`:
```env
# RIVHIT API Configuration
RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
RIVHIT_API_TOKEN=your_token_here

# Enable write operations (REQUIRED for invoice creation)
ALLOW_RIVHIT_WRITES=true
```

## 📝 How It Works

### 1. UI Flow
1. User packs items in order
2. Clicks "Создать חשבונית" button
3. System shows confirmation dialog with:
   - Order number
   - Number of items
   - Total quantity
4. On confirmation, invoice is created in RIVHIT

### 2. API Flow
```
Frontend → Backend → RIVHIT API
```

1. **Frontend** (`PrintActions.tsx`):
   - Collects packed items
   - Prepares invoice data
   - Sends to backend `/api/invoices/create-from-order`

2. **Backend** (`InvoiceCreatorService`):
   - Fetches order details from RIVHIT
   - Prepares invoice structure
   - Calls RIVHIT `Document.New` API

3. **RIVHIT API**:
   - Creates invoice (document_type: 2)
   - Links to original order via `reference` field
   - Returns invoice details

## 📊 Data Structure

### Request to Backend
```json
{
  "orderNumber": "039636",
  "items": [
    {
      "item_id": 7290011585198,
      "item_name": "כוסות חשק גרי 1400",
      "quantity": 5,
      "price": 35.00,
      "cost_nis": 30.00
    }
  ],
  "customerData": {
    "customer_id": 21134,
    "customer_name": "BRAVO"
  }
}
```

### RIVHIT API Request
```json
{
  "api_token": "***",
  "document_type": 2,
  "reference": 39636,
  "customer_id": 21134,
  "items": [...],
  "issue_date": "2025-08-22",
  "comments": "חשבונית עבור הזמנה 039636"
}
```

## 🔍 Debugging

### Enable Detailed Logging
All components have detailed logging:

1. **Frontend Console**:
   - Look for `🔵 [FRONTEND]` messages
   - Check prepared data before sending

2. **Backend Console**:
   - `🟢 [ROUTE]` - Route handler logs
   - `🔵 [INVOICE-CREATOR]` - Service logs
   - `📡 [GET-ORDER]` - RIVHIT API calls
   - `🚀 [CREATE-INVOICE]` - Invoice creation

### Common Issues

#### 1. "RIVHIT API token not configured"
**Solution**: Set `RIVHIT_API_TOKEN` in `.env`

#### 2. "Write operations disabled"
**Solution**: Set `ALLOW_RIVHIT_WRITES=true` in `.env`

#### 3. "Order not found"
**Cause**: Order number doesn't exist or wrong document type
**Solution**: Verify order exists in RIVHIT with document_type: 7

#### 4. "Failed to create invoice"
**Check**:
- API token is valid
- Customer exists in RIVHIT
- Items have valid IDs
- Check backend console for detailed error

## 🧪 Testing

### Manual Test
1. Start backend: `npx lerna run dev --scope=@packing/backend`
2. Start frontend: `npx lerna run dev --scope=@packing/frontend`
3. Open order with items
4. Pack some items
5. Click "Создать חשבונית" button
6. Check console logs for debugging

### Test Script
```bash
node test-invoice-creation.js
```

This script:
- Tests backend API directly
- Uses order 039636 as example
- Shows detailed logging
- Can test direct RIVHIT API

## 📋 Example: Order 039636

Based on the actual order from BRAVO:
- **Order Number**: 07/039636
- **Customer**: BRAVO (ID: 21134)
- **Items**: 5 different products
- **Total**: 951.60 NIS

When creating invoice:
1. System fetches order from RIVHIT
2. Uses packed quantities (not original)
3. Creates invoice with reference to order
4. Invoice appears in RIVHIT system

## 🔐 Security

- API token is never logged in full
- Write operations require explicit permission
- All operations are logged for audit
- Failed attempts are cached to prevent retries

## 📚 Related Files

- **Frontend**: 
  - `packages/frontend/src/renderer/components/PrintActions.tsx`
  
- **Backend**:
  - `packages/backend/src/services/invoice-creator.service.ts`
  - `packages/backend/src/routes/invoice.routes.ts`
  - `packages/backend/src/services/safe-rivhit.service.ts`

- **Tests**:
  - `test-invoice-creation.js`

## 🚀 Future Improvements

1. Add invoice preview before creation
2. Support partial invoices
3. Add invoice printing
4. Email invoice to customer
5. Support credit notes for returns