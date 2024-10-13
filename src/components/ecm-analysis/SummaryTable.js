// src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';

const SummaryTable = ({ data }) => {
  const summaryData = [
    {
      name: 'AIC',
      value: data.aic !== null && data.aic !== undefined ? data.aic.toFixed(2) : 'N/A',
    },
    {
      name: 'BIC',
      value: data.bic !== null && data.bic !== undefined ? data.bic.toFixed(2) : 'N/A',
    },
    {
      name: 'HQIC',
      value: data.hqic !== null && data.hqic !== undefined ? data.hqic.toFixed(2) : 'N/A',
    },
    {
      name: 'Alpha (α)',
      value: data.alpha !== null && data.alpha !== undefined ? data.alpha.toFixed(4) : 'N/A',
    },
    {
      name: 'Beta (β)',
      value: data.beta !== null && data.beta !== undefined ? data.beta.toFixed(4) : 'N/A',
    },
    {
      name: 'Gamma (γ)',
      value: data.gamma !== null && data.gamma !== undefined ? data.gamma.toFixed(4) : 'N/A',
    },
  ];

  const columns = [
    { field: 'name' },
    { field: 'value' },
  ];

  return (
    <ResultTable title="Model Summary Statistics" data={summaryData} columns={columns} />
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