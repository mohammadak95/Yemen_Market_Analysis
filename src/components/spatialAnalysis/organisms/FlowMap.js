// src/components/spatialAnalysis/organisms/FlowMap.js

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import chroma from 'chroma-js';
import L from 'leaflet';

import Legend from '../atoms/Legend';
import TooltipComponent from '../atoms/Tooltip';
import MapControls from '../molecules/MapControls';
import { transformRegionName } from '../utils/spatialUtils';

// LISA cluster color mapping (Assuming similar color mapping needed)
const LISA_COLORS = {
  'high-high': '#d7191c', // Red for hot spots
  'low-low': '#2c7bb6', // Blue for cold spots
  'high-low': '#fdae61', // Orange for high-low outliers
  'low-high': '#abd9e9', // Light blue for low-high outliers
  'not-significant': '#eeeeee', // Grey for not significant
};

// Further adjusted default map settings for a more zoomed-out view
const DEFAULT_CENTER = [15.3694, 44.191]; // Yemen's geographical center
const DEFAULT_ZOOM = 3; // Further reduced zoom level for a more zoomed-out view
const BUFFER = 4; // Increased buffer around Yemen
const DEFAULT_BOUNDS = [
  [12.1110 - BUFFER, 41.8140 - BUFFER], // Southwest corner with increased buffer
  [19.0025 + BUFFER, 54.5305 + BUFFER], // Northeast corner with increased buffer
];

// Map reset component
const MapReset = () => {
  const map = useMap();

  useEffect(() => {
    const resetTimeout = setTimeout(() => {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      map.fitBounds(DEFAULT_BOUNDS);
    }, 100);

    const resetView = () => {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      map.fitBounds(DEFAULT_BOUNDS);
    };

    map.on('mouseout', resetView);
    map.on('dragend', () => {
      if (!map.getBounds().intersects(DEFAULT_BOUNDS)) {
        resetView();
      }
    });

    return () => {
      clearTimeout(resetTimeout);
      map.off('mouseout', resetView);
      map.off('dragend', resetView);
    };
  }, [map]);

  return null;
};

const FlowMap = ({
  flows = [],
  geometry,
  selectedFlow,
  onFlowSelect,
  height = '100%',
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);

  // Create color scale for flow strength
  const colorScale = useMemo(
    () =>
      chroma
        .scale(['#fde0dd', '#c51b8a'])
        .domain([0, 1]),
    []
  );

  // Process flow data with coordinates
  const processedFlows = useMemo(() => {
    if (!flows?.length || !geometry?.features) return [];

    const maxFlow = Math.max(...flows.map((f) => f.total_flow || 0));

    return flows
      .map((flow) => {
        const sourceFeature = geometry.features.find(
          (f) =>
            f.properties.normalizedName ===
            transformRegionName(flow.source)
        );
        const targetFeature = geometry.features.find(
          (f) =>
            f.properties.normalizedName ===
            transformRegionName(flow.target)
        );

        if (
          !sourceFeature?.geometry?.coordinates ||
          !targetFeature?.geometry?.coordinates
        ) {
          return null;
        }

        const normalizedFlow = flow.total_flow / maxFlow;

        return {
          ...flow,
          sourceCoords: sourceFeature.geometry.coordinates,
          targetCoords: targetFeature.geometry.coordinates,
          color: colorScale(normalizedFlow).hex(),
          width: 1 + normalizedFlow * 4, // Scale line width based on flow strength
          normalizedFlow,
        };
      })
      .filter(Boolean);
  }, [flows, geometry, colorScale]);

  // Style function for regions
  const getFeatureStyle = useCallback(
    (feature) => {
      const isEndpoint = processedFlows.some(
        (flow) =>
          transformRegionName(flow.source) ===
            feature.properties.normalizedName ||
          transformRegionName(flow.target) ===
            feature.properties.normalizedName
      );

      return {
        fillColor: isEndpoint
          ? theme.palette.primary.light
          : theme.palette.grey[300],
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: isEndpoint ? 0.6 : 0.3,
      };
    },
    [processedFlows, theme]
  );

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
  const legendItems = useMemo(
    () => [
      { color: '#c51b8a', label: 'High Flow' },
      { color: '#fde0dd', label: 'Low Flow' },
      {
        color: theme.palette.primary.light,
        label: 'Market Point',
        style: { borderRadius: '50%' },
      },
    ],
    [theme]
  );

  if (!processedFlows.length || !geometry) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
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
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        bounds={DEFAULT_BOUNDS}
        style={{ height: '100%', width: '100%' }}
        maxBounds={DEFAULT_BOUNDS}
        minZoom={DEFAULT_ZOOM - 1} // Adjusted minZoom for flexibility
        maxZoom={DEFAULT_ZOOM + 7} // Increased maxZoom for more detail when zoomed in
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={true} // Enabled scroll wheel zoom
        boxZoom={true}
        keyboard={true}
        bounceAtZoomLimits={true}
        worldCopyJump={false}
        preferCanvas={true}
      >
        <MapReset />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <GeoJSON data={geometry} style={getFeatureStyle} />

        {processedFlows.map((flow, index) => {
          const isSelected =
            selectedFlow &&
            selectedFlow.source === flow.source &&
            selectedFlow.target === flow.target;

          return (
            <React.Fragment key={index}>
              <Polyline
                positions={[
                  [flow.sourceCoords[1], flow.sourceCoords[0]],
                  [flow.targetCoords[1], flow.targetCoords[0]],
                ]}
                pathOptions={{
                  color: flow.color,
                  weight: isSelected ? flow.width * 2 : flow.width,
                  opacity: isSelected ? 0.8 : 0.5,
                }}
                eventHandlers={{
                  click: () => onFlowSelect?.(flow),
                }}
              >
                <TooltipComponent
                  title="Market Flow"
                  metrics={[
                    {
                      label: 'Source',
                      value: flow.source,
                    },
                    {
                      label: 'Target',
                      value: flow.target,
                    },
                    {
                      label: 'Flow Volume',
                      value: flow.total_flow,
                      format: 'number',
                    },
                    {
                      label: 'Price Differential',
                      value: flow.price_differential || 0,
                      format: 'percentage',
                    },
                  ]}
                />
              </Polyline>

              {/* Market points */}
              {[
                { coords: flow.sourceCoords, name: flow.source },
                { coords: flow.targetCoords, name: flow.target },
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
                    fillOpacity: 0.6,
                  }}
                >
                  <TooltipComponent
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

      <Legend title="Market Flows" items={legendItems} />
    </Box>
  );
};

FlowMap.propTypes = {
  flows: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      target: PropTypes.string.isRequired,
      total_flow: PropTypes.number,
      price_differential: PropTypes.number,
    })
  ),
  geometry: PropTypes.shape({
    type: PropTypes.string,
    features: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  selectedFlow: PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
  }),
  onFlowSelect: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(FlowMap);