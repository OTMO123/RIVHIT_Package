import { ILogger } from '../interfaces/ILogger';
import { ConsoleLoggerService } from './logging/console.logger.service';

/**
 * Data structure for box label generation
 */
export interface BoxLabelEZPLData {
  orderId: string | number;
  boxNumber: number;
  totalBoxes: number;
  customerName: string;
  customerCompany?: string;
  customerCity?: string;
  region?: string;
  items: Array<{
    name: string;
    nameHebrew?: string;
    nameRussian?: string;
    quantity: number;
    barcode?: string;
    catalogNumber?: string;
  }>;
  deliveryDate?: string;
}

/**
 * Service for generating EZPL commands for box labels
 * Directly generates printer commands instead of images
 */
export class BoxLabelEZPLService {
  private logger: ILogger;
  
  // Label dimensions in dots (300 DPI)
  // 10cm = 3.94 inches = 1181 dots at 300 DPI
  private readonly LABEL_WIDTH = 1200;
  private readonly LABEL_HEIGHT = 1200;
  
  constructor(logger?: ILogger) {
    this.logger = logger || new ConsoleLoggerService('BoxLabelEZPLService');
  }

  /**
   * Generate EZPL commands for a box label
   */
  public generateBoxLabelEZPL(data: BoxLabelEZPLData): string {
    this.logger.info('Generating EZPL for box label', {
      orderId: data.orderId,
      boxNumber: data.boxNumber,
      totalBoxes: data.totalBoxes
    });

    const commands: string[] = [];
    
    // Initialize label
    commands.push(this.initializeLabel());
    
    // Draw outer border
    commands.push(this.drawBorder());
    
    // Add order number (large, centered)
    commands.push(this.addOrderNumber(data.orderId));
    
    // Add box indicator (top right)
    commands.push(this.addBoxIndicator(data.boxNumber, data.totalBoxes));
    
    // Add region indicator (top left)
    if (data.region) {
      commands.push(this.addRegionIndicator(data.region));
    }
    
    // Add customer company text (below Order, spanning width)
    if (data.customerCompany) {
      commands.push(this.addCustomerCompany(data.customerCompany));
    }
    
    // Add customer name
    commands.push(this.addCustomerName(data.customerName, data.customerCity));
    
    // Add separator line
    commands.push(this.addSeparatorLine());
    
    // Add items with barcodes
    const itemCommands = this.addItems(data.items);
    commands.push(...itemCommands);
    
    // Add date at bottom
    const date = data.deliveryDate || new Date().toLocaleDateString('he-IL');
    commands.push(this.addDate(date));
    
    // End label
    commands.push('E'); // End of label command
    
    const ezplCode = commands.join('\n');
    
    this.logger.debug('Generated EZPL code', {
      length: ezplCode.length,
      lines: commands.length
    });
    
    return ezplCode;
  }

  /**
   * Initialize label with settings
   */
  private initializeLabel(): string {
    return [
      '^Q30,3',     // Label length 30mm, gap 3mm
      '^W100',      // Label width 100mm
      '^H10',       // Print speed 10
      '^P1',        // Print 1 copy
      '^S4',        // Speed setting
      '^AD',        // Set to auto-detect
      '^C1',        // Copy count
      '^R0',        // Reference point
      '~Q+0',       // Quality adjustment
      '^O0',        // Label offset
      '^D0',        // Density
      '^E20',       // Edge position
      '~R255',      // Ribbon tension
      '^L',         // Start label formatting
      '',
      'Dy2-me-dd',  // Date format
      'Th:m:s',     // Time format
      ''
    ].join('\n');
  }

  /**
   * Draw border around label
   */
  private drawBorder(): string {
    // R command: Rectangle
    // R<x>,<y>,<x2>,<y2>,<thickness>
    return 'R10,10,1180,1180,6';
  }

  /**
   * Add large order number at top center
   */
  private addOrderNumber(orderId: string | number): string {
    const commands: string[] = [];
    
    // A command: ASCII Text
    // A<x>,<y>,<rotation>,<font>,<h_mult>,<v_mult>,<reverse>,"text"
    
    // Large order number - raised higher to align with boxes
    commands.push(`A600,65,0,8,3,3,N,"${orderId}"`);
    
    // "Order" text below - raised by 15 pixels total from 145 to 130
    commands.push('A600,130,0,4,1,1,N,"Order"');
    
    return commands.join('\n');
  }

