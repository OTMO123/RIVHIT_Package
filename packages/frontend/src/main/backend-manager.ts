import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import * as net from 'net';

export class BackendManager {
  private backendProcess: ChildProcess | null = null;
  private port: number = 3001;
  private isProduction: boolean;
  private backendPath: string;
  private maxRetries: number = 30;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    this.isProduction = app.isPackaged;
    
    // Determine backend path based on environment
    if (this.isProduction) {
      // In production, backend is in resources/backend
      this.backendPath = path.join(process.resourcesPath, 'backend');
    } else {
      // In development, backend is in sibling package
      this.backendPath = path.resolve(__dirname, '../../../backend/dist');
    }
    
    console.log('Backend path:', this.backendPath);
  }

  /**
   * Check if port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', () => {
        resolve(false);
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Find an available port starting from default
   */
  private async findAvailablePort(): Promise<number> {
    let port = this.port;
    const maxPort = this.port + 10;
    
    while (port < maxPort) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    
    throw new Error(`No available ports found between ${this.port} and ${maxPort}`);
  }

  /**
   * Wait for backend to be ready
   */
  private async waitForBackend(): Promise<boolean> {
    console.log(`Waiting for backend on port ${this.port}...`);
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${this.port}/health`);
        if (response.ok) {
          console.log('✅ Backend is ready');
          return true;
        }
      } catch (error) {
        // Backend not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }
    
    return false;
  }

  /**
   * Get environment variables for backend
   */
  private getBackendEnv(): NodeJS.ProcessEnv {
    const configPath = this.getConfigPath();
    const config = this.loadConfig();
    
    return {
      ...process.env,
      NODE_ENV: 'production',
      PORT: this.port.toString(),
      RIVHIT_API_TOKEN: config.rivhitApiToken || '',
      RIVHIT_API_URL: config.rivhitApiUrl || 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
      USE_MOCK_RIVHIT: config.useMockData ? 'true' : 'false',
      DATABASE_PATH: path.join(app.getPath('userData'), 'database.sqlite'),
      PRINTER_TEMPLATES_PATH: path.join(this.backendPath, 'printer-templates')
    };
  }

  /**
   * Get config file path
   */
  private getConfigPath(): string {
    return path.join(app.getPath('userData'), 'config.json');
  }

  /**
   * Load configuration
   */
  private loadConfig(): any {
    const configPath = this.getConfigPath();
    
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
    
    return {};
  }

  /**
   * Save configuration
   */
  public saveConfig(config: any): void {
    const configPath = this.getConfigPath();
    
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('Configuration saved to:', configPath);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Check if API token is configured
   */
  public isConfigured(): boolean {
    const config = this.loadConfig();
    return !!config.rivhitApiToken;
  }

  /**
   * Get current configuration
   */
  public getConfig(): any {
    return this.loadConfig();
  }

  /**
   * Start the backend server
   */
  public async start(): Promise<void> {
    if (this.backendProcess) {
      console.log('Backend already running');
      return;
    }

    try {
      // Find available port
      this.port = await this.findAvailablePort();
      console.log(`Starting backend on port ${this.port}...`);

      // Determine backend entry point
      const backendEntry = this.isProduction
        ? path.join(this.backendPath, 'server.js')
        : path.join(this.backendPath, 'src/server.js');

      if (!fs.existsSync(backendEntry)) {
        throw new Error(`Backend entry point not found: ${backendEntry}`);
      }

      // Start backend process
      this.backendProcess = spawn('node', [backendEntry], {
        env: this.getBackendEnv(),
        cwd: this.backendPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle backend output
      this.backendProcess.stdout?.on('data', (data) => {
        console.log(`[Backend]: ${data.toString()}`);
      });

      this.backendProcess.stderr?.on('data', (data) => {
        console.error(`[Backend Error]: ${data.toString()}`);
      });

      // Handle backend exit
      this.backendProcess.on('exit', (code) => {
        console.log(`Backend process exited with code ${code}`);
        this.backendProcess = null;
      });

      // Wait for backend to be ready
      const isReady = await this.waitForBackend();
      if (!isReady) {
        throw new Error('Backend failed to start within timeout');
      }

      console.log('✅ Backend started successfully');
    } catch (error) {
      console.error('Failed to start backend:', error);
      this.stop();
      throw error;
    }
  }

  /**
   * Stop the backend server
   */
  public stop(): void {
    if (this.backendProcess) {
      console.log('Stopping backend...');
      
      // Try graceful shutdown first
      this.backendProcess.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.backendProcess) {
          this.backendProcess.kill('SIGKILL');
        }
      }, 5000);
      
      this.backendProcess = null;
    }
  }

  /**
   * Get the backend port
   */
  public getPort(): number {
    return this.port;
  }

  /**
   * Get backend URL
   */
  public getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}