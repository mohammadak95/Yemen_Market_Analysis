//src/components/analysis/price-differential/KeyInsights.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  useTheme,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CompareArrows,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const tooltips = {
  trend: 'Analysis of price differential trends over time',
  integration: 'Assessment of market integration based on multiple indicators',
  distance: 'Impact of geographical distance on market relationships',
  cointegration: 'Long-term equilibrium relationship between markets',
  stationarity: 'Stability of price differential series',
  conflict: 'Impact of conflict on market relationships',
};

const KeyInsights = ({ data, baseMarket, comparisonMarket, commodity }) => {
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
    card: {
      height: '100%',
      backgroundColor: theme.palette.background.default,
    },
    cardContent: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      '&:last-child': { pb: 2 },
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      mb: 2,
    },
    iconWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    },
    chipContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1,
      mb: 2,
    },
    footer: {
      mt: 3,
      pt: 2,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  };

  const insights = useMemo(() => {
    const cointegrationResults = data.cointegration_results || data.cointegration_test;
    const stationarityResults = data.stationarity_results || data.stationarity_test;
    const regressionResults = data.regression_results;
    const diagnostics = data.diagnostics;

    // Market Integration Analysis
    const isCointegrated = cointegrationResults?.p_value < 0.05;
    const isStationary = stationarityResults?.adf_test
      ? stationarityResults.adf_test.p_value < 0.05 && stationarityResults.kpss_test.p_value >= 0.05
      : stationarityResults?.p_value < 0.05;
    const hasGoodRegression = regressionResults?.r_squared > 0.7;

    const integration = {
      level: isCointegrated && isStationary && hasGoodRegression
        ? 'High'
        : (isCointegrated || isStationary) && hasGoodRegression
        ? 'Moderate'
        : 'Low',
      color: isCointegrated && isStationary && hasGoodRegression
        ? 'success'
        : (isCointegrated || isStationary) && hasGoodRegression
        ? 'warning'
        : 'error',
      explanation: isCointegrated && isStationary
        ? 'Strong evidence of market integration'
        : isCointegrated || isStationary
        ? 'Partial market integration detected'
        : 'Limited market integration observed',
      details: [
        {
          label: 'Cointegration',
          status: isCointegrated ? 'success' : 'warning',
          value: isCointegrated ? 'Present' : 'Absent',
        },
        {
          label: 'Stationarity',
          status: isStationary ? 'success' : 'warning',
          value: isStationary ? 'Confirmed' : 'Not confirmed',
        },
      ],
    };

    // Price Trend Analysis
    const trend = {
      direction: regressionResults?.slope > 0 ? 'Increasing' : 'Decreasing',
      significance: regressionResults?.p_value < 0.05,
      color: regressionResults?.p_value < 0.05
        ? regressionResults.slope > 0 ? 'error' : 'success'
        : 'info',
      icon: regressionResults?.p_value < 0.05
        ? regressionResults.slope > 0 ? TrendingUp : TrendingDown
        : CompareArrows,
      explanation: regressionResults?.p_value < 0.05
        ? `Price differential is ${regressionResults.slope > 0 ? 'widening' : 'narrowing'}`
        : 'No significant trend detected',
    };

    // Market Conditions
    const conditions = {
      distance: diagnostics?.distance_km || 0,
      conflict_correlation: diagnostics?.conflict_correlation || 0,
      color: diagnostics?.conflict_correlation > 0.7
        ? 'error'
        : diagnostics?.conflict_correlation > 0.4
        ? 'warning'
        : 'success',
      explanation: diagnostics?.conflict_correlation > 0.7
        ? 'High conflict synchronization'
        : diagnostics?.conflict_correlation > 0.4
        ? 'Moderate conflict impact'
        : 'Low conflict impact',
    };

    return { integration, trend, conditions };
  }, [data]);

  const InsightCard = ({ title, chips, content, explanation, tooltipKey, icon: Icon, iconColor }) => (
    <Card sx={styles.card} variant="outlined">
      <CardContent sx={styles.cardContent}>
        <Box sx={styles.cardHeader}>
          <Box sx={styles.iconWrapper}>
            {Icon && <Icon sx={{ color: `${iconColor}.main` }} />}
            <Typography variant="subtitle1">{title}</Typography>
          </Box>
          <Tooltip title={tooltips[tooltipKey]}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={styles.chipContainer}>
          {Array.isArray(chips) ? chips.map((chip, index) => (
            <Chip
              key={index}
              label={`${chip.label}: ${chip.value}`}
              color={chip.status}
              size="small"
              icon={chip.status === 'success' ? <CheckCircleIcon /> : <WarningIcon />}
            />
          )) : chips}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
          {explanation}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6">
          Market Integration Analysis
          <Tooltip title="Comprehensive analysis of market relationships">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <InsightCard
            title="Integration Status"
            chips={insights.integration.details}
            explanation={insights.integration.explanation}
            tooltipKey="integration"
            iconColor={insights.integration.color}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <InsightCard
            title="Price Trend"
            chips={
              <Chip
                label={insights.trend.significance ? insights.trend.direction : 'No Clear Trend'}
                color={insights.trend.color}
                size="small"
                icon={<insights.trend.icon />}
              />
            }
            explanation={insights.trend.explanation}
            tooltipKey="trend"
            icon={insights.trend.icon}
            iconColor={insights.trend.color}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <InsightCard
            title="Market Conditions"
            chips={[
              {
                label: 'Distance',
                value: `${insights.conditions.distance.toFixed(1)} km`,
                status: insights.conditions.distance > 500 ? 'warning' : 'success',
              },
              {
                label: 'Conflict Impact',
                value: insights.conditions.conflict_correlation > 0.7 ? 'High' : 
                       insights.conditions.conflict_correlation > 0.4 ? 'Moderate' : 'Low',
                status: insights.conditions.color,
              },
            ]}
            explanation={insights.conditions.explanation}
            tooltipKey="conflict"
            iconColor={insights.conditions.color}
          />
        </Grid>
      </Grid>

      <Box sx={styles.footer}>
        <Typography variant="body2" color="text.secondary">
          Analysis of market relationship between <strong>{baseMarket}</strong> and{' '}
          <strong>{comparisonMarket}</strong> for <strong>{commodity}</strong>.
          {insights.integration.level === 'High' 
            ? ' Markets show strong integration patterns.'
            : insights.integration.level === 'Moderate'
            ? ' Markets show partial integration with some barriers.'
            : ' Markets show limited integration with significant barriers.'}
        </Typography>
      </Box>
    </Paper>
  );
};

KeyInsights.propTypes = {
  data: PropTypes.shape({
    regression_results: PropTypes.shape({
      slope: PropTypes.number,
      p_value: PropTypes.number,
      r_squared: PropTypes.number,
    }),
    cointegration_results: PropTypes.shape({
      test_statistic: PropTypes.number,
      p_value: PropTypes.number,
      critical_values: PropTypes.object,
    }),
    cointegration_test: PropTypes.shape({
      test_statistic: PropTypes.number,
      p_value: PropTypes.number,
      critical_values: PropTypes.object,
    }),
    stationarity_results: PropTypes.shape({
      adf_test: PropTypes.shape({
        test_statistic: PropTypes.number,
        p_value: PropTypes.number,
      }),
      kpss_test: PropTypes.shape({
        test_statistic: PropTypes.number,
        p_value: PropTypes.number,
      }),
    }),
    stationarity_test: PropTypes.shape({
      test_statistic: PropTypes.number,
      p_value: PropTypes.number,
    }),
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      conflict_correlation: PropTypes.number,
    }),
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
};

export default React.memo(KeyInsights);
