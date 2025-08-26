# Чек-лист настроек принтера GoDEX для сетевой печати

## 1. В меню Devices → LAN Settings
- [ ] **LAN Enable**: ON/Enable (ОБЯЗАТЕЛЬНО!)
- [ ] **DHCP**: Disable (для статического IP)
- [ ] **Static IP**: 192.168.14.200
- [ ] **Subnet Mask**: 255.255.255.0
- [ ] **Default Gateway**: 192.168.14.1
- [ ] **Port**: 9100

## 2. В меню Devices → Programming Language
- [ ] Выберите **EZPL** (не ZPL, не EPL, не DPL)
- [ ] Или **Auto** если доступно

## 3. В меню Devices → Serial Port Settings
- [ ] **Interface**: Ethernet/LAN (не USB!)
- [ ] Или **Auto Select**: Enable

## 4. В меню Printer Settings
- [ ] **Communication Mode**: Ethernet/Network
- [ ] **Print Mode**: Tear-off или Peel-off
- [ ] После изменений выполните **Save Settings**

## 5. После настройки
1. **Перезагрузите принтер** (выключите и включите)
2. На экране должен отобразиться IP: 192.168.14.200
3. Должен гореть индикатор сетевого подключения (Link LED)

## 6. Проверка подключения
После перезагрузки принтера выполните:
```bash
ping 192.168.14.200
```

Если ping работает, запустите тест:
```bash
cd packages/backend
node test-network-connection.js
```

## ВАЖНО!
- **LAN Enable** - самая важная настройка, без неё сеть не работает
- **Interface/Communication Mode** должен быть Ethernet, не USB
- После изменений ОБЯЗАТЕЛЬНО перезагрузите принтер

## Альтернативный метод подключения
Если есть опция **Multi-Interface** или **Auto Interface**:
- Включите её - принтер будет принимать команды и по USB, и по сети одновременно