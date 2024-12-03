//src/components/analysis/ecm/PACFPlot.js

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
import { Typography, Box, useTheme } from '@mui/material';

const PACFPlot = ({ data, significance }) => {
  const theme = useTheme();
  const confidenceBound = Math.abs(1.96 / Math.sqrt(data?.length || 1));

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((value, index) => ({
      lag: index + 1,
      correlation: value,
      significanceUpper: confidenceBound,
      significanceLower: -confidenceBound
    }));
  }, [data, confidenceBound]);

  if (formattedData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No PACF data available to display.
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
              value: 'Lag', 
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
              value: 'Partial Correlation', 
              angle: -90, 
              position: 'insideLeft',
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }}
            domain={[-1, 1]}
          />
          <Tooltip 
            formatter={(value) => [`${value.toFixed(4)}`, 'Correlation']}
            labelFormatter={(label) => `Lag ${label}`}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              padding: '8px 12px',
              boxShadow: theme.shadows[2]
            }}
          />
          <ReferenceLine 
            y={confidenceBound} 
            stroke={theme.palette.error.main}
            strokeDasharray="3 3"
            strokeWidth={2}
            label={{
              value: '95% Confidence Bound',
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
            fill={theme.palette.primary.main}
            stroke={theme.palette.primary.dark}
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

PACFPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  significance: PropTypes.number.isRequired
};

export default React.memo(PACFPlot);