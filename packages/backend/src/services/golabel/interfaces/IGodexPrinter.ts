import { LabelData, PrintResult, PrinterStatus } from '../types/golabel.types';

/**
 * Interface for Godex printer services
 */
export interface IGodexPrinter {
  /**
   * Initialize the printer service
   */
  initialize(): Promise<boolean>;
  
  /**
   * Print a label using the service
   * @param data Label data or raw commands
   */
  print(data: LabelData | string): Promise<PrintResult>;
  
  /**
   * Get printer status
   */
  getStatus(): Promise<PrinterStatus>;
  
  /**
   * Test printer connection
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Get current print method name
   */
  getCurrentMethod(): string;
  
  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
  
  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
}