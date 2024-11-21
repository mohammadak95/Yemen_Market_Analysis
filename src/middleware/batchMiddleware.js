// src/middleware/batchMiddleware.js
import _ from 'lodash';

const BATCH_TIMEOUT = 100; // Adjust based on your needs

export const createBatchMiddleware = () => {
  let batchedActions = [];
  let batchTimeout = null;

  return store => next => action => {
    // Skip batching for certain critical actions
    if (action.meta?.immediate) {
      return next(action);
    }

    batchedActions.push(action);
    
    if (!batchTimeout) {
      batchTimeout = setTimeout(() => {
        const actions = [...batchedActions];
        batchedActions = [];
        batchTimeout = null;

        // Group similar actions
        const groupedActions = _.groupBy(actions, 'type');
        
        // For each group, only dispatch the latest action
        Object.values(groupedActions).forEach(group => {
          next(group[group.length - 1]);
        });
      }, BATCH_TIMEOUT);
    }
  };
};