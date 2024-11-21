// src/components/analysis/spatial-analysis/components/health/MarketHealthMetrics.js

import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { useTheme } from '@mui/material/styles';

const MetricCard = ({ title, value, trend, description }) => {
  const theme = useTheme();
  const trendColor = trend >= 0 ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ my: 2 }}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </Typography>
      {trend !== undefined && (
        <Typography 
          variant="body2" 
          sx={{ color: trendColor, mt: 'auto' }}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(2)}%
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );
};

const MarketHealthMetrics = ({ metrics, timeSeriesData, spatialPatterns }) => {
  const theme = useTheme();
  const trends = useMemo(() => {
    // Calculate trends over time
    const calculateTrend = (data, key) => {
      if (!data || data.length < 2) return 0;
      const first = data[0][key];
      const last = data[data.length - 1][key];
      return ((last - first) / first) * 100;
    };

    return {
      priceVolatility: calculateTrend(timeSeriesData, 'volatility'),
      integration: calculateTrend(timeSeriesData.map((d, i) => ({
        value: metrics.integration,
        timestamp: d.month
      })), 'value'),
      spatialDependence: calculateTrend(timeSeriesData.map(d => ({
        value: metrics.spatialAutocorrelation,
        timestamp: d.month
      })), 'value'),
      conflictImpact: calculateTrend(timeSeriesData, 'conflict_intensity')
    };
  }, [timeSeriesData, metrics]);

  const priceVolatilityData = useMemo(() => {
    return timeSeriesData.map(d => ({
      date: d.month,
      volatility: d.volatility,
      price: d.avgUsdPrice
    }));
  }, [timeSeriesData]);

  return (
    <Box sx={{ p: 2, height: '100%' }}>
      <Grid container spacing={3}>
        {/* Market Integration Score */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Market Integration"
            value={metrics.integration}
            trend={trends.integration}
            description="Overall market integration score"
          />
        </Grid>

        {/* Spatial Autocorrelation */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Spatial Dependence"
            value={metrics.spatialAutocorrelation}
            trend={trends.spatialDependence}
            description="Moran's I spatial autocorrelation"
          />
        </Grid>

        {/* Market Efficiency */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Cluster Efficiency"
            value={metrics.clusterEfficiency}
            description="Average market cluster efficiency"
          />
        </Grid>

        {/* Shock Frequency */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Shock Frequency"
            value={metrics.shockFrequency}
            description="Average shocks per month"
          />
        </Grid>

        {/* Price Volatility Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Price Volatility Over Time
            </Typography>
            <ResponsiveContainer>
              <LineChart data={priceVolatilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="volatility"
                  stroke={theme.palette.primary.main}
                  name="Volatility"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="price"
                  stroke={theme.palette.secondary.main}
                  name="Price"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Conflict Impact Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Conflict Impact on Markets
            </Typography>
            <ResponsiveContainer>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="conflict_intensity"
                  fill={theme.palette.error.light}
                  stroke={theme.palette.error.main}
                  name="Conflict Intensity"
                />
                <Area
                  type="monotone"
                  dataKey="avgUsdPrice"
                  fill={theme.palette.info.light}
                  stroke={theme.palette.info.main}
                  name="Average Price"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MarketHealthMetrics;