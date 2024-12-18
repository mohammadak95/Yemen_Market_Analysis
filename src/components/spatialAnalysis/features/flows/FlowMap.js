// src/components/spatialAnalysis/features/flows/FlowMap.js

import React, { useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Box, Typography, CircularProgress } from '@mui/material';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import chroma from 'chroma-js';
import 'leaflet/dist/leaflet.css';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

import Legend from '../../atoms/Legend';
import MapControls from '../../molecules/MapControls';
import {
  FLOW_COLORS,
  VISUALIZATION_PARAMS,
  flowValidation
} from './types';
import { YEMEN_COORDINATES } from '../../../../selectors/optimizedSelectors';
import { selectFlowMetadata, selectFlowStatus } from '../../../../slices/flowSlice';

import './FlowMapTransitions.css';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 5;
const YEMEN_BOUNDS = [
  [12.1110 - 2, 41.8140 - 2],
  [19.0025 + 2, 54.5305 + 2]
];

// Map Controls Component with proper event handling
const MapControlHandlers = ({ mapRef, defaultView }) => {
  const map = useMap();

  const handleMapAction = useCallback((action) => {
    if (!mapRef.current) return;

    switch(action) {
      case 'zoomIn':
        mapRef.current.setZoom(Math.min((mapRef.current.getZoom() || 0) + 1, 8));
        break;
      case 'zoomOut':
        mapRef.current.setZoom(Math.max((mapRef.current.getZoom() || 0) - 1, 5));
        break;
      case 'reset':
        mapRef.current.setView(defaultView.center, defaultView.zoom);
        mapRef.current.fitBounds(YEMEN_BOUNDS);
        break;
      case 'refresh':
        mapRef.current.invalidateSize();
        break;
      default:
        console.warn('Unknown map action:', action);
    }
  }, [mapRef, defaultView, map]);

  return (
    <MapControls
      onZoomIn={(e) => {
        e.preventDefault();
        handleMapAction('zoomIn');
      }}
      onZoomOut={(e) => {
        e.preventDefault();
        handleMapAction('zoomOut');
      }}
      onReset={(e) => {
        e.preventDefault();
        handleMapAction('reset');
      }}
      onRefresh={(e) => {
        e.preventDefault();
        handleMapAction('refresh');
      }}
    />
  );
};

