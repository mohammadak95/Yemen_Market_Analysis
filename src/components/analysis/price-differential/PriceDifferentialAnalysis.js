// src/components/analysis/price-differential/PriceDifferentialAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
} from '@mui/material';
import { usePriceDifferentialData, useTechnicalHelp } from '../../../hooks';
import AnalysisContainer from '../../common/AnalysisContainer';
import ChartContainer from '../../common/ChartContainer';
import { analysisStyles } from '../../../styles/analysisStyles';

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
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // State management
  const [baseMarket, setBaseMarket] = useState('');
  const [marketPairs, setMarketPairs] = useState([]);
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [selectedData, setSelectedData] = useState(null);

  // Custom hooks
  const { data, markets, commodities, status, error } = usePriceDifferentialData(selectedCommodity);
  const { getTechnicalTooltip } = useTechnicalHelp('priceDifferential');

  // Effects for data management
  useEffect(() => {
    if (data && markets.length > 0) {
      setBaseMarket((prevBaseMarket) => (markets.includes(prevBaseMarket) ? prevBaseMarket : markets[0]));
    }
  }, [data, markets]);

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

  // Handlers
  const handleBaseMarketChange = (event) => {
    setBaseMarket(event.target.value);
  };

  const handleMarketPairChange = (event) => {
    setSelectedMarketPair(event.target.value);
  };

  // Market selection controls component
  const analysisControls = (
    <Box sx={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 2,
      width: '100%',
    }}>
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
      <PriceDifferentialTutorial />
    </Box>
  );

  return (
    <AnalysisContainer
      title={`Price Differential Analysis: ${selectedCommodity}`}
      infoTooltip={getTechnicalTooltip('main')}
      loading={status === 'loading'}
      error={error}
      controls={analysisControls}
      hasData={!!selectedData}
      selectedCommodity={selectedCommodity}
    >
      {/* Price Differential Chart */}
      {selectedData && selectedData.price_differential ? (
        <ChartContainer>
          <PriceDifferentialChart
            data={selectedData.price_differential}
            baseMarket={baseMarket}
            comparisonMarket={selectedMarketPair}
            commodity={selectedCommodity}
            isMobile={isMobile}
          />
        </ChartContainer>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No price differential data available for the selected market pair.
        </Alert>
      )}

      {/* Dynamic Interpretation */}
      {selectedData && (
        <Box sx={styles.interpretationCard}>
          <DynamicInterpretation data={selectedData} />
        </Box>
      )}

      {/* Regression Results */}
      {selectedData && selectedData.regression_results && (
        <ChartContainer>
          <EnhancedRegressionResults regressionData={selectedData.regression_results} />
        </ChartContainer>
      )}

      {/* Cointegration Analysis */}
      {selectedData && selectedData.cointegration_test && (
        <ChartContainer>
          <CointegrationAnalysis cointegrationData={selectedData.cointegration_test} />
        </ChartContainer>
      )}

      {/* Stationarity Test */}
      {selectedData && selectedData.stationarity_test && (
        <ChartContainer>
          <StationarityTest stationarityData={selectedData.stationarity_test} />
        </ChartContainer>
      )}

      {/* Diagnostics Table */}
      {selectedData && selectedData.diagnostics && (
        <ChartContainer>
          <DiagnosticsTable data={selectedData.diagnostics} isMobile={isMobile} />
        </ChartContainer>
      )}

      {/* Market Pair Information */}
      {selectedData && selectedData.diagnostics && (
        <ChartContainer>
          <MarketPairInfo
            data={selectedData.diagnostics}
            baseMarket={baseMarket}
            comparisonMarket={selectedMarketPair}
            isMobile={isMobile}
          />
        </ChartContainer>
      )}
    </AnalysisContainer>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default PriceDifferentialAnalysis;
