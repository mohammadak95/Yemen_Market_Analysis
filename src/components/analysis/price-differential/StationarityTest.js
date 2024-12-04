// src/components/analysis/price-differential/StationarityTest.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Chip,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const StationarityTest = ({ stationarityData }) => {
  const theme = useTheme();

  if (!stationarityData) return null;

  const { ADF, KPSS } = stationarityData;
  const isStationaryADF = ADF?.['p-value'] < 0.05;
  const isStationaryKPSS = KPSS?.['p-value'] >= 0.05;
  const isStable = isStationaryADF && isStationaryKPSS;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Price Stability Analysis
        </Typography>
        <Chip
          icon={isStable ? <CheckCircleIcon /> : <WarningIcon />}
          label={isStable ? 'Stable Prices' : 'Unstable Prices'}
          color={isStable ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            '&:hover .adf-info': {
              opacity: 1
            }
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              ADF Test Results
            </Typography>
            <Typography variant="body1">
              Test Statistic: {ADF?.statistic?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              P-value: {ADF?.['p-value']?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography 
              className="adf-info"
              variant="caption" 
              sx={{ 
                display: 'block',
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                color: theme.palette.text.secondary
              }}
            >
              {isStationaryADF 
                ? 'Evidence against unit root - prices tend to revert to mean'
                : 'Cannot reject unit root - prices may follow random walk'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            '&:hover .kpss-info': {
              opacity: 1
            }
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              KPSS Test Results
            </Typography>
            <Typography variant="body1">
              Test Statistic: {KPSS?.statistic?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              P-value: {KPSS?.['p-value']?.toFixed(4) || 'N/A'}
            </Typography>
            <Typography 
              className="kpss-info"
              variant="caption" 
              sx={{ 
                display: 'block',
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                color: theme.palette.text.secondary
              }}
            >
              {isStationaryKPSS 
                ? 'Cannot reject stationarity - prices show stability'
                : 'Evidence against stationarity - prices may be volatile'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.grey[50],
            borderRadius: 1,
            '&:hover .interpretation-info': {
              opacity: 1
            }
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Economic Interpretation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isStable 
                ? 'Price differentials show mean-reverting behavior, suggesting effective market arbitrage'
                : 'Price differentials may be persistent, indicating potential market frictions'}
            </Typography>
            <Typography 
              className="interpretation-info"
              variant="caption" 
              sx={{ 
                display: 'block',
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                color: theme.palette.text.secondary
              }}
            >
              Combined test results provide {isStable ? 'strong' : 'weak'} evidence for price stability
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

StationarityTest.propTypes = {
  stationarityData: PropTypes.shape({
    ADF: PropTypes.shape({
      'p-value': PropTypes.number,
      statistic: PropTypes.number
    }),
    KPSS: PropTypes.shape({
      'p-value': PropTypes.number,
      statistic: PropTypes.number
    })
  })
};

export default React.memo(StationarityTest);
