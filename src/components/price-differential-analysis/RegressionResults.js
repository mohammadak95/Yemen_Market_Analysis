// src/components/price-differential/RegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography, Paper, Box } from '@mui/material';

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
        data.regression_results.intercept != null
          ? data.regression_results.intercept.toFixed(4)
          : 'N/A',
    },
    {
      name: 'Slope (β)',
      value:
        data.regression_results.slope != null
          ? data.regression_results.slope.toFixed(4)
          : 'N/A',
    },
    {
      name: 'R-squared',
      value:
        data.regression_results.r_squared != null
          ? data.regression_results.r_squared.toFixed(4)
          : 'N/A',
    },
    {
      name: 'P-Value',
      value:
        data.regression_results.p_value != null
          ? data.regression_results.p_value.toFixed(4)
          : 'N/A',
    },
    {
      name: 'AIC',
      value:
        data.regression_results.aic != null
          ? data.regression_results.aic.toFixed(2)
          : 'N/A',
    },
    {
      name: 'BIC',
      value:
        data.regression_results.bic != null
          ? data.regression_results.bic.toFixed(2)
          : 'N/A',
    },
    {
      name: 'HQIC',
      value:
        data.regression_results.hqic != null
          ? data.regression_results.hqic.toFixed(2)
          : 'N/A',
    },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  const interpretRegression = () => {
    let interpretation = '';

    // Interpret AIC, BIC, HQIC
    const criteria = [
      { name: 'AIC', value: data.regression_results.aic },
      { name: 'BIC', value: data.regression_results.bic },
      { name: 'HQIC', value: data.regression_results.hqic },
    ].filter(criterion => criterion.value != null && !isNaN(criterion.value));

    if (criteria.length > 0) {
      const bestCriterion = criteria.reduce((prev, curr) =>
        prev.value < curr.value ? prev : curr
      );
      interpretation += `Based on the information criteria, the ${bestCriterion.name} (${bestCriterion.value.toFixed(2)}) suggests the best model fit.\n\n`;
    } else {
      interpretation += 'Information criteria (AIC, BIC, HQIC) are not available to determine the best model fit.\n\n';
    }

    // Interpret Slope and P-Value
    if (data.regression_results.slope != null && !isNaN(data.regression_results.slope)) {
      const significance =
        data.regression_results.p_value != null && data.regression_results.p_value < 0.05
          ? 'statistically significant'
          : 'not statistically significant';
      const pValueText = data.regression_results.p_value != null
        ? ` (p-value: ${data.regression_results.p_value.toFixed(4)})`
        : '';
      interpretation += `The slope (β) is ${data.regression_results.slope.toFixed(4)} and is ${significance}${pValueText}. This indicates ${
        significance === 'statistically significant' ? 'a significant' : 'no significant'
      } trend in the price differential over time.\n\n`;
    } else {
      interpretation += 'The slope (β) is not available.\n\n';
    }

    // Interpret R-squared
    if (data.regression_results.r_squared != null && !isNaN(data.regression_results.r_squared)) {
      interpretation += `The R-squared value is ${data.regression_results.r_squared.toFixed(
        4
      )}, indicating that ${(
        data.regression_results.r_squared * 100
      ).toFixed(2)}% of the variability in the price differential is explained by the model.`;
    } else {
      interpretation += 'The R-squared value is not available.';
    }

    return interpretation;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <ResultTable title="Regression Results" data={regressionData} columns={columns} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Interpretation</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {interpretRegression()}
        </Typography>
      </Box>
    </Paper>
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      intercept: PropTypes.number,
      slope: PropTypes.number,
      r_squared: PropTypes.number,
      p_value: PropTypes.number,
      aic: PropTypes.number,
      bic: PropTypes.number,
      hqic: PropTypes.number,
    }),
  }),
};

export default RegressionResults;
