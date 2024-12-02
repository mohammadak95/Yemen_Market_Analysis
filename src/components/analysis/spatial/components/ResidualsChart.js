// src/components/analysis/spatial/components/ResidualsChart.js

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
  ReferenceLine,
  Label
} from 'recharts';
import { useTheme, useMediaQuery } from '@mui/material';
import _ from 'lodash';
import { formatNumber } from '../utils/mapUtils';

const ResidualsChart = ({ residuals, isMobile }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Process and format residuals data
  const { chartData, yAxisDomain, stats } = useMemo(() => {
    // Group residuals by region
    const groupedData = _.groupBy(residuals, 'region_id');

    // Get unique dates across all regions
    const dates = _.uniq(residuals.map(r => r.date)).sort();

    // Create data points for each date with all regions' residuals
    const formattedData = dates.map(date => {
      const dataPoint = { date: new Date(date) };
      Object.keys(groupedData).forEach(region => {
        const residual = groupedData[region].find(r => r.date === date);
        if (residual) {
          dataPoint[region] = residual.residual;
          dataPoint[`${region}_raw`] = residual.residual;
        }
      });
      return dataPoint;
    });

    // Calculate statistics and domain
    const allResiduals = residuals.map(r => r.residual);
    const mean = _.mean(allResiduals);
    const stdDev = Math.sqrt(_.sum(allResiduals.map(r => Math.pow(r - mean, 2))) / allResiduals.length);
    const maxAbs = Math.max(Math.abs(_.min(allResiduals)), Math.abs(_.max(allResiduals)));
    const domainPadding = maxAbs * 0.1; // Add 10% padding

    // Ensure domain is symmetric around zero for better visualization
    const domain = [-maxAbs - domainPadding, maxAbs + domainPadding];

    return {
      chartData: formattedData,
      yAxisDomain: domain,
      stats: {
        mean,
        stdDev,
        upperBound: mean + 2 * stdDev,
        lowerBound: mean - 2 * stdDev
      }
    };
  }, [residuals]);

  // Generate colors for regions
  const getRegionColor = (index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.primary.light,
      theme.palette.secondary.light
    ];
    return colors[index % colors.length];
  };

  // Get unique regions
  const regions = useMemo(() => 
    _.uniq(residuals.map(r => r.region_id)),
    [residuals]
  );

  if (!chartData.length) {
    return null;
  }

  const fontSize = isSmallScreen ? 10 : 12;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{
          top: 10,
          right: isSmallScreen ? 10 : 30,
          left: isSmallScreen ? 0 : 10,
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
          tick={{ fontSize }}
          dy={5}
        />
        <YAxis
          domain={yAxisDomain}
          tickFormatter={(value) => formatNumber(value)}
          tick={{ fontSize }}
          dx={-5}
        >
          <Label
            value="Residual"
            angle={-90}
            position="insideLeft"
            offset={0}
            style={{ fontSize, textAnchor: 'middle' }}
          />
        </YAxis>
        
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
          formatter={(value, name) => [
            formatNumber(value),
            name.replace('_raw', '')
          ]}
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4,
            fontSize
          }}
        />
        
        <Legend 
          verticalAlign="bottom"
          height={36}
          wrapperStyle={{
            fontSize,
            paddingTop: '10px'
          }}
        />

        {/* Reference Lines */}
        <ReferenceLine 
          y={0} 
          stroke={theme.palette.text.secondary} 
          strokeDasharray="3 3" 
        />
        <ReferenceLine 
          y={stats.mean} 
          stroke={theme.palette.info.main} 
          strokeDasharray="3 3"
          label={{ 
            value: 'Mean',
            position: 'insideTopLeft',
            fontSize
          }} 
        />
        <ReferenceLine 
          y={stats.upperBound} 
          stroke={theme.palette.warning.main} 
          strokeDasharray="3 3"
          label={{ 
            value: '+2σ',
            position: 'insideTopLeft',
            fontSize
          }} 
        />
        <ReferenceLine 
          y={stats.lowerBound} 
          stroke={theme.palette.warning.main} 
          strokeDasharray="3 3"
          label={{ 
            value: '-2σ',
            position: 'insideBottomLeft',
            fontSize
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
            activeDot={{ r: 4 }}
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