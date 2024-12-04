// src/components/analysis/spatial/SpatialAnalysis.js

import React, { useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Typography, CircularProgress, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { selectSpatialDataOptimized } from '../../../selectors/optimizedSelectors';
import { fetchRegressionAnalysis } from '../../../slices/spatialSlice';
import SpatialRegressionResults from './SpatialRegressionResults';
import SpatialMap from './SpatialMap';
import SpatialFramework from './SpatialFramework';
import { analysisStyles } from '../../../styles/analysisStyles';
import AnalysisContainer from '../../common/AnalysisContainer';

const SpatialAnalysis = ({ 
  selectedCommodity, 
  windowWidth, 
  mode = 'analysis'
}) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const dispatch = useDispatch();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // Get spatial analysis results from Redux store
  const spatialData = useSelector(selectSpatialDataOptimized);

  // Fetch regression analysis when component mounts or commodity changes
  useEffect(() => {
    if (selectedCommodity) {
      dispatch(fetchRegressionAnalysis({ selectedCommodity }));
    }
  }, [selectedCommodity, dispatch]);

  // Process regression data for the selected commodity
  const spatialResults = useMemo(() => {
    const regressionData = spatialData?.regressionAnalysis;
    
    if (!regressionData || 
        !selectedCommodity || 
        regressionData.metadata?.commodity !== selectedCommodity ||
        !regressionData.residuals?.raw?.length) {
      return null;
    }

    return {
      // Model parameters
      coefficients: regressionData.model.coefficients || {},
      intercept: regressionData.model.intercept || 0,
      p_values: regressionData.model.p_values || {},
      
      // Model fit statistics
      r_squared: regressionData.model.r_squared || 0,
      adj_r_squared: regressionData.model.adj_r_squared || 0,
      mse: regressionData.model.mse || 0,
      observations: regressionData.model.observations || 0,

      // Spatial statistics
      moran_i: regressionData.spatial.moran_i || { I: 0, 'p-value': 1 },
      vif: regressionData.spatial.vif || [],

      // Residuals analysis
      residual: regressionData.residuals.raw,
      residualStats: {
        mean: regressionData.residuals.stats?.mean || 0,
        variance: regressionData.residuals.stats?.variance || 0,
        maxAbsolute: regressionData.residuals.stats?.maxAbsolute || 0
      },

      // Market integration metrics
      marketIntegration: {
        globalIndex: regressionData.spatial.moran_i?.I || 0,
        localClusters: regressionData.spatialAnalysis?.clusters || [],
        spilloverEffects: regressionData.model.spillover_effects || {}
      },

      // Metadata
      regime: regressionData.metadata?.regime || 'unified',
      timestamp: regressionData.metadata?.timestamp
    };
  }, [spatialData, selectedCommodity]);

  if (!spatialResults) {
    return (
      <AnalysisContainer title={`Spatial Analysis: ${selectedCommodity}`}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </AnalysisContainer>
    );
  }

  return (
    <AnalysisContainer title={`Spatial Analysis: ${selectedCommodity}`}>
      <Box sx={styles.root}>
        <Grid container spacing={3}>
          {/* Key Parameters Panel */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Market Integration Parameters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
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
                      ρ = {spatialResults.coefficients.spatial_lag_price?.toFixed(4)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Spatial Price Transmission
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
                      Measures strength of price co-movement across regions
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
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
                      I = {spatialResults.moran_i.I.toFixed(4)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Global Market Integration
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
                      Moran's I index of spatial autocorrelation
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
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
                      R² = {(spatialResults.r_squared * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Model Explanatory Power
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
                      Percentage of price variation explained by spatial factors
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
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
                      n = {spatialResults.observations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sample Coverage
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
                      Total market-month observations
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Spatial Framework */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Spatial Analysis Framework</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <SpatialFramework selectedData={spatialResults} />
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Statistical Results Panel */}
          <Grid item xs={12}>
            <SpatialRegressionResults 
              results={spatialResults}
              windowWidth={windowWidth}
            />
          </Grid>

          {/* Map Visualization Panel */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Spatial Market Integration Map
              </Typography>
              <Box sx={{ height: isMobile ? 400 : 600 }}>
                <SpatialMap
                  results={spatialResults}
                  windowWidth={windowWidth}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AnalysisContainer>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
  mode: PropTypes.oneOf(['analysis', 'model'])
};

export default SpatialAnalysis;
