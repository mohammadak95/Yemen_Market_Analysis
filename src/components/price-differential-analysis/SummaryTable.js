// src/components/price-differential-analysis/SummaryTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography, Paper, Box } from '@mui/material';

const SummaryTable = ({ data }) => {
  const summaryData = [
    { name: 'AIC', value: data.aic?.toFixed(2) ?? 'N/A' },
    { name: 'BIC', value: data.bic?.toFixed(2) ?? 'N/A' },
    { name: 'HQIC', value: data.hqic?.toFixed(2) ?? 'N/A' },
    { name: 'Intercept (α)', value: data.alpha?.toFixed(4) ?? 'N/A' },
    { name: 'Slope (β)', value: data.slope?.toFixed(4) ?? 'N/A' },
    { name: 'R-squared', value: data.r_squared?.toFixed(4) ?? 'N/A' },
    { name: 'P-Value', value: data.p_value?.toFixed(4) ?? 'N/A' },
  ];

  const columns = [
    { field: 'name', headerName: 'Statistic', flex: 1 },
    { field: 'value', headerName: 'Value', flex: 1 },
  ];

  const interpretSummary = () => {
    let interpretation = '';

    // Interpret information criteria
    const criteria = [
      { name: 'AIC', value: data.aic },
      { name: 'BIC', value: data.bic },
      { name: 'HQIC', value: data.hqic },
    ];
    const bestCriterion = criteria.reduce((prev, curr) => (prev.value < curr.value ? prev : curr));
    interpretation += `Based on the information criteria, the ${bestCriterion.name} (${bestCriterion.value.toFixed(
      2
    )}) suggests the best model fit. Lower values indicate a better fit, balancing model complexity and goodness of fit.\n\n`;

    // Interpret Alpha (Intercept)
    if (data.alpha !== undefined) {
      interpretation += `The Error Correction Term (α) is ${data.alpha.toFixed(4)}. `;
      if (data.alpha < 0) {
        interpretation += `This negative value indicates convergence to long-run equilibrium. The speed of adjustment is ${(Math.abs(data.alpha) * 100).toFixed(2)}% per period.\n\n`;
      } else if (data.alpha > 0) {
        interpretation += `This positive value suggests divergence from long-run equilibrium, which is unexpected in most economic models.\n\n`;
      } else {
        interpretation += `A value of zero suggests no adjustment towards long-run equilibrium.\n\n`;
      }
    }

    // Interpret Slope (Beta)
    if (data.slope !== undefined) {
      interpretation += `The long-run relationship coefficient (β) is ${data.slope.toFixed(4)}. `;
      if (data.slope > 0) {
        interpretation += `This positive value indicates a positive long-term relationship between the variables.\n\n`;
      } else if (data.slope < 0) {
        interpretation += `This negative value indicates an inverse long-term relationship between the variables.\n\n`;
      } else {
        interpretation += `A value of zero suggests no long-term relationship between the variables.\n\n`;
      }
    }

    // Interpret R-squared
    if (data.r_squared !== undefined) {
      interpretation += `The R-squared value is ${data.r_squared.toFixed(
        4
      )}, indicating that ${(data.r_squared * 100).toFixed(2)}% of the variability in the price differential is explained by the model.\n\n`;
    }

    return interpretation;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <ResultTable title="Model Summary Statistics" data={summaryData} columns={columns} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Interpretation
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {interpretSummary()}
        </Typography>
      </Box>
    </Paper>
  );
};

SummaryTable.propTypes = {
  data: PropTypes.shape({
    aic: PropTypes.number,
    bic: PropTypes.number,
    hqic: PropTypes.number,
    alpha: PropTypes.number,
    slope: PropTypes.number,
    r_squared: PropTypes.number,
    p_value: PropTypes.number,
  }).isRequired,
};

export default SummaryTable;
