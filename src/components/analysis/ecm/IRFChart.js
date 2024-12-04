// src/components/analysis/ecm/IRFChart.js

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
  Legend,
  ReferenceLine
} from 'recharts';
import { useTheme, Typography, Box, Paper } from '@mui/material';

const IRFChart = ({ data, analysisType, direction }) => {
  const theme = useTheme();

  const getResponseDetails = () => {
    if (analysisType === 'unified') {
      return {
        response1: {
          label: 'Northern Market Response to Own Shock',
          interpretation: 'Shows how northern market prices respond to local shocks',
          economic: 'Measures market resilience to internal disruptions'
        },
        response2: {
          label: 'Southern Market Response to Northern Shock',
          interpretation: 'Shows price transmission from north to south',
          economic: 'Indicates north-to-south market integration strength'
        },
        response3: {
          label: 'Northern Market Response to Southern Shock',
          interpretation: 'Shows price transmission from south to north',
          economic: 'Indicates south-to-north market integration strength'
        },
        response4: {
          label: 'Southern Market Response to Own Shock',
          interpretation: 'Shows how southern market prices respond to local shocks',
          economic: 'Measures market resilience to internal disruptions'
        }
      };
    } else if (direction === 'northToSouth') {
      return {
        response1: {
          label: 'Source Market Response to Own Shock',
          interpretation: 'Shows how source market absorbs local shocks',
          economic: 'Indicates source market stability'
        },
        response2: {
          label: 'Destination Market Response to Source Shock',
          interpretation: 'Shows price transmission to destination',
          economic: 'Measures market integration effectiveness'
        },
        response3: {
          label: 'Source Market Response to Destination Shock',
          interpretation: 'Shows feedback effects from destination',
          economic: 'Indicates bidirectional market linkages'
        },
        response4: {
          label: 'Destination Market Response to Own Shock',
          interpretation: 'Shows destination market resilience',
          economic: 'Measures local market stability'
        }
      };
    } else {
      return {
        response1: {
          label: 'Southern Market Response to Own Shock',
          interpretation: 'Shows southern market stability',
          economic: 'Measures local market resilience'
        },
        response2: {
          label: 'Northern Market Response to Southern Shock',
          interpretation: 'Shows south-to-north transmission',
          economic: 'Indicates upward price transmission'
        },
        response3: {
          label: 'Southern Market Response to Northern Shock',
          interpretation: 'Shows north-to-south transmission',
          economic: 'Indicates downward price transmission'
        },
        response4: {
          label: 'Northern Market Response to Own Shock',
          interpretation: 'Shows northern market stability',
          economic: 'Measures local market resilience'
        }
      };
    }
  };

  const responseDetails = getResponseDetails();
  
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const response = payload[0];
    const responseKey = response.dataKey;
    const details = responseDetails[responseKey];

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
          Period {label}
        </Typography>
        <Typography variant="body2" gutterBottom>
          {details.label}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Response: {response.value.toFixed(4)}
        </Typography>
        <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" display="block" color="text.secondary">
            {details.interpretation}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {details.economic}
          </Typography>
        </Box>
      </Paper>
    );
  };

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
          <ReferenceLine 
            y={0} 
            stroke={theme.palette.divider}
            strokeDasharray="3 3"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom"
            height={72}
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              fontWeight: 500
            }}
          />
          {Object.entries(responseDetails).map(([key, details]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={details.label}
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
