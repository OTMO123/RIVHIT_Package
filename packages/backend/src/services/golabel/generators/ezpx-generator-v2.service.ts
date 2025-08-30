import { create } from 'xmlbuilder2';
import { ILabelGenerator } from '../interfaces/ILabelGenerator';
import { 
  LabelData, 
  TextElement, 
  BarcodeElement, 
  RectangleElement, 
  LineElement, 
  ImageElement,
  CircleElement 
} from '../types/golabel.types';
import { IApplicationLogger } from '../../../interfaces/ILogger';
import { ConsoleLoggerService } from '../../logging/console.logger.service';

/**
 * EZPX V2 format generator for GoLabel - использует правильный формат DiagramRoot
 * Основан на реальной структуре файлов GoLabel
 */
export class EzpxGeneratorV2Service implements ILabelGenerator {
  private logger: IApplicationLogger;
  
  constructor(logger?: IApplicationLogger) {
    this.logger = logger || new ConsoleLoggerService('EzpxGeneratorV2Service');
  }
  
  getFormat(): string {
    return 'EZPX_V2';
  }
  
  generate(labelData: LabelData): string {
    this.logger.debug('Generating EZPX V2 (DiagramRoot format)', {
      size: labelData.size,
      elements: labelData.elements.length
    });
    
    try {
      this.validate(labelData);
      
      // Используем правильную структуру DiagramRoot
      const doc = create({ version: '1.0', encoding: 'utf-8' })
        .ele('DiagramRoot');
      
      // Основной элемент Diagram с настройками
      const diagram = doc.ele('Diagram')
        .att('Version', '1.00')
        .att('Width', labelData.size.width.toString())
        .att('Height', labelData.size.height.toString())
        .att('Units', 'mm')
        .att('DPI', '200')
        .att('Orientation', '0');
      
      // Страница с элементами
      const page = diagram.ele('Page')
        .att('Width', labelData.size.width.toString())
        .att('Height', labelData.size.height.toString())
        .att('BGColor', '16777215') // White background
        .att('Rotate', '0');
      
      // Добавляем все элементы
      let elementIndex = 1;
      for (const element of labelData.elements) {
        switch (element.type) {
          case 'text':
            this.addTextElement(page, element as TextElement, elementIndex++);
            break;
          case 'barcode':
            this.addBarcodeElement(page, element as BarcodeElement, elementIndex++);
            break;
          case 'rectangle':
            this.addRectangleElement(page, element as RectangleElement, elementIndex++);
            break;
          case 'line':
            this.addLineElement(page, element as LineElement, elementIndex++);
            break;
          default:
            this.logger.warn(`Unsupported element type: ${element.type}`);
        }
      }
      
      // Добавляем настройки принтера
      const printSettings = diagram.ele('PrintSettings');
      printSettings.ele('Printer').txt('GoDEX ZX420i');
      printSettings.ele('Speed').txt((labelData.printerSettings?.speed || 3).toString());
      printSettings.ele('Darkness').txt((labelData.printerSettings?.darkness || 10).toString());
      printSettings.ele('MediaType').txt('1'); // Labels
      printSettings.ele('PrintMethod').txt('0'); // Thermal Transfer
      
      // Возвращаем отформатированный XML
      const xml = doc.end({ prettyPrint: true });
      this.logger.debug('Generated EZPX V2 successfully');
      
      return xml;
      
    } catch (error) {
      this.logger.error('Failed to generate EZPX V2:', error as Error);
      throw error;
    }
  }
  
  private addTextElement(parent: any, element: TextElement, index: number): void {
    const shape = parent.ele('Shape')
      .att('Type', 'Text')
      .att('Name', `Text${index}`)
      .att('Left', element.position.x.toString())
      .att('Top', element.position.y.toString())
      .att('Width', '100')
      .att('Height', '20');
    
    // Настройки кисти и пера
    shape.ele('Brush')
      .att('Color', '0') // Black
      .att('Style', '1');
      
    shape.ele('Pen')
      .att('Color', '0')
      .att('Width', '1');
    
    // Настройки шрифта
    const font = shape.ele('Font')
      .att('Name', element.properties.font || 'Arial')
      .att('Size', (element.properties.size || 12).toString())
      .att('Bold', element.properties.bold ? '1' : '0')
      .att('Italic', element.properties.italic ? '1' : '0')
      .att('Underline', element.properties.underline ? '1' : '0')
      .att('Strikeout', '0');
    
    // Текст
    shape.ele('Text').txt(element.properties.text || '');
    
    // Выравнивание
    shape.ele('Alignment')
      .att('Horizontal', this.getHorizontalAlignment(element.properties.alignment))
      .att('Vertical', '1'); // Center vertical
  }
  
  private addBarcodeElement(parent: any, element: BarcodeElement, index: number): void {
    const shape = parent.ele('Shape')
      .att('Type', 'Barcode')
      .att('Name', `Barcode${index}`)
      .att('Left', element.position.x.toString())
      .att('Top', element.position.y.toString())
      .att('Width', (element.properties.width || 60).toString())
      .att('Height', (element.properties.height || 20).toString());
    
    // Тип штрих-кода
    shape.ele('BarcodeType').txt(this.mapBarcodeType(element.properties.barcodeType || 'Code128'));
    
    // Данные штрих-кода
    shape.ele('BarcodeData').txt(element.properties.data || '');
    
    // Показывать текст
    shape.ele('ShowText').txt(element.properties.showText !== false ? '1' : '0');
    shape.ele('TextPosition').txt(element.properties.textPosition === 'top' ? '1' : '0');
    shape.ele('Checksum').txt('1');
  }
  
  private addRectangleElement(parent: any, element: RectangleElement, index: number): void {
    const shape = parent.ele('Shape')
      .att('Type', 'Rectangle')
      .att('Name', `Rectangle${index}`)
      .att('Left', element.position.x.toString())
      .att('Top', element.position.y.toString())
      .att('Width', (element.properties.width || 50).toString())
      .att('Height', (element.properties.height || 30).toString());
    
    shape.ele('Brush')
      .att('Color', element.properties.fill ? '0' : '16777215')
      .att('Style', element.properties.fill ? '1' : '0');
      
    shape.ele('Pen')
      .att('Color', '0')
      .att('Width', (element.properties.lineWidth || 1).toString());
  }
  
  private addLineElement(parent: any, element: LineElement, index: number): void {
    const shape = parent.ele('Shape')
      .att('Type', 'Line')
      .att('Name', `Line${index}`)
      .att('Left', element.position.x.toString())
      .att('Top', element.position.y.toString())
      .att('Width', (element.properties.endX - element.position.x).toString())
      .att('Height', (element.properties.endY - element.position.y).toString());
    
    shape.ele('Pen')
      .att('Color', '0')
      .att('Width', (element.properties.width || 1).toString());
  }
  
  private mapBarcodeType(type: string): string {
    const mapping: Record<string, string> = {
      'Code128': 'Code128',
      'Code39': 'Code39',
      'EAN13': 'EAN13',
      'EAN8': 'EAN8',
      'UPCA': 'UPCA',
      'QRCode': 'QRCode',
      'DataMatrix': 'DataMatrix'
    };
    
    return mapping[type] || 'Code128';
  }
  
  private getHorizontalAlignment(alignment?: string): string {
    switch (alignment) {
      case 'left': return '0';
      case 'center': return '1';
      case 'right': return '2';
      default: return '0';
    }
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