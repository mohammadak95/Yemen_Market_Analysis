// src/components/spatial-analysis/SpatialMap.js

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Typography } from '@mui/material';

const SpatialMap = ({ geoData }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const geoJsonLayer = useRef(null);

  useEffect(() => {
    if (!geoData || !mapRef.current) return;

    // Initialize the map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    }

    // Remove previous GeoJSON layer
    if (geoJsonLayer.current) {
      mapInstance.current.removeLayer(geoJsonLayer.current);
    }

    // Add new GeoJSON layer
    geoJsonLayer.current = L.geoJSON(geoData, {
      pointToLayer: (feature, latlng) => {
        const residual = feature.properties.residual;
        const color = residual > 0 ? 'red' : 'blue';
        const radius = Math.min(Math.abs(residual) * 10, 20); // Adjust scaling factor as needed

        return L.circleMarker(latlng, {
          radius,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.4,
        });
      },
      onEachFeature: (feature, layer) => {
        const { region_id, date, residual } = feature.properties;
        layer.bindTooltip(`
          <div>
            <strong>Region:</strong> ${region_id}<br/>
            <strong>Date:</strong> ${new Date(date).toLocaleDateString()}<br/>
            <strong>Residual:</strong> ${residual.toFixed(4)}
          </div>
        `);
      },
    }).addTo(mapInstance.current);

    // Fit map bounds to the GeoJSON layer
    mapInstance.current.fitBounds(geoJsonLayer.current.getBounds());

    // Cleanup function
    return () => {
      if (geoJsonLayer.current) {
        mapInstance.current.removeLayer(geoJsonLayer.current);
      }
    };
  }, [geoData]);

  if (!geoData || geoData.features.length === 0) {
    return (
      <Typography variant="body1">
        No geographical data available.
      </Typography>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '500px', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </Paper>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired,
};

export default SpatialMap;
