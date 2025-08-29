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
import { ILogger } from '../../interfaces/ILogger';
import { ConsoleLoggerService } from '../../logging/console.logger.service';

/**
 * EZPX format generator for GoLabel
 */
export class EzpxGeneratorService implements ILabelGenerator {
  private logger: ILogger;
  
  constructor(logger?: ILogger) {
    this.logger = logger || new ConsoleLoggerService('EzpxGeneratorService');
  }
  
  generate(labelData: LabelData): string {
    this.logger.debug('Generating EZPX for label', {
      size: labelData.size,
      elements: labelData.elements.length,
      variables: labelData.variables?.length || 0
    });
    
    try {
      this.validate(labelData);
      
      const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('Label')
        .att('Version', '1.0')
        .att('xmlns', 'http://www.godex.com/GCL');
      
      // Add metadata
      this.addMetadata(doc);
      
      // Add label properties
      this.addProperties(doc, labelData);
      
      // Add elements
      this.addElements(doc, labelData);
      
      // Add variables
      if (labelData.variables?.length) {
        this.addVariables(doc, labelData.variables);
      }
      
      // Add data sources if needed
      this.addDataSources(doc, labelData);
      
      const xml = doc.end({ prettyPrint: true });
      
      this.logger.debug('Generated EZPX XML', {
        length: xml.length
      });
      
      return xml;
    } catch (error) {
      this.logger.error('Failed to generate EZPX:', error);
      throw error;
    }
  }
  
  private addMetadata(doc: any): void {
    const metadata = doc.ele('Metadata');
    metadata.ele('Creator').txt('RIVHIT Packing System');
    metadata.ele('CreateDate').txt(new Date().toISOString());
    metadata.ele('Software').txt('GoLabel Integration v1.0');
  }
  
  private addProperties(doc: any, labelData: LabelData): void {
    const properties = doc.ele('Properties');
    
    // Label size
    properties.ele('Size')
      .att('Width', labelData.size.width)
      .att('Height', labelData.size.height)
      .att('Units', 'mm');
    
    // Printer settings
    const printerSettings = properties.ele('PrinterSettings');
    const settings = labelData.printerSettings || {};
    
    printerSettings
      .att('Speed', settings.speed || 4)
      .att('Darkness', settings.darkness || 10)
      .att('PrintMode', settings.printMode || 'TT')
      .att('MediaType', settings.mediaType || 'gap');
    
    if (settings.gapHeight) {
      printerSettings.att('GapHeight', settings.gapHeight);
    }
    
    // Label settings
    properties.ele('LabelSettings')
      .att('Orientation', 'Portrait')
      .att('Mirror', 'false')
      .att('Negative', 'false');
  }
  
  private addElements(doc: any, labelData: LabelData): void {
    const elements = doc.ele('Elements');
    
    labelData.elements.forEach((element, index) => {
      switch (element.type) {
        case 'text':
          this.addTextElement(elements, element as TextElement, index);
          break;
          
        case 'barcode':
          this.addBarcodeElement(elements, element as BarcodeElement, index);
          break;
          
        case 'rectangle':
          this.addRectangleElement(elements, element as RectangleElement, index);
          break;
          
        case 'line':
          this.addLineElement(elements, element as LineElement, index);
          break;
          
        case 'image':
          this.addImageElement(elements, element as ImageElement, index);
          break;
          
        case 'circle':
          this.addCircleElement(elements, element as CircleElement, index);
          break;
          
        default:
          this.logger.warn(`Unknown element type: ${element.type}`);
      }
    });
  }
  
  private addTextElement(parent: any, element: TextElement, index: number): void {
    const text = parent.ele('Text')
      .att('ID', `text_${index}`)
      .att('X', element.position.x)
      .att('Y', element.position.y);
    
    // Text properties
    const props = element.properties;
    text.att('Font', props.font || 'Arial');
    text.att('Size', props.size || 12);
    
    if (props.bold) text.att('Bold', 'true');
    if (props.italic) text.att('Italic', 'true');
    if (props.underline) text.att('Underline', 'true');
    
    if (props.rotation) text.att('Rotation', props.rotation);
    if (props.alignment) text.att('Alignment', props.alignment);
    if (props.color) text.att('Color', props.color);
    
    // Text content (handle variables)
    const content = this.processVariableText(props.text);
    text.ele('Value').txt(content);
  }
  
