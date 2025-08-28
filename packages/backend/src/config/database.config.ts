import { DataSource } from 'typeorm';
import path from 'path';
import { MaxPerBoxSetting } from '../entities/MaxPerBoxSetting';
import { OrderStatus } from '../entities/OrderStatus';
import { OrderPackingDetails } from '../entities/OrderPackingDetails';
import { OrderBoxes } from '../entities/OrderBoxes';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(__dirname, '../../database/packing.db'),
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  entities: [MaxPerBoxSetting, OrderStatus, OrderPackingDetails, OrderBoxes],
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