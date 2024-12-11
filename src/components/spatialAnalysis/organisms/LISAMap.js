// src/components/spatialAnalysis/organisms/LISAMap.js

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import L from 'leaflet';

import Legend from '../atoms/Legend';
import TooltipComponent from '../atoms/Tooltip';
import MapControls from '../molecules/MapControls';
import { transformRegionName } from '../utils/spatialUtils';

// LISA cluster color mapping
const LISA_COLORS = {
  'high-high': '#d7191c', // Red for hot spots
  'low-low': '#2c7bb6', // Blue for cold spots
  'high-low': '#fdae61', // Orange for high-low outliers
  'low-high': '#abd9e9', // Light blue for low-high outliers
  'not-significant': '#eeeeee', // Grey for not significant
};

// Yemen's center with expanded bounds and buffer zone
const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const BUFFER = 2; // Degrees of buffer around Yemen
const DEFAULT_BOUNDS = [
  [12.1110 - BUFFER, 41.8140 - BUFFER], // Southwest corner with buffer
  [19.0025 + BUFFER, 54.5305 + BUFFER], // Northeast corner with buffer
];

// Map reset component
const MapReset = () => {
  const map = useMap();

  useEffect(() => {
    const resetTimeout = setTimeout(() => {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      map.fitBounds(DEFAULT_BOUNDS);
    }, 100);

    const resetView = () => {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      map.fitBounds(DEFAULT_BOUNDS);
    };

    map.on('mouseout', resetView);
    map.on('dragend', () => {
      if (!map.getBounds().intersects(DEFAULT_BOUNDS)) {
        resetView();
      }
    });

    return () => {
      clearTimeout(resetTimeout);
      map.off('mouseout', resetView);
      map.off('dragend', resetView);
    };
  }, [map]);

  return null;
};

const LISAMap = ({
  localMorans,
  geometry,
  height = '100%',
  onRegionClick,
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);

  // Process GeoJSON with LISA statistics
  const processedGeoJSON = useMemo(() => {
    if (!geometry?.features || !localMorans) return null;

    return {
      type: 'FeatureCollection',
      features: geometry.features.map((feature) => {
        const regionId = feature.properties?.region_id;
        const moranData = localMorans[regionId] || {};

        return {
          ...feature,
          properties: {
            ...feature.properties,
            cluster_type: moranData.cluster_type || 'not-significant',
            local_i: moranData.local_i || 0,
            p_value: moranData.p_value || 1,
            z_score: moranData.z_score || 0,
          },
        };
      }),
    };
  }, [geometry, localMorans]);

  // Style function for GeoJSON features
  const getFeatureStyle = useCallback(
    (feature) => {
      const clusterType =
        feature.properties?.cluster_type || 'not-significant';

      return {
        fillColor: LISA_COLORS[clusterType],
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7,
      };
    },
    []
  );

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleReset = useCallback(() => {
    if (geometry?.features?.length) {
      const bounds = L.geoJSON(geometry).getBounds();
      mapRef.current?.fitBounds(bounds);
    }
  }, [geometry]);

  // Create legend items
  const legendItems = useMemo(
    () => [
      { color: LISA_COLORS['high-high'], label: 'High-High Cluster' },
      { color: LISA_COLORS['low-low'], label: 'Low-Low Cluster' },
      { color: LISA_COLORS['high-low'], label: 'High-Low Outlier' },
      { color: LISA_COLORS['low-high'], label: 'Low-High Outlier' },
      { color: LISA_COLORS['not-significant'], label: 'Not Significant' },
    ],
    []
  );

  if (!processedGeoJSON) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          No LISA data available for visualization
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        bounds={DEFAULT_BOUNDS}
        style={{ height: '100%', width: '100%' }}
        maxBounds={DEFAULT_BOUNDS}
        minZoom={DEFAULT_ZOOM - 1}
        maxZoom={DEFAULT_ZOOM + 2}
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
        <MapReset />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <GeoJSON
          data={processedGeoJSON}
          style={getFeatureStyle}
          onEachFeature={(feature, layer) => {
            if (onRegionClick) {
              layer.on({
                click: () => onRegionClick(feature.properties.region_id),
              });
            }

            const tooltipContent = `
              <div style="
                background: ${theme.palette.background.paper};
                padding: 8px;
                border-radius: 4px;
                border: 1px solid ${theme.palette.divider};
                font-family: ${theme.typography.fontFamily};
              ">
                <div style="font-weight: 600; margin-bottom: 4px;">
                  ${feature.properties.originalName || feature.properties.region_id}
                </div>
                <div style="color: ${theme.palette.text.secondary};">
                  Cluster Type: ${feature.properties.cluster_type
                    .replace(/-/g, ' ')
                    .split(' ')
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join('-')}
                </div>
                <div style="color: ${theme.palette.text.secondary};">
                  Local Moran's I: ${feature.properties.local_i}
                </div>
                <div style="color: ${theme.palette.text.secondary};">
                  P-Value: ${feature.properties.p_value}
                </div>
                <div style="color: ${theme.palette.text.secondary};">
                  Z-Score: ${feature.properties.z_score}
                </div>
              </div>
            `;

            layer.bindTooltip(tooltipContent, {
              sticky: true,
              direction: 'top',
            });
          }}
        />
      </MapContainer>

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onRefresh={() => {}}
      />

      <Legend title="LISA Clusters" items={legendItems} />
    </Box>
  );
};

LISAMap.propTypes = {
  localMorans: PropTypes.object.isRequired,
  geometry: PropTypes.shape({
    type: PropTypes.string,
    features: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onRegionClick: PropTypes.func,
};

export default React.memo(LISAMap);