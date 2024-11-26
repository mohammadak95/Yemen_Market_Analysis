import React, { useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  Paper, 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Slider,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { interpolateRdBu } from 'd3-scale-chromatic';
import { useTheme } from '@mui/material/styles';
import { 
  selectTimeSeriesData, 
  selectSpatialAutocorrelation,
  selectGeometryData,
  selectMarketShocks,
} from '../../../../../selectors/optimizedSelectors';
import TimeControl from './TimeControl';
import ShockLegend from './ShockLegend';
import { useShockAnalysis } from '../../hooks/useShockAnalysis';
import { getFeatureStyle, getTooltipContent } from './shockMapUtils';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;

const ShockPropagationMap = () => {
  const theme = useTheme();

  // Selectors
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const geometry = useSelector(selectGeometryData);
  const shockData = useSelector(selectMarketShocks);

  // Local state
  const [selectedDate, setSelectedDate] = useState(timeRange[0]);
  const [shockType, setShockType] = useState('all');
  const [threshold, setThreshold] = useState(0.1);

  // Use custom hook for shock analysis
  const { shocks, shockStats, propagationPatterns } = useShockAnalysis(
    timeSeriesData,
    spatialAutocorrelation,
    threshold
  );

  // Color scale for shock magnitude
  const colorScale = useMemo(() => 
    scaleLinear()
      .domain([0, shockStats.maxMagnitude || 1])
      .range([theme.palette.warning.light, theme.palette.error.dark])
  , [shockStats.maxMagnitude, theme]);

  // Filter shocks based on selected criteria
  const filteredShocks = useMemo(() => {
    if (!shocks?.length) return [];
    
    return shocks.filter(shock => 
      shock.date === selectedDate && 
      (shockType === 'all' || shock.shock_type === shockType)
    );
  }, [shocks, selectedDate, shockType]);

  // Handlers
  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  const handleShockTypeChange = useCallback((event) => {
    setShockType(event.target.value);
  }, []);

  const handleThresholdChange = useCallback((event, newValue) => {
    setThreshold(newValue);
  }, []);

  // Get feature style with memoization
  const getFeatureStyleMemo = useCallback((feature) => {
    const regionShocks = filteredShocks.filter(
      (s) => s.region === feature.properties.region_id
    );
    const totalMagnitude = regionShocks.reduce(
      (sum, shock) => sum + shock.magnitude, 
      0
    );

    return getFeatureStyle(totalMagnitude, colorScale);
  }, [filteredShocks, colorScale]);

  // Get tooltip content with memoization
  const getTooltipContentMemo = useCallback((feature) => {
    const regionShocks = filteredShocks.filter(
      (s) => s.region === feature.properties.region_id
    );
    return getTooltipContent(feature, regionShocks);
  }, [filteredShocks]);

  if (!geometry || !timeRange.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No spatial data available for shock analysis.
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
      </Box>

      <TimeControl 
        timeRange={timeRange}
        selectedDate={selectedDate}
        onChange={handleDateChange}
      />

      <Box sx={{ 
        position: 'relative', 
        height: '500px', 
        mt: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1 
      }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {geometry && (
            <GeoJSON
              data={geometry}
              style={getFeatureStyleMemo}
              onEachFeature={(feature, layer) => {
                layer.bindTooltip(getTooltipContentMemo(feature));
              }}
            />
          )}
        </MapContainer>

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
          {`${filteredShocks.length} shocks detected for ${selectedDate} `}
          {`(${(threshold * 100).toFixed(0)}% threshold). `}
          {propagationPatterns.propagationMetrics?.averagePropagationTime > 0 &&
            `Average propagation time: ${propagationPatterns.propagationMetrics.averagePropagationTime.toFixed(1)} days.`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default React.memo(ShockPropagationMap);