// src/components/analysis/price-differential/MarketPairMetrics.js

import React, { useMemo } from 'react';
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

const MarketPairMetrics = ({ data, baseMarket, comparisonMarket }) => {
  const theme = useTheme();

  const metrics = useMemo(() => {
    const distance = data.diagnostics?.distance_km || 0;
    const conflictCorr = data.diagnostics?.conflict_correlation || 0;
    const isCointegrated = data.cointegration_results?.p_value < 0.05;
    
    return {
      distance: {
        value: distance.toFixed(1),
        label: 'Distance (km)',
        status: distance > 500 ? 'warning' : 'success',
        tooltip: 'Physical distance between markets'
      },
      correlation: {
        value: (conflictCorr * 100).toFixed(1) + '%',
        label: 'Conflict Correlation',
        status: conflictCorr > 0.5 ? 'warning' : 'success',
        tooltip: 'Correlation of conflict impacts between markets'
      },
      integration: {
        value: isCointegrated ? 'Integrated' : 'Segmented',
        label: 'Market Integration',
        status: isCointegrated ? 'success' : 'warning',
        tooltip: 'Long-term market integration status'
      }
    };
  }, [data]);

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <Typography variant="h6">
          Market Pair Analysis
          <Tooltip title="Key metrics for market pair relationship">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {Object.entries(metrics).map(([key, metric]) => (
          <Grid item xs={12} md={4} key={key}>
            <Box sx={{
              p: 2,
              bgcolor: theme.palette.grey[50],
              borderRadius: 1,
              height: '100%'
            }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {metric.label}
                <Tooltip title={metric.tooltip}>
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {metric.value}
                </Typography>
                <Chip
                  size="small"
                  icon={metric.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
                  label={metric.status === 'success' ? 'Good' : 'Warning'}
                  color={metric.status}
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

MarketPairMetrics.propTypes = {
  data: PropTypes.shape({
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      conflict_correlation: PropTypes.number
    }),
    cointegration_results: PropTypes.shape({
      p_value: PropTypes.number
    })
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired
};

export default React.memo(MarketPairMetrics);