  private addBarcodeElement(parent: any, element: BarcodeElement, index: number): void {
    const barcode = parent.ele('Barcode')
      .att('ID', `barcode_${index}`)
      .att('X', element.position.x)
      .att('Y', element.position.y);
    
    const props = element.properties;
    barcode.att('Type', this.mapBarcodeType(props.barcodeType));
    barcode.att('Height', props.height || 50);
    
    if (props.width) barcode.att('ModuleWidth', props.width);
    if (props.rotation) barcode.att('Rotation', props.rotation);
    
    barcode.att('ShowText', props.showText !== false ? 'true' : 'false');
    if (props.textPosition && props.showText !== false) {
      barcode.att('TextPosition', props.textPosition);
    }
    
    // Barcode data (handle variables)
    const data = this.processVariableText(props.data);
    barcode.ele('Value').txt(data);
  }
  
  private addRectangleElement(parent: any, element: RectangleElement, index: number): void {
    const rect = parent.ele('Rectangle')
      .att('ID', `rect_${index}`)
      .att('X', element.position.x)
      .att('Y', element.position.y)
      .att('Width', element.properties.width)
      .att('Height', element.properties.height);
    
    const props = element.properties;
    rect.att('LineWidth', props.lineWidth || 1);
    rect.att('Fill', props.fill ? 'true' : 'false');
    
    if (props.color) rect.att('Color', props.color);
    if (props.radius) rect.att('CornerRadius', props.radius);
  }
  
  private addLineElement(parent: any, element: LineElement, index: number): void {
    const line = parent.ele('Line')
      .att('ID', `line_${index}`)
      .att('X1', element.position.x)
      .att('Y1', element.position.y)
      .att('X2', element.properties.endX)
      .att('Y2', element.properties.endY);
    
    const props = element.properties;
    line.att('Width', props.width || 1);
    
    if (props.color) line.att('Color', props.color);
    if (props.style) line.att('Style', props.style);
  }
  
  private addImageElement(parent: any, element: ImageElement, index: number): void {
    const image = parent.ele('Image')
      .att('ID', `image_${index}`)
      .att('X', element.position.x)
      .att('Y', element.position.y);
    
    const props = element.properties;
    
    if (props.width) image.att('Width', props.width);
    if (props.height) image.att('Height', props.height);
    
    image.att('KeepAspectRatio', props.keepAspectRatio !== false ? 'true' : 'false');
    image.att('Dithering', props.dithering ? 'true' : 'false');
    
    // Image data (file path or base64)
    if (props.data.startsWith('data:')) {
      // Base64 image
      const base64Data = props.data.split(',')[1];
      image.ele('Data').att('Encoding', 'Base64').txt(base64Data);
    } else {
      // File path
      image.ele('Path').txt(props.data);
    }
  }
  
  private addCircleElement(parent: any, element: CircleElement, index: number): void {
    const circle = parent.ele('Circle')
      .att('ID', `circle_${index}`)
      .att('CenterX', element.position.x)
      .att('CenterY', element.position.y)
      .att('Radius', element.properties.radius);
    
    const props = element.properties;
    circle.att('LineWidth', props.lineWidth || 1);
    circle.att('Fill', props.fill ? 'true' : 'false');
    
    if (props.color) circle.att('Color', props.color);
  }
  
  private addVariables(doc: any, variables: any[]): void {
    const vars = doc.ele('Variables');
    
    variables.forEach((variable, index) => {
      const varElement = vars.ele('Variable')
        .att('ID', `V${index.toString().padStart(2, '0')}`)
        .att('Name', variable.name);
      
      if (variable.defaultValue) {
        varElement.att('DefaultValue', variable.defaultValue);
      }
      
      if (variable.prompt) {
        varElement.att('Prompt', variable.prompt);
      }
      
      if (variable.format) {
        varElement.att('Format', variable.format);
      }
      
      // Variable type detection
      const type = this.detectVariableType(variable.defaultValue);
      varElement.att('Type', type);
    });
  }
  
