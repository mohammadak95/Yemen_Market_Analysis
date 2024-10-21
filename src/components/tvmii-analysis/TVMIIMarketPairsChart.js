// src/components/TVMIIMarketPairsChart.js

import React, { useState, useMemo } from 'react';
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
import {
  Typography,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

const TVMIIMarketPairsChart = ({ data, selectedCommodity }) => {
  const [selectedMarket1, setSelectedMarket1] = useState('');
  const [selectedMarket2, setSelectedMarket2] = useState('');

  // Construction and Deconstruction Logging Removed

  const uniqueMarkets = useMemo(() => {
    const markets = new Set();
    data.forEach(item => {
      const [market1, market2] = item.market_pair.split('-');
      markets.add(market1.trim());
      markets.add(market2.trim());
    });
    return Array.from(markets).sort();
  }, [data]);

  const handleMarket1Change = (event) => {
    setSelectedMarket1(event.target.value);
  };

  const handleMarket2Change = (event) => {
    setSelectedMarket2(event.target.value);
  };

  const selectedPair = useMemo(() => {
    if (selectedMarket1 && selectedMarket2) {
      return `${selectedMarket1}-${selectedMarket2}`; // No spaces around the dash
    }
    return null;
  }, [selectedMarket1, selectedMarket2]);

  const filteredData = useMemo(() => {
    if (!selectedPair) return [];

    let filtered = data.filter(item => item.market_pair === selectedPair);
    if (filtered.length === 0) {
      // Try flipping the market pair
      const flippedPair = `${selectedMarket2}-${selectedMarket1}`;
      filtered = data.filter(item => item.market_pair === flippedPair);
    }
    return filtered;
  }, [data, selectedPair, selectedMarket1, selectedMarket2]);

  // Extract unique years from the data for XAxis ticks
  const years = useMemo(() => {
    const yearSet = new Set();
    data.forEach(item => {
      const date = new Date(item.date);
      if (!isNaN(date)) {
        yearSet.add(date.getFullYear());
      }
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [data]);

  const tickFormatter = (tick) => {
    const date = new Date(tick);
    if (!isNaN(date)) {
      return date.getFullYear();
    }
    return tick;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        TV-MII for Market Pairs: {selectedCommodity}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="market1-select-label">Select Market 1</InputLabel>
            <Select
              labelId="market1-select-label"
              value={selectedMarket1}
              onChange={handleMarket1Change}
              label="Select Market 1"
            >
              {uniqueMarkets.map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="market2-select-label">Select Market 2</InputLabel>
            <Select
              labelId="market2-select-label"
              value={selectedMarket2}
              onChange={handleMarket2Change}
              label="Select Market 2"
            >
              {uniqueMarkets.map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              ticks={years.map(year => new Date(`${year}-01-01`).toISOString())}
            />
            <YAxis domain={[0, 1]} />
            <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
            <Legend />
            <Line
              type="monotone"
              dataKey="tv_mii"
              name={`${selectedMarket1}-${selectedMarket2}`}
              stroke={COLORS[0]}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body1" color="textSecondary" align="center">
          No data available for the selected market pair.
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          This chart displays the Time-Variant Market Integration Index (TV-MII) for the selected market pair of {selectedCommodity}.
          Choose two different markets to visualize and compare their integration levels over time.
        </Typography>
      </Box>
    </Paper>
  );
};

TVMIIMarketPairsChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    tv_mii: PropTypes.number.isRequired,
    market_pair: PropTypes.string.isRequired,
  })).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
};

export default TVMIIMarketPairsChart;
