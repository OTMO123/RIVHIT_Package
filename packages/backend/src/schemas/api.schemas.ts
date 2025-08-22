import { z } from 'zod';

/**
 * Zod схемы для валидации API запросов
 * Следует принципам SOLID - Interface Segregation (специфичные схемы для каждого endpoint)
 * Используется в TDD подходе - схемы определяют контракт API
 */

// ==================== Базовые схемы ====================

/**
 * Схема для валидации Hebrew текста
 */
const hebrewTextSchema = z.string()
  .min(1, 'Текст не может быть пустым')
  .max(500, 'Текст слишком длинный')
  .refine(
    text => /[\u0590-\u05FF]/.test(text) || /^[a-zA-Z0-9\s\-_.,!?'"()]+$/.test(text),
    'Текст должен содержать Hebrew символы или латинские символы'
  );

/**
 * Схема для ID в RIVHIT системе
 */
const rivhitIdSchema = z.coerce.number()
  .int('ID должно быть целым числом')
  .positive('ID должно быть положительным числом');

/**
 * Схема для статусов заказов
 */
const orderStatusSchema = z.enum([
  'draft',
  'pending', 
  'approved',
  'in_progress',
  'packed',
  'ready_for_delivery',
  'delivered',
  'cancelled',
  'returned'
], {
  errorMap: () => ({ message: 'Недопустимый статус заказа' })
});

/**
 * Схема для типов документов RIVHIT
 */
const documentTypeSchema = z.coerce.number()
  .int()
  .min(1, 'Тип документа должен быть больше 0')
  .max(10, 'Недопустимый тип документа');

// ==================== Orders API Schemas ====================

/**
 * GET /api/orders - параметры запроса
 */
export const GetOrdersQuerySchema = z.object({
  // Пагинация
  page: z.string()
    .optional()
    .default('1')
    .transform(val => parseInt(val, 10))
    .refine(val => val >= 1, 'Номер страницы должен быть больше 0'),
  
  limit: z.string()
    .optional()
    .default('200')
    .transform(val => parseInt(val, 10))
    .refine(val => val >= 1 && val <= 200, 'Лимит должен быть от 1 до 200'),
  
  // Фильтрация по датам
  fromDate: z.string()
    .optional()
    .refine(
      val => !val || !isNaN(Date.parse(val)),
      'Дата начала должна быть в формате YYYY-MM-DD'
    ),
  
  toDate: z.string()
    .optional()
    .refine(
      val => !val || !isNaN(Date.parse(val)),
      'Дата окончания должна быть в формате YYYY-MM-DD'
    ),
  
  // Фильтрация по типу документа
  documentType: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : undefined)
    .refine(
      val => val === undefined || (val >= 1 && val <= 10),
      'Недопустимый тип документа'
    ),
  
  // Фильтрация по статусу
  status: orderStatusSchema.optional(),
  
  // Фильтрация по клиенту
  customerId: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : undefined)
    .refine(
      val => val === undefined || val > 0,
      'ID клиента должно быть положительным числом'
    ),
  
  // Поиск по тексту
  search: z.string()
    .max(100, 'Поисковый запрос слишком длинный')
    .optional()
}).refine(
  data => {
    // Проверяем что fromDate <= toDate
    if (data.fromDate && data.toDate) {
      return new Date(data.fromDate) <= new Date(data.toDate);
    }
    return true;
  },
  {
    message: 'Дата начала должна быть раньше или равна дате окончания',
    path: ['fromDate']
  }
);

/**
 * GET /api/orders/:id - параметры пути
 */
export const GetOrderByIdParamsSchema = z.object({
  id: z.string()
    .min(1, 'ID заказа не может быть пустым')
    .max(50, 'ID заказа слишком длинный')
});

/**
 * PUT /api/orders/:id/status - тело запроса
 */
export const UpdateOrderStatusBodySchema = z.object({
  status: orderStatusSchema,
  
  packingData: z.object({
    packedItems: z.array(
      z.object({
        item_id: rivhitIdSchema,
        packed_quantity: z.number()
          .min(0, 'Упакованное количество не может быть отрицательным')
          .max(1000000, 'Упакованное количество слишком большое'),
        notes: z.string()
          .max(500, 'Заметки слишком длинные')
          .optional(),
        reason: z.string()
          .max(200, 'Причина слишком длинная')
          .optional()
      })
    ).min(1, 'Должен быть указан хотя бы один товар'),
    
    packer: hebrewTextSchema
      .optional()
      .describe('Имя упаковщика'),
    
    packaging_date: z.string()
      .datetime('Дата упаковки должна быть в формате ISO 8601')
      .optional(),
    
    print_jobs: z.array(
      z.object({
        job_id: z.string().min(1, 'ID задания печати не может быть пустым'),
        type: z.enum(['shipping', 'product'], {
          errorMap: () => ({ message: 'Тип должен быть shipping или product' })
        }),
        timestamp: z.string().datetime('Время должно быть в формате ISO 8601')
      })
    ).optional()
  }).optional()
});

/**
 * PUT /api/orders/:id/status - параметры пути
 */
export const UpdateOrderStatusParamsSchema = GetOrderByIdParamsSchema;

// ==================== Print API Schemas ====================

/**
 * POST /api/print/labels - тело запроса
 */
