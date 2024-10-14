// src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';
import { Typography, Paper, Box } from '@mui/material';

const SummaryTable = ({ data }) => {
  const summaryData = [
    { name: 'AIC', value: data.aic?.toFixed(2) ?? 'N/A' },
    { name: 'BIC', value: data.bic?.toFixed(2) ?? 'N/A' },
    { name: 'HQIC', value: data.hqic?.toFixed(2) ?? 'N/A' },
    { name: 'Alpha (α)', value: data.alpha?.toFixed(4) ?? 'N/A' },
    { name: 'Beta (β)', value: data.beta?.toFixed(4) ?? 'N/A' },
    { name: 'Gamma (γ)', value: data.gamma?.toFixed(4) ?? 'N/A' },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  const interpretSummary = () => {
    let interpretation = '';

    // Interpret information criteria
    const bestModel = [
      { criterion: 'AIC', value: data.aic },
      { criterion: 'BIC', value: data.bic },
      { criterion: 'HQIC', value: data.hqic },
    ].reduce((a, b) => (a.value < b.value ? a : b));

    interpretation += `Based on the information criteria, the ${bestModel.criterion} (${bestModel.value.toFixed(2)}) suggests the best model fit. Lower values indicate better fit, balancing model complexity and goodness of fit.\n\n`;

    // Interpret Alpha (Error Correction Term)
    if (data.alpha !== undefined) {
      interpretation += `The Error Correction Term (α) is ${data.alpha.toFixed(4)}. `;
      if (data.alpha < 0) {
        interpretation += `This negative value indicates convergence to long-run equilibrium. The speed of adjustment is ${Math.abs(data.alpha).toFixed(2) * 100}% per period.\n\n`;
      } else if (data.alpha > 0) {
        interpretation += `This positive value suggests divergence from long-run equilibrium, which is unexpected in most economic models.\n\n`;
      } else {
        interpretation += `A value of zero suggests no adjustment towards long-run equilibrium.\n\n`;
      }
    }

    // Interpret Beta (long-run relationship)
    if (data.beta !== undefined) {
      interpretation += `The long-run relationship coefficient (β) is ${data.beta.toFixed(4)}. `;
      if (data.beta > 0) {
        interpretation += `This positive value indicates a positive long-term relationship between the variables.\n\n`;
      } else if (data.beta < 0) {
        interpretation += `This negative value indicates an inverse long-term relationship between the variables.\n\n`;
      } else {
        interpretation += `A value of zero suggests no long-term relationship between the variables.\n\n`;
      }
    }

    // Interpret Gamma (short-term dynamics)
    if (data.gamma !== undefined) {
      interpretation += `The short-term dynamics coefficient (γ) is ${data.gamma.toFixed(4)}. `;
      interpretation += `This represents the immediate impact of changes in the independent variable on the dependent variable.\n\n`;
    }

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
    aic: PropTypes.number,
    bic: PropTypes.number,
    hqic: PropTypes.number,
    alpha: PropTypes.number,
    beta: PropTypes.number,
    gamma: PropTypes.number,
  }).isRequired,
};

export default SummaryTable;