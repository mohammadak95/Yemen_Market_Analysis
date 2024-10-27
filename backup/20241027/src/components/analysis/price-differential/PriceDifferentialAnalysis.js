// src/components/analysis/price-differential/PriceDifferentialAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import usePriceDifferentialData from '../../../hooks/usePriceDifferentialData';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

import PriceDifferentialChart from './PriceDifferentialChart';
import DiagnosticsTable from './DiagnosticsTable';
import MarketPairInfo from './MarketPairInfo';
import RegressionResults from './RegressionResults'; // Ensure this component is properly implemented

const PriceDifferentialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const [baseMarket, setBaseMarket] = useState('');
  const [marketPairs, setMarketPairs] = useState([]);
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedData, setSelectedData] = useState(null);

  const { data, markets, status, error } = usePriceDifferentialData();
  const { getTechnicalEquation } = useTechnicalHelp('priceDiff');

  const mainEquation = getTechnicalEquation('main');

  // Set the initial base market when data or markets change
  useEffect(() => {
    if (data && markets.length > 0) {
      setBaseMarket(markets[0]);
    }
  }, [data, markets]);

  // Update market pairs when base market, data, or selected commodity changes
  useEffect(() => {
    if (data && baseMarket) {
      const commodityResults = data[baseMarket]?.commodity_results[selectedCommodity];
      if (commodityResults) {
        const pairs = commodityResults.map((item) => item.other_market);
        setMarketPairs(pairs);
        // Only update selectedMarketPair if it's not in the new pairs
        setSelectedMarketPair((prevPair) => (pairs.includes(prevPair) ? prevPair : pairs[0]));
      } else {
        setMarketPairs([]);
        setSelectedMarketPair('');
      }
    }
  }, [baseMarket, data, selectedCommodity]);

  // Update selected data when relevant parameters change
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

      if (foundData) {
        // Ensure diagnostics, price_differential, and regression_results exist
        const diagnostics = foundData.diagnostics || null;
        const priceDifferential = foundData.price_differential || null;
        const regressionResults = foundData.regression_results || null;

        setSelectedData({
          ...foundData,
          diagnostics,
          price_differential: priceDifferential,
          regression_results: regressionResults,
        });
      } else {
        setSelectedData(null);
      }
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

  if (status === 'loading') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px" mt={4}>
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}>
          Loading Price Differential Analysis results...
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: { xs: 2, sm: 4 },
        p: { xs: 1, sm: 2 },
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{
              fontWeight: 'bold',
              fontSize: isMobile ? '1.5rem' : '2rem',
            }}
            component="div" // Ensure it's not rendered as <p>
          >
            Price Differential Analysis
            {mainEquation && (
              <Tooltip title={mainEquation.description}>
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Typography>
          {/* Placeholder for additional buttons or links if needed */}
        </Box>

        {/* Market Selection Controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            mb: 3,
          }}
        >
          <FormControl
            variant="outlined"
            size="small"
            fullWidth={isMobile}
            sx={{ minWidth: 200 }}
          >
            <InputLabel id="base-market-label">Base Market</InputLabel>
            <Select
              labelId="base-market-label"
              value={baseMarket}
              onChange={handleBaseMarketChange}
              label="Base Market"
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
            fullWidth={isMobile}
            sx={{ minWidth: 200 }}
          >
            <InputLabel id="comparison-market-label">Comparison Market</InputLabel>
            <Select
              labelId="comparison-market-label"
              value={selectedMarketPair}
              onChange={handleMarketPairChange}
              label="Comparison Market"
            >
              {marketPairs.map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Main Equation */}
        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          {mainEquation ? (
            <Typography variant="body1" component="div">
              <strong>Main Equation:</strong> {mainEquation.description}
            </Typography>
          ) : (
            <Alert severity="warning">
              <AlertTitle>Equation Unavailable</AlertTitle>
              The main equation for the Price Differential Model is currently unavailable.
            </Alert>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Main Content Tabs */}
      <Box sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="price differential analysis tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Price Differential Chart" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Diagnostics" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Market Pair Info" id="tab-2" aria-controls="tabpanel-2" />
          <Tab label="Regression Results" id="tab-3" aria-controls="tabpanel-3" />
        </Tabs>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          {selectedData && selectedData.price_differential ? (
            <PriceDifferentialChart
              data={selectedData.price_differential}
              baseMarket={baseMarket}
              comparisonMarket={selectedMarketPair}
              commodity={selectedCommodity}
              isMobile={isMobile}
            />
          ) : (
            <Alert severity="info">
              No price differential data available for the selected market pair.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {selectedData && selectedData.diagnostics ? (
            <DiagnosticsTable
              data={selectedData.diagnostics}
              isMobile={isMobile}
            />
          ) : (
            <Alert severity="info">
              No diagnostic data available for the selected market pair.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {selectedData && selectedData.diagnostics ? (
            <MarketPairInfo
              data={selectedData.diagnostics}
              baseMarket={baseMarket}
              comparisonMarket={selectedMarketPair}
              isMobile={isMobile}
            />
          ) : (
            <Alert severity="info">
              No market pair information available for the selected market pair.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {selectedData && selectedData.regression_results ? (
            <RegressionResults
              data={selectedData.regression_results}
              isMobile={isMobile}
            />
          ) : (
            <Alert severity="info">
              No regression results available for this market pair.
            </Alert>
          )}
        </TabPanel>
      </Box>

      {/* Interpretation Guide */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" component="div" sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
            This analysis helps you understand the price differences between two markets:
            <Box component="ul" sx={{ mt: 1 }}>
              <li>
                The <strong>Price Differential Chart</strong> shows the price differences over time.
                Positive values indicate higher prices in the base market, while negative values indicate
                lower prices.
              </li>
              <li>
                The <strong>Diagnostics</strong> tab provides information on market diagnostics,
                including conflict correlation and distance metrics.
              </li>
              <li>
                The <strong>Market Pair Info</strong> provides context about the selected markets, including
                conflict correlation and distance.
              </li>
              <li>
                The <strong>Regression Results</strong> tab displays statistical measures of the regression analysis,
                such as R-squared, p-values, and slope coefficients.
              </li>
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Key Considerations:
            </Typography>
            <Box component="ul">
              <li>Conflict impact on market integration</li>
              <li>Geographical distance between markets</li>
              <li>Data coverage and common trading days</li>
              <li>Statistical significance of regression results</li>
            </Box>
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* No Data Alert */}
      {!selectedData && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>No Data Available</AlertTitle>
          No price differential data available for {selectedCommodity} between the selected markets.
          This could be due to:
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Insufficient price observations</li>
            <li>Missing market data</li>
            <li>Non-overlapping time periods</li>
          </Box>
        </Alert>
      )}
    </Paper>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`tabpanel-${index}`}
    aria-labelledby={`tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

export default PriceDifferentialAnalysis;