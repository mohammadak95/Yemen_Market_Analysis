//src/components/analysis/spatial/components/ResidualsChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import _ from 'lodash';

const ResidualsChart = ({ residuals, isMobile }) => {
  const theme = useTheme();

  // Process and format residuals data
  const chartData = useMemo(() => {
    // Group residuals by region
    const groupedData = _.groupBy(residuals, 'region_id');

    // Get unique dates across all regions
    const dates = _.uniq(residuals.map(r => r.date)).sort();

    // Create data points for each date with all regions' residuals
    return dates.map(date => {
      const dataPoint = { date: new Date(date) };
      Object.keys(groupedData).forEach(region => {
        const residual = groupedData[region].find(r => r.date === date);
        dataPoint[region] = residual ? residual.residual : null;
      });
      return dataPoint;
    });
  }, [residuals]);

  // Get unique regions for creating lines
  const regions = useMemo(() => 
    _.uniq(residuals.map(r => r.region_id)),
    [residuals]
  );

  // Generate colors for regions
  const getRegionColor = (index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
      // Add more colors if needed
    ];
    return colors[index % colors.length];
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: isMobile ? 10 : 30,
          left: isMobile ? -20 : 10,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          type="number"
          scale="time"
          domain={['auto', 'auto']}
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
          tick={{ fontSize: isMobile ? 10 : 12 }}
        />
        <YAxis
          label={{
            value: 'Residual',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            fontSize: isMobile ? 12 : 14,
          }}
          tick={{ fontSize: isMobile ? 10 : 12 }}
        />
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
          formatter={(value, name) => [
            value?.toFixed(4) || 'N/A',
            name
          ]}
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4,
          }}
        />
        <Legend 
          verticalAlign="bottom"
          height={36}
          wrapperStyle={{
            fontSize: isMobile ? 10 : 12,
          }}
        />
        {regions.map((region, index) => (
          <Line
            key={region}
            type="monotone"
            dataKey={region}
            name={region}
            stroke={getRegionColor(index)}
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
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