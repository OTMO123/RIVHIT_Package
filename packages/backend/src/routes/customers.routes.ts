import { Router } from 'express';
import { CustomersController } from '../controllers/customers.controller';
import { Container } from '../app';
import { IRivhitService } from '../interfaces/IRivhitService';

const router = Router();

// Use dependency injection container
const container = Container.getInstance();
const rivhitService = container.get<IRivhitService>('rivhitService');
const customersController = new CustomersController(rivhitService);

/**
 * @route GET /api/customers
 * @description Get all customers
 * @access Public
 */
router.get('/', customersController.getCustomers.bind(customersController));

/**
 * @route GET /api/customers/:id
 * @description Get customer by ID
 * @access Public
 */
router.get('/:id', customersController.getCustomer.bind(customersController));

export default router;