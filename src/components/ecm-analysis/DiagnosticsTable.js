// src/components/ecm-analysis/DiagnosticsTable.js

import React from 'react';
import PropTypes from 'prop-types';
import ResultTable from '../common/ResultTable';

const DiagnosticsTable = ({ diagnostics }) => {
  const diagnosticTests = [
    {
      name: 'Breusch-Godfrey Test',
      statistic: diagnostics.breusch_godfrey_stat?.toFixed(4) || 'N/A',
      p_value: diagnostics.breusch_godfrey_pvalue?.toFixed(4) || 'N/A',
      tooltip: 'Tests for serial correlation in the residuals.',
    },
    {
      name: 'ARCH Test',
      statistic: diagnostics.arch_test_stat?.toFixed(4) || 'N/A',
      p_value: diagnostics.arch_test_pvalue?.toFixed(4) || 'N/A',
      tooltip: 'Assesses heteroskedasticity in the residuals.',
    },
    {
      name: 'Jarque-Bera Test',
      statistic: diagnostics.jarque_bera_stat?.toFixed(4) || 'N/A',
      p_value: diagnostics.jarque_bera_pvalue?.toFixed(4) || 'N/A',
      tooltip: 'Tests for normality of residuals.',
    },
    {
      name: 'Durbin-Watson Statistic',
      statistic: diagnostics.durbin_watson_stat?.toFixed(4) || 'N/A',
      p_value: 'N/A',
      tooltip: 'Measures autocorrelation in the residuals.',
    },
    {
      name: 'White Test',
      statistic: typeof diagnostics.white_test_stat === 'number' ? diagnostics.white_test_stat.toFixed(4) : 'N/A',
      p_value:
        typeof diagnostics.white_test_pvalue === 'number'
          ? diagnostics.white_test_pvalue.toFixed(4)
          : 'N/A',
      tooltip: 'Tests for heteroskedasticity in the residuals.',
    },
    {
      name: 'Shapiro-Wilk Test',
      statistic: diagnostics.shapiro_wilk_stat?.toFixed(4) || 'N/A',
      p_value: diagnostics.shapiro_wilk_pvalue?.toFixed(4) || 'N/A',
      tooltip: 'Another test for normality of residuals.',
    },
  ];

  const columns = [
    { field: 'name', tooltip: 'Diagnostic Test' },
    { field: 'statistic', tooltip: 'Test Statistic' },
    { field: 'p_value', tooltip: 'P-Value' },
  ];

  return (
    <ResultTable
      title="Diagnostic Tests"
      data={diagnosticTests}
      columns={columns}
    />
  );
};

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.shape({
    breusch_godfrey_stat: PropTypes.number,
    breusch_godfrey_pvalue: PropTypes.number,
    arch_test_stat: PropTypes.number,
    arch_test_pvalue: PropTypes.number,
    jarque_bera_stat: PropTypes.number,
    jarque_bera_pvalue: PropTypes.number,
    durbin_watson_stat: PropTypes.number,
    white_test_stat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    white_test_pvalue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    shapiro_wilk_stat: PropTypes.number,
    shapiro_wilk_pvalue: PropTypes.number,
    acf: PropTypes.arrayOf(PropTypes.number),
    pacf: PropTypes.arrayOf(PropTypes.number),
  }).isRequired,
};

export default DiagnosticsTable;