//src/components/analysis/spatial-analysis/ChoroplethMap.js

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { parseISO, isValid } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  IconButton,
  Stack,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { renderToString } from 'react-dom/server';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import TimeSlider from './TimeSlider';
import chroma from 'chroma-js';

// Fix the default icon issue
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper function to create MUI Icon Marker
const createMUIIconMarker = (IconComponent, color = 'red', size = 40) => {
  const iconHTML = renderToString(<IconComponent style={{ color, fontSize: size }} />);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = size;
  canvas.height = size;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconHTML)}`;
  img.onload = () => context.drawImage(img, 0, 0);

  return new L.Icon({
    iconUrl: canvas.toDataURL(),
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size / 2],
  });
};

// Map bounds adjustment component
const MapBoundsComponent = ({ features }) => {
  const map = useMap();
  
  useEffect(() => {
    if (features && features.length > 0) {
      try {
        const geoJsonLayer = L.geoJSON(features);
        const bounds = geoJsonLayer.getBounds();
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [features, map]);

  return null;
};

MapBoundsComponent.propTypes = {
  features: PropTypes.array.isRequired,
};

const ChoroplethMap = ({ 
  enhancedData, 
  selectedDate, 
  onDateChange, 
  uniqueMonths, 
  isMobile 
}) => {
  const [mapVariable, setMapVariable] = useState('usdprice');
  const [colorScheme, setColorScheme] = useState('sequential');
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Ensure selectedDate is a Date object
  const validSelectedDate = useMemo(() => {
    if (!selectedDate) {
      return uniqueMonths[0] || new Date();
    }
    return selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
  }, [selectedDate, uniqueMonths]);

  // Filter features based on selected date
  const filteredFeatures = useMemo(() => {
    if (!enhancedData?.features) return [];
    
    return enhancedData.features.filter(feature => {
      const date = feature.properties?.date;
      if (!date) return false;
      
      try {
        const featureDate = typeof date === 'string' ? parseISO(date) : date;
        const targetDate = validSelectedDate;
        
        if (!isValid(featureDate) || !isValid(targetDate)) {
          return false;
        }

        return featureDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
      } catch (error) {
        console.warn('Error comparing dates:', error);
        return false;
      }
    });
  }, [enhancedData, validSelectedDate]);

  // Calculate value ranges for choropleth coloring
  const valueRange = useMemo(() => {
    if (!filteredFeatures.length) return [0, 0];
    const values = filteredFeatures.map(f => f.properties[mapVariable]).filter(v => v != null);
    return [Math.min(...values), Math.max(...values)];
  }, [filteredFeatures, mapVariable]);

  // Generate color scale
  const colorScale = useMemo(() => {
    if (colorScheme === 'sequential') {
      return chroma.scale(['#f7fbff', '#2171b5']).domain(valueRange);
    } else {
      const midpoint = (valueRange[0] + valueRange[1]) / 2;
      return chroma.scale(['#d73027', '#ffffbf', '#1a9850']).domain([valueRange[0], midpoint, valueRange[1]]);
    }
  }, [colorScheme, valueRange]);

  // Ensure all months are Date objects
  const validMonths = useMemo(() => {
    return uniqueMonths.map(month => 
      month instanceof Date ? month : new Date(month)
    ).filter(date => isValid(date));
  }, [uniqueMonths]);

  // Handle date change with validation
  const handleDateChange = useCallback((newDate) => {
    if (newDate instanceof Date && isValid(newDate)) {
      onDateChange(newDate);
    } else {
      console.warn('Invalid date selected:', newDate);
    }
  }, [onDateChange]);

  // Style function for GeoJSON features
  const getFeatureStyle = useCallback((feature) => {
    const value = feature.properties[mapVariable];
    return {
      fillColor: value != null ? colorScale(value).hex() : '#ccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }, [mapVariable, colorScale]);

  // Popup content for features
  const createPopupContent = useCallback((feature) => {
    const props = feature.properties;
    return `
      <div>
        <strong>${props.name || 'Unknown Region'}</strong><br/>
        ${mapVariable}: ${props[mapVariable]?.toFixed(2) || 'N/A'}<br/>
        Date: ${props.date ? new Date(props.date).toLocaleDateString() : 'N/A'}
      </div>
    `;
  }, [mapVariable]);

  // Event handlers for features
  const onEachFeature = useCallback((feature, layer) => {
    layer.bindPopup(createPopupContent(feature));
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: '#666',
          fillOpacity: 0.9
        });
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(getFeatureStyle(feature));
      }
    });
  }, [createPopupContent, getFeatureStyle]);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Spatial Distribution
          <Tooltip title={getTechnicalTooltip('choropleth')}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Variable</InputLabel>
          <Select
            value={mapVariable}
            onChange={(e) => setMapVariable(e.target.value)}
            label="Variable"
          >
            <MenuItem value="usdprice">Price (USD)</MenuItem>
            <MenuItem value="conflict_intensity">Conflict Intensity</MenuItem>
            <MenuItem value="residual">Residuals</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Color Scheme</InputLabel>
          <Select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
            label="Color Scheme"
          >
            <MenuItem value="sequential">Sequential</MenuItem>
            <MenuItem value="diverging">Diverging</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {filteredFeatures.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No data available for the selected date.
        </Alert>
      ) : (
        <Box sx={{ height: isMobile ? '300px' : '500px', width: '100%', position: 'relative' }}>
          <MapContainer
            center={[15.3694, 44.191]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <GeoJSON
              data={{
                type: 'FeatureCollection',
                features: filteredFeatures
              }}
              style={getFeatureStyle}
              onEachFeature={onEachFeature}
            />
            <MapBoundsComponent features={filteredFeatures} />
          </MapContainer>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        {validMonths.length > 0 && (
          <TimeSlider
            months={validMonths}
            selectedDate={validSelectedDate}
            onChange={handleDateChange}
          />
        )}
      </Box>
    </Paper>
  );
};

ChoroplethMap.propTypes = {
  enhancedData: PropTypes.shape({
    features: PropTypes.arrayOf(PropTypes.shape({
      properties: PropTypes.shape({
        date: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.instanceOf(Date)
        ]),
        name: PropTypes.string,
        usdprice: PropTypes.number,
        conflict_intensity: PropTypes.number,
        residual: PropTypes.number
      })
    }))
  }),
  selectedDate: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ]).isRequired,
  onDateChange: PropTypes.func.isRequired,
  uniqueMonths: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date)
    ])
  ).isRequired,
  isMobile: PropTypes.bool,
};

export default ChoroplethMap;