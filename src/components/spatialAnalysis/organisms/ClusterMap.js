import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import './ClusterMap.css';

// Yemen's center with expanded bounds and buffer zone
const DEFAULT_CENTER = [15.3694, 44.1910];
const DEFAULT_ZOOM = 6;
const BUFFER = 2;  // Degrees of buffer around Yemen
const DEFAULT_BOUNDS = [
  [12.1110 - BUFFER, 41.8140 - BUFFER],  // Southwest corner with buffer
  [19.0025 + BUFFER, 54.5305 + BUFFER]   // Northeast corner with buffer
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
      map.off('dragend');
    };
  }, [map]);

  return null;
};

const ClusterMap = ({
  clusters,
  selectedClusterId,
  onClusterSelect,
  geometry
}) => {
  const theme = useTheme();

  // Get cluster by region
  const getClusterByRegion = useCallback((region) => {
    return clusters?.find(c => 
      c.connected_markets.includes(region) || c.main_market === region
    );
  }, [clusters]);

  // Style function for regions
  const styleRegion = useCallback((feature) => {
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
        cursor: 'default'
      };
    }

    const baseColor = cluster.cluster_id === 1 ? 
      theme.palette.primary.main : 
      theme.palette.secondary.main;

    return {
      fillColor: baseColor,
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.common.white : theme.palette.grey[400],
      fillOpacity: isSelected ? 0.8 : 0.5,
      cursor: 'pointer'
    };
  }, [theme, selectedClusterId, getClusterByRegion]);

  // Handle click on region
  const onRegionClick = useCallback((feature) => {
    const region = feature.properties.region_id;
    const cluster = getClusterByRegion(region);
    if (cluster) {
      onClusterSelect(cluster.cluster_id);
    }
  }, [getClusterByRegion, onClusterSelect]);

  // Tooltip content
  const createTooltipContent = useCallback((feature) => {
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
  }, [getClusterByRegion, theme.palette.text.secondary]);

  if (!geometry?.unified?.features) {
    return null;
  }

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      bounds={DEFAULT_BOUNDS}
      style={{ height: '100%', width: '100%' }}
      maxBounds={DEFAULT_BOUNDS}
      minZoom={5}  // Allow slightly more zoom out
      maxZoom={8}  // Limit max zoom to maintain performance
      zoomControl={true}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      scrollWheelZoom={true}
      boxZoom={true}
      keyboard={true}
      bounceAtZoomLimits={true}
      worldCopyJump={false}
      preferCanvas={true}
    >
      <MapReset />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        bounds={DEFAULT_BOUNDS}
        noWrap={true}
        maxNativeZoom={8}  // Match maxZoom for better performance
        maxZoom={8}
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
                  weight: 2
                });
              }
            },
            mouseout: (e) => {
              const cluster = getClusterByRegion(feature.properties.region_id);
              if (cluster && cluster.cluster_id !== selectedClusterId) {
                e.target.setStyle({
                  fillOpacity: 0.5,
                  weight: 1
                });
              } else if (!cluster) {
                e.target.setStyle({
                  fillOpacity: 0.1,
                  weight: 0.5
                });
              }
            }
          });
          layer.bindTooltip(createTooltipContent(feature), {
            permanent: false,
            direction: 'center',
            className: 'custom-tooltip'
          });
        }}
      />
    </MapContainer>
  );
};

ClusterMap.propTypes = {
  clusters: PropTypes.arrayOf(PropTypes.shape({
    cluster_id: PropTypes.number.isRequired,
    main_market: PropTypes.string.isRequired,
    connected_markets: PropTypes.arrayOf(PropTypes.string).isRequired
  })),
  selectedClusterId: PropTypes.number,
  onClusterSelect: PropTypes.func.isRequired,
  geometry: PropTypes.shape({
    unified: PropTypes.object
  })
};

export default React.memo(ClusterMap);
