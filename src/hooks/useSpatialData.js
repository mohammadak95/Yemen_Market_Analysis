import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadSpatialReducer } from '../store';
import { dataLoader } from '../utils/dataLoader';
import { 
  setProgress, 
  setLoadingStage,
  updateData,
  selectLoadingStatus,
  selectSpatialData,
  selectUIState
} from '../slices/spatialSlice';

export function useSpatialData() {
  const dispatch = useDispatch();
  const loading = useSelector(selectLoadingStatus);
  const spatialData = useSelector(selectSpatialData);
  const uiState = useSelector(selectUIState);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (commodity, date, options = {}) => {
    try {
      setError(null);
      dispatch(setProgress(0));
      dispatch(setLoadingStage('loading'));

      // Ensure spatial reducer is loaded
      await loadSpatialReducer();

      // Load data with progress updates
      const data = await dataLoader.loadSpatialData(commodity, date, {
        ...options,
        onProgress: (progress) => {
          dispatch(setProgress(progress));
        }
      });

      // Update store with loaded data
      dispatch(updateData(data));
      dispatch(setProgress(100));
      dispatch(setLoadingStage('complete'));

      return data;
    } catch (err) {
      setError(err);
      dispatch(setLoadingStage('error'));
      throw err;
    }
  }, [dispatch]);

  // Load initial data if needed
  useEffect(() => {
    if (!spatialData && uiState.selectedCommodity && !loading && !error) {
      loadData(uiState.selectedCommodity, uiState.selectedDate).catch(console.error);
    }
  }, [spatialData, uiState.selectedCommodity, uiState.selectedDate, loading, error, loadData]);

  const refresh = useCallback(() => {
    if (uiState.selectedCommodity) {
      return loadData(uiState.selectedCommodity, uiState.selectedDate, { forceRefresh: true });
    }
  }, [loadData, uiState.selectedCommodity, uiState.selectedDate]);

  return {
    loading,
    error,
    data: spatialData,
    loadData,
    refresh,
    progress: useSelector(state => state.spatial?.status?.progress || 0)
  };
}

// Hook for regression data
export function useRegressionData() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const selectedCommodity = useSelector(state => state.spatial?.ui?.selectedCommodity);

  const loadRegressionData = useCallback(async (commodity = selectedCommodity) => {
    if (!commodity) return;

    try {
      setLoading(true);
      setError(null);

      const data = await dataLoader.loadRegressionData(commodity);
      dispatch({ type: 'spatial/updateRegressionData', payload: data });

      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedCommodity]);

  // Load initial data if needed
  useEffect(() => {
    if (selectedCommodity && !loading && !error) {
      loadRegressionData().catch(console.error);
    }
  }, [selectedCommodity, loading, error, loadRegressionData]);

  return {
    loading,
    error,
    loadRegressionData
  };
}

// Hook for managing Web Worker computations
export function useSpatialComputation() {
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);

  const compute = useCallback(async (type, data, options = {}) => {
    try {
      setComputing(true);
      setError(null);

      const result = await dataLoader.computeWithWorker(type, data, options);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setComputing(false);
    }
  }, []);

  return {
    computing,
    error,
    compute
  };
}
