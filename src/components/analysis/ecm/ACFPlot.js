// src/components/analysis/ecm/ACFPlot.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip
} from 'recharts';
import { Typography, Box, Paper, useTheme } from '@mui/material';

const ACFPlot = ({ data, significance }) => {
  const theme = useTheme();
  const confidenceBound = Math.abs(1.96 / Math.sqrt(data?.length || 1));

  const getCorrelationInterpretation = (value) => {
    const absValue = Math.abs(value);
    if (absValue < confidenceBound) {
      return {
        strength: 'Insignificant',
        interpretation: 'No significant price memory at this lag',
        economic: 'Markets show efficient price discovery'
      };
    } else if (absValue < 0.3) {
      return {
        strength: 'Weak',
        interpretation: 'Mild price persistence',
        economic: 'Markets show some inefficiencies'
      };
    } else if (absValue < 0.7) {
      return {
        strength: 'Moderate',
        interpretation: 'Notable price memory effects',
        economic: 'Markets exhibit significant frictions'
      };
    } else {
      return {
        strength: 'Strong',
        interpretation: 'High price persistence',
        economic: 'Markets show substantial inefficiencies'
      };
    }
  };

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((value, index) => ({
      lag: index + 1,
      correlation: value,
      significanceUpper: confidenceBound,
      significanceLower: -confidenceBound,
      ...getCorrelationInterpretation(value)
    }));
  }, [data, confidenceBound]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const { correlation, strength, interpretation, economic } = payload[0].payload;
    const isSignificant = Math.abs(correlation) > confidenceBound;

    return (
      <Paper 
        sx={{ 
          p: 2, 
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[2]
        }}
      >
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Lag {label}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Correlation: {correlation.toFixed(4)}
        </Typography>
        <Typography 
          variant="body2" 
          color={isSignificant ? theme.palette.error.main : theme.palette.success.main}
          gutterBottom
        >
          {isSignificant ? 'Statistically Significant' : 'Not Significant'}
        </Typography>
        <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" display="block" color="text.secondary">
            Strength: {strength}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {interpretation}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {economic}
          </Typography>
        </Box>
      </Paper>
    );
  };

  if (formattedData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No ACF data available to display.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={formattedData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis 
            dataKey="lag" 
            stroke={theme.palette.text.primary}
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Time Lag (Periods)', 
              position: 'insideBottom', 
              offset: -10,
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }} 
          />
          <YAxis 
            stroke={theme.palette.text.primary}
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Price Memory Effect', 
              angle: -90, 
              position: 'insideLeft',
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }}
            domain={[-1, 1]}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine 
            y={confidenceBound} 
            stroke={theme.palette.error.main}
            strokeDasharray="3 3"
            strokeWidth={2}
            label={{
              value: 'Statistical Significance',
              fill: theme.palette.error.main,
              fontSize: 10,
              position: 'right'
            }}
          />
          <ReferenceLine 
            y={-confidenceBound} 
            stroke={theme.palette.error.main}
            strokeDasharray="3 3"
            strokeWidth={2}
          />
          <ReferenceLine 
            y={0} 
            stroke={theme.palette.divider}
            strokeWidth={1}
          />
          <Bar 
            dataKey="correlation" 
            fill={theme.palette.secondary.main}
            stroke={theme.palette.secondary.dark}
            strokeWidth={1}
            radius={[2, 2, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          display: 'block', 
          textAlign: 'center',
          mt: 2
        }}
      >
        Bars outside dashed lines indicate significant price memory effects
      </Typography>
    </Box>
  );
};

ACFPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  significance: PropTypes.number.isRequired
};

export default React.memo(ACFPlot);
