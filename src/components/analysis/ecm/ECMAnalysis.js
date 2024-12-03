// src/components/analysis/ecm/ECMAnalysis.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  CircularProgress,
  Alert,
  AlertTitle,
  Typography,
  Snackbar
} from '@mui/material';
import { Download, Info } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../../utils/appUtils';
import { useTechnicalHelp } from '@/hooks';
import { useECMData } from '../../../hooks/dataHooks';
import AnalysisContainer from '../../common/AnalysisContainer';
import { analysisStyles } from '../../../styles/analysisStyles';

// Lazy load enhanced results component
const ECMResultsEnhanced = React.lazy(() => import('./ECMResultsEnhanced'));

const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // State management
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');
  const [selectedData, setSelectedData] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Custom hooks
  const {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  } = useECMData();

  const { getTechnicalTooltip } = useTechnicalHelp('ecm');

  // Determine loading and error states
  const loading = unifiedStatus === 'loading' || directionalStatus === 'loading';
  const errorMessage = unifiedError || directionalError;

  // Memoized data processing
  const processedData = useMemo(() => {
    if (loading || !selectedCommodity) return null;

    try {
      if (analysisType === 'unified' && unifiedStatus === 'succeeded' && unifiedData) {
        return unifiedData.find(
          (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
        );
      } else if (analysisType === 'directional' && directionalStatus === 'succeeded' && directionalData) {
        const directionKey = direction === 'northToSouth' ? 'northToSouth' : 'southToNorth';
        const directionData = directionalData[directionKey];
        return directionData?.find(
          (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
        );
      }
    } catch (err) {
      console.error('Error processing data:', err);
      setError(`Error processing ECM data: ${err.message}`);
    }
    return null;
  }, [analysisType, direction, selectedCommodity, unifiedData, directionalData, unifiedStatus, directionalStatus, loading]);

  // Update selected data when processed data changes
  useEffect(() => {
    setSelectedData(processedData);
  }, [processedData]);

  // Handle API errors
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: `Error: ${errorMessage}`,
        severity: 'error'
      });
    }
  }, [errorMessage]);

  // Handlers
  const handleAnalysisTypeChange = useCallback((event, newAnalysisType) => {
    if (newAnalysisType) {
      setAnalysisType(newAnalysisType);
      if (newAnalysisType === 'unified') {
        setDirection('northToSouth');
      }
    }
  }, []);

  const handleDirectionChange = useCallback((event, newDirection) => {
    if (newDirection) {
      setDirection(newDirection);
    }
  }, []);

  const handleDownloadCsv = useCallback(() => {
    if (!selectedData) return;

    try {
      const csvData = [
        {
          commodity: selectedData.commodity,
          regime: selectedData.regime,
          aic: selectedData.aic,
          bic: selectedData.bic,
          hqic: selectedData.hqic,
          alpha: selectedData.alpha,
          beta: selectedData.beta,
          gamma: selectedData.gamma,
          marketIntegrationIndex: Math.abs(selectedData.beta * selectedData.alpha),
          jarqueBeraPValue: selectedData.diagnostics?.Variable_1?.jarque_bera_pvalue,
          durbinWatsonStat: selectedData.diagnostics?.Variable_1?.durbin_watson_stat,
        },
      ];

      const csv = jsonToCsv(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = `${selectedCommodity}_ECM_Analysis_${analysisType}_${
        analysisType === 'directional' ? direction : ''
      }_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
      
      setSnackbar({
        open: true,
        message: 'Data downloaded successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error downloading CSV:', err);
      setSnackbar({
        open: true,
        message: 'Failed to download data',
        severity: 'error'
      });
    }
  }, [selectedData, selectedCommodity, analysisType, direction]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Analysis controls component
  const analysisControls = (
    <Box sx={styles.controlsContainer}>
      <ToggleButtonGroup
        value={analysisType}
        exclusive
        onChange={handleAnalysisTypeChange}
        aria-label="Analysis Type"
        sx={styles.toggleGroup}
      >
        <ToggleButton value="unified" aria-label="Unified ECM">
          Unified ECM
        </ToggleButton>
        <ToggleButton value="directional" aria-label="Directional ECM">
          Directional ECM
        </ToggleButton>
      </ToggleButtonGroup>

      {analysisType === 'directional' && (
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={handleDirectionChange}
          aria-label="Direction"
          sx={styles.toggleGroup}
        >
          <ToggleButton value="northToSouth" aria-label="North to South">
            North to South
          </ToggleButton>
          <ToggleButton value="southToNorth" aria-label="South to North">
            South to North
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      <Button
        variant="contained"
        onClick={handleDownloadCsv}
        startIcon={<Download />}
        sx={styles.downloadButton}
        disabled={!selectedData || loading}
        aria-label="Download CSV"
      >
        Download CSV
      </Button>
    </Box>
  );

  return (
    <AnalysisContainer
      title={`ECM Analysis: ${selectedCommodity}`}
      subtitle={`${analysisType === 'unified' ? 'Unified' : 'Directional'} Error Correction Model Analysis`}
      infoTooltip={getTechnicalTooltip('main')}
      loading={loading}
      error={error}
      controls={analysisControls}
      hasData={!!selectedData}
      selectedCommodity={selectedCommodity}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      ) : selectedData ? (
        <React.Suspense fallback={<CircularProgress />}>
          <ECMResultsEnhanced
            selectedData={selectedData}
            isMobile={isMobile}
            analysisType={analysisType}
            direction={direction}
          />
        </React.Suspense>
      ) : (
        <Alert severity="info">
          <AlertTitle>No Data Available</AlertTitle>
          Select a commodity and analysis type to view ECM results
        </Alert>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
      />
    </AnalysisContainer>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default React.memo(ECMAnalysis);