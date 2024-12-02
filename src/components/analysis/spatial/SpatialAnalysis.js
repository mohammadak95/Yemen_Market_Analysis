// src/components/analysis/spatial/SpatialAnalysis.js

import React, { useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import { selectSpatialDataOptimized } from '../../../selectors/optimizedSelectors';
import { fetchRegressionAnalysis } from '../../../slices/spatialSlice';
import SpatialRegressionResults from './SpatialRegressionResults';
import SpatialMap from './SpatialMap';
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

  // Get spatial analysis results from Redux store
  const spatialData = useSelector(selectSpatialDataOptimized);

  useEffect(() => {
    if (selectedCommodity) {
      dispatch(fetchRegressionAnalysis({ selectedCommodity }));
    }
  }, [selectedCommodity, dispatch]);

  // Process regression data for the selected commodity
  const spatialResults = useMemo(() => {
    const regressionData = spatialData?.regressionAnalysis;
    if (!regressionData || regressionData.metadata?.commodity !== selectedCommodity) {
      return null;
    }

    return {
      // Model coefficients and statistics
      coefficients: regressionData.model.coefficients || {},
      intercept: regressionData.model.intercept || 0,
      p_values: regressionData.model.p_values || {},
      r_squared: regressionData.model.r_squared || 0,
      adj_r_squared: regressionData.model.adj_r_squared || 0,
      mse: regressionData.model.mse || 0,
      observations: regressionData.model.observations || 0,

      // Spatial statistics
      moran_i: regressionData.spatial.moran_i || { I: 0, 'p-value': 1 },
      vif: regressionData.spatial.vif || [],

      // Residuals data
      residual: regressionData.residuals.raw || [],
      residualStats: {
        mean: regressionData.residuals.stats?.mean || 0,
        variance: regressionData.residuals.stats?.variance || 0,
        maxAbsolute: regressionData.residuals.stats?.maxAbsolute || 0
      },

      // Metadata
      regime: regressionData.metadata?.regime || 'unified',
      timestamp: regressionData.metadata?.timestamp,

      // Additional model statistics
      f_statistic: regressionData.model.f_statistic,
      spillover_effects: regressionData.model.spillover_effects || {},

      // Summary statistics for UI
      summary: {
        totalObservations: regressionData.model.observations || 0,
        rSquared: regressionData.model.r_squared || 0,
        adjustedRSquared: regressionData.model.adj_r_squared || 0,
        spatialDependence: {
          moranI: regressionData.spatial.moran_i?.I || 0,
          pValue: regressionData.spatial.moran_i?.['p-value'] || 1
        },
        coefficients: regressionData.model.coefficients || {},
        interceptValue: regressionData.model.intercept || 0
      }
    };
  }, [spatialData, selectedCommodity]);

  const title = mode === 'model' 
    ? `Spatial Model: ${selectedCommodity}`
    : `Spatial Analysis: ${selectedCommodity}`;

  if (!spatialResults) {
    return (
      <AnalysisContainer
        title={title}
        error="No spatial analysis results available for this commodity"
        selectedCommodity={selectedCommodity}
      />
    );
  }

  const renderModelContent = () => (
    <Box sx={styles.root}>
      <Grid container spacing={3}>
        {/* Model Overview */}
        <Grid item xs={12}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Spatial Model Parameters ({spatialResults.regime})
            </Typography>
            <Typography variant="body2" paragraph>
              Spatial Lag Coefficient: {spatialResults.coefficients.spatial_lag_price?.toFixed(4)}
            </Typography>
            <Typography variant="body2" paragraph>
              R-squared: {spatialResults.summary.rSquared?.toFixed(4)}
            </Typography>
            <Typography variant="body2">
              Total Observations: {spatialResults.summary.totalObservations}
            </Typography>
          </Box>
        </Grid>

        {/* Statistical Results Panel */}
        <Grid item xs={12}>
          <SpatialRegressionResults 
            results={spatialResults}
            windowWidth={windowWidth}
            mode="model"
          />
        </Grid>

        {/* Map Visualization Panel */}
        <Grid item xs={12}>
          <SpatialMap
            results={spatialResults}
            windowWidth={windowWidth}
            mode="model"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderAnalysisContent = () => (
    <Box sx={styles.root}>
      <Grid container spacing={3}>
        {/* Statistical Results Panel */}
        <Grid item xs={12}>
          <SpatialRegressionResults 
            results={spatialResults}
            windowWidth={windowWidth}
          />
        </Grid>

        {/* Map Visualization Panel */}
        <Grid item xs={12}>
          <SpatialMap
            results={spatialResults}
            windowWidth={windowWidth}
          />
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <AnalysisContainer
      title={title}
      selectedCommodity={selectedCommodity}
    >
      {mode === 'model' ? renderModelContent() : renderAnalysisContent()}
    </AnalysisContainer>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
  mode: PropTypes.oneOf(['analysis', 'model'])
};

export default SpatialAnalysis;
