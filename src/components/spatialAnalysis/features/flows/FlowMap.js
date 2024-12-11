/**
 * Market Flow Map Component
 * 
 * Visualizes market flows as a network of nodes (markets) connected by lines (flows)
 */

import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import chroma from 'chroma-js';
import 'leaflet/dist/leaflet.css';

import Legend from '../../atoms/Legend';
import MapControls from '../../molecules/MapControls';
import { 
  FLOW_COLORS, 
  VISUALIZATION_PARAMS,
  FLOW_THRESHOLDS,
  flowValidation
} from './types';
import { YEMEN_COORDINATES } from '../../../../selectors/optimizedSelectors';

// Default map settings
const DEFAULT_VIEW = {
  center: [15.3694, 44.191], // Yemen center
  zoom: 6.5
};

// Yemen bounds
const YEMEN_BOUNDS = [
  [12.7, 42.6], // Southwest
  [18.5, 53.2]  // Northeast
];

// Map Control Handlers Component
const MapControlHandlers = ({ mapRef, defaultView }) => {
  const map = useMap();

  const handleZoomIn = () => {
    map.setZoom(map.getZoom() + 1);
  };

  const handleZoomOut = () => {
    map.setZoom(map.getZoom() - 1);
  };

  const handleReset = () => {
    map.setView(defaultView.center, defaultView.zoom);
  };

  const handleRefresh = () => {
    map.invalidateSize();
  };

  // Store map reference
  if (mapRef) {
    mapRef.current = map;
  }

  return (
    <MapControls
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onReset={handleReset}
      onRefresh={handleRefresh}
    />
  );
};

