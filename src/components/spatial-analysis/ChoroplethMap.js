// src/components/spatial-analysis/ChoroplethMap.js

import React from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TimeSlider from './TimeSlider';

const ChoroplethMap = ({ selectedCommodity, enhancedData, selectedDate, onDateChange, uniqueMonths }) => {
  const theme = useTheme();

  // Function to determine color based on usdprice value
  const getColor = (value) => {
    return value > 10 ? '#800026' :
           value > 8  ? '#BD0026' :
           value > 6  ? '#E31A1C' :
           value > 4  ? '#FC4E2A' :
           value > 2  ? '#FD8D3C' :
           value > 1  ? '#FEB24C' :
           value > 0  ? '#FED976' :
                       '#FFEDA0';
  };

  // Style function for GeoJSON features
  const style = (feature) => ({
    fillColor: feature.properties.usdprice !== null ? getColor(feature.properties.usdprice) : '#FFEDA0',
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
  });

  // Function to bind popups and tooltips to each feature
  const onEachFeature = (feature, layer) => {
    const regionName = feature.properties.region_name || feature.properties.shapeName || 'Unknown Region';
    const usdPrice = feature.properties.usdprice !== null ? `$${feature.properties.usdprice.toFixed(2)}` : 'N/A';
    const conflictIntensity = feature.properties.conflict_intensity !== null ? feature.properties.conflict_intensity : 'N/A';
    const residual = feature.properties.residual !== null ? feature.properties.residual : 'N/A';

    // Bind popup
    layer.bindPopup(`
      <strong>${regionName}</strong><br />
      USD Price: ${usdPrice}<br />
      Conflict Intensity: ${conflictIntensity}<br />
      Residual: ${residual}
    `);

    // Bind tooltip (optional)
    layer.bindTooltip(`
      <strong>${regionName}</strong><br />
      USD Price: ${usdPrice}
    `, { direction: 'auto' });
  };

  // Legend Component
  const Legend = () => {
    const grades = [0, 1, 2, 4, 6, 8, 10];
    const colors = grades.map(getColor);

    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: '30px',
          left: '10px',
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '5px',
          boxShadow: theme.shadows[3],
          lineHeight: '18px',
          color: '#555',
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          USD Price
        </Typography>
        {grades.map((grade, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box
              sx={{
                width: '18px',
                height: '18px',
                backgroundColor: colors[index],
                marginRight: '8px',
              }}
            />
            <Typography variant="caption">{grade}{grades[index + 1] ? `–${grades[index + 1]}` : '+'}</Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // Conditional rendering based on data availability
  if (!enhancedData || !enhancedData.features || enhancedData.features.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">
          No spatial data available for <strong>{selectedCommodity}</strong> on the selected date.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '500px', mt: 2, position: 'relative' }}>
      {/* Map Container */}
      <MapContainer center={[15.3694, 44.1910]} zoom={6} style={{ height: '100%', width: '100%' }}>
        {/* Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* GeoJSON Layer */}
        <GeoJSON data={enhancedData} style={style} onEachFeature={onEachFeature} />
      </MapContainer>

      {/* Integrated Time Slider */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: { xs: '90%', sm: '60%' },
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: theme.shadows[3],
        }}
      >
        <TimeSlider
          months={uniqueMonths} // Passed as 'months' prop
          selectedDate={selectedDate}
          onChange={onDateChange}
        />
      </Box>

      {/* Legend */}
      <Legend />
    </Box>
  );
};

ChoroplethMap.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  enhancedData: PropTypes.object.isRequired, // This should be the filtered GeoJSON data
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onDateChange: PropTypes.func.isRequired,
  uniqueMonths: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired, // Added uniqueMonths
};

export default ChoroplethMap;