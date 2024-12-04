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
  Grid,
  Tooltip,
  IconButton
} from '@mui/material';
import { Info } from '@mui/icons-material';
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
import Legend from './components/Legend';

const SpatialMap = ({ results, windowWidth, mode = 'analysis' }) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(null);
  const [visualizationType, setVisualizationType] = useState('residuals');
  const [selectedRegion, setSelectedRegion] = useState(null);
  
  const geometryData = useSelector(selectGeometryData);

  // Process map data
  const mapData = useMemo(() => {
    if (!geometryData?.polygons || !results?.residual) return null;

    try {
      const residualsByDate = results.residual.reduce((acc, r) => {
        if (!acc[r.date]) acc[r.date] = {};
        acc[r.date][r.region_id] = r.residual;
        return acc;
      }, {});

      const dates = Object.keys(residualsByDate).sort();
      if (!selectedDate && dates.length > 0) {
        setSelectedDate(dates[dates.length - 1]); // Set to most recent date
      }

      const currentResiduals = selectedDate ? residualsByDate[selectedDate] : {};
      
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
          fillColor: feature.properties.residual != null 
            ? dynamicColorScale(feature.properties.residual).hex() 
            : theme.palette.grey[300]
        }
      }))
    };
  }, [mapData, dynamicColorScale, theme]);

  // Style function for GeoJSON features
  const getRegionStyle = (feature) => {
    const value = mode === 'model' && visualizationType === 'spillover'
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
        const value = mode === 'model' && visualizationType === 'spillover'
          ? properties.spillover
          : properties.residual;

        return `
          <div style="
            background: ${theme.palette.background.paper};
            padding: 8px;
            border-radius: 4px;
            border: 1px solid ${theme.palette.divider};
            font-family: ${theme.typography.fontFamily};
          ">
            <div style="font-weight: 600; margin-bottom: 4px;">
              ${properties.region_name || properties.region_id}
            </div>
            <div style="color: ${theme.palette.text.secondary};">
              ${visualizationType === 'spillover' ? 'Spillover Effect' : 'Price Deviation'}: 
              ${formatTooltipValue(value)}
            </div>
            ${selectedDate ? `
              <div style="color: ${theme.palette.text.secondary}; margin-top: 4px; font-size: 0.9em;">
                ${new Date(selectedDate).toLocaleDateString()}
              </div>
            ` : ''}
          </div>
        `;
      },
      {
        sticky: true,
        direction: 'auto',
        className: 'custom-tooltip'
      }
    );
  };

  if (!mapData || !colorScale) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Spatial Price Analysis
        </Typography>
        <Typography color="text.secondary">
          Loading map data...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Regional Price Patterns
          <Tooltip title="Visualizes spatial distribution of price deviations and market spillover effects">
            <IconButton size="small" sx={{ ml: 1 }}>
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Controls */}
        <Grid item xs={12} md={mode === 'model' ? 6 : 12}>
          <FormControl fullWidth size="small">
            <InputLabel>Analysis Date</InputLabel>
            <Select
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              label="Analysis Date"
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
        </Grid>

        {mode === 'model' && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Analysis Type</InputLabel>
              <Select
                value={visualizationType}
                onChange={(e) => setVisualizationType(e.target.value)}
                label="Analysis Type"
              >
                <MenuItem value="residuals">Price Deviations</MenuItem>
                <MenuItem value="spillover">Market Spillovers</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Map container */}
        <Grid item xs={12}>
          <Box 
            sx={{ 
              height: 500, 
              position: 'relative',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              bounds={DEFAULT_BOUNDS}
              style={{ height: '100%', width: '100%' }}
              maxBounds={DEFAULT_BOUNDS}
              minZoom={DEFAULT_ZOOM - 0.5}
              maxZoom={DEFAULT_ZOOM + 1}
              zoomControl={true}
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

            <Legend
              min={minResidual}
              max={maxResidual}
              colorScale={dynamicColorScale}
              position="bottomright"
              title={visualizationType === 'spillover' ? 'Market Spillovers' : 'Price Deviations'}
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
