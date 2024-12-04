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

  if (!stationarityData) {
    return (
      <Alert severity="info">
        Stationarity test results are not available for the selected data.
      </Alert>
    );
  }

  const testResults = useMemo(() => {
    const adfTest = stationarityData.ADF;
    const kpssTest = stationarityData.KPSS;

    if (!adfTest) return null;

    const isStationaryADF = adfTest['p-value'] < 0.05;
    const isStationaryKPSS = kpssTest ? kpssTest['p-value'] >= 0.05 : null;

    return {
      adf: {
        isStationary: isStationaryADF,
        significance: isStationaryADF ? 'success' : 'warning',
        message: isStationaryADF ? 'Stationary (ADF)' : 'Non-stationary (ADF)',
      },
      kpss: kpssTest
        ? {
            isStationary: isStationaryKPSS,
            significance: isStationaryKPSS ? 'success' : 'warning',
            message: isStationaryKPSS ? 'Stationary (KPSS)' : 'Non-stationary (KPSS)',
          }
        : null,
      overall: {
        isStationary: kpssTest ? isStationaryADF && isStationaryKPSS : isStationaryADF,
        significance: kpssTest
          ? isStationaryADF && isStationaryKPSS
            ? 'success'
            : 'warning'
          : isStationaryADF
          ? 'success'
          : 'warning',
      },
    };
  }, [stationarityData]);

  if (!testResults) {
    return (
      <Alert severity="error">
        Invalid stationarity test data structure.
      </Alert>
    );
  }

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6">
          Price Differential Stationarity Analysis
          <Tooltip title="Analysis of price differential stability over time">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {testResults.adf && (
            <Chip
              icon={testResults.adf.isStationary ? <CheckCircleIcon /> : <WarningIcon />}
              label={testResults.adf.message}
              color={testResults.adf.significance}
              variant="outlined"
            />
          )}
          {testResults.kpss && (
            <Chip
              icon={testResults.kpss.isStationary ? <CheckCircleIcon /> : <WarningIcon />}
              label={testResults.kpss.message}
              color={testResults.kpss.significance}
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ADF Test Results */}
        <Grid item xs={12} md={testResults.kpss ? 6 : 12}>
          <Box sx={styles.contentBox}>
            <Typography variant="subtitle2" gutterBottom>
              ADF Test Statistics
            </Typography>
            <Table size="small" sx={styles.table}>
              <TableBody>
                <TableRow>
                  <TableCell>Test Statistic</TableCell>
                  <TableCell align="right">
                    {stationarityData.ADF.statistic.toFixed(4)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P-Value</TableCell>
                  <TableCell align="right">
                    {stationarityData.ADF['p-value'].toFixed(4)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Grid>

        {/* KPSS Test Results */}
        {testResults.kpss && (
          <Grid item xs={12} md={6}>
            <Box sx={styles.contentBox}>
              <Typography variant="subtitle2" gutterBottom>
                KPSS Test Statistics
              </Typography>
              <Table size="small" sx={styles.table}>
                <TableBody>
                  <TableRow>
                    <TableCell>Test Statistic</TableCell>
                    <TableCell align="right">
                      {stationarityData.KPSS.statistic.toFixed(4)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>P-Value</TableCell>
                    <TableCell align="right">
                      {stationarityData.KPSS['p-value'].toFixed(4)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Grid>
        )}
      </Grid>

      <Alert
        severity={testResults.overall.significance}
        variant="outlined"
        sx={{ mt: 2 }}
      >
        <Typography variant="body2">
          {testResults.kpss ? (
            testResults.overall.isStationary
              ? 'Both ADF and KPSS tests confirm that the price differential series is stationary.'
              : 'The price differential series is non-stationary according to the tests.'
          ) : testResults.overall.isStationary ? (
            'The ADF test confirms that the price differential series is stationary.'
          ) : (
            'The ADF test indicates that the price differential series is non-stationary.'
          )}
        </Typography>
      </Alert>
    </Paper>
  );
};

StationarityTest.propTypes = {
  stationarityData: PropTypes.shape({
    ADF: PropTypes.shape({
      statistic: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }).isRequired,
    KPSS: PropTypes.shape({
      statistic: PropTypes.number.isRequired,
      'p-value': PropTypes.number.isRequired,
    }),
  }),
};

export default React.memo(StationarityTest);