// src/components/ecm-analysis/ECMAnalysis.js

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';
import PropTypes from 'prop-types';
import { useECMData } from '../../hooks/useECMDataHooks';
import ECMTabs from '../common/ECMTabs';
import SummaryTable from './SummaryTable';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import ResidualsChart from './ResidualsChart';
import GrangerCausalityChart from './GrangerCausalityChart';
import SpatialAutocorrelationChart from './SpatialAutocorrelationChart';

const ECMAnalysis = ({ selectedCommodity, selectedRegime }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');

  // Fetch Unified and Directional ECM Data
  const {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  } = useECMData();

  const [selectedData, setSelectedData] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAnalysisTypeChange = (event, newType) => {
    if (newType !== null) {
      setAnalysisType(newType);
      setActiveTab(0); // Reset to first tab when analysis type changes
    }
  };

  const handleDirectionChange = (event, newDirection) => {
    if (newDirection !== null) {
      setDirection(newDirection);
      setActiveTab(0); // Reset to first tab when direction changes
    }
  };

  useEffect(() => {
    if (analysisType === 'unified' && unifiedStatus === 'succeeded' && unifiedData) {
      const foundData = unifiedData.find(
        (item) => item.commodity === selectedCommodity && item.regime === selectedRegime
      );
      setSelectedData(foundData);
    } else if (analysisType === 'directional' && directionalStatus === 'succeeded' && directionalData) {
      const directionData = directionalData[direction];
      const foundData = directionData.find((item) => item.commodity === selectedCommodity);
      setSelectedData(foundData);
    }
  }, [
    analysisType,
    unifiedStatus,
    directionalStatus,
    unifiedData,
    directionalData,
    selectedCommodity,
    selectedRegime,
    direction,
  ]);

  // Loading State
  if (
    (analysisType === 'unified' && unifiedStatus === 'loading') ||
    (analysisType === 'directional' && directionalStatus === 'loading')
  ) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px" mt={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading ECM Analysis results...
        </Typography>
      </Box>
    );
  }

  // Error State
  if (
    (analysisType === 'unified' && unifiedStatus === 'failed') ||
    (analysisType === 'directional' && directionalStatus === 'failed')
  ) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography color="error">Error: {unifiedError || directionalError}</Typography>
      </Box>
    );
  }

  // No Data State
  if (!selectedData) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No data available for {selectedCommodity} in the selected analysis type.
        </Typography>
      </Box>
    );
  }

  // Debugging: Log selectedData to verify its structure
  console.log('Selected Data:', selectedData);

  // Define Tab Labels and Content Based on Analysis Type
  let tabLabels = [
    'Summary',
    'Diagnostics',
    'IRF',
    'Residuals',
    'Granger Causality',
  ];

  let tabContent = [
    <SummaryTable key="summary" data={selectedData} />,
    <DiagnosticsTable key="diagnostics" diagnostics={selectedData.diagnostics} />,
    <IRFChart key="irf" irfData={selectedData.irf} />, // Pass the correct irf array
    <ResidualsChart
      key="residuals"
      residuals={selectedData.diagnostics.Variable_1.acf}
      fittedValues={selectedData.diagnostics.Variable_1.pacf}
    />,
    <GrangerCausalityChart key="grangerCausality" grangerData={selectedData.granger_causality} />,
  ];

  // Append Spatial Autocorrelation for Unified ECM
  if (analysisType === 'unified') {
    tabLabels.push('Spatial Autocorrelation');
    tabContent.push(
      <SpatialAutocorrelationChart
        key="spatialAutocorrelation"
        spatialData={selectedData.spatial_autocorrelation}
      />
    );
  }

  return (
    <Paper elevation={3} sx={{ mt: 4 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          ECM Analysis: {selectedCommodity}
          <Tooltip title="Error Correction Model (ECM) analysis examines the short-term and long-term relationships between variables.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <ToggleButtonGroup
          value={analysisType}
          exclusive
          onChange={handleAnalysisTypeChange}
          aria-label="ECM analysis type"
          sx={{ mb: 2 }}
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
            aria-label="ECM direction"
            sx={{ ml: 2 }}
          >
            <ToggleButton value="northToSouth" aria-label="North to South">
              <NorthIcon sx={{ mr: 1 }} />
              North to South
            </ToggleButton>
            <ToggleButton value="southToNorth" aria-label="South to North">
              <SouthIcon sx={{ mr: 1 }} />
              South to North
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      <ECMTabs activeTab={activeTab} handleTabChange={handleTabChange} tabLabels={tabLabels}>
        {tabContent}
      </ECMTabs>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2">
            This ECM analysis provides insights into the relationship between commodity prices and conflict
            intensity. Key points to consider:
            <ul>
              <li>The Summary tab shows overall model fit statistics.</li>
              <li>Diagnostics tab provides tests for model assumptions.</li>
              <li>IRF shows how variables respond to shocks over time.</li>
              <li>Residuals chart helps assess model accuracy.</li>
              <li>Granger Causality examines predictive relationships.</li>
              {analysisType === 'unified' && <li>Spatial Autocorrelation indicates geographical dependencies.</li>}
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default ECMAnalysis;
