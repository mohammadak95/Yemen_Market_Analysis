// src/components/ecm-analysis/SummaryTable.js

import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PropTypes from 'prop-types';
import { formatNumber } from '../../utils/formatNumber';

const SummaryTable = ({ data }) => {
  const metrics = [
    {
      name: 'AIC',
      value: formatNumber(data.aic),
      tooltip: 'Akaike Information Criterion: Measures the relative quality of statistical models for a given dataset.',
    },
    {
      name: 'BIC',
      value: formatNumber(data.bic),
      tooltip: 'Bayesian Information Criterion: Similar to AIC but includes a penalty for the number of parameters in the model.',
    },
    {
      name: 'HQIC',
      value: formatNumber(data.hqic),
      tooltip: 'Hannan-Quinn Information Criterion: Another criterion for model selection among a finite set of models.',
    },
    // Add more metrics as needed
  ];

  return (
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Typography variant="h5" sx={{ p: 2, fontWeight: 'bold' }}>
        Summary Statistics
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Metric</TableCell>
            <TableCell align="right" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metrics.map((metric, index) => (
            <TableRow key={`metric-${index}`}>
              <TableCell sx={{ fontSize: '1rem' }}>
                {metric.name}
                <Tooltip title={metric.tooltip}>
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '1rem' }}>
                {metric.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

SummaryTable.propTypes = {
  data: PropTypes.object.isRequired,
};

export default SummaryTable;
