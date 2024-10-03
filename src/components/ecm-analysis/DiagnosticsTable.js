// src/components/ecm-analysis/DiagnosticsTable.js
import React from 'react';
import styled from 'styled-components';

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

const DiagnosticsTable = React.memo(({ diagnostics }) => (
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
));

export default DiagnosticsTable;
