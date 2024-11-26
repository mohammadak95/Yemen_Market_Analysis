// src/components/analysis/spatial-analysis/components/clusters/ClusterMap.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';

const ClusterMap = ({ clusters, selectedClusterId, onClusterSelect, geometry }) => {
  const theme = useTheme();

  // Define a color scale based on efficiency score
  const colorScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 1])
        .range([theme.palette.error.light, theme.palette.success.dark]),
    [theme]
  );

  // Map region IDs to their clusters
  const regionClusterMap = useMemo(() => {
    const map = {};
    clusters.forEach(cluster => {
      cluster.connected_markets.forEach(market => {
        map[market] = cluster;
      });
    });
    return map;
  }, [clusters]);

  // Define style for each feature
  const getFeatureStyle = (feature) => {
    const regionId = feature.properties.region_id;
    const cluster = regionClusterMap[regionId];

    if (!cluster) {
      return {
        fillColor: '#cccccc',
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7,
      };
    }

    const isSelected = selectedClusterId === cluster.cluster_id;
    const efficiencyScore = cluster.efficiency_metrics.efficiency_score;

    return {
      fillColor: colorScale(efficiencyScore),
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.secondary.main : 'white',
      fillOpacity: isSelected ? 0.8 : 0.6,
    };
  };

  // Handle feature events
  const onEachFeature = (feature, layer) => {
    const regionId = feature.properties.region_id;
    const cluster = regionClusterMap[regionId];

    if (cluster) {
      layer.on('click', () => onClusterSelect(cluster.cluster_id));

      // Tooltip content
      const tooltipContent = `
        <strong>${regionId}</strong><br/>
        Cluster: ${cluster.main_market}<br/>
        Efficiency Score: ${cluster.efficiency_metrics.efficiency_score.toFixed(2)}<br/>
        Number of Markets: ${cluster.connected_markets.length}
      `;

      layer.bindTooltip(tooltipContent);
    }
  };

  return (
    <MapContainer center={[15.3694, 44.191]} zoom={6} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <GeoJSON data={geometry} style={getFeatureStyle} onEachFeature={onEachFeature} />
    </MapContainer>
  );
};

ClusterMap.propTypes = {
  clusters: PropTypes.array.isRequired,
  selectedClusterId: PropTypes.number,
  onClusterSelect: PropTypes.func.isRequired,
  geometry: PropTypes.object.isRequired,
};

export default React.memo(ClusterMap);