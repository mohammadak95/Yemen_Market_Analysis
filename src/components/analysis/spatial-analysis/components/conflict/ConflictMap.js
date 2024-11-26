// src/components/analysis/spatial-analysis/components/conflict/ConflictMap.js

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { scaleSequential } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { transformRegionName } from '../../utils/spatialUtils';

const ConflictMap = ({ geometry, conflictData, selectedRegion, onRegionSelect, metricType }) => {
  const theme = useTheme();

  // Process geometry with standardized naming
  const processedGeometry = useMemo(() => {
    if (!geometry) return null;
    
    const processed = safeGeoJSONProcessor(geometry, 'conflicts');
    if (!processed?.features) return null;

    return {
      ...processed,
      features: processed.features.map(feature => {
        const originalName = feature.properties.originalName || 
                           feature.properties.region_id || 
                           feature.properties.name;
        const normalizedName = transformRegionName(originalName);

        return {
          ...feature,
          properties: {
            ...feature.properties,
            originalName,
            normalizedName
          }
        };
      })
    };
  }, [geometry]);

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
    const normalizedName = feature.properties.normalizedName;
    const regionData = conflictData[normalizedName];
    if (!regionData) return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
      dashArray: '3'
    };

    let value;
    switch (metricType) {
      case 'price': value = regionData.priceImpact; break;
      case 'volatility': value = regionData.volatility; break;
      case 'correlation': value = regionData.correlation; break;
      default: value = 0;
    }

    return {
      fillColor: colorScale(value),
      weight: selectedRegion === normalizedName ? 2 : 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
      dashArray: selectedRegion === normalizedName ? '' : '3'
    };
  };

  if (!processedGeometry) {
    return null;
  }

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
        data={processedGeometry}
        style={getStyle}
        onEachFeature={(feature, layer) => {
          const normalizedName = feature.properties.normalizedName;
          const displayName = feature.properties.originalName || normalizedName;
          const regionData = conflictData[normalizedName];
          
          if (regionData) {
            layer.bindTooltip(`
              <strong>${displayName}</strong><br/>
              Price Impact: ${regionData.priceImpact.toFixed(2)}%<br/>
              Volatility: ${regionData.volatility.toFixed(2)}<br/>
              Correlation: ${regionData.correlation.toFixed(2)}
            `);
            
            layer.on({
              click: () => onRegionSelect(normalizedName)
            });
          }
        }}
      />
    </MapContainer>
  );
};

export default React.memo(ConflictMap);
