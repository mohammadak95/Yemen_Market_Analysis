import React, { useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import Legend from '../atoms/Legend';
import Tooltip from '../atoms/Tooltip';
import MapControls from '../molecules/MapControls';
import { transformRegionName } from '../utils/spatialUtils';

// LISA cluster color mapping
const LISA_COLORS = {
  'high-high': '#d7191c', // Red for hot spots
  'low-low': '#2c7bb6',   // Blue for cold spots
  'high-low': '#fdae61',  // Orange for high-low outliers
  'low-high': '#abd9e9',  // Light blue for low-high outliers
  'not-significant': '#eeeeee' // Grey for not significant
};

// Map bounds control component
const MapBoundsControl = ({ geometry }) => {
  const map = useMap();

  React.useEffect(() => {
    if (geometry?.features?.length) {
      const bounds = L.geoJSON(geometry).getBounds();
      map.fitBounds(bounds);
    }
  }, [map, geometry]);

  return null;
};

const LISAMap = ({
  localMorans,
  geometry,
  height = '100%',
  onRegionClick
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);

  // Process GeoJSON with LISA statistics
  const processedGeoJSON = useMemo(() => {
    if (!geometry?.features || !localMorans) return null;

    return {
      type: 'FeatureCollection',
      features: geometry.features.map(feature => {
        const regionId = feature.properties?.region_id;
        const moranData = localMorans[regionId] || {};
        
        return {
          ...feature,
          properties: {
            ...feature.properties,
            cluster_type: moranData.cluster_type || 'not-significant',
            local_i: moranData.local_i || 0,
            p_value: moranData.p_value || 1,
            z_score: moranData.z_score || 0
          }
        };
      })
    };
  }, [geometry, localMorans]);

  // Style function for GeoJSON features
  const getFeatureStyle = useCallback((feature) => {
    const clusterType = feature.properties?.cluster_type || 'not-significant';
    
    return {
      fillColor: LISA_COLORS[clusterType],
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }, []);

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
  const legendItems = useMemo(() => [
    { color: LISA_COLORS['high-high'], label: 'High-High Cluster' },
    { color: LISA_COLORS['low-low'], label: 'Low-Low Cluster' },
    { color: LISA_COLORS['high-low'], label: 'High-Low Outlier' },
    { color: LISA_COLORS['low-high'], label: 'Low-High Outlier' },
    { color: LISA_COLORS['not-significant'], label: 'Not Significant' }
  ], []);

  if (!processedGeoJSON) {
    return (
      <Box 
        sx={{ 
          height,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1
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
        center={[15.3694, 44.191]} // Yemen's approximate center
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        <MapBoundsControl geometry={geometry} />

        <GeoJSON
          data={processedGeoJSON}
          style={getFeatureStyle}
          onEachFeature={(feature, layer) => {
            if (onRegionClick) {
              layer.on({
                click: () => onRegionClick(feature.properties.region_id)
              });
            }

            const tooltipContent = (
              <Tooltip
                title={feature.properties.originalName || feature.properties.region_id}
                metrics={[
                  {
                    label: 'Cluster Type',
                    value: feature.properties.cluster_type.replace(/-/g, ' ')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join('-')
                  },
                  {
                    label: "Local Moran's I",
                    value: feature.properties.local_i,
                    format: 'number'
                  },
                  {
                    label: 'P-Value',
                    value: feature.properties.p_value,
                    format: 'number'
                  },
                  {
                    label: 'Z-Score',
                    value: feature.properties.z_score,
                    format: 'number'
                  }
                ]}
              />
            );

            layer.bindTooltip(
              tooltipContent,
              { sticky: true, direction: 'top' }
            );
          }}
        />
      </MapContainer>

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onRefresh={() => {}}
      />

      <Legend
        title="LISA Clusters"
        items={legendItems}
      />
    </Box>
  );
};

LISAMap.propTypes = {
  localMorans: PropTypes.object.isRequired,
  geometry: PropTypes.shape({
    type: PropTypes.string,
    features: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onRegionClick: PropTypes.func
};

export default React.memo(LISAMap);
