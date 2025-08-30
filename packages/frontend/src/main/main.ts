import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import fetch from 'node-fetch';

// Wrap console methods to handle EPIPE errors gracefully
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
  try {
    originalConsoleLog.apply(console, args);
  } catch (error: any) {
    // Ignore EPIPE errors silently
    if (error?.code !== 'EPIPE') {
      // Try to log to file or just ignore
    }
  }
};

console.error = (...args: any[]) => {
  try {
    originalConsoleError.apply(console, args);
  } catch (error: any) {
    // Ignore EPIPE errors silently
    if (error?.code !== 'EPIPE') {
      // Try to log to file or just ignore
    }
  }
};

console.warn = (...args: any[]) => {
  try {
    originalConsoleWarn.apply(console, args);
  } catch (error: any) {
    // Ignore EPIPE errors silently
    if (error?.code !== 'EPIPE') {
      // Try to log to file or just ignore
    }
  }
};

// Handle uncaught exceptions to prevent app crashes
process.on('uncaughtException', (error: Error) => {
  // Ignore EPIPE errors
  if ((error as any)?.code === 'EPIPE') {
    return;
  }
  // Log other errors if possible
  try {
    originalConsoleError('Uncaught Exception:', error);
  } catch {
    // Ignore logging errors
  }
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  // Ignore EPIPE errors
  if (reason?.code === 'EPIPE') {
    return;
  }
  try {
    originalConsoleError('Unhandled Rejection at:', promise, 'reason:', reason);
  } catch {
    // Ignore logging errors
  }
});

