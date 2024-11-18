// src/components/common/MarketInterface.js

import React, { useCallback, useEffect } from 'react'; // Added useEffect
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

  const { loading, error } = useSelector(selectSpatialStatus);
  const { selectedCommodity, selectedRegimes } = useSelector(selectSpatialUI);
  const availableCommodities = useSelector(selectAvailableCommodities);
  const availableRegimes = useSelector(selectAvailableRegimes);

  // Add initialization effect
  useEffect(() => {
    const initializeSelections = async () => {
      // Only set default commodity if we have available commodities and no selection
      if (availableCommodities.length > 0 && !selectedCommodity) {
        const defaultCommodity = availableCommodities[0];
        dispatch(setSelectedCommodity(defaultCommodity));
        
        try {
          await dispatch(
            loadSpatialData({
              commodity: defaultCommodity,
              date: null,
              options: {},
            })
          ).unwrap();
        } catch (error) {
          monitoringSystem.error('Error loading initial commodity data:', error);
        }
      }
    };

    initializeSelections();
  }, [availableCommodities, selectedCommodity, dispatch]);

  const handleCommodityChange = useCallback(
    async (event) => {
      const commodity = event.target.value;
      if (!commodity || commodity === selectedCommodity) return;

      try {
        dispatch(setSelectedCommodity(commodity));
        await dispatch(
          loadSpatialData({
            commodity,
            date: null,
            options: {},
          })
        ).unwrap();
      } catch (error) {
        monitoringSystem.error('Error loading commodity data:', error);
      }
    },
    [dispatch, selectedCommodity]
  );

  const handleRegimeChange = useCallback(
    (event) => {
      const regimes = event.target.value;
      if (Array.isArray(regimes) && regimes.length > 0) {
        dispatch(setSelectedRegimes(regimes));
      }
    },
    [dispatch]
  );

  const formatLabel = useCallback((value) => {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
                    checked={selectedRegimes?.indexOf(regime) > -1}
                  />
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