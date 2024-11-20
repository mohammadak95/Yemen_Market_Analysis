// src/components/analysis/spatial-analysis/FlowLayer.js

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';

const FlowLayer = ({ flowData }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !Array.isArray(flowData)) return;

    // Use spatialHandler to get coordinates for regions
    const flowsWithCoords = flowData
      .map(flow => {
        // Get coordinates for source and target
        const sourceCoords = spatialHandler.geometryCache?.get(flow.source)?.centroid;
        const targetCoords = spatialHandler.geometryCache?.get(flow.target)?.centroid;
        
        if (!sourceCoords || !targetCoords) return null;

        return {
          ...flow,
          source_lat: sourceCoords.lat,
          source_lng: sourceCoords.lng,
          target_lat: targetCoords.lat,
          target_lng: targetCoords.lng
        };
      })
      .filter(flow => flow !== null);

    const flowLines = flowsWithCoords.map(flow => {
      const sourcePoint = L.latLng(flow.source_lat, flow.source_lng);
      const targetPoint = L.latLng(flow.target_lat, flow.target_lng);
      
      return L.polyline([sourcePoint, targetPoint], {
        color: '#2196f3',
        weight: Math.max(1, Math.min(5, flow.avgFlow || 1)),
        opacity: 0.6
      }).bindTooltip(`${flow.source} → ${flow.target}<br>Flow: ${flow.totalFlow.toFixed(2)}`);
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
      totalFlow: PropTypes.number.isRequired,
      avgFlow: PropTypes.number,
      flowCount: PropTypes.number,
      avgPriceDifferential: PropTypes.number
    })
  ).isRequired
};

export default FlowLayer;