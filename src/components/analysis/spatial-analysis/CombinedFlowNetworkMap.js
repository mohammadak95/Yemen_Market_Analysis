// src/components/analysis/spatial-analysis/CombinedFlowNetworkMap.js

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Alert } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';
import { parseISO, format } from 'date-fns';

// Utility function to normalize region names
const normalizeRegionName = (region) => {
  return region.toLowerCase().replace(/[^a-z\s]/g, '').trim();
};

const CombinedFlowNetworkMap = ({ flowMaps, selectedCommodity, dateRange }) => {
  const [highlightedNode, setHighlightedNode] = useState(null);

  // Parse and format the date range
  const formattedDateRange = useMemo(() => {
    if (!dateRange?.[0] || !dateRange?.[1]) return null;

    try {
      return [
        parseISO(dateRange[0]),
        parseISO(dateRange[1]),
      ];
    } catch (e) {
      console.error('Error parsing date range:', e);
      return null;
    }
  }, [dateRange]);

  // Process flow data into normalized nodes and links
  const normalizedFlowMaps = useMemo(() => {
    return flowMaps.map(flow => ({
      ...flow,
      source: normalizeRegionName(flow.source),
      target: normalizeRegionName(flow.target),
    }));
  }, [flowMaps]);

  const graphData = useMemo(() => {
    if (!Array.isArray(normalizedFlowMaps) || normalizedFlowMaps.length === 0) {
      return { nodes: [], links: [] };
    }

    const nodes = new Map();
    const uniqueRegions = new Set();

    // First pass: collect all normalized regions
    normalizedFlowMaps.forEach(flow => {
      if (flow.source) uniqueRegions.add(flow.source);
      if (flow.target) uniqueRegions.add(flow.target);
    });

    // Create nodes
    uniqueRegions.forEach(region => {
      nodes.set(region, {
        id: region,
        name: region,
        val: 1, // Base size
      });
    });

    // Create links and update node values
    const links = normalizedFlowMaps.map(flow => {
      // Update node values based on flow weight
      const sourceNode = nodes.get(flow.source);
      const targetNode = nodes.get(flow.target);

      if (sourceNode) sourceNode.val += flow.flow_weight || 0;
      if (targetNode) targetNode.val += flow.flow_weight || 0;

      if (!flow.flow_weight) {
        console.warn(`Flow weight missing for link between ${flow.source} and ${flow.target}`);
      }

      return {
        source: flow.source,
        target: flow.target,
        value: flow.flow_weight || 1,
      };
    });

    return {
      nodes: Array.from(nodes.values()),
      links,
    };
  }, [normalizedFlowMaps]);

  const handleNodeClick = useCallback(node => {
    setHighlightedNode(node);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setHighlightedNode(null);
  }, []);

  if (!Array.isArray(flowMaps) || flowMaps.length === 0) {
    return (
      <Alert severity="info">
        No flow data available for {selectedCommodity}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Market Flow Network: {selectedCommodity}
      </Typography>

      {formattedDateRange && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Period: {format(formattedDateRange[0], 'MMM yyyy')} - {format(formattedDateRange[1], 'MMM yyyy')}
        </Typography>
      )}

      <Box sx={{ height: 400, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={node => `${node.name}\nConnections: ${node.val.toFixed(0)}`}
          linkWidth={link => Math.sqrt(link.value)}
          nodeRelSize={6}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y - bckgDimensions[1] / 2,
              ...bckgDimensions
            );

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.id === highlightedNode?.id ? 'red' : 'black';
            ctx.fillText(label, node.x, node.y);
            ctx.restore();
          }}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
        />
      </Box>

      {highlightedNode && (
        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2">
            Selected Market: {highlightedNode.name}
          </Typography>
          <Typography variant="body2">
            Connection Strength: {highlightedNode.val.toFixed(2)}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

CombinedFlowNetworkMap.propTypes = {
  flowMaps: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    flow_weight: PropTypes.number,
    source_lat: PropTypes.number,
    source_lng: PropTypes.number,
    target_lat: PropTypes.number,
    target_lng: PropTypes.number,
    date: PropTypes.string,
  })).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  dateRange: PropTypes.arrayOf(PropTypes.string).isRequired, // Changed to strings to represent ISO dates
};

export default React.memo(CombinedFlowNetworkMap);
