import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GeoJSON, CircleMarker } from 'react-leaflet';
import chroma from 'chroma-js';

import Tooltip from '../../atoms/Tooltip';
import MapControls from '../../molecules/MapControls';
import BaseMap from '../../molecules/BaseMap';
import { safeGeoJSONProcessor } from '../../utils/geoJSONProcessor';
import { transformRegionName, getRegionCoordinates } from '../../utils/spatialUtils';
import { 
  SHOCK_COLORS, 
  VISUALIZATION_PARAMS,
  SHOCK_THRESHOLDS,
  shockValidation 
} from './types';

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
    'price_surge': chroma.scale([SHOCK_COLORS.INACTIVE, SHOCK_COLORS.PRICE_SURGE]),
    'price_drop': chroma.scale([SHOCK_COLORS.INACTIVE, SHOCK_COLORS.PRICE_DROP])
  }), []);

  // Process shock data with coordinates
  const processedShocks = useMemo(() => {
    if (!shocks?.length) return [];

    // Filter valid shocks
    const validShocks = shocks.filter(shockValidation.isValidShock);

    // Calculate max magnitude for each shock type
    const maxMagnitudes = validShocks.reduce((acc, shock) => {
      const magnitude = shockValidation.getShockMagnitude(shock);
      if (!acc[shock.shock_type]) {
        acc[shock.shock_type] = magnitude;
      } else {
        acc[shock.shock_type] = Math.max(acc[shock.shock_type], magnitude);
      }
      return acc;
    }, {});

    return validShocks.map(shock => {
      const coords = getRegionCoordinates(shock.region);
      if (!coords) return null;

      const magnitude = shockValidation.getShockMagnitude(shock);
      const normalizedMagnitude = magnitude / maxMagnitudes[shock.shock_type];
      const colorScale = colorScales[shock.shock_type] || colorScales['price_surge'];
      const severity = shockValidation.getShockSeverity(magnitude);
      
      // Calculate size based on severity and visualization params
      const size = VISUALIZATION_PARAMS.MIN_SHOCK_SIZE + 
        (normalizedMagnitude * (VISUALIZATION_PARAMS.MAX_SHOCK_SIZE - VISUALIZATION_PARAMS.MIN_SHOCK_SIZE));
      
      // Calculate opacity based on severity
      const opacity = VISUALIZATION_PARAMS.MIN_OPACITY + 
        (normalizedMagnitude * (VISUALIZATION_PARAMS.MAX_OPACITY - VISUALIZATION_PARAMS.MIN_OPACITY));
      
      return {
        ...shock,
        coordinates: coords,
        color: colorScale(normalizedMagnitude).hex(),
        radius: size,
        opacity,
        normalizedMagnitude,
        severity
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
      fillColor: hasShock ? SHOCK_COLORS.PROPAGATION : theme.palette.grey[300],
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? SHOCK_COLORS.SELECTED : SHOCK_COLORS.INACTIVE,
      fillOpacity: hasShock ? VISUALIZATION_PARAMS.PROPAGATION_OPACITY : 0.3
    };
  }, [processedShocks, selectedRegion, theme]);

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
              opacity: shock.opacity,
              fillOpacity: shock.opacity * 0.8
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
                  label: 'Severity',
                  value: shock.severity.toUpperCase()
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
