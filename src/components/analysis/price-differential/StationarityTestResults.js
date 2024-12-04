// src/components/analysis/price-differential/StationarityTestResults.js

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
  useTheme
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const StationarityTestResults = ({ data }) => {
  const theme = useTheme();

  if (!data) return null;

  const { adf_test, kpss_test } = data;
  const isStationaryADF = adf_test?.p_value < 0.05;
  const isStationaryKPSS = kpss_test?.p_value >= 0.05;

  const tests = {
    adf: {
      name: 'ADF Test',
      statistic: adf_test?.statistic.toFixed(4),
      pValue: adf_test?.p_value.toFixed(4),
      isStationary: isStationaryADF,
      tooltip: 'Augmented Dickey-Fuller test for unit root'
    },
    kpss: {
      name: 'KPSS Test',
      statistic: kpss_test?.statistic.toFixed(4),
      pValue: kpss_test?.p_value.toFixed(4),
      isStationary: isStationaryKPSS,
      tooltip: 'KPSS test for trend stationarity'
    }
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <Typography variant="h6">
          Stationarity Analysis
          <Tooltip title="Tests for price differential stability">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Chip
          label={isStationaryADF && isStationaryKPSS ? 'Stationary' : 'Non-stationary'}
          color={isStationaryADF && isStationaryKPSS ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        {Object.entries(tests).map(([key, test]) => (
          <Grid item xs={12} key={key}>
            <Box sx={{
              p: 2,
              bgcolor: theme.palette.grey[50],
              borderRadius: 1
            }}>
              <Typography variant="subtitle2" gutterBottom>
                {test.name}
                <Tooltip title={test.tooltip}>
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Test Statistic
                  </Typography>
                  <Typography variant="body1">
                    {test.statistic}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    P-Value
                  </Typography>
                  <Typography variant="body1">
                    {test.pValue}
                  </Typography>
                </Grid>
              </Grid>
              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  icon={test.isStationary ? <CheckCircleIcon /> : <WarningIcon />}
                  label={test.isStationary ? 'Stationary' : 'Non-stationary'}
                  color={test.isStationary ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

StationarityTestResults.propTypes = {
  data: PropTypes.shape({
    adf_test: PropTypes.shape({
      statistic: PropTypes.number,
      p_value: PropTypes.number
    }),
    kpss_test: PropTypes.shape({
      statistic: PropTypes.number,
      p_value: PropTypes.number
    })
  })
};

export default React.memo(StationarityTestResults);