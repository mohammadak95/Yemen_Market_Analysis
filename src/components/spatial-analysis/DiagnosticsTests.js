// src/components/spatial-analysis/DiagnosticsTests.js

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
  Tooltip,
  Box
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return (
      <Typography variant="body1">
        No diagnostic tests data available.
      </Typography>
    );
  }

  const {
    moran_i,
    observations,
    mse,
    r_squared,
    adj_r_squared,
    vif, // Added VIF data
    // Removed VIF and other diagnostics as per user request
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

  // Explanations for each test
  const explanations = {
    moran_i: "Moran&apos;s I assesses spatial autocorrelation in the residuals of the regression model. A significant Moran&apos;s I suggests that the residuals are spatially autocorrelated.",
    observations: 'The number of observations used in the regression analysis.',
    mse: 'Mean Squared Error (MSE) measures the average of the squares of the errors, indicating the quality of the regression model.',
    r_squared: 'R-squared represents the proportion of the variance in the dependent variable that is predictable from the independent variables.',
    adj_r_squared: 'Adjusted R-squared adjusts the R-squared value based on the number of predictors in the model, providing a more accurate measure for multiple regression.',
    // Add more explanations as needed
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagnostic Tests
      </Typography>

      {/* Moran's I Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          <Tooltip title={explanations.moran_i} arrow>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              Moran&apos;s I <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Box>
          </Tooltip>
        </Typography>
        {moran_i ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Moran's I Table">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">I</TableCell>
                  <TableCell align="right">{renderValue(moran_i.I)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">p-value</TableCell>
                  <TableCell align="right">{renderValue(moran_i['p-value'])}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2">No Moran&apos;s I data available.</Typography>
        )}
      </Box>

      {/* Model Statistics Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          <Tooltip title="Model performance metrics indicating the fit and accuracy of the regression model." arrow>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              Model Statistics <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
            </Box>
          </Tooltip>
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Model Statistics Table">
            <TableHead>
              <TableRow>
                <TableCell>Statistic</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { label: 'Observations', value: observations, explanation: explanations.observations },
                { label: 'Mean Squared Error (MSE)', value: mse, explanation: explanations.mse },
                { label: 'R-squared', value: r_squared, explanation: explanations.r_squared },
                { label: 'Adjusted R-squared', value: adj_r_squared, explanation: explanations.adj_r_squared },
              ].map((stat) => (
                <TableRow key={stat.label}>
                  <TableCell>
                    <Tooltip title={stat.explanation} arrow>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                        {stat.label} <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{renderValue(stat.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* VIF Table */}
      {vif && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            <Tooltip title="Variance Inflation Factor (VIF) measures the multicollinearity in regression analysis." arrow>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                Variance Inflation Factor (VIF) <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Box>
            </Tooltip>
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="VIF Table">
              <TableHead>
                <TableRow>
                  <TableCell>Variable</TableCell>
                  <TableCell align="right">VIF</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vif.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.Variable}</TableCell>
                    <TableCell align="right">{renderValue(item.VIF)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );
};

DiagnosticsTests.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      'p-value': PropTypes.number,
    }),
    observations: PropTypes.number,
    mse: PropTypes.number,
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
    vif: PropTypes.arrayOf(
      PropTypes.shape({
        Variable: PropTypes.string,
        VIF: PropTypes.number,
      })
    ),
  }),
};

export default DiagnosticsTests;