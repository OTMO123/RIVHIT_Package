#!/usr/bin/env ts-node

/**
 * Upload generated EZPX files to GoLabel from WSL
 * This script converts WSL paths to Windows paths and opens files in GoLabel
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Convert WSL path to Windows path
function wslToWindowsPath(wslPath: string): string {
  if (process.platform === 'linux' && wslPath.startsWith('/mnt/')) {
    return wslPath
      .replace(/^\/mnt\/([a-z])/, '$1:')
      .replace(/\//g, '\\');
  }
  return wslPath;
}

async function uploadToGoLabelWSL() {
  console.log('🚀 Uploading EZPX files to GoLabel (WSL)\n');
  
  // Check if we're in WSL
  if (process.platform !== 'linux') {
    console.log('❌ This script is designed for WSL. Use upload-to-golabel.ts for Windows.');
    return;
  }
  
  // GoLabel paths on Windows
  const golabelPaths = [
    'C:\\Program Files (x86)\\Godex\\GoLabel\\GoLabel.exe',
    'C:\\Program Files (x86)\\Godex\\GoLabel II\\GoLabel.exe',
    'C:\\Program Files\\Godex\\GoLabel\\GoLabel.exe',
    'C:\\GoLabel\\GoLabel.exe'
  ];
  
  // Find GoLabel installation
  let golabelPath: string | null = null;
  for (const path of golabelPaths) {
    const wslPath = path.replace('C:', '/mnt/c').replace(/\\/g, '/');
    if (fs.existsSync(wslPath)) {
      golabelPath = path;
      console.log(`✅ Found GoLabel at: ${path}`);
      break;
    }
  }
  
  if (!golabelPath) {
    console.log('❌ GoLabel not found on Windows');
    console.log('   Searched locations:');
    golabelPaths.forEach(p => console.log(`   - ${p}`));
    return;
  }
  
  // Find the latest test directory
  const tempDir = os.tmpdir();
  const dirs = fs.readdirSync(tempDir)
    .filter(dir => dir.startsWith('golabel-sample-test-'))
    .map(dir => ({
      name: dir,
      path: path.join(tempDir, dir),
      time: fs.statSync(path.join(tempDir, dir)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  if (dirs.length === 0) {
    console.log('❌ No test files found');
    console.log('   Run test-golabel-with-sample-data.ts first');
    return;
  }
  
  const latestDir = dirs[0];
  console.log(`📁 Using test directory: ${latestDir.name}`);
  
  // Find all EZPX files
  const ezpxFiles = fs.readdirSync(latestDir.path)
    .filter(file => file.endsWith('.ezpx'))
    .map(file => path.join(latestDir.path, file));
  
  if (ezpxFiles.length === 0) {
    console.log('❌ No EZPX files found in directory');
    return;
  }
  
  console.log(`\n📄 Found ${ezpxFiles.length} EZPX files:`);
  ezpxFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${path.basename(file)}`);
  });
  
  // Ask user which file to open
  console.log('\n💡 Options:');
  console.log('   1. Open first file only');
  console.log('   2. Open all files (one by one)');
  console.log('   3. Show Windows paths for manual copy');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise<string>(resolve => {
    rl.question('\nSelect option (1-3): ', (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
  
  switch (answer) {
    case '1':
      // Open first file
      console.log('\n📤 Opening first file in GoLabel...');
      try {
        const windowsPath = wslToWindowsPath(ezpxFiles[0]);
        const cmd = `cmd.exe /c start "" "${golabelPath}" "${windowsPath}"`;
        console.log(`   Command: ${cmd}`);
        
        execSync(cmd, { stdio: 'inherit' });
        console.log('✅ File opened in GoLabel!');
        console.log(`   File: ${path.basename(ezpxFiles[0])}`);
      } catch (error) {
        console.log(`❌ Failed to open: ${error}`);
      }
      break;
      
    case '2':
      // Open all files
      console.log('\n📤 Opening all files in GoLabel...');
      for (let i = 0; i < ezpxFiles.length; i++) {
        console.log(`\n   Opening file ${i + 1}/${ezpxFiles.length}: ${path.basename(ezpxFiles[i])}`);
        try {
          const windowsPath = wslToWindowsPath(ezpxFiles[i]);
          const cmd = `cmd.exe /c start "" "${golabelPath}" "${windowsPath}"`;
          
          execSync(cmd, { stdio: 'inherit' });
          console.log('   ✅ Success');
        } catch (error) {
          console.log(`   ❌ Failed: ${error}`);
        }
        
        // Wait a bit between files to avoid overwhelming GoLabel
        if (i < ezpxFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      console.log('\n✅ All files processed');
      break;
      
    case '3':
      // Show Windows paths
      console.log('\n📋 Windows paths for manual copy:\n');
      console.log(`GoLabel: ${golabelPath}\n`);
      console.log('EZPX files:');
      ezpxFiles.forEach((file, index) => {
        const windowsPath = wslToWindowsPath(file);
        console.log(`${index + 1}. ${windowsPath}`);
      });
      console.log('\n💡 You can copy these paths and open files manually in Windows');
      break;
      
    default:
      console.log('❌ Invalid option');
  }
  
  console.log('\n🏁 Done!');
}

// Run the upload
uploadToGoLabelWSL().catch(console.error);