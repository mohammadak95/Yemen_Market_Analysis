//src/components/analysis/price-differential/CointegrationAnalysis.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Alert,
  Box,
  useTheme,
  Tooltip,
  IconButton,
  Chip,
  Grid,
} from '@mui/material';
import { Info as InfoIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';

const CointegrationAnalysis = ({ cointegrationData }) => {
  const theme = useTheme();

  const styles = {
    container: {
      p: 3,
      height: '100%',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      mb: 3,
    },
    contentBox: {
      p: 2,
      bgcolor: theme.palette.background.default,
      borderRadius: 1,
      mb: 2,
    },
    table: {
      '& .MuiTableCell-root': {
        borderColor: theme.palette.divider,
        py: 2,
      },
    },
    resultChip: {
      ml: 1,
    },
  };

  const testResults = useMemo(() => ({
    isSignificant: cointegrationData?.p_value < 0.05,
    significance: cointegrationData?.p_value < 0.05 ? 'success' : 'warning',
    message: cointegrationData?.p_value < 0.05 
      ? 'Markets show significant cointegration'
      : 'No significant cointegration detected',
  }), [cointegrationData]);

  if (!cointegrationData) {
    return (
      <Alert severity="info">
        Cointegration analysis is not available for this market pair.
      </Alert>
    );
  }

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6">
          Market Cointegration Analysis
          <Tooltip title="Johansen Test for market price relationship">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Chip
          icon={testResults.isSignificant ? <CheckCircleIcon /> : <WarningIcon />}
          label={testResults.message}
          color={testResults.significance}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={styles.contentBox}>
            <Typography variant="subtitle2" gutterBottom>
              Test Statistics
            </Typography>
            <Table size="small" sx={styles.table}>
              <TableBody>
                <TableRow>
                  <TableCell>Test Statistic</TableCell>
                  <TableCell align="right">{cointegrationData.test_statistic.toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P-Value</TableCell>
                  <TableCell align="right">{cointegrationData.p_value.toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cointegrating Equations</TableCell>
                  <TableCell align="right">{cointegrationData.num_of_cointegrating_eq}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={styles.contentBox}>
            <Typography variant="subtitle2" gutterBottom>
              Critical Values
            </Typography>
            <Table size="small" sx={styles.table}>
              <TableBody>
                {Object.entries(cointegrationData.critical_values).map(([level, value]) => (
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

      <Alert 
        severity={testResults.significance}
        variant="outlined"
        sx={{ mt: 2 }}
      >
        <Typography variant="body2">
          {testResults.isSignificant
            ? "The markets show evidence of long-term price equilibrium relationship (p-value < 0.05)."
            : "The markets do not show strong evidence of a long-term price relationship (p-value ≥ 0.05)."}
        </Typography>
      </Alert>
    </Paper>
  );
};

CointegrationAnalysis.propTypes = {
  cointegrationData: PropTypes.shape({
    test_statistic: PropTypes.number.isRequired,
    critical_values: PropTypes.objectOf(PropTypes.number).isRequired,
    p_value: PropTypes.number.isRequired,
    num_of_cointegrating_eq: PropTypes.number.isRequired,
  }).isRequired,
};

export default React.memo(CointegrationAnalysis);