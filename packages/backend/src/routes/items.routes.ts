import { Router } from 'express';
import { ItemsController } from '../controllers/items.controller';
import { Container } from '../app';
import { IRivhitService } from '../interfaces/IRivhitService';

const router = Router();

// Use dependency injection container
const container = Container.getInstance();
const rivhitService = container.get<IRivhitService>('rivhitService');
const itemsController = new ItemsController(rivhitService);

/**
 * @route GET /api/items
 * @description Get all items
 * @access Public
 */
router.get('/', itemsController.getItems.bind(itemsController));

/**
 * @route GET /api/items/:id
 * @description Get item by ID
 * @access Public
 */
router.get('/:id', itemsController.getItem.bind(itemsController));

/**
 * @route GET /api/orders/:orderId/items
 * @description Get items for a specific order
 * @access Public
 */
router.get('/order/:orderId', itemsController.getOrderItems.bind(itemsController));

/**
 * @route PUT /api/items/:id/stock
 * @description Update item stock status
 * @access Public
 */
router.put('/:id/stock', itemsController.updateItemStock.bind(itemsController));

export default router;