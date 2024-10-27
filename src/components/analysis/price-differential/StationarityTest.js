// src/components/analysis/price-differential/StationarityTest.js

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

const StationarityTest = ({ stationarityData }) => {
  if (!stationarityData) {
    return (
      <Alert severity="info">
        Stationarity test results are not available for the selected data.
      </Alert>
    );
  }

  const {
    adf_statistic,
    p_value,
    critical_values,
    market_name,
  } = stationarityData;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Stationarity Test (ADF Test) for {market_name}
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>ADF Statistic</TableCell>
            <TableCell>{adf_statistic.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>P-Value</TableCell>
            <TableCell>{p_value.toFixed(4)}</TableCell>
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
          The time series is stationary (p-value &lt; 0.05).
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mt: 2 }}>
          The time series is non-stationary (p-value ≥ 0.05).
        </Alert>
      )}
    </Paper>
  );
};

StationarityTest.propTypes = {
  stationarityData: PropTypes.shape({
    adf_statistic: PropTypes.number.isRequired,
    p_value: PropTypes.number.isRequired,
    critical_values: PropTypes.objectOf(PropTypes.number).isRequired,
    market_name: PropTypes.string.isRequired,
  }).isRequired,
};

export default StationarityTest;
