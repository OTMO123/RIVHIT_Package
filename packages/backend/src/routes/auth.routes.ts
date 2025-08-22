import { Router } from 'express';
import { AuthController, LoginSchema } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           pattern: '^[a-zA-Z0-9_]+$'
 *           example: "admin"
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           example: "admin123"
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             expiresIn:
 *               type: string
 *               example: "24h"
 *             tokenType:
 *               type: string
 *               example: "Bearer"
 *         timestamp:
 *           type: string
 *           format: date-time
 *     UserInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         username:
 *           type: string
 *           example: "admin"
 *         role:
 *           type: string
 *           enum: [admin, operator, viewer]
 *           example: "admin"
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["read:orders", "write:orders", "print:labels", "manage:users"]
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Вход в систему
 *     description: |
 *       Аутентификация пользователя по имени и паролю.
 *       Возвращает JWT токен для последующих запросов.
 *       
 *       **Тестовые пользователи:**
 *       - admin / admin123 (полные права)
 *       - operator / operator123 (работа с заказами и печать)
 *       - viewer / viewer123 (только просмотр)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             username: "admin"
 *             password: "admin123"
 *     responses:
 *       200:
 *         description: Успешная аутентификация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_CREDENTIALS"
 *                 message: "Неверное имя пользователя или пароль"
 *               timestamp: "2024-01-15T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/login', 
  validateRequest({ body: LoginSchema }),
  async (req, res) => {
    await authController.login(req, res);
  }
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Выход из системы
 *     description: Выход из системы (invalidation токена)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 message: "Выход из системы выполнен успешно"
 *               timestamp: "2024-01-15T10:30:00Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout',
  authenticateToken,
  async (req, res) => {
    await authController.logout(req, res);
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Информация о текущем пользователе
 *     description: Получение информации о текущем аутентифицированном пользователе
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
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
 *                         user:
 *                           $ref: '#/components/schemas/UserInfo'
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: 1
 *                   username: "admin"
 *                   role: "admin"
 *                   permissions: ["read:orders", "write:orders", "print:labels", "manage:users"]
 *               timestamp: "2024-01-15T10:30:00Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me',
  authenticateToken,
  async (req, res) => {
    await authController.getCurrentUser(req, res);
  }
);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     tags: [Authentication]
 *     summary: Проверка токена
 *     description: Проверка действительности JWT токена
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Токен действителен
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
 *                         valid:
 *                           type: boolean
 *                           example: true
 *                         user:
 *                           $ref: '#/components/schemas/UserInfo'
 *       401:
 *         description: Токен недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify',
  authenticateToken,
  async (req, res) => {
    await authController.verifyToken(req, res);
  }
);

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     tags: [Authentication]
 *     summary: Список доступных разрешений
 *     description: Получение списка всех доступных разрешений в системе (только для администраторов)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список разрешений
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
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "read:orders"
 *                               description:
 *                                 type: string
 *                                 example: "Просмотр заказов"
 *                               category:
 *                                 type: string
 *                                 example: "orders"
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["orders", "printing", "administration"]
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/permissions',
  authenticateToken,
  requirePermission('manage:users'),
  async (req, res) => {
    await authController.getAvailablePermissions(req, res);
  }
);

export default router;