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
const YEMEN_CENTER = [15.3694, 44.191];
const YEMEN_ZOOM = 6;

const LISAMap = ({
  localStats,
  geometry,
  selectedRegion,
  onRegionSelect
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Transform data for mapping with enhanced statistics
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
      // Merge geometry with enhanced statistics
      const features = geometry.features.map(feature => {
        const region = feature.properties?.name || feature.properties?.region_id || '';
        const stats = localStats[region];

        if (!region) {
          console.warn('Feature missing name/region_id:', feature);
        }

        // Calculate additional metrics
        const clusterStrength = stats ? Math.abs(stats.local_i) * (stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 1 : 0.5) : 0;
        const significanceLevel = stats ? 
          stats.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? 'Highly Significant' :
          stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 'Significant' :
          stats.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? 'Marginally Significant' :
          'Not Significant' : 'No Data';

        return {
          ...feature,
          properties: {
            ...feature.properties,
            stats: stats ? {
              ...stats,
              clusterStrength,
              significanceLevel,
              standardizedValue: stats.z_score
            } : null,
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

  // Enhanced style functions with improved visual encoding
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

    // Calculate opacity based on significance and cluster strength
    const baseOpacity = stats.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? 0.9 :
                       stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 0.7 :
                       stats.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? 0.5 : 0.3;
    
    // Adjust opacity based on cluster strength
    const strengthAdjustment = Math.min(stats.clusterStrength * 0.2, 0.1);
    const finalOpacity = Math.min(baseOpacity + strengthAdjustment, 1);

    return {
      fillColor: CLUSTER_COLORS[stats.cluster_type] || theme.palette.grey[300],
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.primary.main : theme.palette.grey[500],
      fillOpacity: finalOpacity,
      dashArray: stats.p_value > SIGNIFICANCE_LEVELS.SIGNIFICANT ? '3' : null
    };
  };

  // Enhanced value formatting with confidence intervals
  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  const formatConfidenceInterval = (value, variance) => {
    if (!value || !variance) return '';
    const stdError = Math.sqrt(variance);
    const ci95 = 1.96 * stdError;
    return `(${formatValue(value - ci95)} to ${formatValue(value + ci95)})`;
  };

  // Enhanced event handlers with improved tooltips
  const onEachFeature = (feature, layer) => {
    const stats = feature.properties.stats;
    const region = feature.properties.name || feature.properties.region_id || '';

    // Enhanced tooltip with additional statistical information
    layer.bindTooltip(() => {
      return `
        <div style="min-width: ${isSmallScreen ? '180px' : '250px'};">
          <strong>${region}</strong><br/>
          ${stats ? `
            <strong>Cluster Analysis:</strong><br/>
            • Type: ${stats.cluster_type.replace('-', ' ')}<br/>
            • Significance: ${stats.significanceLevel}<br/>
            • Strength: ${formatValue(stats.clusterStrength)}<br/>
            <br/>
            <strong>Statistics:</strong><br/>
            • Local Moran's I: ${formatValue(stats.local_i)}<br/>
            • Z-score: ${formatValue(stats.z_score)}<br/>
            • P-value: ${formatValue(stats.p_value)}<br/>
            ${stats.variance ? `• 95% CI: ${formatConfidenceInterval(stats.local_i, stats.variance)}` : ''}
          ` : 'No data available'}
        </div>
      `;
    }, {
      sticky: true,
      direction: 'auto',
      className: 'lisa-map-tooltip'
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
        <Typography color="textSecondary">
          No map data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* Instructions Banner */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          bgcolor: 'background.paper',
          p: 1,
          borderRadius: 1,
          boxShadow: 1,
          textAlign: 'center',
          maxWidth: '90%'
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Click on any region to view detailed market cluster analysis
        </Typography>
      </Box>

      <MapContainer
        center={YEMEN_CENTER}
        zoom={YEMEN_ZOOM}
        style={{ height: '100%', width: '100%' }}
        maxBounds={YEMEN_BOUNDS}
        minZoom={YEMEN_ZOOM - 1}
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

      {/* Enhanced Legend */}
      <Box
        sx={{
          position: 'absolute',
          bottom: isSmallScreen ? 10 : 20,
          right: isSmallScreen ? 10 : 20,
          bgcolor: 'background.paper',
          p: isSmallScreen ? 1 : 1.5,
          borderRadius: 1,
          boxShadow: 2,
          zIndex: 1000,
          maxWidth: isSmallScreen ? '150px' : '200px'
        }}
      >
        <Typography variant="caption" display="block" gutterBottom>
          Spatial Clusters
        </Typography>
        {Object.entries(CLUSTER_COLORS).map(([type, color]) => (
          <Box key={type} display="flex" alignItems="center" gap={0.5} mb={0.5}>
            <Box
              sx={{
                width: isSmallScreen ? 10 : 14,
                height: isSmallScreen ? 10 : 14,
                bgcolor: color,
                opacity: type === 'not_significant' ? 0.3 : 0.8,
                border: '1px solid rgba(0,0,0,0.2)',
                borderRadius: 0.5
              }}
            />
            <Typography variant="caption" sx={{ fontSize: isSmallScreen ? '0.7rem' : '0.8rem' }}>
              {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-')}
            </Typography>
          </Box>
        ))}
        <Typography 
          variant="caption" 
          display="block" 
          mt={1}
          sx={{ 
            fontSize: isSmallScreen ? '0.65rem' : '0.75rem',
            color: theme.palette.text.secondary
          }}
        >
          Opacity indicates significance level and cluster strength
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(LISAMap);
