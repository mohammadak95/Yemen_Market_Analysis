// src/components/spatial-analysis/DiagnosticsTests.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableRow, TableHead } from '@mui/material';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No diagnostics tests available.
      </Typography>
    );
  }

  const { moran_i, vif } = data;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagnostics Tests
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Test</TableCell>
              <TableCell>Statistic</TableCell>
              <TableCell>P-Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Moran&apos;s I</TableCell>
              <TableCell>{moran_i.I.toFixed(4)}</TableCell>
              <TableCell>{moran_i['p-value'].toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Moran&apos;s I P-Value</TableCell>
              <TableCell>{moran_i['p-value'].toFixed(4)}</TableCell>
              <TableCell>N/A</TableCell> {/* Adjusted to include P-Value properly */}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Variance Inflation Factor (VIF)
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell>VIF</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vif.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.Variable}</TableCell>
                <TableCell>{item.VIF.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }).isRequired,
    vif: PropTypes.arrayOf(
      PropTypes.shape({
        Variable: PropTypes.string.isRequired,
        VIF: PropTypes.number.isRequired,
      })
    ).isRequired,
  }),
};

export default DiagnosticsTests;
