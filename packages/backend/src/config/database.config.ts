import { DataSource } from 'typeorm';
import path from 'path';
import { MaxPerBoxSetting } from '../entities/MaxPerBoxSetting';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(__dirname, '../../database/packing.db'),
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  entities: [MaxPerBoxSetting],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database has been initialized');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};