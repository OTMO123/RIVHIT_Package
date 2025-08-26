const net = require('net');

const PRINTER_IP = '192.168.14.200';
const PRINTER_PORT = 9101;

console.log(`Запрашиваем информацию о принтере ${PRINTER_IP}:${PRINTER_PORT}...`);
console.log('');

function sendCommand(command, description) {
    return new Promise((resolve) => {
        const client = new net.Socket();
        let response = '';
        
        client.setTimeout(2000);
        
        client.connect(PRINTER_PORT, PRINTER_IP, function() {
            console.log(`📤 Отправляем: ${description}`);
            client.write(command + '\r\n');
        });
        
        client.on('data', function(data) {
            response += data.toString();
        });
        
        client.on('timeout', function() {
            client.end();
        });
        
        client.on('close', function() {
            if (response) {
                console.log(`✅ Ответ: ${response.substring(0, 100)}`);
            } else {
                console.log('❌ Нет ответа');
            }
            console.log('');
            resolve();
        });
        
        client.on('error', function(err) {
            console.log(`❌ Ошибка: ${err.message}`);
            console.log('');
            resolve();
        });
    });
}

async function checkPrinter() {
    // Различные команды статуса для разных языков
    await sendCommand('~!@', 'EZPL - Запрос версии');
    await sendCommand('~!S', 'EZPL - Запрос статуса');
    await sendCommand('~!I', 'EZPL - Информация о принтере');
    await sendCommand('^II', 'ZPL - Информация');
    await sendCommand('~HS', 'ZPL - Статус');
    await sendCommand('STATUS', 'TSPL - Статус');
    await sendCommand('SELFTEST', 'TSPL - Самотест');
    
    console.log('=== Рекомендации ===');
    console.log('Если принтер не отвечает на команды:');
    console.log('1. Проверьте Programming Language в настройках принтера');
    console.log('2. Попробуйте Auto-detect режим если доступен');
    console.log('3. Выполните Factory Reset и настройте заново');
    console.log('4. Проверьте, что Firmware поддерживает сетевую печать');
}

checkPrinter();