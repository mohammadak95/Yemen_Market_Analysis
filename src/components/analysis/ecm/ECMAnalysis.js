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
              Model Parameters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  α = {selectedData.alpha.toFixed(4)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Speed of Adjustment
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  β = {selectedData.beta.toFixed(4)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Long-run Relationship
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  γ = {selectedData.gamma.toFixed(4)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Short-run Dynamics
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Model Diagnostics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  AIC Score
                </Typography>
                <Typography variant="body1">
                  {selectedData.aic.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  BIC Score
                </Typography>
                <Typography variant="body1">
                  {selectedData.bic.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Durbin-Watson
                </Typography>
                <Typography variant="body1">
                  {selectedData.diagnostics?.Variable_1?.durbin_watson_stat.toFixed(3)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Jarque-Bera p-value
                </Typography>
                <Typography variant="body1">
                  {selectedData.diagnostics?.Variable_1?.jarque_bera_pvalue.toExponential(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

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
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Error Correction Model Framework
                </Typography>
                <Tooltip title="Click to expand for detailed model explanation">
                  <Info fontSize="small" color="action" sx={{ mr: 1 }} />
                </Tooltip>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ '& .katex': { fontSize: '1.3em' }}}>
                <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
                  Long-run Equilibrium Relationship:
                </Typography>
                <Box sx={{ my: 3 }}>
                  <BlockMath math={`y_{t} = \\beta x_{t} + u_{t}`} />
                </Box>

                <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main, mt: 4 }}>
                  Error Correction Equation:
                </Typography>
                <Box sx={{ my: 3 }}>
                  <BlockMath math={`\\Delta y_t = \\alpha(y_{t-1} - \\beta x_{t-1}) + \\gamma \\Delta x_t + \\epsilon_t`} />
                </Box>

                <Grid container spacing={4} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: theme.palette.background.default }}>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        α (Alpha) = {selectedData.alpha.toFixed(4)}
                      </Typography>
                      <Typography variant="body2">
                        {selectedData.alpha < 0 
                          ? `Markets adjust ${Math.abs(selectedData.alpha * 100).toFixed(2)}% of price discrepancies per period`
                          : "Markets show no convergence to equilibrium"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: theme.palette.background.default }}>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        β (Beta) = {selectedData.beta.toFixed(4)}
                      </Typography>
                      <Typography variant="body2">
                        {Math.abs(selectedData.beta) > 0.8 
                          ? "Strong market integration"
                          : Math.abs(selectedData.beta) > 0.5 
                          ? "Moderate market integration"
                          : "Weak market integration"}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 2, height: '100%', backgroundColor: theme.palette.background.default }}>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        γ (Gamma) = {selectedData.gamma.toFixed(4)}
                      </Typography>
                      <Typography variant="body2">
                        {Math.abs(selectedData.gamma) > 0.5 
                          ? "Strong immediate price transmission"
                          : Math.abs(selectedData.gamma) > 0.2 
                          ? "Moderate short-term adjustment"
                          : "Weak immediate response"}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Variable Definitions:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        • <InlineMath math="y_t, x_t" />: Market prices at time t<br />
                        • <InlineMath math="\Delta y_t, \Delta x_t" />: Price changes<br />
                        • <InlineMath math="\alpha" />: Adjustment speed coefficient
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        • <InlineMath math="\beta" />: Long-run price relationship<br />
                        • <InlineMath math="\gamma" />: Short-run price transmission<br />
                        • <InlineMath math="\epsilon_t" />: Random error term
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
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