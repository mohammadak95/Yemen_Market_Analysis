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

const SummaryTable = ({ data }) => (
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
);

SummaryTable.propTypes = {
  data: PropTypes.shape({
    commodity: PropTypes.string.isRequired,
    regime: PropTypes.string.isRequired,
    aic: PropTypes.number.isRequired,
    bic: PropTypes.number.isRequired,
    hqic: PropTypes.number.isRequired,
  }).isRequired,
};

export default SummaryTable;