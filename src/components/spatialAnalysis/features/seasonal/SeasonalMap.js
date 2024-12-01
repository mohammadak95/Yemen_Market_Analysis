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

const SeasonalMap = ({
  timeSeriesData,
  geometry,
  selectedRegion,
  onRegionSelect,
  selectedMonth,
  seasonalMetrics,
  height = '100%'
}) => {
  const theme = useTheme();

  // Create color scales
  const priceColorScale = useMemo(() => 
    chroma.scale(['#edf8e9', '#006d2c']).domain([0, 1]),
    []
  );

  const seasonalityColorScale = useMemo(() => 
    chroma.scale(['#f7fbff', '#08519c']).domain([0, 1]),
    []
  );

  // Process market data with seasonal patterns
  const processedData = useMemo(() => {
    if (!timeSeriesData?.length) return null;

    // Filter data by selected month if provided
    const monthData = selectedMonth ? 
      timeSeriesData.filter(d => d.month === selectedMonth) : 
      timeSeriesData;

    if (!monthData.length) return null;

    // Calculate max values for normalization
    const maxPrice = Math.max(...monthData.map(d => d.usdPrice || 0));
    const maxSeasonality = seasonalMetrics?.seasonalStrength || 1;

    // Process market data
    return monthData.map(data => {
      const coords = getRegionCoordinates(data.region);
      if (!coords) return null;

      // Get regional seasonal pattern
      const regionalPattern = seasonalMetrics?.regionalPatterns?.[data.region] || {
        seasonalStrength: 0,
        meanPrice: 0,
        variance: 0
      };

      const normalizedPrice = maxPrice > 0 ? 
        (data.usdPrice || 0) / maxPrice : 0;
      const normalizedSeasonality = maxSeasonality > 0 ? 
        regionalPattern.seasonalStrength / maxSeasonality : 0;

      return {
        ...data,
        coordinates: coords,
        normalizedPrice,
        normalizedSeasonality,
        priceColor: priceColorScale(normalizedPrice).hex(),
        seasonalityColor: seasonalityColorScale(normalizedSeasonality).hex(),
        seasonalMetrics: regionalPattern
      };
    }).filter(Boolean);
  }, [timeSeriesData, selectedMonth, seasonalMetrics, priceColorScale, seasonalityColorScale]);

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

    return safeGeoJSONProcessor(validatedGeoJSON, 'seasonal');
  }, [geometry]);

  // Style function for regions
  const getRegionStyle = useCallback((feature) => {
    if (!processedData) return {};

    const regionData = processedData.find(d => 
      transformRegionName(d.region) === feature.properties.normalizedName
    );

    const isSelected = selectedRegion === feature.properties.region_id;
    
    return {
      fillColor: regionData?.seasonalityColor || theme.palette.grey[300],
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? theme.palette.secondary.main : 'white',
      fillOpacity: regionData ? 0.7 : 0.3
    };
  }, [processedData, selectedRegion, theme]);

  // Create legend items
  const legendItems = useMemo(() => [
    { color: '#006d2c', label: 'High Price' },
    { color: '#edf8e9', label: 'Low Price' },
    { color: '#08519c', label: 'Strong Seasonality' },
    { color: '#f7fbff', label: 'Weak Seasonality' },
    { 
      color: theme.palette.secondary.main, 
      label: 'Selected Region',
      style: { borderWidth: 2 }
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
          No seasonal data available for visualization
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
                      label: 'Current Price',
                      value: regionData.usdPrice,
                      format: 'currency'
                    },
                    {
                      label: 'Seasonality',
                      value: regionData.seasonalMetrics.seasonalStrength,
                      format: 'percentage'
                    },
                    {
                      label: 'Price Trend',
                      value: regionData.priceChange,
                      format: 'percentage'
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
              fillColor: data.priceColor,
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
                  label: 'Seasonal Pattern',
                  value: data.seasonalMetrics.seasonalStrength > 0.5 ? 'Strong' : 'Weak'
                },
                {
                  label: 'Monthly Change',
                  value: data.priceChange,
                  format: 'percentage'
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
        title="Seasonal Patterns"
        items={legendItems}
      />
    </Box>
  );
};

SeasonalMap.propTypes = {
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
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
  selectedMonth: PropTypes.string,
  seasonalMetrics: PropTypes.shape({
    seasonalStrength: PropTypes.number,
    trendStrength: PropTypes.number,
    seasonalPattern: PropTypes.arrayOf(PropTypes.number),
    regionalPatterns: PropTypes.object
  }),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default React.memo(SeasonalMap);
