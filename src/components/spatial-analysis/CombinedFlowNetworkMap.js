// src/components/spatial-analysis/CombinedFlowNetworkMap.js

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper } from '@mui/material';

const CombinedFlowNetworkMap = ({ flowMaps, networkData }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const flowLayerGroup = useRef(L.layerGroup());
  const networkLayerGroup = useRef(L.layerGroup());

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize the map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([15.5527, 48.5164], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);

      flowLayerGroup.current.addTo(mapInstance.current);
      networkLayerGroup.current.addTo(mapInstance.current);
    }

    // Clear previous layers
    flowLayerGroup.current.clearLayers();
    networkLayerGroup.current.clearLayers();

    // Add flow lines
    if (flowMaps && flowMaps.length > 0) {
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

        // Add animation
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
    }

    // Add network nodes and edges
    if (networkData && networkData.nodes && networkData.edges) {
      // Add edges
      networkData.edges.forEach((edge) => {
        const latlngs = [
          [edge.source_lat, edge.source_lng],
          [edge.target_lat, edge.target_lng],
        ];

        L.polyline(latlngs, {
          color: 'green',
          weight: 2,
          opacity: 0.6,
        }).addTo(networkLayerGroup.current);
      });

      // Add nodes
      networkData.nodes.forEach((node) => {
        L.circleMarker([node.lat, node.lng], {
          radius: 5,
          fillColor: '#ff7f00',
          color: '#fff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        })
          .bindPopup(`<strong>${node.name}</strong>`)
          .addTo(networkLayerGroup.current);
      });
    }

    // Fit map bounds to the data
    const allBounds = [];
    if (flowLayerGroup.current.getLayers().length > 0) {
      allBounds.push(flowLayerGroup.current.getBounds());
    }
    if (networkLayerGroup.current.getLayers().length > 0) {
      allBounds.push(networkLayerGroup.current.getBounds());
    }

    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, curr) =>
        acc.extend(curr)
      );
      mapInstance.current.fitBounds(combinedBounds);
    } else {
      mapInstance.current.setView([15.5527, 48.5164], 6);
    }

    // Cleanup function
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [flowMaps, networkData]);

  return (
    <Paper sx={{ p: 2, height: '600px', position: 'relative' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </Paper>
  );
};

CombinedFlowNetworkMap.propTypes = {
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
  networkData: PropTypes.shape({
    nodes: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        lat: PropTypes.number.isRequired,
        lng: PropTypes.number.isRequired,
      })
    ).isRequired,
    edges: PropTypes.arrayOf(
      PropTypes.shape({
        source_lat: PropTypes.number.isRequired,
        source_lng: PropTypes.number.isRequired,
        target_lat: PropTypes.number.isRequired,
        target_lng: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export default CombinedFlowNetworkMap;
