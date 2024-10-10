// src/components/ecm-analysis/ECMSummaryDashboard.js

import React from 'react';
import { Container, Typography } from '@mui/material';
import ECMKeyInsights from './ECMKeyInsights';
import ECMInterpretation from './ECMInterpretation';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import GrangerCausalityChart from './GrangerCausalityChart';
import ResidualsChart from './ResidualsChart';
import SpatialAutocorrelationChart from './SpatialAutocorrelationChart';

import PropTypes from 'prop-types';

const ECMSummaryDashboard = ({ analysisResult }) => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
        Directional Error Correction Model (ECM) Analysis
      </Typography>
      <ECMKeyInsights analysisResult={analysisResult} />
      <ECMInterpretation analysisResult={analysisResult} />
      <DiagnosticsTable diagnostics={analysisResult.diagnostics} />
      <IRFChart irfData={analysisResult.irf} />
      <GrangerCausalityChart grangerData={analysisResult.granger_causality} />
      {/* Add ResidualsChart */}
      {analysisResult.residuals && analysisResult.fittedValues && (
        <ResidualsChart residuals={analysisResult.residuals} fittedValues={analysisResult.fittedValues} />
      )}
      {/* Add SpatialAutocorrelationChart */}
      {analysisResult.spatial_autocorrelation && (
        <SpatialAutocorrelationChart spatialData={analysisResult.spatial_autocorrelation} />
      )}
    </Container>
  );
};

ECMSummaryDashboard.propTypes = {
  analysisResult: PropTypes.shape({
    diagnostics: PropTypes.object.isRequired,
    irf: PropTypes.array.isRequired, // Adjusted to match IRFChart's expected structure
    granger_causality: PropTypes.object.isRequired,
    residuals: PropTypes.arrayOf(PropTypes.number),
    fittedValues: PropTypes.arrayOf(PropTypes.number),
    spatial_autocorrelation: PropTypes.shape({
      Variable_1: PropTypes.shape({
        Moran_I: PropTypes.number.isRequired,
        Moran_p_value: PropTypes.number.isRequired,
      }).isRequired,
      Variable_2: PropTypes.shape({
        Moran_I: PropTypes.number.isRequired,
        Moran_p_value: PropTypes.number.isRequired,
      }).isRequired,
    }),
  }).isRequired,
};

export default ECMSummaryDashboard;