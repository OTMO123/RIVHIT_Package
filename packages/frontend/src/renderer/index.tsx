import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

console.log('=== RENDERER SCRIPT LOADED ===');
console.log('React version:', React.version);
console.log('Window object:', typeof window);
console.log('Document ready state:', document.readyState);

// Ждем загрузки DOM
function initApp() {
  console.log('=== INIT APP CALLED ===');
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);
  console.log('Document body:', document.body);
  console.log('Document head:', document.head);

  if (rootElement) {
    console.log('=== CREATING REACT ROOT ===');
    try {
      const root = ReactDOM.createRoot(rootElement);
      console.log('React root created successfully');
      
      console.log('=== RENDERING APP ===');
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log('App rendered successfully');
    } catch (error) {
      console.error('Error during React rendering:', error);
    }
  } else {
    console.error('ROOT ELEMENT NOT FOUND!');
    console.log('Available elements:', document.body?.innerHTML);
  }
}

// Запускаем когда DOM готов
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}