//src/components/analysis/spatial-analysis/MapControls.js

import React, { useMemo } from 'react';
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
  ButtonGroup,
  Paper
} from '@mui/material';
import {
  Refresh,
  LayersOutlined,
  HubOutlined,
  ShowChartOutlined,
  WarningAmber
} from '@mui/icons-material';

const MapControls = ({
  selectedCommodity,
  selectedDate,
  uniqueMonths = [],
  commodities = [],
  onCommodityChange,
  onDateChange,
  onRefresh,
  analysisResults,
  visualizationMode,
  onVisualizationModeChange,
  showFlows,
  onToggleFlows
}) => {
  // Format date for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  // Get current analysis metrics
  const analysisMetrics = useMemo(() => {
    if (!analysisResults?.[`${selectedCommodity}_unified`]) return null;

    const currentAnalysis = analysisResults[`${selectedCommodity}_unified`];
    return {
      integration: (currentAnalysis.r_squared * 100).toFixed(1),
      spatialEffect: (currentAnalysis.coefficients?.spatial_lag_price || 0).toFixed(2),
      moranI: (currentAnalysis.moran_i?.I || 0).toFixed(3),
      significance: currentAnalysis.moran_i?.['p-value'] < 0.05
    };
  }, [analysisResults, selectedCommodity]);

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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
        <ButtonGroup size="small" sx={{ ml: 'auto' }}>
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
        </ButtonGroup>

        {/* Flow Toggle */}
        <Tooltip title={showFlows ? "Hide Flows" : "Show Flows"}>
          <IconButton 
            onClick={onToggleFlows}
            color={showFlows ? "primary" : "default"}
          >
            <LayersOutlined />
          </IconButton>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip title="Refresh Data">
          <IconButton onClick={onRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Analysis Metrics */}
      {analysisMetrics && (
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          mt: 2, 
          pt: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Typography variant="body2" color="text.secondary">
            Integration: {analysisMetrics.integration}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Spatial Effect: {analysisMetrics.spatialEffect}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Moran's I: {analysisMetrics.moranI}
            {analysisMetrics.significance && 
              <Tooltip title="Statistically Significant">
                <Typography 
                  component="span" 
                  color="success.main" 
                  sx={{ ml: 0.5 }}
                >
                  *
                </Typography>
              </Tooltip>
            }
          </Typography>
        </Box>
      )}
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
  analysisResults: PropTypes.object,
  visualizationMode: PropTypes.string.isRequired,
  onVisualizationModeChange: PropTypes.func.isRequired,
  showFlows: PropTypes.bool.isRequired,
  onToggleFlows: PropTypes.func.isRequired
};

export default React.memo(MapControls);