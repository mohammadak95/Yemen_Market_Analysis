// ChoroplethMap.jsx

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
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
import { format } from 'date-fns';
import chroma from 'chroma-js';
import TimeSlider from './TimeSlider';

// Utility to format dates consistently
const formatDateForFeature = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return null;
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

  // Filter features for the selected date and map 'shapeName' to 'name'
  const filteredFeatures = useMemo(() => {
    if (!enhancedData?.features) return [];
    
    const processedFeatures = enhancedData.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        // Map 'shapeName' to 'name' for consistent access
        name: feature.properties.name || feature.properties.shapeName || 'Unknown Region',
        date: formatDateForFeature(feature.properties.date),
        // Ensure mapVariable is a number
        [mapVariable]: typeof feature.properties[mapVariable] === 'string' 
          ? parseFloat(feature.properties[mapVariable]) 
          : feature.properties[mapVariable]
      }
    })).filter(feature => {
      const featureDate = feature.properties.date;
      const targetDate = formatDateForFeature(selectedDate);
      
      return featureDate === targetDate;
    });

    console.log('Processed Features:', processedFeatures);
    return processedFeatures;
  }, [enhancedData, selectedDate, mapVariable]);

  // Calculate the range of values for the selected map variable
  const valueRange = useMemo(() => {
    if (!filteredFeatures.length) return [0, 100];
    
    const values = filteredFeatures
      .map(f => {
        const value = Number(f.properties[mapVariable]);
        return isNaN(value) ? null : value;
      })
      .filter(v => v !== null);
  
    if (values.length === 0) return [0, 100];
    
    return [
      Math.min(...values),
      Math.max(...values)
    ];
  }, [filteredFeatures, mapVariable]);

  // Generate color scale based on the selected color scheme
  const colorScale = useMemo(() => {
    if (colorScheme === 'sequential') {
      return chroma.scale(['#f7fbff', '#2171b5'])
        .domain(valueRange)
        .mode('lab');
    }
    return chroma.scale(['#d73027', '#ffffbf', '#1a9850'])
      .domain([valueRange[0], (valueRange[0] + valueRange[1]) / 2, valueRange[1]])
      .mode('lab');
  }, [colorScheme, valueRange]);

  // Style function for GeoJSON features
  const getFeatureStyle = useCallback((feature) => {
    const value = Number(feature.properties[mapVariable]);
    return {
      fillColor: !isNaN(value) ? colorScale(value).hex() : '#ccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  }, [mapVariable, colorScale]);

  // Popup content generator
  const createPopupContent = useCallback((feature) => {
    const props = feature.properties;
    const value = Number(props[mapVariable]);

    const regionName = props.name || 'Unknown Region';

    return `
      <div style="padding: 8px;">
        <strong>${regionName}</strong><br/>
        ${mapVariable}: ${!isNaN(value) ? value.toFixed(2) : 'N/A'}<br/>
        Date: ${format(new Date(props.date), 'MMM d, yyyy')}
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

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Spatial Distribution
          <Tooltip title="Shows the geographic distribution of selected variables">
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
            <MenuItem value="sequential">Sequential Blues</MenuItem>
            <MenuItem value="diverging">Diverging Red-Green</MenuItem>
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
          </MapContainer>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <TimeSlider
          months={uniqueMonths}
          selectedDate={selectedDate}
          onChange={onDateChange}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          padding: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1
        }}>
          <Typography variant="caption">Low</Typography>
          {Array.from({ length: 5 }).map((_, i) => {
            const value = valueRange[0] + (i * ((valueRange[1] - valueRange[0]) / 4));
            return (
              <Box
                key={i}
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: colorScale(value).hex()
                }}
              />
            );
          })}
          <Typography variant="caption">High</Typography>
        </Box>
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
        name: PropTypes.string, // Primary name property
        shapeName: PropTypes.string, // Alternative name property
        shapeISO: PropTypes.string,
        shapeID: PropTypes.string,
        shapeGroup: PropTypes.string,
        shapeType: PropTypes.string,
        usdprice: PropTypes.oneOfType([
          PropTypes.number,
          PropTypes.string
        ]),
        conflict_intensity: PropTypes.oneOfType([
          PropTypes.number,
          PropTypes.string
        ]),
        residual: PropTypes.oneOfType([
          PropTypes.number,
          PropTypes.string
        ])
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
