import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { selectSpatialData } from '../../../selectors/optimizedSelectors';
import SpatialRegressionResults from './SpatialRegressionResults';
import SpatialMap from './SpatialMap';
import { analysisStyles } from '../../../styles/analysisStyles';
import AnalysisContainer from '../../common/AnalysisContainer';

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  // Get spatial analysis results from Redux store
  const spatialData = useSelector(selectSpatialData);

  // Find results for selected commodity
  const spatialResults = useMemo(() => {
    if (!spatialData?.spatial_analysis_results) return null;
    
    return spatialData.spatial_analysis_results.find(
      result => result.commodity.toLowerCase() === selectedCommodity.toLowerCase()
    );
  }, [spatialData, selectedCommodity]);

  if (!spatialResults) {
    return (
      <AnalysisContainer
        title={`Spatial Analysis: ${selectedCommodity}`}
        error="No spatial analysis results available for this commodity"
        selectedCommodity={selectedCommodity}
      />
    );
  }

  return (
    <AnalysisContainer
      title={`Spatial Analysis: ${selectedCommodity}`}
      selectedCommodity={selectedCommodity}
    >
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
    </AnalysisContainer>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired
};

export default SpatialAnalysis;