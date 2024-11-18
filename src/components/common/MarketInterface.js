// src/components/common/MarketInterface.js

import React, { useCallback, useEffect } from 'react';
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
  selectCommodities,
  selectCommoditiesStatus,
} from '../../slices/commoditiesSlice';

// Utility functions for normalization and formatting
const normalizeCommodityId = (value) => {
  return value?.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_');
};

const formatCommodityLabel = (value) => {
  return value
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const MarketInterface = () => {
  const dispatch = useDispatch();

  const { loading, error } = useSelector(selectSpatialStatus);
  const { selectedCommodity, selectedRegimes } = useSelector(selectSpatialUI);
  const availableCommodities = useSelector(selectCommodities);
  const commoditiesStatus = useSelector(selectCommoditiesStatus);
  const availableRegimes = useSelector(
    (state) => state.spatial.data?.regimes || []
  );

  // Initialize default commodity after commodities are loaded
  useEffect(() => {
    if (
      commoditiesStatus === 'succeeded' &&
      availableCommodities.length > 0 &&
      !selectedCommodity
    ) {
      const defaultCommodityId = availableCommodities[0].id;
      dispatch(setSelectedCommodity(defaultCommodityId));

      dispatch(
        loadSpatialData({
          commodity: defaultCommodityId,
          date: null,
          options: {},
        })
      ).catch((error) => {
        monitoringSystem.error('Error loading initial commodity data:', error);
      });
    }
  }, [
    availableCommodities,
    selectedCommodity,
    dispatch,
    commoditiesStatus,
  ]);

  const handleCommodityChange = useCallback(
    async (event) => {
      const commodityId = event.target.value;
      if (!commodityId) return;

      try {
        dispatch(setSelectedCommodity(commodityId));
        await dispatch(
          loadSpatialData({
            commodity: commodityId,
            date: null,
            options: {},
          })
        ).unwrap();
      } catch (error) {
        monitoringSystem.error('Error loading commodity data:', error);
      }
    },
    [dispatch]
  );

  const handleRegimeChange = useCallback(
    (event) => {
      const regimes = event.target.value;
      if (Array.isArray(regimes) && regimes.length > 0) {
        dispatch(setSelectedRegimes(regimes));
      } else {
        dispatch(setSelectedRegimes([]));
      }
    },
    [dispatch]
  );

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
              disabled={
                loading ||
                commoditiesStatus !== 'succeeded' ||
                availableCommodities.length === 0
              }
            >
              {availableCommodities.map((commodity) => (
                <MenuItem key={commodity.id} value={commodity.id}>
                  {formatCommodityLabel(commodity.name)}
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
                selected.map((regime) => formatCommodityLabel(regime)).join(', ')
              }
            >
              {availableRegimes.map((regime) => (
                <MenuItem key={regime} value={regime}>
                  <Checkbox
                    checked={selectedRegimes?.includes(regime)}
                  />
                  <ListItemText primary={formatCommodityLabel(regime)} />
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