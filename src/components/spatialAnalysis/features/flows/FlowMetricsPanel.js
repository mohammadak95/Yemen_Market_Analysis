// src/components/spatialAnalysis/features/flows/FlowMetricsPanel.js

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

  // Calculate comprehensive flow metrics with safe defaults
  const flowMetrics = useMemo(() => {
    const defaultMetrics = {
      basic: {
        totalFlow: 0,
        avgFlow: 0,
        maxFlow: 0,
        minFlow: 0,
        stdDev: 0,
        count: 0
      },
      distribution: {
        q1: 0,
        q3: 0,
        iqr: 0,
        skewness: 0,
        kurtosis: 0
      },
      networkMetrics: {
        density: 0,
        connectivity: 0,
        centralization: 0
      }
    };

    if (!Array.isArray(flows) || !flows.length) {
      console.debug('No flows available for metrics calculation');
      return defaultMetrics;
    }

    try {
      // Filter valid flows
      const validFlows = flows.filter(flow => 
        flow && 
        typeof flow.total_flow === 'number' && 
        !isNaN(flow.total_flow) &&
        isFinite(flow.total_flow)
      );

      if (!validFlows.length) {
        console.debug('No valid flows found for metrics calculation');
        return defaultMetrics;
      }

      // Calculate basic metrics with safety checks
      const flowValues = validFlows.map(f => Math.max(0, f.total_flow));
      const totalFlow = flowValues.reduce((sum, val) => sum + val, 0);
      const avgFlow = flowValues.length > 0 ? totalFlow / flowValues.length : 0;
      const maxFlow = Math.max(...flowValues, 0);
      const minFlow = Math.min(...flowValues);

      // Calculate standard deviation with safety checks
      const variance = flowValues.length > 0 ?
        flowValues.reduce((sum, val) => sum + Math.pow(val - avgFlow, 2), 0) / flowValues.length : 0;
      const stdDev = Math.sqrt(variance);

      // Calculate quartiles and IQR with safety checks
      const sortedFlows = [...flowValues].sort((a, b) => a - b);
      const q1 = sortedFlows[Math.floor(flowValues.length * 0.25)] || 0;
      const q3 = sortedFlows[Math.floor(flowValues.length * 0.75)] || 0;
      const iqr = q3 - q1;

      // Network metrics with safety checks
      const activeFlows = flowValues.filter(f => f > 0).length;
      const maxPossibleFlows = validFlows.length * (validFlows.length - 1) / 2;
      const flowDensity = maxPossibleFlows > 0 ? 
        Math.min(1, Math.max(0, activeFlows / maxPossibleFlows)) : 0;

      // Distribution metrics with safety checks
      const skewness = stdDev > 0 ? 
        flowValues.reduce((sum, val) => sum + Math.pow((val - avgFlow) / stdDev, 3), 0) / 
        (flowValues.length || 1) : 0;

      const kurtosis = stdDev > 0 ? 
        (flowValues.reduce((sum, val) => sum + Math.pow((val - avgFlow) / stdDev, 4), 0) / 
        (flowValues.length || 1)) - 3 : 0;

      return {
        basic: {
          totalFlow: Math.max(0, totalFlow),
          avgFlow: Math.max(0, avgFlow),
          maxFlow: Math.max(0, maxFlow),
          minFlow: Math.max(0, minFlow),
          stdDev: Math.max(0, stdDev),
          count: validFlows.length
        },
        distribution: {
          q1: Math.max(0, q1),
          q3: Math.max(0, q3),
          iqr: Math.max(0, iqr),
          skewness: Math.max(-3, Math.min(3, skewness)), // Bound skewness
          kurtosis: Math.max(-3, Math.min(3, kurtosis))  // Bound kurtosis
        },
        networkMetrics: {
          density: Math.min(1, Math.max(0, flowDensity)),
          connectivity: Math.min(1, Math.max(0, validFlows.length > 0 ? activeFlows / validFlows.length : 0)),
          centralization: Math.min(1, Math.max(0, maxPossibleFlows > 0 ? activeFlows / maxPossibleFlows : 0))
        }
      };
    } catch (error) {
      console.error('Error calculating flow metrics:', error);
      return defaultMetrics;
    }
  }, [flows]);

  // Calculate selected flow metrics with safe defaults
  const selectedFlowMetrics = useMemo(() => {
    const defaultSelectedMetrics = {
      normalizedFlow: 0,
      relativeStrength: 0,
      percentile: 0,
      significance: {
        significant: false,
        zScore: 0,
        pValue: 1
      },
      status: FLOW_STATUS.INACTIVE,
      metrics: {
        zScore: 0,
        pValue: 1,
        standardizedValue: 0
      }
    };

    if (!selectedFlow || !flowMetrics || !Array.isArray(flows)) return defaultSelectedMetrics;

    try {
      const flow = flows.find(f => 
        f.source === selectedFlow.source && 
        f.target === selectedFlow.target
      );

      if (!flow || typeof flow.total_flow !== 'number' || !isFinite(flow.total_flow)) {
        return defaultSelectedMetrics;
      }

      // Calculate relative metrics with safety checks
      const relativeStrength = flowMetrics.basic.avgFlow > 0 ? 
        Math.min(1, Math.max(0, flow.total_flow / flowMetrics.basic.avgFlow)) : 0;
      
      const percentile = flows.length > 0 ? 
        Math.min(100, Math.max(0, 
          flows.filter(f => (f.total_flow || 0) <= flow.total_flow).length / flows.length * 100
        )) : 0;

      // Calculate significance with safety checks
      const significance = calculateSignificance(
        flow.total_flow,
        flowMetrics.basic.avgFlow,
        flowMetrics.basic.stdDev
      );

      // Calculate normalized flow with safety checks
      const normalizedFlow = flowMetrics.basic.maxFlow > 0 ? 
        Math.min(1, Math.max(0, flow.total_flow / flowMetrics.basic.maxFlow)) : 0;

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
          zScore: Math.max(-10, Math.min(10, significance.zScore)), // Bound z-score
          pValue: Math.min(1, Math.max(0, significance.pValue)),
          standardizedValue: flowMetrics.basic.stdDev > 0 ? 
            Math.max(-10, Math.min(10, (flow.total_flow - flowMetrics.basic.avgFlow) / flowMetrics.basic.stdDev)) : 0
        }
      };
    } catch (error) {
      console.error('Error calculating selected flow metrics:', error);
      return defaultSelectedMetrics;
    }
  }, [selectedFlow, flows, flowMetrics]);

  // Ensure we have valid values for display
  const safeMetrics = {
    network: {
      density: flowMetrics?.networkMetrics?.density || 0,
      connectivity: flowMetrics?.networkMetrics?.connectivity || 0,
      centralization: flowMetrics?.networkMetrics?.centralization || 0
    },
    selected: {
      normalizedFlow: selectedFlowMetrics?.normalizedFlow || 0,
      significance: selectedFlowMetrics?.significance || { significant: false, zScore: 0, pValue: 1 }
    }
  };

  if (!flowMetrics || !flowMetrics.basic.count) {
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
              value={safeMetrics.network.density}
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
                value={safeMetrics.selected.normalizedFlow}
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
