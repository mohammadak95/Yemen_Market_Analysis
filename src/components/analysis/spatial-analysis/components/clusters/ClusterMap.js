//src/components/analysis/spatial-analysis/components/clusters/ClusterMap.js

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Tooltip, useMap, Polyline } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { Typography, Box, Paper } from '@mui/material';
import chroma from 'chroma-js';
import { getRegionCoordinates, transformRegionName } from '../../utils/spatialUtils';

const ClusterMap = ({ 
  clusters = [], 
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

  // Process cluster data with coordinates
  const processedClusters = useMemo(() => {
    if (!clusters?.length) return [];

    return clusters.map(cluster => {
      const marketList = cluster.markets || cluster.connected_markets || [];
      const marketCoords = marketList.map(market => {
        const name = typeof market === 'string' ? market : market.name;
        const coords = getRegionCoordinates(name);
        return {
          name: transformRegionName(name),
          originalName: name,
          coordinates: coords || [0, 0],
          isMainMarket: name === cluster.main_market
        };
      });

      // Calculate center
      const validCoords = marketCoords.filter(m => m.coordinates[0] !== 0);
      const center = validCoords.length ? [
        validCoords.reduce((sum, m) => sum + m.coordinates[0], 0) / validCoords.length,
        validCoords.reduce((sum, m) => sum + m.coordinates[1], 0) / validCoords.length
      ] : [44.191, 15.3694];

      return {
        ...cluster,
        marketCoords,
        center,
        color: colorScale(cluster.metrics?.efficiency || 0).hex()
      };
    });
  }, [clusters, colorScale]);

  // Create GeoJSON with cluster information
  const clusterGeoJSON = useMemo(() => {
    if (!geometry?.features) return null;

    return {
      type: 'FeatureCollection',
      features: geometry.features.map(feature => {
        const normalizedName = transformRegionName(feature.properties.region_id);
        const cluster = processedClusters.find(c => 
          c.marketCoords.some(m => m.name === normalizedName)
        );

        return {
          ...feature,
          properties: {
            ...feature.properties,
            cluster_id: cluster?.cluster_id,
            efficiency: cluster?.metrics?.efficiency || 0,
            color: cluster?.color,
            mainMarket: cluster?.main_market
          }
        };
      })
    };
  }, [geometry, processedClusters]);

  // Style function for regions
  const getFeatureStyle = useCallback((feature) => {
    const isSelected = feature.properties.cluster_id === selectedClusterId;
    
    return {
      fillColor: feature.properties.color || theme.palette.grey[300],
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.secondary.main : 'white',
      fillOpacity: isSelected ? 0.8 : 0.6
    };
  }, [selectedClusterId, theme]);

  // Map bounds control
  const MapBoundsControl = () => {
    const map = useMap();

    React.useEffect(() => {
      if (geometry?.features?.length) {
        const bounds = L.geoJSON(geometry).getBounds();
        map.fitBounds(bounds);
      }
    }, [map]);

    return null;
  };

  if (!processedClusters.length || !clusterGeoJSON) {
    return (
      <Box 
        sx={{ 
          height: '100%', 
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
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <MapBoundsControl />

      {/* Region polygons */}
      <GeoJSON
        data={clusterGeoJSON}
        style={getFeatureStyle}
        onEachFeature={(feature, layer) => {
          if (feature.properties.cluster_id) {
            layer.on({
              click: () => onClusterSelect(feature.properties.cluster_id)
            });

            layer.bindTooltip(() => `
              <div style="min-width: 150px;">
                <strong>${feature.properties.originalName}</strong><br/>
                Cluster: ${feature.properties.mainMarket}<br/>
                Efficiency: ${(feature.properties.efficiency * 100).toFixed(1)}%
              </div>
            `, {
              sticky: true,
              direction: 'top'
            });
          }
        }}
      />

      {/* Market points and connections */}
      {processedClusters.map(cluster => (
        <React.Fragment key={cluster.cluster_id}>
          {/* Market points */}
          {cluster.marketCoords.map((market, idx) => (
            <CircleMarker
              key={`${cluster.cluster_id}-${idx}`}
              center={[market.coordinates[1], market.coordinates[0]]}
              radius={market.isMainMarket ? 8 : 5}
              pathOptions={{
                fillColor: cluster.color,
                color: selectedClusterId === cluster.cluster_id ? 
                  theme.palette.secondary.main : 'white',
                weight: market.isMainMarket ? 2 : 1,
                opacity: 0.8,
                fillOpacity: 0.6
              }}
              eventHandlers={{
                click: () => onClusterSelect(cluster.cluster_id)
              }}
            >
              <Tooltip>
                <Typography variant="subtitle2">
                  {market.originalName}
                </Typography>
                <Typography variant="body2">
                  {market.isMainMarket ? 'Main Market' : 'Connected Market'}<br/>
                  Cluster: {cluster.main_market}<br/>
                  Efficiency: {(cluster.metrics?.efficiency * 100).toFixed(1)}%
                </Typography>
              </Tooltip>
            </CircleMarker>
          ))}

          {/* Flow lines */}
          {cluster.marketCoords.map((source, idx) => 
            cluster.marketCoords.slice(idx + 1).map((target, tidx) => (
              <Polyline
                key={`${cluster.cluster_id}-${idx}-${tidx}`}
                positions={[
                  [source.coordinates[1], source.coordinates[0]],
                  [target.coordinates[1], target.coordinates[0]]
                ]}
                pathOptions={{
                  color: cluster.color,
                  weight: 1,
                  opacity: selectedClusterId === cluster.cluster_id ? 0.6 : 0.3,
                  dashArray: source.isMainMarket || target.isMainMarket ? '' : '5, 5'
                }}
              />
            ))
          )}
        </React.Fragment>
      ))}
    </MapContainer>
  );
};

ClusterMap.propTypes = {
  clusters: PropTypes.arrayOf(PropTypes.shape({
    cluster_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    main_market: PropTypes.string.isRequired,
    markets: PropTypes.arrayOf(PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        name: PropTypes.string.isRequired
      })
    ])),
    connected_markets: PropTypes.arrayOf(PropTypes.string),
    metrics: PropTypes.shape({
      efficiency: PropTypes.number
    })
  })).isRequired,
  selectedClusterId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClusterSelect: PropTypes.func.isRequired,
  geometry: PropTypes.object
};

export default React.memo(ClusterMap);