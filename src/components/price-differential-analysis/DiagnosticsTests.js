// src/components/price-differential/DiagnosticsTests.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';

const DiagnosticsTests = ({ data }) => {
  console.log("DiagnosticsTests data:", data);

  if (!data) {
    console.log("Missing diagnostics data. Data structure:", JSON.stringify(data, null, 2));
    return (
      <Typography variant="body1">
        No diagnostic tests available for this market pair.
      </Typography>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Market Pair Diagnostics</Typography>
      <TableContainer>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Conflict Correlation</TableCell>
              <TableCell>{data.conflict_correlation.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Common Dates</TableCell>
              <TableCell>{data.common_dates}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Distance</TableCell>
              <TableCell>{data.distance.toFixed(4)} km</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>P-Value</TableCell>
              <TableCell>{data.p_value.toFixed(4)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.shape({
    conflict_correlation: PropTypes.number,
    common_dates: PropTypes.number,
    distance: PropTypes.number,
    p_value: PropTypes.number,
  }),
};

export default DiagnosticsTests;