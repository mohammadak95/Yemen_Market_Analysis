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
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssessmentIcon from '@mui/icons-material/Assessment';

import SeasonalMap from './SeasonalMap';
import SeasonalLegend from './SeasonalLegend';
import MetricCard from '../../atoms/MetricCard';
import TimeControl from '../../molecules/TimeControl';
import { setSelectedDate } from '../../../../slices/spatialSlice';
import { 
  selectDateFilteredData,
  selectTimeSeriesMetrics 
} from '../../../../selectors/dateSpecificSelectors';

const SeasonalPriceMap = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState('map');
  const [selectedRegion, setSelectedRegion] = useState(null);

  // Get data from Redux store
  const geometryData = useSelector(state => state.spatial.data.geometry);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData || []);
  const marketIntegration = useSelector(state => state.spatial.data.marketIntegration || {});
  const seasonalAnalysis = useSelector(state => state.spatial.data.seasonalAnalysis || {});
  const loading = useSelector(state => state.spatial.status.loading);
  const error = useSelector(state => state.spatial.status.error);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

  // Use date-specific selectors
  const filteredData = useSelector(state => selectDateFilteredData(state));
  const metrics = useSelector(state => selectTimeSeriesMetrics(state));

  // Calculate seasonal metrics
  const seasonalMetrics = useMemo(() => {
    if (!seasonalAnalysis || !timeSeriesData?.length) {
      return {
        seasonalStrength: 0,
        trendStrength: 0,
        peakMonth: null,
        troughMonth: null,
        seasonalPattern: [],
        regionalPatterns: {}
      };
    }

    // Group data by region
    const regionData = timeSeriesData.reduce((acc, d) => {
      if (!acc[d.region]) acc[d.region] = [];
      acc[d.region].push(d);
      return acc;
    }, {});

    // Calculate regional patterns
    const regionalPatterns = Object.entries(regionData).reduce((acc, [region, data]) => {
      const prices = data.map(d => d.usdPrice || 0);
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      
      acc[region] = {
        seasonalStrength: variance / mean,
        meanPrice: mean,
        variance
      };
      return acc;
    }, {});

    return {
      ...seasonalAnalysis,
      regionalPatterns
    };
  }, [seasonalAnalysis, timeSeriesData]);

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
        <Typography>Loading seasonal analysis...</Typography>
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
              title="Market Integration"
              value={marketIntegration?.integration_score || 0}
              format="percentage"
              description="Market integration score"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Seasonal Strength"
              value={seasonalMetrics.seasonalStrength || 0}
              format="percentage"
              description="Seasonal pattern strength"
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
                <CalendarViewMonthIcon sx={{ mr: 1 }} />
                Seasonal Map
              </ToggleButton>
              <ToggleButton value="timeline">
                <TimelineIcon sx={{ mr: 1 }} />
                Price Trends
              </ToggleButton>
              <ToggleButton value="analysis">
                <AssessmentIcon sx={{ mr: 1 }} />
                Pattern Analysis
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
          <SeasonalMap
            timeSeriesData={filteredData}
            geometry={geometryData}
            selectedRegion={selectedRegion}
            onRegionSelect={setSelectedRegion}
            selectedMonth={selectedDate || dates[0]}
            seasonalMetrics={seasonalMetrics}
          />
        </Paper>
      </Grid>

      {/* Legend and Info */}
      <Grid item xs={12} md={4}>
        <SeasonalLegend
          selectedMonth={selectedDate || dates[0]}
          seasonalMetrics={seasonalMetrics}
          selectedRegion={selectedRegion}
          timeSeriesData={filteredData}
        />
      </Grid>

      {/* Analysis Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            About Seasonal Analysis
          </Typography>
          <Typography paragraph>
            This analysis examines seasonal price patterns in Yemen's markets,
            revealing cyclical variations and their impact on market dynamics.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Seasonal Patterns
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Monthly price variations" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Peak and trough periods" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Regional differences" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Pattern stability" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Market Implications
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Supply chain planning" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Price forecasting" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Stock management" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Trade optimization" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Response Planning
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Intervention timing" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Resource allocation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Buffer stock planning" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Market support strategies" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(SeasonalPriceMap);
