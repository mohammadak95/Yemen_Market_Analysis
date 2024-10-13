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
  Paper,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import PriceDifferentialChart from './PriceDifferentialChart';
import RegressionResults from './RegressionResults';
import DiagnosticsTable from './DiagnosticsTable';
import MarketPairInfo from './MarketPairInfo';
import PriceDifferentialTutorial from './PriceDifferentialTutorial';
import usePriceDifferentialData from '../../hooks/usePriceDifferentialData';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../utils/jsonToCsv'; // Ensure this utility exists

const PriceDifferentialAnalysis = ({ selectedCommodity }) => {
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
        setBaseMarket((prev) =>
          prev && baseMarkets.includes(prev) ? prev : baseMarkets[0]
        );
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
        setSelectedMarketPair((prev) =>
          prev && pairs.includes(prev) ? prev : pairs[0]
        );
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
    setActiveTab(0); // Reset to first tab when market pair changes
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle Download as CSV and JSON
  const handleDownloadCsv = () => {
    if (!selectedData) {
      console.warn('No price differential data available to download.');
      return;
    }

    const dataToDownload = {
      Summary: {
        AIC: selectedData.regression_results?.aic?.toFixed(2) || 'N/A',
        BIC: selectedData.regression_results?.bic?.toFixed(2) || 'N/A',
        HQIC: selectedData.regression_results?.hqic?.toFixed(2) || 'N/A',
        Alpha: selectedData.regression_results?.alpha?.toFixed(4) || 'N/A',
        Beta: selectedData.regression_results?.beta?.toFixed(4) || 'N/A',
        Gamma: selectedData.regression_results?.gamma?.toFixed(4) || 'N/A',
      },
      Diagnostics: selectedData.diagnostics,
      PriceDifferential: selectedData.price_differential,
      RegressionResults: selectedData.regression_results,
      MarketPairInfo: selectedData.market_pair_info,
      ConflictCorrelation: selectedData.conflict_correlation,
      CommonDates: selectedData.common_dates,
      Distance: selectedData.distance,
      PValue: selectedData.p_value,
    };

    const csv = jsonToCsv([dataToDownload]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_PriceDifferential_Analysis.csv`);
  };

  const handleDownloadJson = () => {
    if (!selectedData) {
      console.warn('No price differential data available to download.');
      return;
    }

    const dataToDownload = {
      Summary: {
        AIC: selectedData.regression_results?.aic || 'N/A',
        BIC: selectedData.regression_results?.bic || 'N/A',
        HQIC: selectedData.regression_results?.hqic || 'N/A',
        Alpha: selectedData.regression_results?.alpha || 'N/A',
        Beta: selectedData.regression_results?.beta || 'N/A',
        Gamma: selectedData.regression_results?.gamma || 'N/A',
      },
      Diagnostics: selectedData.diagnostics,
      PriceDifferential: selectedData.price_differential,
      RegressionResults: selectedData.regression_results,
      MarketPairInfo: selectedData.market_pair_info,
      ConflictCorrelation: selectedData.conflict_correlation,
      CommonDates: selectedData.common_dates,
      Distance: selectedData.distance,
      PValue: selectedData.p_value,
    };

    const jsonString = JSON.stringify(dataToDownload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, `${selectedCommodity}_PriceDifferential_Analysis.json`);
  };

  // Loading State
  if (status === 'loading') {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        minHeight="200px"
        mt={4}
      >
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 2, fontSize: '1.2rem' }}>
          Loading Price Differential Analysis results...
        </Typography>
      </Box>
    );
  }

  // Error State
  if (status === 'failed') {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  // No Data State
  if (!selectedData) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No price differential data available for {selectedCommodity} in the selected
          market pair.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4, p: { xs: 1, sm: 2 } }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Price Differential Analysis: {selectedCommodity}
          <Tooltip title="Analyzes the price differences between two markets for a specific commodity.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200, mr: 2 }}>
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
          <FormControl
            variant="outlined"
            size="small"
            sx={{ minWidth: 200, mr: 2, mt: { xs: 2, sm: 0 } }}
          >
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
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            sx={{ mt: { xs: 2, sm: 0 } }}
            onClick={handleDownloadJson}
          >
            Download JSON
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DownloadIcon />}
            sx={{ ml: 2, mt: { xs: 2, sm: 0 } }}
            onClick={handleDownloadCsv}
          >
            Download CSV
          </Button>
        </Box>
        <PriceDifferentialTutorial />
      </Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mt: 2 }}
      >
        <Tab label="Price Differential Chart" />
        <Tab label="Regression Results" />
        <Tab label="Diagnostics" />
        <Tab label="Market Pair Info" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && <PriceDifferentialChart data={selectedData} />}
        {activeTab === 1 && <RegressionResults data={selectedData} />}
        {activeTab === 2 && <DiagnosticsTable diagnostics={selectedData} />}
        {activeTab === 3 && <MarketPairInfo data={selectedData} />}
      </Box>
    </Paper>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
};

export default PriceDifferentialAnalysis;