// src/components/analysis/spatial-analysis/ClusterLayer.js

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * ClusterLayer Component
 * 
 * Renders markers for each market cluster on the map.
 * Each marker displays the cluster ID and shows a popup with cluster details upon click.
 * 
 * Props:
 * - clusters: Array of cluster objects containing cluster details and coordinates.
 */
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
      const {
        cluster_id,
        main_market,
        connected_markets,
        main_market_coordinates,
      } = cluster;

      // Validate coordinates
      if (
        !main_market_coordinates ||
        typeof main_market_coordinates.lat !== 'number' ||
        typeof main_market_coordinates.lng !== 'number'
      ) {
        console.warn(
          `Cluster ${cluster_id} is missing main_market_coordinates. Skipping rendering this cluster.`
        );
        return; // Skip clusters without valid coordinates
      }

      const { lat, lng } = main_market_coordinates;

      // Create a custom div icon for the cluster marker
      const clusterIcon = L.divIcon({
        className: 'custom-cluster-icon',
        html: `<div style="
                background-color: #1f78b4;
                color: white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ${cluster_id}
              </div>`,
      });

      // Create a marker for the cluster
      const marker = L.marker([lat, lng], {
        pane: 'clusterPane',
        title: `Cluster ${cluster_id}`,
        icon: clusterIcon,
      });

      // Bind a popup with cluster details
      marker.bindPopup(`
        <strong>Cluster ${cluster_id}</strong><br/>
        Main Market: ${main_market}<br/>
        Connected Markets: ${connected_markets.length}
      `);

      // Add the marker to the map
      marker.addTo(map);
    });
  }, [clusters, map]);

  return null; // This component does not render anything directly
};

// Define PropTypes for ClusterLayer
ClusterLayer.propTypes = {
  clusters: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      main_market: PropTypes.string.isRequired,
      connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
      main_market_coordinates: PropTypes.shape({
        lat: PropTypes.number.isRequired,
        lng: PropTypes.number.isRequired,
      }), // Made optional to handle missing coordinates
    })
  ).isRequired,
};

export default React.memo(ClusterLayer);