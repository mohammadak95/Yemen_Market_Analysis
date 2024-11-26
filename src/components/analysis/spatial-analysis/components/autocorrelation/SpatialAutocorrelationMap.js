import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';

const SpatialAutocorrelationMap = ({ 
  geometry, 
  autocorrelationData,
  selectedMetric = 'moran_i'
}) => {
  // Validate and process GeoJSON data
  const processedGeometry = useMemo(() => {
    if (!geometry?.features) {
      console.warn('Invalid geometry data provided');
      return null;
    }

    try {
      // Create a deep copy and ensure valid GeoJSON structure
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
            region_id: feature.properties.region_id || feature.properties.normalizedName
          }
        })).filter(feature => 
          feature.geometry && 
          Array.isArray(feature.geometry.coordinates) &&
          feature.properties.region_id
        )
      };
    } catch (error) {
      console.error('Error processing GeoJSON:', error);
      return null;
    }
  }, [geometry]);

  // Create color scale for visualization
  const colorScale = useMemo(() => {
    if (!autocorrelationData) return null;

    const values = Object.values(autocorrelationData).map(d => d[selectedMetric]);
    const max = Math.max(...values);
    const min = Math.min(...values);

    return scaleSequential(interpolateRdYlBu)
      .domain([min, max]);
  }, [autocorrelationData, selectedMetric]);

  // Style function for GeoJSON features
  const getFeatureStyle = (feature) => {
    const regionId = feature.properties.region_id;
    const value = autocorrelationData?.[regionId]?.[selectedMetric];

    return {
      fillColor: value !== undefined && colorScale ? colorScale(value) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  // Tooltip content
  const onEachFeature = (feature, layer) => {
    const regionId = feature.properties.region_id;
    const data = autocorrelationData?.[regionId];
    
    if (data) {
      layer.bindTooltip(`
        <strong>${regionId}</strong><br/>
        Moran's I: ${data.moran_i?.toFixed(3) || 'N/A'}<br/>
        P-value: ${data.p_value?.toFixed(3) || 'N/A'}<br/>
        Z-score: ${data.z_score?.toFixed(3) || 'N/A'}
      `);
    }
  };

  if (!processedGeometry || !colorScale) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Unable to render spatial autocorrelation map due to invalid data.
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapContainer
        center={[15.5, 48]} // Yemen's approximate center
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <GeoJSON
          data={processedGeometry}
          style={getFeatureStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Legend */}
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
          Spatial Autocorrelation
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption">Low</Typography>
          <Box
            sx={{
              width: 150,
              height: 10,
              background: 'linear-gradient(to right, #4575b4, #ffffbf, #d73027)'
            }}
          />
          <Typography variant="caption">High</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default React.memo(SpatialAutocorrelationMap);