class MainProcess {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.initializeApp();
    this.setupIpcHandlers();
  }

  private initializeApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIpcHandlers();
    });

    // Handle window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    // Try multiple icon paths based on platform
    let iconPath: string | undefined;
    const fs = require('fs');
    
    // Platform-specific icon selection
    if (process.platform === 'darwin') {
      // macOS prefers .icns
      const iconPaths = [
        path.join(__dirname, 'assets/icon.icns'),
        path.join(process.cwd(), 'assets/icons/icon.icns'),
        path.join(process.cwd(), 'dist/assets/icon.icns'),
        path.join(__dirname, 'assets/icon.png'),
        path.join(process.cwd(), 'dist/assets/icon.png')
      ];
      
      for (const testPath of iconPaths) {
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('Using macOS icon from:', iconPath);
          break;
        }
      }
    } else if (process.platform === 'win32') {
      // Windows prefers .ico
      const iconPaths = [
        path.join(__dirname, 'assets/icon.ico'),
        path.join(process.cwd(), 'assets/icons/icon.ico'),
        path.join(process.cwd(), 'dist/assets/icon.ico'),
        path.join(__dirname, 'assets/icon.png'),
        path.join(process.cwd(), 'dist/assets/icon.png')
      ];
      
      for (const testPath of iconPaths) {
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('Using Windows icon from:', iconPath);
          break;
        }
      }
    } else {
      // Linux uses PNG
      const iconPaths = [
        path.join(__dirname, 'assets/icon.png'),
        path.join(process.cwd(), 'assets/icons/icon.png'),
        path.join(process.cwd(), 'dist/assets/icon.png')
      ];
      
      for (const testPath of iconPaths) {
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          console.log('Using Linux icon from:', iconPath);
          break;
        }
      }
    }
    
    // Create window configuration
    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    };
    
    // Add icon only if found
    if (iconPath) {
      windowConfig.icon = iconPath;
    }
    
    this.mainWindow = new BrowserWindow(windowConfig);

    // Set CSP to allow localhost connections
    this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\'; connect-src \'self\' http://localhost:3001 https://localhost:3001 ws://localhost:* wss://localhost:*; img-src \'self\' data:; style-src \'self\' \'unsafe-inline\';']
        }
      });
    });

    // Load the app - use absolute path to ensure it works
    const isDev = process.env.NODE_ENV === 'development';
    let indexPath: string;
    
    if (isDev) {
      // In development, try both possible locations
      const path1 = path.join(process.cwd(), 'dist/index.html');
      const path2 = path.join(__dirname, 'index.html');
      const path3 = path.resolve(__dirname, '..', '..', 'dist', 'index.html');
      
      console.log('Trying paths:');
      console.log('1:', path1);
      console.log('2:', path2);
      console.log('3:', path3);
      
      indexPath = path1;
    } else {
      indexPath = path.join(__dirname, 'index.html');
    }
    
    console.log('Final path:', indexPath);
    this.mainWindow!.loadFile(indexPath);
    
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    // Remove existing handlers to avoid duplicates
    try {
      ipcMain.removeHandler('app:health');
      ipcMain.removeHandler('orders:getAll');
      ipcMain.removeHandler('orders:getById');
      ipcMain.removeHandler('orders:updateStatus');
      ipcMain.removeHandler('customers:getById');
      ipcMain.removeHandler('customers:getAll');
      ipcMain.removeHandler('items:getByOrderId');
      ipcMain.removeHandler('items:getAll');
      ipcMain.removeHandler('printer:getStatus');
      ipcMain.removeHandler('printer:print');
      ipcMain.removeHandler('printer:test');
    } catch (error) {
      // Handlers might not exist yet, ignore error
    }

    // Health check
    ipcMain.handle('app:health', () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Orders API
    ipcMain.handle('orders:getAll', async () => {
      try {
        const response = await fetch('http://localhost:3001/api/orders');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        // Handle web server response format (from server.js)
        if (data.error_code === 0 && data.data && Array.isArray(data.data)) {
          return { success: true, data: data.data };
        }
        
        // Handle other response formats
        if (Array.isArray(data)) {
          return { success: true, data: data };
        }
        
        // If error_code is not 0, it's an error
        if (data.error_code !== undefined && data.error_code !== 0) {
          return { 
            success: false, 
            error: data.client_message || data.debug_message || 'API error',
            data: [] 
          };
        }
        
        // If no valid data format found
        console.warn('Backend response format not recognized:', data);
        return { success: false, error: 'Invalid data format from backend', data: [] };
        
      } catch (error) {
        console.error('Failed to fetch orders from backend:', error);
        return { 
          success: false, 
          error: (error as Error).message || 'Unknown error',
          data: []
        };
      }
    });

    ipcMain.handle('orders:getById', async (event, id: string) => {
      // TODO: Implement actual API call
      return { success: true, data: null };
    });

    ipcMain.handle('orders:updateStatus', async (event, id: string, status: string) => {
      // TODO: Implement actual API call
      return { success: true, data: null };
    });

    // Customers API
    ipcMain.handle('customers:getById', async (event, id: number) => {
      try {
        const response = await fetch(`http://localhost:3001/api/customers/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Customer response:', data);
        
        if (data.success && data.data) {
          return { success: true, data: data.data };
        }
        
        return { success: false, error: 'Customer not found', data: null };
        
      } catch (error) {
        console.error('Failed to fetch customer from backend:', error);
        return { 
          success: false, 
          error: (error as Error).message || 'Unknown error',
          data: null
        };
      }
    });

    ipcMain.handle('customers:getAll', async () => {
      try {
        const response = await fetch('http://localhost:3001/api/customers');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Customers response:', data);
        
        // Handle web server response format
        if (data.error_code === 0 && data.data && Array.isArray(data.data)) {
          return { success: true, data: data.data };
        }
        
        // Handle other formats
        if (Array.isArray(data)) {
          return { success: true, data: data };
        }
        
        return { success: false, error: data.client_message || 'Invalid data format from backend', data: [] };
        
      } catch (error) {
        console.error('Failed to fetch customers from backend:', error);
        return { 
          success: false, 
          error: (error as Error).message || 'Unknown error',
          data: []
        };
      }
    });

    // Items API
    ipcMain.handle('items:getByOrderId', async (event, orderId: number) => {
      try {
        const response = await fetch(`http://localhost:3001/api/orders/${orderId}/items`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Items response:', data);
        
        // Handle backend response format
        if (data.success && data.data && Array.isArray(data.data)) {
          return { success: true, data: data.data };
        }
        
        // Handle legacy format
        if (data.error_code === 0 && data.data && Array.isArray(data.data)) {
          return { success: true, data: data.data };
        }
        
        return { success: false, error: data.error || data.client_message || 'Items not found', data: [] };
        
      } catch (error) {
        console.error('Failed to fetch items from backend:', error);
        return { 
          success: false, 
          error: (error as Error).message || 'Unknown error',
          data: []
        };
      }
    });

    ipcMain.handle('items:getAll', async () => {
      try {
        const response = await fetch('http://localhost:3001/api/items');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('All items response:', data);
        
        // Handle web server response format
        if (data.error_code === 0 && data.data && Array.isArray(data.data)) {
          return { success: true, data: data.data };
        }
        
        // Handle other formats
        if (Array.isArray(data)) {
          return { success: true, data: data };
        }
        
        return { success: false, error: data.client_message || 'Invalid data format from backend', data: [] };
        
      } catch (error) {
        console.error('Failed to fetch items from backend:', error);
        return { 
          success: false, 
          error: (error as Error).message || 'Unknown error',
          data: []
        };
      }
    });

    // Printer API
    ipcMain.handle('printer:getStatus', async () => {
      // TODO: Implement actual API call
      return { success: true, data: { connected: true, ready: true } };
    });

    ipcMain.handle('printer:print', async (event, orderId: string, stickers: any[]) => {
      // TODO: Implement actual API call
      return { success: true, data: null };
    });

    ipcMain.handle('printer:test', async () => {
      // TODO: Implement actual API call
      return { success: true, data: null };
    });

    // GoLabel integration handler
    ipcMain.handle('golabel:openFiles', async (event, files: string[]) => {
      try {
        const { exec } = require('child_process');
        const path = require('path');
        const fs = require('fs');
        
        console.log(`Opening ${files.length} files in GoLabel...`);
        
        // Check if we're on Windows
        if (process.platform !== 'win32') {
          return { 
            success: false, 
            error: 'GoLabel is only supported on Windows' 
          };
        }
        
        // Find GoLabel executable
        const golabelPaths = [
          'C:\\Program Files (x86)\\Godex\\GoLabel\\GoLabel.exe',
          'C:\\Program Files (x86)\\Godex\\GoLabel II\\GoLabel.exe',
          'C:\\Program Files\\Godex\\GoLabel\\GoLabel.exe',
          'C:\\GoLabel\\GoLabel.exe'
        ];
        
        let golabelPath = '';
        for (const path of golabelPaths) {
          if (fs.existsSync(path)) {
            golabelPath = path;
            break;
          }
        }
        
        if (!golabelPath) {
          return { 
            success: false, 
            error: 'GoLabel not found. Please install GoLabel.' 
          };
        }
        
        // Open files in GoLabel
        const results: any[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Opening file ${i + 1}/${files.length}: ${file}`);
          
          try {
            // Use Windows 'start' command to open file with GoLabel
            await new Promise((resolve, reject) => {
              exec(`"${golabelPath}" "${file}"`, (error: any, stdout: string, stderr: string) => {
                if (error) {
                  console.error(`Error opening file: ${error}`);
                  reject(error);
                } else {
                  resolve(stdout);
                }
              });
            });
            
            results.push({ file, success: true } as any);
            
            // Add delay between files to prevent overwhelming GoLabel
            if (i < files.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (error) {
            results.push({ 
              file, 
              success: false, 
              error: error instanceof Error ? error.message : 'Failed to open' 
            } as any);
          }
        }
        
        const successCount = results.filter((r: any) => r.success).length;
        
        return {
          success: successCount > 0,
          message: `Opened ${successCount} of ${files.length} files in GoLabel`,
          results
        };
        
      } catch (error) {
        console.error('Error opening files in GoLabel:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to open files' 
        };
      }
    });
  }
}

// Initialize the main process
new MainProcess();