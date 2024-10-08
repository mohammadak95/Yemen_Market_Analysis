// src/components/spatial-analysis/SpatialMap.js

import React from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Typography } from '@mui/material';

const SpatialMap = ({ geoData, selectedCommodity, selectedRegime }) => {
  if (!geoData || !geoData.features) {
    return (
      <Typography variant="body1">
        No geographic data available to display the map.
      </Typography>
    );
  }

  // Filter the GeoJSON data for the selected commodity and regime
  const filteredFeatures = geoData.features.filter((feature) => {
    const properties = feature.properties;
    return (
      properties.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
      properties.regime.toLowerCase() === selectedRegime.toLowerCase()
    );
  });

  const filteredGeoData = {
    ...geoData,
    features: filteredFeatures,
  };

  const onEachFeature = (feature, layer) => {
    const properties = feature.properties;
    const residual = properties.residual || 0;
    const regionId = properties.region_id || 'Unknown';
    layer.bindPopup(
      `<strong>Region:</strong> ${regionId}<br/><strong>Residual:</strong> ${residual.toFixed(
        4
      )}`
    );
  };

  // Define a style function to color the regions based on the residual
  const style = (feature) => {
    const residual = feature.properties.residual || 0;
    const color = residual > 0 ? '#FF0000' : '#00FF00'; // Red for positive residuals, green for negative
    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  return (
    <MapContainer style={{ height: '500px', width: '100%' }} center={[15.5527, 48.5164]} zoom={6}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON data={filteredGeoData} onEachFeature={onEachFeature} style={style} />
    </MapContainer>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default SpatialMap;
