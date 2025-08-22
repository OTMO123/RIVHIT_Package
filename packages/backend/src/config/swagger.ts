import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

/**
 * Swagger конфигурация для RIVHIT Packing System API
 * Следует принципам TDD и SOLID - документация как спецификация
 */

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'RIVHIT Packing System API',
    version: '2.0.0',
    description: `
      Современный API для автоматизации упаковки заказов с интеграцией RIVHIT.
      
      ## Архитектурные принципы
      - **TDD**: Test-Driven Development
      - **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
      - **Type Safety**: Полная типизация TypeScript
      - **Security First**: Безопасная работа с RIVHIT API
      
      ## Особенности
      - Кэширование с TTL для производительности
      - Retry логика для надежности
      - Structured logging для мониторинга
      - Hebrew text support
      - Offline режим с синхронизацией
    `,
    termsOfService: 'https://company.com/terms',
    contact: {
      name: 'RIVHIT Packing System Support',
      url: 'https://company.com/support',
      email: 'support@company.com'
    },
    license: {
      name: 'Proprietary',
      url: 'https://company.com/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development сервер'
    },
    {
      url: 'https://api-staging.company.com',
      description: 'Staging сервер'
    },
    {
      url: 'https://api.company.com',
      description: 'Production сервер'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT токен для аутентификации'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API ключ для интеграции'
      }
    },
    schemas: {
      // RIVHIT Data Types
      RivhitDocument: {
        type: 'object',
        required: ['document_type', 'customer_id', 'issue_date'],
        properties: {
          document_type: {
            type: 'integer',
            description: 'Тип документа (1=Заказ, 2=Накладная, 3=Счет)',
            example: 1
          },
          document_number: {
            type: 'integer',
            description: 'Номер документа (автогенерируемый)',
            example: 12345
          },
          customer_id: {
            type: 'integer',
            description: 'ID клиента в RIVHIT',
            example: 1001
          },
          issue_date: {
            type: 'string',
            format: 'date',
            description: 'Дата выдачи документа',
            example: '2024-01-15'
          },
          total_amount: {
            type: 'number',
            format: 'float',
            description: 'Общая сумма заказа в шекелях',
            example: 150.50
          },
          status: {
            type: 'string',
            enum: ['draft', 'pending', 'approved', 'in_progress', 'packed', 'ready_for_delivery', 'delivered', 'cancelled'],
            description: 'Статус документа'
          }
        }
      },
      
      RivhitItem: {
        type: 'object',
        required: ['item_id', 'item_name', 'quantity'],
        properties: {
          item_id: {
            type: 'integer',
            description: 'ID товара в RIVHIT',
            example: 5001
          },
          item_name: {
            type: 'string',
            description: 'Название товара на иврите',
            example: 'בלינצ\'ס גבינה'
          },
          item_extended_description: {
            type: 'string',
            description: 'Расширенное описание товара',
            example: 'בלינצ\'ס גבינה טעימים במיוחד'
          },
          item_part_num: {
            type: 'string',
            nullable: true,
            description: 'Артикул товара',
            example: 'BLN-001'
          },
          barcode: {
            type: 'string',
            nullable: true,
            description: 'Штрих-код товара',
            example: '1234567890123'
          },
          quantity: {
            type: 'number',
            description: 'Количество (может быть отрицательным)',
            example: 5
          },
          cost_nis: {
            type: 'number',
            format: 'float',
            description: 'Себестоимость в шекелях',
            example: 12.50
          },
          sale_nis: {
            type: 'number',
            format: 'float',
            description: 'Цена продажи в шекелях',
            example: 18.90
          },
          location: {
            type: 'string',
            nullable: true,
            description: 'Местоположение на складе',
            example: 'A-01-15'
          }
        }
      },
      
      // Packing System Types
      PackingItem: {
        allOf: [
          { $ref: '#/components/schemas/RivhitItem' },
          {
            type: 'object',
            required: ['isPacked', 'isAvailable'],
            properties: {
              isPacked: {
                type: 'boolean',
                description: 'Упакован ли товар',
                example: false
              },
              isAvailable: {
                type: 'boolean',
                description: 'Доступен ли товар на складе',
                example: true
              },
              packedQuantity: {
                type: 'number',
                description: 'Упакованное количество',
                example: 3,
                default: 0
              },
              notes: {
                type: 'string',
                description: 'Заметки упаковщика',
                example: 'Товар найден не в том месте'
              },
              reason: {
                type: 'string',
                description: 'Причина неполной упаковки',
                example: 'Недостаток на складе'
              }
            }
          }
        ]
      },
      
      // Print System Types
      PrintJob: {
        type: 'object',
        required: ['id', 'orderId', 'status', 'createdAt'],
        properties: {
          id: {
            type: 'string',
            description: 'Уникальный ID задания печати',
            example: 'job_1642248000_abc123'
          },
          orderId: {
            type: 'string',
            description: 'ID заказа',
            example: '12345'
          },
          status: {
            type: 'string',
            enum: ['queued', 'printing', 'completed', 'failed'],
            description: 'Статус задания печати'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Время создания задания',
            example: '2024-01-15T10:30:00Z'
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Время завершения задания',
            example: '2024-01-15T10:32:15Z'
          },
          error: {
            type: 'string',
            nullable: true,
            description: 'Описание ошибки при неудачной печати',
            example: 'Принтер не отвечает'
          },
          stickers: {
            type: 'array',
            items: { $ref: '#/components/schemas/StickerPrintRequest' },
            description: 'Список стикеров для печати'
          }
        }
      },
      
      StickerPrintRequest: {
        type: 'object',
        required: ['type', 'quantity'],
        properties: {
          type: {
            type: 'string',
            description: 'Тип стикера',
            example: 'product_label'
          },
          template: {
            type: 'string',
            description: 'Шаблон для печати',
            example: 'blini_template.ezpl'
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Количество стикеров',
            example: 2
          },
          data: {
            type: 'object',
            description: 'Данные для заполнения шаблона',
            additionalProperties: true,
            example: {
              productName: 'בלינצ\'ס גבינה',
              barcode: '1234567890123',
              price: '18.90'
            }
          }
        }
      },
      
      // API Response Types  
      ApiResponse: {
        type: 'object',
        required: ['success', 'timestamp'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Успешность операции'
          },
          data: {
            description: 'Данные ответа (тип зависит от endpoint)',
            oneOf: [
              { type: 'object' },
              { type: 'array' },
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' }
            ]
          },
          error: {
            $ref: '#/components/schemas/ApiError'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Время ответа сервера',
            example: '2024-01-15T10:30:00Z'
          }
        }
      },
      
      ApiError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            description: 'Код ошибки',
            example: 'VALIDATION_ERROR'
          },
          message: {
            type: 'string',
            description: 'Человекочитаемое сообщение об ошибке',
            example: 'Некорректные параметры запроса'
          },
          details: {
            type: 'object',
            description: 'Дополнительные детали ошибки',
            additionalProperties: true
          }
        }
      },
      
      PaginatedResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                required: ['items', 'total', 'page', 'limit'],
                properties: {
                  items: {
                    type: 'array',
                    description: 'Массив элементов текущей страницы'
                  },
                  total: {
                    type: 'integer',
                    description: 'Общее количество элементов',
                    example: 150
                  },
                  page: {
                    type: 'integer',
                    description: 'Текущая страница (начиная с 1)',
                    example: 1
                  },
                  limit: {
                    type: 'integer',
                    description: 'Количество элементов на странице',
                    example: 200
                  },
                  hasNext: {
                    type: 'boolean',
                    description: 'Есть ли следующая страница',
                    example: true
                  }
                }
              }
            }
          }
        ]
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Номер страницы (начиная с 1)',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Количество элементов на странице',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 200,
          default: 200
        }
      },
      DateFromParam: {
        name: 'fromDate',
        in: 'query',
        description: 'Дата начала периода (YYYY-MM-DD)',
        required: false,
        schema: {
          type: 'string',
          format: 'date',
          example: '2024-01-01'
        }
      },
      DateToParam: {
        name: 'toDate',
        in: 'query',
        description: 'Дата окончания периода (YYYY-MM-DD)',
        required: false,
        schema: {
          type: 'string',
          format: 'date',
          example: '2024-01-31'
        }
      }
    },
    responses: {
      Success: {
        description: 'Успешная операция',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiResponse'
            }
          }
        }
      },
      BadRequest: {
        description: 'Некорректный запрос',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiResponse'
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Некорректные параметры запроса',
                details: {
                  field: 'orderId',
                  value: 'invalid-id',
                  expected: 'numeric string'
                }
              },
              timestamp: '2024-01-15T10:30:00Z'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Требуется аутентификация',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiResponse'
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Требуется действительный токен аутентификации'
              },
              timestamp: '2024-01-15T10:30:00Z'
            }
          }
        }
      },
      NotFound: {
        description: 'Ресурс не найден',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiResponse'
            },
            example: {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Заказ с указанным ID не найден'
              },
              timestamp: '2024-01-15T10:30:00Z'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Внутренняя ошибка сервера',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ApiResponse'
            },
            example: {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Произошла внутренняя ошибка сервера'
              },
              timestamp: '2024-01-15T10:30:00Z'
            }
          }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Orders',
      description: 'Управление заказами и их статусами'
    },
    {
      name: 'Print',
      description: 'Система печати этикеток и баркодов'
    },
    {
      name: 'System',
      description: 'Системные endpoints для мониторинга'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/config/swagger.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;