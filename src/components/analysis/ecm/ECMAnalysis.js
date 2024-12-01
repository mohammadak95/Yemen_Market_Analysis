// src/components/analysis/ecm/ECMAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../../utils/appUtils';
import { useECMData, useTechnicalHelp } from '../../../hooks';
import AnalysisContainer from '../../common/AnalysisContainer';
import ChartContainer from '../../common/ChartContainer';
import ECMResults from './ECMResults';
import { analysisStyles } from '../../../styles/analysisStyles';

const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // State management
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');
  const [selectedData, setSelectedData] = useState(null);

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

  // Effect to update selected data
  useEffect(() => {
    if (analysisType === 'unified' && unifiedStatus === 'succeeded' && unifiedData) {
      const foundData = unifiedData.find(
        (item) => item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
      );
      setSelectedData(foundData || null);
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
        setSelectedData(foundData || null);
      } else {
        setSelectedData(null);
      }
    }
  }, [
    analysisType,
    unifiedStatus,
    directionalStatus,
    unifiedData,
    directionalData,
    selectedCommodity,
    direction,
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
      },
    ];

    const csv = jsonToCsv(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_ECM_Analysis.csv`);
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
        <ToggleButton value="unified">Unified ECM</ToggleButton>
        <ToggleButton value="directional">Directional ECM</ToggleButton>
      </ToggleButtonGroup>

      {analysisType === 'directional' && (
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={handleDirectionChange}
          aria-label="Direction"
          sx={styles.toggleGroup}
        >
          <ToggleButton value="northToSouth">North to South</ToggleButton>
          <ToggleButton value="southToNorth">South to North</ToggleButton>
        </ToggleButtonGroup>
      )}

      <Button
        variant="contained"
        onClick={handleDownloadCsv}
        startIcon={<DownloadIcon />}
        sx={styles.downloadButton}
        disabled={!selectedData}
      >
        Download CSV
      </Button>
    </Box>
  );

  return (
    <AnalysisContainer
      title={`ECM Analysis: ${selectedCommodity}`}
      infoTooltip={getTechnicalTooltip('main')}
      loading={unifiedStatus === 'loading' || directionalStatus === 'loading'}
      error={unifiedError || directionalError}
      controls={analysisControls}
      hasData={!!selectedData}
      selectedCommodity={selectedCommodity}
    >
      <ChartContainer>
        <ECMResults
          selectedData={selectedData}
          isMobile={isMobile}
          analysisType={analysisType}
          direction={direction}
        />
      </ChartContainer>
    </AnalysisContainer>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default ECMAnalysis;