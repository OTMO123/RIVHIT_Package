# RIVHIT Package - Архитектурная Документация

## Обзор Системы

RIVHIT Package - это комплексная автоматизированная система упаковки для заказов RIVHIT, построенная как **монорепозиторий** с использованием **Lerna** и следующая принципам **SOLID**, **паттернам проектирования** и **TDD методологии**.

### Основная Информация
- **Название**: BRAVO Packing System  
- **Версия**: 1.0.0
- **Архитектура**: Monorepo (Lerna)
- **Языки**: TypeScript, JavaScript, HTML/CSS
- **Методология**: TDD (Test-Driven Development)
- **Покрытие тестами**: 80%+ требуется (jest.config.js)

---

## Структура Монорепозитория

### 1. 📦 Packages (Основные Модули)

#### **@packing/backend** - API Сервер
- **Технологии**: Node.js 18+, Express.js, TypeScript, SQLite + TypeORM
- **Порт**: 3001
- **Назначение**: REST API для интеграции с RIVHIT, управление заказами, печать этикеток

#### **@packing/frontend** - Electron Приложение  
- **Технологии**: Electron 37, React 18, Ant Design 5, Zustand
- **Назначение**: Десктопное приложение с GUI для упаковщиков

#### **@packing/shared** - Общие Типы и Утилиты
- **Технологии**: TypeScript, Zod валидация
- **Назначение**: Типы, валидаторы, утилиты, используемые в backend и frontend

### 2. 🛠️ Build & Scripts
- **Файлы**: scripts/ директория
- **Назначение**: Автоматизация сборки и настройки окружения
- **Скрипты**: build-and-run.sh, start-test-environment.sh

---

## Backend Architecture (@packing/backend)

### 🏗️ Архитектурные Паттерны

#### **Factory Pattern**
```typescript
// ApplicationServiceFactory - создание всех сервисов
class ApplicationServiceFactory {
  static async createServices(): Promise<ApplicationServices>
}

// Специализированные фабрики
class RivhitServiceFactory
class PrinterServiceFactory  
class CacheServiceFactory
```

#### **Dependency Injection & IoC Container**
```typescript
// Container для управления зависимостями
export class Container {
  static getInstance(): Container
  get<T>(key: string): T
}
```

#### **Repository Pattern**
```typescript
interface IOrderRepository
class MaxPerBoxRepository
```

### 🛠️ Основные Сервисы

#### **RIVHIT Integration Services**
- **`SafeRivhitService`** - Безопасный клиент RIVHIT API с кэшированием
- **`RivhitService`** - Базовый RIVHIT API клиент
- **`MockRivhitService`** - Mock данные для разработки

#### **Printer Services** 
- **`GodexPrinterService`** 🆕 - Унифицированный сервис с GoLabel интеграцией
- **`GoLabelCliService`** 🆕 - Интеграция с GoLabel.exe (официальный инструмент Godex)
- **`GoLabelSdkService`** 🆕 - Прямая интеграция с EZio32.dll через FFI
- **`EzpxGeneratorService`** 🆕 - Генератор современного формата EZPX для GoLabel
- **`EnhancedPrinterDiscoveryService`** - Интеллектуальный поиск принтеров с кэшированием
- **`ZPLPrinterService`** - ZPL принтеры (резервный метод для GoDEX)
- **`ImageToZPLService`** - Конвертация изображений в ZPL
- **`NetworkDetectionService`** - Автообнаружение сетевых принтеров
- **`ParallelDiscoveryService`** - Параллельное сканирование устройств
- **`PrinterConnectionService`** - Управление подключениями к принтерам
- **`PrinterCacheService`** - Кэширование информации о принтерах
- **`EZPLDebugService`** - Отладка и визуализация EZPL шаблонов
- **`BoxLabelService`** - Генерация этикеток коробок
- **`ImagePrintService`** - Печать через изображения

#### **Cache Services**
- **`MemoryCacheService`** - In-memory кэш
- **`RedisCacheService`** - Redis кэш (опционально)

#### **Business Logic Services**
- **`OrderStatusService`** - Управление статусами заказов
- **`InvoiceCreatorService`** - Создание счетов-фактур
- **`PrinterDiagnosticsService`** - Диагностика принтеров и устранение неполадок

### 🎯 Controllers (API Endpoints)

#### **Core Controllers**
- **`OrdersController`** - `/api/orders` - Управление заказами
- **`CustomersController`** - `/api/customers` - Данные клиентов
- **`ItemsController`** - `/api/items` - Товары
- **`PrintController`** - `/api/print` - Печать этикеток
- **`AuthController`** - `/api/auth` - Аутентификация

