import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintain proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Single Responsibility Principle - middleware только обрабатывает ошибки
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error для отладки
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Валидационные ошибки
  if (error.message.includes('must be')) {
    error = new AppError(error.message, 400);
  }

  // RIVHIT API ошибки
  if (error.message.includes('Failed to fetch')) {
    error = new AppError('External service unavailable', 503);
  }

  // Ошибки кэша
  if (error.message.includes('Cache')) {
    error = new AppError('Cache service error', 500);
  }

  // Ошибки таймаута
  if (error.message.includes('timeout')) {
    error = new AppError('Request timeout', 408);
  }

  // Ошибки сети
  if (error.message.includes('Network') || error.message.includes('ECONNREFUSED')) {
    error = new AppError('Network error', 503);
  }

  // Structured error response
  const response = {
    success: false,
    error: error.message || 'Internal server error',
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  };

  res.status(error.statusCode || 500).json(response);
};

// Middleware для обработки 404 ошибок
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404);
  next(error);
};

// Middleware для обработки асинхронных ошибок
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware для логирования запросов
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    // Логируем только медленные запросы или ошибки
    if (duration > 1000 || res.statusCode >= 400) {
      console.warn('Slow/Error request:', logData);
    } else {
      console.log('Request:', logData);
    }
  });
  
  next();
};

// Middleware для валидации Content-Type
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Skip validation for endpoints that don't require a request body
    const skipValidationPaths = [
      '/api/print/test',
      '/api/print/reconnect',
      '/api/orders/sync-pending'
    ];
    
    const shouldSkipValidation = skipValidationPaths.some(path => 
      req.originalUrl === path || req.originalUrl.endsWith(path)
    );
    
    if (!shouldSkipValidation && !req.is('application/json')) {
      const error = new AppError('Content-Type must be application/json', 400);
      return next(error);
    }
  }
  next();
};

// Middleware для CORS
export const corsHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};