// src/components/analysis/tvmii/TVMIIInterpretation.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Alert,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';;
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const TVMIIInterpretation = ({
  data,
  selectedCommodity,
  isMobile,
}) => {
  const { getTechnicalTooltip } = useTechnicalHelp('tvmii');

  // Overall Analysis
  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map((d) => d.tvmii);
    const dates = data.map((d) => new Date(d.date));

    // Calculate basic statistics
    const mean =
      values.reduce((sum, val) => sum + val, 0) / values.length || 0;

    // Identify peak and trough
    const peak = Math.max(...values);
    const trough = Math.min(...values);
    const peakDate = data.find((d) => d.tvmii === peak)?.date;
    const troughDate = data.find((d) => d.tvmii === trough)?.date;

    // Calculate changes month-over-month
    const changes = data
      .slice(1)
      .map((d, idx) => ({
        month: d.date,
        change: d.tvmii - data[idx].tvmii,
      }));

    // Identify the most significant increase
    const significantIncrease = changes.reduce(
      (max, current) =>
        current.change > max.change ? current : max,
      { change: -Infinity, month: null }
    );

    // Identify the most significant decrease
    const significantDecrease = changes.reduce(
      (min, current) =>
        current.change < min.change ? current : min,
      { change: Infinity, month: null }
    );

    return {
      mean,
      peak: { value: peak, date: peakDate },
      trough: { value: trough, date: troughDate },
      significantIncrease,
      significantDecrease,
    };
  }, [data]);

  const getIntegrationLevel = (value) => {
    if (value >= 0.7) return { level: 'High', color: 'success.main' };
    if (value >= 0.3) return { level: 'Moderate', color: 'warning.main' };
    return { level: 'Low', color: 'error.main' };
  };

  if (!analysis) {
    return (
      <Alert severity="info">
        No TV-MII data available for interpretation.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        TV-MII Analysis Interpretation
        <Tooltip title={getTechnicalTooltip('interpretation')}>
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      {analysis && (
        <>
          <Grid container spacing={3}>
            {/* Overall Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <TrendingUpIcon color="primary" />
                    Overall Summary
                  </Typography>
                  <Typography variant="body2">
                    The average TV-MII for <strong>{selectedCommodity}</strong> is{' '}
                    <strong>{analysis.mean.toFixed(3)}</strong>, indicating{' '}
                    <strong>
                      {getIntegrationLevel(analysis.mean).level}
                    </strong>{' '}
                    market integration.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Peak and Trough */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <TrendingUpIcon color="secondary" />
                    Peak & Trough
                  </Typography>
                  <Typography variant="body2">
                    <strong>Peak TV-MII:</strong> {analysis.peak.value.toFixed(3)} on{' '}
                    {new Date(analysis.peak.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Trough TV-MII:</strong> {analysis.trough.value.toFixed(3)} on{' '}
                    {new Date(analysis.trough.date).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Significant Changes */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <TrendingDownIcon color="error" />
                    Significant Decrease
                  </Typography>
                  <Typography variant="body2">
                    <strong>Change:</strong> {analysis.significantDecrease.change.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Month:</strong>{' '}
                    {analysis.significantDecrease.month
                      ? new Date(analysis.significantDecrease.month).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <TrendingUpIcon color="success" />
                    Significant Increase
                  </Typography>
                  <Typography variant="body2">
                    <strong>Change:</strong> {analysis.significantIncrease.change.toFixed(3)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Month:</strong>{' '}
                    {analysis.significantIncrease.month
                      ? new Date(analysis.significantIncrease.month).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* TV-MII Trend Chart */}
          <Typography variant="subtitle1" gutterBottom>
            TV-MII Trend
          </Typography>
          <Box sx={{ width: '100%', height: isMobile ? 300 : 400 }}>
            <ResponsiveContainer>
              <LineChart
                data={data.map((d) => ({
                  date:
                    d.date instanceof Date
                      ? d.date.toLocaleDateString()
                      : new Date(d.date).toLocaleDateString(),
                  tvmii: d.tvmii,
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  domain={[0, 1]}
                  label={{
                    value: 'TV-MII',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                  }}
                />
                <RechartsTooltip />
                <Line
                  type="monotone"
                  dataKey="tvmii"
                  stroke="#82ca9d"
                  dot={false}
                  name="TV-MII"
                />
                <ReferenceLine
                  y={analysis.mean}
                  stroke="blue"
                  strokeDasharray="3 3"
                  label={{ value: 'Mean TV-MII', position: 'right' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </>
      )}
    </Paper>
  );
};

TVMIIInterpretation.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([
        PropTypes.instanceOf(Date),
        PropTypes.string,
      ]).isRequired,
      tvmii: PropTypes.number.isRequired,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default TVMIIInterpretation;
