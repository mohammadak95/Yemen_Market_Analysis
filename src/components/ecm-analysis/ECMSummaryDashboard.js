// src/components/ecm-analysis/ECMSummaryDashboard.js

import React from 'react';
import { Container, Typography, Tabs, Tab, Box } from '@mui/material';
import ECMKeyInsights from './ECMKeyInsights';
import ECMInterpretation from './ECMInterpretation';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import GrangerCausalityChart from './GrangerCausalityChart';
import ResidualsChart from './ResidualsChart';
import SpatialAutocorrelationChart from './SpatialAutocorrelationChart';
import SummaryTable from './SummaryTable';

import PropTypes from 'prop-types';

const ECMSummaryDashboard = ({ analysisResult }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
        Directional Error Correction Model (ECM) Analysis
      </Typography>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mt: 2 }}
      >
        <Tab label="Key Insights" />
        <Tab label="Interpretation" />
        <Tab label="Diagnostics Tests" />
        <Tab label="Model Summary" />
        <Tab label="IRF Chart" />
        <Tab label="Granger Causality" />
        <Tab label="Residuals Chart" />
        <Tab label="Spatial Autocorrelation" />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && <ECMKeyInsights analysisResult={analysisResult} />}
        {activeTab === 1 && <ECMInterpretation analysisResult={analysisResult} />}
        {activeTab === 2 && <DiagnosticsTable diagnostics={analysisResult.diagnostics} />}
        {activeTab === 3 && <SummaryTable data={analysisResult} />}
        {activeTab === 4 && <IRFChart irfData={analysisResult.irf} />}
        {activeTab === 5 && <GrangerCausalityChart grangerData={analysisResult.granger_causality} />}
        {activeTab === 6 && (
          analysisResult.residuals && analysisResult.fitted_values && (
            <ResidualsChart
              residuals={analysisResult.residuals}
              fittedValues={analysisResult.fitted_values}
            />
          )
        )}
        {activeTab === 7 && (
          analysisResult.spatial_autocorrelation && (
            <SpatialAutocorrelationChart spatialData={analysisResult.spatial_autocorrelation} />
          )
        )}
      </Box>
    </Container>
  );
};

ECMSummaryDashboard.propTypes = {
  analysisResult: PropTypes.shape({
    diagnostics: PropTypes.object.isRequired,
    aic: PropTypes.number,
    bic: PropTypes.number,
    hqic: PropTypes.number,
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
    irf: PropTypes.array,
    granger_causality: PropTypes.object,
    residuals: PropTypes.arrayOf(PropTypes.number),
    fitted_values: PropTypes.arrayOf(PropTypes.number),
    spatial_autocorrelation: PropTypes.object,
  }).isRequired,
};

export default ECMSummaryDashboard;