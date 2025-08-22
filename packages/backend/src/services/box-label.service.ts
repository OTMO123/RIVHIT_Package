#!/usr/bin/env node

import { createCanvas } from 'canvas';
import JsBarcode from 'jsbarcode';
import * as fs from 'fs';
import * as path from 'path';
import { ILogger } from '../interfaces/ILogger';

export interface BoxLabelData {
  orderId: string | number;
  boxNumber: number;
  totalBoxes: number;
  customerName: string;
  customerCity?: string;
  items: BoxItemData[];
  totalWeight?: string;
  deliveryDate?: string;
  notes?: string;
  region?: string;
}

export interface BoxItemData {
  name: string;
  nameHebrew?: string;
  nameRussian?: string;
  quantity: number;
  barcode?: string;
  catalogNumber?: string;
}

export class BoxLabelService {
  private tempDir: string;
  private labelWidth = 1200; // 10cm at 300 DPI
  private labelHeight = 1200; // 10cm at 300 DPI

  constructor(private logger: ILogger) {
    this.tempDir = path.join(process.cwd(), 'temp', 'labels');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.info('Created temp labels directory', { path: this.tempDir });
    }
  }

  /**
   * Generate high-quality box label image (300 DPI)
   */
  async generateBoxLabel(data: BoxLabelData): Promise<string> {
    try {
      // Create canvas with high quality settings
      const canvas = createCanvas(this.labelWidth, this.labelHeight);
      const ctx = canvas.getContext('2d');

      // Enable high-quality rendering
      ctx.patternQuality = 'best';
      ctx.quality = 'best';
      ctx.antialias = 'subpixel';

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.labelWidth, this.labelHeight);

      // Add black border (thicker)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, this.labelWidth - 6, this.labelHeight - 6);

      // TOP: Large Order Number
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${data.orderId}`, 600, 120);
      ctx.font = 'bold 48px Arial';
      ctx.fillText('Order', 600, 170);

      // Box number indicator (top right corner)
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4.5;
      ctx.strokeRect(900, 40, 250, 100);
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Box', 1025, 75);
      ctx.font = 'bold 48px Arial';
      ctx.fillText(`${data.boxNumber}/${data.totalBoxes}`, 1025, 120);
      ctx.restore();

      // Region indicator (top left corner) - always show
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4.5;
      ctx.strokeRect(50, 40, 250, 100);
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      const regionText = this.getRegionText(data.region || '');
      const regionLines = regionText.split('\n');
      if (regionLines.length > 1) {
        // Hebrew on top
        ctx.fillText(regionLines[0], 175, 75);
        // Russian below
        ctx.font = '24px Arial';
        ctx.fillText(regionLines[1], 175, 105);
      } else {
        ctx.fillText(regionText, 175, 90);
      }
      ctx.restore();

      // Customer name (smaller, below order number)
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(data.customerName, 600, 220);

      // Separator line (thicker)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, 250);
      ctx.lineTo(1150, 250);
      ctx.stroke();

      // Items section
      let yPosition = 280; // Start slightly higher
      const maxItemsToShow = 4; // Maximum 4 items per label
      const itemsToShow = data.items.slice(0, maxItemsToShow);
      const itemSpacing = 200; // Increased spacing between items for better scanning

      for (const item of itemsToShow) {
        // Draw item box (thicker)
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(80, yPosition - 35, 1040, 140); // Increased height for better spacing

        // Item names (Hebrew on top, Russian below)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'right';
        const itemName = item.nameHebrew || item.name || item.catalogNumber || 'מוצר';
        ctx.fillText(itemName, 1080, yPosition);
        
        if (item.nameRussian && item.nameRussian !== item.nameHebrew) {
          ctx.font = '28px Arial';
          ctx.fillText(item.nameRussian, 1080, yPosition + 35);
        }

        // Quantity
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.quantity}`, 150, yPosition + 20);
        ctx.font = '20px Arial';
        ctx.fillText('כמות', 150, yPosition + 45);

        // Item barcode (if available) - centered vertically in the item box
        if (item.barcode) {
          const itemBarcodeCanvas = createCanvas(340, 80);
          JsBarcode(itemBarcodeCanvas, item.barcode, {
            format: "CODE128",
            width: 3,
            height: 70,
            displayValue: false,
            background: "#ffffff",
            lineColor: "#000000",
            margin: 5
          });
          // Draw barcode centered vertically within the 140px item box
          // Item box spans from (yPosition - 35) to (yPosition + 105)
          // Center at yPosition + 35 (middle of box)
          // Barcode height is 80px, so position at (center - 40)
          ctx.drawImage(itemBarcodeCanvas, 250, yPosition - 5);
        }

        yPosition += itemSpacing; // Use increased spacing
      }

      if (data.items.length > maxItemsToShow) {
        ctx.font = 'italic 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`+ עוד ${data.items.length - maxItemsToShow} פריטים`, 600, yPosition);
      }

      // Bottom section - removed box barcode
      // Box barcode removed as per user request

      // Delivery date
      if (data.deliveryDate) {
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`תאריך: ${data.deliveryDate}`, 600, 1170);
      }

      // Save the label
      const timestamp = Date.now();
      const filename = `box_label_${data.orderId}_${data.boxNumber}_${timestamp}.png`;
      const filepath = path.join(this.tempDir, filename);

      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filepath, buffer);

      this.logger.info('Box label generated successfully', {
        orderId: data.orderId,
        boxNumber: data.boxNumber,
        totalBoxes: data.totalBoxes,
        filename,
        size: `${this.labelWidth}x${this.labelHeight}px`
      });

      return filepath;

    } catch (error) {
      this.logger.error('Failed to generate box label', error instanceof Error ? error : new Error(String(error)));
      this.logger.info('Label generation error details', { 
        errorMessage: error instanceof Error ? error.message : String(error),
        data 
      });
      throw new Error(`Box label generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate compact box label for smaller printers
   */
  async generateCompactBoxLabel(data: BoxLabelData): Promise<string> {
    try {
      // Smaller canvas for compact label (7x7 cm at 300 DPI)
      const canvas = createCanvas(826, 826);
      const ctx = canvas.getContext('2d');

      // Enable high-quality rendering
      ctx.patternQuality = 'best';
      ctx.quality = 'best';
      ctx.antialias = 'subpixel';

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 826, 826);

      // Border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 822, 822);

      // Box number (very large)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${data.boxNumber}/${data.totalBoxes}`, 413, 150);

      // Order ID
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`#${data.orderId}`, 413, 250);

      // Customer name
      ctx.font = '48px Arial';
      const customerText = (data.customerName || 'Customer').substring(0, 20);
      ctx.fillText(customerText, 413, 330);

      // Item count
      ctx.font = 'bold 44px Arial';
      ctx.fillText(`${data.items.length} פריטים`, 413, 420);

      // Barcode
      const boxBarcode = this.generateBoxBarcode(data.orderId, data.boxNumber);
      const barcodeCanvas = createCanvas(600, 150);
      
      JsBarcode(barcodeCanvas, boxBarcode, {
        format: "CODE128",
        width: 4,
        height: 100,
        displayValue: true,
        fontSize: 28,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 8,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 10
      });

      // Draw barcode
      ctx.drawImage(barcodeCanvas, 113, 500);

      // Save compact label
      const timestamp = Date.now();
      const filename = `compact_box_label_${data.orderId}_${data.boxNumber}_${timestamp}.png`;
      const filepath = path.join(this.tempDir, filename);

      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filepath, buffer);

      this.logger.info('Compact box label generated', {
        orderId: data.orderId,
        boxNumber: data.boxNumber,
        filename
      });

      return filepath;

    } catch (error) {
      this.logger.error('Failed to generate compact box label', error instanceof Error ? error : new Error(String(error)));
      this.logger.info('Compact label error details', { 
        errorMessage: error instanceof Error ? error.message : String(error),
        data 
      });
      throw new Error(`Compact label generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate EZPL commands for box label (fallback for direct printer communication)
   */
  generateBoxLabelEZPL(data: BoxLabelData): string {
    const boxBarcode = this.generateBoxBarcode(data.orderId, data.boxNumber);
    
    const ezpl = `
^Q25,3
^W104
^H15
^P1
^L
Dy2-me-dd
Th:m:s
T20,20,0,4,1,1,N,"BOX ${data.boxNumber}/${data.totalBoxes}"
T20,60,0,3,1,1,N,"Order #${data.orderId}"
T20,90,0,2,1,1,N,"${data.customerName}"
T20,115,0,2,1,1,N,"${data.customerCity || ''}"
T20,145,0,1,1,1,N,"Items: ${data.items.length}"
B20,180,0,1,3,6,120,B,"${boxBarcode}"
T20,320,0,1,1,1,N,"${new Date().toLocaleDateString('he-IL')}"
E
`.trim();

    return ezpl;
  }

  /**
   * Generate unique barcode for box tracking
   */
  private generateBoxBarcode(orderId: string | number, boxNumber: number): string {
    // Format: ORDER_BOX_TIMESTAMP (max 12 digits for CODE128)
    const orderPart = String(orderId).padStart(6, '0').slice(-6);
    const boxPart = String(boxNumber).padStart(2, '0');
    const timePart = String(Date.now()).slice(-4);
    
    return `${orderPart}${boxPart}${timePart}`;
  }

  /**
   * Get region display text (Hebrew and Russian)
   */
  private getRegionText(region: string): string {
    // Handle undefined or null region
    if (!region || region === 'undefined') {
      return 'אזור\nРегион'; // Default text for undefined region
    }
    
    const regionMap: { [key: string]: string } = {
      'south1': 'דרום 1\nЮг 1',
      'south2': 'דרום 2\nЮг 2', 
      'north1': 'צפון 1\nСевер 1',
      'north2': 'צפון 2\nСевер 2'
    };
    return regionMap[region] || `${region}\n${region}`;
  }

  /**
   * Generate multiple box labels for an order
   */
  async generateOrderBoxLabels(
    orderId: string | number,
    boxes: BoxLabelData[]
  ): Promise<string[]> {
    const labelPaths: string[] = [];

    for (const box of boxes) {
      try {
        const labelPath = await this.generateBoxLabel(box);
        labelPaths.push(labelPath);
      } catch (error) {
        this.logger.error('Failed to generate label for box', error instanceof Error ? error : new Error(String(error)));
        this.logger.info('Box label error details', {
          orderId,
          boxNumber: box.boxNumber,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('Generated box labels for order', {
      orderId,
      totalBoxes: boxes.length,
      successfulLabels: labelPaths.length
    });

    return labelPaths;
  }

  /**
   * Clean up old label files
   */
  async cleanupOldLabels(daysToKeep: number = 7): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.info('Cleaned up old label files', { 
          deletedCount,
          daysToKeep 
        });
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old labels', error instanceof Error ? error : new Error(String(error)));
      this.logger.info('Cleanup error details', {
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }
}