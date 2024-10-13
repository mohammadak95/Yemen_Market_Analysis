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
  Chip,
  Box,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

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
    if (p < 0.01) return 'success';
    if (p < 0.05) return 'warning';
    return 'default';
  };

  const getCoefficientIcon = (coef) => {
    return coef > 0 ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Regression Results
      </Typography>
      <TableContainer component={Box}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell align="right">Coefficient</TableCell>
              <TableCell align="right">P-Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(coefficients).map(([variable, coefficient]) => (
              <TableRow key={variable}>
                <TableCell>{variable}</TableCell>
                <TableCell align="right">
                  {getCoefficientIcon(coefficient)}
                  {renderValue(coefficient)}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={renderValue(p_values?.[variable])}
                    color={getPValueColor(p_values?.[variable])}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>R-squared:</strong> {renderValue(r_squared)}
        </Typography>
        <Typography variant="body2">
          <strong>Adjusted R-squared:</strong> {renderValue(adj_r_squared)}
        </Typography>
      </Box>
    </Paper>
  );
};

RegressionResults.propTypes = {
  data: PropTypes.shape({
    coefficients: PropTypes.object.isRequired,
    p_values: PropTypes.object,
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
  }),
};

export default RegressionResults;