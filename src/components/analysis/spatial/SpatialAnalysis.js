//src/components/analysis/spatial/SpatialAnalysis.js

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

const SpatialAnalysis = ({ selectedCommodity, windowWidth, mode = 'analysis' }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const dispatch = useDispatch();

  // Get spatial analysis results from Redux store
  const spatialData = useSelector(selectSpatialDataOptimized);

  // Fetch regression data when commodity changes
  useEffect(() => {
    if (selectedCommodity) {
      dispatch(fetchRegressionAnalysis({ selectedCommodity }));
    }
  }, [selectedCommodity, dispatch]);

  // Find results for selected commodity with proper null checking
  const spatialResults = useMemo(() => {
    // Get regression analysis data
    const regressionData = spatialData?.regressionAnalysis;
    if (!regressionData || regressionData.metadata?.commodity !== selectedCommodity) {
      return null;
    }

    return {
      coefficients: regressionData.model.coefficients,
      residual: regressionData.residuals.raw,
      moran_i: regressionData.spatial.moran_i,
      r_squared: regressionData.model.r_squared,
      adj_r_squared: regressionData.model.adj_r_squared,
      observations: regressionData.model.observations,
      mse: regressionData.model.mse,
      // Group residuals by region for efficient access
      residualsByRegion: regressionData.residuals.byRegion || {},
      // Calculate summary statistics
      summary: {
        totalObservations: regressionData.model.observations,
        rSquared: regressionData.model.r_squared,
        adjustedRSquared: regressionData.model.adj_r_squared,
        spatialDependence: {
          moranI: regressionData.spatial.moran_i.I,
          pValue: regressionData.spatial.moran_i['p-value']
        },
        coefficients: regressionData.model.coefficients,
        interceptValue: regressionData.model.intercept
      }
    };
  }, [spatialData, selectedCommodity]);

  // Determine title based on mode
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

  // Render model-specific content
  const renderModelContent = () => (
    <Box sx={styles.root}>
      <Grid container spacing={3}>
        {/* Model Parameters and Diagnostics */}
        <Grid item xs={12}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Spatial Model Parameters
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
        <Grid item xs={12} md={6}>
          <SpatialRegressionResults 
            results={spatialResults}
            windowWidth={windowWidth}
            mode="model"
          />
        </Grid>

        {/* Map Visualization Panel */}
        <Grid item xs={12} md={6}>
          <SpatialMap
            results={spatialResults}
            windowWidth={windowWidth}
            mode="model"
          />
        </Grid>

        {/* Additional Model Diagnostics */}
        <Grid item xs={12}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Model Diagnostics
            </Typography>
            <Typography variant="body2" paragraph>
              Moran's I: {spatialResults.summary.spatialDependence.moranI?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2" paragraph>
              P-value: {spatialResults.summary.spatialDependence.pValue?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2">
              MSE: {spatialResults.mse?.toFixed(4) || 'N/A'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  // Render analysis-specific content
  const renderAnalysisContent = () => (
    <Box sx={styles.root}>
      <Grid container spacing={3}>
        {/* Statistical Results Panel */}
        <Grid item xs={12} md={6}>
          <SpatialRegressionResults 
            results={spatialResults}
            windowWidth={windowWidth}
          />
        </Grid>

        {/* Map Visualization Panel */}
        <Grid item xs={12} md={6}>
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
