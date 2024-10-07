//src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const SummaryTable = ({ data, selectedCommodity, selectedRegime }) => {
  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(4) : 'N/A');

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" gutterBottom component="div" sx={{ p: 2 }}>
        Summary: {selectedCommodity} - {selectedRegime}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>AIC</TableCell>
            <TableCell align="right">{formatNumber(data.aic)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>BIC</TableCell>
            <TableCell align="right">{formatNumber(data.bic)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>HQIC</TableCell>
            <TableCell align="right">{formatNumber(data.hqic)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>R-squared</TableCell>
            <TableCell align="right">{formatNumber(data.fit_metrics.r_squared)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Adjusted R-squared</TableCell>
            <TableCell align="right">{formatNumber(data.fit_metrics.adj_r_squared)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

SummaryTable.propTypes = {
  data: PropTypes.shape({
    aic: PropTypes.number.isRequired,
    bic: PropTypes.number.isRequired,
    hqic: PropTypes.number.isRequired,
    fit_metrics: PropTypes.shape({
      r_squared: PropTypes.number.isRequired,
      adj_r_squared: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default SummaryTable;