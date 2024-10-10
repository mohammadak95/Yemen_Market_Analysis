// src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import PropTypes from 'prop-types';
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper, Typography } from '@mui/material';

const SummaryTable = ({ data }) => (
  <TableContainer component={Paper} sx={{ mb: 2 }}>
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">AIC</Typography>
          </TableCell>
          <TableCell>{typeof data.aic === 'number' ? data.aic.toFixed(2) : 'N/A'}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">BIC</Typography>
          </TableCell>
          <TableCell>{typeof data.bic === 'number' ? data.bic.toFixed(2) : 'N/A'}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">HQIC</Typography>
          </TableCell>
          <TableCell>{typeof data.hqic === 'number' ? data.hqic.toFixed(2) : 'N/A'}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Alpha (α)</Typography>
          </TableCell>
          <TableCell>
            {typeof data.alpha === 'number'
              ? data.alpha.toFixed(4)
              : <Typography color="text.secondary">N/A</Typography>}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Beta (β)</Typography>
          </TableCell>
          <TableCell>
            {typeof data.beta === 'number'
              ? data.beta.toFixed(4)
              : <Typography color="text.secondary">N/A</Typography>}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Gamma (γ)</Typography>
          </TableCell>
          <TableCell>
            {typeof data.gamma === 'number'
              ? data.gamma.toFixed(4)
              : <Typography color="text.secondary">N/A</Typography>}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
);

SummaryTable.propTypes = {
  data: PropTypes.shape({
    aic: PropTypes.number.isRequired,
    bic: PropTypes.number.isRequired,
    hqic: PropTypes.number.isRequired,
    alpha: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
    beta: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
    gamma: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  }).isRequired,
};

export default SummaryTable;