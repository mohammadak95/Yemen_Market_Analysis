// src/components/analysis/price-differential/StationarityTest.js

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

const StationarityTest = ({ stationarityData }) => {
  const theme = useTheme();

  if (!stationarityData) return null;

  const { adf_test, kpss_test } = stationarityData;
  const isStationaryADF = adf_test?.p_value < 0.05;
  const isStationaryKPSS = kpss_test?.p_value >= 0.05;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Price Stability Analysis
          <Tooltip title="Tests for price differential stability">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Chip
            icon={isStationaryADF ? <CheckCircleIcon /> : <WarningIcon />}
            label={`ADF Test: ${adf_test?.statistic ?? 'N/A'}`}
            color={isStationaryADF ? 'success' : 'warning'}
          />
        </Grid>
        <Grid item xs={12}>
          <Chip
            icon={isStationaryKPSS ? <CheckCircleIcon /> : <WarningIcon />}
            label={`KPSS Test: ${kpss_test?.statistic ?? 'N/A'}`}
            color={isStationaryKPSS ? 'success' : 'warning'}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

StationarityTest.propTypes = {
  stationarityData: PropTypes.shape({
    adf_test: PropTypes.shape({
      p_value: PropTypes.number,
      statistic: PropTypes.number
    }),
    kpss_test: PropTypes.shape({
      p_value: PropTypes.number,
      statistic: PropTypes.number
    })
  })
};

export default StationarityTest;