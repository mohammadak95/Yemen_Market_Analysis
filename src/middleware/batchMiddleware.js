import { backgroundMonitor } from '../utils/backgroundMonitor';
import { getCache, setCache } from '../utils/cacheHelper';

const BATCH_ACTION = 'spatial/BATCH_ACTIONS';
const DEFAULT_BATCH_CONFIG = {
  maxBatchSize: 10,
  batchTimeout: 100,
  batchableActions: [
    'spatial/addMarket',
    'spatial/updateMarket',
    'spatial/addFlow',
    'spatial/updateFlow',
    'spatial/addTimeSeries',
    'spatial/updateTimeSeries'
  ]
};

export const createBatchMiddleware = (config = {}) => {
  const batchConfig = { ...DEFAULT_BATCH_CONFIG, ...config };
  
  return store => {
    let batchedActions = [];
    let timeoutId = null;
    const metric = backgroundMonitor.startMetric('batch-middleware');

    const processBatch = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (batchedActions.length === 0) return;

      const batch = batchedActions;
      batchedActions = [];

      store.dispatch({
        type: BATCH_ACTION,
        payload: batch,
        meta: {
          batch: true,
          timestamp: Date.now(),
          batchSize: batch.length
        }
      });

      metric.addData({
        batchSize: batch.length,
        actionTypes: batch.map(action => action.type),
        timestamp: Date.now()
      });
    };

    return next => action => {
      // If this is a batch action, process all actions in the batch
      if (action.type === BATCH_ACTION) {
        metric.addData({
          type: 'process_batch',
          size: action.payload.length,
          timestamp: Date.now()
        });

        return action.payload.reduce((result, batchedAction) => {
          return next(batchedAction);
        }, undefined);
      }

      // If this action is batchable, add it to the queue
      if (batchConfig.batchableActions.includes(action.type)) {
        batchedActions.push(action);

        if (batchedActions.length >= batchConfig.maxBatchSize) {
          processBatch();
        } else if (!timeoutId) {
          timeoutId = setTimeout(processBatch, batchConfig.batchTimeout);
        }

        return;
      }

      // For non-batchable actions, process any pending batch first
      if (batchedActions.length > 0) {
        processBatch();
      }

      // Then process the current action
      return next(action);
    };
  };
};

// Helper function to create a batch action
export const createBatchAction = (actions) => ({
  type: BATCH_ACTION,
  payload: actions,
  meta: {
    batch: true,
    timestamp: Date.now(),
    batchSize: actions.length
  }
});

// Utility to check if an action is batchable
export const isBatchableAction = (action, config = DEFAULT_BATCH_CONFIG) => {
  return config.batchableActions.includes(action.type);
};

// Performance monitoring wrapper
export const withPerformanceMonitoring = (middleware) => {
  return store => next => action => {
    const startTime = performance.now();
    const result = middleware(store)(next)(action);
    const duration = performance.now() - startTime;

    if (duration > 16) { // Longer than one frame (60fps)
      backgroundMonitor.logMetric('batch-middleware-performance', {
        actionType: action.type,
        duration,
        timestamp: Date.now(),
        isBatch: action.type === BATCH_ACTION,
        batchSize: action.type === BATCH_ACTION ? action.payload.length : 0
      });
    }

    return result;
  };
};

const batchMiddleware = (req, res, next) => {
  const cacheKey = `${req.method}-${req.url}`;
  const cachedResult = getCache(cacheKey);
  if (cachedResult) {
    return res.json(cachedResult);
  }
  // ...existing code...
  setCache(cacheKey, batchedResult);
  res.json(batchedResult);
};

export default createBatchMiddleware;
