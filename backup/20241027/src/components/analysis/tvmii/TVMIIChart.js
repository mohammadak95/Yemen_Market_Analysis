// src/components/analysis/tvmii/TVMIIChart.js

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
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
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  Alert,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const TVMIIChart = ({ data, selectedCommodity, isMobile }) => {
  const formattedData = useMemo(() => {
    return Array.isArray(data)
      ? data.map((d) => ({
          date: new Date(d.date).getTime(), // Convert date to timestamp
          tvmii: d.tvmii || d.value || d.marketIntegration || d.smoothed_value,
          smoothed: d.smoothed_value || d.marketIntegration,
          upper: d.confidence_bounds?.[1],
          lower: d.confidence_bounds?.[0],
        }))
      : [];
  }, [data]);

  const [displayMode, setDisplayMode] = useState('raw');
  const [showBounds] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const { getTechnicalTooltip } = useTechnicalHelp('tvmii');

  const chartData = useMemo(() => {
    if (!formattedData.length) return [];

    let filteredData = formattedData;
    if (selectedPeriod !== 'all') {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(selectedPeriod, 10));
      filteredData = formattedData.filter((d) => d.date >= cutoffDate.getTime());
    }

    return filteredData;
  }, [formattedData, selectedPeriod]);

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  const handleDisplayModeChange = (event, newMode) => {
    if (newMode !== null) {
      setDisplayMode(newMode);
    }
  };

  const getIntegrationLevel = (value) => {
    if (value >= 0.7) return { label: 'High', color: 'success.main' };
    if (value >= 0.3) return { label: 'Moderate', color: 'warning.main' };
    return { label: 'Low', color: 'error.main' };
  };

  const averageTVMII = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((sum, d) => sum + d.tvmii, 0) / chartData.length;
  }, [chartData]);

  const integrationStatus = getIntegrationLevel(averageTVMII);

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
          Time-Varying Market Integration Index
          <Tooltip title={getTechnicalTooltip('chart')}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        <Box
          sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={handlePeriodChange}
              label="Time Period"
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="12">Last 12 Months</MenuItem>
              <MenuItem value="6">Last 6 Months</MenuItem>
              <MenuItem value="3">Last 3 Months</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={displayMode}
            exclusive
            onChange={handleDisplayModeChange}
            size="small"
          >
            <ToggleButton value="raw">Raw</ToggleButton>
            <ToggleButton value="smoothed">Smoothed</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Alert
        severity={
          integrationStatus.label === 'High'
            ? 'success'
            : integrationStatus.label === 'Moderate'
            ? 'warning'
            : 'error'
        }
        sx={{ mb: 2 }}
      >
        Average integration level: <strong>{integrationStatus.label}</strong> (
        {averageTVMII.toFixed(3)})
      </Alert>

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
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={(timestamp) =>
                new Date(timestamp).toLocaleDateString()
              }
              label={{
                value: 'Date',
                position: 'insideBottom',
                offset: -10,
              }}
            />
            <YAxis
              domain={[0, 1]}
              label={{
                value: 'Integration Index',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
              }}
            />
            <RechartsTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <Box
                    sx={{
                      bgcolor: 'background.paper',
                      p: 1,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {new Date(label).toLocaleDateString()}
                    </Typography>
                    {payload.map((entry) => (
                      <Typography
                        key={entry.name}
                        variant="body2"
                        color={entry.color}
                      >
                        {`${entry.name}: ${entry.value.toFixed(3)}`}
                      </Typography>
                    ))}
                  </Box>
                );
              }}
            />
            <Legend />

            <ReferenceLine
              y={0.7}
              stroke="green"
              strokeDasharray="3 3"
              label={{ value: 'High Integration', position: 'right' }}
            />
            <ReferenceLine
              y={0.3}
              stroke="orange"
              strokeDasharray="3 3"
              label={{ value: 'Low Integration', position: 'right' }}
            />

            <Line
              type="monotone"
              dataKey={displayMode === 'raw' ? 'tvmii' : 'smoothed'}
              stroke="#8884d8"
              dot={false}
              name="TV-MII"
            />

            {showBounds && (
              <>
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#82ca9d"
                  strokeDasharray="3 3"
                  dot={false}
                  name="Upper Bound"
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#82ca9d"
                  strokeDasharray="3 3"
                  dot={false}
                  name="Lower Bound"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Time-Varying Market Integration Index (TV-MII) for {selectedCommodity}.
          Values closer to 1 indicate stronger market integration, while values closer
          to 0 suggest weaker integration. The shaded area represents the confidence
          interval.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.instanceOf(Date)
      ]).isRequired,
      tv_mii: PropTypes.number,
      value: PropTypes.number,
      marketIntegration: PropTypes.number,
      confidence_bounds: PropTypes.arrayOf(PropTypes.number),
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default TVMIIChart;