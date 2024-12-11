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
  ListItemText,
  Collapse,
  Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
import { 
  SHOCK_THRESHOLDS,
  PROPAGATION_THRESHOLDS,
  shockValidation 
} from './types';

const ShockPropagationMap = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showMethodology, setShowMethodology] = useState(false);

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
        <Paper 
          sx={{ 
            p: 2, 
            height: 600, 
            position: 'relative',
            overflow: 'hidden' // Prevent legend from causing scrollbars
          }}
        >
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <ShockMap
              shocks={shocks}
              geometry={geometry}
              selectedRegion={selectedRegion}
              onRegionSelect={setSelectedRegion}
            />
            
            {/* Legend positioned relative to map container */}
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
                This analysis employs advanced statistical methods to identify and analyze price shocks
                across Yemen's market network. The methodology combines temporal price analysis with
                spatial propagation patterns to understand market vulnerabilities and shock transmission
                mechanisms.
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" color="primary">
                        Shock Detection
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        Identifies significant price changes using statistical thresholds,
                        accounting for historical volatility and seasonal patterns
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" color="primary">
                        Propagation Analysis
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        Tracks shock transmission through market networks using spatial
                        econometric techniques and network analysis
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" color="primary">
                        Impact Assessment
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        Evaluates market resilience and vulnerability through shock magnitude,
                        duration, and geographic spread metrics
                      </Typography>
                    }
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }} color="primary">
                Shock Classification:
              </Typography>
              <Typography variant="body2" component="div">
                • Severe Shock (&gt;{SHOCK_THRESHOLDS.SEVERE * 100}%): Major market disruption<br/>
                • Moderate Shock ({SHOCK_THRESHOLDS.MODERATE * 100}-{SHOCK_THRESHOLDS.SEVERE * 100}%): Significant price movement<br/>
                • Mild Shock ({SHOCK_THRESHOLDS.MILD * 100}-{SHOCK_THRESHOLDS.MODERATE * 100}%): Notable price deviation
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }} color="primary">
                Propagation Speed:
              </Typography>
              <Typography variant="body2" component="div">
                • Fast (&lt;{PROPAGATION_THRESHOLDS.TIME.FAST} days): Rapid shock transmission<br/>
                • Medium ({PROPAGATION_THRESHOLDS.TIME.FAST}-{PROPAGATION_THRESHOLDS.TIME.MEDIUM} days): Gradual spread<br/>
                • Slow (&gt;{PROPAGATION_THRESHOLDS.TIME.MEDIUM} days): Delayed impact
              </Typography>
            </Box>
          </Collapse>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(ShockPropagationMap);