  /**
   * Add box number indicator (top right)
   */
  private addBoxIndicator(boxNumber: number, totalBoxes: number): string {
    const commands: string[] = [];
    
    // Draw box around indicator - positioned with equal margin from right edge
    commands.push('R980,40,1170,140,4');
    
    // "Box" text - larger font
    commands.push('A1075,65,0,5,1,1,N,"Box"');
    
    // Box number - much larger
    commands.push(`A1075,100,0,7,1,1,N,"${boxNumber}/${totalBoxes}"`);
    
    return commands.join('\n');
  }

  /**
   * Add region indicator (top left)
   */
  private addRegionIndicator(region: string): string {
    const commands: string[] = [];
    
    // Draw box around indicator - positioned with equal margin from left edge (10px margin like main border)
    commands.push('R10,40,200,140,4');
    
    // Get region text in both languages
    const { hebrew, russian } = this.getRegionText(region);
    
    // Hebrew text - larger font
    commands.push(`A105,65,0,6,1,1,R,"${hebrew}"`);
    
    // Russian text - larger font
    commands.push(`A105,105,0,5,1,1,N,"${russian}"`);
    
    return commands.join('\n');
  }

  /**
   * Add customer company text (below Order text)
   */
  private addCustomerCompany(company: string): string {
    // Position at Y=85 (62 pixels less total - was 147, now 85)
    // Use font size 3 for better visibility
    // Center at X=600 to match Order text position
    return `A600,85,0,3,1,1,R,"${this.escapeText(company)}"`;
  }

  /**
   * Add customer name
   */
  private addCustomerName(name: string, city?: string): string {
    const commands: string[] = [];
    
    // Customer name (below company text)
    const displayName = this.truncateText(name, 40);
    commands.push(`A600,108,0,3,1,1,R,"${this.escapeText(displayName)}"`);
    
    // Customer city if provided
    if (city) {
      const displayCity = this.truncateText(city, 30);
      commands.push(`A600,133,0,2,1,1,R,"${this.escapeText(displayCity)}"`);
    }
    
    return commands.join('\n');
  }

  /**
   * Add separator line
   */
  private addSeparatorLine(): string {
    // Line command: L<x1>,<y1>,<x2>,<y2>,<thickness>
    return 'L50,158,1150,158,3';
  }

  /**
   * Add items with barcodes
   */
  private addItems(items: BoxLabelEZPLData['items']): string[] {
    const commands: string[] = [];
    const maxItems = 4; // Maximum items to show
    const itemsToShow = items.slice(0, maxItems);
    
    let yPosition = 188; // Starting Y position for items (adjusted for new separator)
    const itemHeight = 240; // Height allocated for each item
    
    itemsToShow.forEach((item, index) => {
      // Item box
      commands.push(`R80,${yPosition},1120,${yPosition + itemHeight - 20},2`);
      
      // Item name in Hebrew (right side)
      const hebrewName = item.nameHebrew || item.name;
      const displayName = this.truncateText(hebrewName, 30);
      commands.push(`A1080,${yPosition + 30},0,3,1,1,R,"${this.escapeText(displayName)}"`);
      
      // Item name in Russian (if different)
      if (item.nameRussian && item.nameRussian !== hebrewName) {
        const russianName = this.truncateText(item.nameRussian, 35);
        commands.push(`A1080,${yPosition + 65},0,2,1,1,N,"${this.escapeText(russianName)}"`);
      }
      
      // Quantity (left side)
      commands.push(`A120,${yPosition + 45},0,5,2,2,N,"${item.quantity}"`);
      commands.push(`A120,${yPosition + 90},0,2,1,1,N,"כמות"`);
      
      // Barcode (center)
      if (item.barcode || item.catalogNumber) {
        const barcodeData = item.barcode || item.catalogNumber || '';
        // B command: Barcode
        // B<x>,<y>,<rotation>,<type>,<narrow>,<wide>,<height>,<readable>,"data"
        // Type E = EAN13 for 13-digit barcodes
        const barcodeType = barcodeData.length === 13 ? 'E' : '1';
        commands.push(`B400,${yPosition + 30},0,${barcodeType},2,6,80,B,"${barcodeData}"`);
      }
      
      yPosition += itemHeight;
    });
    
    // If more items than can be shown
    if (items.length > maxItems) {
      commands.push(`A600,${yPosition + 20},0,2,1,1,N,"... ועוד ${items.length - maxItems} פריטים"`);
    }
    
    return commands;
  }

