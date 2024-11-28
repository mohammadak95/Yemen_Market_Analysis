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

  // Color scales with more distinct colors
  const colorScales = useMemo(() => ({
    market_integration: chroma.scale(['#FFA07A', '#FF0000']).domain([0, 1]),
    centrality: chroma.scale(['#98FB98', '#006400']).domain([
      0,
      metrics.centrality?.metrics?.maxCentrality || 1,
    ]),
    flow_volume: chroma.scale(['#87CEEB', '#00008B']).domain([
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

  // Link width calculation for more visible lines
  const getLinkWidth = useCallback((link) => {
    if (!metrics.maxFlow) return 2;
    return Math.max(2, Math.min(8, (link.value / metrics.maxFlow) * 8));
  }, [metrics.maxFlow]);

  // Node tooltip content
  const getNodeTooltip = useCallback((node) => {
    if (!metrics.centrality?.centrality[node.id]) {
      return (
        <div style={{ padding: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{node.name}</div>
          <div>No metrics available</div>
        </div>
      );
    }

    try {
      const integration = calculateMarketIntegrationScore(node.id, marketIntegration);
      const influence = calculateMarketInfluence(node.id, links, marketIntegration);
      const keyMarket = metrics.keyMarkets?.find(m => m.market === node.id);
      const networkMetrics = metrics.networkAnalysis?.markets[node.id];

      return (
        <div style={{ padding: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{node.name}</div>
          <div>Role: {keyMarket ? keyMarket.role : 'Secondary'}</div>
          <div>Integration: {((integration.integrationScore || 0) * 100).toFixed(1)}%</div>
          <div>Centrality: {(metrics.centrality.centrality[node.id] || 0).toFixed(3)}</div>
          <div>Flow Share: {((influence.volumeShare || 0) * 100).toFixed(1)}%</div>
          <div>Connections: {influence.connections || 0}</div>
          {networkMetrics && (
            <div>Volume: {(networkMetrics.flows.totalVolume || 0).toFixed(2)}</div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error generating tooltip:', error);
      return (
        <div style={{ padding: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{node.name}</div>
          <div>Error loading metrics</div>
        </div>
      );
    }
  }, [metrics, marketIntegration, links]);

  // Legend component
  const Legend = () => (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 2,
        borderRadius: 1,
        zIndex: 1000,
        boxShadow: 1,
        maxWidth: 300
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        {analysisMetric === 'market_integration' && 'Market Integration'}
        {analysisMetric === 'centrality' && 'Market Centrality'}
        {analysisMetric === 'flow_volume' && 'Flow Volume'}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: colorScales[analysisMetric](1).hex() }} />
          <Typography variant="caption">High</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: colorScales[analysisMetric](0.5).hex() }} />
          <Typography variant="caption">Medium</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: colorScales[analysisMetric](0).hex() }} />
          <Typography variant="caption">Low</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box sx={{ width: 30, height: 4, bgcolor: theme.palette.grey[600] }} />
          <Typography variant="caption">Trade Flow</Typography>
        </Box>
      </Box>
    </Box>
  );

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
            <MapContainer
              center={[15.3694, 44.191]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              
              {/* Draw links with increased visibility */}
              {links.map((link, index) => {
                const sourceNode = nodes.find(n => n.id === link.source);
                const targetNode = nodes.find(n => n.id === link.target);
                if (!sourceNode || !targetNode) return null;

                return (
                  <Polyline
                    key={`link-${index}`}
                    positions={[
                      [sourceNode.y, sourceNode.x],
                      [targetNode.y, targetNode.x]
                    ]}
                    color={theme.palette.grey[600]}
                    weight={getLinkWidth(link)}
                    opacity={0.8}
                  />
                );
              })}

              {/* Draw nodes with increased size */}
              {nodes.map((node) => (
                <CircleMarker
                  key={node.id}
                  center={[node.y, node.x]}
                  radius={10}
                  fillColor={getNodeColor(node)}
                  color="#fff"
                  weight={2}
                  fillOpacity={0.9}
                >
                  <Popup>
                    {getNodeTooltip(node)}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
            <Legend />
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

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About This Visualization
              </Typography>
              <Typography variant="body2" paragraph>
                The Market Network Graph provides a sophisticated visualization of Yemen's market system,
                revealing complex trade relationships, market hierarchies, and price transmission patterns.
                This interactive tool helps identify critical market hubs, assess system resilience, and
                guide market development strategies.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Visual Elements:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li>Nodes represent individual markets, sized by importance</li>
                    <li>Lines show trade connections and flow strength</li>
                    <li>Colors indicate different market characteristics</li>
                    <li>Interactive tooltips provide detailed metrics</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Analysis Metrics:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li>
                      <strong>Market Integration:</strong> Red intensity shows price co-movement strength
                    </li>
                    <li>
                      <strong>Market Centrality:</strong> Green intensity indicates network importance
                    </li>
                    <li>
                      <strong>Flow Volume:</strong> Blue intensity shows trade volume levels
                    </li>
                    <li>
                      <strong>Network Density:</strong> Overall connectivity measure
                    </li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Interactive Features:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li>Metric selection for different analyses</li>
                    <li>Flow threshold adjustment</li>
                    <li>Detailed market statistics on click</li>
                    <li>Dynamic network statistics updates</li>
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                Interpretation Guide:
              </Typography>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Market Roles and Characteristics:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0, mb: 2 }}>
                  <li>
                    <strong>Hub Markets:</strong> Large nodes with many connections indicate major
                    distribution centers crucial for price stability
                  </li>
                  <li>
                    <strong>Bridge Markets:</strong> Markets connecting different regions, critical
                    for inter-regional trade
                  </li>
                  <li>
                    <strong>Peripheral Markets:</strong> Smaller nodes with fewer connections,
                    potentially requiring integration support
                  </li>
                  <li>
                    <strong>Isolated Markets:</strong> Disconnected or weakly connected nodes
                    indicating potential access issues
                  </li>
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Network Analysis Applications:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>
                    <strong>Market Development:</strong> Identify areas needing improved connectivity
                    or infrastructure
                  </li>
                  <li>
                    <strong>Risk Assessment:</strong> Evaluate system vulnerability to disruptions
                    in key markets or trade routes
                  </li>
                  <li>
                    <strong>Integration Planning:</strong> Guide interventions to strengthen weak
                    market connections
                  </li>
                  <li>
                    <strong>Policy Support:</strong> Inform decisions on market system development
                    and trade facilitation
                  </li>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  For optimal analysis, combine different metrics to understand both structural
                  (centrality) and functional (integration) aspects of the market system. Pay
                  special attention to markets showing high centrality but low integration, as
                  these may represent opportunities for targeted interventions.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
});

export default NetworkGraph;
