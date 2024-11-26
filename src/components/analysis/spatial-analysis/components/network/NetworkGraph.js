// src/components/analysis/spatial-analysis/components/network/NetworkGraph.js

import React, { useMemo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Slider,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { scaleLinear } from 'd3-scale';
import chroma from 'chroma-js';
import {
  calculateEigenvectorCentrality,
  calculateMarketIntegrationScore,
  calculateMarketInfluence,
  identifyKeyMarkets,
} from '../../utils/networkAnalysis';
import NetworkGraphLegend from './NetworkGraphLegend';

const NetworkGraph = React.memo(() => {
  const theme = useTheme();
  const [analysisMetric, setAnalysisMetric] = useState('market_integration');
  const [flowThreshold, setFlowThreshold] = useState(0.1);

  // Redux selectors
  const flows = useSelector((state) => state.spatial.data.flowMaps);
  const marketIntegration = useSelector((state) => state.spatial.data.marketIntegration);
  const geometryData = useSelector((state) => state.spatial.data.geometry);

  // Process network data
  const { nodes, links, metrics } = useMemo(() => {
    if (!flows?.length || !geometryData?.points) return { nodes: [], links: [], metrics: {} };

    // Create nodes from market points
    const nodes = geometryData.points.map((point) => ({
      id: point.properties.normalizedName,
      name: point.properties.originalName,
      x: point.coordinates[0] * 100, // Scale coordinates for visualization
      y: point.coordinates[1] * 100,
      population: point.properties.population,
    }));

    // Filter and process links based on threshold
    const links = flows
      .filter((flow) => flow.totalFlow >= flowThreshold)
      .map((flow) => ({
        source: flow.source,
        target: flow.target,
        value: flow.totalFlow,
        avgFlow: flow.avgFlow,
        flowCount: flow.flowCount,
      }));

    // Calculate network metrics
    const centrality = calculateEigenvectorCentrality(nodes, links);
    const keyMarkets = identifyKeyMarkets(flows, marketIntegration);

    // Determine max and min flow values for scaling
    const maxFlow = Math.max(...links.map((l) => l.value));
    const minFlow = Math.min(...links.map((l) => l.value));

    return {
      nodes,
      links,
      metrics: {
        centrality,
        keyMarkets,
        maxFlow,
        minFlow,
      },
    };
  }, [flows, geometryData, flowThreshold, marketIntegration]);

  // Color scales using chroma.js for better visual perception
  const colorScales = useMemo(() => {
    return {
      market_integration: chroma.scale(['#fdd49e', '#d7301f']).domain([0, 1]),
      centrality: chroma.scale(['#fecc5c', '#31a354']).domain([
        0,
        metrics.centrality?.metrics?.maxCentrality || 1,
      ]),
      flow_volume: chroma.scale(['#a6bddb', '#045a8d']).domain([metrics.minFlow || 0, metrics.maxFlow || 1]),
    };
  }, [metrics]);

  // Node color based on selected metric
  const getNodeColor = useCallback(
    (node) => {
      if (!metrics.centrality) return theme.palette.grey[300];

      switch (analysisMetric) {
        case 'market_integration': {
          const score = calculateMarketIntegrationScore(node.id, marketIntegration);
          return colorScales.market_integration(score.integrationScore).hex();
        }
        case 'centrality':
          return colorScales.centrality(metrics.centrality.centrality[node.id] || 0).hex();
        case 'flow_volume': {
          const influence = calculateMarketInfluence(node.id, links, marketIntegration);
          return colorScales.flow_volume(influence.volumeShare).hex();
        }
        default:
          return theme.palette.grey[300];
      }
    },
    [analysisMetric, metrics, marketIntegration, colorScales, theme, links]
  );

  // Link styling
  const getLinkWidth = useCallback(
    (link) => {
      return Math.max(0.5, Math.min(5, (link.value / metrics.maxFlow) * 5));
    },
    [metrics.maxFlow]
  );

  // Node tooltip content
  const getNodeTooltip = useCallback(
    (node) => {
      if (!metrics.centrality?.centrality[node.id]) return node.name;

      const integration = calculateMarketIntegrationScore(node.id, marketIntegration);
      const influence = calculateMarketInfluence(node.id, links, marketIntegration);
      const keyMarket = metrics.keyMarkets.find((m) => m.market === node.id);

      return `
        <strong>Market:</strong> ${node.name}<br/>
        <strong>Role:</strong> ${keyMarket ? keyMarket.role : 'Secondary'}<br/>
        <strong>Integration Score:</strong> ${(integration.integrationScore * 100).toFixed(1)}%<br/>
        <strong>Centrality:</strong> ${metrics.centrality.centrality[node.id].toFixed(3)}<br/>
        <strong>Flow Volume Share:</strong> ${(influence.volumeShare * 100).toFixed(1)}%<br/>
        <strong>Connections:</strong> ${influence.connections}
      `;
    },
    [metrics, marketIntegration, links]
  );

  // Enable node dragging and zooming
  const handleEngineStop = useCallback((fg) => {
    fg.zoomToFit(400);
  }, []);

  if (!flows?.length || !geometryData) {
    return (
      <Paper
        sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Market Network Analysis
            <Tooltip title="Analyze market connections and price transmission patterns">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Analysis Metric</InputLabel>
            <Select
              value={analysisMetric}
              onChange={(e) => setAnalysisMetric(e.target.value)}
              label="Analysis Metric"
            >
              <MenuItem value="market_integration">Market Integration</MenuItem>
              <MenuItem value="centrality">Market Centrality</MenuItem>
              <MenuItem value="flow_volume">Flow Volume</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={3}>
          <Typography variant="body2" gutterBottom>
            Flow Threshold
          </Typography>
          <Slider
            value={flowThreshold}
            onChange={(e, newValue) => setFlowThreshold(newValue)}
            aria-labelledby="flow-threshold-slider"
            step={0.1}
            marks
            min={0}
            max={Math.max(...flows.map((flow) => flow.totalFlow))}
            valueLabelDisplay="auto"
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', height: 600 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <ForceGraph2D
                graphData={{ nodes, links }}
                nodeColor={getNodeColor}
                linkColor={() => theme.palette.grey[400]}
                nodeLabel={getNodeTooltip}
                linkWidth={getLinkWidth}
                nodeRelSize={6}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={(d) => d.value * 0.0001}
                d3VelocityDecay={0.3}
                cooldownTicks={100}
                onEngineStop={() => handleEngineStop(fgRef.current)}
                enableNodeDrag
                enableZoomPanInteraction
                ref={fgRef}
              />
            </Box>

            <Box sx={{ width: 250, ml: 2 }}>
              <NetworkGraphLegend
                metrics={metrics}
                analysisMetric={analysisMetric}
                colorScales={colorScales}
                keyMarkets={metrics.keyMarkets}
              />
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Active Markets</Typography>
                  <Typography>{nodes.length}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Active Flows</Typography>
                  <Typography>{links.length}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Key Market Hubs</Typography>
                  <Typography>
                    {metrics.keyMarkets?.filter((m) => m.role === 'hub').length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Network Density</Typography>
                  <Typography>
                    {(
                      (links.length / (nodes.length * (nodes.length - 1) * 0.5)) *
                      100
                    ).toFixed(1)}
                    %
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
});

export default NetworkGraph;
