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
  Button,
} from '@mui/material';
import { SaveAlt } from '@mui/icons-material';

const RegressionResults = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No regression results available.
      </Typography>
    );
  }

  const { coefficients, intercept, r_squared, adj_r_squared, mse, observations } = data;

  // Function to export table data as CSV
  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Intercept', intercept.toFixed(4)],
      ...Object.entries(coefficients).map(([key, value]) => [key, value.toFixed(4)]),
      ['R-squared', r_squared.toFixed(4)],
      ['Adjusted R-squared', adj_r_squared.toFixed(4)],
      ['Mean Squared Error (MSE)', mse.toFixed(4)],
      ['Observations', observations],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' +
      rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'regression_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Regression Results
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<SaveAlt />}
        onClick={exportCSV}
        sx={{ mb: 2 }}
      >
        Export as CSV
      </Button>
      <TableContainer>
        <Table aria-label="Regression Results Table">
          <TableHead>
            <TableRow>
              <TableCell><strong>Metric</strong></TableCell>
              <TableCell><strong>Value</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Intercept</TableCell>
              <TableCell>{intercept.toFixed(4)}</TableCell>
            </TableRow>
            {Object.entries(coefficients).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell>{key}</TableCell>
                <TableCell>{value.toFixed(4)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>R-squared</TableCell>
              <TableCell>{r_squared.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Adjusted R-squared</TableCell>
              <TableCell>{adj_r_squared.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mean Squared Error (MSE)</TableCell>
              <TableCell>{mse.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Observations</TableCell>
              <TableCell>{observations}</TableCell>
            </TableRow>
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
    r_squared: PropTypes.number.isRequired,
    adj_r_squared: PropTypes.number.isRequired,
    mse: PropTypes.number.isRequired,
    observations: PropTypes.number.isRequired,
  }),
};

export default RegressionResults;
