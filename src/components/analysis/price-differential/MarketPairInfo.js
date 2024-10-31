// src/components/analysis/price-differential/MarketPairInfo.js

import React from 'react';
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
} from '@mui/material';
import {
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';;

const MarketPairInfo = ({ data, baseMarket, comparisonMarket, isMobile }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');

  const getTradeRelationshipStatus = () => {
    const conflictCorrelation = data.conflict_correlation || 0;
    const distance = data.distance_km || 0;

    if (conflictCorrelation > 0.5 && distance < 1.0) {
      return {
        label: 'Strong',
        color: 'success',
        icon: TrendingUpIcon,
        description: 'High level of market integration',
      };
    } else if (conflictCorrelation > 0.3 && distance < 2.0) {
      return {
        label: 'Moderate',
        color: 'warning',
        icon: SwapHorizIcon,
        description: 'Moderate market integration',
      };
    }
    return {
      label: 'Weak',
      color: 'error',
      icon: TrendingDownIcon,
      description: 'Limited market integration',
    };
  };

  const marketStatus = getTradeRelationshipStatus();

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          Market Pair Information
          <Tooltip title={getTechnicalTooltip('market_pair')}>
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Chip
          icon={<marketStatus.icon />}
          label={`${marketStatus.label} Integration`}
          color={marketStatus.color}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Basic Market Information */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Market Details
                <Tooltip title={getTechnicalTooltip('market_details')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Base Market
                    </Typography>
                    <Typography variant="body1">
                      {baseMarket}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Comparison Market
                    </Typography>
                    <Typography variant="body1">
                      {comparisonMarket}
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Distance (km)
                    </Typography>
                    <Typography variant="body1">
                      {data.distance_km !== undefined ? data.distance_km.toFixed(1) : 'N/A'} km
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Conflict Correlation
                    </Typography>
                    <Typography variant="body1">
                      {data.conflict_correlation !== undefined ? data.conflict_correlation.toFixed(3) : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Integration Metrics */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Integration Metrics
                <Tooltip title={getTechnicalTooltip('integration_metrics')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Conflict Correlation
                    </Typography>
                    <Typography variant="body1">
                      {data.conflict_correlation !== undefined ? data.conflict_correlation.toFixed(3) : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Distance (km)
                    </Typography>
                    <Typography variant="body1">
                      {data.distance_km !== undefined ? data.distance_km.toFixed(1) : 'N/A'} km
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                {/* Additional metrics can be added here if available */}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Characteristics */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Market Characteristics
                <Tooltip title={getTechnicalTooltip('market_characteristics')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Alert severity="info">
                    <Typography variant="body2" component="div">
                      <strong>Integration Level:</strong> {marketStatus.description}
                      <Box sx={{ mt: 1 }}>
                        Key factors:
                        <Box component="ul" sx={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                          <li>Distance: {data.distance_km !== undefined ? data.distance_km.toFixed(1) : 'N/A'} km impact</li>
                          <li>Conflict Correlation: {data.conflict_correlation !== undefined ? data.conflict_correlation.toFixed(3) : 'N/A'}</li>
                        </Box>
                      </Box>
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert severity={data.p_value < 0.05 ? "warning" : "info"}>
                    <Typography variant="body2" component="div">
                      <strong>Conflict Impact Analysis:</strong>
                      <Box sx={{ mt: 1 }}>
                        {data.p_value < 0.05 ? (
                          "Significant conflict-related correlations observed."
                        ) : (
                          "Limited conflict-related impacts observed."
                        )}
                        <Box component="ul" sx={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                          <li>P-Value: {data.p_value !== undefined ? data.p_value.toFixed(4) : 'N/A'}</li>
                        </Box>
                      </Box>
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!isMobile && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Note: Integration metrics are based on conflict correlation and distance between markets.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

MarketPairInfo.propTypes = {
  data: PropTypes.shape({
    conflict_correlation: PropTypes.number,
    distance_km: PropTypes.number,
    p_value: PropTypes.number,
  }).isRequired,
  baseMarket: PropTypes.string.isRequired,
  comparisonMarket: PropTypes.string.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default MarketPairInfo;