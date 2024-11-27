// src/components/analysis/spatial-analysis/components/shocks/ShockPropagationMap.js

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Paper, Box, Typography, FormControl, InputLabel, 
  Select, MenuItem, Slider, Alert, Tooltip, IconButton,
  Button 
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { interpolateRdBu } from 'd3-scale-chromatic';
import { useTheme } from '@mui/material/styles';
import { backgroundMonitor } from '../../../../../utils/backgroundMonitor';
import {
  selectTimeSeriesData,
  selectSpatialAutocorrelation,
  selectGeometryData,
  selectMarketShocks,
  // Removed selectFilteredShocks since we handle filtering locally now
} from '../../../../../selectors/shockSelectors'
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { useShockAnalysis } from '../../hooks/useShockAnalysis';
import { getTooltipContent } from '../../utils/shockMapUtils';
import TimeControl from './TimeControl';
import ShockLegend from './ShockLegend';
import { DEBUG_SHOCK_ANALYSIS, debugShockAnalysis, monitorMapPerformance } from '../../../../../utils/shockAnalysisDebug';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const DEFAULT_THRESHOLD = 0.1;

const ShockPropagationMap = () => {
  const debugMonitor = useRef(DEBUG_SHOCK_ANALYSIS.initializeDebugMonitor('ShockPropagationMap'));
  const theme = useTheme();
  const geoJsonLayerRef = useRef(null);
  const mapRef = useRef(null);

  const timeSeriesData = useSelector(selectTimeSeriesData);
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const geometry = useSelector(selectGeometryData);
  const marketShocks = useSelector(selectMarketShocks);

  const [selectedDate, setSelectedDate] = useState('');
  const [shockType, setShockType] = useState('all');
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [error, setError] = useState(null);


  // Use shock analysis hook
  const { shocks, shockStats, propagationPatterns } = useShockAnalysis(
    timeSeriesData,
    spatialAutocorrelation,
    threshold,
    marketShocks // Pass existing marketShocks
  );

  // Calculate time range
  const timeRange = useMemo(() => {
    if (!shocks?.length) {
      return [];
    }

    const dates = shocks
      .map((d) => d.date)
      .filter(Boolean)
      .sort();

    return [...new Set(dates)];
  }, [shocks]);

  // Set initial date if needed
  useEffect(() => {
    if (timeRange.length && !selectedDate) {
      setSelectedDate(timeRange[0]);
    }
  }, [timeRange, selectedDate]);

  // Get filtered shocks based on current criteria
  const filteredShocks = useMemo(() => {
    return shocks.filter((shock) => {
      if (selectedDate && shock.date !== selectedDate) return false;
      if (shockType && shockType !== 'all' && shock.shock_type !== shockType)
        return false;
      if (typeof threshold === 'number' && shock.magnitude < threshold)
        return false;
      return true;
    });
  }, [shocks, selectedDate, shockType, threshold]);

  // Process base geometry
  const baseGeometry = useMemo(() => {
    const metric = backgroundMonitor.startMetric('base-geometry-processing');
    
    try {
      if (!geometry) {
        throw new Error('Missing geometry data');
      }

      const processed = safeGeoJSONProcessor(geometry, 'base');
      if (!processed) {
        throw new Error('Failed to process base geometry');
      }

      metric.finish({ 
        status: 'success', 
        featureCount: processed.features?.length 
      });
      
      return processed;
    } catch (error) {
      console.error('Base geometry processing error:', error);
      setError(`Geometry processing error: ${error.message}`);
      metric.finish({ status: 'failed', error: error.message });
      return null;
    }
  }, [geometry]);

  // Add shock data to features
  const processedGeometry = useMemo(() => {
    if (!baseGeometry?.features) return null;

    const metric = backgroundMonitor.startMetric('shock-geometry-processing');
    
    try {
      const processed = {
        ...baseGeometry,
        features: baseGeometry.features.map(feature => {
          const regionShocks = filteredShocks.filter(
            s => s.region === feature.properties.region_id
          );
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              shocks: regionShocks,
              shock_magnitude: regionShocks.reduce((sum, s) => sum + s.magnitude, 0)
            }
          };
        })
      };

      metric.finish({ 
        status: 'success', 
        featureCount: processed.features.length 
      });
      
      return processed;
    } catch (error) {
      console.error('Shock geometry processing error:', error);
      metric.finish({ status: 'failed', error: error.message });
      return baseGeometry;
    }
  }, [baseGeometry, filteredShocks]);

  // Set initial date if needed
  useEffect(() => {
    if (timeRange.length && !selectedDate) {
      setSelectedDate(timeRange[0]);
    }
  }, [timeRange, selectedDate]);

  // Debug monitoring
  useEffect(() => {
    debugShockAnalysis(shocks, shockStats, propagationPatterns);
  }, [shocks, shockStats, propagationPatterns]);

  // Color scale generation
  const colorScale = useMemo(() => {
    const maxMagnitude = Math.max(
      shockStats.maxMagnitude || 0,
      ...filteredShocks.map(s => s.magnitude)
    );

    const scale = scaleLinear()
      .domain([0, maxMagnitude || 1])
      .range([theme.palette.warning.light, theme.palette.error.dark]);

    DEBUG_SHOCK_ANALYSIS.validateColorScale(scale, maxMagnitude);
    return scale;
  }, [shockStats.maxMagnitude, filteredShocks, theme]);

  // Feature style calculation
  const getFeatureStyleMemo = useCallback((feature) => {
    const magnitude = feature.properties.shock_magnitude || 0;
    const color = magnitude > 0 ? colorScale(magnitude) : theme.palette.action.hover;
    
    return {
      fillColor: color,
      weight: 2,
      opacity: 1,
      color: theme.palette.divider,
      fillOpacity: 0.7
    };
  }, [colorScale, theme]);

  // Event handlers
  const handleShockTypeChange = useCallback((event) => {
    setShockType(event.target.value);
  }, []);

  const handleThresholdChange = useCallback((event, newValue) => {
    setThreshold(newValue);
  }, []);

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  // Reset map view
  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debugMonitor.current) {
        const metric = backgroundMonitor.startMetric('shock-analysis-cleanup');
        debugMonitor.current.finish();
        metric.finish({ status: 'success' });
      }
    };
  }, []);

  // Error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  // Loading state
  if (!processedGeometry || !marketShocks?.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No valid spatial data available for shock analysis.
        {!processedGeometry && ' Missing geometry data.'}
        {!marketShocks?.length && ' Missing shock data.'}
      </Alert>
    );
 }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Market Shock Propagation Analysis
        <Tooltip title="Analyze the spread and impact of price shocks across markets">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
        <FormControl size="small">
          <InputLabel>Shock Type</InputLabel>
          <Select value={shockType} onChange={handleShockTypeChange} label="Shock Type">
            <MenuItem value="all">All Shocks</MenuItem>
            <MenuItem value="price_surge">Price Surge</MenuItem>
            <MenuItem value="price_drop">Price Drop</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ width: 200 }}>
          <Typography variant="body2" gutterBottom>
            Magnitude Threshold: {(threshold * 100).toFixed(0)}%
          </Typography>
          <Slider
            value={threshold}
            onChange={handleThresholdChange}
            min={0}
            max={1}
            step={0.01}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
          />
        </Box>

        <Button size="small" onClick={handleResetView}>
          Reset View
        </Button>
      </Box>

      {/* Time Control */}
      <TimeControl 
        timeRange={timeRange}
        selectedDate={selectedDate}
        onChange={handleDateChange}
      />

      {/* Map Container */}
      <Box sx={{ 
        position: 'relative', 
        height: '500px', 
        mt: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1 
      }}>
        <MapContainer
          ref={mapRef}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {processedGeometry && (
            <GeoJSON
              ref={geoJsonLayerRef}
              data={processedGeometry}
              style={getFeatureStyleMemo}
              onEachFeature={(feature, layer) => {
                layer.bindTooltip(getTooltipContent(feature, feature.properties.shocks || []));
              }}
            />
          )}
        </MapContainer>

        {/* Legend */}
        <Box sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          backgroundColor: 'background.paper',
          p: 1,
          borderRadius: 1,
          boxShadow: 1
        }}>
          <ShockLegend 
            maxMagnitude={shockStats.maxMagnitude} 
            colorScale={colorScale}
            threshold={threshold}
          />
        </Box>
      </Box>

      {/* Summary Statistics */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Analysis Summary
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {`${filteredShocks.length} shocks detected for ${selectedDate || 'selected date'} `}
          {`(${(threshold * 100).toFixed(0)}% threshold). `}
          {propagationPatterns.propagationMetrics?.averagePropagationTime > 0 &&
            `Average propagation time: ${propagationPatterns.propagationMetrics.averagePropagationTime.toFixed(1)} days.`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default React.memo(ShockPropagationMap);
