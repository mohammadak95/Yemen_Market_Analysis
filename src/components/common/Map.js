// src/components/common/Map.js
import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';

const Map = ({ geoJsonData }) => {
  return (
    <MapContainer center={[15.3694, 44.1910]} zoom={6} style={{ height: '400px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={geoJsonData} />
    </MapContainer>
  );
};

export default Map;