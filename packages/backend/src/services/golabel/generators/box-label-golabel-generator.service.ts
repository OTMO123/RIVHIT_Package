import { create } from 'xmlbuilder2';
import { ILabelGenerator } from '../interfaces/ILabelGenerator';
import { LabelData } from '../types/golabel.types';
import { IApplicationLogger } from '../../../interfaces/ILogger';
import { ConsoleLoggerService } from '../../logging/console.logger.service';

export interface BoxLabelData {
  orderId: string | number;
  boxNumber: number;
  totalBoxes: number;
  customerName: string;
  customerCity?: string;
  items: BoxItemData[];
  region?: string;
  deliveryDate?: string;
}

export interface BoxItemData {
  name: string;
  nameHebrew?: string;
  nameRussian?: string;
  quantity: number;
  barcode?: string;
  catalogNumber?: string;
}

/**
 * Box Label Generator for GoLabel using PrintJob format
 * Creates properly formatted box labels that match the RIVHIT design
 */
export class BoxLabelGoLabelGeneratorService implements ILabelGenerator {
  private logger: IApplicationLogger;
  private idCounter: number = 0;
  
  // Label dimensions in mm (100mm x 100mm)
  private labelWidth = 100;
  private labelHeight = 100;
  
  // Convert mm to dots (203 DPI)
  private mmToDots(mm: number): number {
    return Math.round(mm * 8); // 203 DPI / 25.4 mm per inch ≈ 8 dots per mm
  }
  
  constructor(logger?: IApplicationLogger) {
    this.logger = logger || new ConsoleLoggerService('BoxLabelGoLabelGenerator');
  }
  
  generate(labelData: LabelData): string {
    throw new Error('Use generateBoxLabel method instead');
  }
  
  validate(labelData: LabelData): boolean {
    return true; // Box label validation is done in generateBoxLabel
  }
  
  getSupportedFeatures(): string[] {
    return ['box-labels', 'hebrew-text', 'multi-items', 'barcodes'];
  }
  
  getFormat(): string {
    return 'EZPX';
  }
  
  generateBoxLabel(boxData: BoxLabelData): string {
    this.logger.debug('Generating box label in PrintJob format', {
      orderId: boxData.orderId,
      boxNumber: boxData.boxNumber,
      totalBoxes: boxData.totalBoxes
    });
    
    try {
      this.idCounter = 0;
      
      // Create PrintJob root element
      const doc = create({ version: '1.0', encoding: 'utf-8' })
        .ele('PrintJob', {
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema'
        });
      
      // Basic settings
      doc.ele('GraphicMode').txt('false');
      doc.ele('FormatVersion').txt('1');
      doc.ele('QLabelSDKVersion').txt('1.5.9203.30912');
      doc.ele('GoLabelZoomFactor').txt('0.5');
      
      const label = doc.ele('Label');
      
      // Add required sections
      this.addScaleSection(label);
      this.addSerialFormatSection(label);
      this.addVariableSection(label);
      
      // Main label content
      const qlabel = label.ele('qlabel');
      
      // Add border rectangle
      this.addBorderRectangle(qlabel);
      
      // Add region box (top left)
      this.addRegionBox(qlabel, boxData.region || 'אזור');
      
      // Add box number (top right)
      this.addBoxNumberBox(qlabel, boxData.boxNumber, boxData.totalBoxes);
      
      // Add order number (large, centered)
      this.addOrderNumber(qlabel, boxData.orderId);
      
      // Add customer name
      this.addCustomerName(qlabel, boxData.customerName);
      
      // Add separator line
      this.addSeparatorLine(qlabel);
      
      // Add items
      this.addItems(qlabel, boxData.items);
      
      // Add date at bottom
      if (boxData.deliveryDate) {
        this.addDate(qlabel, boxData.deliveryDate);
      }
      
      // Complete Label section
      this.completeLabel(label);
      
      // Add Setup section
      this.addSetupSection(doc);
      
      // Add printer configuration
      this.addPrinterConfig(doc);
      
      // Return formatted XML
      const xml = doc.end({ prettyPrint: true });
      this.logger.debug('Generated box label EZPX successfully');
      
      return xml;
      
    } catch (error) {
      this.logger.error('Failed to generate box label EZPX:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  private addBorderRectangle(parent: any): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'QRectangle',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'false',
      'Direction': 'Angle0',
      'X': '20',
      'Y': '20',
      'Alignment': 'Left',
      'AlignPointX': '20',
      'AlignPointY': '20'
    });
    
    this.addShapeDefaults(shape, 'Rectangle_Border');
    shape.ele('Height').txt(String(this.mmToDots(96)));
    shape.ele('HStroke').txt('8'); // Thick border
    shape.ele('VStroke').txt('8');
    shape.ele('Width').txt(String(this.mmToDots(96)));
  }
  
