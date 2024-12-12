import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchFlowData, 
  selectFlowState, 
  selectFlowStatus 
} from '../slices/flowSlice';

/**
 * Custom hook to manage flow data fetching and cleanup
 * @returns {Object} Flow data state and status
 */
export const useFlowDataManager = () => {
  const dispatch = useDispatch();
  const flowState = useSelector(selectFlowState);
  const { loading, error } = useSelector(selectFlowStatus);
  
  // Get selected date and commodity from spatial and ecm slices
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);
  const selectedCommodity = useSelector(state => state.ecm.ui.selectedCommodity);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!selectedCommodity || !selectedDate) return;

      // Check if data is already loaded
      const key = `${selectedCommodity}-${selectedDate}`;
      if (!flowState.status.loadedData[key]) {
        await dispatch(fetchFlowData({ 
          commodity: selectedCommodity,
          date: selectedDate
        }));
      }
    };

    if (mounted) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [selectedCommodity, selectedDate, dispatch, flowState.status.loadedData]);

  return {
    flows: flowState.flows,
    byDate: flowState.byDate,
    byRegion: flowState.byRegion,
    metadata: flowState.metadata,
    loading,
    error
  };
};

export default useFlowDataManager;
