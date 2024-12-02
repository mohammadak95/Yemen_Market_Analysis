// src/components/analysis/ecm/ECMAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
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
  Chip,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../../utils/appUtils';
import { useTechnicalHelp } from '@/hooks';
import {useECMData} from '../../../hooks';
import { selectGeoJSON, fetchAllSpatialData } from '../../../slices/spatialSlice';
import AnalysisContainer from '../../common/AnalysisContainer';
import ECMResultsEnhanced from './ECMResultsEnhanced';
import { analysisStyles } from '../../../styles/analysisStyles';

const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;
  const dispatch = useDispatch();

  // State management
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');
  const [selectedData, setSelectedData] = useState(null);

  // Redux selectors
  const geoJSON = useSelector(selectGeoJSON);

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
  const error = unifiedError || directionalError;

  // Initialize spatial data when component mounts
  useEffect(() => {
    dispatch(fetchAllSpatialData({ commodity: selectedCommodity }));
  }, [dispatch, selectedCommodity]);

  // Update selected data when analysis type, direction, or selected commodity changes
  useEffect(() => {
    if (loading || !geoJSON) return;

    setSelectedData(null);
    try {
      if (analysisType === 'unified' && unifiedStatus === 'succeeded' && unifiedData) {
        const foundData = unifiedData.find(
          (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
        );
        if (foundData) {
          // Merge GeoJSON with the found data
          setSelectedData({
            ...foundData,
            geoJson: geoJSON // Add GeoJSON from Redux store
          });
        } else {
          setSelectedData(null);
        }
      } else if (
        analysisType === 'directional' &&
        directionalStatus === 'succeeded' &&
        directionalData
      ) {
        const directionKey = direction === 'northToSouth' ? 'northToSouth' : 'southToNorth';
        const directionData = directionalData[directionKey];
        if (directionData) {
          const foundData = directionData.find(
            (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
          );
          if (foundData) {
            // Merge GeoJSON with the found data
            setSelectedData({
              ...foundData,
              geoJson: geoJSON // Add GeoJSON from Redux store
            });
          } else {
            setSelectedData(null);
          }
        } else {
          setSelectedData(null);
        }
      }
    } catch (err) {
      console.error('Error updating selected data:', err);
    }
  }, [
    analysisType,
    direction,
    selectedCommodity,
    unifiedData,
    unifiedStatus,
    directionalData,
    directionalStatus,
    loading,
    geoJSON, // Add geoJSON as dependency
  ]);

  // Handlers
  const handleAnalysisTypeChange = (event, newAnalysisType) => {
    if (newAnalysisType) {
      setAnalysisType(newAnalysisType);
      if (newAnalysisType === 'unified') {
        setDirection('northToSouth');
      }
    }
  };

  const handleDirectionChange = (event, newDirection) => {
    if (newDirection) {
      setDirection(newDirection);
    }
  };

  const handleDownloadCsv = () => {
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
          moranI: selectedData.spatial_autocorrelation?.Variable_1?.Moran_I,
          moranPValue: selectedData.spatial_autocorrelation?.Variable_1?.Moran_p_value,
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
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

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
        <ToggleButton value="unified">{'Unified ECM'}</ToggleButton>
        <ToggleButton value="directional">{'Directional ECM'}</ToggleButton>
      </ToggleButtonGroup>

      {analysisType === 'directional' && (
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={handleDirectionChange}
          aria-label="Direction"
          sx={styles.toggleGroup}
        >
          <ToggleButton value="northToSouth">{'North to South'}</ToggleButton>
          <ToggleButton value="southToNorth">{'South to North'}</ToggleButton>
        </ToggleButtonGroup>
      )}

      <Button
        variant="contained"
        onClick={handleDownloadCsv}
        startIcon={<DownloadIcon />}
        sx={styles.downloadButton}
        disabled={!selectedData || loading}
      >
        {'Download CSV'}
      </Button>
    </Box>
  );

  // Key model quality indicator
  const modelQualityChip =
    selectedData?.diagnostics?.Variable_1?.jarque_bera_pvalue > 0.05
      ? { label: 'Model Quality: Good', color: 'success' }
      : { label: 'Model Quality: Check Residuals', color: 'warning' };

  return (
    <AnalysisContainer
      title={`ECM Analysis: ${selectedCommodity}`}
      subtitle={`${
        analysisType === 'unified' ? 'Unified' : 'Directional'
      } Error Correction Model Analysis`}
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
          <AlertTitle>{'Error'}</AlertTitle>
          {error}
        </Alert>
      ) : selectedData ? (
        <>
          <Box sx={styles.executiveSummary}>
            <Typography variant="h5" gutterBottom>
              {' '}
            </Typography>
            <Typography variant="body1">
              {`The ECM analysis for ${selectedCommodity} indicates that there is ${
                selectedData.beta > 0.8
                  ? 'a strong'
                  : selectedData.beta > 0.3
                  ? 'a moderate'
                  : 'a weak'
              } long-run relationship between markets, with an adjustment speed of ${
                Math.abs(selectedData.alpha) > 0.5
                  ? 'rapid convergence to equilibrium.'
                  : 'slow convergence to equilibrium.'
              }`}
            </Typography>
            <Chip 
              label={modelQualityChip.label} 
              color={modelQualityChip.color} 
              sx={{ mt: 2 }} 
            />
          </Box>

          <ECMResultsEnhanced
            selectedData={selectedData}
            isMobile={isMobile}
            analysisType={analysisType}
            direction={direction}
          />
        </>
      ) : (
        <Alert severity="info">
          <AlertTitle>{'No Data Available'}</AlertTitle>
          {`No ECM data available for ${selectedCommodity} in ${
            analysisType === 'unified'
              ? 'Unified Analysis'
              : `Directional Analysis (${direction})`
          }.`}
        </Alert>
      )}
    </AnalysisContainer>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default ECMAnalysis;
