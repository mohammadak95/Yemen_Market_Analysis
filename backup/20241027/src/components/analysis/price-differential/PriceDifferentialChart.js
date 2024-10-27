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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

/**
 * PriceDifferentialChart Component
 * Displays a line chart of price differentials over time between two markets for a specific commodity.
 *
 * Props:
 * - data: Object containing 'dates' (array of ISO strings) and 'values' (array of numbers).
 * - baseMarket: String representing the base market name.
 * - comparisonMarket: String representing the comparison market name.
 * - commodity: String representing the commodity name.
 * - isMobile: Boolean indicating if the view is on a mobile device.
 */
const PriceDifferentialChart = ({
  data,
  baseMarket,
  comparisonMarket,
  commodity,
  isMobile,
}) => {
  const theme = useTheme();
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');

  /**
   * Processes the raw data into a format suitable for Recharts.
   * Converts date strings to timestamps for accurate plotting.
   */
  const chartData = useMemo(() => {
    if (!data?.dates || !data?.values || data.dates.length !== data.values.length) {
      console.warn('PriceDifferentialChart: Inconsistent data lengths or missing data.');
      return [];
    }

    return data.dates.map((dateStr, index) => {
      const date = new Date(dateStr);
      if (isNaN(date)) {
        console.warn(`PriceDifferentialChart: Invalid date format at index ${index}: ${dateStr}`);
        return null;
      }
      return {
        date: date.getTime(), // Use timestamp for XAxis
        differential: data.values[index],
      };
    }).filter(item => item !== null);
  }, [data]);

  /**
   * Determines the Y-axis domain based on the data to provide adequate padding.
   */
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];

    const values = chartData.map(d => d.differential);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1; // Avoid padding=0
    return [min - padding, max + padding];
  }, [chartData]);

  /**
   * Formats the tooltip to display readable dates and differential values.
   */
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
        <Typography variant="h6" component="div">
          Price Differential Analysis
          <Tooltip title={getTechnicalTooltip('chart')}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        {/* Toggle Button Group for Display Modes (Raw, Smoothed) */}
        {/* Uncomment and implement smoothed data if available */}
        {/* <ToggleButtonGroup
          value={displayMode}
          exclusive
          onChange={handleDisplayModeChange}
          size="small"
        >
          <ToggleButton value="raw">Raw</ToggleButton>
          <ToggleButton value="smoothed">Smoothed</ToggleButton>
        </ToggleButtonGroup> */}
      </Box>

      {chartData.length > 0 ? (
        <Box sx={{ height: isMobile ? 300 : 400, width: '100%' }}>
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return isMobile
                    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                }}
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
              <ReferenceLine y={0} stroke={theme.palette.text.secondary} />

              <Line
                type="monotone"
                dataKey="differential"
                stroke={theme.palette.primary.main}
                dot={false}
                name="Price Differential"
              />
              {/* Uncomment and configure additional lines if smoothed data is available */}
              {/* <Line
                type="monotone"
                dataKey="smoothed_differential"
                stroke={theme.palette.secondary.main}
                dot={false}
                name="Smoothed Differential"
              /> */}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Alert severity="info">
          No price differential data available for the selected market pair.
        </Alert>
      )}

      {/* Description or Additional Information */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Price differential between <strong>{baseMarket}</strong> and <strong>{comparisonMarket}</strong> for <strong>{commodity}</strong>.
          Positive values indicate higher prices in <strong>{baseMarket}</strong>, while negative values indicate higher prices in <strong>{comparisonMarket}</strong>.
        </Typography>
      </Box>
    </Paper>
  );
};

PriceDifferentialChart.propTypes = {
  data: PropTypes.shape({
    dates: PropTypes.arrayOf(PropTypes.string).isRequired,
    values: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default PriceDifferentialChart;