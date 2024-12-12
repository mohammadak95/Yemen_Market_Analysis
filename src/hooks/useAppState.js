// src/hooks/useAppState.js

import { useSelector, useDispatch } from 'react-redux';
import { useMemo } from 'react';
import _ from 'lodash';
import { selectError, selectCommodityInfo, initialState as spatialInitialState } from '../slices/spatialSlice';
import { useDashboardData } from './useDashboardData';
import { selectHasSeenWelcome } from '../store/welcomeModalSlice';
import { lightThemeWithOverrides, darkThemeWithOverrides } from '../styles/theme';

export const useAppState = () => {
  const dispatch = useDispatch();
  
  // Use explicit selectors with default values from initial state
  const error = useSelector(state => 
    state.spatial?.status?.error ?? spatialInitialState.status.error, 
    _.isEqual
  );

  const hasSeenWelcome = useSelector(state => 
    state.welcomeModal?.hasSeenWelcome ?? false, 
    _.isEqual
  );

  const isDarkMode = useSelector(state => 
    state.theme?.isDarkMode ?? false, 
    _.isEqual
  );

  const commodityInfo = useSelector(selectCommodityInfo, _.isEqual) || {
    commodities: [],
    selectedCommodity: '',
    loading: false,
    uniqueMonths: []
  };

  const spatialData = useSelector(state => 
    state.spatial?.data ?? spatialInitialState.data, 
    _.isEqual
  );

  const spatialLoading = useSelector(state => 
    state.spatial?.status?.loading ?? spatialInitialState.status.loading, 
    _.isEqual
  );

  const flowLoading = useSelector(state => 
    state.flow?.status?.loading ?? false, 
    _.isEqual
  );

  // Memoize loading state
  const isLoading = useMemo(() => 
    spatialLoading || flowLoading, 
    [spatialLoading, flowLoading]
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
  };
};
