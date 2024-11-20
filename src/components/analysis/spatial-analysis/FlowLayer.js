// src/components/analysis/spatial-analysis/FlowLayer.js

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';

const FlowLayer = ({ flowData, map }) => {
  useEffect(() => {
    if (!map || !Array.isArray(flowData)) return;

    const validFlows = flowData.filter(flow => {
      const hasSourceCoords = flow.source_lat != null && flow.source_lng != null;
      const hasTargetCoords = flow.target_lat != null && flow.target_lng != null;
      
      if (!hasSourceCoords || !hasTargetCoords) {
        console.warn(`Flow missing coordinates: ${flow.source} -> ${flow.target}`);
        return false;
      }
      
      return true;
    });

    const flowLines = validFlows.map(flow => {
      const sourcePoint = L.latLng(flow.source_lat, flow.source_lng);
      const targetPoint = L.latLng(flow.target_lat, flow.target_lng);
      
      return L.polyline([sourcePoint, targetPoint], {
        color: '#2196f3',
        weight: Math.max(1, Math.min(5, flow.flow_weight || 1)),
        opacity: 0.6
      });
    });

    const flowLayer = L.layerGroup(flowLines);
    flowLayer.addTo(map);

    return () => {
      map.removeLayer(flowLayer);
    };
  }, [flowData, map]);

  return null;
};

FlowLayer.propTypes = {
  flowData: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      target: PropTypes.string.isRequired,
      source_lat: PropTypes.number.isRequired,
      source_lng: PropTypes.number.isRequired,
      target_lat: PropTypes.number.isRequired,
      target_lng: PropTypes.number.isRequired,
      flow_weight: PropTypes.number
    })
  ).isRequired,
  map: PropTypes.object
};

export default FlowLayer;