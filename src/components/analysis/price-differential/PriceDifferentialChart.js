// src/components/analysis/price-differential/PriceDifferentialChart.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  IconButton,
  Alert,
  useTheme
} from '@mui/material';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import { Info as InfoIcon } from '@mui/icons-material';


const PriceDifferentialChart = ({
  data,
  baseMarket,
  comparisonMarket,
  commodity,
  isMobile
}) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data?.values || !data?.dates) return [];
    
    return data.dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString(),
      differential: data.values[index],
      upperBound: data.confidence_bounds?.upper?.[index],
      lowerBound: data.confidence_bounds?.lower?.[index]
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Box sx={{
        bgcolor: 'background.paper',
        p: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        boxShadow: theme.shadows[1],
      }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Typography 
            key={index}
            variant="body2"
            color={entry.color}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
          >
            <span>{entry.name}:</span>
            <span>{entry.value.toFixed(4)}</span>
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Price Differential Trends
          <Tooltip title="Visualization of price differentials over time">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      {chartData.length === 0 ? (
        <Alert severity="warning">No price differential data available.</Alert>
      ) : (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 500}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis 
              dataKey="date"
              label={{
                value: 'Date',
                position: 'insideBottom',
                offset: -10
              }}
            />
            <YAxis 
              label={{
                value: 'Price Differential',
                angle: -90,
                position: 'insideLeft',
                offset: 10
              }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            
            <Line 
              type="monotone" 
              dataKey="differential" 
              stroke={theme.palette.primary.main}
              name="Price Differential"
              dot={false}
              strokeWidth={2}
            />
            
            {data.confidence_bounds && (
              <>
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill={theme.palette.primary.light}
                  fillOpacity={0.2}
                  name="Upper Confidence"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill={theme.palette.primary.light}
                  fillOpacity={0.2}
                  name="Lower Confidence"
                />
              </>
            )}
            
            <Brush 
              dataKey="date" 
              height={30} 
              stroke={theme.palette.primary.main}
              fill={theme.palette.background.paper}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.shape({
    dates: PropTypes.arrayOf(PropTypes.string).isRequired,
    values: PropTypes.arrayOf(PropTypes.number).isRequired,
    confidence_bounds: PropTypes.shape({
      upper: PropTypes.arrayOf(PropTypes.number),
      lower: PropTypes.arrayOf(PropTypes.number)
    })
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired
};

export default React.memo(PriceDifferentialChart);