//src/components/analysis/ecm/QQPlot.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  Legend
} from 'recharts';
import { jStat } from 'jstat';
import { Typography, Box, useTheme } from '@mui/material';

const QQPlot = ({ residuals }) => {
  const theme = useTheme();

  const qqData = useMemo(() => {
    if (!residuals || residuals.length === 0) return [];

    const sortedResiduals = [...residuals].sort((a, b) => a - b);
    const n = sortedResiduals.length;

    return sortedResiduals.map((value, i) => {
      const p = (i + 0.5) / n;
      const theoreticalQuantile = jStat.normal.inv(p, 0, 1);
      return {
        theoretical: theoreticalQuantile,
        sample: value
      };
    });
  }, [residuals]);

  if (qqData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No residuals data available to display Q-Q Plot.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis 
            dataKey="theoretical" 
            stroke={theme.palette.text.primary}
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Theoretical Quantiles', 
              position: 'insideBottom', 
              offset: -10,
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }} 
          />
          <YAxis 
            dataKey="sample"
            stroke={theme.palette.text.primary}
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Sample Quantiles', 
              angle: -90, 
              position: 'insideLeft',
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }} 
          />
          <Tooltip 
            formatter={(value) => [`${value.toFixed(4)}`, 'Sample Quantile']}
            labelFormatter={(label) => `Theoretical: ${Number(label).toFixed(4)}`}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              padding: '8px 12px',
              boxShadow: theme.shadows[2]
            }}
          />
          <Legend 
            verticalAlign="top"
            height={36}
            wrapperStyle={{
              fontSize: '12px',
              fontWeight: 500
            }}
          />
          <ReferenceLine 
            y={0} 
            stroke={theme.palette.divider}
            strokeWidth={2}
            strokeDasharray="3 3" 
          />
          <ReferenceLine 
            x={0} 
            stroke={theme.palette.divider}
            strokeWidth={2}
            strokeDasharray="3 3" 
          />
          <Scatter 
            name="Q-Q Plot Points"
            data={qqData} 
            fill={theme.palette.primary.main}
            stroke={theme.palette.primary.dark}
            strokeWidth={1}
            r={4}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
};

QQPlot.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.number).isRequired
};

export default React.memo(QQPlot);