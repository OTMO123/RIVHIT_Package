import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Middleware для валидации запросов с использованием Zod
 * Следует принципам SOLID - Single Responsibility (только валидация)
 */
export interface ValidationSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
  headers?: ZodSchema<any>;
}

/**
 * Создает middleware для валидации запроса по Zod схемам
 * @param schemas - Объект с схемами валидации для разных частей запроса
 * @returns Express middleware функция
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Валидация body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Валидация query параметров
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Валидация path параметров
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      // Валидация headers
      if (schemas.headers) {
        // Нормализуем headers к lowercase для консистентности
        const normalizedHeaders = Object.keys(req.headers).reduce((acc, key) => {
          acc[key.toLowerCase()] = req.headers[key];
          return acc;
        }, {} as Record<string, any>);

        schemas.headers.parse(normalizedHeaders);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некорректные данные запроса',
            details: formatZodError(error)
          },
          timestamp: new Date().toISOString()
        };

        res.status(400).json(validationError);
      } else {
        // Непредвиденная ошибка валидации
        const internalError = {
          success: false,
          error: {
            code: 'VALIDATION_INTERNAL_ERROR',
            message: 'Внутренняя ошибка валидации'
          },
          timestamp: new Date().toISOString()
        };

        res.status(500).json(internalError);
      }
    }
  };
}

/**
 * Форматирует ошибки Zod в человекочитаемый формат
 * @param error - ZodError объект
 * @returns Форматированные ошибки валидации
 */
function formatZodError(error: ZodError): Record<string, any> {
  const formattedErrors: Record<string, any> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    const field = path || 'root';

    if (!formattedErrors[field]) {
      formattedErrors[field] = [];
    }

    formattedErrors[field].push({
      code: err.code,
      message: getHumanReadableMessage(err),
      received: 'received' in err ? err.received : undefined,
      expected: getExpectedValue(err)
    });
  });

  return formattedErrors;
}

/**
 * Преобразует коды ошибок Zod в человекочитаемые сообщения на русском
 * @param error - Zod ошибка
 * @returns Человекочитаемое сообщение
 */
function getHumanReadableMessage(error: z.ZodIssue): string {
  const field = error.path.join('.') || 'поле';

  switch (error.code) {
    case 'invalid_type':
      return `${field} должно быть типа ${error.expected}, получено ${error.received}`;
    
    case 'invalid_string':
      if (error.validation === 'email') {
        return `${field} должно быть действительным email адресом`;
      }
      if (error.validation === 'url') {
        return `${field} должно быть действительным URL`;
      }
      if (error.validation === 'uuid') {
        return `${field} должно быть действительным UUID`;
      }
      return `${field} содержит недопустимые символы`;
    
    case 'too_small':
      if (error.type === 'string') {
        return `${field} должно содержать минимум ${error.minimum} символов`;
      }
      if (error.type === 'number') {
        return `${field} должно быть не менее ${error.minimum}`;
      }
      if (error.type === 'array') {
        return `${field} должно содержать минимум ${error.minimum} элементов`;
      }
      return `${field} слишком маленькое`;
    
    case 'too_big':
      if (error.type === 'string') {
        return `${field} должно содержать максимум ${error.maximum} символов`;
      }
      if (error.type === 'number') {
        return `${field} должно быть не более ${error.maximum}`;
      }
      if (error.type === 'array') {
        return `${field} должно содержать максимум ${error.maximum} элементов`;
      }
      return `${field} слишком большое`;
    
    case 'invalid_enum_value':
      return `${field} должно быть одним из: ${error.options.join(', ')}`;
    
    case 'unrecognized_keys':
      return `Неизвестные поля: ${error.keys.join(', ')}`;
    
    case 'invalid_date':
      return `${field} должно быть действительной датой`;
    
    case 'custom':
      return error.message || `${field} не прошло пользовательскую валидацию`;
    
    default:
      return error.message || `${field} содержит недопустимое значение`;
  }
}

/**
 * Получает ожидаемое значение из ошибки Zod
 * @param error - Zod ошибка
 * @returns Ожидаемое значение или описание
 */
function getExpectedValue(error: z.ZodIssue): string | undefined {
  switch (error.code) {
    case 'invalid_type':
      return error.expected;
    
    case 'too_small':
      return `минимум ${error.minimum}`;
    
    case 'too_big':
      return `максимум ${error.maximum}`;
    
    case 'invalid_enum_value':
      return `один из: ${error.options.join(', ')}`;
    
    default:
      return undefined;
  }
}

/**
 * Middleware для валидации ID параметров (общий случай)
 */
export const validateIdParam = validateRequest({
  params: z.object({
    id: z.string().min(1, 'ID не может быть пустым')
  })
});

/**
 * Middleware для валидации пагинации в query параметрах
 */
export const validatePagination = validateRequest({
  query: z.object({
    page: z.string()
      .optional()
      .transform(val => val ? parseInt(val, 10) : 1)
      .refine(val => val >= 1, 'Номер страницы должен быть больше 0'),
    
    limit: z.string()
      .optional()
      .transform(val => val ? parseInt(val, 10) : 200)
      .refine(val => val >= 1 && val <= 200, 'Лимит должен быть от 1 до 200')
  })
});

/**
 * Middleware для валидации дат в query параметрах
 */
export const validateDateRange = validateRequest({
  query: z.object({
    fromDate: z.string()
      .optional()
      .refine(
        val => !val || !isNaN(Date.parse(val)), 
        'fromDate должно быть действительной датой'
      ),
    
    toDate: z.string()
      .optional()
      .refine(
        val => !val || !isNaN(Date.parse(val)), 
        'toDate должно быть действительной датой'
      )
  }).refine(
    data => {
      if (data.fromDate && data.toDate) {
        return new Date(data.fromDate) <= new Date(data.toDate);
      }
      return true;
    },
    'fromDate должно быть раньше или равно toDate'
  )
});

/**
 * Middleware для валидации Content-Type header
 */
export const validateJsonContentType = validateRequest({
  headers: z.object({
    'content-type': z.string().refine(
      val => val?.includes('application/json'),
      'Content-Type должен быть application/json'
    )
  })
});

/**
 * Базовая схема для API ответов (для документации)
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }).optional(),
  timestamp: z.string().datetime()
});

/**
 * Создает typed response helper для контроллеров
 */
export function createTypedResponse<T>(schema: ZodSchema<T>) {
  return (res: Response, data: T, status: number = 200) => {
    try {
      const validatedData = schema.parse(data);
      res.status(status).json({
        success: true,
        data: validatedData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Если данные не прошли валидацию, это внутренняя ошибка
      res.status(500).json({
        success: false,
        error: {
          code: 'RESPONSE_VALIDATION_ERROR',
          message: 'Внутренняя ошибка валидации ответа'
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}