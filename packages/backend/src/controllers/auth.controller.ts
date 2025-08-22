import { Request, Response } from 'express';
import { loginUser, AuthRequest } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';

/**
 * Контроллер аутентификации
 * Следует принципам SOLID - Single Responsibility (только аутентификация)
 */

// Схемы валидации для аутентификации
export const LoginSchema = z.object({
  username: z.string()
    .min(3, 'Имя пользователя должно быть минимум 3 символа')
    .max(50, 'Имя пользователя слишком длинное')
    .regex(/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только буквы, цифры и _'),
  
  password: z.string()
    .min(6, 'Пароль должен быть минимум 6 символов')
    .max(100, 'Пароль слишком длинный')
});

export class AuthController {
  /**
   * Вход в систему
   * POST /api/auth/login
   * Body: { username: string, password: string }
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      const token = await loginUser(username, password);
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Неверное имя пользователя или пароль'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: {
          token,
          expiresIn: '24h',
          tokenType: 'Bearer',
          message: 'Аутентификация успешна'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Ошибка при входе в систему'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Выход из системы
   * POST /api/auth/logout
   * В простой реализации просто возвращаем успех
   * В продакшене токен должен добавляться в blacklist
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      // В продакшене здесь бы был код для добавления токена в blacklist
      // или invalidation в Redis/БД
      
      res.json({
        success: true,
        data: {
          message: 'Выход из системы выполнен успешно'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Ошибка при выходе из системы'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Получение информации о текущем пользователе
   * GET /api/auth/me
   * Требует аутентификации
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Пользователь не аутентифицирован'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            permissions: req.user.permissions
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_INFO_ERROR',
          message: 'Ошибка при получении информации о пользователе'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Проверка токена
   * POST /api/auth/verify
   * Headers: Authorization: Bearer <token>
   */
  async verifyToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Токен недействителен'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            permissions: req.user.permissions
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_VERIFICATION_ERROR',
          message: 'Ошибка при проверке токена'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Получение списка доступных разрешений
   * GET /api/auth/permissions
   * Для администраторов
   */
  async getAvailablePermissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const permissions = [
        { 
          name: 'read:orders', 
          description: 'Просмотр заказов',
          category: 'orders'
        },
        { 
          name: 'write:orders', 
          description: 'Изменение заказов',
          category: 'orders'
        },
        { 
          name: 'print:labels', 
          description: 'Печать этикеток',
          category: 'printing'
        },
        { 
          name: 'manage:users', 
          description: 'Управление пользователями',
          category: 'administration'
        }
      ];

      res.json({
        success: true,
        data: {
          permissions,
          categories: ['orders', 'printing', 'administration']
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSIONS_ERROR',
          message: 'Ошибка при получении списка разрешений'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}