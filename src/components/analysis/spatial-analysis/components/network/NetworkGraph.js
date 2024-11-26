// src/components/analysis/spatial-analysis/components/network/NetworkGraph.js

import React, { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import ForceGraph2D from 'react-force-graph-2d';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { selectMarketFlows, selectGeometryData, selectMarketIntegration } from '../../../../../selectors/optimizedSelectors';
import { useNetworkData } from '../../hooks/useNetworkData';
import NetworkGraphLegend from './NetworkGraphLegend';
import { eigenvectorCentrality } from '../../utils/networkAnalysis';

const DEBUG = process.env.NODE_ENV === 'development';

const NetworkGraph = () => {
  const theme = useTheme();
  const flows = useSelector(selectMarketFlows);
  const geometryData = useSelector(selectGeometryData);
  const marketIntegration = useSelector(selectMarketIntegration);

  if (DEBUG) {
    console.group('NetworkGraph Render');
    console.log('Raw Flow Data:', flows);
    console.log('Geometry Data:', geometryData);
    console.log('Market Integration:', marketIntegration);
  }

  // Process network data using custom hook
  const { nodes, links } = useNetworkData(0.5); // 0.5 threshold from your data patterns

  // Calculate network centrality
  const networkAnalysis = useMemo(() => {
    if (!nodes.length || !links.length) return null;
    
    if (DEBUG) {
      console.log('Calculating network centrality for:', {
        nodeCount: nodes.length,
        linkCount: links.length
      });
    }

    return eigenvectorCentrality(nodes, links);
  }, [nodes, links]);

  // Generate node colors based on centrality
  const nodeColors = useMemo(() => {
    if (!networkAnalysis?.centrality) return {};
    
    const values = Object.values(networkAnalysis.centrality);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return Object.entries(networkAnalysis.centrality).reduce((acc, [node, value]) => {
      const normalized = (value - min) / (max - min);
      // Using theme colors for consistency
      acc[node] = `rgba(${
        theme.palette.primary.main.replace(/[^\d,]/g, '')
      }, ${0.3 + normalized * 0.7})`;
      return acc;
    }, {});
  }, [networkAnalysis, theme]);

  if (DEBUG) {
    console.log('Network Analysis:', networkAnalysis);
    console.log('Node Colors:', nodeColors);
    console.groupEnd();
  }

  const handleNodeClick = useCallback((node) => {
    if (DEBUG) {
      console.group('Node Click');
      console.log('Node:', node);
      console.log('Node Centrality:', networkAnalysis?.centrality[node.id]);
      console.log('Connected Links:', links.filter(l => 
        l.source.id === node.id || l.target.id === node.id
      ));
      console.groupEnd();
    }
  }, [links, networkAnalysis]);

  if (!flows?.length || !geometryData) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!nodes.length || !links.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No network data available for the selected parameters.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Market Network Analysis
      </Typography>
      
      <Box sx={{ display: 'flex', height: 600 }}>
        {/* Main Graph */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ForceGraph2D
            graphData={{ nodes, links }}
            nodeColor={(node) => nodeColors[node.id] || theme.palette.grey[300]}
            linkColor={() => theme.palette.grey[400]}
            nodeLabel={(node) => `
              ${node.name}
              Centrality: ${(networkAnalysis?.centrality[node.id] || 0).toFixed(3)}
              Connections: ${links.filter(l => 
                l.source.id === node.id || l.target.id === node.id
              ).length}
            `}
            linkLabel={(link) => `
              Flow: ${link.value.toFixed(2)}
              From: ${link.source.name}
              To: ${link.target.name}
            `}
            linkWidth={(link) => Math.sqrt(link.value) * 0.5}
            nodeRelSize={6}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={(link) => link.value * 0.001}
            d3VelocityDecay={0.3}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            nodeCanvasObject={(node, ctx, globalScale) => {
              // Draw custom node
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

              // Node circle
              ctx.fillStyle = nodeColors[node.id] || theme.palette.grey[300];
              ctx.beginPath();
              ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
              ctx.fill();

              // Text background
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                ...bckgDimensions
              );

              // Text
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = theme.palette.text.primary;
              ctx.fillText(label, node.x, node.y);
            }}
          />
        </Box>

        {/* Legend */}
        <Box sx={{ width: 200, ml: 2 }}>
          <NetworkGraphLegend 
            metrics={networkAnalysis?.metrics}
            maxCentrality={Math.max(...Object.values(networkAnalysis?.centrality || {}))}
            minCentrality={Math.min(...Object.values(networkAnalysis?.centrality || {}))}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default NetworkGraph;