# RIVHIT Packing System

## ⚡ Quick Start for Developers

### Prerequisites
- **Node.js 18+** (required)
- **npm** (comes with Node.js)

### Setup (First Time)
```bash
# 1. Navigate to the project root directory
cd RIVHIT_Package

# 2. Install all dependencies
npm install

# 3. Build shared package (required before starting services)
npx lerna run build --scope=@packing/shared

# 4. Start development servers
# Option A: Start both services together
npx lerna run dev

# Option B: Start services separately
npx lerna run dev --scope=@packing/backend   # Backend on port 3001
npx lerna run dev --scope=@packing/frontend  # Electron app
```

### ⚠️ Important Notes
- **Always use `npx lerna`** instead of `npm run` for lerna commands
- **Build shared package first** before starting backend/frontend
- **macOS/Linux users**: Printer warnings are normal (Windows-only feature)

### Troubleshooting
| Issue | Solution |
|-------|----------|
| `lerna: command not found` | Use `npx lerna` instead of `lerna` |
| `Cannot find module '@packing/shared'` | Run `npx lerna run build --scope=@packing/shared` first |
| Permission errors | Make sure you're in the correct directory |
| Printer warnings on macOS | Normal - printer features are Windows-only |

---

## 🚀 Overview

**RIVHIT Packing System** - это современное Electron-приложение для автоматизации процесса упаковки заказов, интегрированное с системой управления RIVHIT. Система обеспечивает безопасную работу с базой данных RIVHIT, автоматическую печать баркодов и подтверждение комплектации заказов.

## 🎯 Бизнес-цели

- **Автоматизация упаковки**: Полная автоматизация процесса от получения заказа до печати стикеров
- **Интеграция с RIVHIT**: Безопасная работа с существующей базой данных без риска повреждения
- **Печать баркодов**: Автоматическая печать этикеток для логистики и отслеживания
- **Контроль качества**: Подтверждение комплектации и фиксация недостающих товаров
- **Простота использования**: Интуитивный Hebrew интерфейс для операторов

## 🏗️ Архитектура системы

### Monorepo структура
- `packages/backend` - Express.js API сервер с RIVHIT интеграцией
- `packages/frontend` - Electron desktop приложение с React UI
- `packages/shared` - Общие TypeScript типы и утилиты

### Технологический стек

#### Backend
- **Node.js 18+** с TypeScript
- **Express.js** для API сервера с middleware
- **SQLite + TypeORM** для локального кэширования
- **Winston** для структурированного логирования
- **Axios** для RIVHIT API интеграции

#### Frontend
- **Electron 37** для desktop приложения
- **React 18** с TypeScript и strict mode
- **Ant Design 5** для UI компонентов
- **Zustand** для state management
- **Hebrew RTL** интерфейс с локализацией

#### Testing & Quality
- **Jest** для unit/integration тестов (цель: 85%+ coverage)
- **Playwright** для E2E тестов
- **ESLint + Prettier** с pre-commit hooks
- **TDD** методология разработки

## 🧱 Архитектурные принципы

### SOLID Principles
Вся система построена на принципах SOLID:

- **Single Responsibility**: Каждый класс/сервис имеет одну четко определенную ответственность
- **Open/Closed**: Код открыт для расширения, закрыт для изменения
- **Liskov Substitution**: Все реализации интерфейсов взаимозаменяемы
- **Interface Segregation**: Интерфейсы специфичны и сфокусированы
- **Dependency Inversion**: Зависимость от абстракций, не от конкретных реализаций

### Design Patterns
- **Factory Pattern**: ApplicationServiceFactory создает все сервисы
- **Repository Pattern**: Абстракция работы с данными
- **Dependency Injection**: Container управляет зависимостями
- **Observer Pattern**: Для событий и уведомлений
- **Command Pattern**: Для операций печати и API вызовов

### TDD Методология
Разработка ведется по принципу Test-Driven Development:

1. **Red**: Написание failing теста
2. **Green**: Минимальная реализация для прохождения теста
3. **Refactor**: Улучшение кода с сохранением тестов

```bash
# Цикл TDD
npm run test:watch  # Непрерывное тестирование
npm run test:unit   # Unit тесты (85%+ coverage)
npm run test:integration  # Integration тесты
```

## 🚀 Development Setup

### Предварительные требования

