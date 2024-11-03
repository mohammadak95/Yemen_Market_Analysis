// src/components/analysis/spatial-analysis/SpatialDiagnostics.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Table, TableBody, TableRow, TableCell } from '@mui/material';

const SpatialDiagnostics = ({ diagnostics }) => {
  if (!diagnostics || !diagnostics.moran_i) {
    return <div>No diagnostics available</div>;
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Diagnostics
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Moran's I</TableCell>
            <TableCell>{diagnostics.moran_i.I.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>P-Value</TableCell>
            <TableCell>{diagnostics.moran_i['p-value'].toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>R-Squared</TableCell>
            <TableCell>{diagnostics.r_squared.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Adjusted R-Squared</TableCell>
            <TableCell>{diagnostics.adj_r_squared.toFixed(4)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
};

SpatialDiagnostics.propTypes = {
  diagnostics: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }),
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
  }),
};

export default SpatialDiagnostics;
