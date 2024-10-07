// src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Typography,
  Tooltip,
} from '@mui/material';
import PropTypes from 'prop-types';

const SummaryTable = ({ data, selectedCommodity, selectedRegime }) => {
  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(2) : 'N/A');

  const rSquared = data.fit_metrics ? data.fit_metrics.r_squared : null;

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" gutterBottom component="div" sx={{ p: 2 }}>
        Summary: {selectedCommodity} - {selectedRegime}
      </Typography>
      {rSquared !== null && (
        <Typography variant="body2" sx={{ pl: 2, pb: 2 }}>
          {rSquared > 0.8
            ? 'The model explains a high proportion of the variance in the data.'
            : 'The model may not explain the variance in the data well.'}
        </Typography>
      )}
      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell>
              <Tooltip title="Akaike Information Criterion - used for model selection">
                <span>AIC</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">{formatNumber(data.aic)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Tooltip title="Bayesian Information Criterion - used for model selection">
                <span>BIC</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">{formatNumber(data.bic)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Tooltip title="Hannan-Quinn Information Criterion - used for model selection">
                <span>HQIC</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">{formatNumber(data.hqic)}</TableCell>
          </TableRow>
          {data.fit_metrics && (
            <>
              <TableRow>
                <TableCell>
                  <Tooltip title="Proportion of variance explained by the model">
                    <span>R-squared</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{formatNumber(data.fit_metrics.r_squared)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Tooltip title="Adjusted R-squared accounts for the number of predictors in the model">
                    <span>Adjusted R-squared</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  {formatNumber(data.fit_metrics.adj_r_squared)}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

SummaryTable.propTypes = {
  data: PropTypes.shape({
    aic: PropTypes.number.isRequired,
    bic: PropTypes.number.isRequired,
    hqic: PropTypes.number.isRequired,
    fit_metrics: PropTypes.shape({
      r_squared: PropTypes.number,
      adj_r_squared: PropTypes.number,
    }),
  }).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
};

export default SummaryTable;
