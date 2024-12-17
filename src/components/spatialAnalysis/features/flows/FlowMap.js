// src/components/spatialAnalysis/features/flows/FlowMap.js

import React, { useMemo, useCallback } from 'react';
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

// Map Controls Component
const MapControlHandlers = ({ mapRef, defaultView }) => {
  const map = useMap();

  const handleMapAction = useCallback((action) => {
    if (!mapRef.current) return;
    
    switch(action) {
      case 'zoomIn':
        mapRef.current.setZoom(mapRef.current.getZoom() + 1);
        break;
      case 'zoomOut':
        mapRef.current.setZoom(mapRef.current.getZoom() - 1);
        break;
      case 'reset':
        mapRef.current.setView(defaultView.center, defaultView.zoom);
        break;
      case 'refresh':
        mapRef.current.invalidateSize();
        break;
    }
  }, [mapRef, defaultView]);

  return (
    <MapControls
      onZoomIn={() => handleMapAction('zoomIn')}
      onZoomOut={() => handleMapAction('zoomOut')}
      onReset={() => handleMapAction('reset')}
      onRefresh={() => handleMapAction('refresh')}
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
  const mapRef = React.useRef(null);
  const { commodity } = useSelector(selectFlowMetadata);
  const { loading, error } = useSelector(selectFlowStatus);

  // Create color scale
  const colorScale = useMemo(() => {
    try {
      return chroma.scale([FLOW_COLORS.NEUTRAL, FLOW_COLORS.POSITIVE]).domain([0, 1]).mode('lch');
    } catch (error) {
      console.error('Error creating color scale:', error);
      return () => FLOW_COLORS.NEUTRAL;
    }
  }, []);

  const { markets, connections } = useMemo(() => {
    if (!Array.isArray(flows)) return { markets: new Map(), connections: [] };

    const marketMap = new Map();

    flows.forEach(flow => {
      if (!flow?.source || !flow?.target) return;
      const sourceCoords = YEMEN_COORDINATES[flow.source.toLowerCase()];
      const targetCoords = YEMEN_COORDINATES[flow.target.toLowerCase()];

      if (!sourceCoords || !targetCoords) return;

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
    });

    const maxFlow = Math.max(...flows.map(f => f.flow_weight), 0);
    const processedConnections = flows
      .filter(flow => {
        const s = YEMEN_COORDINATES[flow.source?.toLowerCase()];
        const t = YEMEN_COORDINATES[flow.target?.toLowerCase()];
        return s && t && flowValidation.isValidFlow(flow);
      })
      .map(flow => {
        const normalizedFlow = flowValidation.normalizeFlow(flow, maxFlow);
        return {
          ...flow,
          coordinates: {
            source: YEMEN_COORDINATES[flow.source.toLowerCase()],
            target: YEMEN_COORDINATES[flow.target.toLowerCase()]
          },
          color: colorScale(normalizedFlow).hex(),
          width: VISUALIZATION_PARAMS.MIN_FLOW_WIDTH +
            (normalizedFlow * (VISUALIZATION_PARAMS.MAX_FLOW_WIDTH - VISUALIZATION_PARAMS.MIN_FLOW_WIDTH)),
          opacity: VISUALIZATION_PARAMS.MIN_OPACITY +
            (normalizedFlow * (VISUALIZATION_PARAMS.MAX_OPACITY - VISUALIZATION_PARAMS.MIN_OPACITY)),
          normalizedFlow
        };
      });

    return { markets: marketMap, connections: processedConnections };
  }, [flows, colorScale]);

  // Legend items
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

  // Flow selection handler
  const handleFlowSelect = useCallback((flow) => {
    if (onFlowSelect) {
      onFlowSelect(flow);
    }
  }, [onFlowSelect]);

  if (loading) {
    return (
      <Box 
        sx={{ 
          height,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 2,
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography>
          Loading market flows for {commodity}...
        </Typography>
      </Box>
    );
  }

  if (error) {
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
          Error loading market flows: {error}
        </Typography>
      </Box>
    );
  }

  if (!connections.length) {
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
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        bounceAtZoomLimits
        worldCopyJump={false}
        preferCanvas
        ref={mapRef}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap, &copy; CARTO'
        />

        <MapControlHandlers mapRef={mapRef} defaultView={defaultView} />

        {/* TransitionGroup for smooth flow transitions */}
        <TransitionGroup component={null}>
          {connections.map((flow) => {
            const isSelected =
              selectedFlow &&
              selectedFlow.source === flow.source &&
              selectedFlow.target === flow.target;

            return (
              <CSSTransition key={`${flow.source}-${flow.target}`} classNames="flow" timeout={300}>
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
                    click: () => handleFlowSelect(flow),
                    mouseover: (e) => {
                      e.target.setStyle({ weight: flow.width * 1.5 });
                    },
                    mouseout: (e) => {
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
                        <Typography variant="body2">Flow Volume: {flow.flow_weight.toFixed(2)}</Typography>
                        <Typography variant="body2">Flow Strength: {(flow.normalizedFlow * 100).toFixed(1)}%</Typography>
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
                    <Typography variant="body2">Total Flow: {market.totalFlow.toFixed(2)}</Typography>
                    <Typography variant="body2">Incoming: {market.incomingFlows}</Typography>
                    <Typography variant="body2">Outgoing: {market.outgoingFlows}</Typography>
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

export default React.memo(FlowMap);
