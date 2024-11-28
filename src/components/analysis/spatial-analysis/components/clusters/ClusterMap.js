// src/components/analysis/spatial-analysis/components/clusters/ClusterMap.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { Typography, Box } from '@mui/material';
import chroma from 'chroma-js';
import _ from 'lodash';

const ClusterMap = ({ 
  clusters, 
  selectedClusterId, 
  onClusterSelect, 
  geometry 
}) => {
  const theme = useTheme();

  // Create color scale for efficiency scores
  const colorScale = useMemo(() => 
    chroma.scale(['#fee8c8', '#e34a33']).domain([0, 1]),
    []
  );

  // Process cluster data for visualization
  const processedClusters = useMemo(() => {
    if (!clusters?.length) return [];

    return clusters.map(cluster => {
      const markets = cluster.markets || cluster.connected_markets || [];
      
      // Calculate center if not provided
      const center = cluster.center_coordinates || (() => {
        const validMarkets = markets.filter(market => 
          geometry?.features?.some(f => 
            f.properties.normalizedName === market.toLowerCase()
          )
        );

        if (!validMarkets.length) return null;

        const coordinates = validMarkets.map(market => {
          const feature = geometry.features.find(f => 
            f.properties.normalizedName === market.toLowerCase()
          );
          return feature?.geometry?.coordinates;
        }).filter(Boolean);

        if (!coordinates.length) return null;

        return [
          coordinates.reduce((sum, [lon]) => sum + lon, 0) / coordinates.length,
          coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length
        ];
      })();

      return {
        ...cluster,
        center,
        markets: markets.map(market => market.toLowerCase()),
        efficiency: cluster.metrics?.efficiency || 0
      };
    }).filter(c => c.center);
  }, [clusters, geometry]);

  // Create GeoJSON features for cluster regions
  const clusterFeatures = useMemo(() => {
    if (!geometry?.features || !processedClusters.length) return null;

    const features = geometry.features.map(feature => {
      const normalizedName = feature.properties.normalizedName.toLowerCase();
      const cluster = processedClusters.find(c => 
        c.markets.includes(normalizedName)
      );

      return {
        ...feature,
        properties: {
          ...feature.properties,
          cluster: cluster ? {
            id: cluster.cluster_id,
            efficiency: cluster.efficiency,
            mainMarket: cluster.main_market,
            marketCount: cluster.markets.length
          } : null
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features
    };
  }, [geometry, processedClusters]);

  const getFeatureStyle = (feature) => {
    const cluster = feature.properties.cluster;

    if (!cluster) {
      return {
        fillColor: theme.palette.grey[300],
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.4
      };
    }

    const isSelected = selectedClusterId === cluster.id;
    
    return {
      fillColor: colorScale(cluster.efficiency).hex(),
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.secondary.main : 'white',
      fillOpacity: isSelected ? 0.8 : 0.6
    };
  };

  // Custom map bounds control component
  const MapBoundsControl = () => {
    const map = useMap();

    React.useEffect(() => {
      if (geometry?.features?.length) {
        const bounds = L.geoJSON(geometry).getBounds();
        map.fitBounds(bounds);
      }
    }, [map, geometry]);

    return null;
  };

  if (!processedClusters.length || !clusterFeatures) {
    return (
      <Box 
        sx={{ 
          height: 400, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1
        }}
      >
        <Typography color="text.secondary">
          No cluster data available for visualization
        </Typography>
      </Box>
    );
  }

  return (
    <MapContainer
      center={[15.3694, 44.191]}
      zoom={6}
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <MapBoundsControl />

      {/* Render region polygons */}
      {clusterFeatures && (
        <GeoJSON
          data={clusterFeatures}
          style={getFeatureStyle}
          onEachFeature={(feature, layer) => {
            const cluster = feature.properties.cluster;
            if (cluster) {
              layer.on({
                click: () => onClusterSelect(cluster.id)
              });

              layer.bindTooltip(() => `
                <div style="min-width: 150px;">
                  <strong>${feature.properties.originalName}</strong><br/>
                  Cluster: ${cluster.mainMarket}<br/>
                  Efficiency: ${(cluster.efficiency * 100).toFixed(1)}%<br/>
                  Markets: ${cluster.marketCount}
                </div>
              `, {
                sticky: true,
                direction: 'top'
              });
            }
          }}
        />
      )}

      {/* Render cluster centers */}
      {processedClusters.map(cluster => (
        <CircleMarker
          key={cluster.cluster_id}
          center={[cluster.center[1], cluster.center[0]]}
          radius={Math.sqrt(cluster.markets.length) * 3}
          pathOptions={{
            fillColor: colorScale(cluster.efficiency).hex(),
            color: selectedClusterId === cluster.cluster_id ? 
              theme.palette.secondary.main : 'white',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6
          }}
          eventHandlers={{
            click: () => onClusterSelect(cluster.cluster_id)
          }}
        >
          <Tooltip>
            <Typography variant="subtitle2">
              Cluster {cluster.cluster_id}
            </Typography>
            <Typography variant="body2">
              Main Market: {cluster.main_market}<br/>
              Efficiency: {(cluster.efficiency * 100).toFixed(1)}%<br/>
              Markets: {cluster.markets.length}
            </Typography>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

ClusterMap.propTypes = {
  clusters: PropTypes.arrayOf(PropTypes.shape({
    cluster_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    main_market: PropTypes.string.isRequired,
    markets: PropTypes.arrayOf(PropTypes.string),
    connected_markets: PropTypes.arrayOf(PropTypes.string),
    center_coordinates: PropTypes.arrayOf(PropTypes.number),
    metrics: PropTypes.shape({
      efficiency: PropTypes.number
    })
  })).isRequired,
  selectedClusterId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClusterSelect: PropTypes.func.isRequired,
  geometry: PropTypes.object
};

export default React.memo(ClusterMap);