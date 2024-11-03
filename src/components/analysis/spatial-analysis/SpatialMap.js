// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Paper, Box } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import { scaleSequential } from 'd3-scale';
import { interpolateOrRd } from 'd3-scale-chromatic';

const SpatialMap = ({ data, viewConfig, onViewChange, windowWidth }) => {
  const variable = 'price'; // You can make this dynamic based on user selection

  // Create a color scale for the variable
  const colorScale = useMemo(() => {
    const values = data.features.map((feature) => feature.properties[variable]).filter(Boolean);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return scaleSequential(interpolateOrRd).domain([min, max]);
  }, [data, variable]);

  const style = (feature) => {
    const value = feature.properties[variable];
    return {
      fillColor: value ? colorScale(value) : '#ccc',
      weight: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  const onEachFeature = (feature, layer) => {
    const { properties } = feature;
    layer.bindPopup(
      `<strong>Region:</strong> ${properties.shapeName || 'Unknown'}<br/>
       <strong>${variable}:</strong> ${properties[variable] || 'N/A'}`
    );
  };

  return (
    <Box sx={{ position: 'relative', height: '500px', width: '100%' }}>
      <MapContainer
        center={viewConfig.center}
        zoom={viewConfig.zoom}
        style={{ height: '100%', width: '100%' }}
        whenCreated={onViewChange}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {data && <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />}
        <MapControls position="topright" />
      </MapContainer>
      <MapLegend colorScale={colorScale} variable={variable} position="bottomright" />
    </Box>
  );
};

SpatialMap.propTypes = {
  data: PropTypes.object.isRequired,
  viewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }).isRequired,
  onViewChange: PropTypes.func,
  windowWidth: PropTypes.number.isRequired,
};

export default SpatialMap;
