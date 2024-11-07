// src/components/analysis/spatial-analysis/MapControls.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

const MapControls = ({
  selectedCommodity,
  selectedDate,
  uniqueMonths = [],
  commodities = [],
  onCommodityChange,
  onDateChange,
  onRefresh,
  analysisResults,
}) => {
  // Format date for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  // Get current commodity analysis
  const currentAnalysis = analysisResults?.find(
    (analysis) => analysis.commodity === selectedCommodity
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <FormControl variant="outlined" sx={{ minWidth: 150 }}>
        <InputLabel>Commodity</InputLabel>
        <Select
          value={selectedCommodity}
          onChange={(e) => onCommodityChange(e.target.value)}
          label="Commodity"
        >
          {commodities.map((commodity) => (
            <MenuItem key={commodity} value={commodity}>
              {commodity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl variant="outlined" sx={{ minWidth: 150 }}>
        <InputLabel>Date</InputLabel>
        <Select
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          label="Date"
        >
          {uniqueMonths.map((month) => (
            <MenuItem key={month} value={month}>
              {formatDate(month)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {currentAnalysis && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Integration: {(currentAnalysis.r_squared * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Spatial Effect: {(currentAnalysis.coefficients?.spatial_lag_price || 0).toFixed(2)}
          </Typography>
        </Box>
      )}

      <Tooltip title="Refresh Data">
        <IconButton onClick={onRefresh} color="primary" size="small">
          <Refresh />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

MapControls.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string.isRequired,
  uniqueMonths: PropTypes.arrayOf(PropTypes.string),
  commodities: PropTypes.arrayOf(PropTypes.string),
  onCommodityChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  analysisResults: PropTypes.array,
};

export default MapControls;