// src/components/analysis/ecm/ECMResultsEnhanced.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { ExpandMore, Info } from '@mui/icons-material';
import { analysisStyles } from '../../../styles/analysisStyles';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Lazy load diagnostic components
const ACFPlot = React.lazy(() => import('./ACFPlot'));
const PACFPlot = React.lazy(() => import('./PACFPlot'));
const QQPlot = React.lazy(() => import('./QQPlot'));
const IRFChart = React.lazy(() => import('./IRFChart'));

const ECMResultsEnhanced = ({ selectedData, isMobile, analysisType, direction }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  // Memoized coefficient interpretations
  const interpretations = useMemo(() => ({
    alpha: getAlphaInterpretation(selectedData?.alpha),
    beta: getBetaInterpretation(selectedData?.beta),
    gamma: getGammaInterpretation(selectedData?.gamma)
  }), [selectedData]);

  // Helper function to format numbers
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return parseFloat(num).toFixed(3);
  };

  // Coefficient interpretation functions
  function getAlphaInterpretation(alpha) {
    if (alpha === null || alpha === undefined) return { severity: 'info', message: 'No adjustment speed data available' };
    if (alpha < -0.5) return { severity: 'success', message: 'Rapid adjustment to equilibrium (>50% per period)' };
    if (alpha < 0) return { severity: 'warning', message: 'Slow adjustment to equilibrium' };
    return { severity: 'error', message: 'No convergence to equilibrium' };
  }

  function getBetaInterpretation(beta) {
    if (beta === null || beta === undefined) return { severity: 'info', message: 'No long-run relationship data available' };
    if (Math.abs(beta) > 0.8) return { severity: 'success', message: 'Strong long-run relationship between variables' };
    if (Math.abs(beta) > 0.3) return { severity: 'warning', message: 'Moderate long-run relationship between variables' };
    return { severity: 'error', message: 'Weak long-run relationship between variables' };
  }

  function getGammaInterpretation(gamma) {
    if (gamma === null || gamma === undefined) return { severity: 'info', message: 'No short-run dynamics data available' };
    if (Math.abs(gamma) > 0.5) return { severity: 'success', message: 'Strong immediate effect' };
    if (Math.abs(gamma) > 0.2) return { severity: 'warning', message: 'Moderate immediate effect' };
    return { severity: 'error', message: 'Weak immediate effect' };
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* Executive Summary */}
      <Paper sx={styles.summaryPaper}>
        <Typography variant="h5" gutterBottom>
          Executive Summary
        </Typography>
        <Typography variant="body1">
          {`The ECM analysis for ${selectedData.commodity} reveals a ${
            Math.abs(selectedData.beta) > 0.8 ? 'strong' : 
            Math.abs(selectedData.beta) > 0.3 ? 'moderate' : 'weak'
          } long-run relationship between markets, with ${
            Math.abs(selectedData.alpha) > 0.5 ? 'rapid' : 'slow'
          } convergence to equilibrium.`}
        </Typography>
      </Paper>

      {/* Coefficients Grid */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Alpha Coefficient */}
        <Grid item xs={12} md={4}>
          <Paper sx={styles.coefficientCard}>
            <Typography variant="h6">Speed of Adjustment (α)</Typography>
            <Typography variant="h4" sx={styles.coefficientValue}>
              {formatNumber(selectedData.alpha)}
            </Typography>
            <Alert severity={interpretations.alpha.severity}>
              {interpretations.alpha.message}
            </Alert>
          </Paper>
        </Grid>

        {/* Beta Coefficient */}
        <Grid item xs={12} md={4}>
          <Paper sx={styles.coefficientCard}>
            <Typography variant="h6">Long-run Relationship (β)</Typography>
            <Typography variant="h4" sx={styles.coefficientValue}>
              {formatNumber(selectedData.beta)}
            </Typography>
            <Alert severity={interpretations.beta.severity}>
              {interpretations.beta.message}
            </Alert>
          </Paper>
        </Grid>

        {/* Gamma Coefficient */}
        <Grid item xs={12} md={4}>
          <Paper sx={styles.coefficientCard}>
            <Typography variant="h6">Short-run Dynamics (γ)</Typography>
            <Typography variant="h4" sx={styles.coefficientValue}>
              {formatNumber(selectedData.gamma)}
            </Typography>
            <Alert severity={interpretations.gamma.severity}>
              {interpretations.gamma.message}
            </Alert>
          </Paper>
        </Grid>

        {/* Model Equation */}
        <Grid item xs={12}>
          <Paper sx={styles.equationPaper}>
            <Typography variant="h6" gutterBottom>
              Error Correction Model Equation
              <Tooltip title="The ECM equation represents the relationship between price changes and deviations from long-run equilibrium">
                <Info sx={{ ml: 1, fontSize: '1rem', color: 'info.main' }} />
              </Tooltip>
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <BlockMath math={`\\Delta y_t = \\alpha(y_{t-1} - \\beta x_{t-1}) + \\gamma \\Delta x_t + \\epsilon_t`} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              where Δyt represents price changes, α is the speed of adjustment,
              β represents the long-run equilibrium relationship, and γ captures short-run dynamics
            </Typography>
          </Paper>
        </Grid>

        {/* IRF Chart */}
        <Grid item xs={12}>
          <Paper sx={styles.chartPaper}>
            <Typography variant="h6" gutterBottom>
              Impulse Response Function
              <Tooltip title="Shows how variables respond to shocks over time">
                <Info sx={{ ml: 1, fontSize: '1rem', color: 'info.main' }} />
              </Tooltip>
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>
              <React.Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}>
                <IRFChart
                  data={selectedData.irf}
                  confidenceIntervals={{
                    lower: selectedData.confidence_intervals?.lower,
                    upper: selectedData.confidence_intervals?.upper
                  }}
                />
              </React.Suspense>
            </Box>
          </Paper>
        </Grid>

        {/* Diagnostic Plots */}
        <Grid item xs={12}>
          <Paper sx={styles.diagnosticsPaper}>
            <Typography variant="h6" gutterBottom>
              Model Diagnostics
              <Tooltip title="Diagnostic plots help assess model assumptions and fit">
                <Info sx={{ ml: 1, fontSize: '1rem', color: 'info.main' }} />
              </Tooltip>
            </Typography>
            <Grid container spacing={3}>
              {/* ACF Plot */}
              <Grid item xs={12} md={6}>
                <Paper sx={styles.plotPaper}>
                  <Typography variant="subtitle1" gutterBottom>
                    Autocorrelation Function (ACF)
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <React.Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}>
                      <ACFPlot
                        data={selectedData.diagnostics?.Variable_1?.acf}
                        significance={0.05}
                      />
                    </React.Suspense>
                  </Box>
                </Paper>
              </Grid>

              {/* PACF Plot */}
              <Grid item xs={12} md={6}>
                <Paper sx={styles.plotPaper}>
                  <Typography variant="subtitle1" gutterBottom>
                    Partial Autocorrelation Function (PACF)
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <React.Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}>
                      <PACFPlot
                        data={selectedData.diagnostics?.Variable_1?.pacf}
                        significance={0.05}
                      />
                    </React.Suspense>
                  </Box>
                </Paper>
              </Grid>

              {/* Q-Q Plot */}
              <Grid item xs={12} md={6}>
                <Paper sx={styles.plotPaper}>
                  <Typography variant="subtitle1" gutterBottom>
                    Q-Q Plot
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <React.Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}>
                      <QQPlot
                        residuals={selectedData.residuals}
                      />
                    </React.Suspense>
                  </Box>
                </Paper>
              </Grid>

              {/* Model Quality Metrics */}
              <Grid item xs={12} md={6}>
                <Paper sx={styles.metricsPaper}>
                  <Typography variant="subtitle1" gutterBottom>
                    Model Quality Metrics
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {/* Jarque-Bera Test */}
                    <Alert 
                      severity={selectedData.diagnostics?.Variable_1?.jarque_bera_pvalue > 0.05 ? 'success' : 'warning'}
                      sx={{ mb: 2 }}
                    >
                      {selectedData.diagnostics?.Variable_1?.jarque_bera_pvalue > 0.05 
                        ? 'Residuals are normally distributed (Jarque-Bera test)'
                        : 'Residuals may not be normally distributed'}
                    </Alert>

                    {/* Durbin-Watson Test */}
                    <Alert 
                      severity={
                        selectedData.diagnostics?.Variable_1?.durbin_watson_stat > 1.5 &&
                        selectedData.diagnostics?.Variable_1?.durbin_watson_stat < 2.5 
                          ? 'success' 
                          : 'warning'
                      }
                      sx={{ mb: 2 }}
                    >
                      {`Durbin-Watson statistic: ${formatNumber(selectedData.diagnostics?.Variable_1?.durbin_watson_stat)}`}
                    </Alert>

                    {/* Model Fit Statistics */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        AIC: {formatNumber(selectedData.aic)}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        BIC: {formatNumber(selectedData.bic)}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        HQIC: {formatNumber(selectedData.hqic)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Model Interpretation Guide */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Model Interpretation Guide</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Speed of Adjustment (α)
                  </Typography>
                  <Typography variant="body2">
                    • Values between -1 and 0 indicate convergence<br/>
                    • Closer to -1: Faster adjustment<br/>
                    • Closer to 0: Slower adjustment<br/>
                    • Current value: {formatNumber(selectedData.alpha)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Long-run Relationship (β)
                  </Typography>
                  <Typography variant="body2">
                    • Measures equilibrium relationship<br/>
                    • |β| &gt; 0.8: Strong relationship<br/>
                    • |β| &gt; 0.3: Moderate relationship<br/>
                    • Current value: {formatNumber(selectedData.beta)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Short-run Dynamics (γ)
                  </Typography>
                  <Typography variant="body2">
                    • Captures immediate price adjustments<br/>
                    • |γ| &gt; 0.5: Strong immediate effect<br/>
                    • |γ| &gt; 0.2: Moderate immediate effect<br/>
                    • Current value: {formatNumber(selectedData.gamma)}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

ECMResultsEnhanced.propTypes = {
  selectedData: PropTypes.shape({
    commodity: PropTypes.string.isRequired,
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
    aic: PropTypes.number,
    bic: PropTypes.number,
    hqic: PropTypes.number,
    diagnostics: PropTypes.shape({
      Variable_1: PropTypes.shape({
        acf: PropTypes.arrayOf(PropTypes.number),
        pacf: PropTypes.arrayOf(PropTypes.number),
        jarque_bera_pvalue: PropTypes.number,
        durbin_watson_stat: PropTypes.number
      })
    }),
    irf: PropTypes.arrayOf(PropTypes.number),
    confidence_intervals: PropTypes.shape({
      lower: PropTypes.arrayOf(PropTypes.number),
      upper: PropTypes.arrayOf(PropTypes.number)
    }),
    residuals: PropTypes.arrayOf(PropTypes.number)
  }).isRequired,
  isMobile: PropTypes.bool.isRequired,
  analysisType: PropTypes.oneOf(['unified', 'directional']).isRequired,
  direction: PropTypes.string
};

export default React.memo(ECMResultsEnhanced);