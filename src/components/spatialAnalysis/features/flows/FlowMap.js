/**
 * Market Flow Map Component
 * 
 * Visualizes market flows using a geographic map with flow lines and market points.
 * Features include:
 * - Dynamic flow line styling based on volume
 * - Interactive tooltips with flow metrics
 * - Market point visualization
 * - Comprehensive legend
 */

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GeoJSON, Polyline, CircleMarker } from 'react-leaflet';
import chroma from 'chroma-js';

import Legend from '../../atoms/Legend';
import Tooltip from '../../atoms/Tooltip';
import MapControls from '../../molecules/MapControls';
import BaseMap from '../../molecules/BaseMap';
import { safeGeoJSONProcessor } from '../../utils/geoJSONProcessor';
import { transformRegionName, getRegionCoordinates } from '../../utils/spatialUtils';
import { 
  FLOW_COLORS, 
  VISUALIZATION_PARAMS,
  FLOW_THRESHOLDS,
  FLOW_STATUS 
} from './types';

// Default map view settings if none provided
const DEFAULT_VIEW = {
  center: [15.3694, 44.191], // Yemen center
  zoom: 6
};

const FlowMap = ({
  flows,
  geometry,
  selectedFlow,
  onFlowSelect,
  height = '100%',
  defaultView = DEFAULT_VIEW
}) => {
  const theme = useTheme();

  // Create color scale for flow strength with error handling
  const colorScale = useMemo(() => {
    try {
      return chroma.scale([FLOW_COLORS.NEUTRAL, FLOW_COLORS.POSITIVE])
        .domain([0, 1])
        .mode('lch');
    } catch (error) {
      console.error('Error creating color scale:', error);
      return value => FLOW_COLORS.NEUTRAL;
    }
  }, []);

  // Process flow data with enhanced error handling and validation
  const processedFlows = useMemo(() => {
    if (!Array.isArray(flows) || !flows.length) {
      console.warn('Invalid or empty flows data');
      return [];
    }

    try {
      const maxFlow = Math.max(...flows.map(f => f.total_flow || 0));
      
      return flows.map(flow => {
        // Validate required fields
        if (!flow.source || !flow.target) {
          console.warn('Invalid flow data:', flow);
          return null;
        }

        const sourceCoords = getRegionCoordinates(flow.source);
        const targetCoords = getRegionCoordinates(flow.target);

        if (!sourceCoords || !targetCoords) {
          console.warn(`Missing coordinates for flow: ${flow.source} -> ${flow.target}`);
          return null;
        }

        const normalizedFlow = maxFlow > 0 ? (flow.total_flow || 0) / maxFlow : 0;
        const flowStatus = getFlowStatus(normalizedFlow);
        
        return {
          ...flow,
          sourceCoords,
          targetCoords,
          color: colorScale(normalizedFlow).hex(),
          width: VISUALIZATION_PARAMS.MIN_FLOW_WIDTH + 
            (normalizedFlow * (VISUALIZATION_PARAMS.MAX_FLOW_WIDTH - VISUALIZATION_PARAMS.MIN_FLOW_WIDTH)),
          opacity: VISUALIZATION_PARAMS.MIN_OPACITY + 
            (normalizedFlow * (VISUALIZATION_PARAMS.MAX_OPACITY - VISUALIZATION_PARAMS.MIN_OPACITY)),
          normalizedFlow,
          status: flowStatus
        };
      }).filter(Boolean);
    } catch (error) {
      console.error('Error processing flows:', error);
      return [];
    }
  }, [flows, colorScale]);

  // Process GeoJSON with enhanced validation
  const processedGeoJSON = useMemo(() => {
    if (!geometry) {
      console.warn('Missing geometry data');
      return null;
    }

    try {
      const features = geometry.unified?.features || [
        ...(geometry.polygons || []),
        ...(geometry.points || [])
      ];

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
          geometry: validateGeometry(feature.geometry)
        })),
        crs: {
          type: 'name',
          properties: { name: 'EPSG:4326' }
        }
      };

      return safeGeoJSONProcessor(validatedGeoJSON, 'flows');
    } catch (error) {
      console.error('Error processing GeoJSON:', error);
      return null;
    }
  }, [geometry]);

  // Enhanced region styling with flow status
  const getRegionStyle = useCallback((feature) => {
    if (!feature?.properties?.normalizedName) return {};

    const regionFlows = processedFlows.filter(flow => 
      transformRegionName(flow.source) === feature.properties.normalizedName ||
      transformRegionName(flow.target) === feature.properties.normalizedName
    );

    const isActive = regionFlows.length > 0;
    const avgFlow = isActive ? 
      regionFlows.reduce((sum, f) => sum + f.normalizedFlow, 0) / regionFlows.length : 
      0;

    return {
      fillColor: isActive ? theme.palette.primary.light : theme.palette.grey[300],
      weight: isActive ? 1.5 : 1,
      opacity: 1,
      color: 'white',
      fillOpacity: isActive ? 0.4 + (avgFlow * 0.4) : 0.3,
      dashArray: isActive ? null : '3'
    };
  }, [processedFlows, theme]);

  // Enhanced legend with flow status
  const legendItems = useMemo(() => [
    { 
      color: FLOW_COLORS.POSITIVE, 
      label: 'High Flow',
      description: `Flow strength > ${FLOW_THRESHOLDS.HIGH * 100}%`
    },
    { 
      color: colorScale(0.5).hex(), 
      label: 'Medium Flow',
      description: `Flow strength ${FLOW_THRESHOLDS.MEDIUM * 100}% - ${FLOW_THRESHOLDS.HIGH * 100}%`
    },
    { 
      color: FLOW_COLORS.NEUTRAL, 
      label: 'Low Flow',
      description: `Flow strength < ${FLOW_THRESHOLDS.MEDIUM * 100}%`
    },
    { 
      color: theme.palette.primary.light, 
      label: 'Market Point',
      style: { borderRadius: '50%' },
      description: 'Active market location'
    }
  ], [theme, colorScale]);

  // Error states
  if (!processedGeoJSON) {
    return (
      <Box 
        sx={{ 
          height,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 2
        }}
      >
        <Typography color="error">
          Error loading geographic data. Please check the data format and try again.
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
          borderRadius: 1,
          p: 2
        }}
      >
        <Typography color="text.secondary">
          No market flow data available for the selected period.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      <BaseMap 
        height={height}
        defaultView={defaultView}
        defaultBounds={processedGeoJSON?.bbox}
      >
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
                  color: isSelected ? FLOW_COLORS.SELECTED : flow.color,
                  weight: isSelected ? flow.width * 1.5 : flow.width,
                  opacity: isSelected ? flow.opacity * 1.2 : flow.opacity,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => onFlowSelect(flow),
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: flow.width * 1.2,
                      opacity: flow.opacity * 1.1
                    });
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: isSelected ? flow.width * 1.5 : flow.width,
                      opacity: isSelected ? flow.opacity * 1.2 : flow.opacity
                    });
                  }
                }}
              >
                <Tooltip
                  title="Market Flow Details"
                  metrics={[
                    {
                      label: 'Source Market',
                      value: flow.source
                    },
                    {
                      label: 'Target Market',
                      value: flow.target
                    },
                    {
                      label: 'Flow Volume',
                      value: flow.total_flow,
                      format: 'number'
                    },
                    {
                      label: 'Flow Strength',
                      value: flow.normalizedFlow,
                      format: 'percentage'
                    },
                    {
                      label: 'Price Differential',
                      value: flow.price_differential || 0,
                      format: 'percentage'
                    },
                    {
                      label: 'Status',
                      value: flow.status
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
                  radius={isSelected ? 8 : 6}
                  pathOptions={{
                    fillColor: theme.palette.primary.light,
                    color: 'white',
                    weight: 1.5,
                    opacity: 0.9,
                    fillOpacity: 0.7
                  }}
                >
                  <Tooltip
                    title={point.name}
                    content="Market Location"
                    metrics={[
                      {
                        label: 'Total Flows',
                        value: getMarketFlowCount(point.name, processedFlows),
                        format: 'integer'
                      }
                    ]}
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
        title="Market Flow Analysis"
        items={legendItems}
      />
    </Box>
  );
};

// Helper functions
function validateGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return {
      type: 'Polygon',
      coordinates: []
    };
  }
  return {
    type: geometry.type,
    coordinates: geometry.coordinates
  };
}

function getFlowStatus(normalizedFlow) {
  if (normalizedFlow >= FLOW_THRESHOLDS.HIGH) return FLOW_STATUS.ACTIVE;
  if (normalizedFlow >= FLOW_THRESHOLDS.MEDIUM) return FLOW_STATUS.STABLE;
  if (normalizedFlow >= FLOW_THRESHOLDS.LOW) return FLOW_STATUS.PARTIAL;
  return FLOW_STATUS.INACTIVE;
}

function getMarketFlowCount(marketName, flows) {
  return flows.filter(flow => 
    flow.source === marketName || flow.target === marketName
  ).length;
}

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
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultView: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number),
    zoom: PropTypes.number
  })
};

export default React.memo(FlowMap);
