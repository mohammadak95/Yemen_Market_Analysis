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
  Box,
  Alert,
  AlertTitle,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const DiagnosticsTests = ({ data }) => {
  if (!data) {
    return (
      <Alert severity="info">
        <AlertTitle>No Data Available</AlertTitle>
        Diagnostic test results are not available at this time.
      </Alert>
    );
  }

  const {
    moran_i,
    observations,
    mse,
    r_squared,
    adj_r_squared,
    vif,
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

  const explanations = {
    moran_i: "Moran's I assesses spatial autocorrelation in the residuals of the regression model. A significant Moran's I suggests spatial autocorrelation.",
    observations: 'The number of observations used in the regression analysis.',
    mse: 'Mean Squared Error (MSE) measures the average squared difference between predicted and actual values.',
    r_squared: 'R-squared represents the proportion of variance in the dependent variable explained by the independent variables.',
    adj_r_squared: 'Adjusted R-squared adjusts R-squared based on the number of predictors, providing a more accurate measure for multiple regression.',
    vif: 'Variance Inflation Factor (VIF) measures multicollinearity in the regression variables.',
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagnostic Tests
      </Typography>

      {/* Moran's I Table */}
      {moran_i && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            <Tooltip title={explanations.moran_i} arrow>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                Moran&apos;s I <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Box>
            </Tooltip>
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>I Statistic</TableCell>
                  <TableCell align="right">{renderValue(moran_i.value)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P-value</TableCell>
                  <TableCell align="right">{renderValue(moran_i.p_value)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Model Statistics Table */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Model Statistics
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Statistic</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Tooltip title={explanations.observations} arrow>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                      Observations <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{renderValue(observations)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Tooltip title={explanations.mse} arrow>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                      MSE <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{renderValue(mse)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Tooltip title={explanations.r_squared} arrow>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                      R-squared <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{renderValue(r_squared)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Tooltip title={explanations.adj_r_squared} arrow>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                      Adjusted R-squared <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{renderValue(adj_r_squared)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* VIF Table */}
      {vif && vif.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            <Tooltip title={explanations.vif} arrow>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                Variance Inflation Factors (VIF)
                <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Box>
            </Tooltip>
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
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
      value: PropTypes.number,
      p_value: PropTypes.number,
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