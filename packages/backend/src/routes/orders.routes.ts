import { Router } from 'express';
import { OrdersController } from '../controllers/orders.controller';
import { IRivhitService } from '../interfaces/IRivhitService';
import { ICacheService } from '../interfaces/ICacheService';
import { validateRequest } from '../middleware/validation.middleware';
import {
  GetOrdersQuerySchema,
  GetOrderByIdParamsSchema,
  UpdateOrderStatusParamsSchema,
  UpdateOrderStatusBodySchema
} from '../schemas/api.schemas';

const router = Router();

// Фабрика для создания контроллера с зависимостями
const createOrdersController = (rivhitService: IRivhitService): OrdersController => {
  return new OrdersController(rivhitService);
};

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Получить список заказов
 *     description: |
 *       Возвращает список заказов из RIVHIT с возможностью фильтрации.
 *       Данные кэшируются на 5 минут для повышения производительности.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *       - name: documentType
 *         in: query
 *         description: Тип документа для фильтрации
 *         required: false
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3, 4]
 *           example: 1
 *       - name: status
 *         in: query
 *         description: Статус заказа для фильтрации
 *         required: false
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, in_progress, packed, ready_for_delivery, delivered, cancelled]
 *       - name: customerId
 *         in: query
 *         description: ID клиента для фильтрации
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1001
 *     responses:
 *       200:
 *         description: Список заказов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/RivhitDocument'
 *             example:
 *               success: true
 *               data:
 *                 items:
 *                   - document_number: 12345
 *                     customer_id: 1001
 *                     total_amount: 150.50
 *                     status: 'pending'
 *                     issue_date: '2024-01-15'
 *                 total: 1
 *                 page: 1
 *                 limit: 200
 *                 hasNext: false
 *               timestamp: '2024-01-15T10:30:00Z'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', 
  validateRequest({ query: GetOrdersQuerySchema }),
  async (req, res) => {
    const controller = req.app.locals.ordersController as OrdersController;
    await controller.getOrders(req, res);
  }
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Получить заказ по ID
 *     description: Возвращает детальную информацию о заказе включая товары и статус
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Уникальный ID заказа
 *         schema:
 *           type: string
 *           example: "12345"
 *     responses:
 *       200:
 *         description: Детали заказа успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RivhitDocument'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', 
  validateRequest({ params: GetOrderByIdParamsSchema }),
  async (req, res) => {
    const controller = req.app.locals.ordersController as OrdersController;
    await controller.getOrderById(req, res);
  }
);

/**
 * @swagger
 * /api/orders/{id}/items:
 *   get:
 *     tags: [Orders]
 *     summary: Получить товары заказа
 *     description: Возвращает список всех товаров в заказе с информацией о наличии и упаковке
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID заказа
 *         schema:
 *           type: string
 *           example: "12345"
 *     responses:
 *       200:
 *         description: Список товаров заказа
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PackingItem'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/items', 
  validateRequest({ params: GetOrderByIdParamsSchema }),
  async (req, res) => {
    const controller = req.app.locals.ordersController as OrdersController;
    await controller.getOrderItems(req, res);
  }
);

/**
 * @swagger
 * /api/orders/{id}/customer:
 *   get:
 *     tags: [Orders]
 *     summary: Получить информацию о клиенте заказа
 *     description: Возвращает детальную информацию о клиенте для указанного заказа
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID заказа
 *         schema:
 *           type: string
 *           example: "12345"
 *     responses:
 *       200:
 *         description: Информация о клиенте
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         customer_id:
 *                           type: integer
 *                           example: 1001
 *                         first_name:
 *                           type: string
 *                           example: "דוד"
 *                         last_name:
 *                           type: string
 *                           example: "כהן"
 *                         phone:
 *                           type: string
 *                           example: "050-1234567"
 *                         address:
 *                           type: string
 *                           example: "רחוב הרצל 123, תל אביב"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/customer', 
  validateRequest({ params: GetOrderByIdParamsSchema }),
  async (req, res) => {
    const controller = req.app.locals.ordersController as OrdersController;
    await controller.getOrderCustomer(req, res);
  }
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     tags: [Orders]
 *     summary: Обновить статус заказа
 *     description: |
 *       Обновляет статус заказа в RIVHIT системе. Включает данные упаковки и автоматическую синхронизацию.
 *       В случае недоступности RIVHIT API, данные сохраняются локально для последующей синхронизации.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID заказа для обновления
 *         schema:
 *           type: string
 *           example: "12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, packed, completed, cancelled]
 *                 description: Новый статус заказа
 *                 example: "packed"
 *               packingData:
 *                 type: object
 *                 description: Данные о процессе упаковки
 *                 properties:
 *                   packedItems:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         item_id:
 *                           type: integer
 *                         packed_quantity:
 *                           type: number
 *                         notes:
 *                           type: string
 *                         reason:
 *                           type: string
 *                   packer:
 *                     type: string
 *                     example: "משה לוי"
 *                   packaging_date:
 *                     type: string
 *                     format: date-time
 *                   print_jobs:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         job_id:
 *                           type: string
 *                         type:
 *                           type: string
 *                           enum: [shipping, product]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *     responses:
 *       200:
 *         description: Статус заказа успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 updated: true
 *                 orderId: "12345"
 *                 status: "packed"
 *                 sync_status: "synced"
 *               timestamp: '2024-01-15T10:30:00Z'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id/status', 
  validateRequest({ 
    params: UpdateOrderStatusParamsSchema,
    body: UpdateOrderStatusBodySchema 
  }),
  async (req, res) => {
    const controller = req.app.locals.ordersController as OrdersController;
    await controller.updateOrderStatus(req, res);
  }
);

/**
 * @swagger
 * /api/orders/sync-pending:
 *   post:
 *     tags: [Orders]
 *     summary: Синхронизация отложенных обновлений
 *     description: |
 *       Синхронизирует все локально сохраненные обновления статусов заказов с RIVHIT API.
 *       Используется для восстановления после отключения сети или недоступности RIVHIT API.
 *     responses:
 *       200:
 *         description: Синхронизация успешно завершена
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         synced_count:
 *                           type: integer
 *                           description: Количество синхронизированных записей
 *                           example: 5
 *                         failed_count:
 *                           type: integer
 *                           description: Количество неудачных синхронизаций
 *                           example: 0
 *                         pending_count:
 *                           type: integer
 *                           description: Количество оставшихся pending записей
 *                           example: 0
 *             example:
 *               success: true
 *               data:
 *                 synced_count: 5
 *                 failed_count: 0
 *                 pending_count: 0
 *               timestamp: '2024-01-15T10:35:00Z'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sync-pending', async (req, res) => {
  const controller = req.app.locals.ordersController as OrdersController;
  await controller.syncPendingUpdates(req, res);
});

// Admin endpoint to clear failed orders cache
router.post('/clear-failed-cache', async (req, res) => {
  const controller = req.app.locals.ordersController as OrdersController;
  await controller.clearFailedCache(req, res);
});

export default router;