// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import themeReducer, { initialState as themeInitialState } from '../slices/themeSlice';
import spatialReducer, { initialState as spatialInitialState } from '../slices/spatialSlice';
import ecmReducer, { initialState as ecmInitialState } from '../slices/ecmSlice';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const startTime = performance.now();

const preloadedState = {
  theme: themeInitialState,
  spatial: spatialInitialState,
  ecm: ecmInitialState
};

const spatialLogger = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development' && 
      (action.type?.startsWith('spatial/') || action.type?.includes('spatial'))) {
    console.group(`%cSpatial Action: ${action.type}`, 'color: #1976d2; font-weight: bold;');
    console.log('%cPayload:', 'color: #4caf50; font-weight: bold;', action.payload);
    console.log('%cPrevious State:', 'color: #ff9800; font-weight: bold;', store.getState().spatial);
    
    const result = next(action);
    const nextState = store.getState().spatial;
    
    console.log('%cNext State:', 'color: #2196f3; font-weight: bold;', nextState);
    console.groupEnd();
    
    // Log performance metrics
    backgroundMonitor.logMetric('redux-action', {
      type: action.type,
      duration: performance.now() - startTime,
      stateSize: JSON.stringify(nextState).length
    });
    
    return result;
  }
  return next(action);
};

const ecmLogger = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development' && 
      (action.type?.startsWith('ecm/') || action.type?.includes('ecm'))) {
    console.group(`%cECM Action: ${action.type}`, 'color: #9c27b0; font-weight: bold;');
    console.log('%cPayload:', 'color: #4caf50; font-weight: bold;', action.payload);
    console.log('%cPrevious State:', 'color: #ff9800; font-weight: bold;', store.getState().ecm);
    
    const result = next(action);
    const nextState = store.getState().ecm;
    
    console.log('%cNext State:', 'color: #2196f3; font-weight: bold;', nextState);
    console.groupEnd();
    
    // Log performance metrics
    backgroundMonitor.logMetric('redux-action', {
      type: action.type,
      duration: performance.now() - startTime,
      stateSize: JSON.stringify(nextState).length
    });
    
    return result;
  }
  return next(action);
};

const getOptimizedMiddleware = (getDefaultMiddleware) => {
  const middleware = getDefaultMiddleware({
    thunk: {
      extraArgument: undefined,
      timeout: 30000, // Increased timeout for large data processing
    },
    serializableCheck: {
      ignoredPaths: [
        'spatial.data.geoData',
        'spatial.data.weights',
        'spatial.data.flows',
        'spatial.data.analysis',
        'spatial.data.flowMaps',
        'spatial.data.marketClusters',
        'ecm.data.unified.results',
        'ecm.data.directional',
        'ecm.data.cache'
      ],
      warnAfter: 2000,
    },
    immutableCheck: {
      warnAfter: 1000,
      ignoredPaths: [
        'spatial.data',
        'spatial.status',
        'spatial.ui.view',
        'ecm.data',
        'ecm.status'
      ],
    },
  });

  if (process.env.NODE_ENV === 'development') {
    middleware.push(spatialLogger);
    middleware.push(ecmLogger);
    
    if (process.env.REACT_APP_ENABLE_REDUX_LOGGER === 'true') {
      middleware.push(createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
        predicate: (getState, action) => {
          const skipActions = [
            'spatial/setProgress',
            'spatial/setLoadingStage',
            'spatial/updateCache',
            'spatial/updateProgress',
            'ecm/setProgress',
            'ecm/updateCache'
          ];
          return !skipActions.includes(action.type);
        },
        actionTransformer: (action) => {
          if (action.type === 'spatial/fetchSpatialData/fulfilled' ||
              action.type === 'ecm/fetchData/fulfilled') {
            return {
              ...action,
              payload: '<<LARGE_PAYLOAD>>'
            };
          }
          return action;
        },
        stateTransformer: (state) => ({
          theme: state.theme,
          spatial: {
            ...state.spatial,
            data: '<<SPATIAL_DATA>>'
          },
          ecm: {
            ...state.ecm,
            data: '<<ECM_DATA>>'
          }
        })
      }));
    }
  }

  return middleware;
};

const store = configureStore({
  reducer: {
    theme: themeReducer,
    spatial: spatialReducer,
    ecm: ecmReducer
  },
  preloadedState,
  middleware: getOptimizedMiddleware,
  devTools: process.env.NODE_ENV === 'development' && {
    maxAge: 50,
    trace: true,
    traceLimit: 25,
    actionsBlacklist: [
      'spatial/setProgress',
      'spatial/setLoadingStage',
      'ecm/setProgress',
      'ecm/updateCache'
    ]
  }
});

if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
  window.__REDUX_MONITOR__ = {
    getState: () => store.getState(),
    dispatch: store.dispatch,
    subscribe: (listener) => store.subscribe(listener)
  };
}

export default store;
