// src/components/analysis/ecm/DiagnosticsHelp.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import TechnicalTooltip from '../../common/TechnicalTooltip';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const DiagnosticsHelp = ({ diagnostics }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('ecm');

  const interpretDiagnostic = (test, value, pValue) => {
    switch (test) {
      case 'moransI':
        return {
          result: value > 0 ? 'Positive spatial autocorrelation' : 'Negative spatial autocorrelation',
          significant: pValue < 0.05,
          interpretation: `${pValue < 0.05 ? 'Significant' : 'No significant'} spatial clustering of residuals`
        };
      case 'jarqueBera':
        return {
          result: pValue < 0.05 ? 'Non-normal residuals' : 'Normal residuals',
          significant: pValue < 0.05,
          interpretation: `Residuals ${pValue < 0.05 ? 'do not follow' : 'follow'} a normal distribution`
        };
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Diagnostic Tests
        <TechnicalTooltip
          componentType="ecm"
          element="diagnostics"
          tooltipContent={getTechnicalTooltip('diagnostics')}
        />
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Test</TableCell>
            <TableCell align="right">Statistic</TableCell>
            <TableCell align="right">P-Value</TableCell>
            <TableCell>Interpretation</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(diagnostics || {}).map(([test, { statistic, pValue }]) => {
            const interpretation = interpretDiagnostic(test, statistic, pValue);
            if (!interpretation) return null;

            return (
              <TableRow key={test}>
                <TableCell>
                  {test}
                  <TechnicalTooltip
                    componentType="ecm"
                    element={`diagnostics.${test}`}
                    tooltipContent={getTechnicalTooltip(`diagnostics.${test}`)}
                  />
                </TableCell>
                <TableCell align="right">{statistic.toFixed(4)}</TableCell>
                <TableCell align="right">{pValue.toFixed(4)}</TableCell>
                <TableCell>{interpretation.result}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Key Implications:
        </Typography>
        <Box component="ul" sx={{ mt: 1 }}>
          {Object.entries(diagnostics || {}).map(([test, { statistic, pValue }]) => {
            const interpretation = interpretDiagnostic(test, statistic, pValue);
            if (!interpretation) return null;

            return (
              <li key={`${test}-implication`}>
                <Typography variant="body2">
                  {interpretation.interpretation}
                </Typography>
              </li>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

DiagnosticsHelp.propTypes = {
  diagnostics: PropTypes.object,
};

export default DiagnosticsHelp;