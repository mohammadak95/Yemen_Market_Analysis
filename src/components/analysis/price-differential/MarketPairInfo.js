// src/components/analysis/price-differential/MarketPairInfo.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Tooltip,
  IconButton,
  Alert,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapHorizIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const tooltips = {
  market_pair: 'Detailed analysis of the relationship between two markets',
  market_details: 'Basic information about the market pair',
  integration_metrics: 'Metrics indicating the degree of market integration',
  distance_impact: 'Effect of geographical distance on market integration',
  conflict_impact: 'Impact of conflict on market relationships',
  cointegration: 'Long-term equilibrium relationship between markets',
  stationarity: 'Stability of price differential series',
};

const MarketPairInfo = ({ data, baseMarket, comparisonMarket, isMobile }) => {
  const theme = useTheme();

  const styles = {
    container: {
      p: 3,
      height: '100%',
    },
    header: {
      mb: 3,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    card: {
      height: '100%',
      backgroundColor: theme.palette.background.default,
    },
    cardContent: {
      height: '100%',
      p: 2,
      '&:last-child': { pb: 2 },
    },
    metricsGrid: {
      mt: 2,
    },
    divider: {
      my: 2,
    },
    alert: {
      '& .MuiAlert-message': {
        width: '100%',
      },
    },
    chipContainer: {
      display: 'flex',
      gap: 1,
    },
    footnote: {
      mt: 3,
    },
    metricValue: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    },
  };

  // Calculate actual distance (multiplied by 250)
  const actualDistance = useMemo(() => {
    return data.distance_km !== undefined ? data.distance_km * 250 : undefined;
  }, [data.distance_km]);

  const marketAnalysis = useMemo(() => {
    if (!data) return null;

    const cointegrationResults = data.cointegration_results || data.cointegration_test;
    const stationarityResults = data.stationarity_results || data.stationarity_test;
    const conflictCorrelation = data.conflict_correlation || 0;
    const distance = actualDistance || 0;

    // Cointegration status
    const isCointegrated = cointegrationResults?.p_value < 0.05;

    // Stationarity status
    const isStationary = stationarityResults?.ADF
      ? stationarityResults.ADF['p-value'] < 0.05 && (stationarityResults.KPSS?.['p-value'] >= 0.05 || stationarityResults.KPSS === undefined)
      : stationarityResults?.['p-value'] < 0.05;

    // Integration level based on multiple factors
    let integrationLevel;
    if (isCointegrated && isStationary && conflictCorrelation < 0.3 && distance < 300) {
      integrationLevel = {
        label: 'Strong',
        color: 'success',
        icon: TrendingUpIcon,
        description: 'High level of market integration with stable price relationships',
      };
    } else if ((isCointegrated || isStationary) && conflictCorrelation < 0.5 && distance < 500) {
      integrationLevel = {
        label: 'Moderate',
        color: 'warning',
        icon: SwapHorizIcon,
        description: 'Moderate market integration with some barriers',
      };
    } else {
      integrationLevel = {
        label: 'Weak',
        color: 'error',
        icon: TrendingDownIcon,
        description: 'Limited market integration with significant barriers',
      };
    }

    return {
      integrationLevel,
      isCointegrated,
      isStationary,
      conflictImpact: conflictCorrelation > 0.5 ? 'High' : conflictCorrelation > 0.3 ? 'Moderate' : 'Low',
      distanceImpact: distance > 500 ? 'High' : distance > 300 ? 'Moderate' : 'Low',
    };
  }, [data, actualDistance]);

  if (!marketAnalysis) {
    return (
      <Alert severity="info">
        No market pair information available.
      </Alert>
    );
  }

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6">
          Market Pair Information
          <Tooltip title="Basic and advanced details about the selected market pair">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Chip
          icon={marketAnalysis.integrationLevel.icon ? React.createElement(marketAnalysis.integrationLevel.icon) : null}
          label={marketAnalysis.integrationLevel.label}
          color={marketAnalysis.integrationLevel.color}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Integration Level */}
        <Grid item xs={12} md={6}>
          <Box sx={styles.contentBox}>
            <Typography variant="subtitle2" gutterBottom>
              Integration Level
            </Typography>
            <Chip
              icon={React.createElement(marketAnalysis.integrationLevel.icon)}
              label={marketAnalysis.integrationLevel.label}
              color={marketAnalysis.integrationLevel.color}
              variant="outlined"
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {marketAnalysis.integrationLevel.description}
            </Typography>
          </Box>
        </Grid>

        {/* Conflict Impact */}
        <Grid item xs={12} md={3}>
          <Box sx={styles.contentBox}>
            <Typography variant="subtitle2" gutterBottom>
              Conflict Impact
            </Typography>
            <Chip
              label={marketAnalysis.conflictImpact}
              color={
                marketAnalysis.conflictImpact === 'High'
                  ? 'error'
                  : marketAnalysis.conflictImpact === 'Moderate'
                  ? 'warning'
                  : 'success'
              }
              variant="outlined"
            />
          </Box>
        </Grid>

        {/* Distance Impact */}
        <Grid item xs={12} md={3}>
          <Box sx={styles.contentBox}>
            <Typography variant="subtitle2" gutterBottom>
              Distance Impact
            </Typography>
            <Chip
              label={marketAnalysis.distanceImpact}
              color={
                marketAnalysis.distanceImpact === 'High'
                  ? 'error'
                  : marketAnalysis.distanceImpact === 'Moderate'
                  ? 'warning'
                  : 'success'
              }
              variant="outlined"
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

MarketPairInfo.propTypes = {
  data: PropTypes.shape({
    distance_km: PropTypes.number.isRequired,
    conflict_correlation: PropTypes.number.isRequired,
    cointegration_results: PropTypes.shape({
      p_value: PropTypes.number.isRequired,
    }),
    cointegration_test: PropTypes.shape({
      p_value: PropTypes.number.isRequired,
    }),
    stationarity_results: PropTypes.shape({
      ADF: PropTypes.shape({
        'p-value': PropTypes.number.isRequired,
      }),
      KPSS: PropTypes.shape({
        'p-value': PropTypes.number.isRequired,
      }),
    }),
    stationarity_test: PropTypes.shape({
      'p-value': PropTypes.number.isRequired,
    }),
  }),
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default React.memo(MarketPairInfo);