  /**
   * Add date at bottom
   */
  private addDate(date: string): string {
    // Date at bottom center
    return `A600,1130,0,2,1,1,N,"תאריך: ${date}"`;
  }

  /**
   * Get region text in Hebrew and Russian
   */
  private getRegionText(region: string): { hebrew: string; russian: string } {
    const regionMap: Record<string, { hebrew: string; russian: string }> = {
      'north1': { hebrew: 'צפון 1', russian: 'Север 1' },
      'north2': { hebrew: 'צפון 2', russian: 'Север 2' },
      'south1': { hebrew: 'דרום 1', russian: 'Юг 1' },
      'south2': { hebrew: 'דרום 2', russian: 'Юг 2' },
      'center': { hebrew: 'מרכז', russian: 'Центр' },
      'NORTH1': { hebrew: 'צפון 1', russian: 'Север 1' },
      'NORTH2': { hebrew: 'צפון 2', russian: 'Север 2' },
      'SOUTH1': { hebrew: 'דרום 1', russian: 'Юг 1' },
      'SOUTH2': { hebrew: 'דרום 2', russian: 'Юг 2' },
      // City regions for test cases
      'tel_aviv': { hebrew: 'תל אביב', russian: 'Тель-Авив' },
      'haifa': { hebrew: 'חיפה', russian: 'Хайфа' },
      'beer_sheva': { hebrew: 'באר שבע', russian: 'Беэр-Шева' },
      'other': { hebrew: 'אחר', russian: 'Другой' }
    };
    
    return regionMap[region] || { hebrew: region, russian: region };
  }

  /**
   * Escape special characters for EZPL
   */
  private escapeText(text: string): string {
    // Escape quotes and backslashes
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  }

