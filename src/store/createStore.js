import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import themeReducer from '../slices/themeSlice';

// Initial reducers with only essential features
const staticReducers = {
  theme: themeReducer
};

export function createReducerManager(initialReducers) {
  const reducers = { ...initialReducers };
  let combinedReducer = combineReducers(reducers);
  let keysToRemove = [];

  return {
    getReducerMap: () => reducers,

    reduce: (state, action) => {
      if (keysToRemove.length > 0) {
        state = { ...state };
        for (let key of keysToRemove) {
          delete state[key];
        }
        keysToRemove = [];
      }
      return combinedReducer(state, action);
    },

    add: (key, reducer) => {
      if (!key || reducers[key]) {
        return;
      }
      reducers[key] = reducer;
      combinedReducer = combineReducers(reducers);
    },

    remove: (key) => {
      if (!key || !reducers[key]) {
        return;
      }
      delete reducers[key];
      keysToRemove.push(key);
      combinedReducer = combineReducers(reducers);
    }
  };
}

export function configureAppStore(preloadedState = {}) {
  const reducerManager = createReducerManager(staticReducers);

  const isDevelopment = process.env.NODE_ENV === 'development';

  const middleware = (getDefaultMiddleware) => {
    const customMiddleware = getDefaultMiddleware({
      thunk: {
        extraArgument: undefined,
        timeout: 30000,
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

    if (isDevelopment) {
      return [...customMiddleware, createLogger({
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
        }
      })];
    }

    return customMiddleware;
  };

  const store = configureStore({
    reducer: reducerManager.reduce,
    middleware,
    preloadedState,
    devTools: isDevelopment && {
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

  store.reducerManager = reducerManager;

  // Add lazy loading capability to store
  store.injectReducer = (key, asyncReducer) => {
    if (store.reducerManager.getReducerMap()[key]) {
      return Promise.resolve();
    }

    return asyncReducer().then(reducer => {
      store.reducerManager.add(key, reducer.default || reducer);
      return reducer;
    });
  };

  return store;
}

export default configureAppStore;
