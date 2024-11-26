import React, { useMemo, useState, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Box, Typography, Slider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useNetworkData from '../../hooks/useNetworkData';
import NetworkGraphLegend from './NetworkGraphLegend';

const debug = (message, data = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🌐 NetworkGraph: ${message}`);
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
    console.groupEnd();
  }
};

const YEMEN_BOUNDS = {
  center: [15.3694, 44.191],
  zoom: 6,
  bounds: {
    minLon: 41.0,
    maxLon: 54.0,
    minLat: 12.0,
    maxLat: 19.0,
  },
};

// Custom component to handle map interactions (if needed)
const MapInteractionHandler = ({ setTooltipInfo }) => {
  useMapEvents({
    mousemove: (e) => {
      // Handle global map interactions here if needed
    },
  });
  return null;
};

const NetworkGraph = ({ correlationMatrix, flowData, marketSizes }) => {
  const theme = useTheme();
  const [threshold, setThreshold] = useState(0.5);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const { nodes, links, centralityMeasures } = useNetworkData(
    correlationMatrix,
    flowData,
    threshold
  );

  const handleNodeHover = useCallback(
    (node) => {
      if (node) {
        setHoveredNodeId(node.id);
      } else {
        setHoveredNodeId(null);
      }
    },
    []
  );

  const validateCoordinates = useCallback((coords) => {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const [lon, lat] = coords;
    return (
      !isNaN(lon) &&
      !isNaN(lat) &&
      lon >= YEMEN_BOUNDS.bounds.minLon &&
      lon <= YEMEN_BOUNDS.bounds.maxLon &&
      lat >= YEMEN_BOUNDS.bounds.minLat &&
      lat <= YEMEN_BOUNDS.bounds.maxLat
    );
  }, []);

  const { validNodes, validLinks } = useMemo(() => {
    const filteredNodes = nodes.filter((n) => validateCoordinates(n.coordinates));
    const filteredLinks = links.filter(
      (l) =>
        validateCoordinates(l.sourceCoordinates) && validateCoordinates(l.targetCoordinates)
    );

    debug('Filtered Data', {
      totalNodes: nodes.length,
      validNodes: filteredNodes.length,
      totalLinks: links.length,
      validLinks: filteredLinks.length,
    });

    return {
      validNodes: filteredNodes,
      validLinks: filteredLinks,
    };
  }, [nodes, links, validateCoordinates]);

  // Function to determine node color based on centrality
  const getNodeColor = (node) => {
    const centrality = centralityMeasures[node.id] || 0;
    if (centrality > 0.7) return hoveredNodeId === node.id ? '#FF3B30' : '#FF3B30AA'; // Red
    if (centrality > 0.4) return hoveredNodeId === node.id ? '#FF9500' : '#FF9500AA'; // Orange
    return hoveredNodeId === node.id ? '#34C759' : '#34C759AA'; // Green
  };

  // Function to determine link color
  const getLinkColor = (link) => {
    const isSourceHovered = hoveredNodeId === link.source;
    const isTargetHovered = hoveredNodeId === link.target;
    if (isSourceHovered || isTargetHovered) return '#FF8C00'; // Dark Orange
    return '#3C3C3CAA'; // Dark Gray with transparency
  };

  if (!validNodes.length || !validLinks.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">No valid network data available</Typography>
        <Typography variant="body2" color="text.secondary">
          Found {nodes.length} nodes and {links.length} links, but none were within valid bounds.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Market Integration Network
      </Typography>

      <Box sx={{ width: 300, mb: 2 }}>
        <Typography variant="body2">
          Connection Threshold: {threshold.toFixed(2)}
        </Typography>
        <Slider
          value={threshold}
          onChange={(_, value) => setThreshold(value)}
          min={0}
          max={1}
          step={0.05}
          marks
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: '500px', position: 'relative' }}>
        <MapContainer
          center={YEMEN_BOUNDS.center}
          zoom={YEMEN_BOUNDS.zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Render Links */}
          {validLinks.map((link, index) => (
            <Polyline
              key={`link-${index}`}
              positions={[
                [link.sourceCoordinates[1], link.sourceCoordinates[0]],
                [link.targetCoordinates[1], link.targetCoordinates[0]],
              ]}
              color={getLinkColor(link)}
              weight={Math.max(1, Math.sqrt(link.weight) * 2)}
            />
          ))}

          {/* Render Nodes */}
          {validNodes.map((node) => (
            <CircleMarker
              key={`node-${node.id}`}
              center={[node.coordinates[1], node.coordinates[0]]}
              radius={Math.sqrt(marketSizes[node.id] || 1) * 5}
              color={getNodeColor(node)}
              fillOpacity={0.8}
              stroke={hoveredNodeId === node.id}
              weight={hoveredNodeId === node.id ? 2 : 1}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.openPopup();
                  handleNodeHover(node);
                },
                mouseout: () => {
                  handleNodeHover(null);
                },
              }}
            >
              <Tooltip>
                <div>
                  <strong>Market:</strong> {node.name}
                  <br />
                  <strong>Population:</strong> {node.population?.toLocaleString() || 'N/A'}
                  <br />
                  <strong>Centrality:</strong> {(centralityMeasures[node.id] || 0).toFixed(3)}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {/* Handle global map interactions */}
          <MapInteractionHandler setTooltipInfo={() => {}} />
        </MapContainer>
      </Box>

      <NetworkGraphLegend />
    </Paper>
  );
};

export default NetworkGraph;