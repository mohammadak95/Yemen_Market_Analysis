// src/components/spatialAnalysis/features/autocorrelation/LISAMap.js

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, GeoJSON, Tooltip, Legend } from 'react-leaflet';

const LISAMap = ({ data, geometry }) => {
  const theme = useTheme();

  // Color mapping for LISA clusters
  const clusterColors = {
    'high-high': theme.palette.error.main,
    'low-low': theme.palette.primary.main,
    'high-low': theme.palette.warning.main,
    'low-high': theme.palette.info.main,
    'not_significant': theme.palette.grey[300]
  };

  // Style function for regions
  const styleRegion = useCallback((feature) => {
    const region = feature.properties.region_id;
    const stats = data.find(d => d.region === region);
    const clusterType = stats?.clusterType || 'not_significant';
    const isSignificant = stats?.pValue < 0.05;

    return {
      fillColor: clusterColors[clusterType],
      weight: isSignificant ? 2 : 1,
      opacity: 1,
      color: isSignificant ? theme.palette.common.white : theme.palette.grey[400],
      fillOpacity: isSignificant ? 0.8 : 0.5
    };
  }, [data, theme, clusterColors]);

  // Tooltip content
  const createTooltipContent = useCallback((feature) => {
    const region = feature.properties.region_id;
    const stats = data.find(d => d.region === region);

    if (!stats) {
      return region;
    }

    return `
      ${region}
      Local Moran's I: ${stats.localI.toFixed(3)}
      p-value: ${stats.pValue.toFixed(3)}
      Cluster Type: ${stats.clusterType}
    `;
  }, [data]);

  if (!geometry?.unified?.features) {
    return null;
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
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
            layer.bindTooltip(createTooltipContent(feature), {
              permanent: false,
              direction: 'center'
            });
          }}
        />
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'white',
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[2],
        zIndex: 1000
      }}>
        <div style={{ marginBottom: theme.spacing(1) }}>
          <strong>LISA Clusters</strong>
        </div>
        {Object.entries(clusterColors).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: color,
              marginRight: 8,
              borderRadius: 2
            }} />
            <span style={{ fontSize: 12 }}>
              {type.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join('-')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

LISAMap.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    region: PropTypes.string.isRequired,
    localI: PropTypes.number.isRequired,
    pValue: PropTypes.number,
    clusterType: PropTypes.string.isRequired
  })).isRequired,
  geometry: PropTypes.shape({
    unified: PropTypes.object.isRequired
  }).isRequired
};

export default React.memo(LISAMap);
