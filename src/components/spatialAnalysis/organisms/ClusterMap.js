import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';

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
      center={[15.3694, 44.191]}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
