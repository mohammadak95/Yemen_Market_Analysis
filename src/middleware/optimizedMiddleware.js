// src/middleware/optimizedMiddleware.js

import { backgroundMonitor } from '../utils/backgroundMonitor';
import _ from 'lodash';

/**
 * Creates batch processing middleware
 */
export const createBatchMiddleware = () => {
  const pendingActions = new Map();
  const BATCH_TIMEOUT = 100; // milliseconds

  return store => next => action => {
    // Skip batching for certain critical actions
    if (action.meta?.immediate) {
      return next(action);
    }

    const actionType = action.type;
    if (!pendingActions.has(actionType)) {
      pendingActions.set(actionType, []);
      
      // Schedule batch processing
      setTimeout(() => {
        const actions = pendingActions.get(actionType);
        pendingActions.delete(actionType);
        
        if (actions.length === 1) {
          // If only one action, process normally
          next(actions[0]);
        } else {
          // Combine similar actions
          const batchedAction = combineSimilarActions(actions);
          next(batchedAction);
        }
      }, BATCH_TIMEOUT);
    }
    
    pendingActions.get(actionType).push(action);
  };
};

/**
 * Creates selective update middleware
 */
export const createSelectiveUpdateMiddleware = () => {
  return store => next => action => {
    const metric = backgroundMonitor.startMetric('state-update');
    const prevState = store.getState();
    
    try {
      // Process action
      const result = next(action);
      const nextState = store.getState();

      // Calculate changed paths
      const changes = calculateStateDiff(prevState, nextState);
      
      // Only notify relevant subscribers
      if (Object.keys(changes).length > 0) {
        notifySelectiveSubscribers(store, changes);
      }

      metric.finish({ 
        status: 'success',
        changedPaths: Object.keys(changes).length
      });

      return result;

    } catch (error) {
      metric.finish({ 
        status: 'error',
        error: error.message
      });
      throw error;
    }
  };
};

/**
 * Creates caching middleware
 */
export const createCachingMiddleware = () => {
  return store => next => action => {
    // Skip caching for certain actions
    if (action.meta?.skipCache) {
      return next(action);
    }

    const metric = backgroundMonitor.startMetric('action-caching');

    try {
      // Generate cache key
      const cacheKey = generateCacheKey(action);
      
      // Check cache
      const cachedResult = getCachedResult(cacheKey);
      if (cachedResult) {
        metric.finish({ status: 'cache-hit' });
        return cachedResult;
      }

      // Process action
      const result = next(action);
      
      // Cache result
      setCacheResult(cacheKey, result);
      
      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ 
        status: 'error', 
        error: error.message 
      });
      throw error;
    }
  };
};

/**
 * Creates performance monitoring middleware
 */
export const createPerformanceMiddleware = () => {
  return store => next => action => {
    const startTime = performance.now();
    const metric = backgroundMonitor.startMetric('action-performance');

    try {
      const result = next(action);
      const duration = performance.now() - startTime;

      // Log performance metrics
      metric.finish({
        status: 'success',
        duration,
        action: action.type,
        timestamp: Date.now()
      });

      // Monitor long-running actions
      if (duration > 100) { // 100ms threshold
        backgroundMonitor.logMetric('long-running-action', {
          action: action.type,
          duration,
          timestamp: Date.now()
        });
      }

      return result;

    } catch (error) {
      metric.finish({
        status: 'error',
        error: error.message,
        action: action.type
      });
      throw error;
    }
  };
};

// Helper Functions

const combineSimilarActions = (actions) => {
  if (!actions.length) return null;
  if (actions.length === 1) return actions[0];

  // Group by action type
  const groups = _.groupBy(actions, action => {
    return action.type.split('/')[0]; // Group by domain
  });

  // Combine each group
  return Object.entries(groups).reduce((combinedAction, [domain, groupActions]) => {
    switch (domain) {
      case 'spatial':
        return combineSpatialActions(groupActions);
      case 'flow':
        return combineFlowActions(groupActions);
      default:
        return groupActions[groupActions.length - 1]; // Take latest action
    }
  }, {});
};

const combineSpatialActions = (actions) => {
  return {
    type: 'spatial/batchUpdate',
    payload: {
      data: mergeDataUpdates(actions),
      ui: mergeUIUpdates(actions)
    },
    meta: {
      batch: true,
      batchSize: actions.length
    }
  };
};

const combineFlowActions = (actions) => {
  return {
    type: 'flow/batchUpdate',
    payload: mergeFlowUpdates(actions),
    meta: {
      batch: true,
      batchSize: actions.length
    }
  };
};

const mergeDataUpdates = (actions) => {
  return actions.reduce((merged, action) => {
    if (action.payload?.data) {
      return {
        ...merged,
        ...action.payload.data
      };
    }
    return merged;
  }, {});
};

const mergeUIUpdates = (actions) => {
  // Take the latest UI state
  const uiActions = actions.filter(action => action.payload?.ui);
  if (uiActions.length) {
    return uiActions[uiActions.length - 1].payload.ui;
  }
  return null;
};

const mergeFlowUpdates = (actions) => {
  return actions.reduce((merged, action) => {
    if (action.payload?.flows) {
      return {
        ...merged,
        flows: [...(merged.flows || []), ...action.payload.flows]
      };
    }
    return merged;
  }, {});
};

const calculateStateDiff = (prevState, nextState, path = '') => {
  const changes = {};

  // Handle non-object types
  if (typeof prevState !== 'object' || typeof nextState !== 'object') {
    if (prevState !== nextState) {
      changes[path] = { prev: prevState, next: nextState };
    }
    return changes;
  }

  // Handle null values
  if (!prevState || !nextState) {
    if (prevState !== nextState) {
      changes[path] = { prev: prevState, next: nextState };
    }
    return changes;
  }

  // Compare object keys
  const allKeys = new Set([...Object.keys(prevState), ...Object.keys(nextState)]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (key in prevState && key in nextState) {
      // Both objects have the key - compare values
      const subChanges = calculateStateDiff(
        prevState[key],
        nextState[key],
        currentPath
      );
      Object.assign(changes, subChanges);
    } else {
      // Key exists in only one object
      changes[currentPath] = {
        prev: prevState[key],
        next: nextState[key]
      };
    }
  }

  return changes;
};

const notifySelectiveSubscribers = (store, changes) => {
  const subscribers = store.getSubscribers?.() || [];
  
  subscribers.forEach(subscriber => {
    const relevantChanges = filterRelevantChanges(changes, subscriber.paths);
    if (Object.keys(relevantChanges).length > 0) {
      subscriber.callback(relevantChanges);
    }
  });
};

const filterRelevantChanges = (changes, subscriberPaths) => {
  if (!subscriberPaths?.length) return changes;

  return Object.entries(changes).reduce((relevant, [path, change]) => {
    if (subscriberPaths.some(subPath => path.startsWith(subPath))) {
      relevant[path] = change;
    }
    return relevant;
  }, {});
};

// Cache helpers
const CACHE_PREFIX = 'action_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const generateCacheKey = (action) => {
  const { type, payload } = action;
  // Create unique key based on action type and payload
  return CACHE_PREFIX + JSON.stringify({ type, payload });
};

const getCachedResult = (key) => {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const { result, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }

    return result;
  } catch (error) {
    return null;
  }
};

const setCacheResult = (key, result) => {
  try {
    const cache = {
      result,
      timestamp: Date.now()
    };
    sessionStorage.setItem(key, JSON.stringify(cache));
  } catch (error) {
    // Handle storage errors (e.g., quota exceeded)
    console.warn('Cache storage failed:', error);
  }
};