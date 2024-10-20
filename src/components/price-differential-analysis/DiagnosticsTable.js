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
      name: 'P-Value (ADF Test)',
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

    if (data.diagnostics.p_value !== undefined) {
      const stationarity = data.diagnostics.p_value < 0.05 ? 'stationary' : 'non-stationary';
      interpretation += `The ADF test indicates that the price differential series is ${stationarity} (p-value: ${data.diagnostics.p_value.toFixed(4)}). `;
      interpretation += stationarity === 'stationary' 
        ? 'This suggests that shocks to the price differential tend to be temporary.' 
        : 'This suggests that shocks to the price differential may have long-lasting effects.';
    }

    if (data.diagnostics.conflict_correlation !== undefined) {
      const correlationType = data.diagnostics.conflict_correlation > 0 ? 'positive' : 'negative';
      interpretation += `\n\nThe conflict correlation of ${data.diagnostics.conflict_correlation.toFixed(4)} indicates a ${correlationType} relationship between conflicts in the two markets. `;
      interpretation += data.diagnostics.conflict_correlation > 0 
        ? 'This suggests that conflict intensities in both markets tend to move together.' 
        : 'This suggests that as conflict increases in one market, it tends to decrease in the other.';
    }

    if (data.diagnostics.distance_km !== undefined) {
      interpretation += `\n\nThe distance between markets is approximately ${data.diagnostics.distance_km.toFixed(2)} km. `;
      interpretation += 'Greater distances may contribute to larger price differentials due to transportation costs and market segmentation.';
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
      common_dates: PropTypes.number,
      distance_km: PropTypes.number,
      p_value: PropTypes.number,
    }),
  }),
};

export default DiagnosticsTable;