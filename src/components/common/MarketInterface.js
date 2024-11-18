// src/components/common/MarketInterface.js

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  selectSpatialUI,
} from '../../slices/spatialSlice';
import {
  selectAvailableCommodities,
  selectAvailableRegimes,
} from '../../selectors/spatialSelectors';

const MarketInterface = () => {
  const dispatch = useDispatch();

  // Extracting UI and Status from the spatial slice
  const { loading, error } = useSelector(selectSpatialStatus);
  const { selectedCommodity, selectedRegimes } = useSelector(selectSpatialUI);
  const availableCommodities = useSelector(selectAvailableCommodities);
  const availableRegimes = useSelector(selectAvailableRegimes);

  /**
   * Handles the change event for commodity selection.
   * Dispatches actions to update the selected commodity and load spatial data.
   *
   * @param {Object} event - The change event object.
   */
  const handleCommodityChange = useCallback(
    async (event) => {
      const commodity = event.target.value;
      if (!commodity) return;

      // Update the selected commodity in the Redux store
      dispatch(setSelectedCommodity(commodity));

      try {
        // Dispatch the loadSpatialData thunk with the correct parameters
        await dispatch(
          loadSpatialData({
            commodity, // Updated parameter name
            date: null, // Assuming null for date; adjust as needed
            options: {}, // Add any additional options if necessary
          })
        ).unwrap(); // Using unwrap to handle fulfilled and rejected actions
      } catch (error) {
        // Log the error using the monitoring system
        monitoringSystem.error('Error loading commodity data:', error);
      }
    },
    [dispatch]
  );

  /**
   * Handles the change event for regime (market) selection.
   * Dispatches an action to update the selected regimes in the Redux store.
   *
   * @param {Object} event - The change event object.
   */
  const handleRegimeChange = useCallback(
    (event) => {
      const regimes = event.target.value;
      if (regimes.length > 0) {
        dispatch(setSelectedRegimes(regimes));
      }
    },
    [dispatch]
  );

  /**
   * Formats the label by replacing underscores with spaces and capitalizing each word.
   *
   * @param {string} value - The string to format.
   * @returns {string} - The formatted string.
   */
  const formatLabel = useCallback((value) => {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Display an error alert if there's an error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Commodity Selection */}
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

        {/* Market (Regime) Selection */}
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
              disabled={
                loading ||
                !selectedCommodity ||
                availableRegimes.length === 0
              }
              renderValue={(selected) =>
                selected.map(formatLabel).join(', ')
              }
            >
              {availableRegimes.map((regime) => (
                <MenuItem key={regime} value={regime}>
                  <Checkbox
                    checked={selectedRegimes.indexOf(regime) > -1}
                  />
                  <ListItemText primary={formatLabel(regime)} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Loading Indicator */}
        {loading && (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Display selected markets count */}
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