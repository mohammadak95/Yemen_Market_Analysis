import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GeoJSON, CircleMarker } from 'react-leaflet';
import chroma from 'chroma-js';

import Legend from '../../atoms/Legend';
import Tooltip from '../../atoms/Tooltip';
import MapControls from '../../molecules/MapControls';
import BaseMap from '../../molecules/BaseMap';
import { safeGeoJSONProcessor } from '../../utils/geoJSONProcessor';
import { transformRegionName, getRegionCoordinates } from '../../utils/spatialUtils';

const ShockMap = ({
  shocks,
  geometry,
  selectedRegion,
  onRegionSelect,
  height = '100%'
}) => {
  const theme = useTheme();

  // Create color scales for different shock types
  const colorScales = useMemo(() => ({
    'price_surge': chroma.scale(['#fee0d2', '#de2d26']),
    'price_drop': chroma.scale(['#e5f5e0', '#31a354'])
  }), []);

  // Process shock data with coordinates
  const processedShocks = useMemo(() => {
    if (!shocks?.length) return [];

    // Calculate max magnitude for each shock type
    const maxMagnitudes = shocks.reduce((acc, shock) => {
      if (!acc[shock.shock_type]) {
        acc[shock.shock_type] = shock.magnitude;
      } else {
        acc[shock.shock_type] = Math.max(acc[shock.shock_type], shock.magnitude);
      }
      return acc;
    }, {});

    return shocks.map(shock => {
      const coords = getRegionCoordinates(shock.region);
      if (!coords) return null;

      const normalizedMagnitude = shock.magnitude / maxMagnitudes[shock.shock_type];
      const colorScale = colorScales[shock.shock_type] || colorScales['price_surge'];
      
      return {
        ...shock,
        coordinates: coords,
        color: colorScale(normalizedMagnitude).hex(),
        radius: 5 + (normalizedMagnitude * 15),
        normalizedMagnitude
      };
    }).filter(Boolean);
  }, [shocks, colorScales]);

  // Process GeoJSON for regions
  const processedGeoJSON = useMemo(() => {
    if (!geometry) return null;

    // Extract features from unified geometry or combine points and polygons
    const features = geometry.unified?.features || [
      ...(geometry.polygons || []),
      ...(geometry.points || [])
    ];

    // Create a new GeoJSON object with validated features
    const validatedGeoJSON = {
      type: 'FeatureCollection',
      features: features.map(feature => ({
        type: 'Feature',
        properties: {
          ...feature.properties,
          name: feature.properties?.name || '',
          normalizedName: feature.properties?.normalizedName || 
            transformRegionName(feature.properties?.name || ''),
          region_id: feature.properties?.region_id || feature.properties?.normalizedName
        },
        geometry: {
          type: feature.geometry?.type || 'Polygon',
          coordinates: feature.geometry?.coordinates || []
        }
      })),
      crs: {
        type: 'name',
        properties: {
          name: 'EPSG:4326'
        }
      }
    };

    return safeGeoJSONProcessor(validatedGeoJSON, 'shocks');
  }, [geometry]);

  // Style function for regions
  const getRegionStyle = useCallback((feature) => {
    if (!feature?.properties?.normalizedName) return {};

    const isSelected = selectedRegion === feature.properties.region_id;
    const hasShock = processedShocks.some(shock => 
      transformRegionName(shock.region) === feature.properties.normalizedName
    );
    
    return {
      fillColor: hasShock ? theme.palette.error.light : theme.palette.grey[300],
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.secondary.main : 'white',
      fillOpacity: hasShock ? 0.6 : 0.3
    };
  }, [processedShocks, selectedRegion, theme]);

  // Create legend items
  const legendItems = useMemo(() => [
    { color: colorScales['price_surge'](1).hex(), label: 'High Price Surge' },
    { color: colorScales['price_surge'](0).hex(), label: 'Low Price Surge' },
    { color: colorScales['price_drop'](1).hex(), label: 'High Price Drop' },
    { color: colorScales['price_drop'](0).hex(), label: 'Low Price Drop' },
    { 
      color: theme.palette.error.light, 
      label: 'Affected Region',
      style: { opacity: 0.6 }
    }
  ], [theme, colorScales]);

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
          Invalid geometry data for visualization
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      <BaseMap height={height}>
        {/* Region polygons */}
        <GeoJSON
          data={processedGeoJSON}
          style={getRegionStyle}
          onEachFeature={(feature, layer) => {
            layer.on({
              click: () => onRegionSelect(feature.properties.region_id)
            });
          }}
        />

        {/* Shock points */}
        {processedShocks.map((shock, index) => (
          <CircleMarker
            key={`shock-${index}`}
            center={[shock.coordinates[1], shock.coordinates[0]]}
            radius={shock.radius}
            pathOptions={{
              fillColor: shock.color,
              color: 'white',
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
          >
            <Tooltip
              title={shock.region}
              metrics={[
                {
                  label: 'Magnitude',
                  value: shock.magnitude,
                  format: 'percentage'
                },
                {
                  label: 'Current Price',
                  value: shock.current_price,
                  format: 'number'
                },
                {
                  label: 'Previous Price',
                  value: shock.previous_price,
                  format: 'number'
                },
                {
                  label: 'Type',
                  value: shock.shock_type.replace('_', ' ').toUpperCase()
                }
              ]}
            />
          </CircleMarker>
        ))}
      </BaseMap>

      <MapControls
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onReset={() => {}}
        onRefresh={() => {}}
      />

      <Legend
        title="Price Shocks"
        items={legendItems}
      />
    </Box>
  );
};

ShockMap.propTypes = {
  shocks: PropTypes.arrayOf(PropTypes.shape({
    region: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    magnitude: PropTypes.number,
    current_price: PropTypes.number,
    previous_price: PropTypes.number,
    shock_type: PropTypes.string
  })).isRequired,
  geometry: PropTypes.shape({
    unified: PropTypes.shape({
      features: PropTypes.array
    }),
    polygons: PropTypes.array,
    points: PropTypes.array
  }).isRequired,
  selectedRegion: PropTypes.string,
  onRegionSelect: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default React.memo(ShockMap);
