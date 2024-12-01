import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

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

    return {
      totalFlow,
      avgFlow,
      maxFlow,
      minFlow,
      stdDev,
      flowRange: maxFlow - minFlow,
      coefficientOfVariation: stdDev / mean
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
      significance: flow.total_flow > (avgFlow + flowMetrics.stdDev)
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

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {/* Overall Flow Metrics */}
      <Typography variant="h6" gutterBottom>
        Flow Metrics
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <MetricProgress
            title="Network Flow Strength"
            value={flowMetrics.totalFlow / (flowMetrics.maxFlow * flows.length)}
            target={0.7}
            format="percentage"
            description="Overall network flow utilization"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Flow Variability"
            value={flowMetrics.coefficientOfVariation}
            format="number"
            description="Flow distribution consistency"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Flow Range"
            value={flowMetrics.flowRange}
            format="number"
            description="Difference between max and min flows"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Selected Flow Analysis */}
      {selectedFlowMetrics && (
        <>
          <Typography variant="h6" gutterBottom>
            Selected Flow Analysis
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {selectedFlowMetrics.source} → {selectedFlowMetrics.target}
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Flow Strength
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(selectedFlowMetrics.total_flow / flowMetrics.maxFlow) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                mt: 0.5
              }}>
                <Typography variant="caption">
                  {selectedFlowMetrics.total_flow.toFixed(2)}
                </Typography>
                <Typography variant="caption">
                  {`${selectedFlowMetrics.percentile.toFixed(1)}th percentile`}
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <MetricCard
                  title="Relative Strength"
                  value={selectedFlowMetrics.relativeStrength}
                  format="number"
                  description="Compared to average flow"
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="Price Differential"
                  value={selectedFlowMetrics.price_differential || 0}
                  format="percentage"
                  description="Price difference between markets"
                />
              </Grid>
            </Grid>

            {selectedFlowMetrics.significance && (
              <Box sx={{ 
                mt: 2, 
                p: 1, 
                bgcolor: theme.palette.info.light,
                borderRadius: 1
              }}>
                <Typography variant="body2" color="info.contrastText">
                  This is a significant flow, exceeding the average by more than one
                  standard deviation.
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Flow Distribution */}
      <Typography variant="h6" gutterBottom>
        Flow Distribution
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Standard Deviation
            </Typography>
            <Typography variant="h6">
              {flowMetrics.stdDev.toFixed(2)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Average Flow
            </Typography>
            <Typography variant="h6">
              {flowMetrics.avgFlow.toFixed(2)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Flow Range */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Flow Range
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Min Flow
            </Typography>
            <Typography>
              {flowMetrics.minFlow.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, mx: 2 }}>
            <LinearProgress
              variant="determinate"
              value={100}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Max Flow
            </Typography>
            <Typography>
              {flowMetrics.maxFlow.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

FlowMetricsPanel.propTypes = {
  flows: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired,
    total_flow: PropTypes.number,
    price_differential: PropTypes.number
  })).isRequired,
  selectedFlow: PropTypes.shape({
    source: PropTypes.string.isRequired,
    target: PropTypes.string.isRequired
  }),
  metrics: PropTypes.object,
  timeRange: PropTypes.string
};

export default React.memo(FlowMetricsPanel);
