import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';

const FlowMetricsPanel = ({
  flows,
  selectedFlow,
  metrics,
  timeRange
}) => {
  const theme = useTheme();

  // Calculate flow metrics
  const flowMetrics = useMemo(() => {
    if (!flows?.length) return null;

    const totalFlow = flows.reduce((sum, f) => sum + (f.total_flow || 0), 0);
    const avgFlow = totalFlow / flows.length;
    const maxFlow = Math.max(...flows.map(f => f.total_flow || 0));
    const minFlow = Math.min(...flows.map(f => f.total_flow || 0));

    // Calculate flow distribution
    const flowValues = flows.map(f => f.total_flow || 0);
    const mean = flowValues.reduce((sum, val) => sum + val, 0) / flowValues.length;
    const variance = flowValues.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0
    ) / flowValues.length;
    const stdDev = Math.sqrt(variance);

    // Calculate additional metrics
    const medianFlow = flowValues.sort((a, b) => a - b)[Math.floor(flowValues.length / 2)];
    const activeFlows = flowValues.filter(f => f > 0).length;
    const flowDensity = activeFlows / flows.length;

    return {
      totalFlow,
      avgFlow,
      maxFlow,
      minFlow,
      stdDev,
      flowRange: maxFlow - minFlow,
      coefficientOfVariation: stdDev / mean,
      medianFlow,
      activeFlows,
      flowDensity
    };
  }, [flows]);

  // Calculate selected flow metrics
  const selectedFlowMetrics = useMemo(() => {
    if (!selectedFlow || !flows?.length) return null;

    const flow = flows.find(f => 
      f.source === selectedFlow.source && 
      f.target === selectedFlow.target
    );

    if (!flow) return null;

    // Calculate relative metrics
    const avgFlow = flowMetrics.avgFlow;
    const relativeStrength = flow.total_flow / avgFlow;
    const percentile = flows.filter(f => 
      (f.total_flow || 0) <= (flow.total_flow || 0)
    ).length / flows.length * 100;

    return {
      ...flow,
      relativeStrength,
      percentile,
      significance: flow.total_flow > (avgFlow + flowMetrics.stdDev),
      normalizedFlow: flow.total_flow / flowMetrics.maxFlow
    };
  }, [selectedFlow, flows, flowMetrics]);

  if (!flowMetrics) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography color="textSecondary" align="center">
          No flow metrics available
        </Typography>
      </Paper>
    );
  }

  // Define metrics data
  const metricsData = [
    {
      title: 'Network Flow Strength',
      value: flowMetrics.totalFlow / (flowMetrics.maxFlow * flows.length),
      target: 0.7,
      format: 'percentage',
      description: 'Overall network flow utilization',
      tooltip: 'Measures how close the network is to its theoretical maximum capacity',
      type: 'progress',
    },
    {
      title: 'Flow Density',
      value: flowMetrics.flowDensity,
      format: 'percentage',
      description: 'Proportion of active flows in the network',
      tooltip: 'Percentage of region pairs with non-zero flows',
      type: 'card',
    },
    {
      title: 'Total Network Flow',
      value: flowMetrics.totalFlow,
      format: 'number',
      description: 'Sum of all flows in the network',
      type: 'card',
    },
    {
      title: 'Flow Variability',
      value: flowMetrics.coefficientOfVariation,
      format: 'number',
      description: 'Flow distribution consistency',
      tooltip: 'Lower values indicate more uniform flow distribution',
      type: 'card',
    },
    {
      title: 'Median Flow',
      value: flowMetrics.medianFlow,
      format: 'number',
      description: 'Middle value of all flows',
      type: 'card',
    }
  ];

  // Metrics for selected flow
  const selectedFlowMetricsData = selectedFlowMetrics
    ? [
        {
          title: 'Flow Strength',
          value: selectedFlowMetrics.normalizedFlow,
          target: 0.7,
          format: 'percentage',
          description: 'Flow strength compared to max flow',
          tooltip: 'How strong this flow is compared to the strongest flow in the network',
          type: 'progress',
        },
        {
          title: 'Relative Strength',
          value: selectedFlowMetrics.relativeStrength,
          format: 'number',
          description: 'Compared to average flow',
          tooltip: 'How many times stronger this flow is compared to the average',
          type: 'card',
        },
        {
          title: 'Flow Percentile',
          value: selectedFlowMetrics.percentile / 100,
          format: 'percentage',
          description: 'Relative position in flow distribution',
          tooltip: 'Percentage of flows that are weaker than this one',
          type: 'card',
        },
        {
          title: 'Price Differential',
          value: selectedFlowMetrics.price_differential || 0,
          format: 'percentage',
          description: 'Price difference between markets',
          tooltip: 'Percentage difference in prices between source and target markets',
          type: 'card',
        }
      ]
    : [];

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {/* Overall Flow Metrics */}
      <Typography variant="h6" gutterBottom>
        Network Flow Analysis
      </Typography>

      <Grid container spacing={2}>
        {metricsData.map((metric, index) => (
          <Grid 
            item 
            xs={12} 
            md={metric.type === 'progress' ? 12 : 6} 
            key={index}
          >
            {metric.type === 'progress' ? (
              <MetricProgress {...metric} />
            ) : (
              <MetricCard {...metric} />
            )}
          </Grid>
        ))}
      </Grid>

      {/* Selected Flow Analysis */}
      {selectedFlowMetrics && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Selected Flow Analysis
          </Typography>
          <Typography 
            variant="subtitle2" 
            color="textSecondary" 
            gutterBottom
            sx={{ mb: 2 }}
          >
            {selectedFlowMetrics.source} → {selectedFlowMetrics.target}
          </Typography>

          <Grid container spacing={2}>
            {selectedFlowMetricsData.map((metric, index) => (
              <Grid 
                item 
                xs={12} 
                md={metric.type === 'progress' ? 12 : 6} 
                key={index}
              >
                {metric.type === 'progress' ? (
                  <MetricProgress {...metric} />
                ) : (
                  <MetricCard {...metric} />
                )}
              </Grid>
            ))}
          </Grid>

          {selectedFlowMetrics.significance && (
            <Box sx={{ 
              mt: 2, 
              p: 1.5, 
              bgcolor: theme.palette.info.light,
              borderRadius: 1
            }}>
              <Typography variant="body2" color="info.contrastText">
                This is a significant flow, exceeding the average by more than one
                standard deviation.
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

FlowMetricsPanel.propTypes = {
  flows: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    total_flow: PropTypes.number,
    price_differential: PropTypes.number,
  })).isRequired,
  selectedFlow: PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
  }),
  metrics: PropTypes.object,
  timeRange: PropTypes.string,
};

export default React.memo(FlowMetricsPanel);
