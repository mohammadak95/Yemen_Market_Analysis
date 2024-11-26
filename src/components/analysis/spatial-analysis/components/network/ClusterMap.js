// src/components/analysis/spatial-analysis/components/network/ClusterMap.js

import React, { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, GeoJSON, Popup, CircleMarker } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { selectGeometryData, selectMarketClusters } from '../../../../../selectors/optimizedSelectors';

const DEBUG = process.env.NODE_ENV === 'development';

const ClusterMap = () => {
  const theme = useTheme();
  const geometry = useSelector(selectGeometryData);
  const marketClusters = useSelector(selectMarketClusters);

  if (DEBUG) {
    console.group('ClusterMap Render');
    console.log('Geometry Data:', geometry);
    console.log('Market Clusters:', marketClusters);
  }

  // Generate cluster colors
  const clusterColors = useMemo(() => {
    if (!marketClusters?.length) return {};
    
    return marketClusters.reduce((acc, cluster, index) => {
      acc[cluster.cluster_id] = `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
      return acc;
    }, {});
  }, [marketClusters]);

  if (DEBUG) {
    console.log('Generated Cluster Colors:', clusterColors);
  }

  // Map region IDs to cluster IDs
  const regionClusterMap = useMemo(() => {
    if (!marketClusters?.length) return {};
    
    return marketClusters.reduce((acc, cluster) => {
      cluster.connected_markets.forEach(market => {
        acc[market.toLowerCase()] = cluster.cluster_id;
      });
      return acc;
    }, {});
  }, [marketClusters]);

  if (DEBUG) {
    console.log('Region to Cluster Mapping:', regionClusterMap);
  }

  // Style function for GeoJSON features
  const getRegionStyle = useCallback((feature) => {
    const regionId = feature.properties.region_id.toLowerCase();
    const clusterId = regionClusterMap[regionId];
    
    if (DEBUG) {
      console.log(`Styling region ${regionId}:`, {
        clusterId,
        color: clusterColors[clusterId]
      });
    }

    return {
      fillColor: clusterId ? clusterColors[clusterId] : theme.palette.grey[300],
      weight: 1,
      opacity: 1,
      color: theme.palette.common.white,
      fillOpacity: 0.7,
    };
  }, [regionClusterMap, clusterColors, theme]);

  // Handle region click
  const onEachFeature = useCallback((feature, layer) => {
    const regionId = feature.properties.region_id.toLowerCase();
    const clusterId = regionClusterMap[regionId];
    const cluster = marketClusters.find(c => c.cluster_id === clusterId);

    layer.bindPopup(() => {
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="min-width: 200px">
          <h4 style="margin: 0 0 8px">Region: ${feature.properties.region_id}</h4>
          ${cluster ? `
            <p style="margin: 4px 0">Cluster: ${cluster.cluster_id}</p>
            <p style="margin: 4px 0">Main Market: ${cluster.main_market}</p>
            <p style="margin: 4px 0">Connected Markets: ${cluster.market_count}</p>
          ` : 'Not part of any cluster'}
        </div>
      `;
      return content;
    });
  }, [regionClusterMap, marketClusters]);

  if (DEBUG) {
    console.groupEnd();
  }

  if (!geometry?.unified || !marketClusters?.length) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Market Clusters Distribution
      </Typography>
      
      <Box sx={{ height: 500, position: 'relative' }}>
        <MapContainer 
          center={[15.3694, 44.191]} // Yemen's approximate center
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {/* Render region polygons */}
          <GeoJSON
            data={geometry.unified}
            style={getRegionStyle}
            onEachFeature={onEachFeature}
          />

          {/* Render main market indicators */}
          {marketClusters.map(cluster => {
            const point = geometry.points?.find(p => 
              p.properties.normalizedName === cluster.main_market.toLowerCase()
            );
            
            if (!point?.coordinates) return null;

            return (
              <CircleMarker
                key={cluster.cluster_id}
                center={[point.coordinates[1], point.coordinates[0]]}
                radius={8}
                fillColor={clusterColors[cluster.cluster_id]}
                color={theme.palette.common.white}
                weight={2}
                opacity={1}
                fillOpacity={0.9}
              >
                <Popup>
                  <div>
                    <strong>Main Market: {cluster.main_market}</strong>
                    <br />
                    Cluster {cluster.cluster_id}
                    <br />
                    Connected Markets: {cluster.market_count}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: 1,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Clusters
          </Typography>
          {marketClusters.map(cluster => (
            <Box key={cluster.cluster_id} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  backgroundColor: clusterColors[cluster.cluster_id],
                  mr: 1,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2">
                Cluster {cluster.cluster_id} ({cluster.market_count} markets)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default ClusterMap;