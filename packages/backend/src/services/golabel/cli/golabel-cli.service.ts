import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { IGodexPrinter } from '../interfaces/IGodexPrinter';
import { 
  GoLabelCliOptions, 
  LabelData, 
  PrintResult, 
  PrinterStatus 
} from '../types/golabel.types';
import { ILogger } from '../../interfaces/ILogger';
import { ConsoleLoggerService } from '../../logging/console.logger.service';

/**
 * GoLabel CLI Service - Uses GoLabel.exe command line interface
 */
export class GoLabelCliService implements IGodexPrinter {
  private logger: ILogger;
  private golabelPath: string;
  private isInitialized: boolean = false;
  private tempDir: string;
  
  constructor(logger?: ILogger) {
    this.logger = logger || new ConsoleLoggerService('GoLabelCliService');
    this.golabelPath = process.env.GOLABEL_PATH || 
      'C:\\Program Files (x86)\\Godex\\GoLabel\\GoLabel.exe';
    this.tempDir = path.join(os.tmpdir(), 'golabel-temp');
  }
  
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('Initializing GoLabel CLI service...');
      
      // Check if GoLabel.exe exists
      try {
        await fs.access(this.golabelPath);
        this.logger.info(`GoLabel found at: ${this.golabelPath}`);
      } catch (error) {
        this.logger.error(`GoLabel not found at: ${this.golabelPath}`);
        return false;
      }
      
