/**
 * Type definitions for GoLabel integration
 */

export interface GoLabelCliOptions {
  /** Label file path (.ezpx or .ezp) */
  labelFile: string;
  
  /** Number of copies per label */
  copies?: number;
  
  /** Number of pages per label */
  pages?: number;
  
  /** Print darkness (0-19) */
  darkness?: number;
  
  /** Print speed in IPS */
  speed?: number;
  
  /** Printer interface: USB, COM1, LPT1, printer name, or IP:PORT */
  printer?: string;
  
  /** Variable substitutions (key-value pairs) */
  variables?: Record<string, string>;
  
  /** Print mode: TT (Thermal Transfer) or DT (Direct Thermal) */
  printMode?: 'TT' | 'DT';
  
  /** Enable preview mode */
  preview?: boolean;
  
  /** Save preview to file */
  savePreview?: string;
  
  /** Preview zoom scale */
  zoom?: number;
  
  /** Labels per cut */
  cut?: number;
  
  /** Stop position (tear-off position) */
  stop?: number;
  
  /** External database file */
  database?: string;
  
  /** SQL query for database */
  sqlQuery?: string;
  
  /** Configuration file path */
  configFile?: string;
}

export interface LabelElement {
  type: 'text' | 'barcode' | 'rectangle' | 'line' | 'image' | 'circle';
  position: {
    x: number;
    y: number;
  };
  properties: Record<string, any>;
}

export interface LabelVariable {
  name: string;
  defaultValue: string;
  prompt?: string;
  format?: string;
}

export interface LabelData {
  /** Label size in mm */
  size: {
    width: number;
    height: number;
  };
  
  /** Label elements */
  elements: LabelElement[];
  
  /** Variable definitions */
  variables?: LabelVariable[];
  
  /** Printer settings */
  printerSettings?: {
    speed?: number;
    darkness?: number;
    printMode?: 'TT' | 'DT';
    mediaType?: 'continuous' | 'gap' | 'mark';
    gapHeight?: number;
  };
}

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
  method?: string;
  jobId?: string;
  duration?: number;
}

export interface PrinterStatus {
  connected: boolean;
  ready: boolean;
  online?: boolean;
  status?: string;
  error?: string;
  method?: string;
  mediaInfo?: {
    type: string;
    width: number;
    remaining?: number;
  };
  ribbonInfo?: {
    type: string;
    remaining?: number;
  };
}

export enum PrintMethod {
  GOLABEL_CLI = 'GoLabel CLI',
  EZIO32_SDK = 'EZio32 SDK',
  QLABEL_SDK = 'QLabel SDK',
  SDK = 'SDK', // Generic SDK alias
  DIRECT_USB = 'Direct USB',
  NETWORK = 'Network TCP/IP'
}

export interface PrintMethodConfig {
  name: PrintMethod;
  priority: number;
  enabled: boolean;
  isAvailable: () => Promise<boolean>;
  print: (data: LabelData | string) => Promise<PrintResult>;
}

export interface EZioFunctions {
  OpenUSB: (portName: string) => number;
  OpenDriver: (printerName: string) => number;
  OpenNet: (ip: string, port: number) => number;
  ClosePort: () => void;
  SendCommand: (command: string) => number;
  RcvBuf: (buffer: Buffer, size: number) => number;
  FindFirstUSB: (buffer: Buffer) => string;
  FindNextUSB: (buffer: Buffer) => string;
  GetDllVersion: () => string;
  GetStatus: () => number;
  Reset: () => void;
}

export interface TextElement extends LabelElement {
  type: 'text';
  properties: {
    text: string;
    font?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    rotation?: 0 | 90 | 180 | 270;
    alignment?: 'left' | 'center' | 'right';
    color?: string;
  };
}

export interface BarcodeElement extends LabelElement {
  type: 'barcode';
  properties: {
    data: string;
    barcodeType: 'Code128' | 'Code39' | 'EAN13' | 'EAN8' | 'UPC-A' | 'QRCode' | 'DataMatrix';
    height?: number;
    width?: number;
    showText?: boolean;
    textPosition?: 'top' | 'bottom' | 'none';
    rotation?: 0 | 90 | 180 | 270;
  };
}

export interface RectangleElement extends LabelElement {
  type: 'rectangle';
  properties: {
    width: number;
    height: number;
    lineWidth?: number;
    fill?: boolean;
    color?: string;
    radius?: number;
  };
}

export interface LineElement extends LabelElement {
  type: 'line';
  properties: {
    endX: number;
    endY: number;
    width?: number;
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface ImageElement extends LabelElement {
  type: 'image';
  properties: {
    data: string; // Base64 or file path
    width?: number;
    height?: number;
    keepAspectRatio?: boolean;
    dithering?: boolean;
  };
}

export interface CircleElement extends LabelElement {
  type: 'circle';
  properties: {
    radius: number;
    lineWidth?: number;
    fill?: boolean;
    color?: string;
  };
}