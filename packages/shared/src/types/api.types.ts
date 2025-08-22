export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    database: ServiceStatus;
    rivhit: ServiceStatus;
    printer: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
  lastCheck?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}