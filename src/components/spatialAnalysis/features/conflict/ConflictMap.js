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

const ConflictMap = ({
  timeSeriesData,
  geometry,
  selectedRegion,
  onRegionSelect,
  timeWindow,
  height = '100%'
}) => {
  const theme = useTheme();

  // Create color scales
  const conflictColorScale = useMemo(() => 
    chroma.scale(['#fee5d9', '#a50f15']).domain([0, 1]),
    []
  );

  const marketColorScale = useMemo(() => 
    chroma.scale(['#edf8e9', '#006d2c']).domain([0, 1]),
    []
  );

  // Process market data with conflict intensity
  const processedData = useMemo(() => {
    if (!timeSeriesData?.length) return null;

    // Filter data by time window if provided
    const currentData = timeWindow ? 
      timeSeriesData.filter(d => d.month === timeWindow) : 
      timeSeriesData;

    if (!currentData.length) return null;

    // Calculate max values for normalization
    const maxIntensity = Math.max(...currentData.map(d => d.conflictIntensity || 0));
    const maxPrice = Math.max(...currentData.map(d => d.usdPrice || 0));

    // Process market data
    return currentData.map(data => {
      const coords = getRegionCoordinates(data.region);
      if (!coords) return null;

      const normalizedIntensity = maxIntensity > 0 ? 
        (data.conflictIntensity || 0) / maxIntensity : 0;
      const normalizedPrice = maxPrice > 0 ? 
        (data.usdPrice || 0) / maxPrice : 0;

      return {
        ...data,
        coordinates: coords,
        normalizedIntensity,
        normalizedPrice,
        conflictColor: conflictColorScale(normalizedIntensity).hex(),
        marketColor: marketColorScale(normalizedPrice).hex()
      };
    }).filter(Boolean);
  }, [timeSeriesData, timeWindow, conflictColorScale, marketColorScale]);

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

    return safeGeoJSONProcessor(validatedGeoJSON, 'conflict');
  }, [geometry]);

  // Style function for regions
  const getRegionStyle = useCallback((feature) => {
    if (!processedData) return {};

    const regionData = processedData.find(d => 
      transformRegionName(d.region) === feature.properties.normalizedName
    );

    const isSelected = selectedRegion === feature.properties.region_id;
    
    return {
      fillColor: regionData?.conflictColor || theme.palette.grey[300],
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.secondary.main : 'white',
      fillOpacity: regionData ? 0.7 : 0.3
    };
  }, [processedData, selectedRegion, theme]);

  // Create legend items
  const legendItems = useMemo(() => [
    { color: '#a50f15', label: 'High Conflict' },
    { color: '#fee5d9', label: 'Low Conflict' },
    { 
      color: theme.palette.secondary.main, 
      label: 'Selected Region',
      style: { borderWidth: 2 }
    },
    {
      color: '#006d2c',
      label: 'High Market Activity',
      style: { borderRadius: '50%' }
    },
    {
      color: '#edf8e9',
      label: 'Low Market Activity',
      style: { borderRadius: '50%' }
    }
  ], [theme]);

  if (!processedData || !processedGeoJSON) {
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
          No conflict data available for visualization
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

            const regionData = processedData.find(d => 
              transformRegionName(d.region) === feature.properties.normalizedName
            );

            if (regionData) {
              layer.bindTooltip(() => (
                <Tooltip
                  title={feature.properties.originalName}
                  metrics={[
                    {
                      label: 'Conflict Intensity',
                      value: regionData.conflictIntensity,
                      format: 'number'
                    },
                    {
                      label: 'Market Price',
                      value: regionData.usdPrice,
                      format: 'currency'
                    },
                    {
                      label: 'Market Status',
                      value: regionData.conflictIntensity > 0.5 ? 
                        'Severely Affected' : 'Operational'
                    }
                  ]}
                />
              ), { sticky: true });
            }
          }}
        />

        {/* Market points */}
        {processedData.map((data, index) => (
          <CircleMarker
            key={index}
            center={[data.coordinates[1], data.coordinates[0]]}
            radius={6}
            pathOptions={{
              fillColor: data.marketColor,
              color: 'white',
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
          >
            <Tooltip
              title={data.region}
              metrics={[
                {
                  label: 'Market Price',
                  value: data.usdPrice,
                  format: 'currency'
                },
                {
                  label: 'Price Change',
                  value: data.priceChange,
                  format: 'percentage'
                },
                {
                  label: 'Market Status',
                  value: data.marketStatus
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
        title="Conflict Impact"
        items={legendItems}
      />
    </Box>
  );
};

ConflictMap.propTypes = {
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
    conflictIntensity: PropTypes.number,
    usdPrice: PropTypes.number
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
  timeWindow: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default React.memo(ConflictMap);
