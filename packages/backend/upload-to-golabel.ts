#!/usr/bin/env ts-node

/**
 * Upload generated EZPX files to GoLabel
 * This script finds the latest generated test files and opens them in GoLabel
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GoLabelCliService } from './src/services/golabel/cli/golabel-cli.service';
import { ConsoleLoggerService } from './src/services/logging/console.logger.service';

async function uploadToGoLabel() {
  console.log('🚀 Uploading EZPX files to GoLabel\n');
  
  const logger = new ConsoleLoggerService('GoLabelUpload');
  const golabelService = new GoLabelCliService(logger);
  
  // Initialize GoLabel service
  const isAvailable = await golabelService.initialize();
  if (!isAvailable) {
    console.log('❌ GoLabel is not installed or not found');
    console.log('   Please install GoLabel from GoDEX first');
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
  console.log('   3. Copy to hot folder (if configured)');
  
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
      const result = await golabelService.openInGoLabel(ezpxFiles[0]);
      if (result.success) {
        console.log('✅ File opened in GoLabel!');
        console.log(`   File: ${path.basename(ezpxFiles[0])}`);
      } else {
        console.log(`❌ Failed to open: ${result.message || result.error}`);
      }
      break;
      
    case '2':
      // Open all files
      console.log('\n📤 Opening all files in GoLabel...');
      for (let i = 0; i < ezpxFiles.length; i++) {
        console.log(`\n   Opening file ${i + 1}/${ezpxFiles.length}: ${path.basename(ezpxFiles[i])}`);
        const result = await golabelService.openInGoLabel(ezpxFiles[i]);
        if (result.success) {
          console.log('   ✅ Success');
        } else {
          console.log(`   ❌ Failed: ${result.message || result.error}`);
        }
        
        // Wait a bit between files to avoid overwhelming GoLabel
        if (i < ezpxFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      console.log('\n✅ All files processed');
      break;
      
    case '3':
      // Copy to hot folder
      const hotFolderPath = process.env.GOLABEL_HOT_FOLDER || 'C:\\GoLabelHotFolder';
      console.log(`\n📤 Copying to hot folder: ${hotFolderPath}`);
      
      try {
        // Check if hot folder exists
        await fs.promises.access(hotFolderPath);
        
        for (const file of ezpxFiles) {
          const destPath = path.join(hotFolderPath, path.basename(file));
          await fs.promises.copyFile(file, destPath);
          console.log(`   ✅ Copied: ${path.basename(file)}`);
        }
        
        console.log('\n✅ All files copied to hot folder');
        console.log('   GoLabel should automatically process them');
      } catch (error) {
        console.log(`❌ Hot folder not accessible: ${hotFolderPath}`);
        console.log('   Please create the folder or update GOLABEL_HOT_FOLDER env variable');
      }
      break;
      
    default:
      console.log('❌ Invalid option');
  }
  
  console.log('\n🏁 Done!');
}

// Run the upload
uploadToGoLabel().catch(console.error);