import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  useTheme,
} from '@mui/material';
import { scaleLinear } from 'd3-scale';
import { interpolateRdBu } from 'd3-scale-chromatic';
import MetricCard from '../common/MetricCard';
import {MapContainer, TileLayer, GeoJSON} from 'react-leaflet';



const SpatialAutocorrelationMap = ({ geometry, autocorrelationData }) => {
  const theme = useTheme();

  // Process geometry to ensure valid GeoJSON
  const processedGeometry = useMemo(() => {
    if (!geometry?.features) return null;

    return {
      type: 'FeatureCollection',
      features: geometry.features.map(feature => ({
        type: 'Feature',
        geometry: {
          type: feature.geometry.type,
          coordinates: feature.geometry.coordinates
        },
        properties: {
          ...feature.properties,
          region_id: feature.properties.region_id || feature.properties.normalizedName,
          local_i: autocorrelationData?.local?.[feature.properties.normalizedName]?.local_i || 0,
          cluster_type: autocorrelationData?.local?.[feature.properties.normalizedName]?.cluster_type || 'not-significant'
        }
      }))
    };
  }, [geometry, autocorrelationData]);

  const getFeatureStyle = (feature) => {
    const localI = feature.properties.local_i;
    const clusterType = feature.properties.cluster_type;

    let color = '#cccccc';
    let opacity = 0.7;

    switch (clusterType) {
      case 'high-high':
        color = theme.palette.error.main;
        break;
      case 'low-low':
        color = theme.palette.primary.main;
        break;
      case 'high-low':
      case 'low-high':
        color = theme.palette.warning.main;
        break;
      default:
        opacity = 0.4;
    }

    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: opacity
    };
  };

  return (
    <Box sx={{ height: 500, position: 'relative' }}>
      <MapContainer
        center={[15.5, 48]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {processedGeometry && (
          <GeoJSON
            data={processedGeometry}
            style={getFeatureStyle}
            onEachFeature={(feature, layer) => {
              layer.bindTooltip(`
                <strong>${feature.properties.region_id}</strong><br/>
                Local Moran's I: ${feature.properties.local_i.toFixed(3)}<br/>
                Cluster Type: ${feature.properties.cluster_type}
              `);
            }}
          />
        )}
      </MapContainer>

      <Paper
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          p: 2,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Cluster Types
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.error.main }} />
            <Typography variant="caption">High-High Cluster</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.primary.main }} />
            <Typography variant="caption">Low-Low Cluster</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.warning.main }} />
            <Typography variant="caption">Spatial Outlier</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

const SpatialAutocorrelationAnalysis = () => {
  // Get data from Redux
  const spatialAutocorrelation = useSelector((state) => state.spatial.data.spatialAutocorrelation);
  const geometry = useSelector((state) => state.spatial.data.geometry.unified);
  const loading = useSelector((state) => state.spatial.status.loading);

  const { global, local } = spatialAutocorrelation || {};

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!local) return null;

    const clusters = Object.values(local);
    const highHigh = clusters.filter(c => c.cluster_type === 'high-high').length;
    const lowLow = clusters.filter(c => c.cluster_type === 'low-low').length;
    const outliers = clusters.filter(c => ['high-low', 'low-high'].includes(c.cluster_type)).length;

    return {
      highHigh,
      lowLow,
      outliers,
      totalClusters: clusters.length
    };
  }, [local]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!spatialAutocorrelation || !geometry) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No spatial autocorrelation data available.
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Spatial Price Autocorrelation Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analysis of spatial price relationships and clustering patterns across markets
          </Typography>
        </Paper>
      </Grid>

      {/* Global Metrics */}
      <Grid item xs={12} md={4}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <MetricCard
              title="Global Moran's I"
              value={global?.moran_i}
              format="number"
              description="Measure of overall spatial autocorrelation"
            />
          </Grid>
          <Grid item xs={6}>
            <MetricCard
              title="High-High Clusters"
              value={summaryMetrics?.highHigh}
              format="number"
              description="Number of high-value clusters"
            />
          </Grid>
          <Grid item xs={6}>
            <MetricCard
              title="Low-Low Clusters"
              value={summaryMetrics?.lowLow}
              format="number"
              description="Number of low-value clusters"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Map */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <SpatialAutocorrelationMap
            geometry={geometry}
            autocorrelationData={spatialAutocorrelation}
          />
        </Paper>
      </Grid>

      {/* Cluster Details */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Interpretation
            </Typography>
            <Typography variant="body2">
              {interpretResults(global?.moran_i, summaryMetrics)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Helper function to interpret results
const interpretResults = (moranI, metrics) => {
  if (!moranI || !metrics) return '';

  let interpretation = `The global Moran's I value of ${moranI.toFixed(3)} indicates `;
  
  if (moranI > 0.3) {
    interpretation += 'significant positive spatial autocorrelation, suggesting that similar price patterns tend to cluster together. ';
  } else if (moranI < -0.3) {
    interpretation += 'significant negative spatial autocorrelation, suggesting that dissimilar price patterns tend to be neighbors. ';
  } else {
    interpretation += 'weak spatial autocorrelation, suggesting that price patterns are relatively random in space. ';
  }

  interpretation += `Analysis identified ${metrics.highHigh} high-value clusters and ${metrics.lowLow} low-value clusters, `;
  interpretation += `with ${metrics.outliers} spatial outliers. `;

  return interpretation;
};

export default SpatialAutocorrelationAnalysis;