//src/components/ecm-analysis/DiagnosticsTable.js

import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Tooltip } from '@mui/material';
import { Info as InfoIcon } from 'lucide-react';
import PropTypes from 'prop-types';

const DiagnosticsTable = ({ diagnostics }) => {
  const formatNumber = (num) => (typeof num === 'number' ? num.toExponential(4) : 'N/A');

  const getInterpretation = (test, value, pValue) => {
    switch (test) {
      case 'Breusch-Godfrey':
        return pValue < 0.05 ? 'Serial correlation present' : 'No serial correlation';
      case 'ARCH':
        return pValue < 0.05 ? 'Heteroskedasticity present' : 'Homoskedasticity';
      case 'Jarque-Bera':
        return pValue < 0.05 ? 'Non-normal residuals' : 'Normal residuals';
      case 'Durbin-Watson':
        if (value < 1.5) return 'Positive autocorrelation';
        if (value > 2.5) return 'Negative autocorrelation';
        return 'No autocorrelation';
      default:
        return 'N/A';
    }
  };

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" gutterBottom component="div" sx={{ p: 2 }}>
        Diagnostic Tests
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Test</TableCell>
            <TableCell align="right">Statistic</TableCell>
            <TableCell align="right">P-Value</TableCell>
            <TableCell align="right">
              Interpretation
              <Tooltip title="Hover over each test name for more information">
                <InfoIcon size={16} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(diagnostics).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              const testName = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
              return (
                <TableRow key={key}>
                  <TableCell>
                    <Tooltip title={`${testName}: ${value.description || 'No description available'}`}>
                      <span>{testName}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{formatNumber(value.stat)}</TableCell>
                  <TableCell align="right">{formatNumber(value.pvalue)}</TableCell>
                  <TableCell align="right">{getInterpretation(testName, value.stat, value.pvalue)}</TableCell>
                </TableRow>
              );
            }
            return null;
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.object.isRequired,
};

export default DiagnosticsTable;