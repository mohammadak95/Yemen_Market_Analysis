// src/components/analysis/ecm/ECMAnalysis.js

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
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
  Divider
} from '@mui/material';
import { Download, ExpandMore, Info } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { useECMData } from '../../../hooks/dataHooks';
import IRFChart from './IRFChart';
import ACFPlot from './ACFPlot';
import PACFPlot from './PACFPlot';
import InterpretationSection from './InterpretationSection';

const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [equationExpanded, setEquationExpanded] = useState(false);
  const [interpretationExpanded, setInterpretationExpanded] = useState(false);

  const {
    unifiedData,
    directionalData,
    unifiedError,
    directionalError,
    isLoading
  } = useECMData(selectedCommodity);

  const selectedData = analysisType === 'unified' 
    ? unifiedData 
    : directionalData[direction];

  const handleAnalysisTypeChange = useCallback((event, newType) => {
    if (newType) setAnalysisType(newType);
  }, []);

  const handleDirectionChange = useCallback((event, newDirection) => {
    if (newDirection) setDirection(newDirection);
  }, []);

  const handleDownloadData = useCallback(() => {
    if (!selectedData) return;
    try {
      const blob = new Blob(
        [JSON.stringify(selectedData, null, 2)], 
        { type: 'application/json' }
      );
      saveAs(blob, `ecm_analysis_${selectedCommodity}_${analysisType}.json`);
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
  }, [selectedData, selectedCommodity, analysisType]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (unifiedError || directionalError) {
    return (
      <Alert severity="error">
        <Alert.Title>Error Loading ECM Data</Alert.Title>
        {unifiedError || directionalError}
      </Alert>
    );
  }

  const getParameterInterpretation = (param, value) => {
    switch(param) {
      case 'alpha':
        return {
          label: 'Adjustment Speed',
          interpretation: value < 0 
            ? `Markets correct ${Math.abs(value * 100).toFixed(1)}% of price gaps per period`
            : 'Markets show divergent behavior',
          detail: value < -0.5 
            ? 'Rapid equilibrium restoration'
            : value < 0 
            ? 'Gradual price convergence'
            : 'No price convergence'
        };
      case 'beta':
        return {
          label: 'Market Integration',
          interpretation: `${Math.abs(value - 1) < 0.1 ? 'Perfect' : Math.abs(value) > 0.8 ? 'Strong' : Math.abs(value) > 0.5 ? 'Moderate' : 'Weak'} price transmission`,
          detail: Math.abs(value - 1) < 0.1 
            ? 'Complete price pass-through'
            : `${(Math.abs(value) * 100).toFixed(1)}% long-run price transmission`
        };
      case 'gamma':
        return {
          label: 'Short-run Dynamics',
          interpretation: `${Math.abs(value) > 0.5 ? 'Strong' : Math.abs(value) > 0.2 ? 'Moderate' : 'Weak'} immediate response`,
          detail: `${(Math.abs(value) * 100).toFixed(1)}% immediate price transmission`
        };
      default:
        return { label: '', interpretation: '', detail: '' };
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <ToggleButtonGroup
            value={analysisType}
            exclusive
            onChange={handleAnalysisTypeChange}
            size={isMobile ? 'small' : 'medium'}
          >
            <ToggleButton value="unified">Unified Analysis</ToggleButton>
            <ToggleButton value="directional">Directional Analysis</ToggleButton>
          </ToggleButtonGroup>

          {analysisType === 'directional' && (
            <ToggleButtonGroup
              value={direction}
              exclusive
              onChange={handleDirectionChange}
              size={isMobile ? 'small' : 'medium'}
            >
              <ToggleButton value="northToSouth">North to South</ToggleButton>
              <ToggleButton value="southToNorth">South to North</ToggleButton>
            </ToggleButtonGroup>
          )}

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadData}
            disabled={!selectedData}
          >
            Download Results
          </Button>
        </Box>
      </Paper>

      {selectedData && (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Market Integration Parameters
            </Typography>
            <Grid container spacing={2}>
              {['alpha', 'beta', 'gamma'].map(param => {
                const value = selectedData[param];
                const interpretation = getParameterInterpretation(param, value);
                return (
                  <Grid item xs={12} md={4} key={param}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: theme.palette.background.default,
                      borderRadius: 1,
                      height: '100%',
                      '&:hover .parameter-info': {
                        opacity: 1
                      }
                    }}>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {param === 'alpha' ? 'α' : param === 'beta' ? 'β' : 'γ'} = {value.toFixed(4)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {interpretation.label}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {interpretation.interpretation}
                      </Typography>
                      <Typography 
                        className="parameter-info"
                        variant="caption" 
                        sx={{ 
                          display: 'block',
                          mt: 1,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          color: theme.palette.text.secondary
                        }}
                      >
                        {interpretation.detail}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Model Diagnostics</Typography>
            <Grid container spacing={2}>
              {[
                {
                  label: 'Model Fit',
                  value: selectedData.aic,
                  format: (v) => v.toFixed(2),
                  info: 'Akaike Information Criterion - Lower is better'
                },
                {
                  label: 'Serial Correlation',
                  value: selectedData.diagnostics?.Variable_1?.durbin_watson_stat,
                  format: (v) => v.toFixed(3),
                  info: 'Durbin-Watson statistic - Close to 2 indicates no autocorrelation'
                },
                {
                  label: 'Normality',
                  value: selectedData.diagnostics?.Variable_1?.jarque_bera_pvalue,
                  format: (v) => v.toExponential(2),
                  info: 'Jarque-Bera test p-value - Higher indicates normal distribution'
                },
                {
                  label: 'Granger Causality',
                  value: selectedData.granger_causality?.usdprice_north?.[1]?.ssr_ftest_pvalue,
                  format: (v) => v.toExponential(2),
                  info: 'Tests for price leadership - Lower p-value indicates causality'
                }
              ].map((metric, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.background.default,
                    borderRadius: 1,
                    height: '100%',
                    '&:hover .diagnostic-info': {
                      opacity: 1
                    }
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {metric.label}
                    </Typography>
                    <Typography variant="body1">
                      {metric.value ? metric.format(metric.value) : 'N/A'}
                    </Typography>
                    <Typography 
                      className="diagnostic-info"
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        mt: 1,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        color: theme.palette.text.secondary
                      }}
                    >
                      {metric.info}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Model Framework Section */}
          <Accordion 
            expanded={equationExpanded} 
            onChange={() => setEquationExpanded(!equationExpanded)}
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
                Error Correction Model Framework
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ '& .katex': { fontSize: '1.3em' }}}>
                <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
                  Long-run Market Integration:
                </Typography>
                <Box sx={{ my: 3 }}>
                  <BlockMath math={`P_{1,t} = \\beta P_{2,t} + u_t`} />
                </Box>
                <Typography variant="body2" paragraph>
                  Where <InlineMath math="P_{1,t}, P_{2,t}" /> are market prices and <InlineMath math="\beta" /> measures price transmission
                </Typography>

                <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, mt: 4 }}>
                  Error Correction Mechanism:
                </Typography>
                <Box sx={{ my: 3 }}>
                  <BlockMath math={`\\Delta P_{1,t} = \\alpha(P_{1,t-1} - \\beta P_{2,t-1}) + \\gamma \\Delta P_{2,t} + \\epsilon_t`} />
                </Box>

                <Grid container spacing={4} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Parameter Interpretations:
                    </Typography>
                    <Typography variant="body2">
                      • <InlineMath math="\alpha" />: Speed of price convergence<br />
                      • <InlineMath math="\beta" />: Long-run price relationship<br />
                      • <InlineMath math="\gamma" />: Immediate price transmission<br />
                      • <InlineMath math="\Delta P" />: Price changes<br />
                      • <InlineMath math="\epsilon_t" />: Random shocks
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      Economic Implications:
                    </Typography>
                    <Typography variant="body2">
                      • Negative α indicates market correction<br />
                      • β ≈ 1 suggests perfect integration<br />
                      • γ measures short-term responses<br />
                      • Error term captures market frictions
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Impulse Response Function
                  <Tooltip title="Shows how markets respond to price shocks over time">
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box sx={{ height: 400 }}>
                  <IRFChart 
                    data={selectedData.irf?.impulse_response?.irf}
                    analysisType={analysisType}
                    direction={direction}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Autocorrelation Function
                  <Tooltip title="Shows temporal price dependencies">
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ACFPlot 
                    data={selectedData.diagnostics?.Variable_1?.acf} 
                    significance={0.05}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Partial Autocorrelation Function
                  <Tooltip title="Shows direct price relationships at different lags">
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <Box sx={{ height: 300 }}>
                  <PACFPlot 
                    data={selectedData.diagnostics?.Variable_1?.pacf} 
                    significance={0.05}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Accordion
            expanded={interpretationExpanded}
            onChange={() => setInterpretationExpanded(!interpretationExpanded)}
            sx={{ mt: 3 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Interpretation of ECM Analysis Results</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <InterpretationSection selectedData={selectedData} />
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

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired
};

const getAlphaInterpretation = (alpha) => {
  if (alpha === null || alpha === undefined) {
    return { severity: 'info', message: 'No adjustment speed data available' };
  }
  if (alpha < -0.5) {
    return { severity: 'success', message: 'Rapid adjustment to equilibrium (>50% per period)' };
  }
  if (alpha < 0) {
    return { severity: 'warning', message: 'Slow adjustment to equilibrium' };
  }
  return { severity: 'error', message: 'No convergence to equilibrium' };
};

const getBetaInterpretation = (beta) => {
  if (beta === null || beta === undefined) {
    return { severity: 'info', message: 'No long-run relationship data available' };
  }
  if (Math.abs(beta) > 0.8) {
    return { severity: 'success', message: 'Strong long-run relationship between markets' };
  }
  if (Math.abs(beta) > 0.5) {
    return { severity: 'warning', message: 'Moderate long-run relationship between markets' };
  }
  return { severity: 'error', message: 'Weak long-run relationship between markets' };
};

const getGammaInterpretation = (gamma) => {
  if (gamma === null || gamma === undefined) {
    return { severity: 'info', message: 'No short-run dynamics data available' };
  }
  if (Math.abs(gamma) > 0.5) {
    return { severity: 'success', message: 'Strong immediate price transmission' };
  }
  if (Math.abs(gamma) > 0.2) {
    return { severity: 'warning', message: 'Moderate immediate price transmission' };
  }
  return { severity: 'error', message: 'Weak immediate price transmission' };
};

export default React.memo(ECMAnalysis);
