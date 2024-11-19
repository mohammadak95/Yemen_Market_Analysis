// src/components/analysis/spatial-analysis/FlowLayer.js

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const FlowLayer = ({ flowData }) => {
  const map = useMap();

  useEffect(() => {
    if (!flowData || !map) return;

    // Clear existing flow layers
    map.eachLayer((layer) => {
      if (layer.options && layer.options.pane === 'flowPane') {
        map.removeLayer(layer);
      }
    });

    // Create a new pane for flows if it doesn't exist
    if (!map.getPane('flowPane')) {
      map.createPane('flowPane');
      map.getPane('flowPane').style.zIndex = 650; // Adjust as needed
    }

    // Add flow lines to the map
    flowData.forEach((flow) => {
      const { source_lat, source_lng, target_lat, target_lng, flow_weight } = flow;

      const latlngs = [
        [source_lat, source_lng],
        [target_lat, target_lng],
      ];

      const flowLine = L.polyline(latlngs, {
        color: 'blue',
        weight: Math.max(1, flow_weight * 2),
        opacity: 0.6,
        pane: 'flowPane',
      });

      flowLine.bindPopup(`
        <strong>Flow Information</strong><br/>
        Source: ${flow.source}<br/>
        Target: ${flow.target}<br/>
        Weight: ${flow_weight}
      `);

      flowLine.addTo(map);
    });
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
      flow_weight: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default React.memo(FlowLayer);