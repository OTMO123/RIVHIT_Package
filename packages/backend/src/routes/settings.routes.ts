import { Router, Request, Response } from 'express';
import { MaxPerBoxRepository } from '../repositories/MaxPerBoxRepository';
import { z } from 'zod';

const router = Router();
let repository: MaxPerBoxRepository;

// Initialize repository after database is ready
const getRepository = () => {
  if (!repository) {
    repository = new MaxPerBoxRepository();
  }
  return repository;
};

// Validation schemas
const CreateSettingSchema = z.object({
  catalogNumber: z.string().min(1).max(50),
  maxQuantity: z.number().int().positive(),
  description: z.string().optional(),
  rivhitId: z.number().int().positive().optional()
});

const UpdateSettingSchema = z.object({
  maxQuantity: z.number().int().positive().optional(),
  description: z.string().optional(),
  rivhitId: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

// Get all max per box settings
router.get('/max-per-box', async (req: Request, res: Response) => {
  try {
    const settings = await getRepository().findAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching max per box settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Get setting by catalog number (new route with explicit path)
router.get('/max-per-box/catalog/:catalogNumber', async (req: Request, res: Response) => {
  try {
    const { catalogNumber } = req.params;
    const setting = await getRepository().findByCatalogNumber(catalogNumber);
    
    if (!setting) {
      // Return null instead of 404 for missing settings (expected case)
      return res.json({ success: true, data: null });
    }
    
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error fetching setting by catalog:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch setting' });
  }
});

// Get setting by id (old route kept for compatibility)
router.get('/max-per-box/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if it's a number (ID) or string (catalog number)
    if (!isNaN(Number(id))) {
      // It's an ID - fetch by ID (not implemented yet, but kept for compatibility)
      return res.status(404).json({ success: false, error: 'Fetch by ID not implemented' });
    } else {
      // It's a catalog number - fetch by catalog
      const setting = await getRepository().findByCatalogNumber(id);
      
      if (!setting) {
        return res.status(404).json({ success: false, error: 'Setting not found' });
      }
      
      res.json({ success: true, data: setting });
    }
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch setting' });
  }
});

// Create new setting
router.post('/max-per-box', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateSettingSchema.parse(req.body);
    
    // Use upsert to handle existing catalog numbers
    const setting = await getRepository().upsert(
      validatedData.catalogNumber,
      validatedData.maxQuantity,
      validatedData.description,
      validatedData.rivhitId
    );
    res.status(201).json({ success: true, data: setting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error creating setting:', error);
    res.status(500).json({ success: false, error: 'Failed to create setting' });
  }
});

// Update setting
router.put('/max-per-box/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = UpdateSettingSchema.parse(req.body);
    
    const setting = await getRepository().update(id, validatedData);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }
    
    res.json({ success: true, data: setting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// Delete setting (soft delete)
router.delete('/max-per-box/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await getRepository().delete(id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }
    
    res.json({ success: true, message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ success: false, error: 'Failed to delete setting' });
  }
});

// Bulk upsert settings
router.post('/max-per-box/bulk', async (req: Request, res: Response) => {
  try {
    const BulkSchema = z.array(CreateSettingSchema);
    const validatedData = BulkSchema.parse(req.body);
    
    const results = await Promise.all(
      validatedData.map(item => 
        getRepository().upsert(item.catalogNumber, item.maxQuantity, item.description, item.rivhitId)
      )
    );
    
    res.json({ success: true, data: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Error bulk upserting settings:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk upsert settings' });
  }
});

export default router;