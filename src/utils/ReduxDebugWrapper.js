// src/utils/ReduxDebugWrapper.js

import React, { useEffect } from 'react';
import { useStore } from 'react-redux';
import PropTypes from 'prop-types';
import { backgroundMonitor } from './backgroundMonitor'; // Ensure correct import

const ReduxDebugWrapper = ({ children }) => {
  const store = useStore();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return; // Exit if not in development mode
    }

    console.group('Redux Debug Info');
    console.log('Initial State:', store.getState());
    console.groupEnd();

    let prevUpdate = null;

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.spatial.status.lastUpdated !== prevUpdate) {
        prevUpdate = state.spatial.status.lastUpdated;
        console.group('Spatial State Update');
        console.log('New Spatial State:', state.spatial);
        console.log('Cache Stats:', state.spatial.status.cacheStats);
        console.log('Transformed Data:', state.spatial.data.transformed);
        console.groupEnd();

        // Optionally, you can add more detailed monitoring here
        backgroundMonitor.logMetric('redux-spatial-update', {
          timestamp: new Date().toISOString(),
          spatialState: state.spatial,
        });
      }
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
