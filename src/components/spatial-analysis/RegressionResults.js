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
  TableRow,
  TableHead,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { green, red } from '@mui/material/colors';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const RegressionResults = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No regression results available.
      </Typography>
    );
  }

  const { coefficients, intercept, p_values, r_squared, adj_r_squared, mse, observations, vif } = data;

  // Prepare data for coefficient plot
  const coefLabels = Object.keys(coefficients);
  const coefValues = Object.values(coefficients);

  const chartData = {
    labels: coefLabels,
    datasets: [
      {
        label: 'Coefficient Value',
        data: coefValues,
        backgroundColor: coefValues.map((value) =>
          value >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        ),
        borderColor: coefValues.map((value) =>
          value >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Regression Coefficients' },
    },
  };

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
              <TableCell>Significant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coefLabels.map((variable) => (
              <TableRow key={variable}>
                <TableCell>{variable}</TableCell>
                <TableCell>{coefficients[variable].toFixed(4)}</TableCell>
                <TableCell>{p_values[variable].toFixed(4)}</TableCell>
                <TableCell>
                  {p_values[variable] < 0.05 ? (
                    <CheckCircle sx={{ color: green[500] }} />
                  ) : (
                    <Cancel sx={{ color: red[500] }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>Intercept</TableCell>
              <TableCell>{intercept.toFixed(4)}</TableCell>
              <TableCell>N/A</TableCell>
              <TableCell>N/A</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Coefficient Bar Chart */}
      <Bar data={chartData} options={chartOptions} />

      {/* Additional Metrics */}
      <Typography variant="body2" sx={{ mt: 2 }}>
        <strong>R-Squared:</strong> {r_squared.toFixed(4)}
      </Typography>
      <Typography variant="body2">
        <strong>Adjusted R-Squared:</strong> {adj_r_squared.toFixed(4)}
      </Typography>
      <Typography variant="body2">
        <strong>Mean Squared Error (MSE):</strong> {mse.toFixed(4)}
      </Typography>
      <Typography variant="body2">
        <strong>Observations:</strong> {observations}
      </Typography>

      {/* VIF Table */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
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

RegressionResults.propTypes = {
  data: PropTypes.shape({
    coefficients: PropTypes.object.isRequired,
    intercept: PropTypes.number.isRequired,
    p_values: PropTypes.object.isRequired,
    r_squared: PropTypes.number.isRequired,
    adj_r_squared: PropTypes.number.isRequired,
    mse: PropTypes.number.isRequired,
    observations: PropTypes.number.isRequired,
    vif: PropTypes.arrayOf(
      PropTypes.shape({
        Variable: PropTypes.string.isRequired,
        VIF: PropTypes.number.isRequired,
      })
    ).isRequired,
  }),
};

export default RegressionResults;
