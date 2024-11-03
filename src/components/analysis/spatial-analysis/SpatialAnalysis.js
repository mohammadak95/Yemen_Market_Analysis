// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  IconButton,
  CircularProgress,
  Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  Info as InfoIcon, 
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

// Import all related components
import ChoroplethMap from './ChoroplethMap';
import CombinedFlowNetworkMap from './CombinedFlowNetworkMap';
import DiagnosticsTests from './DiagnosticsTests';
import MarketClustering from './MarketClustering';
import RegressionResults from './RegressionResults';
import SpatialStatistics from './SpatialStatistics';
import SpatialTutorial from './SpatialTutorial';
import TimeSlider from './TimeSlider';
import SpatialErrorBoundary from './SpatialErrorBoundary';

// Updated Hook Imports
import { useSpatialDataOptimized } from '@/hooks/spatialHooks';
import { useSpatialDebug } from '../../../hooks/useSpatialDebug'; // Adjusted import path as necessary
import { useTechnicalHelp } from '../../../hooks/index';

const VARIABLE_OPTIONS = [
  { value: 'usdprice', label: 'USD Price' },
  { value: 'price', label: 'Local Price' },
  { value: 'conflict_intensity', label: 'Conflict Intensity' },
  { value: 'residual', label: 'Price Residuals' }
];

// Refactored DebugInfo Component
const DebugInfo = ({ debugReport, clearDebugCache, showDebugInfo, theme }) => {
  if (!debugReport?.geoJSON) return null;

  const { geoJSON, pipeline } = debugReport;

  return (
    <Collapse in={showDebugInfo}>
      <Paper sx={{ p: 2, mt: 2, bgcolor: theme.palette.grey[100] }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Spatial Debug Info
          </Typography>
          <IconButton size="small" onClick={clearDebugCache}>
            <RefreshCw size={16} />
          </IconButton>
        </Box>

        {geoJSON.issues?.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Issues Found: {geoJSON.issues.length}
            </Typography>
            <Typography variant="body2">
              {geoJSON.issues.map((issue, idx) => (
                <span key={idx}>{issue}{idx < geoJSON.issues.length - 1 ? ', ' : ''}</span>
              ))}
            </Typography>
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Structure Analysis
              </Typography>
              <Box sx={{ '& > *': { mb: 1 } }}>
                <Typography variant="body2">
                  <strong>Total Features:</strong> {geoJSON.featureCount}
                </Typography>
                <Typography variant="body2">
                  <strong>Valid Features:</strong> {geoJSON.validFeatures}
                </Typography>
                <Typography variant="body2">
                  <strong>Geometry Types:</strong> {geoJSON.geometryTypes?.join(', ') || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Property Fields:</strong> {geoJSON.propertyFields?.join(', ') || 'N/A'}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Pipeline Status
              </Typography>
              {pipeline.stages.map((stage, idx) => (
                <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                  <strong>{stage.stage}:</strong> {stage.isValid ? 'Valid' : 'Invalid'} - {stage.details}
                </Typography>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Collapse>
  );
};

DebugInfo.propTypes = {
  debugReport: PropTypes.object,
  clearDebugCache: PropTypes.func.isRequired,
  showDebugInfo: PropTypes.bool.isRequired,
  theme: PropTypes.object.isRequired,
};

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Data loading hooks
  const {
    geoData,
    flowMaps,
    analysisResults,
    loading,
    error,
    uniqueMonths,
    reloadData
  } = useSpatialDataOptimized(selectedCommodity);

  // Debug hooks
  const { debugReport, clearDebugCache } = useSpatialDebug(geoData);

  // Local state
  const [selectedVariable, setSelectedVariable] = useState('usdprice');
  const [selectedDate, setSelectedDate] = useState(null);
  const [mapView, setMapView] = useState({
    center: [15.3694, 44.191],
    zoom: 6
  });
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const handleMapViewChange = useCallback((newView) => {
    setMapView(newView);
  }, []);

  useEffect(() => {
    if (uniqueMonths?.length && !selectedDate) {
      setSelectedDate(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths, selectedDate]);

  const currentFeatures = useMemo(() => {
    if (!geoData?.features || !selectedDate) return [];

    return geoData.features.filter(feature => {
      if (!feature?.properties?.date) return false;
      const featureDate = new Date(feature.properties.date);
      const targetDate = new Date(selectedDate);
      // Compare only the date parts using ISO strings
      return featureDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
    });
  }, [geoData, selectedDate]);

  // Set initial date when data loads
  useEffect(() => {
    if (uniqueMonths?.length && !selectedDate) {
      setSelectedDate(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths, selectedDate]);

  // Set initial date when data loads
  useEffect(() => {
    if (uniqueMonths?.length && !selectedDate) {
      setSelectedDate(uniqueMonths[uniqueMonths.length - 1]);
    }
  }, [uniqueMonths, selectedDate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} thickness={4} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading spatial analysis data...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 2 }}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={reloadData}
          >
            <RefreshCw />
          </IconButton>
        }
      >
        <Typography variant="subtitle2" gutterBottom>
          Error Loading Data
        </Typography>
        <Typography variant="body2">
          {error}
        </Typography>
      </Alert>
    );
  }

  return (
    <SpatialErrorBoundary onRetry={reloadData}>
      <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
        <Box sx={{ mb: 3 }}>
          <SpatialTutorial />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h5" sx={{ flex: 1 }}>
              Spatial Analysis: {selectedCommodity}
            </Typography>
            <Tooltip title={getTechnicalTooltip('spatial_analysis')}>
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Toggle Debug Information">
              <IconButton 
                size="small" 
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                color={showDebugInfo ? 'primary' : 'default'}
              >
                <AlertTriangle />
              </IconButton>
            </Tooltip>
          </Box>

          <DebugInfo
            debugReport={debugReport}
            clearDebugCache={clearDebugCache}
            showDebugInfo={showDebugInfo}
            theme={theme}
          />

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
                months={uniqueMonths} // Now passing ISO string dates
                selectedDate={selectedDate} // Now passing ISO string date
                onChange={date => setSelectedDate(date)} // Receiving ISO string date
              />
            )}

            {flowMaps && flowMaps.length > 0 && (
              <CombinedFlowNetworkMap
                flowMaps={flowMaps}
                selectedCommodity={selectedCommodity}
                dateRange={uniqueMonths?.length ? [
                  uniqueMonths[0],
                  uniqueMonths[uniqueMonths.length - 1]
                ] : null}
              />
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {analysisResults && (
              <SpatialStatistics
                analysisResults={analysisResults}
              />
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {analysisResults && (
              <DiagnosticsTests
                data={analysisResults}
              />
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {analysisResults && (
              <RegressionResults
                data={analysisResults}
              />
            )}
          </Grid>

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
    </SpatialErrorBoundary>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default React.memo(SpatialAnalysis);
