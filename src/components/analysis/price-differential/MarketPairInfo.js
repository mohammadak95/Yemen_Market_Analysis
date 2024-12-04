// src/components/analysis/price-differential/MarketPairInfo.js

import React, { useMemo } from 'react';
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
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';

const MarketPairInfo = ({ data, baseMarket, comparisonMarket, isMobile }) => {
  const theme = useTheme();
  
  const metrics = useMemo(() => {
    const distance = data.diagnostics?.distance_km || 0;
    const conflictCorr = data.diagnostics?.conflict_correlation || 0;
    const commonDates = data.diagnostics?.common_dates || 0;
    
    return {
      distance: {
        value: distance.toFixed(1),
        label: 'Market Distance',
        unit: 'km',
        status: distance > 2 ? 'warning' : 'success',
        description: 'Geographical separation between markets',
        interpretation: distance > 2 
          ? 'Significant spatial barriers may exist'
          : 'Markets are geographically close'
      },
      correlation: {
        value: (conflictCorr * 100).toFixed(1),
        label: 'Conflict Impact',
        unit: '%',
        status: Math.abs(conflictCorr) > 0.3 ? 'warning' : 'success',
        description: 'Correlation of conflict intensities',
        interpretation: Math.abs(conflictCorr) > 0.3
          ? 'High conflict synchronization'
          : 'Limited conflict correlation'
      },
      periods: {
        value: commonDates,
        label: 'Time Coverage',
        unit: 'months',
        status: commonDates >= 24 ? 'success' : 'warning',
        description: 'Length of analysis period',
        interpretation: commonDates >= 24
          ? 'Sufficient historical data'
          : 'Limited time coverage'
      }
    };
  }, [data]);

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 2 
      }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {baseMarket}
        </Typography>
        <SwapHorizIcon color="action" />
        <Typography variant="h6">
          {comparisonMarket}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {Object.entries(metrics).map(([key, metric]) => (
          <Grid item xs={12} md={4} key={key}>
            <Box sx={{
              p: 2,
              bgcolor: theme.palette.background.default,
              borderRadius: 1,
              height: '100%',
              '&:hover .metric-info': {
                opacity: 1
              }
            }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {metric.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {metric.value}{metric.unit && ` ${metric.unit}`}
                </Typography>
                <Chip
                  size="small"
                  icon={metric.status === 'success' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                  label={metric.status === 'success' ? 'Favorable' : 'Concerning'}
                  color={metric.status}
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {metric.description}
              </Typography>
              <Typography 
                className="metric-info"
                variant="caption" 
                sx={{ 
                  display: 'block',
                  mt: 1,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: theme.palette.text.secondary
                }}
              >
                {metric.interpretation}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

MarketPairInfo.propTypes = {
  data: PropTypes.shape({
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      conflict_correlation: PropTypes.number,
      common_dates: PropTypes.number
    }),
    cointegration_results: PropTypes.shape({
      p_value: PropTypes.number
    })
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired
};

export default React.memo(MarketPairInfo);
