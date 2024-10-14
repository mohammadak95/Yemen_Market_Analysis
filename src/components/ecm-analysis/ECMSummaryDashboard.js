// src/components/ecm-analysis/ECMSummaryDashboard.js

import React from 'react';
import { Container, Typography, Tabs, Tab, Box, Paper } from '@mui/material';
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

  const tabContent = [
    { label: "Key Insights", component: <ECMKeyInsights analysisResult={analysisResult} /> },
    { label: "Interpretation", component: <ECMInterpretation analysisResult={analysisResult} /> },
    { label: "Diagnostics Tests", component: <DiagnosticsTable diagnostics={analysisResult.diagnostics} /> },
    { label: "Model Summary", component: <SummaryTable data={analysisResult} /> },
    { label: "IRF Chart", component: <IRFChart irfData={analysisResult.irf} /> },
    { label: "Granger Causality", component: <GrangerCausalityChart grangerData={analysisResult.granger_causality} /> },
    { label: "Residuals Chart", component: analysisResult.residuals && analysisResult.fitted_values ? 
      <ResidualsChart residuals={analysisResult.residuals} fittedValues={analysisResult.fitted_values} /> : null },
    { label: "Spatial Autocorrelation", component: analysisResult.spatial_autocorrelation ? 
      <SpatialAutocorrelationChart spatialData={analysisResult.spatial_autocorrelation} /> : null },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          Directional Error Correction Model (ECM) Analysis
        </Typography>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {tabContent.map((tab, index) => (
            <Tab key={index} label={tab.label} disabled={!tab.component} />
          ))}
        </Tabs>
        <Box sx={{ mt: 2 }}>
          {tabContent[activeTab].component}
        </Box>
      </Paper>
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