  private addRegionBox(parent: any, region: string): void {
    // Box rectangle
    const boxShape = parent.ele('GraphicShape', {
      'xsi:type': 'QRectangle',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'false',
      'Direction': 'Angle0',
      'X': String(this.mmToDots(5)),
      'Y': String(this.mmToDots(5)),
      'Alignment': 'Left',
      'AlignPointX': String(this.mmToDots(5)),
      'AlignPointY': String(this.mmToDots(5))
    });
    
    this.addShapeDefaults(boxShape, 'Rectangle_Region');
    boxShape.ele('Height').txt(String(this.mmToDots(15)));
    boxShape.ele('HStroke').txt('4');
    boxShape.ele('VStroke').txt('4');
    boxShape.ele('Width').txt(String(this.mmToDots(25)));
    
    // Region text
    const regionText = this.getRegionText(region);
    const regionLines = regionText.split('\n');
    
    // Hebrew text
    this.addText(parent, {
      x: this.mmToDots(17.5), // Center of box
      y: this.mmToDots(10),
      text: regionLines[0],
      fontSize: 24,
      bold: true,
      alignment: 'center'
    });
    
    // Russian text (if exists)
    if (regionLines[1]) {
      this.addText(parent, {
        x: this.mmToDots(17.5),
        y: this.mmToDots(15),
        text: regionLines[1],
        fontSize: 20,
        alignment: 'center'
      });
    }
  }
  
  private addBoxNumberBox(parent: any, boxNumber: number, totalBoxes: number): void {
    // Box rectangle
    const boxShape = parent.ele('GraphicShape', {
      'xsi:type': 'QRectangle',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'false',
      'Direction': 'Angle0',
      'X': String(this.mmToDots(70)),
      'Y': String(this.mmToDots(5)),
      'Alignment': 'Left',
      'AlignPointX': String(this.mmToDots(70)),
      'AlignPointY': String(this.mmToDots(5))
    });
    
    this.addShapeDefaults(boxShape, 'Rectangle_BoxNum');
    boxShape.ele('Height').txt(String(this.mmToDots(15)));
    boxShape.ele('HStroke').txt('4');
    boxShape.ele('VStroke').txt('4');
    boxShape.ele('Width').txt(String(this.mmToDots(25)));
    
    // "Box" text
    this.addText(parent, {
      x: this.mmToDots(82.5),
      y: this.mmToDots(9),
      text: 'Box',
      fontSize: 24,
      alignment: 'center'
    });
    
    // Box number
    this.addText(parent, {
      x: this.mmToDots(82.5),
      y: this.mmToDots(15),
      text: `${boxNumber}/${totalBoxes}`,
      fontSize: 32,
      bold: true,
      alignment: 'center'
    });
  }
  
  private addOrderNumber(parent: any, orderId: string | number): void {
    // Large order number
    this.addText(parent, {
      x: this.mmToDots(50),
      y: this.mmToDots(15),
      text: String(orderId),
      fontSize: 72,
      bold: true,
      alignment: 'center'
    });
    
    // "Order" text below
    this.addText(parent, {
      x: this.mmToDots(50),
      y: this.mmToDots(20),
      text: 'Order',
      fontSize: 28,
      alignment: 'center'
    });
  }
  
  private addCustomerName(parent: any, customerName: string): void {
    this.addText(parent, {
      x: this.mmToDots(50),
      y: this.mmToDots(25),
      text: customerName,
      fontSize: 24,
      alignment: 'center'
    });
  }
  
