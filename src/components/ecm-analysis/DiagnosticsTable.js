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
  IconButton,
  Box,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PropTypes from 'prop-types';

const DiagnosticsTable = ({ diagnostics }) => {
  const diagnosticTests = [
    {
      name: 'Breusch-Godfrey Test',
      keyStat: 'breusch_godfrey_stat',
      keyP: 'breusch_godfrey_pvalue',
      tooltip: 'Tests for serial correlation in the residuals. A significant p-value indicates the presence of autocorrelation.',
      isCritical: true,
    },
    {
      name: 'ARCH Test',
      keyStat: 'arch_test_stat',
      keyP: 'arch_test_pvalue',
      tooltip: 'Assesses heteroskedasticity in the residuals. A significant p-value suggests changing variance over time.',
      isCritical: true,
    },
    {
      name: 'Jarque-Bera Test',
      keyStat: 'jarque_bera_stat',
      keyP: 'jarque_bera_pvalue',
      tooltip: 'Tests for normality of residuals. A significant p-value indicates non-normality.',
      isCritical: true,
    },
    {
      name: 'Durbin-Watson Statistic',
      keyStat: 'durbin_watson_stat',
      keyP: null,
      tooltip: 'Measures autocorrelation in the residuals. Values close to 2 suggest no autocorrelation.',
      isCritical: false,
    },
    {
      name: 'White Test',
      keyStat: 'white_test_stat',
      keyP: 'white_test_pvalue',
      tooltip: 'Another test for heteroskedasticity. Significant p-values indicate heteroskedasticity.',
      isCritical: true,
    },
    {
      name: 'Shapiro-Wilk Test',
      keyStat: 'shapiro_wilk_stat',
      keyP: 'shapiro_wilk_pvalue',
      tooltip: 'Another test for normality of residuals. Significant p-values indicate non-normality.',
      isCritical: true,
    },
  ];

  const getCellStyle = (pValue) => {
    if (pValue === null || pValue === undefined) return {};
    return pValue < 0.05
      ? { backgroundColor: '#ffebee', color: '#c62828' } // Light red for significant
      : {};
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ p: 2, fontWeight: 'bold' }}>
        Diagnostic Tests
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Test</TableCell>
            <TableCell align="right" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              Statistic
            </TableCell>
            <TableCell align="right" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              P-Value
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>
              <Typography variant="h6">
                USD Price
              </Typography>
            </TableCell>
          </TableRow>
          {diagnosticTests.map((test, index) => (
            <TableRow key={`test-${index}`}>
              <TableCell>
                {test.name}
                <Tooltip title={test.tooltip} arrow placement="top">
                  <IconButton size="small" sx={{ ml: 1 }} aria-label={`${test.name} info`}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                {typeof diagnostics.Variable_1[test.keyStat] === 'number'
                  ? diagnostics.Variable_1[test.keyStat].toFixed(4)
                  : 'N/A'}
              </TableCell>
              <TableCell align="right" sx={test.keyP ? getCellStyle(diagnostics.Variable_1[test.keyP]) : {}}>
                {test.keyP
                  ? typeof diagnostics.Variable_1[test.keyP] === 'number'
                    ? diagnostics.Variable_1[test.keyP].toFixed(4)
                    : 'N/A'
                  : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          * Cells highlighted in red indicate significant results at the 5% significance level.
        </Typography>
      </Box>
    </TableContainer>
  );
};

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.shape({
    Variable_1: PropTypes.shape({
      breusch_godfrey_stat: PropTypes.number,
      breusch_godfrey_pvalue: PropTypes.number,
      arch_test_stat: PropTypes.number,
      arch_test_pvalue: PropTypes.number,
      jarque_bera_stat: PropTypes.number,
      jarque_bera_pvalue: PropTypes.number,
      durbin_watson_stat: PropTypes.number,
      white_test_stat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      white_test_pvalue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      shapiro_wilk_stat: PropTypes.number,
      shapiro_wilk_pvalue: PropTypes.number,
      acf: PropTypes.arrayOf(PropTypes.number),
      pacf: PropTypes.arrayOf(PropTypes.number),
    }).isRequired,
  }).isRequired,
};

export default DiagnosticsTable;
