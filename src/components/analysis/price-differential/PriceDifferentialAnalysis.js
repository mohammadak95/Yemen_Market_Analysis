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
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { usePriceDifferentialData } from '@/hooks';;

import PriceDifferentialChart from './PriceDifferentialChart';
import EnhancedRegressionResults from './EnhancedRegressionResults';
import CointegrationAnalysis from './CointegrationAnalysis';
import StationarityTest from './StationarityTest';
import DiagnosticsTable from './DiagnosticsTable';
import MarketPairInfo from './MarketPairInfo';
import DynamicInterpretation from './DynamicInterpretation';
import PriceDifferentialTutorial from './PriceDifferentialTutorial';

const PriceDifferentialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const [baseMarket, setBaseMarket] = useState('');
  const [marketPairs, setMarketPairs] = useState([]);
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [selectedData, setSelectedData] = useState(null);

  const { data, markets, commodities, status, error } = usePriceDifferentialData(selectedCommodity);

  // Set the initial base market when data or markets change
  useEffect(() => {
    if (data && markets.length > 0) {
      setBaseMarket((prevBaseMarket) => (markets.includes(prevBaseMarket) ? prevBaseMarket : markets[0]));
    }
  }, [data, markets]);

  // Update market pairs when base market, data, or selected commodity changes
  useEffect(() => {
    if (data && baseMarket) {
      const commodityResults = data[baseMarket]?.commodity_results[selectedCommodity];
      if (commodityResults) {
        const pairs = commodityResults.map((item) => item.other_market);
        setMarketPairs(pairs);
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
      baseMarket &&
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
  };

  const handleMarketPairChange = (event) => {
    setSelectedMarketPair(event.target.value);
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
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{
              fontWeight: 'bold',
              fontSize: isMobile ? '1.5rem' : '2rem',
            }}
          >
            Price Differential Analysis
            <Tooltip title="Price Differential Analysis Information">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          {/* Tutorial Button */}
          <PriceDifferentialTutorial />
        </Box>

        {/* Market Selection Controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            mb: 3,
            flexWrap: 'wrap',
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
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Main Content - Vertical Layout */}
      <Box sx={{ width: '100%' }}>
        {/* Price Differential Chart */}
        {selectedData && selectedData.price_differential ? (
          <PriceDifferentialChart
            data={selectedData.price_differential}
            baseMarket={baseMarket}
            comparisonMarket={selectedMarketPair}
            commodity={selectedCommodity}
            isMobile={isMobile}
          />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No price differential data available for the selected market pair.
          </Alert>
        )}

        {/* Dynamic Interpretation */}
        {selectedData ? (
          <DynamicInterpretation data={selectedData} />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No interpretation available for the selected data.
          </Alert>
        )}

        {/* Regression Results */}
        {selectedData && selectedData.regression_results ? (
          <EnhancedRegressionResults regressionData={selectedData.regression_results} />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No regression results available.
          </Alert>
        )}

        {/* Cointegration Analysis */}
        {selectedData && selectedData.cointegration_test ? (
          <CointegrationAnalysis cointegrationData={selectedData.cointegration_test} />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No cointegration analysis available.
          </Alert>
        )}

        {/* Stationarity Test */}
        {selectedData && selectedData.stationarity_test ? (
          <StationarityTest stationarityData={selectedData.stationarity_test} />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No stationarity test results available.
          </Alert>
        )}

        {/* Diagnostics Table */}
        {selectedData && selectedData.diagnostics ? (
          <DiagnosticsTable data={selectedData.diagnostics} isMobile={isMobile} />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No diagnostics data available.
          </Alert>
        )}

        {/* Market Pair Information */}
        {selectedData && selectedData.diagnostics ? (
          <MarketPairInfo
            data={selectedData.diagnostics}
            baseMarket={baseMarket}
            comparisonMarket={selectedMarketPair}
            isMobile={isMobile}
          />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No market pair information available.
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default PriceDifferentialAnalysis;
