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
import { Typography } from '@mui/material';

const ACFPlot = ({ data, significance }) => {
  const confidenceBound = Math.abs(1.96 / Math.sqrt(data?.length || 1));

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((value, index) => ({
      lag: index + 1, // Starting lag at 1
      correlation: value,
      significanceUpper: confidenceBound,
      significanceLower: -confidenceBound
    }));
  }, [data, confidenceBound]);

  if (formattedData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No ACF data available to display.
      </Typography>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <XAxis dataKey="lag" label={{ value: 'Lag', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Correlation', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <ReferenceLine y={confidenceBound} stroke="#ff0000" strokeDasharray="3 3" />
        <ReferenceLine y={-confidenceBound} stroke="#ff0000" strokeDasharray="3 3" />
        <Bar dataKey="correlation" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

ACFPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  significance: PropTypes.number.isRequired
};

export default React.memo(ACFPlot);