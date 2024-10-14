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
  Tooltip as MuiTooltip,
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
import { jsonToCsv } from '../../utils/jsonToCsv';
import { useTheme } from '@mui/material/styles';

const PriceDifferentialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

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

  // Handle Download as CSV
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
        <Typography
          variant="body1"
          sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}
        >
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
          No price differential data available for <strong>{selectedCommodity}</strong> in the selected
          market pair.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: 4,
        p: { xs: 1, sm: 2 },
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          gutterBottom
          sx={{
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            fontSize: isMobile ? '1.5rem' : '2rem',
          }}
        >
          Price Differential Analysis: {selectedCommodity}
          <MuiTooltip title="Analyzes the price differences between two markets for a specific commodity.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </MuiTooltip>
        </Typography>

        {/* Improved Controls Layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* Base Market Select */}
          <FormControl
            variant="outlined"
            size="small"
            sx={{
              minWidth: 200,
              flex: isMobile ? '1 1 100%' : '0 1 auto',
            }}
            fullWidth={isMobile}
          >
            <InputLabel id="base-market-select-label">Base Market</InputLabel>
            <Select
              labelId="base-market-select-label"
              value={baseMarket}
              onChange={(e) => setBaseMarket(e.target.value)}
              label="Base Market"
              size="small"
              sx={{
                fontSize: '0.9rem',
              }}
            >
              {Object.keys(data).map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Comparison Market Select */}
          <FormControl
            variant="outlined"
            size="small"
            sx={{
              minWidth: 200,
              flex: isMobile ? '1 1 100%' : '0 1 auto',
            }}
            fullWidth={isMobile}
          >
            <InputLabel id="market-pair-select-label">Comparison Market</InputLabel>
            <Select
              labelId="market-pair-select-label"
              value={selectedMarketPair}
              onChange={handleMarketPairChange}
              label="Comparison Market"
              size="small"
              sx={{
                fontSize: '0.9rem',
              }}
            >
              {marketPairs.map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Download CSV Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsv}
            size="medium"
            sx={{
              minWidth: '140px',
              height: '36px',
              fontSize: '0.9rem',
              padding: '6px 16px',
            }}
          >
            Download CSV
          </Button>
        </Box>

        <PriceDifferentialTutorial />
      </Box>

      {/* Enhanced Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        sx={{
          mt: 2,
          flexWrap: 'nowrap',
          '& .MuiTabs-flexContainer': {
            justifyContent: 'center',
          },
        }}
        TabIndicatorProps={{
          style: {
            backgroundColor: theme.palette.primary.main,
          },
        }}
      >
        <Tab
          label="Price Differential Chart"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Regression Results"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Diagnostics"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label="Market Pair Info"
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <PriceDifferentialChart
            data={selectedData}
            isMobile={isMobile}
          />
        )}
        {activeTab === 1 && <RegressionResults data={selectedData} isMobile={isMobile} />}
        {activeTab === 2 && <DiagnosticsTable diagnostics={selectedData} isMobile={isMobile} />}
        {activeTab === 3 && <MarketPairInfo data={selectedData} isMobile={isMobile} />}
      </Box>
    </Paper>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default PriceDifferentialAnalysis;