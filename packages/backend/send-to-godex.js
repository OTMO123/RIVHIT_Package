const net = require('net');
const fs = require('fs');
const path = require('path');

const PRINTER_IP = '192.168.14.200';
const PRINTER_PORT = 9101;

// Simple text label for testing
function createSimpleTextLabel() {
  const commands = [];
  
  // Using ASCII codes to avoid encoding issues
  const caret = String.fromCharCode(94);  // ^
  const tilde = String.fromCharCode(126); // ~
  
  // ZPL commands
  commands.push(caret + 'XA');  // Start
  
  // Title
  commands.push(caret + 'FO50,50');
  commands.push(caret + 'A0N,50,50');
  commands.push(caret + 'FDOrder 39344^FS');
  
  // Box number
  commands.push(caret + 'FO50,120');
  commands.push(caret + 'A0N,40,40');
  commands.push(caret + 'FDBox 1 of 1^FS');
  
  // Barcode
  commands.push(caret + 'FO50,200');
  commands.push(caret + 'BY3,3,100');
  commands.push(caret + 'BCN,,Y,N');
  commands.push(caret + 'FD39344^FS');
  
  // Items list
  commands.push(caret + 'FO50,350');
  commands.push(caret + 'A0N,25,25');
  commands.push(caret + 'FDItem 1: Product Name^FS');
  
  commands.push(caret + 'FO50,390');
  commands.push(caret + 'A0N,25,25');
  commands.push(caret + 'FDItem 2: Another Product^FS');
  
  commands.push(caret + 'XZ');  // End
  
  return commands.join('\r\n');
}

// Send to printer with different methods
async function testPrinterMethods() {
  console.log('🖨️ Testing GoDEX printer at', PRINTER_IP + ':' + PRINTER_PORT);
  console.log('================================================\n');
  
  const methods = [
    {
      name: 'ZPL with CRLF',
      data: createSimpleTextLabel()
    },
    {
      name: 'ZPL with LF only',
      data: createSimpleTextLabel().replace(/\r\n/g, '\n')
    },
    {
      name: 'ZPL as single line',
      data: createSimpleTextLabel().replace(/\r\n/g, '')
    },
    {
      name: 'With reset command',
      data: '~JR' + createSimpleTextLabel()
    },
    {
      name: 'EZPL format',
      data: [
        '^Q50,3',
        '^W80',
        '^H10',
        '^P1',
        '^S2',
        '^L',
        'A50,50,0,2,2,1,N,"Order 39344"',
        'A50,120,0,2,1,1,N,"Box 1 of 1"',
        'B50,200,0,1,3,3,100,N,"39344"',
        'A50,350,0,2,1,1,N,"Item 1: Product"',
        'A50,390,0,2,1,1,N,"Item 2: Product"',
        'E'
      ].join('\r\n')
    }
  ];
  
  for (const method of methods) {
    await sendToPrinter(method.data, method.name);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait between attempts
  }
  
  console.log('\n✅ All methods tested. Check printer output.');
}

function sendToPrinter(data, methodName) {
  return new Promise((resolve) => {
    console.log(`\n📤 Testing: ${methodName}`);
    console.log(`   Data length: ${data.length} bytes`);
    
    const client = new net.Socket();
    
    client.setTimeout(5000);
    
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log(`   ✅ Connected`);
      
      // Send data
      client.write(data);
      
      // Optional: send additional newline to flush buffer
      client.write('\r\n');
      
      setTimeout(() => {
        client.end();
        console.log(`   📨 Data sent`);
        resolve(true);
      }, 1000);
    });
    
    client.on('error', (err) => {
      console.error(`   ❌ Error: ${err.message}`);
      resolve(false);
    });
    
    client.on('timeout', () => {
      console.error(`   ⏱️ Timeout`);
      client.destroy();
      resolve(false);
    });
  });
}

// Run tests
testPrinterMethods().catch(console.error);