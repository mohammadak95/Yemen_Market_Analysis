// src/components/price-differential-analysis/DiagnosticsTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography, Paper, Box } from '@mui/material';

const DiagnosticsTable = ({ data }) => {
  if (!data || !data.diagnostics) {
    return (
      <Typography variant="body1">
        No diagnostic tests available for this market pair.
      </Typography>
    );
  }

  const diagnosticTests = [
    {
      name: 'Conflict Correlation',
      value:
        data.diagnostics.conflict_correlation != null
          ? data.diagnostics.conflict_correlation.toFixed(4)
          : 'N/A',
    },
    {
      name: 'Common Dates',
      value: data.diagnostics.common_dates != null ? data.diagnostics.common_dates : 'N/A',
    },
    {
      name: 'Distance',
      value:
        data.diagnostics.distance_km != null
          ? `${(data.diagnostics.distance_km * 200).toFixed(2)} km`
          : 'N/A',
    },
    {
      name: 'P-Value (Stationarity Test)',
      value:
        data.diagnostics.p_value != null ? data.diagnostics.p_value.toFixed(4) : 'N/A',
    },
  ];

  const columns = [
    { field: 'name', tooltip: 'Diagnostic Test' },
    { field: 'value', tooltip: 'Test Result' },
  ];

  const interpretDiagnostics = () => {
    let interpretation = '';

    if (data.diagnostics.p_value != null) {
      const stationarity =
        data.diagnostics.p_value < 0.05 ? 'stationary' : 'non-stationary';
      interpretation += `The stationarity test indicates that the price differential series is ${stationarity} (p-value: ${data.diagnostics.p_value.toFixed(
        4
      )}).\n\n`;
    }

    if (data.diagnostics.conflict_correlation != null) {
      const correlationType =
        data.diagnostics.conflict_correlation > 0 ? 'positive' : 'negative';
      interpretation += `The conflict correlation is ${data.diagnostics.conflict_correlation.toFixed(
        4
      )}, indicating a ${correlationType} relationship between conflicts in the markets.`;
    }

    return interpretation;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <ResultTable title="Diagnostics" data={diagnosticTests} columns={columns} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Interpretation</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {interpretDiagnostics()}
        </Typography>
      </Box>
    </Paper>
  );
};

DiagnosticsTable.propTypes = {
  data: PropTypes.shape({
    diagnostics: PropTypes.shape({
      conflict_correlation: PropTypes.number,
      common_dates: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      distance_km: PropTypes.number,
      p_value: PropTypes.number,
    }),
  }),
};

export default DiagnosticsTable;
