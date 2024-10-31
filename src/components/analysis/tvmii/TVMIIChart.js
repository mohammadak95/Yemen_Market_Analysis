// src/components/analysis/tvmii/TVMIIChart.js

import React, { useMemo } from 'react';
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
  Tooltip,
  IconButton,
  Alert,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';;

const TVMIIChart = ({ data, selectedCommodity, isMobile }) => {
  // Format the data for the chart
  const formattedData = useMemo(() => {
    return Array.isArray(data)
      ? data.map((d) => ({
          date: d.date.getTime(),
          tvmii: d.tvmii,
          upper: d.confidence_bounds?.[1],
          lower: d.confidence_bounds?.[0],
        }))
      : [];
  }, [data]);

  // Filter data based on the selected time period
  const [selectedPeriod, setSelectedPeriod] = React.useState('all');

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

  // Calculate average TV-MII using only the "Raw" data
  const averageTVMII = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((sum, d) => sum + d.tvmii, 0) / chartData.length;
  }, [chartData]);

  const getIntegrationLevel = (value) => {
    if (value >= 0.7) return { label: 'High', color: 'success.main' };
    if (value >= 0.3) return { label: 'Moderate', color: 'warning.main' };
    return { label: 'Low', color: 'error.main' };
  };

  const integrationStatus = getIntegrationLevel(averageTVMII);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
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
              domain={['dataMin', 'dataMax']}
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
              dataKey="tvmii"
              stroke="#8884d8"
              dot={false}
              name="Raw TV-MII"
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Time-Varying Market Integration Index (TV-MII) for {selectedCommodity}.
          Values closer to 1 indicate stronger market integration, while values closer
          to 0 suggest weaker integration.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.number.isRequired,
      tvmii: PropTypes.number.isRequired,
      confidence_bounds: PropTypes.arrayOf(PropTypes.number),
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default TVMIIChart;
