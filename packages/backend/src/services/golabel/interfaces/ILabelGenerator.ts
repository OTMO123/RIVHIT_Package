import { LabelData } from '../types/golabel.types';

/**
 * Interface for label generators
 */
export interface ILabelGenerator {
  /**
   * Generate label in the target format
   * @param labelData Label data structure
   * @returns Generated label as string
   */
  generate(labelData: LabelData): string;
  
  /**
   * Validate label data
   * @param labelData Label data to validate
   * @returns True if valid, throws error if not
   */
  validate(labelData: LabelData): boolean;
  
  /**
   * Get supported features for this generator
   */
  getSupportedFeatures(): string[];
  
  /**
   * Get generator format name (EZPL, EZPX, ZPL, etc.)
   */
  getFormat(): string;
}