import { AppFactory } from './app';

// Create and export a singleton instance
let appInstance: any;

export const getApp = async () => {
  if (!appInstance) {
    const factory = new AppFactory();
    await factory.initialize();
    appInstance = factory.getApp();
  }
  return appInstance;
};

// For backward compatibility
export default getApp();