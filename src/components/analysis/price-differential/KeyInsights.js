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
} from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';

const KeyInsights = ({ data, baseMarket, comparisonMarket, commodity }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');
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
    footer: {
      mt: 3,
      pt: 2,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  };

  const insights = useMemo(() => {
    const slope = data.regression_results?.slope || 0;
    const pValue = data.regression_results?.p_value || 1;
    const meanDiff = data.summary?.mean_differential || 0;
    const volatility = data.summary?.volatility || 0;
    const distance = (data.diagnostics?.distance_km || 0) * 250; // Multiply distance by 250

    // Price Trend Analysis
    const trend = pValue > 0.05 ? {
      icon: CompareArrows,
      color: 'info',
      text: 'No significant trend',
      explanation: 'Price differences show no consistent pattern',
      severity: 'info',
    } : slope > 0 ? {
      icon: TrendingUp,
      color: 'error',
      text: 'Widening gap',
      explanation: 'Price differences are increasing',
      severity: 'warning',
    } : {
      icon: TrendingDown,
      color: 'success',
      text: 'Converging',
      explanation: 'Markets are becoming more integrated',
      severity: 'success',
    };

    // Integration Analysis
    const integration = Math.abs(meanDiff) < 0.1 && volatility < 0.2 ? {
      level: 'High',
      color: 'success',
      explanation: 'Strong market integration observed',
    } : Math.abs(meanDiff) < 0.2 && volatility < 0.3 ? {
      level: 'Moderate',
      color: 'warning',
      explanation: 'Partial market integration present',
    } : {
      level: 'Low',
      color: 'error',
      explanation: 'Limited market integration detected',
    };

    // Distance Impact
    const distanceImpact = distance < 250 ? {
      effect: 'Minor',
      color: 'success',
      explanation: 'Short distance suggests minimal impact',
    } : distance < 500 ? {
      effect: 'Moderate',
      color: 'warning',
      explanation: 'Medium distance may affect integration',
    } : {
      effect: 'Significant',
      color: 'error',
      explanation: 'Long distance likely impacts integration',
    };

    return { trend, integration, distanceImpact };
  }, [data]);

  const InsightCard = ({ title, chip, content, explanation, tooltipKey, icon: Icon, iconColor }) => (
    <Card sx={styles.card} variant="outlined">
      <CardContent sx={styles.cardContent}>
        <Box sx={styles.cardHeader}>
          <Box sx={styles.iconWrapper}>
            {Icon && <Icon sx={{ color: `${iconColor}.main` }} />}
            <Typography variant="subtitle1">{title}</Typography>
          </Box>
          <Tooltip title={getTechnicalTooltip(tooltipKey)}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {chip}
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
          Key Market Insights
          <Tooltip title="Overview of key market analysis findings">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <InsightCard
            title="Price Trend"
            chip={
              <Chip
                label={insights.trend.text}
                color={insights.trend.color}
                size="small"
              />
            }
            content={insights.trend.text}
            explanation={insights.trend.explanation}
            tooltipKey="trend"
            icon={insights.trend.icon}
            iconColor={insights.trend.color}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <InsightCard
            title="Market Integration"
            chip={
              <Chip
                label={insights.integration.level}
                color={insights.integration.color}
                size="small"
              />
            }
            content={insights.integration.level}
            explanation={insights.integration.explanation}
            tooltipKey="integration"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <InsightCard
            title="Distance Impact"
            chip={
              <Chip
                label={insights.distanceImpact.effect}
                color={insights.distanceImpact.color}
                size="small"
              />
            }
            content={insights.distanceImpact.effect}
            explanation={insights.distanceImpact.explanation}
            tooltipKey="distance"
          />
        </Grid>
      </Grid>

      <Box sx={styles.footer}>
        <Typography variant="body2" color="text.secondary">
          Analysis based on <strong>{data.summary?.observations || 0}</strong> observations between{' '}
          <strong>{baseMarket}</strong> and <strong>{comparisonMarket}</strong> for{' '}
          <strong>{commodity}</strong>.
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
    }),
    summary: PropTypes.shape({
      mean_differential: PropTypes.number,
      volatility: PropTypes.number,
      observations: PropTypes.number,
    }),
    diagnostics: PropTypes.shape({
      distance_km: PropTypes.number,
      distance_effect: PropTypes.string,
    }),
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
};

export default React.memo(KeyInsights);