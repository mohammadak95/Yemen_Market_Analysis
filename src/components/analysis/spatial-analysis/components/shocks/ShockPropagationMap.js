// src/components/analysis/spatial-analysis/components/shocks/ShockPropagationMap.js

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet';
import { Paper, Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';
import TimeControl from './TimeControl';
import ShockLegend from './ShockLegend';
import { useShockAnalysis } from '../../hooks/useShockAnalysis';
import { useSelector } from 'react-redux';
import { selectTimeSeriesData, selectSpatialAutocorrelation } from '../../../../../selectors/optimizedSelectors';
import { selectGeometryData } from '../../../../../slices/spatialSlice';

const ShockPropagationMap = () => {
  const theme = useTheme();
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const geometry = useSelector(selectGeometryData);

  // Extract unique dates from time series data
  const timeRange = useMemo(() => {
    const dates = timeSeriesData.map((data) => data.date);
    return Array.from(new Set(dates)).sort();
  }, [timeSeriesData]);

  const [selectedDate, setSelectedDate] = useState(timeRange[0]);
  const [shockType, setShockType] = useState('all');
  const [threshold, setThreshold] = useState(0.1);

  const { shocks, shockStats } = useShockAnalysis(timeSeriesData, spatialAutocorrelation, threshold);

  const colorScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, shockStats.maxMagnitude])
        .range([theme.palette.warning.light, theme.palette.error.dark]),
    [shockStats.maxMagnitude, theme]
  );

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleShockTypeChange = (event) => {
    setShockType(event.target.value);
  };

  const filteredShocks = useMemo(() => {
    return shocks.filter(
      (shock) =>
        shock.date === selectedDate && (shockType === 'all' || shock.shock_type === shockType)
    );
  }, [shocks, selectedDate, shockType]);

  const getFeatureStyle = (feature) => {
    const regionShocks = filteredShocks.filter((s) => s.region === feature.properties.region_id);
    const totalMagnitude = regionShocks.reduce((sum, shock) => sum + shock.magnitude, 0);

    return {
      fillColor: regionShocks.length ? colorScale(totalMagnitude) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature, layer) => {
    const regionShocks = filteredShocks.filter((s) => s.region === feature.properties.region_id);
    if (regionShocks.length) {
      const tooltipContent = `
        <strong>${feature.properties.region_id}</strong><br/>
        Shocks: ${regionShocks.length}<br/>
        Total Magnitude: ${(regionShocks.reduce((sum, s) => sum + s.magnitude, 0) * 100).toFixed(
          2
        )}%
      `;
      layer.bindTooltip(tooltipContent);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Shock Propagation Map
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
        <FormControl size="small">
          <InputLabel>Shock Type</InputLabel>
          <Select value={shockType} onChange={handleShockTypeChange} label="Shock Type">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="price surge">Price Surge</MenuItem>
            <MenuItem value="price drop">Price Drop</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2">
          Threshold: {(threshold * 100).toFixed(0)}%
        </Typography>
      </Box>

      <TimeControl timeRange={timeRange} selectedDate={selectedDate} onChange={handleDateChange} />

      <Box sx={{ position: 'relative', height: '500px', mt: 2 }}>
        <MapContainer center={[15.3694, 44.191]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {geometry && (
            <GeoJSON data={geometry} style={getFeatureStyle} onEachFeature={onEachFeature} />
          )}
        </MapContainer>
        <Box sx={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'white', p: 1 }}>
          <ShockLegend maxMagnitude={shockStats.maxMagnitude} colorScale={colorScale} />
        </Box>
      </Box>
    </Paper>
  );
};

ShockPropagationMap.propTypes = {};

export default ShockPropagationMap;
