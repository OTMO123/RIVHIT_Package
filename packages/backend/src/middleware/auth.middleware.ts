import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

/**
 * Базовая аутентификация для RIVHIT Packing System
 * Следует принципам SOLID - Single Responsibility (только аутентификация)
 */

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Простая база пользователей (в продакшене должна быть в БД)
const USERS: Record<string, { 
  id: number; 
  username: string; 
  passwordHash: string; 
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[] 
}> = {
  'admin': {
    id: 1,
    username: 'admin',
    passwordHash: '$2b$10$rQJ.4X8K9gJU8k8Y4KqVQ.vBjYJ8kkWCqEqRqEHGbOGJKLmJ8QZ9e', // 'admin123'
    role: 'admin',
    permissions: ['read:orders', 'write:orders', 'print:labels', 'manage:users']
  },
  'operator': {
    id: 2,
    username: 'operator',
    passwordHash: '$2b$10$rQJ.4X8K9gJU8k8Y4KqVQ.vBjYJ8kkWCqEqRqEHGbOGJKLmJ8QZ9e', // 'operator123' 
    role: 'operator',
    permissions: ['read:orders', 'write:orders', 'print:labels']
  },
  'viewer': {
    id: 3,
    username: 'viewer',
    passwordHash: '$2b$10$rQJ.4X8K9gJU8k8Y4KqVQ.vBjYJ8kkWCqEqRqEHGbOGJKLmJ8QZ9e', // 'viewer123'
    role: 'viewer', 
    permissions: ['read:orders']
  }
};

const JWT_SECRET = (process.env.JWT_SECRET || 'rivhit-packing-secret-2024') as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as string;

/**
 * Аутентификация по JWT токену
 * Проверяет токен в заголовке Authorization: Bearer <token>
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Токен аутентификации не предоставлен'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = USERS[decoded.username];
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_USER',
          message: 'Пользователь не найден'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Недействительный токен аутентификации'
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Проверка разрешений пользователя
 * @param requiredPermission - Необходимое разрешение (например: 'write:orders')
 */
export function requirePermission(requiredPermission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Требуется аутентификация'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Недостаточно прав. Требуется: ${requiredPermission}`,
          details: {
            required: requiredPermission,
            userPermissions: req.user.permissions
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

/**
 * Проверка роли пользователя
 * @param allowedRoles - Разрешенные роли
 */
export function requireRole(...allowedRoles: ('admin' | 'operator' | 'viewer')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Требуется аутентификация'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Недостаточно прав. Требуется роль: ${allowedRoles.join(' или ')}`,
          details: {
            required: allowedRoles,
            userRole: req.user.role
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

/**
 * Логин пользователя
 * @param username - Имя пользователя
 * @param password - Пароль
 * @returns JWT токен или null
 */
export async function loginUser(username: string, password: string): Promise<string | null> {
  const user = USERS[username];
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const token = (jwt.sign as any)(
    { 
      username: user.username,
      role: user.role,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return token;
}

/**
 * Хеширование пароля (для создания новых пользователей)
 * @param password - Пароль в открытом виде
 * @returns Хешированный пароль
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Middleware для опциональной аутентификации
 * Не блокирует запрос, если токена нет, но добавляет user в req если токен валидный
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = USERS[decoded.username];
    
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      };
    }
  } catch (error) {
    // Игнорируем ошибки токена в optional режиме
  }

  next();
}