// Updated MarketInterface.js to integrate with new consolidated systems
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  CircularProgress,
  Alert,
  Stack,
  Typography,
  Paper,
} from '@mui/material';
import { monitoringSystem } from '../../utils/MonitoringSystem';
import {
  setSelectedCommodity,
  setSelectedRegimes,
  loadSpatialData,
  selectSpatialStatus,
  selectSpatialUI
} from '../../slices/spatialSlice';
import {
  selectAvailableCommodities,
  selectAvailableRegimes
} from '../../selectors/spatialSelectors';

const MarketInterface = () => {
  const dispatch = useDispatch();

  // Use memoized selectors
  const { loading, error, isInitialized } = useSelector(selectSpatialStatus);
  const { selectedCommodity, selectedRegimes } = useSelector(selectSpatialUI);
  const availableCommodities = useSelector(selectAvailableCommodities);
  const availableRegimes = useSelector(selectAvailableRegimes);

  // Handle commodity selection
  const handleCommodityChange = useCallback(async (event) => {
    const commodity = event.target.value;
    if (!commodity) return;

    dispatch(setSelectedCommodity(commodity));
    try {
      await dispatch(loadSpatialData({
        selectedCommodity: commodity,
        selectedDate: null
      })).unwrap();
    } catch (error) {
      monitoringSystem.error('Error loading commodity data:', error);
    }
  }, [dispatch]);

  // Handle regime selection
  const handleRegimeChange = useCallback((event) => {
    const regimes = event.target.value;
    if (regimes.length > 0) {
      dispatch(setSelectedRegimes(regimes));
    }
  }, [dispatch]);

  // Format display value for commodity
  const formatLabel = useCallback((value) => {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Commodity Selection
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Commodity</InputLabel>
            <Select
              value={selectedCommodity || ''}
              onChange={handleCommodityChange}
              label="Commodity"
              disabled={loading || availableCommodities.length === 0}
            >
              {availableCommodities.map((commodity) => (
                <MenuItem key={commodity} value={commodity}>
                  {formatLabel(commodity)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Market Selection
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Markets</InputLabel>
            <Select
              multiple
              value={selectedRegimes || []}
              onChange={handleRegimeChange}
              label="Markets"
              disabled={loading || !selectedCommodity || availableRegimes.length === 0}
              renderValue={(selected) => 
                selected.map(formatLabel).join(', ')
              }
            >
              {availableRegimes.map((regime) => (
                <MenuItem key={regime} value={regime}>
                  <Checkbox checked={selectedRegimes.indexOf(regime) > -1} />
                  <ListItemText primary={formatLabel(regime)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={24} />
          </Box>
        )}

        {selectedCommodity && selectedRegimes?.length > 0 && (
          <Box>
            <Typography variant="caption" color="textSecondary">
              Selected Markets: {selectedRegimes.length}
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default React.memo(MarketInterface);
