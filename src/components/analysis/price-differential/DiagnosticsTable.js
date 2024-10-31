// src/components/analysis/price-differential/DiagnosticsTable.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';;

const DiagnosticsTable = ({ data }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');

  if (!data) {
    return (
      <Alert severity="info">
        No diagnostic test results available for this market pair.
      </Alert>
    );
  }

  const {
    common_dates,
    conflict_correlation,
    distance_km,
    p_value,
  } = data;

  // Evaluate p_value for overall diagnostics
  const overallStatus = p_value < 0.05 ? 'warning' : 'success';

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Diagnostic Information
        <Tooltip title={getTechnicalTooltip('diagnostics_overview')}>
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Diagnostic</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Common Dates
                <Tooltip title={getTechnicalTooltip('common_dates')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{common_dates !== undefined ? common_dates : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Conflict Correlation
                <Tooltip title={getTechnicalTooltip('conflict_correlation')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{conflict_correlation !== undefined ? conflict_correlation.toFixed(3) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Distance (km)
                <Tooltip title={getTechnicalTooltip('distance_km')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{distance_km !== undefined ? distance_km.toFixed(1) : 'N/A'} km</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                P-Value
                <Tooltip title={getTechnicalTooltip('p_value')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>
              {p_value !== undefined ? p_value.toFixed(4) : 'N/A'}
              {p_value !== undefined && (
                <Chip
                  icon={getStatusIcon(overallStatus)}
                  label={overallStatus.toUpperCase()}
                  color={overallStatus}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Overall Interpretation */}
      <Box sx={{ mt: 3 }}>
        <Alert severity={overallStatus}>
          <Typography variant="body2">
            {overallStatus === 'warning'
              ? 'The p-value indicates potential issues with the model assumptions. Consider reviewing the analysis.'
              : 'The model assumptions appear to be satisfied.'}
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
};

const getStatusIcon = (severity) => {
  switch (severity) {
    case 'success':
      return <CheckCircleIcon fontSize="small" color="success" />;
    case 'warning':
      return <WarningIcon fontSize="small" color="warning" />;
    case 'error':
      return <ErrorIcon fontSize="small" color="error" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
};

DiagnosticsTable.propTypes = {
  data: PropTypes.shape({
    common_dates: PropTypes.number,
    conflict_correlation: PropTypes.number,
    distance_km: PropTypes.number,
    p_value: PropTypes.number,
  }).isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default DiagnosticsTable;