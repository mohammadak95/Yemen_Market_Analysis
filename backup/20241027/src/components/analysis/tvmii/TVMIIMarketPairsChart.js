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
  Legend,
} from 'recharts';
import {
  Typography,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  IconButton,
  Tooltip as MuiTooltip,
  Chip,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

const TVMIIMarketPairsChart = ({ data, selectedCommodity }) => {
  const [selectedMarkets, setSelectedMarkets] = useState({
    market1: '',
    market2: '',
  });

  const { getTechnicalTooltip } = useTechnicalHelp('tvmii');

  // Extract unique markets from data
  const uniqueMarkets = useMemo(() => {
    const markets = new Set();
    data.forEach(item => {
      const [market1, market2] = item.market_pair.split('-');
      markets.add(market1.trim());
      markets.add(market2.trim());
    });
    return Array.from(markets).sort();
  }, [data]);

  // Handle market selection changes
  const handleMarket1Change = (event) => {
    setSelectedMarkets(prev => ({
      ...prev,
      market1: event.target.value,
      market2: prev.market2 === event.target.value ? '' : prev.market2,
    }));
  };

  const handleMarket2Change = (event) => {
    setSelectedMarkets(prev => ({
      ...prev,
      market2: event.target.value,
    }));
  };

  // Filter and process data for selected market pair
  const selectedPairData = useMemo(() => {
    if (!selectedMarkets.market1 || !selectedMarkets.market2) return [];

    const marketPair = `${selectedMarkets.market1}-${selectedMarkets.market2}`;
    const reversePair = `${selectedMarkets.market2}-${selectedMarkets.market1}`;

    let filteredData = data.filter(item => 
      item.market_pair === marketPair || item.market_pair === reversePair
    );

    // Sort by date
    return filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data, selectedMarkets]);

  // Calculate integration statistics
  const integrationStats = useMemo(() => {
    if (selectedPairData.length === 0) return null;

    const tvmiiValues = selectedPairData.map(d => d.tv_mii);
    const avgTVMII = tvmiiValues.reduce((a, b) => a + b, 0) / tvmiiValues.length;
    const minTVMII = Math.min(...tvmiiValues);
    const maxTVMII = Math.max(...tvmiiValues);

    return {
      average: avgTVMII,
      minimum: minTVMII,
      maximum: maxTVMII,
      trend: tvmiiValues[tvmiiValues.length - 1] - tvmiiValues[0],
    };
  }, [selectedPairData]);

  const getIntegrationLevel = (value) => {
    if (value >= 0.7) return { label: 'High', color: 'success' };
    if (value >= 0.3) return { label: 'Moderate', color: 'warning' };
    return { label: 'Low', color: 'error' };
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Market Pair Integration Analysis
        <MuiTooltip title={getTechnicalTooltip('market_pairs')}>
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </MuiTooltip>
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Market 1</InputLabel>
            <Select
              value={selectedMarkets.market1}
              onChange={handleMarket1Change}
              label="Market 1"
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
            <InputLabel>Market 2</InputLabel>
            <Select
              value={selectedMarkets.market2}
              onChange={handleMarket2Change}
              label="Market 2"
              disabled={!selectedMarkets.market1}
            >
              {uniqueMarkets
                .filter((market) => market !== selectedMarkets.market1)
                .map((market) => (
                  <MenuItem key={market} value={market}>
                    {market}
                  </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {integrationStats && (
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert 
                severity={getIntegrationLevel(integrationStats.average).color}
                icon={<InfoIcon />}
              >
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Average: ${integrationStats.average.toFixed(3)}`}
                    color={getIntegrationLevel(integrationStats.average).color}
                    variant="outlined"
                  />
                  <Chip 
                    label={`Min: ${integrationStats.minimum.toFixed(3)}`}
                    color={getIntegrationLevel(integrationStats.minimum).color}
                    variant="outlined"
                  />
                  <Chip 
                    label={`Max: ${integrationStats.maximum.toFixed(3)}`}
                    color={getIntegrationLevel(integrationStats.maximum).color}
                    variant="outlined"
                  />
                  <Chip 
                    label={`Trend: ${integrationStats.trend > 0 ? '+' : ''}${integrationStats.trend.toFixed(3)}`}
                    color={integrationStats.trend > 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Box>
              </Alert>
            </Grid>
          </Grid>
        </Box>
      )}

      <Box sx={{ height: 400, width: '100%' }}>
        {selectedPairData.length > 0 ? (
          <ResponsiveContainer>
            <LineChart data={selectedPairData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis 
                domain={[0, 1]}
                label={{ 
                  value: 'Integration Index', 
                  angle: -90, 
                  position: 'insideLeft' 
                }}
              />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                formatter={(value) => [value.toFixed(3), 'TV-MII']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tv_mii"
                stroke={COLORS[0]}
                name={`${selectedMarkets.market1}-${selectedMarkets.market2}`}
                dot={{ r: 1 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Select two markets to view their integration analysis
            </Typography>
          </Box>
        )}
      </Box>

      {selectedPairData.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            TV-MII values show the time-varying integration between {selectedMarkets.market1} and {selectedMarkets.market2} 
            for {selectedCommodity}. Higher values indicate stronger market integration.
            {integrationStats?.trend !== 0 && ` The overall trend shows ${
              integrationStats.trend > 0 ? 'increasing' : 'decreasing'
            } integration over time.`}
          </Typography>
        </Box>
      )}
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
