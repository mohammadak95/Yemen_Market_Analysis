/**
 * Flow Network Analysis Component
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  Collapse,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import FlowMap from './FlowMap';
import FlowMetricsPanel from './FlowMetricsPanel';
import FlowDateControl from './FlowDateControl';
import MetricCard from '../../atoms/MetricCard';
import { setSelectedDate } from '../../../../slices/spatialSlice';
import { useFlowDataManager } from '../../../../hooks/useFlowDataManager';
import { selectFlowMetrics } from '../../../../slices/flowSlice';
import { 
  FLOW_THRESHOLDS, 
  NETWORK_THRESHOLDS,
  FLOW_STATUS,
  flowValidation
} from './types';

// Default map settings
const MAP_SETTINGS = {
  center: [15.3694, 44.191], // Yemen center
  zoom: 6.5
};

// Helper function to prevent default events
const preventEvent = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  return false;
};

const FlowNetworkAnalysis = () => {
  const dispatch = useDispatch();
  
  // Component state
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Get data from Redux
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);
  const selectedCommodity = useSelector(state => state.spatial.ui.selectedCommodity);
  const flowMetrics = useSelector(selectFlowMetrics);
  const availableDates = useSelector(state => state.spatial.data.uniqueMonths || []);

  // Use the flow data manager hook
  const {
    flows: currentFlows,
    metadata: { totalFlows, uniqueMarkets },
    loading,
    error,
    refreshData
  } = useFlowDataManager();

  // Process flows with additional metrics
  const processedFlows = useMemo(() => {
    if (!currentFlows?.length) {
      console.debug('No flows available for processing:', { date: selectedDate, commodity: selectedCommodity });
      return [];
    }

    console.debug('Processing flows:', { 
      count: currentFlows.length, 
      date: selectedDate, 
      commodity: selectedCommodity 
    });

    const maxFlow = Math.max(...currentFlows.map(f => f.flow_weight));

    return currentFlows.map(flow => {
      const normalizedFlow = flowValidation.normalizeFlow(flow, maxFlow);
      const status = flowValidation.getFlowStatus(normalizedFlow);

      return {
        ...flow,
        normalizedFlow,
        normalizedPriceDiff: maxFlow > 0 ? Math.abs(flow.price_differential || 0) / maxFlow : 0,
        status
      };
    });
  }, [currentFlows, selectedDate, selectedCommodity]);

  // Handle date change with event prevention
  const handleDateChange = useCallback((e, newDate) => {
    preventEvent(e);
    if (newDate !== selectedDate) {
      console.debug('Date changed:', { from: selectedDate, to: newDate, commodity: selectedCommodity });
      // Reset selected flow when date changes
      setSelectedFlow(null);
      // Update the selected date in the spatial slice
      dispatch(setSelectedDate(newDate));
    }
  }, [dispatch, selectedDate, selectedCommodity]);

  // Handle flow selection with event prevention
  const handleFlowSelect = useCallback((event, flow) => {
    preventEvent(event);
    setSelectedFlow(flow);
  }, []);

  // Handle methodology toggle with event prevention
  const handleMethodologyToggle = useCallback((e) => {
    preventEvent(e);
    setShowMethodology(prev => !prev);
  }, []);

  // Handle reload with event prevention
  const handleReload = useCallback((e) => {
    preventEvent(e);
    refreshData();
  }, [refreshData]);

  if (!selectedCommodity) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Please select a commodity from the sidebar to view market flows.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleReload}
            onMouseDown={preventEvent}
          >
            Reload
          </Button>
        }
      >
        Error loading flow analysis: {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overview Metrics */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {selectedCommodity} Market Flows
                {selectedDate && (
                  <Typography variant="caption" display="block" color="textSecondary">
                    Period: {selectedDate}
                  </Typography>
                )}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <MetricCard
                  title="Total Flow Volume"
                  value={flowMetrics?.totalFlows || 0}
                  format="number"
                  description="Sum of all market flows"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <MetricCard
                  title="Average Flow"
                  value={flowMetrics?.averageFlowWeight || 0}
                  format="number"
                  description="Average flow per connection"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <MetricCard
                  title="Market Connectivity"
                  value={flowMetrics?.marketConnectivity || 0}
                  format="percentage"
                  description="Network connection density"
                  thresholds={NETWORK_THRESHOLDS.DENSITY}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box>
                <MetricCard
                  title="Active Markets"
                  value={uniqueMarkets || 0}
                  format="integer"
                  description="Unique market locations"
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Date Control */}
      {availableDates.length > 0 && (
        <Grid item xs={12}>
          <FlowDateControl
            dates={availableDates}
            currentDate={selectedDate || availableDates[0]}
            onChange={handleDateChange}
            loading={loading}
          />
        </Grid>
      )}

      {/* Loading State */}
      {loading && (
        <Grid item xs={12}>
          <Alert severity="info">
            Loading flow data for {selectedCommodity} ({selectedDate})...
          </Alert>
        </Grid>
      )}

      {/* No Data State */}
      {!loading && !error && (!currentFlows || currentFlows.length === 0) && (
        <Grid item xs={12}>
          <Alert severity="warning">
            No flow data available for {selectedCommodity} in {selectedDate}
          </Alert>
        </Grid>
      )}

      {/* Map Visualization */}
      {processedFlows.length > 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 500 }}>
            <FlowMap
              flows={processedFlows}
              selectedFlow={selectedFlow}
              onFlowSelect={handleFlowSelect}
              defaultView={MAP_SETTINGS}
            />
          </Paper>
        </Grid>
      )}

      {/* Metrics Panel */}
      {processedFlows.length > 0 && (
        <Grid item xs={12}>
          <FlowMetricsPanel
            flows={processedFlows}
            selectedFlow={selectedFlow}
            timeRange={selectedDate}
          />
        </Grid>
      )}

      {/* Methodology */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Button
            fullWidth
            onClick={handleMethodologyToggle}
            onMouseDown={preventEvent}
            endIcon={showMethodology ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            startIcon={<InfoOutlinedIcon />}
          >
            Methodology
          </Button>
          <Collapse in={showMethodology}>
            <Box sx={{ mt: 2, p: 2 }}>
              <Typography variant="body2" paragraph>
                This analysis examines market flows across Yemen using geographic visualization
                and statistical metrics to understand trade patterns and market integration.
                Flow strength is represented through line thickness and color intensity,
                while market points indicate trading locations.
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" color="primary">
                        Flow Analysis
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        Measures trade volume and consistency between markets, normalized
                        for regional variations and market size
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" color="primary">
                        Market Integration
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        Evaluates market connectivity through flow density and price
                        correlation analysis
                      </Typography>
                    }
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }} color="primary">
                Flow Classification:
              </Typography>
              <Typography variant="body2" component="div">
                • Strong Flow (&gt;{FLOW_THRESHOLDS.HIGH * 100}%): Robust market connection<br/>
                • Medium Flow ({FLOW_THRESHOLDS.MEDIUM * 100}-{FLOW_THRESHOLDS.HIGH * 100}%): Moderate trade<br/>
                • Weak Flow (&lt;{FLOW_THRESHOLDS.MEDIUM * 100}%): Limited market interaction
              </Typography>
            </Box>
          </Collapse>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(FlowNetworkAnalysis);
