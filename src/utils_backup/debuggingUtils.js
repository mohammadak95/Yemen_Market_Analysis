// src/utils/debuggingUtils.js

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
            const lastAction = state.lastAction;
            if (lastAction && lastAction.type.startsWith('spatial/')) {
              console.log({
                action: lastAction,
                spatial: state.spatial,
                timestamp: new Date().toISOString(),
              });
            }
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
            features: spatial.data.geoData?.features?.length || 0,
            flows: spatial.data.flows?.length || 0,
            uniqueMonths: spatial.data.uniqueMonths?.length || 0,
            status: spatial.status,
            error: spatial.error,
          };
        },
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