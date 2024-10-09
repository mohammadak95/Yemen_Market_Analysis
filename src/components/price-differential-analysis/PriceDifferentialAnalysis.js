// src/components/price-differential-analysis/PriceDifferentialAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Button,
} from '@mui/material';
import PriceDifferentialChart from './PriceDifferentialChart';
import RegressionResults from './RegressionResults';
import DiagnosticsTests from './DiagnosticsTests';
import MarketPairInfo from './MarketPairInfo';
import usePriceDifferentialData from '../../hooks/usePriceDifferentialData';

const PriceDifferentialAnalysis = ({ selectedCommodity }) => { // Removed selectedRegime from props
  const { data, status, error } = usePriceDifferentialData();
  const [baseMarket, setBaseMarket] = useState('');
  const [marketPairs, setMarketPairs] = useState([]);
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    if (status === 'succeeded' && data) {
      const baseMarkets = Object.keys(data);
      if (baseMarkets.length > 0) {
        setBaseMarket((prev) => (prev && baseMarkets.includes(prev) ? prev : baseMarkets[0]));
      }
    }
  }, [status, data]);

  useEffect(() => {
    if (
      baseMarket &&
      data[baseMarket] &&
      data[baseMarket].commodity_results &&
      data[baseMarket].commodity_results[selectedCommodity]
    ) {
      const commodityResults = data[baseMarket].commodity_results[selectedCommodity];
      if (commodityResults) {
        const pairs = commodityResults.map((item) => item.other_market);
        setMarketPairs(pairs);
        setSelectedMarketPair((prev) => (prev && pairs.includes(prev) ? prev : pairs[0]));
      } else {
        setMarketPairs([]);
        setSelectedMarketPair('');
      }
    }
  }, [baseMarket, data, selectedCommodity]);

  useEffect(() => {
    if (
      data &&
      data[baseMarket] &&
      data[baseMarket].commodity_results &&
      data[baseMarket].commodity_results[selectedCommodity]
    ) {
      const foundData = data[baseMarket].commodity_results[selectedCommodity].find(
        (item) => item.other_market === selectedMarketPair
      );
      setSelectedData(foundData || null);
    } else {
      setSelectedData(null);
    }
  }, [data, baseMarket, selectedCommodity, selectedMarketPair]);

  const handleMarketPairChange = (event) => {
    setSelectedMarketPair(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDownload = () => {
    if (!selectedData) return;
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PriceDifferential_Results_${selectedCommodity}_${baseMarket}.json`;
    link.click();
  };

  if (status === 'loading') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading Price Differential Analysis results...
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!selectedData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>
          No price differential data available for {selectedCommodity} in the selected market pair.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Price Differential Analysis: {selectedCommodity}
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200, mt: 2 }}>
          <InputLabel id="base-market-select-label">Select Base Market</InputLabel>
          <Select
            labelId="base-market-select-label"
            value={baseMarket}
            onChange={(e) => setBaseMarket(e.target.value)}
            label="Select Base Market"
          >
            {Object.keys(data).map((market) => (
              <MenuItem key={market} value={market}>
                {market}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200, mt: 2, ml: 2 }}>
          <InputLabel id="market-pair-select-label">Select Comparison Market</InputLabel>
          <Select
            labelId="market-pair-select-label"
            value={selectedMarketPair}
            onChange={handleMarketPairChange}
            label="Select Comparison Market"
          >
            {marketPairs.map((market) => (
              <MenuItem key={market} value={market}>
                {market}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" sx={{ ml: 2, mt: 2 }} onClick={handleDownload}>
          Download Results
        </Button>
      </Box>
      <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mt: 2 }}>
        <Tab label="Price Differential Chart" />
        <Tab label="Regression Results" />
        <Tab label="Diagnostics Tests" />
        <Tab label="Market Pair Info" />
      </Tabs>
      <Box sx={{ p: 3 }}>
        {activeTab === 0 && <PriceDifferentialChart data={selectedData} />}
        {activeTab === 1 && <RegressionResults data={selectedData} />}
        {activeTab === 2 && <DiagnosticsTests data={selectedData} />}
        {activeTab === 3 && <MarketPairInfo data={selectedData} />}
      </Box>
    </Paper>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  // Removed selectedRegime prop
};

export default PriceDifferentialAnalysis;