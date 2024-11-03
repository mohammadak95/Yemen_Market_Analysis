// src/components/analysis/spatial-analysis/SpatialMap.js

import React from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SpatialMap = ({ data, diagnostics, viewConfig, onViewChange, windowWidth }) => {
  const onEachFeature = (feature, layer) => {
    const { properties } = feature;
    layer.bindPopup(
      `<strong>Region:</strong> ${properties.shapeName || 'Unknown'}<br/>
       <strong>Price:</strong> ${properties.price || 'N/A'}<br/>
       <strong>Conflict Intensity:</strong> ${properties.conflict_intensity || 'N/A'}`
    );
  };

  return (
    <MapContainer
      center={viewConfig.center}
      zoom={viewConfig.zoom}
      style={{ height: '500px', width: `${windowWidth}px` }}
      whenCreated={onViewChange}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {data && <GeoJSON data={data} onEachFeature={onEachFeature} />}
    </MapContainer>
  );
};

SpatialMap.propTypes = {
  data: PropTypes.object.isRequired,
  diagnostics: PropTypes.object,
  viewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }).isRequired,
  onViewChange: PropTypes.func,
  windowWidth: PropTypes.number.isRequired,
};

export default SpatialMap;