#### **Utility Controllers** (Обновлено)
- **`OrderStatusController`** - `/api/order-status` - Управление статусами заказов
- **`InvoiceController`** - `/api/invoices` - Создание и управление счетами
- **`PrinterDiscoveryController`** - `/api/printer-discovery` - Обнаружение сетевых принтеров
- **`SettingsController`** - `/api/settings` - Конфигурация приложения

### 🗂️ Data Layer

#### **Entities (TypeORM)**
- **`OrderStatus`** - Статусы заказов
- **`OrderPackingDetails`** - Детали упаковки
- **`OrderBoxes`** - Коробки заказов  
- **`MaxPerBoxSetting`** - Настройки max товаров в коробке

#### **Repositories**
- **`MaxPerBoxRepository`** - Репозиторий настроек упаковки

### 🔒 Security & Middleware

#### **Security Services**
- **`SSLService`** - SSL/TLS сертификаты
- **`AuthMiddleware`** - JWT аутентификация
- **`SecurityMiddleware`** - Helmet защита
- **`ValidationMiddleware`** - Zod валидация

#### **Monitoring & Logging**
- **`ConsoleLoggerService`** - Структурированное логирование (Winston)
- **Error Handling** - Глобальная обработка ошибок

---

## Frontend Architecture (@packing/frontend)

### 🖥️ Electron Main Process

#### **Core Modules**
- **`main.ts`** - Главный процесс Electron
- **`backend-manager.ts`** - Управление backend процессом
- **`setup-dialog.ts`** - Диалог первоначальной настройки
- **`ipc-handlers.ts`** - IPC обработчики

### ⚛️ React Renderer Process

#### **State Management**
```typescript
// Zustand stores
store/orders.store.ts - Глобальное состояние заказов
```

#### **Core Components**
- **`App.tsx`** - Корневой компонент
- **`Layout/Layout.tsx`** - Основной макет приложения

#### **Business Components**
- **`PackingWorkflowModal`** - Модальное окно процесса упаковки  
- **`AssemblyLineProgress`** - Прогресс-индикатор упаковки
- **`InvoiceModal`** - Создание счетов-фактур
- **`PrintActions`** - Действия печати

#### **Settings & Configuration**
- **`SettingsModal`** - Настройки приложения
- **`PrinterSettings`** - Настройки принтера
- **`MaxPerBoxSettings`** - Настройки max товаров в коробке
- **`PrinterDiscovery`** - Обнаружение принтеров

#### **Utility Components**  
- **`LanguageSwitcher`** - Переключатель языков
- **`RegionSelector`** - Выбор региона
- **`ItemSelector`** - Селектор товаров
- **`BoxLabelPrint`** - Печать этикеток коробок

### 📄 Pages (React Router)
- **`OrdersPage`** - Страница заказов
- **`PackingPage`** - Страница упаковки  
- **`PrintingPage`** - Страница печати
- **`MainDashboard`** - Главная панель
- **`PrinterTestPage`** - Тестирование принтера

### 🌍 Internationalization  
```typescript
i18n/i18n.tsx - i18next конфигурация
i18n/translations.ts - Переводы (Hebrew RTL, English, Russian)
```

### 📡 Services
- **`api.service.ts`** - HTTP клиент для backend API
- **`ipc.service.ts`** - IPC коммуникация с main процессом  
- **`order-status.service.ts`** - Сервис статусов заказов

---

## Shared Library (@packing/shared)

### 📋 Type Definitions
```typescript
types/rivhit.types.ts - RIVHIT API типы
types/order.types.ts - Типы заказов
types/printer.types.ts - Типы принтеров  
types/api.types.ts - API типы
types/config.types.ts - Конфигурационные типы
```

### ✅ Validators (Zod)
```typescript
validators/order.validator.ts - Валидация заказов
validators/printer.validator.ts - Валидация принтеров
validators/config.validator.ts - Валидация конфигурации
```

### 🛠️ Utilities
```typescript
utils/hebrew.utils.ts - Утилиты для иврита RTL
utils/date.utils.ts - Утилиты для дат
utils/string.utils.ts - Строковые утилиты
utils/mock-data.utils.ts - Mock данные
utils/rivhit-converter.utils.ts - Конвертеры RIVHIT API
```

### 📊 Constants
```typescript
constants/api.constants.ts - API константы
constants/app.constants.ts - Константы приложения  
constants/printer.constants.ts - Константы принтеров
```

---

## Web Frontend (HTML/CSS/JS)

### 🌐 HTML Интерфейсы

#### **Production Interfaces**
- **`multilingual-orders-demo.html`** - Производственный интерфейс с реальным API
- **`real-orders-demo.html`** - Полная система упаковки с печатью
- **`full-orders-demo.html`** - Управление заказами с dual-tab интерфейсом

