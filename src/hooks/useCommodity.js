// src/hooks/useCommodity.js
import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import { fetchSpatialData } from '../slices/spatialSlice';

export const useCommodity = () => {
  const dispatch = useDispatch();
  
  // Use primitive selectors to avoid unnecessary rerenders
  const loading = useSelector(state => state.spatial?.status?.loading ?? false);
  const uniqueMonths = useSelector(state => state.spatial?.data?.uniqueMonths ?? [], _.isEqual);
  const commodities = useSelector(state => state.spatial?.data?.commodities ?? [], _.isEqual);
  const selectedCommodity = useSelector(state => state.spatial?.ui?.selectedCommodity ?? '');

  // Memoize commodity list
  const availableCommodities = useMemo(() => 
    [...new Set(commodities)].sort(),
    [commodities]
  );

  // Memoize selection handler
  const handleCommoditySelect = useCallback(async (commodity) => {
    if (!commodity || loading) return;

    try {
      const lowercaseCommodity = commodity.toLowerCase();
      await dispatch(fetchSpatialData({
        commodity: lowercaseCommodity,
        date: uniqueMonths[0] || "2020-10-01"
      })).unwrap();
      
      return true;
    } catch (err) {
      console.error('Error selecting commodity:', err);
      return false;
    }
  }, [dispatch, loading, uniqueMonths]);

  return {
    loading,
    commodities: availableCommodities,
    selectedCommodity,
    uniqueMonths,
    selectCommodity: handleCommoditySelect
  };
};

export default useCommodity;