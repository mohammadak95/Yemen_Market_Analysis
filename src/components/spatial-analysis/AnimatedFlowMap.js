// src/components/spatial-analysis/AnimatedFlowMap.js

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Typography } from '@mui/material';

const AnimatedFlowMap = ({ flowMaps }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const flowLayerGroup = useRef(L.layerGroup());

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([15.5527, 48.5164], 6); // Centered on Yemen
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);
      flowLayerGroup.current.addTo(mapInstance.current);
    }

    // Clear previous flow layers
    flowLayerGroup.current.clearLayers();

    if (!flowMaps || flowMaps.length === 0) return;

    // Create flow lines
    flowMaps.forEach((flow) => {
      const latlngs = [
        [flow.source_lat, flow.source_lng],
        [flow.target_lat, flow.target_lng],
      ];

      const flowLine = L.polyline(latlngs, {
        color: '#0077be',
        weight: Math.sqrt(flow.weight) / 2,
        opacity: 0.6,
      }).addTo(flowLayerGroup.current);

      // Add animation using dash array and offset
      let offset = 0;
      const animateFlow = () => {
        offset = (offset + 1) % 20;
        flowLine.setStyle({
          dashArray: '10, 10',
          dashOffset: offset,
        });
        requestAnimationFrame(animateFlow);
      };
      animateFlow();
    });

    // Fit map bounds to the flow map data
    const allLatLngs = flowMaps.flatMap((f) => [
      [f.source_lat, f.source_lng],
      [f.target_lat, f.target_lng],
    ]);
    mapInstance.current.fitBounds(L.latLngBounds(allLatLngs));

    // Cleanup function
    return () => {
      flowLayerGroup.current.clearLayers();
    };
  }, [flowMaps]);

  if (!flowMaps || flowMaps.length === 0) {
    return (
      <Typography variant="body1">No flow map data available.</Typography>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '500px', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </Paper>
  );
};

AnimatedFlowMap.propTypes = {
  flowMaps: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      source_lat: PropTypes.number.isRequired,
      source_lng: PropTypes.number.isRequired,
      target: PropTypes.string.isRequired,
      target_lat: PropTypes.number.isRequired,
      target_lng: PropTypes.number.isRequired,
      weight: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default AnimatedFlowMap;