  private addDataSources(doc: any, labelData: LabelData): void {
    // Add data sources if any elements use database fields
    const hasDataFields = labelData.elements.some(element => 
      element.properties.text?.includes('${DB.') ||
      element.properties.data?.includes('${DB.')
    );
    
    if (hasDataFields) {
      const dataSources = doc.ele('DataSources');
      
      // Add default database source
      dataSources.ele('DataSource')
        .att('ID', 'db1')
        .att('Type', 'Database')
        .ele('ConnectionString')
        .txt('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=data.mdb');
    }
  }
  
  private processVariableText(text: string): string {
    // Convert ${V00} format to GoLabel format
    return text.replace(/\$\{(\w+)\}/g, (match, varName) => {
      if (varName.startsWith('V')) {
        return `$(${varName})`;
      } else {
        // Convert named variables to V00 format
        return `$(V00)`; // TODO: Map variable names to indices
      }
    });
  }
  
  private mapBarcodeType(type: string): string {
    const typeMap: Record<string, string> = {
      'Code128': 'Code128Auto',
      'Code39': 'Code39',
      'EAN13': 'EAN13',
      'EAN8': 'EAN8',
      'UPC-A': 'UPCA',
      'QRCode': 'QRCode',
      'DataMatrix': 'DataMatrix',
      'PDF417': 'PDF417',
      'ITF': 'Interleaved2of5'
    };
    
    return typeMap[type] || type;
  }
  
  private detectVariableType(value: string): string {
    if (!value) return 'String';
    
    if (/^\d+$/.test(value)) return 'Number';
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'Date';
    if (/^\d{2}:\d{2}/.test(value)) return 'Time';
    
    return 'String';
  }
  
  validate(labelData: LabelData): boolean {
    if (!labelData.size || !labelData.size.width || !labelData.size.height) {
      throw new Error('Label size is required');
    }
    
    if (labelData.size.width <= 0 || labelData.size.height <= 0) {
      throw new Error('Label size must be positive');
    }
    
    if (!Array.isArray(labelData.elements)) {
      throw new Error('Label elements must be an array');
    }
    
    // Validate each element
    labelData.elements.forEach((element, index) => {
      if (!element.type) {
        throw new Error(`Element ${index} missing type`);
      }
      
      if (!element.position || 
          element.position.x === undefined || 
          element.position.y === undefined) {
        throw new Error(`Element ${index} missing position`);
      }
      
      // Type-specific validation
      switch (element.type) {
        case 'text':
          if (!element.properties.text) {
            throw new Error(`Text element ${index} missing text content`);
          }
          break;
          
        case 'barcode':
          if (!element.properties.data) {
            throw new Error(`Barcode element ${index} missing data`);
          }
          break;
          
        case 'rectangle':
          if (!element.properties.width || !element.properties.height) {
            throw new Error(`Rectangle element ${index} missing dimensions`);
          }
          break;
          
        case 'line':
          if (element.properties.endX === undefined || 
              element.properties.endY === undefined) {
            throw new Error(`Line element ${index} missing end coordinates`);
          }
          break;
          
        case 'image':
          if (!element.properties.data) {
            throw new Error(`Image element ${index} missing data`);
          }
          break;
          
        case 'circle':
          if (!element.properties.radius) {
            throw new Error(`Circle element ${index} missing radius`);
          }
          break;
      }
    });
    
    return true;
  }
  
  getSupportedFeatures(): string[] {
    return [
      'text',
      'barcode',
      'rectangle',
      'line',
      'image',
      'circle',
      'variables',
      'rotation',
      'colors',
      'fonts',
      'database'
    ];
  }
  
  getFormat(): string {
    return 'EZPX';
  }
}