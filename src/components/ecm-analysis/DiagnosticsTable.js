// src/components/ecm-analysis/DiagnosticsTable.js

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tooltip,
  Box,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

const DiagnosticsTable = ({ diagnostics }) => {
  if (!diagnostics) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No diagnostic data available for this model.</Typography>
      </Box>
    );
  }

  // Preprocess diagnostics to group stat and pvalue
  const processedDiagnostics = {};

  Object.entries(diagnostics).forEach(([key, value]) => {
    const match = key.match(/(.*)_(stat|pvalue)$/);
    if (match) {
      const testName = match[1];
      const statOrPvalue = match[2]; // 'stat' or 'pvalue'
      if (!processedDiagnostics[testName]) {
        processedDiagnostics[testName] = {};
      }
      processedDiagnostics[testName][statOrPvalue] = value;
    } else {
      // Handle other keys like 'durbin_watson_stat'
      processedDiagnostics[key] = value;
    }
  });

  const formatNumber = (num) =>
    typeof num === 'number' ? Number.parseFloat(num).toFixed(2) : 'N/A';

  const getInterpretation = (test, value, pValue) => {
    let interpretation = '';
    let isIssue = false;
    switch (test) {
      case 'Breusch Godfrey':
        interpretation = pValue < 0.05 ? 'Serial correlation present' : 'No serial correlation';
        isIssue = pValue < 0.05;
        break;
      case 'Arch Test':
        interpretation = pValue < 0.05 ? 'Heteroskedasticity present' : 'Homoskedasticity';
        isIssue = pValue < 0.05;
        break;
      case 'Jarque Bera':
        interpretation = pValue < 0.05 ? 'Non-normal residuals' : 'Normal residuals';
        isIssue = pValue < 0.05;
        break;
      case 'Durbin Watson Stat':
        if (value < 1.5) {
          interpretation = 'Positive autocorrelation';
          isIssue = true;
        } else if (value > 2.5) {
          interpretation = 'Negative autocorrelation';
          isIssue = true;
        } else {
          interpretation = 'No autocorrelation';
          isIssue = false;
        }
        break;
      default:
        interpretation = 'N/A';
    }
    return { interpretation, isIssue };
  };

  const getCellStyle = (isIssue) => ({
    color: isIssue ? 'red' : 'green',
  });

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" gutterBottom component="div" sx={{ p: 2 }}>
        Diagnostic Tests
      </Typography>
      <Table size="small" aria-label="Diagnostic Tests Table">
        <TableHead>
          <TableRow>
            <TableCell>Test</TableCell>
            <TableCell align="right">Statistic</TableCell>
            <TableCell align="right">P-Value</TableCell>
            <TableCell align="right">
              Interpretation
              <Tooltip title="Hover over test names for more info">
                <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(processedDiagnostics).map(([key, value]) => {
            const testName = key
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            if (typeof value === 'object' && value !== null) {
              const stat = value.stat;
              const pValue = value.pvalue;

              const { interpretation, isIssue } = getInterpretation(testName, stat, pValue);

              return (
                <TableRow key={key}>
                  <TableCell component="th" scope="row">
                    <Tooltip title="Click for more information">
                      <span>{testName.replace(/_/g, ' ')}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{formatNumber(stat)}</TableCell>
                  <TableCell align="right">{formatNumber(pValue)}</TableCell>
                  <TableCell align="right" style={getCellStyle(isIssue)}>
                    {interpretation}
                  </TableCell>
                </TableRow>
              );
            } else if (typeof value === 'number') {
              const { interpretation, isIssue } = getInterpretation(testName, value, null);

              return (
                <TableRow key={key}>
                  <TableCell component="th" scope="row">
                    <Tooltip title="Click for more information">
                      <span>{testName.replace(/_/g, ' ')}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{formatNumber(value)}</TableCell>
                  <TableCell align="right">N/A</TableCell>
                  <TableCell align="right" style={getCellStyle(isIssue)}>
                    {interpretation}
                  </TableCell>
                </TableRow>
              );
            } else {
              return null;
            }
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.object,
};

export default DiagnosticsTable;
