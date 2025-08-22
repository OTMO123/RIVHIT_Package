import { Router } from 'express';
import { ItemsController } from '../controllers/items.controller';
import { ApplicationServiceFactory } from '../factories/service.factory';

const router = Router();

// Initialize services
const services = ApplicationServiceFactory.createServices();
const itemsController = new ItemsController(services.rivhitService);

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