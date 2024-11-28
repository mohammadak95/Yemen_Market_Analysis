// src/components/analysis/spatial-analysis/components/autocorrelation/LISAMap.js

import React, { useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Paper, Typography, Box, Alert } from '@mui/material';
import PropTypes from 'prop-types';
import { getClusterColor } from '../../utils/spatialAutocorrelationUtils';

// Consistent color scheme with MoranScatterPlot
const CLUSTER_COLORS = {
  'high-high': '#ff0000',
  'low-low': '#0000ff',
  'high-low': '#ff9900',
  'low-high': '#00ff00',
  'not-significant': '#999999'
};

export const LISAMap = React.memo(({ localMorans, geometry }) => {
  // Debug log to verify data
  console.log('LISAMap received:', { localMorans, geometry });

  // Validate input data - check for local_i and cluster_type
  const validData = useMemo(() => {
    if (!localMorans || !geometry) {
      console.warn('Missing localMorans or geometry:', { localMorans, geometry });
      return false;
    }
    if (!geometry.features || !geometry.features.length) {
      console.warn('Missing geometry features');
      return false;
    }
    
    // Check if we have any valid local Moran's I data
    const hasValidData = Object.values(localMorans).some(region => 
      typeof region.local_i === 'number' && 
      typeof region.cluster_type === 'string'
    );

    console.log('Local Morans validation result:', hasValidData);
    return hasValidData;
  }, [localMorans, geometry]);

  const getFeatureStyle = useCallback((feature) => {
    if (!feature?.properties?.region_id) return null;

    const regionId = feature.properties.region_id;
    const result = localMorans[regionId];
    
    // Consider valid if it has local_i and cluster_type
    const isValid = result && 
      typeof result.local_i === 'number' && 
      typeof result.cluster_type === 'string';

    const clusterType = isValid ? result.cluster_type : 'not-significant';

    return {
      fillColor: CLUSTER_COLORS[clusterType] || CLUSTER_COLORS['not-significant'],
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: isValid ? null : '3',
      fillOpacity: isValid ? 0.8 : 0.4
    };
  }, [localMorans]);

  const onEachFeature = useCallback((feature, layer) => {
    if (!feature?.properties?.region_id) return;

    const regionId = feature.properties.region_id;
    const result = localMorans[regionId];
    const originalName = feature.properties.originalName || regionId;

    if (result) {
      const clusterType = result.cluster_type || 'not-significant';
      const localI = typeof result.local_i === 'number' ? result.local_i.toFixed(3) : 'N/A';
      
      layer.bindTooltip(`
        <div style="font-family: Arial, sans-serif; min-width: 200px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">
            ${originalName}
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Pattern:</strong> 
            <span style="color: ${CLUSTER_COLORS[clusterType]}">
              ${clusterType.replace('-', ' ').toUpperCase()}
            </span>
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Local Moran's I:</strong> ${localI}
          </div>
          <div style="margin-top: 5px;">
            <strong>Cluster Type:</strong> ${clusterType.replace('-', ' ').toUpperCase()}
          </div>
        </div>
      `, {
        direction: 'top',
        sticky: true,
        offset: [0, -10],
        opacity: 0.9,
        className: 'lisa-map-tooltip'
      });

      // Add hover effect
      layer.on({
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            weight: 2,
            color: '#666',
            fillOpacity: 0.9
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle(getFeatureStyle(feature));
        }
      });
    }
  }, [localMorans, getFeatureStyle]);

  const legendItems = useMemo(() => [
    { label: 'High-High Cluster', type: 'high-high', description: 'High values surrounded by high values' },
    { label: 'Low-Low Cluster', type: 'low-low', description: 'Low values surrounded by low values' },
    { label: 'High-Low Outlier', type: 'high-low', description: 'High values surrounded by low values' },
    { label: 'Low-High Outlier', type: 'low-high', description: 'Low values surrounded by high values' },
    { label: 'Not Significant', type: 'not-significant', description: 'No significant spatial pattern' }
  ], []);

  if (!validData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="subtitle1">
          Unable to display LISA map
        </Typography>
        <Typography variant="body2">
          Please ensure both geometry and local Moran's I data are available
        </Typography>
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Local Indicators of Spatial Association (LISA)
      </Typography>
      
      <Box sx={{ height: 500, position: 'relative' }}>
        <MapContainer
          center={[15.3694, 44.191]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {validData && (
            <GeoJSON
              data={geometry}
              style={getFeatureStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: 2,
            borderRadius: 1,
            boxShadow: 2,
            maxWidth: 300
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Spatial Patterns
          </Typography>
          {legendItems.map((item, index) => (
            <Box
              key={index}
              sx={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                mb: 1,
                '&:last-child': { mb: 0 }
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: CLUSTER_COLORS[item.type],
                  mr: 1,
                  mt: 0.5,
                  flexShrink: 0,
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              />
              <Box>
                <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
});

LISAMap.propTypes = {
  localMorans: PropTypes.objectOf(PropTypes.shape({
    local_i: PropTypes.number,
    p_value: PropTypes.number, // Optional
    cluster_type: PropTypes.string
  })).isRequired,
  geometry: PropTypes.shape({
    type: PropTypes.string,
    features: PropTypes.array
  }).isRequired,
};

LISAMap.displayName = 'LISAMap';

export default LISAMap;
