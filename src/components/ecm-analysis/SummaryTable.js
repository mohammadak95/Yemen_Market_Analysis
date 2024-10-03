// src/components/ecm-analysis/SummaryTable.js
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

const SummaryTable = React.memo(({ data }) => (
  <Table>
    <thead>
      <tr>
        <th>Commodity</th>
        <th>Regime</th>
        <th>AIC</th>
        <th>BIC</th>
        <th>HQIC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{data.commodity}</td>
        <td>{data.regime}</td>
        <td>{data.aic.toFixed(2)}</td>
        <td>{data.bic.toFixed(2)}</td>
        <td>{data.hqic.toFixed(2)}</td>
      </tr>
    </tbody>
  </Table>
));

export default SummaryTable;
