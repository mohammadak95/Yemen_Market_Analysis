// src/components/analysis/price-differential/PriceDifferentialAnalysis.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
  Paper,
  Typography,
  Stack,
  Button,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { usePriceDifferentialData } from '../../../hooks/dataHooks'; // Ensure correct import path
import AnalysisContainer from '../../common/AnalysisContainer';

import PriceDifferentialChart from './PriceDifferentialChart';
import EnhancedRegressionResults from './EnhancedRegressionResults';
import CointegrationAnalysis from './CointegrationAnalysis';
import StationarityTest from './StationarityTest';
import DiagnosticsTable from './DiagnosticsTable';
import MarketPairInfo from './MarketPairInfo';
import PriceDifferentialTutorial from './PriceDifferentialTutorial';
import InterpretationSection from './InterpretationSection';
import PriceDifferentialFramework from './PriceDifferentialFramework';

const PriceDifferentialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const styles = {
    container: {
      width: '100%',
    },
    controls: {
      p: 3,
      mb: 3,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 2,
    },
    formControl: {
      minWidth: isMobile ? '100%' : 200,
      flexShrink: 0,
    },
  };

  // State management
  const [baseMarket, setBaseMarket] = useState('');
  const [otherMarket, setOtherMarket] = useState('');
  const [selectedData, setSelectedData] = useState(null);

  // Custom hooks
  const { data, markets, commodities, status, error } = usePriceDifferentialData(selectedCommodity);

  // Effects to set initial markets
  useEffect(() => {
    if (markets.length > 0) {
      setBaseMarket((prev) => (markets.includes(prev) ? prev : markets[0]));
    }
  }, [markets]);

  useEffect(() => {
    if (baseMarket && data.length > 0) {
      const availableMarkets = data
        .filter((item) => item.base_market === baseMarket)
        .map((item) => item.other_market);

      setOtherMarket((prev) => (availableMarkets.includes(prev) ? prev : availableMarkets[0]));
    }
  }, [baseMarket, data]);

  useEffect(() => {
    if (baseMarket && otherMarket && data.length > 0) {
      const marketPairData = data.find(
        (item) => item.base_market === baseMarket && item.other_market === otherMarket
      );
      setSelectedData(marketPairData || null);
    } else {
      setSelectedData(null);
    }
  }, [data, baseMarket, otherMarket]);

  // Memoized data validation to handle new data structure
  const validatedData = useMemo(() => {
    if (!selectedData) return null;

    return {
      price_differential: selectedData.price_differential || selectedData.price_differential_series,
      regression_results: selectedData.regression_results,
      cointegration_results: selectedData.cointegration_results || selectedData.cointegration_test,
      stationarity_results: selectedData.stationarity_results || selectedData.stationarity_test,
      diagnostics: selectedData.diagnostics,
    };
  }, [selectedData]);

  const handleDownloadData = useCallback(() => {
    if (!selectedData) return;
    try {
      const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
      saveAs(blob, `price_differential_${baseMarket}_${otherMarket}_${selectedCommodity}.json`);
    } catch (downloadError) {
      console.error('Failed to download data:', downloadError);
    }
  }, [selectedData, baseMarket, otherMarket, selectedCommodity]);

  if (status === 'loading') {
    return <Alert severity="info">Loading data...</Alert>;
  }

  if (status === 'failed') {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  if (!selectedData) {
    return <Alert severity="info">No data available for the selected market pair.</Alert>;
  }

  return (
    <Box sx={styles.container}>
      <Paper sx={styles.controls}>
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={2}
          alignItems={isMobile ? 'stretch' : 'center'}
          width="100%"
        >
          {/* Base Market Selector */}
          <FormControl size="small" sx={styles.formControl}>
            <InputLabel>Base Market</InputLabel>
            <Select
              value={baseMarket}
              onChange={(e) => setBaseMarket(e.target.value)}
              label="Base Market"
            >
              {markets.map((market) => (
                <MenuItem key={market} value={market}>
                  {market}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Comparison Market Selector */}
          <FormControl size="small" sx={styles.formControl}>
            <InputLabel>Comparison Market</InputLabel>
            <Select
              value={otherMarket}
              onChange={(e) => setOtherMarket(e.target.value)}
              label="Comparison Market"
            >
              {data
                .filter((item) => item.base_market === baseMarket)
                .map((item) => (
                  <MenuItem key={item.other_market} value={item.other_market}>
                    {item.other_market}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={2}
            sx={{ flexGrow: isMobile ? 0 : 1, justifyContent: 'flex-end' }}
          >
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadData}
              disabled={!selectedData}
              fullWidth={isMobile}
            >
              Download Results
            </Button>
            <PriceDifferentialTutorial />
          </Stack>
        </Stack>
      </Paper>

      {/* Analysis Components */}
      <AnalysisContainer>
        <MarketPairInfo
          data={validatedData.diagnostics}
          baseMarket={baseMarket}
          comparisonMarket={otherMarket}
          isMobile={isMobile}
        />

        {/* Price Differential Framework */}
        <PriceDifferentialFramework
          baseMarket={baseMarket}
          comparisonMarket={otherMarket}
          regressionResults={validatedData.regression_results}
          diagnostics={validatedData.diagnostics}
        />

        <PriceDifferentialChart
          data={validatedData.price_differential}
          baseMarket={baseMarket}
          comparisonMarket={otherMarket}
          commodity={selectedCommodity}
          isMobile={isMobile}
        />

        <StationarityTest stationarityData={validatedData.stationarity_results} />

        <CointegrationAnalysis cointegrationData={validatedData.cointegration_results} />

        <EnhancedRegressionResults regressionData={validatedData.regression_results} />

        <DiagnosticsTable diagnosticsData={validatedData.diagnostics} isMobile={isMobile} />

        <InterpretationSection
          data={validatedData}
          baseMarket={baseMarket}
          comparisonMarket={otherMarket}
        />
      </AnalysisContainer>
    </Box>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default PriceDifferentialAnalysis;
