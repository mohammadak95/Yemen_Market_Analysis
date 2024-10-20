// src/components/price-differential-analysis/SummaryTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography, Paper, Box } from '@mui/material';

const SummaryTable = ({ data }) => {
  const summaryData = [
    { name: 'AIC', value: data.regression_results.aic?.toFixed(2) ?? 'N/A' },
    { name: 'BIC', value: data.regression_results.bic?.toFixed(2) ?? 'N/A' },
    { name: 'Intercept (α)', value: data.regression_results.intercept?.toFixed(4) ?? 'N/A' },
    { name: 'Slope (β)', value: data.regression_results.slope?.toFixed(4) ?? 'N/A' },
    { name: 'R-squared', value: data.regression_results.r_squared?.toFixed(4) ?? 'N/A' },
    { name: 'P-Value', value: data.regression_results.p_value?.toFixed(4) ?? 'N/A' },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  const interpretSummary = () => {
    let interpretation = '';

    interpretation += `The analysis uses a simple time regression model to examine the price differential trend. `;
    
    if (data.regression_results.slope !== undefined) {
      interpretation += `The slope (β) of ${data.regression_results.slope.toFixed(4)} indicates ${
        data.regression_results.slope > 0 ? 'an increasing' : 'a decreasing'
      } trend in the price differential over time. `;
      
      if (data.regression_results.p_value < 0.05) {
        interpretation += `This trend is statistically significant (p-value: ${data.regression_results.p_value.toFixed(4)}). `;
      } else {
        interpretation += `However, this trend is not statistically significant (p-value: ${data.regression_results.p_value.toFixed(4)}). `;
      }
    }

    if (data.regression_results.r_squared !== undefined) {
      interpretation += `The R-squared value of ${data.regression_results.r_squared.toFixed(4)} suggests that ${
        (data.regression_results.r_squared * 100).toFixed(2)
      }% of the variability in the price differential is explained by time. `;
    }

    interpretation += `The AIC (${data.regression_results.aic.toFixed(2)}) and BIC (${data.regression_results.bic.toFixed(2)}) provide measures of model fit, with lower values indicating better fit. `;

    return interpretation;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <ResultTable title="Model Summary Statistics" data={summaryData} columns={columns} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Interpretation</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {interpretSummary()}
        </Typography>
      </Box>
    </Paper>
  );
};

SummaryTable.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      aic: PropTypes.number,
      bic: PropTypes.number,
      intercept: PropTypes.number,
      slope: PropTypes.number,
      r_squared: PropTypes.number,
      p_value: PropTypes.number,
    }).isRequired,
  }).isRequired,
};

export default SummaryTable;