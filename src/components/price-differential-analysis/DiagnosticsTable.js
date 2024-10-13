// src/components/price-differential/DiagnosticsTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography } from '@mui/material';

const DiagnosticsTable = ({ diagnostics }) => {
  if (!diagnostics) {
    return (
      <Typography variant="body1">
        No diagnostic tests available for this market pair.
      </Typography>
    );
  }

  const diagnosticTests = [
    {
      name: 'Conflict Correlation',
      value: diagnostics.conflict_correlation?.toFixed(4) || 'N/A',
    },
    {
      name: 'Common Dates',
      value: diagnostics.common_dates || 'N/A',
    },
    {
      name: 'Distance',
      value: diagnostics.distance ? `${diagnostics.distance.toFixed(2)} km` : 'N/A',
    },
    {
      name: 'P-Value',
      value: diagnostics.p_value?.toFixed(4) || 'N/A',
    },
  ];

  const columns = [
    { field: 'name', tooltip: 'Diagnostic Test' },
    { field: 'value', tooltip: 'Test Result' },
  ];

  return (
    <ResultTable title="Market Pair Diagnostics" data={diagnosticTests} columns={columns} />
  );
};

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.shape({
    conflict_correlation: PropTypes.number,
    common_dates: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    distance: PropTypes.number,
    p_value: PropTypes.number,
  }),
};

export default DiagnosticsTable;