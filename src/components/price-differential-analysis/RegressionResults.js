// src/components/price-differential/RegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography } from '@mui/material';

const RegressionResults = ({ data }) => {
  if (!data || !data.regression_results) {
    return (
      <Typography variant="body1">
        No regression results available for this market pair.
      </Typography>
    );
  }

  const regressionData = [
    {
      name: 'Intercept (α)',
      value:
        data.regression_results.intercept !== undefined
          ? data.regression_results.intercept.toFixed(4)
          : 'N/A',
    },
    {
      name: 'Slope (β)',
      value:
        data.regression_results.slope !== undefined
          ? data.regression_results.slope.toFixed(4)
          : 'N/A',
    },
    {
      name: 'R-squared',
      value:
        data.regression_results.r_squared !== undefined
          ? data.regression_results.r_squared.toFixed(4)
          : 'N/A',
    },
    {
      name: 'P-Value',
      value:
        data.regression_results.p_value !== undefined
          ? data.regression_results.p_value.toFixed(4)
          : 'N/A',
    },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  return (
    <ResultTable title="Regression Results" data={regressionData} columns={columns} />
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      intercept: PropTypes.number,
      slope: PropTypes.number,
      r_squared: PropTypes.number,
      p_value: PropTypes.number,
    }),
  }),
};

export default RegressionResults;