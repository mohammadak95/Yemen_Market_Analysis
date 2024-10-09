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
} from '@mui/material';
import PropTypes from 'prop-types';

const DiagnosticsTable = ({ diagnostics }) => {
  const formatNumber = (num) => (typeof num === 'number' ? num.toFixed(4) : 'N/A');

  const renderDiagnostics = (variable, name) => (
    <>
      <TableRow>
        <TableCell colSpan={3}>
          <Typography variant="h6">{name}</Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Breusch-Godfrey</TableCell>
        <TableCell>{formatNumber(variable.breusch_godfrey_stat)}</TableCell>
        <TableCell>{formatNumber(variable.breusch_godfrey_pvalue)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>ARCH Test</TableCell>
        <TableCell>{formatNumber(variable.arch_test_stat)}</TableCell>
        <TableCell>{formatNumber(variable.arch_test_pvalue)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Jarque-Bera</TableCell>
        <TableCell>{formatNumber(variable.jarque_bera_stat)}</TableCell>
        <TableCell>{formatNumber(variable.jarque_bera_pvalue)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Durbin-Watson</TableCell>
        <TableCell>{formatNumber(variable.durbin_watson_stat)}</TableCell>
        <TableCell>N/A</TableCell>
      </TableRow>
    </>
  );

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" gutterBottom component="div" sx={{ p: 2 }}>
        Diagnostic Tests
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Test</TableCell>
            <TableCell>Statistic</TableCell>
            <TableCell>P-Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {renderDiagnostics(diagnostics.Variable_1, 'USD Price')}
          {renderDiagnostics(diagnostics.Variable_2, 'Conflict Intensity')}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

DiagnosticsTable.propTypes = {
  diagnostics: PropTypes.shape({
    Variable_1: PropTypes.object.isRequired,
    Variable_2: PropTypes.object.isRequired,
  }).isRequired,
};

export default DiagnosticsTable;