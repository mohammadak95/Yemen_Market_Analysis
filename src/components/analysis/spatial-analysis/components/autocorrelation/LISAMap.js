// src/components/analysis/spatial-analysis/components/autocorrelation/LISAMap.js

import React, { useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import {
  Box,
  Paper,
  Typography,
  Tooltip as MuiTooltip,
  IconButton,
  Grid,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import chroma from 'chroma-js';

const LISAMap = React.memo(({ localMorans, geometry }) => {
  // Generate dynamic color scale using chroma.js
  const colorScale = useMemo(
    () =>
      chroma
        .scale(['#4575b4', '#ffffbf', '#d73027'])
        .domain([-1, 0, 1]),
    []
  );

  const clusterColors = useMemo(
    () => ({
      'high-high': colorScale(1).hex(),
      'low-low': colorScale(-1).hex(),
      'high-low': colorScale(0.5).hex(),
      'low-high': colorScale(-0.5).hex(),
      'not-significant': '#dddddd',
    }),
    [colorScale]
  );

  const { styleFunction, legendItems, statistics } = useMemo(() => {
    const getStyle = (feature) => {
      const regionId = feature.properties.normalizedName;
      const result = localMorans[regionId];

      if (!result) {
        return {
          fillColor: clusterColors['not-significant'],
          weight: 1,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.7,
        };
      }

      return {
        fillColor:
          clusterColors[result.cluster_type] || clusterColors['not-significant'],
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: result.p_value < 0.05 ? 0.8 : 0.4,
      };
    };

    // Calculate cluster statistics
    const stats = Object.values(localMorans).reduce(
      (acc, result) => {
        if (result.p_value < 0.05) {
          acc.significant++;
          acc.clusters[result.cluster_type] =
            (acc.clusters[result.cluster_type] || 0) + 1;
        }
        return acc;
      },
      { significant: 0, clusters: {} }
    );

    const legend = [
      {
        label: 'High-High Cluster',
        color: clusterColors['high-high'],
        description: 'Markets with high prices surrounded by high prices',
        count: stats.clusters['high-high'] || 0,
      },
      {
        label: 'Low-Low Cluster',
        color: clusterColors['low-low'],
        description: 'Markets with low prices surrounded by low prices',
        count: stats.clusters['low-low'] || 0,
      },
      {
        label: 'High-Low Outlier',
        color: clusterColors['high-low'],
        description: 'High price market surrounded by low prices',
        count: stats.clusters['high-low'] || 0,
      },
      {
        label: 'Low-High Outlier',
        color: clusterColors['low-high'],
        description: 'Low price market surrounded by high prices',
        count: stats.clusters['low-high'] || 0,
      },
      {
        label: 'Not Significant',
        color: clusterColors['not-significant'],
        description: 'No significant spatial autocorrelation',
        count: Object.keys(localMorans).length - stats.significant,
      },
    ];

    return {
      styleFunction: getStyle,
      legendItems: legend,
      statistics: stats,
    };
  }, [localMorans, clusterColors]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const regionId = feature.properties.normalizedName;
      const result = localMorans[regionId];

      if (result) {
        layer.bindTooltip(
          `
          <div style="font-family: Arial, sans-serif;">
            <strong>${feature.properties.originalName}</strong><br/>
            <strong>Pattern:</strong> ${formatClusterType(
              result.cluster_type
            )}<br/>
            <strong>Local Moran's I:</strong> ${result.local_i.toFixed(
              3
            )}<br/>
            <strong>p-value:</strong> ${result.p_value.toFixed(3)}<br/>
            ${
              result.p_value < 0.05
                ? '<strong style="color: #2196f3;">Statistically Significant</strong>'
                : ''
            }
          </div>
        `,
          {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip',
          }
        );
      }
    },
    [localMorans]
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Local Indicators of Spatial Association (LISA)
            <MuiTooltip title="Identifies statistically significant spatial clusters and outliers">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ height: 500, position: 'relative' }}>
            <MapContainer
              center={[15.3694, 44.191]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {geometry && (
                <GeoJSON
                  data={geometry}
                  style={styleFunction}
                  onEachFeature={onEachFeature}
                />
              )}
            </MapContainer>

            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'white',
                padding: 2,
                borderRadius: 1,
                boxShadow: 1,
                maxWidth: 300,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Spatial Patterns
              </Typography>
              {legendItems.map((item, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: item.color,
                      mr: 1,
                      border: '1px solid rgba(0,0,0,0.1)',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">
                      {item.label} ({item.count})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary">
            {interpretClusters(statistics)}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
});

const formatClusterType = (type) => {
  switch (type) {
    case 'high-high':
      return 'High-Price Cluster';
    case 'low-low':
      return 'Low-Price Cluster';
    case 'high-low':
      return 'High-Price Outlier';
    case 'low-high':
      return 'Low-Price Outlier';
    case 'not-significant':
      return 'Not Significant';
    default:
      return type;
  }
};

const interpretClusters = (stats) => {
  const { clusters } = stats;
  const hotspots = clusters['high-high'] || 0;
  const coldspots = clusters['low-low'] || 0;
  const outliers = (clusters['high-low'] || 0) + (clusters['low-high'] || 0);

  if (hotspots > coldspots && hotspots > outliers) {
    return `The map shows predominant high-price clusters (${hotspots} markets), indicating potential supply constraints or high demand areas.`;
  } else if (coldspots > hotspots && coldspots > outliers) {
    return `Low-price clusters dominate (${coldspots} markets), suggesting areas of efficient market integration or lower demand.`;
  } else if (outliers > hotspots && outliers > coldspots) {
    return `The presence of ${outliers} spatial outliers indicates market fragmentation and potential barriers to price transmission.`;
  } else {
    return `Mixed spatial patterns suggest complex market dynamics with ${hotspots} high-price clusters, ${coldspots} low-price clusters, and ${outliers} outliers.`;
  }
};

export default LISAMap;
