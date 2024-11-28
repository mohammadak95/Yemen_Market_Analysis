// src/components/analysis/spatial-analysis/components/shocks/ShockPropagationMap.js

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Paper, Box, Typography, FormControl, InputLabel, 
  Select, MenuItem, Slider, Alert, Tooltip, IconButton,
  Button, Card, CardContent, Grid
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';
import { backgroundMonitor } from '../../../../../utils/backgroundMonitor';
import {
  selectTimeSeriesData,
  selectSpatialAutocorrelation,
  selectGeometryData,
  selectMarketShocks,
} from '../../../../../selectors/shockSelectors';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { useShockAnalysis } from '../../hooks/useShockAnalysis';
import { getTooltipContent } from '../../utils/shockMapUtils';
import TimeControl from './TimeControl';
import ShockLegend from './ShockLegend';
import { monitorMapPerformance } from '../../../../../utils/shockAnalysisDebug';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const DEFAULT_THRESHOLD = 0.1;

const ShockPropagationMap = () => {
  const cleanupRef = useRef(monitorMapPerformance('ShockPropagationMap'));
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
    marketShocks
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
    if (!shocks?.length) return [];
    
    return shocks.filter((shock) => {
      if (!shock?.region || !shock?.date || typeof shock?.magnitude !== 'number') {
        return false;
      }
      if (selectedDate && shock.date !== selectedDate) return false;
      if (shockType && shockType !== 'all' && shock.shock_type !== shockType)
        return false;
      if (typeof threshold === 'number' && shock.magnitude < threshold * 100)
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
          const regionId = feature.properties.region_id;
          const regionShocks = filteredShocks.filter(
            s => s.region === regionId
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

  // Color scale for shock magnitude
  const colorScale = useMemo(() => {
    return scaleLinear()
      .domain([0, Math.max(...filteredShocks.map(s => s.magnitude))])
      .range([theme.palette.warning.light, theme.palette.error.dark]);
  }, [filteredShocks, theme]);

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

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
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
      <Alert severity="info" sx={{ m: 2 }}>
        Loading shock analysis data...
        {!processedGeometry && ' Preparing geometry data.'}
        {!marketShocks?.length && ' Processing market shocks.'}
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

      {/* About This Visualization */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About This Visualization
          </Typography>
          <Typography variant="body2" paragraph>
            The Price Shock Analysis visualizes how price changes propagate through Yemen's market system,
            helping identify patterns of shock transmission and market vulnerabilities. This tool is crucial
            for understanding market dynamics and planning interventions.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Shock Visualization:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Color intensity shows shock magnitude</li>
                  <li>Time controls track shock evolution</li>
                  <li>Filters for different shock types</li>
                  <li>Adjustable magnitude thresholds</li>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Analysis Features:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Price surge detection</li>
                  <li>Shock propagation patterns</li>
                  <li>Regional vulnerability assessment</li>
                  <li>Temporal shock tracking</li>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Key Metrics:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Shock magnitude and duration</li>
                  <li>Propagation speed and reach</li>
                  <li>Regional impact assessment</li>
                  <li>Market resilience indicators</li>
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
            Interpretation Guide:
          </Typography>
          <Box>
            <Typography variant="body2">
              Price shocks are analyzed across multiple dimensions to understand their impact and spread pattern.
              Areas with darker colors indicate stronger price shocks, while the temporal view shows how these
              shocks evolve and propagate through the market system.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
              Key patterns to observe:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <li>Initial shock locations and magnitudes</li>
              <li>Speed and direction of shock propagation</li>
              <li>Regional differences in shock resilience</li>
              <li>Temporal patterns in shock occurrence</li>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Understanding these patterns helps identify vulnerable markets and regions that may need
              intervention or support mechanisms. It also helps in developing early warning systems for
                future market shocks and planning mitigation strategies.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Paper>
  );
};

export default React.memo(ShockPropagationMap);
              