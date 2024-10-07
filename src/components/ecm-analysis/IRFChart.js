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
        Impulse Response Function (IRF)
      </Typography>
      <Typography variant="body2" gutterBottom>
        Shows the response of commodity prices to a shock in conflict intensity over time.
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            label={
              <Tooltip title="Time periods after the shock">
                <text x="50%" y="100%" dy={16} textAnchor="middle" fill="#666" fontSize={12}>
                  Period
                </text>
              </Tooltip>
            }
          />
          <YAxis
            label={
              <Tooltip title="Response of the commodity price to the shock">
                <text
                  transform="rotate(-90)"
                  y={15}
                  x={-200}
                  dy="-5.1em"
                  textAnchor="middle"
                  fill="#666"
                  fontSize={12}
                >
                  Response
                </text>
              </Tooltip>
            }
          />
          <RechartsTooltip
            formatter={(value) => formatNumber(value)}
            labelFormatter={(label) => `Period: ${label}`}
          />
          {data.some((d) => d.lower !== null && d.upper !== null) && (
            <Area
              type="monotone"
              dataKey="upper"
              stroke={false}
              fillOpacity={0.2}
              fill="#82ca9d"
              name="Confidence Interval Upper"
            />
          )}
          {data.some((d) => d.lower !== null && d.upper !== null) && (
            <Area
              type="monotone"
              dataKey="lower"
              stroke={false}
              fillOpacity={0.2}
              fill="#82ca9d"
              name="Confidence Interval Lower"
            />
          )}
          <Line
            type="monotone"
            dataKey="response"
            stroke="#8884d8"
            name="Price Response to Conflict"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        * Confidence intervals represent the uncertainty around the impulse response estimates.
      </Typography>
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