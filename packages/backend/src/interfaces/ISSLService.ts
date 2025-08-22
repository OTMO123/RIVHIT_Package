import { ServerOptions } from 'https';

/**
 * Interface for SSL/TLS certificate management services
 * Follows Interface Segregation Principle (ISP)
 */
export interface ISSLService {
  /**
   * Get HTTPS server options with proper certificates
   * @returns ServerOptions for HTTPS server creation
   */
  getHttpsOptions(): Promise<ServerOptions>;

  /**
   * Validate SSL certificates
   * @returns boolean indicating if certificates are valid
   */
  validateCertificates(): Promise<boolean>;

  /**
   * Check if SSL certificates exist
   * @returns boolean indicating if certificates are available
   */
  certificatesExist(): boolean;

  /**
   * Get certificate expiration information
   * @returns Date when certificate expires
   */
  getCertificateExpiration(): Promise<Date | null>;
}

/**
 * Configuration interface for SSL service
 */
export interface SSLConfig {
  certPath: string;
  keyPath: string;
  environment: 'development' | 'staging' | 'production';
  autoGenerate?: boolean;
}

/**
 * SSL Error types for better error handling
 */
export enum SSLErrorType {
  CERTIFICATE_NOT_FOUND = 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_EXPIRED = 'CERTIFICATE_EXPIRED',
  CERTIFICATE_INVALID = 'CERTIFICATE_INVALID',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_INVALID = 'KEY_INVALID',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

/**
 * SSL Error class for type-safe error handling
 */
export class SSLError extends Error {
  constructor(
    public type: SSLErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SSLError';
  }
}