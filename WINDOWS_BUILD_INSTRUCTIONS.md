# Инструкция по сборке Windows установщика

## Важно
Для создания Windows .exe установщика на macOS есть ограничения. Рекомендуется использовать Windows машину или виртуальную машину.

## Вариант 1: Сборка на Windows машине

### Шаги:
1. Скопируйте весь проект на Windows машину
2. Установите Node.js 18+ и npm
3. Выполните команды:

```bash
# Перейдите в корневую папку проекта
cd RIVHIT_Package

# Установите зависимости
npm install

# Соберите shared пакет
npx lerna run build --scope=@packing/shared

# Перейдите в frontend папку
cd packages/frontend

# Установите зависимости
npm install

# Соберите backend для production
npm run build:backend

# Соберите frontend
npm run build

# Создайте Windows установщик
npx electron-builder --win
```

### Результат:
Файл установщика будет создан в папке `packages/frontend/release/`:
- `BRAVO-Packing-Setup-1.0.0.exe`

## Вариант 2: Использование GitHub Actions

Создайте файл `.github/workflows/build-windows.yml`:

```yaml
name: Build Windows Installer

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build shared package
      run: npx lerna run build --scope=@packing/shared
      
    - name: Build backend
      working-directory: packages/frontend
      run: npm run build:backend
      
    - name: Build frontend
      working-directory: packages/frontend  
      run: npm run build
      
    - name: Build Windows installer
      working-directory: packages/frontend
      run: npx electron-builder --win --publish never
      
    - name: Upload installer
      uses: actions/upload-artifact@v3
      with:
        name: windows-installer
        path: packages/frontend/release/*.exe
```

## Вариант 3: Подготовленный архив для сборки

Я подготовил все необходимые файлы. Вам нужно:

1. **Переместить проект на Windows машину**
2. **Запустить PowerShell от имени администратора**
3. **Выполнить команды:**

```powershell
# Проверка Node.js
node --version  # Должно быть v18 или выше

# Перейдите в папку проекта
cd C:\path\to\RIVHIT_Package\packages\frontend

# Установка зависимостей (если не установлены)
npm install

# Быстрая сборка
npm run build:all

# Или пошаговая сборка
npm run build:backend  # Сборка backend
npm run build          # Сборка frontend  
npm run package:win    # Создание установщика
```

## Структура готового приложения

После установки приложение будет содержать:
```
C:\Program Files\BRAVO Packing System\
├── BRAVO Packing System.exe  (главный исполняемый файл)
├── resources\
│   ├── backend\           (встроенный backend сервер)
│   │   ├── dist\
│   │   ├── node_modules\
│   │   └── server.js
│   └── app.asar          (упакованный frontend)
└── ...другие файлы Electron
```

## Настройка при первом запуске

1. При первом запуске откроется диалог настройки
2. Введите RIVHIT API токен
3. Нажмите "Проверить подключение"
4. После успешной проверки нажмите "Сохранить и продолжить"

## Данные приложения

Все настройки и база данных сохраняются в:
- `%APPDATA%\bravo-packing\config.json` - настройки
- `%APPDATA%\bravo-packing\database.sqlite` - локальная БД
- `%APPDATA%\bravo-packing\logs\` - логи приложения

## Требования к системе

- Windows 10/11 64-bit
- 4GB RAM минимум
- 500MB свободного места на диске
- Интернет для подключения к RIVHIT API

## Поддержка

При возникновении проблем со сборкой:
1. Убедитесь что установлен Node.js 18+
2. Очистите кеш npm: `npm cache clean --force`
3. Удалите node_modules и переустановите: `rm -rf node_modules && npm install`
4. Используйте Windows машину для сборки Windows установщика

## Готовые файлы

Backend уже подготовлен в папке:
`packages/frontend/resources/backend/`

Все скрипты сборки готовы:
- `scripts/build-backend.js` - сборка backend
- `scripts/build-windows.js` - полная сборка для Windows

Конфигурация electron-builder настроена в `package.json`