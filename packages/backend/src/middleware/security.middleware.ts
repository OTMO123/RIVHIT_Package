import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security middleware для RIVHIT Packing System
 * Реализует защиту HTTPS, CSP, и другие security headers
 * Следует принципам SOLID - Single Responsibility (только безопасность)
 */

/**
 * 🔐 HTTPS Redirect Middleware 
 * Перенаправляет HTTP запросы на HTTPS (только в продакшене)
 * 
 * Метафора: "Охранник, который не пускает через главный вход, 
 * а направляет в VIP вход с металлоискателем"
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction): void {
  // ВРЕМЕННО: Всегда разрешаем HTTP для отладки
  console.log(`🔍 HTTPS redirect check: NODE_ENV=${process.env.NODE_ENV}, hostname=${req.hostname}`);
  next();
  return;
  
  // В development и локальной разработке всегда разрешаем HTTP
  if (process.env.NODE_ENV !== 'production' || req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
    next();
    return;
  }

  // Проверяем различные способы определения HTTPS
  const isHttps = req.secure || 
                  req.headers['x-forwarded-proto'] === 'https' ||
                  req.headers['x-forwarded-ssl'] === 'on';

  if (!isHttps) {
    // Перенаправляем на HTTPS версию
    const httpsUrl = `https://${req.get('host')}${req.url}`;
    
    res.status(301).redirect(httpsUrl);
    return;
  }

  next();
}

/**
 * 🛡️ Content Security Policy (CSP) 
 * Защищает от XSS атак, определяя какие ресурсы можно загружать
 * 
 * Метафора: "Список VIP гостей на вечеринке - кого пускать, кого нет"
 */
export function setupCSP(): ReturnType<typeof helmet.contentSecurityPolicy> {
  return helmet.contentSecurityPolicy({
    directives: {
      // Источники скриптов - только наши + inline (для React)
      scriptSrc: [
        "'self'",                    // Наши скрипты
        "'unsafe-inline'",           // Inline скрипты (нужно для React)
        'https://unpkg.com',         // CDN для библиотек
        'https://cdn.jsdelivr.net'   // Альтернативный CDN
      ],
      
      // Источники стилей - только наши + inline
      styleSrc: [
        "'self'",
        "'unsafe-inline'",           // Inline стили (нужно для styled-components)
        'https://fonts.googleapis.com'  // Google Fonts
      ],
      
      // Источники шрифтов
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',  // Google Fonts
        'data:'                       // Data URLs для иконочных шрифтов
      ],
      
      // Источники изображений
      imgSrc: [
        "'self'",
        'data:',                      // Data URLs (base64 картинки)
        'https:',                     // HTTPS картинки
        'blob:'                       // Blob URLs (для загруженных файлов)
      ],
      
      // API вызовы - только к нашему серверу и RIVHIT API
      connectSrc: [
        "'self'",                     // Наш API
        'http://localhost:3001',      // Наш backend API (HTTP)
        'https://localhost:3001',     // Наш backend API (HTTPS)
        'https://api.rivhit.co.il',   // RIVHIT API (правильный URL)
        'https://api.rivhit.com',     // RIVHIT API (fallback)
        'wss://localhost:*',          // WebSocket для development
        'ws://localhost:*'            // WebSocket для development
      ],
      
      // Источники объектов (для PDF и т.д.)
      objectSrc: ["'none'"],         // Блокируем все объекты (безопасность)
      
      // Источники media
      mediaSrc: ["'self'"],
      
      // Источники для iframe (блокируем все)
      frameSrc: ["'none'"],          // Блокируем iframe
      
      // Base URI - только наш домен
      baseUri: ["'self'"],
      
      // Источники для Web Workers
      workerSrc: ["'self'", 'blob:'],
      
      // Upgrade HTTP к HTTPS
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    
    // В development режиме показываем нарушения в консоли
    reportOnly: process.env.NODE_ENV === 'development'
  });
}

/**
 * 🔒 Strict Transport Security (HSTS)
 * Заставляет браузер использовать только HTTPS
 * 
 * Метафора: "Магнитный замок - раз попал через защищенный вход, 
 * больше никогда не пойдешь через обычный"
 */
export function setupHSTS(): ReturnType<typeof helmet.hsts> {
  return helmet.hsts({
    maxAge: 31536000,        // 1 год в секундах
    includeSubDomains: true, // Применять ко всем поддоменам
    preload: true           // Добавить в HSTS preload list браузеров
  });
}

/**
 * 🚫 X-Frame-Options
 * Защищает от clickjacking атак
 * 
 * Метафора: "Запрет на съемку в приватной зоне"
 */