  private addSeparatorLine(parent: any): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'Line',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'true',
      'Direction': 'Angle0',
      'X': String(this.mmToDots(5)),
      'Y': String(this.mmToDots(30)),
      'Alignment': 'Left',
      'AlignPointX': String(this.mmToDots(5)),
      'AlignPointY': String(this.mmToDots(30))
    });
    
    this.addShapeDefaults(shape, 'Line_Separator');
    shape.ele('lineShape').txt('HLine');
    shape.ele('Height').txt('3');
    shape.ele('Operation').txt('111');
    shape.ele('Width').txt(String(this.mmToDots(90)));
  }
  
  private addItems(parent: any, items: BoxItemData[]): void {
    let yPosition = 35;
    const maxItems = 3; // Maximum items to show on label
    const itemsToShow = items.slice(0, maxItems);
    
    itemsToShow.forEach((item, index) => {
      // Item box
      const itemBox = parent.ele('GraphicShape', {
        'xsi:type': 'QRectangle',
        'Style': 'Cross',
        'IsPrint': 'true',
        'PageAlignment': 'None',
        'Locked': 'false',
        'bStroke': 'true',
        'bFill': 'false',
        'Direction': 'Angle0',
        'X': String(this.mmToDots(8)),
        'Y': String(this.mmToDots(yPosition)),
        'Alignment': 'Left',
        'AlignPointX': String(this.mmToDots(8)),
        'AlignPointY': String(this.mmToDots(yPosition))
      });
      
      this.addShapeDefaults(itemBox, `Rectangle_Item_${index}`);
      itemBox.ele('Height').txt(String(this.mmToDots(18)));
      itemBox.ele('HStroke').txt('2');
      itemBox.ele('VStroke').txt('2');
      itemBox.ele('Width').txt(String(this.mmToDots(84)));
      
      // Quantity
      this.addText(parent, {
        x: this.mmToDots(15),
        y: this.mmToDots(yPosition + 8),
        text: String(item.quantity),
        fontSize: 36,
        bold: true,
        alignment: 'center'
      });
      
      this.addText(parent, {
        x: this.mmToDots(15),
        y: this.mmToDots(yPosition + 12),
        text: 'כמות',
        fontSize: 18,
        alignment: 'center'
      });
      
      // Item barcode
      if (item.barcode) {
        this.addBarcode(parent, {
          x: this.mmToDots(30),
          y: this.mmToDots(yPosition + 2),
          data: item.barcode,
          height: this.mmToDots(14),
          showText: false
        });
      }
      
      // Item names (Hebrew and Russian)
      const itemName = item.nameHebrew || item.name || 'מוצר';
      this.addText(parent, {
        x: this.mmToDots(88),
        y: this.mmToDots(yPosition + 6),
        text: itemName,
        fontSize: 24,
        bold: true,
        alignment: 'right'
      });
      
      if (item.nameRussian) {
        this.addText(parent, {
          x: this.mmToDots(88),
          y: this.mmToDots(yPosition + 11),
          text: item.nameRussian,
          fontSize: 20,
          alignment: 'right'
        });
      }
      
      yPosition += 20;
    });
    
    // Show remaining items count
    if (items.length > maxItems) {
      this.addText(parent, {
        x: this.mmToDots(50),
        y: this.mmToDots(yPosition + 5),
        text: `+ עוד ${items.length - maxItems} פריטים`,
        fontSize: 20,
        italic: true,
        alignment: 'center'
      });
    }
  }
  
  private addDate(parent: any, date: string): void {
    this.addText(parent, {
      x: this.mmToDots(50),
      y: this.mmToDots(95),
      text: `תאריך: ${date}`,
      fontSize: 20,
      alignment: 'center'
    });
  }
  
  private addText(parent: any, options: {
    x: number;
    y: number;
    text: string;
    fontSize: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: string;
  }): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'Text',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'true',
      'Direction': 'Angle0',
      'X': String(options.x),
      'Y': String(options.y),
      'Alignment': 'Left',
      'AlignPointX': String(options.x),
      'AlignPointY': String(options.y),
      'FontScript': 'Default',
      'TextAlign': 'Left',
      'FontCmd': `Arial,${options.fontSize}`,
      'FontType': 'BuiltIn_Bitmap_Font',
      'TextSpace': '0',
      'Encoding': 'Default',
      'FontId': 'Default',
      'FontHeight': '1',
      'FontWidth': '1',
      'IsInverse': 'false',
      'IsUTF8': 'true',
      'IsCheckDigit': 'false',
      'UsePrinterClock': 'true'
    });
    
    this.addTextDefaults(shape, `Text_${this.idCounter}`, options.text);
  }
  
  private addBarcode(parent: any, options: {
    x: number;
    y: number;
    data: string;
    height: number;
    showText?: boolean;
  }): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'BarCode',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'true',
      'Direction': 'Angle0',
      'X': String(options.x),
      'Y': String(options.y),
      'Alignment': 'Left',
      'AlignPointX': String(options.x),
      'AlignPointY': String(options.y),
      'FontScript': 'Default',
      'FontCmd': 'Arial,12',
      'Symbology': 'Code128',
      'CaptionAlignment': 'BottomAndLeft',
      'Height': String(options.height),
      'Width': '10',
      'Narrow': '3',
      'BearerBarStyle': '0',
      'BearerBarWidth': '5',
      'QuietZoneWidth': '9',
      'Offset': '1',
      'bDisplayChecksum': 'false',
      'bDisplayStartStopChar': 'false',
      'bBuiltinFont': 'true',
      'bSetBuiltinFontSize': 'false',
      'Code128Subset': 'Auto'
    });
    
    this.addBarcodeDefaults(shape, `Barcode_${this.idCounter}`, options.data, options.height);
  }
  
  private addShapeDefaults(shape: any, itemLabel: string): void {
    shape.ele('qHitOnCircumferance').txt('false');
    shape.ele('Selected').txt('false');
    shape.ele('iBackground_color').txt('4294967295');
    shape.ele('Id').txt((this.idCounter++).toString());
    shape.ele('ItemLabel').txt(itemLabel);
    shape.ele('ObjectDrawMode').txt('FW');
    shape.ele('Name').txt(itemLabel.charAt(0));
    shape.ele('GroupID').txt('0');
    shape.ele('GroupSelected').txt('false');
  }
  
  private addTextDefaults(shape: any, itemLabel: string, text: string): void {
    this.addShapeDefaults(shape, itemLabel);
    
    const truncateRule = shape.ele('CharTruncateRule');
    truncateRule.ele('TrimLeft').txt('false');
    truncateRule.ele('TrimRight').txt('false');
    truncateRule.ele('RemoveCharLeft').txt('false');
    truncateRule.ele('RemoveCharLeftNo').txt('0');
    truncateRule.ele('RemoveCharRight').txt('false');
    truncateRule.ele('RemoveCharRightNo').txt('0');
    truncateRule.ele('KeepCharLeft').txt('false');
    truncateRule.ele('KeepCharLeftNo').txt('6');
    truncateRule.ele('KeepCharRight').txt('false');
    truncateRule.ele('KeepCharRightNo').txt('6');
    truncateRule.ele('RemoveDotZero').txt('false');
    
    shape.ele('bReplaceSpecialCharFromDB').txt('false');
    shape.ele('CharFilterRule').txt('None');
    shape.ele('LinkMode').txt('OriginalData');
    shape.ele('GraphicMode').txt('false');
    shape.ele('ReplaceInfoItems');
    shape.ele('FormatType').txt('None');
    shape.ele('P1');
    shape.ele('P2');
    shape.ele('P3');
    shape.ele('P4');
    shape.ele('Culture').txt('he-IL');
    shape.ele('calendar').txt('GregorianCalendar');
    shape.ele('GetAiFromDigitalLink').txt('false');
    shape.ele('DataField').txt('None');
    shape.ele('Prompt').txt('None');
    shape.ele('BoundRectWidth').txt('200');
    shape.ele('DispData').txt(text);
    shape.ele('bRemovePreZeroAndEmpty').txt('false');
    shape.ele('Data').txt(text);
    
    const itemInfoList = shape.ele('ItemInfoList');
    const item = itemInfoList.ele('Item');
    item.ele('ItemSymbol').txt('1');
    item.ele('ItemData').txt(text);
    
    shape.ele('BoundRectHeight').txt('40');
    
    const boundRect = shape.ele('BoundRect');
    const location = boundRect.ele('Location');
    location.ele('X').txt(shape.att('X'));
    location.ele('Y').txt(shape.att('Y'));
    const size = boundRect.ele('Size');
    size.ele('Width').txt('200');
    size.ele('Height').txt('40');
    boundRect.ele('X').txt(shape.att('X'));
    boundRect.ele('Y').txt(shape.att('Y'));
    boundRect.ele('Width').txt('200');
    boundRect.ele('Height').txt('40');
    
    shape.ele('NormalRatio').txt('true');
    shape.ele('BTrueType').txt('true');
  }
  
  private addBarcodeDefaults(shape: any, itemLabel: string, data: string, height: number): void {
    this.addShapeDefaults(shape, itemLabel);
    
    const truncateRule = shape.ele('CharTruncateRule');
    truncateRule.ele('TrimLeft').txt('false');
    truncateRule.ele('TrimRight').txt('false');
    truncateRule.ele('RemoveCharLeft').txt('false');
    truncateRule.ele('RemoveCharLeftNo').txt('0');
    truncateRule.ele('RemoveCharRight').txt('false');
    truncateRule.ele('RemoveCharRightNo').txt('0');
    truncateRule.ele('KeepCharLeft').txt('false');
    truncateRule.ele('KeepCharLeftNo').txt('6');
    truncateRule.ele('KeepCharRight').txt('false');
    truncateRule.ele('KeepCharRightNo').txt('6');
    truncateRule.ele('RemoveDotZero').txt('false');
    
    shape.ele('bReplaceSpecialCharFromDB').txt('false');
    shape.ele('CharFilterRule').txt('None');
    shape.ele('LinkMode').txt('OriginalData');
    shape.ele('GraphicMode').txt('false');
    shape.ele('ReplaceInfoItems');
    shape.ele('FormatType').txt('None');
    shape.ele('P1');
    shape.ele('P2');
    shape.ele('P3');
    shape.ele('P4');
    shape.ele('Culture').txt('en-US');
    shape.ele('calendar').txt('GregorianCalendar');
    shape.ele('GetAiFromDigitalLink').txt('false');
    shape.ele('DataField').txt('None');
    shape.ele('Prompt').txt('None');
    shape.ele('BoundRectWidth').txt('300');
    shape.ele('DispData').txt(data);
    shape.ele('bRemovePreZeroAndEmpty').txt('false');
    shape.ele('Data').txt(data);
    
    const itemInfoList = shape.ele('ItemInfoList');
    const item = itemInfoList.ele('Item');
    item.ele('ItemSymbol').txt('1');
    item.ele('ItemData').txt(data);
    
    shape.ele('BoundRectHeight').txt(String(height));
    
    const boundRect = shape.ele('BoundRect');
    const location = boundRect.ele('Location');
    location.ele('X').txt(shape.att('X'));
    location.ele('Y').txt(shape.att('Y'));
    const size = boundRect.ele('Size');
    size.ele('Width').txt('300');
    size.ele('Height').txt(String(height));
    boundRect.ele('X').txt(shape.att('X'));
    boundRect.ele('Y').txt(shape.att('Y'));
    boundRect.ele('Width').txt('300');
    boundRect.ele('Height').txt(String(height));
    
    shape.ele('CheckDigitType').txt('MOD_43');
    shape.ele('Use_ITF_T2').txt('true');
    shape.ele('CustomizeGuardBar').txt('false');
    shape.ele('GuardBarHeight').txt('0');
  }
  
  private addScaleSection(label: any): void {
    const scale = label.ele('Scale');
    scale.ele('ComName').txt('COM1');
    scale.ele('Baudrate').txt('9600');
    scale.ele('Parity').txt('N');
    scale.ele('DataBit').txt('8');
    scale.ele('StopBit').txt('1');
  }
  
  private addSerialFormatSection(label: any): void {
    const serialFormat = label.ele('SerialFormat');
    for (let i = 0; i < 100; i++) {
      serialFormat.ele('string');
    }
    
    const serialLeadingCode = label.ele('SerialLeadingCode');
    for (let i = 0; i < 100; i++) {
      serialLeadingCode.ele('int').txt('0');
    }
    
    const serialCustomSequence = label.ele('SerialCustomSequence');
    for (let i = 0; i < 100; i++) {
      serialCustomSequence.ele('string', { 'xsi:nil': 'true' });
    }
    
    const bSerialSpecialCarry = label.ele('bSerialSpecialCarry');
    for (let i = 0; i < 100; i++) {
      bSerialSpecialCarry.ele('boolean').txt('false');
    }
  }
  
  private addVariableSection(label: any): void {
    const variableFormat = label.ele('VariableFormat');
    for (let i = 0; i < 100; i++) {
      variableFormat.ele('string', { 'xsi:nil': 'true' });
    }
    
    const variableDisplayName = label.ele('VariableDisplayName');
    for (let i = 0; i < 100; i++) {
      variableDisplayName.ele('string', { 'xsi:nil': 'true' });
    }
    
    label.ele('UnitPriceType').txt('None');
    label.ele('UnitPrice').txt('0');
    label.ele('TaraType').txt('None');
    label.ele('Tara').txt('0');
  }
  
  private completeLabel(label: any): void {
    label.ele('VariableOpFormat');
    label.ele('VariableOption');
    label.ele('DateFormat').txt('dd-mm-y2');
    label.ele('TimeFormat').txt('h:m:s');
    label.ele('DataBaseFormat').txt('None');
    label.ele('DataBaseFilePath');
    label.ele('DataBaseSelection');
    label.ele('UserID');
    label.ele('Password').txt('zhsTbm6nT9o+RQurpwH5Hw==');
    label.ele('EncryptPwd').txt('true');
    label.ele('DatabaseNoHeader').txt('false');
    label.ele('IntegratedSecurity').txt('false');
    label.ele('RowIndex').txt('0');
  }
  
  private addSetupSection(doc: any): void {
    const setup = doc.ele('Setup', {
      'bInfinityPrint': 'false',
      'LabelLength': String(this.labelHeight),
      'LabelWidth': String(this.labelWidth),
      'LeftMargin': '0',
      'TopMargin': '0',
      'LabelType': '0',
      'GapLength': '3',
      'FeedLength': '0',
      'ZSign': '45',
      'BlackMark': '3',
      'Position': '0',
      'Speed': '4',
      'Copy': '1',
      'bCopyDataBase': 'false',
      'CopyField': 'None',
      'Stripper': '0',
      'LabelsPerCut': '0',
      'DoubleCut_Enable': 'false',
      'DoubleCut_OffsetLen': '0',
      'DoubleCut_FirstCutMode': '1',
      'Rotate180': '255',
      'Stop': '12',
      'Darkness': '10',
      'Number': '1',
      'bCutDataBase': 'false',
      'bBatchCut': 'false',
      'bNumberDataBase': 'false',
      'NumberField': 'None',
      'PageDirection': 'Portrait',
      'PrintMode': '1',
      'bUsePrinterRFIDCfg': 'true',
      'PowerRFID': '10',
      'LengthRFID': '0',
      'RetryRFID': '3',
      'DrawMode': '0'
    });
    
    const layout = setup.ele('Layout', {
      'Shape': '0',
      'AcrossType': 'Copied',
      'PageDirection': 'Portrait',
      'HorAcross': '1',
      'VerAcross': '1',
      'HorGap': '0',
      'VerGap': '0',
      'HorAcrossMode1': '1',
      'VerAcrossMode1': '1',
      'LabelMode': '0',
      'HorGapMode1': '0',
      'VerGapMode1': '0',
      'BottomMargin': '0',
      'RightMargin': '0'
    });
    
    setup.ele('Description').txt('Lang:(he-IL) Box Label for RIVHIT');
    setup.ele('UnitType').txt('Mm');
    setup.ele('Dpi').txt('203');
  }
  
  private addPrinterConfig(doc: any): void {
    doc.ele('DriverName');
    doc.ele('BLE_MAC');
    doc.ele('BLE_Address').txt('0');
    doc.ele('BLE_AutoMTU').txt('true');
    doc.ele('BLE_MTU').txt('20');
    doc.ele('PrinterModel').txt('ZX420i');
    doc.ele('PrinterLanguage').txt('EZPL');
    doc.ele('USBName');
    doc.ele('COMName');
    doc.ele('CommunicationType').txt('USB');
    doc.ele('NetworkIPAddress').txt('0');
    doc.ele('NetworkPort').txt('9100');
    doc.ele('BaudRate').txt('9600');
    doc.ele('ComSettings').txt('N81');
    doc.ele('StandaloneDbSearchKey');
    doc.ele('StandaloneDbEnable').txt('false');
  }
  
  private getRegionText(region: string): string {
    const regionMap: { [key: string]: string } = {
      'south1': 'דרום 1\nЮг 1',
      'south2': 'דרום 2\nЮг 2',
      'north1': 'צפון 1\nСевер 1',
      'north2': 'צפון 2\nСевер 2'
    };
    return regionMap[region] || 'אזור\nРегион';
  }
}