import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App methods
  health: () => ipcRenderer.invoke('app:health'),

  // Orders methods
  orders: {
    getAll: () => ipcRenderer.invoke('orders:getAll'),
    getById: (id: string) => ipcRenderer.invoke('orders:getById', id),
    updateStatus: (id: string, status: string) => ipcRenderer.invoke('orders:updateStatus', id, status),
  },

  // Customers methods
  customers: {
    getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
    getAll: () => ipcRenderer.invoke('customers:getAll'),
  },

  // Items methods
  items: {
    getByOrderId: (orderId: number) => ipcRenderer.invoke('items:getByOrderId', orderId),
    getAll: () => ipcRenderer.invoke('items:getAll'),
  },

  // Printer methods
  printer: {
    getStatus: () => ipcRenderer.invoke('printer:getStatus'),
    print: (orderId: string, stickers: any[]) => ipcRenderer.invoke('printer:print', orderId, stickers),
    test: () => ipcRenderer.invoke('printer:test'),
  },

  // GoLabel methods
  golabel: {
    openFiles: (files: string[]) => ipcRenderer.invoke('golabel:openFiles', files),
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      health: () => Promise<{ status: string; timestamp: string }>;
      orders: {
        getAll: () => Promise<{ success: boolean; data: any[] }>;
        getById: (id: string) => Promise<{ success: boolean; data: any }>;
        updateStatus: (id: string, status: string) => Promise<{ success: boolean; data: any }>;
      };
      customers: {
        getById: (id: number) => Promise<{ success: boolean; data: any }>;
        getAll: () => Promise<{ success: boolean; data: any[] }>;
      };
      items: {
        getByOrderId: (orderId: number) => Promise<{ success: boolean; data: any[] }>;
        getAll: () => Promise<{ success: boolean; data: any[] }>;
      };
      printer: {
        getStatus: () => Promise<{ success: boolean; data: { connected: boolean; ready: boolean } }>;
        print: (orderId: string, stickers: any[]) => Promise<{ success: boolean; data: any }>;
        test: () => Promise<{ success: boolean; data: any }>;
      };
      golabel: {
        openFiles: (files: string[]) => Promise<{ 
          success: boolean; 
          message?: string; 
          error?: string; 
          results?: Array<{ file: string; success: boolean; error?: string }> 
        }>;
      };
    };
  }
}