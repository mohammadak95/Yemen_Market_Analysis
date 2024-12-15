// src/hooks/useAppState.js

import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import _ from 'lodash';
import { selectError, selectCommodityInfo, initialState as spatialInitialState } from '../slices/spatialSlice';
import { useDashboardData } from './useDashboardData';
import { selectHasSeenWelcome } from '../store/welcomeModalSlice';
import { lightThemeWithOverrides, darkThemeWithOverrides } from '../styles/theme';

const safeSelector = (selector, defaultValue) => (state) => {
  try {
    return selector(state) ?? defaultValue;
  } catch (error) {
    console.warn(`Selector error: ${error.message}`);
    return defaultValue;
  }
};

export const useAppState = () => {
  const dispatch = useDispatch();
  
  // Use safe selectors with explicit default values
  const error = useSelector(
    safeSelector(
      state => state.spatial?.status?.error,
      spatialInitialState.status.error
    ),
    _.isEqual
  );

  const hasSeenWelcome = useSelector(
    safeSelector(
      state => state.welcomeModal?.hasSeenWelcome,
      false
    ),
    _.isEqual
  );

  const isDarkMode = useSelector(
    safeSelector(
      state => state.theme?.isDarkMode,
      false
    ),
    _.isEqual
  );

  // Use safe version of selectCommodityInfo
  const commodityInfo = useSelector(
    safeSelector(
      selectCommodityInfo,
      {
        commodities: [],
        selectedCommodity: '',
        loading: false,
        uniqueMonths: []
      }
    ),
    _.isEqual
  );

  const spatialData = useSelector(
    safeSelector(
      state => state.spatial?.data,
      spatialInitialState.data
    ),
    _.isEqual
  );

  const spatialLoading = useSelector(
    safeSelector(
      state => state.spatial?.status?.loading,
      spatialInitialState.status.loading
    ),
    _.isEqual
  );

  const flowLoading = useSelector(
    safeSelector(
      state => state.flow?.status?.loading,
      false
    ),
    _.isEqual
  );

  const storeInitialized = useSelector(
    safeSelector(
      state => {
        // Check if essential slices are present
        return Boolean(
          state.spatial &&
          state.theme &&
          state.welcomeModal
        );
      },
      false
    ),
    _.isEqual
  );

  // Memoize loading state
  const isLoading = useMemo(() => 
    !storeInitialized || spatialLoading || flowLoading, 
    [storeInitialized, spatialLoading, flowLoading]
  );

  // Memoize theme
  const theme = useMemo(
    () => isDarkMode ? darkThemeWithOverrides : lightThemeWithOverrides,
    [isDarkMode]
  );

  // Memoize commodities to prevent unnecessary re-renders
  const commodities = useMemo(() => 
    commodityInfo.commodities || [], 
    [commodityInfo.commodities]
  );

  // Memoize data to prevent unnecessary re-renders
  const data = useMemo(() => 
    spatialData || spatialInitialState.data,
    [spatialData]
  );

  return {
    dispatch,
    data,
    loading: isLoading,
    error,
    hasSeenWelcome,
    isDarkMode,
    commodities,
    theme,
    storeInitialized
  };
};
