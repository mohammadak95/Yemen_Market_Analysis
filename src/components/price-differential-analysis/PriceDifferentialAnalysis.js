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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PriceDifferentialChart from './PriceDifferentialChart';
import RegressionResults from './RegressionResults';
import DiagnosticsTable from './DiagnosticsTable';
import MarketPairInfo from './MarketPairInfo';
import PriceDifferentialTutorial from './PriceDifferentialTutorial';
import KeyInsights from './KeyInsights';
import usePriceDifferentialData from '../../hooks/usePriceDifferentialData';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../utils/jsonToCsv';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const PriceDifferentialAnalysis = ({ selectedCommodity }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data, markets, status, error } = usePriceDifferentialData();
  const [baseMarket, setBaseMarket] = useState('');
  const [marketPairs, setMarketPairs] = useState([]);
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    if (data && markets.length > 0) {
      setBaseMarket(markets[0]);
    }
  }, [data, markets]);

  useEffect(() => {
    if (data && baseMarket) {
      const commodityResults = data[baseMarket]?.commodity_results[selectedCommodity];
      if (commodityResults) {
        const pairs = commodityResults.map((item) => item.other_market);
        setMarketPairs(pairs);
        if (!pairs.includes(selectedMarketPair)) {
          setSelectedMarketPair(pairs[0]);
        }
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

  const handleBaseMarketChange = (event) => {
    setBaseMarket(event.target.value);
    setActiveTab(0);
  };

  const handleMarketPairChange = (event) => {
    setSelectedMarketPair(event.target.value);
    setActiveTab(0);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDownloadCsv = () => {
    if (!selectedData) {
      console.warn('No price differential data available to download.');
      return;
    }

    const dataToDownload = {
      Summary: {
        AIC: selectedData.regression_results?.aic?.toFixed(2) || 'N/A',
        BIC: selectedData.regression_results?.bic?.toFixed(2) || 'N/A',
        Intercept: selectedData.regression_results?.intercept?.toFixed(4) || 'N/A',
        Slope: selectedData.regression_results?.slope?.toFixed(4) || 'N/A',
        'R-squared': selectedData.regression_results?.r_squared?.toFixed(4) || 'N/A',
        'P-Value': selectedData.regression_results?.p_value?.toFixed(4) || 'N/A',
      },
      Diagnostics: selectedData.diagnostics,
      PriceDifferential: selectedData.price_differential,
      RegressionResults: selectedData.regression_results,
      MarketPairInfo: {
        base_market: selectedData.base_market,
        other_market: selectedData.other_market,
        commodity: selectedData.commodity,
      },
    };

    const csv = jsonToCsv([dataToDownload]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(
      blob,
      `${selectedCommodity}_PriceDifferential_${selectedData.base_market}_vs_${selectedData.other_market}.csv`
    );
  };

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

  if (status === 'failed') {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

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
          <MuiTooltip title="Analyzes the price differences between two markets for a specific commodity over time.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </MuiTooltip>
        </Typography>

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
              onChange={handleBaseMarketChange}
              label="Base Market"
              size="small"
              sx={{
                fontSize: '0.9rem',
              }}
            >
              {markets.map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

      <KeyInsights data={selectedData} />

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
          label={
            <MuiTooltip title="Visual representation of the price differential over time.">
              <span>Price Differential Chart</span>
            </MuiTooltip>
          }
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label={
            <MuiTooltip title="Statistical analysis of the price differential trend.">
              <span>Regression Results</span>
            </MuiTooltip>
          }
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label={
            <MuiTooltip title="Statistical tests to validate the analysis.">
              <span>Diagnostics</span>
            </MuiTooltip>
          }
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
        <Tab
          label={
            <MuiTooltip title="Information about the selected markets and commodity.">
              <span>Market Pair Info</span>
            </MuiTooltip>
          }
          sx={{
            minWidth: isMobile ? 'auto' : 150,
            fontSize: isMobile ? '0.8rem' : '1rem',
            textTransform: 'none',
          }}
        />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <PriceDifferentialChart data={selectedData} isMobile={isMobile} />
        )}
        {activeTab === 1 && <RegressionResults data={selectedData} isMobile={isMobile} />}
        {activeTab === 2 && <DiagnosticsTable data={selectedData} isMobile={isMobile} />}
        {activeTab === 3 && <MarketPairInfo data={selectedData} isMobile={isMobile} />}
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
            This analysis helps you understand the price differences between two markets for a specific commodity. Key points to consider:
            <ul>
              <li>
                The <strong>Price Differential Chart</strong> visualizes the log price differences over time. Positive values indicate higher prices in the base market, while negative values indicate lower prices.
              </li>
              <li>
                The <strong>Regression Results</strong> show the trend in price differentials. A positive slope indicates widening price gaps over time, while a negative slope suggests convergence.
              </li>
              <li>
                The <strong>Diagnostics</strong> tab provides insights into the statistical properties of the price differential series and the relationship between markets.
              </li>
              <li>
                The <strong>Market Pair Info</strong> gives context about the selected markets, including their distance and the number of common dates analyzed.
              </li>
              <li>
                <strong>Seasonal Adjustment:</strong> The data has been seasonally adjusted to remove cyclical patterns, allowing for a clearer view of the underlying trends.
              </li>
              <li>
                <strong>Smoothing:</strong> A 3-month centered moving average has been applied to reduce short-term fluctuations and highlight longer-term trends.
              </li>
              <li>
                <strong>Stationarity:</strong> The ADF test result indicates whether the price differential series is stable over time. A stationary series suggests that price differences tend to revert to a mean.
              </li>
              <li>
                <strong>Conflict Correlation:</strong> This measure shows how conflict intensities in the two markets are related, which may help explain price differential patterns.
              </li>
            </ul>
            When interpreting results, consider factors such as transportation costs, local supply and demand conditions, and conflict dynamics that might influence price differentials between markets.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

PriceDifferentialAnalysis.propTypes = {
selectedCommodity: PropTypes.string.isRequired,
};

export default PriceDifferentialAnalysis;