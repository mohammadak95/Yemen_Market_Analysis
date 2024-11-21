// src/components/analysis/spatial-analysis/components/clusters/ClusterMap.js

import React, { useMemo, useState } from 'react';
import { 
  Card, CardContent, Typography, Grid, Box,
  Table, TableBody, TableCell, TableHead, TableRow,
  Tooltip, IconButton, 
  Tabs, Tab
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';

export const ClusterMap = ({ 
  clusters, 
  selectedCluster, 
  onClusterSelect, 
  geometry 
}) => {
  const theme = useTheme();
  
  const colorScale = useMemo(() => 
    scaleLinear()
      .domain([0, 1])
      .range([theme.palette.primary.light, theme.palette.primary.dark])
  , [theme]);

  const getStyle = (feature) => {
    const cluster = clusters.find(c => 
      c.connected_markets.includes(feature.properties.region_id)
    );
    
    if (!cluster) return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
    
    return {
      fillColor: colorScale(cluster.efficiency_metrics.efficiency_score),
      weight: selectedCluster === cluster.cluster_id ? 2 : 1,
      opacity: 1,
      color: selectedCluster === cluster.cluster_id ? 
        theme.palette.secondary.main : 'white',
      fillOpacity: selectedCluster === cluster.cluster_id ? 0.8 : 0.6
    };
  };

  return (
    <MapContainer
      center={[15.3694, 44.191]}
      zoom={6}
      className="h-96 w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {geometry && (
        <GeoJSON
          data={geometry}
          style={getStyle}
          onEachFeature={(feature, layer) => {
            const cluster = clusters.find(c => 
              c.connected_markets.includes(feature.properties.region_id)
            );
            
            if (cluster) {
              layer.on({
                click: () => onClusterSelect(cluster.cluster_id)
              });

              layer.bindTooltip(`
                <strong>${feature.properties.region_id}</strong><br/>
                Cluster: ${cluster.main_market}<br/>
                Efficiency: ${cluster.efficiency_metrics.efficiency_score.toFixed(2)}<br/>
                Markets: ${cluster.market_count}
              `);
            }
          }}
        />
      )}
    </MapContainer>
  );
};