- **Node.js 18+**
- **npm 8+** или **yarn 1.22+**
- **Git** с настроенными pre-commit hooks
- **Windows 10+** (для принтера GoDEX)

### Установка и настройка

1. **Клонирование и установка зависимостей**
```bash
git clone <repository-url>
cd packing-system
npm install
```

2. **Конфигурация окружения**
```bash
# Backend configuration
cp packages/backend/.env.example packages/backend/.env
# Настройте RIVHIT_API_TOKEN в .env файле
```

3. **TDD setup**
```bash
# Запуск в watch режиме для TDD
npm run test:watch
```

4. **Development сервера**
```bash
# Backend (порт 3001)
npm run dev:backend

# Frontend (новый терминал)
npm run dev:frontend
```

### Структура проекта (следуя SOLID)

```
packing-system/
├── packages/
│   ├── backend/                 # Express API сервер
│   │   ├── src/
│   │   │   ├── controllers/     # API контроллеры (Single Responsibility)
│   │   │   ├── services/        # Бизнес-логика с DI
│   │   │   ├── interfaces/      # Контракты (Interface Segregation)
│   │   │   ├── factories/       # Factory Pattern для создания объектов
│   │   │   ├── middleware/      # Express middleware
│   │   │   ├── types/           # TypeScript типы
│   │   │   └── config/          # Конфигурация приложения
│   │   ├── tests/               # TDD тесты
│   │   │   ├── unit/            # Unit тесты
│   │   │   ├── integration/     # Integration тесты
│   │   │   └── e2e/             # End-to-end тесты
│   │   └── package.json
│   ├── frontend/                # Electron приложение
│   │   ├── src/
│   │   │   ├── main/            # Electron main process
│   │   │   │   ├── main.ts      # Entry point
│   │   │   │   ├── ipc-handlers.ts  # IPC обработчики
│   │   │   │   └── preload.ts   # Preload script
│   │   │   └── renderer/        # React приложение
│   │   │       ├── components/  # UI компоненты
│   │   │       ├── pages/       # Страницы приложения
│   │   │       ├── store/       # State management (Zustand)
│   │   │       ├── services/    # Frontend сервисы
│   │   │       └── hooks/       # Custom React hooks
│   │   ├── tests/               # Frontend тесты
│   │   └── public/              # Статичные ресурсы
│   └── shared/                  # Общие типы и утилиты
│       ├── src/
│       │   ├── types/           # Общие TypeScript типы
│       │   ├── constants/       # Константы приложения
│       │   ├── validators/      # Zod схемы валидации
│       │   └── utils/           # Утилиты и хелперы
│       └── tests/               # Тесты shared компонентов
├── docs/                        # Документация
├── tools/                       # Build скрипты и инструменты
├── lerna.json                   # Lerna конфигурация
└── package.json                 # Root package.json
```

## 📜 Доступные команды

### Development
```bash
npm run dev                    # Запуск backend + frontend
npm run dev:backend           # Только backend сервер
npm run dev:frontend          # Только frontend приложение
```

### TDD Testing
```bash
npm run test                  # Все тесты
npm run test:watch           # TDD watch режим
npm run test:unit            # Unit тесты
npm run test:integration     # Integration тесты
npm run test:e2e             # E2E тесты
npm run test:coverage        # Coverage отчет
```

### Code Quality
```bash
npm run lint                  # ESLint проверка
npm run lint:fix             # Автоисправление ESLint
npm run type-check           # TypeScript проверка
npm run format               # Prettier форматирование
```

### Building & Packaging
```bash
npm run build                # Сборка всех пакетов
npm run package             # Electron installer
npm run clean               # Очистка build артефактов
```

## ✅ Реализованные функции

### Backend (85% готово)
- ✅ **RIVHIT API интеграция** с кэшированием и retry логикой
- ✅ **Система печати GoDEX** с EZPL templates
- ✅ **Express API** с типизированными endpoints
- ✅ **Dependency Injection** Container с Factory Pattern
- ✅ **Структурированное логирование** (Winston)
- ✅ **Error handling** middleware с типизацией
- ✅ **Unit тесты** для основных сервисов

### Frontend (70% готово)  
- ✅ **Electron + React** архитектура
- ✅ **Hebrew RTL интерфейс** с полной локализацией
- ✅ **Zustand state management** с TypeScript
- ✅ **IPC коммуникация** между процессами
- ✅ **Ant Design компоненты** адаптированные для Hebrew
- ✅ **Страницы заказов** с фильтрацией и поиском

