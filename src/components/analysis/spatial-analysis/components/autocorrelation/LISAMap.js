import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip, CircleMarker } from 'react-leaflet';
import PropTypes from 'prop-types';
import chroma from 'chroma-js';
import { Box, Typography, Paper } from '@mui/material';
import { backgroundMonitor } from '../../../../../utils/backgroundMonitor';

const LISAMap = ({ localMorans, geometry }) => {
  console.log('LISAMap received:', { localMorans, geometry });

  // Create GeoJSON features from geometry
  const geoJSONData = useMemo(() => {
    if (!geometry?.unified?.features || !localMorans) {
      console.warn('Missing localMorans or geometry:', { localMorans, geometry });
      return null;
    }

    try {
      // Use the unified features directly
      const features = geometry.unified.features.map(feature => {
        const regionId = feature.properties?.region_id;
        const moranData = localMorans[regionId];
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            cluster_type: moranData?.cluster_type || 'not-significant',
            local_i: moranData?.local_i || 0,
            p_value: moranData?.p_value
          }
        };
      });

      return {
        type: 'FeatureCollection',
        features,
        crs: geometry.unified.crs
      };
    } catch (error) {
      console.error('Error creating GeoJSON:', error);
      return null;
    }
  }, [geometry, localMorans]);

  // Style function for GeoJSON features
  const getStyle = (feature) => {
    const clusterType = feature.properties?.cluster_type;
    
    let fillColor;
    switch (clusterType) {
      case 'high-high':
        fillColor = '#d7191c'; // Red
        break;
      case 'low-low':
        fillColor = '#2c7bb6'; // Blue
        break;
      case 'high-low':
        fillColor = '#fdae61'; // Orange
        break;
      case 'low-high':
        fillColor = '#abd9e9'; // Light Blue
        break;
      default:
        fillColor = '#eeeeee'; // Grey
    }

    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  // Legend component
  const Legend = () => (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        padding: 2,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 1
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        LISA Clusters
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#d7191c', borderRadius: '2px' }} />
          <Typography variant="caption">High-High Cluster</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#2c7bb6', borderRadius: '2px' }} />
          <Typography variant="caption">Low-Low Cluster</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#fdae61', borderRadius: '2px' }} />
          <Typography variant="caption">High-Low Outlier</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#abd9e9', borderRadius: '2px' }} />
          <Typography variant="caption">Low-High Outlier</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#eeeeee', borderRadius: '2px' }} />
          <Typography variant="caption">Not Significant</Typography>
        </Box>
      </Box>
    </Paper>
  );

  // Tooltip content
  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const content = `
      <div style="padding: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">
          ${props.originalName || props.region_id}
        </div>
        <div>Cluster Type: ${props.cluster_type}</div>
        <div>Local Moran's I: ${props.local_i?.toFixed(3) || 'N/A'}</div>
        ${props.p_value ? `<div>P-Value: ${props.p_value.toFixed(3)}</div>` : ''}
      </div>
    `;
    layer.bindTooltip(content);
  };

  // Error state
  if (!geoJSONData) {
    return (
      <Box 
        sx={{ 
          height: '100%', 
          minHeight: 400,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.default',
          borderRadius: 1,
          p: 2
        }}
      >
        <Typography color="text.secondary">
          Unable to display LISA map. Please ensure both geometry and local Moran's I data are available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', minHeight: 400, position: 'relative' }}>
      <MapContainer
        center={[15.3694, 44.191]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <GeoJSON
          data={geoJSONData}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
      <Legend />
    </Box>
  );
};

LISAMap.propTypes = {
  localMorans: PropTypes.object.isRequired,
  geometry: PropTypes.shape({
    unified: PropTypes.shape({
      features: PropTypes.array.isRequired,
      crs: PropTypes.object
    }),
    points: PropTypes.array,
    polygons: PropTypes.array
  }).isRequired
};

export default LISAMap;
