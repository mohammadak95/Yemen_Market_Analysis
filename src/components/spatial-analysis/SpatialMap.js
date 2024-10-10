// src/components/spatial-analysis/SpatialMap.js

import React from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Typography } from '@mui/material';
import chroma from 'chroma-js'; // For color scaling

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

  // Determine residual range for color scaling
  const residuals = filteredFeatures.map((f) => f.properties.residual);
  const minResidual = Math.min(...residuals);
  const maxResidual = Math.max(...residuals);
  const absMaxResidual = Math.max(Math.abs(minResidual), Math.abs(maxResidual));

  // Define color scale
  const colorScale = chroma.scale(['blue', 'white', 'red']).domain([-absMaxResidual, 0, absMaxResidual]);

  const onEachFeature = (feature, layer) => {
    const properties = feature.properties;
    const residual = properties.residual || 0;
    const regionId = properties.region_id || 'Unknown';
    layer.bindPopup(
      `<strong>Region:</strong> ${regionId}<br/>
       <strong>Commodity:</strong> ${properties.commodity}<br/>
       <strong>Residual:</strong> ${residual.toFixed(4)}`
    );
  };

  // Define a style function to color the regions based on the residual
  const style = (feature) => {
    const residual = feature.properties.residual || 0;
    return {
      fillColor: colorScale(residual).hex(),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  return (
    <MapContainer style={{ height: '500px', width: '100%' }} center={[15.5527, 48.5164]} zoom={6} aria-label="Spatial Residuals Map">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON data={filteredGeoData} onEachFeature={onEachFeature} style={style} />
      {/* Legend Component */}
      <div
        className="legend"
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '10px',
          padding: '10px',
          background: 'white',
          borderRadius: '5px',
          boxShadow: '0 0 15px rgba(0,0,0,0.2)',
        }}
      >
        <Typography variant="caption" gutterBottom>
          Residuals
        </Typography>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Gradient Bar */}
          <div
            style={{
              width: '100px',
              height: '10px',
              background: `linear-gradient(to right, ${colorScale(-absMaxResidual).hex()}, ${colorScale(0).hex()}, ${colorScale(absMaxResidual).hex()})`,
              marginRight: '10px',
            }}
          ></div>
          {/* Labels */}
          <span style={{ fontSize: '0.75rem' }}>{-absMaxResidual.toFixed(2)}</span>
          <span style={{ margin: '0 5px', fontSize: '0.75rem' }}>0</span>
          <span style={{ fontSize: '0.75rem' }}>{absMaxResidual.toFixed(2)}</span>
        </div>
      </div>
    </MapContainer>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default SpatialMap;