### RIVHIT Integration (80% готово)
- ✅ **SafeRivhitService** - безопасный readonly клиент
- ✅ **Кэширование** с TTL и invalidation
- ✅ **Offline режим** с локальным сохранением
- ✅ **Circuit breaker** для защиты API

## 🚧 Что нужно доработать

### Высокий приоритет
- ❌ **API документация** (OpenAPI/Swagger)
- ❌ **Zod валидация** для всех endpoints
- ❌ **Базовая аутентификация** и авторизация
- ❌ **Entity модели** и Repository слой
- ❌ **IPC интеграция** с real backend в main process

### Средний приоритет  
- ❌ **PrintConfirmationPage** - завершение UI
- ❌ **Error boundaries** для React компонентов
- ❌ **Comprehensive тесты** (цель: 85%+ coverage)
- ❌ **Performance оптимизация** и bundle analysis
- ❌ **Мониторинг и метрики** (Prometheus)

### Низкий приоритет
- ❌ **CI/CD pipeline** (GitHub Actions)
- ❌ **Security audit** и vulnerability scanning
- ❌ **i18n система** для мультиязычности
- ❌ **Dark mode** поддержка

## 🧪 Testing стратегия (TDD)

### Принципы тестирования
- **Test First**: Сначала пишем тесты, потом код
- **Red-Green-Refactor**: Классический TDD цикл
- **85%+ Coverage**: Минимальный порог покрытия
- **Fast Feedback**: Быстрые unit тесты, медленные E2E

### Запуск тестов
```bash
# TDD режим (рекомендуемый)
npm run test:watch

# Все тесты с coverage
npm run test:coverage

# Конкретные типы тестов
npm run test:unit
npm run test:integration
npm run test:e2e

# Тесты конкретного пакета
npm run test --scope=@packing/backend
npm run test --scope=@packing/frontend
```

### Примеры TDD
```typescript
// 1. RED - Пишем failing тест
describe('OrderService', () => {
  it('should update order status', async () => {
    const service = new OrderService(mockRepo, mockLogger);
    const result = await service.updateStatus('123', 'completed');
    expect(result.success).toBe(true);
  });
});

// 2. GREEN - Минимальная реализация
class OrderService {
  async updateStatus(id: string, status: string) {
    return { success: true };
  }
}

// 3. REFACTOR - Улучшаем код с сохранением тестов
```

## 👨‍💻 Contributing (TDD + SOLID)

### Workflow для разработчиков
1. **Setup**: `npm run test:watch` - запуск TDD режима
2. **RED**: Написать failing тест для новой функции
3. **GREEN**: Минимальная реализация для прохождения теста  
4. **REFACTOR**: Улучшение кода с SOLID принципами
5. **Commit**: Meaningful commit message
6. **PR**: Code review с focus на SOLID и test coverage

### Code Standards
- **TypeScript strict mode**: Обязательная типизация
- **SOLID principles**: Каждый класс следует принципам
- **Interface Segregation**: Мелкие, специфичные интерфейсы
- **Dependency Injection**: Все зависимости через DI Container
- **Single Responsibility**: Один класс = одна ответственность

### Pre-commit hooks
```bash
# Автоматически запускается при commit
- npm run lint:fix      # Исправление ESLint ошибок
- npm run type-check    # TypeScript проверка
- npm run test:unit     # Unit тесты
- npm run format        # Prettier форматирование
```

## 📚 Документация

### Для разработчиков
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup и coding guidelines
- [ARCHITECTURE.md](./docs/architecture.md) - Детали архитектуры
- [API.md](./docs/api.md) - API документация

### Для пользователей
- [USER_MANUAL.md](./docs/user-manual.md) - Руководство пользователя
- [TROUBLESHOOTING.md](./docs/troubleshooting.md) - Устранение неполадок

## 📞 Поддержка

### Контакты команды
- **Technical Lead**: senior-dev@company.com
- **Backend Lead**: backend-dev@company.com  
- **Frontend Lead**: frontend-dev@company.com

### Известные ограничения
- Поддержка только Windows платформы
- Требуется стабильное соединение с RIVHIT API
- Поддержка только принтеров GoDEX/Zebra

---

**RIVHIT Packing System v2.0** - Современное решение для автоматизации упаковки заказов, построенное на принципах TDD и SOLID с интеграцией в экосистему RIVHIT.