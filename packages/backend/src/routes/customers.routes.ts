import { Router } from 'express';
import { CustomersController } from '../controllers/customers.controller';
import { ApplicationServiceFactory } from '../factories/service.factory';

const router = Router();

// Initialize services
const services = ApplicationServiceFactory.createServices();
const customersController = new CustomersController(services.rivhitService);

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