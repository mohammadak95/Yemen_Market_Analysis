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
  CircularProgress
} from '@mui/material';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { spatialHandler } from '../../../../../utils/spatialDataHandler';
import { transformRegionName } from '../../utils/spatialUtils';
import MetricCard from '../common/MetricCard';

const SpatialAutocorrelationMap = ({ geometry, autocorrelationData }) => {
  const theme = useTheme();

  // Debug: Log available region names in autocorrelation data
  useMemo(() => {
    if (process.env.NODE_ENV === 'development' && autocorrelationData?.local) {
      console.log('Available regions in autocorrelation data:', 
        Object.keys(autocorrelationData.local).sort());
    }
  }, [autocorrelationData]);

  // Process geometry with normalized region names
  const processedGeometry = useMemo(() => {
    if (!geometry?.features) return null;

    return {
      type: 'FeatureCollection',
      features: geometry.features.map(feature => {
        // Get original region names from feature properties
        const originalName = feature.properties.originalName || 
                           feature.properties.normalizedName ||
                           feature.properties.region_id ||
                           feature.properties.shapeName;  // Added shapeName as a fallback
        
        // Normalize the region name for matching
        const normalizedName = transformRegionName(originalName);
        
        // Find matching autocorrelation data using normalized name
        const regionData = autocorrelationData?.local?.[normalizedName];

        if (process.env.NODE_ENV === 'development' && !regionData) {
          console.warn(`No autocorrelation data found for region: ${originalName} (normalized: ${normalizedName})`);
          // Debug: Log attempted variations
          const variations = [
            originalName?.toLowerCase(),
            normalizedName,
            `${normalizedName} governorate`,
            normalizedName?.replace(/^al-/, 'al '),
            normalizedName?.replace(/^ad-/, 'al ')
          ];
          console.debug(`Attempted variations for ${originalName}:`, variations);
        }

        return {
          type: 'Feature',
          geometry: {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates
          },
          properties: {
            ...feature.properties,
            originalName,
            normalizedName,
            region_id: originalName,
            local_i: regionData?.local_i || 0,
            cluster_type: regionData?.cluster_type || 'not-significant'
          }
        };
      })
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
        opacity = 0.8;
        break;
      case 'low-low':
        color = theme.palette.primary.main;
        opacity = 0.8;
        break;
      case 'high-low':
      case 'low-high':
        color = theme.palette.warning.main;
        opacity = 0.8;
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

  // Create tooltip content with region name mappings
  const createTooltipContent = (feature) => {
    const { originalName, normalizedName, local_i, cluster_type } = feature.properties;
    
    return `
      <strong>${originalName}</strong><br/>
      ${normalizedName !== originalName ? `Normalized: ${normalizedName}<br/>` : ''}
      Local Moran's I: ${local_i.toFixed(3)}<br/>
      Cluster Type: ${cluster_type}
    `;
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
              layer.bindTooltip(createTooltipContent(feature));
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
  const spatialAutocorrelation = useSelector((state) => state.spatial.data.spatialAutocorrelation);
  const geometry = useSelector((state) => state.spatial.data.geometry.unified);
  const loading = useSelector((state) => state.spatial.status.loading);

  const { global, local } = spatialAutocorrelation || {};

  // Process local statistics with normalized region names
  const summaryMetrics = useMemo(() => {
    if (!local) return null;

    const processedClusters = Object.entries(local).map(([region, data]) => ({
      ...data,
      normalizedName: transformRegionName(region)
    }));

    const highHigh = processedClusters.filter(c => c.cluster_type === 'high-high').length;
    const lowLow = processedClusters.filter(c => c.cluster_type === 'low-low').length;
    const outliers = processedClusters.filter(c => 
      ['high-low', 'low-high'].includes(c.cluster_type)
    ).length;

    return {
      highHigh,
      lowLow,
      outliers,
      totalClusters: processedClusters.length,
      unmatchedRegions: processedClusters.filter(c => 
        !geometry?.features?.some(f => 
          transformRegionName(f.properties.normalizedName) === c.normalizedName
        )
      ).length
    };
  }, [local, geometry]);

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

  // Show warning if there are unmatched regions
  if (summaryMetrics?.unmatchedRegions > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`${summaryMetrics.unmatchedRegions} regions could not be matched to geometry`);
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

      {/* Interpretation */}
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
