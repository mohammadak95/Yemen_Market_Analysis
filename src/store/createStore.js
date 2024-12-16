// src/store/createStore.js

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import themeReducer from '../slices/themeSlice';
import welcomeModalReducer from './welcomeModalSlice';
import { backgroundMonitor, MetricTypes } from '../utils/backgroundMonitor';

// Essential reducers loaded immediately
const CRITICAL_REDUCERS = {
  theme: themeReducer,
  welcomeModal: welcomeModalReducer
};

// Create a reducer manager for dynamic reducer injection
export function createReducerManager(initialReducers) {
  const reducers = { ...initialReducers };
  let combinedReducer = combineReducers(reducers);
  let keysToRemove = [];

  return {
    getReducerMap: () => reducers,

    reduce: (state, action) => {
      if (keysToRemove.length > 0) {
        state = { ...state };
        for (const key of keysToRemove) {
          delete state[key];
        }
        keysToRemove = [];
      }
      return combinedReducer(state, action);
    },

    add: (key, reducer) => {
      if (!key || reducers[key]) return;
      const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        action: 'add-reducer',
        reducer: key
      });

      try {
        reducers[key] = reducer;
        combinedReducer = combineReducers(reducers);
        metric.finish({ status: 'success' });
      } catch (error) {
        metric.finish({ status: 'error', error: error.message });
        throw error;
      }
    },

    remove: (key) => {
      if (!key || !reducers[key]) return;
      const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        action: 'remove-reducer',
        reducer: key
      });
      try {
        delete reducers[key];
        keysToRemove.push(key);
        combinedReducer = combineReducers(reducers);
        metric.finish({ status: 'success' });
      } catch (error) {
        metric.finish({ status: 'error', error: error.message });
        throw error;
      }
    }
  };
}

const STATE_PERSISTENCE_CONFIG = {
  whitelist: ['theme', 'welcomeModal'],
  storage: window.localStorage,
  key: 'yemen-market-analysis'
};

// Load persisted state
function loadPersistedState() {
  try {
    const serializedState = STATE_PERSISTENCE_CONFIG.storage.getItem(STATE_PERSISTENCE_CONFIG.key);
    return serializedState ? JSON.parse(serializedState) : {};
  } catch (error) {
    backgroundMonitor.logError('state-load-error', error);
    return {};
  }
}

// Persist state on changes
function setupPersistence(store) {
  store.subscribe(() => {
    const state = store.getState();
    const persistedData = {};

    STATE_PERSISTENCE_CONFIG.whitelist.forEach(key => {
      if (state[key]) {
        persistedData[key] = state[key];
      }
    });

    try {
      STATE_PERSISTENCE_CONFIG.storage.setItem(
        STATE_PERSISTENCE_CONFIG.key,
        JSON.stringify(persistedData)
      );
    } catch (error) {
      backgroundMonitor.logError('state-persistence-error', error);
    }
  });
}

export function configureAppStore(preloadedState = {}) {
  const configMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'store-config'
  });

  try {
    const reducerManager = createReducerManager(CRITICAL_REDUCERS);
    const isDevelopment = process.env.NODE_ENV === 'development';

    const middleware = (getDefaultMiddleware) => {
      const defaultMiddleware = getDefaultMiddleware({
        thunk: {
          extraArgument: { backgroundMonitor, MetricTypes },
          timeout: 30000
        },
        serializableCheck: {
          warnAfter: 2000
        },
        immutableCheck: {
          warnAfter: 1000
        }
      });

      const middlewareList = [...defaultMiddleware];

      if (isDevelopment) {
        const logger = createLogger({
          collapsed: true,
          duration: true,
          timestamp: true,
          colors: {
            title: action => (action.error ? 'red' : 'blue'),
            prevState: () => '#9E9E9E',
            action: () => '#03A9F4',
            nextState: () => '#4CAF50',
            error: () => '#F20404'
          },
          predicate: (getState, action) => !!action.type // log all actions in dev for now
        });

        middlewareList.push(logger);
      }

      return middlewareList;
    };

    const store = configureStore({
      reducer: reducerManager.reduce,
      middleware,
      preloadedState: {
        ...preloadedState,
        ...loadPersistedState()
      },
      devTools: isDevelopment && {
        maxAge: 50,
        trace: true,
        traceLimit: 25
      }
    });

    store.reducerManager = reducerManager;

    // Allow lazy loading reducers
    store.injectReducer = async (key, asyncReducer) => {
      const injectMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
        action: 'inject-reducer',
        reducer: key
      });

      try {
        if (store.reducerManager.getReducerMap()[key]) {
          injectMetric.finish({ status: 'skipped', reason: 'already-exists' });
          return;
        }

        const reducer = await asyncReducer();
        store.reducerManager.add(key, reducer.default || reducer);
        injectMetric.finish({ status: 'success' });
        return reducer;
      } catch (error) {
        injectMetric.finish({ status: 'error', error: error.message });
        throw error;
      }
    };

    setupPersistence(store);

    configMetric.finish({
      status: 'success',
      reducerCount: Object.keys(reducerManager.getReducerMap()).length
    });

    return store;
  } catch (error) {
    configMetric.finish({ status: 'error', error: error.message });
    throw error;
  }
}

export default configureAppStore;