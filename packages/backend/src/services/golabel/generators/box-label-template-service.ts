import * as fs from 'fs';
import * as path from 'path';
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
 * Box Label Template Service - Uses pre-made EZPX template with variable substitution
 */
export class BoxLabelTemplateService {
  private logger: IApplicationLogger;
  private templatePath: string;
  
  constructor(logger?: IApplicationLogger) {
    this.logger = logger || new ConsoleLoggerService('BoxLabelTemplateService');
    this.templatePath = path.join(process.cwd(), '..', '..', 'docs', 'box_label_example.ezpx');
  }
  
  /**
   * Generate box label by replacing variables in template
   */
  generateBoxLabel(boxData: BoxLabelData): string {
    this.logger.debug('Generating box label from template', {
      orderId: boxData.orderId,
      boxNumber: boxData.boxNumber,
      totalBoxes: boxData.totalBoxes
    });
    
    try {
      // Read template
      let template = fs.readFileSync(this.templatePath, 'utf8');
      
      // Replace order ID (38987 in template - appears once as the main order number)
      template = template.replace(/<Data>38987<\/Data>/, `<Data>${boxData.orderId}</Data>`);
      template = template.replace(/<DispData>38987<\/DispData>/, `<DispData>${boxData.orderId}</DispData>`);
      template = template.replace(/<ItemData>38987<\/ItemData>/, `<ItemData>${boxData.orderId}</ItemData>`);
      
      // Replace customer name
      template = template.replace(/<Data>Name of the client<\/Data>/g, `<Data>${boxData.customerName}</Data>`);
      template = template.replace(/<DispData>Name of the client<\/DispData>/g, `<DispData>${boxData.customerName}</DispData>`);
      template = template.replace(/<ItemData>Name of the client<\/ItemData>/g, `<ItemData>${boxData.customerName}</ItemData>`);
      
      // Replace box number (X / Y format in the template)
      const boxNumberText = `${boxData.boxNumber} / ${boxData.totalBoxes}`;
      template = template.replace(/<Data>X \/ Y<\/Data>/g, `<Data>${boxNumberText}</Data>`);
      template = template.replace(/<DispData>X \/ Y<\/DispData>/g, `<DispData>${boxNumberText}</DispData>`);
      template = template.replace(/<ItemData>X \/ Y<\/ItemData>/g, `<ItemData>${boxNumberText}</ItemData>`);
      
      // Replace region - split into Hebrew and Russian parts
      const regionMap = this.getRegionMap();
      const regionData = regionMap[boxData.region || ''] || { hebrew: 'אזור', russian: 'Регион' };
      
      // Replace Hebrew region placeholder
      template = template.replace(/<Data>Region H<\/Data>/g, `<Data>${regionData.hebrew}</Data>`);
      template = template.replace(/<DispData>Region H<\/DispData>/g, `<DispData>${regionData.hebrew}</DispData>`);
      template = template.replace(/<ItemData>Region H<\/ItemData>/g, `<ItemData>${regionData.hebrew}</ItemData>`);
      
      // Replace Russian region placeholder  
      template = template.replace(/<Data>Region R<\/Data>/g, `<Data>${regionData.russian}</Data>`);
      template = template.replace(/<DispData>Region R<\/DispData>/g, `<DispData>${regionData.russian}</DispData>`);
      template = template.replace(/<ItemData>Region R<\/ItemData>/g, `<ItemData>${regionData.russian}</ItemData>`);
      
      // Replace items
      if (boxData.items.length > 0) {
        // Replace the EAN13 barcodes - template has specific placeholders
        const barcodePlaceholders = ['7290018749210', '7290011585853', '7290011585891'];
        
        // Replace each barcode placeholder with actual item barcodes
        for (let i = 0; i < Math.min(3, boxData.items.length); i++) {
          const item = boxData.items[i];
          const barcode = item.barcode || item.catalogNumber || barcodePlaceholders[i];
          
          // Replace the placeholder barcode with actual barcode
          template = template.replace(new RegExp(`<Data>${barcodePlaceholders[i]}<\/Data>`, 'g'), `<Data>${barcode}</Data>`);
          template = template.replace(new RegExp(`<DispData>${barcodePlaceholders[i]}<\/DispData>`, 'g'), `<DispData>${barcode}</DispData>`);
        }
        
        // Item 1
        if (boxData.items[0]) {
          const item1 = boxData.items[0];
          const itemName1 = item1.nameHebrew || item1.name || 'Item 1';
          template = template.replace(/<Data>Item name 1<\/Data>/g, `<Data>${itemName1}</Data>`);
          template = template.replace(/<DispData>Item name 1<\/DispData>/g, `<DispData>${itemName1}</DispData>`);
          template = template.replace(/<ItemData>Item name 1<\/ItemData>/g, `<ItemData>${itemName1}</ItemData>`);
          
          // Replace quantity Q1
          template = template.replace(/<Data>Q1<\/Data>/g, `<Data>${item1.quantity}</Data>`);
          template = template.replace(/<DispData>Q1<\/DispData>/g, `<DispData>${item1.quantity}</DispData>`);
          template = template.replace(/<ItemData>Q1<\/ItemData>/g, `<ItemData>${item1.quantity}</ItemData>`);
        }
        
        // Item 2
        if (boxData.items[1]) {
          const item2 = boxData.items[1];
          const itemName2 = item2.nameHebrew || item2.name || 'Item 2';
          template = template.replace(/<Data>Item name 2<\/Data>/g, `<Data>${itemName2}</Data>`);
          template = template.replace(/<DispData>Item name 2<\/DispData>/g, `<DispData>${itemName2}</DispData>`);
          template = template.replace(/<ItemData>Item name 2<\/ItemData>/g, `<ItemData>${itemName2}</ItemData>`);
          
          // Replace quantity Q2
          template = template.replace(/<Data>Q2<\/Data>/g, `<Data>${item2.quantity}</Data>`);
          template = template.replace(/<DispData>Q2<\/DispData>/g, `<DispData>${item2.quantity}</DispData>`);
          template = template.replace(/<ItemData>Q2<\/ItemData>/g, `<ItemData>${item2.quantity}</ItemData>`);
        }
        
        // Item 3
        if (boxData.items[2]) {
          const item3 = boxData.items[2];
          const itemName3 = item3.nameHebrew || item3.name || 'Item 3';
          template = template.replace(/<Data>Item name 3<\/Data>/g, `<Data>${itemName3}</Data>`);
          template = template.replace(/<DispData>Item name 3<\/DispData>/g, `<DispData>${itemName3}</DispData>`);
          template = template.replace(/<ItemData>Item name 3<\/ItemData>/g, `<ItemData>${itemName3}</ItemData>`);
          
          // Replace quantity Q3
          template = template.replace(/<Data>Q3<\/Data>/g, `<Data>${item3.quantity}</Data>`);
          template = template.replace(/<DispData>Q3<\/DispData>/g, `<DispData>${item3.quantity}</DispData>`);
          template = template.replace(/<ItemData>Q3<\/ItemData>/g, `<ItemData>${item3.quantity}</ItemData>`);
        }
      }
      
      // Date is handled by printer (^D) but we can replace the display date
      if (boxData.deliveryDate) {
        template = template.replace(/<DispData>29\/08\/25<\/DispData>/g, `<DispData>${boxData.deliveryDate}</DispData>`);
      }
      
      this.logger.debug('Box label generated from template successfully');
      return template;
      
    } catch (error) {
      this.logger.error('Failed to generate box label from template:', error as Error);
      throw error;
    }
  }
  
  /**
   * Get region map with Hebrew and Russian translations
   */
  private getRegionMap(): { [key: string]: { hebrew: string; russian: string } } {
    return {
      'south1': { hebrew: 'דרום 1', russian: 'Юг 1' },
      'south2': { hebrew: 'דרום 2', russian: 'Юг 2' },
      'north1': { hebrew: 'צפון 1', russian: 'Север 1' },
      'north2': { hebrew: 'צפון 2', russian: 'Север 2' },
      'center': { hebrew: 'מרכז', russian: 'Центр' },
      'jerusalem': { hebrew: 'ירושלים', russian: 'Иерусалим' }
    };
  }
  
  /**
   * Check if template exists
   */
  isTemplateAvailable(): boolean {
    try {
      return fs.existsSync(this.templatePath);
    } catch {
      return false;
    }
  }
  
  /**
   * Get template path
   */
  getTemplatePath(): string {
    return this.templatePath;
  }
}