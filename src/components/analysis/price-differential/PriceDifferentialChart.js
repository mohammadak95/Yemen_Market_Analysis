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
  ReferenceLine,
  Brush,
} from 'recharts';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const PriceDifferentialChart = ({
  data,
  baseMarket,
  comparisonMarket,
  commodity,
  isMobile,
}) => {
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (
      !data?.dates ||
      !data?.values ||
      data.dates.length !== data.values.length
    ) {
      return [];
    }

    return data.dates.map((dateStr, index) => {
      const date = new Date(dateStr);
      return {
        date: date.getTime(),
        differential: data.values[index],
        upperBound: data.upper_bounds ? data.upper_bounds[index] : null,
        lowerBound: data.lower_bounds ? data.lower_bounds[index] : null,
      };
    });
  }, [data]);

  const hasConfidenceIntervals = useMemo(() => {
    return chartData.some(
      (item) => item.upperBound !== null && item.lowerBound !== null
    );
  }, [chartData]);

  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];

    const values = chartData.flatMap((d) => [
      d.differential,
      d.upperBound,
      d.lowerBound,
    ]).filter((v) => v !== null);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  }, [chartData]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return isMobile
      ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const date = new Date(label);
    const formattedDate = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
        }}
      >
        <Typography variant="body2">{formattedDate}</Typography>
        {payload.map((entry) => (
          <Typography
            key={entry.name}
            variant="body2"
            color={entry.color}
          >
            {`${entry.name}: ${entry.value.toFixed(4)}`}
          </Typography>
        ))}
      </Box>
    );
  };

  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.arrayOf(PropTypes.object),
    label: PropTypes.number,
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h6">
          Price Differential Chart
          <Tooltip title="This chart visualizes the price differences between the selected markets over time.">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      {chartData.length > 0 ? (
        <Box sx={{ height: isMobile ? 300 : 400, width: '100%' }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={formatDate}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                label={{
                  value: 'Date',
                  position: 'insideBottom',
                  offset: -5,
                  fontSize: isMobile ? 12 : 14,
                }}
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                label={{
                  value: 'Price Differential',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fontSize: isMobile ? 12 : 14,
                }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke={theme.palette.grey[500]} />
              {hasConfidenceIntervals && (
                <Area
                  type="monotone"
                  dataKey="differential"
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.light}
                  fillOpacity={0.2}
                  baseLine={(data) => data.lowerBound}
                  isAnimationActive={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="differential"
                stroke={theme.palette.primary.main}
                dot={false}
                name="Price Differential"
              />
              <Brush dataKey="date" height={30} stroke={theme.palette.primary.main} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Alert severity="info">
          No price differential data available for the selected market pair.
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Price differential between <strong>{baseMarket}</strong> and{' '}
          <strong>{comparisonMarket}</strong> for <strong>{commodity}</strong>.
          Positive values indicate higher prices in <strong>{baseMarket}</strong>,
          while negative values indicate higher prices in{' '}
          <strong>{comparisonMarket}</strong>.
        </Typography>
      </Box>
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.shape({
    dates: PropTypes.arrayOf(PropTypes.string).isRequired,
    values: PropTypes.arrayOf(PropTypes.number).isRequired,
    upper_bounds: PropTypes.arrayOf(PropTypes.number),
    lower_bounds: PropTypes.arrayOf(PropTypes.number),
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default PriceDifferentialChart;
