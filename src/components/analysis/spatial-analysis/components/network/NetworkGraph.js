// src/components/analysis/spatial-analysis/components/network/NetworkGraph.js

import React, { useMemo, useCallback, useState, useRef } from 'react';
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
  Card,
  CardContent,
  Alert,
  LinearProgress
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import chroma from 'chroma-js';
import {
  calculateMarketIntegrationScore,
  calculateMarketInfluence,
} from '../../utils/networkAnalysis';
import { 
  selectUnifiedGeometry, 
  selectMarketFlows, 
  selectMarketIntegration,
} from '../../../../../selectors/optimizedSelectors';
import { useNetworkAnalysis } from '../../hooks/useNetworkAnalysis';
import { backgroundMonitor } from '../../../../../utils/backgroundMonitor';
import NetworkGraphLegend from './NetworkGraphLegend';

// Error boundary component for ForceGraph
class ForceGraphErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    backgroundMonitor.logError('force-graph-render', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          Error rendering network graph: {this.state.error?.message}
        </Alert>
      );
    }
    return this.props.children;
  }
}

const NetworkGraph = React.memo(() => {
  const theme = useTheme();
  const [analysisMetric, setAnalysisMetric] = useState('market_integration');
  const [flowThreshold, setFlowThreshold] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const fgRef = useRef(null);

  // Redux selectors
  const geometry = useSelector(selectUnifiedGeometry);
  const flows = useSelector(selectMarketFlows);
  const marketIntegration = useSelector(selectMarketIntegration);

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
      backgroundMonitor.logError('node-color-calculation', {
        message: error.message,
        node,
        analysisMetric
      });
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
        <strong>Market:</strong> ${node.name}<br/>
        <strong>Role:</strong> ${keyMarket ? keyMarket.role : 'Secondary'}<br/>
        <strong>Integration Score:</strong> ${((integration.integrationScore || 0) * 100).toFixed(1)}%<br/>
        <strong>Centrality:</strong> ${(metrics.centrality.centrality[node.id] || 0).toFixed(3)}<br/>
        <strong>Flow Volume Share:</strong> ${((influence.volumeShare || 0) * 100).toFixed(1)}%<br/>
        <strong>Connections:</strong> ${influence.connections || 0}<br/>
        ${networkMetrics ? `<strong>Market Power:</strong> ${(networkMetrics.flows.totalVolume || 0).toFixed(2)}` : ''}
      `;
    } catch (error) {
      backgroundMonitor.logError('tooltip-generation', {
        message: error.message,
        node
      });
      return node.name;
    }
  }, [metrics, marketIntegration, links]);

  // Graph zoom handling
  const handleEngineStop = useCallback((fg) => {
    if (fg) {
      fg.zoomToFit(400);
    }
  }, []);

  // Handle graph initialization
  const handleGraphInit = useCallback(() => {
    setIsLoading(true);
    const initMetric = backgroundMonitor.startMetric('graph-initialization');
    
    try {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400);
      }
      initMetric.finish({ status: 'success' });
    } catch (error) {
      backgroundMonitor.logError('graph-initialization', {
        message: error.message,
        stack: error.stack
      });
      initMetric.finish({ status: 'failed' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  if (!flows?.length || !geometry) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!nodes.length || !links.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="warning">
          No valid network data available for visualization. Please ensure market locations and flow data are properly configured.
        </Alert>
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
          {isLoading && <LinearProgress sx={{ mt: 1 }} />}
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
            max={Math.max(...(flows.map(flow => flow.totalFlow) || [1]))}
            valueLabelDisplay="auto"
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', height: 600 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <ForceGraphErrorBoundary>
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
                  onEngineStart={handleGraphInit}
                  enableNodeDrag
                  enableZoomPanInteraction
                  ref={fgRef}
                />
              </ForceGraphErrorBoundary>
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
