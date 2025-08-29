import { create } from 'xmlbuilder2';
import { ILabelGenerator } from '../interfaces/ILabelGenerator';
import { 
  LabelData, 
  TextElement, 
  BarcodeElement, 
  RectangleElement, 
  LineElement 
} from '../types/golabel.types';
import { IApplicationLogger } from '../../../interfaces/ILogger';
import { ConsoleLoggerService } from '../../logging/console.logger.service';

/**
 * EZPX PrintJob format generator - правильный формат для GoLabel
 * Основан на реальном файле Label_0.ezpx
 */
export class EzpxPrintJobGeneratorService implements ILabelGenerator {
  private logger: IApplicationLogger;
  private idCounter: number = 0;
  
  constructor(logger?: IApplicationLogger) {
    this.logger = logger || new ConsoleLoggerService('EzpxPrintJobGenerator');
  }
  
  generate(labelData: LabelData): string {
    this.logger.debug('Generating EZPX PrintJob format', {
      size: labelData.size,
      elements: labelData.elements.length
    });
    
    try {
      this.validate(labelData);
      this.idCounter = 0;
      
      // Создаем корневой элемент PrintJob с пространствами имен
      const doc = create({ version: '1.0', encoding: 'utf-8' })
        .ele('PrintJob', {
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema'
        });
      
      // Основные настройки
      doc.ele('GraphicMode').txt('false');
      doc.ele('FormatVersion').txt('1');
      doc.ele('QLabelSDKVersion').txt('1.5.9203.30912');
      doc.ele('GoLabelZoomFactor').txt('0.5');
      
      // Элемент Label
      const label = doc.ele('Label');
      
      // Добавляем обязательные секции (как в оригинале)
      this.addScaleSection(label);
      this.addSerialFormatSection(label);
      this.addVariableSection(label);
      
      // Основная секция с графическими элементами
      const qlabel = label.ele('qlabel');
      
      // Добавляем элементы этикетки
      for (const element of labelData.elements) {
        switch (element.type) {
          case 'text':
            this.addTextElement(qlabel, element as TextElement);
            break;
          case 'barcode':
            this.addBarcodeElement(qlabel, element as BarcodeElement);
            break;
          case 'rectangle':
            this.addRectangleElement(qlabel, element as RectangleElement);
            break;
          case 'line':
            this.addLineElement(qlabel, element as LineElement);
            break;
        }
      }
      
      // Добавляем остальные обязательные поля Label
      label.ele('VariableOpFormat');
      label.ele('VariableOption');
      label.ele('DateFormat').txt('y2-me-dd');
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
      
      // Секция Setup
      this.addSetupSection(doc, labelData);
      
      // Настройки принтера
      doc.ele('DriverName');
      doc.ele('BLE_MAC');
      doc.ele('BLE_Address').txt('0');
      doc.ele('BLE_AutoMTU').txt('true');
      doc.ele('BLE_MTU').txt('20');
      doc.ele('PrinterModel').txt(labelData.printerSettings?.printerName || 'ZX420i');
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
      
      // Возвращаем XML
      const xml = doc.end({ prettyPrint: true });
      this.logger.debug('Generated EZPX PrintJob successfully');
      
      return xml;
      
    } catch (error) {
      this.logger.error('Failed to generate EZPX PrintJob:', error);
      throw error;
    }
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
    // SerialFormat - 100 пустых строк
    const serialFormat = label.ele('SerialFormat');
    for (let i = 0; i < 100; i++) {
      serialFormat.ele('string');
    }
    
    // SerialLeadingCode - 100 нулей
    const serialLeadingCode = label.ele('SerialLeadingCode');
    for (let i = 0; i < 100; i++) {
      serialLeadingCode.ele('int').txt('0');
    }
    
    // SerialCustomSequence - 100 nil строк
    const serialCustomSequence = label.ele('SerialCustomSequence');
    for (let i = 0; i < 100; i++) {
      serialCustomSequence.ele('string', { 'xsi:nil': 'true' });
    }
    
    // bSerialSpecialCarry - 100 false
    const bSerialSpecialCarry = label.ele('bSerialSpecialCarry');
    for (let i = 0; i < 100; i++) {
      bSerialSpecialCarry.ele('boolean').txt('false');
    }
  }
  
  private addVariableSection(label: any): void {
    // VariableFormat - 100 nil строк
    const variableFormat = label.ele('VariableFormat');
    for (let i = 0; i < 100; i++) {
      variableFormat.ele('string', { 'xsi:nil': 'true' });
    }
    
    // VariableDisplayName - 100 nil строк
    const variableDisplayName = label.ele('VariableDisplayName');
    for (let i = 0; i < 100; i++) {
      variableDisplayName.ele('string', { 'xsi:nil': 'true' });
    }
    
    label.ele('UnitPriceType').txt('None');
    label.ele('UnitPrice').txt('0');
    label.ele('TaraType').txt('None');
    label.ele('Tara').txt('0');
  }
  
