// src/components/price-differential/DiagnosticsTests.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography } from '@mui/material';

const DiagnosticsTests = ({ data }) => {
  if (!data || !data.diagnostics) {
    return (
      <Typography variant="body1">
        No diagnostic tests available for this market pair.
      </Typography>
    );
  }

  const diagnostics = data.diagnostics;

  const diagnosticsData = [
    {
      name: 'Conflict Correlation',
      value:
        diagnostics.conflict_correlation != null
          ? diagnostics.conflict_correlation.toFixed(4)
          : 'N/A',
    },
    {
      name: 'Common Dates',
      value: diagnostics.common_dates != null ? diagnostics.common_dates : 'N/A',
    },
    {
      name: 'Distance',
      value:
        diagnostics.distance != null
          ? `${(diagnostics.distance * 200).toFixed(2)} km`
          : 'N/A',
    },
    {
      name: 'P-Value',
      value:
        diagnostics.p_value != null ? diagnostics.p_value.toFixed(4) : 'N/A',
    },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  return (
    <ResultTable
      title="Market Pair Diagnostics"
      data={diagnosticsData}
      columns={columns}
    />
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.shape({
    diagnostics: PropTypes.shape({
      conflict_correlation: PropTypes.number,
      common_dates: PropTypes.number,
      distance: PropTypes.number,
      p_value: PropTypes.number,
    }),
  }),
};

export default DiagnosticsTests;
