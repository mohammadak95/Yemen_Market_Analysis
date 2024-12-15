// src/middleware/requestMiddleware.js

import { backgroundMonitor } from '../utils/backgroundMonitor';

// Track in-flight requests
const pendingRequests = new Map();
const requestCache = new Map();

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Helper to generate cache key
const getCacheKey = (type, params) => {
  return `${type}:${JSON.stringify(params)}`;
};

// Helper to clean old cache entries
const cleanCache = () => {
  const now = Date.now();
  for (const [key, entry] of requestCache) {
    if (now - entry.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
  
  // If still over size limit, remove oldest entries
  if (requestCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(requestCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => requestCache.delete(key));
  }
};

export const requestMiddleware = store => next => action => {
  // Check if action is valid and has a type
  if (!action || typeof action !== 'object' || !action.type || typeof action.type !== 'string') {
    return next(action);
  }

  // Only process specific async actions
  if (!action.type.endsWith('/pending')) {
    return next(action);
  }

  const { type, meta } = action;
  const baseType = type.replace('/pending', '');
  
  // Generate cache key from action type and parameters
  const cacheKey = getCacheKey(baseType, meta?.arg);

  // Check if request is already in flight
  if (pendingRequests.has(cacheKey)) {
    const metric = backgroundMonitor.startMetric('request-deduplication');
    metric.finish({ status: 'deduped', action: baseType });
    return pendingRequests.get(cacheKey);
  }

  // Check cache for valid response
  const cachedResponse = requestCache.get(cacheKey);
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
    const metric = backgroundMonitor.startMetric('request-cache');
    metric.finish({ status: 'cache-hit', action: baseType });
    return Promise.resolve(cachedResponse.data);
  }

  // Create promise for new request
  const promise = next(action).then(response => {
    // Cache successful response
    requestCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });
    
    // Clean up pending request
    pendingRequests.delete(cacheKey);
    
    // Periodically clean cache
    cleanCache();
    
    return response;
  }).catch(error => {
    // Clean up on error
    pendingRequests.delete(cacheKey);
    throw error;
  });

  // Store pending request
  pendingRequests.set(cacheKey, promise);
  
  return promise;
};

// Batch related requests middleware
const batchWindow = 50; // 50ms window to batch requests
let batchTimeout = null;
const batchedRequests = new Map();

export const batchMiddleware = store => next => action => {
  // Check if action is valid and has a type
  if (!action || typeof action !== 'object' || !action.type || typeof action.type !== 'string') {
    return next(action);
  }

  // Only batch specific data loading actions
  const batchableActions = [
    'spatial/fetchAllSpatialData',
    'flow/fetchData',
    'ecm/fetchECMData'
  ];

  if (!action.type.endsWith('/pending') || !batchableActions.includes(action.type.replace('/pending', ''))) {
    return next(action);
  }

  const { type, meta } = action;
  const baseType = type.replace('/pending', '');

  // Add to batch
  if (!batchedRequests.has(baseType)) {
    batchedRequests.set(baseType, []);
  }
  batchedRequests.get(baseType).push({ action, next });

  // Clear existing timeout
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  // Set new timeout to process batch
  batchTimeout = setTimeout(() => {
    const metric = backgroundMonitor.startMetric('request-batching');
    
    try {
      // Process each type of batched requests
      for (const [actionType, requests] of batchedRequests.entries()) {
        if (requests.length > 1) {
          // Combine parameters from all requests
          const combinedParams = requests.reduce((acc, { action }) => ({
            ...acc,
            ...action.meta?.arg
          }), {});

          // Create combined action
          const batchedAction = {
            ...requests[0].action,
            meta: {
              ...requests[0].action.meta,
              arg: combinedParams,
              batch: true
            }
          };

          // Execute combined request
          const result = requests[0].next(batchedAction);

          // Resolve all original requests with result
          requests.forEach(({ action: originalAction }) => {
            const filteredResult = filterResultForAction(result, originalAction);
            Promise.resolve(filteredResult);
          });
        } else {
          // If only one request, process normally
          requests[0].next(requests[0].action);
        }
      }

      metric.finish({ 
        status: 'success',
        batchedRequests: Array.from(batchedRequests.entries()).reduce((acc, [type, reqs]) => ({
          ...acc,
          [type]: reqs.length
        }), {})
      });
    } catch (error) {
      metric.finish({ 
        status: 'error',
        error: error.message
      });
      backgroundMonitor.logError('batch-processing', error);
    }

    // Clear batch
    batchedRequests.clear();
    batchTimeout = null;
  }, batchWindow);

  // Return promise that will be resolved when batch is processed
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const result = batchedRequests.get(baseType)?.find(r => 
        r.action.meta?.arg === meta?.arg
      )?.result;
      
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Request not found in batch'));
      }
    }, batchWindow + 10);
  });
};

// Helper to filter batched results for specific action
function filterResultForAction(batchedResult, originalAction) {
  // Implementation depends on your data structure
  // This is a simplified example
  const { commodity, date } = originalAction.meta?.arg || {};
  
  if (batchedResult?.payload?.data) {
    return {
      ...batchedResult,
      payload: {
        ...batchedResult.payload,
        data: batchedResult.payload.data.filter(item => 
          item.commodity === commodity && 
          (!date || item.date === date)
        )
      }
    };
  }
  
  return batchedResult;
}
