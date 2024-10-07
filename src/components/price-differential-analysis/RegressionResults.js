// src/components/price-differential/RegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const RegressionResults = ({ data }) => {
  console.log("RegressionResults data:", data);

  if (!data || !data.stationarity) {
    console.log("Missing regression data. Data structure:", JSON.stringify(data, null, 2));
    return (
      <Typography variant="body1">
        No regression results available for this market pair.
      </Typography>
    );
  }

  const { stationarity } = data;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Stationarity Test Results</Typography>
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
              <TableCell>ADF Test</TableCell>
              <TableCell>{stationarity.ADF.statistic.toFixed(4)}</TableCell>
              <TableCell>{stationarity.ADF["p-value"].toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>KPSS Test</TableCell>
              <TableCell>{stationarity.KPSS.statistic.toFixed(4)}</TableCell>
              <TableCell>{stationarity.KPSS["p-value"].toFixed(4)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    stationarity: PropTypes.object,
  }),
};

export default RegressionResults;