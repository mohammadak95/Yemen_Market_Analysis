// src/components/analysis/price-differential/CointegrationAnalysis.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Alert,
} from '@mui/material';

const CointegrationAnalysis = ({ cointegrationData }) => {
  if (!cointegrationData) {
    return (
      <Alert severity="info">
        Cointegration analysis is not available for the selected market pair.
      </Alert>
    );
  }

  const {
    test_statistic,
    critical_values,
    p_value,
    num_of_cointegrating_eq,
  } = cointegrationData;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Cointegration Analysis (Johansen Test)
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Test Statistic</TableCell>
            <TableCell>{test_statistic.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>P-Value</TableCell>
            <TableCell>{p_value.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Number of Cointegrating Equations</TableCell>
            <TableCell>{num_of_cointegrating_eq}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Critical Values</TableCell>
            <TableCell>
              {Object.entries(critical_values).map(([level, value]) => (
                <div key={level}>
                  {level}%: {value.toFixed(4)}
                </div>
              ))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {p_value < 0.05 ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          Evidence of cointegration between the market prices (p-value &lt; 0.05).
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No evidence of cointegration found (p-value ≥ 0.05).
        </Alert>
      )}
    </Paper>
  );
};

CointegrationAnalysis.propTypes = {
  cointegrationData: PropTypes.shape({
    test_statistic: PropTypes.number.isRequired,
    critical_values: PropTypes.objectOf(PropTypes.number).isRequired,
    p_value: PropTypes.number.isRequired,
    num_of_cointegrating_eq: PropTypes.number.isRequired,
  }).isRequired,
};

export default CointegrationAnalysis;
