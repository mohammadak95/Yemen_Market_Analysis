// src/components/analysis/tvmii/TVMIIMarketPairsChart.js

import React, { useState, useEffect, useMemo } from 'react';
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
import { useTechnicalHelp } from '../../../hooks';

const TVMIIMarketPairsChart = ({ data, selectedCommodity, isMobile }) => {
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [animationKey, setAnimationKey] = useState(0); // Key for forcing smooth re-renders
  const { getTechnicalTooltip } = useTechnicalHelp('tvmii');

  // Extract unique market pairs
  const marketPairs = useMemo(() => {
    const pairsSet = new Set(data.map((item) => item.market_pair));
    return Array.from(pairsSet);
  }, [data]);

  // Set initial market pair
  useEffect(() => {
    if (marketPairs.length > 0) {
      setSelectedMarketPair((prevPair) =>
        marketPairs.includes(prevPair) ? prevPair : marketPairs[0]
      );
    }
  }, [marketPairs]);

  // Filter data based on selected market pair
  const filteredData = useMemo(() => {
    return data.filter((item) => item.market_pair === selectedMarketPair);
  }, [data, selectedMarketPair]);

  // Format chart data
  const chartData = useMemo(() => {
    return filteredData.map((d) => ({
      date: d.date.getTime(),
      tvmii: d.tv_mii || d.tvmii || d.value,
    }));
  }, [filteredData]);

  const handleMarketPairChange = (event) => {
    setSelectedMarketPair(event.target.value);
    setAnimationKey(prev => prev + 1); // Trigger smooth re-render
  };

  // Custom animation configuration
  const animationConfig = {
    initial: { duration: 0 },
    enter: { duration: 800, easing: 'ease-out' },
    leave: { duration: 300, easing: 'ease-in' }
  };

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
          Market Pairs TV-MII
          <Tooltip title={getTechnicalTooltip('marketPairsChart')}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Market Pair</InputLabel>
          <Select
            value={selectedMarketPair}
            onChange={handleMarketPairChange}
            label="Market Pair"
          >
            {marketPairs.map((pair) => (
              <MenuItem key={pair} value={pair}>
                {pair}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {filteredData.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No TV-MII data available for the selected market pair.
        </Alert>
      ) : (
        <Box 
          sx={{ 
            height: isMobile ? 300 : 400, 
            width: '100%',
            transition: 'all 0.3s ease-in-out' // Smooth container transitions
          }}
        >
          <ResponsiveContainer key={animationKey}>
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
                        boxShadow: 1,
                        transition: 'all 0.2s ease' // Smooth tooltip transitions
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
                animationDuration={300}
                animationEasing="ease-out"
              />
              <Legend />

              <Line
                type="monotone"
                dataKey="tvmii"
                stroke="#8884d8"
                dot={false}
                name="TV-MII"
                strokeWidth={2}
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-in-out"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      <Box 
        sx={{ 
          mt: 2,
          transition: 'opacity 0.3s ease-in-out' // Smooth text transitions
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Time-Varying Market Integration Index for market pair{' '}
          <strong>{selectedMarketPair}</strong>. Values closer to 1 indicate
          stronger market integration, while values closer to 0 suggest weaker
          integration.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIMarketPairsChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.instanceOf(Date).isRequired,
      tv_mii: PropTypes.number,
      tvmii: PropTypes.number,
      value: PropTypes.number,
      market_pair: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default TVMIIMarketPairsChart;
