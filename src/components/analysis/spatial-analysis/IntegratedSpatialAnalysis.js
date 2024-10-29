
import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  Alert, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Info as InfoIcon } from 'lucide-react';

// Import existing components
import EnhancedChoroplethMap from './EnhancedChoroplethMap';
import CombinedFlowNetworkMap from './CombinedFlowNetworkMap';
import MarketClustering from './MarketClustering';
import SpatialStatistics from './SpatialStatistics';
import LoadingSpinner from '../../common/LoadingSpinner'; // Updated path

// Import hooks and utilities
import useSpatialDataOptimized from '../../../hooks/useSpatialDataOptimized';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const VARIABLE_OPTIONS = [
  { value: 'usdprice', label: 'USD Price' },
  { value: 'price', label: 'Local Price' },
  { value: 'conflict_intensity', label: 'Conflict Intensity' },
  { value: 'residual', label: 'Price Residuals' }
];

const IntegratedSpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Use existing data loading hook
  const {
    geoData,
    flowMaps,
    analysisResults,
    loading,
    error,
    uniqueMonths,
  } = useSpatialDataOptimized(selectedCommodity);

  const [selectedVariable, setSelectedVariable] = useState('usdprice');
  const [selectedDate, setSelectedDate] = useState(null);

  // Set initial date when data loads
  React.useEffect(() => {
    if (uniqueMonths?.length && !selectedDate) {
      setSelectedDate(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths, selectedDate]);

  // Process current features
  const currentFeatures = useMemo(() => {
    if (!geoData?.features || !selectedDate) return [];

    return geoData.features.filter(feature => {
      const featureDate = new Date(feature.properties?.date);
      const targetDate = new Date(selectedDate);
      return featureDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
    });
  }, [geoData, selectedDate]);

  const handleVariableChange = useCallback((event) => {
    setSelectedVariable(event.target.value);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}>
          Spatial Analysis: {selectedCommodity}
          <Tooltip title={getTechnicalTooltip('spatial_analysis')}>
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Variable</InputLabel>
          <Select
            value={selectedVariable}
            onChange={handleVariableChange}
            label="Variable"
          >
            {VARIABLE_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {currentFeatures.length > 0 && (
            <EnhancedChoroplethMap
              data={{
                type: 'FeatureCollection',
                features: currentFeatures
              }}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              variable={selectedVariable}
              uniqueMonths={uniqueMonths}
            />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {flowMaps && flowMaps.length > 0 && (
            <CombinedFlowNetworkMap
              flowMaps={flowMaps}
              selectedCommodity={selectedCommodity}
              dateRange={[uniqueMonths[0], uniqueMonths[uniqueMonths.length - 1]]}
            />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {analysisResults && (
            <SpatialStatistics
              analysisResults={analysisResults}
              selectedDate={selectedDate}
            />
          )}
        </Grid>

        <Grid item xs={12}>
          {currentFeatures.length > 0 && (
            <MarketClustering
              data={currentFeatures}
              selectedCommodity={selectedCommodity}
              isMobile={isMobile}
            />
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

IntegratedSpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default React.memo(IntegratedSpatialAnalysis);
