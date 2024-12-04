// src/components/analysis/price-differential/PriceDifferentialAnalysis.js

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  useTheme,
  CircularProgress,
  Alert,
  Typography,
  Snackbar,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { Download, ExpandMore, Info } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { usePriceDifferentialData } from '../../../hooks/dataHooks';

import PriceDifferentialChart from './PriceDifferentialChart';
import MarketPairInfo from './MarketPairInfo';
import CointegrationAnalysis from './CointegrationAnalysis';
import StationarityTest from './StationarityTest';
import PriceDifferentialFramework from './PriceDifferentialFramework';
import InterpretationSection from './InterpretationSection';

const PriceDifferentialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  
  const [baseMarket, setBaseMarket] = useState('');
  const [otherMarket, setOtherMarket] = useState('');
  const [frameworkExpanded, setFrameworkExpanded] = useState(false);
  const [interpretationExpanded, setInterpretationExpanded] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const {
    data,
    markets,
    error,
    isLoading
  } = usePriceDifferentialData(selectedCommodity);

  // Set initial base market
  useEffect(() => {
    if (markets.length > 0) {
      setBaseMarket((prev) => (markets.includes(prev) ? prev : markets[0]));
    }
  }, [markets]);

  // Filter available comparison markets based on base market
  const availableComparisonMarkets = useMemo(() => {
    if (!baseMarket || !data.length) return [];
    return data
      .filter(item => item.base_market === baseMarket)
      .map(item => item.other_market);
  }, [baseMarket, data]);

  // Update comparison market when base market changes
  useEffect(() => {
    if (baseMarket && availableComparisonMarkets.length > 0) {
      setOtherMarket((prev) => 
        availableComparisonMarkets.includes(prev) ? prev : availableComparisonMarkets[0]
      );
    } else {
      setOtherMarket('');
    }
  }, [baseMarket, availableComparisonMarkets]);

  const selectedPairData = useMemo(() => {
    if (!baseMarket || !otherMarket || !data.length) return null;
    return data.find(d => 
      d.base_market === baseMarket && 
      d.other_market === otherMarket
    );
  }, [data, baseMarket, otherMarket]);

  const handleBaseMarketChange = useCallback((event) => {
    setBaseMarket(event.target.value);
  }, []);

  const handleComparisonMarketChange = useCallback((event) => {
    setOtherMarket(event.target.value);
  }, []);

  const handleDownloadData = useCallback(() => {
    if (!selectedPairData) return;
    try {
      const blob = new Blob(
        [JSON.stringify(selectedPairData, null, 2)],
        { type: 'application/json' }
      );
      saveAs(blob, `price_differential_${baseMarket}_${otherMarket}_${selectedCommodity}.json`);
      setSnackbar({
        open: true,
        message: 'Data downloaded successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to download data',
        severity: 'error'
      });
    }
  }, [selectedPairData, baseMarket, otherMarket, selectedCommodity]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="subtitle1" gutterBottom>Error Loading Data</Typography>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Base Market</InputLabel>
              <Select
                value={baseMarket}
                onChange={handleBaseMarketChange}
                label="Base Market"
              >
                {markets.map(market => (
                  <MenuItem key={market} value={market}>{market}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Comparison Market</InputLabel>
              <Select
                value={otherMarket}
                onChange={handleComparisonMarketChange}
                label="Comparison Market"
                disabled={!baseMarket || availableComparisonMarkets.length === 0}
              >
                {availableComparisonMarkets.map(market => (
                  <MenuItem key={market} value={market}>{market}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadData}
              disabled={!selectedPairData}
            >
              Download Results
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {selectedPairData && (
        <>
          <Paper sx={{ p: 1.5, mb: 3 }}>
            <MarketPairInfo 
              data={selectedPairData}
              baseMarket={baseMarket}
              comparisonMarket={otherMarket}
              isMobile={isMobile}
            />
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Model Parameters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .parameter-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    β = {selectedPairData.regression_results?.slope?.toFixed(4)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Market Integration Speed
                  </Typography>
                  <Typography 
                    className="parameter-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    Rate of price convergence between markets
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .parameter-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    α = {selectedPairData.regression_results?.intercept?.toFixed(4)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Long-run Differential
                  </Typography>
                  <Typography 
                    className="parameter-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    Equilibrium price difference between markets
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .parameter-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    d = {selectedPairData.diagnostics?.distance_km?.toFixed(2)} km
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Market Distance
                  </Typography>
                  <Typography 
                    className="parameter-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    Geographical separation between markets
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .parameter-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    ρ = {selectedPairData.diagnostics?.conflict_correlation?.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Conflict Impact
                  </Typography>
                  <Typography 
                    className="parameter-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    Correlation of conflict intensities
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Model Diagnostics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .diagnostic-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Model Fit
                  </Typography>
                  <Typography variant="body1">
                    {selectedPairData.regression_results?.r_squared
                      ? `${(selectedPairData.regression_results.r_squared * 100).toFixed(1)}%`
                      : 'N/A'}
                  </Typography>
                  <Typography 
                    className="diagnostic-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    R² - Explained variation in price differentials
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .diagnostic-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    AIC Score
                  </Typography>
                  <Typography variant="body1">
                    {selectedPairData.regression_results?.aic?.toFixed(2) || 'N/A'}
                  </Typography>
                  <Typography 
                    className="diagnostic-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    Akaike Information Criterion
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .diagnostic-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    BIC Score
                  </Typography>
                  <Typography variant="body1">
                    {selectedPairData.regression_results?.bic?.toFixed(2) || 'N/A'}
                  </Typography>
                  <Typography 
                    className="diagnostic-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    Bayesian Information Criterion
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.default,
                  borderRadius: 1,
                  '&:hover .diagnostic-info': {
                    opacity: 1
                  }
                }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Significance
                  </Typography>
                  <Typography variant="body1">
                    {selectedPairData.regression_results?.p_value < 0.05 ? 'Significant' : 'Not Significant'}
                  </Typography>
                  <Typography 
                    className="diagnostic-info"
                    variant="caption" 
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: theme.palette.text.secondary
                    }}
                  >
                    p = {selectedPairData.regression_results?.p_value?.toExponential(2) || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Model Framework Section */}
          <Accordion 
            expanded={frameworkExpanded} 
            onChange={() => setFrameworkExpanded(!frameworkExpanded)}
            sx={{ mb: 3 }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{
                backgroundColor: theme.palette.grey[50],
                '&:hover': {
                  backgroundColor: theme.palette.grey[100],
                }
              }}
            >
              <Typography variant="h6">
                Price Differential Model Framework
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <PriceDifferentialFramework 
                baseMarket={baseMarket}
                comparisonMarket={otherMarket}
                regressionResults={selectedPairData.regression_results}
                diagnostics={selectedPairData.diagnostics}
              />
            </AccordionDetails>
          </Accordion>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <PriceDifferentialChart 
                data={{
                  dates: selectedPairData.price_differential.dates,
                  values: selectedPairData.price_differential.values
                }}
                baseMarket={baseMarket}
                comparisonMarket={otherMarket}
                commodity={selectedCommodity}
                isMobile={isMobile}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <StationarityTest 
                stationarityData={selectedPairData.stationarity_results}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <CointegrationAnalysis 
                cointegrationData={selectedPairData.cointegration_results}
              />
            </Grid>
          </Grid>

          <Accordion
            expanded={interpretationExpanded}
            onChange={() => setInterpretationExpanded(!interpretationExpanded)}
            sx={{ mt: 3 }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{
                backgroundColor: theme.palette.grey[50],
                '&:hover': {
                  backgroundColor: theme.palette.grey[100],
                }
              }}
            >
              <Typography variant="h6">
                Detailed Market Analysis Interpretation
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <InterpretationSection 
                data={selectedPairData}
                baseMarket={baseMarket}
                comparisonMarket={otherMarket}
              />
            </AccordionDetails>
          </Accordion>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Box>
  );
};

PriceDifferentialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired
};

export default React.memo(PriceDifferentialAnalysis);
