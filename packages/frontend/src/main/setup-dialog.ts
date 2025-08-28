import { BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

export class SetupDialog {
  private window: BrowserWindow | null = null;
  private onComplete: ((config: any) => void) | null = null;

  /**
   * Show setup dialog
   */
  public show(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.onComplete = resolve;

      // Create setup window
      this.window = new BrowserWindow({
        width: 600,
        height: 500,
        modal: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        center: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
        },
        title: 'Настройка BRAVO Packing System'
      });

      // Remove menu
      this.window.setMenu(null);

      // Load setup HTML
      const setupHtml = this.getSetupHtml();
      this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(setupHtml)}`);

      // Setup IPC handlers
      this.setupIpcHandlers();

      // Handle window close
      this.window.on('closed', () => {
        this.window = null;
        if (this.onComplete) {
          reject(new Error('Setup cancelled by user'));
        }
      });
    });
  }

  /**
   * Setup IPC handlers for the dialog
   */
  private setupIpcHandlers(): void {
    // Test API connection
    ipcMain.handle('setup:test-connection', async (event, config) => {
      try {
        const response = await fetch(`${config.rivhitApiUrl}/GetDocuments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.rivhitApiToken}`
          },
          body: JSON.stringify({
            token: config.rivhitApiToken,
            document_type: 7,
            limit: 1
          })
        });

        if (!response.ok) {
          return { 
            success: false, 
            error: `HTTP ${response.status}: ${response.statusText}` 
          };
        }

        const data = await response.json() as any;
        
        if (data.error_code === 0) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: data.client_message || data.debug_message || 'Ошибка подключения'
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        };
      }
    });

    // Save configuration
    ipcMain.handle('setup:save-config', async (event, config) => {
      if (this.onComplete) {
        this.onComplete(config);
        this.onComplete = null;
      }
      
      if (this.window) {
        this.window.close();
      }
      
      return { success: true };
    });
  }

  /**
   * Get HTML content for setup dialog
   */
  private getSetupHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo-text {
            font-size: 36px;
            font-weight: bold;
            color: #c41e3a;
            letter-spacing: 2px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }
        
        input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .checkbox-group input[type="checkbox"] {
            width: auto;
            margin-right: 8px;
        }
        
        .checkbox-group label {
            margin-bottom: 0;
            font-weight: normal;
        }
        
        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        
        button {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-test {
            background: #f0f0f0;
            color: #333;
        }
        
        .btn-test:hover:not(:disabled) {
            background: #e0e0e0;
        }
        
        .btn-save {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-save:hover:not(:disabled) {
            opacity: 0.9;
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .message {
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .loading {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <div class="logo-text">BRAVO</div>
        </div>
        
        <h1>Настройка подключения к RIVHIT</h1>
        <p class="subtitle">Введите данные для подключения к API RIVHIT</p>
        
        <div class="form-group">
            <label for="apiUrl">URL API RIVHIT</label>
            <input 
                type="url" 
                id="apiUrl" 
                value="https://api.rivhit.co.il/online/RivhitOnlineAPI.svc"
                placeholder="https://api.rivhit.co.il/online/RivhitOnlineAPI.svc"
            />
        </div>
        
        <div class="form-group">
            <label for="apiToken">API Token</label>
            <input 
                type="password" 
                id="apiToken" 
                placeholder="Введите ваш API токен"
                required
            />
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" id="useMock" />
            <label for="useMock">Использовать тестовые данные (без подключения к API)</label>
        </div>
        
        <div id="message"></div>
        
        <div class="buttons">
            <button id="testBtn" class="btn-test" onclick="testConnection()">
                Проверить подключение
            </button>
            <button id="saveBtn" class="btn-save" onclick="saveConfig()" disabled>
                Сохранить и продолжить
            </button>
        </div>
    </div>
    
    <script>
        let connectionTested = false;
        let connectionValid = false;
        
        const apiUrl = document.getElementById('apiUrl');
        const apiToken = document.getElementById('apiToken');
        const useMock = document.getElementById('useMock');
        const message = document.getElementById('message');
        const testBtn = document.getElementById('testBtn');
        const saveBtn = document.getElementById('saveBtn');
        
        // Enable/disable mock mode
        useMock.addEventListener('change', () => {
            apiUrl.disabled = useMock.checked;
            apiToken.disabled = useMock.checked;
            
            if (useMock.checked) {
                connectionTested = true;
                connectionValid = true;
                saveBtn.disabled = false;
                showMessage('Тестовый режим активирован', 'success');
            } else {
                connectionTested = false;
                connectionValid = false;
                saveBtn.disabled = true;
                message.innerHTML = '';
            }
        });
        
        async function testConnection() {
            if (useMock.checked) {
                return;
            }
            
            if (!apiToken.value) {
                showMessage('Пожалуйста, введите API токен', 'error');
                return;
            }
            
            testBtn.disabled = true;
            testBtn.innerHTML = 'Проверка...<span class="loading"></span>';
            message.innerHTML = '';
            
            try {
                const result = await window.electronAPI.testConnection({
                    rivhitApiUrl: apiUrl.value,
                    rivhitApiToken: apiToken.value
                });
                
                if (result.success) {
                    connectionTested = true;
                    connectionValid = true;
                    saveBtn.disabled = false;
                    showMessage('✅ Подключение успешно установлено', 'success');
                } else {
                    connectionTested = true;
                    connectionValid = false;
                    saveBtn.disabled = true;
                    showMessage('❌ ' + (result.error || 'Ошибка подключения'), 'error');
                }
            } catch (error) {
                showMessage('❌ Ошибка: ' + error.message, 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.innerHTML = 'Проверить подключение';
            }
        }
        
        async function saveConfig() {
            const config = {
                rivhitApiUrl: apiUrl.value,
                rivhitApiToken: apiToken.value,
                useMockData: useMock.checked
            };
            
            await window.electronAPI.saveConfig(config);
        }
        
        function showMessage(text, type) {
            message.className = 'message ' + type;
            message.textContent = text;
        }
        
        // Allow Enter to test connection
        apiToken.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !useMock.checked) {
                testConnection();
            }
        });
    </script>
</body>
</html>
    `;
  }
}