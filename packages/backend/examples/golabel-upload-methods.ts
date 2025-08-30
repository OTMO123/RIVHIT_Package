#!/usr/bin/env ts-node
/**
 * Comprehensive examples of uploading/opening EZPX files in GoLabel
 * This demonstrates all available methods for programmatic GoLabel integration
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { GoLabelCliService } from '../src/services/golabel/cli/golabel-cli.service';
import { ConsoleLoggerService } from '../src/services/logging/console.logger.service';

const execAsync = promisify(exec);
const logger = new ConsoleLoggerService('GoLabelUploadExamples');

/**
 * Method 1: Using GoLabel CLI Service's openInGoLabel method
 * This is the recommended approach for opening files in the GoLabel GUI
 */
async function method1_openInGoLabel(ezpxFilePath: string) {
  console.log('\n🔧 Method 1: Using GoLabelCliService.openInGoLabel()');
  
  const goLabelService = new GoLabelCliService(logger);
  const initialized = await goLabelService.initialize();
  
  if (!initialized) {
    console.error('❌ GoLabel not found. Please install GoLabel II');
    return false;
  }
  
  try {
    const result = await goLabelService.openInGoLabel(ezpxFilePath);
    console.log('✅ Result:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Method 2: Using Windows file association
 * Opens the file with whatever application is associated with .ezpx files
 */
async function method2_windowsFileAssociation(ezpxFilePath: string) {
  console.log('\n🔧 Method 2: Using Windows file association');
  
  if (process.platform !== 'win32') {
    console.log('⚠️  This method only works on Windows');
    return false;
  }
  
  try {
    // Method 2a: Using 'start' command
    await execAsync(`start "" "${ezpxFilePath}"`);
    console.log('✅ File opened with default application');
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Method 3: Direct GoLabel.exe execution
 * Launches GoLabel with the file path as a command line argument
 */
async function method3_directExecution(ezpxFilePath: string) {
  console.log('\n🔧 Method 3: Direct GoLabel.exe execution');
  
  const goLabelPath = process.env.GOLABEL_PATH || 
    'C:\\Program Files (x86)\\Godex\\GoLabel\\GoLabel.exe';
  
  try {
    await fs.access(goLabelPath);
  } catch {
    console.error('❌ GoLabel.exe not found at:', goLabelPath);
    return false;
  }
  
  return new Promise<boolean>((resolve) => {
    const child = spawn(goLabelPath, [ezpxFilePath], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();
    
    child.on('error', (error) => {
      console.error('❌ Error:', error);
      resolve(false);
    });
    
    setTimeout(() => {
      console.log('✅ GoLabel started with file');
      resolve(true);
    }, 1000);
  });
}

/**
 * Method 4: Hot Folder monitoring
 * Copies the file to a monitored folder where GoLabel picks it up automatically
 */
async function method4_hotFolder(ezpxFilePath: string) {
  console.log('\n🔧 Method 4: Hot Folder method');
  
  const hotFolderPath = process.env.GOLABEL_HOT_FOLDER || 'C:\\GoLabelHotFolder';
  
  try {
    await fs.access(hotFolderPath);
  } catch {
    console.error('❌ Hot folder not found:', hotFolderPath);
    console.log('   Create this folder and configure GoLabel to monitor it');
    return false;
  }
  
  try {
    const filename = `upload_${Date.now()}_${path.basename(ezpxFilePath)}`;
    const destPath = path.join(hotFolderPath, filename);
    
    // Copy file to hot folder
    await fs.copyFile(ezpxFilePath, destPath);
    console.log('✅ File copied to hot folder:', filename);
    console.log('   GoLabel should pick it up automatically');
    
    // Monitor if file gets processed (removed by GoLabel)
    let processed = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        await fs.access(destPath);
        console.log('   File still waiting...');
      } catch {
        console.log('✅ File processed by GoLabel');
        processed = true;
        break;
      }
    }
    
    return processed;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Method 5: Using GoLabel CLI for direct printing
 * This doesn't open the GUI but sends directly to printer
 */
async function method5_directPrint(ezpxFilePath: string) {
  console.log('\n🔧 Method 5: Direct printing with GoLabel CLI');
  
  const goLabelService = new GoLabelCliService(logger);
  const initialized = await goLabelService.initialize();
  
  if (!initialized) {
    console.error('❌ GoLabel not found');
    return false;
  }
  
  try {
    // This will print directly without opening GUI
    const result = await goLabelService.print(ezpxFilePath);
    console.log('✅ Print result:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Method 6: Using Windows PowerShell
 * Alternative method using PowerShell commands
 */
async function method6_powerShell(ezpxFilePath: string) {
  console.log('\n🔧 Method 6: Using PowerShell');
  
  if (process.platform !== 'win32') {
    console.log('⚠️  This method only works on Windows');
    return false;
  }
  
  try {
    const command = `Start-Process "${ezpxFilePath}"`;
    await execAsync(`powershell -Command "${command}"`);
    console.log('✅ File opened via PowerShell');
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Method 7: Using Windows registry file association
 * Ensures .ezpx files are associated with GoLabel
 */
async function method7_ensureFileAssociation() {
  console.log('\n🔧 Method 7: Ensuring .ezpx file association');
  
  if (process.platform !== 'win32') {
    console.log('⚠️  This method only works on Windows');
    return false;
  }
  
  try {
    // Check current association
    const { stdout } = await execAsync('assoc .ezpx 2>nul');
    console.log('Current association:', stdout.trim() || 'None');
    
    // Check file type handler
    try {
      const { stdout: ftypeOut } = await execAsync('ftype GoLabel.Document 2>nul');
      console.log('File type handler:', ftypeOut.trim() || 'None');
    } catch {
      console.log('File type handler: Not configured');
    }
    
    console.log('\nTo associate .ezpx files with GoLabel:');
    console.log('1. Right-click any .ezpx file');
    console.log('2. Select "Open with" > "Choose another app"');
    console.log('3. Browse to GoLabel.exe and check "Always use this app"');
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

/**
 * Create a sample EZPX file for testing
 */
async function createSampleEzpxFile(): Promise<string> {
  const sampleContent = `<?xml version="1.0" encoding="UTF-8"?>
<qlabel>
  <Setup>
    <Width>80</Width>
    <Length>50</Length>
    <Speed>4</Speed>
    <Darkness>10</Darkness>
    <Direction>0</Direction>
    <Sensor>0</Sensor>
    <Rotate>0</Rotate>
  </Setup>
  <Label>
    <Text>
      <Position>
        <X>10</X>
        <Y>10</Y>
      </Position>
      <Font>
        <Name>Arial</Name>
        <Size>20</Size>
        <Bold>1</Bold>
      </Font>
      <Data>GoLabel Upload Test</Data>
    </Text>
    <Text>
      <Position>
        <X>10</X>
        <Y>30</Y>
      </Position>
      <Font>
        <Name>Arial</Name>
        <Size>14</Size>
      </Font>
      <Data>Method: {METHOD}</Data>
    </Text>
    <Text>
      <Position>
        <X>10</X>
        <Y>45</Y>
      </Position>
      <Font>
        <Name>Arial</Name>
        <Size>12</Size>
      </Font>
      <Data>${new Date().toLocaleString()}</Data>
    </Text>
  </Label>
</qlabel>`;

  const filename = `test_upload_${Date.now()}.ezpx`;
  const filepath = path.join(process.cwd(), filename);
  await fs.writeFile(filepath, sampleContent, 'utf8');
  
  console.log(`✅ Created sample file: ${filename}`);
  return filepath;
}

/**
 * Main function to demonstrate all methods
 */
async function main() {
  console.log('🚀 GoLabel Upload Methods Demonstration');
  console.log('=====================================');
  
  // Create a sample EZPX file
  const sampleFile = await createSampleEzpxFile();
  
  console.log('\nSelect a method to test:');
  console.log('1. GoLabelCliService.openInGoLabel() - Recommended');
  console.log('2. Windows file association');
  console.log('3. Direct GoLabel.exe execution');
  console.log('4. Hot folder monitoring');
  console.log('5. Direct printing (no GUI)');
  console.log('6. PowerShell method');
  console.log('7. Check file associations');
  console.log('8. Test all methods');
  console.log('0. Exit');
  
  // If running with command line argument, use that
  const method = process.argv[2];
  
  try {
    switch (method) {
      case '1':
        await method1_openInGoLabel(sampleFile);
        break;
      case '2':
        await method2_windowsFileAssociation(sampleFile);
        break;
      case '3':
        await method3_directExecution(sampleFile);
        break;
      case '4':
        await method4_hotFolder(sampleFile);
        break;
      case '5':
        await method5_directPrint(sampleFile);
        break;
      case '6':
        await method6_powerShell(sampleFile);
        break;
      case '7':
        await method7_ensureFileAssociation();
        break;
      case '8':
        console.log('\n🔄 Testing all methods...\n');
        await method1_openInGoLabel(sampleFile);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await method2_windowsFileAssociation(sampleFile);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await method3_directExecution(sampleFile);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await method4_hotFolder(sampleFile);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await method5_directPrint(sampleFile);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await method6_powerShell(sampleFile);
        await method7_ensureFileAssociation();
        break;
      default:
        console.log('\nUsage: ts-node golabel-upload-methods.ts [method_number]');
        console.log('Example: ts-node golabel-upload-methods.ts 1');
    }
  } catch (error) {
    console.error('\n❌ Error in main:', error);
  }
  
  // Cleanup
  setTimeout(async () => {
    try {
      await fs.unlink(sampleFile);
      console.log('\n🧹 Cleaned up sample file');
    } catch {}
  }, 5000);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export methods for use in other scripts
export {
  method1_openInGoLabel,
  method2_windowsFileAssociation,
  method3_directExecution,
  method4_hotFolder,
  method5_directPrint,
  method6_powerShell,
  method7_ensureFileAssociation,
  createSampleEzpxFile
};