// src/components/analysis/ecm/ECMAnalysis.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  Button,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../../utils/appUtils';
import { useECMData } from '@/hooks';;

import ECMResults from './ECMResults';
import ECMTutorial from './ECMTutorial';
import { useTechnicalHelp } from '@/hooks';;

/**
 * ECMAnalysis Component
 * 
 * @param {string} selectedCommodity - The commodity selected by the user for analysis.
 * @param {number} windowWidth - The current width of the browser window for responsive design.
 */
const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  // State for analysis type and direction
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');

  // Fetch ECM data using custom hook
  const {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  } = useECMData();

  const { getTechnicalTooltip } = useTechnicalHelp('ecm');

  // State to hold the selected data based on commodity and analysis type
  const [selectedData, setSelectedData] = useState(null);

  /**
   * Effect to update selectedData whenever analysisType, direction, or data changes.
   */
  useEffect(() => {
    if (analysisType === 'unified' && unifiedStatus === 'succeeded' && unifiedData) {
      const foundData = unifiedData.find(
        (item) =>
          item.commodity.toLowerCase() === selectedCommodity.toLowerCase()
      );
      setSelectedData(foundData || null);
    } else if (analysisType === 'directional' && directionalStatus === 'succeeded' && directionalData) {
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

  /**
   * Function to handle CSV download of the selected ECM data.
   */
  const handleDownloadCsv = () => {
    if (!selectedData) return;

    // Prepare data for CSV. Ensure that alpha, beta, gamma are included.
    const {
      commodity,
      regime,
      aic,
      bic,
      hqic,
      alpha,
      beta,
      gamma,
      // Include other fields as necessary
      // For example, diagnostics, irf, etc., can be nested or flattened based on jsonToCsv implementation
    } = selectedData;

    const csvData = [{
      commodity,
      regime,
      aic,
      bic,
      hqic,
      alpha,
      beta,
      gamma,
      // Add other fields as needed
    }];

    const csv = jsonToCsv(csvData); // Ensure jsonToCsv can handle nested objects or adjust accordingly
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_ECM_Analysis.csv`);
  };

  /**
   * Handler for changing the analysis type (unified or directional).
   */
  const handleAnalysisTypeChange = (event, newAnalysisType) => {
    if (newAnalysisType) {
      setAnalysisType(newAnalysisType);
      // Reset direction when switching to unified
      if (newAnalysisType === 'unified') {
        setDirection('northToSouth'); // Default direction or maintain previous state
      }
    }
  };

  /**
   * Handler for changing the direction in directional analysis.
   */
  const handleDirectionChange = (event, newDirection) => {
    if (newDirection) {
      setDirection(newDirection);
    }
  };

  /**
   * Conditional rendering based on data fetching status and availability.
   */
  if (unifiedStatus === 'loading' || directionalStatus === 'loading') {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px" mt={4}>
        <CircularProgress size={60} />
        <Typography variant="body1" sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}>
          Loading ECM Analysis results...
        </Typography>
      </Box>
    );
  }

  if (unifiedStatus === 'failed' || directionalStatus === 'failed') {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography variant="h6" color="error">
          Error: {unifiedError || directionalError}
        </Typography>
      </Box>
    );
  }

  if (!selectedData) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography variant="h6">
          No data available for <strong>{selectedCommodity}</strong> in the selected analysis type.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: { xs: 2, sm: 4 },
        p: { xs: 1, sm: 2 },
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            mb: 2,
          }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            sx={{
              fontWeight: 'bold',
              fontSize: isMobile ? '1.5rem' : '2rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ECM Analysis: {selectedCommodity}
            <Tooltip title={getTechnicalTooltip('main')}>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDownloadCsv}
            startIcon={<DownloadIcon />}
            sx={{ mt: isMobile ? 2 : 0 }}
          >
            Download CSV
          </Button>
        </Box>

        {/* Analysis Type Selection */}
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={analysisType}
            exclusive
            onChange={handleAnalysisTypeChange}
            aria-label="Analysis Type"
          >
            <ToggleButton value="unified" aria-label="Unified">
              Unified ECM
            </ToggleButton>
            <ToggleButton value="directional" aria-label="Directional">
              Directional ECM
            </ToggleButton>
          </ToggleButtonGroup>
          {analysisType === 'directional' && (
            <ToggleButtonGroup
              value={direction}
              exclusive
              onChange={handleDirectionChange}
              aria-label="Direction"
              sx={{ mt: 1 }}
            >
              <ToggleButton value="northToSouth" aria-label="North to South">
                North to South
              </ToggleButton>
              <ToggleButton value="southToNorth" aria-label="South to North">
                South to North
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        {/* Tutorial Link */}
        <ECMTutorial />

        <Divider sx={{ my: 2 }} />

        {/* ECM Results */}
        <ECMResults
          selectedData={selectedData}
          isMobile={isMobile}
          analysisType={analysisType}
          direction={direction}
        />
      </Box>
    </Paper>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default ECMAnalysis;
