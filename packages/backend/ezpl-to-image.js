#!/usr/bin/env node

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Convert EZPL file to PNG image for visualization
 * This shows how the label will look when printed
 */
class EZPLVisualizer {
  constructor(width = 1200, height = 1200) {
    this.canvas = createCanvas(width, height);
    this.ctx = this.canvas.getContext('2d');
    this.width = width;
    this.height = height;
  }

  parseEZPL(ezplContent) {
    const lines = ezplContent.split('\n');
    const commands = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'E' || trimmed.startsWith(';')) continue;
      
      // Parse different EZPL commands
      if (trimmed.startsWith('R')) {
        // Rectangle: R<x>,<y>,<x2>,<y2>,<thickness>
        const match = trimmed.match(/R(\d+),(\d+),(\d+),(\d+),(\d+)/);
        if (match) {
          commands.push({
            type: 'rectangle',
            x1: parseInt(match[1]),
            y1: parseInt(match[2]),
            x2: parseInt(match[3]),
            y2: parseInt(match[4]),
            thickness: parseInt(match[5])
          });
        }
      } else if (trimmed.startsWith('A')) {
        // Text: A<x>,<y>,<rotation>,<font>,<h_mult>,<v_mult>,<reverse>,"text"
        const match = trimmed.match(/A(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([NR]),"(.*)"/);
        if (match) {
          commands.push({
            type: 'text',
            x: parseInt(match[1]),
            y: parseInt(match[2]),
            rotation: parseInt(match[3]),
            font: parseInt(match[4]),
            hMult: parseInt(match[5]),
            vMult: parseInt(match[6]),
            reverse: match[7] === 'R',
            text: match[8]
          });
        }
      } else if (trimmed.startsWith('B')) {
        // Barcode: B<x>,<y>,<rotation>,<type>,<narrow>,<wide>,<height>,<readable>,"data"
        const match = trimmed.match(/B(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([BN]),"(.*)"/);
        if (match) {
          commands.push({
            type: 'barcode',
            x: parseInt(match[1]),
            y: parseInt(match[2]),
            height: parseInt(match[7]),
            data: match[9]
          });
        }
      } else if (trimmed.startsWith('L')) {
        // Line: L<x1>,<y1>,<x2>,<y2>,<thickness>
        const match = trimmed.match(/L(\d+),(\d+),(\d+),(\d+),(\d+)/);
        if (match) {
          commands.push({
            type: 'line',
            x1: parseInt(match[1]),
            y1: parseInt(match[2]),
            x2: parseInt(match[3]),
            y2: parseInt(match[4]),
            thickness: parseInt(match[5])
          });
        }
      }
    }
    
    return commands;
  }

  renderCommands(commands) {
    // White background
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Process each command
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'rectangle':
          this.drawRectangle(cmd);
          break;
        case 'text':
          this.drawText(cmd);
          break;
        case 'barcode':
          this.drawBarcode(cmd);
          break;
        case 'line':
          this.drawLine(cmd);
          break;
      }
    }
  }

  drawRectangle(cmd) {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = cmd.thickness;
    this.ctx.strokeRect(
      cmd.x1, 
      cmd.y1, 
      cmd.x2 - cmd.x1, 
      cmd.y2 - cmd.y1
    );
  }

  drawText(cmd) {
    const fontSize = 10 + (cmd.font * 4 * cmd.vMult);
    this.ctx.font = `${cmd.hMult > 1 ? 'bold' : 'normal'} ${fontSize}px Arial`;
    this.ctx.fillStyle = 'black';
    
    // Handle RTL text
    if (cmd.reverse) {
      this.ctx.textAlign = 'right';
      this.ctx.direction = 'rtl';
    } else {
      this.ctx.textAlign = 'left';
      this.ctx.direction = 'ltr';
    }
    
    this.ctx.fillText(cmd.text, cmd.x, cmd.y);
  }

  drawBarcode(cmd) {
    // Simple barcode visualization
    const barcodeWidth = 180;
    const x = cmd.x;
    const y = cmd.y;
    
    // Draw barcode bars
    this.ctx.fillStyle = 'black';
    const barWidth = 2;
    const data = cmd.data;
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        if ((charCode >> j) & 1) {
          this.ctx.fillRect(
            x + (i * 8 + j) * barWidth, 
            y, 
            barWidth, 
            cmd.height
          );
        }
      }
    }
    
    // Draw barcode text
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(cmd.data, x + barcodeWidth / 2, y + cmd.height + 15);
  }

  drawLine(cmd) {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = cmd.thickness;
    this.ctx.beginPath();
    this.ctx.moveTo(cmd.x1, cmd.y1);
    this.ctx.lineTo(cmd.x2, cmd.y2);
    this.ctx.stroke();
  }

  async saveToFile(outputPath) {
    const buffer = this.canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
  }
}

// Main function
async function convertEZPLToImage() {
  const ezplDir = path.join(__dirname, 'temp', 'ezpl-test');
  const ezplFile = path.join(ezplDir, 'box-label-39641-box2.ezpl');
  
  if (!fs.existsSync(ezplFile)) {
    console.error(`❌ EZPL file not found: ${ezplFile}`);
    console.log('Run test-ezpl-generation.ts first to generate EZPL files');
    return;
  }
  
  console.log(`📄 Reading EZPL file: ${ezplFile}`);
  const ezplContent = fs.readFileSync(ezplFile, 'utf-8');
  
  // Create visualizer
  const visualizer = new EZPLVisualizer();
  
  // Parse and render EZPL
  console.log('🎨 Parsing EZPL commands...');
  const commands = visualizer.parseEZPL(ezplContent);
  console.log(`   Found ${commands.length} commands`);
  
  console.log('🖼️ Rendering to canvas...');
  visualizer.renderCommands(commands);
  
  // Save to PNG
  const outputPath = path.join(ezplDir, 'box-label-39641-box2-visualization.png');
  await visualizer.saveToFile(outputPath);
  
  console.log(`✅ Visualization saved to: ${outputPath}`);
  console.log('📏 Size: 1200x1200 pixels (10x10cm at 300 DPI)');
  
  // Also create visualizations for other files
  const files = fs.readdirSync(ezplDir).filter(f => f.endsWith('.ezpl'));
  console.log(`\n📦 Found ${files.length} EZPL files to visualize`);
  
  for (const file of files.slice(0, 3)) { // Process first 3 files
    const inputPath = path.join(ezplDir, file);
    const outputName = file.replace('.ezpl', '-visual.png');
    const outputPath = path.join(ezplDir, outputName);
    
    const content = fs.readFileSync(inputPath, 'utf-8');
    const viz = new EZPLVisualizer();
    const cmds = viz.parseEZPL(content);
    viz.renderCommands(cmds);
    await viz.saveToFile(outputPath);
    
    console.log(`   ✓ ${file} → ${outputName}`);
  }
  
  console.log('\n✨ Visualization complete!');
  console.log(`📁 Open ${ezplDir} to view the generated images`);
}

// Run the converter
convertEZPLToImage().catch(console.error);