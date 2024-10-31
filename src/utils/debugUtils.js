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


