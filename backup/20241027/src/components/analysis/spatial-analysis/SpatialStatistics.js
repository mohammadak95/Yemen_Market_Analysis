// src/components/spatial-analysis/SpatialStatistics.js

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Tooltip,
  IconButton,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';
import {
  Info as InfoIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const SpatialStatistics = ({ analysisResults }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');
  const theme = useTheme();

  const {
    moranI,
    gearyC,
    getisOrd,
    localMoranI,
    spatialLag,
    spatialCorrelation,
  } = analysisResults.statistics || {};

  // Calculate summary statistics
  const statisticsSummary = useMemo(() => {
    if (!analysisResults.statistics) return null;

    return {
      globalAutocorrelation: {
        moranI: moranI?.value || 0,
        moranPValue: moranI?.pValue || 1,
        gearyC: gearyC?.value || 0,
        gearyPValue: gearyC?.pValue || 1,
      },
      hotspots: getisOrd?.hotspots?.length || 0,
      coldspots: getisOrd?.coldspots?.length || 0,
      significantClusters: localMoranI?.significantClusters || 0,
      spatialCorrelation: spatialCorrelation?.correlation || 0,
    };
  }, [analysisResults.statistics, moranI, gearyC, getisOrd, localMoranI, spatialCorrelation]);

  const interpretResults = useCallback((stat) => {
    if (!statisticsSummary) return { interpretation: 'Insufficient data', severity: 'info' };

    if (stat === 'moranI') {
      const value = statisticsSummary.globalAutocorrelation.moranI;
      const pValue = statisticsSummary.globalAutocorrelation.moranPValue;
      
      if (pValue >= 0.05) return {
        interpretation: 'No significant spatial autocorrelation detected',
        severity: 'info'
      };
      
      if (value > 0.3) return {
        interpretation: 'Strong positive spatial autocorrelation - similar values cluster together',
        severity: 'success'
      };
      
      if (value < -0.3) return {
        interpretation: 'Strong negative spatial autocorrelation - dissimilar values cluster together',
        severity: 'warning'
      };
      
      return {
        interpretation: 'Weak spatial autocorrelation',
        severity: 'info'
      };
    }

    if (stat === 'clustering') {
      const clusters = statisticsSummary.significantClusters;
      if (clusters > 5) return {
        interpretation: 'Strong market clustering patterns detected',
        severity: 'success'
      };
      if (clusters > 2) return {
        interpretation: 'Moderate market clustering patterns present',
        severity: 'info'
      };
      return {
        interpretation: 'Limited market clustering',
        severity: 'warning'
      };
    }

    return { interpretation: 'Insufficient data', severity: 'info' };
  }, [statisticsSummary]);

  // Early return if statisticsSummary is null
  if (!statisticsSummary) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Spatial Statistics Analysis
          <Tooltip title={getTechnicalTooltip('spatial_statistics')}>
            <IconButton size="small">
              <InfoIcon size={20} />
            </IconButton>
          </Tooltip>
        </Typography>
        <Alert severity="warning">
          <AlertTitle>Data Unavailable</AlertTitle>
          Spatial statistics data is currently unavailable. Please ensure that the analysis has been performed correctly.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Statistics Analysis
        <Tooltip title={getTechnicalTooltip('spatial_statistics')}>
          <IconButton size="small">
            <InfoIcon size={20} />
          </IconButton>
        </Tooltip>
      </Typography>

      <Grid container spacing={3}>
        {/* Global Autocorrelation */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Global Spatial Autocorrelation
                <Tooltip title={getTechnicalTooltip('global_autocorrelation')}>
                  <IconButton size="small">
                    <InfoIcon size={16} />
                  </IconButton>
                </Tooltip>
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Statistic</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">P-Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Tooltip title="Moran&apos;s I measures global spatial autocorrelation">
                          <span>Moran&apos;s I</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {statisticsSummary.globalAutocorrelation.moranI.toFixed(3)}
                      </TableCell>
                      <TableCell align="right">
                        {statisticsSummary.globalAutocorrelation.moranPValue.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Tooltip title="Geary&apos;s C is an alternative measure of spatial autocorrelation">
                          <span>Geary&apos;s C</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {statisticsSummary.globalAutocorrelation.gearyC.toFixed(3)}
                      </TableCell>
                      <TableCell align="right">
                        {statisticsSummary.globalAutocorrelation.gearyPValue.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert 
                severity={interpretResults('moranI').severity}
                sx={{ mt: 2 }}
              >
                {interpretResults('moranI').interpretation}
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Hot Spots Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Hot Spot Analysis
                <Tooltip title={getTechnicalTooltip('hotspot_analysis')}>
                  <IconButton size="small">
                    <InfoIcon size={16} />
                  </IconButton>
                </Tooltip>
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Getis-Ord Gi* Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        textAlign: 'center',
                        bgcolor: 'error.light',
                      }}
                    >
                      <Typography variant="h6">
                        {statisticsSummary.hotspots}
                      </Typography>
                      <Typography variant="caption">
                        Hot Spots
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1,
                        textAlign: 'center',
                        bgcolor: 'info.light',
                      }}
                    >
                      <Typography variant="h6">
                        {statisticsSummary.coldspots}
                      </Typography>
                      <Typography variant="caption">
                        Cold Spots
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="body2" paragraph>
                <strong>Interpretation:</strong> {
                  statisticsSummary.hotspots + statisticsSummary.coldspots > 5
                    ? 'Significant spatial clustering of high and low values detected.'
                    : 'Limited evidence of spatial clustering.'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Local Indicators */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Local Spatial Association
                <Tooltip title={getTechnicalTooltip('local_association')}>
                  <IconButton size="small">
                    <InfoIcon size={16} />
                  </IconButton>
                </Tooltip>
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Local Moran&apos;s I Statistics:
                </Typography>
                <BlockMath>
                  {`I_i = z_i \\sum_{j=1}^n w_{ij}z_j`}
                </BlockMath>
                <Typography variant="body2" color="text.secondary">
                  Where <InlineMath>z_i</InlineMath> and <InlineMath>z_j</InlineMath> are 
                  standardized values and <InlineMath>{'w_{ij}'}</InlineMath> is the spatial weight.
                </Typography>
              </Box>

              <Alert 
                severity={interpretResults('clustering').severity}
                sx={{ mt: 2 }}
              >
                {interpretResults('clustering').interpretation}
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Spatial Correlation */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Spatial Price Correlation
                <Tooltip title={getTechnicalTooltip('spatial_correlation')}>
                  <IconButton size="small">
                    <InfoIcon size={16} />
                  </IconButton>
                </Tooltip>
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h4">
                  {Math.abs(statisticsSummary.spatialCorrelation).toFixed(2)}
                </Typography>
                {statisticsSummary.spatialCorrelation > 0 ? (
                  <TrendingUp color={theme.palette.success.main} size={24} />
                ) : (
                  <TrendingDown color={theme.palette.error.main} size={24} />
                )}
              </Box>

              <Typography variant="body2" paragraph>
                <strong>Distance Decay Effect:</strong> {
                  Math.abs(statisticsSummary.spatialCorrelation) > 0.7
                    ? 'Strong spatial price relationships with significant distance effects'
                    : Math.abs(statisticsSummary.spatialCorrelation) > 0.3
                    ? 'Moderate spatial price relationships with noticeable distance effects'
                    : 'Weak spatial price relationships with limited distance effects'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Spatial Regression Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Spatial Regression Analysis
                <Tooltip title={getTechnicalTooltip('spatial_regression')}>
                  <IconButton size="small">
                    <InfoIcon size={16} />
                  </IconButton>
                </Tooltip>
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Variable</TableCell>
                          <TableCell align="right">Coefficient</TableCell>
                          <TableCell align="right">P-Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {spatialLag?.coefficients?.map((coef, index) => (
                          <TableRow key={index}>
                            <TableCell>{coef.variable}</TableCell>
                            <TableCell align="right">{coef.value.toFixed(3)}</TableCell>
                            <TableCell align="right">{coef.pValue.toFixed(3)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    <AlertTitle>Model Diagnostics</AlertTitle>
                    <Typography variant="body2">
                      R² (pseudo): {spatialLag?.rSquared.toFixed(3)}<br />
                      Log Likelihood: {spatialLag?.logLikelihood.toFixed(3)}<br />
                      AIC: {spatialLag?.aic.toFixed(3)}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

SpatialStatistics.propTypes = {
  analysisResults: PropTypes.shape({
    statistics: PropTypes.shape({
      moranI: PropTypes.shape({
        value: PropTypes.number,
        pValue: PropTypes.number,
      }),
      gearyC: PropTypes.shape({
        value: PropTypes.number,
        pValue: PropTypes.number,
      }),
      getisOrd: PropTypes.shape({
        hotspots: PropTypes.array,
        coldspots: PropTypes.array,
      }),
      localMoranI: PropTypes.shape({
        significantClusters: PropTypes.number,
      }),
      spatialCorrelation: PropTypes.shape({
        correlation: PropTypes.number,
      }),
      spatialLag: PropTypes.shape({
        coefficients: PropTypes.arrayOf(PropTypes.shape({
          variable: PropTypes.string,
          value: PropTypes.number,
          pValue: PropTypes.number,
        })),
        rSquared: PropTypes.number,
        logLikelihood: PropTypes.number,
        aic: PropTypes.number,
      }),
    }).isRequired,
  }).isRequired,
  // Removed selectedCommodity and isMobile from propTypes
};

export default React.memo(SpatialStatistics);