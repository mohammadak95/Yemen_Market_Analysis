import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ForceGraph2D } from 'react-force-graph';
import chroma from 'chroma-js';

import { calculateNetworkMetrics } from '../../utils/networkAnalysis';
import { transformRegionName } from '../../utils/spatialUtils';

const NetworkGraph = ({
  flows,
  marketIntegration,
  selectedNode,
  onNodeSelect,
  height = '100%'
}) => {
  const theme = useTheme();

  // Process network data
  const graphData = useMemo(() => {
    if (!flows?.length) return { nodes: [], links: [] };

    // Create nodes
    const nodesMap = new Map();
    flows.forEach(flow => {
      if (!nodesMap.has(flow.source)) {
        nodesMap.set(flow.source, {
          id: flow.source,
          name: flow.source,
          value: 0
        });
      }
      if (!nodesMap.has(flow.target)) {
        nodesMap.set(flow.target, {
          id: flow.target,
          name: flow.target,
          value: 0
        });
      }
      nodesMap.get(flow.source).value += flow.total_flow || 0;
      nodesMap.get(flow.target).value += flow.total_flow || 0;
    });

    // Calculate node metrics
    const networkMetrics = calculateNetworkMetrics(flows);
    nodesMap.forEach((node, id) => {
      const centrality = networkMetrics.centrality[id] || {};
      node.metrics = {
        degree: centrality.degree || 0,
        betweenness: centrality.betweenness || 0,
        strength: centrality.strength || 0
      };
    });

    // Create links
    const links = flows.map(flow => ({
      source: flow.source,
      target: flow.target,
      value: flow.total_flow || 0,
      price_differential: flow.price_differential || 0
    }));

    return {
      nodes: Array.from(nodesMap.values()),
      links
    };
  }, [flows]);

  // Create color scales
  const nodeColorScale = useMemo(() => 
    chroma.scale(['#edf8e9', '#006d2c']).domain([0, 1]),
    []
  );

  const linkColorScale = useMemo(() => 
    chroma.scale(['#fee5d9', '#a50f15']).domain([0, 1]),
    []
  );

  // Calculate node and link styles
  const getNodeColor = useCallback((node) => {
    const maxValue = Math.max(...graphData.nodes.map(n => n.value));
    const normalizedValue = maxValue > 0 ? node.value / maxValue : 0;
    return nodeColorScale(normalizedValue).hex();
  }, [graphData.nodes, nodeColorScale]);

  const getLinkColor = useCallback((link) => {
    const maxValue = Math.max(...graphData.links.map(l => l.value));
    const normalizedValue = maxValue > 0 ? link.value / maxValue : 0;
    return linkColorScale(normalizedValue).hex();
  }, [graphData.links, linkColorScale]);

  // Node size based on degree centrality
  const getNodeSize = useCallback((node) => {
    return 5 + (node.metrics.degree * 10);
  }, []);

  // Link width based on flow value
  const getLinkWidth = useCallback((link) => {
    const maxValue = Math.max(...graphData.links.map(l => l.value));
    return 1 + ((link.value / maxValue) * 4);
  }, [graphData.links]);

  // Node label
  const getNodeLabel = useCallback((node) => {
    const metrics = node.metrics;
    return `
      ${node.name}
      Degree: ${(metrics.degree * 100).toFixed(1)}%
      Betweenness: ${(metrics.betweenness * 100).toFixed(1)}%
      Strength: ${metrics.strength.toFixed(2)}
    `;
  }, []);

  // Link label
  const getLinkLabel = useCallback((link) => `
    ${link.source.name} → ${link.target.name}
    Flow: ${link.value.toFixed(2)}
    Price Diff: ${(link.price_differential * 100).toFixed(1)}%
  `, []);

  if (!graphData.nodes.length) {
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
          No network data available for visualization
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative' }}>
      <ForceGraph2D
        graphData={graphData}
        nodeId="id"
        nodeVal={getNodeSize}
        nodeColor={getNodeColor}
        nodeLabel={getNodeLabel}
        linkSource="source"
        linkTarget="target"
        linkWidth={getLinkWidth}
        linkColor={getLinkColor}
        linkLabel={getLinkLabel}
        backgroundColor={theme.palette.background.paper}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const size = getNodeSize(node);
          const fontSize = 12 / globalScale;
          const isSelected = selectedNode === node.id;

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = getNodeColor(node);
          ctx.fill();
          ctx.strokeStyle = isSelected ? 
            theme.palette.secondary.main : 
            theme.palette.background.paper;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.stroke();

          // Draw node label if zoomed in or selected
          if (globalScale > 2 || isSelected) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = theme.palette.text.primary;
            ctx.fillText(node.name, node.x, node.y + size + fontSize);
          }
        }}
        onNodeClick={node => onNodeSelect(node.id)}
        cooldownTicks={100}
        d3VelocityDecay={0.3}
      />
    </Box>
  );
};

NetworkGraph.propTypes = {
  flows: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    total_flow: PropTypes.number,
    price_differential: PropTypes.number
  })).isRequired,
  marketIntegration: PropTypes.object,
  selectedNode: PropTypes.string,
  onNodeSelect: PropTypes.func,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default React.memo(NetworkGraph);
