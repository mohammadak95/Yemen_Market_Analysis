// src/components/analysis/spatial-analysis/components/flows/FlowMap.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import FlowLines from './FlowLines';

const FlowMap = ({ flows, metricType, geometry }) => {
  const theme = useTheme();

  // Define style for regions
  const regionStyle = {
    fillColor: '#cccccc',
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7,
  };

  // Collect unique markets from flows
  const markets = useMemo(() => {
    const marketSet = new Set();
    flows.forEach(flow => {
      marketSet.add(flow.source);
      marketSet.add(flow.target);
    });
    return Array.from(marketSet);
  }, [flows]);

  // Map markets to coordinates
  const marketCoordinates = useMemo(() => {
    const coords = {};
    flows.forEach(flow => {
      coords[flow.source] = flow.source_coordinates;
      coords[flow.target] = flow.target_coordinates;
    });
    return coords;
  }, [flows]);

  return (
    <MapContainer center={[15.3694, 44.191]} zoom={6} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {geometry && (
        <GeoJSON data={geometry} style={() => regionStyle} />
      )}
      {/* Render markets as CircleMarkers */}
      {markets.map(market => {
        const coords = marketCoordinates[market];
        if (!coords) return null;
        return (
          <CircleMarker
            key={market}
            center={[coords[1], coords[0]]}
            radius={5}
            fillColor={theme.palette.primary.main}
            color="#fff"
            weight={1}
            opacity={1}
            fillOpacity={0.8}
          >
          </CircleMarker>
        );
      })}
      {/* Render flow lines */}
      <FlowLines flows={flows} metricType={metricType} />
    </MapContainer>
  );
};

FlowMap.propTypes = {
  flows: PropTypes.array.isRequired,
  metricType: PropTypes.string.isRequired,
  geometry: PropTypes.object,
};

export default React.memo(FlowMap);