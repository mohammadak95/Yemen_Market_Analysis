// src/components/price-differential/DiagnosticsTests.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography } from '@mui/material';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No diagnostic tests available for this market pair.
      </Typography>
    );
  }

  const diagnosticsData = [
    {
      name: 'Conflict Correlation',
      value: data.conflict_correlation.toFixed(4),
    },
    {
      name: 'Common Dates',
      value: data.common_dates,
    },
    {
      name: 'Distance',
      value: `${data.distance.toFixed(2)} km`,
    },
    {
      name: 'P-Value',
      value: data.p_value.toFixed(4),
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
    conflict_correlation: PropTypes.number,
    common_dates: PropTypes.number,
    distance: PropTypes.number,
    p_value: PropTypes.number,
  }),
};

export default DiagnosticsTests;