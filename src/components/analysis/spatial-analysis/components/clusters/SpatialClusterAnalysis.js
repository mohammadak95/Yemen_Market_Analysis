// src/components/analysis/spatial-analysis/components/clusters/SpatialClusterAnalysis.js

import React, { useMemo } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from '@mui/material';
import { ResponsiveContainer, Treemap } from 'recharts';
import { useTheme } from '@mui/material/styles';
import { scaleQuantize } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic';
import InfoIcon from '@mui/icons-material/Info';
import ClusterMap from './ClusterMap';
import ClusterMetricsPanel from './ClusterMetricsPanel';
import { calculateDistance } from '../../utils/spatialAnalysis';

const SpatialClusterAnalysis = ({ 
  spatialData, 
  marketClusters, 
  geometry 
}) => {
  const theme = useTheme();

  const clusterMetrics = useMemo(() => {
    if (!marketClusters?.length) return null;

    return marketClusters.map(cluster => ({
      id: cluster.cluster_id,
      mainMarket: cluster.main_market,
      marketCount: cluster.connected_markets.length,
      totalFlow: calculateTotalFlow(cluster, spatialData.flowMaps),
      avgPriceCorrelation: calculateAvgCorrelation(
        cluster, 
        spatialData.marketIntegration
      ),
      priceDispersion: calculatePriceDispersion(
        cluster, 
        spatialData.timeSeriesData
      ),
      efficiency: calculateClusterEfficiency(cluster, spatialData),
      conflictImpact: calculateConflictImpact(cluster, spatialData.timeSeriesData)
    }));
  }, [marketClusters, spatialData]);

  const treeMapData = useMemo(() => {
    if (!clusterMetrics) return [];

    return {
      name: 'Market Clusters',
      children: clusterMetrics.map(metric => ({
        name: `Cluster ${metric.id}`,
        size: metric.marketCount,
        efficiency: metric.efficiency,
        value: metric.totalFlow,
        mainMarket: metric.mainMarket,
        correlation: metric.avgPriceCorrelation,
        dispersion: metric.priceDispersion,
        conflictImpact: metric.conflictImpact
      }))
    };
  }, [clusterMetrics]);

  const colorScale = scaleQuantize()
    .domain([0, 1])
    .range([0, 1, 2, 3, 4].map(i => interpolateViridis(i / 4)));

  const clusterComparison = useMemo(() => {
    if (!marketClusters?.length) return [];
    return generateClusterComparison(marketClusters, spatialData, geometry);
  }, [marketClusters, spatialData, geometry]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Spatial Market Clusters Analysis
            <Tooltip title="Analysis of market groupings based on price patterns, trade flows, and spatial relationships">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {interpretClusterStructure(clusterMetrics)}
          </Typography>
        </Paper>
      </Grid>

      {/* Cluster Map */}
      <Grid item xs={12} md={8}>
        <ClusterMap
          clusters={marketClusters}
          metrics={clusterMetrics}
          geometry={geometry}
          colorScale={colorScale}
        />
      </Grid>

      {/* Cluster Metrics */}
      <Grid item xs={12} md={4}>
        <ClusterMetricsPanel metrics={clusterMetrics} />
      </Grid>

      {/* Cluster Treemap */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Market Cluster Structure
            <Tooltip title="Size represents market count, color represents efficiency">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer>
              <Treemap
                data={treeMapData.children}
                dataKey="value"
                ratio={4/3}
                stroke="#fff"
                fill={theme.palette.primary.main}
                content={
                  <CustomizedContent 
                    colorScale={colorScale} 
                    theme={theme}
                  />
                }
              >
                <Tooltip content={<ClusterTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

      {/* Cluster Comparison Matrix */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Cluster Comparison Matrix
            <Tooltip title="Pairwise comparison of market clusters showing relationships and interactions">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Clusters</TableCell>
                  <TableCell align="right">Price Correlation</TableCell>
                  <TableCell align="right">Flow Connection</TableCell>
                  <TableCell align="right">Spatial Distance</TableCell>
                  <TableCell>Integration Level</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clusterComparison.map((comparison, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {`${comparison.cluster1} ↔ ${comparison.cluster2}`}
                    </TableCell>
                    <TableCell align="right">
                      {(comparison.priceCorrelation * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {(comparison.flowConnection * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {comparison.spatialDistance.toFixed(0)} km
                    </TableCell>
                    <TableCell>
                      {getIntegrationLevel(comparison)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );
};

// Utility functions for cluster analysis
const calculateTotalFlow = (cluster, flowMaps) => {
  if (!flowMaps?.length) return 0;
  
  return flowMaps
    .filter(flow => 
      cluster.connected_markets.includes(flow.source) &&
      cluster.connected_markets.includes(flow.target)
    )
    .reduce((sum, flow) => sum + flow.totalFlow, 0);
};

const calculateAvgCorrelation = (cluster, marketIntegration) => {
  if (!marketIntegration?.price_correlation) return 0;
  
  const correlations = [];
  cluster.connected_markets.forEach(market1 => {
    cluster.connected_markets.forEach(market2 => {
      if (market1 !== market2) {
        const correlation = marketIntegration.price_correlation[market1]?.[market2];
        if (correlation !== undefined) {
          correlations.push(correlation);
        }
      }
    });
  });

  return correlations.length > 0 
    ? correlations.reduce((sum, val) => sum + val, 0) / correlations.length 
    : 0;
};

const calculatePriceDispersion = (cluster, timeSeriesData) => {
  if (!timeSeriesData?.length) return 0;
  
  const clusterPrices = timeSeriesData.filter(d => 
    cluster.connected_markets.includes(d.region)
  );

  if (!clusterPrices.length) return 0;

  const prices = clusterPrices.map(d => d.avgUsdPrice);
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => 
    sum + Math.pow(price - mean, 2), 0
  ) / prices.length;

  return Math.sqrt(variance) / mean;
};

const calculateConflictImpact = (cluster, timeSeriesData) => {
  if (!timeSeriesData?.length) return 0;

  const clusterData = timeSeriesData.filter(d => 
    cluster.connected_markets.includes(d.region)
  );

  if (!clusterData.length) return 0;

  const correlations = clusterData.map(d => {
    const prices = d.avgUsdPrice;
    const conflict = d.conflict_intensity;
    return calculateCorrelation(prices, conflict);
  });

  return correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;
};

const calculateCorrelation = (array1, array2) => {
  const mean1 = array1.reduce((sum, val) => sum + val, 0) / array1.length;
  const mean2 = array2.reduce((sum, val) => sum + val, 0) / array2.length;
  
  const variance1 = array1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0);
  const variance2 = array2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0);
  
  const covariance = array1.reduce((sum, val, i) => 
    sum + (val - mean1) * (array2[i] - mean2), 0
  );
  
  return covariance / Math.sqrt(variance1 * variance2);
};

const calculateClusterEfficiency = (cluster, spatialData) => {
  const correlation = calculateAvgCorrelation(
    cluster, 
    spatialData.marketIntegration
  );
  const dispersion = calculatePriceDispersion(
    cluster, 
    spatialData.timeSeriesData
  );
  const flow = calculateTotalFlow(cluster, spatialData.flowMaps);
  const conflictImpact = calculateConflictImpact(
    cluster,
    spatialData.timeSeriesData
  );
  
  // Normalize flow value
  const maxFlow = Math.max(...spatialData.flowMaps.map(f => f.totalFlow));
  const normalizedFlow = flow / maxFlow;

  // Weighted average of metrics
  return (
    correlation * 0.35 +
    (1 - dispersion) * 0.25 +
    normalizedFlow * 0.25 +
    (1 - Math.abs(conflictImpact)) * 0.15
  );
};

const generateClusterComparison = (clusters, spatialData, geometry) => {
  const comparison = [];
  
  clusters.forEach((cluster1, i) => {
    clusters.slice(i + 1).forEach(cluster2 => {
      const priceCorrelation = calculateInterClusterCorrelation(
        cluster1,
        cluster2,
        spatialData.marketIntegration
      );
      
      const flowConnection = calculateInterClusterFlow(
        cluster1,
        cluster2,
        spatialData.flowMaps
      );
      
      const spatialDistance = calculateClusterDistance(
        cluster1,
        cluster2,
        geometry
      );

      comparison.push({
        cluster1: cluster1.main_market,
        cluster2: cluster2.main_market,
        priceCorrelation,
        flowConnection,
        spatialDistance
      });
    });
  });

  return comparison;
};

const calculateInterClusterCorrelation = (cluster1, cluster2, marketIntegration) => {
  if (!marketIntegration?.price_correlation) return 0;
  
  let correlations = [];
  cluster1.connected_markets.forEach(market1 => {
    cluster2.connected_markets.forEach(market2 => {
      const correlation = marketIntegration.price_correlation[market1]?.[market2];
      if (correlation !== undefined) {
        correlations.push(correlation);
      }
    });
  });

  return correlations.length > 0 
    ? correlations.reduce((sum, val) => sum + val, 0) / correlations.length 
    : 0;
};

const calculateInterClusterFlow = (cluster1, cluster2, flowMaps) => {
  if (!flowMaps?.length) return 0;
  
  const interClusterFlows = flowMaps.filter(flow => 
    (cluster1.connected_markets.includes(flow.source) && 
     cluster2.connected_markets.includes(flow.target)) ||
    (cluster2.connected_markets.includes(flow.source) && 
     cluster1.connected_markets.includes(flow.target))
  );

  const totalFlow = interClusterFlows.reduce((sum, flow) => 
    sum + flow.totalFlow, 0
  );

  const maxFlow = Math.max(...flowMaps.map(f => f.totalFlow));
  return maxFlow > 0 ? totalFlow / maxFlow : 0;
};

const calculateClusterDistance = (cluster1, cluster2, geometry) => {
  const getClusterCenter = (cluster) => {
    const markets = cluster.connected_markets;
    const points = markets.map(market => {
      const feature = geometry.features.find(f => 
        f.properties.normalizedName === market
      );
      return feature ? feature.geometry.coordinates : null;
    }).filter(Boolean);

    return points.length > 0 ? {
      lat: points.reduce((sum, p) => sum + p[1], 0) / points.length,
      lon: points.reduce((sum, p) => sum + p[0], 0) / points.length
    } : null;
  };

  const center1 = getClusterCenter(cluster1);
  const center2 = getClusterCenter(cluster2);

  if (!center1 || !center2) return Infinity;

  return calculateDistance(
    { coordinates: [center1.lon, center1.lat] },
    { coordinates: [center2.lon, center2.lat] }
  );
};

const getIntegrationLevel = (comparison) => {
  const score = (
    comparison.priceCorrelation * 0.4 +
    comparison.flowConnection * 0.4 +
    (1 - comparison.spatialDistance / 1000) * 0.2
  );

  if (score > 0.7) return 'Strong';
  if (score > 0.4) return 'Moderate';
  return 'Weak';
};

const interpretClusterStructure = (metrics) => {
  if (!metrics?.length) return '';

  const avgEfficiency = metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length;
  const highEfficiency = metrics.filter(m => m.efficiency > 0.7).length;
  const lowEfficiency = metrics.filter(m => m.efficiency < 0.4).length;

  if (avgEfficiency > 0.7) {
    return `Strong market integration with ${highEfficiency} highly efficient clusters showing robust price transmission and trade flows.`;
  } else if (avgEfficiency > 0.4) {
    return `Moderate market integration with mixed efficiency levels. ${highEfficiency} high-performing clusters and ${lowEfficiency} clusters showing integration challenges.`;
  } else {
    return `Limited market integration with ${lowEfficiency} clusters showing significant barriers to price transmission and trade flows.`;
  }
};

export default SpatialClusterAnalysis;
