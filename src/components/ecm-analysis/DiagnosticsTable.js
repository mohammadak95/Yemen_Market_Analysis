import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }

  th {
    background-color: #f4f4f4;
    text-align: left;
  }

  tr:nth-child(even) {
    background-color: #fafafa;
  }
`;

const DiagnosticsTable = ({ diagnostics }) => (
  <Table>
    <thead>
      <tr>
        <th>Test</th>
        <th>Statistic</th>
        <th>P-value</th>
      </tr>
    </thead>
    <tbody>
      {[
        { test: 'Breusch-Godfrey', stat: diagnostics.breusch_godfrey_stat, pvalue: diagnostics.breusch_godfrey_pvalue },
        { test: 'ARCH', stat: diagnostics.arch_test_stat, pvalue: diagnostics.arch_test_pvalue },
        { test: 'Jarque-Bera', stat: diagnostics.jarque_bera_stat, pvalue: diagnostics.jarque_bera_pvalue },
        { test: 'Durbin-Watson', stat: diagnostics.durbin_watson_stat, pvalue: 'N/A' },
      ].map((diag) => (
        <tr key={diag.test}>
          <td>{diag.test}</td>
          <td>{diag.stat.toFixed(2)}</td>
          <td>{typeof diag.pvalue === 'number' ? diag.pvalue.toExponential(2) : diag.pvalue}</td>
        </tr>
      ))}
    </tbody>
  </Table>
);

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.shape({
    breusch_godfrey_stat: PropTypes.number.isRequired,
    breusch_godfrey_pvalue: PropTypes.number.isRequired,
    arch_test_stat: PropTypes.number.isRequired,
    arch_test_pvalue: PropTypes.number.isRequired,
    jarque_bera_stat: PropTypes.number.isRequired,
    jarque_bera_pvalue: PropTypes.number.isRequired,
    durbin_watson_stat: PropTypes.number.isRequired,
  }).isRequired,
};

export default DiagnosticsTable;