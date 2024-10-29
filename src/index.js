// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';

// Debug: Log initial state
console.log('Initial store state:', store.getState());

const root = createRoot(document.getElementById('root'));

const AppWithProviders = () => (
  <Provider store={store}>
    <ReduxDebugWrapper>
      <App />
    </ReduxDebugWrapper>
  </Provider>
);

root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/spatialServiceWorker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}