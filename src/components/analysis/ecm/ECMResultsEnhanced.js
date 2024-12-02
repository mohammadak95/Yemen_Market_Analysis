// src/components/analysis/ecm/ECMResultsEnhanced.js

import React, { useState, useMemo } from 'react';
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
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  TrendingUp,
  Speed,
  Timeline,
  Analytics,
  Map as MapIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { analysisStyles } from '../../../styles/analysisStyles';
import MapVisualization from './MapVisualization';
import { useTranslation } from 'react-i18next';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

/**
 * TabPanel Component
 * Renders the content of each tab.
 */
const getClusterType = (moranI, pValue) => {
  const SIGNIFICANCE_LEVEL = 0.05;
  const CLUSTER_TYPES = {
    HIGH_HIGH: 'high-high',
    LOW_LOW: 'low-low',
    HIGH_LOW: 'high-low',
    LOW_HIGH: 'low-high',
    NOT_SIGNIFICANT: 'not_significant'
  };

  if (!moranI || !pValue || pValue > SIGNIFICANCE_LEVEL) {
    return CLUSTER_TYPES.NOT_SIGNIFICANT;
  }

  // Determine cluster type based on Moran's I value
  if (moranI > 0) {
    return moranI > 0.5 ? CLUSTER_TYPES.HIGH_HIGH : CLUSTER_TYPES.LOW_LOW;
  } else {
    return moranI < -0.5 ? CLUSTER_TYPES.HIGH_LOW : CLUSTER_TYPES.LOW_HIGH;
  }
};