  private addTextElement(parent: any, element: TextElement): void {
    const shape = parent.ele('GraphicShape', { 
      'xsi:type': 'Text',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'true',
      'Direction': 'Angle0',
      'X': element.position.x.toString(),
      'Y': element.position.y.toString(),
      'Alignment': 'Left',
      'AlignPointX': element.position.x.toString(),
      'AlignPointY': element.position.y.toString(),
      'FontScript': 'Default',
      'TextAlign': element.properties.alignment || 'Left',
      'FontCmd': `${element.properties.font || 'Arial'},${element.properties.size || 12}`,
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
    
    shape.ele('qHitOnCircumferance').txt('false');
    shape.ele('Selected').txt('false');
    shape.ele('iBackground_color').txt('4294967295');
    shape.ele('Id').txt((this.idCounter++).toString());
    shape.ele('ItemLabel').txt(`Text_${this.idCounter}`);
    shape.ele('ObjectDrawMode').txt('FW');
    shape.ele('Name').txt('A');
    shape.ele('GroupID').txt('0');
    shape.ele('GroupSelected').txt('false');
    
    // Добавляем правила обрезки
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
    shape.ele('BoundRectWidth').txt('100');
    shape.ele('DispData').txt(element.properties.text || '');
    shape.ele('bRemovePreZeroAndEmpty').txt('false');
    shape.ele('Data').txt(element.properties.text || '');
    
    const itemInfoList = shape.ele('ItemInfoList');
    const item = itemInfoList.ele('Item');
    item.ele('ItemSymbol').txt('1');
    item.ele('ItemData').txt(element.properties.text || '');
    
    shape.ele('BoundRectHeight').txt('40');
    
    const boundRect = shape.ele('BoundRect');
    const location = boundRect.ele('Location');
    location.ele('X').txt(element.position.x.toString());
    location.ele('Y').txt(element.position.y.toString());
    const size = boundRect.ele('Size');
    size.ele('Width').txt('100');
    size.ele('Height').txt('40');
    boundRect.ele('X').txt(element.position.x.toString());
    boundRect.ele('Y').txt(element.position.y.toString());
    boundRect.ele('Width').txt('100');
    boundRect.ele('Height').txt('40');
    
    shape.ele('NormalRatio').txt('true');
    shape.ele('BTrueType').txt('true');
  }
  
  private addBarcodeElement(parent: any, element: BarcodeElement): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'BarCode',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'true',
      'Direction': 'Angle0',
      'X': element.position.x.toString(),
      'Y': element.position.y.toString(),
      'Alignment': 'Left',
      'AlignPointX': element.position.x.toString(),
      'AlignPointY': element.position.y.toString(),
      'FontScript': 'Default',
      'FontCmd': 'Arial,12',
      'Symbology': this.mapBarcodeType(element.properties.barcodeType || 'Code128'),
      'CaptionAlignment': 'BottomAndLeft',
      'Height': (element.properties.height || 80).toString(),
      'Width': '10',
      'Narrow': '4',
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
    
    // Добавляем общие свойства
    shape.ele('qHitOnCircumferance').txt('false');
    shape.ele('Selected').txt('false');
    shape.ele('iBackground_color').txt('4294967295');
    shape.ele('Id').txt((this.idCounter++).toString());
    shape.ele('ItemLabel').txt(`BarCode_${this.idCounter}`);
    shape.ele('ObjectDrawMode').txt('FW');
    shape.ele('Name').txt('B');
    shape.ele('GroupID').txt('0');
    shape.ele('GroupSelected').txt('false');
    
    // Правила обрезки (как для текста)
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
    shape.ele('BoundRectWidth').txt('200');
    shape.ele('DispData').txt(element.properties.data || '');
    shape.ele('bRemovePreZeroAndEmpty').txt('false');
    shape.ele('Data').txt(element.properties.data || '');
    
    const itemInfoList = shape.ele('ItemInfoList');
    const item = itemInfoList.ele('Item');
    item.ele('ItemSymbol').txt('1');
    item.ele('ItemData').txt(element.properties.data || '');
    
    shape.ele('BoundRectHeight').txt((element.properties.height || 80).toString());
    
    const boundRect = shape.ele('BoundRect');
    const location = boundRect.ele('Location');
    location.ele('X').txt(element.position.x.toString());
    location.ele('Y').txt(element.position.y.toString());
    const size = boundRect.ele('Size');
    size.ele('Width').txt('200');
    size.ele('Height').txt((element.properties.height || 80).toString());
    boundRect.ele('X').txt(element.position.x.toString());
    boundRect.ele('Y').txt(element.position.y.toString());
    boundRect.ele('Width').txt('200');
    boundRect.ele('Height').txt((element.properties.height || 80).toString());
    
    shape.ele('CheckDigitType').txt('MOD_43');
    shape.ele('Use_ITF_T2').txt('true');
    shape.ele('CustomizeGuardBar').txt('false');
    shape.ele('GuardBarHeight').txt('0');
  }
  
  private addRectangleElement(parent: any, element: RectangleElement): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'QRectangle',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': element.properties.fill ? 'true' : 'false',
      'Direction': 'Angle0',
      'X': element.position.x.toString(),
      'Y': element.position.y.toString(),
      'Alignment': 'Left',
      'AlignPointX': element.position.x.toString(),
      'AlignPointY': element.position.y.toString()
    });
    
    shape.ele('qHitOnCircumferance').txt('false');
    shape.ele('Selected').txt('false');
    shape.ele('iBackground_color').txt('4294967295');
    shape.ele('Id').txt((this.idCounter++).toString());
    shape.ele('ItemLabel').txt(`Rectangle_${this.idCounter}`);
    shape.ele('ObjectDrawMode').txt('FW');
    shape.ele('Name').txt('R');
    shape.ele('GroupID').txt('0');
    shape.ele('GroupSelected').txt('false');
    shape.ele('Height').txt((element.properties.height || 100).toString());
    shape.ele('HStroke').txt((element.properties.lineWidth || 4).toString());
    shape.ele('VStroke').txt((element.properties.lineWidth || 4).toString());
    shape.ele('Width').txt((element.properties.width || 100).toString());
  }
  
  private addLineElement(parent: any, element: LineElement): void {
    const shape = parent.ele('GraphicShape', {
      'xsi:type': 'Line',
      'Style': 'Cross',
      'IsPrint': 'true',
      'PageAlignment': 'None',
      'Locked': 'false',
      'bStroke': 'true',
      'bFill': 'true',
      'Direction': 'Angle0',
      'X': element.position.x.toString(),
      'Y': element.position.y.toString(),
      'Alignment': 'Left',
      'AlignPointX': element.position.x.toString(),
      'AlignPointY': element.position.y.toString()
    });
    
    shape.ele('qHitOnCircumferance').txt('false');
    shape.ele('Selected').txt('false');
    shape.ele('iBackground_color').txt('4294967295');
    shape.ele('Id').txt((this.idCounter++).toString());
    shape.ele('ItemLabel').txt(`Line_${this.idCounter}`);
    shape.ele('ObjectDrawMode').txt('FW');
    shape.ele('Name').txt('L');
    shape.ele('GroupID').txt('0');
    shape.ele('GroupSelected').txt('false');
    shape.ele('lineShape').txt('HLine');
    shape.ele('Height').txt((element.properties.lineWidth || 4).toString());
    shape.ele('Operation').txt('111');
    
    // Вычисляем ширину линии
    const width = Math.abs((element.properties.x2 || element.position.x) - element.position.x) ||
                  Math.abs((element.properties.y2 || element.position.y) - element.position.y) || 100;
    shape.ele('Width').txt(width.toString());
  }
  
  private addSetupSection(doc: any, labelData: LabelData): void {
    const setup = doc.ele('Setup', {
      'bInfinityPrint': 'false',
      'LabelLength': labelData.size.height.toString(),
      'LabelWidth': labelData.size.width.toString(),
      'LeftMargin': '0',
      'TopMargin': '0',
      'LabelType': '0',
      'GapLength': '3',
      'FeedLength': '0',
      'ZSign': '45',
      'BlackMark': '3',
      'Position': '0',
      'Speed': (labelData.printerSettings?.speed || 4).toString(),
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
      'Darkness': (labelData.printerSettings?.darkness || 10).toString(),
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
    
    setup.ele('Description').txt('Lang:(en-US) OS:Microsoft Windows NT 10.0.26100.0(Win32NT)');
    setup.ele('UnitType').txt('Mm');
    setup.ele('Dpi').txt('203');
  }
  
  private mapBarcodeType(type: string): string {
    const mapping: Record<string, string> = {
      'Code128': 'Code128',
      'Code39': 'Code39',
      'EAN13': 'Ean13',
      'EAN8': 'Ean8',
      'UPCA': 'UpcA',
      'QRCode': 'QRCode',
      'DataMatrix': 'DataMatrix'
    };
    
    return mapping[type] || 'Code128';
  }
  
  validate(labelData: LabelData): boolean {
    if (!labelData.size || !labelData.size.width || !labelData.size.height) {
      throw new Error('Label size is required');
    }
    
    if (!labelData.elements || labelData.elements.length === 0) {
      throw new Error('At least one element is required');
    }
    
    return true;
  }
  
  getSupportedFeatures(): string[] {
    return [
      'text',
      'barcode',
      'rectangle',
      'line',
      'fonts',
      'alignment',
      'printer-settings'
    ];
  }
}