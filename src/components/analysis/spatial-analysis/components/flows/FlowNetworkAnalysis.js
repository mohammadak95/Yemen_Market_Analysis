// src/components/analysis/spatial-analysis/components/flows/FlowNetworkAnalysis.js

import React, { useMemo, useState } from 'react';
import { 
  Paper, Box, Typography, Grid, Card, CardContent,
  Slider, FormControl, InputLabel, Select, MenuItem,
  ToggleButtonGroup, ToggleButton 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer, Sankey, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import FlowMap from './FlowMap';
import FlowMetricsPanel from './FlowMetricsPanel';
import { useFlowAnalysis } from '../../hooks/useFlowAnalysis';

const FlowNetworkAnalysis = ({
  flows,
  spatialAutocorrelation,
  marketIntegration,
  geometry,
  marketClusters
}) => {
  const theme = useTheme();
  const [flowThreshold, setFlowThreshold] = useState(0);
  const [viewMode, setViewMode] = useState('map'); // 'map', 'sankey', 'metrics'
  const [metricType, setMetricType] = useState('volume'); // 'volume', 'price_diff', 'frequency'
  const [timeAggregation, setTimeAggregation] = useState('monthly');

  const { 
    flowMetrics,
    networkStats,
    timeSeriesFlows,
    marketConnectivity
  } = useFlowAnalysis(flows, marketIntegration, flowThreshold);

  const handleThresholdChange = (event, newValue) => {
    setFlowThreshold(newValue);
  };

  const filteredFlows = useMemo(() => {
    return flows.filter(flow => flow.total_flow >= flowThreshold);
  }, [flows, flowThreshold]);

  const sankeyData = useMemo(() => {
    return {
      nodes: [...new Set([
        ...filteredFlows.map(f => f.source),
        ...filteredFlows.map(f => f.target)
      ])].map(id => ({
        id,
        name: id,
        value: flowMetrics.nodeValues[id] || 0
      })),
      links: filteredFlows.map(flow => ({
        source: flow.source,
        target: flow.target,
        value: flow[metricType === 'volume' ? 'total_flow' : 
               metricType === 'price_diff' ? 'avg_price_differential' : 
               'flow_count']
      }))
    };
  }, [filteredFlows, flowMetrics, metricType]);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Market Flow Network Analysis
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Metric Type</InputLabel>
              <Select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
              >
                <MenuItem value="volume">Flow Volume</MenuItem>
                <MenuItem value="price_diff">Price Differential</MenuItem>
                <MenuItem value="frequency">Flow Frequency</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Flow Threshold: {flowThreshold.toFixed(2)}
            </Typography>
            <Slider
              value={flowThreshold}
              onChange={handleThresholdChange}
              min={0}
              max={Math.max(...flows.map(f => f.total_flow))}
              step={0.1}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="map">Map View</ToggleButton>
              <ToggleButton value="sankey">Network View</ToggleButton>
              <ToggleButton value="metrics">Metrics</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        {viewMode === 'map' && (
          <FlowMap
            flows={filteredFlows}
            geometry={geometry}
            metricType={metricType}
            flowMetrics={flowMetrics}
          />
        )}

        {viewMode === 'sankey' && (
          <Card sx={{ height: '500px' }}>
            <CardContent sx={{ height: '100%' }}>
              <ResponsiveContainer>
                <Sankey
                  data={sankeyData}
                  nodeWidth={15}
                  nodePadding={10}
                  linkColor={theme.palette.primary.light}
                  nodeColor={theme.palette.primary.main}
                >
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1 }}>
                          {data.source && (
                            <Typography variant="body2">
                              {data.source} → {data.target}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            Value: {data.value?.toFixed(2)}
                          </Typography>
                        </Box>
                      );
                    }}
                  />
                </Sankey>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {viewMode === 'metrics' && (
          <FlowMetricsPanel
            flowMetrics={flowMetrics}
            networkStats={networkStats}
            timeAggregation={timeAggregation}
            onTimeAggregationChange={(value) => setTimeAggregation(value)}
          />
        )}
      </Box>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Flow Trends Over Time
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={timeSeriesFlows[timeAggregation]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="totalFlow"
                  stroke={theme.palette.primary.main}
                  name="Total Flow"
                />
                <Line
                  type="monotone"
                  dataKey="avgPriceDiff"
                  stroke={theme.palette.secondary.main}
                  name="Avg Price Differential"
                />
                <Line
                  type="monotone"
                  dataKey="flowCount"
                  stroke={theme.palette.error.main}
                  name="Flow Count"
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Paper>
  );
};

export default FlowNetworkAnalysis;