/**
 * TabPanel Component
 * Renders the content of each tab.
 */
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`ecm-tabpanel-${index}`}
    aria-labelledby={`ecm-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

/**
 * ECMResultsEnhanced Component
 * Displays detailed ECM analysis results, including charts and spatial maps.
 */
const ECMResultsEnhanced = ({ selectedData, isMobile, analysisType, direction }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState('');

  const regressionResults = selectedData || {};

  // Prepare data for Impulse Response Function (IRF) Chart
  const irfData = useMemo(() => {
    if (!selectedData?.irf) return [];
    return selectedData.irf.map((point, index) => ({
      period: index,
      usd_price: point[0][0],
      conflict_intensity: point[1][0],
    }));
  }, [selectedData]);

  // Prepare data for Granger Causality Chart
  const grangerData = useMemo(() => {
    if (!selectedData?.granger_causality?.conflict_intensity) return [];
    return Object.entries(selectedData.granger_causality.conflict_intensity).map(
      ([lag, data]) => ({
        lag: parseInt(lag, 10),
        pValue: data.ssr_ftest_pvalue,
        significant: data.ssr_ftest_pvalue < 0.05,
      })
    );
  }, [selectedData]);

  // Access diagnostics for Variable_1
  const diagnosticsVar1 = selectedData?.diagnostics?.Variable_1 || null;

  /**
   * Handles tab changes.
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Handles region selection on the map.
   */
  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
  };

  /**
   * Prepares GeoJSON data for MapVisualization.
   */
  const yemenGeoJson = useMemo(() => {
    console.log('Preparing GeoJSON data:', {
      hasAutocorrelation: !!selectedData?.spatial_autocorrelation,
      hasGeoJson: !!selectedData?.geoJson,
      hasFeatures: selectedData?.geoJson?.features?.length,
      autocorrelationData: selectedData?.spatial_autocorrelation
    });

    if (
      !selectedData?.spatial_autocorrelation ||
      !selectedData?.geoJson ||
      !selectedData.geoJson.features
    ) {
      console.warn('Missing required data for map:', {
        hasAutocorrelation: !!selectedData?.spatial_autocorrelation,
        hasGeoJson: !!selectedData?.geoJson,
        hasFeatures: selectedData?.geoJson?.features?.length
      });
      return null;
    }

    const updatedFeatures = selectedData.geoJson.features.map((feature) => {
      const region = feature.properties?.admin1 || feature.properties?.region_id;
      const stats = selectedData.spatial_autocorrelation[region] || 
                   selectedData.spatial_autocorrelation?.Variable_1?.[region] ||
                   selectedData.spatial_autocorrelation?.local?.[region];

      console.log('Processing region:', {
        region,
        hasStats: !!stats,
        stats: stats
      });
      
      if (!stats) {
        return {
          ...feature,
          properties: {
            ...feature.properties,
            stats: null
          }
        };
      }

      // Calculate cluster type based on Moran's I and p-value
      const moranI = stats.Moran_I || stats.local_i || stats.moran_i;
      const pValue = stats.Moran_p_value || stats.p_value;
      const clusterType = getClusterType(moranI, pValue);

      console.log('Calculated cluster type:', {
        region,
        moranI,
        pValue,
        clusterType
      });

      return {
        ...feature,
        properties: {
          ...feature.properties,
          stats: {
            local_i: moranI,
            p_value: pValue,
            cluster_type: clusterType,
            z_score: stats.z_score || 0
          }
        }
      };
    });

    console.log('Final GeoJSON:', {
      featureCount: updatedFeatures.length,
      sampleFeature: updatedFeatures[0]
    });

    return {
      type: 'FeatureCollection',
      features: updatedFeatures
    };
  }, [selectedData]);

  /**
   * Interpretation logic for alpha coefficient.
   */
  const getAlphaInterpretation = (alpha) => {
    if (alpha === null || alpha === undefined)
      return { severity: 'info', message: t('No adjustment speed data available') };
    if (alpha < -0.5)
      return {
        severity: 'success',
        message: t('Rapid adjustment to equilibrium (>50% per period)'),
      };
    if (alpha < 0)
      return {
        severity: 'warning',
        message: t('Slow adjustment to equilibrium'),
      };
    return {
      severity: 'error',
      message: t('No convergence to equilibrium'),
    };
  };

  /**
   * Interpretation logic for beta coefficient.
   */
  const getBetaInterpretation = (beta) => {
    if (beta === null || beta === undefined)
      return { severity: 'info', message: t('No long-run relationship data available') };
    if (Math.abs(beta) > 0.8)
      return {
        severity: 'success',
        message: t('Strong long-run relationship between variables'),
      };
    if (Math.abs(beta) > 0.3)
      return {
        severity: 'warning',
        message: t('Moderate long-run relationship between variables'),
      };
    return {
      severity: 'error',
      message: t('Weak long-run relationship between variables'),
    };
  };

  /**
   * Interpretation logic for gamma coefficient.
   */
  const getGammaInterpretation = (gamma) => {
    if (gamma === null || gamma === undefined)
      return { severity: 'info', message: t('No short-run dynamics data available') };
    if (Math.abs(gamma) > 0.5)
      return {
        severity: 'success',
        message: t('Strong immediate effect'),
      };
    if (Math.abs(gamma) > 0.2)
      return {
        severity: 'warning',
        message: t('Moderate immediate effect'),
      };
    return {
      severity: 'error',
      message: t('Weak immediate effect'),
    };
  };

  /**
   * Formats numbers to three decimal places.
   */
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return parseFloat(num).toFixed(3);
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      {/* Tabs for different sections */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={t('Overview')} icon={<Analytics />} iconPosition="start" />
          <Tab label={t('Analysis Details')} icon={<TrendingUp />} iconPosition="start" />
          <Tab label={t('Spatial Analysis')} icon={<MapIcon />} iconPosition="start" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Speed of Adjustment (α) Card */}
            <Grid item xs={12} md={4}>
              <Paper sx={styles.insightCard}>
                <Box sx={styles.insightHeader}>
                  <Speed color="primary" />
                  <Typography variant="h6">{t('Speed of Adjustment (α)')}</Typography>
                </Box>
                <Typography variant="h4" sx={styles.insightValue}>
                  {formatNumber(regressionResults?.alpha)}
                </Typography>
                <Alert
                  severity={getAlphaInterpretation(regressionResults?.alpha).severity}
                  sx={{ mt: 2 }}
                >
                  {getAlphaInterpretation(regressionResults?.alpha).message}
                </Alert>
              </Paper>
            </Grid>

            {/* Long-run Relationship (β) Card */}
            <Grid item xs={12} md={4}>
              <Paper sx={styles.insightCard}>
                <Box sx={styles.insightHeader}>
                  <TrendingUp color="primary" />
                  <Typography variant="h6">{t('Long-run Relationship (β)')}</Typography>
                </Box>
                <Typography variant="h4" sx={styles.insightValue}>
                  {formatNumber(regressionResults?.beta)}
                </Typography>
                <Alert
                  severity={getBetaInterpretation(regressionResults?.beta).severity}
                  sx={{ mt: 2 }}
                >
                  {getBetaInterpretation(regressionResults?.beta).message}
                </Alert>
              </Paper>
            </Grid>

            {/* Short-run Dynamics (γ) Card */}
            <Grid item xs={12} md={4}>
              <Paper sx={styles.insightCard}>
                <Box sx={styles.insightHeader}>
                  <Timeline color="primary" />
                  <Typography variant="h6">{t('Short-run Dynamics (γ)')}</Typography>
                </Box>
                <Typography variant="h4" sx={styles.insightValue}>
                  {formatNumber(regressionResults?.gamma)}
                </Typography>
                <Alert
                  severity={getGammaInterpretation(regressionResults?.gamma).severity}
                  sx={{ mt: 2 }}
                >
                  {getGammaInterpretation(regressionResults?.gamma).message}
                </Alert>
              </Paper>
            </Grid>

            {/* ECM Equation */}
            <Grid item xs={12}>
              <Paper sx={styles.chartPaper}>
                <Typography variant="h6" gutterBottom>
                  {t('Error Correction Model Equation')}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <BlockMath math={'\\Delta y_t = \\alpha (y_{t-1} - \\beta x_{t-1}) + \\gamma \\Delta x_t + \\epsilon_t'} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t(
                    'This equation represents the Error Correction Model where Δ denotes the first difference, ' +
                    'α is the speed of adjustment, β represents the long-run equilibrium relationship, ' +
                    'γ captures the short-run dynamics, and εₜ is the error term.'
                  )}
                </Typography>
              </Paper>
            </Grid>

            {/* Impulse Response Function (IRF) Chart */}
            <Grid item xs={12}>
              <Paper sx={styles.chartPaper}>
                <Typography variant="h6" gutterBottom>
                  {t('Impulse Response Function')}
                </Typography>
                {irfData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={irfData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="period"
                          label={{ value: t('Period'), position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: t('Response'), angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          formatter={(value, name) => [`${value.toFixed(2)}`, t(name)]}
                          labelFormatter={(label) => `${t('Period')}: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="usd_price"
                          stroke={theme.palette.primary.main}
                          name={t('USD Price Response')}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="conflict_intensity"
                          stroke={theme.palette.secondary.main}
                          name={t('Conflict Intensity Response')}
                          dot={false}
                        />
                        <ReferenceLine y={0} stroke={theme.palette.error.main} strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography variant="body2">{t('No IRF data available.')}</Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t('Shows how variables respond over time to a shock in one of the variables.')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Analysis Details Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {/* Model Diagnostics */}
            <Grid item xs={12}>
              <Paper sx={styles.chartPaper}>
                <Typography variant="h6" gutterBottom>
                  {t('Model Diagnostics')}
                </Typography>
                {diagnosticsVar1 ? (
                  <>
                    {/* Jarque-Bera Test */}
                    {diagnosticsVar1.jarque_bera_pvalue < 0.05 ? (
                      <Alert severity="warning">
                        {t(
                          'Residuals do not appear to be normally distributed (Jarque-Bera test p-value < 0.05).'
                        )}
                      </Alert>
                    ) : (
                      <Alert severity="success">
                        {t(
                          'Residuals appear to be normally distributed (Jarque-Bera test p-value > 0.05).'
                        )}
                      </Alert>
                    )}
                    {/* Durbin-Watson Test */}
                    {diagnosticsVar1.durbin_watson_stat < 1.5 ||
                    diagnosticsVar1.durbin_watson_stat > 2.5 ? (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        {t(
                          'Potential autocorrelation detected (Durbin-Watson statistic: {{value}}).',
                          { value: diagnosticsVar1.durbin_watson_stat.toFixed(2) }
                        )}
                      </Alert>
                    ) : (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        {t(
                          'No significant autocorrelation detected (Durbin-Watson statistic: {{value}}).',
                          { value: diagnosticsVar1.durbin_watson_stat.toFixed(2) }
                        )}
                      </Alert>
                    )}
                  </>
                ) : (
                  <Typography variant="body2">{t('No diagnostics data available.')}</Typography>
                )}
              </Paper>
            </Grid>

            {/* Granger Causality Chart */}
            <Grid item xs={12}>
              <Paper sx={styles.chartPaper}>
                <Typography variant="h6" gutterBottom>
                  {t('Granger Causality')}
                </Typography>
                {grangerData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={grangerData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="lag"
                          label={{ value: t('Lag'), position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: t('P-Value'), angle: -90, position: 'insideLeft' }}
                          domain={[0, 1]}
                        />
                        <Tooltip
                          formatter={(value, name) => [`${value.toFixed(3)}`, t(name)]}
                          labelFormatter={(label) => `${t('Lag')}: ${label}`}
                        />
                        <Bar dataKey="pValue" name={t('P-Value')}>
                          {grangerData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.significant
                                  ? theme.palette.error.main
                                  : theme.palette.primary.main
                              }
                            />
                          ))}
                        </Bar>
                        <ReferenceLine
                          y={0.05}
                          stroke={theme.palette.warning.main}
                          strokeDasharray="3 3"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Typography variant="body2">{t('No Granger causality data available.')}</Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t(
                    'Tests for causality at different lag lengths. Bars below 0.05 indicate significant causality.'
                  )}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Spatial Analysis Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {/* Moran's I Spatial Autocorrelation Map */}
            <Grid item xs={12}>
              <Paper sx={styles.chartPaper}>
                <Typography variant="h6" gutterBottom>
                  {t("Moran's I Spatial Autocorrelation")}
                </Typography>
                {/* Map Visualization */}
                {yemenGeoJson && yemenGeoJson.features && yemenGeoJson.features.length > 0 ? (
                  <MapVisualization
                    data={yemenGeoJson}
                    selectedRegion={selectedRegion}
                    onRegionSelect={handleRegionSelect}
                  />
                ) : (
                  <Alert severity="info">
                    {t('No GeoJSON data available for map visualization.')}
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t(
                    "This map visualizes the spatial autocorrelation of residuals across regions using Moran's I statistic."
                  )}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Model Interpretation Guide Accordion */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">{t('Model Interpretation Guide')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" paragraph>
            {t(
              'The Error Correction Model (ECM) captures both short-term dynamics and long-run equilibrium relationships:'
            )}
          </Typography>
          <Grid container spacing={2}>
            {/* Speed of Adjustment (α) Interpretation */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                {t('Speed of Adjustment (α)')}
              </Typography>
              <Typography variant="body2" component="div">
                • {t('Negative values indicate convergence')}
                <br />
                • {t('Values closer to -1 show faster adjustment')}
                <br />
                • {t('Range: -1 to 0 (typically)')}
                <br />
                • {t('Current value')}: {formatNumber(regressionResults?.alpha)}
              </Typography>
            </Grid>

            {/* Long-run Relationship (β) Interpretation */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                {t('Long-run Relationship (β)')}
              </Typography>
              <Typography variant="body2" component="div">
                • {t('Measures equilibrium relationship')}
                <br />
                • {t('Larger absolute values show stronger connection')}
                <br />
                • {t('Sign indicates direction of relationship')}
                <br />
                • {t('Current value')}: {formatNumber(regressionResults?.beta)}
              </Typography>
            </Grid>

            {/* Short-run Dynamics (γ) Interpretation */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                {t('Short-run Dynamics (γ)')}
              </Typography>
              <Typography variant="body2" component="div">
                • {t('Captures immediate effect')}
                <br />
                • {t('Values near 1 indicate strong effect')}
                <br />
                • {t('Small values suggest weak effect')}
                <br />
                • {t('Current value')}: {formatNumber(regressionResults?.gamma)}
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

ECMResultsEnhanced.propTypes = {
  /**
   * The selected ECM data containing analysis results.
   */
  selectedData: PropTypes.object.isRequired,
  /**
   * Boolean indicating if the view is on a mobile device.
   */
  isMobile: PropTypes.bool.isRequired,
  /**
   * The type of analysis ('unified' or 'directional').
   */
  analysisType: PropTypes.string.isRequired,
  /**
   * The direction of analysis ('northToSouth' or 'southToNorth').
   */
  direction: PropTypes.string,
};

ECMResultsEnhanced.defaultProps = {
  direction: '',
};

export default ECMResultsEnhanced;
