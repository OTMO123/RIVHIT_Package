# Install sqlite3 for Windows
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Installing SQLite3 for Windows" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Method 1: Try installing prebuilt binaries
Write-Host "`n[Method 1] Trying prebuilt binaries..." -ForegroundColor Yellow
Set-Location -Path "packages\backend"

# Remove old sqlite3
npm uninstall sqlite3

# Install specific version with prebuilt binaries
npm install sqlite3@5.1.7 --save --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SQLite3 installed successfully!" -ForegroundColor Green
    Set-Location -Path "..\.."
    exit 0
}

Write-Host "`n[Method 1 Failed] Trying alternative method..." -ForegroundColor Red

# Method 2: Install using better-sqlite3 (alternative)
Write-Host "`n[Method 2] Installing better-sqlite3 as alternative..." -ForegroundColor Yellow
npm install better-sqlite3 --save --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Better-SQLite3 installed successfully!" -ForegroundColor Green
    Write-Host "Note: You'll need to update the code to use better-sqlite3 instead of sqlite3" -ForegroundColor Yellow
    Set-Location -Path "..\.."
    
    # Create a compatibility layer
    $compatCode = @'
// sqlite3 compatibility layer for better-sqlite3
const Database = require('better-sqlite3');

module.exports = {
    Database: class {
        constructor(filename, callback) {
            try {
                this.db = new Database(filename);
                if (callback) callback(null);
            } catch (err) {
                if (callback) callback(err);
            }
        }
        
        run(sql, params, callback) {
            try {
                const stmt = this.db.prepare(sql);
                const result = stmt.run(...(Array.isArray(params) ? params : []));
                if (callback) callback(null, result);
                return result;
            } catch (err) {
                if (callback) callback(err);
                throw err;
            }
        }
        
        all(sql, params, callback) {
            try {
                const stmt = this.db.prepare(sql);
                const rows = stmt.all(...(Array.isArray(params) ? params : []));
                if (callback) callback(null, rows);
                return rows;
            } catch (err) {
                if (callback) callback(err);
                throw err;
            }
        }
        
        close(callback) {
            try {
                this.db.close();
                if (callback) callback(null);
            } catch (err) {
                if (callback) callback(err);
            }
        }
    },
    verbose: () => module.exports
};
'@
    $compatCode | Out-File -FilePath "sqlite3-compat.js" -Encoding UTF8
    
    exit 0
}

# Method 3: Download prebuilt binary manually
Write-Host "`n[Method 3] Downloading prebuilt binary manually..." -ForegroundColor Yellow
$nodeVersion = node -v
$arch = "x64"
$platform = "win32"
$sqliteVersion = "5.1.7"

# Create directory structure
$bindingPath = "node_modules\sqlite3\lib\binding\napi-v6-$platform-unknown-$arch"
New-Item -ItemType Directory -Force -Path $bindingPath | Out-Null

# Download URL for prebuilt binary
$downloadUrl = "https://github.com/TryGhost/node-sqlite3/releases/download/v$sqliteVersion/napi-v6-$platform-$arch.tar.gz"

Write-Host "Downloading from: $downloadUrl" -ForegroundColor Gray

# Download and extract
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile "sqlite3-binary.tar.gz"
    tar -xzf "sqlite3-binary.tar.gz" -C $bindingPath
    Remove-Item "sqlite3-binary.tar.gz"
    
    Write-Host "`n✅ SQLite3 binary downloaded successfully!" -ForegroundColor Green
    Set-Location -Path "..\.."
    exit 0
} catch {
    Write-Host "`nFailed to download binary: $_" -ForegroundColor Red
}

Set-Location -Path "..\.."

Write-Host "`n=====================================" -ForegroundColor Red
Write-Host " All methods failed!" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red
Write-Host "`nTo use SQLite3, you need to install Visual Studio Build Tools:" -ForegroundColor Yellow
Write-Host "1. Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022" -ForegroundColor White
Write-Host "2. Run the installer and select 'Desktop development with C++'" -ForegroundColor White
Write-Host "3. After installation, restart PowerShell and run:" -ForegroundColor White
Write-Host "   npm install sqlite3 --save --force" -ForegroundColor Gray
Write-Host "`nAlternatively, the application can work without a database in limited mode." -ForegroundColor Yellow