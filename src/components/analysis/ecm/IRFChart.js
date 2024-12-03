//src/components/analysis/ecm/IRFChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useTheme, Typography, Box } from '@mui/material';

const IRFChart = ({ data, analysisType, direction }) => {
  const theme = useTheme();

  const getLabels = () => {
    if (analysisType === 'unified') {
      return {
        response1: 'Northern Market Response to Own Shock',
        response2: 'Southern Market Response to Northern Shock',
        response3: 'Northern Market Response to Southern Shock',
        response4: 'Southern Market Response to Own Shock'
      };
    } else if (direction === 'northToSouth') {
      return {
        response1: 'Source Market Response to Own Shock',
        response2: 'Destination Market Response to Source Shock',
        response3: 'Source Market Response to Destination Shock',
        response4: 'Destination Market Response to Own Shock'
      };
    } else {
      return {
        response1: 'Southern Market Response to Own Shock',
        response2: 'Northern Market Response to Southern Shock',
        response3: 'Southern Market Response to Northern Shock',
        response4: 'Northern Market Response to Own Shock'
      };
    }
  };

  const labels = getLabels();
  
  const colors = {
    response1: theme.palette.primary.main,
    response2: theme.palette.secondary.main,
    response3: theme.palette.error.main,
    response4: theme.palette.success.main
  };

  const formattedData = useMemo(() => {
    if (!data) return [];
    return data.map((period, index) => ({
      period: index,
      response1: period[0][0],
      response2: period[0][1],
      response3: period[1][0],
      response4: period[1][1]
    }));
  }, [data]);

  if (formattedData.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No IRF data available to display.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.palette.divider}
            opacity={0.5} 
          />
          <XAxis 
            dataKey="period" 
            stroke={theme.palette.text.primary}
            tick={{ fill: theme.palette.text.primary }}
            label={{ 
              value: 'Time Periods After Shock', 
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
              value: 'Price Response', 
              angle: -90, 
              position: 'insideLeft',
              fill: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 500
            }}
          />
          <Tooltip 
            formatter={(value, name) => [
              `${value.toFixed(4)}`,
              labels[name]
            ]}
            labelFormatter={(label) => `Period ${label}`}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              padding: '8px 12px',
              boxShadow: theme.shadows[2]
            }}
          />
          <Legend 
            verticalAlign="bottom"
            height={72}
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              fontWeight: 500
            }}
          />
          {Object.entries(labels).map(([key, label]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={colors[key]}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

IRFChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.arrayOf(PropTypes.number)
    )
  ),
  analysisType: PropTypes.oneOf(['unified', 'directional']).isRequired,
  direction: PropTypes.oneOf(['northToSouth', 'southToNorth'])
};

export default React.memo(IRFChart);