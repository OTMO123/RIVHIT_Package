# Next Steps for GoLabel Integration - Manual Printing Workflow

## Current Status ✅
We have successfully implemented:
1. **Frontend**: BoxLabelPrint component fetches saved boxes from SQLite and sends to GoLabel endpoint
2. **Backend**: GoLabel endpoint generates EZPX files from box data
3. **Data Flow**: SQLite (draft boxes) → EZPX generation → GoLabel file creation (uploading to Golable with SDK)
4. **Testing**: Comprehensive test suite for validation

## Main Task for Next Session
**Complete the SQLite → EZPX → GoLabel workflow for manual printing**

### Step 1: Verify Data Flow
```
SQLite Database (packing.db)
    ↓
Draft Boxes (order_boxes table)
    ↓
BoxLabelPrint Component (fetches boxes)
    ↓
GoLabel Endpoint (/api/print/box-label/golabel/print)
    ↓
EZPX File Generation (using template)
    ↓
Save to Temp Directory
    ↓
Open in GoLabel (manual print)
```

### Step 2: Test Current Implementation
1. **Run the sample data test** to verify EZPX generation:
   ```bash
   cd packages/backend
   npx ts-node test-golabel-with-sample-data.ts
   ```
   This will:
   - Generate test EZPX files
   - Save them to temp directory
   - Attempt to open in GoLabel

2. **Run the real order test** if you have packed orders:
   ```bash
   cd packages/backend
   npx ts-node test-golabel-printing.ts
   ```

### Step 3: Manual Printing Workflow
1. **Pack an order** in the application:
   - Select items with different maxPerBox limits
   - Complete packing to save draft boxes

2. **Open label printing**:
   - Click "Напечатать баркоды" button
   - Verify boxes are loaded from database
   - Click print

3. **Backend generates EZPX**:
   - Files saved to temp directory
   - GoLabel opens automatically (if installed)
   - Or manually open files from temp directory

### Step 4: Verify EZPX Content
Check that generated EZPX files contain:
- ✅ Correct order number
- ✅ Box number (X/Y format)
- ✅ Customer name (Hebrew only)
- ✅ Region (Hebrew)
- ✅ Items with quantities and barcodes
- ✅ No Russian text or city

### Step 5: Issues to Address Next Session

1. **GoLabel Installation Path**
   - Verify GoLabel is installed
   - Check environment variable: `GOLABEL_PATH`
   - Test automatic file opening

2. **Template Availability**
   - Ensure `box_label_example.ezpx` exists in `/docs/`
   - If missing, system falls back to dynamic generator

3. **Printer Configuration**
   - GoDEX ZX420i settings
   - 100mm x 100mm label size
   - EZPL format

4. **Error Handling**
   - What happens if GoLabel is not installed?
   - Manual file opening fallback
   - Error messages and user guidance

### Step 6: Testing Checklist
- [ ] Pack order with multiple items
- [ ] Items have different maxPerBox limits
- [ ] Boxes are created correctly (check SQLite)
- [ ] Print button opens BoxLabelPrint modal
- [ ] Boxes are loaded from database
- [ ] EZPX files are generated
- [ ] Files contain correct data
- [ ] GoLabel opens (or manual open works)
- [ ] Labels can be printed manually from GoLabel

### Step 7: Debugging Commands
If something doesn't work, use these commands:

1. **Check database for boxes**:
   ```sql
   SELECT * FROM order_boxes WHERE isDraft = 1;
   ```

2. **View generated EZPX**:
   - Check temp directory (shown in console)
   - Open in text editor to verify content
   - Open in GoLabel manually

3. **Test endpoints directly**:
   ```bash
   # Get draft boxes
   curl http://localhost:3001/api/order-status/{orderId}/draft-boxes
   
   # Generate EZPX
   curl -X POST http://localhost:3001/api/print/box-label/golabel/print \
     -H "Content-Type: application/json" \
     -d '{"orderId":"TEST123","customerName":"Test","boxes":[...]}'
   ```

### Step 8: Final Integration Points
1. **Ensure packing workflow saves boxes correctly**
2. **Verify BoxLabelPrint loads saved boxes**
3. **Confirm EZPX generation uses correct data**
4. **Test GoLabel opens generated files**
5. **Manual print from GoLabel application**

## Key Files to Review
- `/packages/frontend/src/renderer/components/BoxLabelPrint.tsx` - UI component
- `/packages/backend/src/controllers/print.controller.ts` - printBoxLabelGoLabel method
- `/packages/backend/src/services/golabel/generators/box-label-template-service.ts` - EZPX generation
- `/docs/box_label_example.ezpx` - Label template

## Expected Outcome
By the end of next session, you should be able to:
1. Pack an order with proper maxPerBox splits
2. Click print labels
3. See EZPX files generated with correct data
4. Open files in GoLabel
5. Manually print labels from GoLabel

## Questions for Next Session
1. Is GoLabel installed and working?
2. Can you see the generated EZPX files?
3. Do the labels show correct Hebrew text?
4. Are boxes split correctly according to maxPerBox?
5. Any errors during the process?

---
**Remember**: The maxPerBox logic is already handled during packing. Label printing just uses the pre-organized boxes from the database!