const FlowMap = ({
  flows = [],
  selectedFlow,
  onFlowSelect,
  height = '100%',
  defaultView = DEFAULT_VIEW
}) => {
  const mapRef = useRef(null);

  // Create color scale for flow strength
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

  // Process market nodes and flow connections
  const { markets, connections } = useMemo(() => {
    if (!Array.isArray(flows)) {
      console.debug('Invalid flows data structure');
      return { markets: new Map(), connections: [] };
    }

    try {
      // Create map of unique markets with their total flows
      const marketMap = new Map();
      
      flows.forEach(flow => {
        if (!flow?.source || !flow?.target) return;

        // Get coordinates from YEMEN_COORDINATES
        const sourceCoords = YEMEN_COORDINATES[flow.source.toLowerCase()];
        const targetCoords = YEMEN_COORDINATES[flow.target.toLowerCase()];

        if (!sourceCoords || !targetCoords) {
          console.debug('Missing coordinates for market:', {
            source: flow.source,
            target: flow.target,
            hasSourceCoords: Boolean(sourceCoords),
            hasTargetCoords: Boolean(targetCoords)
          });
          return;
        }

        // Process source market
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
        sourceMarket.totalFlow += flow.total_flow;
        sourceMarket.outgoingFlows += 1;

        // Process target market
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
        targetMarket.totalFlow += flow.total_flow;
        targetMarket.incomingFlows += 1;
      });

      // Calculate max flow for normalization
      const maxFlow = Math.max(...flows.map(f => f.total_flow));
      
      // Process connections with normalized values
      const processedConnections = flows
        .filter(flow => {
          const sourceCoords = YEMEN_COORDINATES[flow.source.toLowerCase()];
          const targetCoords = YEMEN_COORDINATES[flow.target.toLowerCase()];
          return sourceCoords && targetCoords;
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
            normalizedFlow,
            status: flowValidation.getFlowStatus(normalizedFlow)
          };
        });

      return { 
        markets: marketMap,
        connections: processedConnections
      };
    } catch (error) {
      console.error('Error processing market network:', error);
      return { markets: new Map(), connections: [] };
    }
  }, [flows, colorScale]);

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
      color: FLOW_COLORS.NODE.FILL, 
      label: 'Market Point',
      style: { borderRadius: '50%', border: `2px solid ${FLOW_COLORS.NODE.BORDER}` },
      description: 'Active market location'
    }
  ], [colorScale]);

  // Debug logging
  console.debug('FlowMap state:', {
    totalFlows: flows.length,
    marketCount: markets.size,
    connectionCount: connections.length,
    selectedFlow: Boolean(selectedFlow)
  });

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
          No valid market flow data available for the selected period.
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
        maxZoom={9}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
        />

        {/* Flow connections */}
        {connections.map((flow, index) => {
          const isSelected = selectedFlow && 
            selectedFlow.source === flow.source && 
            selectedFlow.target === flow.target;

          return (
            <Polyline
              key={`flow-${index}`}
              positions={[
                [flow.coordinates.source[1], flow.coordinates.source[0]],
                [flow.coordinates.target[1], flow.coordinates.target[0]]
              ]}
              pathOptions={{
                color: isSelected ? FLOW_COLORS.SELECTED : flow.color,
                weight: isSelected ? flow.width * VISUALIZATION_PARAMS.SELECTION_SCALE : flow.width,
                opacity: isSelected ? flow.opacity * VISUALIZATION_PARAMS.SELECTION_SCALE : flow.opacity,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => onFlowSelect?.(flow),
                mouseover: (e) => {
                  const layer = e.target;
                  if (layer) {
                    layer.setStyle({
                      weight: flow.width * VISUALIZATION_PARAMS.HOVER_SCALE,
                      opacity: flow.opacity * VISUALIZATION_PARAMS.HOVER_SCALE
                    });
                  }
                },
                mouseout: (e) => {
                  const layer = e.target;
                  if (layer) {
                    layer.setStyle({
                      weight: isSelected ? flow.width * VISUALIZATION_PARAMS.SELECTION_SCALE : flow.width,
                      opacity: isSelected ? flow.opacity * VISUALIZATION_PARAMS.SELECTION_SCALE : flow.opacity
                    });
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
                    <Typography variant="body2">
                      Source: {flow.source}
                    </Typography>
                    <Typography variant="body2">
                      Target: {flow.target}
                    </Typography>
                    <Typography variant="body2">
                      Flow Volume: {flow.total_flow.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Flow Strength: {(flow.normalizedFlow * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2">
                      Status: {flow.status}
                    </Typography>
                  </Box>
                </Box>
              </Popup>
            </Polyline>
          );
        })}

        {/* Market nodes */}
        {Array.from(markets.values()).map((market, index) => {
          const isSelected = selectedFlow && 
            (selectedFlow.source === market.id || selectedFlow.target === market.id);
          
          const maxFlow = Math.max(...Array.from(markets.values()).map(m => m.totalFlow));
          const nodeSize = flowValidation.calculateNodeSize(market.totalFlow, maxFlow);

          return (
            <CircleMarker
              key={`market-${index}`}
              center={[market.coordinates[1], market.coordinates[0]]}
              radius={isSelected ? nodeSize * VISUALIZATION_PARAMS.SELECTION_SCALE : nodeSize}
              pathOptions={{
                fillColor: FLOW_COLORS.NODE.FILL,
                color: FLOW_COLORS.NODE.BORDER,
                weight: VISUALIZATION_PARAMS.NODE_BORDER_WIDTH,
                opacity: VISUALIZATION_PARAMS.NODE_BORDER_OPACITY,
                fillOpacity: VISUALIZATION_PARAMS.NODE_OPACITY
              }}
              eventHandlers={{
                mouseover: (e) => {
                  const layer = e.target;
                  if (layer) {
                    layer.setRadius(nodeSize * VISUALIZATION_PARAMS.HOVER_SCALE);
                  }
                },
                mouseout: (e) => {
                  const layer = e.target;
                  if (layer) {
                    layer.setRadius(isSelected ? nodeSize * VISUALIZATION_PARAMS.SELECTION_SCALE : nodeSize);
                  }
                }
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
                      Incoming Connections: {market.incomingFlows}
                    </Typography>
                    <Typography variant="body2">
                      Outgoing Connections: {market.outgoingFlows}
                    </Typography>
                  </Box>
                </Box>
              </Popup>
            </CircleMarker>
          );
        })}

        <MapControlHandlers mapRef={mapRef} defaultView={defaultView} />
      </MapContainer>

      <Legend
        title="Market Flow Analysis"
        items={legendItems}
      />
    </Box>
  );
};

FlowMap.propTypes = {
  flows: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    total_flow: PropTypes.number.isRequired,
    price_differential: PropTypes.number
  })).isRequired,
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
