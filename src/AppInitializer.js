// AppInitializer.js
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setSelectedCommodity, loadSpatialData } from '../slices/spatialSlice';
import { precomputedDataManager } from '../utils/PrecomputedDataManager';
import { backgroundMonitor } from '../utils/backgroundMonitor';

const DEFAULT_COMMODITY = 'beans (kidney red)';

const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeApp = async () => {
      const metric = backgroundMonitor.startMetric('app-initialization');
      
      try {
        // 1. Initialize PrecomputedDataManager
        if (!precomputedDataManager.isInitialized()) {
          await precomputedDataManager.initialize();
        }

        // 2. Set default commodity
        dispatch(setSelectedCommodity(DEFAULT_COMMODITY));

        // 3. Load initial data
        await dispatch(loadSpatialData({
          selectedCommodity: DEFAULT_COMMODITY,
          selectedDate: null
        })).unwrap();

        metric.finish({ status: 'success' });
      } catch (error) {
        console.error('Initialization failed:', error);
        metric.finish({ status: 'error', error: error.message });
      }
    };

    initializeApp();
  }, [dispatch]);

  return children;
};

export default AppInitializer;