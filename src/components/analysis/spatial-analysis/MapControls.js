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
  Paper,
} from '@mui/material';
import {
  Refresh,
  LayersOutlined,
  HubOutlined,
  ShowChartOutlined,
  WarningAmber,
  MapOutlined,
} from '@mui/icons-material';

const MapControls = ({
  selectedCommodity,
  selectedDate,
  uniqueMonths = [],
  commodities = [],
  onCommodityChange,
  onDateChange,
  onRefresh,
  visualizationMode,
  onVisualizationModeChange,
  showFlows,
  onToggleFlows,
}) => {
  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        {/* Commodity Selection */}
        <FormControl sx={{ minWidth: 200 }}>
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

        {/* Date Selection */}
        <FormControl sx={{ minWidth: 150 }}>
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

        {/* Visualization Mode Controls */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Price Distribution">
            <IconButton
              color={visualizationMode === 'prices' ? 'primary' : 'default'}
              onClick={() => onVisualizationModeChange('prices')}
            >
              <ShowChartOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Market Integration">
            <IconButton
              color={visualizationMode === 'integration' ? 'primary' : 'default'}
              onClick={() => onVisualizationModeChange('integration')}
            >
              <LayersOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Market Clusters">
            <IconButton
              color={visualizationMode === 'clusters' ? 'primary' : 'default'}
              onClick={() => onVisualizationModeChange('clusters')}
            >
              <HubOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Market Shocks">
            <IconButton
              color={visualizationMode === 'shocks' ? 'primary' : 'default'}
              onClick={() => onVisualizationModeChange('shocks')}
            >
              <WarningAmber />
            </IconButton>
          </Tooltip>
          <Tooltip title={showFlows ? 'Hide Flows' : 'Show Flows'}>
            <IconButton
              onClick={onToggleFlows}
              color={showFlows ? 'primary' : 'default'}
            >
              <MapOutlined />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Refresh Button */}
        <Tooltip title="Refresh Data">
          <IconButton onClick={onRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
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
  visualizationMode: PropTypes.string.isRequired,
  onVisualizationModeChange: PropTypes.func.isRequired,
  showFlows: PropTypes.bool.isRequired,
  onToggleFlows: PropTypes.func.isRequired,
};

export default React.memo(MapControls);