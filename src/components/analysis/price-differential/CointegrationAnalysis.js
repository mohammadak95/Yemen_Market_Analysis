// src/components/analysis/price-differential/CointegrationAnalysis.js

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

const CointegrationAnalysis = ({ cointegrationData }) => {
  const theme = useTheme();

  if (!cointegrationData) return null;

  const isSignificant = cointegrationData.p_value < 0.05;
  const testStat = cointegrationData.test_statistic;
  const criticalValue5 = cointegrationData.critical_values['5%'];

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Market Integration Analysis
        </Typography>
        <Chip
          icon={isSignificant ? <CheckCircleIcon /> : <WarningIcon />}
          label={isSignificant ? 'Markets Integrated' : 'Markets Segmented'}
          color={isSignificant ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            '&:hover .test-info': {
              opacity: 1
            }
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Cointegration Test Results
            </Typography>
            <Typography variant="body1">
              Test Statistic: {testStat.toFixed(4)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Critical Value (5%): {criticalValue5.toFixed(4)}
            </Typography>
            <Typography 
              className="test-info"
              variant="caption" 
              sx={{ 
                display: 'block',
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                color: theme.palette.text.secondary
              }}
            >
              {testStat < criticalValue5 
                ? 'Evidence of long-run price relationship'
                : 'No evidence of stable price relationship'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            '&:hover .significance-info': {
              opacity: 1
            }
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Statistical Significance
            </Typography>
            <Typography variant="body1">
              P-value: {cointegrationData.p_value.toFixed(4)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isSignificant ? 'Significant at 5% level' : 'Not significant at 5% level'}
            </Typography>
            <Typography 
              className="significance-info"
              variant="caption" 
              sx={{ 
                display: 'block',
                mt: 1,
                opacity: 0,
                transition: 'opacity 0.2s',
                color: theme.palette.text.secondary
              }}
            >
              {isSignificant 
                ? 'Strong evidence of market integration'
                : 'Markets may be operating independently'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ 
            p: 2, 
            bgcolor: theme.palette.grey[50],
            borderRadius: 1
          }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Critical Values
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(cointegrationData.critical_values).map(([level, value]) => (
                <Grid item xs={4} key={level}>
                  <Typography variant="body2" color="text.secondary">
                    {level} Level
                  </Typography>
                  <Typography variant="body1">
                    {value.toFixed(4)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

CointegrationAnalysis.propTypes = {
  cointegrationData: PropTypes.shape({
    test_statistic: PropTypes.number.isRequired,
    p_value: PropTypes.number.isRequired,
    critical_values: PropTypes.objectOf(PropTypes.number).isRequired
  })
};

export default React.memo(CointegrationAnalysis);
