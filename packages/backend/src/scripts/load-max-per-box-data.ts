import { AppDataSource } from '../config/database.config';
import { MaxPerBoxRepository } from '../repositories/MaxPerBoxRepository';
import * as fs from 'fs';
import * as path from 'path';

async function loadMaxPerBoxData() {
  try {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database initialized');
    }

    // Read sample data
    const dataPath = path.join(__dirname, '../test-data/max-per-box-sample.json');
    const sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Create repository
    const repository = new MaxPerBoxRepository();
    
    console.log(`📦 Loading ${sampleData.length} max per box settings...`);
    
    // Load each setting
    for (const item of sampleData) {
      const result = await repository.upsert(
        item.catalogNumber,
        item.maxQuantity,
        item.description,
        item.rivhitId
      );
      console.log(`✅ Loaded: ${item.catalogNumber} - Max ${item.maxQuantity} per box`);
    }
    
    console.log('🎉 All max per box settings loaded successfully!');
    
    // Verify by fetching all
    const allSettings = await repository.findAll();
    console.log(`\n📊 Total settings in database: ${allSettings.length}`);
    
  } catch (error) {
    console.error('❌ Error loading max per box data:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  loadMaxPerBoxData();
}

export { loadMaxPerBoxData };