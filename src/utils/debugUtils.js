// Debugging and analysis utilities

// ===== ReduxDebugWrapper.js =====

// src/utils/ReduxDebugWrapper.js

import React, { useEffect } from 'react';
import { useStore } from 'react-redux';
import PropTypes from 'prop-types';

const ReduxDebugWrapper = ({ children }) => {
  const store = useStore();

  useEffect(() => {
    console.group('Redux Debug Info');
    console.log('Initial State:', store.getState());
    console.log('Theme State:', store.getState().theme);
    console.groupEnd();

    const unsubscribe = store.subscribe(() => {
      console.group('Redux State Update');
      console.log('New State:', store.getState());
      console.log('Theme State:', store.getState().theme);
      console.log('Action:', store.getState().lastAction);
      console.groupEnd();
    });

    return () => {
      unsubscribe();
      console.log('Redux debug wrapper unmounted');
    };
  }, [store]);

  return <>{children}</>;
};
ReduxDebugWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ReduxDebugWrapper;

// ===== AnalysisWrapper.js =====

// src/components/AnalysisWrapper.js

const AnalysisWrapper = ({ children }) => {
  return <>{children}</>; // Simply render children without additional wrappers or transitions
};

AnalysisWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export const setupReduxDebugger = (store) => {
  if (process.env.NODE_ENV !== 'production') {
    // Expose store to window for debugging
    window.__REDUX_STORE__ = store;
    
    // Setup enhanced logging
    window.debugSpatial = {
      enableDebug: () => {
        localStorage.setItem('DEBUG_SPATIAL', 'true');
        console.log('🔍 Spatial debugging enabled');
      },
      
      monitorRedux: () => {
        console.group('🔄 Redux Spatial Actions');
        const unsubscribe = store.subscribe(() => {
          const state = store.getState();
          console.log({
            action: state.lastAction,
            spatial: state.spatial,
            timestamp: new Date().toISOString()
          });
        });
        window.__REDUX_UNSUBSCRIBE__ = unsubscribe;
        console.log('Redux monitoring started. Call debugSpatial.stopMonitoring() to end.');
      },
      
      stopMonitoring: () => {
        if (window.__REDUX_UNSUBSCRIBE__) {
          window.__REDUX_UNSUBSCRIBE__();
          console.log('Redux monitoring stopped');
        }
        console.groupEnd();
      },
      
      monitorNetwork: () => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const [url] = args;
          console.log(`🌐 Fetch Request: ${url}`);
          const startTime = performance.now();
          try {
            const response = await originalFetch(...args);
            console.log(`✅ Fetch Complete: ${url} (${(performance.now() - startTime).toFixed(2)}ms)`);
            return response;
          } catch (error) {
            console.error(`❌ Fetch Error: ${url}`, error);
            throw error;
          }
        };
        console.log('Network monitoring enabled');
      },
      
      getCurrentState: () => {
        const state = store.getState();
        console.group('Current Redux State');
        console.log('Full State:', state);
        console.log('Spatial State:', state.spatial);
        console.groupEnd();
        return state;
      },
      
      getSpatialData: () => {
        const { spatial } = store.getState();
        return {
          features: spatial.geoData?.features?.length || 0,
          flowMaps: spatial.flowMaps?.length || 0,
          uniqueMonths: spatial.uniqueMonths?.length || 0,
          status: spatial.status,
          error: spatial.error
        };
      }
    };
    
    console.log(`
    🔧 Debug tools available:
    - debugSpatial.enableDebug()     // Enable verbose logging
    - debugSpatial.monitorRedux()    // Start Redux monitoring
    - debugSpatial.stopMonitoring()  // Stop Redux monitoring
    - debugSpatial.monitorNetwork()  // Monitor network requests
    - debugSpatial.getCurrentState() // Get current Redux state
    - debugSpatial.getSpatialData()  // Get spatial data summary
    `);
  }
};

