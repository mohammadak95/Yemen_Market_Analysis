// src/components/analysis/spatial-analysis/SpatialDiagnostics.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Box,
  Alert,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const SpatialDiagnostics = ({ diagnostics }) => {
  if (!diagnostics || !diagnostics.moran_i) {
    return (
      <Alert severity="info">
        No diagnostics available
      </Alert>
    );
  }

  const explanations = {
    moran_i: "Moran's I measures spatial autocorrelation. A significant value indicates clustering.",
    'p-value': 'P-value indicates the statistical significance of the Moran\'s I value.',
    r_squared: 'R-squared indicates the proportion of variance explained by the model.',
    adj_r_squared: 'Adjusted R-squared adjusts for the number of predictors in the model.',
  };

  const moranIValue = diagnostics.moran_i.I || diagnostics.moran_i.value;
  const pValue = diagnostics.moran_i['p-value'] || diagnostics.moran_i.p_value;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Spatial Diagnostics
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Tooltip title={explanations.moran_i} arrow>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                  Moran's I <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell>{moranIValue.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Tooltip title={explanations['p-value']} arrow>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                  P-Value <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell>{pValue.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Tooltip title={explanations.r_squared} arrow>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                  R-Squared <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell>{diagnostics.r_squared.toFixed(4)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Tooltip title={explanations.adj_r_squared} arrow>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                  Adjusted R-Squared <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell>{diagnostics.adj_r_squared.toFixed(4)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
};

SpatialDiagnostics.propTypes = {
  diagnostics: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      value: PropTypes.number,
      'p-value': PropTypes.number,
      p_value: PropTypes.number,
    }),
    r_squared: PropTypes.number,
    adj_r_squared: PropTypes.number,
  }),
};

export default SpatialDiagnostics;
