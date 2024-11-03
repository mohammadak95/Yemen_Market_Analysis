// src/components/analysis/spatial-analysis/ChoroplethMap.js (Updated Version)

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography,
  Alert
} from '@mui/material';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import 'leaflet/dist/leaflet.css';

import MapControls from './MapControls';
import MapLegend from './MapLegend';
import TimeSlider from './TimeSlider';

const ChoroplethMap = ({
  data,
  selectedDate,
  variable,
  center = [15.3694, 44.191],
  zoom = 6,
  onViewChange
}) => {
  // Filter data based on selected date
  const filteredData = useMemo(() => {
    if (!data?.features?.length || !selectedDate) return { ...data, features: [] };

    const targetDateString = new Date(selectedDate).toISOString().split('T')[0];

    return {
      ...data,
      features: data.features.filter(feature => {
        const featureDate = feature.properties?.date;
        return featureDate && new Date(featureDate).toISOString().split('T')[0] === targetDateString;
      })
    };
  }, [data, selectedDate]);

  // Create color scale for values
  const colorScale = useMemo(() => {
    if (!filteredData?.features?.length) return null;
    
    const values = filteredData.features
      .map(f => f.properties?.[variable])
      .filter(v => v != null && !isNaN(v));
      
    if (!values.length) return null;
    
    return scaleSequential()
      .domain([Math.min(...values), Math.max(...values)])
      .interpolator(interpolateBlues);
  }, [filteredData, variable]);

  // Style function for GeoJSON features
  const getFeatureStyle = useCallback((feature) => {
    const value = feature.properties?.[variable];
    return {
      fillColor: value != null && colorScale ? colorScale(value) : '#ccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }, [variable, colorScale]);

  // Popup content
  const createPopupContent = useCallback((feature) => {
    const props = feature.properties;
    const value = props?.[variable];
    const formattedValue = value != null ? value.toFixed(2) : 'N/A';
    
    return `
      <div style="padding: 8px;">
        <strong>${props.name || 'Unknown Region'}</strong><br/>
        ${variable}: ${formattedValue}<br/>
        Date: ${props.date || 'N/A'}
      </div>
    `;
  }, [variable]);

  // Event handlers for each feature
  const onEachFeature = useCallback((feature, layer) => {
    layer.bindPopup(createPopupContent(feature));
    
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#666',
          fillOpacity: 0.9
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(getFeatureStyle(feature));
      }
    });
  }, [createPopupContent, getFeatureStyle]);

  if (!filteredData?.features?.length) {
    return (
      <Alert severity="info">
        No geographic data available for display
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Geographic Distribution
      </Typography>
      
      <Box sx={{ height: 500, width: '100%', position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          whenCreated={mapInstance => {
            mapInstance.on('moveend', () => {
              const center = mapInstance.getCenter();
              const zoom = mapInstance.getZoom();
              onViewChange?.({ center: [center.lat, center.lng], zoom });
            });
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <GeoJSON
            data={filteredData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
          
          <MapControls position="topright" />
          <MapLegend
            colorScale={colorScale}
            variable={variable}
            position="bottomright"
          />
        </MapContainer>
      </Box>
      
      <TimeSlider
        selectedDate={selectedDate}
        onChange={(newDate) => onViewChange?.({ center, zoom, selectedDate: newDate })}
      />
    </Paper>
  );
};

ChoroplethMap.propTypes = {
  data: PropTypes.shape({
    type: PropTypes.string.isRequired,
    features: PropTypes.arrayOf(PropTypes.object).isRequired,
  }),
  selectedDate: PropTypes.instanceOf(Date),
  variable: PropTypes.string.isRequired,
  center: PropTypes.arrayOf(PropTypes.number),
  zoom: PropTypes.number,
  onViewChange: PropTypes.func,
};

export default React.memo(ChoroplethMap);
