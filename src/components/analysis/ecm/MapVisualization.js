// src/components/analysis/ecm/MapVisualization.js

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Define Yemen bounds and center coordinates
const YEMEN_BOUNDS = [
  [12.5, 42.5], // Southwest corner
  [19.0, 54.5], // Northeast corner
];
const YEMEN_CENTER = [15.5527, 48.5164];
const YEMEN_ZOOM = 6.5;

// Define cluster types and colors (from spatial analysis types)
const CLUSTER_TYPES = {
  HIGH_HIGH: 'high-high',
  LOW_LOW: 'low-low',
  HIGH_LOW: 'high-low',
  LOW_HIGH: 'low-high',
  NOT_SIGNIFICANT: 'not_significant'
};

const CLUSTER_COLORS = {
  [CLUSTER_TYPES.HIGH_HIGH]: '#d73027', // Hot spots (red)
  [CLUSTER_TYPES.LOW_LOW]: '#313695', // Cold spots (blue)
  [CLUSTER_TYPES.HIGH_LOW]: '#fdae61', // High-Low outliers (orange)
  [CLUSTER_TYPES.LOW_HIGH]: '#74add1', // Low-High outliers (light blue)
  [CLUSTER_TYPES.NOT_SIGNIFICANT]: '#969696' // Not significant (gray)
};

// Define significance levels
const SIGNIFICANCE_LEVELS = {
  SIGNIFICANT: 0.05,
};

// Legend Component
const Legend = ({ isSmallScreen }) => {
  return (
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
              opacity: type === CLUSTER_TYPES.NOT_SIGNIFICANT ? 0.4 : 0.8
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
  );
};

Legend.propTypes = {
  isSmallScreen: PropTypes.bool.isRequired,
};

// Main MapVisualization Component
const MapVisualization = ({
  data,
  selectedRegion,
  onRegionSelect,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Process and merge data
  const mapData = useMemo(() => {
    if (!data || !data.features || !Array.isArray(data.features) || data.features.length === 0) {
      console.warn('Invalid or missing data for MapVisualization:', {
        hasData: !!data,
        hasFeatures: data?.features != null,
        featuresIsArray: Array.isArray(data?.features),
      });
      return null;
    }

    try {
      // Merge geometry with statistics
      const features = data.features.map((feature) => {
        const region = feature.properties?.admin1 || feature.properties?.region_id || '';
        const moranI = feature.properties?.Moran_I;
        const pValue = feature.properties?.Moran_p_value;

        // Determine cluster type based on Moran's I value
        let clusterType = CLUSTER_TYPES.NOT_SIGNIFICANT;
        if (pValue <= SIGNIFICANCE_LEVELS.SIGNIFICANT) {
          if (moranI > 0) {
            clusterType = moranI > 1 ? CLUSTER_TYPES.HIGH_HIGH : CLUSTER_TYPES.LOW_LOW;
          } else {
            clusterType = moranI < -1 ? CLUSTER_TYPES.HIGH_LOW : CLUSTER_TYPES.LOW_HIGH;
          }
        }

        const stats = moranI != null ? {
          local_i: moranI,
          p_value: pValue,
          cluster_type: clusterType,
        } : null;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            stats,
            isSelected: region === selectedRegion,
          },
        };
      });

      return {
        type: 'FeatureCollection',
        features,
      };
    } catch (error) {
      console.error('Error processing map data:', error);
      return null;
    }
  }, [data, selectedRegion]);

  // Style function for GeoJSON features
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

  // Event handlers for each feature
  const onEachFeature = useCallback(
    (feature, layer) => {
      const stats = feature.properties.stats;
      const region = feature.properties.admin1 || feature.properties.region_id || '';

      // Add tooltip
      layer.bindTooltip(() => {
        return `
          <div style="min-width: ${isSmallScreen ? '150px' : '200px'};">
            <strong>${region}</strong><br/>
            ${stats ? `
              Local Moran's I: ${formatValue(stats.local_i)}<br/>
              P-value: ${formatValue(stats.p_value)}<br/>
              Cluster Type: ${stats.cluster_type.replace('-', ' ')}<br/>
            ` : 'No data available'}
          </div>
        `;
      }, {
        sticky: true,
        direction: 'auto',
      });

      // Add click handler
      layer.on({
        click: () => onRegionSelect(region),
      });
    },
    [isSmallScreen, onRegionSelect]
  );

  if (!mapData) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {'Unable to display the map due to missing or invalid data.'}
        </Alert>
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
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Region polygons */}
        <GeoJSON
          data={mapData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Legend */}
      <Legend isSmallScreen={isSmallScreen} />
    </Box>
  );
};

MapVisualization.propTypes = {
  data: PropTypes.object.isRequired, // GeoJSON data with Moran's I and p-values
  selectedRegion: PropTypes.string, // Currently selected region
  onRegionSelect: PropTypes.func, // Handler for region selection
};

MapVisualization.defaultProps = {
  selectedRegion: '',
  onRegionSelect: () => {},
};

export default React.memo(MapVisualization);
