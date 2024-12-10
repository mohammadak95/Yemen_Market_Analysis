/**
 * Market Flow Analysis Component
 * 
 * Provides analysis of market flow patterns through geographic visualization
 * and comprehensive metrics.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  Divider,
  Collapse,
  Button,
  List,
  ListItem,
  ListItemText,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import FlowMap from './FlowMap';
import FlowMetricsPanel from './FlowMetricsPanel';
import MetricCard from '../../atoms/MetricCard';
import TimeControl from '../../molecules/TimeControl';
import { setSelectedDate } from '../../../../slices/spatialSlice';
import { 
  selectDateFilteredFlows,
  selectDateFilteredMetrics 
} from '../../../../selectors/dateSpecificSelectors';
import { 
  FLOW_THRESHOLDS, 
  NETWORK_THRESHOLDS
} from './types';

// Default map settings
const MAP_SETTINGS = {
  center: [15.3694, 44.191], // Yemen center
  zoom: 5.5 // Slightly zoomed out
};

const FlowNetworkAnalysis = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Component state
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Redux selectors
  const geometryData = useSelector(state => state.spatial.data.geometry);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData || []);
  const marketIntegration = useSelector(state => state.spatial.data.marketIntegration || {});
  const loading = useSelector(state => state.spatial.status.loading);
  const error = useSelector(state => state.spatial.status.error);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

  // Memoized selectors
  const flowMaps = useSelector(selectDateFilteredFlows);
  const metrics = useSelector(selectDateFilteredMetrics);

  // Get unique dates for time control
  const dates = useMemo(() => {
    if (!timeSeriesData?.length) return [];
    return [...new Set(timeSeriesData.map(d => d.month))].sort();
  }, [timeSeriesData]);

  // Handle date change
  const handleDateChange = useCallback((newDate) => {
    if (dates.includes(newDate)) {
      dispatch(setSelectedDate(newDate));
    }
  }, [dates, dispatch]);

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      >
        Error loading flow analysis: {error}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Loading Flow Analysis
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Preparing market flow visualization...
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overview Metrics */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Tooltip title="Total volume of market flows in the selected period">
                <Box>
                  <MetricCard
                    title="Total Flow Volume"
                    value={metrics?.flows?.total || 0}
                    format="number"
                    description="Sum of all market flows"
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tooltip title="Average flow volume per market connection">
                <Box>
                  <MetricCard
                    title="Average Flow"
                    value={metrics?.flows?.average || 0}
                    format="number"
                    description="Average flow per connection"
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tooltip title="Percentage of potential market connections that are active">
                <Box>
                  <MetricCard
                    title="Flow Density"
                    value={marketIntegration?.flow_density || 0}
                    format="percentage"
                    description="Network connection density"
                    thresholds={NETWORK_THRESHOLDS.DENSITY}
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tooltip title="Number of active market connections">
                <Box>
                  <MetricCard
                    title="Active Connections"
                    value={metrics?.flows?.count || 0}
                    format="integer"
                    description="Active market flows"
                  />
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Time Controls */}
      {dates.length > 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <TimeControl
              dates={dates}
              currentDate={selectedDate || dates[0]}
              onChange={handleDateChange}
            />
          </Paper>
        </Grid>
      )}

      {/* Map Visualization */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, height: 500 }}>
          <FlowMap
            flows={flowMaps}
            geometry={geometryData}
            selectedFlow={selectedFlow}
            onFlowSelect={setSelectedFlow}
            defaultView={MAP_SETTINGS}
          />
        </Paper>
      </Grid>

      {/* Metrics Panel */}
      <Grid item xs={12}>
        <FlowMetricsPanel
          flows={flowMaps}
          selectedFlow={selectedFlow}
          metrics={{
            totalFlows: metrics?.flows?.total || 0,
            averageFlow: metrics?.flows?.average || 0,
            flowDensity: marketIntegration?.flow_density || 0,
            activeConnections: metrics?.flows?.count || 0
          }}
          timeRange={selectedDate}
        />
      </Grid>

      {/* Methodology */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Button
            fullWidth
            onClick={() => setShowMethodology(!showMethodology)}
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
