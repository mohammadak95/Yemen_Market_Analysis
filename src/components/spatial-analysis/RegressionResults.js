// src/components/spatial-analysis/RegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

const RegressionResults = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No regression results available.
      </Typography>
    );
  }

  const { coefficients, intercept, p_values, r_squared, adj_r_squared, mse, observations } = data;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Regression Results
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell>Coefficient</TableCell>
              <TableCell>P-Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(coefficients).map((variable) => (
              <TableRow key={variable}>
                <TableCell>{variable}</TableCell>
                <TableCell>{coefficients[variable].toFixed(4)}</TableCell>
                <TableCell>{p_values[variable].toFixed(4)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>Intercept</TableCell>
              <TableCell>{intercept.toFixed(4)}</TableCell>
              <TableCell>N/A</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" sx={{ mt: 2 }}>
        R-Squared: {r_squared.toFixed(4)}
      </Typography>
      <Typography variant="body2">
        Adjusted R-Squared: {adj_r_squared.toFixed(4)}
      </Typography>
      <Typography variant="body2">
        Mean Squared Error (MSE): {mse.toFixed(4)}
      </Typography>
      <Typography variant="body2">
        Observations: {observations}
      </Typography>
    </Paper>
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    coefficients: PropTypes.object.isRequired,
    intercept: PropTypes.number.isRequired,
    p_values: PropTypes.object.isRequired,
    r_squared: PropTypes.number.isRequired,
    adj_r_squared: PropTypes.number.isRequired,
    mse: PropTypes.number.isRequired,
    observations: PropTypes.number.isRequired,
  }),
};

export default RegressionResults;