  /**
   * Generate SVG barcode for EAN13
   */
  private generateEAN13SVG(code: string): string {
    // Ensure code is 13 digits
    if (code.length !== 13) {
      return ''; // Return empty if not valid EAN13
    }

    // EAN13 encoding patterns
    const LEFT_PATTERNS: Record<string, number> = {
      'LLLLLL': 0, 'LLLLLG': 1, 'LLLLGL': 2, 'LLLLGG': 3,
      'LLGLLL': 4, 'LLGLLG': 5, 'LLGLGL': 6, 'LLGLGG': 7,
      'LLGGLL': 8, 'LLGGLG': 9
    };

    const L_CODES = [
      '0001101', '0011001', '0010011', '0111101', '0100011',
      '0110001', '0101111', '0111011', '0110111', '0001011'
    ];

    const G_CODES = [
      '0100111', '0110011', '0011011', '0100001', '0011101',
      '0111001', '0000101', '0010001', '0001001', '0010111'
    ];

    const R_CODES = [
      '1110010', '1100110', '1101100', '1000010', '1011100',
      '1001110', '1010000', '1000100', '1001000', '1110100'
    ];

    // Build the barcode pattern
    let pattern = '101'; // Start guard
    
    // First digit determines the pattern for next 6 digits
    const firstDigit = parseInt(code[0]);
    const leftPattern = Object.keys(LEFT_PATTERNS).find(key => LEFT_PATTERNS[key] === firstDigit) || 'LLLLLL';
    
    // Encode left side (digits 1-6)
    for (let i = 1; i <= 6; i++) {
      const digit = parseInt(code[i]);
      if (leftPattern[i - 1] === 'L') {
        pattern += L_CODES[digit];
      } else {
        pattern += G_CODES[digit];
      }
    }
    
    pattern += '01010'; // Middle guard
    
    // Encode right side (digits 7-12)
    for (let i = 7; i <= 12; i++) {
      const digit = parseInt(code[i]);
      pattern += R_CODES[digit];
    }
    
    pattern += '101'; // End guard

    // Generate SVG
    const barWidth = 1.5;
    const barHeight = 30;
    const svgWidth = pattern.length * barWidth;
    
    let svg = `<svg width="${svgWidth}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        svg += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
      }
    }
    
    svg += '</svg>';
    
    return svg;
  }

  /**
   * Truncate text to maximum length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate compact version of box label
   */
  public generateCompactBoxLabelEZPL(data: BoxLabelEZPLData): string {
    this.logger.info('Generating compact EZPL for box label', {
      orderId: data.orderId,
      boxNumber: data.boxNumber
    });

    const commands: string[] = [];
    
    // Initialize smaller label (7cm x 7cm)
    commands.push(this.initializeCompactLabel());
    
    // Simplified layout for compact label
    commands.push(this.drawBorder());
    
    // Order and box number on same line
    commands.push(`A200,50,0,5,2,2,N,"${data.orderId}"`);
    commands.push(`A500,50,0,4,1,1,N,"Box ${data.boxNumber}/${data.totalBoxes}"`);
    
    // Customer name
    const shortName = this.truncateText(data.customerName, 25);
    commands.push(`A250,120,0,3,1,1,R,"${this.escapeText(shortName)}"`);
    
    // Separator
    commands.push('L30,160,770,160,2');
    
    // Items count only (no details)
    commands.push(`A400,200,0,4,1,1,N,"Items: ${data.items.length}"`);
    
    // Main barcode for order
    commands.push(`B200,250,0,1,3,6,100,B,"${data.orderId}"`);
    
    // Region at bottom
    if (data.region) {
      const { hebrew } = this.getRegionText(data.region);
      commands.push(`A400,400,0,3,1,1,R,"${hebrew}"`);
    }
    
    commands.push('E');
    
    return commands.join('\n');
  }

  /**
   * Initialize compact label settings
   */
  private initializeCompactLabel(): string {
    return [
      '^Q20,3',     // Label length 20mm (7cm)
      '^W70',       // Label width 70mm
      '^H10',       // Print speed
      '^P1',        // Print 1 copy
      '^S4',        // Speed setting
      '^C1',        // Copy count
      '^L',         // Start label
      ''
    ].join('\n');
  }

  /**
   * Generate HTML visualization of EZPL label
   */
  public generateBoxLabelHTML(data: BoxLabelEZPLData): string {
    this.logger.info('Generating HTML visualization for box label', {
      orderId: data.orderId,
      boxNumber: data.boxNumber,
      totalBoxes: data.totalBoxes
    });

    // Generate items HTML with real barcodes
    const itemsHTML = data.items.slice(0, 4).map((item, index) => {
      const barcodeValue = item.barcode || item.catalogNumber || '';
      
      // Generate SVG barcode for EAN13
      const barcodeSVG = barcodeValue ? this.generateEAN13SVG(barcodeValue) : '';
      
      return `
        <div class="item">
          <div>
            <div class="item-quantity">${item.quantity}</div>
            <div class="item-quantity-label">כמות</div>
          </div>
          <div class="item-barcode">
            ${barcodeSVG}
            <div class="barcode-text">${barcodeValue}</div>
          </div>
          <div class="item-name">
            <div class="item-name-hebrew">${item.nameHebrew || item.name}</div>
            ${item.nameRussian ? `<div class="item-name-russian">${item.nameRussian}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Get region text
    const regionText = data.region ? this.getRegionText(data.region) : null;

    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Box Label - Order ${data.orderId} - Box ${data.boxNumber}/${data.totalBoxes}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .label {
            width: 400px;
            height: 400px;
            border: 3px solid black;
            position: relative;
            background: white;
            padding: 10px;
            box-sizing: border-box;
            direction: ltr;
        }
        .border-thick {
            position: absolute;
            top: 4px;
            left: 4px;
            right: 4px;
            bottom: 4px;
            border: 2px solid black;
        }
        .order-number {
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
        }
        .order-number .main {
            font-size: 56px;
            font-weight: bold;
            line-height: 1;
        }
        .order-number .sub {
            font-size: 16px;
            margin-top: -5px;
        }
        .box-indicator {
            position: absolute;
            top: 15px;
            right: 10px;
            border: 2px solid black;
            padding: 8px 12px;
            text-align: center;
            width: 75px;
            height: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .box-indicator .title {
            font-size: 16px;
            font-weight: bold;
        }
        .box-indicator .number {
            font-size: 28px;
            font-weight: bold;
            margin-top: 2px;
        }
        .region-indicator {
            position: absolute;
            top: 15px;
            left: 10px;
            border: 2px solid black;
            padding: 8px 12px;
            text-align: center;
            width: 75px;
            height: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .region-indicator .hebrew {
            font-size: 20px;
            font-weight: bold;
            direction: rtl;
        }
        .region-indicator .russian {
            font-size: 14px;
            margin-top: 2px;
        }
        .customer-company {
            position: absolute;
            top: 85px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 13px;
            direction: rtl;
        }
        .customer-name {
            position: absolute;
            top: 103px;
            left: 10%;
            right: 10%;
            width: 80%;
            text-align: center;
            font-size: 13px;
            direction: rtl;
        }
        .customer-city {
            position: absolute;
            top: 121px;
            left: 10%;
            right: 10%;
            width: 80%;
            text-align: center;
            font-size: 11px;
            direction: rtl;
            color: #666;
        }
        .separator {
            position: absolute;
            top: 138px;
            left: 20px;
            right: 20px;
            border-top: 2px solid black;
        }
        .items-section {
            position: absolute;
            top: 148px;
            left: 20px;
            right: 20px;
            bottom: 40px;
        }
        .item {
            border: 1px solid #ccc;
            margin-bottom: 8px;
            padding: 5px;
            height: 55px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .item-quantity {
            font-size: 24px;
            font-weight: bold;
            width: 50px;
            text-align: center;
        }
        .item-quantity-label {
            font-size: 8px;
            text-align: center;
            direction: rtl;
        }
        .item-barcode {
            flex: 1;
            text-align: center;
            font-family: 'Courier New', monospace;
        }
        .item-barcode svg {
            display: block;
            margin: 2px auto;
        }
        .barcode-text {
            font-size: 9px;
            margin-top: 2px;
            text-align: center;
            width: 100%;
        }
        .item-name {
            text-align: right;
            width: 140px;
            padding-right: 5px;
        }
        .item-name-hebrew {
            font-size: 11px;
            font-weight: bold;
            direction: rtl;
        }
        .item-name-russian {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
        }
        .date {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            direction: rtl;
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="border-thick"></div>
        
        <!-- Order Number -->
        <div class="order-number">
            <div class="main">${data.orderId}</div>
            <div class="sub">Order</div>
        </div>
        
        <!-- Customer Company -->
        ${data.customerCompany ? `
        <div class="customer-company">
            ${this.escapeText(data.customerCompany)}
        </div>
        ` : ''}

        <!-- Box Indicator -->
        <div class="box-indicator">
            <div class="title">Box</div>
            <div class="number">${data.boxNumber}/${data.totalBoxes}</div>
        </div>

        <!-- Region Indicator -->
        ${regionText ? `
        <div class="region-indicator">
            <div class="hebrew">${regionText.hebrew}</div>
            <div class="russian">${regionText.russian}</div>
        </div>
        ` : ''}

        <!-- Customer Name -->
        <div class="customer-name">${this.escapeText(data.customerName)}</div>
        ${data.customerCity ? `<div class="customer-city">${this.escapeText(data.customerCity)}</div>` : ''}

        <!-- Separator Line -->
        <div class="separator"></div>

        <!-- Items Section -->
        <div class="items-section">
            ${itemsHTML}
            ${data.items.length > 4 ? `
            <div style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">
                ... ועוד ${data.items.length - 4} פריטים
            </div>
            ` : ''}
        </div>

        <!-- Date -->
        <div class="date">תאריך: ${data.deliveryDate || new Date().toLocaleDateString('he-IL')}</div>
    </div>
</body>
</html>`;

    this.logger.debug('Generated HTML visualization', {
      orderId: data.orderId,
      htmlLength: html.length
    });

    return html;
  }

  /**
   * Generate HTML with multiple box labels on one page
   */
  public generateMultipleBoxLabelsHTML(labels: BoxLabelEZPLData[]): string {
    this.logger.info('Generating HTML for multiple box labels', {
      count: labels.length
    });

    const labelsHTML = labels.map(data => {
      // Generate items HTML for each label with real barcodes
      const itemsHTML = data.items.slice(0, 4).map((item, index) => {
        const barcodeValue = item.barcode || item.catalogNumber || '';
        const barcodeSVG = barcodeValue ? this.generateEAN13SVG(barcodeValue) : '';
        
        return `
          <div class="item">
            <div>
              <div class="item-quantity">${item.quantity}</div>
              <div class="item-quantity-label">כמות</div>
            </div>
            <div class="item-barcode">
              ${barcodeSVG}
              <div class="barcode-text">${barcodeValue}</div>
            </div>
            <div class="item-name">
              <div class="item-name-hebrew">${item.nameHebrew || item.name}</div>
              ${item.nameRussian ? `<div class="item-name-russian">${item.nameRussian}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      const regionText = data.region ? this.getRegionText(data.region) : null;

      return `
        <div class="label">
          <div class="border-thick"></div>
          
          <!-- Order Number -->
          <div class="order-number">
            <div class="main">${data.orderId}</div>
            <div class="sub">Order</div>
          </div>
          
          <!-- Customer Company -->
          ${data.customerCompany ? `
          <div class="customer-company">
            ${this.escapeText(data.customerCompany)}
          </div>
          ` : ''}

          <!-- Box Indicator -->
          <div class="box-indicator">
            <div class="title">Box</div>
            <div class="number">${data.boxNumber}/${data.totalBoxes}</div>
          </div>

          <!-- Region Indicator -->
          ${regionText ? `
          <div class="region-indicator">
            <div class="hebrew">${regionText.hebrew}</div>
            <div class="russian">${regionText.russian}</div>
          </div>
          ` : ''}

          <!-- Customer Name -->
          <div class="customer-name">${this.escapeText(data.customerName)}</div>
          ${data.customerCity ? `<div class="customer-city">${this.escapeText(data.customerCity)}</div>` : ''}

          <!-- Separator Line -->
          <div class="separator"></div>

          <!-- Items Section -->
          <div class="items-section">
            ${itemsHTML}
          </div>

          <!-- Date -->
          <div class="date">תאריך: ${data.deliveryDate || new Date().toLocaleDateString('he-IL')}</div>
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Box Labels - ${labels.length} Labels</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f0f0f0;
            margin: 0;
            padding: 20px;
        }
        .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
        }
        .label {
            width: 400px;
            height: 400px;
            border: 3px solid black;
            position: relative;
            background: white;
            padding: 10px;
            box-sizing: border-box;
            direction: ltr;
            page-break-inside: avoid;
        }
        .border-thick {
            position: absolute;
            top: 4px;
            left: 4px;
            right: 4px;
            bottom: 4px;
            border: 2px solid black;
        }
        .order-number {
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
        }
        .order-number .main {
            font-size: 56px;
            font-weight: bold;
            line-height: 1;
        }
        .order-number .sub {
            font-size: 16px;
            margin-top: -5px;
        }
        .box-indicator {
            position: absolute;
            top: 15px;
            right: 10px;
            border: 2px solid black;
            padding: 8px 12px;
            text-align: center;
            width: 75px;
            height: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .box-indicator .title {
            font-size: 16px;
            font-weight: bold;
        }
        .box-indicator .number {
            font-size: 28px;
            font-weight: bold;
            margin-top: 2px;
        }
        .region-indicator {
            position: absolute;
            top: 15px;
            left: 10px;
            border: 2px solid black;
            padding: 8px 12px;
            text-align: center;
            width: 75px;
            height: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .region-indicator .hebrew {
            font-size: 20px;
            font-weight: bold;
            direction: rtl;
        }
        .region-indicator .russian {
            font-size: 14px;
            margin-top: 2px;
        }
        .customer-company {
            position: absolute;
            top: 85px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 13px;
            direction: rtl;
        }
        .customer-name {
            position: absolute;
            top: 103px;
            left: 10%;
            right: 10%;
            width: 80%;
            text-align: center;
            font-size: 13px;
            direction: rtl;
        }
        .customer-city {
            position: absolute;
            top: 121px;
            left: 10%;
            right: 10%;
            width: 80%;
            text-align: center;
            font-size: 11px;
            direction: rtl;
            color: #666;
        }
        .separator {
            position: absolute;
            top: 138px;
            left: 20px;
            right: 20px;
            border-top: 2px solid black;
        }
        .items-section {
            position: absolute;
            top: 148px;
            left: 20px;
            right: 20px;
            bottom: 40px;
        }
        .item {
            border: 1px solid #ccc;
            margin-bottom: 8px;
            padding: 5px;
            height: 55px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .item-quantity {
            font-size: 24px;
            font-weight: bold;
            width: 50px;
            text-align: center;
        }
        .item-quantity-label {
            font-size: 8px;
            text-align: center;
            direction: rtl;
        }
        .item-barcode {
            flex: 1;
            text-align: center;
            font-family: 'Courier New', monospace;
        }
        .item-barcode svg {
            display: block;
            margin: 2px auto;
        }
        .barcode-text {
            font-size: 9px;
            margin-top: 2px;
            text-align: center;
            width: 100%;
        }
        .item-name {
            text-align: right;
            width: 140px;
            padding-right: 5px;
        }
        .item-name-hebrew {
            font-size: 11px;
            font-weight: bold;
            direction: rtl;
        }
        .item-name-russian {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
        }
        .date {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            direction: rtl;
        }
        @media print {
            body {
                background: white;
            }
            .labels-container {
                gap: 0;
            }
            .label {
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    <div class="labels-container">
        ${labelsHTML}
    </div>
</body>
</html>`;

    return html;
  }
}