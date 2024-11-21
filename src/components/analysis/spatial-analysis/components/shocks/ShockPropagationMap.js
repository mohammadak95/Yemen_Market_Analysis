// src/components/analysis/spatial-analysis/components/shocks/ShockPropagationMap.js

import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import { Paper, Box, Typography, Slider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';
import TimeControl from './TimeControl';
import ShockLegend from './ShockLegend';
import { useShockAnalysis } from '../../hooks/useShockAnalysis';

const ShockPropagationMap = ({ shocks, spatialAutocorrelation, timeRange, geometry }) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(timeRange[0]);
  const [shockType, setShockType] = useState('all');

  const {
    processedShocks,
    shockStats,
    propagationPatterns
  } = useShockAnalysis(shocks, spatialAutocorrelation, selectedDate);

  const colorScale = useMemo(() => 
    scaleLinear()
      .domain([0, shockStats.maxMagnitude])
      .range([theme.palette.warning.light, theme.palette.error.dark])
  , [shockStats.maxMagnitude, theme]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleShockTypeChange = (event) => {
    setShockType(event.target.value);
  };

  const filteredShocks = useMemo(() => {
    return processedShocks.filter(shock => 
      shock.date === selectedDate &&
      (shockType === 'all' || shock.shock_type === shockType)
    );
  }, [processedShocks, selectedDate, shockType]);

  const renderRegion = (feature) => {
    const regionShocks = filteredShocks.filter(s => s.region === feature.properties.region_id);
    const totalMagnitude = regionShocks.reduce((sum, shock) => sum + shock.magnitude, 0);
    
    return {
      fillColor: regionShocks.length ? colorScale(totalMagnitude) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Price Shock Propagation Analysis
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Shock Type</InputLabel>
            <Select value={shockType} onChange={handleShockTypeChange}>
              <MenuItem value="all">All Shocks</MenuItem>
              <MenuItem value="price_surge">Price Surge</MenuItem>
              <MenuItem value="price_drop">Price Drop</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }}>
            <TimeControl
              timeRange={timeRange}
              selectedDate={selectedDate}
              onChange={handleDateChange}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <MapContainer
          center={[15.3694, 44.191]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {geometry && (
            <GeoJSON
              data={geometry}
              style={renderRegion}
              onEachFeature={(feature, layer) => {
                const regionShocks = filteredShocks.filter(
                  s => s.region === feature.properties.region_id
                );
                
                if (regionShocks.length) {
                  layer.bindPopup(() => {
                    const content = document.createElement('div');
                    content.innerHTML = `
                      <h4>${feature.properties.region_id}</h4>
                      <p>Number of Shocks: ${regionShocks.length}</p>
                      <p>Total Magnitude: ${regionShocks.reduce((sum, s) => sum + s.magnitude, 0).toFixed(2)}</p>
                      <p>Average Price Change: ${(regionShocks.reduce((sum, s) => sum + (s.current_price - s.previous_price), 0) / regionShocks.length).toFixed(2)} USD</p>
                    `;
                    return content;
                  });
                }
              }}
            />
          )}

          {propagationPatterns.map((pattern, index) => (
            <React.Fragment key={index}>
              {pattern.path.map((coord, pathIndex) => (
                <CircleMarker
                  key={`${index}-${pathIndex}`}
                  center={coord}
                  radius={5}
                  color={theme.palette.primary.main}
                  fillColor={theme.palette.primary.light}
                  weight={2}
                  opacity={0.6}
                  fillOpacity={0.4}
                >
                  <Popup>
                    <Typography variant="body2">
                      Propagation Step {pathIndex + 1}
                      <br />
                      Delay: {pattern.delays[pathIndex]} days
                    </Typography>
                  </Popup>
                </CircleMarker>
              ))}
            </React.Fragment>
          ))}
        </MapContainer>
      </Box>

      <ShockLegend
        maxMagnitude={shockStats.maxMagnitude}
        colorScale={colorScale}
        stats={shockStats}
      />
    </Paper>
  );
};

export default ShockPropagationMap;