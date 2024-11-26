// src/components/analysis/spatial-analysis/components/flows/FlowNetworkAnalysis.js

import React, { useState } from 'react';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FlowMap from './FlowMap';
import FlowMetricsPanel from './FlowMetricsPanel';
import { useFlowAnalysis } from '../../hooks/useFlowAnalysis';
import { useSelector } from 'react-redux';
import { selectFlowsWithCoordinates, selectMarketIntegration } from '../../../../../selectors/optimizedSelectors';
import { selectGeometryData } from '../../../../../slices/spatialSlice';

const FlowNetworkAnalysis = () => {
  const theme = useTheme();
  const flows = useSelector(selectFlowsWithCoordinates);
  const marketIntegration = useSelector(selectMarketIntegration);
  const geometry = useSelector(selectGeometryData);

  const [flowThreshold, setFlowThreshold] = useState(0);
  const [metricType, setMetricType] = useState('total_flow'); // 'total_flow', 'avg_price_differential', 'flow_count'
  const [timeAggregation, setTimeAggregation] = useState('monthly'); // 'daily', 'weekly', 'monthly'

  const { flowMetrics, networkStats, timeSeriesFlows, filteredFlows } = useFlowAnalysis(
    flows, 
    marketIntegration, 
    flowThreshold,
    metricType
  );

  const handleThresholdChange = (event, newValue) => {
    setFlowThreshold(newValue);
  };

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
                max={Math.max(...flows.map(flow => flow[metricType])) || 100}
                onChange={handleThresholdChange}
                valueLabelDisplay="auto"
                aria-label="Flow threshold"
              />
            </Box>
          </Box>
        </Grid>

        {/* Map */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <FlowMap
              flows={filteredFlows}
              metricType={metricType}
              geometry={geometry}
            />
          </Paper>
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
      </Grid>
    </Paper>
  );
};

export default FlowNetworkAnalysis;
