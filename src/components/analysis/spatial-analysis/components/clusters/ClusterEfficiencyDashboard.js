// src/components/analysis/spatial-analysis/components/clusters/ClusterEfficiencyDashboard.js

import React, { useMemo, useState, memo } from 'react';
import PropTypes from 'prop-types';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON 
} from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';
import { calculateEfficiencyMetrics } from '../../utils/clusterAnalysis';

/**
 * ClusterMap Component
 * Renders a Leaflet map displaying market clusters.
 */
const ClusterMap = memo(({ 
  clusters, 
  selectedCluster, 
  onClusterSelect, 
  geometry 
}) => {
  const theme = useTheme();

  // Define a color scale based on market coverage
  const colorScale = useMemo(() => 
    scaleLinear()
      .domain([0, 1]) // Assuming market_coverage ranges from 0 to 1
      .range([theme.palette.primary.light, theme.palette.primary.dark])
      .clamp(true)
  , [theme]);

  // Extract GeoJSON features relevant to the clusters
  const clusterFeatures = useMemo(() => {
    if (!geometry?.features || !clusters?.length) return [];
    const matchedFeatures = geometry.features.filter(feature => 
      clusters.some(cluster => cluster.main_market.toLowerCase() === feature.properties.normalizedName.toLowerCase())
    );
    console.log("ClusterMap - Matched Features:", matchedFeatures);
    return matchedFeatures;
  }, [geometry, clusters]);

  return (
    <MapContainer 
      style={{ height: '500px', width: '100%' }} 
      center={[15.3694, 44.191]} 
      zoom={6}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {clusterFeatures.map((feature, index) => {
        const cluster = clusters.find(c => c.main_market.toLowerCase() === feature.properties.normalizedName.toLowerCase());
        if (!cluster) {
          console.warn(`No cluster found for feature: ${feature.properties.normalizedName}`);
          return null;
        }

        return (
          <GeoJSON 
            key={index} 
            data={feature}
            style={() => ({
              fillColor: colorScale(cluster.efficiency_metrics.market_coverage),
              weight: 2,
              opacity: 1,
              color: 'white',
              dashArray: '3',
              fillOpacity: selectedCluster?.cluster_id === cluster.cluster_id ? 1 : 0.7
            })}
            eventHandlers={{
              click: () => onClusterSelect(cluster)
            }}
          />
        );
      })}
    </MapContainer>
  );
});

ClusterMap.propTypes = {
  clusters: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
      main_market: PropTypes.string.isRequired,
      market_count: PropTypes.number.isRequired,
      efficiency_metrics: PropTypes.shape({
        efficiency_score: PropTypes.number.isRequired,
        internal_connectivity: PropTypes.number.isRequired,
        market_coverage: PropTypes.number.isRequired,
        price_convergence: PropTypes.number,
        stability: PropTypes.number,
      })
    })
  ).isRequired,
  selectedCluster: PropTypes.object,
  onClusterSelect: PropTypes.func.isRequired,
  geometry: PropTypes.object.isRequired,
};

/**
 * ClusterEfficiencyDashboard Component
 * Displays efficiency metrics and renders the ClusterMap.
 */
const ClusterEfficiencyDashboard = ({ clusterEfficiency, marketClusters, geometry }) => {
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Log received props for debugging
  console.log("ClusterEfficiencyDashboard - clusterEfficiency:", clusterEfficiency);
  console.log("ClusterEfficiencyDashboard - marketClusters:", marketClusters);
  console.log("ClusterEfficiencyDashboard - geometry:", geometry);

  // Compute aggregated efficiency metrics
  const aggregatedMetrics = useMemo(() => calculateEfficiencyMetrics(clusterEfficiency), [clusterEfficiency]);

  const handleClusterSelect = (cluster) => {
    console.log("Selected Cluster:", cluster);
    setSelectedCluster(cluster);
  };

  // Handle cases where data might be missing
  if (!marketClusters || !geometry) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Cluster Data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ClusterMap 
        clusters={marketClusters} 
        selectedCluster={selectedCluster} 
        onClusterSelect={handleClusterSelect} 
        geometry={geometry}
      />
      {/* Render selected cluster's efficiency metrics */}
      {selectedCluster && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h5">Cluster Efficiency Metrics</Typography>
            <Typography variant="body1">
              <strong>Market Coverage:</strong> {selectedCluster.efficiency_metrics.market_coverage.toFixed(4)}
            </Typography>
            <Typography variant="body1">
              <strong>Efficiency Score:</strong> {selectedCluster.efficiency_metrics.efficiency_score.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              <strong>Internal Connectivity:</strong> {selectedCluster.efficiency_metrics.internal_connectivity.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              <strong>Price Convergence:</strong> {selectedCluster.efficiency_metrics.price_convergence?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body1">
              <strong>Stability:</strong> {selectedCluster.efficiency_metrics.stability?.toFixed(4) || 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      )}
      {/* Render aggregated efficiency metrics */}
      {aggregatedMetrics && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">Aggregated Efficiency Metrics</Typography>
            <Typography variant="body1">
              <strong>Average Integration Score:</strong> {aggregatedMetrics.avgEfficiency.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              <strong>Average Connectivity:</strong> {aggregatedMetrics.avgConnectivity.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              <strong>Average Market Coverage:</strong> {aggregatedMetrics.avgCoverage.toFixed(4)}
            </Typography>
            <Typography variant="body1">
              <strong>Total Markets:</strong> {aggregatedMetrics.totalMarkets}
            </Typography>
            <Typography variant="body1">
              <strong>Max Efficiency:</strong> {aggregatedMetrics.maxEfficiency.toFixed(2)}
            </Typography>
            <Typography variant="body1">
              <strong>Max Connectivity:</strong> {aggregatedMetrics.maxConnectivity.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

ClusterEfficiencyDashboard.propTypes = {
  clusterEfficiency: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      efficiency_score: PropTypes.number.isRequired,
      internal_connectivity: PropTypes.number.isRequired,
      market_coverage: PropTypes.number.isRequired,
    })
  ).isRequired,
  marketClusters: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
      main_market: PropTypes.string.isRequired,
      market_count: PropTypes.number.isRequired,
      efficiency_metrics: PropTypes.shape({
        efficiency_score: PropTypes.number.isRequired,
        internal_connectivity: PropTypes.number.isRequired,
        market_coverage: PropTypes.number.isRequired,
        price_convergence: PropTypes.number,
        stability: PropTypes.number,
      })
    })
  ).isRequired,
  geometry: PropTypes.object.isRequired,
};

export default ClusterEfficiencyDashboard;
