// src/components/analysis/spatial/components/ResidualsChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  useTheme
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
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
      
      return {
        date: new Date(day.date).toLocaleDateString(),
        mean,
        upper: q3,
        lower: q1,
        range: q3 - q1
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [residuals]);

  // Calculate overall statistics for interpretation
  const statistics = useMemo(() => {
    if (!chartData.length) return null;

    const ranges = chartData.map(d => d.range);
    const meanRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const maxRange = Math.max(...ranges);
    
    return {
      meanRange,
      maxRange,
      volatility: meanRange > 2 ? 'high' : meanRange > 1 ? 'moderate' : 'low',
      trend: chartData[chartData.length - 1].mean > chartData[0].mean ? 'increasing' : 'decreasing'
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Box sx={{
        bgcolor: 'background.paper',
        p: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        boxShadow: theme.shadows[1],
      }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mean Deviation: {payload[0].value.toFixed(4)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Range: {payload[3].value.toFixed(4)}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          {payload[3].value > 2 ? 'High price dispersion' :
           payload[3].value > 1 ? 'Moderate price dispersion' :
           'Low price dispersion'}
        </Typography>
      </Box>
    );
  };

  if (!chartData.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No residuals data available for visualization.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Price Deviation Patterns
          <Tooltip title="Analysis of systematic price variations across markets">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        {statistics && (
          <Typography variant="body2" color="text.secondary">
            {`Markets show ${statistics.volatility} price dispersion with ${statistics.trend} deviation trend`}
          </Typography>
        )}
      </Box>

      <ResponsiveContainer width="100%" height={isMobile ? "80%" : "85%"}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis 
            dataKey="date"
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Date',
              position: 'insideBottom',
              offset: -10,
              fill: theme.palette.text.primary
            }}
          />
          <YAxis
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Price Deviation',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: theme.palette.text.primary
            }}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />

          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill={theme.palette.primary.light}
            fillOpacity={0.2}
            name="Upper Quartile"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill={theme.palette.primary.light}
            fillOpacity={0.2}
            name="Lower Quartile"
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
            name="Price Dispersion"
          />
          <Brush 
            dataKey="date"
            height={30}
            stroke={theme.palette.primary.main}
            fill={theme.palette.background.paper}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
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
