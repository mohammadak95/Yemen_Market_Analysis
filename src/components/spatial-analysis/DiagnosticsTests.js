// src/components/spatial-analysis/DiagnosticsTests.js

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
  TableHead, // Imported to fix the first error
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { green, red } from '@mui/material/colors';
import { Scatter } from 'react-chartjs-2';
import 'chart.js/auto';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No diagnostics tests available.
      </Typography>
    );
  }

  const { moran_i, vif, residuals } = data; // Ensure 'residuals' is passed

  // Prepare data for Residuals vs Fitted Values Scatter Plot
  const residualsPlotData = {
    labels: residuals.map((residual, index) => index + 1),
    datasets: [
      {
        label: 'Residuals',
        data: residuals.map((residual, index) => ({ x: index + 1, y: residual })),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  const residualsPlotOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Residuals vs. Fitted Values' },
    },
    scales: {
      x: {
        title: { display: true, text: 'Fitted Values' },
      },
      y: {
        title: { display: true, text: 'Residuals' },
      },
    },
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagnostics Tests
      </Typography>
      <TableContainer>
        <Table>
          <TableHead> {/* Now properly defined */}
            <TableRow>
              <TableCell>Test</TableCell>
              <TableCell>Statistic</TableCell>
              <TableCell>P-Value</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Moran's I */}
            <TableRow>
              <TableCell>Moran&apos;s I</TableCell> {/* Escaped single quote */}
              <TableCell>{moran_i.I.toFixed(4)}</TableCell>
              <TableCell>{moran_i['p-value'].toFixed(4)}</TableCell>
              <TableCell>
                {moran_i['p-value'] < 0.05 ? (
                  <CheckCircle sx={{ color: green[500] }} />
                ) : (
                  <Cancel sx={{ color: red[500] }} />
                )}
              </TableCell>
            </TableRow>
            {/* VIFs */}
            {vif.map((item, index) => (
              <TableRow key={index}>
                <TableCell>VIF: {item.Variable}</TableCell>
                <TableCell>{item.VIF.toFixed(4)}</TableCell>
                <TableCell>N/A</TableCell>
                <TableCell>
                  {item.VIF < 5 ? (
                    <CheckCircle sx={{ color: green[500] }} />
                  ) : (
                    <Cancel sx={{ color: red[500] }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Residuals vs Fitted Values Scatter Plot */}
      {residuals && residuals.length > 0 && (
        <Scatter data={residualsPlotData} options={residualsPlotOptions} sx={{ mt: 4 }} />
      )}
    </Paper>
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }).isRequired,
    vif: PropTypes.arrayOf(
      PropTypes.shape({
        Variable: PropTypes.string.isRequired,
        VIF: PropTypes.number.isRequired,
      })
    ).isRequired,
    residuals: PropTypes.arrayOf(PropTypes.number), // Ensure residuals are passed
  }),
};

export default DiagnosticsTests;
