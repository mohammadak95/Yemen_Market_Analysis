//src/components/common/CommoditySelector.js

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import { 
  selectSelectedCommodity,
  selectIsLoading,
  selectAvailableRegimes 
} from '../../selectors/spatialSelectors';
import { setSelectedCommodity, loadSpatialData } from '../../slices/spatialSlice';
import { COMMODITIES } from '../../constants';

const CommoditySelector = () => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectIsLoading);
  const selectedCommodity = useSelector(selectSelectedCommodity);
  
  // Memoize available commodities
  const commodities = useMemo(() => {
    const allCommodities = Object.values(COMMODITIES).flat();
    return Array.from(new Set(allCommodities));
  }, []);

  const handleCommoditySelect = useCallback(async (commodity) => {
    if (commodity && !isLoading) {
      dispatch(setSelectedCommodity(commodity));
      try {
        await dispatch(loadSpatialData({
          selectedCommodity: commodity,
          selectedDate: null,
        })).unwrap();
      } catch (error) {
        console.error('Error selecting commodity:', error);
      }
    }
  }, [dispatch, isLoading]);

  return (
    <FormControl fullWidth variant="outlined" size="small" margin="normal">
      <InputLabel id="commodity-select-label">Select Commodity</InputLabel>
      <Select
        labelId="commodity-select-label"
        id="commodity-select"
        value={selectedCommodity || ''}
        onChange={(e) => handleCommoditySelect(e.target.value)}
        label="Select Commodity"
        disabled={isLoading}
      >
        {commodities.map((commodity) => (
          <MenuItem key={commodity} value={commodity}>
            {commodity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default React.memo(CommoditySelector);