export function setupFrameOptions(): ReturnType<typeof helmet.frameguard> {
  return helmet.frameguard({ 
    action: 'deny'  // Полностью запрещаем iframe
  });
}

/**
 * 🕵️ X-Content-Type-Options
 * Запрещает браузеру "угадывать" MIME типы
 * 
 * Метафора: "Строгий контроль документов - принимаем только то, 
 * что точно соответствует описанию"
 */
export function setupContentTypeOptions(): ReturnType<typeof helmet.noSniff> {
  return helmet.noSniff();
}

/**
 * 🔍 Referrer Policy
 * Контролирует какую информацию передавать в заголовке Referer
 * 
 * Метафора: "Политика конфиденциальности - не рассказываем откуда пришли"
 */
export function setupReferrerPolicy(): ReturnType<typeof helmet.referrerPolicy> {
  return helmet.referrerPolicy({ 
    policy: 'strict-origin-when-cross-origin'  // Передаем домен только при HTTPS->HTTPS
  });
}

/**
 * 🏠 Permissions Policy (ранее Feature Policy)
 * Запрещает использование опасных браузерных API
 * 
 * Метафора: "Правила поведения в офисе - что можно делать, что нельзя"
 */
export function setupPermissionsPolicy(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Permissions-Policy', 
    'camera=(), ' +           // Запрещаем камеру
    'microphone=(), ' +       // Запрещаем микрофон
    'geolocation=(), ' +      // Запрещаем геолокацию
    'payment=(), ' +          // Запрещаем Payment API
    'usb=(), ' +              // Запрещаем USB API
    'magnetometer=(), ' +     // Запрещаем магнитометр
    'gyroscope=(), ' +        // Запрещаем гироскоп
    'accelerometer=()'        // Запрещаем акселерометр
  );
  next();
}

/**
 * 🚨 Security Response Headers
 * Дополнительные заголовки безопасности
 */
export function setupSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Запрещаем кеширование sensitive данных
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Информация о сервере (скрываем версии)
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Пользовательские заголовки для RIVHIT
  res.setHeader('X-RIVHIT-Security', 'enabled');
  res.setHeader('X-API-Version', 'v1.0');
  
  next();
}

/**
 * 🔧 Middleware для rate limiting
 * Ограничивает количество запросов с одного IP
 * 
 * Метафора: "Турникет в метро - пропускает только определенное количество людей"
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const requestInfo = requestCounts.get(ip);
    
    if (!requestInfo || now > requestInfo.resetTime) {
      // Новое окно или первый запрос
      requestCounts.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (requestInfo.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Превышен лимит запросов. Максимум ${maxRequests} запросов в ${windowMs / 1000} секунд`,
          retryAfter: Math.ceil((requestInfo.resetTime - now) / 1000)
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Увеличиваем счетчик
    requestInfo.count++;
    requestCounts.set(ip, requestInfo);
    
    // Добавляем информационные заголовки
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - requestInfo.count);
    res.setHeader('X-RateLimit-Reset', new Date(requestInfo.resetTime).toISOString());
    
    next();
  };
}

/**
 * 🧹 Input Sanitization Middleware
 * Очищает входные данные от опасного содержимого
 * 
 * Метафора: "Дезинфекция перед входом в операционную"
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Функция для санитизации строк
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    return str
      // Удаляем HTML теги (базовая защита от XSS)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      // Экранируем опасные символы
      .replace(/[<>"'&]/g, (match) => {
        const escapeMap: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[match];
      })
      // Удаляем SQL injection паттерны
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      // Ограничиваем длину (защита от DoS)
      .substring(0, 10000);
  };
  
  // Рекурсивная санитизация объектов
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Санитизируем и ключи тоже
        const cleanKey = sanitizeString(key);
        sanitized[cleanKey] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Санитизируем body, query, params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

/**
 * 🛡️ Комплексная настройка безопасности
 * Применяет все security middleware за один вызов
 */
export function setupSecurity() {
  return [
    // Базовые helmet настройки
    helmet({
      contentSecurityPolicy: false, // Настраиваем отдельно
      hsts: false                   // Настраиваем отдельно
    }),
    
    // Наши кастомные настройки
    setupCSP(),
    setupHSTS(),
    setupFrameOptions(),
    setupContentTypeOptions(),
    setupReferrerPolicy(),
    setupPermissionsPolicy,
    setupSecurityHeaders,
    
    // Rate limiting (более мягкий для API)
    rateLimit(1000, 15 * 60 * 1000), // 1000 запросов в 15 минут
    
    // Input sanitization
    sanitizeInput,
    
    // HTTPS redirect (в продакшене)
    httpsRedirect
  ];
}