// src/components/ecm-analysis/DiagnosticsTable.js

import React from 'react';
import PropTypes from 'prop-types';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const DiagnosticsTable = ({ diagnostics }) => {
  if (!diagnostics || !diagnostics.Variable_1) {
    return <Typography variant="body1">No diagnostic data available.</Typography>;
  }

  const tests = [
    { name: 'Breusch-Godfrey', stat: 'breusch_godfrey_stat', pValue: 'breusch_godfrey_pvalue', description: 'Tests for serial correlation in the residuals' },
    { name: 'ARCH', stat: 'arch_test_stat', pValue: 'arch_test_pvalue', description: 'Assesses heteroskedasticity in the residuals' },
    { name: 'Jarque-Bera', stat: 'jarque_bera_stat', pValue: 'jarque_bera_pvalue', description: 'Tests for normality of residuals' },
    { name: 'Durbin-Watson', stat: 'durbin_watson_stat', pValue: null, description: 'Measures autocorrelation in the residuals' },
    { name: 'Shapiro-Wilk', stat: 'shapiro_wilk_stat', pValue: 'shapiro_wilk_pvalue', description: 'Another test for normality of residuals' }
  ];

  const renderSignificanceIcon = (pValue) => {
    if (pValue === null) return null;
    return pValue < 0.05 ? 
      <CheckCircleIcon color="success" /> : 
      <CancelIcon color="error" />;
  };

  const interpretResults = () => {
    const significantTests = tests.filter(test => 
      test.pValue && diagnostics.Variable_1[test.pValue] < 0.05
    );

    if (significantTests.length === 0) {
      return "All diagnostic tests show no significant issues with the model assumptions.";
    } else {
      const testNames = significantTests.map(test => test.name).join(', ');
      return `The ${testNames} test${significantTests.length > 1 ? 's' : ''} indicate${significantTests.length === 1 ? 's' : ''} potential issues with the model assumptions. Further investigation may be needed.`;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Diagnostic Tests</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Test</TableCell>
              <TableCell align="right">Statistic</TableCell>
              <TableCell align="right">P-Value</TableCell>
              <TableCell align="center">Significant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.name}>
                <TableCell component="th" scope="row">{test.name}</TableCell>
                <TableCell align="right">
                  {diagnostics.Variable_1[test.stat]?.toFixed(4) || 'N/A'}
                </TableCell>
                <TableCell align="right">
                  {test.pValue ? 
                    (diagnostics.Variable_1[test.pValue]?.toFixed(4) || 'N/A') : 
                    'N/A'}
                </TableCell>
                <TableCell align="center">
                  {renderSignificanceIcon(diagnostics.Variable_1[test.pValue])}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" style={{ marginTop: '1rem' }}>
        <strong>Interpretation:</strong> {interpretResults()}
      </Typography>
    </Box>
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
      shapiro_wilk_stat: PropTypes.number,
      shapiro_wilk_pvalue: PropTypes.number,
    }),
  }),
};

export default DiagnosticsTable;