#### **Demo & Development**
- **`standalone-packing-demo.html`** - Интерактивная демонстрация упаковки
- **`quick-start-guide.html`** - Лаунчер для быстрого старта
- **`cors-solution-demo.html`** - Решения проблем CORS

#### **Testing & Debugging**  
- **`test-label.html`** - Тестирование этикеток
- **`printer-test-demo.html`** - Демо-тестирование принтера

### 🔧 Web Server Support
- **`server.js`** - Express сервер для HTML интерфейсов
- **CORS Proxy** - Прокси для RIVHIT API с CORS поддержкой
- **Token Management** - Управление API токенами

---

## Integration Systems

### 🔗 RIVHIT API Integration

#### **API Client Features**
- **SafeRivhitService** - Безопасный read-only клиент
- **Circuit Breaker** - Защита API с retry логикой
- **Caching System** - TTL кэширование (5 минут)
- **Rate Limiting** - Ограничение запросов (10/минуту)

#### **Document Type Mapping**
- **Type 1** - חשבונית מס (Invoice)
- **Type 2** - הצעת מחיר (Quote)  
- **Type 3** - תעודת משלוח (Delivery Note)
- **Type 7** - פרטי הזמנה (Order Details) - **Всегда содержит товары**

### 🖨️ Printer System

#### **Supported Printers**
- **GoDEX ZX420i** - Основной принтер с GoLabel интеграцией 🆕
  - GoLabel.exe CLI (приоритетный метод)
  - EZio32.dll SDK (резервный метод)
  - Direct USB (аварийный метод)
- **Zebra ZPL** - ZPL совместимые принтеры
- **Windows Printers** - Через WinLabel интеграцию

#### **Print Formats**
- **EZPX** 🆕 - Современный XML формат GoLabel
- **EZPL Templates** - GoDEX формат (`printer-templates/*.ezpl`)
- **ZPL** - Zebra Printing Language  
- **Image-based** - PNG/JPEG через Canvas

#### **GoLabel Integration Architecture** 🆕
```
┌─────────────────────────────────────────────────────────┐
│              GodexPrinterService                        │
│         (Automatic Method Selection)                    │
├─────────────────────────────────────────────────────────┤
│ Priority 1: GoLabel CLI │ Priority 2: SDK │ Priority 3: USB │
└─────────────────────────────────────────────────────────┘
```

#### **Template System**
```bash
printer-templates/
├── universal.ezpl - Универсальная этикетка
├── box-label.ezpl - Этикетка коробки  
├── blini.ezpl - Блины
├── pelmeni.ezpl - Пельмени
├── vareniki.ezpl - Вареники
└── manty.ezpl - Манты
```

---

## Testing Architecture

### 🧪 TDD Methodology

#### **Test Coverage Requirements**
- **Minimum**: 85% покрытие кода
- **Target**: >90% для критических модулей

#### **Test Types**
- **Unit Tests** - `**/__tests__/**/*.test.ts`
- **Integration Tests** - `/tests/integration/**/*.test.ts`
- **E2E Tests** - Playwright для frontend workflows

#### **Test Infrastructure**
```typescript
// Backend: Jest + ts-jest
jest.config.js - Конфигурация тестов
tests/setup.ts - Настройка тестовой среды

// Frontend: Jest + @testing-library/react  
tests/setup.ts - Настройка React тестов
```

### 🔍 Testing Services
```typescript
ApplicationServiceFactory.createTestServices() - Mock сервисы для тестов
MockRivhitService - Mock RIVHIT API для разработки
```

---

## Development Workflow

### 🚀 Scripts & Commands

#### **Development Commands**
```bash
npm run dev - Запуск backend + frontend
npm run dev:backend - Только backend (port 3001)  
npm run dev:frontend - Только Electron app

npx lerna run dev - Lerna команды для монорепо
npx lerna run build --scope=@packing/shared - Сборка shared пакета
```

#### **Testing Commands**  
```bash
npm run test:watch - TDD watch mode (рекомендуется)
npm run test:coverage - Отчет покрытия тестами
npm run test:e2e - End-to-end тесты (Playwright)
```

#### **Code Quality**
```bash
npm run lint - ESLint проверка
npm run format - Prettier форматирование  
npm run type-check - TypeScript проверка типов
npm run validate - Полная валидация (типы + lint + тесты)
```

### 🔧 Build & Package
```bash
npm run build - Сборка всех пакетов
npm run package - Создание Electron installer
electron-builder --win - Windows installer
```

---

## Configuration Management

### 🌍 Environment Variables

#### **Backend Configuration (.env)**
```bash
# RIVHIT API
RIVHIT_API_TOKEN=582C90F9-4CBB-4945-8792-943B1FCD5756
RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
RIVHIT_TIMEOUT=30000

# Development  
NODE_ENV=development
USE_MOCK_RIVHIT=false

# Printer
PRINTER_TEMPLATES_PATH=./printer-templates
USE_WINLABEL=false
```

