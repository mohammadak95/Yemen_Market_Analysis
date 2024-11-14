// src/index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import ReduxDebugWrapper from './utils/ReduxDebugWrapper';
import { setupReduxDebugger } from './utils/debugUtils';
import { precomputedDataManager } from './utils/PrecomputedDataManager';
import './utils/leafletSetup';
import 'leaflet/dist/leaflet.css';
import './styles/leaflet-overrides.css';

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize precomputed data manager
    await precomputedDataManager.initialize();

    // Setup Redux debugger with store reference
    setupReduxDebugger(store);

    return true;
  } catch (error) {
    console.error('Service initialization failed:', error);
    return false;
  }
};

// Render application
const AppWithProviders = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    initializeServices().then((success) => {
      setIsInitialized(success);
    });
  }, []);

  if (!isInitialized) {
    return <div className="initialization-loading">Initializing services...</div>;
  }

  return (
    <Provider store={store}>
      <ReduxDebugWrapper>
        <App />
      </ReduxDebugWrapper>
    </Provider>
  );
};

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(<AppWithProviders />);