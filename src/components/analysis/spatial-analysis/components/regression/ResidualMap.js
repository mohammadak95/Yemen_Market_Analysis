import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Paper, Typography, Box } from '@mui/material';
import { scaleLinear } from 'd3-scale';
import SpatialErrorBoundary from '../../SpatialErrorBoundary';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { transformRegionName } from '../../utils/spatialUtils';

const ResidualMap = ({ 
  geometry, 
  residuals, 
  regressionType = 'price_transmission' 
}) => {
  // Calculate residual statistics
  const residualStats = useMemo(() => {
    const values = Object.values(residuals);
    if (values.length === 0) return { 
      maxAbs: 0, 
      mean: 0, 
      std: 0 
    };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const maxAbs = Math.max(...values.map(Math.abs));

    return { maxAbs, mean, std };
  }, [residuals]);

  // Color scale for residuals
  const colorScale = useMemo(() => {
    return scaleLinear()
      .domain([-residualStats.maxAbs, 0, residualStats.maxAbs])
      .range(['blue', 'white', 'red']);
  }, [residualStats]);

  // Process GeoJSON with safe preprocessing and name normalization
  const processedGeometry = useMemo(() => {
    if (!geometry) return null;
    
    const processed = safeGeoJSONProcessor(geometry, 'residuals');
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

  // Feature styling based on residuals
  const getFeatureStyle = (feature) => {
    const normalizedName = feature.properties.normalizedName;
    const residualValue = residuals[normalizedName] || 0;

    return {
      fillColor: colorScale(residualValue),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  // Tooltip and interaction for each feature
  const onEachFeature = (feature, layer) => {
    const normalizedName = feature.properties.normalizedName;
    const displayName = feature.properties.originalName || normalizedName;
    const residualValue = residuals[normalizedName];

    if (residualValue !== undefined) {
      layer.bindTooltip(`
        <strong>${displayName}</strong><br/>
        Residual: ${residualValue.toFixed(4)}
      `);
    }
  };

  if (!processedGeometry) {
    return null;
  }

  return (
    <SpatialErrorBoundary>
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

        {/* Residual Legend */}
        <Paper 
          sx={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10, 
            p: 2, 
            zIndex: 1000 
          }}
        >
          <Typography variant="subtitle2">
            Residual Intensity ({regressionType})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">
              {(-residualStats.maxAbs).toFixed(2)}
            </Typography>
            <Box 
              sx={{ 
                width: 100, 
                height: 10, 
                background: `linear-gradient(to right, blue, white, red)` 
              }} 
            />
            <Typography variant="caption">
              {residualStats.maxAbs.toFixed(2)}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </SpatialErrorBoundary>
  );
};

export default React.memo(ResidualMap);
