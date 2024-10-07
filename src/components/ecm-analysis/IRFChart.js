// src/components/ecm-analysis/IRFChart.js

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { Typography, Paper, Tooltip } from '@mui/material';
import PropTypes from 'prop-types';

const IRFChart = ({ irfData }) => {
  const data = useMemo(() => {
    return irfData.irf.map((point, index) => ({
      period: index,
      response: point[0][1],
      lower: irfData.lower ? irfData.lower[index][0][1] : null,
      upper: irfData.upper ? irfData.upper[index][0][1] : null,
    }));
  }, [irfData]);

  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(2) : 'N/A');

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Impulse Response Function
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            label={
              <Tooltip title="Time periods after the shock">
                <text x="0" y="0" dy={16} dx={250} textAnchor="middle">
                  Period
                </text>
              </Tooltip>
            }
          />
          <YAxis
            label={
              <Tooltip title="Response of the variable to the shock">
                <text x="0" y="0" dx={-30} dy={200} textAnchor="middle" transform="rotate(-90)">
                  Response
                </text>
              </Tooltip>
            }
          />
          <RechartsTooltip
            formatter={(value) => formatNumber(value)}
            labelFormatter={(label) => `Period: ${label}`}
          />
          {data[0].lower !== null && data[0].upper !== null && (
            <Area
              type="monotone"
              dataKey="upper"
              stroke={false}
              fillOpacity={0.2}
              fill="#8884d8"
              name="Confidence Interval"
            />
          )}
          <Line
            type="monotone"
            dataKey="response"
            stroke="#8884d8"
            name="Price Response to Conflict"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

IRFChart.propTypes = {
  irfData: PropTypes.shape({
    irf: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))).isRequired,
    lower: PropTypes.array,
    upper: PropTypes.array,
  }).isRequired,
};

export default IRFChart;
