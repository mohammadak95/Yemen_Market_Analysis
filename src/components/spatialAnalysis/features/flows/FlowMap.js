import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GeoJSON, Polyline, CircleMarker } from 'react-leaflet';
import chroma from 'chroma-js';

import Legend from '../../atoms/Legend';
import Tooltip from '../../atoms/Tooltip';
import MapControls from '../../molecules/MapControls';
import BaseMap from '../../molecules/BaseMap';
import { safeGeoJSONProcessor } from '../../utils/geoJSONProcessor';
import { transformRegionName, getRegionCoordinates } from '../../utils/spatialUtils';

const FlowMap = ({
  flows,
  geometry,
  selectedFlow,
  onFlowSelect,
  height = '100%'
}) => {
  const theme = useTheme();

  // Create color scale for flow strength
  const colorScale = useMemo(() => 
    chroma.scale(['#fde0dd', '#c51b8a']).domain([0, 1]),
    []
  );

  // Process flow data with coordinates
  const processedFlows = useMemo(() => {
    if (!flows?.length) return [];

    const maxFlow = Math.max(...flows.map(f => f.total_flow || 0));
    
    return flows.map(flow => {
      const sourceCoords = getRegionCoordinates(flow.source);
      const targetCoords = getRegionCoordinates(flow.target);

      if (!sourceCoords || !targetCoords) return null;

      const normalizedFlow = maxFlow > 0 ? (flow.total_flow || 0) / maxFlow : 0;
      
      return {
        ...flow,
        sourceCoords,
        targetCoords,
        color: colorScale(normalizedFlow).hex(),
        width: 1 + (normalizedFlow * 4), // Scale line width based on flow strength
        normalizedFlow
      };
    }).filter(Boolean);
  }, [flows, colorScale]);

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

    return safeGeoJSONProcessor(validatedGeoJSON, 'flows');
  }, [geometry]);

  // Style function for regions
  const getRegionStyle = useCallback((feature) => {
    if (!feature?.properties?.normalizedName) return {};

    const isEndpoint = processedFlows.some(flow => 
      transformRegionName(flow.source) === feature.properties.normalizedName ||
      transformRegionName(flow.target) === feature.properties.normalizedName
    );
    
    return {
      fillColor: isEndpoint ? theme.palette.primary.light : theme.palette.grey[300],
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: isEndpoint ? 0.6 : 0.3
    };
  }, [processedFlows, theme]);

  // Create legend items
  const legendItems = useMemo(() => [
    { color: '#c51b8a', label: 'High Flow' },
    { color: '#fde0dd', label: 'Low Flow' },
    { 
      color: theme.palette.primary.light, 
      label: 'Market Point',
      style: { borderRadius: '50%' }
    }
  ], [theme]);

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

  if (!processedFlows.length) {
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
          No flow data available for visualization
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
        />

        {/* Flow lines and market points */}
        {processedFlows.map((flow, index) => {
          const isSelected = selectedFlow && 
            selectedFlow.source === flow.source && 
            selectedFlow.target === flow.target;

          return (
            <React.Fragment key={index}>
              {/* Flow line */}
              <Polyline
                positions={[
                  [flow.sourceCoords[1], flow.sourceCoords[0]],
                  [flow.targetCoords[1], flow.targetCoords[0]]
                ]}
                pathOptions={{
                  color: flow.color,
                  weight: isSelected ? flow.width * 2 : flow.width,
                  opacity: isSelected ? 0.8 : 0.5
                }}
                eventHandlers={{
                  click: () => onFlowSelect(flow)
                }}
              >
                <Tooltip
                  title="Market Flow"
                  metrics={[
                    {
                      label: 'Source',
                      value: flow.source
                    },
                    {
                      label: 'Target',
                      value: flow.target
                    },
                    {
                      label: 'Flow Volume',
                      value: flow.total_flow,
                      format: 'number'
                    },
                    {
                      label: 'Price Differential',
                      value: flow.price_differential || 0,
                      format: 'percentage'
                    }
                  ]}
                />
              </Polyline>

              {/* Market points */}
              {[
                { coords: flow.sourceCoords, name: flow.source },
                { coords: flow.targetCoords, name: flow.target }
              ].map((point, idx) => (
                <CircleMarker
                  key={`${index}-${idx}`}
                  center={[point.coords[1], point.coords[0]]}
                  radius={6}
                  pathOptions={{
                    fillColor: theme.palette.primary.light,
                    color: 'white',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.6
                  }}
                >
                  <Tooltip
                    title={point.name}
                    content="Market Location"
                  />
                </CircleMarker>
              ))}
            </React.Fragment>
          );
        })}
      </BaseMap>

      <MapControls
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onReset={() => {}}
        onRefresh={() => {}}
      />

      <Legend
        title="Market Flows"
        items={legendItems}
      />
    </Box>
  );
};

FlowMap.propTypes = {
  flows: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    total_flow: PropTypes.number,
    price_differential: PropTypes.number
  })).isRequired,
  geometry: PropTypes.shape({
    unified: PropTypes.shape({
      features: PropTypes.array
    }),
    polygons: PropTypes.array,
    points: PropTypes.array
  }).isRequired,
  selectedFlow: PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired
  }),
  onFlowSelect: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default React.memo(FlowMap);
