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
} from '@mui/icons-material';
import { useTechnicalHelp } from '@/hooks';

const MarketPairInfo = ({ data, baseMarket, comparisonMarket, isMobile }) => {
  const { getTechnicalTooltip } = useTechnicalHelp('priceDiff');
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
    footnote: {
      mt: 3,
    },
  };

  // Calculate actual distance (multiplied by 250)
  const actualDistance = useMemo(() => {
    return data.distance_km !== undefined ? data.distance_km * 250 : undefined;
  }, [data.distance_km]);

  const getTradeRelationshipStatus = () => {
    const conflictCorrelation = data.conflict_correlation || 0;
    const distance = actualDistance || 0;

    if (conflictCorrelation > 0.5 && distance < 250) {
      return {
        label: 'Strong',
        color: 'success',
        icon: TrendingUpIcon,
        description: 'High level of market integration',
      };
    } else if (conflictCorrelation > 0.3 && distance < 500) {
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
  const formatDistance = (distance) => distance !== undefined ? `${distance.toFixed(1)} km` : 'N/A';
  const formatCorrelation = (correlation) => correlation !== undefined ? correlation.toFixed(3) : 'N/A';

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
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
        {/* Market Details */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={styles.card}>
            <CardContent sx={styles.cardContent}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Market Details
                </Typography>
                <Tooltip title={getTechnicalTooltip('market_details')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Grid container spacing={2} sx={styles.metricsGrid}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Base Market</Typography>
                  <Typography variant="body1">{baseMarket}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Comparison Market</Typography>
                  <Typography variant="body1">{comparisonMarket}</Typography>
                </Grid>
              </Grid>

              <Divider sx={styles.divider} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Distance</Typography>
                  <Typography variant="body1">{formatDistance(actualDistance)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Conflict Correlation</Typography>
                  <Typography variant="body1">{formatCorrelation(data.conflict_correlation)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Integration Analysis */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={styles.card}>
            <CardContent sx={styles.cardContent}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Integration Analysis
                </Typography>
                <Tooltip title={getTechnicalTooltip('integration_metrics')}>
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Alert 
                severity={marketStatus.color} 
                sx={styles.alert}
                variant="outlined"
              >
                <Typography variant="body2" component="div">
                  <strong>Integration Level:</strong> {marketStatus.description}
                  <Box sx={{ mt: 1 }}>
                    Key factors:
                    <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                      <li>Distance Impact: {formatDistance(actualDistance)}</li>
                      <li>Market Correlation: {formatCorrelation(data.conflict_correlation)}</li>
                    </Box>
                  </Box>
                </Typography>
              </Alert>

              <Alert 
                severity={data.p_value < 0.05 ? "warning" : "info"}
                sx={{ mt: 2, ...styles.alert }}
                variant="outlined"
              >
                <Typography variant="body2" component="div">
                  <strong>Conflict Impact Analysis:</strong>
                  <Box sx={{ mt: 1 }}>
                    {data.p_value < 0.05 
                      ? "Significant conflict-related correlations observed."
                      : "Limited conflict-related impacts observed."}
                    <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                      <li>P-Value: {data.p_value !== undefined ? data.p_value.toFixed(4) : 'N/A'}</li>
                    </Box>
                  </Box>
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!isMobile && (
        <Box sx={styles.footnote}>
          <Typography variant="body2" color="text.secondary">
            Note: Integration metrics are based on conflict correlation and geographic distance between markets.
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

export default React.memo(MarketPairInfo);