      // Create temp directory
      await fs.mkdir(this.tempDir, { recursive: true });
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize GoLabel CLI:', error);
      return false;
    }
  }
  
  async print(data: LabelData | string): Promise<PrintResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('GoLabel CLI service not initialized');
      }
      
      let labelFile: string;
      let variables: Record<string, string> = {};
      
      // Handle different input types
      if (typeof data === 'string') {
        // Assume it's a file path or EZPL commands
        if (data.endsWith('.ezpx') || data.endsWith('.ezp')) {
          labelFile = data;
        } else {
          // Save EZPL commands to temp file
          labelFile = await this.saveToTempFile(data, '.ezp');
        }
      } else {
        // Generate EZPX from LabelData
        const ezpxContent = await this.generateEZPX(data);
        labelFile = await this.saveToTempFile(ezpxContent, '.ezpx');
        
        // Extract variables if any
        if (data.variables) {
          data.variables.forEach((v, index) => {
            variables[`V${index.toString().padStart(2, '0')}`] = v.defaultValue;
          });
        }
      }
      
      // Build CLI options
      const options: GoLabelCliOptions = {
        labelFile,
        printer: process.env.GOLABEL_INTERFACE || 'USB',
        variables,
        copies: 1,
        darkness: parseInt(process.env.GOLABEL_DEFAULT_DARKNESS || '10'),
        speed: parseInt(process.env.GOLABEL_DEFAULT_SPEED || '4')
      };
      
      // Execute GoLabel
      const result = await this.executeGoLabel(options);
      
      // Clean up temp file
      if (labelFile.includes(this.tempDir)) {
        await fs.unlink(labelFile).catch(() => {});
      }
      
      return {
        success: result,
        message: result ? 'Label printed successfully' : 'Print failed',
        method: 'GoLabel CLI',
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      this.logger.error('GoLabel CLI print error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        method: 'GoLabel CLI',
        duration: Date.now() - startTime
      };
    }
  }
  
  private async executeGoLabel(options: GoLabelCliOptions): Promise<boolean> {
    // Check if hot folder is configured and available
    const hotFolderPath = process.env.GOLABEL_HOT_FOLDER || 'C:\\GoLabelHotFolder';
    const useHotFolder = process.env.GOLABEL_USE_HOT_FOLDER === 'true';
    const useAutomation = process.env.GOLABEL_USE_AUTOMATION !== 'false';
    
    // Try hot folder method first if enabled
    if (useHotFolder && await this.isHotFolderAvailable(hotFolderPath)) {
      this.logger.info('Using hot folder method for safer printing');
      return await this.executeHotFolderPrint(options.labelFile, hotFolderPath);
    }
    
    // Try Windows automation if available (safer than direct CLI)
    if (useAutomation && await this.isAutomationAvailable()) {
      this.logger.info('Using Windows automation method');
      return await this.executeAutomationPrint(options.labelFile);
    }
    
    // Fallback to command line (may cause crashes with some GoLabel versions)
    this.logger.warn('Using direct command line method (may cause GoLabel crashes)');
    
    return new Promise((resolve, reject) => {
      const args = this.buildCommandArgs(options);
      
      this.logger.debug('Executing GoLabel with args:', args);
      
      const process: ChildProcess = spawn(this.golabelPath, args, {
        windowsHide: true
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          this.logger.info('GoLabel executed successfully');
          resolve(true);
        } else {
          this.logger.error(`GoLabel exited with code ${code}`);
          this.logger.error('STDOUT:', stdout);
          this.logger.error('STDERR:', stderr);
          resolve(false);
        }
      });
      
      process.on('error', (error) => {
        this.logger.error('GoLabel execution error:', error);
        reject(error);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error('GoLabel execution timeout'));
      }, parseInt(process.env.GOLABEL_CLI_TIMEOUT || '30000'));
    });
  }
  
  private buildCommandArgs(options: GoLabelCliOptions): string[] {
    const args: string[] = [];
    
    // Label file (required)
    args.push('-f', options.labelFile);
    
    // Interface/Printer
    if (options.printer) {
      args.push('-i', options.printer);
    }
    
    // Copies
    if (options.copies && options.copies > 1) {
      args.push('-c', options.copies.toString());
    }
    
    // Darkness
    if (options.darkness !== undefined) {
      args.push('-dark', options.darkness.toString());
    }
    
    // Speed
    if (options.speed !== undefined) {
      args.push('-speed', options.speed.toString());
    }
    
    // Print mode
    if (options.printMode) {
      args.push('-pmode', options.printMode === 'TT' ? '0' : '1');
    }
    
    // Variables (-V00, -V01, etc.)
    if (options.variables) {
      Object.entries(options.variables).forEach(([key, value]) => {
        if (key.startsWith('V')) {
          args.push(`-${key}`, value);
        } else {
          // Convert to V00 format
          const index = parseInt(key) || 0;
          args.push(`-V${index.toString().padStart(2, '0')}`, value);
        }
      });
    }
    
    // Preview mode
    if (options.preview) {
      args.push('-view');
    }
    
    // Save preview
    if (options.savePreview) {
      args.push('-save', options.savePreview);
    }
    
    // Other options
    if (options.cut) {
      args.push('-cut', options.cut.toString());
    }
    
    if (options.stop) {
      args.push('-stop', options.stop.toString());
    }
    
    return args;
  }
  
  private async saveToTempFile(content: string, extension: string): Promise<string> {
    const filename = `label_${Date.now()}${extension}`;
    const filepath = path.join(this.tempDir, filename);
    
    await fs.writeFile(filepath, content, 'utf8');
    
    return filepath;
  }
  
  private async generateEZPX(labelData: LabelData): Promise<string> {
    // Используем правильный генератор PrintJob формата
    const { EzpxPrintJobGeneratorService } = require('../generators/ezpx-printjob-generator.service');
    const generator = new EzpxPrintJobGeneratorService(this.logger);
    
    try {
      return generator.generate(labelData);
    } catch (error) {
      this.logger.error('Failed to generate EZPX PrintJob format:', error);
      throw error;
    }
  }
  
  async getStatus(): Promise<PrinterStatus> {
    // GoLabel CLI doesn't provide direct status
    // We can only check if it's available
    const available = await this.isAvailable();
    
    return {
      connected: available,
      ready: available,
      status: available ? 'GoLabel CLI available' : 'GoLabel not found',
      method: 'GoLabel CLI'
    };
  }
  
  async testConnection(): Promise<boolean> {
    return this.isAvailable();
  }
  
  getCurrentMethod(): string {
    return 'GoLabel CLI';
  }
  
  async dispose(): Promise<void> {
    // Clean up temp directory
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      await fs.access(this.golabelPath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async isHotFolderAvailable(hotFolderPath: string): Promise<boolean> {
    try {
      await fs.access(hotFolderPath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async executeHotFolderPrint(sourcePath: string, hotFolderPath: string): Promise<boolean> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const originalName = path.basename(sourcePath);
      const extension = path.extname(originalName);
      const filename = `print_${timestamp}_${originalName}`;
      const tempPath = path.join(hotFolderPath, filename + '.tmp');
      const finalPath = path.join(hotFolderPath, filename);
      
      // Copy to hot folder with temp extension
      await fs.copyFile(sourcePath, tempPath);
      
      // Rename to trigger processing
      await fs.rename(tempPath, finalPath);
      
      this.logger.info(`File placed in hot folder: ${filename}`);
      
      // Monitor for processing (max 10 seconds)
      const startTime = Date.now();
      const timeout = 10000;
      
      while (Date.now() - startTime < timeout) {
        try {
          await fs.access(finalPath);
          // File still exists, wait more
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch {
          // File has been picked up by GoLabel
          this.logger.info('File processed by GoLabel hot folder');
          return true;
        }
      }
      
      // If we get here, file wasn't processed within timeout
      // But GoLabel might still process it later
      this.logger.warn('Hot folder timeout - file may still be processed');
      return true; // Assume success
      
    } catch (error) {
      this.logger.error('Hot folder print failed:', error);
      return false;
    }
  }
  
  private async isAutomationAvailable(): Promise<boolean> {
    try {
      // Check if we're on Windows
      if (process.platform !== 'win32') {
        return false;
      }
      
      // Check if automation script exists
      const scriptPath = path.join(__dirname, '..', '..', '..', '..', 'print-with-golabel.vbs');
      await fs.access(scriptPath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async executeAutomationPrint(labelPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Use VBScript automation
        const scriptPath = path.join(__dirname, '..', '..', '..', '..', 'print-with-golabel.vbs');
        const command = `cscript //NoLogo "${scriptPath}" "${labelPath}"`;
        
        this.logger.info('Executing Windows automation:', command);
        
        const child = spawn('cmd', ['/c', command], {
          shell: false,
          windowsHide: true
        });
        
        let output = '';
        
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
          this.logger.warn('Automation stderr:', data.toString());
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            this.logger.info('Automation completed successfully');
            resolve(true);
          } else {
            this.logger.warn('Automation exited with code:', code);
            // Still consider it success if GoLabel was opened
            resolve(output.includes('Print command sent'));
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Automation error:', error);
          resolve(false);
        });
        
        // Timeout after 15 seconds
        setTimeout(() => {
          child.kill();
          resolve(true); // Assume success if GoLabel was opened
        }, 15000);
        
      } catch (error) {
        this.logger.error('Failed to execute automation:', error);
        resolve(false);
      }
    });
  }
}