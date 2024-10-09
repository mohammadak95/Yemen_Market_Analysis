// src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

const SummaryTable = ({ data }) => {
  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(4) : 'N/A');

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" gutterBottom component="div" sx={{ p: 2 }}>
        Summary: {data.commodity} - {data.regime}
      </Typography>
      <Table size="small">
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
        </TableBody>
      </Table>
    </TableContainer>
  );
};

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