const FlowMap = ({
  flows = [],
  selectedFlow,
  onFlowSelect,
  height = '100%',
  defaultView = { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
}) => {
  const mapRef = useRef(null);
  const { commodity } = useSelector(selectFlowMetadata);
  const { loading, error } = useSelector(selectFlowStatus);

  // Create color scale with error handling
  const colorScale = useMemo(() => {
    try {
      return chroma.scale([FLOW_COLORS.NEUTRAL, FLOW_COLORS.POSITIVE])
        .domain([0, 1])
        .mode('lch');
    } catch (error) {
      console.error('Error creating color scale:', error);
      return () => FLOW_COLORS.NEUTRAL;
    }
  }, []);

  // Process market and flow data with proper validation
  const { markets, connections } = useMemo(() => {
    if (!Array.isArray(flows)) {
      console.warn('Invalid flows data provided');
      return { markets: new Map(), connections: [] };
    }

    const marketMap = new Map();
    const processedFlows = [];

    // Process flows and build market data
    flows.forEach(flow => {
      if (!flowValidation.isValidFlow(flow)) return;

      const sourceCoords = YEMEN_COORDINATES[flow.source?.toLowerCase()];
      const targetCoords = YEMEN_COORDINATES[flow.target?.toLowerCase()];

      if (!sourceCoords || !targetCoords) {
        console.debug('Missing coordinates for flow:', { 
          source: flow.source, 
          target: flow.target 
        });
        return;
      }

      // Update source market data
      if (!marketMap.has(flow.source)) {
        marketMap.set(flow.source, {
          id: flow.source,
          name: flow.source,
          coordinates: sourceCoords,
          totalFlow: 0,
          incomingFlows: 0,
          outgoingFlows: 0
        });
      }
      const sourceMarket = marketMap.get(flow.source);
      sourceMarket.totalFlow += flow.flow_weight;
      sourceMarket.outgoingFlows += 1;

      // Update target market data
      if (!marketMap.has(flow.target)) {
        marketMap.set(flow.target, {
          id: flow.target,
          name: flow.target,
          coordinates: targetCoords,
          totalFlow: 0,
          incomingFlows: 0,
          outgoingFlows: 0
        });
      }
      const targetMarket = marketMap.get(flow.target);
      targetMarket.totalFlow += flow.flow_weight;
      targetMarket.incomingFlows += 1;

      // Process flow for visualization
      processedFlows.push({
        ...flow,
        coordinates: {
          source: sourceCoords,
          target: targetCoords
        }
      });
    });

    // Calculate normalized values and visual properties
    const maxFlow = Math.max(...processedFlows.map(f => f.flow_weight), 0);
    const connections = processedFlows.map(flow => {
      const normalizedFlow = flowValidation.normalizeFlow(flow, maxFlow);
      return {
        ...flow,
        color: colorScale(normalizedFlow).hex(),
        width: VISUALIZATION_PARAMS.MIN_FLOW_WIDTH +
          (normalizedFlow * (VISUALIZATION_PARAMS.MAX_FLOW_WIDTH - VISUALIZATION_PARAMS.MIN_FLOW_WIDTH)),
        opacity: VISUALIZATION_PARAMS.MIN_OPACITY +
          (normalizedFlow * (VISUALIZATION_PARAMS.MAX_OPACITY - VISUALIZATION_PARAMS.MIN_OPACITY)),
        normalizedFlow
      };
    });

    return { markets: marketMap, connections };
  }, [flows, colorScale]);

  // Memoize legend items
  const legendItems = useMemo(() => [
    { color: FLOW_COLORS.POSITIVE, label: 'High Flow', description: 'Flow > 70%' },
    { color: colorScale(0.5).hex(), label: 'Medium Flow', description: '40% - 70%' },
    { color: FLOW_COLORS.NEUTRAL, label: 'Low Flow', description: '<40%' },
    {
      color: FLOW_COLORS.NODE.FILL,
      label: 'Market Point',
      style: { borderRadius: '50%', border: `2px solid ${FLOW_COLORS.NODE.BORDER}` },
      description: 'Active market location'
    }
  ], [colorScale]);

  // Event handlers with proper event prevention
  const handleFlowSelect = useCallback((e, flow) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFlowSelect) {
      onFlowSelect(flow);
    }
  }, [onFlowSelect]);

  // Handle loading and error states
  if (loading) {
    return (
      <Box sx={{ 
        height,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 2,
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={40} />
        <Typography>Loading market flows for {commodity}...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        height,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 2
      }}>
        <Typography color="error">
          Error loading market flows: {error}
        </Typography>
      </Box>
    );
  }

  if (!connections.length) {
    return (
      <Box sx={{ 
        height,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 2
      }}>
        <Typography color="text.secondary">
          No valid market flow data available for {commodity}.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      <MapContainer
        center={defaultView.center}
        zoom={defaultView.zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        maxBounds={YEMEN_BOUNDS}
        minZoom={5}
        maxZoom={8}
        scrollWheelZoom={false}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        bounceAtZoomLimits={true}
        worldCopyJump={false}
        preferCanvas={true}
        ref={mapRef}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap, &copy; CARTO'
        />

        <MapControlHandlers mapRef={mapRef} defaultView={defaultView} />

        {/* Market Flows */}
        <TransitionGroup component={null}>
          {connections.map((flow) => {
            const isSelected = selectedFlow &&
              selectedFlow.source === flow.source &&
              selectedFlow.target === flow.target;

            return (
              <CSSTransition
                key={`${flow.source}-${flow.target}`}
                classNames="flow"
                timeout={300}
              >
                <Polyline
                  positions={[
                    [flow.coordinates.source[1], flow.coordinates.source[0]],
                    [flow.coordinates.target[1], flow.coordinates.target[0]]
                  ]}
                  pathOptions={{
                    color: isSelected ? FLOW_COLORS.SELECTED : flow.color,
                    weight: isSelected ? flow.width * VISUALIZATION_PARAMS.SELECTION_SCALE : flow.width,
                    opacity: isSelected ? flow.opacity * VISUALIZATION_PARAMS.SELECTION_SCALE : flow.opacity,
                    lineCap: 'round',
                    lineJoin: 'round',
                    interactive: true
                  }}
                  eventHandlers={{
                    click: (e) => handleFlowSelect(e, flow),
                    mouseover: (e) => {
                      e.preventDefault();
                      e.target.setStyle({ weight: flow.width * 1.5 });
                    },
                    mouseout: (e) => {
                      e.preventDefault();
                      if (!isSelected) {
                        e.target.setStyle({ weight: flow.width });
                      }
                    }
                  }}
                >
                  <Popup>
                    <Box sx={{ p: 1, minWidth: 200 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Market Flow Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2">Source: {flow.source}</Typography>
                        <Typography variant="body2">Target: {flow.target}</Typography>
                        <Typography variant="body2">
                          Flow Volume: {flow.flow_weight.toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                          Flow Strength: {(flow.normalizedFlow * 100).toFixed(1)}%
                        </Typography>
                        {flow.price_differential && (
                          <Typography variant="body2">
                            Price Differential: {flow.price_differential.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Popup>
                </Polyline>
              </CSSTransition>
            );
          })}
        </TransitionGroup>

        {/* Market Points */}
        {Array.from(markets.values()).map((market) => {
          const maxFlow = Math.max(...Array.from(markets.values()).map(m => m.totalFlow));
          const nodeSize = flowValidation.calculateNodeSize(market.totalFlow, maxFlow);

          return (
            <CircleMarker
              key={`market-${market.id}`}
              center={[market.coordinates[1], market.coordinates[0]]}
              radius={nodeSize}
              pathOptions={{
                fillColor: FLOW_COLORS.NODE.FILL,
                color: FLOW_COLORS.NODE.BORDER,
                weight: VISUALIZATION_PARAMS.NODE_BORDER_WIDTH,
                opacity: VISUALIZATION_PARAMS.NODE_BORDER_OPACITY,
                fillOpacity: VISUALIZATION_PARAMS.NODE_OPACITY
              }}
            >
              <Popup>
                <Box sx={{ p: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {market.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2">
                      Total Flow: {market.totalFlow.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Incoming: {market.incomingFlows}
                    </Typography>
                    <Typography variant="body2">
                      Outgoing: {market.outgoingFlows}
                    </Typography>
                  </Box>
                </Box>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <Legend
        title={`Market Flow Analysis - ${commodity}`}
        items={legendItems}
      />
    </Box>
  );
};

FlowMap.propTypes = {
  flows: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      target: PropTypes.string.isRequired,
      flow_weight: PropTypes.number.isRequired,
      price_differential: PropTypes.number,
      metadata: PropTypes.shape({
        valid: PropTypes.bool.isRequired,
        processed_at: PropTypes.string.isRequired
      }).isRequired
    })
  ).isRequired,
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

// Component optimization with proper memo comparison
export default React.memo(FlowMap, (prevProps, nextProps) => {
  // Custom comparison function for efficient re-rendering
  if (prevProps.height !== nextProps.height) return false;
  if (prevProps.flows.length !== nextProps.flows.length) return false;
  
  // Compare selectedFlow
  const prevSelected = prevProps.selectedFlow;
  const nextSelected = nextProps.selectedFlow;
  if ((!prevSelected && nextSelected) || (prevSelected && !nextSelected)) return false;
  if (prevSelected && nextSelected) {
    if (prevSelected.source !== nextSelected.source || 
        prevSelected.target !== nextSelected.target) return false;
  }

  // Compare defaultView if provided
  if (prevProps.defaultView || nextProps.defaultView) {
    const prevView = prevProps.defaultView || {};
    const nextView = nextProps.defaultView || {};
    if (prevView.zoom !== nextView.zoom) return false;
    if (prevView.center?.[0] !== nextView.center?.[0] || 
        prevView.center?.[1] !== nextView.center?.[1]) return false;
  }

  // Deep compare flows array only if lengths match
  if (prevProps.flows.length === nextProps.flows.length) {
    return prevProps.flows.every((flow, index) => {
      const nextFlow = nextProps.flows[index];
      return flow.source === nextFlow.source &&
             flow.target === nextFlow.target &&
             flow.flow_weight === nextFlow.flow_weight;
    });
  }

  return false;
});