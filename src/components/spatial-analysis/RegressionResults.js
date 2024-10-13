// src/components/spatial-analysis/RegressionResults.js

import React from 'react';
import PropTypes from 'prop-types';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip 
} from '@mui/material';

const RegressionResults = ({ data }) => {
  if (!data || !data.coefficients) {
    return (
      <Typography variant="body1">
        No regression results available.
      </Typography>
    );
  }

  const {
    coefficients,
    std_errors,
    t_values,
    p_values,
    r_squared,
    adj_r_squared,
  } = data;

  const renderValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(4);
    }
    if (typeof value === 'string') {
      return value;
    }
    return 'N/A';
  };

  const getPValueColor = (p) => {
    if (p < 0.01) return 'error';
    if (p < 0.05) return 'warning';
    return 'default';
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Regression Results</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell>Coefficient</TableCell>
              <TableCell>Standard Error</TableCell>
              <TableCell>T-Statistic</TableCell>
              <TableCell>P-Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(coefficients).map(([variable, coefficient]) => (
              <TableRow key={variable}>
                <TableCell>{variable}</TableCell>
                <TableCell>{renderValue(coefficient)}</TableCell>
                <TableCell>{renderValue(std_errors?.[variable])}</TableCell>
                <TableCell>{renderValue(t_values?.[variable])}</TableCell>
                <TableCell>
                  <Chip 
                    label={renderValue(p_values?.[variable])} 
                    color={getPValueColor(p_values?.[variable])}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body1" sx={{ mt: 2 }}>
        <strong>R-squared:</strong> {renderValue(r_squared)}
      </Typography>
      <Typography variant="body1">
        <strong>Adjusted R-squared:</strong> {renderValue(adj_r_squared)}
      </Typography>
    </Paper>
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    coefficients: PropTypes.object.isRequired,
    std_errors: PropTypes.object,
    t_values: PropTypes.object,
    p_values: PropTypes.object,
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
  }),
};

export default RegressionResults;