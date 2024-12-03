// src/components/analysis/ecm/QQPlot.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip
} from 'recharts';
import { jStat } from 'jstat';
import { Typography } from '@mui/material';

const QQPlot = ({ residuals }) => {
  const qqData = useMemo(() => {
    if (!residuals || residuals.length === 0) return [];

    // Sort residuals
    const sortedResiduals = [...residuals].sort((a, b) => a - b);
    const n = sortedResiduals.length;

    // Calculate theoretical quantiles using jStat
    return sortedResiduals.map((value, i) => {
      const p = (i + 0.5) / n;
      const theoreticalQuantile = jStat.normal.inv(p, 0, 1); // Mean=0, SD=1
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
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <XAxis 
          dataKey="theoretical" 
          label={{ value: 'Theoretical Quantiles', position: 'insideBottom', offset: -5 }} 
        />
        <YAxis 
          dataKey="sample" 
          label={{ value: 'Sample Quantiles', angle: -90, position: 'insideLeft' }} 
        />
        <Tooltip 
          formatter={(value) => [value.toFixed(4), 'Sample Quantile']}
          labelFormatter={(label) => `Theoretical Quantile ${label}`}
        />
        <ReferenceLine y={0} stroke="#000" />
        <ReferenceLine x={0} stroke="#000" />
        <Scatter data={qqData} fill="#8884d8" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

QQPlot.propTypes = {
  residuals: PropTypes.arrayOf(PropTypes.number).isRequired
};

export default React.memo(QQPlot);