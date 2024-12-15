import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchFlowData, 
  selectFlowState, 
  selectFlowStatus,
  selectFlowsByDate 
} from '../slices/flowSlice';

// Date format utilities
const dateUtils = {
  // Convert YYYY-MM to YYYY-MM-DD
  toFlowDate: (date) => {
    if (!date) return null;
    return date.length === 7 ? `${date}-01` : date;
  },
  // Convert YYYY-MM-DD to YYYY-MM
  toSpatialDate: (date) => {
    if (!date) return null;
    return date.substring(0, 7);
  },
  // Check if dates match (ignoring day)
  datesMatch: (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.substring(0, 7) === date2.substring(0, 7);
  }
};

/**
 * Custom hook to manage flow data fetching and cleanup
 * Handles date format conversion between spatial and flow data
 */
export const useFlowDataManager = () => {
  const dispatch = useDispatch();
  const flowState = useSelector(selectFlowState);
  const { loading, error } = useSelector(selectFlowStatus);
  
  // Get selected date and commodity from spatial and ecm slices
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);
  const selectedCommodity = useSelector(state => state.spatial.ui.selectedCommodity || state.ecm.ui.selectedCommodity);

  // Get flows for current date
  const currentFlows = useSelector(state => {
    // Convert YYYY-MM to YYYY-MM-DD for flow data lookup
    const flowDate = dateUtils.toFlowDate(selectedDate);
    return selectFlowsByDate(state, flowDate);
  });

  // Refs for cleanup and state tracking
  const lastFetchRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch flow data with date normalization
  const loadData = useCallback(async () => {
    if (!selectedCommodity || !selectedDate) {
      console.debug('Missing required parameters:', { 
        commodity: selectedCommodity, 
        date: selectedDate 
      });
      return;
    }

    // Convert date to flow format (YYYY-MM-DD)
    const flowDate = dateUtils.toFlowDate(selectedDate);
    
    // Prevent duplicate fetches
    const fetchKey = `${selectedCommodity}-${flowDate}`;
    if (lastFetchRef.current === fetchKey) {
      return;
    }
    lastFetchRef.current = fetchKey;

    console.debug('Loading flow data:', { 
      commodity: selectedCommodity, 
      date: flowDate,
      originalDate: selectedDate 
    });
    
    try {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      await dispatch(fetchFlowData({ 
        commodity: selectedCommodity,
        date: flowDate,
        signal: abortControllerRef.current.signal
      })).unwrap();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading flow data:', error);
      }
    }
  }, [selectedCommodity, selectedDate, dispatch]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  return {
    flows: currentFlows,
    byDate: flowState.byDate,
    byRegion: flowState.byRegion,
    metadata: flowState.metadata,
    loading,
    error,
    selectedCommodity,
    selectedDate,
    // Add helper method for manual refresh
    refreshData: () => {
      lastFetchRef.current = null; // Reset fetch tracking
      loadData();
    }
  };
};

export default useFlowDataManager;
