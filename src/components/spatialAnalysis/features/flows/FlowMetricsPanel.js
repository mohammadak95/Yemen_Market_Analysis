//src/components/spatialAnalysis/features/flows/FlowMetricsPanel.js

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
  flows = [],
  selectedFlow,
  metrics = {},
  timeRange
}) => {
  const theme = useTheme();
  const [showMethodology, setShowMethodology] = useState(false);

  // Calculate comprehensive flow metrics
  const flowMetrics = useMemo(() => {
    if (!Array.isArray(flows) || !flows.length) {
      console.debug('No flows available for metrics calculation');
      return null;
    }

    try {
      // Filter valid flows
      const validFlows = flows.filter(flow => 
        flow && 
        typeof flow.total_flow === 'number' && 
        !isNaN(flow.total_flow)
      );

      if (!validFlows.length) {
        console.debug('No valid flows found for metrics calculation');
        return null;
      }

      // Calculate basic metrics
      const flowValues = validFlows.map(f => f.total_flow);
      const totalFlow = flowValues.reduce((sum, val) => sum + val, 0);
      const avgFlow = totalFlow / flowValues.length;
      const maxFlow = Math.max(...flowValues);
      const minFlow = Math.min(...flowValues);

      // Calculate standard deviation
      const variance = flowValues.reduce((sum, val) => 
        sum + Math.pow(val - avgFlow, 2), 0) / flowValues.length;
      const stdDev = Math.sqrt(variance);

      // Calculate quartiles and IQR
      const sortedFlows = [...flowValues].sort((a, b) => a - b);
      const q1 = sortedFlows[Math.floor(flowValues.length * 0.25)];
      const q3 = sortedFlows[Math.floor(flowValues.length * 0.75)];
      const iqr = q3 - q1;

      // Network metrics
      const activeFlows = flowValues.filter(f => f > 0).length;
      const maxPossibleFlows = validFlows.length * (validFlows.length - 1) / 2;
      const flowDensity = maxPossibleFlows > 0 ? activeFlows / maxPossibleFlows : 0;

      // Distribution metrics
      const skewness = stdDev > 0 ? flowValues.reduce((sum, val) => 
        sum + Math.pow((val - avgFlow) / stdDev, 3), 0) / flowValues.length : 0;

      const kurtosis = stdDev > 0 ? flowValues.reduce((sum, val) => 
        sum + Math.pow((val - avgFlow) / stdDev, 4), 0) / flowValues.length - 3 : 0;

      return {
        basic: {
          totalFlow,
          avgFlow,
          maxFlow,
          minFlow,
          stdDev,
          count: validFlows.length
        },
        distribution: {
          q1,
          q3,
          iqr,
          skewness,
          kurtosis
        },
        networkMetrics: {
          density: flowDensity,
          connectivity: validFlows.length > 0 ? activeFlows / validFlows.length : 0,
          centralization: maxPossibleFlows > 0 ? activeFlows / maxPossibleFlows : 0
        }
      };
    } catch (error) {
      console.error('Error calculating flow metrics:', error);
      return null;
    }
  }, [flows]);

  // Calculate selected flow metrics
  const selectedFlowMetrics = useMemo(() => {
    if (!selectedFlow || !flowMetrics) return null;

    try {
      const flow = flows.find(f => 
        f.source === selectedFlow.source && 
        f.target === selectedFlow.target
      );

      if (!flow || typeof flow.total_flow !== 'number') return null;

      // Calculate relative metrics
      const relativeStrength = flowMetrics.basic.avgFlow > 0 ? 
        flow.total_flow / flowMetrics.basic.avgFlow : 0;
      const percentile = flows.filter(f => 
        (f.total_flow || 0) <= flow.total_flow
      ).length / flows.length * 100;

      // Calculate significance
      const significance = calculateSignificance(
        flow.total_flow,
        flowMetrics.basic.avgFlow,
        flowMetrics.basic.stdDev
      );

      // Calculate normalized flow
      const normalizedFlow = flowMetrics.basic.maxFlow > 0 ? 
        flow.total_flow / flowMetrics.basic.maxFlow : 0;

      // Determine flow status
      let status = FLOW_STATUS.INACTIVE;
      if (normalizedFlow >= FLOW_THRESHOLDS.HIGH) status = FLOW_STATUS.ACTIVE;
      else if (normalizedFlow >= FLOW_THRESHOLDS.MEDIUM) status = FLOW_STATUS.STABLE;
      else if (normalizedFlow >= FLOW_THRESHOLDS.LOW) status = FLOW_STATUS.PARTIAL;

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
          standardizedValue: flowMetrics.basic.stdDev > 0 ? 
            (flow.total_flow - flowMetrics.basic.avgFlow) / flowMetrics.basic.stdDev : 0
        }
      };
    } catch (error) {
      console.error('Error calculating selected flow metrics:', error);
      return null;
    }
  }, [selectedFlow, flows, flowMetrics]);

  // Debug logging
  console.debug('FlowMetricsPanel state:', {
    totalFlows: flows.length,
    hasMetrics: Boolean(flowMetrics),
    selectedFlow: Boolean(selectedFlow),
    hasSelectedMetrics: Boolean(selectedFlowMetrics)
  });

  if (!flowMetrics) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Alert severity="warning">
          No valid flow metrics available. Please ensure data is properly loaded.
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
              value={flowMetrics.networkMetrics.density}
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
              value={flowMetrics.basic.stdDev / flowMetrics.basic.avgFlow}
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
    total_flow: PropTypes.number.isRequired,
    coordinates: PropTypes.shape({
      source: PropTypes.arrayOf(PropTypes.number).isRequired,
      target: PropTypes.arrayOf(PropTypes.number).isRequired
    }).isRequired,
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
