import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TimelineIcon from '@mui/icons-material/Timeline';
import MapIcon from '@mui/icons-material/Map';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import FlowMap from './FlowMap';
import FlowLines from './FlowLines';
import FlowMetricsPanel from './FlowMetricsPanel';
import NetworkGraph from '../network/NetworkGraph';
import MetricCard from '../../atoms/MetricCard';
import TimeControl from '../../molecules/TimeControl';
import { setSelectedDate } from '../../../../slices/spatialSlice';
import { 
  selectDateFilteredFlows,
  selectDateFilteredMetrics 
} from '../../../../selectors/dateSpecificSelectors';

const FlowNetworkAnalysis = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState('map');
  const [selectedFlow, setSelectedFlow] = useState(null);

  // Get data from Redux store
  const geometryData = useSelector(state => state.spatial.data.geometry);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData || []);
  const marketIntegration = useSelector(state => state.spatial.data.marketIntegration || {});
  const loading = useSelector(state => state.spatial.status.loading);
  const error = useSelector(state => state.spatial.status.error);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

  // Use date-specific selectors
  const flowMaps = useSelector(state => selectDateFilteredFlows(state));
  const metrics = useSelector(state => selectDateFilteredMetrics(state));

  // Get unique dates for time control
  const dates = useMemo(() => {
    if (!timeSeriesData?.length) return [];
    return [...new Set(timeSeriesData.map(d => d.month))].sort();
  }, [timeSeriesData]);

  // Handle date change
  const handleDateChange = (newDate) => {
    dispatch(setSelectedDate(newDate));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading flow analysis...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overview Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Total Flow Volume"
              value={metrics?.flows?.total || 0}
              format="number"
              description="Sum of all market flows"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Average Flow"
              value={metrics?.flows?.average || 0}
              format="number"
              description="Average flow per connection"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Flow Density"
              value={marketIntegration?.flow_density || 0}
              format="percentage"
              description="Network connection density"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Active Connections"
              value={metrics?.flows?.count || 0}
              format="integer"
              description="Number of active market flows"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Controls Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          {/* View Mode Controls */}
          <Box sx={{ mb: dates.length > 0 ? 2 : 0 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="map">
                <MapIcon sx={{ mr: 1 }} />
                Map View
              </ToggleButton>
              <ToggleButton value="lines">
                <TimelineIcon sx={{ mr: 1 }} />
                Flow Lines
              </ToggleButton>
              <ToggleButton value="network">
                <AccountTreeIcon sx={{ mr: 1 }} />
                Network View
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Time Controls */}
          {dates.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ width: '100%' }}>
                <TimeControl
                  dates={dates}
                  currentDate={selectedDate || dates[0]}
                  onChange={handleDateChange}
                  position={null}
                />
              </Box>
            </>
          )}
        </Paper>
      </Grid>

      {/* Main Visualization */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: 600 }}>
          {viewMode === 'map' && (
            <FlowMap
              flows={flowMaps}
              geometry={geometryData}
              selectedFlow={selectedFlow}
              onFlowSelect={setSelectedFlow}
            />
          )}
          {viewMode === 'lines' && (
            <FlowLines
              flows={flowMaps}
              timeSeriesData={timeSeriesData}
              selectedFlow={selectedFlow}
              onFlowSelect={setSelectedFlow}
            />
          )}
          {viewMode === 'network' && (
            <NetworkGraph
              flows={flowMaps}
              marketIntegration={marketIntegration}
              selectedNode={selectedFlow}
              onNodeSelect={setSelectedFlow}
            />
          )}
        </Paper>
      </Grid>

      {/* Metrics Panel */}
      <Grid item xs={12} md={4}>
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
    </Grid>
  );
};

export default React.memo(FlowNetworkAnalysis);
