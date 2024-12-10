/**
 * Market Flow Metrics Panel Component
 * 
 * Provides comprehensive analysis of market flow patterns including:
 * - Network-level metrics
 * - Individual flow analysis
 * - Statistical significance testing
 * - Trend analysis
 */

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Alert
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';
import { 
  FLOW_THRESHOLDS, 
  NETWORK_THRESHOLDS,
  FLOW_STATUS 
} from './types';

// Helper function to calculate statistical significance
const calculateSignificance = (value, mean, stdDev) => {
  if (!stdDev) return { significant: false, zScore: 0 };
  const zScore = (value - mean) / stdDev;
  return {
    significant: Math.abs(zScore) > 1.96, // 95% confidence level
    zScore,
    pValue: 2 * (1 - normalCDF(Math.abs(zScore)))
  };
};

// Helper function for normal CDF
const normalCDF = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

const FlowMetricsPanel = ({
  flows,
  selectedFlow,
  metrics,
  timeRange
}) => {
  const theme = useTheme();
  const [showMethodology, setShowMethodology] = useState(false);

  // Calculate comprehensive flow metrics with error handling
  const flowMetrics = useMemo(() => {
    if (!Array.isArray(flows) || !flows.length) {
      console.warn('Invalid or empty flows data');
      return null;
    }

    try {
      // Basic flow metrics
      const flowValues = flows.map(f => f.total_flow || 0);
      const totalFlow = flowValues.reduce((sum, val) => sum + val, 0);
      const mean = totalFlow / flowValues.length;
      const variance = flowValues.reduce((sum, val) => 
        sum + Math.pow(val - mean, 2), 0
      ) / flowValues.length;
      const stdDev = Math.sqrt(variance);

      // Advanced metrics
      const sortedFlows = [...flowValues].sort((a, b) => a - b);
      const medianFlow = sortedFlows[Math.floor(flowValues.length / 2)];
      const q1 = sortedFlows[Math.floor(flowValues.length * 0.25)];
      const q3 = sortedFlows[Math.floor(flowValues.length * 0.75)];
      const iqr = q3 - q1;

      // Network metrics
      const activeFlows = flowValues.filter(f => f > 0).length;
      const maxPossibleFlows = flows.length * (flows.length - 1) / 2;
      const flowDensity = activeFlows / maxPossibleFlows;

      // Distribution metrics
      const skewness = flowValues.reduce((sum, val) => 
        sum + Math.pow((val - mean) / stdDev, 3), 0
      ) / flowValues.length;

      const kurtosis = flowValues.reduce((sum, val) => 
        sum + Math.pow((val - mean) / stdDev, 4), 0
      ) / flowValues.length - 3;

      return {
        totalFlow,
        avgFlow: mean,
        maxFlow: Math.max(...flowValues),
        minFlow: Math.min(...flowValues),
        medianFlow,
        stdDev,
        flowRange: sortedFlows[sortedFlows.length - 1] - sortedFlows[0],
        coefficientOfVariation: stdDev / mean,
        activeFlows,
        flowDensity,
        distribution: {
          q1,
          q3,
          iqr,
          skewness,
          kurtosis
        },
        networkMetrics: {
          density: flowDensity,
          connectivity: activeFlows / flows.length,
          centralization: maxPossibleFlows > 0 ? 
            activeFlows / maxPossibleFlows : 0
        }
      };
    } catch (error) {
      console.error('Error calculating flow metrics:', error);
      return null;
    }
  }, [flows]);

  // Calculate selected flow metrics with enhanced analysis
  const selectedFlowMetrics = useMemo(() => {
    if (!selectedFlow || !flowMetrics) return null;

    try {
      const flow = flows.find(f => 
        f.source === selectedFlow.source && 
        f.target === selectedFlow.target
      );

      if (!flow) return null;

      // Calculate relative metrics
      const relativeStrength = flow.total_flow / flowMetrics.avgFlow;
      const percentile = flows.filter(f => 
        (f.total_flow || 0) <= (flow.total_flow || 0)
      ).length / flows.length * 100;

      // Calculate significance
      const significance = calculateSignificance(
        flow.total_flow,
        flowMetrics.avgFlow,
        flowMetrics.stdDev
      );

      // Determine flow status
      const normalizedFlow = flow.total_flow / flowMetrics.maxFlow;
      const status = normalizedFlow >= FLOW_THRESHOLDS.HIGH ? FLOW_STATUS.ACTIVE :
                    normalizedFlow >= FLOW_THRESHOLDS.MEDIUM ? FLOW_STATUS.STABLE :
                    normalizedFlow >= FLOW_THRESHOLDS.LOW ? FLOW_STATUS.PARTIAL :
                    FLOW_STATUS.INACTIVE;

      return {
        ...flow,
        relativeStrength,
        percentile,
        normalizedFlow,
        significance,
        status,
        metrics: {
          zScore: significance.zScore,
          pValue: significance.pValue,
          standardizedValue: (flow.total_flow - flowMetrics.avgFlow) / flowMetrics.stdDev
        }
      };
    } catch (error) {
      console.error('Error calculating selected flow metrics:', error);
      return null;
    }
  }, [selectedFlow, flows, flowMetrics]);

  if (!flowMetrics) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Alert severity="warning">
          No flow metrics available. Please ensure data is properly loaded.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Network Flow Analysis */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Network Flow Analysis
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <MetricProgress
              title="Network Flow Strength"
              value={flowMetrics.networkMetrics.density}
              target={NETWORK_THRESHOLDS.DENSITY.HIGH}
              format="percentage"
              description="Overall network utilization"
              tooltip="Measures how close the network is to its theoretical maximum capacity"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <MetricCard
              title="Flow Density"
              value={flowMetrics.flowDensity}
              format="percentage"
              description="Active market connections"
              tooltip="Percentage of potential market connections that are active"
              thresholds={NETWORK_THRESHOLDS.DENSITY}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <MetricCard
              title="Network Connectivity"
              value={flowMetrics.networkMetrics.connectivity}
              format="percentage"
              description="Market integration level"
              tooltip="Degree of market integration in the network"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        
        {/* Distribution Metrics */}
        <Typography variant="subtitle1" gutterBottom>
          Flow Distribution
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <MetricCard
              title="Variability"
              value={flowMetrics.coefficientOfVariation}
              format="number"
              description="Flow consistency"
              tooltip="Lower values indicate more uniform flow distribution"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <MetricCard
              title="Distribution Shape"
              value={flowMetrics.distribution.skewness}
              format="number"
              description="Flow symmetry"
              tooltip="Positive values indicate right-skewed distribution"
            />
          </Grid>
        </Grid>
      </Box>

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
            <Grid item xs={12}>
              <MetricProgress
                title="Flow Strength"
                value={selectedFlowMetrics.normalizedFlow}
                target={FLOW_THRESHOLDS.HIGH}
                format="percentage"
                description="Relative to maximum flow"
                tooltip="How strong this flow is compared to the strongest flow in the network"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <MetricCard
                title="Statistical Significance"
                value={Math.abs(selectedFlowMetrics.metrics.zScore)}
                format="number"
                description={`p-value: ${selectedFlowMetrics.metrics.pValue.toFixed(4)}`}
                tooltip="Z-score indicates deviation from mean in standard deviations"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <MetricCard
                title="Flow Percentile"
                value={selectedFlowMetrics.percentile / 100}
                format="percentage"
                description="Relative ranking"
                tooltip="Percentage of flows that are weaker than this one"
              />
            </Grid>
          </Grid>

          {selectedFlowMetrics.significance.significant && (
            <Alert 
              severity="info" 
              sx={{ mt: 2 }}
              icon={<InfoOutlinedIcon />}
            >
              This is a statistically significant flow (p &lt; 0.05), indicating
              a strong market connection.
            </Alert>
          )}
        </>
      )}

      {/* Methodology Section */}
      <Box sx={{ mt: 3 }}>
        <Button
          fullWidth
          onClick={() => setShowMethodology(!showMethodology)}
          endIcon={showMethodology ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          startIcon={<InfoOutlinedIcon />}
        >
          Flow Analysis Methodology
        </Button>
        
        <Collapse in={showMethodology}>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Understanding Flow Metrics
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Network Metrics"
                  secondary="Measures overall market integration and connectivity patterns"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Flow Distribution"
                  secondary="Analyzes the pattern and consistency of market flows"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Statistical Significance"
                  secondary="Uses z-scores and p-values to identify important market connections"
                />
              </ListItem>
            </List>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Interpretation Guide:
            </Typography>
            <Typography variant="body2" component="div">
              • Strong Flow (&gt;{FLOW_THRESHOLDS.HIGH * 100}%): Robust market connection<br/>
              • Medium Flow ({FLOW_THRESHOLDS.MEDIUM * 100}-{FLOW_THRESHOLDS.HIGH * 100}%): Moderate trade<br/>
              • Weak Flow (&lt;{FLOW_THRESHOLDS.MEDIUM * 100}%): Limited market interaction
            </Typography>
          </Box>
        </Collapse>
      </Box>
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
