// src/components/analysis/spatial-analysis/components/network/NetworkGraph.js

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
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
  Card,
  CardContent,
  Alert
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import chroma from 'chroma-js';
import {
  calculateMarketIntegrationScore,
  calculateMarketInfluence,
} from '../../utils/networkAnalysis';
import { useNetworkAnalysis } from '../../hooks/useNetworkAnalysis';
import { backgroundMonitor } from '../../../../../utils/backgroundMonitor';

const NetworkGraph = React.memo(() => {
  const theme = useTheme();
  const [analysisMetric, setAnalysisMetric] = useState('market_integration');
  const [flowThreshold, setFlowThreshold] = useState(0.1);
  const mapRef = useRef(null);

  // Get data from Redux
  const geometry = useSelector(state => state.spatial.data.geometry);
  const flows = useSelector(state => state.spatial.data.flowMaps);
  const marketIntegration = useSelector(state => state.spatial.data.marketIntegration);

  // Calculate valid min and max for the slider
  const maxFlowValue = useMemo(() => {
    if (!flows?.length) return 1;
    const max = Math.max(...flows.map(flow => flow.total_flow || 0));
    return max > 0 ? max : 1;
  }, [flows]);

  // Use network analysis hook
  const { nodes, links, metrics, error } = useNetworkAnalysis(
    geometry,
    flows,
    marketIntegration,
    flowThreshold
  );

  // Color scales
  const colorScales = useMemo(() => ({
    market_integration: chroma.scale(['#fdd49e', '#d7301f']).domain([0, 1]),
    centrality: chroma.scale(['#fecc5c', '#31a354']).domain([
      0,
      metrics.centrality?.metrics?.maxCentrality || 1,
    ]),
    flow_volume: chroma.scale(['#a6bddb', '#045a8d']).domain([
      metrics.minFlow || 0, 
      metrics.maxFlow || 1
    ]),
  }), [metrics]);

  // Node color calculation
  const getNodeColor = useCallback((node) => {
    if (!metrics.centrality) return theme.palette.grey[300];

    try {
      switch (analysisMetric) {
        case 'market_integration': {
          const score = calculateMarketIntegrationScore(node.id, marketIntegration);
          return colorScales.market_integration(score.integrationScore || 0).hex();
        }
        case 'centrality':
          return colorScales.centrality(metrics.centrality.centrality[node.id] || 0).hex();
        case 'flow_volume': {
          const influence = calculateMarketInfluence(node.id, links, marketIntegration);
          return colorScales.flow_volume(influence.volumeShare || 0).hex();
        }
        default:
          return theme.palette.grey[300];
      }
    } catch (error) {
      console.error('Error calculating node color:', error);
      return theme.palette.grey[300];
    }
  }, [analysisMetric, metrics, marketIntegration, colorScales, theme, links]);

  // Link width calculation
  const getLinkWidth = useCallback((link) => {
    if (!metrics.maxFlow) return 0.5;
    return Math.max(0.5, Math.min(5, (link.value / metrics.maxFlow) * 5));
  }, [metrics.maxFlow]);

  // Node tooltip content
  const getNodeTooltip = useCallback((node) => {
    if (!metrics.centrality?.centrality[node.id]) return node.name;

    try {
      const integration = calculateMarketIntegrationScore(node.id, marketIntegration);
      const influence = calculateMarketInfluence(node.id, links, marketIntegration);
      const keyMarket = metrics.keyMarkets?.find(m => m.market === node.id);
      const networkMetrics = metrics.networkAnalysis?.markets[node.id];

      return `
        <div style="padding: 8px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${node.name}</div>
          <div>Role: ${keyMarket ? keyMarket.role : 'Secondary'}</div>
          <div>Integration: ${((integration.integrationScore || 0) * 100).toFixed(1)}%</div>
          <div>Centrality: ${(metrics.centrality.centrality[node.id] || 0).toFixed(3)}</div>
          <div>Flow Share: ${((influence.volumeShare || 0) * 100).toFixed(1)}%</div>
          <div>Connections: ${influence.connections || 0}</div>
          ${networkMetrics ? `<div>Volume: ${(networkMetrics.flows.totalVolume || 0).toFixed(2)}</div>` : ''}
        </div>
      `;
    } catch (error) {
      console.error('Error generating tooltip:', error);
      return node.name;
    }
  }, [metrics, marketIntegration, links]);

  // Graph zoom handling
  const handleEngineStop = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  }, []);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!flows?.length || !geometry) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!nodes.length || !links.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No valid network data available for visualization. Please ensure market locations and flow data are properly configured.
      </Alert>
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
            marks={[
              { value: 0, label: '0' },
              { value: maxFlowValue / 2, label: (maxFlowValue / 2).toFixed(1) },
              { value: maxFlowValue, label: maxFlowValue.toFixed(1) }
            ]}
            min={0}
            max={maxFlowValue}
            valueLabelDisplay="auto"
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ height: 600, position: 'relative' }}>
            <ForceGraph2D
              ref={fgRef}
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
              onEngineStop={handleEngineStop}
              enableNodeDrag={true}
              enableZoomPanInteraction={true}
            />
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
                    {metrics.keyMarkets?.filter(m => m.role === 'hub').length || 0}
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
