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
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TimelineIcon from '@mui/icons-material/Timeline';
import MapIcon from '@mui/icons-material/Map';
import AssessmentIcon from '@mui/icons-material/Assessment';

import ConflictMap from './ConflictMap';
import ConflictMetricsPanel from './ConflictMetricsPanel';
import TimeControl from '../../molecules/TimeControl';
import MetricCard from '../../atoms/MetricCard';
import { setSelectedDate } from '../../../../slices/spatialSlice';
import { 
  selectDateFilteredData,
  selectTimeSeriesMetrics 
} from '../../../../selectors/dateSpecificSelectors';

const ConflictImpactDashboard = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState('map');
  const [selectedRegion, setSelectedRegion] = useState(null);

  // Get data from Redux store
  const geometryData = useSelector(state => state.spatial.data.geometry);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData || []);
  const marketIntegration = useSelector(state => state.spatial.data.marketIntegration || {});
  const loading = useSelector(state => state.spatial.status.loading);
  const error = useSelector(state => state.spatial.status.error);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

  // Use date-specific selectors
  const filteredData = useSelector(state => selectDateFilteredData(state));
  const metrics = useSelector(state => selectTimeSeriesMetrics(state));

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
        <Typography>Loading conflict analysis...</Typography>
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
              title="Average Price"
              value={metrics.avgPrice}
              format="currency"
              description="Average market price"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Price Range"
              value={metrics.priceRange}
              format="currency"
              description="Price range (max - min)"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Conflict Intensity"
              value={metrics.avgConflict}
              format="number"
              description="Average conflict intensity"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Market Accessibility"
              value={marketIntegration?.accessibility || 0}
              format="percentage"
              description="Average market accessibility"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Controls Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          {/* View Controls */}
          <Box sx={{ mb: dates.length > 0 ? 2 : 0 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="map">
                <MapIcon sx={{ mr: 1 }} />
                Impact Map
              </ToggleButton>
              <ToggleButton value="timeline">
                <TimelineIcon sx={{ mr: 1 }} />
                Time Analysis
              </ToggleButton>
              <ToggleButton value="metrics">
                <AssessmentIcon sx={{ mr: 1 }} />
                Detailed Metrics
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

      {/* Main Content */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: 600 }}>
          <ConflictMap
            timeSeriesData={filteredData}
            geometry={geometryData}
            selectedRegion={selectedRegion}
            onRegionSelect={setSelectedRegion}
            timeWindow={selectedDate || dates[0]}
          />
        </Paper>
      </Grid>

      {/* Metrics Panel */}
      <Grid item xs={12} md={4}>
        <ConflictMetricsPanel
          timeSeriesData={filteredData}
          selectedRegion={selectedRegion}
          marketIntegration={marketIntegration}
          timeWindow={selectedDate || dates[0]}
        />
      </Grid>

      {/* Analysis Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            About Conflict Impact Analysis
          </Typography>
          <Typography paragraph>
            This analysis examines how conflict affects market dynamics in Yemen,
            revealing patterns of market disruption and resilience in conflict zones.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Impact Assessment
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Market accessibility changes" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Price volatility in conflict zones" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Supply chain disruptions" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Market isolation patterns" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Resilience Factors
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Alternative trade routes" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Market adaptation strategies" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Community support networks" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Recovery patterns" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Response Planning
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Critical market identification" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Intervention prioritization" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Resource allocation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Support strategy development" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(ConflictImpactDashboard);
