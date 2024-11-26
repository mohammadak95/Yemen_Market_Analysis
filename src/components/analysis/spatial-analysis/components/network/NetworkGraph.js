import React, { useMemo, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent,
  Slider, FormControl, InputLabel, Select, MenuItem,
  Tooltip, IconButton, Chip
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
} from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import _ from 'lodash';
import { normalizeCoordinates } from '../../utils/coordinateHandler';

// Reference coordinates for positioning
const YEMEN_REFERENCE_COORDINATES = {
  'sana\'a': [44.2067, 15.3694],
  'aden': [45.0357, 12.7797],
  'taizz': [44.0075, 13.5769],
  'al hudaydah': [42.9552, 14.7979],
  'ibb': [44.1821, 13.9673],
  'dhamar': [44.4018, 14.5430],
  'hadramaut': [48.7867, 15.9320],
  'al jawf': [45.5837, 16.7875],
  'marib': [45.3223, 15.4542],
  'shabwah': [47.0124, 14.7616],
  'abyan': [46.3262, 13.6339],
  'lahj': [44.8838, 13.0382],
  'al bayda': [45.5723, 14.3516],
  'al dhale\'e': [44.7313, 13.7247],
  'hajjah': [43.6027, 15.6943],
  'amran': [43.9436, 16.0174],
  'al mahwit': [43.5446, 15.4700],
  'raymah': [43.7117, 14.6779],
  'amanat al asimah': [44.2067, 15.3694]
};

