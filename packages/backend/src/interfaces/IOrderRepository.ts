import { Order, OrderStatus } from '@packing/shared';

export interface IOrderRepository {
  /**
   * Найти заказ по ID
   * @param id - ID заказа
   * @returns Promise<Order | null>
   */
  findById(id: string): Promise<Order | null>;

  /**
   * Найти заказы по статусу
   * @param status - Статус заказа
   * @returns Promise<Order[]>
   */
  findByStatus(status: OrderStatus): Promise<Order[]>;

  /**
   * Получить все заказы с пагинацией
   * @param page - Номер страницы
   * @param limit - Лимит записей
   * @returns Promise<{ orders: Order[], total: number }>
   */
  findAll(page: number, limit: number): Promise<{
    orders: Order[];
    total: number;
  }>;

  /**
   * Создать новый заказ
   * @param order - Данные заказа
   * @returns Promise<Order>
   */
  create(order: Omit<Order, 'id'>): Promise<Order>;

  /**
   * Обновить заказ
   * @param id - ID заказа
   * @param updates - Обновления
   * @returns Promise<Order>
   */
  update(id: string, updates: Partial<Order>): Promise<Order>;

  /**
   * Удалить заказ
   * @param id - ID заказа
   * @returns Promise<void>
   */
  delete(id: string): Promise<void>;
}