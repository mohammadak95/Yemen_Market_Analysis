// src/components/ecm-analysis/ECMAnalysis.js

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tooltip as MuiTooltip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PropTypes from 'prop-types';
import { useECMData } from '../../hooks/useECMData';
import ECMTabs from '../common/ECMTabs';
import ECMKeyInsights from './ECMKeyInsights';
import SummaryTable from './SummaryTable';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import ResidualsChart from './ResidualsChart';
import GrangerCausalityChart from './GrangerCausalityChart';
import SpatialAutocorrelationChart from './SpatialAutocorrelationChart';
import { saveAs } from 'file-saver';
import ECMTutorial from './ECMTutorial';
import { useTheme } from '@mui/material/styles';
import { jsonToCsv } from '../../utils/jsonToCsv';

const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const [activeTab, setActiveTab] = useState(0);
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');

  const unifiedRegime = 'unified';

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
      setActiveTab(0);
    }
  };

  const handleDirectionChange = (event, newDirection) => {
    if (newDirection !== null) {
      setDirection(newDirection);
      setActiveTab(0);
    }
  };

  useEffect(() => {
    if (analysisType === 'unified' && unifiedStatus === 'succeeded' && unifiedData) {
      const foundData = unifiedData.find(
        (item) =>
          item.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
          item.regime === unifiedRegime
      );
      setSelectedData(foundData);
    } else if (analysisType === 'directional' && directionalStatus === 'succeeded' && directionalData) {
      const directionData = directionalData[direction];
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
    unifiedRegime,
  ]);

  const handleDownloadCsv = () => {
    if (!selectedData) {
      console.warn('No ECM data available to download.');
      return;
    }

    const dataToDownload = {
      Summary: {
        AIC: selectedData.regression_results?.aic?.toFixed(2) || 'N/A',
        BIC: selectedData.regression_results?.bic?.toFixed(2) || 'N/A',
        HQIC: selectedData.regression_results?.hqic?.toFixed(2) || 'N/A',
        Alpha: selectedData.regression_results?.alpha?.toFixed(4) || 'N/A',
        Beta: selectedData.regression_results?.beta?.toFixed(4) || 'N/A',
        Gamma: selectedData.regression_results?.gamma?.toFixed(4) || 'N/A',
      },
      Diagnostics: selectedData.diagnostics,
      IRF: selectedData.irf,
      Residuals: selectedData.residuals,
      RegressionResults: selectedData.regression_results,
      GrangerCausality: selectedData.granger_causality,
      SpatialAutocorrelation: selectedData.spatial_autocorrelation,
    };

    const csv = jsonToCsv([dataToDownload]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedCommodity}_ECM_Analysis.csv`);
  };

  if (
    (analysisType === 'unified' && unifiedStatus === 'loading') ||
    (analysisType === 'directional' && directionalStatus === 'loading')
  ) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        minHeight="200px"
        mt={4}
      >
        <CircularProgress size={60} />
        <Typography
          variant="body1"
          sx={{ mt: 2, fontSize: isMobile ? '1rem' : '1.2rem' }}
        >
          Loading ECM Analysis results...
        </Typography>
      </Box>
    );
  }

  if (
    (analysisType === 'unified' && unifiedStatus === 'failed') ||
    (analysisType === 'directional' && directionalStatus === 'failed')
  ) {
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

  let tabLabels = ['Summary', 'Diagnostics', 'IRF', 'Residuals', 'Granger Causality'];
  let tabContent = [
    <SummaryTable key="summary" data={selectedData} isMobile={isMobile} />,
    <DiagnosticsTable key="diagnostics" diagnostics={selectedData.diagnostics} isMobile={isMobile} />,
    <IRFChart key="irf" irfData={selectedData.irf} isMobile={isMobile} />,
    <ResidualsChart
      key="residuals"
      residuals={selectedData.residuals}
      fittedValues={selectedData.fitted_values}
      isMobile={isMobile}
    />,
    <GrangerCausalityChart key="grangerCausality" grangerData={selectedData.granger_causality} isMobile={isMobile} />,
  ];

  if (analysisType === 'unified' && selectedData.spatial_autocorrelation) {
    tabLabels.push('Spatial Autocorrelation');
    tabContent.push(
      <SpatialAutocorrelationChart
        key="spatialAutocorrelation"
        spatialData={selectedData.spatial_autocorrelation}
        isMobile={isMobile}
      />
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
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          gutterBottom
          sx={{
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            fontSize: isMobile ? '1.5rem' : '2rem',
          }}
        >
          ECM Analysis: {selectedCommodity}
          <MuiTooltip title="Error Correction Model (ECM) analysis examines the short-term and long-term relationships between variables.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize={isMobile ? 'medium' : 'large'} />
            </IconButton>
          </MuiTooltip>
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <ToggleButtonGroup
            value={analysisType}
            exclusive
            onChange={handleAnalysisTypeChange}
            aria-label="ECM analysis type"
            size="small"
            sx={{
              minHeight: '32px',
            }}
          >
            <ToggleButton
              value="unified"
              aria-label="Unified ECM"
              sx={{
                fontSize: '0.8rem',
                padding: '4px 8px',
              }}
            >
              Unified ECM
            </ToggleButton>
            <ToggleButton
              value="directional"
              aria-label="Directional ECM"
              sx={{
                fontSize: '0.8rem',
                padding: '4px 8px',
              }}
            >
              Directional ECM
            </ToggleButton>
          </ToggleButtonGroup>
          {analysisType === 'directional' && (
            <ToggleButtonGroup
              value={direction}
              exclusive
              onChange={handleDirectionChange}
              aria-label="ECM direction"
              size="small"
              sx={{
                minHeight: '32px',
              }}
            >
              <ToggleButton
                value="northToSouth"
                aria-label="North to South"
                sx={{
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                }}
              >
                <NorthIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                North to South
              </ToggleButton>
              <ToggleButton
                value="southToNorth"
                aria-label="South to North"
                sx={{
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                }}
              >
                <SouthIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                South to North
              </ToggleButton>
            </ToggleButtonGroup>
          )}
  
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsv}
            size="medium"
            sx={{
              minWidth: '140px',
              height: '36px',
              fontSize: '0.9rem',
              padding: '6px 16px',
            }}
          >
            Download CSV
          </Button>
        </Box>
  
        <ECMTutorial />
      </Box>

      <ECMKeyInsights selectedData={selectedData} />
      
      <Box sx={{ overflowX: 'auto' }}>
        <ECMTabs
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          tabLabels={tabLabels}
          isMobile={isMobile}
        >
          {tabContent}
        </ECMTabs>
      </Box>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
            This ECM analysis provides insights into the relationship between commodity prices and conflict
            intensity. Key points to consider:
            <ul>
              <li>
                The <strong>Key Insights</strong> section provides a quick overview of the main findings.
              </li>
              <li>
                The <strong>Summary</strong> tab shows overall model fit statistics.
              </li>
              <li>
                The <strong>Diagnostics</strong> tab provides tests for model assumptions.
              </li>
              <li>
                The <strong>IRF</strong> tab shows how variables respond to shocks over time.
              </li>
              <li>
                The <strong>Residuals</strong> chart helps assess model accuracy.
              </li>
              <li>
                The <strong>Granger Causality</strong> examines predictive relationships.
              </li>
              {analysisType === 'unified' && selectedData?.spatial_autocorrelation && (
                <li>
                  The <strong>Spatial Autocorrelation</strong> tab indicates geographical dependencies.
                </li>
              )}
            </ul>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default ECMAnalysis;