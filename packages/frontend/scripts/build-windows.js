#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { buildBackend } = require('./build-backend');

const FRONTEND_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const ROOT_DIR = path.resolve(__dirname, '../../..');

console.log('🚀 BRAVO Packing System - Windows Build Script\n');
console.log('='.repeat(50));

async function buildWindows() {
  try {
    // Step 1: Clean previous builds
    console.log('\n📦 Step 1: Cleaning previous builds...');
    await fs.remove(path.join(FRONTEND_DIR, 'dist'));
    await fs.remove(path.join(FRONTEND_DIR, 'release'));
    await fs.remove(path.join(FRONTEND_DIR, 'resources/backend'));
    console.log('✅ Cleaned previous builds');

    // Step 2: Install dependencies
    console.log('\n📦 Step 2: Installing dependencies...');
    
    console.log('Installing frontend dependencies...');
    execSync('npm install', {
      cwd: FRONTEND_DIR,
      stdio: 'inherit'
    });
    
    console.log('Installing backend dependencies...');
    execSync('npm install', {
      cwd: BACKEND_DIR,
      stdio: 'inherit'
    });
    
    console.log('✅ Dependencies installed');

    // Step 3: Build shared package
    console.log('\n📦 Step 3: Building shared package...');
    execSync('npx lerna run build --scope=@packing/shared', {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });
    console.log('✅ Shared package built');

    // Step 4: Build backend for production
    console.log('\n📦 Step 4: Building backend for production...');
    await buildBackend();
    console.log('✅ Backend built');

    // Step 5: Build frontend
    console.log('\n📦 Step 5: Building frontend...');
    execSync('npm run build', {
      cwd: FRONTEND_DIR,
      stdio: 'inherit'
    });
    console.log('✅ Frontend built');

    // Step 6: Copy backend to resources
    console.log('\n📦 Step 6: Preparing resources...');
    const resourcesBackend = path.join(FRONTEND_DIR, 'resources/backend');
    if (await fs.pathExists(resourcesBackend)) {
      // Backend is already in place from build-backend.js
      console.log('✅ Backend resources ready');
    }

    // Step 7: Create Windows installer
    console.log('\n📦 Step 7: Creating Windows installer...');
    console.log('This may take a few minutes...\n');
    
    execSync('npm run package:win', {
      cwd: FRONTEND_DIR,
      stdio: 'inherit'
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ BUILD SUCCESSFUL! ✨');
    console.log('='.repeat(50));
    
    // Find the installer
    const releaseDir = path.join(FRONTEND_DIR, 'release');
    const files = await fs.readdir(releaseDir);
    const installer = files.find(f => f.endsWith('.exe'));
    
    if (installer) {
      const installerPath = path.join(releaseDir, installer);
      const stats = await fs.stat(installerPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log('\n📦 Installer created:');
      console.log(`   📁 Path: ${installerPath}`);
      console.log(`   📊 Size: ${sizeMB} MB`);
      console.log(`   🏷️ Name: ${installer}`);
      
      console.log('\n📋 Installation instructions:');
      console.log('   1. Copy the .exe file to the target Windows machine');
      console.log('   2. Run the installer as Administrator');
      console.log('   3. Follow the installation wizard');
      console.log('   4. On first launch, enter the RIVHIT API token');
      console.log('   5. The app will save settings to %APPDATA%\\bravo-packing\\');
    } else {
      console.log('\n⚠️ Installer not found in release directory');
    }
    
    console.log('\n✅ Build completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

// Add npm scripts to package.json if not exists
async function updatePackageJson() {
  const packagePath = path.join(FRONTEND_DIR, 'package.json');
  const packageJson = await fs.readJson(packagePath);
  
  // Add build scripts if not exists
  if (!packageJson.scripts['build:backend']) {
    packageJson.scripts['build:backend'] = 'node scripts/build-backend.js';
  }
  
  if (!packageJson.scripts['package:win']) {
    packageJson.scripts['package:win'] = 'electron-builder --win';
  }
  
  if (!packageJson.scripts['build:windows']) {
    packageJson.scripts['build:windows'] = 'node scripts/build-windows.js';
  }
  
  if (!packageJson.scripts['build:all']) {
    packageJson.scripts['build:all'] = 'npm run build:backend && npm run build && npm run package:win';
  }
  
  // Update electron-builder configuration
  if (!packageJson.build) {
    packageJson.build = {};
  }
  
  packageJson.build = {
    ...packageJson.build,
    appId: 'com.rivhit.bravo-packing',
    productName: 'BRAVO Packing System',
    directories: {
      output: 'release',
      buildResources: 'assets'
    },
    files: [
      'dist/**/*',
      'resources/**/*',
      'node_modules/**/*',
      'package.json'
    ],
    extraResources: [
      {
        from: 'resources/backend',
        to: 'backend',
        filter: ['**/*']
      }
    ],
    win: {
      target: [
        {
          target: 'nsis',
          arch: ['x64']
        }
      ],
      icon: 'assets/icons/icon.ico',
      requestedExecutionLevel: 'requireAdministrator'
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      installerIcon: 'assets/icons/icon.ico',
      uninstallerIcon: 'assets/icons/icon.ico',
      installerHeader: 'assets/installer-header.bmp',
      installerSidebar: 'assets/installer-sidebar.bmp',
      license: 'LICENSE.txt',
      perMachine: true,
      runAfterFinish: true,
      shortcutName: 'BRAVO Packing',
      artifactName: 'BRAVO-Packing-Setup-${version}.exe'
    }
  };
  
  // Save updated package.json
  await fs.writeJson(packagePath, packageJson, { spaces: 2 });
  console.log('✅ Updated package.json with build scripts');
}

// Run the build
(async () => {
  await updatePackageJson();
  await buildWindows();
})();