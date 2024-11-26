import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { transformRegionName } from '../../utils/spatialUtils';

const SpatialAutocorrelationMap = ({ 
  geometry, 
  autocorrelationData,
  selectedMetric = 'moran_i'
}) => {
  // Process geometry with standardized naming
  const processedGeometry = useMemo(() => {
    if (!geometry) return null;
    
    const processed = safeGeoJSONProcessor(geometry, 'autocorrelation');
    if (!processed?.features) return null;

    return {
      ...processed,
      features: processed.features.map(feature => {
        const originalName = feature.properties.originalName || 
                           feature.properties.region_id || 
                           feature.properties.name;
        const normalizedName = transformRegionName(originalName);

        return {
          ...feature,
          properties: {
            ...feature.properties,
            originalName,
            normalizedName
          }
        };
      })
    };
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
    const normalizedName = feature.properties.normalizedName;
    const value = autocorrelationData?.[normalizedName]?.[selectedMetric];

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
    const normalizedName = feature.properties.normalizedName;
    const displayName = feature.properties.originalName || normalizedName;
    const data = autocorrelationData?.[normalizedName];
    
    if (data) {
      layer.bindTooltip(`
        <strong>${displayName}</strong><br/>
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
