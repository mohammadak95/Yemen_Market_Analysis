// src/components/analysis/ecm/ECMAnalysis.js

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { saveAs } from 'file-saver';
import { jsonToCsv } from '../../../utils/utils';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import { useECMData } from '../../../hooks/useECMData';

import ECMControls from './ECMControls';
import ECMTabs from '../../common/ECMTabs';
import ECMKeyInsights from './ECMKeyInsights';
import SummaryTable from './SummaryTable';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import ResidualsChart from './ResidualsChart';
import GrangerCausalityChart from './GrangerCausalityChart';
import SpatialAutocorrelationChart from './SpatialAutocorrelationChart';
import ECMTutorial from './ECMTutorial';
import EquationWithHelp from '../../common/EquationWithHelp';
import TechnicalTooltip from '../../common/TechnicalTooltip';
import MethodologyLink from '../../common/MethodologyLink';
import ECMDiagnosticsHelp from './DiagnosticsHelp';

const ECMAnalysis = ({ selectedCommodity, windowWidth }) => {
  const theme = useTheme();
  const isMobile = windowWidth < theme.breakpoints.values.sm;

  const [activeTab, setActiveTab] = useState(0);
  const [analysisType, setAnalysisType] = useState('unified');
  const [direction, setDirection] = useState('northToSouth');
  const [selectedData, setSelectedData] = useState(null);

  const {
    unifiedData,
    unifiedStatus,
    unifiedError,
    directionalData,
    directionalStatus,
    directionalError,
  } = useECMData();

  const { getTechnicalTooltip, getTechnicalEquation } = useTechnicalHelp('ecm');
  const mainEquation = getTechnicalEquation('main');
  const diagnosticsTooltip = getTechnicalTooltip('diagnostics');

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
          item.regime === 'unified'
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
  ]);

  const handleDownloadCsv = () => {
    if (!selectedData) return;

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

  const tabConfig = useMemo(() => {
    if (!selectedData) return { labels: [], content: [] };

    const config = {
      labels: ['Summary', 'Diagnostics', 'IRF', 'Residuals', 'Granger Causality'],
      content: [
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
      ]
    };

    if (analysisType === 'unified' && selectedData.spatial_autocorrelation) {
      config.labels.push('Spatial Autocorrelation');
      config.content.push(
        <SpatialAutocorrelationChart
          key="spatialAutocorrelation"
          spatialData={selectedData.spatial_autocorrelation}
          isMobile={isMobile}
        />
      );
    }

    return config;
  }, [analysisType, selectedData, isMobile]);

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
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2 
        }}>
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
            <TechnicalTooltip
              componentType="ecm"
              element="main"
              tooltipContent={getTechnicalTooltip('main')}
            />
          </Typography>
          <MethodologyLink componentType="ecm" iconOnly />
        </Box>

        <ECMControls
          analysisType={analysisType}
          direction={direction}
          onAnalysisTypeChange={handleAnalysisTypeChange}
          onDirectionChange={handleDirectionChange}
          onDownload={handleDownloadCsv}
          isMobile={isMobile}
        />

        <ECMTutorial />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 3 }}>
        <EquationWithHelp
          latex={mainEquation.latex}
          description={mainEquation.description}
          variables={mainEquation.variables}
          title="Model Specification"
          componentType="ecm"
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <ECMDiagnosticsHelp 
          diagnostics={selectedData.diagnostics}
          tooltips={diagnosticsTooltip}
        />
      </Box>

      <ECMKeyInsights selectedData={selectedData} />

      <Box sx={{ overflowX: 'auto' }}>
        <ECMTabs
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          tabLabels={tabConfig.labels}
          isMobile={isMobile}
        >
          {tabConfig.content}
        </ECMTabs>
      </Box>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Interpretation Guide</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
            This ECM analysis provides insights into the relationship between commodity prices and conflict intensity. Key points to consider:
          </Typography>
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
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

ECMAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  windowWidth: PropTypes.number.isRequired,
};

export default ECMAnalysis;
