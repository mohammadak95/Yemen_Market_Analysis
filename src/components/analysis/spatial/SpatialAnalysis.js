// src/components/analysis/spatial/SpatialAnalysis.js

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Grid,
  Typography,
  CircularProgress,
  Paper,
  Snackbar,
  Alert
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import { selectSpatialDataOptimized } from '../../../selectors/optimizedSelectors';
import { fetchRegressionAnalysis } from '../../../slices/spatialSlice';
import SpatialRegressionResults from './SpatialRegressionResults';
import SpatialMap from './SpatialMap';
import SpatialFramework from './SpatialFramework';

const SpatialAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const spatialData = useSelector(selectSpatialDataOptimized);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  React.useEffect(() => {
    // Always fetch regression analysis, even if selectedCommodity is empty
    // The selector will handle using the default commodity
    dispatch(fetchRegressionAnalysis({ selectedCommodity }));
  }, [selectedCommodity, dispatch]);

  const spatialResults = React.useMemo(() => {
    const regressionData = spatialData?.regressionAnalysis;
    
    if (!regressionData || !regressionData.residuals?.raw?.length) {
      return null;
    }

    // Don't check selectedCommodity here since the selector handles it
    return {
      coefficients: regressionData.model.coefficients || {},
      intercept: regressionData.model.intercept || 0,
      p_values: regressionData.model.p_values || {},
      moran_i: regressionData.spatial.moran_i || { I: 0, 'p-value': 1 },
      residual: regressionData.residuals.raw,
      r_squared: regressionData.model.r_squared || 0,
      adj_r_squared: regressionData.model.adj_r_squared || 0,
      mse: regressionData.model.mse || 0,
      observations: regressionData.model.observations || 0,
      regime: regressionData.metadata?.regime || 'unified',
      timestamp: regressionData.metadata?.timestamp
    };
  }, [spatialData]);

  const handleDownloadData = useCallback(() => {
    if (!spatialResults) return;
    try {
      const blob = new Blob(
        [JSON.stringify(spatialResults, null, 2)], 
        { type: 'application/json' }
      );
      saveAs(blob, `spatial_analysis_${selectedCommodity || 'beans_kidney_red'}.json`);
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
  }, [spatialResults, selectedCommodity]);

  if (!spatialResults) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (spatialData?.error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Error Loading Data</Typography>
        {spatialData.error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 4, bgcolor: 'background.paper' }}>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="flex-end">
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadData}
            >
              Download Results
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Framework Section - Moved to be right after download button */}
      <Box sx={{ mb: 3 }}>
        <SpatialFramework selectedData={spatialResults} />
      </Box>

      {/* Market Integration Analysis */}
      <Box sx={{ mb: 3 }}>
        <SpatialRegressionResults 
          results={spatialResults}
          windowWidth={windowWidth}
        />
      </Box>

      {/* Spatial Visualization */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Regional Price Patterns
        </Typography>
        <SpatialMap
          results={spatialResults}
          windowWidth={windowWidth}
        />
      </Box>

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

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired
};

export default SpatialAnalysis;
