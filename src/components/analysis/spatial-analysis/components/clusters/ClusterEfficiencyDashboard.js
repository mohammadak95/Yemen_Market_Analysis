//src/components/analysis/spatial-analysis/components/clusters/ClusterEfficiencyDashboard.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Tooltip,
  IconButton,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, Polyline } from 'react-leaflet';
import chroma from 'chroma-js';
import MetricCard from '../common/MetricCard';
import useClusterAnalysis from '../../hooks/useClusterAnalysis';
import useClusterEfficiency from '../../hooks/useClusterEfficiency';
import ClusterComparisonTable from './ClusterComparisonTable';
import { getRegionCoordinates, transformRegionName } from '../../utils/spatialUtils';

const ClusterEfficiencyDashboard = ({ 
  clusters, 
  flowMaps, 
  geometryData,
  selectedClusterId,
  comparisonClusterId,
  onClusterSelect,
  metrics: externalMetrics 
}) => {
  // Process data using both hooks for comprehensive analysis
  const { clusters: processedClusters, metrics: analysisMetrics } = useClusterAnalysis(
    clusters,
    flowMaps,
    geometryData
  );

  const { clusters: efficiencyClusters, metrics: efficiencyMetrics } = useClusterEfficiency(
    clusters,
    flowMaps
  );

  // Combined metrics with external metrics or calculated ones
  const combinedMetrics = useMemo(() => ({
    ...externalMetrics,
    averageEfficiency: externalMetrics?.averageEfficiency ?? 
      ((analysisMetrics.averageEfficiency + efficiencyMetrics.averageEfficiency) / 2),
    totalCoverage: externalMetrics?.totalCoverage ?? 
      Math.max(analysisMetrics.totalCoverage, efficiencyMetrics.totalCoverage),
    networkDensity: externalMetrics?.networkDensity ?? 
      analysisMetrics.networkDensity,
    clusterCount: externalMetrics?.clusterCount ?? 
      processedClusters.length
  }), [externalMetrics, analysisMetrics, efficiencyMetrics, processedClusters]);

  // Create enhanced clusters with proper coordinates
  const enhancedClusters = useMemo(() => {
    return processedClusters.map(cluster => {
      const marketCoordinates = (cluster.markets || []).map(market => {
        const coords = getRegionCoordinates(market.name || market);
        return {
          name: typeof market === 'string' ? market : market.name,
          coordinates: coords || [0, 0],
          isMainMarket: (market.name || market) === cluster.main_market
        };
      });

      // Calculate cluster center from valid coordinates
      const validCoords = marketCoordinates.filter(m => m.coordinates[0] !== 0);
      const center = validCoords.length > 0 ? [
        validCoords.reduce((sum, m) => sum + m.coordinates[1], 0) / validCoords.length,
        validCoords.reduce((sum, m) => sum + m.coordinates[0], 0) / validCoords.length
      ] : [15.3694, 44.191]; // Default center if no valid coordinates

      return {
        ...cluster,
        marketCoordinates,
        center,
        color: chroma.scale(['#fee8c8', '#e34a33'])(cluster.metrics?.efficiency || 0).hex()
      };
    });
  }, [processedClusters]);

  // Create GeoJSON data with cluster information
  const clusterGeoJSON = useMemo(() => {
    if (!geometryData?.features) return null;

    return {
      type: 'FeatureCollection',
      features: geometryData.features.map(feature => {
        const normalizedRegionId = transformRegionName(feature.properties?.region_id);
        const cluster = enhancedClusters.find(c => 
          c.marketCoordinates.some(m => 
            transformRegionName(m.name) === normalizedRegionId
          )
        );

        return {
          ...feature,
          properties: {
            ...feature.properties,
            cluster_id: cluster?.cluster_id,
            efficiency: cluster?.metrics?.efficiency,
            color: cluster?.color,
            mainMarket: cluster?.main_market
          }
        };
      })
    };
  }, [geometryData, enhancedClusters]);

  // Render loading state
  if (!clusters || !flowMaps) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No market clusters or flow data available for analysis.
      </Alert>
    );
  }

  // Helper function for styling GeoJSON features
  const getFeatureStyle = (feature) => ({
    fillColor: feature.properties.color || '#cccccc',
    weight: feature.properties.cluster_id === selectedClusterId ? 2 : 1,
    opacity: 1,
    color: feature.properties.cluster_id === selectedClusterId ? '#2196f3' : 'white',
    fillOpacity: feature.properties.cluster_id === selectedClusterId ? 0.8 : 0.6
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom>
            Market Cluster Analysis
            <Tooltip title="Analyze market cluster efficiency and connectivity">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Metrics Overview */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Total Clusters"
                value={combinedMetrics.clusterCount}
                format="number"
                description="Number of distinct market clusters"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Average Efficiency"
                value={combinedMetrics.averageEfficiency}
                format="percentage"
                description="Mean efficiency score across clusters"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Coverage"
                value={combinedMetrics.totalCoverage}
                format="percentage"
                description="Percentage of markets in clusters"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Network Density"
                value={combinedMetrics.networkDensity}
                format="percentage"
                description="Inter-cluster connection density"
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Map and Details */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '600px' }}>
            <CardContent sx={{ height: '100%', p: '0 !important' }}>
              <MapContainer
                center={[15.3694, 44.191]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />

                {/* Render region polygons */}
                {clusterGeoJSON && (
                  <GeoJSON
                    data={clusterGeoJSON}
                    style={getFeatureStyle}
                    onEachFeature={(feature, layer) => {
                      if (feature.properties.cluster_id) {
                        layer.on({
                          click: () => onClusterSelect?.(feature.properties.cluster_id)
                        });
                        layer.bindTooltip(`
                          <div>
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
                )}

                {/* Render market points and connections */}
                {enhancedClusters.map(cluster => (
                  <React.Fragment key={cluster.cluster_id}>
                    {/* Market points */}
                    {cluster.marketCoordinates.map((market, idx) => (
                      <CircleMarker
                        key={`${cluster.cluster_id}-${idx}`}
                        center={[market.coordinates[1], market.coordinates[0]]}
                        radius={market.isMainMarket ? 7 : 5}
                        pathOptions={{
                          fillColor: cluster.color,
                          color: cluster.cluster_id === selectedClusterId ? '#2196f3' : 'white',
                          weight: market.isMainMarket ? 2 : 1,
                          opacity: 0.8,
                          fillOpacity: 0.6
                        }}
                      >
                        <Popup>
                          <Typography variant="subtitle2">
                            {market.name}
                          </Typography>
                          <Typography variant="body2">
                            {market.isMainMarket ? 'Main Market' : 'Connected Market'}<br/>
                            Cluster: {cluster.main_market}<br/>
                            Efficiency: {(cluster.metrics?.efficiency * 100).toFixed(1)}%
                          </Typography>
                        </Popup>
                      </CircleMarker>
                    ))}

                    {/* Flow lines */}
                    {cluster.marketCoordinates.map((source, idx) => 
                      cluster.marketCoordinates.slice(idx + 1).map((target, tidx) => (
                        <Polyline
                          key={`${cluster.cluster_id}-${idx}-${tidx}`}
                          positions={[
                            [source.coordinates[1], source.coordinates[0]],
                            [target.coordinates[1], target.coordinates[0]]
                          ]}
                          pathOptions={{
                            color: cluster.color,
                            weight: 1,
                            opacity: cluster.cluster_id === selectedClusterId ? 0.6 : 0.3,
                            dashArray: source.isMainMarket || target.isMainMarket ? '' : '5, 5'
                          }}
                        />
                      ))
                    )}
                  </React.Fragment>
                ))}
              </MapContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cluster Details */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '600px', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cluster Details
              </Typography>
              {enhancedClusters.map(cluster => (
                <Box
                  key={cluster.cluster_id}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'background.default',
                    border: theme => 
                      cluster.cluster_id === selectedClusterId 
                        ? `2px solid ${theme.palette.primary.main}`
                        : '1px solid transparent',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => onClusterSelect?.(cluster.cluster_id)}
                >
                  <Typography variant="subtitle1">
                    Cluster {cluster.cluster_id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Main Market: {cluster.main_market}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Efficiency
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(cluster.metrics?.efficiency || 0) * 100}
                      sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    />

                    <Typography variant="body2" color="text.secondary">
                      Connectivity
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(cluster.metrics?.internal_connectivity || 0) * 100}
                      sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    />

                    <Typography variant="body2" color="text.secondary">
                      Price Convergence
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(cluster.metrics?.price_convergence || 0) * 100}
                      sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Markets ({cluster.marketCoordinates.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {cluster.marketCoordinates.map((market, idx) => (
                      <Typography
                        key={idx}
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          bgcolor: 'action.selected',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          color: market.isMainMarket ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {market.name}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Comparison Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cluster Comparison
              </Typography>
              <ClusterComparisonTable 
                clusters={enhancedClusters}
                selectedClusterId={selectedClusterId}
                onClusterSelect={onClusterSelect}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

ClusterEfficiencyDashboard.propTypes = {
  clusters: PropTypes.array,
  flowMaps: PropTypes.array,
  geometryData: PropTypes.object,
  selectedClusterId: PropTypes.string,
  comparisonClusterId: PropTypes.string,
  onClusterSelect: PropTypes.func,
  metrics: PropTypes.shape({
    averageEfficiency: PropTypes.number,
    totalCoverage: PropTypes.number,
    networkDensity: PropTypes.number,
    clusterCount: PropTypes.number
  })
};

export default React.memo(ClusterEfficiencyDashboard);