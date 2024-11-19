// src/components/analysis/spatial-analysis/ClusterLayer.js

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const ClusterLayer = ({ clusters }) => {
  const map = useMap();

  useEffect(() => {
    if (!clusters || !map) return;

    // Clear existing cluster layers
    map.eachLayer((layer) => {
      if (layer.options && layer.options.pane === 'clusterPane') {
        map.removeLayer(layer);
      }
    });

    // Create a new pane for clusters if it doesn't exist
    if (!map.getPane('clusterPane')) {
      map.createPane('clusterPane');
      map.getPane('clusterPane').style.zIndex = 700; // Adjust as needed
    }

    clusters.forEach((cluster) => {
      const { cluster_id, main_market, connected_markets } = cluster;

      // Assume main_market_coordinates are available
      const { lat, lng } = cluster.main_market_coordinates || {};
      if (lat == null || lng == null) return;

      const marker = L.marker([lat, lng], {
        pane: 'clusterPane',
        title: `Cluster ${cluster_id}`,
        icon: L.divIcon({
          className: 'custom-cluster-icon',
          html: `<div style="background-color: #1f78b4; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                  ${cluster_id}
                </div>`,
        }),
      });

      marker.bindPopup(`
        <strong>Cluster ${cluster_id}</strong><br/>
        Main Market: ${main_market}<br/>
        Markets: ${connected_markets.length}
      `);

      marker.addTo(map);
    });
  }, [clusters, map]);

  return null;
};

ClusterLayer.propTypes = {
  clusters: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      main_market: PropTypes.string.isRequired,
      connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
      main_market_coordinates: PropTypes.shape({
        lat: PropTypes.number.isRequired,
        lng: PropTypes.number.isRequired,
      }),
    })
  ).isRequired,
};

export default React.memo(ClusterLayer);