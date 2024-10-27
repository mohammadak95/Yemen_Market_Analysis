// src/components/analysis/price-differential/KeyInsights.js

import React from 'react';
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
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CompareArrows,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const KeyInsights = ({ data, baseMarket, comparisonMarket, commodity }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');

  const getPriceTrend = () => {
    const slope = data.regression_results?.slope || 0;
    const pValue = data.regression_results?.p_value || 1;
    
    if (pValue > 0.05) {
      return {
        icon: CompareArrows,
        color: 'info.main',
        text: 'No significant trend in price differences',
        explanation: 'Price differences show no consistent pattern over time'
      };
    }
    
    if (slope > 0) {
      return {
        icon: TrendingUp,
        color: 'error.main',
        text: 'Increasing price differential',
        explanation: 'Price gaps between markets are widening'
      };
    }
    
    return {
      icon: TrendingDown,
      color: 'success.main',
      text: 'Decreasing price differential',
      explanation: 'Markets are becoming more integrated'
    };
  };

  const getMarketIntegration = () => {
    const meanDiff = data.summary?.mean_differential || 0;
    const volatility = data.summary?.volatility || 0;
    
    if (Math.abs(meanDiff) < 0.1 && volatility < 0.2) {
      return 'High market integration';
    } else if (Math.abs(meanDiff) < 0.2 && volatility < 0.3) {
      return 'Moderate market integration';
    }
    return 'Low market integration';
  };

  const trend = getPriceTrend();
  const integration = getMarketIntegration();

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Key Insights
        </Typography>
        <Tooltip title="Analysis overview and key findings">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={2}>
        {/* Price Trend Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <trend.icon sx={{ color: trend.color, mr: 1 }} />
                <Typography variant="subtitle1">
                  Price Trend
                </Typography>
                <Tooltip title={getTechnicalTooltip('trend')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body1" color={trend.color} gutterBottom>
                {trend.text}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {trend.explanation}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Integration Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Market Integration
                <Tooltip title={getTechnicalTooltip('integration')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Typography variant="body1" gutterBottom>
                {integration}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Based on price differential magnitude and volatility
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Distance Impact Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Distance Impact
                <Tooltip title={getTechnicalTooltip('distance')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Typography variant="body1" gutterBottom>
                {data.diagnostics?.distance_effect || 'Not significant'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Influence of geographic distance on price differences
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Analysis based on {data.summary?.observations || 0} observations between{' '}
          {baseMarket} and {comparisonMarket} for {commodity}.
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
      distance_effect: PropTypes.string,
    }),
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  commodity: PropTypes.string.isRequired,
};

export default KeyInsights;