// src/components/analysis/price-differential/CointegrationResults.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Tooltip,
  IconButton,
  Chip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const CointegrationResults = ({ data }) => {
  const theme = useTheme();

  if (!data) return null;

  const isSignificant = data.p_value < 0.05;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <Typography variant="h6">
          Market Cointegration
          <Tooltip title="Long-run equilibrium relationship analysis">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Chip
          icon={isSignificant ? <CheckCircleIcon /> : <WarningIcon />}
          label={isSignificant ? 'Cointegrated' : 'Not Cointegrated'}
          color={isSignificant ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{
            p: 2,
            bgcolor: theme.palette.grey[50],
            borderRadius: 1
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Test Statistics
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Test Statistic</TableCell>
                  <TableCell align="right">{data.test_statistic.toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P-Value</TableCell>
                  <TableCell align="right">{data.p_value.toFixed(4)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{
            p: 2,
            bgcolor: theme.palette.grey[50],
            borderRadius: 1
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Critical Values
              <Tooltip title="Threshold values for significance testing">
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Table size="small">
              <TableBody>
                {Object.entries(data.critical_values).map(([level, value]) => (
                  <TableRow key={level}>
                    <TableCell>{level}% Level</TableCell>
                    <TableCell align="right">{value.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

CointegrationResults.propTypes = {
  data: PropTypes.shape({
    test_statistic: PropTypes.number.isRequired,
    p_value: PropTypes.number.isRequired,
    critical_values: PropTypes.objectOf(PropTypes.number).isRequired
  })
};

export default React.memo(CointegrationResults);