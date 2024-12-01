import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import ShockMap from './ShockMap';
import ShockLegend from './ShockLegend';
import TimeControl from '../../molecules/TimeControl';
import MetricCard from '../../atoms/MetricCard';
import { setSelectedDate } from '../../../../slices/spatialSlice';
import { 
  selectDateFilteredShocks,
  selectShockMetrics,
  selectShockAnalysisData
} from '../../../../selectors/dateSpecificSelectors';

const ShockPropagationMap = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [selectedRegion, setSelectedRegion] = useState(null);

  // Get data from Redux store using selectors
  const geometry = useSelector(state => state.spatial.data.geometry);
  const timeSeriesData = useSelector(state => state.spatial.data.timeSeriesData || []);
  const loading = useSelector(state => state.spatial.status.loading);
  const error = useSelector(state => state.spatial.status.error);
  const selectedDate = useSelector(state => state.spatial.ui.selectedDate);

  // Use optimized selectors
  const shocks = useSelector(state => selectDateFilteredShocks(state));
  const metrics = useSelector(state => selectShockMetrics(state));
  const analysisData = useSelector(state => selectShockAnalysisData(state));

  // Get unique dates for time control
  const dates = React.useMemo(() => {
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
        <Typography>Loading shock analysis...</Typography>
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
              title="Total Shocks"
              value={metrics.totalShocks}
              format="integer"
              description="Number of detected price shocks"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Price Drops"
              value={metrics.priceDrops}
              format="integer"
              description="Number of price drop shocks"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Price Surges"
              value={metrics.priceSurges}
              format="integer"
              description="Number of price surge shocks"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Average Magnitude"
              value={metrics.avgMagnitude}
              format="percentage"
              description="Average shock magnitude"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Controls Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          {dates.length > 0 && (
            <Box sx={{ width: '100%' }}>
              <TimeControl
                dates={dates}
                currentDate={selectedDate || dates[0]}
                onChange={handleDateChange}
                position={null}
              />
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Main Map */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, height: 600, position: 'relative' }}>
          <ShockMap
            shocks={shocks}
            geometry={geometry}
            selectedRegion={selectedRegion}
            onRegionSelect={setSelectedRegion}
          />
          
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <ShockLegend />
          </Box>
        </Paper>
      </Grid>

      {/* Regional Analysis */}
      {analysisData?.regionalMetrics && analysisData.regionalMetrics.length > 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Regional Impact Analysis
            </Typography>
            <Grid container spacing={2}>
              {analysisData.regionalMetrics.map((region) => (
                <Grid item xs={12} md={4} key={region.region}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      bgcolor: region.region === selectedRegion ? 'action.selected' : 'background.paper'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {region.region}
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary={`Shocks: ${region.shockCount}`}
                          secondary={`${region.priceDrops} drops, ${region.priceSurges} surges`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary={`Average Magnitude: ${region.avgMagnitude.toFixed(1)}%`}
                          secondary={`Max: ${region.maxMagnitude.toFixed(1)}%`}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      )}

      {/* Analysis Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            About Price Shock Analysis
          </Typography>
          <Typography>
            This analysis examines the propagation of price shocks through Yemen's market
            network. It helps identify shock origins, propagation patterns, and market
            vulnerabilities.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Shock Detection
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Significant price changes beyond normal volatility" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Magnitude calculation based on historical patterns" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Classification of shock types and origins" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Temporal and spatial shock patterns" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Propagation Analysis
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Shock transmission through market networks" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Speed and direction of propagation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Market connectivity influence" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Geographic and temporal patterns" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Impact Assessment
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Market vulnerability to shocks" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Shock absorption and resilience" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Affected market populations" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Recovery patterns and duration" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(ShockPropagationMap);