export const PrintLabelsBodySchema = z.object({
  items: z.array(
    z.object({
      item_id: rivhitIdSchema,
      item_name: hebrewTextSchema,
      barcode: z.string()
        .regex(/^[0-9]{8,13}$/, 'Штрих-код должен содержать 8-13 цифр')
        .optional(),
      quantity: z.number()
        .int('Количество должно быть целым числом')
        .min(1, 'Количество должно быть больше 0')
        .max(1000, 'Количество слишком большое'),
      location: z.string()
        .max(50, 'Местоположение слишком длинное')
        .optional(),
      notes: z.string()
        .max(200, 'Заметки слишком длинные')
        .optional()
    })
  ).min(1, 'Должен быть указан хотя бы один товар для печати'),
  
  options: z.object({
    copies: z.number()
      .int('Количество копий должно быть целым числом')
      .min(1, 'Количество копий должно быть больше 0')
      .max(10, 'Слишком много копий')
      .optional()
      .default(1),
    
    template: z.string()
      .max(100, 'Имя шаблона слишком длинное')
      .optional(),
    
    priority: z.enum(['low', 'normal', 'high'], {
      errorMap: () => ({ message: 'Приоритет должен быть low, normal или high' })
    }).optional().default('normal'),
    
    notify_completion: z.boolean()
      .optional()
      .default(false)
  }).optional().default({})
});

/**
 * POST /api/print/single-label - тело запроса
 */
export const PrintSingleLabelBodySchema = z.object({
  item: PrintLabelsBodySchema.shape.items.element,
  options: PrintLabelsBodySchema.shape.options
});

/**
 * POST /api/print/shipping-label - тело запроса
 */
export const PrintShippingLabelBodySchema = z.object({
  orderId: z.string().min(1, 'ID заказа не может быть пустым'),
  
  customerName: hebrewTextSchema,
  
  address: z.string()
    .max(500, 'Адрес слишком длинный')
    .optional(),
  
  items: z.array(
    z.object({
      name: hebrewTextSchema,
      quantity: z.number().int().positive('Количество должно быть положительным'),
      weight: z.number()
        .positive('Вес должен быть положительным')
        .optional()
    })
  ).optional(),
  
  copies: z.number()
    .int('Количество копий должно быть целым числом')
    .min(1)
    .max(5)
    .optional()
    .default(1)
});

/**
 * POST /api/print/configure - тело запроса
 */
export const ConfigurePrinterBodySchema = z.object({
  model: z.enum(['godex_zx420', 'godex_zx430', 'zebra_zd410'], {
    errorMap: () => ({ message: 'Неподдерживаемая модель принтера' })
  }).optional(),
  
  dpi: z.number()
    .int()
    .refine(val => [203, 300, 600].includes(val), 'DPI должно быть 203, 300 или 600')
    .optional(),
  
  speed: z.number()
    .int()
    .min(1, 'Скорость должна быть больше 0')
    .max(10, 'Скорость должна быть не более 10')
    .optional(),
  
  darkness: z.number()
    .int()
    .min(1, 'Плотность должна быть больше 0')
    .max(20, 'Плотность должна быть не более 20')
    .optional(),
  
  label_size: z.object({
    width: z.number().positive('Ширина должна быть положительной'),
    height: z.number().positive('Высота должна быть положительной')
  }).optional()
});

/**
 * GET /api/print/jobs - параметры запроса
 */
export const GetPrintJobsQuerySchema = z.object({
  status: z.enum(['queued', 'printing', 'completed', 'failed'], {
    errorMap: () => ({ message: 'Недопустимый статус задания' })
  }).optional(),
  
  from_date: z.string()
    .optional()
    .refine(
      val => !val || !isNaN(Date.parse(val)),
      'Дата должна быть в формате ISO 8601'
    ),
  
  limit: z.string()
    .optional()
    .default('50')
    .transform(val => parseInt(val, 10))
    .refine(val => val >= 1 && val <= 200, 'Лимит должен быть от 1 до 200')
});

/**
 * GET /api/print/job/:jobId - параметры пути
 */
export const GetPrintJobParamsSchema = z.object({
  jobId: z.string()
    .min(1, 'ID задания не может быть пустым')
    .max(100, 'ID задания слишком длинное')
});

// ==================== Response Schemas ====================

/**
 * Схема для успешного ответа API
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  timestamp: z.string().datetime()
});

/**
 * Схема для ошибки API
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }),
  timestamp: z.string().datetime()
});

/**
 * Схема для пагинированного ответа
 */
export const PaginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(z.any()),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasNext: z.boolean()
  }),
  timestamp: z.string().datetime()
});

// ==================== Type exports для TypeScript ====================

export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;
export type GetOrderByIdParams = z.infer<typeof GetOrderByIdParamsSchema>;
export type UpdateOrderStatusBody = z.infer<typeof UpdateOrderStatusBodySchema>;
export type UpdateOrderStatusParams = z.infer<typeof UpdateOrderStatusParamsSchema>;

export type PrintLabelsBody = z.infer<typeof PrintLabelsBodySchema>;
export type PrintSingleLabelBody = z.infer<typeof PrintSingleLabelBodySchema>;
export type PrintShippingLabelBody = z.infer<typeof PrintShippingLabelBodySchema>;
export type ConfigurePrinterBody = z.infer<typeof ConfigurePrinterBodySchema>;
export type GetPrintJobsQuery = z.infer<typeof GetPrintJobsQuerySchema>;
export type GetPrintJobParams = z.infer<typeof GetPrintJobParamsSchema>;

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;