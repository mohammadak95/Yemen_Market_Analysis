// src/utils/ReduxDebugWrapper.js

import React, { useEffect } from 'react';
import { useStore } from 'react-redux';
import PropTypes from 'prop-types';

const ReduxDebugWrapper = ({ children }) => {
  const store = useStore();

  useEffect(() => {
    console.group('Redux Debug Info');
    console.log('Initial State:', store.getState());
    // Uncomment if you have a theme slice
    // console.log('Theme State:', store.getState().theme);
    console.groupEnd();

    const unsubscribe = store.subscribe(() => {
      console.group('Redux State Update');
      console.log('New State:', store.getState());
      // Removed 'lastAction' logging
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
