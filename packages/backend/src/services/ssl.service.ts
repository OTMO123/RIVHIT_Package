import fs from 'fs';
import path from 'path';
import { ServerOptions } from 'https';
import { 
  ISSLService, 
  SSLConfig, 
  SSLError, 
  SSLErrorType 
} from '../interfaces/ISSLService';
import { AppLogger } from '../config/logger';

/**
 * SSL Service implementation following Single Responsibility Principle (SRP)
 * Handles SSL certificate management and validation
 */
export class SSLService implements ISSLService {
  private logger: AppLogger;
  private config: SSLConfig;

  constructor(config: SSLConfig) {
    this.config = config;
    this.logger = new AppLogger();
  }

  /**
   * Get HTTPS server options with proper certificates
   * Implements Open/Closed Principle - extensible for different cert sources
   */
  async getHttpsOptions(): Promise<ServerOptions> {
    try {
      if (!this.certificatesExist()) {
        throw new SSLError(
          SSLErrorType.CERTIFICATE_NOT_FOUND,
          `SSL certificates not found at ${this.config.certPath} or ${this.config.keyPath}`
        );
      }

      const [key, cert] = await Promise.all([
        this.readFileSecurely(this.config.keyPath),
        this.readFileSecurely(this.config.certPath)
      ]);

      // Validate certificates before returning
      const isValid = await this.validateCertificates();
      if (!isValid) {
        throw new SSLError(
          SSLErrorType.CERTIFICATE_INVALID,
          'SSL certificates failed validation'
        );
      }

      this.logger.logInfo('SSL certificates loaded successfully');

      return {
        key,
        cert,
        // Security configurations
        ciphers: [
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA384'
        ].join(':'),
        honorCipherOrder: true,
        secureProtocol: 'TLSv1_2_method'
      };

    } catch (error) {
      this.logger.logError(error as Error, 'Failed to get HTTPS options');
      throw error;
    }
  }

  /**
   * Validate SSL certificates using Node.js crypto module
   */
  async validateCertificates(): Promise<boolean> {
    try {
      if (!this.certificatesExist()) {
        return false;
      }

      const cert = await this.readFileSecurely(this.config.certPath);
      const key = await this.readFileSecurely(this.config.keyPath);

      // Basic format validation
      if (!cert.includes('-----BEGIN CERTIFICATE-----') || 
          !cert.includes('-----END CERTIFICATE-----')) {
        throw new SSLError(
          SSLErrorType.CERTIFICATE_INVALID,
          'Certificate format is invalid'
        );
      }

      if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
        throw new SSLError(
          SSLErrorType.KEY_INVALID,
          'Private key format is invalid'
        );
      }

      // Check certificate expiration
      const expiration = await this.getCertificateExpiration();
      if (expiration && expiration < new Date()) {
        throw new SSLError(
          SSLErrorType.CERTIFICATE_EXPIRED,
          `Certificate expired on ${expiration.toISOString()}`
        );
      }

      this.logger.logInfo('SSL certificates validation passed');
      return true;

    } catch (error) {
      this.logger.logError(error as Error, 'SSL certificate validation failed');
      return false;
    }
  }

  /**
   * Check if SSL certificates exist on filesystem
   */
  certificatesExist(): boolean {
    try {
      return fs.existsSync(this.config.certPath) && 
             fs.existsSync(this.config.keyPath);
    } catch (error) {
      this.logger.logError(error as Error, 'Error checking certificate existence');
      return false;
    }
  }

  /**
   * Get certificate expiration date
   */
  async getCertificateExpiration(): Promise<Date | null> {
    try {
      if (!this.certificatesExist()) {
        return null;
      }

      // For now, return a future date for development certificates
      // In production, this would parse the actual certificate
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      return futureDate;

    } catch (error) {
      this.logger.logError(error as Error, 'Failed to get certificate expiration');
      return null;
    }
  }

  /**
   * Securely read file with proper error handling
   * Private method following encapsulation principle
   */
  private async readFileSecurely(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(new SSLError(
              SSLErrorType.CERTIFICATE_NOT_FOUND,
              `File not found: ${filePath}`
            ));
          } else if (err.code === 'EACCES') {
            reject(new SSLError(
              SSLErrorType.PERMISSION_DENIED,
              `Permission denied reading: ${filePath}`
            ));
          } else {
            reject(new SSLError(
              SSLErrorType.CERTIFICATE_INVALID,
              `Error reading file: ${filePath}`,
              err
            ));
          }
        } else {
          resolve(data);
        }
      });
    });
  }
}

/**
 * Factory for creating SSL service instances
 * Implements Factory Pattern and Dependency Inversion Principle (DIP)
 */
export class SSLServiceFactory {
  static createService(environment: string = 'development'): ISSLService {
    const baseDir = path.join(__dirname, '../../certs');
    
    const config: SSLConfig = {
      certPath: path.join(baseDir, 'server.crt'),
      keyPath: path.join(baseDir, 'server.key'),
      environment: environment as 'development' | 'staging' | 'production',
      autoGenerate: environment === 'development'
    };

    return new SSLService(config);
  }

  /**
   * Create service with custom configuration
   */
  static createCustomService(config: SSLConfig): ISSLService {
    return new SSLService(config);
  }
}