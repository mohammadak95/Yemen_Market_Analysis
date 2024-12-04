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
    // Handle both new and old data structures
    const seriesData = Array.isArray(data) ? data : data?.values
      ? { dates: data.dates, values: data.values, upper_bounds: data.upper_bounds, lower_bounds: data.lower_bounds }
      : null;

    if (!seriesData) return [];

    // Handle array format (new structure)
    if (Array.isArray(seriesData)) {
      return seriesData.map(point => ({
        date: new Date(point.date).toLocaleDateString(),
        differential: point.value,
        upperBound: point.confidence_interval?.upper || null,
        lowerBound: point.confidence_interval?.lower || null,
      }));
    }

    // Handle object format (old structure)
    const { dates, values, upper_bounds, lower_bounds } = seriesData;
    if (!dates || !values || dates.length !== values.length) {
      return [];
    }

    return dates.map((dateStr, index) => ({
      date: new Date(dateStr).toLocaleDateString(),
      differential: values[index],
      upperBound: upper_bounds ? upper_bounds[index] : null,
      lowerBound: lower_bounds ? lower_bounds[index] : null,
    }));
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

    const formattedDate = label;

    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {formattedDate}
        </Typography>
        {payload.map((entry) => (
          <Typography
            key={entry.name}
            variant="body2"
            color={entry.color}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
          >
            <span>{entry.name}:</span>
            <span>{entry.value.toFixed(4)}</span>
          </Typography>
        ))}
        {hasConfidenceIntervals && payload[0]?.payload?.upperBound !== null && (
          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" color="text.secondary">
              Confidence Intervals: {payload[0].payload.lowerBound.toFixed(4)} - {payload[0].payload.upperBound.toFixed(4)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Price Differential Chart
          <Tooltip title="Visualization of price differentials over time">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      {chartData.length === 0 ? (
        <Alert severity="warning">No chart data available.</Alert>
      ) : (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 500}>
          <ComposedChart data={chartData}>
            <CartesianGrid stroke={theme.palette.divider} />
            <XAxis dataKey="date" />
            <YAxis domain={yAxisDomain} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="differential" stroke={theme.palette.primary.main} name="Price Differential" />
            {hasConfidenceIntervals && (
              <>
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill={theme.palette.primary.light}
                  fillOpacity={0.3}
                  name="Upper Confidence"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill={theme.palette.primary.light}
                  fillOpacity={0.3}
                  name="Lower Confidence"
                />
              </>
            )}
            <Brush dataKey="date" height={30} stroke={theme.palette.primary.main} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
        confidence_interval: PropTypes.shape({
          upper: PropTypes.number,
          lower: PropTypes.number,
        }),
      })
    ),
    PropTypes.shape({
      dates: PropTypes.arrayOf(PropTypes.string).isRequired,
      values: PropTypes.arrayOf(PropTypes.number).isRequired,
      upper_bounds: PropTypes.arrayOf(PropTypes.number),
      lower_bounds: PropTypes.arrayOf(PropTypes.number),
    }),
  ]).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default React.memo(PriceDifferentialChart);