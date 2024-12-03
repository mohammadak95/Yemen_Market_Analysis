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
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Grid,
  Button,
  Stack,
} from '@mui/material';
import { ExpandMore, Info, Download } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { usePriceDifferentialData } from '../../../hooks';
import AnalysisContainer from '../../common/AnalysisContainer';
import { analysisStyles } from '../../../styles/analysisStyles';

import PriceDifferentialChart from './PriceDifferentialChart';
import EnhancedRegressionResults from './EnhancedRegressionResults';
import CointegrationAnalysis from './CointegrationAnalysis';
import StationarityTest from './StationarityTest';
import DiagnosticsTable from './DiagnosticsTable';
import MarketPairInfo from './MarketPairInfo';
import DynamicInterpretation from './DynamicInterpretation';
import PriceDifferentialTutorial from './PriceDifferentialTutorial';
import InterpretationSection from './InterpretationSection';

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
    contentSection: {
      p: 3,
      height: '100%',
      '& > :first-of-type': { mt: 0 },
    },
    chartPaper: {
      p: 3,
      height: 'auto',
      minHeight: 500,
      display: 'flex',
      flexDirection: 'column',
    },
    chartContainer: {
      flex: 1,
      minHeight: 400,
      mt: 3,
      '& .recharts-wrapper': {
        margin: '0 auto',
      },
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      mb: 2,
      '& .MuiIconButton-root': {
        ml: 1,
      },
    },
    equation: {
      p: 3,
      '& .katex': { fontSize: '1.3em' },
    },
    accordionDetails: {
      p: 3,
      bgcolor: theme.palette.background.default,
    },
    footer: {
      mt: 2,
      pt: 2,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  };

  // State management
  const [baseMarket, setBaseMarket] = useState('');
  const [marketPairs, setMarketPairs] = useState([]);
  const [selectedMarketPair, setSelectedMarketPair] = useState('');
  const [selectedData, setSelectedData] = useState(null);
  const [equationExpanded, setEquationExpanded] = useState(false);
  const [interpretationExpanded, setInterpretationExpanded] = useState(false);

  // Custom hooks
  const { data, markets, status, error } = usePriceDifferentialData(selectedCommodity);

  // Effects
  useEffect(() => {
    if (data && markets.length > 0) {
      setBaseMarket(prevBaseMarket => markets.includes(prevBaseMarket) ? prevBaseMarket : markets[0]);
    }
  }, [data, markets]);

  useEffect(() => {
    if (data && baseMarket) {
      const commodityResults = data[baseMarket]?.commodity_results[selectedCommodity];
      if (commodityResults) {
        const pairs = commodityResults.map(item => item.other_market);
        setMarketPairs(pairs);
        setSelectedMarketPair(prevPair => pairs.includes(prevPair) ? prevPair : pairs[0]);
      } else {
        setMarketPairs([]);
        setSelectedMarketPair('');
      }
    }
  }, [baseMarket, data, selectedCommodity]);

  useEffect(() => {
    if (data?.[baseMarket]?.commodity_results?.[selectedCommodity]) {
      const foundData = data[baseMarket].commodity_results[selectedCommodity]
        .find(item => item.other_market === selectedMarketPair);
      setSelectedData(foundData || null);
    } else {
      setSelectedData(null);
    }
  }, [data, baseMarket, selectedCommodity, selectedMarketPair]);

  const handleDownloadData = () => {
    if (!selectedData) return;
    try {
      const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
      saveAs(blob, `price_differential_${baseMarket}_${selectedMarketPair}_${selectedCommodity}.json`);
    } catch (error) {
      console.error('Failed to download data:', error);
    }
  };

  const MarketControls = () => (
    <Paper sx={styles.controls}>
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={2}
        alignItems={isMobile ? 'stretch' : 'center'}
        width="100%"
      >
        <FormControl size="small" sx={styles.formControl}>
          <InputLabel>Base Market</InputLabel>
          <Select
            value={baseMarket}
            onChange={(e) => setBaseMarket(e.target.value)}
            label="Base Market"
          >
            {markets.map((market) => (
              <MenuItem key={market} value={market}>{market}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={styles.formControl}>
          <InputLabel>Comparison Market</InputLabel>
          <Select
            value={selectedMarketPair}
            onChange={(e) => setSelectedMarketPair(e.target.value)}
            label="Comparison Market"
          >
            {marketPairs.map((market) => (
              <MenuItem key={market} value={market}>{market}</MenuItem>
            ))}
          </Select>
        </FormControl>

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
  );

  const ModelEquation = () => (
    <Accordion expanded={equationExpanded} onChange={() => setEquationExpanded(!equationExpanded)}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={styles.sectionHeader}>
          <Typography variant="h6">Price Differential Model Equation</Typography>
          <Tooltip title="Mathematical formulation of the price differential model">
            <IconButton size="small">
              <Info fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={styles.accordionDetails}>
        {/* Your equation content */}
      </AccordionDetails>
    </Accordion>
  );

  return (
    <AnalysisContainer
      title={`Price Differential Analysis: ${selectedCommodity}`}
      infoTooltip="Analysis of price differences between markets"
      loading={status === 'loading'}
      error={error}
      controls={<MarketControls />}
      hasData={!!selectedData}
      selectedCommodity={selectedCommodity}
    >
      <Stack spacing={3}>
        <ModelEquation />

        {/* Chart Section */}
        <Paper sx={styles.chartPaper}>
          <Box sx={styles.sectionHeader}>
            <Typography variant="h6">Price Differential Chart</Typography>
            <Tooltip title="Visualization of price differences over time">
              <IconButton size="small">
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          {selectedData?.price_differential ? (
            <Box sx={styles.chartContainer}>
              <PriceDifferentialChart
                data={selectedData.price_differential}
                baseMarket={baseMarket}
                comparisonMarket={selectedMarketPair}
                commodity={selectedCommodity}
                isMobile={isMobile}
              />
            </Box>
          ) : (
            <Alert severity="info">No price differential data available.</Alert>
          )}
        </Paper>

        {/* Analysis Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={styles.contentSection}>
              <MarketPairInfo
                data={selectedData?.diagnostics}
                baseMarket={baseMarket}
                comparisonMarket={selectedMarketPair}
                isMobile={isMobile}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={styles.contentSection}>
              <EnhancedRegressionResults 
                regressionData={selectedData?.regression_results}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={styles.contentSection}>
              <CointegrationAnalysis 
                cointegrationData={selectedData?.cointegration_test}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={styles.contentSection}>
              <StationarityTest 
                stationarityData={selectedData?.stationarity_test}
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={styles.contentSection}>
              <DiagnosticsTable 
                data={selectedData?.diagnostics}
                isMobile={isMobile}
              />
            </Paper>
          </Grid>
        </Grid>

        {/* Interpretation Section */}
        <Accordion
          expanded={interpretationExpanded}
          onChange={() => setInterpretationExpanded(!interpretationExpanded)}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={styles.sectionHeader}>
              <Typography variant="h6">Analysis Interpretation</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={styles.accordionDetails}>
            <InterpretationSection
              data={selectedData}
              baseMarket={baseMarket}
              comparisonMarket={selectedMarketPair}
            />
          </AccordionDetails>
        </Accordion>
      </Stack>
    </AnalysisContainer>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default React.memo(PriceDifferentialAnalysis);