// src/components/analysis/price-differential/StationarityTest.js

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

const StationarityTest = ({ stationarityData }) => {
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
  };

  const testResults = useMemo(() => ({
    isStationary: stationarityData?.p_value < 0.05,
    significance: stationarityData?.p_value < 0.05 ? 'success' : 'warning',
    message: stationarityData?.p_value < 0.05 
      ? 'Stationary Series'
      : 'Non-stationary Series',
  }), [stationarityData]);

  if (!stationarityData) {
    return (
      <Alert severity="info">
        Stationarity test results are not available for the selected data.
      </Alert>
    );
  }

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6">
          {`Stationarity Analysis: ${stationarityData.market_name}`}
          <Tooltip title="Augmented Dickey-Fuller Test Results">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Chip
          icon={testResults.isStationary ? <CheckCircleIcon /> : <WarningIcon />}
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
                  <TableCell>ADF Statistic</TableCell>
                  <TableCell align="right">{stationarityData.adf_statistic.toFixed(4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P-Value</TableCell>
                  <TableCell align="right">{stationarityData.p_value.toFixed(4)}</TableCell>
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
                {Object.entries(stationarityData.critical_values).map(([level, value]) => (
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
          {testResults.isStationary
            ? "The price series shows mean-reverting behavior (stationary series)."
            : "The price series shows trending behavior (non-stationary series)."}
        </Typography>
      </Alert>
    </Paper>
  );
};

StationarityTest.propTypes = {
  stationarityData: PropTypes.shape({
    adf_statistic: PropTypes.number.isRequired,
    p_value: PropTypes.number.isRequired,
    critical_values: PropTypes.objectOf(PropTypes.number).isRequired,
    market_name: PropTypes.string.isRequired,
  }).isRequired,
};

export default React.memo(StationarityTest);