#### **Root Configuration (.env.local)**
```bash  
# Web frontend
RIVHIT_API_TOKEN=582C90F9-4CBB-4945-8792-943B1FCD5756
RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
```

### ⚙️ Key Configuration Files
- **`lerna.json`** - Монорепо конфигурация
- **`tsconfig.json`** - TypeScript конфигурация
- **`.gitignore`** - Git исключения
- **`package.json`** - NPM зависимости и скрипты

---

## Security Features

### 🔐 Authentication & Authorization
- **JWT Tokens** - Аутентификация через jsonwebtoken
- **BCrypt** - Хэширование паролей  
- **Helmet** - HTTP заголовки безопасности
- **Rate Limiting** - express-rate-limit

### 🛡️ API Security
- **Input Validation** - Zod схемы валидации
- **CORS Protection** - Настройка CORS политик
- **SSL/TLS** - Сертификаты в `packages/backend/certs/`
- **Safe API Client** - Только read-only операции по умолчанию

---

## Performance & Scalability

### 📈 Caching Strategy
- **Memory Cache** - Быстрый in-memory кэш (MemoryCacheService)
- **Redis Cache** - Опциональный distributed кэш (RedisCacheService)  
- **RIVHIT API Cache** - TTL 5 минут для API ответов
- **Failed Orders Cache** - 10 минут для проблемных заказов

### ⚡ Performance Features
- **Compression** - Сжатие HTTP ответов
- **Connection Pooling** - Переиспользование соединений
- **Lazy Loading** - Ленивая загрузка компонентов
- **Adaptive Timeouts** - 5s quick timeout для проблемных заказов

---

## Deployment & Infrastructure

### 🏗️ Platform Support
- **Windows 10+** - Основная платформа (принтеры работают только на Windows)
- **macOS** - Разработка (принтеры показывают предупреждения)
- **Linux** - CI/CD поддержка

### 📦 Distribution
- **Electron App** - `.exe` installer для Windows  
- **Web Interface** - HTML файлы для браузерного доступа
- **Monorepo** - Lerna управление зависимостями

### 🚀 Quick Start Options
```bash
# Option 1: PowerShell launcher (Windows)  
.\start-server.ps1

# Option 2: Manual web server
node server.js  

# Option 3: Direct HTML access
# Открыть .html файлы в браузере
```

---

## Integration Points

### 🔗 External Integrations
- **RIVHIT ERP** - REST API интеграция для заказов, клиентов, товаров
- **GoDEX Printers** - EZPL протокол через USB/Ethernet  
- **WinLabel** - WINCODE Technology интеграция (Windows)
- **Windows Print System** - Системные принтеры Windows

### 📡 Internal Communication  
- **IPC** - Electron main ↔ renderer процессы
- **HTTP REST** - Frontend ↔ Backend API  
- **WebSocket** - Опционально для real-time обновлений

---

## Known Issues & Limitations

### ⚠️ Platform Limitations
- **Принтеры работают только на Windows 10+**
- macOS/Linux показывают warnings для printer features
- Некоторые RIVHIT заказы могут вызывать timeout (кэшируются как проблемные)

### 🐛 Common Issues
- `lerna: command not found` → использовать `npx lerna`
- `Cannot find module '@packing/shared'` → сначала собрать shared пакет
- CORS ошибки → использовать `cors-solution-demo.html`

---

## Development Team Notes

### 👥 Team Workflow  
- **TDD First** - Сначала тесты, потом код
- **85%+ Coverage** - Обязательное покрытие тестами
- **SOLID Principles** - Следование принципам SOLID во всем коде
- **Code Reviews** - Peer review через Pull Requests

### 📝 Documentation Standards
- **JSDoc** - Документация API в коде  
- **README.md** - Инструкции для каждого пакета
- **CLAUDE.md** - Инструкции для AI ассистента
- **Changelog** - Версионирование изменений

---

## Future Roadmap

### 🔮 Planned Features
- [ ] **Real-time Updates** - WebSocket для live статусов
- [ ] **Multi-printer Support** - Несколько принтеров одновременно  
- [ ] **Advanced Analytics** - Дашборд аналитики упаковки
- [ ] **Mobile App** - React Native мобильное приложение

### 🛠️ Technical Debt
- [ ] **Migration to TypeScript 5** - Обновление версии TypeScript
- [ ] **React 19 Upgrade** - Обновление React и зависимостей
- [ ] **Microservices Split** - Разделение backend на микросервисы
- [ ] **Docker Containerization** - Контейнеризация для развертывания

---

*Документация обновлена: {{ current_date }}*  
*Версия системы: 1.0.0*  
*Автор анализа: AI Assistant*