// src/components/analysis/price-differential/EnhancedRegressionResults.js

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
  Box,
} from '@mui/material';
import { useTechnicalHelp } from '@/hooks';;

const EnhancedRegressionResults = ({ regressionData }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');

  if (!regressionData) {
    return (
      <Alert severity="info">
        No regression results available for this market pair.
      </Alert>
    );
  }

  const {
    intercept,
    slope,
    r_squared,
    adjusted_r_squared,
    p_value,
    durbin_watson,
    breusch_pagan_pvalue,
    aic,
    bic,
  } = regressionData;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Regression Analysis and Diagnostics
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Intercept</TableCell>
            <TableCell>{intercept !== undefined ? intercept.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Slope</TableCell>
            <TableCell>{slope !== undefined ? slope.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>R-Squared</TableCell>
            <TableCell>{r_squared !== undefined ? r_squared.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Adjusted R-Squared</TableCell>
            <TableCell>{adjusted_r_squared !== undefined ? adjusted_r_squared.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>P-Value</TableCell>
            <TableCell>{p_value !== undefined ? p_value.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>AIC</TableCell>
            <TableCell>{aic !== undefined ? aic.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>BIC</TableCell>
            <TableCell>{bic !== undefined ? bic.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Durbin-Watson Statistic</TableCell>
            <TableCell>{durbin_watson !== undefined ? durbin_watson.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Breusch-Pagan P-Value</TableCell>
            <TableCell>{breusch_pagan_pvalue !== undefined ? breusch_pagan_pvalue.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Box sx={{ mt: 2 }}>
        {p_value !== undefined ? (
          p_value < 0.05 ? (
            <Alert severity="success">
              The regression model is statistically significant (p-value &lt; 0.05).
            </Alert>
          ) : (
            <Alert severity="warning">
              The regression model is not statistically significant (p-value ≥ 0.05).
            </Alert>
          )
        ) : (
          <Alert severity="info">
            P-Value is not available.
          </Alert>
        )}
        {breusch_pagan_pvalue !== undefined ? (
          breusch_pagan_pvalue < 0.05 ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Evidence of heteroscedasticity detected (Breusch-Pagan p-value &lt; 0.05).
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mt: 1 }}>
              No evidence of heteroscedasticity detected (Breusch-Pagan p-value ≥ 0.05).
            </Alert>
          )
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>
            Breusch-Pagan P-Value is not available.
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

EnhancedRegressionResults.propTypes = {
  regressionData: PropTypes.shape({
    intercept: PropTypes.number,
    slope: PropTypes.number,
    r_squared: PropTypes.number,
    adjusted_r_squared: PropTypes.number,
    p_value: PropTypes.number,
    durbin_watson: PropTypes.number,
    breusch_pagan_pvalue: PropTypes.number,
    aic: PropTypes.number,
    bic: PropTypes.number,
  }).isRequired,
};

export default EnhancedRegressionResults;
