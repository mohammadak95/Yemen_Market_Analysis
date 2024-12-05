// src/components/analysis/spatial/components/ResidualsChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  useTheme,
  Paper
} from '@mui/material';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Brush
} from 'recharts';

const ResidualsChart = ({ residuals, isMobile }) => {
  const theme = useTheme();

  // Process residuals data for visualization
  const chartData = useMemo(() => {
    if (!residuals?.length) return [];

    // Group residuals by date
    const groupedData = residuals.reduce((acc, curr) => {
      const date = curr.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          residuals: [],
          mean: 0,
          upper: 0,
          lower: 0
        };
      }
      acc[date].residuals.push(curr.residual);
      return acc;
    }, {});

    // Calculate statistics for each date
    return Object.values(groupedData).map(day => {
      const sorted = [...day.residuals].sort((a, b) => a - b);
      const mean = day.residuals.reduce((a, b) => a + b, 0) / day.residuals.length;
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const stdDev = Math.sqrt(
        day.residuals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / day.residuals.length
      );
      
      return {
        date: new Date(day.date).toLocaleDateString(),
        mean,
        upper: q3,
        lower: q1,
        range: q3 - q1,
        volatility: stdDev
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [residuals]);

  // Calculate overall statistics for interpretation
  const statistics = useMemo(() => {
    if (!chartData.length) return null;

    const ranges = chartData.map(d => d.range);
    const meanRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const volatilities = chartData.map(d => d.volatility);
    const meanVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
    
    return {
      meanRange,
      meanVolatility,
      volatility: meanRange > 2 ? 'high' : meanRange > 1 ? 'moderate' : 'low',
      stability: meanVolatility < 0.5 ? 'stable' : meanVolatility < 1 ? 'moderately stable' : 'volatile'
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    // Safely extract values
    const meanValue = payload.find(p => p.dataKey === 'mean')?.value;
    const rangeValue = payload.find(p => p.dataKey === 'range')?.value;
    const volatilityValue = payload.find(p => p.dataKey === 'volatility')?.value;

    if (meanValue === undefined) return null;

    return (
      <Paper elevation={3} sx={{ p: 2, maxWidth: 250 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Mean Deviation: {meanValue.toFixed(4)}
          </Typography>
          {rangeValue !== undefined && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Price Dispersion: {rangeValue.toFixed(4)}
            </Typography>
          )}
          {volatilityValue !== undefined && (
            <Typography variant="body2" color="text.secondary">
              Volatility: {volatilityValue.toFixed(4)}
            </Typography>
          )}
        </Box>

        {rangeValue !== undefined && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mt: 1.5,
              pt: 1,
              borderTop: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.secondary
            }}
          >
            {rangeValue > 2 
              ? 'High market fragmentation' 
              : rangeValue > 1 
              ? 'Moderate price differences' 
              : 'Well-integrated markets'}
          </Typography>
        )}
      </Paper>
    );
  };

  if (!chartData.length) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No price deviation data available for visualization.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {statistics && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {`Markets show ${statistics.volatility} price dispersion with ${statistics.stability} dynamics`}
          </Typography>
        </Box>
      )}

      <Box sx={{ height: isMobile ? '80%' : '85%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme.palette.divider} 
            />
            <XAxis 
              dataKey="date"
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              label={{ 
                value: 'Analysis Period',
                position: 'insideBottom',
                offset: -10,
                fill: theme.palette.text.secondary
              }}
            />
            <YAxis
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              label={{ 
                value: 'Price Deviation (YER)',
                angle: -90,
                position: 'insideLeft',
                offset: 15,
                fill: theme.palette.text.secondary
              }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{
                paddingBottom: '20px'
              }}
            />

            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill={theme.palette.primary.light}
              fillOpacity={0.2}
              name="Price Range"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill={theme.palette.primary.light}
              fillOpacity={0.2}
              name="Price Range"
            />
            <Line
              type="monotone"
              dataKey="mean"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={false}
              name="Mean Deviation"
            />
            <Line
              type="monotone"
              dataKey="range"
              stroke={theme.palette.secondary.main}
              strokeWidth={2}
              dot={false}
              name="Market Dispersion"
            />
            <Line
              type="monotone"
              dataKey="volatility"
              stroke={theme.palette.error.main}
              strokeWidth={2}
              dot={false}
              name="Price Volatility"
            />
            <Brush 
              dataKey="date"
              height={30}
              stroke={theme.palette.primary.main}
              fill={theme.palette.background.paper}
              travellerWidth={10}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

ResidualsChart.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.shape({
    region_id: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    residual: PropTypes.number.isRequired
  })).isRequired,
  isMobile: PropTypes.bool.isRequired
};

export default ResidualsChart;