const NetworkGraph = ({ correlationMatrix, flowData, accessibility, marketSizes, geometry }) => {
  const theme = useTheme();
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [threshold, setThreshold] = useState(0.5);
  const [visualizationType, setVisualizationType] = useState('flows');
  const [metricType, setMetricType] = useState('volume');

  // Process coordinates and network data
  const { nodes, links, centralityMeasures } = useMemo(() => {
    // Create nodes with coordinates
    const nodeMap = new Map();
    
    // First pass: collect all market references
    const markets = new Set();
    flowData.forEach(flow => {
      markets.add(flow.source);
      markets.add(flow.target);
    });

    // Second pass: create nodes with coordinates
    markets.forEach(marketId => {
      const coords = YEMEN_REFERENCE_COORDINATES[marketId.toLowerCase()] || 
                    getCoordinatesFromGeometry(marketId, geometry);
      
      if (coords) {
        nodeMap.set(marketId, {
          id: marketId,
          coordinates: coords,
          size: marketSizes?.[marketId] || 1,
          accessibility: accessibility?.[marketId] || 0
        });
      }
    });

    // Process links
    const processedLinks = [];
    if (visualizationType === 'flows') {
      flowData.forEach(flow => {
        const sourceNode = nodeMap.get(flow.source);
        const targetNode = nodeMap.get(flow.target);
        
        if (sourceNode && targetNode && flow.totalFlow >= threshold) {
          processedLinks.push({
            source: flow.source,
            target: flow.target,
            sourceCoordinates: sourceNode.coordinates,
            targetCoordinates: targetNode.coordinates,
            value: metricType === 'volume' ? flow.totalFlow : flow.avgPriceDifferential,
            type: 'flow'
          });
        }
      });
    } else {
      // Process correlation links
      Object.entries(correlationMatrix || {}).forEach(([source, correlations]) => {
        Object.entries(correlations).forEach(([target, value]) => {
          const sourceNode = nodeMap.get(source);
          const targetNode = nodeMap.get(target);
          
          if (sourceNode && targetNode && Math.abs(value) >= threshold) {
            processedLinks.push({
              source,
              target,
              sourceCoordinates: sourceNode.coordinates,
              targetCoordinates: targetNode.coordinates,
              value: Math.abs(value),
              type: 'correlation'
            });
          }
        });
      });
    }

    // Calculate network centrality
    const centrality = calculateNetworkCentrality(Array.from(nodeMap.values()), processedLinks);

    return {
      nodes: Array.from(nodeMap.values()),
      links: processedLinks,
      centralityMeasures: centrality
    };
  }, [correlationMatrix, flowData, threshold, visualizationType, metricType, marketSizes, accessibility, geometry]);

  // Color scales
  const nodeColorScale = useMemo(() => 
    scaleLinear()
      .domain([0, 1])
      .range([theme.palette.primary.light, theme.palette.primary.dark])
  , [theme]);

  const linkColorScale = useMemo(() => 
    scaleLinear()
      .domain([0, _.maxBy(links, 'value')?.value || 1])
      .range([theme.palette.grey[300], theme.palette.primary.main])
  , [links, theme]);

  const handleMarketClick = useCallback((marketId) => {
    setSelectedMarket(marketId);
  }, []);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Visualization Type</InputLabel>
              <Select
                value={visualizationType}
                onChange={(e) => setVisualizationType(e.target.value)}
              >
                <MenuItem value="flows">Trade Flows</MenuItem>
                <MenuItem value="correlation">Price Correlation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Metric</InputLabel>
              <Select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                disabled={visualizationType === 'correlation'}
              >
                <MenuItem value="volume">Flow Volume</MenuItem>
                <MenuItem value="price">Price Differential</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Threshold: {threshold.toFixed(2)}
            </Typography>
            <Slider
              value={threshold}
              onChange={(_, value) => setThreshold(value)}
              min={0}
              max={1}
              step={0.05}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Map and Network Visualization */}
      <Box sx={{ flexGrow: 1, height: 500 }}>
        <MapContainer
          center={[15.3694, 44.191]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {/* Render network links */}
          {links.map((link, i) => (
            <Polyline
              key={`${link.source}-${link.target}-${i}`}
              positions={[
                // Swap coordinates for Leaflet [lat, lon]
                [link.sourceCoordinates[1], link.sourceCoordinates[0]],
                [link.targetCoordinates[1], link.targetCoordinates[0]]
              ]}
              pathOptions={{
                color: linkColorScale(link.value),
                weight: Math.max(1, Math.sqrt(link.value) * 2),
                opacity: selectedMarket ? 
                  (link.source === selectedMarket || link.target === selectedMarket ? 0.8 : 0.2)
                  : 0.6
              }}
            >
              <Tooltip>
                <div>
                  <strong>{link.source} → {link.target}</strong><br/>
                  {visualizationType === 'flows' ? 
                    `Flow: ${link.value.toFixed(2)}` :
                    `Correlation: ${link.value.toFixed(2)}`
                  }
                </div>
              </Tooltip>
            </Polyline>
          ))}

          {/* Render market nodes */}
          {nodes.map((node) => (
            <CircleMarker
              key={node.id}
              // Swap coordinates for Leaflet [lat, lon]
              center={[node.coordinates[1], node.coordinates[0]]}
              radius={Math.sqrt(node.size / Math.PI) * 5}
              fillColor={nodeColorScale(centralityMeasures[node.id] || 0)}
              color={selectedMarket === node.id ? theme.palette.secondary.main : '#fff'}
              weight={selectedMarket === node.id ? 2 : 1}
              fillOpacity={0.8}
              eventHandlers={{
                click: () => handleMarketClick(node.id)
              }}
            >
              <Tooltip>
                <div>
                  <strong>{node.id}</strong><br/>
                  Size: {node.size.toLocaleString()}<br/>
                  Integration: {(node.accessibility * 100).toFixed(1)}%<br/>
                  Centrality: {(centralityMeasures[node.id] || 0).toFixed(3)}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </Box>

      {/* Network Statistics */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Network Statistics
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Active Markets</Typography>
              <Typography variant="h6">{nodes.length}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Active Links</Typography>
              <Typography variant="h6">{links.length}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Network Density</Typography>
              <Typography variant="h6">
                {(links.length / (nodes.length * (nodes.length - 1) / 2)).toFixed(3)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Avg. Connectivity</Typography>
              <Typography variant="h6">
                {(links.length / nodes.length).toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Paper>
  );
};

// Helper function to extract coordinates from geometry
const getCoordinatesFromGeometry = (marketId, geometry) => {
  if (!geometry || !marketId) return null;

  // Try to find in points
  const point = geometry.points?.find(p => 
    p.properties?.normalizedName?.toLowerCase() === marketId.toLowerCase()
  );
  if (point?.coordinates) {
    return point.coordinates;
  }

  // Try to find in polygons
  const polygon = geometry.polygons?.find(p => 
    p.properties?.normalizedName?.toLowerCase() === marketId.toLowerCase()
  );
  if (polygon?.geometry?.coordinates) {
    // Use first coordinate as representative point
    const coords = polygon.geometry.coordinates[0][0];
    return coords;
  }

  return null;
};

// Helper function to calculate network centrality measures
const calculateNetworkCentrality = (nodes, links) => {
  const centrality = {};
  nodes.forEach(node => {
    const nodeLinks = links.filter(
      link => link.source === node.id || link.target === node.id
    );
    
    // Calculate weighted degree centrality
    centrality[node.id] = nodeLinks.reduce(
      (sum, link) => sum + link.value,
      0
    );
  });

  // Normalize centrality values
  const maxCentrality = Math.max(...Object.values(centrality), 1);
  Object.keys(centrality).forEach(nodeId => {
    centrality[nodeId] = centrality[nodeId] / maxCentrality;
  });

  return centrality;
};

export default NetworkGraph;