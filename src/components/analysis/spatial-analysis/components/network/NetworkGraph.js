// src/components/analysis/spatial-analysis/components/network/NetworkGraph.js

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { Paper, Box, Typography, Slider, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { scaleLinear } from 'd3-scale';
import useNetworkData from '../../hooks/useNetworkData';
import NetworkGraphLegend from './NetworkGraphLegend';

const NetworkGraph = ({ correlationMatrix, accessibility, flowDensity }) => {
  const theme = useTheme();
  const [correlationThreshold, setCorrelationThreshold] = useState(0.5);
  const { nodes, links, centralityMeasures } = useNetworkData(correlationMatrix, accessibility, correlationThreshold);
  const [autoThreshold, setAutoThreshold] = useState(false); // New state for auto-adjust

  const colorScale = useMemo(() => 
    scaleLinear()
      .domain([0, 1]) // After normalization
      .range([theme.palette.primary.light, theme.palette.primary.dark])
  , [theme]);

  const graphData = useMemo(() => ({
    nodes: nodes.map(node => ({
      id: node.id,
      name: node.name,
      val: node.accessibility || 1, // Use node.accessibility
      color: colorScale(centralityMeasures[node.id] || 0)
    })),
    links: links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.weight,
      color: link.weight > 0 ? theme.palette.success.main : theme.palette.error.main
    }))
  }), [nodes, links, centralityMeasures, colorScale, theme]);

  const handleNodeClick = useCallback(node => {
    alert(`Node: ${node.name}\nCentrality: ${centralityMeasures[node.id]?.toFixed(3)}`);
  }, [centralityMeasures]);

  const handleThresholdChange = (event, newValue) => {
    setCorrelationThreshold(newValue);
    setAutoThreshold(false); // User manually adjusted
  };

  // Auto-adjust threshold if no links are present
  useEffect(() => {
    if (links.length === 0 && correlationThreshold > 0) {
      const newThreshold = correlationThreshold - 0.05;
      if (newThreshold >= 0) {
        setCorrelationThreshold(newThreshold);
        setAutoThreshold(true);
      }
    }
  }, [links.length, correlationThreshold]);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Market Integration Network
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Flow Density: {flowDensity?.toFixed(3)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Nodes: {nodes.length} | Links: {links.length}
        </Typography>
      </Box>
      
      {/* Correlation Threshold Slider */}
      <Box sx={{ width: 300, mb: 2 }}>
        <Typography variant="body2">
          Correlation Threshold: {correlationThreshold.toFixed(2)} {autoThreshold ? '(Auto-adjusted)' : ''}
        </Typography>
        <Slider
          value={correlationThreshold}
          onChange={handleThresholdChange}
          min={0}
          max={1}
          step={0.05}
          marks
          valueLabelDisplay="auto"
        />
      </Box>

      {/* Alert for Empty Graph */}
      {links.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No connections found with the current correlation threshold. Try lowering the threshold.
        </Alert>
      ) : null}

      <Box sx={{ flexGrow: 1, minHeight: '500px' }}>
        {links.length > 0 ? (
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeVal="val"
            linkWidth={link => Math.sqrt(link.value) * 2}
            linkColor={link => link.color}
            onNodeClick={handleNodeClick}
            cooldownTicks={0} // Stop simulation after layout is computed
            dagMode="radialin" // Use radial layout
            dagLevelDistance={100} // Adjust spacing between levels
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node, ctx) => {
              const label = node.name;
              ctx.font = '10px Sans-Serif';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#000';
              ctx.fillText(label, node.x, node.y - 10);
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Adjust the correlation threshold to display connections.
          </Typography>
        )}
      </Box>

      {/* Legend */}
      <NetworkGraphLegend colorScale={colorScale} />
    </Paper>
  );
};

export default NetworkGraph;