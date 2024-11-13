// src/utils/ReduxDebugWrapper.js

import React, { useEffect } from 'react';
import { useStore } from 'react-redux';
import PropTypes from 'prop-types';



const ReduxDebugWrapper = ({ children }) => {
  const store = useStore();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return; // Exit if not in development mode
    }

    console.group('Redux Debug Info');
    console.log('Initial State:', store.getState());
    console.groupEnd();

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const lastAction = state.lastAction;
      if (lastAction) {
        console.group('Redux State Update');
        console.log('Action:', lastAction);
        console.log('New State:', state);
        console.groupEnd();
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