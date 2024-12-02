//src/components/analysis/spatial/SpatialMap.js

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Slider, FormControl, InputLabel, Select, MenuItem, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { selectGeometryData } from '../../../selectors/optimizedSelectors';
import { getColorScale, getResidualStats } from './utils/mapUtils';
import { analysisStyles } from '../../../styles/analysisStyles';
import Legend from './components/Legend';

// Yemen bounds and center coordinates
const YEMEN_BOUNDS = [
  [12.5, 42.5], // Southwest corner
  [19.0, 54.5]  // Northeast corner
];
const YEMEN_CENTER = [15.5527, 48.5164];
const YEMEN_ZOOM = 6;

const SpatialMap = ({ results, windowWidth, mode = 'analysis' }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const [selectedDate, setSelectedDate] = useState(null);
  const [visualizationType, setVisualizationType] = useState('residuals');
  
  // Get geometry data from Redux store
  const geometryData = useSelector(selectGeometryData);

  // Process residuals data
  const { residualsByDate, dates, residualStats } = useMemo(() => {
    if (!results?.residual) return { residualsByDate: {}, dates: [], residualStats: null };
    
    // Group residuals by date
    const byDate = results.residual.reduce((acc, r) => {
      const date = r.date;
      if (!acc[date]) acc[date] = {};
      acc[date][r.region_id] = r.residual;
      return acc;
    }, {});

    const availableDates = Object.keys(byDate).sort();
    const stats = getResidualStats(results.residual);

    return {
      residualsByDate: byDate,
      dates: availableDates,
      residualStats: stats
    };
  }, [results]);

  // Set initial date if not set
  React.useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  // Get color scale
  const colorScale = useMemo(() => {
    if (!residualStats) return null;
    return getColorScale(residualStats.min, residualStats.max, theme);
  }, [residualStats, theme]);

  // Style function for GeoJSON
  const getRegionStyle = (feature) => {
    const regionId = feature.properties?.region_id;
    let value;

    if (mode === 'model' && visualizationType === 'spillover') {
      // Use spillover effects for model mode
      value = results.spillover_effects?.[regionId] || 0;
    } else {
      // Use residuals for analysis mode or residual view
      value = selectedDate && residualsByDate[selectedDate]?.[regionId];
    }

    return {
      fillColor: value != null ? colorScale(value) : theme.palette.grey[300],
      weight: 1,
      opacity: 1,
      color: theme.palette.grey[500],
      fillOpacity: value != null ? 0.7 : 0.3
    };
  };

  // Model-specific visualization selector
  const renderModelControls = () => (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>Visualization Type</InputLabel>
      <Select
        value={visualizationType}
        onChange={(e) => setVisualizationType(e.target.value)}
        label="Visualization Type"
      >
        <MenuItem value="residuals">Residuals</MenuItem>
        <MenuItem value="spillover">Spillover Effects</MenuItem>
        <MenuItem value="clusters">Spatial Clusters</MenuItem>
      </Select>
    </FormControl>
  );

  if (!geometryData || !results) {
    return (
      <Box sx={styles.loadingContainer}>
        <Typography>No data available for mapping</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {mode === 'model' ? 'Spatial Model Visualization' : 'Spatial Distribution of Residuals'}
      </Typography>

      <Grid container spacing={2}>
        {/* Controls */}
        <Grid item xs={12}>
          {mode === 'model' && renderModelControls()}
          
          {/* Date selector - only show for residuals view */}
          {(mode === 'analysis' || visualizationType === 'residuals') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Date</InputLabel>
              <Select
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                label="Select Date"
              >
                {dates.map(date => (
                  <MenuItem key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Grid>

        {/* Map container */}
        <Grid item xs={12}>
          <Box sx={{ height: 400, position: 'relative' }}>
            <MapContainer
              center={YEMEN_CENTER}
              zoom={YEMEN_ZOOM}
              bounds={YEMEN_BOUNDS}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <GeoJSON
                data={geometryData}
                style={getRegionStyle}
                onEachFeature={(feature, layer) => {
                  const regionId = feature.properties?.region_id;
                  let tooltipContent;

                  if (mode === 'model' && visualizationType === 'spillover') {
                    const spillover = results.spillover_effects?.[regionId] || 0;
                    tooltipContent = `
                      <div>
                        <strong>${regionId}</strong><br/>
                        Spillover Effect: ${spillover.toFixed(4)}
                      </div>
                    `;
                  } else {
                    const residual = selectedDate && residualsByDate[selectedDate]?.[regionId];
                    tooltipContent = `
                      <div>
                        <strong>${regionId}</strong><br/>
                        Residual: ${residual != null ? residual.toFixed(4) : 'N/A'}
                      </div>
                    `;
                  }
                  
                  layer.bindTooltip(() => tooltipContent, {
                    sticky: true,
                    direction: 'auto'
                  });
                }}
              />
            </MapContainer>

            {/* Legend */}
            <Legend
              min={residualStats?.min}
              max={residualStats?.max}
              colorScale={colorScale}
              position="bottomright"
              title={mode === 'model' && visualizationType === 'spillover' ? 'Spillover Effects' : 'Residuals'}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialMap.propTypes = {
  results: PropTypes.shape({
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      residual: PropTypes.number.isRequired
    })).isRequired,
    spillover_effects: PropTypes.object // Optional for model mode
  }).isRequired,
  windowWidth: PropTypes.number.isRequired,
  mode: PropTypes.oneOf(['analysis', 'model'])
};

export default SpatialMap;
