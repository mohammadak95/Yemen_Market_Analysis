import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { selectSpatialDataOptimized } from '../../../selectors/optimizedSelectors';
import SpatialRegressionResults from './SpatialRegressionResults';
import SpatialMap from './SpatialMap';
import { analysisStyles } from '../../../styles/analysisStyles';
import AnalysisContainer from '../../common/AnalysisContainer';

const SpatialAnalysis = ({ selectedCommodity, windowWidth, mode = 'analysis' }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  // Get spatial analysis results from Redux store
  const spatialData = useSelector(selectSpatialDataOptimized);

  // Find results for selected commodity
  const spatialResults = useMemo(() => {
    if (!spatialData?.spatial_analysis_results) return null;
    
    return spatialData.spatial_analysis_results.find(
      result => result.commodity.toLowerCase() === selectedCommodity.toLowerCase()
    );
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
              Spatial Weight Matrix Type: Queen Contiguity
            </Typography>
            <Typography variant="body2" paragraph>
              Model Type: Spatial Durbin Model (SDM)
            </Typography>
            {/* Add more model parameters as needed */}
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

        {/* Enhanced Map Visualization Panel */}
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
              Moran's I: {spatialResults.morans_i?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2" paragraph>
              Geary's C: {spatialResults.gearys_c?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2">
              Log Likelihood: {spatialResults.log_likelihood?.toFixed(4) || 'N/A'}
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
