import React, { useMemo } from 'react';
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
  LinearProgress
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import chroma from 'chroma-js';
import MetricCard from '../common/MetricCard';
import useClusterAnalysis from '../../hooks/useClusterAnalysis';
import useClusterEfficiency from '../../hooks/useClusterEfficiency';
import ClusterComparisonTable from './ClusterComparisonTable';

const ClusterEfficiencyDashboard = ({ clusters, flowMaps, geometryData }) => {
  // Debug input data
  console.log('ClusterEfficiencyDashboard props:', {
    hasClusters: !!clusters?.length,
    clusterCount: clusters?.length,
    hasFlowMaps: !!flowMaps?.length,
    flowCount: flowMaps?.length,
    hasGeometry: !!geometryData,
    sampleCluster: clusters?.[0],
    sampleMarket: clusters?.[0]?.markets?.[0]
  });

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

  // Combine metrics from both hooks
  const combinedMetrics = useMemo(() => ({
    averageEfficiency: (analysisMetrics.averageEfficiency + efficiencyMetrics.averageEfficiency) / 2,
    totalCoverage: Math.max(analysisMetrics.totalCoverage, efficiencyMetrics.totalCoverage),
    networkDensity: analysisMetrics.networkDensity,
    clusterCount: processedClusters.length
  }), [analysisMetrics, efficiencyMetrics, processedClusters]);

  // Color scale for efficiency scores
  const colorScale = useMemo(() => 
    chroma.scale(['#fee8c8', '#e34a33']).domain([0, 1]),
    []
  );

  // Show loading state only if we have no data
  if (!clusters || !flowMaps) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No market clusters or flow data available for analysis.
      </Alert>
    );
  }

  // Show warning if no processed clusters
  if (!processedClusters?.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Unable to process market clusters. Please check the data format.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Market Cluster Analysis
            <Tooltip title="Analyze market cluster efficiency and connectivity">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
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

        {/* Cluster Map */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '400px' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Cluster Distribution
              </Typography>
              <Box sx={{ height: '350px' }}>
                <MapContainer
                  center={[15.3694, 44.191]}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {processedClusters.map(cluster => {
                    // Debug log for cluster coordinates
                    console.log('Rendering cluster:', {
                      id: cluster.cluster_id,
                      center: [cluster.center_lat, cluster.center_lon],
                      markets: cluster.markets?.map(m => ({
                        name: m.name,
                        coords: m.coordinates
                      }))
                    });

                    return (
                      <React.Fragment key={cluster.cluster_id}>
                        {/* Render cluster center */}
                        <CircleMarker
                          center={[cluster.center_lat, cluster.center_lon]}
                          radius={Math.sqrt(cluster.market_count || 1) * 5}
                          fillColor={colorScale(cluster.metrics?.efficiency || 0).hex()}
                          color="#fff"
                          weight={2}
                          opacity={0.8}
                          fillOpacity={0.6}
                        >
                          <Popup>
                            <div>
                              <strong>Cluster {cluster.cluster_id}</strong>
                              <br />
                              Main Market: {cluster.main_market}
                              <br />
                              Markets: {cluster.market_count}
                              <br />
                              Efficiency: {((cluster.metrics?.efficiency || 0) * 100).toFixed(1)}%
                              <br />
                              Coverage: {((cluster.metrics?.coverage || 0) * 100).toFixed(1)}%
                              <br />
                              Connectivity: {((cluster.metrics?.internal_connectivity || 0) * 100).toFixed(1)}%
                            </div>
                          </Popup>
                        </CircleMarker>

                        {/* Render individual markets */}
                        {cluster.markets?.map((market, idx) => (
                          <CircleMarker
                            key={`${cluster.cluster_id}-${idx}`}
                            center={[market.coordinates[1], market.coordinates[0]]}
                            radius={3}
                            fillColor={colorScale(cluster.metrics?.efficiency || 0).hex()}
                            color="#fff"
                            weight={1}
                            opacity={0.6}
                            fillOpacity={0.4}
                          >
                            <Popup>
                              <div>
                                <strong>{market.name}</strong>
                                <br />
                                Cluster: {cluster.cluster_id}
                                <br />
                                Is Main Market: {market.name === cluster.main_market ? 'Yes' : 'No'}
                              </div>
                            </Popup>
                          </CircleMarker>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cluster Details */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '400px', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Cluster Details
              </Typography>
              {processedClusters.map(cluster => (
                <Box
                  key={cluster.cluster_id}
                  sx={{
                    mb: 2,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <Typography variant="subtitle2">
                    Cluster {cluster.cluster_id} ({cluster.market_count} markets)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Main Market: {cluster.main_market}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Efficiency
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(cluster.metrics?.efficiency || 0) * 100}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Connectivity
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(cluster.metrics?.internal_connectivity || 0) * 100}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Price Convergence
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(cluster.metrics?.price_convergence || 0) * 100}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Cluster Comparison Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Cluster Comparison
              </Typography>
              <ClusterComparisonTable clusters={processedClusters} />
            </CardContent>
          </Card>
        </Grid>

        {/* About This Visualization */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About This Visualization
              </Typography>
              <Typography variant="body2" paragraph>
                This analysis examines how Yemen's markets organize into functional clusters, revealing patterns 
                of market integration and efficiency across different regions. It helps identify key market hubs 
                and assess the effectiveness of market networks.
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Key Features:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Cluster Map:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <li>Circle size indicates number of markets in cluster</li>
                      <li>Color intensity shows cluster efficiency (darker = more efficient)</li>
                      <li>Position shows geographic distribution of clusters</li>
                      <li>Tooltips provide detailed cluster metrics</li>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Efficiency Metrics:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <li>Cluster Efficiency: Price transmission effectiveness</li>
                      <li>Market Coverage: Proportion of markets in clusters</li>
                      <li>Network Density: Strength of inter-cluster connections</li>
                      <li>Market Count: Size and distribution of clusters</li>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Cluster Details:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      <li>Main Market: Central hub of each cluster</li>
                      <li>Market Count: Number of connected markets</li>
                      <li>Efficiency Score: Internal market integration</li>
                      <li>Coverage: Regional market reach</li>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                Interpretation Guide:
              </Typography>
              <Box>
                <Typography variant="body2">
                  High cluster efficiency (darker colors) indicates strong market integration with effective price 
                  transmission between markets. Large clusters (bigger circles) suggest robust market networks, 
                  while small, isolated clusters may indicate fragmentation.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                  Key aspects to monitor:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Geographic distribution of efficient clusters</li>
                  <li>Size variations between regions</li>
                  <li>Isolation of certain market groups</li>
                  <li>Network density patterns</li>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Low efficiency or isolated clusters may indicate areas needing intervention to improve market 
                  integration and price transmission. High efficiency clusters can serve as models for market 
                  development in other regions.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ClusterEfficiencyDashboard;
