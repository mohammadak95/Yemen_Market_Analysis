import React, { useMemo } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { MapContainer, TileLayer, GeoJSON, Tooltip as MapTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CLUSTER_COLORS, SIGNIFICANCE_LEVELS } from './types';

// Yemen bounds and center coordinates
const YEMEN_BOUNDS = [
  [12.5, 42.5], // Southwest corner
  [19.0, 54.5]  // Northeast corner
];
const YEMEN_CENTER = [15.5527, 48.5164];
const YEMEN_ZOOM = 6.5;

const LISAMap = ({
  localStats,
  geometry,
  selectedRegion,
  onRegionSelect
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Transform data for mapping
  const mapData = useMemo(() => {
    if (!localStats || !geometry || !geometry.features || !Array.isArray(geometry.features)) {
      console.warn('Invalid or missing data for LISA map:', {
        hasLocalStats: !!localStats,
        hasGeometry: !!geometry,
        hasFeatures: geometry?.features != null,
        featuresIsArray: Array.isArray(geometry?.features)
      });
      return null;
    }

    try {
      // Merge geometry with statistics
      const features = geometry.features.map(feature => {
        const region = feature.properties?.name || feature.properties?.region_id || '';
        const stats = localStats[region];

        if (!region) {
          console.warn('Feature missing name/region_id:', feature);
        }

        return {
          ...feature,
          properties: {
            ...feature.properties,
            stats: stats || null,
            isSelected: region === selectedRegion
          }
        };
      });

      return {
        type: 'FeatureCollection',
        features
      };
    } catch (error) {
      console.error('Error processing map data:', error);
      return null;
    }
  }, [localStats, geometry, selectedRegion]);

  // Style functions
  const getRegionStyle = (feature) => {
    const stats = feature.properties.stats;
    const isSelected = feature.properties.isSelected;

    if (!stats) {
      return {
        fillColor: theme.palette.grey[300],
        weight: isSelected ? 2 : 1,
        opacity: 1,
        color: isSelected ? theme.palette.primary.main : theme.palette.grey[500],
        fillOpacity: 0.7
      };
    }

    return {
      fillColor: CLUSTER_COLORS[stats.cluster_type] || theme.palette.grey[300],
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.primary.main : theme.palette.grey[500],
      fillOpacity: stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 0.8 : 0.4
    };
  };

  // Format values for tooltip
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  // Event handlers
  const onEachFeature = (feature, layer) => {
    const stats = feature.properties.stats;
    const region = feature.properties.name || feature.properties.region_id || '';

    // Add tooltip
    layer.bindTooltip(() => {
      return `
        <div style="min-width: ${isSmallScreen ? '150px' : '200px'};">
          <strong>${region}</strong><br/>
          ${stats ? `
            Local Moran's I: ${formatValue(stats.local_i)}<br/>
            P-value: ${formatValue(stats.p_value)}<br/>
            Cluster Type: ${stats.cluster_type.replace('-', ' ')}<br/>
            Z-score: ${formatValue(stats.z_score)}
          ` : 'No data available'}
        </div>
      `;
    }, {
      sticky: true,
      direction: 'auto'
    });

    // Add click handler
    layer.on({
      click: () => onRegionSelect(region)
    });
  };

  if (!mapData) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100%"
        p={2}
        gap={2}
      >
        <Typography color="textSecondary" align="center">
          No map data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapContainer
        center={YEMEN_CENTER}
        zoom={YEMEN_ZOOM}
        style={{ height: '100%', width: '100%' }}
        maxBounds={YEMEN_BOUNDS}
        minZoom={YEMEN_ZOOM - 0.5}
        maxZoom={YEMEN_ZOOM + 1}
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        bounceAtZoomLimits={false}
      >
        {/* Base map */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          bounds={YEMEN_BOUNDS}
        />

        {/* Region polygons */}
        <GeoJSON
          data={mapData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: isSmallScreen ? 10 : 20,
          right: isSmallScreen ? 10 : 20,
          bgcolor: 'background.paper',
          p: isSmallScreen ? 0.5 : 1,
          borderRadius: 1,
          boxShadow: 1,
          zIndex: 1000,
          maxWidth: isSmallScreen ? '120px' : 'auto'
        }}
      >
        <Typography variant="caption" display="block" gutterBottom>
          Cluster Types
        </Typography>
        {Object.entries(CLUSTER_COLORS).map(([type, color]) => (
          <Box key={type} display="flex" alignItems="center" gap={0.5} mb={0.5}>
            <Box
              sx={{
                width: isSmallScreen ? 8 : 12,
                height: isSmallScreen ? 8 : 12,
                bgcolor: color,
                opacity: type === 'not_significant' ? 0.4 : 0.8
              }}
            />
            <Typography variant="caption" sx={{ fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}>
              {type.replace('-', ' ')}
            </Typography>
          </Box>
        ))}
        <Typography 
          variant="caption" 
          display="block" 
          mt={1} 
          sx={{ fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}
        >
          Opacity indicates significance
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(LISAMap);
