
// SpatialAnalysis.js
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

// Import all related components
import ChoroplethMap from './ChoroplethMap';
import CombinedFlowNetworkMap from './CombinedFlowNetworkMap';
import DiagnosticsTests from './DiagnosticsTests';
import MarketClustering from './MarketClustering';
import RegressionResults from './RegressionResults';
import SpatialStatistics from './SpatialStatistics';
import SpatialTutorial from './SpatialTutorial';
import TimeSlider from './TimeSlider';

// Import hooks and context
import { useSpatialDataOptimized } from '@/hooks';;
import { useTechnicalHelp } from '@/hooks';;
import LoadingSpinner from '../../common/LoadingSpinner';

const VARIABLE_OPTIONS = [
  { value: 'usdprice', label: 'USD Price' },
  { value: 'price', label: 'Local Price' },
  { value: 'conflict_intensity', label: 'Conflict Intensity' },
  { value: 'residual', label: 'Price Residuals' }
];

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Use the optimized data loading hook
  const {
    geoData,
    flowMaps,
    analysisResults,
    loading,
    error,
    uniqueMonths,
  } = useSpatialDataOptimized(selectedCommodity);

  // Local state management
  const [selectedVariable, setSelectedVariable] = useState('usdprice');
  const [selectedDate, setSelectedDate] = useState(null);
  const [mapView, setMapView] = useState({
    center: [15.3694, 44.191],
    zoom: 6
  });

  // Handle map view changes
  const handleMapViewChange = useCallback((newView) => {
    setMapView(newView);
  }, []);

  // Set initial date when data loads
  React.useEffect(() => {
    if (uniqueMonths?.length && !selectedDate) {
      setSelectedDate(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths, selectedDate]);

  // Filter current features based on selected date
  const currentFeatures = useMemo(() => {
    if (!geoData?.features || !selectedDate) return [];

    return geoData.features.filter(feature => {
      if (!feature?.properties?.date) return false;
      const featureDate = new Date(feature.properties.date);
      const targetDate = new Date(selectedDate);
      return featureDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
    });
  }, [geoData, selectedDate]);

  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
      {/* Tutorial Component */}
      <Box sx={{ mb: 3 }}>
        <SpatialTutorial />
      </Box>

      {/* Header and Controls */}
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
            onChange={(e) => setSelectedVariable(e.target.value)}
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
        {/* Map Section */}
        <Grid item xs={12}>
          <Box sx={{ position: 'relative', height: isMobile ? 400 : 600 }}>
            {currentFeatures.length > 0 && (
              <ChoroplethMap
                data={{
                  type: 'FeatureCollection',
                  features: currentFeatures
                }}
                selectedDate={selectedDate}
                variable={selectedVariable}
                center={mapView.center}
                zoom={mapView.zoom}
                onViewChange={handleMapViewChange}
              />
            )}
          </Box>
          {uniqueMonths?.length > 0 && (
            <TimeSlider
              months={uniqueMonths}
              selectedDate={selectedDate}
              onChange={setSelectedDate}
            />
          )}
        </Grid>

        {/* Flow Network Section */}
        <Grid item xs={12} md={6}>
          {flowMaps && flowMaps.length > 0 && (
            <CombinedFlowNetworkMap
              flowMaps={flowMaps}
              selectedCommodity={selectedCommodity}
              dateRange={[uniqueMonths[0], uniqueMonths[uniqueMonths.length - 1]]}
            />
          )}
        </Grid>

        {/* Statistics Section */}
        <Grid item xs={12} md={6}>
          {analysisResults && (
            <SpatialStatistics
              analysisResults={analysisResults}
            />
          )}
        </Grid>

        {/* Diagnostics Section */}
        <Grid item xs={12} md={6}>
          {analysisResults && (
            <DiagnosticsTests
              data={analysisResults}
            />
          )}
        </Grid>

        {/* Regression Results */}
        <Grid item xs={12} md={6}>
          {analysisResults && (
            <RegressionResults
              data={analysisResults}
            />
          )}
        </Grid>

        {/* Market Clustering */}
        <Grid item xs={12}>
          {currentFeatures.length > 0 && (
            <MarketClustering
              data={{
                type: 'FeatureCollection',
                features: currentFeatures
              }}
              selectedCommodity={selectedCommodity}
              isMobile={isMobile}
            />
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default React.memo(SpatialAnalysis);