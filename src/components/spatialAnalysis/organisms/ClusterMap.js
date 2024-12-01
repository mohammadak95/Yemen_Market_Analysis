import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';

// Yemen bounds and center coordinates
const YEMEN_BOUNDS = [
  [11.5, 41.5], // Southwest corner - adjusted to show full extent
  [20.0, 55.5]  // Northeast corner - adjusted to show full extent
];
const YEMEN_CENTER = [15.5527, 48.5164];
const YEMEN_ZOOM = 6; // Slightly zoomed out to show full country

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
        fillColor: theme.palette.grey[300],
        weight: 1,
        opacity: 1,
        color: theme.palette.grey[400],
        fillOpacity: 0.5
      };
    }

    // Use primary color for first cluster, secondary for second
    const baseColor = cluster.cluster_id === 1 ? 
      theme.palette.primary.main : 
      theme.palette.secondary.main;

    return {
      fillColor: baseColor,
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.common.white : theme.palette.grey[400],
      fillOpacity: isSelected ? 0.8 : 0.5
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
      return region;
    }

    return `${region} (${cluster.main_market} cluster)`;
  }, [getClusterByRegion]);

  if (!geometry?.unified?.features) {
    return null;
  }

  return (
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
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        bounds={YEMEN_BOUNDS}
      />
      <GeoJSON
        data={geometry.unified}
        style={styleRegion}
        onEachFeature={(feature, layer) => {
          layer.on({
            click: () => onRegionClick(feature)
          });
          layer.bindTooltip(createTooltipContent(feature), {
            permanent: false,
            direction: 'center'
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