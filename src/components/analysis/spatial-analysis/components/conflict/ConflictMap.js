// src/components/analysis/spatial-analysis/components/conflict/ConflictMap.js

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';

const ConflictMap = ({ conflictData, selectedRegion, onRegionSelect, metricType }) => {
  const theme = useTheme();

  const colorScale = useMemo(() => {
    const values = Object.values(conflictData).map(d => {
      switch (metricType) {
        case 'price': return d.priceImpact;
        case 'volatility': return d.volatility;
        case 'correlation': return d.correlation;
        default: return 0;
      }
    });

    const max = Math.max(...values);
    const min = Math.min(...values);

    return scaleSequential(interpolateRdYlBu)
      .domain([min, max]);
  }, [conflictData, metricType]);

  const getStyle = (feature) => {
    const regionData = conflictData[feature.properties.region_id];
    if (!regionData) return defaultStyle;

    let value;
    switch (metricType) {
      case 'price': value = regionData.priceImpact; break;
      case 'volatility': value = regionData.volatility; break;
      case 'correlation': value = regionData.correlation; break;
      default: value = 0;
    }

    return {
      fillColor: colorScale(value),
      weight: selectedRegion === feature.properties.region_id ? 2 : 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
      dashArray: selectedRegion === feature.properties.region_id ? '' : '3'
    };
  };

  return (
    <MapContainer
      center={[15.3694, 44.191]}
      zoom={6}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <GeoJSON
        data={geometry}
        style={getStyle}
        onEachFeature={(feature, layer) => {
          const regionData = conflictData[feature.properties.region_id];
          if (regionData) {
            layer.bindTooltip(`
              <strong>${feature.properties.region_id}</strong><br/>
              Price Impact: ${regionData.priceImpact.toFixed(2)}%<br/>
              Volatility: ${regionData.volatility.toFixed(2)}<br/>
              Correlation: ${regionData.correlation.toFixed(2)}
            `);
            
            layer.on({
              click: () => onRegionSelect(feature.properties.region_id)
            });
          }
        }}
      />
    </MapContainer>
  );
};

export default ConflictMap;