// src/components/analysis/spatial-analysis/hooks/useAutoUpdate.js

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

export const useAutoUpdate = (callback, interval = 5000) => {
  const savedCallback = useRef();

  useEffect(() => {
    if (typeof callback !== 'function') {
      console.warn('useAutoUpdate: Callback provided is not a function');
      return;
    }
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof callback !== 'function') return;

    const tick = () => {
      if (savedCallback.current) savedCallback.current();
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, callback]);
};