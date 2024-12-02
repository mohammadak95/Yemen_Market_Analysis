// src/components/analysis/spatial/SpatialMap.js

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { selectGeometryData } from '../../../selectors/optimizedSelectors';
import { 
  getColorScale, 
  getResidualStats, 
  getFeatureStyle,
  formatTooltipValue,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DEFAULT_BOUNDS 
} from './utils/mapUtils';
import { analysisStyles } from '../../../styles/analysisStyles';
import Legend from './components/Legend';

const SpatialMap = ({ results, windowWidth, mode = 'analysis' }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const [selectedDate, setSelectedDate] = useState(null);
  const [visualizationType, setVisualizationType] = useState('residuals');
  const [selectedRegion, setSelectedRegion] = useState(null);
  
  // Get geometry data from Redux store
  const geometryData = useSelector(selectGeometryData);

  // Process map data
  const mapData = useMemo(() => {
    if (!geometryData?.polygons || !results?.residual) {
      return null;
    }

    try {
      const residualsByDate = results.residual.reduce((acc, r) => {
        if (!acc[r.date]) acc[r.date] = {};
        acc[r.date][r.region_id] = r.residual;
        return acc;
      }, {});

      const dates = Object.keys(residualsByDate).sort();
      if (!selectedDate && dates.length > 0) {
        setSelectedDate(dates[0]);
      }

      const currentResiduals = selectedDate ? residualsByDate[selectedDate] : {};
      
      // Create proper GeoJSON structure
      return {
        type: 'FeatureCollection',
        features: geometryData.polygons.map(polygon => ({
          type: 'Feature',
          geometry: polygon.geometry,
          properties: {
            ...polygon.properties,
            residual: currentResiduals[polygon.properties.region_id] || null,
            spillover: results.spillover_effects?.[polygon.properties.region_id] || 0,
            regime: results.regime || 'unified',
            isSelected: polygon.properties.region_id === selectedRegion
          }
        }))
      };
    } catch (error) {
      console.error('Error processing map data:', error);
      return null;
    }
  }, [geometryData, results, selectedDate, selectedRegion]);

  // Calculate statistics and color scale
  const { residualStats, colorScale, minResidual, maxResidual } = useMemo(() => {
    if (!results?.residual) {
      return { residualStats: null, colorScale: null, minResidual: null, maxResidual: null };
    }

    // Filter residuals for selected date if available
    const relevantResiduals = selectedDate
      ? results.residual.filter(r => r.date === selectedDate)
      : results.residual;

    const stats = getResidualStats(relevantResiduals);
    if (!stats) return { residualStats: null, colorScale: null, minResidual: null, maxResidual: null };

    const colorScaleFn = getColorScale(stats.min, stats.max, theme);
    return {
      residualStats: stats,
      colorScale: colorScaleFn,
      minResidual: stats.min,
      maxResidual: stats.max
    };
  }, [results, selectedDate, theme]);

  // Generate colors for regions
  const getRegionColor = (index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.primary.light,
      theme.palette.secondary.light
    ];
    return colors[index % colors.length];
  };

  // Get unique regions
  const regions = useMemo(() => 
    _.uniq(results.residual.map(r => r.region_id)),
    [results]
  );

  if (!mapData || !colorScale) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {mode === 'model' ? 'Spatial Model Visualization' : 'Spatial Distribution of Residuals'}
        </Typography>
        <Typography>Loading map data...</Typography>
      </Paper>
    );
  }

  // Update colorScale based on actual residuals
  const dynamicColorScale = useMemo(() => {
    return getColorScale(minResidual, maxResidual, theme);
  }, [minResidual, maxResidual, theme]);

  // Update mapData with new colorScale
  const styledMapData = useMemo(() => {
    if (!mapData) return null;

    return {
      ...mapData,
      features: mapData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          fillColor: feature.properties.residual != null ? dynamicColorScale(feature.properties.residual).hex() : theme.palette.grey[300]
        }
      }))
    };
  }, [mapData, dynamicColorScale, theme]);

  // Style function for GeoJSON features
  const getRegionStyle = (feature) => {
    const value =
      mode === 'model' && visualizationType === 'spillover'
        ? feature.properties.spillover
        : feature.properties.residual;

    return getFeatureStyle(
      value,
      dynamicColorScale,
      theme,
      feature.properties.isSelected
    );
  };

  // Handle region interactions
  const onEachFeature = (feature, layer) => {
    const properties = feature.properties;
    layer.on({
      mouseover: () => setSelectedRegion(properties.region_id),
      mouseout: () => setSelectedRegion(null),
      click: () => setSelectedRegion(properties.region_id)
    });

    layer.bindTooltip(
      () => {
        const value =
          mode === 'model' && visualizationType === 'spillover'
            ? properties.spillover
            : properties.residual;

        return `
          <div class="custom-tooltip">
            <strong>${properties.region_name || properties.region_id}</strong><br/>
            ${visualizationType === 'spillover' ? 'Spillover' : 'Residual'}: 
            ${formatTooltipValue(value)}
            ${selectedDate ? `<br/>Date: ${new Date(selectedDate).toLocaleDateString()}` : ''}
          </div>
        `;
      },
      {
        sticky: true,
        direction: 'auto',
      }
    );
  };

  const fontSize = windowWidth < theme.breakpoints.values.sm ? 10 : 12;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {mode === 'model' ? 'Spatial Model Visualization' : 'Spatial Distribution of Residuals'}
      </Typography>

      <Grid container spacing={2}>
        {/* Controls */}
        <Grid item xs={12}>
          {mode === 'model' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Visualization Type</InputLabel>
              <Select
                value={visualizationType}
                onChange={(e) => setVisualizationType(e.target.value)}
                label="Visualization Type"
              >
                <MenuItem value="residuals">Residuals</MenuItem>
                <MenuItem value="spillover">Spillover Effects</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Date selector */}
          {(mode === 'analysis' || visualizationType === 'residuals') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Date</InputLabel>
              <Select
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                label="Select Date"
              >
                {results.residual
                  .map(r => r.date)
                  .filter((date, index, self) => self.indexOf(date) === index)
                  .sort()
                  .map(date => (
                    <MenuItem key={date} value={date}>
                      {new Date(date).toLocaleDateString()}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          )}
        </Grid>

        {/* Map container */}
        <Grid item xs={12}>
          <Box sx={{ height: 400, position: 'relative' }}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              bounds={DEFAULT_BOUNDS}
              style={{ height: '100%', width: '100%' }}
              maxBounds={DEFAULT_BOUNDS}
              minZoom={DEFAULT_ZOOM - 0.5}
              maxZoom={DEFAULT_ZOOM + 1}
              zoomControl={false}
              dragging={true}
              touchZoom={true}
              doubleClickZoom={true}
              scrollWheelZoom={true}
              boxZoom={true}
              keyboard={true}
              bounceAtZoomLimits={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <GeoJSON
                data={styledMapData}
                style={getRegionStyle}
                onEachFeature={onEachFeature}
              />
            </MapContainer>

            {/* Legend */}
            <Legend
              min={minResidual}
              max={maxResidual}
              colorScale={dynamicColorScale}
              position="bottomright"
              title={
                mode === 'model' && visualizationType === 'spillover'
                  ? 'Spillover Effects'
                  : 'Residuals'
              }
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
    regime: PropTypes.string,
    spillover_effects: PropTypes.object
  }).isRequired,
  windowWidth: PropTypes.number.isRequired,
  mode: PropTypes.oneOf(['analysis', 'model'])
};

export default SpatialMap;
