import { Router } from 'express';
import { PrintController } from '../controllers/print.controller';
import { validateRequest } from '../middleware/validation.middleware';
import {
  PrintLabelsBodySchema,
  PrintSingleLabelBodySchema,
  PrintShippingLabelBodySchema,
  ConfigurePrinterBodySchema,
  GetPrintJobsQuerySchema,
  GetPrintJobParamsSchema
} from '../schemas/api.schemas';

const router = Router();
const printController = new PrintController();

/**
 * @route POST /api/print/labels
 * @desc Печать этикеток для выбранных товаров
 * @body { items: PackingItem[], options?: PrintJobOptions }
 */
router.post('/labels', 
  validateRequest({ body: PrintLabelsBodySchema }),
  async (req, res) => {
    await printController.printLabels(req, res);
  }
);

/**
 * @route POST /api/print/single-label
 * @desc Печать одной этикетки
 * @body { item: PackingItem, options?: PrintJobOptions }
 */
router.post('/single-label', 
  validateRequest({ body: PrintSingleLabelBodySchema }),
  async (req, res) => {
    await printController.printSingleLabel(req, res);
  }
);

/**
 * @route GET /api/print/status
 * @desc Получение статуса принтера
 */
router.get('/status', async (req, res) => {
  await printController.getPrinterStatus(req, res);
});

/**
 * @route POST /api/print/test
 * @desc Тестовая печать
 */
router.post('/test', async (req, res) => {
  await printController.testPrint(req, res);
});

/**
 * @route POST /api/print/configure
 * @desc Конфигурация принтера
 * @body { model?: string, dpi?: number, speed?: number, darkness?: number }
 */
router.post('/configure', 
  validateRequest({ body: ConfigurePrinterBodySchema }),
  async (req, res) => {
    await printController.configurePrinter(req, res);
  }
);

/**
 * @route GET /api/print/formats
 * @desc Получение поддерживаемых форматов печати
 */
router.get('/formats', async (req, res) => {
  await printController.getSupportedFormats(req, res);
});

/**
 * @route GET /api/print/connection
 * @desc Получение информации о подключении принтера
 */
router.get('/connection', async (req, res) => {
  await printController.getConnectionInfo(req, res);
});

/**
 * @route GET /api/print/job/:jobId
 * @desc Получение статуса задания печати
 * @param jobId - ID задания печати
 */
router.get('/job/:jobId', 
  validateRequest({ params: GetPrintJobParamsSchema }),
  async (req, res) => {
    await printController.getJobStatus(req, res);
  }
);

/**
 * @route GET /api/print/jobs
 * @desc Получение всех заданий печати
 * @query status - Фильтр по статусу (success, failed)
 */
router.get('/jobs', 
  validateRequest({ query: GetPrintJobsQuerySchema }),
  async (req, res) => {
    await printController.getAllJobs(req, res);
  }
);

/**
 * @route DELETE /api/print/jobs
 * @desc Очистка истории заданий печати
 */
router.delete('/jobs', async (req, res) => {
  await printController.clearJobHistory(req, res);
});

/**
 * @route POST /api/print/reconnect
 * @desc Переподключение к принтеру
 */
router.post('/reconnect', async (req, res) => {
  await printController.reconnectPrinter(req, res);
});

/**
 * @route POST /api/print/shipping-label
 * @desc Печать этикетки доставки для заказа
 * @body { orderId: string, customerName: string, address?: string, items?: any[], copies?: number }
 */
router.post('/shipping-label', 
  validateRequest({ body: PrintShippingLabelBodySchema }),
  async (req, res) => {
    await printController.printShippingLabel(req, res);
  }
);

/**
 * @route POST /api/print/product-labels
 * @desc Печать этикеток товаров для заказа
 * @body { orderId: string, items: PackingItem[], options?: PrintJobOptions }
 */
router.post('/product-labels', async (req, res) => {
  await printController.printProductLabels(req, res);
});

/**
 * @route POST /api/print/box-labels
 * @desc Печать этикеток для коробок с заказами
 * @body { orderId: string | number, boxes: PackingBox[], customerName: string, customerCity?: string, format?: 'standard' | 'compact' }
 */
router.post('/box-labels', async (req, res) => {
  await printController.printBoxLabels(req, res);
});

/**
 * @route POST /api/print/box-label-preview
 * @desc Генерация превью этикетки коробки
 * @body { orderId: string | number, boxNumber: number, totalBoxes?: number, customerName: string, customerCity?: string, items?: any[], format?: 'standard' | 'compact' }
 */
router.post('/box-label-preview', async (req, res) => {
  await printController.generateBoxLabelPreview(req, res);
});

/**
 * @route POST /api/print/assign-boxes
 * @desc Автоматическое назначение товаров по коробкам
 * @body { items: PackingItem[], maxPerBox?: number }
 */
router.post('/assign-boxes', async (req, res) => {
  await printController.assignItemsToBoxes(req, res);
});

/**
 * @route POST /api/print/batch-print
 * @desc Пакетная печать этикеток
 * @body { orderId: string | number, labels: Array, region?: string, customerName: string }
 */
router.post('/batch-print', async (req, res) => {
  await printController.batchPrintLabels(req, res);
});

/**
 * @route POST /api/print/box-label-ezpl
 * @desc Generate EZPL code for box label (no image generation)
 * @body { orderId: string | number, boxNumber: number, totalBoxes?: number, customerName: string, customerCity?: string, items?: any[], region?: string, format?: 'standard' | 'compact' }
 */
router.post('/box-label-ezpl', async (req, res) => {
  await printController.generateBoxLabelEZPL(req, res);
});

/**
 * @route POST /api/print/box-labels-ezpl
 * @desc Print box labels using EZPL (direct printer commands)
 * @body { orderId: string | number, boxes: PackingBox[], customerName: string, customerCity?: string, region?: string, format?: 'standard' | 'compact' }
 */
router.post('/box-labels-ezpl', async (req, res) => {
  await printController.printBoxLabelsEZPL(req, res);
});

/**
 * @route POST /api/print/box-label-html
 * @desc Generate HTML visualization of box label EZPL
 * @body { orderId: string | number, boxNumber?: number, totalBoxes?: number, customerName: string, customerCity?: string, items?: any[], region?: string }
 */
router.post('/box-label-html', async (req, res) => {
  await printController.generateBoxLabelHTML(req, res);
});

/**
 * @route POST /api/print/box-labels-html
 * @desc Generate HTML visualization for multiple box labels
 * @body { orderId: string | number, boxes: any[], customerName: string, customerCity?: string, region?: string }
 */
router.post('/box-labels-html', async (req, res) => {
  await printController.generateMultipleBoxLabelsHTML(req, res);
});

export default router;