// src/components/analysis/price-differential/RegressionResults.js

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
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const RegressionResults = ({ data }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');

  if (!data) {
    return (
      <Alert severity="info">
        No regression results available for this market pair.
      </Alert>
    );
  }

  const {
    aic,
    bic,
    intercept,
    p_value,
    r_squared,
    slope,
  } = data;

  // Evaluate p_value for slope
  const slopeStatus = p_value < 0.05 ? 'success' : 'warning';

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Regression Results
        <Tooltip title={getTechnicalTooltip('regression_results')}>
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>

      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                AIC
                <Tooltip title={getTechnicalTooltip('aic')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{aic !== undefined ? aic.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                BIC
                <Tooltip title={getTechnicalTooltip('bic')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{bic !== undefined ? bic.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Intercept
                <Tooltip title={getTechnicalTooltip('intercept')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{intercept !== undefined ? intercept.toFixed(6) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Slope
                <Tooltip title={getTechnicalTooltip('slope')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>
              {slope !== undefined ? slope.toFixed(6) : 'N/A'}
              {slope !== undefined && (
                <Chip
                  icon={getStatusIcon(slopeStatus)}
                  label={slopeStatus.toUpperCase()}
                  color={slopeStatus}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                P-Value
                <Tooltip title={getTechnicalTooltip('regression_p_value')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{p_value !== undefined ? p_value.toFixed(6) : 'N/A'}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                R-Squared
                <Tooltip title={getTechnicalTooltip('r_squared')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </TableCell>
            <TableCell>{r_squared !== undefined ? r_squared.toFixed(4) : 'N/A'}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Interpretation */}
      <Box sx={{ mt: 3 }}>
        <Alert severity={slopeStatus}>
          <Typography variant="body2">
            {slopeStatus === 'success'
              ? 'The slope is statistically significant, indicating a meaningful relationship.'
              : 'The slope is not statistically significant, indicating no meaningful relationship.'}
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

RegressionResults.propTypes = {
  data: PropTypes.shape({
    aic: PropTypes.number,
    bic: PropTypes.number,
    intercept: PropTypes.number,
    p_value: PropTypes.number,
    r_squared: PropTypes.number,
    slope: PropTypes.number,
  }).isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default RegressionResults;