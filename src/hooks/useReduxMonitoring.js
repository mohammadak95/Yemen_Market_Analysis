// src/hooks/useReduxMonitoring.js

import { useEffect } from 'react';
import { useStore } from 'react-redux';
import { monitoringSystem } from '../utils/MonitoringSystem';

export const useReduxMonitoring = () => {
  const store = useStore();

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      
      // Monitor for missing or invalid states
      if (!state.commodities) {
        monitoringSystem.warn('Commodities state is missing');
      }
      if (!state.spatial) {
        monitoringSystem.warn('Spatial state is missing');
      }
    });

    return () => unsubscribe();
  }, [store]);
};