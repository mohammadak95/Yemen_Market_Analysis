import React, { useState, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Card,
  CardContent
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FlowMap from './FlowMap';
import FlowMetricsPanel from './FlowMetricsPanel';
import { useFlowAnalysis } from '../../hooks/useFlowAnalysis';
import { useSelector } from 'react-redux';
import { selectMarketFlows, selectMarketIntegration, selectGeometryData } from '../../../../../selectors/optimizedSelectors';

const FlowNetworkAnalysis = () => {
  const theme = useTheme();
  const flows = useSelector(selectMarketFlows);
  const marketIntegration = useSelector(selectMarketIntegration);
  const geometry = useSelector(selectGeometryData);

  const [flowThreshold, setFlowThreshold] = useState(0);
  const [metricType, setMetricType] = useState('total_flow');
  const [timeAggregation, setTimeAggregation] = useState('monthly');

  const { flowMetrics, networkStats, timeSeriesFlows, filteredFlows } = useFlowAnalysis(
    flows,
    marketIntegration,
    flowThreshold,
    metricType
  );

  const handleThresholdChange = (event, newValue) => {
    setFlowThreshold(newValue);
  };

  const maxFlowValue = useMemo(() => {
    return Math.max(...flows.map(flow => flow[metricType] || 0), 100);
  }, [flows, metricType]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Market Flow Network Analysis
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small">
              <InputLabel>Metric Type</InputLabel>
              <Select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                label="Metric Type"
              >
                <MenuItem value="total_flow">Total Flow Volume</MenuItem>
                <MenuItem value="avg_price_differential">Average Price Differential</MenuItem>
                <MenuItem value="flow_count">Flow Frequency</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>Time Aggregation</InputLabel>
              <Select
                value={timeAggregation}
                onChange={(e) => setTimeAggregation(e.target.value)}
                label="Time Aggregation"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ width: 200 }}>
              <Typography variant="body2">Flow Threshold: {flowThreshold}</Typography>
              <Slider
                value={flowThreshold}
                min={0}
                max={maxFlowValue}
                onChange={handleThresholdChange}
                valueLabelDisplay="auto"
                aria-label="Flow threshold"
              />
            </Box>
          </Box>
        </Grid>

        {/* Map */}
        <Grid item xs={12} md={8}>
          <FlowMap
            visualizationMode="flows"
            metricType={metricType}
            flowThreshold={flowThreshold}
          />
        </Grid>

        {/* Metrics Panel */}
        <Grid item xs={12} md={4}>
          <FlowMetricsPanel
            flowMetrics={flowMetrics}
            networkStats={networkStats}
            timeSeriesFlows={timeSeriesFlows}
            timeAggregation={timeAggregation}
          />
        </Grid>

        {/* About This Visualization */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About This Visualization
              </Typography>
              <Typography variant="body2" paragraph>
                The Market Flow Network Analysis provides a comprehensive view of trade relationships
                and price transmission patterns between markets in Yemen. This visualization helps
                understand market integration, identify key trade corridors, and assess the efficiency
                of price transmission across different regions.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Flow Map Features:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li>Line thickness shows flow volume strength</li>
                    <li>Color intensity indicates price differentials</li>
                    <li>Arrow direction shows dominant flow patterns</li>
                    <li>Node size represents market importance</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Analysis Controls:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li>Metric Selection: Choose flow analysis type</li>
                    <li>Time Aggregation: Adjust temporal resolution</li>
                    <li>Flow Threshold: Filter by significance level</li>
                    <li>Interactive tooltips with detailed metrics</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Network Metrics:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <li>Total Flow Volume: Trade intensity measure</li>
                    <li>Price Differential: Market price gaps</li>
                    <li>Flow Frequency: Trade relationship strength</li>
                    <li>Market Integration Score: Overall connectivity</li>
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                Interpretation Guide:
              </Typography>
              <Box>
                <Typography variant="body2">
                  The network visualization reveals market relationships through multiple lenses:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  <li>
                    <strong>Flow Volumes:</strong> Thicker lines indicate stronger trade relationships.
                    High-volume flows often represent critical supply routes that need protection
                    and support.
                  </li>
                  <li>
                    <strong>Price Differentials:</strong> Color intensity shows price gaps between
                    markets. Large differentials may indicate trade barriers or market inefficiencies
                    requiring intervention.
                  </li>
                  <li>
                    <strong>Market Hubs:</strong> Larger nodes with many connections represent key
                    distribution centers. These markets are crucial for price stability and supply
                    chain resilience.
                  </li>
                  <li>
                    <strong>Flow Patterns:</strong> Directional arrows show predominant trade flows.
                    Understanding these patterns helps in planning interventions and predicting
                    shock propagation.
                  </li>
                </Box>
                <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                  Key Analysis Approaches:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>
                    <strong>Regional Integration:</strong> Assess connectivity between different
                    regions by examining flow densities and price differentials.
                  </li>
                  <li>
                    <strong>Market Hierarchy:</strong> Identify primary, secondary, and tertiary
                    markets based on their connection patterns and flow volumes.
                  </li>
                  <li>
                    <strong>Temporal Patterns:</strong> Use time aggregation to understand how
                    trade relationships evolve over different time scales.
                  </li>
                  <li>
                    <strong>Network Resilience:</strong> Evaluate alternative trade routes and
                    redundancy in the network to assess system robustness.
                  </li>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  This analysis is crucial for identifying market vulnerabilities, planning
                  interventions, and improving market efficiency. Focus on areas with weak
                  connections or high price differentials for targeted support, while protecting
                  and enhancing critical trade corridors identified through flow volumes and
                  frequency analysis.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default React.memo(FlowNetworkAnalysis);
