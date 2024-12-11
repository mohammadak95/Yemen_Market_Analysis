// src/components/spatialAnalysis/features/autocorrelation/LISAMap.js

import React, { useMemo } from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CLUSTER_COLORS, SIGNIFICANCE_LEVELS } from './types';

// Yemen’s center and zoom aligned with the cluster map approach
const DEFAULT_CENTER = [15.3694, 44.1910];
const DEFAULT_ZOOM = 6;
const BUFFER = 2; // Adjust buffer if needed
const DEFAULT_BOUNDS = [
  [12.1110 - BUFFER, 41.8140 - BUFFER],
  [19.0025 + BUFFER, 54.5305 + BUFFER]
];

const LISAMap = ({
  localStats,
  geometry,
  selectedRegion,
  onRegionSelect
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const mapData = useMemo(() => {
    if (!localStats || !geometry || !geometry.features || !Array.isArray(geometry.features)) {
      console.warn('Invalid or missing data for LISA map');
      return null;
    }

    try {
      const features = geometry.features.map(feature => {
        const region = feature.properties?.name || feature.properties?.region_id || '';
        const stats = localStats[region];

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
            stats: stats ? { ...stats, clusterStrength, significanceLevel } : null,
            isSelected: region === selectedRegion
          }
        };
      });

      return { type: 'FeatureCollection', features };
    } catch (error) {
      console.error('Error processing map data:', error);
      return null;
    }
  }, [localStats, geometry, selectedRegion]);

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

    const baseOpacity = stats.p_value <= SIGNIFICANCE_LEVELS.HIGHLY_SIGNIFICANT ? 0.9 :
                        stats.p_value <= SIGNIFICANCE_LEVELS.SIGNIFICANT ? 0.7 :
                        stats.p_value <= SIGNIFICANCE_LEVELS.MARGINALLY_SIGNIFICANT ? 0.5 : 0.3;

    const strengthAdjustment = Math.min(stats.clusterStrength * 0.2, 0.1);
    const finalOpacity = Math.min(baseOpacity + strengthAdjustment, 1);

    return {
      fillColor: CLUSTER_COLORS[stats.cluster_type] || theme.palette.grey[300],
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.primary.main : theme.palette.grey[500],
      fillOpacity: finalOpacity
    };
  };

  const formatValue = (value, precision = 3) => {
    if (value == null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(precision) : value.toString();
  };

  const onEachFeature = (feature, layer) => {
    const stats = feature.properties.stats;
    const region = feature.properties.name || feature.properties.region_id || '';

    // Simplify tooltip for clearer data display
    layer.bindTooltip(() => {
      if (!stats) {
        return `<div><strong>${region}</strong><br/>No data available</div>`;
      }

      return `
        <div style="min-width: ${isSmallScreen ? '180px' : '220px'};">
          <strong>${region}</strong><br/>
          Type: ${stats.cluster_type.replace('-', ' ')}<br/>
          Significance: ${stats.significanceLevel}<br/>
          Moran’s I: ${formatValue(stats.local_i)}<br/>
          p-value: ${formatValue(stats.p_value)}<br/>
          Z-score: ${formatValue(stats.z_score)}
        </div>
      `;
    }, { sticky: true, direction: 'auto', className: 'lisa-map-tooltip' });

    layer.on({
      click: () => onRegionSelect(region)
    });
  };

  if (!mapData) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" p={2} gap={2}>
        <Typography color="textSecondary">No map data available</Typography>
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
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        maxBounds={DEFAULT_BOUNDS}
        minZoom={5}
        maxZoom={8}
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={false}
        boxZoom={true}
        keyboard={true}
        bounceAtZoomLimits={true}
        worldCopyJump={false}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
          noWrap={true}
          maxNativeZoom={8}
          maxZoom={8}
          tileSize={256}
          zoomOffset={0}
          keepBuffer={8}
        />
        <GeoJSON
          data={mapData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Legend with clearer instructions */}
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
              {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')}
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
          Opacity indicates significance and strength
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(LISAMap);