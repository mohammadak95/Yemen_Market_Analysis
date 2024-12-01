import React, { useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import chroma from 'chroma-js';

import Legend from '../atoms/Legend';
import Tooltip from '../atoms/Tooltip';
import MapControls from '../molecules/MapControls';
import { transformRegionName } from '../utils/spatialUtils';

// Map bounds control component
const MapBoundsControl = ({ geometry }) => {
  const map = useMap();

  React.useEffect(() => {
    if (geometry?.features?.length) {
      const bounds = L.geoJSON(geometry).getBounds();
      map.fitBounds(bounds);
    }
  }, [map, geometry]);

  return null;
};

const FlowMap = ({
  flows = [],
  geometry,
  selectedFlow,
  onFlowSelect,
  height = '100%'
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);

  // Create color scale for flow strength
  const colorScale = useMemo(() => 
    chroma.scale(['#fde0dd', '#c51b8a']).domain([0, 1]),
    []
  );

  // Process flow data with coordinates
  const processedFlows = useMemo(() => {
    if (!flows?.length || !geometry?.features) return [];

    const maxFlow = Math.max(...flows.map(f => f.total_flow || 0));
    
    return flows.map(flow => {
      const sourceFeature = geometry.features.find(f => 
        f.properties.normalizedName === transformRegionName(flow.source)
      );
      const targetFeature = geometry.features.find(f => 
        f.properties.normalizedName === transformRegionName(flow.target)
      );

      if (!sourceFeature?.geometry?.coordinates || !targetFeature?.geometry?.coordinates) {
        return null;
      }

      const normalizedFlow = flow.total_flow / maxFlow;
      
      return {
        ...flow,
        sourceCoords: sourceFeature.geometry.coordinates,
        targetCoords: targetFeature.geometry.coordinates,
        color: colorScale(normalizedFlow).hex(),
        width: 1 + (normalizedFlow * 4), // Scale line width based on flow strength
        normalizedFlow
      };
    }).filter(Boolean);
  }, [flows, geometry, colorScale]);

  // Style function for regions
  const getFeatureStyle = useCallback((feature) => {
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

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleReset = useCallback(() => {
    if (geometry?.features?.length) {
      const bounds = L.geoJSON(geometry).getBounds();
      mapRef.current?.fitBounds(bounds);
    }
  }, [geometry]);

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

  if (!processedFlows.length || !geometry) {
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
      <MapContainer
        ref={mapRef}
        center={[15.3694, 44.191]} // Yemen's approximate center
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        <MapBoundsControl geometry={geometry} />

        <GeoJSON
          data={geometry}
          style={getFeatureStyle}
        />

        {processedFlows.map((flow, index) => {
          const isSelected = selectedFlow && 
            selectedFlow.source === flow.source && 
            selectedFlow.target === flow.target;

          return (
            <React.Fragment key={index}>
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
                  click: () => onFlowSelect?.(flow)
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
      </MapContainer>

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
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
  })),
  geometry: PropTypes.shape({
    type: PropTypes.string,
    features: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  selectedFlow: PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired
  }),
  onFlowSelect: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default React.memo(FlowMap);
