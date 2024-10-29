// src/utils/ReduxDebugWrapper.js

import React, { useEffect } from 'react';
import { useStore } from 'react-redux';

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

export default ReduxDebugWrapper;