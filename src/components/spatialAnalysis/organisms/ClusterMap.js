// src/components/spatialAnalysis/organisms/ClusterMap.js

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import './ClusterMap.css';
import { useWindowWidth } from '../../../hooks/useWindowWidth'; // Adjust the import path as needed

// Updated Yemen's center and zoom to display a larger area
const DEFAULT_CENTER = [15.3694, 44.1910]; // Coordinates roughly at the center of Yemen
const DEFAULT_ZOOM = 6; // Set zoom level to 6
const BUFFER = 3; // Increased buffer to include more surrounding areas
const DEFAULT_BOUNDS = [
  [12.1110 - BUFFER, 41.8140 - BUFFER], // Southwest corner with buffer
  [19.0025 + BUFFER, 54.5305 + BUFFER], // Northeast corner with buffer
];

// Map reset component to maintain bounds (temporarily disabled)
const MapReset = () => {
  const map = useMap();

  useEffect(() => {
    const resetTimeout = setTimeout(() => {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      // map.fitBounds(DEFAULT_BOUNDS); // Temporarily disabled
    }, 100);

    const resetView = () => {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      // map.fitBounds(DEFAULT_BOUNDS); // Temporarily disabled
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

const ClusterMap = ({
  clusters,
  selectedClusterId,
  onClusterSelect,
  geometry,
  height = '100%',
}) => {
  const theme = useTheme();
  const windowWidth = useWindowWidth();

  // Dynamically adjust the map's height based on window width for responsiveness
  const responsiveHeight = windowWidth < 600 ? '300px' : height;

  // Function to retrieve cluster information based on region
  const getClusterByRegion = useCallback(
    (region) => {
      return clusters?.find(
        (c) => c.connected_markets.includes(region) || c.main_market === region
      );
    },
    [clusters]
  );

  // Style function for GeoJSON regions
  const styleRegion = useCallback(
    (feature) => {
      const region = feature.properties.region_id;
      const cluster = getClusterByRegion(region);
      const isSelected = cluster?.cluster_id === selectedClusterId;

      if (!cluster) {
        return {
          fillColor: theme.palette.background.paper,
          weight: 0.5,
          opacity: 0.3,
          color: theme.palette.divider,
          fillOpacity: 0.1,
          cursor: 'default',
        };
      }

      const baseColor =
        cluster.cluster_id === 1
          ? theme.palette.primary.main
          : theme.palette.secondary.main;

      return {
        fillColor: baseColor,
        weight: isSelected ? 2 : 1,
        opacity: 1,
        color: isSelected
          ? theme.palette.common.white
          : theme.palette.grey[400],
        fillOpacity: isSelected ? 0.8 : 0.5,
        cursor: 'pointer',
      };
    },
    [theme, selectedClusterId, getClusterByRegion]
  );

  // Handle click events on regions
  const onRegionClick = useCallback(
    (feature) => {
      const region = feature.properties.region_id;
      const cluster = getClusterByRegion(region);
      if (cluster) {
        onClusterSelect(cluster.cluster_id);
      }
    },
    [getClusterByRegion, onClusterSelect]
  );

  // Generate tooltip content for regions
  const createTooltipContent = useCallback(
    (feature) => {
      const region = feature.properties.region_id;
      const cluster = getClusterByRegion(region);

      if (!cluster) {
        return `
          <div style="text-align: center;">
            <strong>${region}</strong>
            <br />
            <small style="color: ${theme.palette.text.secondary};">
              Not part of any cluster
            </small>
          </div>
        `;
      }

      return `
        <div style="text-align: center;">
          <strong>${region}</strong>
          <br />
          ${cluster.main_market} cluster
          <br />
          <small style="color: ${theme.palette.text.secondary};">
            Click to view details
          </small>
        </div>
      `;
    },
    [getClusterByRegion, theme.palette.text.secondary]
  );

  // Display loading state if GeoJSON data is not available
  if (!geometry?.unified?.features) {
    return (
      <Box
        sx={{
          height: responsiveHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          Loading Cluster Data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: responsiveHeight,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ flex: 1, width: '100%' }}
        // bounds={DEFAULT_BOUNDS} // Removed to prevent overriding center and zoom
        maxZoom={18} // Ensure maxZoom accommodates your DEFAULT_ZOOM
        minZoom={5}  // Ensure minZoom is set appropriately
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
        {/* <MapReset /> */} {/* Temporarily disabled to test zoom and center */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
          noWrap={true}
          maxNativeZoom={18} // Ensure this matches the maxZoom
          maxZoom={18}
          tileSize={256}
          zoomOffset={0}
          keepBuffer={8}
        />
        <GeoJSON
          data={geometry.unified}
          style={styleRegion}
          onEachFeature={(feature, layer) => {
            layer.on({
              click: () => onRegionClick(feature),
              mouseover: (e) => {
                const cluster = getClusterByRegion(feature.properties.region_id);
                if (cluster) {
                  e.target.setStyle({
                    fillOpacity: 0.8,
                    weight: 2,
                  });
                }
              },
              mouseout: (e) => {
                const cluster = getClusterByRegion(feature.properties.region_id);
                if (cluster && cluster.cluster_id !== selectedClusterId) {
                  e.target.setStyle({
                    fillOpacity: 0.5,
                    weight: 1,
                  });
                } else if (!cluster) {
                  e.target.setStyle({
                    fillOpacity: 0.1,
                    weight: 0.5,
                  });
                }
              },
            });
            layer.bindTooltip(createTooltipContent(feature), {
              permanent: false,
              direction: 'center',
              className: 'custom-tooltip',
            });
          }}
        />
      </MapContainer>
    </Box>
  );
};

ClusterMap.propTypes = {
  clusters: PropTypes.arrayOf(
    PropTypes.shape({
      cluster_id: PropTypes.number.isRequired,
      main_market: PropTypes.string.isRequired,
      connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ),
  selectedClusterId: PropTypes.number,
  onClusterSelect: PropTypes.func.isRequired,
  geometry: PropTypes.shape({
    unified: PropTypes.object,
  }),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(ClusterMap);